import { Router, Request, Response } from 'express';
import db from '../db';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY sort ASC').all();
  res.json({ success: true, data: categories });
});

router.get('/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!category) {
    res.status(404).json({ success: false, message: '品类不存在' });
    return;
  }
  res.json({ success: true, data: category });
});

export default router;
