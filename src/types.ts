/**
 * Base options shared across all image operations.
 */
export interface BaseOptions {
  /** Target width for cropping (default: 500) */
  width?: number;
  /** Target height for cropping (default: 500) */
  height?: number;
  /** Open cropper after selection/capture (default: false) */
  cropping?: boolean;
  /** Include base64 string in result (default: false) */
  includeBase64?: boolean;
  /** Image compression quality 0.0 - 1.0 (default: 0.8) */
  compressImageQuality?: number;
  /** Cropper toolbar title */
  cropperToolbarTitle?: string;
  /** Cropper tint color */
  cropperTintColor?: string;
  /** Cropper toolbar widget color */
  cropperToolbarWidgetColor?: string;
  /** Cropper active widget color */
  cropperActiveWidgetColor?: string;
  /** Cropper confirm button text */
  cropperChooseText?: string;
  /** Cropper cancel button text */
  cropperCancelText?: string;
}

/**
 * Options for opening the camera.
 */
export interface CameraOptions extends BaseOptions {
  /** Use front camera (default: false) */
  useFrontCamera?: boolean;
  /** Flash mode (default: 'auto') */
  flashMode?: 'auto' | 'on' | 'off';
  /** Show rule of thirds grid overlay (default: true) */
  showGrid?: boolean;
  /** Camera aspect ratio (default: '4:3') */
  aspectRatio?: '4:3' | '16:9' | '1:1';
  /** Initial zoom level (default: 1) */
  zoom?: number;
  /** Overlay images to display on top of the camera */
  overlays?: CameraOverlayItem[];
  /** Merge overlays into the final captured image (default: false) */
  mergeOverlay?: boolean;
  /** Show confirmation modal before returning merged image (default: true) */
  showConfirmModal?: boolean;
}

/**
 * Options for opening the gallery picker.
 */
export interface PickerOptions extends BaseOptions {
  /** Allow multiple selection (default: false) */
  multiple?: boolean;
  /** Maximum number of files to select (default: 5) */
  maxFiles?: number;
  /** Media type filter (only 'photo' supported) */
  mediaType?: 'photo';
}

/**
 * Options for opening the cropper with an existing image.
 */
export interface CropperOptions extends BaseOptions {
  /** URI of the image to crop */
  path: string;
}

/**
 * Result returned by image operations.
 */
export interface ImageResult {
  /** file:// URI of the processed image */
  path: string;
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** MIME type (e.g., 'image/jpeg') */
  mime: string;
  /** File size in bytes */
  size: number;
  /** Base64 encoded string (if includeBase64: true) */
  data?: string;
  /** Modification date string */
  modificationDate?: string;
}

/**
 * Error returned by image operations.
 */
export interface ImageHubError {
  /** Error code */
  code:
    | 'cancelled'
    | 'permission'
    | 'camera_unavailable'
    | 'crop_failed'
    | 'unknown';
  /** Human-readable error message */
  message: string;
}

/**
 * Native gallery asset returned by the bridge.
 */
export interface GalleryAsset {
  uri: string;
  width: number;
  height: number;
  mime: string;
}

/**
 * Crop data for ImageEditor.
 */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A single overlay item for the camera.
 * Supports JPG, PNG, SVG image files as overlays.
 */
export interface CameraOverlayItem {
  /** Image source: require() or { uri: string } */
  source: number | { uri: string };
  /** Overlay opacity (0-1, default: 1) */
  opacity?: number;
  /** Position X in pixels or percentage string (e.g. 20 or '50%') */
  left?: number | string;
  /** Position X from right in pixels or percentage string (e.g. 20 or '50%') */
  right?: number | string;
  /** Position Y in pixels or percentage string (e.g. 20 or '50%') */
  top?: number | string;
  /** Position Y from bottom in pixels or percentage string (e.g. 20 or '50%') */
  bottom?: number | string;
  /** Width in pixels or percentage string (e.g. 100 or '100%') */
  width?: number | string;
  /** Height in pixels or percentage string (e.g. 100 or '100%') */
  height?: number | string;
  /** SVG preserveAspectRatio value (default: xMidYMid meet) */
  preserveAspectRatio?: string;
  /** Stack order - higher zIndex renders on top */
  zIndex?: number;
}
