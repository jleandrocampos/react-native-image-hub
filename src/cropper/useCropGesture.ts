import { useMemo, useEffect } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  clamp,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';

interface CropArea {
  width: number;
  height: number;
}

interface UseCropGestureReturn {
  /** Composed gesture (Pan + Pinch) */
  gesture: ReturnType<typeof Gesture.Simultaneous>;
  /** Animated style to apply to the image */
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  /** Current scale value */
  scale: ReturnType<typeof useSharedValue<number>>;
  /** Current translate X */
  translateX: ReturnType<typeof useSharedValue<number>>;
  /** Current translate Y */
  translateY: ReturnType<typeof useSharedValue<number>>;
  /** Reset to initial state */
  reset: () => void;
}

/**
 * Hook for managing crop gestures (pan + pinch-to-zoom).
 */
export function useCropGesture(cropArea: CropArea): UseCropGestureReturn {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const scaleStart = useSharedValue(1);
  const translateXStart = useSharedValue(0);
  const translateYStart = useSharedValue(0);

  const cropWidthSV = useSharedValue(cropArea.width);
  const cropHeightSV = useSharedValue(cropArea.height);

  useEffect(() => {
    cropWidthSV.value = cropArea.width;
    cropHeightSV.value = cropArea.height;
  }, [cropArea.width, cropArea.height, cropWidthSV, cropHeightSV]);

  const composed = useMemo(
    () => {
      const panGesture = Gesture.Pan()
        .averageTouches(true)
        .onStart(() => {
          'worklet';
          translateXStart.value = translateX.value;
          translateYStart.value = translateY.value;
        })
        .onUpdate((e) => {
          'worklet';
          const maxTranslateX = Math.max(
            ((scale.value - 1) * cropWidthSV.value) / 2,
            20
          );
          const maxTranslateY = Math.max(
            ((scale.value - 1) * cropHeightSV.value) / 2,
            20
          );

          const newX = translateXStart.value + e.translationX;
          const newY = translateYStart.value + e.translationY;

          translateX.value = clamp(newX, -maxTranslateX, maxTranslateX);
          translateY.value = clamp(newY, -maxTranslateY, maxTranslateY);
        })
        .minPointers(1);

      const pinchGesture = Gesture.Pinch()
        .onStart(() => {
          'worklet';
          scaleStart.value = scale.value;
        })
        .onUpdate((e) => {
          'worklet';
          scale.value = clamp(scaleStart.value * e.scale, 1, 3);
        });

      return Gesture.Simultaneous(panGesture, pinchGesture);
    },
    // Shared values are stable for the lifetime of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const reset = () => {
    scale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
  };

  return {
    gesture: composed,
    animatedStyle,
    scale,
    translateX,
    translateY,
    reset,
  };
}
