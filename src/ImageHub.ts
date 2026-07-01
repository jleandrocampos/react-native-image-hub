import {
  requestCameraPermission,
  requestGalleryPermission,
} from './utils/permissions';
import { processImage } from './utils/imageProcessing';
import { openGalleryNative } from './gallery/GalleryBridge';
import { applyCrop, getImageDimensions } from './cropper/cropUtils';
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
  static async openCamera(_options: CameraOptions = {}): Promise<ImageResult> {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw {
        code: 'permission',
        message: 'Permissao de camera negada',
      } as ImageHubError;
    }

    // Camera is opened via navigation in the consuming app
    // This method returns the configuration needed
    throw {
      code: 'camera_unavailable',
      message:
        'openCamera must be used with CameraScreen component. Use useCamera hook instead.',
    };
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
      const msg = String(nativeError?.message || nativeError || '').toLowerCase();
      if (msg.includes('cancel')) {
        throw { code: 'cancelled', message: 'Selecao cancelada' } as ImageHubError;
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

    const results = await Promise.all(
      assets.map((asset: { uri: string }) =>
        processImage(asset.uri, {
          width: options.width,
          height: options.height,
          compressImageQuality: options.compressImageQuality,
          includeBase64: options.includeBase64,
          cropping: options.cropping,
        })
      )
    );

    return options.multiple ? results : results[0]!;
  }

  /**
   * Open the cropper with an existing image.
   *
   * @param options - Cropper configuration with image path
   * @returns Promise resolving to the cropped image
   */
  static async openCropper(options: CropperOptions): Promise<ImageResult> {
    if (!options.path) {
      throw {
        code: 'unknown',
        message: 'Image path is required',
      } as ImageHubError;
    }

    // Get image dimensions
    const dims = await getImageDimensions(options.path);

    // Apply crop with full image as the crop area
    return applyCrop(
      options.path,
      {
        x: 0,
        y: 0,
        width: dims.width,
        height: dims.height,
      },
      {
        width: options.width,
        height: options.height,
        compressImageQuality: options.compressImageQuality,
        includeBase64: options.includeBase64,
      }
    );
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
}
