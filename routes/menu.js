import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// GET /api/menu — Get all menu items (optional ?category= filter)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;

    let result;
    if (category && category !== 'All') {
      result = await db.execute({
        sql: 'SELECT * FROM menu_items WHERE category = ?',
        args: [category],
      });
    } else {
      result = await db.execute('SELECT * FROM menu_items');
    }

    res.json({
      items: result.rows,
      categories: ['All', 'Rice', 'Swallow', 'Grill', 'Soups', 'Sides'],
    });
  } catch (error) {
    console.error('Menu fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu items' });
  }
});

// GET /api/menu/:id — Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM menu_items WHERE id = ?',
      args: [req.params.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Menu item fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

export default router;
