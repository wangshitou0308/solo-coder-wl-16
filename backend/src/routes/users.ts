import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { role } = req.query;
  let query = 'SELECT id, username, realName, phone, role, address, createdAt FROM users';
  const params: any[] = [];
  if (role && role !== 'all') {
    query += ' WHERE role = ?';
    params.push(role);
  }
  query += ' ORDER BY createdAt DESC';
  const users = db.prepare(query).all(...params);
  res.json({ success: true, data: users });
});

router.get('/collectors', authMiddleware, (_req: Request, res: Response) => {
  const collectors = db.prepare(`
    SELECT u.id, u.realName, u.phone,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completedOrders,
           AVG(CASE WHEN a.status = 'completed' AND a.rating IS NOT NULL THEN a.rating END) as avgRating
    FROM users u
    LEFT JOIN appointments a ON u.id = a.collectorId
    WHERE u.role = 'collector'
    GROUP BY u.id
  `).all();
  res.json({ success: true, data: collectors });
});

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { username, password, realName, phone, role, address } = req.body;
  if (!username || !password || !realName || !phone || !role) {
    res.status(400).json({ success: false, message: '请填写完整信息' });
    return;
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(400).json({ success: false, message: '用户名已存在' });
    return;
  }
  const result = db.prepare(`
    INSERT INTO users (username, password, realName, phone, role, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, password, realName, phone, role, address || null);

  if (role === 'resident') {
    const currentYear = new Date().getFullYear();
    db.prepare('INSERT INTO points_accounts (userId, currentPoints, lastYearPoints, currentYear) VALUES (?, 0, 0, ?)').run(result.lastInsertRowid, currentYear);
  }

  res.json({ success: true, message: '创建成功', data: { id: result.lastInsertRowid } });
});

router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { realName, phone, role, address } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) {
    res.status(404).json({ success: false, message: '用户不存在' });
    return;
  }
  db.prepare(`
    UPDATE users
    SET realName = COALESCE(?, realName),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        address = COALESCE(?, address)
    WHERE id = ?
  `).run(realName, phone, role, address, id);
  res.json({ success: true, message: '更新成功' });
});

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  if (id === req.user!.userId) {
    res.status(400).json({ success: false, message: '不能删除自己' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
  res.json({ success: true, message: '删除成功' });
});

export default router;
