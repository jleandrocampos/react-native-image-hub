import type { CameraOptions, ImageResult } from './types';

export interface CameraRequest {
  options: CameraOptions;
  resolve: (result: ImageResult) => void;
  reject: (error: any) => void;
}

class CameraManager {
  private listener: ((request: CameraRequest | null) => void) | null = null;
  private currentRequest: CameraRequest | null = null;

  /**
   * Register a listener to handle camera requests.
   * This is typically called by the ImagePickerProvider.
   */
  setListener(listener: (request: CameraRequest | null) => void) {
    this.listener = listener;
    // If a request came in before the listener was set, notify the listener immediately.
    if (this.currentRequest && listener) {
      listener(this.currentRequest);
    }
  }

  /**
   * Remove the registered listener.
   */
  removeListener() {
    this.listener = null;
  }

  /**
   * Open the camera screen programmatically.
   * Renders the camera custom screen dynamically over the whole app.
   */
  openCamera(options: CameraOptions): Promise<ImageResult> {
    return new Promise<ImageResult>((resolve, reject) => {
      // If there is already an active request, reject it
      if (this.currentRequest) {
        this.currentRequest.reject({
          code: 'cancelled',
          message: 'Uma nova requisicao de camera foi iniciada',
        });
      }

      this.currentRequest = {
        options,
        resolve: (result) => {
          this.currentRequest = null;
          if (this.listener) this.listener(null);
          resolve(result);
        },
        reject: (error) => {
          this.currentRequest = null;
          if (this.listener) this.listener(null);
          reject(error);
        },
      };

      if (this.listener) {
        this.listener(this.currentRequest);
      } else {
        // Fallback warning/error if provider isn't mounted
        reject({
          code: 'camera_unavailable',
          message:
            'ImagePickerProvider needs to be mounted at the root of your application to use openCamera.',
        });
      }
    });
  }
}

export const cameraManager = new CameraManager();
