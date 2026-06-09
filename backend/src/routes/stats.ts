import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

const carbonFactors: Record<string, number> = {
  '废纸': 1.5, '塑料瓶': 0.8, '金属罐': 5.0, '旧衣物': 2.0,
  '电子废弃物': 8.0, '废电池': 0.5, '玻璃瓶': 0.3, '废旧家电': 50.0,
};

router.get('/dashboard', authMiddleware, requireRole('admin', 'collector'), (req: Request, res: Response) => {
  const role = req.user!.role;
  const collectorId = req.user!.userId;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const apptAll = (db.prepare('SELECT * FROM appointments').all() || []) as any[];
  const itemsAll = (db.prepare(
    `SELECT ai.*, cat.name as category, cat.icon, cat.unit
     FROM appointment_items ai JOIN categories cat ON ai.categoryId = cat.id`
  ).all() || []) as any[];
  const pointsAll = (db.prepare('SELECT * FROM points_records').all() || []) as any[];
  const usersAll = (db.prepare('SELECT * FROM users').all() || []) as any[];
  const exchangeOrdersAll = (db.prepare('SELECT * FROM exchange_orders').all() || []) as any[];

  let appts = apptAll;
  if (role === 'collector') {
    appts = appts.filter(a => a.collectorId === collectorId || a.status === 'pending');
  }

  const completedAppts = appts.filter(a => a.status === 'completed');
  const residentIds = new Set(appts.map(a => a.residentId));

  let totalCarbon = 0;
  const completedIds = new Set(completedAppts.map(a => a.id));
  const completedItems = itemsAll.filter(i => completedIds.has(i.appointmentId));
  const categoryMap = new Map<string, { category: string; icon: string; unit: string; totalQuantity: number; value: number; orderCount: number }>();

  for (const item of completedItems) {
    const catName = item.category;
    const qty = item.actualQuantity ?? item.estimatedQuantity ?? 0;
    const factor = carbonFactors[catName] || 1;
    totalCarbon += qty * factor;
    if (!categoryMap.has(catName)) {
      categoryMap.set(catName, { category: catName, icon: item.icon, unit: item.unit, totalQuantity: 0, value: 0, orderCount: 0 });
    }
    const c = categoryMap.get(catName)!;
    c.totalQuantity += qty;
    c.value += qty;
    c.orderCount = new Set(completedItems.filter(i => i.category === catName).map(i => i.appointmentId)).size;
  }

  const categoryStats = Array.from(categoryMap.values()).sort((a, b) => b.totalQuantity - a.totalQuantity);

  const trend30: { dates: string[]; orders: number[]; points: number[]; co2: number[] } = { dates: [], orders: [], points: [], co2: [] };
  const dayMap = new Map<string, { orders: number; points: number; co2: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = d.toISOString().split('T')[0];
    dayMap.set(key, { orders: 0, points: 0, co2: 0 });
    trend30.dates.push(key.slice(5));
  }

  for (const appt of completedAppts) {
    const completedDay = appt.completedAt ? appt.completedAt.split(' ')[0] : '';
    const key = completedDay;
    if (!dayMap.has(key)) continue;
    const day = dayMap.get(key)!;
    day.orders += 1;
    day.points += Number(appt.actualPoints || 0);
    const its = completedItems.filter(i => i.appointmentId === appt.id);
    for (const it of its) {
      const factor = carbonFactors[it.category] || 1;
      day.co2 += (it.actualQuantity ?? it.estimatedQuantity ?? 0) * factor;
    }
  }
  for (const d of trend30.dates) {
    const fullKey = `${now.getFullYear()}-${d}`;
    const day = dayMap.get(fullKey) || { orders: 0, points: 0, co2: 0 };
    trend30.orders.push(day.orders);
    trend30.points.push(day.points);
    trend30.co2.push(Number(day.co2.toFixed(1)));
  }

  const residents = usersAll.filter(u => u.role === 'resident');
  const collectors = usersAll.filter(u => u.role === 'collector');
  const totalPoints = completedAppts.reduce((s, a) => s + Number(a.actualPoints || 0), 0);
  const exchangeSpent = exchangeOrdersAll.filter(e => e.status !== 'cancelled').reduce((s, e) => s + Number(e.totalPoints || 0), 0);

  let collectorRanking: any[] = [];
  if (role === 'admin') {
    collectorRanking = collectors.map(c => {
      const monthAppts = apptAll.filter(a =>
        a.collectorId === c.id && a.createdAt >= thisMonthStart
      );
      const completed = monthAppts.filter(a => a.status === 'completed');
      const ratings = completed.map(a => a.rating).filter(r => r !== null && r !== undefined) as number[];
      const ratingPct = ratings.length ? Math.round((ratings.filter(r => r === 5).length / ratings.length) * 100) : 0;
      const apptCompletedIds = new Set(completed.map(a => a.id));
      const w = completedItems.filter(i => apptCompletedIds.has(i.appointmentId))
        .reduce((s, i) => s + (i.actualQuantity ?? i.estimatedQuantity ?? 0), 0);
      return {
        id: c.id, realName: c.realName, username: c.username, phone: c.phone,
        completed: completed.length, totalOrders: monthAppts.length,
        points: completed.reduce((s, a) => s + Number(a.actualPoints || 0), 0),
        rating: ratings.length ? Math.round(ratings.reduce((s, r) => s + r, 0) / ratings.length * 20) : 0,
        weight: Math.round(w * 10) / 10,
      };
    }).sort((a, b) => b.completed - a.completed || b.points - a.points);
  }

  let summary: any;
  if (role === 'admin') {
    summary = {
      totalAppointments: appts.length,
      completedAppointments: completedAppts.length,
      totalPoints,
      participants: residentIds.size,
      carbonReductionKg: Math.round(totalCarbon * 100) / 100,
      residents: residents.length,
      exchangeOrders: exchangeOrdersAll.length,
      exchangedPoints: exchangeSpent,
    };
  } else {
    const mineCompleted = appts.filter(a => a.collectorId === collectorId && a.status === 'completed');
    const mineMonth = appts.filter(a => a.collectorId === collectorId && a.createdAt >= thisMonthStart);
    const mineCompletedToday = mineCompleted.filter(a => a.completedAt && a.completedAt.startsWith(today));
    const ratings = mineCompleted.map(a => a.rating).filter(r => r != null) as number[];
    summary = {
      monthOrders: mineMonth.length,
      monthCompleted: mineCompleted.filter(a => a.createdAt >= thisMonthStart).length,
      monthPoints: mineCompleted.filter(a => a.createdAt >= thisMonthStart).reduce((s, a) => s + Number(a.actualPoints || 0), 0),
      avgRating: ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : 0,
      fiveStarCount: ratings.filter(r => r === 5).length,
      todayCompleted: mineCompletedToday.length,
      pendingTasks: appts.filter(a => a.collectorId === collectorId && a.status === 'accepted').length,
    };
  }

  res.json({
    success: true,
    data: role === 'admin'
      ? { summary, categoryStats, trend30, collectorRanking }
      : {
          stats: summary,
          rank: {
            position: (collectorRanking.findIndex((c: any) => c.id === collectorId) + 1) || 1,
            total: collectors.length,
            monthCompleted: collectorRanking,
          },
          todayTasks: appts.filter(a => a.collectorId === collectorId && a.expectedDate === today)
            .map(a => ({
              ...a,
              residentName: usersAll.find(u => u.id === a.residentId)?.realName,
              residentPhone: usersAll.find(u => u.id === a.residentId)?.phone,
              items: itemsAll.filter(i => i.appointmentId === a.id),
            })),
        },
  });
});

router.get('/collector/me', authMiddleware, requireRole('collector'), (req: Request, res: Response) => {
  const collectorId = req.user!.userId;
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const today = now.toISOString().split('T')[0];

  const apptsAll = (db.prepare('SELECT * FROM appointments').all() || []) as any[];
  const usersAll = (db.prepare('SELECT * FROM users').all() || []) as any[];
  const itemsAll = (db.prepare(
    'SELECT ai.*, cat.name as categoryName, cat.unit, cat.icon FROM appointment_items ai JOIN categories cat ON ai.categoryId = cat.id'
  ).all() || []) as any[];

  const monthAppts = apptsAll.filter(a => a.collectorId === collectorId && a.createdAt >= thisMonthStart);
  const mineAccepted = apptsAll.filter(a => a.collectorId === collectorId && a.status === 'accepted');
  const mineCompleted = apptsAll.filter(a => a.collectorId === collectorId && a.status === 'completed');
  const ratings = mineCompleted.map(a => a.rating).filter(r => r != null) as number[];
  const todayCompleted = mineCompleted.filter(a => a.completedAt && a.completedAt.startsWith(today));

  const monthStats = {
    monthOrders: monthAppts.length,
    monthCompleted: mineCompleted.filter(a => a.createdAt >= thisMonthStart).length,
    monthPoints: mineCompleted.filter(a => a.createdAt >= thisMonthStart).reduce((s, a) => s + Number(a.actualPoints || 0), 0),
    avgRating: ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length) : 0,
    fiveStarCount: ratings.filter(r => r === 5).length,
    todayCompleted: todayCompleted.length,
    pendingTasks: mineAccepted.length,
  };

  const todayTasks = apptsAll.filter(a => a.collectorId === collectorId && a.expectedDate === today)
    .map(a => ({
      ...a,
      residentName: usersAll.find(u => u.id === a.residentId)?.realName || '',
      residentPhone: usersAll.find(u => u.id === a.residentId)?.phone || '',
      items: itemsAll.filter(i => i.appointmentId === a.id),
    }));

  const collectors = usersAll.filter(u => u.role === 'collector');
  const ranking = collectors.map(c => {
    const monthCompleted = apptsAll.filter(a => a.collectorId === c.id && a.createdAt >= thisMonthStart && a.status === 'completed').length;
    return { id: c.id, realName: c.realName, username: c.username, completed: monthCompleted };
  }).sort((a, b) => b.completed - a.completed);

  res.json({
    success: true,
    data: {
      stats: monthStats,
      todayTasks,
      rank: {
        position: ranking.findIndex(r => r.id === collectorId) + 1,
        total: ranking.length,
        monthCompleted: ranking,
      },
    },
  });
});

export default router;
