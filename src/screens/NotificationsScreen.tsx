import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ListRenderItemInfo,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {subscriptionPlans} from '../data/placeholders';
import {
  ChevronLeftIcon,
  CheckIcon,
  CrownIcon,
  SlidersIcon,
} from '../components/icons';
import {PrimaryButton} from '../components/PrimaryButton';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {ApiError, api, type AppNotification} from '../lib/api';
import {useAuth} from '../context/AuthContext';
import {useNotificationsBadge} from '../context/NotificationsContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;
type Tab = 'notifications' | 'premium';

const PAGE_LIMIT = 30;

export function NotificationsScreen({navigation}: Props) {
  const {token} = useAuth();
  const {refresh: refreshBadge, markLocal} = useNotificationsBadge();

  const [tab, setTab] = useState<Tab>('notifications');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(
    async (opts: {silent?: boolean} = {}) => {
      if (!token) return;
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        const res = await api.notifications.list({
          token,
          page: 1,
          limit: PAGE_LIMIT,
        });
        setItems(res.notifications);
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
            ? err.message
            : 'Could not load notifications.';
        setError(message);
      } finally {
        if (!opts.silent) setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchAll({silent: true}).finally(() => {
      void refreshBadge();
    });
  }, [fetchAll, refreshBadge]);

  const grouped = useMemo(() => groupByDay(items), [items]);
  const sections = useMemo(() => flattenSections(grouped), [grouped]);

  const onMarkAllRead = useCallback(async () => {
    if (!token) return;
    const unreadIds = items.filter(n => !n.isRead).map(n => n.id);
    if (unreadIds.length === 0) return;
    // Optimistic update — flip local state first, roll back on failure.
    setItems(prev => prev.map(n => (n.isRead ? n : {...n, isRead: true})));
    markLocal(-unreadIds.length);
    try {
      await api.notifications.markRead({token, ids: unreadIds});
      void refreshBadge();
    } catch (err) {
      // Roll back local state.
      setItems(prev =>
        prev.map(n => (unreadIds.includes(n.id) ? {...n, isRead: false} : n)),
      );
      void refreshBadge();
      const message = err instanceof Error ? err.message : 'Could not update';
      Alert.alert('Update failed', message);
    }
  }, [items, markLocal, refreshBadge, token]);

  const onDelete = useCallback(
    (n: AppNotification) => {
      if (!token) return;
      Alert.alert('Delete notification?', n.title, [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const wasUnread = !n.isRead;
            setItems(prev => prev.filter(x => x.id !== n.id));
            if (wasUnread) markLocal(-1);
            try {
              await api.notifications.delete({token, id: n.id});
              void refreshBadge();
            } catch (err) {
              // Reinstate on failure so the user isn't confused.
              setItems(prev => [n, ...prev]);
              if (wasUnread) markLocal(1);
              const message =
                err instanceof Error ? err.message : 'Could not delete';
              Alert.alert('Delete failed', message);
            }
          },
        },
      ]);
    },
    [markLocal, refreshBadge, token],
  );

  const onTapCard = useCallback(
    async (n: AppNotification) => {
      if (!token) return;
      if (!n.isRead) {
        // Mark this single item read (optimistic).
        setItems(prev =>
          prev.map(x => (x.id === n.id ? {...x, isRead: true} : x)),
        );
        markLocal(-1);
        try {
          await api.notifications.markRead({token, ids: [n.id]});
        } catch {
          // rollback
          setItems(prev =>
            prev.map(x => (x.id === n.id ? {...x, isRead: false} : x)),
          );
          markLocal(1);
        }
      }
      routeFromNotification(n, navigation);
    },
    [markLocal, navigation, token],
  );

  const unreadCount = useMemo(
    () => items.filter(n => !n.isRead).length,
    [items],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.iconBtn}
          hitSlop={8}>
          <ChevronLeftIcon />
        </Pressable>
        <Text style={styles.brand}>PLAY DRAMA</Text>
        <Pressable
          style={styles.iconBtn}
          hitSlop={8}
          onPress={onMarkAllRead}
          disabled={unreadCount === 0}>
          <SlidersIcon
            size={20}
            color={
              unreadCount === 0 ? colors.textMuted : colors.textPrimary
            }
          />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('notifications')}
          style={[styles.tab, tab === 'notifications' && styles.tabOn]}>
          <Text
            style={[
              styles.tabText,
              tab === 'notifications' && styles.tabTextOn,
            ]}>
            Notifications{unreadCount > 0 ? `  ·  ${unreadCount}` : ''}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('premium')}
          style={[styles.tab, tab === 'premium' && styles.tabOn]}>
          <CrownIcon
            size={14}
            color={tab === 'premium' ? colors.brandText : '#ffb400'}
          />
          <Text style={[styles.tabText, tab === 'premium' && styles.tabTextOn]}>
            Premium
          </Text>
        </Pressable>
      </View>

      {tab === 'notifications' ? (
        loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable
              onPress={() => void fetchAll()}
              style={styles.retryBtn}
              hitSlop={8}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={item =>
              item.kind === 'header' ? `h:${item.label}` : `n:${item.n.id}`
            }
            renderItem={renderRow(onTapCard, onDelete)}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No notifications yet</Text>
                <Text style={styles.emptyBody}>
                  We&apos;ll let you know when there&apos;s something new.
                </Text>
              </View>
            }
            contentContainerStyle={
              sections.length === 0 ? styles.emptyScroll : styles.scroll
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.brand}
              />
            }
          />
        )
      ) : (
        <View style={styles.premiumWrap}>
          <View style={styles.premiumHero}>
            <CrownIcon size={22} color="#ffb400" />
            <Text style={styles.premiumTitle}>Play Drama Premium</Text>
            <Text style={styles.premiumSub}>
              Unlock 4K UHD, unlimited downloads, and an ad-free cinematic
              experience across all your devices.
            </Text>
          </View>

          {subscriptionPlans.map(p => (
            <View
              key={p.id}
              style={[styles.planCard, p.highlighted && styles.planCardOn]}>
              <View style={styles.planTop}>
                <Text style={styles.planName}>{p.name}</Text>
                {p.highlighted ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>MOST POPULAR</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.priceRow}>
                <Text style={styles.price}>{p.price}</Text>
                <Text style={styles.perInterval}>/ {p.interval}</Text>
              </View>
              {p.perks.map(perk => (
                <View key={perk} style={styles.perkRow}>
                  <CheckIcon size={14} color="#5ee089" />
                  <Text style={styles.perkText}>{perk}</Text>
                </View>
              ))}
            </View>
          ))}

          <PrimaryButton label="Start 7-day free trial" />
          <Text style={styles.legal}>
            Auto-renews at plan price after trial. Cancel anytime.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ------------------------------
// Rendering helpers
// ------------------------------

type Section =
  | {kind: 'header'; label: string}
  | {kind: 'row'; n: AppNotification};

function renderRow(
  onTap: (n: AppNotification) => void,
  onDelete: (n: AppNotification) => void,
) {
  return ({item}: ListRenderItemInfo<Section>) => {
    if (item.kind === 'header') {
      return <Text style={styles.groupLabel}>{item.label.toUpperCase()}</Text>;
    }
    const n = item.n;
    return (
      <Pressable
        onPress={() => onTap(n)}
        onLongPress={() => onDelete(n)}
        style={[styles.card, !n.isRead && styles.cardUnread]}>
        {n.imageUrl ? (
          <Image source={{uri: n.imageUrl}} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgFallback]}>
            <Text style={styles.cardImgFallbackText}>C</Text>
          </View>
        )}
        <View style={styles.cardBody}>
          <View style={styles.cardTopRow}>
            <View
              style={[
                styles.chip,
                n.type === 'new_release' && styles.chipNew,
                n.type === 'trending' && styles.chipTrending,
                n.type === 'recommendation' && styles.chipRec,
                n.type === 'reminder' && styles.chipReminder,
                n.type === 'subscription' && styles.chipTrending,
                n.type === 'system' && styles.chipRec,
              ]}>
              <Text style={styles.chipText}>{chipLabel(n.type)}</Text>
            </View>
            {!n.isRead ? <View style={styles.dotUnread} /> : null}
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {n.title}
          </Text>
          <Text style={styles.cardBodyText} numberOfLines={2}>
            {n.message}
          </Text>
          <Text style={styles.cardTime}>{relativeTime(n.createdAt)}</Text>
        </View>
      </Pressable>
    );
  };
}

function chipLabel(t: AppNotification['type']) {
  switch (t) {
    case 'new_release':
      return 'NEW RELEASE';
    case 'trending':
      return 'TRENDING';
    case 'recommendation':
      return 'FOR YOU';
    case 'reminder':
      return 'REMINDER';
    case 'subscription':
      return 'SUBSCRIPTION';
    case 'system':
      return 'SYSTEM';
    case 'upload':
      return 'UPLOAD';
    case 'content_approval':
      return 'APPROVAL';
    default:
      return 'UPDATE';
  }
}

function routeFromNotification(
  n: AppNotification,
  navigation: NativeStackScreenProps<
    RootStackParamList,
    'Notifications'
  >['navigation'],
) {
  const data = (n.data ?? {}) as Record<string, unknown>;
  const webSeriesId = typeof data.webSeriesId === 'string' ? data.webSeriesId : undefined;
  const episodeId = typeof data.episodeId === 'string' ? data.episodeId : undefined;
  if (webSeriesId) {
    navigation.navigate('MovieDetails', {id: webSeriesId});
    return;
  }
  if (episodeId) {
    navigation.navigate('Player', {id: episodeId});
    return;
  }
  if (n.deepLink) {
    const match = /^cinestream:\/\/([^/]+)\/([^?#]+)/.exec(n.deepLink);
    if (match) {
      const [, kind, id] = match;
      if (kind === 'webseries') {
        navigation.navigate('MovieDetails', {id});
        return;
      }
      if (kind === 'player') {
        navigation.navigate('Player', {id});
        return;
      }
    }
  }
}

// Group notifications by "Today" / "Yesterday" / date-string. Assumes the
// list is already sorted newest-first (backend orders by createdAt desc).
function groupByDay(items: AppNotification[]): Array<{
  label: string;
  items: AppNotification[];
}> {
  const groups: Array<{label: string; items: AppNotification[]}> = [];
  const dayKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  };
  const now = new Date();
  const todayKey = dayKey(now.toISOString());
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayKey = dayKey(yesterday.toISOString());

  let currentKey: string | null = null;
  let currentLabel = '';
  for (const n of items) {
    const key = dayKey(n.createdAt);
    if (key !== currentKey) {
      currentKey = key;
      currentLabel =
        key === todayKey
          ? 'Today'
          : key === yesterdayKey
          ? 'Yesterday'
          : new Date(n.createdAt).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
      groups.push({label: currentLabel, items: []});
    }
    groups[groups.length - 1].items.push(n);
  }
  return groups;
}

function flattenSections(
  groups: Array<{label: string; items: AppNotification[]}>,
): Section[] {
  const out: Section[] = [];
  for (const g of groups) {
    out.push({kind: 'header', label: g.label});
    for (const n of g.items) out.push({kind: 'row', n});
  }
  return out;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  if (diffMs < 60_000) return 'Just now';
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    height: 34,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
  },
  tabOn: {backgroundColor: colors.brand, borderColor: colors.brand},
  tabText: {color: colors.textMuted, fontSize: 12, fontWeight: '700'},
  tabTextOn: {color: colors.brandText},
  scroll: {paddingBottom: spacing.xxl + 40},
  emptyScroll: {flexGrow: 1, justifyContent: 'center'},
  groupLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginLeft: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  card: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm + 2,
    borderRadius: radius.md,
    backgroundColor: colors.glassBg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    gap: spacing.md,
  },
  cardUnread: {borderColor: 'rgba(155,89,182,0.35)'},
  cardImg: {
    width: 60,
    height: 60,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
  },
  cardImgFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brand,
  },
  cardImgFallbackText: {
    color: colors.brandText,
    fontSize: 22,
    fontWeight: '900',
  },
  cardBody: {flex: 1},
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipNew: {backgroundColor: 'rgba(155,89,182,0.22)'},
  chipTrending: {backgroundColor: 'rgba(255,180,0,0.2)'},
  chipRec: {backgroundColor: 'rgba(80,180,255,0.2)'},
  chipReminder: {backgroundColor: 'rgba(94,224,137,0.2)'},
  chipText: {
    color: colors.textPrimary,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  dotUnread: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  cardTitle: {color: colors.textPrimary, fontSize: 13, fontWeight: '700'},
  cardBodyText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  cardTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 6,
    opacity: 0.8,
  },
  premiumWrap: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  premiumHero: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 8,
  },
  premiumTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  premiumSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: spacing.md,
  },
  planCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassBg,
    padding: spacing.md,
  },
  planCardOn: {
    borderColor: colors.brand,
    borderWidth: 1.5,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  planName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  badgeText: {
    color: colors.brandText,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 10,
  },
  price: {color: colors.textPrimary, fontSize: 26, fontWeight: '900'},
  perInterval: {color: colors.textMuted, fontSize: 13},
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  perkText: {color: colors.textPrimary, fontSize: 13},
  legal: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.85,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
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
    lineHeight: 18,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  errorText: {
    color: colors.textPrimary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.brand,
  },
  retryText: {
    color: colors.brandText,
    fontSize: 13,
    fontWeight: '700',
  },
});
