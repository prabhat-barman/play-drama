import React, {useState} from 'react';
import {
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
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Watchlist'>,
  NativeStackScreenProps<RootStackParamList>
>;

type TabKey = 'watchlist' | 'downloads';

// Backend endpoints for watchlist and downloads are not implemented yet —
// tracked under "Known gaps" in docs/MOBILE_API.md (WatchHistory model
// exists but no HTTP routes, no downloads model). This screen currently
// shows an empty state; wire it to real endpoints once the backend ships
// them, e.g. GET /watchlist, GET /downloads.
export function WatchlistScreen({navigation}: Props) {

  const [tab, setTab] = useState<TabKey>('watchlist');

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

      <View style={styles.state}>
        {tab === 'watchlist' ? (
          <>
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
          </>
        ) : (
          <>
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
          </>
        )}
      </View>

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
});

