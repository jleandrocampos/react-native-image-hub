import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, StyleSheet, InteractionManager } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraScreen } from './camera/CameraScreen';
import { CropperScreen } from './cropper/CropperScreen';
import { cameraManager } from './CameraManager';
import { cropperManager } from './CropperManager';
import type { CameraRequest } from './CameraManager';
import type { CropperRequest } from './CropperManager';

export interface ImagePickerProviderProps {
  children: React.ReactNode;
}

/** Keep Modal mounted briefly after hide so touch/gesture teardown can finish. */
const MODAL_UNMOUNT_DELAY_MS = 300;
/**
 * After gallery Activity returns (esp. MIUI/Xiaomi), wait before showing cropper
 * so the Activity resume + spurious back/dismiss events settle.
 */
const CROPPER_SHOW_DELAY_MS = 350;
/** Ignore Modal onRequestClose briefly after cropper becomes visible. */
const CROPPER_BACK_GRACE_MS = 800;

/**
 * ImagePickerProvider is a component that should be placed at the root
 * of the React Native app. It allows `ImagePicker.openCamera()` /
 * `openCropper()` / gallery cropping to work by rendering screens on top
 * of the application via a Modal, resolving/rejecting the promise automatically.
 *
 * GestureHandlerRootView inside Modal is required by RNGH on Android (separate Dialog window).
 */
export function ImagePickerProvider({ children }: ImagePickerProviderProps) {
  const [cameraRequest, setCameraRequest] = useState<CameraRequest | null>(
    null
  );
  const [cameraVisible, setCameraVisible] = useState(false);
  const cameraClosingRef = useRef(false);
  const cameraRequestRef = useRef<CameraRequest | null>(null);

  const [cropRequest, setCropRequest] = useState<CropperRequest | null>(null);
  const [cropVisible, setCropVisible] = useState(false);
  const cropClosingRef = useRef(false);
  const cropRequestRef = useRef<CropperRequest | null>(null);
  const cropBackGraceUntilRef = useRef(0);
  const cropShowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cameraRequestRef.current = cameraRequest;
  }, [cameraRequest]);

  useEffect(() => {
    cropRequestRef.current = cropRequest;
  }, [cropRequest]);

  useEffect(() => {
    cameraManager.setListener((req) => {
      if (req) {
        cameraClosingRef.current = false;
        setCameraRequest(req);
        setCameraVisible(true);
        return;
      }

      setCameraRequest(null);
      cameraClosingRef.current = false;
    });
    return () => {
      cameraManager.removeListener();
    };
  }, []);

  useEffect(() => {
    cropperManager.setListener((req) => {
      if (cropShowTimerRef.current) {
        clearTimeout(cropShowTimerRef.current);
        cropShowTimerRef.current = null;
      }

      if (req) {
        cropClosingRef.current = false;
        setCropRequest(req);
        setCropVisible(false);
        // Defer Modal visibility until interactions/activity resume settle.
        InteractionManager.runAfterInteractions(() => {
          cropShowTimerRef.current = setTimeout(() => {
            cropBackGraceUntilRef.current = Date.now() + CROPPER_BACK_GRACE_MS;
            setCropVisible(true);
            cropShowTimerRef.current = null;
          }, CROPPER_SHOW_DELAY_MS);
        });
        return;
      }

      setCropVisible(false);
      setCropRequest(null);
      cropClosingRef.current = false;
    });
    return () => {
      if (cropShowTimerRef.current) {
        clearTimeout(cropShowTimerRef.current);
      }
      cropperManager.removeListener();
    };
  }, []);

  const completeCamera = useCallback((action: (req: CameraRequest) => void) => {
    if (cameraClosingRef.current) return;
    const current = cameraRequestRef.current;
    if (!current) return;

    cameraClosingRef.current = true;
    setCameraVisible(false);
    setTimeout(() => {
      action(current);
    }, MODAL_UNMOUNT_DELAY_MS);
  }, []);

  const completeCrop = useCallback((action: (req: CropperRequest) => void) => {
    if (cropClosingRef.current) return;
    const current = cropRequestRef.current;
    if (!current) return;

    cropClosingRef.current = true;
    setCropVisible(false);
    setTimeout(() => {
      action(current);
    }, MODAL_UNMOUNT_DELAY_MS);
  }, []);

  return (
    <>
      {children}
      {cameraRequest && (
        <Modal
          visible={cameraVisible}
          animationType="slide"
          onRequestClose={() => {
            completeCamera((req) => {
              req.reject({
                code: 'cancelled',
                message: 'Selecao cancelada',
              });
            });
          }}
        >
          <SafeAreaProvider style={styles.container}>
            <GestureHandlerRootView style={styles.container}>
              <CameraScreen
                options={cameraRequest.options}
                onCapture={(result) => {
                  completeCamera((req) => req.resolve(result));
                }}
                onCancel={() => {
                  completeCamera((req) => {
                    req.reject({
                      code: 'cancelled',
                      message: 'Selecao cancelada',
                    });
                  });
                }}
                onError={(error) => {
                  completeCamera((req) => req.reject(error));
                }}
              />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </Modal>
      )}
      {cropRequest && (
        <Modal
          visible={cropVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            // MIUI/Xiaomi often emits a spurious back after returning from gallery.
            if (Date.now() < cropBackGraceUntilRef.current) {
              return;
            }
            completeCrop((req) => {
              cropperManager.emit({
                type: 'cancel',
                path: req.options.path,
                code: 'cancelled',
                message: 'Selecao cancelada',
              });
              req.reject({
                code: 'cancelled',
                message: 'Selecao cancelada',
              });
            });
          }}
        >
          <SafeAreaProvider style={styles.container}>
            <GestureHandlerRootView style={styles.container}>
              <CropperScreen
                imageUri={cropRequest.options.path}
                options={cropRequest.options}
                onCrop={(result) => {
                  completeCrop((req) => {
                    cropperManager.emit({
                      type: 'confirm',
                      path: req.options.path,
                    });
                    req.resolve(result);
                  });
                }}
                onCancel={() => {
                  completeCrop((req) => {
                    cropperManager.emit({
                      type: 'cancel',
                      path: req.options.path,
                      code: 'cancelled',
                    });
                    req.reject({
                      code: 'cancelled',
                      message: 'Selecao cancelada',
                    });
                  });
                }}
                onSkip={(result) => {
                  completeCrop((req) => {
                    cropperManager.emit({
                      type: 'skip',
                      path: req.options.path,
                      message: 'Imagem usada sem corte',
                    });
                    req.resolve(result);
                  });
                }}
                onError={(error) => {
                  completeCrop((req) => {
                    cropperManager.emit({
                      type: 'error',
                      path: req.options.path,
                      code: error.code,
                      message: error.message,
                    });
                    req.reject(error);
                  });
                }}
              />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
