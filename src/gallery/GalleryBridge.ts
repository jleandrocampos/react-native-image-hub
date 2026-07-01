import { NativeModules, Platform } from 'react-native';
import type { GalleryAsset } from '../types';

const { ImageHub } = NativeModules;

/**
 * Open the native gallery picker and return selected assets.
 */
export async function openGalleryNative(options: {
  multiple: boolean;
  maxFiles: number;
}): Promise<GalleryAsset[]> {
  if (Platform.OS === 'ios') {
    return openIOSGallery(options);
  }
  return openAndroidGallery(options);
}

/**
 * Open iOS gallery using PHPicker (via native module).
 */
async function openIOSGallery(options: {
  multiple: boolean;
  maxFiles: number;
}): Promise<GalleryAsset[]> {
  const result = await ImageHub.openGallery({
    multiple: options.multiple,
    maxFiles: options.maxFiles,
  });
  return result;
}

/**
 * Open Android gallery using ACTION_PICK (via native module).
 */
async function openAndroidGallery(options: {
  multiple: boolean;
  maxFiles: number;
}): Promise<GalleryAsset[]> {
  const result = await ImageHub.openGallery({
    multiple: options.multiple,
    maxFiles: options.maxFiles,
  });
  return result;
}
