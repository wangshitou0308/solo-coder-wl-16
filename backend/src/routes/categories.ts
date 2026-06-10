import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories WHERE enabled = 1 ORDER BY sort ASC').all();
  res.json({ success: true, data: categories });
});

router.get('/all', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
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

router.post('/', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, unit, pointsPerUnit, description, tips, icon, sort = 0 } = req.body;
  
  if (!name || !unit || pointsPerUnit === undefined || !description || !tips || !icon) {
    res.status(400).json({ success: false, message: '请填写完整的品类信息' });
    return;
  }
  
  const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name);
  if (existing) {
    res.status(400).json({ success: false, message: '品类名称已存在' });
    return;
  }
  
  const result = db.prepare(`
    INSERT INTO categories (name, unit, pointsPerUnit, description, tips, icon, sort, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(name, unit, pointsPerUnit, description, tips, icon, sort);
  
  res.json({ 
    success: true, 
    message: '品类创建成功', 
    data: { id: result.lastInsertRowid } 
  });
});

router.put('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, unit, pointsPerUnit, description, tips, icon, sort, enabled } = req.body;
  
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!category) {
    res.status(404).json({ success: false, message: '品类不存在' });
    return;
  }
  
  const fields: string[] = [];
  const params: any[] = [];
  
  if (name !== undefined) {
    const existing = db.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(name, id);
    if (existing) {
      res.status(400).json({ success: false, message: '品类名称已存在' });
      return;
    }
    fields.push('name = ?');
    params.push(name);
  }
  if (unit !== undefined) { fields.push('unit = ?'); params.push(unit); }
  if (pointsPerUnit !== undefined) { fields.push('pointsPerUnit = ?'); params.push(pointsPerUnit); }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (tips !== undefined) { fields.push('tips = ?'); params.push(tips); }
  if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
  if (sort !== undefined) { fields.push('sort = ?'); params.push(sort); }
  if (enabled !== undefined) { fields.push('enabled = ?'); params.push(enabled); }
  
  if (fields.length === 0) {
    res.json({ success: true, message: '没有需要更新的字段' });
    return;
  }
  
  params.push(id);
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  
  res.json({ success: true, message: '品类更新成功' });
});

router.put('/:id/toggle', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!category) {
    res.status(404).json({ success: false, message: '品类不存在' });
    return;
  }
  
  const newEnabled = category.enabled ? 0 : 1;
  db.prepare('UPDATE categories SET enabled = ? WHERE id = ?').run(newEnabled, id);
  
  res.json({ 
    success: true, 
    message: newEnabled ? '品类已上架' : '品类已下架' 
  });
});

router.delete('/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!category) {
    res.status(404).json({ success: false, message: '品类不存在' });
    return;
  }
  
  const hasItems = db.prepare('SELECT COUNT(*) as count FROM appointment_items WHERE categoryId = ?').get(id) as { count: number };
  if (hasItems.count > 0) {
    res.status(400).json({ success: false, message: '该品类已有预约记录，无法删除，建议下架处理' });
    return;
  }
  
  db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  res.json({ success: true, message: '品类删除成功' });
});

export default router;
