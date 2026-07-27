import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {
  ChevronRightIcon,
  HelpIcon,
  KeyIcon,
  LogOutIcon,
  MailIcon,
  ShieldIcon,
  SlidersIcon,
  UserIcon,
  WifiIcon,
} from '../components/icons';
import {useAuth} from '../context/AuthContext';
import {api, ApiError, mePayloadToPublicUser} from '../lib/api';
import type {StudentTabParamList} from '../navigation/StudentTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<StudentTabParamList, 'Profile'>,
  NativeStackScreenProps<RootStackParamList>
>;

// Dedicated profile screen for STUDENT-role sign-ins. Intentionally
// simpler than the MOBILE_USER ProfileScreen: no subscription badge, no
// watchlist promise, no address / edit modal — students only see the
// three fields the /auth/me → studentProfile endpoint gives us
// (fullName, email, phone), plus the settings + logout options shared
// with the MOBILE_USER experience.
export function StudentProfileScreen({navigation}: Props) {
  const {user, token, signOut} = useAuth();
  const [wifiOnly, setWifiOnly] = useState(true);
  const [phone, setPhone] = useState<string | null>(user?.phone ?? null);
  const [displayName, setDisplayName] = useState<string>(user?.name ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (cancelledRef?: {current: boolean}) => {
      if (!token) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const me = await api.auth.me({token});
        if (cancelledRef?.current) {
          return;
        }
        // Reuse the auth adapter so the profile shape is identical to the
        // one AuthContext will refresh into on the next cold start.
        const fresh = mePayloadToPublicUser(me);
        setDisplayName(fresh.name);
        setPhone(fresh.phone ?? null);
      } catch (err) {
        if (cancelledRef?.current) {
          return;
        }
        setError(
          err instanceof ApiError ? err.message : 'Could not load profile',
        );
      } finally {
        if (!cancelledRef?.current) {
          setLoading(false);
        }
      }
    },
    [token],
  );

  useEffect(() => {
    const cancelled = {current: false};
    void load(cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [load]);

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

  const logout = useCallback(() => {
    Alert.alert(
      'Log out?',
      'You will need to sign in again to access your student profile.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: () => {
            void signOut();
          },
        },
      ],
      {cancelable: true},
    );
  }, [signOut]);

  const openChangePassword = () => navigation.navigate('ChangePassword');

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
          </View>
          <Text style={styles.userName}>{displayName || '—'}</Text>
          <View style={styles.roleBadge}>
            <UserIcon size={12} color={colors.brand} />
            <Text style={styles.roleBadgeText}>STUDENT</Text>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => load()}
              style={styles.retryBtn}
              hitSlop={6}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !displayName ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.brand} size="small" />
          </View>
        ) : null}

        <Section title="Account">
          <Row
            icon={<UserIcon size={18} color={colors.textPrimary} />}
            label="Full Name"
            hint={displayName || '—'}
          />
          <Row
            icon={<MailIcon size={18} color={colors.textPrimary} />}
            label="Email"
            hint={user?.email ?? '—'}
          />
          <Row
            icon={<MailIcon size={18} color={colors.textPrimary} />}
            label="Phone"
            hint={phone || 'Not provided'}
          />
          <Row
            icon={<KeyIcon size={18} color={colors.textPrimary} />}
            label="Change Password"
            onPress={openChangePassword}
          />
        </Section>

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
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.row, pressed && styles.pressed]}>
      {icon ? (
        <View style={styles.rowIcon}>{icon}</View>
      ) : (
        <View style={styles.rowIcon} />
      )}
      <View style={styles.rowLabelWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? (
          <Text style={styles.rowHint} numberOfLines={1}>
            {hint}
          </Text>
        ) : null}
      </View>
      <ChevronRightIcon size={16} color={colors.textMuted} />
    </Pressable>
  );
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
      {icon ? (
        <View style={styles.rowIcon}>{icon}</View>
      ) : (
        <View style={styles.rowIcon} />
      )}
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
  userName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(155,89,182,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.4)',
    marginTop: 6,
  },
  roleBadgeText: {
    color: colors.brand,
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
