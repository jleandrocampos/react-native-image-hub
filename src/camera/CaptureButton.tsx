import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

interface CaptureButtonProps {
  /** Callback when button is pressed */
  onPress: () => void;
  /** Button diameter in pixels */
  size?: number;
  /** Button color */
  color?: string;
  /** Whether button is disabled */
  disabled?: boolean;
}

/**
 * Animated camera capture button.
 */
export function CaptureButton({
  onPress,
  size = 72,
  color = '#FF3B30',
  disabled = false,
}: CaptureButtonProps) {
  const scale = useSharedValue(1);
  const innerScale = useSharedValue(1);

  const gesture = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(0.85, { damping: 15, stiffness: 400 });
      innerScale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
    })
    .onFinalize(() => {
      scale.value = withSpring(1, { damping: 15, stiffness: 400 });
      innerScale.value = withSpring(1, { damping: 15, stiffness: 400 });
    })
    .onEnd(() => {
      runOnJS(onPress)();
    });

  const outerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
  }));

  const borderWidth = 4;
  const outerSize = size;
  const innerSize = size - borderWidth * 2;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          styles.outer,
          {
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth,
            borderColor: 'white',
            opacity: disabled ? 0.5 : 1,
          },
          outerStyle,
        ]}
      >
        <Animated.View
          style={[
            styles.inner,
            {
              width: innerSize,
              height: innerSize,
              borderRadius: innerSize / 2,
              backgroundColor: color,
            },
            innerStyle,
          ]}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  outer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
