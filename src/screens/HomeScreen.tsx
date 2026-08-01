import React, {useCallback, useMemo, useState} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {audioStories, podcasts} from '../data/placeholders';
import {colors, radius, spacing} from '../theme/colors';
import {
  BellIcon,
  CastIcon,
  HeadphonesIcon,
  MicIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
} from '../components/icons';
import {MovieRow} from '../components/MovieRow';
import {SectionHeader} from '../components/SectionHeader';
import {Skeleton, MovieRowSkeleton} from '../components/Skeleton';
import {api} from '../lib/api';
import {webseriesToContent} from '../lib/adapters';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import {useNotificationsBadge} from '../context/NotificationsContext';
import type {ContentItem} from '../types/movie';
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Home'>,
  NativeStackScreenProps<RootStackParamList>
>;

const HERO_TABS = ['Movies', 'TV Shows', 'Categories'] as const;
type HeroTab = (typeof HERO_TABS)[number];

type HomePayload = {
  trending: ContentItem[];
  newReleases: ContentItem[];
  topRated: ContentItem[];
  recommended: ContentItem[];
  recentlyAdded: ContentItem[];
  popularDramas: ContentItem[];
  latest: ContentItem[];
  action: ContentItem[];
  drama: ContentItem[];
};

export function HomeScreen({navigation}: Props) {
  const [activeTab, setActiveTab] = useState<HeroTab>('Movies');
  const {token} = useAuth();
  const {unreadCount} = useNotificationsBadge();

  const fetchHome = useCallback(
    async (signal: AbortSignal): Promise<HomePayload> => {
      if (!token) {
        return {
          trending: [],
          newReleases: [],
          topRated: [],
          recommended: [],
          recentlyAdded: [],
          popularDramas: [],
          latest: [],
          action: [],
          drama: [],
        };
      }
      // Fetch /home API feeds in parallel along with genre fallbacks
      const [
        homeFeedRes,
        trendingRes,
        newReleasesRes,
        popularDramasRes,
        latestRes,
        actionRes,
        dramaRes,
      ] = await Promise.allSettled([
        api.home.get({token, signal}),
        api.home.trending({token, signal}),
        api.home.newReleases({token, signal}),
        api.home.popularDramas({token, signal}),
        api.webseries.list({token, status: 'PUBLISHED', limit: 20, signal}),
        api.webseries.list({
          token,
          status: 'PUBLISHED',
          genre: 'action',
          limit: 15,
          signal,
        }),
        api.webseries.list({
          token,
          status: 'PUBLISHED',
          genre: 'drama',
          limit: 15,
          signal,
        }),
      ]);

      const unwrapSeries = (r: PromiseSettledResult<any>): ContentItem[] =>
        r.status === 'fulfilled' && Array.isArray(r.value)
          ? r.value.map(webseriesToContent)
          : r.status === 'fulfilled' && Array.isArray(r.value?.data)
          ? r.value.data.map(webseriesToContent)
          : [];

      const unwrapList = (r: PromiseSettledResult<any>): ContentItem[] =>
        r.status === 'fulfilled' && r.value?.data
          ? (Array.isArray(r.value.data) ? r.value.data : r.value.data.data ?? []).map(webseriesToContent)
          : [];

      const trendingFromApi = unwrapSeries(trendingRes);
      const newReleasesFromApi = unwrapSeries(newReleasesRes);
      const popularDramasFromApi = unwrapSeries(popularDramasRes);
      const latestItems = unwrapList(latestRes);

      const rawHome = homeFeedRes.status === 'fulfilled' ? homeFeedRes.value : null;
      const homeAggregated: any = (rawHome as any)?.data || rawHome || {};

      const bannerItems = Array.isArray(homeAggregated.banner)
        ? homeAggregated.banner.map(webseriesToContent)
        : [];
      const trendingHome = Array.isArray(homeAggregated.trending)
        ? homeAggregated.trending.map(webseriesToContent)
        : [];
      const newReleasesHome = Array.isArray(homeAggregated.newReleases)
        ? homeAggregated.newReleases.map(webseriesToContent)
        : [];
      const topRatedHome = Array.isArray(homeAggregated.topRated)
        ? homeAggregated.topRated.map(webseriesToContent)
        : [];
      const recommendedHome = Array.isArray(homeAggregated.recommended)
        ? homeAggregated.recommended.map(webseriesToContent)
        : [];
      const recentlyAddedHome = Array.isArray(homeAggregated.recentlyAdded)
        ? homeAggregated.recentlyAdded.map(webseriesToContent)
        : [];
      const popularDramasHome = Array.isArray(homeAggregated.popularDramas)
        ? homeAggregated.popularDramas.map(webseriesToContent)
        : [];

      const trendingFinal =
        trendingFromApi.length > 0
          ? trendingFromApi
          : trendingHome.length > 0
          ? trendingHome
          : bannerItems.length > 0
          ? bannerItems
          : latestItems.slice(0, 10);

      const newReleasesFinal =
        newReleasesFromApi.length > 0
          ? newReleasesFromApi
          : newReleasesHome.length > 0
          ? newReleasesHome
          : latestItems.filter(w => w.isNew);

      const popularDramasFinal =
        popularDramasFromApi.length > 0
          ? popularDramasFromApi
          : popularDramasHome.length > 0
          ? popularDramasHome
          : unwrapList(dramaRes);

      return {
        trending: trendingFinal,
        newReleases: newReleasesFinal,
        topRated: topRatedHome,
        recommended: recommendedHome,
        recentlyAdded: recentlyAddedHome,
        popularDramas: popularDramasFinal,
        latest: latestItems,
        action: unwrapList(actionRes),
        drama: unwrapList(dramaRes),
      };
    },
    [token],
  );

  const {data, loading, error, reload} = useApi(fetchHome, [token]);

  const featured = data?.trending[0] ?? data?.latest[0];
  const trending = useMemo(
    () => (data?.trending.length ? data.trending : data?.latest.slice(0, 10) ?? []),
    [data],
  );
  const newReleases = useMemo(
    () =>
      data?.newReleases.length
        ? data.newReleases
        : data?.latest.filter(w => w.isNew) ?? [],
    [data],
  );

  const openMovie = (id: string) =>
    navigation.navigate('MovieDetails', {id});
  const playMovie = (id: string) => navigation.navigate('Player', {id});

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        <HeroSection
          featured={featured}
          loading={loading}
          error={error}
          onReload={reload}
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          onPlay={playMovie}
          onOpen={openMovie}
          onOpenNotifications={() => navigation.navigate('Notifications')}
          unreadCount={unreadCount}
        />

        {loading && !data ? (
          <>
            <MovieRowSkeleton titleWidth={130} />
            <MovieRowSkeleton titleWidth={160} />
          </>
        ) : null}

        {trending.length ? (
          <MovieRow
            title="Trending Now"
            movies={trending}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {newReleases.length ? (
          <MovieRow
            title="New Releases"
            movies={newReleases}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {data?.topRated?.length ? (
          <MovieRow
            title="Top Rated"
            movies={data.topRated}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {data?.recommended?.length ? (
          <MovieRow
            title="Recommended For You"
            movies={data.recommended}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {data?.recentlyAdded?.length ? (
          <MovieRow
            title="Recently Added"
            movies={data.recentlyAdded}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {data?.action.length ? (
          <MovieRow
            title="Action & Adventure"
            movies={data.action}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {data?.drama.length ? (
          <MovieRow
            title="Drama"
            movies={data.drama}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {podcasts.length ? (
          <>
            <SectionHeader title="Featured Podcasts" action="See All" />
            <FlatList
              horizontal
              data={podcasts}
              keyExtractor={(p, idx) => (p.id ? `${p.id}-${idx}` : `podcast-${idx}`)}
              contentContainerStyle={styles.hlist}
              ItemSeparatorComponent={() => (
                <View style={{width: spacing.sm + 2}} />
              )}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <Pressable style={styles.podcastCard}>
                  <Image
                    source={{uri: item.cover}}
                    style={styles.podcastImg}
                    resizeMode="cover"
                  />
                  <View style={styles.podcastBody}>
                    <View style={styles.podcastRow}>
                      <MicIcon size={12} color={colors.textAccent} />
                      <Text style={styles.podcastCat}>{item.category}</Text>
                    </View>
                    <Text style={styles.podcastTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.podcastAuthor} numberOfLines={1}>
                      {item.author}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </>
        ) : null}

        {audioStories.length ? (
          <View style={styles.audioSection}>
            <SectionHeader title="Audio Stories" action="Explore" />
            {audioStories.map(a => (
              <Pressable key={a.id} style={styles.audioCard}>
                <Image source={{uri: a.cover}} style={styles.audioImg} />
                <View style={styles.audioBody}>
                  <View style={styles.audioTop}>
                    <HeadphonesIcon size={14} color={colors.textAccent} />
                    <Text style={styles.audioBadge}>
                      {a.durationMin} MIN
                    </Text>
                  </View>
                  <Text style={styles.audioTitle}>{a.title}</Text>
                  <Text style={styles.audioDesc} numberOfLines={2}>
                    {a.description}
                  </Text>
                </View>
                <Pressable style={styles.audioPlay} hitSlop={8}>
                  <PlayIcon size={16} color={colors.background} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

type HeroProps = {
  featured?: ContentItem;
  loading: boolean;
  error: string | null;
  onReload: () => void;
  activeTab: HeroTab;
  onChangeTab: (t: HeroTab) => void;
  onPlay: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenNotifications: () => void;
  unreadCount: number;
};

function HeroSection({
  featured,
  loading,
  error,
  onReload,
  activeTab,
  onChangeTab,
  onPlay,
  onOpen,
  onOpenNotifications,
  unreadCount,
}: HeroProps) {
  return (
    <View style={styles.hero}>
      {featured ? (
        <Image
          source={{uri: featured.backdrop}}
          style={styles.heroImg}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.heroImg, styles.heroSkeleton]} />
      )}
      <LinearGradient
        colors={[
          'rgba(10,10,10,0.35)',
          'rgba(10,10,10,0)',
          'rgba(10,10,10,0.9)',
          colors.background,
        ]}
        locations={[0, 0.35, 0.85, 1]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top']} style={styles.heroTopBar}>
        <View style={styles.heroHeader}>
          <Text style={styles.brand}>PLAY DRAMA</Text>
          <View style={styles.headerActions}>
            <Pressable hitSlop={8}>
              <CastIcon />
            </Pressable>
            <Pressable hitSlop={8} onPress={onOpenNotifications}>
              <BellIcon />
              {unreadCount > 0 ? (
                <View style={styles.bellBadge}>
                  <Text style={styles.bellBadgeText} numberOfLines={1}>
                    {unreadCount > 99 ? '99+' : String(unreadCount)}
                  </Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        </View>

        <View style={styles.chipsRow}>
          {HERO_TABS.map(c => {
            const active = c === activeTab;
            return (
              <Pressable
                key={c}
                style={styles.chip}
                hitSlop={4}
                onPress={() => onChangeTab(c)}>
                <Text
                  style={[styles.chipText, active && styles.chipTextActive]}>
                  {c}
                </Text>
                {active ? <View style={styles.chipUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chipsDivider} />
      </SafeAreaView>

      <View style={styles.heroBody}>
        {loading && !featured ? (
          <View style={{gap: 10, paddingBottom: spacing.sm}}>
            <Skeleton width={110} height={20} borderRadius={4} />
            <Skeleton width="75%" height={32} borderRadius={6} />
            <Skeleton width="50%" height={14} borderRadius={4} />
            <Skeleton width="100%" height={40} borderRadius={6} style={{marginTop: 6}} />
          </View>
        ) : error && !featured ? (
          <View style={styles.heroError}>
            <Text style={styles.errorText} numberOfLines={2}>
              {error}
            </Text>
            <Pressable onPress={onReload} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : featured ? (
          <>
            {featured.isNew ? (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW RELEASE</Text>
              </View>
            ) : null}
            <Text style={styles.heroTitle}>{featured.title}</Text>
            <View style={styles.metaRow}>
              <StarIcon />
              <Text style={styles.metaText}>
                {featured.year ?? '—'}
              </Text>
              {featured.genres[0] ? (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.metaText}>{featured.genres[0]}</Text>
                </>
              ) : null}
              {featured.totalEpisodes ? (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.metaText}>
                    {featured.totalEpisodes} Episodes
                  </Text>
                </>
              ) : null}
              {featured.maturity ? (
                <>
                  <View style={styles.dot} />
                  <Text style={styles.metaText}>{featured.maturity}</Text>
                </>
              ) : null}
            </View>
            <Text style={styles.heroTagline} numberOfLines={2}>
              {featured.synopsis}
            </Text>

            <View style={styles.heroActions}>
              <Pressable
                onPress={() => onPlay(featured.id)}
                style={({pressed}) => [
                  styles.playBtn,
                  pressed && styles.pressed,
                ]}>
                <PlayIcon size={16} color={colors.brandText} />
                <Text style={styles.playText}>Play</Text>
              </Pressable>
              <Pressable
                onPress={() => onOpen(featured.id)}
                style={({pressed}) => [
                  styles.listBtn,
                  pressed && styles.pressed,
                ]}>
                <PlusIcon size={16} />
                <Text style={styles.listText}>Details</Text>
              </Pressable>
            </View>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  scroll: {paddingBottom: spacing.xxl + 40},
  hero: {
    height: 560,
    width: '100%',
    justifyContent: 'flex-end',
  },
  heroImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroSkeleton: {
    backgroundColor: colors.surface,
  },
  heroLoading: {
    paddingVertical: spacing.md,
    alignItems: 'flex-start',
  },
  heroError: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 13,
    opacity: 0.85,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '700',
  },
  heroTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  heroHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brand: {
    color: colors.brand,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  bellDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
    borderWidth: 1,
    borderColor: colors.background,
  },
  bellBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.brand,
    borderWidth: 1.5,
    borderColor: colors.background,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadgeText: {
    color: colors.brandText,
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  chip: {
    paddingVertical: 4,
    alignItems: 'center',
  },
  chipText: {
    color: 'rgba(229, 226, 225, 0.55)',
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  chipUnderline: {
    marginTop: 6,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: colors.brand,
    alignSelf: 'stretch',
  },
  chipsDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.md,
  },
  heroBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  newBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginBottom: spacing.sm,
  },
  newBadgeText: {
    color: colors.brandText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm - 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  heroTagline: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
    marginBottom: spacing.md,
    maxWidth: 340,
  },
  heroActions: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  playBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  playText: {
    color: colors.brandText,
    fontSize: 14,
    fontWeight: '700',
  },
  listBtn: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: colors.glassBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  listText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  pressed: {opacity: 0.85, transform: [{scale: 0.98}]},
  hlist: {paddingHorizontal: spacing.md},
  podcastCard: {
    width: 160,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
  },
  podcastImg: {
    width: '100%',
    height: 110,
    backgroundColor: colors.surface,
  },
  podcastBody: {padding: 10},
  podcastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  podcastCat: {
    color: colors.textAccent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  podcastTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  podcastAuthor: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  audioSection: {marginTop: spacing.lg},
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  audioImg: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  audioBody: {flex: 1, marginLeft: spacing.md},
  audioTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  audioBadge: {
    color: colors.textAccent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  audioTitle: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  audioDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  audioPlay: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff7f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
