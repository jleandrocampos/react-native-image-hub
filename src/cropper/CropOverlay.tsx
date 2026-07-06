import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

interface CropOverlayProps {
  /** Width of the crop area as a shared value */
  cropWidth: SharedValue<number>;
  /** Height of the crop area as a shared value */
  cropHeight: SharedValue<number>;
  /** Overlay color */
  overlayColor?: string;
  /** Border color of crop area */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Show grid lines */
  showGrid?: boolean;
  /** Grid lines color */
  gridColor?: string;
}

/**
 * Visual overlay for the crop area.
 * Renders a semi-transparent overlay with a transparent "window" for the crop region.
 */
export function CropOverlay({
  cropWidth,
  cropHeight,
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  borderColor = 'white',
  borderWidth = 2,
  showGrid = true,
  gridColor = 'rgba(255, 255, 255, 0.3)',
}: CropOverlayProps) {
  const gridLineWidth = 1;

  const middleRowStyle = useAnimatedStyle(() => ({
    height: cropHeight.value,
  }));

  const cropAreaStyle = useAnimatedStyle(() => ({
    width: cropWidth.value,
    height: cropHeight.value,
    borderColor: borderColor,
    borderWidth: borderWidth,
  }));

  const verticalLine1Style = useAnimatedStyle(() => ({
    left: cropWidth.value / 3,
    height: cropHeight.value,
  }));

  const verticalLine2Style = useAnimatedStyle(() => ({
    left: (cropWidth.value / 3) * 2,
    height: cropHeight.value,
  }));

  const horizontalLine1Style = useAnimatedStyle(() => ({
    top: cropHeight.value / 3,
    width: cropWidth.value,
  }));

  const horizontalLine2Style = useAnimatedStyle(() => ({
    top: (cropHeight.value / 3) * 2,
    width: cropWidth.value,
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Top overlay */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: overlayColor,
          },
        ]}
      />

      {/* Middle section with crop window */}
      <Animated.View style={[styles.middleRow, middleRowStyle]}>
        {/* Left overlay */}
        <View
          style={[
            styles.sideOverlay,
            {
              backgroundColor: overlayColor,
            },
          ]}
        />

        {/* Crop area with border */}
        <Animated.View style={[styles.cropArea, cropAreaStyle]}>
          {/* Grid lines */}
          {showGrid && (
            <>
              {/* Vertical lines */}
              <Animated.View
                style={[
                  styles.verticalLine,
                  verticalLine1Style,
                  {
                    width: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.verticalLine,
                  verticalLine2Style,
                  {
                    width: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />

              {/* Horizontal lines */}
              <Animated.View
                style={[
                  styles.horizontalLine,
                  horizontalLine1Style,
                  {
                    height: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.horizontalLine,
                  horizontalLine2Style,
                  {
                    height: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />

              {/* Corner handles */}
              {[
                { top: -4, left: -4 },
                { top: -4, right: -4 },
                { bottom: -4, left: -4 },
                { bottom: -4, right: -4 },
              ].map((pos, index) => (
                <View
                  key={index}
                  style={[
                    styles.cornerHandle,
                    pos as any,
                    { borderColor: borderColor },
                  ]}
                />
              ))}
            </>
          )}
        </Animated.View>

        {/* Right overlay */}
        <View
          style={[
            styles.sideOverlay,
            {
              backgroundColor: overlayColor,
            },
          ]}
        />
      </Animated.View>

      {/* Bottom overlay */}
      <View
        style={[
          styles.overlay,
          {
            backgroundColor: overlayColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  overlay: {
    flex: 1,
    width: '100%',
  },
  middleRow: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
  },
  sideOverlay: {
    flex: 1,
    height: '100%',
  },
  cropArea: {
    backgroundColor: 'transparent',
  },
  verticalLine: {
    position: 'absolute',
    top: 0,
  },
  horizontalLine: {
    position: 'absolute',
    left: 0,
  },
  cornerHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
});
