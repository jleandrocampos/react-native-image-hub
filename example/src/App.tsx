import { useState } from 'react';
import {
  Text,
  View,
  StyleSheet,
  Button,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import ImagePicker, {
  ImageHub,
  CameraScreen,
  CropperScreen,
} from 'react-native-image-hub';
import type { ImageResult, CropperOptions } from 'react-native-image-hub';

const OVERLAY_EXAMPLES = [
  {
    source: require('./assets/overlay-red.png'),
    left: 20,
    top: 20,
    width: 150,
    height: 150,
    opacity: 0.8,
  },
  {
    source: require('./assets/overlay-red.png'),
    bottom: 150,
    right: 20,
    width: 100,
    height: 100,
    opacity: 0.6,
  },
];

export default function App() {
  const [image, setImage] = useState<ImageResult | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [showCameraOverlay, setShowCameraOverlay] = useState(false);
  const [showCameraOverlayNoModal, setShowCameraOverlayNoModal] =
    useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropperUri, setCropperUri] = useState('');

  const handleDirectCamera = async () => {
    try {
      const result = await ImagePicker.openCamera({
        cropping: true,
        width: 500,
        height: 500,
        compressImageQuality: 0.8,
        includeBase64: true,
        showGrid: true,
      });
      setImage(result);
    } catch (error: any) {
      if (error.code !== 'cancelled') {
        Alert.alert('Erro', error.message || 'Falha ao abrir câmera');
      }
    }
  };

  const handleOpenPicker = async () => {
    try {
      const result = await ImageHub.openPicker({
        cropping: true,
        width: 500,
        height: 500,
        compressImageQuality: 0.8,
        includeBase64: true,
      });

      if (Array.isArray(result)) {
        setImage(result[0] ?? null);
      } else {
        setImage(result);
      }
    } catch (error: any) {
      if (error.code !== 'cancelled') {
        Alert.alert('Erro', error.message || 'Falha ao selecionar imagem');
      }
    }
  };

  const handleCameraCapture = (captured: ImageResult) => {
    setShowCamera(false);
    setShowCameraOverlay(false);
    setShowCameraOverlayNoModal(false);
    setImage(captured);
  };

  const handleCameraCancel = () => {
    setShowCamera(false);
    setShowCameraOverlay(false);
    setShowCameraOverlayNoModal(false);
  };

  const handleCameraError = (error: { code: string; message: string }) => {
    setShowCamera(false);
    setShowCameraOverlay(false);
    setShowCameraOverlayNoModal(false);
    Alert.alert('Erro', error.message || 'Falha na câmera');
  };

  const handleOpenCropper = async () => {
    try {
      const result = await ImageHub.openPicker({
        width: 500,
        height: 500,
        compressImageQuality: 0.8,
      });
      const selected = Array.isArray(result) ? result[0]! : result;
      setCropperUri(selected.path);
      setShowCropper(true);
    } catch (error: any) {
      if (error.code !== 'cancelled') {
        Alert.alert('Erro', error.message || 'Falha ao selecionar imagem');
      }
    }
  };

  const handleCropConfirm = (cropped: ImageResult) => {
    setShowCropper(false);
    setCropperUri('');
    setImage(cropped);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropperUri('');
  };

  const handleCropError = (error: { code: string; message: string }) => {
    setShowCropper(false);
    setCropperUri('');
    Alert.alert('Erro', error.message || 'Falha ao recortar');
  };

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <View style={styles.container}>
          <View style={styles.buttons}>
            <Button title="Abrir Galeria" onPress={handleOpenPicker} />
            <Button title="Abrir Câmera" onPress={() => setShowCamera(true)} />
            <Button
              title="Câmera Direta (Promise)"
              onPress={handleDirectCamera}
            />
            <Button
              title="Overlay + Modal"
              onPress={() => setShowCameraOverlay(true)}
            />
            <Button
              title="Overlay Sem Modal"
              onPress={() => setShowCameraOverlayNoModal(true)}
            />
            <Button title="Abrir Cropper" onPress={handleOpenCropper} />
          </View>

          {image && (
            <View style={styles.preview}>
              <Image
                source={{
                  uri: image.data
                    ? `data:${image.mime};base64,${image.data}`
                    : image.path,
                }}
                style={styles.image}
              />
              <Text style={styles.info}>
                {image.width}x{image.height} | {image.mime}
              </Text>
            </View>
          )}

          <Modal visible={showCamera} animationType="slide">
            <GestureHandlerRootView style={{ flex: 1 }}>
              <CameraScreen
                options={{
                  cropping: true,
                  width: 500,
                  height: 500,
                  compressImageQuality: 0.8,
                  includeBase64: true,
                }}
                onCapture={handleCameraCapture}
                onCancel={handleCameraCancel}
                onError={handleCameraError}
              />
            </GestureHandlerRootView>
          </Modal>

          <Modal visible={showCameraOverlay} animationType="slide">
            <GestureHandlerRootView style={{ flex: 1 }}>
              <CameraScreen
                options={{
                  overlays: OVERLAY_EXAMPLES,
                  mergeOverlay: true,
                  showConfirmModal: true,
                  width: 500,
                  height: 500,
                  compressImageQuality: 0.8,
                  includeBase64: true,
                }}
                onCapture={handleCameraCapture}
                onCancel={handleCameraCancel}
                onError={handleCameraError}
              />
            </GestureHandlerRootView>
          </Modal>

          <Modal visible={showCameraOverlayNoModal} animationType="slide">
            <GestureHandlerRootView style={{ flex: 1 }}>
              <CameraScreen
                options={{
                  overlays: OVERLAY_EXAMPLES,
                  mergeOverlay: true,
                  showConfirmModal: false,
                  width: 500,
                  height: 500,
                  compressImageQuality: 0.8,
                  includeBase64: true,
                }}
                onCapture={handleCameraCapture}
                onCancel={handleCameraCancel}
                onError={handleCameraError}
              />
            </GestureHandlerRootView>
          </Modal>

          <Modal visible={showCropper} animationType="slide">
            <GestureHandlerRootView style={{ flex: 1 }}>
              <CropperScreen
                imageUri={cropperUri}
                options={
                  {
                    width: 500,
                    height: 500,
                    compressImageQuality: 0.8,
                  } as CropperOptions
                }
                onCrop={handleCropConfirm}
                onCancel={handleCropCancel}
                onError={handleCropError}
              />
            </GestureHandlerRootView>
          </Modal>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  buttons: {
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  preview: {
    marginTop: 20,
    alignItems: 'center',
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  info: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
});
