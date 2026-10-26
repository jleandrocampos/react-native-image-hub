import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  clamp,
} from 'react-native-reanimated';
import { CropOverlay } from './CropOverlay';
import { CropHandles } from './CropHandles';
import { CropToolbar } from './CropToolbar';
import { applyCrop, getImageDimensions } from './cropUtils';
import { processImage } from '../utils/imageProcessing';
import { cropperManager } from '../CropperManager';
import type { CropperOptions, CropperStyles, ImageResult } from '../types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const INITIAL_CROP = SCREEN_WIDTH * 0.85;
const MIN_CROP = 80;
/** Delay before unmount callbacks so in-flight touch events can flush. */
const DISMISS_FLUSH_MS = 64;

interface CropperScreenProps {
  imageUri: string;
  options: CropperOptions;
  onCrop: (result: ImageResult) => void;
  onCancel: () => void;
  onError: (error: { code: string; message: string }) => void;
  /** Use image without interactive crop */
  onSkip?: (result: ImageResult) => void;
}

const defaultStyles: CropperStyles = {
  backgroundColor: 'black',
  toolbarBackground: 'white',
  toolbarTitleColor: '#333',
  toolbarTitleSize: 17,
  toolbarBorderColor: '#ccc',
  confirmColor: '#5f8dd3',
  cancelColor: '#5f8dd3',
  confirmSize: 16,
  cancelSize: 16,
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  borderColor: '#5f8dd3',
  borderWidth: 2,
  gridColor: 'rgba(255, 255, 255, 0.3)',
  handleColor: undefined,
  processingBackground: 'rgba(0, 0, 0, 0.5)',
  processingCardBackground: 'white',
  processingTextColor: '#333',
};

function getSizeAsync(
  uri: string
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
}

export function CropperScreen({
  imageUri,
  options,
  onCrop,
  onCancel,
  onError,
  onSkip,
}: CropperScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [gesturesLocked, setGesturesLocked] = useState(false);
  const dismissScheduledRef = useRef(false);

  const allowSkipCrop = options.allowSkipCrop !== false;
  const skipCropOnError = options.skipCropOnError !== false;

  const s = { ...defaultStyles, ...options.styles };
  const tintColor = options.cropperTintColor || s.borderColor || '#5f8dd3';
  const widgetColor =
    options.cropperToolbarWidgetColor || s.cancelColor || tintColor;

  const imageAspect =
    imageDimensions.width > 0
      ? imageDimensions.width / imageDimensions.height
      : 1;

  let imgDisplayW = SCREEN_WIDTH * 0.95;
  let imgDisplayH = imgDisplayW / imageAspect;

  const maxDisplayH = SCREEN_HEIGHT * 0.65;
  if (imgDisplayH > maxDisplayH) {
    imgDisplayH = maxDisplayH;
    imgDisplayW = imgDisplayH * imageAspect;
  }

  const initialHeight = INITIAL_CROP;

  // Reanimated shared values for width/height (improves performance by removing JS re-renders)
  const cropW = useSharedValue(INITIAL_CROP);
  const cropH = useSharedValue(initialHeight);

  // Crop area offset from center
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const offsetXStart = useSharedValue(0);
  const offsetYStart = useSharedValue(0);

  // Keep display size on the UI thread so the pan worklet stays stable across renders.
  const imgDisplayWSV = useSharedValue(imgDisplayW);
  const imgDisplayHSV = useSharedValue(imgDisplayH);

  useEffect(() => {
    imgDisplayWSV.value = imgDisplayW;
    imgDisplayHSV.value = imgDisplayH;
  }, [imgDisplayW, imgDisplayH, imgDisplayWSV, imgDisplayHSV]);

  const cropAnimatedStyle = useAnimatedStyle(() => ({
    width: cropW.value,
    height: cropH.value,
    transform: [
      {
        translateX:
          (imgDisplayWSV.value - cropW.value) / 2 + offsetX.value,
      },
      {
        translateY:
          (imgDisplayHSV.value - cropH.value) / 2 + offsetY.value,
      },
    ],
  }));

  const buildUncroppedResult = useCallback(async (): Promise<ImageResult> => {
    return processImage(imageUri, {
      width: options.width,
      height: options.height,
      compressImageQuality: options.compressImageQuality,
      includeBase64: options.includeBase64,
    });
  }, [
    imageUri,
    options.width,
    options.height,
    options.compressImageQuality,
    options.includeBase64,
  ]);

  const dismissSafely = useCallback((action: () => void) => {
    if (dismissScheduledRef.current) return;
    dismissScheduledRef.current = true;
    setGesturesLocked(true);
    // Let the current touch frame finish before parent unmounts Reanimated nodes.
    requestAnimationFrame(() => {
      setTimeout(action, DISMISS_FLUSH_MS);
    });
  }, []);

  const handleSkip = useCallback(async () => {
    if (isProcessing || gesturesLocked || dismissScheduledRef.current) return;
    setGesturesLocked(true);
    setIsProcessing(true);
    try {
      const result = await buildUncroppedResult();
      dismissSafely(() => {
        if (onSkip) {
          onSkip(result);
        } else {
          onCrop(result);
        }
      });
    } catch (error: any) {
      dismissScheduledRef.current = false;
      setGesturesLocked(false);
      onError({
        code: 'unknown',
        message: error?.message || 'Failed to process image without crop',
      });
    } finally {
      setIsProcessing(false);
    }
  }, [
    buildUncroppedResult,
    dismissSafely,
    gesturesLocked,
    isProcessing,
    onCrop,
    onError,
    onSkip,
  ]);

  const loadImageDimensions = useCallback(async () => {
    try {
      let dims: { width: number; height: number } | null = null;
      try {
        dims = await getImageDimensions(imageUri);
      } catch (nativeError: any) {
        cropperManager.emit({
          type: 'error',
          path: imageUri,
          code: 'unknown',
          message:
            nativeError?.message ||
            'Native getImageInfo failed, trying Image.getSize',
        });
        try {
          dims = await getSizeAsync(imageUri);
        } catch {
          dims = null;
        }
      }

      if (!dims || dims.width <= 0 || dims.height <= 0) {
        cropperManager.emit({
          type: 'error',
          path: imageUri,
          code: 'unknown',
          message: 'Failed to load image dimensions',
        });

        if (skipCropOnError || allowSkipCrop) {
          // Auto-continue without cropper UI when dimensions cannot be loaded.
          try {
            const result = await buildUncroppedResult();
            dismissSafely(() => {
              if (onSkip) {
                onSkip(result);
              } else {
                onCrop(result);
              }
            });
            return;
          } catch (fallbackError: any) {
            setIsLoading(false);
            onError({
              code: 'unknown',
              message:
                fallbackError?.message || 'Failed to load image dimensions',
            });
            return;
          }
        }

        setIsLoading(false);
        onError({ code: 'unknown', message: 'Failed to load image dimensions' });
        return;
      }

      setImageDimensions(dims);
      cropperManager.emit({ type: 'ready', path: imageUri });
      setIsLoading(false);
    } catch (error: any) {
      setIsLoading(false);
      onError({
        code: 'unknown',
        message: error?.message || 'Failed to load image dimensions',
      });
    }
  }, [
    allowSkipCrop,
    buildUncroppedResult,
    dismissSafely,
    imageUri,
    onCrop,
    onError,
    onSkip,
    skipCropOnError,
  ]);

  useEffect(() => {
    loadImageDimensions();
  }, [loadImageDimensions]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .averageTouches(true)
        .enabled(!gesturesLocked)
        .onStart(() => {
          'worklet';
          offsetXStart.value = offsetX.value;
          offsetYStart.value = offsetY.value;
        })
        .onUpdate((e) => {
          'worklet';
          const maxDx = (imgDisplayWSV.value - cropW.value) / 2;
          const maxDy = (imgDisplayHSV.value - cropH.value) / 2;

          offsetX.value = clamp(
            offsetXStart.value + e.translationX,
            -maxDx,
            maxDx
          );
          offsetY.value = clamp(
            offsetYStart.value + e.translationY,
            -maxDy,
            maxDy
          );
        })
        .minPointers(1),
    // Shared values are stable; only lock toggles recreation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gesturesLocked]
  );

  const handleCancel = useCallback(() => {
    if (isProcessing) return;
    dismissSafely(onCancel);
  }, [dismissSafely, onCancel, isProcessing]);

  const handleConfirm = async () => {
    if (isProcessing || gesturesLocked || dismissScheduledRef.current) return;

    setGesturesLocked(true);
    setIsProcessing(true);
    try {
      const scaleX = imageDimensions.width / imgDisplayW;
      const scaleY = imageDimensions.height / imgDisplayH;

      const currentCropW = cropW.value;
      const currentCropH = cropH.value;
      const currentOffsetX = offsetX.value;
      const currentOffsetY = offsetY.value;

      // Crop top-left in image display coordinates
      const cropLeft = (imgDisplayW - currentCropW) / 2 + currentOffsetX;
      const cropTop = (imgDisplayH - currentCropH) / 2 + currentOffsetY;

      const cropX = Math.round(Math.max(0, cropLeft * scaleX));
      const cropY = Math.round(Math.max(0, cropTop * scaleY));
      const finalW = Math.round(
        Math.min(imageDimensions.width - cropX, currentCropW * scaleX)
      );
      const finalH = Math.round(
        Math.min(imageDimensions.height - cropY, currentCropH * scaleY)
      );

      const result = await applyCrop(
        imageUri,
        { x: cropX, y: cropY, width: finalW, height: finalH },
        {
          width: options.width,
          height: options.height,
          compressImageQuality: options.compressImageQuality,
          includeBase64: options.includeBase64,
        }
      );
      dismissSafely(() => onCrop(result));
    } catch (error: any) {
      cropperManager.emit({
        type: 'error',
        path: imageUri,
        code: 'crop_failed',
        message: error.message || 'Failed to crop image',
      });

      if (skipCropOnError || allowSkipCrop) {
        try {
          const result = await buildUncroppedResult();
          dismissSafely(() => {
            if (onSkip) {
              onSkip(result);
            } else {
              onCrop(result);
            }
          });
          return;
        } catch {
          // fall through to onError
        }
      }

      dismissScheduledRef.current = false;
      setGesturesLocked(false);
      onError({
        code: 'crop_failed',
        message: error.message || 'Failed to crop image',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: s.backgroundColor },
        ]}
      >
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: s.backgroundColor }]}
      pointerEvents={gesturesLocked ? 'box-none' : 'auto'}
    >
      <CropToolbar
        title={options.cropperToolbarTitle}
        confirmText={options.cropperChooseText}
        cancelText={options.cropperCancelText}
        skipText={options.cropperSkipText || 'Usar original'}
        showSkip={allowSkipCrop}
        tintColor={tintColor}
        widgetColor={widgetColor}
        backgroundColor={s.toolbarBackground}
        titleColor={s.toolbarTitleColor}
        titleSize={s.toolbarTitleSize}
        borderColor={s.toolbarBorderColor}
        confirmSize={s.confirmSize}
        cancelSize={s.cancelSize}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onSkip={handleSkip}
      />

      <View
        style={styles.imageContainer}
        pointerEvents={gesturesLocked ? 'none' : 'auto'}
      >
        {/* Static image */}
        <View style={{ width: imgDisplayW, height: imgDisplayH }}>
          <Animated.Image
            source={{ uri: imageUri }}
            style={{ width: imgDisplayW, height: imgDisplayH }}
            resizeMode="contain"
          />

          {/* Draggable crop area — positioned over the image */}
          <GestureDetector gesture={panGesture}>
            <Animated.View style={[styles.cropArea, cropAnimatedStyle]}>
              <CropOverlay
                cropWidth={cropW}
                cropHeight={cropH}
                overlayColor={s.overlayColor}
                borderColor={tintColor}
                borderWidth={s.borderWidth}
                gridColor={s.gridColor}
              />

              <CropHandles
                cropWidth={cropW}
                cropHeight={cropH}
                minWidth={MIN_CROP}
                minHeight={MIN_CROP}
                maxWidth={imgDisplayW}
                maxHeight={imgDisplayH}
                borderColor={s.handleColor || tintColor}
                enabled={!gesturesLocked}
              />
            </Animated.View>
          </GestureDetector>
        </View>
      </View>

      {isProcessing && (
        <View
          style={[
            styles.processingOverlay,
            { backgroundColor: s.processingBackground },
          ]}
          pointerEvents="none"
        >
          <View
            style={[
              styles.processingCard,
              { backgroundColor: s.processingCardBackground },
            ]}
          >
            <ActivityIndicator size="large" color={s.processingTextColor} />
            <Text
              style={[styles.processingText, { color: s.processingTextColor }]}
            >
              Processando...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cropArea: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
