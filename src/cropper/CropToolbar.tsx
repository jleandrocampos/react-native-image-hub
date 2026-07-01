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
  /** Tint color for confirm button */
  tintColor?: string;
  /** Widget color for cancel button */
  widgetColor?: string;
  /** Toolbar background color */
  backgroundColor?: string;
  /** Title text color */
  titleColor?: string;
  /** Title font size */
  titleSize?: number;
  /** Toolbar bottom border color */
  borderColor?: string;
  /** Confirm button font size */
  confirmSize?: number;
  /** Cancel button font size */
  cancelSize?: number;
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
  backgroundColor = 'white',
  titleColor: titleColorProp,
  titleSize = 17,
  borderColor = '#ccc',
  confirmSize = 16,
  cancelSize = 16,
  onConfirm,
  onCancel,
}: CropToolbarProps) {
  const topPadding = Platform.OS === 'ios' ? 44 : 24;

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: topPadding,
          backgroundColor,
          borderBottomColor: borderColor,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          { color: titleColorProp || '#333', fontSize: titleSize },
        ]}
      >
        {title}
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={onCancel} style={styles.button}>
          <Text
            style={[
              styles.buttonText,
              { color: widgetColor, fontSize: cancelSize },
            ]}
          >
            {cancelText}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onConfirm} style={styles.button}>
          <Text
            style={[
              styles.buttonText,
              { color: tintColor, fontWeight: '600', fontSize: confirmSize },
            ]}
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
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
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
  buttonText: {},
});
