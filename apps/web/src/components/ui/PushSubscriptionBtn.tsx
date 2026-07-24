import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { notificationsApi } from '../../services/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionBtn() {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription', err);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permiso denegado para notificaciones.');
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      await notificationsApi.subscribe(subscription);
      setIsSubscribed(true);
    } catch (err: any) {
      console.error('Subscription error:', err);
      setError(err.message || 'Error al suscribirse');
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null; // Don't show button if not supported (e.g. iOS Safari without PWA installed)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <button
        onClick={subscribe}
        disabled={isSubscribed || loading}
        className={isSubscribed ? 'btn-secondary' : 'btn-primary'}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
      >
        {loading ? (
          <Loader2 size={18} className="spin" />
        ) : isSubscribed ? (
          <BellOff size={18} />
        ) : (
          <Bell size={18} />
        )}
        {isSubscribed ? 'Suscrito a Noticias' : 'Suscribirse a Noticias'}
      </button>
      {error && (
        <span style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
          {error}
        </span>
      )}
    </div>
  );
}
