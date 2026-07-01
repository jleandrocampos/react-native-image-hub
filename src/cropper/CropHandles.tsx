import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue, runOnJS } from 'react-native-reanimated';

interface CropHandlesProps {
  cropWidth: number;
  cropHeight: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  borderColor?: string;
  onCropResize: (
    width: number,
    height: number,
    offsetX: number,
    offsetY: number
  ) => void;
}

interface HandleProps {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  borderColor: string;
  onDrag: (dx: number, dy: number) => void;
}

function Handle({ position, borderColor, onDrag }: HandleProps) {
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      lastX.value = 0;
      lastY.value = 0;
    })
    .onUpdate((e: any) => {
      const dx = e.translationX - lastX.value;
      const dy = e.translationY - lastY.value;

      lastX.value = e.translationX;
      lastY.value = e.translationY;

      runOnJS(onDrag)(dx, dy);
    });

  const handleSize = 32;
  const dotSize = 12;

  const positionStyle = (() => {
    switch (position) {
      case 'topLeft':
        return { top: -handleSize / 2, left: -handleSize / 2 };
      case 'topRight':
        return { top: -handleSize / 2, right: -handleSize / 2 };
      case 'bottomLeft':
        return { bottom: -handleSize / 2, left: -handleSize / 2 };
      case 'bottomRight':
        return { bottom: -handleSize / 2, right: -handleSize / 2 };
    }
  })();

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.handle, positionStyle, { borderColor }]}>
        <View
          style={[
            styles.handleDot,
            { backgroundColor: borderColor, width: dotSize, height: dotSize },
          ]}
        />
      </View>
    </GestureDetector>
  );
}

export function CropHandles({
  cropWidth,
  cropHeight,
  minWidth = 80,
  minHeight = 80,
  maxWidth,
  maxHeight,
  borderColor = 'white',
  onCropResize,
}: CropHandlesProps) {
  const handleDrag = (
    position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight',
    dx: number,
    dy: number
  ) => {
    let newWidth = cropWidth;
    let newHeight = cropHeight;

    switch (position) {
      case 'bottomRight':
        newWidth = Math.max(minWidth, cropWidth + 2 * dx);
        newHeight = Math.max(minHeight, cropHeight + 2 * dy);
        break;
      case 'bottomLeft':
        newWidth = Math.max(minWidth, cropWidth - 2 * dx);
        newHeight = Math.max(minHeight, cropHeight + 2 * dy);
        break;
      case 'topRight':
        newWidth = Math.max(minWidth, cropWidth + 2 * dx);
        newHeight = Math.max(minHeight, cropHeight - 2 * dy);
        break;
      case 'topLeft':
        newWidth = Math.max(minWidth, cropWidth - 2 * dx);
        newHeight = Math.max(minHeight, cropHeight - 2 * dy);
        break;
    }

    if (maxWidth) newWidth = Math.min(maxWidth, newWidth);
    if (maxHeight) newHeight = Math.min(maxHeight, newHeight);

    onCropResize(newWidth, newHeight, 0, 0);
  };

  return (
    <View
      style={[styles.container, { width: cropWidth, height: cropHeight }]}
      pointerEvents="box-none"
    >
      <Handle
        position="topLeft"
        borderColor={borderColor}
        onDrag={(dx, dy) => handleDrag('topLeft', dx, dy)}
      />
      <Handle
        position="topRight"
        borderColor={borderColor}
        onDrag={(dx, dy) => handleDrag('topRight', dx, dy)}
      />
      <Handle
        position="bottomLeft"
        borderColor={borderColor}
        onDrag={(dx, dy) => handleDrag('bottomLeft', dx, dy)}
      />
      <Handle
        position="bottomRight"
        borderColor={borderColor}
        onDrag={(dx, dy) => handleDrag('bottomRight', dx, dy)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  handle: {
    position: 'absolute',
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  handleDot: {
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'white',
  },
});
