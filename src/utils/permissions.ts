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

/**
 * Request gallery/photos permission.
 * Returns true if granted, false otherwise.
 */
export async function requestGalleryPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    // iOS PHPicker doesn't require explicit permission
    return true;
  }

  // Android
  const androidVersion: number =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : parseInt(Platform.Version as string, 10);

  if (androidVersion >= 33) {
    // Android 13+ uses READ_MEDIA_IMAGES
    const granted = await PermissionsAndroid.request(
      'android.permission.READ_MEDIA_IMAGES' as any,
      {
        title: 'Permissao de Galeria',
        message: 'O aplicativo precisa de permissao para acessar suas imagens.',
        buttonPositive: 'OK',
        buttonNegative: 'Cancelar',
      }
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      return true;
    }

    if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      showPermissionAlert(
        'Permissao de Galeria',
        'Permissao de galeria negada permanentemente. Por favor, habilite nas configuracoes do dispositivo.'
      );
    }

    return false;
  }

  // Android < 13 uses READ_EXTERNAL_STORAGE
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    {
      title: 'Permissao de Galeria',
      message: 'O aplicativo precisa de permissao para acessar suas imagens.',
      buttonPositive: 'OK',
      buttonNegative: 'Cancelar',
    }
  );

  if (granted === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }

  if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    showPermissionAlert(
      'Permissao de Galeria',
      'Permissao de galeria negada permanentemente. Por favor, habilite nas configuracoes do dispositivo.'
    );
  }

  return false;
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
