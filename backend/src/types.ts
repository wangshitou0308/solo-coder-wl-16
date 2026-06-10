export type UserRole = 'resident' | 'collector' | 'admin';

export interface User {
  id: number;
  username: string;
  password: string;
  realName: string;
  nickname?: string;
  phone: string;
  role: UserRole;
  address?: string;
  community?: string;
  createdAt: string;
}

export interface Category {
  id: number;
  name: string;
  unit: string;
  pointsPerUnit: number;
  description: string;
  tips: string;
  icon: string;
  sort: number;
  enabled: number;
}

export type AppointmentStatus = 'pending' | 'assigned' | 'accepted' | 'completed' | 'cancelled';

export interface Appointment {
  id: number;
  residentId: number;
  collectorId?: number;
  address: string;
  expectedDate: string;
  expectedTimeSlot: string;
  status: AppointmentStatus;
  estimatedPoints: number;
  actualPoints?: number;
  rating?: number;
  comment?: string;
  photoUrl?: string;
  createdAt: string;
  assignedAt?: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface AppointmentItem {
  id: number;
  appointmentId: number;
  categoryId: number;
  estimatedQuantity: number;
  actualQuantity?: number;
}

export interface PointsRecord {
  id: number;
  userId: number;
  type: 'earn' | 'spend' | 'rollover';
  points: number;
  balance: number;
  year: number;
  description: string;
  appointmentId?: number;
  exchangeId?: number;
  createdAt: string;
}

export interface PointsAccount {
  id: number;
  userId: number;
  currentPoints: number;
  lastYearPoints: number;
  currentYear: number;
  updatedAt: string;
}

export interface ExchangeProduct {
  id: number;
  name: string;
  description: string;
  pointsCost: number;
  stock: number;
  image: string;
  category: string;
  sort: number;
  enabled: number;
}

export interface ExchangeOrder {
  id: number;
  userId: number;
  productId: number;
  quantity: number;
  totalPoints: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
  address?: string;
  recipientPhone?: string;
  createdAt: string;
  shippedAt?: string;
  deliveredAt?: string;
}

export interface TimeSlotCapacity {
  id: number;
  date: string;
  timeSlot: string;
  maxCapacity: number;
  currentCount: number;
}

export interface RatingStats {
  collectorId: number;
  totalOrders: number;
  avgRating: number;
  fiveStarCount: number;
}

export type NotificationType = 
  | 'appointment_assigned' 
  | 'appointment_accepted' 
  | 'appointment_completed' 
  | 'points_earned'
  | 'exchange_order_status'
  | 'system';

export interface Notification {
  id: number;
  userId: number;
  type: NotificationType;
  title: string;
  content: string;
  relatedId?: number;
  relatedType?: string;
  read: number;
  createdAt: string;
}
