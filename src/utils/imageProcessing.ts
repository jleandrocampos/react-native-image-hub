import { getCacheFilePath } from './cache';
import type { ImageResult, BaseOptions } from '../types';

const { NativeModules } = require('react-native');
const { ImageHub } = NativeModules;

/**
 * Process an image: read dimensions, compress, optionally generate base64.
 */
export async function processImage(
  uri: string,
  options: BaseOptions = {}
): Promise<ImageResult> {
  const quality = options.compressImageQuality ?? 0.8;
  const includeBase64 = options.includeBase64 ?? false;

  // Get image info (width, height, mime, size)
  const info = await getImageInfo(uri);

  // If compression is needed, process the image
  if (quality < 1.0 || options.width || options.height) {
    const processedUri = await compressImage(uri, {
      quality,
      width: options.width,
      height: options.height,
    });

    const processedInfo = await getImageInfo(processedUri);

    let base64: string | undefined;
    if (includeBase64) {
      base64 = await readBase64(processedUri);
    }

    return {
      path: processedUri,
      width: processedInfo.width,
      height: processedInfo.height,
      mime: processedInfo.mime,
      size: processedInfo.size,
      data: base64,
      modificationDate: processedInfo.modificationDate,
    };
  }

  // No compression needed
  let base64: string | undefined;
  if (includeBase64) {
    base64 = await readBase64(uri);
  }

  return {
    path: uri,
    width: info.width,
    height: info.height,
    mime: info.mime,
    size: info.size,
    data: base64,
    modificationDate: info.modificationDate,
  };
}

/**
 * Get image metadata (width, height, mime, size).
 */
async function getImageInfo(uri: string): Promise<{
  width: number;
  height: number;
  mime: string;
  size: number;
  modificationDate?: string;
}> {
  return ImageHub.getImageInfo(uri);
}

/**
 * Compress an image with optional resize.
 */
async function compressImage(
  uri: string,
  options: { quality: number; width?: number; height?: number }
): Promise<string> {
  const outputPath = await getCacheFilePath('jpg');
  return ImageHub.compressImage(uri, outputPath, options);
}

/**
 * Read image as base64 string.
 */
async function readBase64(uri: string): Promise<string> {
  return ImageHub.readBase64(uri);
}

/**
 * Get image dimensions without full processing.
 */
export async function getImageDimensions(
  uri: string
): Promise<{ width: number; height: number }> {
  const info = await getImageInfo(uri);
  return { width: info.width, height: info.height };
}

/**
 * Crop an image to match the selected aspect ratio.
 * Center-crops the image to fit the target ratio.
 */
export async function cropToAspectRatio(
  uri: string,
  ratio: '4:3' | '16:9' | '1:1'
): Promise<string> {
  const info = await getImageInfo(uri);
  const srcW = info.width;
  const srcH = info.height;

  let targetRatio: number;
  if (ratio === '16:9') {
    targetRatio = 16 / 9;
  } else if (ratio === '1:1') {
    targetRatio = 1;
  } else {
    targetRatio = 4 / 3;
  }

  const srcRatio = srcW / srcH;

  let cropW: number;
  let cropH: number;
  let offsetX: number;
  let offsetY: number;

  if (srcRatio > targetRatio) {
    // Source is wider than target — crop sides
    cropH = srcH;
    cropW = Math.round(srcH * targetRatio);
    offsetX = Math.round((srcW - cropW) / 2);
    offsetY = 0;
  } else {
    // Source is taller than target — crop top/bottom
    cropW = srcW;
    cropH = Math.round(srcW / targetRatio);
    offsetX = 0;
    offsetY = Math.round((srcH - cropH) / 2);
  }

  const result = await ImageHub.cropImage(
    uri,
    offsetX,
    offsetY,
    cropW,
    cropH,
    0,
    0,
    0.9,
    'jpeg',
    false
  );

  return result.uri;
}
