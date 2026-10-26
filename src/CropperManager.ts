import type {
  CropperOptions,
  ImageResult,
  ImageHubError,
  CropperEvent,
} from './types';

export interface CropperRequest {
  options: CropperOptions;
  resolve: (result: ImageResult) => void;
  reject: (error: ImageHubError | any) => void;
}

class CropperManager {
  private listener: ((request: CropperRequest | null) => void) | null = null;
  private currentRequest: CropperRequest | null = null;
  private eventListeners = new Set<(event: CropperEvent) => void>();

  setListener(listener: (request: CropperRequest | null) => void) {
    this.listener = listener;
    if (this.currentRequest && listener) {
      listener(this.currentRequest);
    }
  }

  removeListener() {
    this.listener = null;
  }

  /**
   * Subscribe to cropper lifecycle events (open, ready, error, skip, etc.).
   * Returns an unsubscribe function.
   */
  addEventListener(listener: (event: CropperEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  emit(event: CropperEvent) {
    this.eventListeners.forEach((listener) => {
      try {
        listener(event);
      } catch {
        // Ignore listener errors
      }
    });
    const callback = this.currentRequest?.options.onCropperEvent;
    if (callback) {
      try {
        callback(event);
      } catch {
        // Ignore callback errors
      }
    }
  }

  openCropper(options: CropperOptions): Promise<ImageResult> {
    return new Promise<ImageResult>((resolve, reject) => {
      if (this.currentRequest) {
        this.currentRequest.reject({
          code: 'cancelled',
          message: 'Uma nova requisicao de cropper foi iniciada',
        } as ImageHubError);
      }

      this.currentRequest = {
        options,
        resolve: (result) => {
          this.currentRequest = null;
          if (this.listener) this.listener(null);
          this.emit({ type: 'dismiss', path: options.path });
          resolve(result);
        },
        reject: (error) => {
          this.currentRequest = null;
          if (this.listener) this.listener(null);
          this.emit({
            type: 'dismiss',
            path: options.path,
            code: error?.code,
            message: error?.message,
          });
          reject(error);
        },
      };

      this.emit({ type: 'open', path: options.path });

      if (this.listener) {
        this.listener(this.currentRequest);
      } else {
        reject({
          code: 'unknown',
          message:
            'ImagePickerProvider needs to be mounted at the root of your application to use openCropper.',
        } as ImageHubError);
      }
    });
  }
}

export const cropperManager = new CropperManager();
