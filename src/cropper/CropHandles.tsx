import { useMemo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

interface CropHandlesProps {
  cropWidth: SharedValue<number>;
  cropHeight: SharedValue<number>;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  borderColor?: string;
  /** When false, handle pans are disabled (e.g. while dismissing). */
  enabled?: boolean;
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
  enabled: boolean;
}

function Handle({
  position,
  cropWidth,
  cropHeight,
  minWidth,
  minHeight,
  maxWidth,
  maxHeight,
  enabled,
}: HandleProps) {
  const lastX = useSharedValue(0);
  const lastY = useSharedValue(0);
  const maxWidthSV = useSharedValue(maxWidth ?? Number.POSITIVE_INFINITY);
  const maxHeightSV = useSharedValue(maxHeight ?? Number.POSITIVE_INFINITY);

  useEffect(() => {
    maxWidthSV.value = maxWidth ?? Number.POSITIVE_INFINITY;
    maxHeightSV.value = maxHeight ?? Number.POSITIVE_INFINITY;
  }, [maxWidth, maxHeight, maxWidthSV, maxHeightSV]);

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .onStart(() => {
          'worklet';
          lastX.value = 0;
          lastY.value = 0;
        })
        .onUpdate((e) => {
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

          size = Math.min(maxWidthSV.value, size);
          size = Math.min(maxHeightSV.value, size);

          cropWidth.value = size;
          cropHeight.value = size;
        }),
    // Shared values + position/min sizes are stable for a given Handle instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [enabled, position, minWidth, minHeight]
  );

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
  enabled = true,
}: CropHandlesProps) {
  const containerStyle = useAnimatedStyle(() => ({
    width: cropWidth.value,
    height: cropHeight.value,
  }));

  return (
    <Animated.View
      style={[styles.container, containerStyle]}
      pointerEvents={enabled ? 'box-none' : 'none'}
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
        enabled={enabled}
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
        enabled={enabled}
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
        enabled={enabled}
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
        enabled={enabled}
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
