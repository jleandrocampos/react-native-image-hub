import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface GalleryAsset {
  uri: string;
  width: number;
  height: number;
  mime: string;
}

export interface ImageInfo {
  width: number;
  height: number;
  mime: string;
  size: number;
  modificationDate?: string;
}

export interface CompressOptions {
  quality: number;
  width?: number;
  height?: number;
}

export interface CropResult {
  uri: string;
  width: number;
  height: number;
  type: string;
  size: number;
  base64?: string;
}

export interface Spec extends TurboModule {
  // Gallery
  openGallery(options: {
    multiple: boolean;
    maxFiles: number;
  }): Promise<GalleryAsset[]>;

  // Image info
  getImageInfo(uri: string): Promise<ImageInfo>;

  // Image processing
  compressImage(
    inputUri: string,
    outputPath: string,
    options: CompressOptions
  ): Promise<string>;

  readBase64(uri: string): Promise<string>;

  // Crop
  cropImage(
    uri: string,
    offsetX: number,
    offsetY: number,
    cropWidth: number,
    cropHeight: number,
    displayWidth: number,
    displayHeight: number,
    quality: number,
    format: string,
    includeBase64: boolean
  ): Promise<CropResult>;

  // Cache
  getCacheDirectory(): Promise<string>;
  deleteFile(path: string): Promise<void>;
  clearCache(): Promise<void>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ImageHub');
