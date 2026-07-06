import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle, TextStyle } from 'react-native';

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
  /** Enable camera shutter sound (default: false) */
  enableShutterSound?: boolean;
  /** Flash mode (default: 'off') */
  flashMode?: 'on' | 'off';
  /** Show flash toggle button (default: false) */
  showFlash?: boolean;
  /** Show rule of thirds grid overlay (default: false) */
  showGrid?: boolean;
  /** Show aspect ratio toggle button (default: false) */
  showAspectRatio?: boolean;
  /** Camera aspect ratio (default: '4:3') */
  aspectRatio?: '4:3' | '16:9' | '1:1';
  /** Show zoom indicator (default: false) */
  showZoom?: boolean;
  /** Initial zoom level (default: 1) */
  zoom?: number;
  /** Overlay images to display on top of the camera */
  overlays?: CameraOverlayItem[];
  /** Merge overlays into the final captured image (default: false) */
  mergeOverlay?: boolean;
  /** Show confirmation modal before returning merged image (default: true) */
  showConfirmModal?: boolean;
  /** Style for the top bar container */
  topBarStyle?: StyleProp<ViewStyle>;
  /** Style for the bottom bar container */
  bottomBarStyle?: StyleProp<ViewStyle>;
  /** Style for the top gradient overlay */
  topBarGradientStyle?: StyleProp<ViewStyle>;
  /** Style for the bottom gradient overlay */
  bottomGradientStyle?: StyleProp<ViewStyle>;
  /** Style for the top center buttons container */
  topCenterButtonsStyle?: StyleProp<ViewStyle>;
  /** Style for the bottom bar row container */
  bottomBarRowStyle?: StyleProp<ViewStyle>;
  /** Base style for the small icon buttons (close, rotate, flash, grid) */
  iconButtonStyle?: StyleProp<ViewStyle>;
  /** Style for the aspect ratio button */
  ratioButtonStyle?: StyleProp<ViewStyle>;
  /** Style for the zoom indicator container */
  zoomIndicatorStyle?: StyleProp<ViewStyle>;
  /** Style for the zoom indicator text */
  zoomTextStyle?: StyleProp<TextStyle>;
  /** Custom render function for the close button */
  renderCloseButton?: (props: { onPress: () => void }) => ReactNode;
  /** Custom render function for the rotate button */
  renderRotateButton?: (props: { onPress: () => void }) => ReactNode;
  /** Custom render function for the flash toggle button */
  renderFlashButton?: (props: { onPress: () => void; flashMode: 'on' | 'off' }) => ReactNode;
  /** Custom render function for the grid toggle button */
  renderGridButton?: (props: { onPress: () => void; showGrid: boolean }) => ReactNode;
  /** Custom render function for the aspect ratio button */
  renderRatioButton?: (props: { onPress: () => void; aspectRatio: '4:3' | '16:9' | '1:1' }) => ReactNode;
  /** Custom render function for the capture button */
  renderCaptureButton?: (props: { onPress: () => void; disabled: boolean }) => ReactNode;
  /** Custom render function for the entire top bar */
  renderTopBar?: (props: {
    onCancel: () => void;
    toggleCamera: () => void;
    flashMode: 'on' | 'off';
    cycleFlash: () => void;
    showGrid: boolean;
    setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  }) => ReactNode;
  /** Custom render function for the entire bottom bar */
  renderBottomBar?: (props: {
    handleCapture: () => void;
    isCapturing: boolean;
    aspectRatio: '4:3' | '16:9' | '1:1';
    cycleAspectRatio: () => void;
    zoom: number;
  }) => ReactNode;
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
  /** Custom styles for the cropper UI */
  styles?: CropperStyles;
}

/**
 * Custom styles for the cropper screen.
 * All properties are optional — missing values use defaults.
 */
export interface CropperStyles {
  /** Main container background color (default: 'black') */
  backgroundColor?: string;
  /** Toolbar background color (default: 'white') */
  toolbarBackground?: string;
  /** Toolbar title color (default: '#333') */
  toolbarTitleColor?: string;
  /** Toolbar title font size (default: 17) */
  toolbarTitleSize?: number;
  /** Toolbar border bottom color (default: '#ccc') */
  toolbarBorderColor?: string;
  /** Confirm button text color (default: tint color) */
  confirmColor?: string;
  /** Cancel button text color (default: widget color) */
  cancelColor?: string;
  /** Confirm button font size (default: 16) */
  confirmSize?: number;
  /** Cancel button font size (default: 16) */
  cancelSize?: number;
  /** Crop overlay color outside the crop area (default: 'rgba(0,0,0,0.5)') */
  overlayColor?: string;
  /** Crop area border color (default: '#5f8dd3') */
  borderColor?: string;
  /** Crop area border width (default: 2) */
  borderWidth?: number;
  /** Grid lines color inside crop area (default: 'rgba(255,255,255,0.3)') */
  gridColor?: string;
  /** Corner handle border color (default: border color) */
  handleColor?: string;
  /** Processing overlay background (default: 'rgba(0,0,0,0.5)') */
  processingBackground?: string;
  /** Processing card background (default: 'white') */
  processingCardBackground?: string;
  /** Processing text color (default: '#333') */
  processingTextColor?: string;
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
