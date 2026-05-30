import { useEffect } from 'react';

import { logEvent, startPerformanceTimer } from '../services/observability';

export function useScreenTracking(screenName: string) {
  useEffect(() => {
    const stopTimer = startPerformanceTimer('screen_load_time', { screenName });
    const frame = requestAnimationFrame(() => {
      stopTimer();
      logEvent('screen_viewed', { screenName });
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [screenName]);
}
