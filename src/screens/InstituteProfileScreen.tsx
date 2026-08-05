import React, {useCallback} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
} from '../components/icons';
import {api, type Student, type Webseries} from '../lib/api';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import {webseriesToContent} from '../lib/adapters';
import {MovieCard} from '../components/MovieCard';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'InstituteProfile'>;

type InstituteBundle = {
  name: string;
  logo?: string;
  description: string;
  students: Student[];
  series: Webseries[];
};

export function InstituteProfileScreen({navigation, route}: Props) {
  const {token} = useAuth();
  const {studentId} = route.params || {};

  const fetchInstituteData = useCallback(
    async (signal: AbortSignal): Promise<InstituteBundle> => {
      if (!token) {
        throw new Error('Not authenticated');
      }

      let instName = 'Drama & Film Institute';
      let instLogo: string | undefined;

      if (studentId) {
        try {
          const detail = await api.students.get({token, id: studentId, signal});
          if (detail.institute?.name) instName = detail.institute.name;
          if (detail.institute?.logo) instLogo = detail.institute.logo;
        } catch {
          // ignore
        }
      }

      const [studentsRes, seriesRes] = await Promise.allSettled([
        api.students.list({token, limit: 12, signal}),
        api.webseries.list({token, status: 'PUBLISHED', limit: 10, signal}),
      ]);

      const students =
        studentsRes.status === 'fulfilled' ? studentsRes.value.data : [];
      const series =
        seriesRes.status === 'fulfilled' ? seriesRes.value.data : [];

      return {
        name: instName,
        logo: instLogo,
        description:
          'Premier performing arts and film production institute training the next generation of actors, directors, and creators.',
        students,
        series,
      };
    },
    [token, studentId],
  );

  const {data, loading, error, reload} = useApi(fetchInstituteData, [
    token,
    studentId,
  ]);

  if (loading && !data) {
    return (
      <View style={styles.centerRoot}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeftIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Institute Profile</Text>
        </View>
        <View style={styles.centerRoot}>
          <Text style={styles.errorText}>
            {error || 'Could not load institute profile'}
          </Text>
          <Pressable onPress={reload} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ChevronLeftIcon />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {data.name}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Institute Banner Card */}
        <View style={styles.heroCard}>
          <View style={styles.logoWrap}>
            {data.logo ? (
              <Image source={{uri: data.logo}} style={styles.logoImg} />
            ) : (
              <View style={styles.logoFallback}>
                <UserIcon size={32} color={colors.brand} />
              </View>
            )}
          </View>

          <Text style={styles.heroTitle}>{data.name}</Text>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>VERIFIED PARTNER</Text>
          </View>
          <Text style={styles.heroDesc}>{data.description}</Text>
        </View>

        {/* Student / Actor Talent Directory */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ENROLLED TALENT & ACTORS</Text>
            <Text style={styles.countText}>{data.students.length} Talent</Text>
          </View>

          <View style={styles.studentGrid}>
            {data.students.map(s => (
              <Pressable
                key={s._id}
                onPress={() =>
                  navigation.navigate('ActorProfile', {studentId: s._id})
                }
                style={({pressed}) => [styles.studentCard, pressed && styles.pressed]}>
                {s.profileImage ? (
                  <Image source={{uri: s.profileImage}} style={styles.studentAvatar} />
                ) : (
                  <View style={styles.studentAvatarFallback}>
                    <Text style={styles.studentInitials}>
                      {s.fullName
                        .split(' ')
                        .filter(Boolean)
                        .map(n => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || '?'}
                    </Text>
                  </View>
                )}
                <Text style={styles.studentName} numberOfLines={1}>
                  {s.fullName}
                </Text>
                <Text style={styles.studentSub} numberOfLines={1}>
                  {s.course || s.department || 'Actor'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Web Series Produced */}
        {data.series.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INSTITUTE PRODUCTIONS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.seriesRow}>
                {data.series.map(s => {
                  const content = webseriesToContent(s);
                  return (
                    <MovieCard
                      key={s._id}
                      movie={content}
                      width={130}
                      onPress={() =>
                        navigation.navigate('MovieDetails', {id: s._id})
                      }
                    />
                  );
                })}
              </View>
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  centerRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  iconBtn: {padding: 6},
  headerTitle: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + 40,
    paddingTop: spacing.md,
  },
  heroCard: {
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.lg,
  },
  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  logoImg: {width: '100%', height: '100%'},
  logoFallback: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(155,89,182,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.4)',
    marginTop: 6,
  },
  badgeText: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroDesc: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  countText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  studentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  studentCard: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
  },
  studentAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  studentInitials: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  studentSub: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  seriesRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pressed: {opacity: 0.75},
  errorText: {color: colors.textMuted, fontSize: 14, marginBottom: 12},
  retryBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  retryText: {color: colors.brandText, fontWeight: '700'},
});
