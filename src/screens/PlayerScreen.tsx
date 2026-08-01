import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
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
  ExpandIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  RewindIcon,
  SubtitlesIcon,
} from '../components/icons';
import {api, type Episode as ApiEpisode, type Webseries} from '../lib/api';
import {useApi} from '../lib/useApi';
import {useAuth} from '../context/AuthContext';
import type {RootStackParamList} from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

type PlayerBundle = {
  series: Webseries;
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

  const fetchBundle = useCallback(
    async (signal: AbortSignal): Promise<PlayerBundle> => {
      if (!token) {
        throw new Error('Not signed in');
      }
      const series = await api.webseries.get({token, id, signal});
      let firstEpisode: ApiEpisode | null = null;
      try {
        const eps = await api.episodes.list({
          token,
          webSeriesId: id,
          limit: 1,
          signal,
        });
        firstEpisode =
          eps.data.find(e => e.status === 'COMPLETED') ?? eps.data[0] ?? null;
      } catch {
        // Episodes are optional — playback still works from series metadata
        // when no episodes exist yet (e.g. a movie webseries).
      }
      return {series, firstEpisode};
    },
    [token, id],
  );

  const {data, loading, error, reload} = useApi(fetchBundle, [token, id]);

  const totalSec =
    (data?.firstEpisode?.duration && data.firstEpisode.duration > 0
      ? data.firstEpisode.duration
      : null) ?? DEFAULT_TOTAL_SEC;

  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const fade = useRef(new Animated.Value(1)).current;
  const videoRef = useRef<any>(null);

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
    return (
      <View style={styles.stateRoot}>
        <StatusBar hidden />
        <Text style={styles.stateText}>{error}</Text>
        <Pressable onPress={reload} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
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
            resizeMode="cover"
            paused={!playing}
            volume={1.0}
            onProgress={e => setCurrent(e.currentTime)}
            onEnd={() => setPlaying(false)}
          />
        ) : backdrop ? (
          <Image
            source={{uri: backdrop}}
            style={styles.backdrop}
            resizeMode="cover"
          />
        ) : null}
        <View style={styles.dim} />
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
          <Pressable style={styles.iconBtn} hitSlop={8}>
            <CastIcon size={22} />
          </Pressable>
        </SafeAreaView>

        <View style={styles.centerControls}>
          <Pressable
            onPress={() => handleSeek(Math.max(0, current - 10))}
            style={styles.sideBtn}
            hitSlop={12}>
            <RewindIcon size={30} />
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
            <ForwardIcon size={30} />
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
            <View style={styles.bottomIconGroup}>
              <SubtitlesIcon size={20} />
              <Text style={styles.bottomIconLabel}>UHD HD 4K</Text>
            </View>
            <View style={styles.bottomIconGroup}>
              <Text style={styles.bottomIconLabel}>STEREO</Text>
            </View>
            <Pressable style={styles.bottomIconGroup} hitSlop={6}>
              <ExpandIcon size={20} />
            </Pressable>
          </View>
        </SafeAreaView>
      </Animated.View>
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
  retryText: {color: colors.brandText, fontSize: 14, fontWeight: '700'},
  backLink: {padding: spacing.sm},
  backText: {color: colors.textMuted, fontSize: 13},
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  dim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  topTitleWrap: {flex: 1, alignItems: 'center'},
  topTitle: {color: colors.textPrimary, fontSize: 14, fontWeight: '700'},
  topSub: {color: colors.textMuted, fontSize: 11, marginTop: 2},
  centerControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 44,
  },
  sideBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 30,
    shadowOffset: {width: 0, height: 10},
    elevation: 12,
  },
  notReady: {
    position: 'absolute',
    bottom: 140,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  notReadyText: {
    color: colors.textPrimary,
    fontSize: 12,
    opacity: 0.85,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  bottomBar: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  time: {
    color: colors.textPrimary,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    minWidth: 50,
    textAlign: 'center',
  },
  track: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
  },
  trackFill: {
    height: 3,
    backgroundColor: colors.brand,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    top: -5,
    marginLeft: -6,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.brand,
    shadowColor: colors.brand,
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  bottomIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  bottomIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bottomIconLabel: {
    color: colors.textPrimary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.9,
  },
});
