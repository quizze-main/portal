import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ymHit } from '@/lib/metrics';

export const useYandexMetrika = () => {
  const location = useLocation();

  useEffect(() => {
    // Send a cleaned pageview hit whenever the pathname changes
    ymHit(location.pathname);
  }, [location.pathname]);
};