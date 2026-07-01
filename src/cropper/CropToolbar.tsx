import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';

interface CropToolbarProps {
  /** Title text */
  title?: string;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Tint color for buttons */
  tintColor?: string;
  /** Widget color */
  widgetColor?: string;
  /** Called when confirm is pressed */
  onConfirm: () => void;
  /** Called when cancel is pressed */
  onCancel: () => void;
}

/**
 * Toolbar for the crop screen with confirm/cancel buttons.
 */
export function CropToolbar({
  title = 'Redimensionar Foto',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  tintColor = '#5f8dd3',
  widgetColor = '#5f8dd3',
  onConfirm,
  onCancel,
}: CropToolbarProps) {
  const topPadding = Platform.OS === 'ios' ? 44 : 24;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={onCancel} style={styles.button}>
          <Text style={[styles.buttonText, { color: widgetColor }]}>
            {cancelText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onConfirm} style={styles.button}>
          <Text
            style={[styles.buttonText, { color: tintColor, fontWeight: '600' }]}
          >
            {confirmText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  buttonText: {
    fontSize: 16,
  },
});
