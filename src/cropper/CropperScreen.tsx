import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useCropGesture } from './useCropGesture';
import { CropOverlay } from './CropOverlay';
import { CropHandles } from './CropHandles';
import { CropToolbar } from './CropToolbar';
import { applyCrop, getImageDimensions } from './cropUtils';
import type { CropperOptions, ImageResult } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const INITIAL_CROP = SCREEN_WIDTH * 0.85;
const MIN_CROP = 80;

interface CropperScreenProps {
  imageUri: string;
  options: CropperOptions;
  onCrop: (result: ImageResult) => void;
  onCancel: () => void;
  onError: (error: { code: string; message: string }) => void;
}

export function CropperScreen({
  imageUri,
  options,
  onCrop,
  onCancel,
  onError,
}: CropperScreenProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const imageAspect =
    imageDimensions.width > 0
      ? imageDimensions.width / imageDimensions.height
      : 1;

  let imgDisplayW = SCREEN_WIDTH * 0.95;
  let imgDisplayH = imgDisplayW / imageAspect;

  const maxDisplayH = SCREEN_WIDTH * 1.3;
  if (imgDisplayH > maxDisplayH) {
    imgDisplayH = maxDisplayH;
    imgDisplayW = imgDisplayH * imageAspect;
  }

  const initialHeight = options.height
    ? INITIAL_CROP * (options.height / (options.width ?? options.height))
    : INITIAL_CROP;

  const [cropW, setCropW] = useState(INITIAL_CROP);
  const [cropH, setCropH] = useState(initialHeight);

  const { gesture, animatedStyle, scale, translateX, translateY } =
    useCropGesture({
      width: imgDisplayW,
      height: imgDisplayH,
    });

  const loadImageDimensions = useCallback(async () => {
    try {
      const dims = await getImageDimensions(imageUri);
      setImageDimensions(dims);
    } catch {
      onError({ code: 'unknown', message: 'Failed to load image dimensions' });
    } finally {
      setIsLoading(false);
    }
  }, [imageUri, onError]);

  useEffect(() => {
    loadImageDimensions();
  }, [loadImageDimensions]);

  const handleCropResize = useCallback(
    (
      newWidth: number,
      newHeight: number,
      _offsetX: number,
      _offsetY: number
    ) => {
      setCropW(newWidth);
      setCropH(newHeight);
    },
    []
  );

  const handleConfirm = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      const currentScale = scale.value;
      const currentTx = translateX.value;
      const currentTy = translateY.value;

      const scaleX = imageDimensions.width / imgDisplayW;
      const scaleY = imageDimensions.height / imgDisplayH;

      const visibleW = cropW / currentScale;
      const visibleH = cropH / currentScale;

      const offsetX = (imgDisplayW - visibleW) / 2;
      const offsetY = (imgDisplayH - visibleH) / 2;

      const cropX = Math.round(
        Math.max(0, (offsetX - currentTx / currentScale) * scaleX)
      );
      const cropY = Math.round(
        Math.max(0, (offsetY - currentTy / currentScale) * scaleY)
      );
      const finalW = Math.round(
        Math.min(imageDimensions.width - cropX, visibleW * scaleX)
      );
      const finalH = Math.round(
        Math.min(imageDimensions.height - cropY, visibleH * scaleY)
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
      onCrop(result);
    } catch (error: any) {
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CropToolbar
        title={options.cropperToolbarTitle}
        confirmText={options.cropperChooseText}
        cancelText={options.cropperCancelText}
        tintColor={options.cropperTintColor}
        widgetColor={options.cropperToolbarWidgetColor}
        onConfirm={handleConfirm}
        onCancel={onCancel}
      />

      <View style={styles.imageContainer}>
        <GestureDetector gesture={gesture}>
          <View style={styles.gestureContainer}>
            <Animated.Image
              source={{ uri: imageUri }}
              style={[
                { width: imgDisplayW, height: imgDisplayH },
                animatedStyle as any,
              ]}
              resizeMode="contain"
            />
          </View>
        </GestureDetector>

        <CropOverlay
          cropWidth={cropW}
          cropHeight={cropH}
          borderColor={options.cropperTintColor || '#5f8dd3'}
        />

        <CropHandles
          cropWidth={cropW}
          cropHeight={cropH}
          minWidth={MIN_CROP}
          minHeight={MIN_CROP}
          maxWidth={imgDisplayW}
          maxHeight={imgDisplayH}
          borderColor={options.cropperTintColor || '#5f8dd3'}
          onCropResize={handleCropResize}
        />
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <View style={styles.processingCard}>
            <ActivityIndicator size="large" color="#333" />
            <Text style={styles.processingText}>Processando...</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
  gestureContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  processingCard: {
    backgroundColor: 'white',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
