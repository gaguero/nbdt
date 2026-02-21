import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}

const variantClass: Record<string, string> = {
  primary:   'nayara-btn nayara-btn-primary',
  secondary: 'nayara-btn nayara-btn-secondary',
  outline:   'nayara-btn nayara-btn-secondary',
  ghost:     'nayara-btn nayara-btn-ghost',
  danger:    'nayara-btn nayara-btn-danger',
};

const sizeClass: Record<string, string> = {
  small:  'px-3 py-1.5 text-xs',
  sm:     'px-3 py-1.5 text-xs',
  medium: 'px-[18px] py-2',
  md:     'px-[18px] py-2',
  large:  'px-6 py-2.5 text-sm',
  lg:     'px-6 py-2.5 text-sm',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      className = '',
      fullWidth = false,
      ...props
    },
    ref
  ) => {
    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${variantClass[variant]} ${sizeClass[size]} ${widthClass} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
