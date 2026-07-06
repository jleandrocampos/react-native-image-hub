# react-native-image-hub

A modern, highly customizable React Native image picker library supporting custom camera capture (powered by `react-native-vision-camera`), native gallery selection, and a custom image cropper screen.

---

## Installation

```sh
npm install react-native-image-hub
# or
yarn add react-native-image-hub
```

Make sure to install and configure the following required peer dependencies:
* `react-native-gesture-handler`
* `react-native-reanimated`
* `react-native-safe-area-context`
* `react-native-svg`
* `react-native-vision-camera`

---

## Basic Usage

### Import

```javascript
import { ImagePicker } from 'react-native-image-hub';
```

### 1. Open Camera to Capture Photo
```javascript
const image = await ImagePicker.openCamera({
  cropping: true,
  width: 500,
  height: 500,
  showFlash: true,
  showGrid: true,
});
```

### 2. Open Gallery Picker
```javascript
const images = await ImagePicker.openPicker({
  multiple: false,
  cropping: true,
  width: 400,
  height: 400,
});
```

### 3. Open Cropper Manually
```javascript
const cropped = await ImagePicker.openCropper({
  path: 'file://path/to/image.jpg',
  width: 300,
  height: 300,
});
```

---

## Advanced UI Customization

The camera UI (both in normal mode and overlay mode) can be customized using style objects or complete custom render functions. This is helpful to adjust for device-specific issues, such as avoiding the top bar gluing to the notification area/statusBar in production, or swapping default icons with your own custom PNGs/SVGs.

### Example: Fixing Safe Area offsets and Customizing Styles
```javascript
const image = await ImagePicker.openCamera({
  cropping: true,
  // Push the top bar away from the notification area on certain Android/iOS models in production
  topBarStyle: {
    paddingTop: 48,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  bottomBarStyle: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingBottom: 24,
  },
  iconButtonStyle: {
    backgroundColor: '#333333',
    borderRadius: 8,
  },
});
```

### Example: Replacing Camera Buttons with Custom Icons / SVGs
```javascript
import { TouchableOpacity, Image } from 'react-native';

const image = await ImagePicker.openCamera({
  cropping: true,
  // Custom Close Button
  renderCloseButton: ({ onPress }) => (
    <TouchableOpacity onPress={onPress}>
      <Image source={require('./assets/custom-close.png')} style={{ width: 28, height: 28 }} />
    </TouchableOpacity>
  ),
  // Custom Capture Button
  renderCaptureButton: ({ onPress, disabled }) => (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{ opacity: disabled ? 0.5 : 1 }}>
      <Image source={require('./assets/custom-shutter.png')} style={{ width: 72, height: 72 }} />
    </TouchableOpacity>
  ),
});
```

---

## API Reference

### CameraOptions

| Property | Type | Description |
| :--- | :--- | :--- |
| `useFrontCamera` | `boolean` | Use front camera instead of back (default: `false`). |
| `enableShutterSound` | `boolean` | Enable camera shutter sound (default: `false`). |
| `flashMode` | `'on' \| 'off'` | Camera initial flash mode (default: `'off'`). |
| `showFlash` | `boolean` | Show flash toggle button (default: `false`). |
| `showGrid` | `boolean` | Show rule of thirds grid lines (default: `false`). |
| `showAspectRatio` | `boolean` | Show aspect ratio toggle button (default: `false`). |
| `aspectRatio` | `'4:3' \| '16:9' \| '1:1'` | Camera aspect ratio (default: `'4:3'`). |
| `showZoom` | `boolean` | Show current zoom indicator (default: `false`). |
| `zoom` | `number` | Initial zoom level (default: `1`). |
| `cropping` | `boolean` | Automatically open cropper screen after capture (default: `false`). |
| `width` | `number` | Target output crop width (default: `500`). |
| `height` | `number` | Target output crop height (default: `500`). |
| `includeBase64` | `boolean` | Include base64 string representation in the result (default: `false`). |
| `compressImageQuality`| `number` | Compression factor between `0.0` and `1.0` (default: `0.8`). |
| `overlays` | `CameraOverlayItem[]` | List of transparent/SVG overlays to display on top of the camera viewfinder. |
| `mergeOverlay` | `boolean` | Merge overlays onto the final captured image (default: `false`). |
| `showConfirmModal` | `boolean` | Show confirmation card before returning merged overlay image (default: `true`). |

#### Custom Style Props
| Property | Type | Description |
| :--- | :--- | :--- |
| `topBarStyle` | `StyleProp<ViewStyle>` | Style object for the top bar container. |
| `bottomBarStyle` | `StyleProp<ViewStyle>` | Style object for the bottom bar container. |
| `topBarGradientStyle` | `StyleProp<ViewStyle>` | Style object for the top gradient background. |
| `bottomGradientStyle` | `StyleProp<ViewStyle>` | Style object for the bottom gradient background. |
| `topCenterButtonsStyle`| `StyleProp<ViewStyle>` | Style object for the container wrapping flash and grid toggles. |
| `bottomBarRowStyle` | `StyleProp<ViewStyle>` | Style object for the bottom row layout. |
| `iconButtonStyle` | `StyleProp<ViewStyle>` | Base styling for the small round icons. |
| `ratioButtonStyle` | `StyleProp<ViewStyle>` | Style object for the aspect ratio toggle button. |
| `zoomIndicatorStyle` | `StyleProp<ViewStyle>` | Style object for the zoom level badge container. |
| `zoomTextStyle` | `StyleProp<TextStyle>` | Style object for the zoom badge text. |

#### Custom Render Props
| Property | Type | Description |
| :--- | :--- | :--- |
| `renderCloseButton` | `(props: { onPress: () => void }) => ReactNode` | Render function for close/exit button. |
| `renderRotateButton` | `(props: { onPress: () => void }) => ReactNode` | Render function for rotate/switch camera button. |
| `renderFlashButton` | `(props: { onPress: () => void, flashMode: 'on' \| 'off' }) => ReactNode` | Render function for flash toggle button. |
| `renderGridButton` | `(props: { onPress: () => void, showGrid: boolean }) => ReactNode` | Render function for rule of thirds grid button. |
| `renderRatioButton` | `(props: { onPress: () => void, aspectRatio: string }) => ReactNode` | Render function for aspect ratio toggle button. |
| `renderCaptureButton`| `(props: { onPress: () => void, disabled: boolean }) => ReactNode` | Render function for the main capture button. |
| `renderTopBar` | `(props: CustomTopBarProps) => ReactNode` | Replace the entire top bar. |
| `renderBottomBar` | `(props: CustomBottomBarProps) => ReactNode` | Replace the entire bottom bar. |

---

### PickerOptions

| Property | Type | Description |
| :--- | :--- | :--- |
| `multiple` | `boolean` | Allow multi-selection of photos (default: `false`). |
| `maxFiles` | `number` | Limit total images when `multiple: true` (default: `5`). |
| `cropping` | `boolean` | Automatically open cropper screen after selection (default: `false`). |
| `width` | `number` | Target output crop width (default: `500`). |
| `height` | `number` | Target output crop height (default: `500`). |
| `includeBase64` | `boolean` | Include base64 string representation in the result (default: `false`). |
| `compressImageQuality`| `number` | Compression factor between `0.0` and `1.0` (default: `0.8`). |

---

### CropperOptions

| Property | Type | Description |
| :--- | :--- | :--- |
| `path` | `string` | **Required**. File path / URI of the image to load into the cropper. |
| `width` | `number` | Target output crop width (default: `500`). |
| `height` | `number` | Target output crop height (default: `500`). |
| `styles` | `CropperStyles` | Customize the layout/colors of the cropper UI. |

#### CropperStyles Options
| Property | Type | Description |
| :--- | :--- | :--- |
| `backgroundColor` | `string` | Cropper container background (default: `'black'`). |
| `toolbarBackground` | `string` | Toolbar background color (default: `'white'`). |
| `toolbarTitleColor` | `string` | Color of the header title text (default: `'#333'`). |
| `toolbarTitleSize` | `number` | Font size of the header title (default: `17`). |
| `toolbarBorderColor` | `string` | Bottom border of the toolbar (default: `'#ccc'`). |
| `confirmColor` | `string` | Text color of the confirm button. |
| `cancelColor` | `string` | Text color of the cancel button. |
| `confirmSize` | `number` | Font size of the confirm button (default: `16`). |
| `cancelSize` | `number` | Font size of the cancel button (default: `16`). |
| `overlayColor` | `string` | Color outside the crop viewport boundaries (default: `'rgba(0,0,0,0.5)'`). |
| `borderColor` | `string` | Border line of the active crop viewport box (default: `'#5f8dd3'`). |
| `borderWidth` | `number` | Border line thickness of the crop viewport box (default: `2`). |
| `gridColor` | `string` | Rule of thirds crop grid line color (default: `'rgba(255,255,255,0.3)'`). |
| `handleColor` | `string` | Corner drag handle color (default: same as `borderColor`). |
| `processingBackground`| `string` | Processing dialog backdrop overlay (default: `'rgba(0,0,0,0.5)'`). |
| `processingCardBackground`| `string`| Processing dialog box background (default: `'white'`). |
| `processingTextColor` | `string` | Processing indicator text color (default: `'#333'`). |

---

## Contributing

- [Development workflow](CONTRIBUTING.md#development-workflow)
- [Sending a pull request](CONTRIBUTING.md#sending-a-pull-request)
- [Code of conduct](CODE_OF_CONDUCT.md)

## License

MIT
