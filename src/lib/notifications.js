import { toast } from 'sonner';

export const notify = {
  success: (message, id = message) => toast.success(message, { id, duration: 5000 }),
  error: (message, id = message) => toast.error(message, { id, duration: 6000 }),
  warning: (message, id = message) => toast.warning(message, { id, duration: 5000 }),
  info: (message, id = message) => toast.info(message, { id, duration: 5000 }),
};

export const safeActionError = (error, fallback) => {
  console.error(fallback, error);
  return fallback;
};
