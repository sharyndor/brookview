import json
import os
from time import time as ftime

def find_key_like(o, s) -> list:
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
  
def collect_json(path : str):
  jdata = []
  for name in os.listdir(path):
    file_path = os.path.join(path, name)
    if file_path.endswith('.json') and os.path.isfile(file_path):
      group_name = os.path.basename(file_path).removesuffix('.json')
      with open(file_path) as file:
        channels = json.load(file)
        # Fix up channel groupings when mismatched
        for channel in channels:
          if channel['grouping'] != group_name:
            channel['grouping'] = group_name
        jdata += channels
  return jdata

def log_to_json(name : str, data : object):
  with open(name, 'w') as file:
    json.dump(data, file, indent=2)

def log_bytes_to_file(name : str, data : bytes):
  with open(name, 'wb') as file:
    file.write(data)

def time():
  return int(ftime())

def age(t : int):
  return time() - t