import { Router } from 'express';
import db from '../db/connection.js';
import { requireAdmin } from '../middleware/adminAuth.js';

const router = Router();

// All routes in this file require admin authentication
router.use(requireAdmin);

// GET /api/admin/stats — Dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const [menuCount, availableCount, ordersCount, revenueResult] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM menu_items'),
      db.execute('SELECT COUNT(*) as count FROM menu_items WHERE available = 1'),
      db.execute('SELECT COUNT(*) as count FROM orders'),
      db.execute('SELECT COALESCE(SUM(total), 0) as revenue FROM orders'),
    ]);

    res.json({
      totalItems: menuCount.rows[0].count,
      availableItems: availableCount.rows[0].count,
      totalOrders: ordersCount.rows[0].count,
      totalRevenue: revenueResult.rows[0].revenue,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/menu — List all menu items (including unavailable)
router.get('/menu', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM menu_items ORDER BY category, title');
    res.json({ items: result.rows });
  } catch (error) {
    console.error('Admin menu fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// POST /api/admin/menu — Add a new menu item
router.post('/menu', async (req, res) => {
  try {
    const { title, description, price, category, image_url } = req.body;

    if (!title || !price || !category) {
      return res.status(400).json({ error: 'Title, price, and category are required' });
    }

    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const result = await db.execute({
      sql: 'INSERT INTO menu_items (title, description, price, image_url, category, available) VALUES (?, ?, ?, ?, ?, 1)',
      args: [title, description || '', price, image_url || '', category],
    });

    const newItem = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [Number(result.lastInsertRowid)],
    });

    res.status(201).json({
      message: 'Menu item added successfully',
      item: newItem.rows[0],
    });
  } catch (error) {
    console.error('Admin add menu item error:', error);
    res.status(500).json({ error: 'Failed to add menu item' });
  }
});

// PUT /api/admin/menu/:id — Update a menu item
router.put('/menu/:id', async (req, res) => {
  try {
    const { title, description, price, category, image_url } = req.body;

    // Verify item exists
    const existing = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }

    const current = existing.rows[0];

    await db.execute({
      sql: `UPDATE menu_items SET title = ?, description = ?, price = ?, image_url = ?, category = ? WHERE id = ?`,
      args: [
        title || current.title,
        description !== undefined ? description : current.description,
        price || current.price,
        image_url !== undefined ? image_url : current.image_url,
        category || current.category,
        req.params.id,
      ],
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    res.json({
      message: 'Menu item updated successfully',
      item: updated.rows[0],
    });
  } catch (error) {
    console.error('Admin update menu item error:', error);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

// PATCH /api/admin/menu/:id/toggle — Toggle availability
router.patch('/menu/:id/toggle', async (req, res) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    const newAvailability = existing.rows[0].available === 1 ? 0 : 1;

    await db.execute({
      sql: 'UPDATE menu_items SET available = ? WHERE id = ?',
      args: [newAvailability, req.params.id],
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    res.json({
      message: `Menu item ${newAvailability ? 'enabled' : 'disabled'}`,
      item: updated.rows[0],
    });
  } catch (error) {
    console.error('Admin toggle availability error:', error);
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// DELETE /api/admin/menu/:id — Delete a menu item
router.delete('/menu/:id', async (req, res) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    await db.execute({
      sql: 'DELETE FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    console.error('Admin delete menu item error:', error);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// ==================== ORDERS MANAGEMENT ====================

// GET /api/admin/orders — List all orders with items (optionally filter by status)
router.get('/orders', async (req, res) => {
  try {
    const { status } = req.query;
    let ordersResult;

    if (status && status !== 'all') {
      ordersResult = await db.execute({
        sql: 'SELECT * FROM orders ORDER BY created_at DESC',
        args: [],
      });
      // Filter after fetching since Turso doesn't support all SQL features
      ordersResult.rows = ordersResult.rows.filter((o) => o.status === status);
    } else {
      ordersResult = await db.execute('SELECT * FROM orders ORDER BY created_at DESC');
    }

    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await db.execute({
        sql: 'SELECT * FROM order_items WHERE order_id = ?',
        args: [order.id],
      });
      orders.push({
        ...order,
        items: itemsResult.rows,
      });
    }

    res.json({ orders });
  } catch (error) {
    console.error('Admin orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PATCH /api/admin/orders/:id/status — Update order status
router.patch('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'preparing', 'delivered', 'cancelled'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const existing = await db.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [req.params.id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await db.execute({
      sql: 'UPDATE orders SET status = ? WHERE id = ?',
      args: [status, req.params.id],
    });

    const updated = await db.execute({
      sql: 'SELECT * FROM orders WHERE id = ?',
      args: [req.params.id],
    });

    // Fetch order items too
    const itemsResult = await db.execute({
      sql: 'SELECT * FROM order_items WHERE order_id = ?',
      args: [req.params.id],
    });

    res.json({
      message: `Order status updated to ${status}`,
      order: { ...updated.rows[0], items: itemsResult.rows },
    });
  } catch (error) {
    console.error('Admin update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// ==================== MESSAGES MANAGEMENT ====================

// GET /api/admin/messages — List all contact messages
router.get('/messages', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM contact_messages ORDER BY created_at DESC');
    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Admin messages fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// DELETE /api/admin/messages/:id — Delete a message
router.delete('/messages/:id', async (req, res) => {
  try {
    const existing = await db.execute({
      sql: 'SELECT * FROM contact_messages WHERE id = ?',
      args: [req.params.id],
    });

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await db.execute({
      sql: 'DELETE FROM contact_messages WHERE id = ?',
      args: [req.params.id],
    });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Admin delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// ==================== CUSTOMERS ====================

// GET /api/admin/customers — List all registered users with order stats
router.get('/customers', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        u.id, u.name, u.email, u.role, u.created_at,
        COUNT(o.id) as order_count,
        COALESCE(SUM(o.total), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);

    res.json({ customers: result.rows });
  } catch (error) {
    console.error('Admin customers fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;
