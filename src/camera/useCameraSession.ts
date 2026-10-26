import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useCameraSession() {
  const [isForeground, setIsForeground] = useState(
    AppState.currentState !== 'background'
  );
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsForeground(state !== 'background');
    });
    return () => subscription.remove();
  }, []);

  const onStarted = useCallback(() => setIsRunning(true), []);
  const onStopped = useCallback(() => setIsRunning(false), []);

  return {
    isActive: isForeground,
    isReady: isForeground && isRunning,
    onStarted,
    onStopped,
  };
}
