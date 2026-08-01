import React, {useCallback, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {
  BookmarkIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  DownloadIcon,
  HeartIcon,
  PlayIcon,
  PlusIcon,
  ShareIcon,
  StarIcon,
} from '../components/icons';
import {SegmentedTabs} from '../components/SegmentedTabs';
import {MovieCard} from '../components/MovieCard';
import {api, type Episode as ApiEpisode} from '../lib/api';
import {
  episodeRuntimeMinutes,
  webseriesToContent,
} from '../lib/adapters';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {ContentItem} from '../types/movie';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

type TabKey = 'episodes' | 'related' | 'cast';

type Bundle = {
  movie: ContentItem;
  episodes: ApiEpisode[];
  related: ContentItem[];
};

export function MovieDetailsScreen({navigation, route}: Props) {
  const {token} = useAuth();
  const id = route.params.id;
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);

  const fetchBundle = useCallback(
    async (signal: AbortSignal): Promise<Bundle> => {
      if (!token) {
        throw new Error('Not signed in');
      }
      const detail = await api.webseries.get({token, id, signal});
      const movie = webseriesToContent(detail);
      // Related + episodes in parallel — episodes only needed if the
      // series actually has any, but we fire eagerly and let the UI decide.
      const [episodesRes, relatedRes] = await Promise.allSettled([
        api.episodes.list({
          token,
          webSeriesId: id,
          limit: 30,
          signal,
        }),
        api.webseries.list({
          token,
          status: 'PUBLISHED',
          genre: movie.genres[0]?.toLowerCase(),
          limit: 10,
          signal,
        }),
      ]);
      const episodes =
        episodesRes.status === 'fulfilled' ? episodesRes.value.data : [];
      const related =
        relatedRes.status === 'fulfilled'
          ? relatedRes.value.data
              .map(webseriesToContent)
              .filter(r => r.id !== movie.id)
              .slice(0, 6)
          : [];
      return {movie, episodes, related};
    },
    [token, id],
  );

  const {data, loading, error, reload} = useApi(fetchBundle, [token, id]);

  const movie = data?.movie;
  const episodes = data?.episodes ?? [];
  const related = data?.related ?? [];

  const isSeries =
    (movie?.totalEpisodes ?? 0) > 0 || episodes.length > 0;

  // `movie.cast` (view-model, `string[]`) is populated only when the API
  // returns cast members with `fullName` — currently only on
  // `GET /mobile-users/webseries/:id`. Auto-hide the Cast tab when empty
  // to avoid an empty screen for series without cast metadata.
  const hasCast = (movie?.cast?.length ?? 0) > 0;

  const initialTab: TabKey = isSeries ? 'episodes' : 'related';
  const [tab, setTab] = useState<TabKey>(initialTab);

  // If the initial tab guess was wrong (bundle told us "not a series") keep
  // the user's explicit tab choice but nudge default the first time.
  const tabs = useMemo(() => {
    if (!movie) {
      return [];
    }
    const list: Array<{key: TabKey; label: string}> = [];
    if (isSeries) {
      list.push({key: 'episodes', label: 'Episodes'});
    }
    list.push({key: 'related', label: 'Related'});
    if (hasCast) {
      list.push({key: 'cast', label: 'Cast'});
    }
    return list;
  }, [isSeries, movie, hasCast]);

  const activeTab: TabKey = useMemo(() => {
    if (!isSeries && tab === 'episodes') {
      return 'related';
    }
    if (!hasCast && tab === 'cast') {
      return isSeries ? 'episodes' : 'related';
    }
    return tab;
  }, [isSeries, tab, hasCast]);

  if (loading && !movie) {
    return (
      <View style={styles.emptyRoot}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error && !movie) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyText}>{error}</Text>
        <Pressable onPress={reload} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!movie) {
    return (
      <View style={styles.emptyRoot}>
        <Text style={styles.emptyText}>Not found</Text>
      </View>
    );
  }

  const cast = movie.cast ?? [];

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <Image
            source={{uri: movie.backdrop}}
            style={styles.heroImg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'rgba(10,10,10,0.5)',
              'rgba(10,10,10,0)',
              colors.background,
            ]}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFill}
          />

          <SafeAreaView edges={['top']} style={styles.heroHeader}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={styles.iconBtn}
              hitSlop={8}>
              <ChevronLeftIcon />
            </Pressable>
            <View style={styles.heroRightRow}>
              <Pressable style={styles.iconBtn} hitSlop={8}>
                <ShareIcon size={20} />
              </Pressable>
              <Pressable
                style={styles.iconBtn}
                hitSlop={8}
                onPress={() => setLiked(v => !v)}>
                <HeartIcon
                  size={20}
                  color={liked ? colors.brand : colors.textPrimary}
                  filled={liked}
                />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        <View style={styles.body}>
          {movie.isNew ? (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>NEW RELEASE</Text>
            </View>
          ) : null}
          <Text style={styles.title}>{movie.title}</Text>

          <View style={styles.metaRow}>
            <StarIcon />
            <Text style={styles.metaText}>{movie.year ?? '—'}</Text>
            {isSeries && movie.totalEpisodes ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText}>
                  {movie.totalEpisodes} Episodes
                </Text>
              </>
            ) : null}
            {movie.language ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText}>
                  {movie.language.toUpperCase()}
                </Text>
              </>
            ) : null}
            {movie.maturity ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaText}>{movie.maturity}</Text>
              </>
            ) : null}
            {movie.isPremium ? (
              <>
                <View style={styles.dot} />
                <Text style={styles.metaMatch}>PREMIUM</Text>
              </>
            ) : null}
          </View>

          <View style={styles.mainActionRow}>
            <Pressable
              onPress={() => navigation.navigate('Player', {id: movie.id})}
              style={({pressed}) => [styles.playBtn, pressed && styles.pressed]}>
              <PlayIcon size={18} color={colors.brandText} filled />
              <Text style={styles.playText}>
                {isSeries && episodes[0]
                  ? `Play E${episodes[0].episodeNumber}`
                  : 'Play Now'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.subActionRow}>
            <Pressable
              onPress={() => setSaved(v => !v)}
              style={({pressed}) => [styles.subActionBtn, pressed && styles.pressed]}>
              {saved ? (
                <BookmarkIcon size={16} color={colors.brand} filled />
              ) : (
                <PlusIcon size={16} color={colors.textPrimary} />
              )}
              <Text
                style={[
                  styles.subActionText,
                  saved && styles.subActionTextActive,
                ]}>
                {saved ? 'In Watchlist' : 'Watchlist'}
              </Text>
            </Pressable>

            <Pressable
              style={({pressed}) => [styles.subActionBtn, pressed && styles.pressed]}>
              <PlayIcon size={14} color={colors.textPrimary} filled={false} />
              <Text style={styles.subActionText}>Trailer</Text>
            </Pressable>

            <Pressable
              style={({pressed}) => [styles.subActionBtn, pressed && styles.pressed]}>
              <DownloadIcon size={16} color={colors.textPrimary} />
              <Text style={styles.subActionText}>Download</Text>
            </Pressable>
          </View>

          <Text style={styles.synopsis}>{movie.synopsis}</Text>

          <View style={styles.credits}>
            {cast.length ? (
              <Text style={styles.creditsLabel}>
                Cast:{' '}
                <Text style={styles.creditsValue}>
                  {cast.slice(0, 5).join(', ')}
                </Text>
              </Text>
            ) : null}
            {movie.genres.length ? (
              <Text style={styles.creditsLabel}>
                Genres:{' '}
                <Text style={styles.creditsValue}>
                  {movie.genres.join(', ')}
                </Text>
              </Text>
            ) : null}
          </View>

          {tabs.length ? (
            <View style={styles.tabWrap}>
              <SegmentedTabs
                tabs={tabs}
                active={activeTab}
                onChange={key => setTab(key as TabKey)}
                variant="underline"
              />
            </View>
          ) : null}
        </View>

        {activeTab === 'episodes' && isSeries ? (
          <View style={styles.section}>
            <View style={styles.seasonRow}>
              <Text style={styles.seasonLabel}>Season 1</Text>
              <Text style={styles.seasonCount}>
                {episodes.length} Episodes
              </Text>
              <ChevronDownIcon size={18} color={colors.textMuted} />
            </View>
            {episodes.length ? (
              episodes.map(e => (
                <Pressable
                  key={e._id}
                  onPress={() =>
                    navigation.navigate('Player', {id: movie.id})
                  }
                  style={styles.epRow}>
                  <View style={styles.epThumbWrap}>
                    <Image
                      source={{uri: e.thumbnail || movie.backdrop}}
                      style={styles.epThumb}
                    />
                    <View style={styles.epPlay}>
                      <PlayIcon size={14} color={colors.background} />
                    </View>
                  </View>
                  <View style={styles.epBody}>
                    <Text style={styles.epTitle}>
                      {e.episodeNumber}. {e.title}
                    </Text>
                    {e.description ? (
                      <Text style={styles.epSynopsis} numberOfLines={2}>
                        {e.description}
                      </Text>
                    ) : null}
                    <Text style={styles.epMeta}>
                      {formatEpisodeMeta(e)}
                    </Text>
                  </View>
                </Pressable>
              ))
            ) : (
              <Text style={styles.emptyBlockText}>
                No episodes released yet.
              </Text>
            )}
          </View>
        ) : null}

        {activeTab === 'related' ? (
          <View style={styles.section}>
            {related.length ? (
              <View style={styles.relatedGrid}>
                {related.map(m => (
                  <View key={m.id} style={styles.relatedItem}>
                    <MovieCard
                      movie={m}
                      width={100}
                      onPress={() =>
                        navigation.push('MovieDetails', {id: m.id})
                      }
                    />
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyBlockText}>No related titles.</Text>
            )}
          </View>
        ) : null}

        {activeTab === 'cast' ? (
          <View style={styles.section}>
            {cast.length ? (
              cast.map(c => (
                <View key={c} style={styles.castRow}>
                  <View style={styles.castAvatar}>
                    <Text style={styles.castInitials}>
                      {c
                        .split(' ')
                        .filter(Boolean)
                        .map(s => s[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={{flex: 1}}>
                    <Text style={styles.castName}>{c}</Text>
                    <Text style={styles.castRole}>Cast Member</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyBlockText}>Cast list unavailable.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function formatEpisodeMeta(e: ApiEpisode): string {
  const parts: string[] = [];
  const mins = episodeRuntimeMinutes(e);
  if (mins) {
    parts.push(`${mins} min`);
  }
  if (e.status === 'PROCESSING' || e.status === 'DRAFT') {
    parts.push('Coming soon');
  } else if (e.status === 'FAILED') {
    parts.push('Unavailable');
  }
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  scrollContent: {paddingBottom: 60},
  emptyRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
  emptyText: {color: colors.textPrimary, textAlign: 'center'},
  emptyBlockText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: spacing.md,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: spacing.lg,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    color: colors.brandText,
    fontWeight: '700',
    fontSize: 14,
  },
  backLink: {padding: spacing.sm},
  backText: {color: colors.textMuted, fontSize: 13},
  hero: {height: 340, width: '100%'},
  heroImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    zIndex: 10,
  },
  heroRightRow: {flexDirection: 'row', gap: spacing.sm + 2},
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.md,
    marginTop: -80,
  },
  newBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.brand,
    marginBottom: 8,
  },
  newBadgeText: {
    color: colors.brandText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  metaText: {color: colors.textMuted, fontSize: 12},
  metaMatch: {
    color: '#ffb400',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.6,
  },
  mainActionRow: {
    marginBottom: spacing.sm + 4,
  },
  playBtn: {
    width: '100%',
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  playText: {color: colors.brandText, fontSize: 15, fontWeight: '800'},
  subActionRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.lg,
  },
  subActionBtn: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  subActionText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  subActionTextActive: {
    color: colors.brand,
    fontWeight: '700',
  },
  pressed: {opacity: 0.82, transform: [{scale: 0.98}]},
  synopsis: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.md,
  },
  credits: {
    gap: 6,
    marginBottom: spacing.lg,
  },
  creditsLabel: {color: colors.textMuted, fontSize: 12},
  creditsValue: {color: colors.textPrimary},
  tabWrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
    marginBottom: spacing.md,
  },
  section: {paddingHorizontal: spacing.md, paddingBottom: spacing.xxl},
  seasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  seasonLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  seasonCount: {color: colors.textMuted, fontSize: 12},
  epRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  epThumbWrap: {
    width: 130,
    height: 82,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  epThumb: {width: '100%', height: '100%'},
  epPlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -14,
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff7f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  epBody: {flex: 1},
  epTitle: {color: colors.textPrimary, fontSize: 13, fontWeight: '700'},
  epSynopsis: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  epMeta: {color: colors.textMuted, fontSize: 11, marginTop: 4, opacity: 0.8},
  relatedGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm + 2,
  },
  relatedItem: {width: '31%'},
  castRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  castAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  castInitials: {color: colors.textPrimary, fontWeight: '800', fontSize: 14},
  castName: {color: colors.textPrimary, fontSize: 14, fontWeight: '700'},
  castRole: {color: colors.textMuted, fontSize: 12, marginTop: 2},
});
