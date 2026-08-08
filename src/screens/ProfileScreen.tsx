import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {
  ChevronRightIcon,
  CrownIcon,
  EditIcon,
  HelpIcon,
  KeyIcon,
  LogOutIcon,
  MailIcon,
  PhoneIcon,
  ShieldIcon,
  SlidersIcon,
  UserIcon,
  WifiIcon,
} from '../components/icons';
import {useAuth} from '../context/AuthContext';
import {useAlert} from '../context/AlertContext';
import {api, ApiError, type MobileUserProfile} from '../lib/api';
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({navigation}: Props) {
  const {user, token, signOut, updateProfile} = useAuth();
  const {showAlert} = useAlert();
  const [wifiOnly, setWifiOnly] = useState(true);
  const [profile, setProfile] = useState<MobileUserProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const loadProfile = useCallback(
    async (signal?: AbortSignal) => {
      if (!token) {
        return;
      }
      setLoadingProfile(true);
      setProfileError(null);
      try {
        const p = await api.profile.get({token, signal});
        if (signal?.aborted) {
          return;
        }
        setProfile(p);
      } catch (err) {
        if (signal?.aborted) {
          return;
        }
        setProfileError(
          err instanceof ApiError ? err.message : 'Could not load profile',
        );
      } finally {
        if (!signal?.aborted) {
          setLoadingProfile(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadProfile(controller.signal);
    return () => controller.abort();
  }, [loadProfile]);

  const displayName = profile?.fullName ?? user?.name ?? '—';
  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .map(s => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join('')
        .toUpperCase() || '?',
    [displayName],
  );
  const displayEmail = profile?.email ?? user?.email ?? '—';
  const displayPhone = profile?.phone ?? '—';
  const subscriptionStatus = profile?.subscriptionStatus ?? 'none';
  const isAdmin = user?.role === 'admin';

  const logout = useCallback(() => {
    showAlert({
      title: 'Log out?',
      message: 'You will need to sign in again to access your watchlist, downloads and preferences.',
      type: 'logout',
      buttons: [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
    });
  }, [signOut, showAlert]);

  const openChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const onSaveEdit = async (input: {fullName?: string; phone?: string}) => {
    try {
      const updated = await updateProfile(input);
      setProfile(updated);
      setEditing(false);
    } catch (err) {
      Alert.alert(
        'Update failed',
        err instanceof ApiError ? err.message : 'Please try again.',
      );
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.brand}>PLAY DRAMA</Text>
        </View>

        <View style={styles.profileHead}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.avatarEdit}
              hitSlop={8}>
              <EditIcon size={12} color={colors.brandText} />
            </Pressable>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <View style={styles.premiumBadge}>
            <CrownIcon size={12} color="#ffb400" />
            <Text style={styles.premiumBadgeText}>
              {isAdmin
                ? 'ADMIN'
                : subscriptionStatus === 'active'
                  ? 'PREMIUM MEMBER'
                  : 'FREE MEMBER'}
            </Text>
          </View>
        </View>

        {profileError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{profileError}</Text>
            <Pressable
              onPress={() => loadProfile()}
              style={styles.retryBtn}
              hitSlop={6}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loadingProfile && !profile ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.brand} size="small" />
          </View>
        ) : null}

        <Section title="App Settings">
          <Row
            icon={<SlidersIcon size={18} color={colors.textPrimary} />}
            label="Video Quality"
            hint="Auto"
          />
          <SwitchRow
            icon={<WifiIcon size={18} color={colors.textPrimary} />}
            label="Download over Wi-Fi only"
            value={wifiOnly}
            onValueChange={setWifiOnly}
          />
        </Section>

        <Section title="Account">
          <Row
            icon={<EditIcon size={18} color={colors.textPrimary} />}
            label="Edit Profile"
            hint="Update your personal details"
            onPress={() => navigation.navigate('EditProfile')}
          />
          <Row
            icon={<UserIcon size={18} color={colors.textPrimary} />}
            label="Full Name"
            hint={displayName}
          />
          <Row
            icon={<MailIcon size={18} color={colors.textPrimary} />}
            label="Email"
            hint={displayEmail}
          />
          <Row
            icon={<PhoneIcon size={18} color={colors.textPrimary} />}
            label="Phone"
            hint={displayPhone}
          />

          <Row
            icon={<KeyIcon size={18} color={colors.textPrimary} />}
            label="Change Password"
            onPress={openChangePassword}
          />
        </Section>

        <Section title="Support & Legal">
          <Row
            icon={<ShieldIcon size={18} color={colors.textPrimary} />}
            label="Privacy Policy"
          />
          <Row
            icon={<HelpIcon size={18} color={colors.textPrimary} />}
            label="Help Center"
          />
        </Section>

        <Pressable
          onPress={logout}
          style={({pressed}) => [styles.logout, pressed && styles.pressed]}>
          <LogOutIcon size={16} color={colors.brand} />
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>

        <Text style={styles.version}>Play Drama v0.1.0</Text>
      </ScrollView>

      <EditProfileModal
        visible={editing}
        initialFullName={profile?.fullName ?? user?.name ?? ''}
        initialPhone={profile?.phone ?? ''}
        onClose={() => setEditing(false)}
        onSave={onSaveEdit}
      />
    </SafeAreaView>
  );
}

type EditProps = {
  visible: boolean;
  initialFullName: string;
  initialPhone: string;
  onClose: () => void;
  onSave: (input: {fullName?: string; phone?: string}) => Promise<void>;
};

function EditProfileModal({
  visible,
  initialFullName,
  initialPhone,
  onClose,
  onSave,
}: EditProps) {
  const [fullName, setFullName] = useState(initialFullName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setFullName(initialFullName);
      setPhone(initialPhone);
    }
  }, [visible, initialFullName, initialPhone]);

  const submit = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const patch: {fullName?: string; phone?: string} = {};
    if (trimmedName && trimmedName !== initialFullName) {
      patch.fullName = trimmedName;
    }
    if (trimmedPhone !== initialPhone) {
      patch.phone = trimmedPhone;
    }
    if (!Object.keys(patch).length) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await onSave(patch);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <View style={editStyles.backdrop}>
        <View style={editStyles.sheet}>
          <Text style={editStyles.title}>Edit profile</Text>

          <Text style={editStyles.label}>Full name</Text>
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Your name"
            placeholderTextColor={colors.placeholder}
            style={editStyles.input}
            autoCapitalize="words"
          />

          <Text style={editStyles.label}>Phone</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+919876543210"
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
            style={editStyles.input}
          />

          <View style={editStyles.row}>
            <Pressable
              onPress={onClose}
              disabled={saving}
              style={({pressed}) => [
                editStyles.btnGhost,
                pressed && {opacity: 0.85},
              ]}>
              <Text style={editStyles.btnGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={saving}
              style={({pressed}) => [
                editStyles.btn,
                pressed && {opacity: 0.9},
                saving && {opacity: 0.7},
              ]}>
              {saving ? (
                <ActivityIndicator color={colors.brandText} size="small" />
              ) : (
                <Text style={editStyles.btnText}>Save</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

type RowProps = {
  icon?: React.ReactNode;
  label: string;
  hint?: string;
  onPress?: () => void;
};

function Row({icon, label, hint, onPress}: RowProps) {
  const content = (
    <>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : <View style={styles.rowIcon} />}
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? (
          <Text style={styles.rowHint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      {onPress ? <ChevronRightIcon size={16} color={colors.textMuted} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({pressed}) => [styles.row, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.row}>{content}</View>;
}

function SwitchRow({
  icon,
  label,
  value,
  onValueChange,
}: {
  icon?: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      {icon ? <View style={styles.rowIcon}>{icon}</View> : <View style={styles.rowIcon} />}
      <Text style={styles.rowLabelInline}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{true: colors.brand, false: '#333'}}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  scroll: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 40,
  },
  header: {alignItems: 'center', paddingVertical: spacing.sm},
  brand: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  profileHead: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: colors.brand,
    marginBottom: 10,
  },
  avatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '800',
  },
  avatarEdit: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,180,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,0,0.4)',
    marginTop: 6,
  },
  premiumBadgeText: {
    color: '#ffb400',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.4)',
    backgroundColor: 'rgba(255,180,171,0.08)',
    marginBottom: spacing.md,
  },
  errorText: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 12,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    height: 30,
    borderRadius: radius.sm,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {color: colors.brandText, fontSize: 11, fontWeight: '700'},
  loadingRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  section: {marginBottom: spacing.md},
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  pressed: {opacity: 0.75},
  rowIcon: {width: 24, alignItems: 'center'},
  rowLabelWrap: {flex: 1, marginLeft: spacing.sm + 2},
  rowLabel: {color: colors.textPrimary, fontSize: 14, fontWeight: '500'},
  rowLabelInline: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    marginLeft: spacing.sm + 2,
    fontWeight: '500',
  },
  rowHint: {color: colors.textMuted, fontSize: 12, marginTop: 2},
  logout: {
    height: 50,
    borderRadius: radius.md,
    borderColor: 'rgba(255,180,171,0.5)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  logoutText: {color: colors.brand, fontSize: 15, fontWeight: '700'},
  version: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: spacing.md,
    opacity: 0.6,
  },
});

const editStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.glassBorder,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: spacing.md,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  input: {
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    color: colors.textPrimary,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.lg,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: colors.brandText,
    fontSize: 15,
    fontWeight: '700',
  },
  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhostText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
