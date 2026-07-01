import { AppRegistry } from 'react-native';
import { ImageHub } from './ImageHub';
import { ImagePickerProvider } from './ImagePickerProvider';
import type { CameraOptions, PickerOptions, CropperOptions } from './types';

// Camera exports
export { CameraScreen } from './camera/CameraScreen';
export { CameraOverlay } from './camera/CameraOverlay';
export { MergePreview } from './camera/MergePreview';
export type { MergePreviewHandle } from './camera/MergePreview';
export { CaptureButton } from './camera/CaptureButton';
export { useCamera } from './camera/useCamera';
export { ImagePickerProvider } from './ImagePickerProvider';
export { cameraManager } from './CameraManager';

// Gallery exports
export { useGallery } from './gallery/useGallery';
export { openGalleryNative } from './gallery/GalleryBridge';

// Cropper exports
export { CropperScreen } from './cropper/CropperScreen';
export { CropOverlay } from './cropper/CropOverlay';
export { CropToolbar } from './cropper/CropToolbar';
export { useCropGesture } from './cropper/useCropGesture';
export { applyCrop } from './cropper/cropUtils';

// Utility exports
export {
  requestCameraPermission,
  requestGalleryPermission,
} from './utils/permissions';
export { processImage, getImageDimensions } from './utils/imageProcessing';
export {
  getCacheDirectory,
  getCacheFilePath,
  deleteCacheFile,
  clearCache,
} from './utils/cache';

// Type exports
export type {
  BaseOptions,
  CameraOptions,
  CameraOverlayItem,
  PickerOptions,
  CropperOptions,
  CropperStyles,
  ImageResult,
  ImageHubError,
  GalleryAsset,
  CropData,
} from './types';

// Main export
export { ImageHub };

// Compatibility export (drop-in replacement for react-native-image-crop-picker)
export const ImagePicker = {
  openCamera: (options: CameraOptions) => ImageHub.openCamera(options),
  openPicker: (options: PickerOptions) => ImageHub.openPicker(options),
  openCropper: (options: CropperOptions) => ImageHub.openCropper(options),
};

// Automatic wrapper registration to enable Promise-based CameraScreen overlays
// without requiring manual root configuration.
try {
  AppRegistry.setWrapperComponentProvider(() => {
    return (props: any) => (
      <ImagePickerProvider>{props.children}</ImagePickerProvider>
    );
  });
} catch {
  // Silent fail in non-RN/test environments
}

export default ImagePicker;
