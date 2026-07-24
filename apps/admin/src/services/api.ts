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
  time: string; location: string; imageUrl?: string; isActive: boolean; createdAt: string;
}
export const eventsApi = {
  getAll:    () => request<AdminEvent[]>('/events/admin/all'),
  getOne:    (id: string) => request<AdminEvent>(`/events/${id}`),
  create:    (data: Omit<AdminEvent,'id'|'createdAt'>) => request<AdminEvent>('/events', { method:'POST', body: JSON.stringify(data) }),
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
