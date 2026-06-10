import { Router, Request, Response } from 'express';
import db from '../db';
import { signToken, authMiddleware, AuthPayload } from '../middleware/auth';
import { User } from '../types';

const router = Router();

router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.json({ success: false, message: '请输入用户名和密码' });
    return;
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User | undefined;
  if (!user || user.password !== password) {
    res.json({ success: false, message: '用户名或密码错误' });
    return;
  }
  const payload: AuthPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
    realName: user.realName,
  };
  const token = signToken(payload);

  const currentYear = new Date().getFullYear();
  if (user.role === 'resident') {
    const account = db.prepare('SELECT * FROM points_accounts WHERE userId = ?').get(user.id);
    if (!account) {
      db.prepare('INSERT INTO points_accounts (userId, currentPoints, lastYearPoints, currentYear) VALUES (?, 0, 0, ?)').run(user.id, currentYear);
    } else {
      if (account.currentYear < currentYear) {
        const rolloverPoints = Math.floor(account.lastYearPoints / 2);
        const newCurrent = account.currentPoints + rolloverPoints;
        db.prepare(`
          UPDATE points_accounts
          SET currentPoints = ?, lastYearPoints = ?, currentYear = ?, updatedAt = datetime('now', 'localtime')
          WHERE userId = ?
        `).run(newCurrent, account.currentPoints, currentYear, user.id);
        if (rolloverPoints > 0) {
          const balance = newCurrent;
          db.prepare(`
            INSERT INTO points_records (userId, type, points, balance, year, description)
            VALUES (?, 'rollover', ?, ?, ?, ?)
          `).run(user.id, rolloverPoints, balance, currentYear, `${account.currentYear}年度积分折半结转`);
        }
      }
    }
  }

  res.json({
    success: true,
    message: '登录成功',
    data: {
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        nickname: user.nickname,
        phone: user.phone,
        role: user.role,
        address: user.address,
        community: user.community,
      },
    },
  });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = db.prepare('SELECT id, username, realName, nickname, phone, role, address, community, createdAt FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ success: false, message: '用户不存在' });
    return;
  }
  res.json({ success: true, data: user });
});

router.put('/profile', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { realName, nickname, phone, address, community } = req.body;
  
  const fields: string[] = [];
  const params: any[] = [];
  
  if (realName !== undefined) { fields.push('realName = ?'); params.push(realName); }
  if (nickname !== undefined) { fields.push('nickname = ?'); params.push(nickname); }
  if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
  if (address !== undefined) { fields.push('address = ?'); params.push(address); }
  if (community !== undefined) { fields.push('community = ?'); params.push(community); }
  
  if (fields.length === 0) {
    res.json({ success: true, message: '没有需要更新的字段' });
    return;
  }
  
  params.push(userId);
  db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  
  const user = db.prepare('SELECT id, username, realName, nickname, phone, role, address, community, createdAt FROM users WHERE id = ?').get(userId);
  res.json({ success: true, message: '信息更新成功', data: user });
});

router.get('/notifications', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { limit = 20, offset = 0 } = req.query;
  
  const notifications = db.prepare(`
    SELECT * FROM notifications 
    WHERE userId = ? 
    ORDER BY createdAt DESC 
    LIMIT ? OFFSET ?
  `).all(userId, Number(limit), Number(offset));
  
  const unreadCount = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0
  `).get(userId) as { count: number };
  
  res.json({ 
    success: true, 
    data: { 
      list: notifications, 
      unreadCount: unreadCount.count,
      total: notifications.length
    } 
  });
});

router.get('/notifications/unread', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = db.prepare(`
    SELECT COUNT(*) as count FROM notifications WHERE userId = ? AND read = 0
  `).get(userId) as { count: number };
  
  res.json({ success: true, data: { unreadCount: result.count } });
});

router.put('/notifications/:id/read', authMiddleware, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userId = req.user!.userId;
  
  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);
  if (!notification) {
    res.status(404).json({ success: false, message: '通知不存在' });
    return;
  }
  if (notification.userId !== userId) {
    res.status(403).json({ success: false, message: '无权操作此通知' });
    return;
  }
  
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ?').run(id);
  res.json({ success: true, message: '已标记为已读' });
});

router.put('/notifications/read-all', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  db.prepare('UPDATE notifications SET read = 1 WHERE userId = ? AND read = 0').run(userId);
  res.json({ success: true, message: '全部已读' });
});

export default router;
