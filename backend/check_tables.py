import sqlite3

def check():
    conn = sqlite3.connect('production.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("TABLES IN production.db:", cursor.fetchall())

    conn2 = sqlite3.connect('sqlite.db')
    cursor2 = conn2.cursor()
    cursor2.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print("TABLES IN sqlite.db:", cursor2.fetchall())

if __name__ == "__main__":
    check()
