import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      fullWidth = false,
      className = '',
      type = 'text',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <div className={`${widthClass} ${className}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={`
            w-full px-4 py-3
            bg-background
            border rounded-md
            text-foreground
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            ${
              error
                ? 'border-error focus:ring-error focus:border-error'
                : 'border-input focus:ring-ring focus:border-ring'
            }
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm text-error flex items-center">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
