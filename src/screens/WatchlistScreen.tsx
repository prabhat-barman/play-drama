import React, {useCallback, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import {useFocusEffect} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {
  BookmarkIcon,
  DownloadIcon,
  HistoryIcon,
  PlayIcon,
  TrashIcon,
} from '../components/icons';
import {MovieCard} from '../components/MovieCard';
import {MovieCardSkeleton} from '../components/Skeleton';
import {api, type WatchHistoryItem} from '../lib/api';
import {webseriesToContent} from '../lib/adapters';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Watchlist'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TabKey = 'watchlist' | 'history' | 'downloads';

const {width: windowWidth} = Dimensions.get('window');
const cardWidth = Math.floor((windowWidth - spacing.md * 2 - (spacing.sm + 2)) / 2);

export function WatchlistScreen({navigation}: Props) {
  const {token} = useAuth();
  const [tab, setTab] = useState<TabKey>('watchlist');

  // Watchlist fetcher
  const fetchWatchlist = useCallback(
    async (signal: AbortSignal) => {
      if (!token) {
        return null;
      }
      try {
        const res = await api.watchlist.list({token, limit: 50, signal});
        return res.data.map(webseriesToContent);
      } catch (err: any) {
        if (err?.status === 404 || err?.message?.includes('404')) {
          return [];
        }
        throw err;
      }
    },
    [token],
  );

  const {
    data: watchlistItems,
    loading: watchlistLoading,
    error: watchlistError,
    reload: reloadWatchlist,
  } = useApi(fetchWatchlist, [token]);

  // Watch history state & pagination
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  const loadHistory = useCallback(
    async (pageToLoad = 1, isRefresh = false) => {
      if (!token) return;
      if (isRefresh) {
        setHistoryRefreshing(true);
      } else if (pageToLoad === 1) {
        setHistoryLoading(true);
      }
      setHistoryError(null);

      try {
        const res = await api.watchHistory.list({
          token,
          page: pageToLoad,
          limit: 20,
        });

        const newItems = res.data ?? [];
        setHistoryTotalPages(res.meta?.totalPages ?? 1);
        setHistoryPage(pageToLoad);

        if (pageToLoad === 1) {
          setHistoryItems(newItems);
        } else {
          setHistoryItems(prev => {
            const existingIds = new Set(prev.map(i => i._id));
            const filtered = newItems.filter(i => !existingIds.has(i._id));
            return [...prev, ...filtered];
          });
        }
      } catch (err: any) {
        if (pageToLoad === 1) {
          setHistoryError(err?.message || 'Could not load watch history');
        }
      } finally {
        setHistoryLoading(false);
        setHistoryRefreshing(false);
      }
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      if (token) {
        reloadWatchlist();
        loadHistory(1, true);
      }
    }, [token, reloadWatchlist, loadHistory]),
  );

  const handleRemoveHistoryItem = async (item: WatchHistoryItem) => {
    if (!token) return;
    const episodeId = item.episode?.id;
    if (!episodeId) return;

    setHistoryItems(prev => prev.filter(i => i._id !== item._id));

    try {
      await api.watchHistory.remove({token, episodeId});
    } catch {
      loadHistory(1, true);
    }
  };

  const handleClearAllHistory = () => {
    if (!token || !historyItems.length) return;
    Alert.alert(
      'Clear Watch History',
      'Are you sure you want to clear your entire watch history? This action cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            setHistoryItems([]);
            try {
              await api.watchHistory.clearAll({token});
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to clear watch history');
              loadHistory(1, true);
            }
          },
        },
      ],
    );
  };

  const renderHistoryItem = ({item}: {item: WatchHistoryItem}) => {
    const thumb =
      item.episode?.thumbnail ||
      item.series?.thumbnail ||
      item.series?.coverImage;
    const epNum = item.episode?.episodeNumber;
    const epTitle = item.episode?.title;
    const subLine = epNum
      ? `Episode ${epNum}${epTitle ? ` · ${epTitle}` : ''}`
      : epTitle || item.series?.title || 'Episode';
    const pct = Math.min(100, Math.max(0, item.percentage ?? 0));

    return (
      <View style={styles.historyRow}>
        <Pressable
          style={styles.historyThumbWrap}
          onPress={() =>
            navigation.navigate('Player', {
              id: item.series?.id || item._id,
              episodeId: item.episode?.id,
            })
          }>
          {thumb ? (
            <Image source={{uri: thumb}} style={styles.historyThumb} />
          ) : (
            <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
              <PlayIcon size={20} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.historyPlayBadge}>
            <PlayIcon size={14} color={colors.background} />
          </View>
        </Pressable>

        <Pressable
          style={styles.historyInfo}
          onPress={() =>
            navigation.navigate('Player', {
              id: item.series?.id || item._id,
              episodeId: item.episode?.id,
            })
          }>
          <Text style={styles.historySeriesTitle} numberOfLines={1}>
            {item.series?.title || 'Web Series'}
          </Text>
          <Text style={styles.historyEpTitle} numberOfLines={1}>
            {subLine}
          </Text>
          <View style={styles.historyProgressWrap}>
            <View style={styles.historyProgressBar}>
              <View style={[styles.historyProgressFill, {width: `${pct}%`}]} />
            </View>
            <Text style={styles.historyProgressText}>
              {item.completed ? 'Finished' : `${pct}%`}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={() => handleRemoveHistoryItem(item)}
          style={styles.historyRemoveBtn}
          hitSlop={10}>
          <TrashIcon size={18} color={colors.textMuted} />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>PLAY DRAMA</Text>
        {tab === 'history' && historyItems.length > 0 ? (
          <Pressable
            onPress={handleClearAllHistory}
            style={styles.clearAllBtn}
            hitSlop={8}>
            <TrashIcon size={16} color={colors.brand} />
            <Text style={styles.clearAllText}>Clear All</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('watchlist')}
          style={[styles.tab, tab === 'watchlist' && styles.tabActive]}>
          <Text
            style={[
              styles.tabText,
              tab === 'watchlist' && styles.tabTextActive,
            ]}>
            WATCHLIST
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          style={[styles.tab, tab === 'history' && styles.tabActive]}>
          <Text
            style={[
              styles.tabText,
              tab === 'history' && styles.tabTextActive,
            ]}>
            HISTORY
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('downloads')}
          style={[styles.tab, tab === 'downloads' && styles.tabActive]}>
          <Text
            style={[
              styles.tabText,
              tab === 'downloads' && styles.tabTextActive,
            ]}>
            DOWNLOADS
          </Text>
        </Pressable>
      </View>

      {tab === 'watchlist' ? (
        watchlistLoading && (!watchlistItems || !watchlistItems.length) ? (
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm + 2,
              justifyContent: 'center',
              marginTop: spacing.md,
              paddingHorizontal: spacing.md,
            }}>
            <MovieCardSkeleton width={cardWidth} />
            <MovieCardSkeleton width={cardWidth} />
            <MovieCardSkeleton width={cardWidth} />
            <MovieCardSkeleton width={cardWidth} />
          </View>
        ) : watchlistError ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Couldn't load watchlist</Text>
            <Text style={styles.stateBody}>{watchlistError}</Text>
            <Pressable onPress={reloadWatchlist} style={styles.browseBtn}>
              <Text style={styles.browseText}>Retry</Text>
            </Pressable>
          </View>
        ) : watchlistItems && watchlistItems.length > 0 ? (
          <FlatList
            data={watchlistItems}
            keyExtractor={m => m.id}
            renderItem={({item}) => (
              <View style={styles.gridItem}>
                <MovieCard
                  movie={item}
                  width={cardWidth}
                  showTitle
                  onPress={() =>
                    navigation.navigate('MovieDetails', {id: item.id})
                  }
                />
              </View>
            )}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.state}>
            <BookmarkIcon size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>Your watchlist is empty</Text>
            <Text style={styles.stateBody}>
              Tap the Watchlist button on any title to save it here.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Discover')}
              style={({pressed}) => [
                styles.browseBtn,
                pressed && {opacity: 0.75},
              ]}>
              <Text style={styles.browseText}>Browse Web Series</Text>
            </Pressable>
          </View>
        )
      ) : tab === 'history' ? (
        historyLoading && !historyItems.length ? (
          <View style={styles.state}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : historyError && !historyItems.length ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Couldn't load watch history</Text>
            <Text style={styles.stateBody}>{historyError}</Text>
            <Pressable onPress={() => loadHistory(1)} style={styles.browseBtn}>
              <Text style={styles.browseText}>Retry</Text>
            </Pressable>
          </View>
        ) : historyItems.length > 0 ? (
          <FlatList
            data={historyItems}
            keyExtractor={item => item._id}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.historyList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={historyRefreshing}
                onRefresh={() => loadHistory(1, true)}
                tintColor={colors.brand}
                colors={[colors.brand]}
              />
            }
            onEndReached={() => {
              if (historyPage < historyTotalPages && !historyLoading) {
                loadHistory(historyPage + 1);
              }
            }}
            onEndReachedThreshold={0.4}
          />
        ) : (
          <View style={styles.state}>
            <HistoryIcon size={44} color={colors.textMuted} />
            <Text style={styles.stateTitle}>No watch history</Text>
            <Text style={styles.stateBody}>
              Shows and movies you watch will appear here so you can easily resume them.
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Discover')}
              style={({pressed}) => [
                styles.browseBtn,
                pressed && {opacity: 0.75},
              ]}>
              <Text style={styles.browseText}>Explore Content</Text>
            </Pressable>
          </View>
        )
      ) : (
        <View style={styles.state}>
          <DownloadIcon size={44} color={colors.textMuted} />
          <Text style={styles.stateTitle}>No downloads yet</Text>
          <Text style={styles.stateBody}>
            Downloaded titles will appear here for offline viewing.
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Discover')}
            style={({pressed}) => [
              styles.browseBtn,
              pressed && {opacity: 0.75},
            ]}>
            <Text style={styles.browseText}>Explore Content</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  brand: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearAllText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  tabActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  tabTextActive: {color: colors.brandText},
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  stateTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginTop: spacing.md,
  },
  stateBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
  browseBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: 999,
    marginTop: spacing.md,
  },
  browseText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '800',
  },
  grid: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    gap: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  gridItem: {},
  historyList: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xl,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  historyThumbWrap: {
    position: 'relative',
    width: 90,
    height: 58,
    borderRadius: radius.sm,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  historyThumb: {
    width: '100%',
    height: '100%',
  },
  historyThumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyPlayBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    marginTop: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(233, 40, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  historySeriesTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  historyEpTitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  historyProgressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  historyProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  historyProgressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  historyProgressText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  historyRemoveBtn: {
    padding: spacing.xs,
  },
});
