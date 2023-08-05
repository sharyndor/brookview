import os
import threading

from typing import Any, Callable, Optional

from util import collect_json, log_to_json, age, time

class Channel():
  serialized = [
    "name", "grouping", "aliases",
    "yt_id", "yt_handle", "yt_old_handle", "ttv_handle"
  ]

  video_tags = [
    'live', 'video_id', 'video_name'
  ]

  def __init__(self, data : dict):
    self.data = data
    self.data.setdefault('grouping', 'Ungrouped')

    for k, v in data.items():
      self.set(k, v)

    self.dirty = False
    self.last_video_update = 0

  def set(self, key : str, value : str):
    if key in self.video_tags:
      self.last_video_update = time()
      
    # Only do something if data has changed
    if self.data.get(key) != value:
      # If it's a serialized value, mark the channel as dirty
      if key in self.serialized:
        self.dirty = True
      # If None, remove entirely. 
      if value is None:
        del self.data[key]
      # Otherwise update
      else:
        self.data[key] = value

  def get(self, key : str):
    # Return None if not found
    return None if key not in self.data else self.data[key]
  
  def clear_dirty(self):
    original, self.dirty = self.dirty, False
    return original
  
  def encode(self):
    return { key : value for key, value in self.data.items() }

  def serialize(self):
    return { key : value for key, value in self.data.items() if key in self.serialized }

class History:
  def __init__(self, max_age : int):
    self.lock = threading.RLock()
    self.max_age = max_age

    self.channels : list[Channel] = []

    for channel in collect_json('./streamers'):
      self.add_channel(channel)
    self.dump_channels(force_dump=True)
  
  def dump_channels(self, force_dump=False):
    with self.lock:
      if force_dump:
        for channel in self.channels:
          channel.dirty = True

      groups = [channel.get('grouping') for channel in self.channels]
      unique_groups : set[str] = set([x for x in groups if x])
      for group in unique_groups:
        self.dump_group(group)

  def dump_group(self, name : str | None):
    with self.lock:
      group = [channel for channel in self.channels if channel.get('grouping') == name]

      dump_needed = any(channel.clear_dirty() for channel in group)

      if dump_needed:
        path = os.path.join('.', 'streamers', f'{name}.json')
        log_to_json(path, [channel.serialize() for channel in group])
  
  def dump_associated_group(self, channel : Channel):
    with self.lock:
      self.dump_group(channel.get('grouping'))
  
  def add_channel(self, data : dict):
    with self.lock:
      channel = Channel(data)
      self.channels.append(channel)
      return channel
    
  def find_channel(self, search : dict[str, Any]):
    with self.lock:
      # Lookup by the provided info
      for channel in self.channels:
        # If there's a match, update the data, return immediately
        if search.items() <= channel.data.items():
          return channel
      # Lookup failed, return None
      return None

  def find_channels(self, search : dict[str, Any]):
    with self.lock:
      return [channel for channel in self.channels if search.items() <= channel.data.items()]

  def update_channel(self, search : dict[str, Any], keep_data : dict[str, Any] = {}, replace_data : dict[str, Any] = {}):
    with self.lock:
      if channel := self.find_channel(search):
        # If there's a match, update the channel
        update_channel_data(channel, keep_data, False)
        update_channel_data(channel, replace_data, True)
      else:
        # Otherwise, combine the data and add as a new channel
        keep_data.update(search)
        replace_data.update(keep_data)
        channel = self.add_channel(replace_data)
        channel.dirty = True

      # Write out the group
      self.dump_associated_group(channel)      

      return channel
  
def update_channel_data(channel : Channel, data : dict, should_replace : bool):
  for key, value in data.items():
    update_channel_field(channel, key, value, should_replace)
  return channel
  
def update_channel_field(channel : Channel, key : str, value : Any, should_replace : bool):
  # Always update if field doesn't exist yet
  if not channel.data.get(key):
    should_replace = True

  # Otherwise, only update if requested
  if should_replace:
    channel.set(key, value)

if __name__ == '__main__':
  history = History(300)
