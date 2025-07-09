import sqlite3
from contextlib import closing

DB_PATH = 'logs.db'

def init_db():
    with closing(sqlite3.connect(DB_PATH)) as conn:
        with conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS query_logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  connection_id INTEGER,
                  tab_id TEXT,
                  query TEXT,
                  query_type TEXT,
                  success BOOLEAN,
                  error_message TEXT,
                  execution_time_ms INTEGER,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')
            conn.execute('''
                CREATE TABLE IF NOT EXISTS action_logs (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  action_type TEXT,
                  details TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            ''')

if __name__ == '__main__':
    init_db()
    print('Log database initialized.')
