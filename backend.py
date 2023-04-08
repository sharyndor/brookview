from http.client import HTTPSConnection
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs
import json
import os

from datetime import datetime, timezone
from time import time
from math import floor


history = {}

if os.path.exists('history.json'):
  with open('history.json', 'r') as file:
    history = json.loads(file.read())

class Handler(SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    self.handlers = {
      '/refer/youtube' : self.handleRefer,
      '/live/youtube'  : self.handleLive,
    }

    super(Handler, self).__init__(*args, **kwargs)

  def do_GET(self):
    for handlerPath, handler in self.handlers.items():
      if self.path.startswith(handlerPath):
        try:
          result = handler(self.path.removeprefix(handlerPath))
          return
        except:
          self.send_response(500)
          self.send_header('Content-Type', 'application/json')
          self.end_headers()
          return

    return SimpleHTTPRequestHandler.do_GET(self)
  
  def update_history(self, key, value):
    global history
    history.setdefault(key, {}).update(value)
    log_to_file(history, 'history.json')
  
  def collect_channel_data(self, pathQuery):
    status, data = query_site('www.youtube.com', pathQuery + '/streams')
    jdata = getYT_JSON(data)

    channelData = {}

    metadata = jdata['metadata']['channelMetadataRenderer']
    channelData['name'] = metadata['title']
    channelData['channelId'] = metadata['externalId']
    channelData['vanityId'] = metadata['vanityChannelUrl'].removeprefix('http://www.youtube.com/')

    for video in find_key_like(jdata, "videoRenderer"):
      viewCountText = ' '.join(find_key_like(video['viewCountText'], 'text'))
      if 'watching' in viewCountText:
        liveVideo = channelData['liveVideo'] = {}
        liveVideo['videoId'] = video['videoId']
        liveVideo['title'] = ' '.join(find_key_like(video['title'], 'text'))
        liveVideo['updateTime'] = int(time())
        break

    self.update_history(channelData['channelId'], channelData)
    self.update_history(channelData['vanityId'], channelData)

    if liveVideo:
      self.update_history(liveVideo['videoId'], liveVideo)

    return channelData

  def collect_video_data(self, pathQuery):
    global history

    status, data = query_site('www.youtube.com', pathQuery + '/live')
    jdata = getYT_JSON(data)

    channelData = {}

    details = jdata['microformat']['playerMicroformatRenderer']
    videoDetails = jdata['videoDetails']

    channelData['name'] = videoDetails['author']
    channelData['channelId'] = videoDetails['channelId']
    channelData['vanityId'] = details['ownerProfileUrl'].removeprefix('http://www.youtube.com/')

    if videoDetails['isLive']:
      liveVideo = channelData['liveVideo'] = {}
      liveVideo['videoId'] = videoDetails['videoId']
      liveVideo['title'] = videoDetails['title']
      liveVideo['updateTime'] = int(time())

    history[channelData['channelId']] = channelData
    history[channelData['vanityId']] = channelData

    if liveVideo:
      history[liveVideo['videoId']] = liveVideo

    return channelData

  def refer_from_channel(self, path):
    global history

    if path not in history:
      self.update_history(path, self.collect_channel_data(path))
    return history.get(path)
  
  def refer_from_video(self, path):
    global history

    if path not in history:
      self.update_history(path, self.collect_video_data(path))
    return history.get(path)

  def handleRefer(self, pathQuery):
    parse_result = urlparse(pathQuery)
    path, queries = parse_result.path, parse_qs(parse_result.query)
    path_pieces = [piece for piece in path.split('/') if piece]

    result = {}
    if path_pieces[0] == 'channel':
      result['channelId'] = path_pieces[1]
    elif path_pieces[0] == 'c':
      result['channelId'] = self.refer_from_channel('/c/' + path_pieces[1])
    elif path_pieces[0].startswith('@'):
      result['channelId'] = self.refer_from_channel('/' + path_pieces[0])
    else:
      result['note'] = 'Failed to determine channelId'

    return self.respond(result)
  
  def handleLive(self, pathQuery):
    parse_result = urlparse(pathQuery)
    path, queries = parse_result.path, parse_qs(parse_result.query)
    path_pieces = [piece for piece in path.split('/') if piece]

    result = {}
    if path_pieces[0] == 'watch':
      result['channelId'] = queries['v'][0]
    elif path_pieces[0] == 'c':
      result['channelId'] = self.refer_from_video('/c/' + path_pieces[1])
    elif path_pieces[0].startswith('@'):
      result['channelId'] = self.refer_from_video('/' + path_pieces[0])
    else:
      result['note'] = 'Failed to determine channelId'

    return self.respond(result)

  def respond(self, jdata):
    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()

    self.wfile.write(json.dumps(jdata, indent=2).encode())

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
  """Handle requests in a separate thread."""

def query_site(site, query):
    conn = HTTPSConnection(site)
    conn.request('GET', query)
    response = conn.getresponse()
    return response.status, response.read()
  
def getYT_JSON(data):
  # Find where the page info is located
  start, end = 'var ytInitialData = ', ';</script>'
  start, end = start.encode(), end.encode()
  data = data[data.find(start) + len(start):]
  data = data[:data.find(end)]

  # Convert to JSON
  try:
    obj = json.loads(data)
    log_to_file(obj, 'resolve.json')
    return obj
  except:
    return None
  
def find_key_like(o, s):
  result = []
  if type(o) is dict:
    for k, v in o.items():
      if s == k:
        result.append(v)
      else:
        result += find_key_like(v, s)
  elif type(o) is list:
    for n in o:
      result += find_key_like(n, s)
  return result

def json_search(d, t, *kargs):
  if len(kargs) == 0:
    return d if type(d) is t else t()
  else:
    arg = kargs[0]
    if type(arg) is str and type(d) is dict and arg in d:
      return json_search(d[arg], t, *kargs[1:])
    elif type(arg) is int and type(d) is list and arg < len(d):
      return json_search(d[arg], t, *kargs[1:])
    elif type(arg) is dict and type(d) is list:
      filteredMap = [m for m in d if arg.items() <= m.items()]
      return json_search(filteredMap[0], t, *kargs[1:]) if filteredMap else t()
    elif callable(arg) and type(d) is list:
      return arg([json_search(n, t, *kargs[1:]) for n in d])
    else:
      return t()

def log_to_file(data, name):
  with open(name, 'w') as file:
    file.write(json.dumps(data, indent=2))

if __name__ == '__main__':
  server = ThreadedHTTPServer(('localhost', 8080), Handler)
  server.serve_forever()
