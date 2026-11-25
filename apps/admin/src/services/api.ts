const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE = `${API_URL}/api/v1`;

function getAuthHeaders() {
  const token = localStorage.getItem('admin_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...getAuthHeaders(), ...(options?.headers || {}) },
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Error en la petición');
  return data as T;
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; user: { id: string; email: string; name: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
};

// Events
export interface AdminEvent {
  id: string; title: string; description: string; date: string;
  time: string; location: string; imageUrl?: string; isActive: boolean;
  capacity: number; createdAt: string; _count: { registrations: number };
}
export interface EventRegistrations {
  event: { id: string; title: string; capacity: number };
  total: number;
  registrations: { id: string; createdAt: string; user: { name: string; email: string } }[];
}
export const eventsApi = {
  getAll:    () => request<AdminEvent[]>('/events/admin/all'),
  getOne:    (id: string) => request<AdminEvent>(`/events/${id}`),
  getRegistrations: (id: string) => request<EventRegistrations>(`/events/admin/${id}/registrations`),
  create:    (data: Omit<AdminEvent,'id'|'createdAt'|'_count'>) => request<AdminEvent>('/events', { method:'POST', body: JSON.stringify(data) }),
  update:    (id: string, data: Partial<AdminEvent>) => request<AdminEvent>(`/events/${id}`, { method:'PUT', body: JSON.stringify(data) }),
  remove:    (id: string) => request<void>(`/events/${id}`, { method:'DELETE' }),
};

// Teachers
export interface Teacher {
  id: string; name: string; bio: string; photoUrl?: string;
  instruments: string[]; email?: string; phone?: string; isActive: boolean; createdAt: string;
}
export const teachersApi = {
  getAll:  () => request<Teacher[]>('/teachers/admin/all'),
  getOne:  (id: string) => request<Teacher>(`/teachers/${id}`),
  create:  (data: Omit<Teacher,'id'|'createdAt'>) => request<Teacher>('/teachers', { method:'POST', body: JSON.stringify(data) }),
  update:  (id: string, data: Partial<Teacher>) => request<Teacher>(`/teachers/${id}`, { method:'PUT', body: JSON.stringify(data) }),
  remove:  (id: string) => request<void>(`/teachers/${id}`, { method:'DELETE' }),
};

// Pricing
export interface PricingPlan {
  id: string; name: string; description: string; price: number; currency: string;
  frequency: string; features: string[]; isPopular: boolean; isActive: boolean; createdAt: string;
}
export const pricingApi = {
  getAll:  () => request<PricingPlan[]>('/pricing/admin/all'),
  getOne:  (id: string) => request<PricingPlan>(`/pricing/${id}`),
  create:  (data: Omit<PricingPlan,'id'|'createdAt'>) => request<PricingPlan>('/pricing', { method:'POST', body: JSON.stringify(data) }),
  update:  (id: string, data: Partial<PricingPlan>) => request<PricingPlan>(`/pricing/${id}`, { method:'PUT', body: JSON.stringify(data) }),
  remove:  (id: string) => request<void>(`/pricing/${id}`, { method:'DELETE' }),
};

// Support tickets
export type TicketCategory = 'APP_ERROR' | 'LOGIN_ISSUE' | 'EVENT_REGISTRATION' | 'OTRO';
export type TicketPriority = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
export type TicketStatus = 'PENDIENTE' | 'EN_PROCESO' | 'EN_REVISION' | 'TERMINADO';

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  deviceInfo: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string };
}

export const ticketsApi = {
  getAll: () => request<SupportTicket[]>('/tickets/admin'),
  updateStatus: (id: string, status: TicketStatus) =>
    request<SupportTicket>(`/tickets/admin/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updatePriority: (id: string, priority: TicketPriority) =>
    request<SupportTicket>(`/tickets/admin/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ priority }),
    }),
};
