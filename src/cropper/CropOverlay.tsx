import { View, StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CropOverlayProps {
  /** Width of the crop area */
  cropWidth?: number;
  /** Height of the crop area */
  cropHeight?: number;
  /** Overlay color */
  overlayColor?: string;
  /** Border color of crop area */
  borderColor?: string;
  /** Border width */
  borderWidth?: number;
  /** Show grid lines */
  showGrid?: boolean;
}

/**
 * Visual overlay for the crop area.
 * Renders a semi-transparent overlay with a transparent "window" for the crop region.
 */
export function CropOverlay({
  cropWidth = SCREEN_WIDTH * 0.85,
  cropHeight = SCREEN_WIDTH * 0.85,
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  borderColor = 'white',
  borderWidth = 2,
  showGrid = true,
}: CropOverlayProps) {
  const gridLineWidth = 1;
  const gridColor = 'rgba(255, 255, 255, 0.3)';

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
      <View style={[styles.middleRow, { height: cropHeight }]}>
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
        <View
          style={[
            styles.cropArea,
            {
              width: cropWidth,
              height: cropHeight,
              borderColor: borderColor,
              borderWidth: borderWidth,
            },
          ]}
        >
          {/* Grid lines */}
          {showGrid && (
            <>
              {/* Vertical lines */}
              <View
                style={[
                  styles.verticalLine,
                  {
                    left: cropWidth / 3,
                    height: cropHeight,
                    width: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.verticalLine,
                  {
                    left: (cropWidth / 3) * 2,
                    height: cropHeight,
                    width: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />

              {/* Horizontal lines */}
              <View
                style={[
                  styles.horizontalLine,
                  {
                    top: cropHeight / 3,
                    width: cropWidth,
                    height: gridLineWidth,
                    backgroundColor: gridColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.horizontalLine,
                  {
                    top: (cropHeight / 3) * 2,
                    width: cropWidth,
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
        </View>

        {/* Right overlay */}
        <View
          style={[
            styles.sideOverlay,
            {
              backgroundColor: overlayColor,
            },
          ]}
        />
      </View>

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
