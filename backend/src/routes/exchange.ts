import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { createExchangeOrderStatusNotification } from '../utils/notification';

const router = Router();

router.get('/products', (_req: Request, res: Response) => {
  const products = db.prepare('SELECT * FROM exchange_products WHERE enabled = 1 AND stock > 0 ORDER BY sort ASC').all();
  res.json({ success: true, data: products });
});

router.get('/products/all', authMiddleware, requireRole('admin'), (_req: Request, res: Response) => {
  const products = db.prepare('SELECT * FROM exchange_products ORDER BY sort ASC').all();
  res.json({ success: true, data: products });
});

router.get('/products/:id', (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const product = db.prepare('SELECT * FROM exchange_products WHERE id = ?').get(id);
  if (!product) {
    res.status(404).json({ success: false, message: '商品不存在' });
    return;
  }
  res.json({ success: true, data: product });
});

router.post('/products', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const { name, description, pointsCost, stock, image, category, sort = 0 } = req.body;
  
  if (!name || !description || pointsCost === undefined || stock === undefined || !image || !category) {
    res.status(400).json({ success: false, message: '请填写完整的商品信息' });
    return;
  }
  
  const existing = db.prepare('SELECT id FROM exchange_products WHERE name = ?').get(name);
  if (existing) {
    res.status(400).json({ success: false, message: '商品名称已存在' });
    return;
  }
  
  const result = db.prepare(`
    INSERT INTO exchange_products (name, description, pointsCost, stock, image, category, sort, enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `).run(name, description, pointsCost, stock, image, category, sort);
  
  res.json({ 
    success: true, 
    message: '商品创建成功', 
    data: { id: result.lastInsertRowid } 
  });
});

router.put('/products/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { name, description, pointsCost, stock, image, category, sort, enabled } = req.body;
  
  const product = db.prepare('SELECT * FROM exchange_products WHERE id = ?').get(id);
  if (!product) {
    res.status(404).json({ success: false, message: '商品不存在' });
    return;
  }
  
  const fields: string[] = [];
  const params: any[] = [];
  
  if (name !== undefined) {
    const existing = db.prepare('SELECT id FROM exchange_products WHERE name = ? AND id != ?').get(name, id);
    if (existing) {
      res.status(400).json({ success: false, message: '商品名称已存在' });
      return;
    }
    fields.push('name = ?');
    params.push(name);
  }
  if (description !== undefined) { fields.push('description = ?'); params.push(description); }
  if (pointsCost !== undefined) { fields.push('pointsCost = ?'); params.push(pointsCost); }
  if (stock !== undefined) { fields.push('stock = ?'); params.push(stock); }
  if (image !== undefined) { fields.push('image = ?'); params.push(image); }
  if (category !== undefined) { fields.push('category = ?'); params.push(category); }
  if (sort !== undefined) { fields.push('sort = ?'); params.push(sort); }
  if (enabled !== undefined) { fields.push('enabled = ?'); params.push(enabled); }
  
  if (fields.length === 0) {
    res.json({ success: true, message: '没有需要更新的字段' });
    return;
  }
  
  params.push(id);
  db.prepare(`UPDATE exchange_products SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  
  res.json({ success: true, message: '商品更新成功' });
});

router.put('/products/:id/toggle', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const product = db.prepare('SELECT * FROM exchange_products WHERE id = ?').get(id);
  if (!product) {
    res.status(404).json({ success: false, message: '商品不存在' });
    return;
  }
  
  const newEnabled = product.enabled ? 0 : 1;
  db.prepare('UPDATE exchange_products SET enabled = ? WHERE id = ?').run(newEnabled, id);
  
  res.json({ 
    success: true, 
    message: newEnabled ? '商品已上架' : '商品已下架' 
  });
});

router.delete('/products/:id', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  
  const product = db.prepare('SELECT * FROM exchange_products WHERE id = ?').get(id);
  if (!product) {
    res.status(404).json({ success: false, message: '商品不存在' });
    return;
  }
  
  const hasOrders = db.prepare('SELECT COUNT(*) as count FROM exchange_orders WHERE productId = ?').get(id) as { count: number };
  if (hasOrders.count > 0) {
    res.status(400).json({ success: false, message: '该商品已有兑换记录，无法删除，建议下架处理' });
    return;
  }
  
  db.prepare('DELETE FROM exchange_products WHERE id = ?').run(id);
  res.json({ success: true, message: '商品删除成功' });
});

router.post('/orders', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { productId, quantity = 1 } = req.body as { productId: number; quantity?: number };

  if (!productId || quantity <= 0) {
    res.status(400).json({ success: false, message: '请提供有效的商品和数量' });
    return;
  }

  const product = db.prepare('SELECT * FROM exchange_products WHERE id = ? AND enabled = 1').get(productId) as any;
  if (!product) {
    res.status(404).json({ success: false, message: '商品不存在或已下架' });
    return;
  }
  if (product.stock < quantity) {
    res.status(400).json({ success: false, message: '商品库存不足' });
    return;
  }

  const totalPoints = product.pointsCost * quantity;
  const account = db.prepare('SELECT * FROM points_accounts WHERE userId = ?').get(userId) as any;
  if (!account || account.currentPoints < totalPoints) {
    res.status(400).json({ success: false, message: '积分不足' });
    return;
  }

  const currentYear = new Date().getFullYear();

  const tx = db.transaction(() => {
    const orderId = db.prepare(`
      INSERT INTO exchange_orders (userId, productId, quantity, totalPoints)
      VALUES (?, ?, ?, ?)
    `).run(userId, productId, quantity, totalPoints).lastInsertRowid as number;

    db.prepare('UPDATE exchange_products SET stock = stock - ? WHERE id = ?').run(quantity, productId);

    const newBalance = account.currentPoints - totalPoints;
    db.prepare(`
      UPDATE points_accounts
      SET currentPoints = ?, updatedAt = datetime('now', 'localtime')
      WHERE userId = ?
    `).run(newBalance, userId);

    db.prepare(`
      INSERT INTO points_records (userId, type, points, balance, year, description, exchangeId)
      VALUES (?, 'spend', ?, ?, ?, ?, ?)
    `).run(userId, -totalPoints, newBalance, currentYear, `兑换：${product.name} x${quantity}`, orderId);

    return orderId;
  });

  try {
    const orderId = tx();
    res.json({ success: true, message: '兑换成功', data: { id: orderId, totalPoints } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: '兑换失败: ' + e.message });
  }
});

router.get('/orders', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  let orders: any[];

  if (role === 'resident') {
    orders = db.prepare(`
      SELECT eo.*, ep.name as productName, ep.image as productImage, ep.category as productCategory
      FROM exchange_orders eo
      JOIN exchange_products ep ON eo.productId = ep.id
      WHERE eo.userId = ?
      ORDER BY eo.createdAt DESC
    `).all(userId);
  } else {
    orders = db.prepare(`
      SELECT eo.*, ep.name as productName, ep.image as productImage,
             u.realName as userName, u.nickname, u.username, u.phone
      FROM exchange_orders eo
      JOIN exchange_products ep ON eo.productId = ep.id
      JOIN users u ON eo.userId = u.id
      ORDER BY eo.createdAt DESC
    `).all();
  }

  res.json({ success: true, data: orders });
});

router.put('/orders/:id/ship', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const order = db.prepare(`
    SELECT eo.*, ep.name as productName 
    FROM exchange_orders eo 
    JOIN exchange_products ep ON eo.productId = ep.id 
    WHERE eo.id = ?
  `).get(id) as any;
  if (!order) {
    res.status(404).json({ success: false, message: '订单不存在' });
    return;
  }
  if (order.status !== 'pending') {
    res.status(400).json({ success: false, message: '该订单无法发货' });
    return;
  }

  db.prepare(`
    UPDATE exchange_orders SET status = 'shipped', shippedAt = datetime('now', 'localtime') WHERE id = ?
  `).run(id);

  createExchangeOrderStatusNotification(order.userId, id, 'shipped', order.productName);

  res.json({ success: true, message: '发货成功' });
});

router.put('/orders/:id/deliver', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const order = db.prepare(`
    SELECT eo.*, ep.name as productName 
    FROM exchange_orders eo 
    JOIN exchange_products ep ON eo.productId = ep.id 
    WHERE eo.id = ?
  `).get(id) as any;
  if (!order) {
    res.status(404).json({ success: false, message: '订单不存在' });
    return;
  }
  if (order.status !== 'shipped') {
    res.status(400).json({ success: false, message: '只能对已发货订单确认收货' });
    return;
  }

  db.prepare(`
    UPDATE exchange_orders SET status = 'delivered', deliveredAt = datetime('now', 'localtime') WHERE id = ?
  `).run(id);

  createExchangeOrderStatusNotification(order.userId, id, 'delivered', order.productName);

  res.json({ success: true, message: '已确认收货' });
});

router.put('/orders/:id/cancel', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const order = db.prepare(`
    SELECT eo.*, ep.name as productName 
    FROM exchange_orders eo 
    JOIN exchange_products ep ON eo.productId = ep.id 
    WHERE eo.id = ?
  `).get(id) as any;
  if (!order) {
    res.status(404).json({ success: false, message: '订单不存在' });
    return;
  }
  if (order.status !== 'pending' && order.status !== 'shipped') {
    res.status(400).json({ success: false, message: '该订单无法取消' });
    return;
  }

  const currentYear = new Date().getFullYear();

  const tx = db.transaction(() => {
    db.prepare(`UPDATE exchange_orders SET status = 'cancelled' WHERE id = ?`).run(id);
    db.prepare('UPDATE exchange_products SET stock = stock + ? WHERE id = ?').run(order.quantity, order.productId);

    const account = db.prepare('SELECT * FROM points_accounts WHERE userId = ?').get(order.userId) as any;
    const newBalance = account.currentPoints + order.totalPoints;
    db.prepare(`
      UPDATE points_accounts SET currentPoints = ?, updatedAt = datetime('now', 'localtime') WHERE userId = ?
    `).run(newBalance, order.userId);

    db.prepare(`
      INSERT INTO points_records (userId, type, points, balance, year, description, exchangeId)
      VALUES (?, 'rollover', ?, ?, ?, '兑换订单取消退回积分', ?)
    `).run(order.userId, order.totalPoints, newBalance, currentYear, id);
  });

  try {
    tx();
    createExchangeOrderStatusNotification(order.userId, id, 'cancelled', order.productName);
    res.json({ success: true, message: '订单已取消，积分已退回' });
  } catch (e: any) {
    res.status(500).json({ success: false, message: '操作失败: ' + e.message });
  }
});

export default router;
