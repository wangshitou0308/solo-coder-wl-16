import db from '../db';
import { NotificationType } from '../types';

export function createNotification(
  userId: number,
  type: NotificationType,
  title: string,
  content: string,
  relatedId?: number,
  relatedType?: string
): number {
  const result = db.prepare(`
    INSERT INTO notifications (userId, type, title, content, relatedId, relatedType)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(userId, type, title, content, relatedId || null, relatedType || null);
  
  return result.lastInsertRowid as number;
}

export function createAppointmentAssignedNotification(
  residentId: number,
  collectorId: number,
  appointmentId: number,
  collectorName: string
): void {
  createNotification(
    residentId,
    'appointment_assigned',
    '预约已分派',
    `您的预约已分派给回收员 ${collectorName}，请等待上门回收`,
    appointmentId,
    'appointment'
  );
  
  createNotification(
    collectorId,
    'appointment_assigned',
    '新任务分配',
    `您有一个新的回收任务已被分派，请及时处理`,
    appointmentId,
    'appointment'
  );
}

export function createAppointmentAcceptedNotification(
  residentId: number,
  appointmentId: number,
  collectorName: string
): void {
  createNotification(
    residentId,
    'appointment_accepted',
    '回收员已接单',
    `回收员 ${collectorName} 已接单，将按时上门回收`,
    appointmentId,
    'appointment'
  );
}

export function createAppointmentCompletedNotification(
  residentId: number,
  appointmentId: number,
  actualPoints: number
): void {
  createNotification(
    residentId,
    'appointment_completed',
    '回收已完成',
    `您的回收预约已完成，感谢您对环保的贡献`,
    appointmentId,
    'appointment'
  );
  
  createNotification(
    residentId,
    'points_earned',
    '积分已到账',
    `本次回收获得 ${actualPoints} 环保积分，请注意查收`,
    appointmentId,
    'appointment'
  );
}

export function createExchangeOrderStatusNotification(
  userId: number,
  orderId: number,
  status: string,
  productName: string
): void {
  const statusMap: Record<string, { title: string; content: string }> = {
    shipped: {
      title: '兑换商品已发货',
      content: `您兑换的 ${productName} 已发货，请注意查收`,
    },
    delivered: {
      title: '兑换商品已送达',
      content: `您兑换的 ${productName} 已送达，感谢您的支持`,
    },
    cancelled: {
      title: '兑换订单已取消',
      content: `您的兑换订单 ${productName} 已取消，积分已退回`,
    },
  };
  
  const info = statusMap[status];
  if (info) {
    createNotification(
      userId,
      'exchange_order_status',
      info.title,
      info.content,
      orderId,
      'exchange'
    );
  }
}
