import React, {useEffect, useRef} from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {colors, spacing} from '../theme/colors';
import {Logo} from '../components/Logo';

// Decorative TMDB stills for the splash poster wall. Not user-scoped — no
// need to hit the API (user isn't authenticated yet on this screen).
const tmdb = (path: string) => `https://image.tmdb.org/t/p/w500${path}`;

const COLUMN_POSTERS: string[][] = [
  [
    tmdb('/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg'),
    tmdb('/58QT4cPJ2u2TqWZkterDq9q4yxQ.jpg'),
    tmdb('/qJ2tW6WMUDux911r6m7haRef0WH.jpg'),
    tmdb('/8Vt6mWEReuy4Of61Lnj5Xj704m8.jpg'),
  ],
  [
    tmdb('/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg'),
    tmdb('/74xTEgt7R36Fpooo50r9T25onhq.jpg'),
    tmdb('/lPPeqRIRZg9pjujwOsmnJc1TPmT.jpg'),
    tmdb('/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg'),
  ],
  [
    tmdb('/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg'),
    tmdb('/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg'),
    tmdb('/62HCnUTziyWcpDaBO2i1DX17ljH.jpg'),
    tmdb('/rjkmN1dniUHVYAtwuV3Tji7FsDO.jpg'),
  ],
];

export function SplashScreen() {
  const fade = useRef(new Animated.Value(0)).current;
  const posterOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.timing(posterOffset, {
          toValue: -400,
          duration: 22000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ),
    ]).start();
  }, [fade, posterOffset]);

  return (
    <View style={styles.root}>
      <View style={styles.posterWall} pointerEvents="none">
        {COLUMN_POSTERS.map((col, i) => {
          const dir = i % 2 === 0 ? 1 : -1;
          return (
            <Animated.View
              key={i}
              style={[
                styles.column,
                {
                  transform: [
                    {
                      translateY: posterOffset.interpolate({
                        inputRange: [-400, 0],
                        outputRange: [dir * -180, dir * 180],
                      }),
                    },
                  ],
                },
              ]}>
              {col.concat(col).map((uri, idx) => (
                <Image
                  key={`${uri}-${idx}`}
                  source={{uri}}
                  style={styles.poster}
                  resizeMode="cover"
                />
              ))}
            </Animated.View>
          );
        })}
      </View>

      <LinearGradient
        colors={[
          'rgba(21,17,29,0.75)',
          'rgba(21,17,29,0.95)',
          colors.background,
        ]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.center, {opacity: fade}]}>
        <Logo variant="wordmark" width={280} />
        <Text style={styles.tagline}>Your front row seat awaits</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  posterWall: {
    position: 'absolute',
    top: -80,
    left: -40,
    right: -40,
    bottom: -80,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  column: {
    flex: 1,
    gap: 10,
  },
  poster: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.md,
    letterSpacing: 0.4,
  },
});
