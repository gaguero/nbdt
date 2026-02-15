import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'small' | 'medium' | 'large' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
  fullWidth?: boolean;
}

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
    const baseStyles = 'inline-flex items-center justify-center font-button rounded-button transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variantStyles = {
      primary: 'bg-brand-primary text-brand-white hover:bg-brand-shadow focus:ring-brand-primary shadow-button',
      secondary: 'bg-brand-accent text-accent-foreground hover:bg-brand-accent/90 focus:ring-brand-accent shadow-button',
      outline: 'border-2 border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary hover:text-brand-white focus:ring-brand-primary',
      ghost: 'text-brand-primary hover:bg-brand-cream focus:ring-brand-primary',
      danger: 'bg-error text-error-foreground hover:bg-error/90 focus:ring-error shadow-button',
    };

    const sizeStyles = {
      small: 'px-3 py-1.5 text-sm',
      sm: 'px-3 py-1.5 text-sm',
      medium: 'px-6 py-3 text-base',
      md: 'px-6 py-3 text-base',
      large: 'px-8 py-4 text-lg',
      lg: 'px-8 py-4 text-lg',
    };

    const widthStyles = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
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
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
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
