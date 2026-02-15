import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  const baseStyles = 'bg-card rounded-card border border-border transition-all duration-200';
  const hoverStyles = hover ? 'hover:shadow-card-hover cursor-pointer' : 'shadow-card';

  return (
    <div className={`${baseStyles} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-b border-border ${className}`}>
      {children}
    </div>
  );
};

export const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 ${className}`}>
      {children}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div className={`px-6 py-4 border-t border-border ${className}`}>
      {children}
    </div>
  );
};
