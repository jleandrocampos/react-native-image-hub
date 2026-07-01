import { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Image as SvgImage, Rect } from 'react-native-svg';
import type { CameraOverlayItem } from '../types';

export interface MergePreviewHandle {
  capture: () => void;
}

interface MergePreviewProps {
  base64Photo: string;
  overlays: CameraOverlayItem[];
  onMerged: (base64Data: string) => void;
  width?: number;
  height?: number;
}

function parseDimension(
  value: number | string | undefined,
  total: number,
  fallback: number
): number {
  if (value === undefined) return fallback;
  if (typeof value === 'number') return value;
  const str = String(value).trim();
  if (str.endsWith('%')) {
    const pct = parseFloat(str) / 100;
    return Math.round(total * pct);
  }
  const num = parseFloat(str);
  return isNaN(num) ? fallback : num;
}

function sortOverlays(items: CameraOverlayItem[]): CameraOverlayItem[] {
  return [...items].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

/**
 * Renders base photo + overlays in SVG and captures as a single image.
 * Exposes capture() via ref — only captures when parent calls it.
 */
export const MergePreview = forwardRef<MergePreviewHandle, MergePreviewProps>(
  function MergePreview(
    { base64Photo, overlays, onMerged, width: propWidth, height: propHeight },
    ref
  ) {
    const svgRef = useRef<Svg>(null);

    const screenW = Dimensions.get('window').width;
    const width = propWidth ?? Math.min(Math.floor(screenW - 32), 388);
    const height = propHeight ?? Math.floor(width * 1.2);

    const sortedOverlays = sortOverlays(overlays);

    const capture = useCallback(() => {
      if (!svgRef.current) return;

      try {
        const svg = svgRef.current as any;
        if (!svg.toDataURL) return;

        svg.toDataURL((data: string) => {
          if (!data) return;
          onMerged(data);
        });
      } catch {
        // Silently fail
      }
    }, [onMerged]);

    useImperativeHandle(
      ref,
      () => ({
        capture,
      }),
      [capture]
    );

    const getPreserveAspectRatio = (item: CameraOverlayItem): string => {
      return item.preserveAspectRatio ?? 'xMidYMid meet';
    };

    return (
      <View style={[styles.container, { width, height }]} collapsable={false}>
        <Svg
          ref={svgRef as any}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          collapsable={false}
        >
          <Rect x="0" y="0" width={width} height={height} fill="black" />

          <SvgImage
            href={base64Photo}
            x="0"
            y="0"
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid slice"
          />

          {sortedOverlays.map((overlay, index) => {
            const hasExplicitLeft = overlay.left !== undefined;
            const hasExplicitRight = overlay.right !== undefined;
            const hasExplicitTop = overlay.top !== undefined;
            const hasExplicitBottom = overlay.bottom !== undefined;
            const hasExplicitWidth = overlay.width !== undefined;
            const hasExplicitHeight = overlay.height !== undefined;

            const left = parseDimension(overlay.left, width, 0);
            const right = parseDimension(overlay.right, width, 0);
            const top = parseDimension(overlay.top, height, 0);
            const bottom = parseDimension(overlay.bottom, height, 0);

            let w: number;
            let h: number;

            if (hasExplicitLeft && hasExplicitRight && !hasExplicitWidth) {
              w = width - left - right;
            } else {
              w = parseDimension(overlay.width, width, width);
            }

            if (hasExplicitTop && hasExplicitBottom && !hasExplicitHeight) {
              h = height - top - bottom;
            } else {
              h = parseDimension(overlay.height, height, height);
            }

            let x: number;
            if (hasExplicitRight && !hasExplicitLeft) {
              x = width - right - w;
            } else {
              x = left;
            }

            let y: number;
            if (hasExplicitBottom && !hasExplicitTop) {
              y = height - bottom - h;
            } else {
              y = top;
            }

            const opacity = overlay.opacity ?? 1;

            return (
              <SvgImage
                key={`overlay-${index}`}
                href={overlay.source}
                x={x}
                y={y}
                width={w}
                height={h}
                opacity={opacity}
                preserveAspectRatio={getPreserveAspectRatio(overlay)}
              />
            );
          })}
        </Svg>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    overflow: 'hidden',
    borderRadius: 4,
  },
});
