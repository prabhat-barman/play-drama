import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
  Modal,
  Pressable,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {colors, radius, spacing} from '../theme/colors';
import {
  CastIcon,
  CloseIcon,
  EpisodesListIcon,
  ExpandIcon,
  ForwardIcon,
  HeartIcon,
  NextEpisodeIcon,
  PauseIcon,
  PlayIcon,
  PrevEpisodeIcon,
  RewindIcon,
  ShareIcon,
  SubtitlesIcon,
} from '../components/icons';
import {api, type Episode as ApiEpisode, type Webseries} from '../lib/api';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

type PlayerBundle = {
  series: Webseries;
  episodes: ApiEpisode[];
  firstEpisode: ApiEpisode | null;
};

const DEFAULT_TOTAL_SEC = 90 * 60;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export function PlayerScreen({navigation, route}: Props) {
  const {token} = useAuth();
  const id = route.params.id;
  const targetEpisodeId = route.params.episodeId;

  const [isFavorited, setIsFavorited] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [episodesModalVisible, setEpisodesModalVisible] = useState(false);
  const [castModalVisible, setCastModalVisible] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState<string | null>(null);

  const fetchBundle = useCallback(
    async (signal: AbortSignal): Promise<PlayerBundle> => {
      if (!token) {
        throw new Error('Not signed in');
      }
      const series = await api.webseries.get({token, id, signal});
      let selectedEpisode: ApiEpisode | null = null;
      let episodesList: ApiEpisode[] = [];

      try {
        const eps = await api.episodes.list({
          token,
          webSeriesId: id,
          limit: 100,
          signal,
        });
        episodesList = eps.data ?? [];

        if (targetEpisodeId) {
          selectedEpisode =
            episodesList.find(
              e => e._id === targetEpisodeId || (e as any).id === targetEpisodeId,
            ) ?? null;
        }
        if (!selectedEpisode) {
          selectedEpisode =
            episodesList.find(e => e.status === 'COMPLETED') ?? episodesList[0] ?? null;
        }
      } catch {
        if (targetEpisodeId) {
          try {
            selectedEpisode = await api.episodes.get({
              token,
              id: targetEpisodeId,
              signal,
            });
          } catch {
            // Silently ignore
          }
        }
      }

      if (selectedEpisode) {
        try {
          const fullEp = await api.episodes.get({
            token,
            id: selectedEpisode._id || (selectedEpisode as any).id,
            signal,
          });
          if (fullEp) {
            selectedEpisode = fullEp;
            const idx = episodesList.findIndex(
              e => (e._id || (e as any).id) === (fullEp._id || (fullEp as any).id),
            );
            if (idx !== -1) {
              episodesList[idx] = fullEp;
            }
          }
        } catch (e) {
          console.warn('Failed to fetch full episode details', e);
        }
      }

      return {series, episodes: episodesList, firstEpisode: selectedEpisode};
    },
    [token, id, targetEpisodeId],
  );

  const {data, loading, error, errorStatus, reload} = useApi(fetchBundle, [token, id, targetEpisodeId]);

  const totalSec =
    (data?.firstEpisode?.duration && data.firstEpisode.duration > 0
      ? data.firstEpisode.duration
      : null) ?? DEFAULT_TOTAL_SEC;

  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<any>(null);

  const episodes = data?.episodes ?? [];
  const currentEpIndex = episodes.findIndex(
    e =>
      (e._id || (e as any).id) ===
      (data?.firstEpisode?._id || (data?.firstEpisode as any)?.id),
  );

  const hasNextEp = currentEpIndex >= 0 && currentEpIndex < episodes.length - 1;
  const hasPrevEp = currentEpIndex > 0;

  const handleSelectEpisode = (ep: ApiEpisode) => {
    setEpisodesModalVisible(false);
    navigation.replace('Player', {
      id: data?.series?._id || (data?.series as any)?.id || id,
      episodeId: ep._id || (ep as any).id,
    });
  };

  const handleNextEpisode = () => {
    if (hasNextEp) {
      handleSelectEpisode(episodes[currentEpIndex + 1]);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrevEp) {
      handleSelectEpisode(episodes[currentEpIndex - 1]);
    }
  };

  const handleShare = async () => {
    if (!data?.series) return;
    try {
      await Share.share({
        title: data.series.title,
        message: `Watch ${data.series.title}${
          data.firstEpisode ? ` - Episode ${data.firstEpisode.episodeNumber}` : ''
        } on PlayDrama! https://playdrama.app/watch/${id}`,
      });
    } catch {
      // User cancelled
    }
  };

  const handleToggleFavorite = async () => {
    if (!token || !data?.series) return;
    const seriesId = data.series._id || (data.series as any).id || id;
    const nextState = !isFavorited;
    setIsFavorited(nextState);
    try {
      if (nextState) {
        await api.watchlist.add({token, webSeriesId: seriesId});
      } else {
        await api.watchlist.remove({token, webSeriesId: seriesId});
      }
    } catch {
      setIsFavorited(!nextState);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrent(newTime);
    videoRef.current?.seek?.(newTime);
  };

  useEffect(() => {
    Animated.timing(fade, {
      toValue: showControls ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showControls, fade]);

  useEffect(() => {
    if (!showControls) {
      return;
    }
    const t = setTimeout(() => setShowControls(false), 4500);
    return () => clearTimeout(t);
  }, [showControls, current]);

  if (loading && !data) {
    return (
      <View style={styles.stateRoot}>
        <StatusBar hidden />
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (error && !data) {
    const isUnpublished = errorStatus === 403;
    return (
      <View style={styles.stateRoot}>
        <StatusBar hidden />
        <Text style={styles.stateText}>
          {isUnpublished ? 'Access denied: Content not available' : error}
        </Text>
        {!isUnpublished ? (
          <Pressable onPress={reload} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => navigation.goBack()} style={styles.backLink}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const {series, firstEpisode} = data;
  const remaining = Math.max(totalSec - current, 0);
  const progress = totalSec > 0 ? current / totalSec : 0;
  const backdrop = firstEpisode?.thumbnail || series.coverImage || series.thumbnail || '';
  const streamUrl = firstEpisode?.videoUrl || (series as any).videoUrl;
  const canPlay = !!streamUrl;
  const subLine = firstEpisode
    ? `Episode ${firstEpisode.episodeNumber}${firstEpisode.title ? ` · ${firstEpisode.title}` : ''}`
    : series.language
      ? series.language.toUpperCase()
      : '';

  return (
    <View style={styles.root}>
      <StatusBar hidden />

      <Pressable
        onPress={() => setShowControls(v => !v)}
        style={StyleSheet.absoluteFill}>
        {canPlay && streamUrl ? (
          <Video
            ref={videoRef}
            source={{uri: streamUrl}}
            style={StyleSheet.absoluteFill}
            resizeMode={isFullscreen ? 'cover' : 'contain'}
            paused={!playing}
            volume={1.0}
            onProgress={e => setCurrent(e.currentTime)}
            onEnd={() => setPlaying(false)}
            onLoadStart={() => {
              setIsVideoLoading(true);
              setVideoError(null);
            }}
            onLoad={() => {
              setIsVideoLoading(false);
            }}
            onBuffer={({isBuffering}) => {
              setIsVideoLoading(isBuffering);
            }}
            onError={(err) => {
              setIsVideoLoading(false);
              setVideoError(err.error?.localizedDescription || 'Failed to load video');
            }}
          />
        ) : backdrop ? (
          <Image
            source={{uri: backdrop}}
            style={styles.backdrop}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.dim} />

        {/* Video loading/buffering indicator */}
        {isVideoLoading && playing && !videoError ? (
          <View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.3)', zIndex: 1}]}>
            <ActivityIndicator size="large" color={colors.brand} />
          </View>
        ) : null}

        {/* Video error screen */}
        {videoError ? (
          <View style={[StyleSheet.absoluteFill, {alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', padding: 24, zIndex: 5}]}>
            <Text style={{color: colors.textPrimary, fontSize: 14, textAlign: 'center', marginBottom: 16}}>{videoError}</Text>
            <Pressable
              onPress={() => {
                setVideoError(null);
                setIsVideoLoading(true);
                videoRef.current?.seek?.(current);
                setPlaying(false);
                setTimeout(() => setPlaying(true), 100);
              }}
              style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </Pressable>

      <Animated.View
        pointerEvents={showControls ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFill, {opacity: fade}]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.9)']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView edges={['top']} style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.iconBtn}
            hitSlop={8}>
            <CloseIcon size={22} />
          </Pressable>
          <View style={styles.topTitleWrap}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {series.title}
            </Text>
            {subLine ? (
              <Text style={styles.topSub} numberOfLines={1}>
                {subLine}
              </Text>
            ) : null}
          </View>

          <View style={styles.topRightActions}>
            <Pressable
              onPress={handleShare}
              style={styles.iconBtn}
              hitSlop={8}>
              <ShareIcon size={20} />
            </Pressable>
            <Pressable
              onPress={handleToggleFavorite}
              style={styles.iconBtn}
              hitSlop={8}>
              <HeartIcon
                size={20}
                color={isFavorited ? colors.brand : colors.textPrimary}
                filled={isFavorited}
              />
            </Pressable>
            <Pressable
              onPress={() => setCastModalVisible(true)}
              style={styles.iconBtn}
              hitSlop={8}>
              <CastIcon size={20} />
            </Pressable>
          </View>
        </SafeAreaView>

        <View style={styles.centerControls}>
          <Pressable
            onPress={handlePrevEpisode}
            disabled={!hasPrevEp}
            style={[styles.sideBtn, !hasPrevEp && styles.disabledBtn]}
            hitSlop={12}>
            <PrevEpisodeIcon size={26} color={hasPrevEp ? colors.textPrimary : colors.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => handleSeek(Math.max(0, current - 10))}
            style={styles.sideBtn}
            hitSlop={12}>
            <RewindIcon size={28} />
          </Pressable>

          <Pressable
            onPress={() => setPlaying(p => !p)}
            style={styles.playBtn}
            hitSlop={12}
            disabled={!canPlay}>
            {playing ? (
              <PauseIcon size={30} color={colors.background} />
            ) : (
              <PlayIcon size={30} color={colors.background} />
            )}
          </Pressable>

          <Pressable
            onPress={() => handleSeek(Math.min(totalSec, current + 10))}
            style={styles.sideBtn}
            hitSlop={12}>
            <ForwardIcon size={28} />
          </Pressable>

          <Pressable
            onPress={handleNextEpisode}
            disabled={!hasNextEp}
            style={[styles.sideBtn, !hasNextEp && styles.disabledBtn]}
            hitSlop={12}>
            <NextEpisodeIcon size={26} color={hasNextEp ? colors.textPrimary : colors.textMuted} />
          </Pressable>
        </View>

        {!canPlay ? (
          <View style={styles.notReady}>
            <Text style={styles.notReadyText}>
              {firstEpisode
                ? 'This episode is not ready to stream yet.'
                : 'No streamable episode available yet.'}
            </Text>
          </View>
        ) : null}

        <SafeAreaView edges={['bottom']} style={styles.bottomBar}>
          <View style={styles.progressRow}>
            <Text style={styles.time}>{formatTime(current)}</Text>
            <View style={styles.track}>
              <View style={[styles.trackFill, {width: `${progress * 100}%`}]} />
              <View
                style={[
                  styles.thumb,
                  {left: `${Math.min(progress * 100, 99)}%`},
                ]}
              />
            </View>
            <Text style={styles.time}>-{formatTime(remaining)}</Text>
          </View>

          <View style={styles.bottomIcons}>
            {episodes.length > 0 ? (
              <Pressable
                onPress={() => setEpisodesModalVisible(true)}
                style={styles.bottomIconGroup}
                hitSlop={6}>
                <EpisodesListIcon size={20} />
                <Text style={styles.bottomIconLabel}>Episodes ({episodes.length})</Text>
              </Pressable>
            ) : null}
            <View style={styles.bottomIconGroup}>
              <SubtitlesIcon size={18} />
              <Text style={styles.bottomIconLabel}>UHD 4K</Text>
            </View>
            <Pressable
              onPress={() => setIsFullscreen(v => !v)}
              style={styles.bottomIconGroup}
              hitSlop={6}>
              <ExpandIcon size={20} color={isFullscreen ? colors.brand : colors.textPrimary} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>

      {/* Episodes List Modal */}
      <Modal
        visible={episodesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEpisodesModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEpisodesModalVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Episodes</Text>
              <Pressable
                onPress={() => setEpisodesModalVisible(false)}
                hitSlop={8}>
                <CloseIcon size={20} />
              </Pressable>
            </View>
            <FlatList
              data={episodes}
              keyExtractor={(item, idx) => item._id || (item as any).id || `ep-${idx}`}
              renderItem={({item}) => {
                const isActive =
                  (item._id || (item as any).id) ===
                  (firstEpisode?._id || (firstEpisode as any)?.id);
                return (
                  <Pressable
                    onPress={() => handleSelectEpisode(item)}
                    style={[styles.modalEpRow, isActive && styles.modalEpRowActive]}>
                    <Image
                      source={{uri: item.thumbnail || backdrop}}
                      style={styles.modalEpThumb}
                    />
                    <View style={styles.modalEpBody}>
                      <Text
                        style={[
                          styles.modalEpTitle,
                          isActive && styles.modalEpTitleActive,
                        ]}>
                        Episode {item.episodeNumber}: {item.title}
                      </Text>
                      {item.description ? (
                        <Text style={styles.modalEpDesc} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                    </View>
                    {isActive ? (
                      <View style={styles.playingBadge}>
                        <Text style={styles.playingBadgeText}>PLAYING</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>

      {/* Cast Modal */}
      <Modal
        visible={castModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setCastModalVisible(false)}>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setCastModalVisible(false)}>
          <View style={styles.castModalContent}>
            <CastIcon size={36} color={colors.brand} />
            <Text style={styles.castTitle}>Connect to a Device</Text>
            <Text style={styles.castDesc}>
              Searching for Chromecast or AirPlay TVs on your network...
            </Text>
            <ActivityIndicator color={colors.brand} style={{marginTop: 12}} />
            <Pressable
              onPress={() => setCastModalVisible(false)}
              style={styles.castCloseBtn}>
              <Text style={styles.castCloseText}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#000'},
  stateRoot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: spacing.lg,
    gap: spacing.md,
  },
  stateText: {
    color: colors.textPrimary,
    fontSize: 14,
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
    fontSize: 14,
    fontWeight: '700',
  },
  backLink: {padding: spacing.sm},
  backText: {color: colors.textMuted, fontSize: 13},
  backdrop: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  dim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  topTitleWrap: {flex: 1},
  topTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  topSub: {
    color: colors.textMuted,
    fontSize: 12,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  sideBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  disabledBtn: {
    opacity: 0.3,
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notReady: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  notReadyText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  track: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
  },
  trackFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: colors.brand,
  },
  thumb: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.brand,
    marginTop: -4,
  },
  bottomIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bottomIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
  },
  bottomIconLabel: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '60%',
    padding: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  modalEpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  modalEpRowActive: {
    backgroundColor: 'rgba(156,39,176,0.15)',
    borderRadius: radius.md,
    paddingHorizontal: spacing.xs,
  },
  modalEpThumb: {
    width: 80,
    height: 50,
    borderRadius: radius.sm,
    backgroundColor: '#222',
  },
  modalEpBody: {
    flex: 1,
  },
  modalEpTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  modalEpTitleActive: {
    color: colors.brand,
    fontWeight: '700',
  },
  modalEpDesc: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  playingBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  playingBadgeText: {
    color: colors.brandText,
    fontSize: 10,
    fontWeight: '800',
  },
  castModalContent: {
    margin: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  castTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  castDesc: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  castCloseBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  castCloseText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});
