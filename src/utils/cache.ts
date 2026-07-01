import { NativeModules, Platform } from 'react-native';

const { ImageHub } = NativeModules;

/**
 * Get the cache directory path.
 */
export async function getCacheDirectory(): Promise<string> {
  if (Platform.OS === 'android') {
    return ImageHub.getCacheDirectory();
  }
  // iOS: use NSTemporaryDirectory
  return ImageHub.getCacheDirectory();
}

/**
 * Generate a unique file path in the cache directory.
 */
export async function getCacheFilePath(
  extension: string = 'jpg'
): Promise<string> {
  const cacheDir = await getCacheDirectory();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `${cacheDir}/imagehub_${timestamp}_${random}.${extension}`;
}

/**
 * Delete a file from the cache.
 */
export async function deleteCacheFile(uri: string): Promise<void> {
  try {
    const path = uri.replace('file://', '');
    if (Platform.OS === 'android') {
      await ImageHub.deleteFile(path);
    } else {
      await ImageHub.deleteFile(path);
    }
  } catch {
    // Silently fail on cleanup
    console.warn('Failed to delete cache file:', uri);
  }
}

/**
 * Clear all cached images.
 */
export async function clearCache(): Promise<void> {
  try {
    if (Platform.OS === 'android') {
      await ImageHub.clearCache();
    } else {
      await ImageHub.clearCache();
    }
  } catch {
    console.warn('Failed to clear cache');
  }
}
