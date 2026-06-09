import request from '../utils/request';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface LoginData {
  token: string;
  user: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  realName: string;
  phone: string;
  role: 'resident' | 'collector' | 'admin';
  address?: string;
  createdAt?: string;
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
}

export interface AppointmentItem {
  id: number;
  appointmentId: number;
  categoryId: number;
  categoryName: string;
  estimatedQuantity: number;
  actualQuantity?: number;
  unit: string;
  icon: string;
  pointsPerUnit: number;
}

export interface Appointment {
  id: number;
  residentId: number;
  collectorId?: number;
  address: string;
  expectedDate: string;
  expectedTimeSlot: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  estimatedPoints: number;
  actualPoints?: number;
  rating?: number;
  comment?: string;
  photoUrl?: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  residentName?: string;
  residentPhone?: string;
  collectorName?: string;
  collectorPhone?: string;
  items: AppointmentItem[];
}

export interface TimeSlot {
  timeSlot: string;
  maxCapacity: number;
  currentCount: number;
  available: number;
  full: boolean;
}

export interface PointsAccount {
  userId: number;
  currentPoints: number;
  lastYearPoints: number;
  currentYear: number;
  totalEarned: number;
  totalSpent: number;
  totalRecords: number;
}

export interface PointsRecord {
  id: number;
  userId: number;
  type: 'earn' | 'spend' | 'rollover';
  points: number;
  balance: number;
  year: number;
  description: string;
  createdAt: string;
  userName?: string;
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
}

export interface ExchangeOrder {
  id: number;
  userId: number;
  productId: number;
  productName: string;
  productImage: string;
  productCategory: string;
  quantity: number;
  totalPoints: number;
  status: 'pending' | 'delivered' | 'cancelled';
  createdAt: string;
  deliveredAt?: string;
  userName?: string;
  phone?: string;
}

export const authApi = {
  login: (username: string, password: string): Promise<ApiResponse<LoginData>> =>
    request.post('/api/auth/login', { username, password }),
  getMe: (): Promise<ApiResponse<UserInfo>> => request.get('/api/auth/me'),
  updateProfile: (data: Partial<UserInfo>): Promise<ApiResponse<UserInfo>> =>
    request.put('/api/auth/profile', data),
};

export const categoryApi = {
  list: (): Promise<ApiResponse<Category[]>> => request.get('/api/categories'),
  get: (id: number): Promise<ApiResponse<Category>> => request.get(`/api/categories/${id}`),
};

export const capacityApi = {
  list: (date: string): Promise<ApiResponse<TimeSlot[]>> =>
    request.get('/api/capacity', { params: { date } }),
};

export const appointmentApi = {
  create: (data: {
    address: string;
    expectedDate: string;
    expectedTimeSlot: string;
    items: { categoryId: number; estimatedQuantity: number }[];
  }): Promise<ApiResponse<{ id: number; estimatedPoints: number }>> =>
    request.post('/api/appointments', data),
  myList: (): Promise<ApiResponse<Appointment[]>> => request.get('/api/appointments/my'),
  get: (id: number): Promise<ApiResponse<Appointment>> => request.get(`/api/appointments/${id}`),
  accept: (id: number): Promise<ApiResponse> => request.put(`/api/appointments/${id}/accept`),
  complete: (id: number, data: { actualItems: { id: number; actualQuantity: number }[]; photoUrl?: string }): Promise<ApiResponse<{ actualPoints: number }>> =>
    request.put(`/api/appointments/${id}/complete`, data),
  cancel: (id: number): Promise<ApiResponse> => request.put(`/api/appointments/${id}/cancel`),
  rate: (id: number, rating: number, comment?: string): Promise<ApiResponse> =>
    request.put(`/api/appointments/${id}/rate`, { rating, comment }),
};

export const pointsApi = {
  getAccount: (): Promise<ApiResponse<PointsAccount>> => request.get('/api/points/account'),
  getRecords: (params?: { limit?: number; offset?: number; type?: string }): Promise<ApiResponse<{ records: PointsRecord[]; total: number }>> =>
    request.get('/api/points/records', { params }),
};

export const exchangeApi = {
  listProducts: (): Promise<ApiResponse<ExchangeProduct[]>> => request.get('/api/exchange/products'),
  createOrder: (productId: number, quantity = 1): Promise<ApiResponse<{ id: number; totalPoints: number }>> =>
    request.post('/api/exchange/orders', { productId, quantity }),
  listOrders: (): Promise<ApiResponse<ExchangeOrder[]>> => request.get('/api/exchange/orders'),
  deliver: (id: number): Promise<ApiResponse> => request.put(`/api/exchange/orders/${id}/deliver`),
  cancelOrder: (id: number): Promise<ApiResponse> => request.put(`/api/exchange/orders/${id}/cancel`),
};

export const statsApi = {
  dashboard: (): Promise<ApiResponse<any>> => request.get('/api/stats/dashboard'),
  collector: (): Promise<ApiResponse<any>> => request.get('/api/stats/collector/me'),
};

export const userApi = {
  list: (role?: string): Promise<ApiResponse<UserInfo[]>> =>
    request.get('/api/users', { params: role ? { role } : {} }),
  listCollectors: (): Promise<ApiResponse<any[]>> => request.get('/api/users/collectors'),
  create: (data: Partial<UserInfo> & { password: string }): Promise<ApiResponse<{ id: number }>> =>
    request.post('/api/users', data),
  update: (id: number, data: Partial<UserInfo>): Promise<ApiResponse> => request.put(`/api/users/${id}`, data),
  remove: (id: number): Promise<ApiResponse> => request.delete(`/api/users/${id}`),
};

export const uploadApi = {
  image: (image: string, filename?: string): Promise<ApiResponse<{ url: string; filename: string }>> =>
    request.post('/api/upload', { image, filename }),
};
