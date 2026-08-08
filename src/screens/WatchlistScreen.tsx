import React, {useCallback, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, spacing} from '../theme/colors';
import {BookmarkIcon, DownloadIcon} from '../components/icons';
import {MovieCard} from '../components/MovieCard';
import {MovieCardSkeleton} from '../components/Skeleton';
import {api} from '../lib/api';
import {webseriesToContent} from '../lib/adapters';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Watchlist'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TabKey = 'watchlist' | 'downloads';

const {width: windowWidth} = Dimensions.get('window');
const cardWidth = Math.floor((windowWidth - spacing.md * 2 - (spacing.sm + 2)) / 2);

export function WatchlistScreen({navigation}: Props) {
  const {token} = useAuth();
  const [tab, setTab] = useState<TabKey>('watchlist');

  const fetchWatchlist = useCallback(
    async (signal: AbortSignal) => {
      if (!token) {
        return null;
      }
      try {
        const res = await api.watchlist.list({token, limit: 50, signal});
        return res.data.map(webseriesToContent);
      } catch (err: any) {
        // If the backend returns a 404 (endpoint not implemented yet),
        // gracefully return an empty array to show the empty watchlist state.
        if (err?.status === 404 || err?.message?.includes('404')) {
          return [];
        }
        throw err;
      }
    },
    [token],
  );

  const {data: watchlistItems, loading, error, reload} = useApi(
    fetchWatchlist,
    [token, tab],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>PLAY DRAMA</Text>
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
        loading && (!watchlistItems || !watchlistItems.length) ? (
          <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, justifyContent: 'center', marginTop: spacing.md, paddingHorizontal: spacing.md}}>
            <MovieCardSkeleton width={cardWidth} />
            <MovieCardSkeleton width={cardWidth} />
            <MovieCardSkeleton width={cardWidth} />
            <MovieCardSkeleton width={cardWidth} />
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Couldn't load watchlist</Text>
            <Text style={styles.stateBody}>{error}</Text>
            <Pressable onPress={reload} style={styles.browseBtn}>
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
                  onPress={() => navigation.navigate('MovieDetails', {id: item.id})}
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
              style={({pressed}) => [styles.browseBtn, pressed && {opacity: 0.75}]}>
              <Text style={styles.browseText}>Browse Web Series</Text>
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
            style={({pressed}) => [styles.browseBtn, pressed && {opacity: 0.75}]}>
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  editText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
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
});

