import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose(id);
    }, 300);
  };

  const getToastStyles = () => {
    const baseStyles = "relative flex items-start gap-3 p-4 rounded-lg shadow-lg border max-w-md w-full transition-all duration-300";
    
    if (isExiting) {
      return `${baseStyles} transform translate-x-full opacity-0`;
    }

    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800`;
      case 'error':
        return `${baseStyles} bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800`;
      case 'warning':
        return `${baseStyles} bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800`;
      case 'info':
        return `${baseStyles} bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700`;
    }
  };

  const getIcon = () => {
    const iconClasses = "h-5 w-5 flex-shrink-0 mt-0.5";
    
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClasses} text-green-600 dark:text-green-400`} />;
      case 'error':
        return <AlertCircle className={`${iconClasses} text-red-600 dark:text-red-400`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClasses} text-yellow-600 dark:text-yellow-400`} />;
      case 'info':
        return <Info className={`${iconClasses} text-blue-600 dark:text-blue-400`} />;
      default:
        return <Info className={`${iconClasses} text-gray-600 dark:text-gray-400`} />;
    }
  };

  const getTextColors = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  if (!isVisible) return null;

  return (
    <div className={getToastStyles()}>
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-medium ${getTextColors()} mb-1`}>
            {title}
          </h4>
        )}
        <p className={`text-sm ${getTextColors()}`}>
          {message}
        </p>
      </div>

      <button
        onClick={handleClose}
        className={`flex-shrink-0 ml-2 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${getTextColors()}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default Toast;