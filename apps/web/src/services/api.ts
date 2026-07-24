const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const BASE = `${API_URL}/api/v1`;

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error('Error al conectar con la API');
  }
  return res.json() as Promise<T>;
}

// Interfaces compartidas
export interface WebEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  bio: string;
  photoUrl?: string;
  instruments: string[];
  email?: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  frequency: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  createdAt: string;
}

export const eventsApi = {
  getPublicEvents: () => request<WebEvent[]>('/events'),
};

export const teachersApi = {
  getPublicTeachers: () => request<Teacher[]>('/teachers'),
};

export const pricingApi = {
  getPublicPlans: () => request<PricingPlan[]>('/pricing'),
};

export const notificationsApi = {
  subscribe: async (subscription: PushSubscription) => {
    const res = await fetch(`${BASE}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    if (!res.ok) throw new Error('Error saving subscription');
    return res.json();
  }
};
