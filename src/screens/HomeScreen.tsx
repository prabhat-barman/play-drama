import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';

import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {audioStories, podcasts} from '../data/placeholders';
import {colors, radius, spacing} from '../theme/colors';
import {
  BellIcon,
  CastIcon,
  CrownIcon,
  HeadphonesIcon,
  MicIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  UserIcon,
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

const SCREEN_WIDTH = Dimensions.get('window').width;

type PopularActor = {
  id: string;
  name: string;
  profileImage?: string;
  bio?: string;
  redirectType?: string;
  redirectId?: string;
};

type FeaturedInstitute = {
  id: string;
  name: string;
  logo?: string;
  totalWebseries?: number;
  redirectType?: string;
  redirectId?: string;
};

type CategoryItem = {
  id: string;
  name: string;
  count?: number;
  redirectType?: string;
  redirectId?: string;
};

type HomePayload = {
  banner: ContentItem[];
  trending: ContentItem[];
  newReleases: ContentItem[];
  topRated: ContentItem[];
  recommended: ContentItem[];
  recentlyAdded: ContentItem[];
  popularDramas: ContentItem[];
  popularActors: PopularActor[];
  featuredInstitutes: FeaturedInstitute[];
  categories: CategoryItem[];
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
          banner: [],
          trending: [],
          newReleases: [],
          topRated: [],
          recommended: [],
          recentlyAdded: [],
          popularDramas: [],
          popularActors: [],
          featuredInstitutes: [],
          categories: [],
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

      const popularActors: PopularActor[] = Array.isArray(homeAggregated.popularActors)
        ? homeAggregated.popularActors
        : [];
      const featuredInstitutes: FeaturedInstitute[] = Array.isArray(homeAggregated.featuredInstitutes)
        ? homeAggregated.featuredInstitutes
        : [];
      const categories: CategoryItem[] = Array.isArray(homeAggregated.categories)
        ? homeAggregated.categories
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
        banner: bannerItems.length > 0 ? bannerItems : trendingFinal.slice(0, 5),
        trending: trendingFinal,
        newReleases: newReleasesFinal,
        topRated: topRatedHome,
        recommended: recommendedHome,
        recentlyAdded: recentlyAddedHome,
        popularDramas: popularDramasFinal,
        popularActors,
        featuredInstitutes,
        categories,
        latest: latestItems,
        action: unwrapList(actionRes),
        drama: unwrapList(dramaRes),
      };
    },
    [token],
  );

  const {data, loading, error, reload} = useApi(fetchHome, [token]);

  const bannerItems = useMemo(
    () => (data?.banner?.length ? data.banner : data?.trending.slice(0, 5) ?? []),
    [data],
  );
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
        <HeroCarousel
          bannerItems={bannerItems}
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

        {data?.categories?.length ? (
          <View style={styles.sectionContainer}>
            <SectionHeader title="Explore Categories" />
            <FlatList
              horizontal
              data={data.categories}
              keyExtractor={item => item.id || item.name}
              contentContainerStyle={styles.hlist}
              ItemSeparatorComponent={() => <View style={{width: 8}} />}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <Pressable style={styles.categoryChip}>
                  <Text style={styles.categoryName}>{item.name}</Text>
                  {typeof item.count === 'number' && item.count > 0 ? (
                    <Text style={styles.categoryCount}>({item.count})</Text>
                  ) : null}
                </Pressable>
              )}
            />
          </View>
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

        {data?.popularActors?.length ? (
          <View style={styles.sectionContainer}>
            <SectionHeader title="Popular Actors & Creators" />
            <FlatList
              horizontal
              data={data.popularActors}
              keyExtractor={(item, idx) => item.id || item.redirectId || `actor-${idx}`}
              contentContainerStyle={styles.hlist}
              ItemSeparatorComponent={() => <View style={{width: 14}} />}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <Pressable
                  onPress={() => {
                    const actorId = item.redirectId || item.id;
                    if (actorId) {
                      navigation.navigate('ActorProfile', {studentId: actorId});
                    }
                  }}
                  style={styles.actorCard}>
                  {item.profileImage ? (
                    <Image source={{uri: item.profileImage}} style={styles.actorAvatar} />
                  ) : (
                    <View style={styles.actorAvatarPlaceholder}>
                      <UserIcon size={22} color={colors.textPrimary} />
                    </View>
                  )}
                  <Text style={styles.actorName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.actorBio} numberOfLines={1}>
                    {item.bio || 'Creator / Actor'}
                  </Text>
                </Pressable>
              )}
            />
          </View>
        ) : null}

        {data?.topRated?.length ? (
          <MovieRow
            title="Top Rated"
            movies={data.topRated}
            onPressMovie={m => openMovie(m.id)}
          />
        ) : null}

        {data?.featuredInstitutes?.length ? (
          <View style={styles.sectionContainer}>
            <SectionHeader title="Featured Studios & Institutes" />
            <FlatList
              horizontal
              data={data.featuredInstitutes}
              keyExtractor={(item, idx) => item.id || item.redirectId || `inst-${idx}`}
              contentContainerStyle={styles.hlist}
              ItemSeparatorComponent={() => <View style={{width: 12}} />}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <Pressable
                  onPress={() => {
                    const instId = item.redirectId || item.id;
                    if (instId) {
                      navigation.navigate('InstituteProfile', {instituteId: instId});
                    }
                  }}
                  style={styles.instituteCard}>
                  {item.logo ? (
                    <Image source={{uri: item.logo}} style={styles.instituteLogo} />
                  ) : (
                    <View style={styles.instituteLogoPlaceholder}>
                      <CrownIcon size={20} color="#ffb400" />
                    </View>
                  )}
                  <View style={styles.instituteInfo}>
                    <Text style={styles.instituteName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.instituteCount}>
                      {item.totalWebseries ?? 0} Series
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          </View>
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
  bannerItems: ContentItem[];
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

function HeroCarousel({
  bannerItems,
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
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 24 : 12,
  );

  const flatListRef = useRef<FlatList<ContentItem>>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Auto-scroll carousel every 4.5 seconds
  useEffect(() => {
    if (!bannerItems.length || bannerItems.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % bannerItems.length;
        flatListRef.current?.scrollToIndex({
          index: next,
          animated: true,
        });
        return next;
      });
    }, 4500);
    return () => clearInterval(timer);
  }, [bannerItems.length]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (slide !== activeIndex && slide >= 0 && slide < bannerItems.length) {
      setActiveIndex(slide);
    }
  };

  return (
    <View style={styles.hero}>
      {loading && !bannerItems.length ? (
        <View style={[styles.heroImg, styles.heroSkeleton]} />
      ) : error && !bannerItems.length ? (
        <View style={styles.heroError}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable onPress={onReload} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={bannerItems}
          keyExtractor={(item, index) => item.id || `banner-${index}`}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({item}) => (
            <View style={{width: SCREEN_WIDTH, height: 560, justifyContent: 'flex-end'}}>
              <Image
                source={{uri: item.backdrop || item.poster}}
                style={styles.heroImg}
                resizeMode="cover"
              />
              <LinearGradient
                colors={[
                  'rgba(10,10,10,0.35)',
                  'rgba(10,10,10,0)',
                  'rgba(10,10,10,0.85)',
                  colors.background,
                ]}
                locations={[0, 0.35, 0.85, 1]}
                style={StyleSheet.absoluteFill}
              />

              <View style={styles.heroBody}>
                {item.isNew ? (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>NEW RELEASE</Text>
                  </View>
                ) : null}
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.metaRow}>
                  <StarIcon />
                  <Text style={styles.metaText}>{item.year ?? '—'}</Text>
                  {item.genres[0] ? (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.metaText}>{item.genres[0]}</Text>
                    </>
                  ) : null}
                  {item.totalEpisodes ? (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.metaText}>
                        {item.totalEpisodes} Episodes
                      </Text>
                    </>
                  ) : null}
                  {item.maturity ? (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.metaText}>{item.maturity}</Text>
                    </>
                  ) : null}
                </View>

                <Text style={styles.heroTagline} numberOfLines={2} ellipsizeMode="tail">
                  {item.synopsis ||
                    'An extraordinary story of courage, passion, and unforgettable moments unfolding against all odds.'}
                </Text>

                <View style={styles.heroActions}>
                  <Pressable
                    onPress={() => onPlay(item.id)}
                    style={({pressed}) => [
                      styles.playBtn,
                      pressed && styles.pressed,
                    ]}>
                    <PlayIcon size={16} color={colors.brandText} />
                    <Text style={styles.playText}>Play</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => onOpen(item.id)}
                    style={({pressed}) => [
                      styles.listBtn,
                      pressed && styles.pressed,
                    ]}>
                    <PlusIcon size={16} />
                    <Text style={styles.listText}>Details</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}
        />
      )}

      {/* Top Header Bar Overlay */}
      <View style={styles.heroTopBar} pointerEvents="box-none">
        <View style={[styles.heroHeader, {paddingTop: topInset + 6}]}>
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
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c}
                </Text>
                {active ? <View style={styles.chipUnderline} /> : null}
              </Pressable>
            );
          })}
        </View>
        <View style={styles.chipsDivider} />
      </View>

      {/* Carousel Pagination Dots */}
      {bannerItems.length > 1 ? (
        <View style={styles.carouselDots} pointerEvents="none">
          {bannerItems.map((_, i) => (
            <View
              key={i}
              style={[
                styles.carouselDot,
                i === activeIndex && styles.carouselDotActive,
              ]}
            />
          ))}
        </View>
      ) : null}
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
  heroError: {
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.md,
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
    paddingBottom: spacing.lg + 4,
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
    fontSize: 30,
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
  carouselDots: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  carouselDotActive: {
    width: 18,
    backgroundColor: colors.brand,
  },
  sectionContainer: {
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  hlist: {
    paddingHorizontal: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  categoryName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryCount: {
    color: colors.textMuted,
    fontSize: 11,
  },
  actorCard: {
    width: 96,
    alignItems: 'center',
  },
  actorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  actorAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actorName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  actorBio: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 1,
  },
  instituteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    minWidth: 180,
  },
  instituteLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  instituteLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,180,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  instituteInfo: {
    flex: 1,
  },
  instituteName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  instituteCount: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  pressed: {opacity: 0.85, transform: [{scale: 0.98}]},
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
  audioSection: {paddingHorizontal: spacing.md, marginTop: spacing.sm},
  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    marginBottom: 10,
    gap: 12,
  },
  audioImg: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  audioBody: {flex: 1},
  audioTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontSize: 14,
    fontWeight: '700',
  },
  audioDesc: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  audioPlay: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
