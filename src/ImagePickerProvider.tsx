import React, { useState, useEffect } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CameraScreen } from './camera/CameraScreen';
import { cameraManager } from './CameraManager';
import type { CameraRequest } from './CameraManager';

export interface ImagePickerProviderProps {
  children: React.ReactNode;
}

/**
 * ImagePickerProvider is a component that should be placed at the root
 * of the React Native app. It allows `ImagePicker.openCamera()` to work
 * dynamically by rendering `<CameraScreen>` (and its nested `<CropperScreen>`)
 * on top of the application via a Modal, resolving/rejecting the promise automatically.
 */
export function ImagePickerProvider({ children }: ImagePickerProviderProps) {
  const [request, setRequest] = useState<CameraRequest | null>(null);

  useEffect(() => {
    cameraManager.setListener((req) => {
      setRequest(req);
    });
    return () => {
      cameraManager.removeListener();
    };
  }, []);

  return (
    <>
      {children}
      {request && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={() => {
            request.reject({
              code: 'cancelled',
              message: 'Selecao cancelada',
            });
          }}
        >
          <SafeAreaProvider style={styles.container}>
            <GestureHandlerRootView style={styles.container}>
              <CameraScreen
                options={request.options}
                onCapture={(result) => {
                  request.resolve(result);
                }}
                onCancel={() => {
                  request.reject({
                    code: 'cancelled',
                    message: 'Selecao cancelada',
                  });
                }}
                onError={(error) => {
                  request.reject(error);
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
