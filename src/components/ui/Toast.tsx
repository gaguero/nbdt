'use client';

import React, { useCallback, useEffect, useState } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  duration?: number;
  onClose: () => void;
  isVisible: boolean;
}

const variantStyles: Record<ToastVariant, { border: string; iconColor: string; bg: string }> = {
  success: {
    bg: 'rgba(78,94,62,0.08)',
    border: '1px solid rgba(78,94,62,0.28)',
    iconColor: '#4E5E3E',
  },
  error: {
    bg: 'rgba(236,108,75,0.08)',
    border: '1px solid rgba(236,108,75,0.28)',
    iconColor: '#EC6C4B',
  },
  warning: {
    bg: 'rgba(170,142,103,0.10)',
    border: '1px solid rgba(170,142,103,0.30)',
    iconColor: '#AA8E67',
  },
  info: {
    bg: 'rgba(78,94,62,0.06)',
    border: '1px solid rgba(78,94,62,0.18)',
    iconColor: '#4E5E3E',
  },
};


const Toast: React.FC<ToastProps> = ({
  message,
  variant = 'info',
  duration = 5000,
  onClose,
  isVisible,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
      setIsExiting(false);
    }, 300);
  }, [onClose]);

  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(handleClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, handleClose]);

  if (!isVisible && !isExiting) return null;

  const s = variantStyles[variant];
  const animClass = isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0';

  return (
    <div className={`fixed bottom-4 right-4 z-50 transition-[opacity,transform] duration-300 ease-out ${animClass}`}>
      <div
        className="flex items-center gap-3 rounded-xl px-4 py-3 min-w-[320px] max-w-md"
        style={{
          background: s.bg,
          border: s.border,
          color: s.iconColor,
          boxShadow: '0 4px 20px rgba(14,26,9,0.14)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="flex-shrink-0" style={{ position: 'relative' }}>
          <img
            src="/brand_assets/nayara-logo-round.png"
            alt=""
            style={{ width: 28, height: 28, display: 'block' }}
          />
          <span
            style={{
              position: 'absolute',
              bottom: 1,
              right: 1,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: s.iconColor,
              border: '1.5px solid var(--surface)',
            }}
          />
        </div>
        <p className="flex-1 text-sm font-medium" style={{ fontFamily: "'DM Sans', sans-serif", color: 'var(--charcoal)' }}>
          {message}
        </p>
        <button
          onClick={handleClose}
          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
          style={{ color: s.iconColor }}
          aria-label="Close notification"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;

export function useToast() {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    variant: ToastVariant;
    duration?: number;
  }>>([]);

  const showToast = (message: string, variant: ToastVariant = 'info', duration?: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, variant, duration }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const ToastContainer = () => (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          variant={toast.variant}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
          isVisible={true}
        />
      ))}
    </>
  );

  return { showToast, ToastContainer };
}
