import { Router, Request, Response } from 'express';
import db from '../db';
import { authMiddleware, requireRole } from '../middleware/auth';
import { Category } from '../types';
import {
  createAppointmentAssignedNotification,
  createAppointmentAcceptedNotification,
  createAppointmentCompletedNotification,
} from '../utils/notification';

const router = Router();

interface AppointmentItemInput {
  categoryId: number;
  estimatedQuantity: number;
}

router.post('/', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { address, expectedDate, expectedTimeSlot, items } = req.body as {
    address: string;
    expectedDate: string;
    expectedTimeSlot: string;
    items: AppointmentItemInput[];
  };

  if (!address || !expectedDate || !expectedTimeSlot || !items || items.length === 0) {
    res.status(400).json({ success: false, message: '请填写完整的预约信息' });
    return;
  }

  const capacity = db.prepare('SELECT * FROM time_slot_capacity WHERE date = ? AND timeSlot = ?').get(expectedDate, expectedTimeSlot) as any;
  const maxCap = capacity?.maxCapacity ?? 5;
  const currentCnt = capacity?.currentCount ?? 0;
  if (currentCnt >= maxCap) {
    res.status(400).json({ success: false, message: '该时段已约满，请选择其他时段' });
    return;
  }

  const categories = db.prepare('SELECT * FROM categories WHERE enabled = 1').all() as Category[];
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  let estimatedPoints = 0;
  for (const item of items) {
    const cat = categoryMap.get(item.categoryId);
    if (!cat) {
      res.status(400).json({ success: false, message: `品类ID ${item.categoryId} 不存在或已下架` });
      return;
    }
    estimatedPoints += Math.round(cat.pointsPerUnit * item.estimatedQuantity);
  }

  const tx = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO appointments (residentId, address, expectedDate, expectedTimeSlot, estimatedPoints)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, address, expectedDate, expectedTimeSlot, estimatedPoints);

    const appointmentId = result.lastInsertRowid as number;

    const insertItem = db.prepare(`
      INSERT INTO appointment_items (appointmentId, categoryId, estimatedQuantity)
      VALUES (?, ?, ?)
    `);
    for (const item of items) {
      insertItem.run(appointmentId, item.categoryId, item.estimatedQuantity);
    }

    if (capacity) {
      db.prepare('UPDATE time_slot_capacity SET currentCount = currentCount + 1 WHERE id = ?').run(capacity.id);
    } else {
      db.prepare('INSERT INTO time_slot_capacity (date, timeSlot, maxCapacity, currentCount) VALUES (?, ?, 5, 1)')
        .run(expectedDate, expectedTimeSlot);
    }

    return { appointmentId, estimatedPoints };
  });

  try {
    const { appointmentId, estimatedPoints: points } = tx();
    res.json({
      success: true,
      message: '预约提交成功',
      data: { id: appointmentId, estimatedPoints: points },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: '预约失败: ' + e.message });
  }
});

router.put('/:id', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { address, expectedDate, expectedTimeSlot, items } = req.body as {
    address?: string;
    expectedDate?: string;
    expectedTimeSlot?: string;
    items?: AppointmentItemInput[];
  };

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }
  if (appt.residentId !== userId) {
    res.status(403).json({ success: false, message: '无权修改此预约' });
    return;
  }
  if (appt.status !== 'pending') {
    res.status(400).json({ success: false, message: '只能修改待接单状态的预约' });
    return;
  }

  const oldDate = appt.expectedDate;
  const oldSlot = appt.expectedTimeSlot;
  const newDate = expectedDate || oldDate;
  const newSlot = expectedTimeSlot || oldSlot;
  const timeChanged = newDate !== oldDate || newSlot !== oldSlot;

  if (timeChanged) {
    const newCapacity = db.prepare('SELECT * FROM time_slot_capacity WHERE date = ? AND timeSlot = ?').get(newDate, newSlot) as any;
    const maxCap = newCapacity?.maxCapacity ?? 5;
    const currentCnt = newCapacity?.currentCount ?? 0;
    if (currentCnt >= maxCap) {
      res.status(400).json({ success: false, message: '新时段已约满，请选择其他时段' });
      return;
    }
  }

  const categories = db.prepare('SELECT * FROM categories WHERE enabled = 1').all() as Category[];
  const categoryMap = new Map(categories.map(c => [c.id, c]));

  let estimatedPoints = appt.estimatedPoints;
  if (items && items.length > 0) {
    estimatedPoints = 0;
    for (const item of items) {
      const cat = categoryMap.get(item.categoryId);
      if (!cat) {
        res.status(400).json({ success: false, message: `品类ID ${item.categoryId} 不存在或已下架` });
        return;
      }
      estimatedPoints += Math.round(cat.pointsPerUnit * item.estimatedQuantity);
    }
  }

  const tx = db.transaction(() => {
    const fields: string[] = [];
    const params: any[] = [];
    
    if (address !== undefined) { fields.push('address = ?'); params.push(address); }
    if (expectedDate !== undefined) { fields.push('expectedDate = ?'); params.push(expectedDate); }
    if (expectedTimeSlot !== undefined) { fields.push('expectedTimeSlot = ?'); params.push(expectedTimeSlot); }
    if (items) { fields.push('estimatedPoints = ?'); params.push(estimatedPoints); }
    
    if (fields.length > 0) {
      params.push(id);
      db.prepare(`UPDATE appointments SET ${fields.join(', ')} WHERE id = ?`).run(...params);
    }

    if (items && items.length > 0) {
      db.prepare('DELETE FROM appointment_items WHERE appointmentId = ?').run(id);
      const insertItem = db.prepare(`
        INSERT INTO appointment_items (appointmentId, categoryId, estimatedQuantity)
        VALUES (?, ?, ?)
      `);
      for (const item of items) {
        insertItem.run(id, item.categoryId, item.estimatedQuantity);
      }
    }

    if (timeChanged) {
      const oldCapacity = db.prepare('SELECT * FROM time_slot_capacity WHERE date = ? AND timeSlot = ?').get(oldDate, oldSlot) as any;
      if (oldCapacity && oldCapacity.currentCount > 0) {
        db.prepare('UPDATE time_slot_capacity SET currentCount = currentCount - 1 WHERE id = ?').run(oldCapacity.id);
      }

      const newCapacity = db.prepare('SELECT * FROM time_slot_capacity WHERE date = ? AND timeSlot = ?').get(newDate, newSlot) as any;
      if (newCapacity) {
        db.prepare('UPDATE time_slot_capacity SET currentCount = currentCount + 1 WHERE id = ?').run(newCapacity.id);
      } else {
        db.prepare('INSERT INTO time_slot_capacity (date, timeSlot, maxCapacity, currentCount) VALUES (?, ?, 5, 1)')
          .run(newDate, newSlot);
      }
    }

    return estimatedPoints;
  });

  try {
    const points = tx();
    res.json({
      success: true,
      message: '预约修改成功',
      data: { id, estimatedPoints: points },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, message: '修改失败: ' + e.message });
  }
});

router.get('/my', authMiddleware, (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const role = req.user!.role;
  let appointments: any[];

  if (role === 'resident') {
    appointments = db.prepare(`
      SELECT a.*, u.realName as residentName, u.nickname as residentNickname, u.phone as residentPhone,
             c.realName as collectorName, c.phone as collectorPhone
      FROM appointments a
      JOIN users u ON a.residentId = u.id
      LEFT JOIN users c ON a.collectorId = c.id
      WHERE a.residentId = ?
      ORDER BY a.createdAt DESC
    `).all(userId);
  } else if (role === 'collector') {
    appointments = db.prepare(`
      SELECT a.*, u.realName as residentName, u.nickname as residentNickname, u.phone as residentPhone,
             c.realName as collectorName, c.phone as collectorPhone
      FROM appointments a
      JOIN users u ON a.residentId = u.id
      LEFT JOIN users c ON a.collectorId = c.id
      WHERE a.collectorId = ?
      ORDER BY
        CASE a.status
          WHEN 'assigned' THEN 0
          WHEN 'accepted' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'completed' THEN 3
          ELSE 4
        END,
        a.expectedDate ASC, a.expectedTimeSlot ASC
    `).all(userId);
  } else {
    appointments = db.prepare(`
      SELECT a.*, u.realName as residentName, u.nickname as residentNickname, u.phone as residentPhone,
             c.realName as collectorName, c.phone as collectorPhone
      FROM appointments a
      JOIN users u ON a.residentId = u.id
      LEFT JOIN users c ON a.collectorId = c.id
      ORDER BY a.createdAt DESC
    `).all();
  }

  const ids = appointments.map(a => a.id);
  const itemsMap = new Map<number, any[]>();
  if (ids.length > 0) {
    const placeholders = ids.map(() => '?').join(',');
    const items = db.prepare(`
      SELECT ai.*, cat.name as categoryName, cat.unit, cat.icon, cat.pointsPerUnit
      FROM appointment_items ai
      JOIN categories cat ON ai.categoryId = cat.id
      WHERE ai.appointmentId IN (${placeholders})
    `).all(...ids);
    for (const item of items as any[]) {
      if (!itemsMap.has(item.appointmentId)) {
        itemsMap.set(item.appointmentId, []);
      }
      itemsMap.get(item.appointmentId)!.push(item);
    }
  }

  const result = appointments.map(a => ({
    ...a,
    items: itemsMap.get(a.id) || [],
  }));

  res.json({ success: true, data: result });
});

router.get('/:id', authMiddleware, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userId = req.user!.userId;
  const role = req.user!.role;

  const appointment = db.prepare(`
    SELECT a.*, u.realName as residentName, u.nickname as residentNickname, u.phone as residentPhone,
           c.realName as collectorName, c.phone as collectorPhone
    FROM appointments a
    JOIN users u ON a.residentId = u.id
    LEFT JOIN users c ON a.collectorId = c.id
    WHERE a.id = ?
  `).get(id) as any;

  if (!appointment) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }

  if (role === 'resident' && appointment.residentId !== userId) {
    res.status(403).json({ success: false, message: '无权查看此预约' });
    return;
  }
  if (role === 'collector' && appointment.collectorId !== userId && appointment.collectorId !== null) {
    res.status(403).json({ success: false, message: '无权查看此预约' });
    return;
  }

  const items = db.prepare(`
    SELECT ai.*, cat.name as categoryName, cat.unit, cat.icon, cat.pointsPerUnit
    FROM appointment_items ai
    JOIN categories cat ON ai.categoryId = cat.id
    WHERE ai.appointmentId = ?
  `).all(id);

  res.json({ success: true, data: { ...appointment, items } });
});

router.put('/:id/assign', authMiddleware, requireRole('admin'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const { collectorId } = req.body as { collectorId: number };

  if (!collectorId) {
    res.status(400).json({ success: false, message: '请选择回收员' });
    return;
  }

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }
  if (appt.status !== 'pending' && appt.status !== 'assigned') {
    res.status(400).json({ success: false, message: '只能分派待分派或已分派状态的预约' });
    return;
  }

  const collector = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(collectorId, 'collector');
  if (!collector) {
    res.status(400).json({ success: false, message: '回收员不存在' });
    return;
  }

  db.prepare(`
    UPDATE appointments
    SET collectorId = ?, status = 'assigned', assignedAt = datetime('now', 'localtime')
    WHERE id = ?
  `).run(collectorId, id);

  createAppointmentAssignedNotification(appt.residentId, collectorId, id, collector.realName);

  res.json({ success: true, message: '分派成功' });
});

router.put('/:id/accept', authMiddleware, requireRole('collector'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const collectorId = req.user!.userId;

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }
  if (appt.status !== 'assigned' && appt.status !== 'pending') {
    res.status(400).json({ success: false, message: '该预约状态不允许接单' });
    return;
  }
  if (appt.collectorId && appt.collectorId !== collectorId) {
    res.status(403).json({ success: false, message: '该预约已分派给其他回收员' });
    return;
  }

  db.prepare(`
    UPDATE appointments
    SET collectorId = ?, status = 'accepted', acceptedAt = datetime('now', 'localtime')
    WHERE id = ?
  `).run(collectorId, id);

  const collector = db.prepare('SELECT realName FROM users WHERE id = ?').get(collectorId) as any;
  createAppointmentAcceptedNotification(appt.residentId, id, collector.realName);

  res.json({ success: true, message: '接单成功' });
});

router.put('/:id/complete', authMiddleware, requireRole('collector'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const collectorId = req.user!.userId;
  const { actualItems, photoUrl } = req.body as {
    actualItems: { id: number; actualQuantity: number }[];
    photoUrl?: string;
  };

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }
  if (appt.collectorId !== collectorId) {
    res.status(403).json({ success: false, message: '无权操作此预约' });
    return;
  }
  if (appt.status !== 'accepted') {
    res.status(400).json({ success: false, message: '该预约状态不允许完成' });
    return;
  }

  const currentYear = new Date().getFullYear();

  const tx = db.transaction(() => {
    let actualPoints = 0;
    const itemStmt = db.prepare('SELECT ai.*, cat.pointsPerUnit FROM appointment_items ai JOIN categories cat ON ai.categoryId = cat.id WHERE ai.id = ?');
    const updateItemStmt = db.prepare('UPDATE appointment_items SET actualQuantity = ? WHERE id = ?');

    for (const it of actualItems) {
      const item = itemStmt.get(it.id) as any;
      if (!item || item.appointmentId !== id) continue;
      updateItemStmt.run(it.actualQuantity, it.id);
      actualPoints += Math.round(item.pointsPerUnit * it.actualQuantity);
    }

    db.prepare(`
      UPDATE appointments
      SET status = 'completed', actualPoints = ?, photoUrl = ?, completedAt = datetime('now', 'localtime')
      WHERE id = ?
    `).run(actualPoints, photoUrl || null, id);

    const account = db.prepare('SELECT * FROM points_accounts WHERE userId = ?').get(appt.residentId) as any;
    let newBalance: number;
    if (account) {
      newBalance = account.currentPoints + actualPoints;
      db.prepare(`
        UPDATE points_accounts
        SET currentPoints = ?, updatedAt = datetime('now', 'localtime')
        WHERE userId = ?
      `).run(newBalance, appt.residentId);
    } else {
      newBalance = actualPoints;
      db.prepare(`
        INSERT INTO points_accounts (userId, currentPoints, lastYearPoints, currentYear)
        VALUES (?, ?, 0, ?)
      `).run(appt.residentId, actualPoints, currentYear);
    }

    db.prepare(`
      INSERT INTO points_records (userId, type, points, balance, year, description, appointmentId)
      VALUES (?, 'earn', ?, ?, ?, '上门回收获得积分', ?)
    `).run(appt.residentId, actualPoints, newBalance, currentYear, id);

    return actualPoints;
  });

  try {
    const actualPoints = tx();
    createAppointmentCompletedNotification(appt.residentId, id, actualPoints);
    res.json({ success: true, message: '回收完成，积分已入账', data: { actualPoints } });
  } catch (e: any) {
    res.status(500).json({ success: false, message: '操作失败: ' + e.message });
  }
});

router.put('/:id/cancel', authMiddleware, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userId = req.user!.userId;
  const role = req.user!.role;

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }

  if (role === 'resident' && appt.residentId !== userId) {
    res.status(403).json({ success: false, message: '无权操作此预约' });
    return;
  }
  if (role === 'collector' && appt.collectorId !== userId) {
    res.status(403).json({ success: false, message: '无权操作此预约' });
    return;
  }

  if (appt.status === 'completed') {
    res.status(400).json({ success: false, message: '已完成的预约不可取消' });
    return;
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run('cancelled', id);

  const capacity = db.prepare('SELECT * FROM time_slot_capacity WHERE date = ? AND timeSlot = ?').get(appt.expectedDate, appt.expectedTimeSlot) as any;
  if (capacity && capacity.currentCount > 0) {
    db.prepare('UPDATE time_slot_capacity SET currentCount = currentCount - 1 WHERE id = ?').run(capacity.id);
  }

  res.json({ success: true, message: '预约已取消' });
});

router.put('/:id/rate', authMiddleware, requireRole('resident'), (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  const userId = req.user!.userId;
  const { rating, comment } = req.body as { rating: number; comment?: string };

  if (!rating || rating < 1 || rating > 5) {
    res.status(400).json({ success: false, message: '请输入有效的评分（1-5星）' });
    return;
  }

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id) as any;
  if (!appt) {
    res.status(404).json({ success: false, message: '预约不存在' });
    return;
  }
  if (appt.residentId !== userId) {
    res.status(403).json({ success: false, message: '无权操作此预约' });
    return;
  }
  if (appt.status !== 'completed') {
    res.status(400).json({ success: false, message: '只能对已完成的预约评价' });
    return;
  }

  db.prepare('UPDATE appointments SET rating = ?, comment = ? WHERE id = ?').run(rating, comment || null, id);

  res.json({ success: true, message: '评价成功' });
});

export default router;
