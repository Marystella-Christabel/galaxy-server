import { Router } from 'express';
import db from '../db/connection.js';

const router = Router();

// POST /api/contact — Submit a contact message
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    await db.execute({
      sql: 'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
      args: [name, email, subject, message],
    });

    res.status(201).json({ message: 'Your message has been sent successfully! We will get back to you soon.' });
  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
