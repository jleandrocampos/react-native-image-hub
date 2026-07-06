import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

interface CropHandlesProps {
  cropWidth: SharedValue<number>;
  cropHeight: SharedValue<number>;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  borderColor?: string;
}

interface HandleProps {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  borderColor: string;
  cropWidth: SharedValue<number>;
  cropHeight: SharedValue<number>;
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
}

function Handle({
  position,
  cropWidth,
  cropHeight,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
}: HandleProps) {
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);

  const gesture = Gesture.Pan()
    .onStart(() => {
      lastX.value = 0;
      lastY.value = 0;
    })
    .onUpdate((e: any) => {
      'worklet';
      const dx = e.translationX - lastX.value;
      const dy = e.translationY - lastY.value;

      lastX.value = e.translationX;
      lastY.value = e.translationY;

      let newWidth = cropWidth.value;
      let newHeight = cropHeight.value;

      switch (position) {
        case 'bottomRight':
          newWidth = Math.max(minWidth, cropWidth.value + 2 * dx);
          newHeight = Math.max(minHeight, cropHeight.value + 2 * dy);
          break;
        case 'bottomLeft':
          newWidth = Math.max(minWidth, cropWidth.value - 2 * dx);
          newHeight = Math.max(minHeight, cropHeight.value + 2 * dy);
          break;
        case 'topRight':
          newWidth = Math.max(minWidth, cropWidth.value + 2 * dx);
          newHeight = Math.max(minHeight, cropHeight.value - 2 * dy);
          break;
        case 'topLeft':
          newWidth = Math.max(minWidth, cropWidth.value - 2 * dx);
          newHeight = Math.max(minHeight, cropHeight.value - 2 * dy);
          break;
      }

      // Enforce square shape
      let size = Math.max(newWidth, newHeight);

      if (maxWidth) size = Math.min(maxWidth, size);
      if (maxHeight) size = Math.min(maxHeight, size);

      cropWidth.value = size;
      cropHeight.value = size;
    });

  const handleSize = 40;

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
      <View style={[styles.handle, positionStyle]} />
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
}: CropHandlesProps) {
  const containerStyle = useAnimatedStyle(() => ({
    width: cropWidth.value,
    height: cropHeight.value,
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents="box-none"
    >
      <Handle
        position="topLeft"
        borderColor={borderColor}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
      <Handle
        position="topRight"
        borderColor={borderColor}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
      <Handle
        position="bottomLeft"
        borderColor={borderColor}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
      <Handle
        position="bottomRight"
        borderColor={borderColor}
        cropWidth={cropWidth}
        cropHeight={cropHeight}
        minWidth={minWidth}
        minHeight={minHeight}
        maxWidth={maxWidth}
        maxHeight={maxHeight}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
  },
  handle: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'transparent',
  },
});
