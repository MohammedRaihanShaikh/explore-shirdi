"""
Explore Shirdi — Database Inspector
Run: python inspect_db.py
Shows all tables, columns, and records in your database.
"""
import sqlite3
import os

DB_PATH = "explore_shirdi.db"

def inspect():
    if not os.path.exists(DB_PATH):
        print(f"❌ Database file '{DB_PATH}' does not exist yet.")
        print("   Start the backend (python run.py) to automatically create it.")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    print("=" * 60)
    print(" 🏛️ EXPLORE SHIRDI — DATABASE INSPECTION REPORT")
    print(f" 📁 Location: {os.path.abspath(DB_PATH)}")
    print(f" 📦 File Size: {os.path.getsize(DB_PATH):,} bytes")
    print("=" * 60)

    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cursor.fetchall()]

    if not tables:
        print("No tables found in database.")
        conn.close()
        return

    for table in tables:
        # Count rows
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]

        # Get column names
        cursor.execute(f"PRAGMA table_info({table})")
        cols = [col[1] for col in cursor.fetchall()]

        print(f"\n📋 Table: [{table.upper()}] — {count} record(s)")
        print(f"   Columns: {', '.join(cols)}")

        # Show first 5 rows
        if count > 0:
            cursor.execute(f"SELECT * FROM {table} LIMIT 5")
            rows = cursor.fetchall()
            for r in rows:
                print(f"   ↳ {r}")
        else:
            print("   ↳ (No records yet)")

    print("\n" + "=" * 60)
    conn.close()

if __name__ == "__main__":
    inspect()
