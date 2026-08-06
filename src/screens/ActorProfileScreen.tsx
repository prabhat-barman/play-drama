import React, {useCallback, useMemo} from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
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
  ShareIcon,
  StarIcon,
  UserIcon,
} from '../components/icons';
import {api, type StudentDetail, type Webseries} from '../lib/api';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import {webseriesToContent} from '../lib/adapters';
import {MovieCard} from '../components/MovieCard';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ActorProfile'>;

type ActorBundle = {
  detail: StudentDetail;
  webseries: Webseries[];
};

export function ActorProfileScreen({navigation, route}: Props) {
  const {token} = useAuth();
  const studentId = route.params.studentId;

  const fetchActorBundle = useCallback(
    async (signal: AbortSignal): Promise<ActorBundle> => {
      if (!token) {
        throw new Error('Not authenticated');
      }
      const [detailRes, seriesRes] = await Promise.allSettled([
        api.students.get({token, id: studentId, signal}),
        api.webseries.list({token, status: 'PUBLISHED', limit: 20, signal}),
      ]);

      if (detailRes.status === 'rejected') {
        throw detailRes.reason;
      }

      const detail = detailRes.value;
      const allSeries = seriesRes.status === 'fulfilled' ? seriesRes.value.data : [];
      // Filter series that might match actor name or student id
      const webseries = allSeries.filter(
        s =>
          s.cast?.some(c => {
            const name = typeof c === 'string' ? c : (c as any)?.name || (c as any)?.fullName;
            return name?.toLowerCase().includes(detail.fullName.toLowerCase());

          }) || s.instituteId === detail.institute?._id,
      );


      return {
        detail,
        webseries: webseries.length ? webseries : allSeries.slice(0, 4),
      };
    },
    [token, studentId],
  );

  const {data, loading, error, reload} = useApi(fetchActorBundle, [token, studentId]);

  const detail = data?.detail;
  const webseries = data?.webseries ?? [];

  const initials = useMemo(() => {
    if (!detail?.fullName) return '?';
    return detail.fullName
      .split(' ')
      .filter(Boolean)
      .map(s => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [detail?.fullName]);

  if (loading && !detail) {
    return (
      <View style={styles.centerRoot}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (error || !detail) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
            <ChevronLeftIcon />
          </Pressable>
          <Text style={styles.headerTitle}>Actor Profile</Text>
        </View>
        <View style={styles.centerRoot}>
          <Text style={styles.errorText}>
            {error || 'Actor profile not found'}
          </Text>
          <Pressable onPress={reload} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const openSocialLink = (url: string) => {
    if (!url) return;
    const formatted = url.startsWith('http') ? url : `https://${url}`;
    Linking.openURL(formatted).catch(() => null);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <ChevronLeftIcon />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {detail.fullName}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            {detail.profileImage ? (
              <Image source={{uri: detail.profileImage}} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
          </View>

          <Text style={styles.actorName}>{detail.fullName}</Text>
          {detail.studentCode ? (
            <Text style={styles.studentCode}>Code: {detail.studentCode}</Text>
          ) : null}

          {/* Academic Info Chips */}
          <View style={styles.chipRow}>
            {detail.course ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{detail.course}</Text>
              </View>
            ) : null}
            {detail.department ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>{detail.department}</Text>
              </View>
            ) : null}
            {detail.batch ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Batch {detail.batch}</Text>
              </View>
            ) : null}
            {detail.semester ? (
              <View style={styles.chip}>
                <Text style={styles.chipText}>Sem {detail.semester}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Institute Banner (Clickable) */}
        {detail.institute ? (
          <Pressable
            onPress={() =>
              navigation.navigate('InstituteProfile', {
                instituteId: detail.institute?._id,
                studentId: detail._id,
              })
            }
            style={({pressed}) => [styles.instituteCard, pressed && styles.pressed]}>
            <View style={styles.instituteLeft}>
              {detail.institute.logo ? (
                <Image
                  source={{uri: detail.institute.logo}}
                  style={styles.instituteLogo}
                />
              ) : (
                <View style={styles.instituteLogoFallback}>
                  <UserIcon size={18} color={colors.brand} />
                </View>
              )}
              <View style={{flex: 1}}>
                <Text style={styles.instituteSub}>STUDENT AT</Text>
                <Text style={styles.instituteName} numberOfLines={1}>
                  {detail.institute.name || 'Partner Institute'}
                </Text>
              </View>
            </View>
            <ChevronRightIcon size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {/* Bio */}
        {detail.bio ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>BIO / OVERVIEW</Text>
            <View style={styles.sectionBody}>
              <Text style={styles.bioText}>{detail.bio}</Text>
            </View>
          </View>
        ) : null}

        {/* Skills */}
        {detail.skills && detail.skills.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS & TALENTS</Text>
            <View style={styles.skillsRow}>
              {detail.skills.map((skill, idx) => (
                <View key={idx} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Achievements */}
        {detail.achievements && detail.achievements.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
            <View style={styles.sectionBody}>
              {detail.achievements.map((ach, idx) => (
                <View key={idx} style={styles.achievementItem}>
                  <StarIcon size={18} color={colors.brand} />
                  <View style={{flex: 1, marginLeft: 10}}>
                    <Text style={styles.achievementTitle}>
                      {ach.title || 'Achievement'}
                    </Text>
                    {ach.description ? (
                      <Text style={styles.achievementDesc}>
                        {ach.description}
                      </Text>
                    ) : null}
                    {ach.date ? (
                      <Text style={styles.achievementDate}>{ach.date}</Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Social Links */}
        {detail.socialLinks && detail.socialLinks.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SOCIAL & PORTFOLIO LINKS</Text>
            <View style={styles.socialRow}>
              {detail.socialLinks.map((link, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => openSocialLink(link.url)}
                  style={({pressed}) => [styles.socialBtn, pressed && styles.pressed]}>
                  <ShareIcon size={16} color={colors.brand} />
                  <Text style={styles.socialBtnText}>
                    {link.platform || 'Link'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}


        {/* Dramas / Web Series */}
        {webseries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>FEATURED IN SERIES</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.seriesRow}>
                {webseries.map(s => {
                  const content = webseriesToContent(s);
                  return (
                    <MovieCard
                      key={s._id}
                      movie={content}
                      width={120}
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
  profileCard: {
    alignItems: 'center',
    backgroundColor: colors.glassBg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  avatarWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: colors.brand,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  avatarImg: {width: '100%', height: '100%'},
  avatarFallback: {
    flex: 1,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
  },
  actorName: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  studentCode: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(155,89,182,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(155,89,182,0.3)',
  },
  chipText: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '700',
  },
  instituteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.glassBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  instituteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  instituteLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  instituteLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instituteSub: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  instituteName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    marginLeft: 4,
  },
  sectionBody: {
    backgroundColor: colors.glassBg,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  bioText: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  skillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillPill: {
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  skillPillText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 6,
  },
  achievementTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  achievementDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  achievementDate: {
    color: colors.brand,
    fontSize: 11,
    marginTop: 2,
  },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.glassBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  socialBtnText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
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
