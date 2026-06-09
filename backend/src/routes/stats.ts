import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/dashboard', authMiddleware, requireRole('admin', 'collector'), (req: Request, res: Response) => {
  const role = req.user!.role;
  const collectorId = req.user!.userId;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  let apptWhere = '';
  let params: any[] = [];
  if (role === 'collector') {
    apptWhere = 'WHERE a.collectorId = ?';
    params.push(collectorId);
  }

  const overview = db.prepare(`
    SELECT
      COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as totalCompleted,
      COUNT(DISTINCT a.id) as totalAppointments,
      COUNT(DISTINCT a.residentId) as totalParticipants,
      COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.actualPoints ELSE 0 END), 0) as totalPoints,
      COUNT(DISTINCT CASE WHEN a.status = 'completed' AND DATE(a.completedAt) = ? THEN a.id END) as todayCompleted,
      COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as pendingAccept,
      AVG(CASE WHEN a.status = 'completed' AND a.rating IS NOT NULL THEN a.rating END) as avgRating
    FROM appointments a
    ${apptWhere}
  `).get(today, ...params) as any;

  const itemsQuery = role === 'collector'
    ? `
      SELECT cat.name as category, cat.icon, cat.unit,
             COALESCE(SUM(ai.actualQuantity), 0) as totalQuantity,
             COUNT(DISTINCT a.id) as orderCount
      FROM categories cat
      LEFT JOIN appointment_items ai ON cat.id = ai.categoryId
      LEFT JOIN appointments a ON ai.appointmentId = a.id AND a.status = 'completed' AND a.collectorId = ?
      GROUP BY cat.id
      ORDER BY totalQuantity DESC
    `
    : `
      SELECT cat.name as category, cat.icon, cat.unit,
             COALESCE(SUM(ai.actualQuantity), 0) as totalQuantity,
             COUNT(DISTINCT a.id) as orderCount
      FROM categories cat
      LEFT JOIN appointment_items ai ON cat.id = ai.categoryId
      LEFT JOIN appointments a ON ai.appointmentId = a.id AND a.status = 'completed'
      GROUP BY cat.id
      ORDER BY totalQuantity DESC
    `;
  const categoryStats = db.prepare(itemsQuery).all(...params);

  const trendQuery = role === 'collector'
    ? `
      SELECT DATE(completedAt) as date,
             COUNT(*) as count,
             COALESCE(SUM(actualPoints), 0) as points
      FROM appointments
      WHERE status = 'completed' AND collectorId = ?
        AND completedAt >= DATE('now', '-30 days')
      GROUP BY DATE(completedAt)
      ORDER BY date ASC
    `
    : `
      SELECT DATE(completedAt) as date,
             COUNT(*) as count,
             COALESCE(SUM(actualPoints), 0) as points
      FROM appointments
      WHERE status = 'completed'
        AND completedAt >= DATE('now', '-30 days')
      GROUP BY DATE(completedAt)
      ORDER BY date ASC
    `;
  const trend = db.prepare(trendQuery).all(...params);

  let totalCarbon = 0;
  const carbonFactors: Record<string, number> = {
    '废纸': 1.5,
    '塑料瓶': 0.8,
    '金属罐': 5.0,
    '旧衣物': 2.0,
    '电子废弃物': 8.0,
    '废电池': 0.5,
    '玻璃瓶': 0.3,
    '废旧家电': 50.0,
  };
  for (const cat of categoryStats as any[]) {
    const factor = carbonFactors[cat.category] || 1;
    totalCarbon += cat.totalQuantity * factor;
  }

  let collectorRanking: any[] = [];
  if (role === 'admin') {
    collectorRanking = db.prepare(`
      SELECT c.id as collectorId, c.realName as collectorName,
             COUNT(DISTINCT a.id) as totalOrders,
             COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as completedOrders,
             COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.actualPoints ELSE 0 END), 0) as totalPoints,
             AVG(CASE WHEN a.status = 'completed' AND a.rating IS NOT NULL THEN a.rating END) as avgRating
      FROM users c
      LEFT JOIN appointments a ON c.id = a.collectorId
        AND DATE(a.createdAt) >= ?
      WHERE c.role = 'collector'
      GROUP BY c.id
      ORDER BY completedOrders DESC, totalPoints DESC
    `).all(thisMonthStart);
  }

  const residents = role === 'admin' ? db.prepare(`
    SELECT u.id, u.realName, u.username, u.phone, u.address,
           COUNT(a.id) as appointmentCount,
           COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.actualPoints ELSE 0 END), 0) as earnedPoints,
           pa.currentPoints
    FROM users u
    LEFT JOIN appointments a ON u.id = a.residentId
    LEFT JOIN points_accounts pa ON u.id = pa.userId
    WHERE u.role = 'resident'
    GROUP BY u.id
    ORDER BY appointmentCount DESC
  `).all() : [];

  res.json({
    success: true,
    data: {
      overview: {
        ...overview,
        totalCarbonReduction: Math.round(totalCarbon * 100) / 100,
      },
      categoryStats,
      trend,
      collectorRanking,
      residents,
    },
  });
});

router.get('/collector/me', authMiddleware, requireRole('collector'), (req: Request, res: Response) => {
  const collectorId = req.user!.userId;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const stats = db.prepare(`
    SELECT
      COUNT(DISTINCT a.id) as monthOrders,
      COUNT(DISTINCT CASE WHEN a.status = 'completed' THEN a.id END) as monthCompleted,
      COALESCE(SUM(CASE WHEN a.status = 'completed' THEN a.actualPoints ELSE 0 END), 0) as monthPoints,
      AVG(CASE WHEN a.status = 'completed' AND a.rating IS NOT NULL THEN a.rating END) as avgRating,
      COUNT(DISTINCT CASE WHEN a.status = 'completed' AND a.rating = 5 THEN a.id END) as fiveStarCount,
      COUNT(DISTINCT CASE WHEN DATE(a.completedAt) = ? THEN a.id END) as todayCompleted,
      COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as pendingTasks
    FROM appointments a
    WHERE a.collectorId = ? AND DATE(a.createdAt) >= ?
  `).get(today, collectorId, thisMonthStart) as any;

  const todayTasks = db.prepare(`
    SELECT a.*, u.realName as residentName, u.phone as residentPhone
    FROM appointments a
    JOIN users u ON a.residentId = u.id
    WHERE a.collectorId = ? AND a.expectedDate = ?
    ORDER BY a.expectedTimeSlot ASC
  `).all(collectorId, today);

  const ranking = db.prepare(`
    SELECT c.id, c.realName,
           COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed
    FROM users c
    LEFT JOIN appointments a ON c.id = a.collectorId
      AND DATE(a.createdAt) >= ?
    WHERE c.role = 'collector'
    GROUP BY c.id
    ORDER BY completed DESC
  `).all(thisMonthStart);

  const myRank = ranking.findIndex((r: any) => r.id === collectorId) + 1;

  res.json({
    success: true,
    data: {
      stats,
      todayTasks,
      rank: { position: myRank, total: ranking.length, monthCompleted: ranking },
    },
  });
});

export default router;
