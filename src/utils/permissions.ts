import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';

/**
 * Request camera permission.
 * Returns true if granted, false otherwise.
 */
export async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const { VisionCamera } = require('react-native-vision-camera');
    const status = VisionCamera.cameraPermissionStatus;
    if (status === 'authorized') {
      return true;
    }
    if (status === 'not-determined') {
      const granted = await VisionCamera.requestCameraPermission();
      return granted === true;
    }
    // denied or restricted
    showPermissionAlert(
      'Permissao de Camera',
      'O aplicativo precisa de permissao de camera para tirar fotos. Por favor, habilite nas configuracoes.'
    );
    return false;
  }

  // Android
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: 'Permissao de Camera',
      message: 'O aplicativo precisa de permissao de camera para tirar fotos.',
      buttonPositive: 'OK',
      buttonNegative: 'Cancelar',
    }
  );

  if (granted === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }

  if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    showPermissionAlert(
      'Permissao de Camera',
      'Permissao de camera negada permanentemente. Por favor, habilite nas configuracoes do dispositivo.'
    );
  }

  return false;
}

function getAndroidApiLevel(): number {
  return typeof Platform.Version === 'number'
    ? Platform.Version
    : parseInt(Platform.Version as string, 10);
}

/**
 * Whether gallery selection uses the system photo picker (Android 13+).
 * On all Android versions the native module uses intents that do not need
 * READ_EXTERNAL_STORAGE / READ_MEDIA_IMAGES (Photo Picker or ACTION_GET_CONTENT).
 */
export function usesSystemPhotoPicker(): boolean {
  return Platform.OS === 'android' && getAndroidApiLevel() >= 33;
}

/**
 * Gallery access for the native picker.
 * Always allowed: iOS PHPicker and Android Photo Picker / ACTION_GET_CONTENT
 * grant temporary URI access without broad storage permission.
 *
 * Do NOT request READ_EXTERNAL_STORAGE here — on API < 33 that blocked Samsung
 * (and others) with NEVER_ASK_AGAIN even though GET_CONTENT works without it.
 * Do NOT request READ_MEDIA_IMAGES (Play policy) or CAMERA (HyperOS chooser).
 */
export async function requestGalleryPermission(): Promise<boolean> {
  return true;
}

/**
 * Show an alert with option to open settings.
 */
function showPermissionAlert(title: string, message: string): void {
  Alert.alert(title, message, [
    { text: 'Cancelar', style: 'cancel' },
    {
      text: 'Configuracoes',
      onPress: () => Linking.openSettings(),
    },
  ]);
}
