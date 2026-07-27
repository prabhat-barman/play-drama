import React from 'react';
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {colors, spacing} from '../theme/colors';
import {Logo} from './Logo';

type Props = {
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthLayout({children, footer}: Props) {
  return (
    <View style={styles.root}>
      <ImageBackground
        source={require('../assets/images/cinematic-bg.jpg')}
        style={styles.bgImage}
        imageStyle={styles.bgImageInner}>
        <LinearGradient
          colors={[
            'rgba(21,17,29,0)',
            'rgba(21,17,29,0.6)',
            colors.background,
          ]}
          locations={[0, 0.55, 0.85]}
          style={StyleSheet.absoluteFill}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.logoWrap}>
              <Logo variant="wordmark" width={240} />
              <Text style={styles.tagline}>Your front row seat awaits</Text>
            </View>

            <View style={styles.card}>{children}</View>

            {footer}

            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>HELP CENTER</Text>
              <Text style={styles.footerLink}>PRIVACY</Text>
              <Text style={styles.footerLink}>COOKIE POLICY</Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {flex: 1},
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgImageInner: {
    opacity: 0.4,
    resizeMode: 'cover',
  },
  safe: {flex: 1},
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.md + 4,
    paddingTop: spacing.xxl + 24,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  tagline: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
    opacity: 0.9,
  },
  card: {
    width: '100%',
    maxWidth: 448,
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.lg + 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 50,
    shadowOffset: {width: 0, height: 25},
    elevation: 12,
  },
  footerLinks: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xxl,
    opacity: 0.6,
  },
  footerLink: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    lineHeight: 16,
  },
});
