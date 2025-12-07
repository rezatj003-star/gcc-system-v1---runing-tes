/**
 * useToast Hook - Simple Toast Notification
 */

import { useState, useCallback } from 'react';

export function useToast() {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ title = '', description = '', variant = 'default' }) => {
    const id = Date.now();
    const newToast = { id, title, description, variant };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);

    // Also log to console for debugging
    console.log(`[${variant.toUpperCase()}]`, title, description);
  }, []);

  return { toast, toasts };
}

export function Toaster({ toasts }) {
  return (
    <div className="fixed top-4 right-4 space-y-2 z-[9999]">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`p-4 rounded-lg border-3 border-black shadow-[4px_4px_0px_#000] max-w-sm ${
            t.variant === 'destructive'
              ? 'bg-red-100 text-red-900'
              : 'bg-green-100 text-green-900'
          }`}
        >
          {t.title && <p className="font-bold">{t.title}</p>}
          {t.description && <p className="text-sm">{t.description}</p>}
        </div>
      ))}
    </div>
  );
}