import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/account', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const account = db.prepare('SELECT * FROM points_accounts WHERE userId = ?').get(userId);
  if (!account) {
    const currentYear = new Date().getFullYear();
    db.prepare('INSERT INTO points_accounts (userId, currentPoints, lastYearPoints, currentYear) VALUES (?, 0, 0, ?)').run(userId, currentYear);
    res.json({ success: true, data: { userId, currentPoints: 0, lastYearPoints: 0, currentYear } });
    return;
  }
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type = 'earn' THEN points ELSE 0 END), 0) as totalEarned,
      COALESCE(SUM(CASE WHEN type = 'spend' THEN ABS(points) ELSE 0 END), 0) as totalSpent,
      COUNT(*) as totalRecords
    FROM points_records WHERE userId = ? AND year = ?
  `).get(userId, new Date().getFullYear());

  res.json({ success: true, data: { ...account, ...stats } });
});

router.get('/records', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  const { limit = 20, offset = 0, type } = req.query;

  let records: any[];
  let total: number;

  if (role === 'resident') {
    let whereClause = 'userId = ?';
    const params: any[] = [userId];
    if (type && type !== 'all') {
      whereClause += ' AND type = ?';
      params.push(type);
    }
    records = db.prepare(`
      SELECT pr.*,
        CASE WHEN type = 'earn' THEN '+points'
             WHEN type = 'spend' THEN '-points'
             ELSE 'rollover' END as display
      FROM points_records pr
      WHERE ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit as string), parseInt(offset as string));
    total = (db.prepare(`SELECT COUNT(*) as count FROM points_records WHERE ${whereClause}`).get(...params) as any).count;
  } else {
    records = db.prepare(`
      SELECT pr.*, u.realName as userName, u.username
      FROM points_records pr
      JOIN users u ON pr.userId = u.id
      ORDER BY pr.createdAt DESC
      LIMIT ? OFFSET ?
    `).all(parseInt(limit as string), parseInt(offset as string));
    total = (db.prepare('SELECT COUNT(*) as count FROM points_records').get() as any).count;
  }

  res.json({ success: true, data: { records, total, limit, offset } });
});

export default router;
