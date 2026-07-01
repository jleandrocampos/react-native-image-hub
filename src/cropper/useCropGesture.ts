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

  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      translateXStart.value = translateX.value;
      translateYStart.value = translateY.value;
    })
    .onUpdate((e: any) => {
      const maxTranslateX = Math.max(
        ((scale.value - 1) * cropArea.width) / 2,
        20
      );
      const maxTranslateY = Math.max(
        ((scale.value - 1) * cropArea.height) / 2,
        20
      );

      const newX = translateXStart.value + e.translationX;
      const newY = translateYStart.value + e.translationY;

      translateX.value = clamp(newX, -maxTranslateX, maxTranslateX);
      translateY.value = clamp(newY, -maxTranslateY, maxTranslateY);
    })
    .minPointers(1)
    .enabled(true);

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      scaleStart.value = scale.value;
    })
    .onUpdate((e: any) => {
      scale.value = clamp(scaleStart.value * e.scale, 1, 3);
    })
    .enabled(true);

  const composed = Gesture.Simultaneous(panGesture, pinchGesture);

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
