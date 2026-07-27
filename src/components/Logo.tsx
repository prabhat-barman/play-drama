import React from 'react';
import {View, ViewStyle} from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  Rect,
  Stop,
  Text as SvgText,
} from 'react-native-svg';

// Pure-SVG logo — no bitmap asset, no baked background. Renders transparent
// so it blends over any backdrop (poster wall, gradient, glass card, etc.).
// Two variants:
//   - "wordmark": rounded amethyst square + play triangle + "PLAY DRAMA" text
//   - "icon":     rounded amethyst square + play triangle only

type Variant = 'wordmark' | 'icon';

type Props = {
  variant?: Variant;
  width?: number;
  height?: number;
  style?: ViewStyle;
  // Wordmark text color. Defaults to white so the logo pops on the dark
  // Royal Amethyst backdrop.
  textColor?: string;
};

const WORDMARK_VB = {w: 384, h: 96};
const ICON_VB = {w: 96, h: 96};

const WORDMARK_ASPECT = WORDMARK_VB.w / WORDMARK_VB.h; // 4
const ICON_ASPECT = 1;

function sizeFor(
  variant: Variant,
  width?: number,
  height?: number,
): {w: number; h: number} {
  const aspect = variant === 'icon' ? ICON_ASPECT : WORDMARK_ASPECT;
  if (width && !height) return {w: width, h: width / aspect};
  if (height && !width) return {w: height * aspect, h: height};
  if (width && height) return {w: width, h: height};
  const defaultW = variant === 'icon' ? 72 : 240;
  return {w: defaultW, h: defaultW / aspect};
}

export function Logo({
  variant = 'wordmark',
  width,
  height,
  style,
  textColor = '#ffffff',
}: Props) {
  const {w, h} = sizeFor(variant, width, height);
  const vb = variant === 'icon' ? ICON_VB : WORDMARK_VB;

  return (
    <View style={[{width: w, height: h}, style]}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${vb.w} ${vb.h}`}>
        <Defs>
          <LinearGradient id="amethyst" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#9b59b6" />
            <Stop offset="1" stopColor="#ebb2ff" />
          </LinearGradient>
        </Defs>

        {/* Rounded amethyst square badge */}
        <Rect
          x={variant === 'icon' ? 8 : 8}
          y={8}
          width={80}
          height={80}
          rx={20}
          ry={20}
          fill="url(#amethyst)"
        />

        {/*
          Play triangle, centered inside the 80x80 badge (badge occupies
          x:8-88, y:8-88). Triangle points right, with slightly softened
          corners via stroke join. Coords chosen so the visual center of
          the triangle sits at the geometric center of the square.
        */}
        <Path
          d="M39 30 L67 48 L39 66 Z"
          fill="#ffffff"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {variant === 'wordmark' ? (
          <SvgText
            x={108}
            y={62}
            fill={textColor}
            fontSize={38}
            fontWeight="800"
            letterSpacing={2.2}>
            PLAY DRAMA
          </SvgText>
        ) : null}
      </Svg>
    </View>
  );
}
