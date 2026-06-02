import { Router } from 'express';
import db from '../db/connection.js';
import { authenticateToken, optionalAuth } from '../middleware/auth.js';

const router = Router();

// POST /api/orders — Create a new order
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { items, customerInfo, deliveryType, total } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    if (!customerInfo || !customerInfo.name || !customerInfo.phone) {
      return res.status(400).json({ error: 'Customer name and phone are required' });
    }

    // Insert order
    const userId = req.user ? req.user.id : null;

    const orderResult = await db.execute({
      sql: `INSERT INTO orders (user_id, customer_name, customer_phone, customer_address, delivery_type, total)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        customerInfo.name,
        customerInfo.phone,
        customerInfo.address || '',
        deliveryType || 'pickup',
        total,
      ],
    });

    const orderId = Number(orderResult.lastInsertRowid);

    // Insert order items
    for (const item of items) {
      await db.execute({
        sql: 'INSERT INTO order_items (order_id, menu_item_id, title, price, quantity) VALUES (?, ?, ?, ?, ?)',
        args: [orderId, item.id, item.title, item.price, item.quantity],
      });
    }

    res.status(201).json({
      message: 'Order placed successfully!',
      order: {
        id: orderId,
        total,
        status: 'pending',
        deliveryType: deliveryType || 'pickup',
        itemCount: items.length,
      },
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

// GET /api/orders/my — Get orders for the authenticated user
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const ordersResult = await db.execute({
      sql: 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.user.id],
    });

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

    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET /api/orders/user/:userId — Get orders for a specific user (protected)
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    // Users can only view their own orders
    if (req.user.id !== Number(req.params.userId)) {
      return res.status(403).json({ error: 'You can only view your own orders' });
    }

    const ordersResult = await db.execute({
      sql: 'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      args: [req.params.userId],
    });

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

    res.json(orders);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export default router;
