import { cameraManager } from './CameraManager';
import { cropperManager } from './CropperManager';
import {
  requestCameraPermission,
  requestGalleryPermission,
} from './utils/permissions';
import { processImage } from './utils/imageProcessing';
import { openGalleryNative } from './gallery/GalleryBridge';
import { ensureLocalImageUri } from './cropper/cropUtils';
import type {
  BaseOptions,
  CameraOptions,
  PickerOptions,
  CropperOptions,
  ImageResult,
  ImageHubError,
  GalleryAsset,
} from './types';

/**
 * Main entry point for react-native-image-hub.
 *
 * Provides methods for capturing photos with the camera,
 * selecting images from the gallery, and cropping images.
 */
export class ImageHub {
  /**
   * Open the camera to capture a photo.
   *
   * @param options - Camera configuration options
   * @returns Promise resolving to the captured image
   */
  static async openCamera(options: CameraOptions = {}): Promise<ImageResult> {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw {
        code: 'permission',
        message: 'Permissao de camera negada',
      } as ImageHubError;
    }

    return cameraManager.openCamera(options);
  }

  /**
   * Open the gallery to select images.
   *
   * @param options - Gallery configuration options
   * @returns Promise resolving to selected images
   */
  static async openPicker(
    options: PickerOptions = {}
  ): Promise<ImageResult | ImageResult[]> {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) {
      throw {
        code: 'permission',
        message: 'Permissao de galeria negada',
      } as ImageHubError;
    }

    let assets: GalleryAsset[];
    try {
      assets = await openGalleryNative({
        multiple: options.multiple ?? false,
        maxFiles: options.maxFiles ?? 5,
      });
    } catch (nativeError: any) {
      const msg = String(
        nativeError?.message || nativeError || ''
      ).toLowerCase();
      if (msg.includes('cancel')) {
        throw {
          code: 'cancelled',
          message: 'Selecao cancelada',
        } as ImageHubError;
      }
      throw {
        code: 'unknown',
        message: nativeError?.message || 'Falha ao abrir galeria',
      } as ImageHubError;
    }

    if (!assets || assets.length === 0) {
      throw {
        code: 'cancelled',
        message: 'Selecao cancelada',
      } as ImageHubError;
    }

    const results: ImageResult[] = [];
    for (const asset of assets) {
      results.push(await this.processPickerAsset(asset.uri, options));
    }

    return options.multiple ? results : results[0]!;
  }

  /**
   * Open the cropper UI with an existing image.
   *
   * @param options - Cropper configuration with image path
   * @returns Promise resolving to the cropped (or skipped) image
   */
  static async openCropper(options: CropperOptions): Promise<ImageResult> {
    if (!options.path) {
      throw {
        code: 'unknown',
        message: 'Image path is required',
      } as ImageHubError;
    }

    const skipCropOnError = options.skipCropOnError !== false;

    try {
      // Prefer a stable local file:// path before opening the UI (Xiaomi content://).
      const localPath = await ensureLocalImageUri(options.path);
      return await cropperManager.openCropper({
        allowSkipCrop: options.allowSkipCrop !== false,
        skipCropOnError,
        ...options,
        path: localPath,
      });
    } catch (error: any) {
      if (error?.code === 'cancelled') {
        throw error;
      }
      if (skipCropOnError) {
        cropperManager.emit({
          type: 'skip',
          path: options.path,
          code: error?.code,
          message: error?.message || 'Cropper falhou, usando imagem original',
        });
        return processImage(options.path, {
          width: options.width,
          height: options.height,
          compressImageQuality: options.compressImageQuality,
          includeBase64: options.includeBase64,
        });
      }
      throw error;
    }
  }

  /**
   * Process a captured photo (from camera) with optional cropping.
   *
   * @param uri - URI of the captured photo
   * @param options - Processing options
   * @returns Promise resolving to the processed image
   */
  static async processCapturedPhoto(
    uri: string,
    options: BaseOptions = {}
  ): Promise<ImageResult> {
    return processImage(uri, options);
  }

  /**
   * Open the camera with overlay support.
   *
   * This method returns configuration for use with CameraScreen component.
   * The CameraScreen will automatically detect overlays and use CameraOverlay mode.
   *
   * @param options - Camera options including overlays configuration
   * @returns CameraOptions with overlay settings
   */
  static async cameraOverlay(
    options: CameraOptions = {}
  ): Promise<CameraOptions> {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw {
        code: 'permission',
        message: 'Permissao de camera negada',
      } as ImageHubError;
    }

    return {
      ...options,
      mergeOverlay: options.mergeOverlay ?? true,
    };
  }

  /**
   * Subscribe to cropper lifecycle events globally.
   */
  static addCropperListener(
    listener: Parameters<typeof cropperManager.addEventListener>[0]
  ): () => void {
    return cropperManager.addEventListener(listener);
  }

  private static async processPickerAsset(
    uri: string,
    options: PickerOptions
  ): Promise<ImageResult> {
    const cropping = options.cropping === true;
    const skipCropOnError = options.skipCropOnError !== false;

    if (!cropping) {
      return processImage(uri, {
        width: options.width,
        height: options.height,
        compressImageQuality: options.compressImageQuality,
        includeBase64: options.includeBase64,
      });
    }

    try {
      const localPath = await ensureLocalImageUri(uri);
      return await cropperManager.openCropper({
        ...options,
        path: localPath,
        allowSkipCrop: options.allowSkipCrop !== false,
        skipCropOnError,
      });
    } catch (error: any) {
      if (error?.code === 'cancelled') {
        throw error;
      }
      if (skipCropOnError) {
        cropperManager.emit({
          type: 'skip',
          path: uri,
          code: error?.code,
          message: error?.message || 'Cropper falhou, usando imagem original',
        });
        return processImage(uri, {
          width: options.width,
          height: options.height,
          compressImageQuality: options.compressImageQuality,
          includeBase64: options.includeBase64,
        });
      }
      throw error;
    }
  }
}
