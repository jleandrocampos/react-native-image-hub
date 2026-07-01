import Svg, { Path, Line, Rect, Text as SvgText } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

type FlashMode = 'auto' | 'on' | 'off';

/**
 * Minimalist close (X) icon — iOS style.
 */
export function CloseIcon({ size = 28, color = 'white' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Camera rotate / flip icon — circular arrows style.
 */
export function RotateIcon({ size = 28, color = 'white' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 12a8 8 0 0114.93-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M20 12a8 8 0 01-14.93 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M18.93 4L20 8h-4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.07 20L4 16h4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/**
 * Flash / torch icon with three modes: auto, on, off.
 */
export function FlashIcon({
  size = 28,
  color = 'white',
  mode = 'auto',
}: IconProps & { mode?: FlashMode }) {
  if (mode === 'off') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M13 2L4.5 12.5h6L9 22l9.5-12.5h-6L13 2z"
          stroke={color}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Line
          x1="4"
          y1="4"
          x2="20"
          y2="20"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
        />
      </Svg>
    );
  }

  if (mode === 'on') {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M13 2L4.5 12.5h6L9 22l9.5-12.5h-6L13 2z"
          fill={color}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    );
  }

  // auto — lightning bolt with "A" indicator
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M13 2L4.5 12.5h6L9 22l9.5-12.5h-6L13 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <SvgText
        x="12"
        y="13.5"
        textAnchor="middle"
        fontSize="8"
        fontWeight="bold"
        fill={color}
        fontFamily="system"
      >
        A
      </SvgText>
    </Svg>
  );
}

/**
 * Grid / rule of thirds icon.
 */
export function GridIcon({ size = 28, color = 'white' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
      />
      <Line x1="9" y1="3" x2="9" y2="21" stroke={color} strokeWidth={1.5} />
      <Line x1="15" y1="3" x2="15" y2="21" stroke={color} strokeWidth={1.5} />
      <Line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth={1.5} />
      <Line x1="3" y1="15" x2="21" y2="15" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

/**
 * Aspect ratio icon — rectangle with ratio indicator.
 */
export function RatioIcon({
  size = 28,
  color = 'white',
  ratio = '4:3',
}: IconProps & { ratio?: string }) {
  const isLong = ratio.length > 3;
  return (
    <Svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <Rect
        x="3"
        y="6"
        width="22"
        height="16"
        rx="2"
        stroke={color}
        strokeWidth={1.8}
      />
      <SvgText
        x="14"
        y="16.5"
        textAnchor="middle"
        fontSize={isLong ? '7' : '8'}
        fontWeight="bold"
        fill={color}
        fontFamily="system"
      >
        {ratio}
      </SvgText>
    </Svg>
  );
}
