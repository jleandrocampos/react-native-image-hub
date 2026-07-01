import { useState, useEffect, useRef, useCallback } from 'react';
import { useCameraDevice, usePhotoOutput } from 'react-native-vision-camera';
import { requestCameraPermission } from '../utils/permissions';
import type { CameraOptions } from '../types';

export type FlashMode = 'auto' | 'on' | 'off';

export interface UseCameraReturn {
  /** Whether camera permission is granted */
  hasPermission: boolean;
  /** Current camera device */
  device: ReturnType<typeof useCameraDevice>;
  /** Photo output for capturing */
  photoOutput: ReturnType<typeof usePhotoOutput>;
  /** Current camera position */
  cameraPosition: 'front' | 'back';
  /** Switch camera position */
  toggleCamera: () => void;
  /** Current flash mode */
  flashMode: FlashMode;
  /** Cycle flash mode: auto → on → off → auto */
  cycleFlash: () => void;
  /** Current zoom level */
  zoom: number;
  /** Set zoom level (clamped to device min/max) */
  setZoom: (value: number) => void;
  /** Capture a photo and return the file URI */
  takePicture: () => Promise<string>;
  /** Whether a photo is being processed */
  isCapturing: boolean;
}

const FLASH_CYCLE: FlashMode[] = ['auto', 'on', 'off'];

/**
 * Hook for managing camera functionality.
 */
export function useCamera(options: CameraOptions = {}): UseCameraReturn {
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>(
    options.useFrontCamera ? 'front' : 'back'
  );
  const [flashMode, setFlashMode] = useState<FlashMode>(
    options.flashMode ?? 'auto'
  );
  const [zoom, setZoomState] = useState(options.zoom ?? 1);
  const [isCapturing, setIsCapturing] = useState(false);
  const isProcessingRef = useRef(false);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'balanced',
    containerFormat: 'jpeg',
  });

  useEffect(() => {
    requestCameraPermission().then((granted) => {
      setHasPermission(granted);
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
  }, []);

  const cycleFlash = useCallback(() => {
    setFlashMode((prev) => {
      const idx = FLASH_CYCLE.indexOf(prev);
      return FLASH_CYCLE[(idx + 1) % FLASH_CYCLE.length]!;
    });
  }, []);

  const setZoom = useCallback(
    (value: number) => {
      if (!device) return;
      const min = device.minZoom ?? 1;
      const max = device.maxZoom ?? 10;
      setZoomState(Math.min(max, Math.max(min, value)));
    },
    [device]
  );

  const takePicture = useCallback(async (): Promise<string> => {
    if (!photoOutput) {
      throw new Error('Camera not ready');
    }

    if (isProcessingRef.current) {
      throw new Error('Already capturing');
    }

    isProcessingRef.current = true;
    setIsCapturing(true);

    try {
      const photo = await photoOutput.capturePhotoToFile(
        {
          flashMode: flashMode === 'on'
            ? ('on' as const)
            : flashMode === 'off'
              ? ('off' as const)
              : ('auto' as const),
          enableShutterSound: true,
        },
        {}
      );

      const photoPath = photo.filePath;
      return photoPath.startsWith('file://')
        ? photoPath
        : `file://${photoPath}`;
    } finally {
      isProcessingRef.current = false;
      setIsCapturing(false);
    }
  }, [photoOutput, flashMode]);

  return {
    hasPermission,
    device,
    photoOutput,
    cameraPosition,
    toggleCamera,
    flashMode,
    cycleFlash,
    zoom,
    setZoom,
    takePicture,
    isCapturing,
  };
}
