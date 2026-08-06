import React, {useState} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {PrimaryButton} from '../components/PrimaryButton';
import {CompassIcon, CrownIcon, PlayIcon, StarIcon} from '../components/icons';
import {Logo} from '../components/Logo';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

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

const SLIDES = [
  {
    title: 'Unlimited Streaming',
    body: 'Access thousands of 4K cinematic masterpieces, webseries, and drama at your fingertips.',
    icon: 'play',
  },
  {
    title: 'Watch Anywhere, Anytime',
    body: 'Stream seamlessly on your phone, tablet, or TV with high-definition video and immersive audio.',
    icon: 'compass',
  },
  {
    title: 'Discover Talent & Originals',
    body: 'Explore actor profiles, drama institutes, student showcases, and exclusive original series.',
    icon: 'crown',
  },
];

export function OnboardingScreen({navigation}: Props) {
  const [slideIndex, setSlideIndex] = useState(0);
  const currentSlide = SLIDES[slideIndex];

  const handleContinue = () => {
    if (slideIndex < SLIDES.length - 1) {
      setSlideIndex(prev => prev + 1);
    } else {
      navigation.replace('Auth');
    }
  };

  const handleSkip = () => {
    navigation.replace('Auth');
  };

  return (
    <View style={styles.root}>
      <View style={styles.posterWall} pointerEvents="none">
        {COLUMN_POSTERS.map((col, i) => (
          <View key={i} style={[styles.column, i === 1 && styles.columnOffset]}>
            {col.map(uri => (
              <Image
                key={uri}
                source={{uri}}
                style={styles.poster}
                resizeMode="cover"
              />
            ))}
          </View>
        ))}
      </View>

      <LinearGradient
        colors={[
          'rgba(21,17,29,0.6)',
          'rgba(21,17,29,0.85)',
          colors.background,
        ]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Logo variant="wordmark" width={220} />
        </View>

        <View style={styles.hero}>
          <View style={styles.playCircle}>
            {currentSlide.icon === 'compass' ? (
              <CompassIcon size={26} color={colors.brandText} />
            ) : currentSlide.icon === 'crown' ? (
              <CrownIcon size={26} color={colors.brandText} />
            ) : (
              <PlayIcon size={24} color={colors.brandText} />
            )}
          </View>
          <Text style={styles.heroTitle}>{currentSlide.title}</Text>
          <Text style={styles.heroBody}>{currentSlide.body}</Text>
        </View>

        {/* Slide indicators (Dots) */}
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <Pressable key={i} onPress={() => setSlideIndex(i)} hitSlop={6}>
              <View
                style={[
                  styles.dot,
                  i === slideIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.footer}>
          <PrimaryButton
            label={slideIndex === SLIDES.length - 1 ? 'Get Started' : 'Continue'}
            onPress={handleContinue}
          />
          <Pressable onPress={handleSkip} style={styles.skip} hitSlop={8}>
            <Text style={styles.skipText}>SKIP INTRODUCTION</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background, overflow: 'hidden'},
  posterWall: {
    position: 'absolute',
    top: -60,
    left: -20,
    right: -20,
    bottom: -60,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    opacity: 0.65,
  },
  column: {flex: 1, gap: 10},
  columnOffset: {transform: [{translateY: -60}]},
  poster: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  safe: {flex: 1, paddingHorizontal: spacing.md + 4},
  header: {alignItems: 'center', paddingVertical: spacing.md},
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  playCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.brand,
    shadowOpacity: 0.55,
    shadowRadius: 24,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
    lineHeight: 34,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  heroBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 320,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.brand,
  },
  dotInactive: {
    width: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  footer: {
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  skip: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});
