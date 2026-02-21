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

const variantIcon = (variant: ToastVariant) => {
  if (variant === 'success') return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  );
  if (variant === 'error') return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
    </svg>
  );
  if (variant === 'warning') return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  );
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  );
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
        <div className="flex-shrink-0">{variantIcon(variant)}</div>
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
