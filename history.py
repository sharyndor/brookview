import json
import os
import sqlite3
import threading
from time import time


class History:
  def __init__(self, db : str, max_age : int):
    self.connection = sqlite3.connect(db)
    self.connection.row_factory = dict_factory

    self.cursor = self.connection.cursor()

    self.lock = threading.Lock()

    self.max_age = max_age

    self.create_db()
    self.cleanup_videos()

  def create_db(self):
    self.create_channel_table()
    self.create_video_table()
    self.dump_channels()

    for channel in collect_json('./streamers'):
      self.insert_channel(channel)

    self.connection.commit()

  def create_table(self, tableName : str, schema : list[str]):
    command = 'CREATE TABLE IF NOT EXISTS {}({})'.format(tableName, ', '.join(schema))
    self.cursor.execute(command)

  def create_channel_table(self):
    name = 'channels'
    schema = [
      'name TEXT PRIMARY_KEY',
      'grouping TEXT',
      'aliases TEXT',
      'yt_id TEXT UNIQUE',
      'yt_handle TEXT UNIQUE',
      'yt_old_handle TEXT UNIQUE',
      'ttv_handle TEXT UNIQUE',
    ]
    self.create_table(name, schema)
  
  def create_video_table(self):
    name = 'videos'
    schema = [
      'id TEXT PRIMARY_KEY',
      'name TEXT NOT NULL',
      'channel TEXT NOT NULL',
      'start_time INTEGER NOT NULL',
      'update_time INTEGER NOT NULL',
    ]
    self.create_table(name, schema)

  def _insert(self, table : str, row : dict):
    with self.lock:
      key_string = ', '.join(':' + key for key in row.keys())
      command = "INSERT OR IGNORE INTO {} VALUES ({})".format(table, key_string)
      self.cursor.execute(command, row)

  def _update(self, table : str, row : dict):
    with self.lock:
      key_string = ', '.join(':' + key for key in row.keys())
      command = "INSERT OR UPDATE INTO {} VALUES ({})".format(table, key_string)
      self.cursor.execute(command, row)
  
  def _select(self, table : str, column : str, where : str, value, order=''):
    with self.lock:
      command = 'SELECT * from {} where {} {} ? {}'.format(table, column, where, order)
      self.cursor.execute(command, (value,))
      rows = self.cursor.fetchall()
    return rows

  def insert_channel(self, channel : dict):
    channel.setdefault('grouping', 'Ungrouped')
    self._insert('channels', channel)
  
  def update_channel(self, channel : dict):
    self._update('channels', channel)
  
  def select_channel(self, column : str, value : str, *, compare : str ='=', order=''):
    return self._select('channels', column, compare, value, order=order)
  
  def dump_channels(self):
    rows = self.select_channel(1, 1, order='ORDER BY grouping ASC, name ASC')
    group_names = list({row['grouping'].split(',')[0].strip() for row in rows})
    groups = {name : [row for row in rows if row['grouping'].startswith(name)] for name in group_names}
    for group in groups:
      with open(os.path.join('./streamers', group + '.json'), 'w') as file:
        json.dump(groups[group], file, indent=2)
  
  def insert_video(self, video : dict):
    video['update_time'] = int(time())
    self._insert('videos', video)
  
  def update_video(self, video : dict):
    video['update_time'] = int(time())
    self._update('videos', video)
  
  def select_video(self, column : str, value : str, compare : str ='='):
    return self._select('videos', column, compare, value)
  
  def cleanup_videos(self):
    with self.lock:
      cur_time = int(time())
      limit_time = cur_time - self.max_age
      self.cursor.execute('DELETE FROM videos WHERE update_time < {}'.format(limit_time))
      self.connection.commit()

def dict_factory(cursor : sqlite3.Cursor, row : list):
  fields = [column[0] for column in cursor.description]
  return {key : value for key, value in zip(fields, row)}
  
def collect_json(path : str):
  jdata = []
  for name in os.listdir(path):
    file_path = os.path.join(path, name)
    if file_path.endswith('.json') and os.path.isfile(file_path):
      with open(file_path) as file:
        jdata += json.load(file)
  return jdata

if __name__ == '__main__':
  history = History('brookview.db', 300)
  print(history.select_channel('ttv_handle', 'shylily'))
