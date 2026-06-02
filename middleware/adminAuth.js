import jwt from 'jsonwebtoken';
import db from '../db/connection.js';

/**
 * Admin authentication middleware.
 * Verifies JWT token AND checks that the user has the 'admin' role in the database.
 */
export async function requireAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify user still exists and is an admin
    const result = await db.execute({
      sql: 'SELECT id, name, email, role FROM users WHERE id = ?',
      args: [decoded.id],
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.error('Admin auth error:', err);
    return res.status(500).json({ error: 'Server error during authentication' });
  }
}
