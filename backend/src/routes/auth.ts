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
        phone: user.phone,
        role: user.role,
        address: user.address,
      },
    },
  });
});

router.get('/me', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = db.prepare('SELECT id, username, realName, phone, role, address, createdAt FROM users WHERE id = ?').get(userId);
  if (!user) {
    res.status(404).json({ success: false, message: '用户不存在' });
    return;
  }
  res.json({ success: true, data: user });
});

router.put('/profile', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { realName, phone, address } = req.body;
  db.prepare('UPDATE users SET realName = COALESCE(?, realName), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE id = ?')
    .run(realName, phone, address, userId);
  const user = db.prepare('SELECT id, username, realName, phone, role, address, createdAt FROM users WHERE id = ?').get(userId);
  res.json({ success: true, message: '信息更新成功', data: user });
});

export default router;
