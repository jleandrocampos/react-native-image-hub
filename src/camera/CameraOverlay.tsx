import { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Image,
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
import { MergePreview, type MergePreviewHandle } from './MergePreview';
import {
  CloseIcon,
  RotateIcon,
  FlashIcon,
  GridIcon,
  RatioIcon,
} from './CameraIcons';
import { requestCameraPermission } from '../utils/permissions';
import { processImage, cropToAspectRatio } from '../utils/imageProcessing';
import type { CameraOptions, CameraOverlayItem, ImageResult } from '../types';

const { NativeModules } = require('react-native');
const { ImageHub } = NativeModules;

type FlashMode = 'on' | 'off';
type AspectRatio = '4:3' | '16:9' | '1:1';

const FLASH_CYCLE: FlashMode[] = ['off', 'on'];
const RATIO_CYCLE: AspectRatio[] = ['4:3', '16:9', '1:1'];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CameraOverlayProps {
  options: CameraOptions;
  onCapture: (result: ImageResult) => void;
  onCancel: () => void;
  onError: (error: { code: string; message: string }) => void;
}

function parsePosition(
  value: number | string | undefined
): number | string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str.endsWith('%')) return str;
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
}

function resolveDimension(
  value: number | string | undefined,
  total: number,
  fallback: number
): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str.endsWith('%')) {
    return Math.round(total * (parseFloat(str) / 100));
  }
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

function sortOverlays(items: CameraOverlayItem[]): CameraOverlayItem[] {
  return [...items].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

export function CameraOverlay({
  options,
  onCapture,
  onCancel,
  onError,
}: CameraOverlayProps) {
  const insets = useSafeAreaInsets();
  const mergeRef = useRef<MergePreviewHandle>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const [cameraPosition, setCameraPosition] = useState<'front' | 'back'>(
    options.useFrontCamera ? 'front' : 'back'
  );
  const [isCapturing, setIsCapturing] = useState(false);
  const [base64Photo, setBase64Photo] = useState<string>('');
  const [showConfirm, setShowConfirm] = useState(false);
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

  const sortedOverlays = sortOverlays(options.overlays ?? []);
  const shouldMerge = options.mergeOverlay && sortedOverlays.length > 0;
  const shouldShowModal = options.showConfirmModal !== false;

  useEffect(() => {
    requestCameraPermission().then((granted) => {
      setHasPermission(granted);
    });
  }, []);

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

  const finishCapture = async (uri: string) => {
    try {
      const result = await processImage(uri, {
        width: options.width,
        height: options.height,
        compressImageQuality: options.compressImageQuality,
        includeBase64: options.includeBase64,
      });
      onCapture(result);
    } catch (error: any) {
      onError({
        code: 'unknown',
        message: error.message || 'Failed to process image',
      });
    }
  };

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

      if (shouldMerge) {
        const rawBase64 = await ImageHub.readBase64(uri);
        const base64Uri = `data:image/jpeg;base64,${rawBase64}`;
        setBase64Photo(base64Uri);

        if (shouldShowModal) {
          setShowConfirm(true);
        } else {
          setTimeout(() => mergeRef.current?.capture(), 200);
        }
      } else {
        await finishCapture(uri);
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

  const handleConfirmMerged = (mergedBase64Data: string) => {
    setShowConfirm(false);
    setBase64Photo('');

    if (!mergedBase64Data) {
      return;
    }

    onCapture({
      path: mergedBase64Data,
      width: 0,
      height: 0,
      mime: 'image/jpeg',
      size: 0,
      data: options.includeBase64 ? mergedBase64Data : undefined,
    });
  };

  const handleRefuseConfirm = () => {
    setShowConfirm(false);
    setBase64Photo('');
  };

  const handleConfirmPress = () => {
    mergeRef.current?.capture();
  };

  const renderOverlays = () => {
    if (sortedOverlays.length === 0) return null;

    const topOffset = insets.top + 50;
    const bottomOffset = 75;

    return (
      <View
        style={{
          position: 'absolute',
          top: topOffset,
          bottom: bottomOffset,
          left: 0,
          right: 0,
          zIndex: 20,
          overflow: 'hidden',
        }}
        pointerEvents="box-none"
      >
        {sortedOverlays.map((overlay, index) => {
          const hasExplicitLeft = overlay.left !== undefined;
          const hasExplicitRight = overlay.right !== undefined;
          const hasExplicitTop = overlay.top !== undefined;
          const hasExplicitBottom = overlay.bottom !== undefined;
          const hasExplicitWidth = overlay.width !== undefined;
          const hasExplicitHeight = overlay.height !== undefined;

          const left = parsePosition(overlay.left);
          const top = parsePosition(overlay.top);
          const right = parsePosition(overlay.right);
          const bottom = parsePosition(overlay.bottom);

          let w: number;
          let h: number;

          const l = typeof left === 'number' ? left : 0;
          const r = typeof right === 'number' ? right : 0;
          const t = typeof top === 'number' ? top : 0;
          const b = typeof bottom === 'number' ? bottom : 0;

          if (hasExplicitLeft && hasExplicitRight && !hasExplicitWidth) {
            w = SCREEN_WIDTH - l - r;
          } else if (hasExplicitWidth) {
            w = resolveDimension(overlay.width, SCREEN_WIDTH, 100);
          } else {
            w = resolveDimension(overlay.width, SCREEN_WIDTH, 100);
          }

          if (hasExplicitTop && hasExplicitBottom && !hasExplicitHeight) {
            h = SCREEN_HEIGHT - t - b;
          } else if (hasExplicitHeight) {
            h = resolveDimension(overlay.height, SCREEN_HEIGHT, 100);
          } else {
            h = resolveDimension(overlay.height, SCREEN_HEIGHT, 100);
          }

          const opacity = overlay.opacity ?? 1;

          return (
            <Image
              key={`overlay-${index}`}
              source={overlay.source}
              style={{
                position: 'absolute',
                ...(hasExplicitLeft && { left }),
                ...(hasExplicitTop && { top }),
                ...(hasExplicitRight && { right }),
                ...(hasExplicitBottom && { bottom }),
                width: w,
                height: h,
                opacity,
              }}
              resizeMode="contain"
              pointerEvents="none"
            />
          );
        })}
      </View>
    );
  };

  if (!hasPermission) {
    return (
      <View style={[styles.container, styles.center]}>
        <TouchableOpacity
          onPress={onCancel}
          style={[
            styles.iconButton,
            { position: 'absolute', top: insets.top + 8, left: 16 },
          ]}
        >
          <CloseIcon size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.permissionText}>
          Solicitando permissao de camera...
        </Text>
      </View>
    );
  }

  if (device == null) {
    return (
      <View style={[styles.container, styles.center]}>
        <TouchableOpacity
          onPress={onCancel}
          style={[
            styles.iconButton,
            { position: 'absolute', top: insets.top + 8, left: 16 },
          ]}
        >
          <CloseIcon size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.permissionText}>
          Nenhum dispositivo de camera encontrado.
        </Text>
      </View>
    );
  }

  if (showConfirm && base64Photo) {
    return (
      <View style={styles.container}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Confirmar foto</Text>
            <Text style={styles.confirmStatus}>
              Imagem pronta para confirmar.
            </Text>

            <View style={styles.previewWrapper}>
              <MergePreview
                ref={mergeRef}
                base64Photo={base64Photo}
                overlays={sortedOverlays}
                onMerged={handleConfirmMerged}
              />
            </View>

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirmPress}
              >
                <Text style={styles.confirmButtonText}>CONFIRMAR</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, styles.refuseButton]}
                onPress={handleRefuseConfirm}
              >
                <Text
                  style={[styles.confirmButtonText, styles.refuseButtonText]}
                >
                  REFAZER
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
          <View style={styles.gridContainer} pointerEvents="none">
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

        <View style={[styles.topGradient, { height: insets.top + 50 }]} />

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <CloseIcon size={22} color="white" />
          </TouchableOpacity>

          {(showFlash || options.showGrid === true) && (
            <View style={styles.topCenterButtons}>
              {showFlash && (
                <TouchableOpacity
                  onPress={cycleFlash}
                  style={styles.iconButton}
                  activeOpacity={0.7}
                >
                  <FlashIcon size={22} color="white" mode={flashMode} />
                </TouchableOpacity>
              )}

              {options.showGrid === true && (
                <TouchableOpacity
                  onPress={() => setShowGrid((prev) => !prev)}
                  style={[
                    styles.iconButton,
                    showGrid && styles.iconButtonActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <GridIcon size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity
            onPress={toggleCamera}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <RotateIcon size={24} color="white" />
          </TouchableOpacity>
        </View>

        <View style={[styles.bottomGradient, { height: 75 }]} />

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom }]} >
          <View style={styles.bottomBarRow}>
            {showAspectRatio && (
              <TouchableOpacity
                onPress={cycleAspectRatio}
                style={styles.ratioButton}
                activeOpacity={0.7}
              >
                <RatioIcon size={20} color="white" ratio={aspectRatio} />
              </TouchableOpacity>
            )}

            <CaptureButton onPress={handleCapture} disabled={isCapturing} size={48} />

            {showZoom && (
              <View style={styles.zoomIndicator}>
                <Text style={styles.zoomText}>
                  {zoom >= 10 ? `${Math.round(zoom)}x` : `${zoom.toFixed(1)}x`}
                </Text>
              </View>
            )}
          </View>
        </View>

        {renderOverlays()}

        {shouldMerge && !shouldShowModal && base64Photo && (
          <View
            style={{
              position: 'absolute',
              width: 0,
              height: 0,
              overflow: 'hidden',
            }}
          >
            <MergePreview
              ref={mergeRef}
              base64Photo={base64Photo}
              overlays={sortedOverlays}
              onMerged={handleConfirmMerged}
            />
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

function AspectRatioGuide({ ratio }: { ratio: AspectRatio }) {
  let guideWidth: number;
  let guideHeight: number;

  if (ratio === '16:9') {
    guideWidth = 16;
    guideHeight = 9;
  } else if (ratio === '1:1') {
    guideWidth = 1;
    guideHeight = 1;
  } else {
    return null;
  }

  const scale = Math.min(
    SCREEN_WIDTH / guideWidth,
    SCREEN_HEIGHT / guideHeight
  );
  const w = guideWidth * scale;
  const h = guideHeight * scale;

  const topPx = (SCREEN_HEIGHT - h) / 2;
  const sidePx = (SCREEN_WIDTH - w) / 2;

  const topPct = (topPx / SCREEN_HEIGHT) * 100;
  const sidePct = (sidePx / SCREEN_WIDTH) * 100;

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
    paddingBottom: 8,
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
    paddingTop: 0,
    paddingBottom: 0,
    zIndex: 10,
  },
  bottomBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
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
  confirmOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    zIndex: 20,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  confirmStatus: {
    fontSize: 14,
    marginBottom: 12,
    color: '#666',
  },
  previewWrapper: {
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: 4,
  },
  confirmButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  refuseButton: {
    backgroundColor: '#F2F2F7',
  },
  refuseButtonText: {
    color: '#333',
  },
});
