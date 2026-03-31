'use client';

import { useEffect, useState } from 'react';
import { syncPendingActions } from '@/lib/offlineSync';

export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    // Initialise from current state (avoid SSR mismatch by only reading in effect)
    setOffline(!navigator.onLine);

    const goOffline = () => setOffline(true);
    const goOnline = () => {
      setOffline(false);
      syncPendingActions();
    };

    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);

    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-600 text-white text-center text-sm py-2 px-4"
    >
      You&apos;re offline — showing cached content
    </div>
  );
}
