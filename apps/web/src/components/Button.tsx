import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  to?: string;
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = ({ 
  variant = 'primary', 
  to, 
  loading = false,
  children, 
  className, 
  disabled,
  ...props 
}: ButtonProps) => {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm focus-visible:ring-brand-500",
    secondary: "bg-gray-900 text-white hover:bg-gray-800 shadow-sm focus-visible:ring-gray-900",
    outline: "border border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-200"
  };

  const combinedStyles = cn(baseStyles, variants[variant], className);

  if (to && !disabled && !loading) {
    return (
      <Link to={to} className={combinedStyles}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedStyles} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
      {children}
    </button>
  );
};
