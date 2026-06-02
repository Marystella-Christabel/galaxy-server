import db from './connection.js';

export async function initDatabase() {
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image_url TEXT DEFAULT '',
        category TEXT NOT NULL,
        available INTEGER NOT NULL DEFAULT 1
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT DEFAULT '',
        delivery_type TEXT NOT NULL DEFAULT 'pickup',
        total REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        menu_item_id INTEGER,
        title TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
      )`,
      args: []
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
      )`,
      args: []
    }
  ]);

  // Add columns if they don't exist (for existing databases)
  try {
    await db.execute({ sql: 'ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT \'user\'', args: [] });
  } catch (e) {
    // Column already exists, ignore
  }
  try {
    await db.execute({ sql: 'ALTER TABLE menu_items ADD COLUMN available INTEGER NOT NULL DEFAULT 1', args: [] });
  } catch (e) {
    // Column already exists, ignore
  }

  console.log('✅ Database tables initialized');
}
