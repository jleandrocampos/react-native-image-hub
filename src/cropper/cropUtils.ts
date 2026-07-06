import type { ImageResult, BaseOptions, CropData } from '../types';

const { NativeModules } = require('react-native');
const { ImageHub } = NativeModules;

/**
 * Apply crop to an image using the crop data from gestures.
 */
export async function applyCrop(
  imageUri: string,
  cropData: CropData,
  options: BaseOptions = {}
): Promise<ImageResult> {
  const quality = options.compressImageQuality ?? 0.8;
  const includeBase64 = options.includeBase64 ?? false;
  const targetWidth = options.width ?? options.height ?? 500;
  const targetHeight = targetWidth;

  try {
    const result = await ImageHub.cropImage(
      imageUri,
      cropData.x,
      cropData.y,
      cropData.width,
      cropData.height,
      targetWidth,
      targetHeight,
      quality,
      'jpeg',
      includeBase64
    );

    return {
      path: result.uri,
      width: result.width,
      height: result.height,
      mime: result.type || 'image/jpeg',
      size: result.size,
      data: result.base64,
    };
  } catch (error: any) {
    throw {
      code: 'crop_failed',
      message: error.message || 'Failed to crop image',
    };
  }
}

/**
 * Calculate crop data from gesture state and image dimensions.
 */
export function calculateCropData(
  imageWidth: number,
  imageHeight: number,
  cropAreaWidth: number,
  cropAreaHeight: number,
  scale: number,
  translateX: number,
  translateY: number
): CropData {
  // Calculate the visible area of the image within the crop window
  const visibleWidth = cropAreaWidth / scale;
  const visibleHeight = cropAreaHeight / scale;

  // Center offset
  const offsetX = (imageWidth - visibleWidth) / 2;
  const offsetY = (imageHeight - visibleHeight) / 2;

  // Apply translation
  const x = Math.max(0, offsetX - translateX / scale);
  const y = Math.max(0, offsetY - translateY / scale);

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(Math.min(visibleWidth, imageWidth)),
    height: Math.round(Math.min(visibleHeight, imageHeight)),
  };
}

/**
 * Get image dimensions using native module.
 */
export async function getImageDimensions(uri: string): Promise<{
  width: number;
  height: number;
}> {
  const info = await ImageHub.getImageInfo(uri);
  return { width: info.width, height: info.height };
}
