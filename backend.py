from http.client import HTTPSConnection
from http.server import HTTPServer, SimpleHTTPRequestHandler
from http import HTTPStatus
from socketserver import ThreadingMixIn
from urllib.parse import urlparse, parse_qs

import json
import math

from time import time
from typing import Any, Callable
from util import *


from history import History, Channel

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
  """Handle requests in a separate thread."""

class Handler(SimpleHTTPRequestHandler):
  def __init__(self, *args, **kwargs):
    self.get_handlers = {
      '/info' : handle_info_get,
      '/live' : handle_live_get,
    }

    self.post_handlers = {
      '/info' : handle_info_post,
    }

    self.patch_handlers = {
      '/info' : handle_info_patch,
    }

    super(Handler, self).__init__(*args, **kwargs)

  def do_GET(self):
    for handlerPath, handler in self.get_handlers.items():
      if self.path.startswith(handlerPath):
        try:
          status, data = handler(self.path.removeprefix(handlerPath))
          return self.respond(status, data)
        except:
          return self.respond(HTTPStatus.INTERNAL_SERVER_ERROR, None)

    return SimpleHTTPRequestHandler.do_GET(self)

  def do_POST(self):
    for handlerPath, handler in self.post_handlers.items():
      if self.path.startswith(handlerPath):
        try:
          return self.respond(HTTPStatus.OK, handler(self.path.removeprefix(handlerPath)))
        except:
          return self.respond(HTTPStatus.INTERNAL_SERVER_ERROR, None)

  def do_PATCH(self):
    for handlerPath, handler in self.patch_handlers.items():
      if self.path.startswith(handlerPath):
        try:
          return self.respond(HTTPStatus.OK, handler(self.path.removeprefix(handlerPath)))
        except:
          return self.respond(HTTPStatus.INTERNAL_SERVER_ERROR, None)

    return SimpleHTTPRequestHandler.do_GET(self)

  def respond(self, status : HTTPStatus, data : dict | None):
    self.send_response(status)
    self.send_header('Content-Type', 'application/json')
    self.end_headers()

    data = data or {}
    self.wfile.write(json.dumps(data, indent=2).encode())

  
def collect_from_channel(id_type, id):
  if   id_type == 'yt_id':         status, jdata = query_youtube(f'/channel/{id}/streams')
  elif id_type == 'yt_handle':     status, jdata = query_youtube(f'/@{id}/streams')
  elif id_type == 'yt_old_handle': status, jdata = query_youtube(f'/c/{id}/streams')
  else: return HTTPStatus.BAD_REQUEST, None

  if status == HTTPStatus.NOT_FOUND:
    return HTTPStatus.NOT_FOUND, None

  metadata = jdata['metadata']['channelMetadataRenderer']

  # Extract the channel id
  search = { 'yt_id' : metadata['externalId'] }

  # Set aside the data to preserve
  keep_data = {
    'name'      : metadata['title'],
    id_type     : id,
    'yt_handle' : metadata['vanityChannelUrl'].removeprefix('http://www.youtube.com/@')
  }

  for vdata in find_key_like(jdata, 'videoRenderer'):
    if upcomingEventData := find_key_like(vdata, 'upcomingEventData'):
      # Upcoming stream, keep searching for a live one
      history.update_channel(
        search,
        keep_data,
        replace_data = {
          'live'       : False,
          'video_id'   : vdata['videoId'],
          'video_name' : find_key_like(vdata['title'], 'text')[0],
          'start_time' : upcomingEventData[0]['startTime'],
        }
      )
    elif viewCountText := find_key_like(vdata['viewCountText'], 'text'):
      if 'watching' in ' '.join(viewCountText):
        return HTTPStatus.OK, history.update_channel(
          search,
          keep_data,
          replace_data = {
            'live'       : True,
            'video_id'   : vdata['videoId'],
            'video_name' : find_key_like(vdata['title'], 'text')[0],
            'start_time' : None,
          }
        )
  
  return HTTPStatus.OK, history.update_channel(
    search,
    keep_data,
    replace_data = {
      'live'       : False,
      'video_id'   : None,
      'video_name' : None,
      'start_time' : None,
    }
  )

def collect_from_video(id_type, id):
  if id_type == 'video_id':  status, jdata = query_youtube(f'/watch?v={id}')
  else: return HTTPStatus.BAD_REQUEST, None

  if status == HTTPStatus.NOT_FOUND:
    return HTTPStatus.NOT_FOUND, None

  # Extract the video data
  vdata = find_key_like(jdata, 'videoPrimaryInfoRenderer')[0]

  # Extract the channel data
  cdata = find_key_like(jdata, 'videoOwnerRenderer')[0]

  # Extract the channel id
  search = { 'yt_id' : find_key_like(cdata, 'browseId')[0] }

  # Extract the live status
  live = find_key_like(vdata, 'isLive')

  # Set aside the data to preserve
  keep_data = {
    'name'      : find_key_like(cdata['title'], 'text')[0],
    'yt_handle' : find_key_like(cdata, 'canonicalBaseUrl')[0].removeprefix('/@')
  }

  return HTTPStatus.OK, history.update_channel(
    search,
    keep_data,
    replace_data = {
      'live'       : True if live else False,
      'video_id'   : id   if live else None,
      'video_name' : None if live else None,
      'start_time' : None,
    }
  )

def handle_generic_get_update(id_type : str, id, collect_fun : Callable[[Any, Any], tuple[HTTPStatus, Channel | None]], check_time : bool):
  status, data = HTTPStatus.OK, history.find_channel({ id_type : id })

  if data is None:
    status, data = collect_fun(id_type, id)
  elif check_time and age(data.last_video_update) > history.max_age:
    status, data = collect_fun(id_type, id)

  # If something failed, return an empty dictionary
  data = data.encode() if data else None

  return status, data

def handle_info_get(pathQuery : str):
  parse_result  = urlparse(pathQuery)
  queries = parse_qs(parse_result.query)

  if 'id_type' in queries and 'id' in queries and queries['id_type'][0] in info_getters:
    id_type, id = queries['id_type'][0], queries['id'][0]
    return handle_generic_get_update(id_type, id, info_getters[id_type], check_time=False)
  
  # Missing fields
  return HTTPStatus.BAD_REQUEST, None

def handle_live_get(pathQuery : str):
  parse_result  = urlparse(pathQuery)
  queries = parse_qs(parse_result.query)

  if 'id_type' in queries and 'id' in queries and queries['id_type'][0] in info_getters:
    id_type, id = queries['id_type'][0], queries['id'][0]
    return handle_generic_get_update(id_type, id, info_getters[id_type], check_time=True)
  
  # Missing fields
  return HTTPStatus.BAD_REQUEST, None

def handle_info_post(pathQuery : str):
  pass

def handle_info_patch(pathQuery : str):
  pass

def query_site(site : str, query : str):
  conn = HTTPSConnection(site)
  conn.request('GET', query)
  response = conn.getresponse()
  return response.status, response.read()

def query_youtube(query):
  print(f'Query YT: {query}')
  status, data = query_site('www.youtube.com', query)

  return status, get_YT_JSON(data)
  
def get_YT_JSON(data : bytes):
  # Find where the page info is located
  start, end = 'var ytInitialData = ', ';</script>'
  start, end = start.encode(), end.encode()

  objdata = data

  startPos = objdata.find(start)
  objdata = objdata[startPos + len(start):]

  endPos = objdata.find(end)
  objdata = objdata[:endPos]

  # Convert to JSON
  try:
    obj = json.loads(objdata)
    log_to_json('resolve.json', obj)
    return obj
  except:
    log_bytes_to_file('resolve.html', data)
    return {}

history = History(max_age=300)

info_getters = {
  'video_id'      : collect_from_video  ,
  'yt_id'         : collect_from_channel,
  'yt_handle'     : collect_from_channel,
  'yt_old_handle' : collect_from_channel,
}

if __name__ == '__main__':
  address = 'localhost', 8080
  print('Starting on {}:{}'.format(*address))

  server = ThreadedHTTPServer(address, Handler)
  server.serve_forever()
