import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();
const TIME_SLOTS = ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00'];

router.get('/', authMiddleware, (req: Request, res: Response) => {
  const { date } = req.query;
  if (!date) {
    res.status(400).json({ success: false, message: '请指定日期' });
    return;
  }
  const dateStr = date as string;
  const capacities = db.prepare('SELECT * FROM time_slot_capacity WHERE date = ?').all(dateStr);

  const result = TIME_SLOTS.map(slot => {
    const cap = capacities.find((c: any) => c.timeSlot === slot) as any;
    return {
      timeSlot: slot,
      maxCapacity: cap?.maxCapacity ?? 5,
      currentCount: cap?.currentCount ?? 0,
      available: (cap?.maxCapacity ?? 5) - (cap?.currentCount ?? 0),
      full: ((cap?.maxCapacity ?? 5) - (cap?.currentCount ?? 0)) <= 0,
    };
  });

  res.json({ success: true, data: result });
});

export default router;
