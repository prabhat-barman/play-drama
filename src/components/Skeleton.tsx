import React, {useEffect, useRef} from 'react';
import {Animated, StyleSheet, View, ViewStyle} from 'react-native';
import {colors, radius, spacing} from '../theme/colors';

type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
};

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.65,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.25,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function MovieCardSkeleton({width = 130}: {width?: number}) {
  const height = Math.round(width * 1.48);
  return (
    <View style={{width}}>
      <Skeleton width={width} height={height} borderRadius={radius.md} />
      <Skeleton
        width={width * 0.8}
        height={14}
        borderRadius={4}
        style={{marginTop: 8}}
      />
      <Skeleton
        width={width * 0.5}
        height={10}
        borderRadius={4}
        style={{marginTop: 4}}
      />
    </View>
  );
}

export function MovieRowSkeleton({titleWidth = 140}: {titleWidth?: number}) {
  return (
    <View style={styles.rowSkeleton}>
      <Skeleton
        width={titleWidth}
        height={18}
        borderRadius={4}
        style={{marginBottom: spacing.sm, marginLeft: spacing.md}}
      />
      <View style={styles.hlist}>
        <MovieCardSkeleton width={130} />
        <MovieCardSkeleton width={130} />
        <MovieCardSkeleton width={130} />
      </View>
    </View>
  );
}

export function ScreenLoader({message = 'Loading...'}) {
  return (
    <View style={styles.centeredLoader}>
      <Skeleton width={48} height={48} borderRadius={24} />
      <Skeleton
        width={120}
        height={14}
        borderRadius={4}
        style={{marginTop: spacing.md}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  rowSkeleton: {
    marginVertical: spacing.md,
  },
  hlist: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
  },
  centeredLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
});
