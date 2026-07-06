import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Camera,
  useCameraDevice,
  usePhotoOutput,
} from 'react-native-vision-camera';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaptureButton } from './CaptureButton';
import { CameraOverlay } from './CameraOverlay';
import {
  CloseIcon,
  RotateIcon,
  FlashIcon,
  GridIcon,
  RatioIcon,
} from './CameraIcons';
import { requestCameraPermission } from '../utils/permissions';
import { CropperScreen } from '../cropper/CropperScreen';
import { cropToAspectRatio } from '../utils/imageProcessing';
import type { CameraOptions, ImageResult } from '../types';

type FlashMode = 'on' | 'off';
type AspectRatio = '4:3' | '16:9' | '1:1';

const FLASH_CYCLE: FlashMode[] = ['off', 'on'];
const RATIO_CYCLE: AspectRatio[] = ['4:3', '16:9', '1:1'];

interface CameraScreenProps {
  options: CameraOptions;
  onCapture: (result: ImageResult) => void;
  onCancel: () => void;
  onError: (error: { code: string; message: string }) => void;
}

export function CameraScreen({
  options,
  onCapture,
  onCancel,
  onError,
}: CameraScreenProps) {
  const insets = useSafeAreaInsets();
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>(
    options.useFrontCamera ? 'front' : 'back'
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>(
    options.flashMode ?? 'off'
  );
  const [showFlash] = useState(options.showFlash === true);
  const [showGrid, setShowGrid] = useState(options.showGrid === true);
  const [showAspectRatio] = useState(options.showAspectRatio === true);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
    options.aspectRatio ?? '4:3'
  );
  const [showZoom] = useState(options.showZoom === true);
  const [zoom, setZoom] = useState(options.zoom ?? 1);
  const isProcessingRef = useRef(false);
  const baseZoomRef = useRef(1);

  const device = useCameraDevice(cameraPosition);
  const photoOutput = usePhotoOutput({
    quality: 0.9,
    qualityPrioritization: 'balanced',
    containerFormat: 'jpeg',
  });

  useEffect(() => {
    requestCameraPermission().then((granted) => {
      setHasPermission(granted);
    });
  }, []);

  if (options.overlays && options.overlays.length > 0) {
    return (
      <CameraOverlay
        options={options}
        onCapture={onCapture}
        onCancel={onCancel}
        onError={onError}
      />
    );
  }

  const toggleCamera = () => {
    setCameraPosition((prev) => (prev === 'back' ? 'front' : 'back'));
  };

  const cycleFlash = () => {
    setFlashMode((prev) => {
      const idx = FLASH_CYCLE.indexOf(prev);
      return FLASH_CYCLE[(idx + 1) % FLASH_CYCLE.length]!;
    });
  };

  const cycleAspectRatio = () => {
    setAspectRatio((prev) => {
      const idx = RATIO_CYCLE.indexOf(prev);
      return RATIO_CYCLE[(idx + 1) % RATIO_CYCLE.length]!;
    });
  };

  const clampZoom = (value: number) => {
    if (!device) return value;
    const min = device.minZoom ?? 1;
    const max = device.maxZoom ?? 10;
    return Math.min(max, Math.max(min, value));
  };

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      baseZoomRef.current = zoom;
    })
    .onUpdate((e) => {
      setZoom(clampZoom(baseZoomRef.current * e.scale));
    });

  const handleCapture = async () => {
    if (!photoOutput || isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsCapturing(true);

    try {
      const resolvedFlash = flashMode === 'on' ? ('on' as const) : ('off' as const);

      const photo = await photoOutput.capturePhotoToFile(
        { flashMode: resolvedFlash, enableShutterSound: options.enableShutterSound === true },
        {}
      );

      const photoPath = photo.filePath;
      let uri = photoPath.startsWith('file://')
        ? photoPath
        : `file://${photoPath}`;

      // Crop to selected aspect ratio if not 4:3
      if (aspectRatio !== '4:3') {
        try {
          uri = await cropToAspectRatio(uri, aspectRatio);
        } catch {
          // If crop fails, use original
        }
      }

      if (options.cropping) {
        setCapturedUri(uri);
      } else {
        onCapture({
          path: uri,
          width: 0,
          height: 0,
          mime: 'image/jpeg',
          size: 0,
        });
      }
    } catch (error: any) {
      onError({
        code: 'camera_unavailable',
        message: error.message || 'Failed to capture photo',
      });
    } finally {
      isProcessingRef.current = false;
      setIsCapturing(false);
    }
  };

  if (capturedUri) {
    return (
      <CropperScreen
        imageUri={capturedUri}
        options={{
          ...options,
          path: capturedUri,
        }}
        onCrop={onCapture}
        onCancel={() => setCapturedUri(null)}
        onError={(err) => {
          setCapturedUri(null);
          onError(err);
        }}
      />
    );
  }

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="white" />
        <Text style={styles.permissionText}>
          Solicitando permissao de camera...
        </Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.permissionText}>
          Nenhum dispositivo de camera encontrado.
        </Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={pinchGesture}>
      <View style={styles.container}>
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={true}
          outputs={[photoOutput]}
          resizeMode="cover"
        />

        {/* Grid overlay */}
        {showGrid && (
          <View style={[styles.gridContainer]} pointerEvents="none">
            <View
              style={[styles.gridLine, styles.gridVertical, { left: '33.33%' }]}
            />
            <View
              style={[styles.gridLine, styles.gridVertical, { left: '66.66%' }]}
            />
            <View
              style={[
                styles.gridLine,
                styles.gridHorizontal,
                { top: '33.33%' },
              ]}
            />
            <View
              style={[
                styles.gridLine,
                styles.gridHorizontal,
                { top: '66.66%' },
              ]}
            />
          </View>
        )}

        {/* Aspect ratio guide overlays */}
        {showAspectRatio && aspectRatio !== '4:3' && (
          <AspectRatioGuide ratio={aspectRatio} />
        )}

        {/* Top bar gradient overlay */}
        <View style={[styles.topGradient, { height: insets.top + 80 }, options.topBarGradientStyle]} />

        {/* Top bar */}
        {options.renderTopBar ? (
          options.renderTopBar({
            onCancel,
            toggleCamera,
            flashMode,
            cycleFlash,
            showGrid,
            setShowGrid,
          })
        ) : (
          <View style={[styles.topBar, { paddingTop: insets.top }, options.topBarStyle]}>
            {options.renderCloseButton ? (
              options.renderCloseButton({ onPress: onCancel })
            ) : (
              <TouchableOpacity
                onPress={onCancel}
                style={[styles.iconButton, options.iconButtonStyle]}
                activeOpacity={0.7}
              >
                <CloseIcon size={22} color="white" />
              </TouchableOpacity>
            )}

            {(showFlash || options.showGrid === true) && (
              <View style={[styles.topCenterButtons, options.topCenterButtonsStyle]}>
                {showFlash && (
                  options.renderFlashButton ? (
                    options.renderFlashButton({ onPress: cycleFlash, flashMode })
                  ) : (
                    <TouchableOpacity
                      onPress={cycleFlash}
                      style={[styles.iconButton, options.iconButtonStyle]}
                      activeOpacity={0.7}
                    >
                      <FlashIcon size={22} color="white" mode={flashMode} />
                    </TouchableOpacity>
                  )
                )}

                {options.showGrid === true && (
                  options.renderGridButton ? (
                    options.renderGridButton({ onPress: () => setShowGrid((prev) => !prev), showGrid })
                  ) : (
                    <TouchableOpacity
                      onPress={() => setShowGrid((prev) => !prev)}
                      style={[
                        styles.iconButton,
                        options.iconButtonStyle,
                        showGrid && styles.iconButtonActive,
                      ]}
                      activeOpacity={0.7}
                    >
                      <GridIcon size={20} color="white" />
                    </TouchableOpacity>
                  )
                )}
              </View>
            )}

            <View style={{ flex: 1 }} />

            {options.renderRotateButton ? (
              options.renderRotateButton({ onPress: toggleCamera })
            ) : (
              <TouchableOpacity
                onPress={toggleCamera}
                style={[styles.iconButton, options.iconButtonStyle]}
                activeOpacity={0.7}
              >
                <RotateIcon size={24} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Bottom bar gradient overlay */}
        <View style={[styles.bottomGradient, { height: 120 }, options.bottomGradientStyle]} />

        {/* Bottom bar */}
        {options.renderBottomBar ? (
          options.renderBottomBar({
            handleCapture,
            isCapturing,
            aspectRatio,
            cycleAspectRatio,
            zoom,
          })
        ) : (
          <View style={[styles.bottomBar, options.bottomBarStyle]}>
            <View style={[styles.bottomBarRow, options.bottomBarRowStyle]}>
              {showAspectRatio && (
                options.renderRatioButton ? (
                  options.renderRatioButton({ onPress: cycleAspectRatio, aspectRatio })
                ) : (
                  <TouchableOpacity
                    onPress={cycleAspectRatio}
                    style={[styles.ratioButton, options.ratioButtonStyle]}
                    activeOpacity={0.7}
                  >
                    <RatioIcon size={20} color="white" ratio={aspectRatio} />
                  </TouchableOpacity>
                )
              )}

              {options.renderCaptureButton ? (
                options.renderCaptureButton({ onPress: handleCapture, disabled: isCapturing })
              ) : (
                <CaptureButton onPress={handleCapture} disabled={isCapturing} />
              )}

              {showZoom && (
                <View style={[styles.zoomIndicator, options.zoomIndicatorStyle]}>
                  <Text style={[styles.zoomText, options.zoomTextStyle]}>
                    {zoom >= 10 ? `${Math.round(zoom)}x` : `${zoom.toFixed(1)}x`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

function AspectRatioGuide({ ratio }: { ratio: AspectRatio }) {
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

  let guideWidth: number;
  let guideHeight: number;

  if (ratio === '16:9') {
    guideWidth = SCREEN_W;
    guideHeight = SCREEN_W * (9 / 16);
  } else if (ratio === '1:1') {
    guideWidth = SCREEN_W;
    guideHeight = SCREEN_W;
  } else {
    return null;
  }

  const topPx = (SCREEN_H - guideHeight) / 2;
  const sidePx = (SCREEN_W - guideWidth) / 2;
  const topPct = (topPx / SCREEN_H) * 100;
  const sidePct = (sidePx / SCREEN_W) * 100;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${topPct}%`,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: `${topPct}%`,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: `${topPct}%`,
          bottom: `${topPct}%`,
          left: 0,
          width: `${sidePct}%`,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: `${topPct}%`,
          bottom: `${topPct}%`,
          right: 0,
          width: `${sidePct}%`,
          backgroundColor: 'rgba(0,0,0,0.3)',
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
    zIndex: 5,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
  topCenterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 5,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    zIndex: 10,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
  },
  ratioButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  gridContainer: {
    ...StyleSheet.absoluteFill,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  gridVertical: {
    width: 1,
    top: 0,
    bottom: 0,
  },
  gridHorizontal: {
    height: 1,
    left: 0,
    right: 0,
  },
});
