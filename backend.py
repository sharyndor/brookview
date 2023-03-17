from http.client import HTTPSConnection
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs
import json

from datetime import datetime, timezone
from time import time
from math import floor

class Handler(SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    self.handlers = {
      '/resolve/youtube' : self.handleResolve,
      '/lookup/youtube' : self.handleLookup,
      '/videos/youtube' : self.handleVideos,
    }

    super(Handler, self).__init__(*args, **kwargs)

  def do_GET(self):
    for handlerPath, handler in self.handlers.items():
      if self.path.startswith(handlerPath):
        return handler(self.path.removeprefix(handlerPath))

    self.send_response(404)
    self.end_headers()

  def handleResolve(self, query):
    pass
  
  def handleLookup(self, query):
    pqs = parse_qs(query)

    conn = HTTPSConnection('www.youtube.com')
    conn.request('GET', query)
    response = conn.getresponse()
    data = response.read()

    result = {'foo' : 'bar'}

    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()

    self.wfile.write(json.dumps(result, indent=4).encode())
  
  def handleVideos(self, query):
    channelId  = queryChannelId(query['yt'][0])
    videoId    = queryLiveVideoId(channelId)
    videoState = queryVideoInfo(videoId)

    jstring = json.dumps(videoState, indent=4)
    
    self.send_response(200)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()

    self.wfile.write(jstring.encode())

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
  """Handle requests in a separate thread."""

lookups = {}

def queryChannelId(page):
  if page in lookups:
    return lookups[page]

  jdata = resolve_YT_JSON(page)
  channelId = json_search(
    jdata, dict, 
    'responseContext',
    'serviceTrackingParams',
    {'service' : 'GFEEDBACK'},
    'params',
    {'key' : 'browse_id'}
  ).get('value')

  lookups[page] = channelId

  return channelId
  
def queryLiveVideoId(channelId):
  jdata = resolve_YT_JSON2('embed/live_stream?channel=' + channelId)
  return jdata['VIDEO_ID']

def queryVideoInfo(videoId):
  jdata = resolve_YT_JSON3('watch?v=' + videoId)

  with open('out.json', 'w') as file:
    file.write(json.dumps(jdata, indent=4))

  videoDetails = find_key_like(jdata, 'videoDetails')[0]

  liveBroadcastDetails = find_key_like(jdata, 'liveBroadcastDetails')[0]

  startTime = datetime.fromisoformat(liveBroadcastDetails['startTimestamp']).timestamp()

  result = {
    'title' : videoDetails['title'],
    'channel' : videoDetails['channelId'],
    'live' : liveBroadcastDetails['isLiveNow'],
    'time' : startTime,
  }

  return result

def resolve_YT_JSON(page):
  return getYT_JSON(resolve_YT(page))

def resolve_YT_JSON2(page):
  return getYT_JSON2(resolve_YT(page))

def resolve_YT_JSON3(page):
  return getYT_JSON3(resolve_YT(page))

def resolve_YT(page):
  conn = HTTPSConnection('www.youtube.com')
  print('query:', page)
  conn.request('GET', '/' + page)
  response = conn.getresponse()
  data = response.read()
  return data

def getYT_JSON(data):
  # Find where the page info is located
  start, end = 'var ytInitialData = ', ';</script>'
  start, end = start.encode(), end.encode()
  data = data[data.find(start) + len(start):]
  data = data[:data.find(end)]

  # Convert to JSON
  try:
    return json.loads(data)
  except:
    return []

def getYT_JSON2(data):
  # Find where the page info is located
  start, end = 'ytcfg.set(', ');'
  start, end = start.encode(), end.encode()
  data = data[data.find(start) + len(start):]
  data = data[:data.find(end)]

  # Convert to JSON
  try:
    return json.loads(data)
  except:
    return []

def getYT_JSON3(data):
  # Find where the page info is located
  start, end = 'var ytInitialPlayerResponse = ', ';</script>'
  start, end = start.encode(), end.encode()
  data = data[data.find(start) + len(start):]

  data = data[:data.find(end)]

  # Convert to JSON
  try:
    return json.loads(data)
  except:
    return []
  
def find_key_like(o, s):
  result = []
  if type(o) is dict:
    for k, v in o.items():
      if s in k:
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

if __name__ == '__main__':
  server = ThreadedHTTPServer(('localhost', 8080), Handler)
  server.serve_forever()
