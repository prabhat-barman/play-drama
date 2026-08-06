import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation, type CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';

import {recentSearches, searchCategories} from '../data/placeholders';
import {colors, radius, spacing} from '../theme/colors';
import {
  ChevronRightIcon,
  ClockIcon,
  CloseIcon,
  PlayIcon,
  SearchIcon,
  StarIcon,
} from '../components/icons';
import {SectionHeader} from '../components/SectionHeader';
import {MovieCard} from '../components/MovieCard';
import {Skeleton, MovieRowSkeleton} from '../components/Skeleton';
import {api} from '../lib/api';
import type {Student} from '../lib/api';
import {webseriesToContent} from '../lib/adapters';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {ContentItem} from '../types/movie';
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Discover'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function DiscoverScreen({navigation}: Props) {
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState(searchCategories[0]);
  const {token} = useAuth();

  const genre = useMemo(() => {
    if (!activeCategory || activeCategory === 'All Genres') {
      return undefined;
    }
    return activeCategory.toLowerCase();
  }, [activeCategory]);

  type DiscoverFeedData = {
    trending: ContentItem[];
    forYou?: ContentItem;
    explore: ContentItem[];
    actors: Student[];
  };

  const fetchDiscover = useCallback(
    async (signal: AbortSignal): Promise<DiscoverFeedData> => {
      if (!token) {
        return {trending: [], explore: [], actors: []};
      }
      try {
        const isSearchOrFilter = !!genre || !!q.trim();
        const res = isSearchOrFilter
          ? await api.discover.search({
              token,
              genre,
              q: q.trim() || undefined,
              signal,
            })
          : await api.discover.feed({token, signal});

        const rawData = (res as any)?.data || res;
        const sections = rawData?.sections || {};

        const trendingItems = Array.isArray(sections.trending?.items)
          ? sections.trending.items.map(webseriesToContent)
          : [];

        const forYouItems = Array.isArray(sections.forYou?.items)
          ? sections.forYou.items.map(webseriesToContent)
          : [];

        const exploreItems = Array.isArray(sections.explore?.items)
          ? sections.explore.items.map(webseriesToContent)
          : [];

        const actorsItems: Student[] = Array.isArray(sections.actors?.items)
          ? sections.actors.items.map((a: any) => ({
              _id: a.id || a._id,
              fullName: a.fullName || a.name || '',
              profileImage: a.profileImage || '',
              course: a.course,
              department: a.department,
            }))
          : [];

        return {
          trending: trendingItems,
          forYou: forYouItems[0] || trendingItems[0],
          explore: exploreItems,
          actors: actorsItems,
        };
      } catch (err) {
        // Fallback to webseries.list if discover API fails
        const listRes = await api.webseries.list({
          token,
          status: 'PUBLISHED',
          genre,
          limit: 30,
          signal,
        });
        const items = listRes.data.map(webseriesToContent);
        return {
          trending: items.slice(0, 8),
          forYou: items[0],
          explore: items.slice(0, 10),
          actors: [],
        };
      }
    },
    [token, genre, q],
  );

  const {data, loading, error, reload} = useApi(fetchDiscover, [token, genre, q]);

  const trending = data?.trending ?? [];
  const featured = data?.forYou;
  const explore = data?.explore ?? [];
  const students = data?.actors ?? [];
  const hasAnyMedia = trending.length > 0 || !!featured || explore.length > 0;

  const openMovie = (id: string) =>
    navigation.navigate('MovieDetails', {id});

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']}>
        <View style={styles.headerRow}>
          <Text style={styles.brand}>PLAY DRAMA</Text>
        </View>
        <View style={styles.searchBar}>
          <SearchIcon size={20} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search movies, people..."
            placeholderTextColor={colors.placeholder}
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={() => {
              if (q.trim()) {
                navigation.navigate('Search');
              }
            }}
          />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}>
        {recentSearches.length ? (
          <>
            <SectionHeader title="Recent Searches" compact />
            <View style={styles.recentWrap}>
              {recentSearches.map(s => (
                <View key={s} style={styles.recentChip}>
                  <ClockIcon size={14} color={colors.textMuted} />
                  <Text style={styles.recentText}>{s}</Text>
                  <Pressable hitSlop={6}>
                    <CloseIcon size={14} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.recentChipMore}>
                <Text style={styles.recentMoreText}>View All</Text>
              </Pressable>
            </View>
          </>
        ) : null}

        <View style={styles.categoriesRow}>
          {searchCategories.map(c => {
            const on = c === activeCategory;
            return (
              <Pressable
                key={c}
                onPress={() => setActiveCategory(c)}
                style={[styles.category, on && styles.categoryOn]}>
                <Text
                  style={[styles.categoryText, on && styles.categoryTextOn]}>
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {error && !hasAnyMedia ? (
          <View style={styles.errorBlock}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={reload} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading && !hasAnyMedia ? (
          <View style={{paddingHorizontal: spacing.md}}>
            <Skeleton width="100%" height={240} borderRadius={radius.lg} style={{marginBottom: spacing.md}} />
            <MovieRowSkeleton titleWidth={120} />
            <MovieRowSkeleton titleWidth={150} />
          </View>
        ) : null}

        {!loading && !error && !hasAnyMedia ? (
          <View style={styles.emptyWrap}>
            <View style={styles.emptyIconCircle}>
              <SearchIcon size={30} color={colors.brand} />
            </View>
            <Text style={styles.emptyTitle}>
              No titles found {activeCategory !== 'All Genres' ? `in "${activeCategory}"` : ''}
            </Text>
            <Text style={styles.emptySubtitle}>
              We couldn't find any webseries in this genre. Try switching back to "All Genres" or exploring another category.
            </Text>
            {activeCategory !== 'All Genres' ? (
              <Pressable
                onPress={() => setActiveCategory('All Genres')}
                style={styles.resetBtn}>
                <Text style={styles.resetBtnText}>View All Genres</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {trending.length ? (
          <>
            <SectionHeader title="Trending Now" action="See All" compact />
            <FlatList
              horizontal
              data={trending}
              keyExtractor={m => m.id}
              contentContainerStyle={styles.hlist}
              ItemSeparatorComponent={() => (
                <View style={{width: spacing.sm + 2}} />
              )}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => (
                <MovieCard
                  movie={item}
                  width={130}
                  onPress={() => openMovie(item.id)}
                />
              )}
            />
          </>
        ) : null}

        {students.length ? (
          <>
            <SectionHeader
              title="Actors"
              action="See All"
              compact
            />
            <FlatList
              horizontal
              data={students}
              keyExtractor={s => s._id}
              contentContainerStyle={styles.hlist}
              ItemSeparatorComponent={() => (
                <View style={{width: spacing.sm + 2}} />
              )}
              showsHorizontalScrollIndicator={false}
              renderItem={({item}) => <StudentAvatar student={item} />}
            />
          </>
        ) : null}

        {featured ? (
          <>
            <SectionHeader title="For You" action="Explore" compact />
            <Pressable
              onPress={() => openMovie(featured.id)}
              style={styles.featured}>
              <Image
                source={{uri: featured.backdrop}}
                style={styles.featuredImg}
                resizeMode="cover"
              />
              <LinearGradient
                colors={['rgba(10,10,10,0)', 'rgba(10,10,10,0.85)']}
                style={StyleSheet.absoluteFill}
              />
              {featured.isNew ? (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredBadgeText}>NEW RELEASE</Text>
                </View>
              ) : null}
              <View style={styles.featuredBody}>
                <Text style={styles.featuredTitle}>{featured.title}</Text>
                <View style={styles.featuredMeta}>
                  <StarIcon size={12} />
                  <Text style={styles.featuredMetaText}>
                    {featured.year ?? '—'}
                  </Text>
                  {featured.genres[0] ? (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.featuredMetaText}>
                        {featured.genres[0]}
                      </Text>
                    </>
                  ) : null}
                </View>
                <Text numberOfLines={2} style={styles.featuredSynopsis}>
                  {featured.synopsis}
                </Text>
                <View style={styles.featuredActions}>
                  <View style={styles.playPill}>
                    <PlayIcon size={14} color={colors.background} />
                    <Text style={styles.playPillText}>Play</Text>
                  </View>
                  <View style={styles.miniList}>
                    <Text style={styles.miniListText}>Details</Text>
                  </View>
                </View>
              </View>
            </Pressable>
          </>
        ) : null}



        {explore.length ? (
          <>
            <SectionHeader title="Explore Titles" compact />
            <View style={styles.becauseWrap}>
              {explore.map(m => (
                <Pressable
                  key={m.id}
                  onPress={() => openMovie(m.id)}
                  style={styles.becauseRow}>
                  <Image
                    source={{uri: m.backdrop || m.poster}}
                    style={styles.becauseImg}
                    resizeMode="cover"
                  />
                  <View style={styles.becauseBody}>
                    <Text style={styles.becauseTitle}>{m.title}</Text>
                    <Text style={styles.becauseMeta}>
                      {[m.year, m.genres[0], m.maturity]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  <ChevronRightIcon size={18} color={colors.textMuted} />
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function studentInitials(fullName: string): string {
  return (
    fullName
      .split(' ')
      .map(p => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  );
}

function StudentAvatar({student}: {student: Student}) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!student.profileImage && !imgFailed;
  const subtitle = student.course || student.department;
  const actorId = student._id || (student as any).id;

  return (
    <Pressable
      onPress={() => {
        if (actorId) {
          navigation.navigate('ActorProfile', {studentId: actorId});
        }
      }}
      style={({pressed}) => [styles.studentCard, pressed && {opacity: 0.75}]}>
      <View style={styles.studentAvatarRing}>
        {showImage ? (
          <Image
            source={{uri: student.profileImage!}}
            style={styles.studentAvatar}
            onError={() => setImgFailed(true)}
          />
        ) : (
          <View style={styles.studentAvatarFallback}>
            <Text style={styles.studentInitials}>
              {studentInitials(student.fullName)}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={styles.studentName}
        numberOfLines={1}
        ellipsizeMode="tail">
        {student.fullName}
      </Text>
      {subtitle ? (
        <Text
          style={styles.studentMeta}
          numberOfLines={1}
          ellipsizeMode="tail">
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}


const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  headerRow: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  brand: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  scroll: {paddingBottom: spacing.xxl + 40},
  recentWrap: {
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  recentText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '500',
  },
  recentChipMore: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  recentMoreText: {
    color: colors.textAccent,
    fontSize: 12,
    fontWeight: '600',
  },
  categoriesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  category: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
  },
  categoryOn: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  categoryText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  categoryTextOn: {
    color: colors.brandText,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(157, 78, 221, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(157, 78, 221, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptySubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: spacing.lg,
  },
  resetBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  resetBtnText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '700',
  },
  errorBlock: {
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  loadingBlock: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 13,
    opacity: 0.9,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.brandText,
    fontSize: 12,
    fontWeight: '700',
  },
  hlist: {paddingHorizontal: spacing.md},
  studentCard: {
    width: 84,
    alignItems: 'center',
  },
  studentAvatarRing: {
    padding: 2,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.brand,
    marginBottom: 6,
  },
  studentAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
  },
  studentAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInitials: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  studentName: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    width: 84,
  },
  studentMeta: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 2,
    width: 84,
  },
  featured: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    height: 260,
  },
  featuredImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  featuredBadgeText: {
    color: colors.brandText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  featuredBody: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
  },
  featuredTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  featuredMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  featuredMetaText: {color: colors.textMuted, fontSize: 12},
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.7,
  },
  featuredSynopsis: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
    marginBottom: spacing.sm + 2,
  },
  featuredActions: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
  },
  playPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#fff7f6',
  },
  playPillText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  miniList: {
    justifyContent: 'center',
    paddingHorizontal: 12,
    height: 30,
    borderRadius: 999,
    borderColor: colors.glassBorder,
    borderWidth: 1,
  },
  miniListText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  becauseWrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm + 2,
  },
  becauseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  becauseImg: {
    width: 96,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  becauseBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  becauseTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  becauseMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
});
