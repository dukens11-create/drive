import { useEffect } from 'react';

import { logEvent, startPerformanceTimer } from '../services/observability';

export function useScreenTracking(screenName: string) {
  useEffect(() => {
    const stopTimer = startPerformanceTimer('screen_load_time', { screenName });
    let mounted = true;
    let completed = false;
    const frame = requestAnimationFrame(() => {
      if (!mounted) {
        return;
      }
      stopTimer();
      completed = true;
      logEvent('screen_viewed', { screenName });
    });

    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      if (!completed) {
        stopTimer({ cancelled: true });
      }
    };
  }, [screenName]);
}
