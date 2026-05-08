import { useState } from 'react';

let toastId = 0;

export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const show = (msg, type = 'info') => {
    setToasts(prev => [...prev, { id: ++toastId, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.slice(1));
    }, 3500);
  };

  const toast = {
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error'),
    info: (msg) => show(msg, 'info'),
  };

  return { toasts, toast };
};