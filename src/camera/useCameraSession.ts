import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export function useCameraSession() {
  const [isForeground, setIsForeground] = useState(
    AppState.currentState !== 'background'
  );
  const [isRunning, setIsRunning] = useState(false);
  const [isInterrupted, setIsInterrupted] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setIsForeground(state !== 'background');
    });
    return () => subscription.remove();
  }, []);

  const onStarted = useCallback(() => {
    setIsRunning(true);
    setIsInterrupted(false);
  }, []);
  const onStopped = useCallback(() => setIsRunning(false), []);
  const onInterruptionStarted = useCallback(() => setIsInterrupted(true), []);
  const onInterruptionEnded = useCallback(() => setIsInterrupted(false), []);

  return {
    isActive: isForeground,
    isReady: isForeground && isRunning && !isInterrupted,
    onStarted,
    onStopped,
    onInterruptionStarted,
    onInterruptionEnded,
  };
}
