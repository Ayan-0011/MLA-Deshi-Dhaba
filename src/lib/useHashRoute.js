import { useCallback, useEffect, useState } from 'react';

const read = () => {
  const raw = window.location.hash.replace(/^#/, '');
  const path = raw.split('?')[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
};

// Minimal hash router (no extra dependency, works on any static host).
export const useHashRoute = () => {
  const [path, setPath] = useState(read);

  useEffect(() => {
    const onChange = () => setPath(read());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (replace) {
      window.history.replaceState(null, '', `#${to}`);
      setPath(to);
    } else if (read() !== to) {
      window.location.hash = to;
    }
  }, []);

  return [path, navigate];
};
