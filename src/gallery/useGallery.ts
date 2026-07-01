import { useCallback } from 'react';
import { requestGalleryPermission } from '../utils/permissions';
import { openGalleryNative } from './GalleryBridge';
import { processImage } from '../utils/imageProcessing';
import type { PickerOptions, ImageResult } from '../types';

export interface UseGalleryReturn {
  /** Select images from the gallery */
  selectImages: (options: PickerOptions) => Promise<ImageResult[]>;
}

/**
 * Hook for selecting images from the gallery.
 */
export function useGallery(): UseGalleryReturn {
  const selectImages = useCallback(
    async (options: PickerOptions = {}): Promise<ImageResult[]> => {
      // 1. Request permission (Android < 13)
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) {
        throw {
          code: 'permission',
          message: 'Permissão de galeria negada',
        };
      }

      // 2. Open native gallery
      const assets = await openGalleryNative({
        multiple: options.multiple ?? false,
        maxFiles: options.maxFiles ?? 5,
      });

      if (!assets || assets.length === 0) {
        throw {
          code: 'cancelled',
          message: 'Seleção cancelada',
        };
      }

      // 3. Process each image
      const results = await Promise.all(
        assets.map((asset) =>
          processImage(asset.uri, {
            width: options.width,
            height: options.height,
            compressImageQuality: options.compressImageQuality,
            includeBase64: options.includeBase64,
          })
        )
      );

      return results;
    },
    []
  );

  return { selectImages };
}
