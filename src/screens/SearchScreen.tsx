import React, {useCallback, useEffect, useState} from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {CompositeScreenProps} from '@react-navigation/native';
import type {BottomTabScreenProps} from '@react-navigation/bottom-tabs';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {SearchIcon} from '../components/icons';
import {MovieCard} from '../components/MovieCard';
import {MovieCardSkeleton} from '../components/Skeleton';
import {api} from '../lib/api';
import {webseriesToContent} from '../lib/adapters';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {MainTabParamList} from '../navigation/MainTabs';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Search'>,
  NativeStackScreenProps<RootStackParamList>
>;

const QUICK = ['Sci-Fi', 'Action', 'Thriller', 'Drama', 'Animation', 'Crime'];

const {width: windowWidth} = Dimensions.get('window');
const cardWidth = Math.floor((windowWidth - spacing.md * 2 - (spacing.sm + 2)) / 2);

const SEARCH_DEBOUNCE_MS = 350;

// Hoisted out of the FlatList to avoid re-creating the component every
// render (react/no-unstable-nested-components).
const ChipSeparator = () => <View style={styles.chipGap} />;

export function SearchScreen({navigation, route}: Props) {
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [genre, setGenre] = useState<string | null>(null);
  const {token} = useAuth();
  const inputRef = React.useRef<TextInput>(null);

  useEffect(() => {
    const focusParam = (route.params as any)?.focus;
    if (focusParam) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      navigation.setParams({focus: undefined} as any);
    }
  }, [route.params, navigation]);

  // Debounce user typing so we don't hammer the backend on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q]);

  const search = useCallback(
    (signal: AbortSignal) => {
      if (!token) {
        return null;
      }
      return api.webseries
        .list({
          token,
          status: 'PUBLISHED',
          search: debouncedQ || undefined,
          genre: genre ? genre.toLowerCase() : undefined,
          limit: 30,
          signal,
        })
        .then(res => res.data.map(webseriesToContent));
    },
    [token, debouncedQ, genre],
  );

  const {data, loading, error, reload} = useApi(search, [
    token,
    debouncedQ,
    genre,
  ]);

  const results = data ?? [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.brand}>PLAY DRAMA</Text>
      </View>

      <View style={styles.searchBar}>
        <SearchIcon size={20} color={colors.textMuted} />
        <TextInput
          ref={inputRef}
          value={q}
          onChangeText={setQ}
          placeholder="Search movies, shows, cast..."
          placeholderTextColor={colors.placeholder}
          style={styles.input}
          returnKeyType="search"
          autoCorrect={false}
        />
        {q ? (
          <Pressable onPress={() => setQ('')} hitSlop={8}>
            <Text style={styles.clear}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipsWrap}>
        <FlatList
          horizontal
          data={QUICK}
          keyExtractor={g => g}
          contentContainerStyle={styles.chipsRow}
          showsHorizontalScrollIndicator={false}
          ItemSeparatorComponent={ChipSeparator}
          renderItem={({item}) => {
            const selected = genre === item;
            return (
              <Pressable
                onPress={() => setGenre(selected ? null : item)}
                hitSlop={4}
                style={({pressed}) => [
                  styles.chip,
                  selected && styles.chipSelected,
                  pressed && !selected && styles.chipPressed,
                ]}>
                <Text
                  style={[
                    styles.chipText,
                    selected && styles.chipTextSelected,
                  ]}
                  numberOfLines={1}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      <FlatList
        data={results}
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
        ListEmptyComponent={
          loading ? (
            <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 2, justifyContent: 'center', marginTop: spacing.md}}>
              <MovieCardSkeleton width={cardWidth} />
              <MovieCardSkeleton width={cardWidth} />
              <MovieCardSkeleton width={cardWidth} />
              <MovieCardSkeleton width={cardWidth} />
            </View>
          ) : error ? (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>Couldn't load results</Text>
              <Text style={styles.emptyBody}>{error}</Text>
              <Pressable onPress={reload} style={styles.retryBtn}>
                <Text style={styles.retryText}>Retry</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.state}>
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptyBody}>
                Try a different search or filter.
              </Text>
            </View>
          )
        }
      />
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    paddingVertical: 0,
  },
  clear: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  // Fixed-height wrapper so the row never collapses / stretches with the
  // (variable) intrinsic size of the chip children. Prevents the "empty
  // pill outline" ghost that appears when the FlatList reserves more
  // vertical space than its content actually paints (visible on some
  // Android skins with low-contrast borders).
  chipsWrap: {
    height: 44,
    justifyContent: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipsRow: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  chipGap: {width: 8},
  chip: {
    height: 34,
    minWidth: 68,
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipPressed: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.25)',
  },
  chipSelected: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  chipText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  chipTextSelected: {
    color: colors.brandText,
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
  state: {
    alignItems: 'center',
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  emptyBody: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
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
});
