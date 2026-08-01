import React from 'react';
import {
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {colors, radius, spacing} from '../theme/colors';
import {CloseIcon, DownloadIcon, ShieldIcon} from './icons';

export type UpdateType = 'force' | 'optional' | 'maintenance';

export type AppUpdateModalProps = {
  visible: boolean;
  type?: UpdateType;
  latestVersion?: string;
  releaseNotes?: string;
  storeUrl?: string;
  maintenanceMessage?: string;
  onDismiss?: () => void;
};

export function AppUpdateModal({
  visible,
  type = 'optional',
  latestVersion = '1.1.0',
  releaseNotes = 'New features, performance enhancements, and bug fixes for a smoother streaming experience.',
  storeUrl,
  maintenanceMessage,
  onDismiss,
}: AppUpdateModalProps) {
  const isForce = type === 'force';
  const isMaintenance = type === 'maintenance';

  const handleOpenStore = () => {
    const url =
      storeUrl ||
      Platform.select({
        ios: 'https://apps.apple.com/app/playdrama/id123456789',
        android: 'https://play.google.com/store/apps/details?id=com.playdrama',
      });
    if (url) {
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForce && !isMaintenance && onDismiss) {
          onDismiss();
        }
      }}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {!isForce && !isMaintenance && onDismiss ? (
            <Pressable
              onPress={onDismiss}
              style={styles.closeBtn}
              hitSlop={8}>
              <CloseIcon size={18} color={colors.textMuted} />
            </Pressable>
          ) : null}

          <View style={styles.iconCircle}>
            {isMaintenance ? (
              <ShieldIcon size={32} color={colors.brand} />
            ) : (
              <DownloadIcon size={32} color={colors.brand} />
            )}
          </View>

          <Text style={styles.title}>
            {isMaintenance
              ? 'Under Maintenance'
              : isForce
              ? 'Update Required'
              : 'New Update Available!'}
          </Text>

          <Text style={styles.subtitle}>
            {isMaintenance
              ? maintenanceMessage ||
                'Play Drama is currently undergoing scheduled maintenance. We will be back online shortly!'
              : `Version ${latestVersion} is now available.`}
          </Text>

          {!isMaintenance && releaseNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesTitle}>WHAT'S NEW</Text>
              <Text style={styles.notesText}>{releaseNotes}</Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            {!isMaintenance ? (
              <Pressable
                onPress={handleOpenStore}
                style={({pressed}) => [styles.primaryBtn, pressed && styles.pressed]}>
                <DownloadIcon size={18} color={colors.brandText} />
                <Text style={styles.primaryBtnText}>
                  {isForce ? 'Update Now' : 'Update App'}
                </Text>
              </Pressable>
            ) : null}

            {!isForce && !isMaintenance && onDismiss ? (
              <Pressable
                onPress={onDismiss}
                style={({pressed}) => [styles.secondaryBtn, pressed && styles.pressed]}>
                <Text style={styles.secondaryBtnText}>Remind Me Later</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: {width: 0, height: 10},
    elevation: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(155, 89, 182, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(155, 89, 182, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  notesBox: {
    width: '100%',
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
  },
  notesTitle: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  notesText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
  actions: {
    width: '100%',
    gap: spacing.sm,
  },
  primaryBtn: {
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtnText: {
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 42,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.98}],
  },
});
