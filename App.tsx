import React, {useEffect, useRef, useState} from 'react';
import {Platform, StatusBar} from 'react-native';
import {
  NavigationContainer,
  DarkTheme,
  createNavigationContainerRef,
} from '@react-navigation/native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {RootNavigator, RootStackParamList} from './src/navigation/RootNavigator';
import {AuthProvider} from './src/context/AuthContext';
import {NotificationsProvider} from './src/context/NotificationsContext';
import {colors} from './src/theme/colors';
import {
  initPushHandlers,
  setNotificationTapHandler,
  NotificationTapPayload,
} from './src/lib/pushNotifications';
import {AppUpdateModal, UpdateType} from './src/components/AppUpdateModal';
import {api, type AppConfig} from './src/lib/api';
import pkg from './package.json';

const CURRENT_APP_VERSION = pkg.version || '0.0.1';

function isVersionLower(current: string, target?: string): boolean {
  if (!target) return false;
  const c = current.split('.').map(Number);
  const t = target.split('.').map(Number);
  for (let i = 0; i < Math.max(c.length, t.length); i++) {
    const cv = c[i] || 0;
    const tv = t[i] || 0;
    if (cv < tv) return true;
    if (cv > tv) return false;
  }
  return false;
}

function AppUpdateManager() {
  const [updateModal, setUpdateModal] = useState<{
    visible: boolean;
    type: UpdateType;
    latestVersion?: string;
    maintenanceMessage?: string;
  }>({visible: false, type: 'optional'});

  useEffect(() => {
    let unmounted = false;
    api.config
      .get()
      .then((cfg: AppConfig) => {
        if (unmounted || !cfg) return;

        // 1. Maintenance Mode
        if (cfg.maintenance?.enabled) {
          setUpdateModal({
            visible: true,
            type: 'maintenance',
            maintenanceMessage: cfg.maintenance.message,
          });
          return;
        }

        const platformKey = Platform.OS === 'ios' ? 'ios' : 'android';
        const minVer = cfg.minSupportedVersion?.[platformKey];
        const latestVer = cfg.latestVersion?.[platformKey];

        // 2. Force Upgrade
        if (cfg.forceUpgrade || isVersionLower(CURRENT_APP_VERSION, minVer)) {
          setUpdateModal({
            visible: true,
            type: 'force',
            latestVersion: latestVer || minVer,
          });
          return;
        }

        // 3. Optional Upgrade
        if (isVersionLower(CURRENT_APP_VERSION, latestVer)) {
          setUpdateModal({
            visible: true,
            type: 'optional',
            latestVersion: latestVer,
          });
        }
      })
      .catch(() => {
        // Silently ignore config network errors
      });

    return () => {
      unmounted = true;
    };
  }, []);

  return (
    <AppUpdateModal
      visible={updateModal.visible}
      type={updateModal.type}
      latestVersion={updateModal.latestVersion}
      maintenanceMessage={updateModal.maintenanceMessage}
      onDismiss={() => setUpdateModal(v => ({...v, visible: false}))}
    />
  );
}

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.textPrimary,
    primary: colors.brand,
    border: colors.divider,
  },
};

// A single ref shared with the notification tap handler. Kept at module
// scope (rather than inside the component) so the handler installed in
// index.js's headless task can reach it via imports if we ever need to.
const navRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Route a notification tap to the correct screen. Falls back to the
 * Notifications list when we don't know how to interpret the payload.
 */
function handleNotificationTap(payload: NotificationTapPayload) {
  if (!navRef.isReady()) return;

  // Prefer explicit routing hints over URL parsing.
  if (payload.webSeriesId) {
    navRef.navigate('MovieDetails', {id: payload.webSeriesId});
    return;
  }
  if (payload.episodeId) {
    navRef.navigate('Player', {id: payload.episodeId});
    return;
  }
  if (payload.deepLink) {
    // Simple cinestream://webseries/<id> and cinestream://player/<id>
    // handling. Anything richer should get its own case above.
    const match = /^cinestream:\/\/([^/]+)\/([^?#]+)/.exec(payload.deepLink);
    if (match) {
      const [, kind, id] = match;
      if (kind === 'webseries') {
        navRef.navigate('MovieDetails', {id});
        return;
      }
      if (kind === 'player') {
        navRef.navigate('Player', {id});
        return;
      }
    }
  }
  navRef.navigate('Notifications');
}

function App() {
  // Wire foreground FCM handlers exactly once per JS lifetime.
  const teardownRef = useRef<null | (() => void)>(null);
  useEffect(() => {
    teardownRef.current = initPushHandlers();
    return () => {
      teardownRef.current?.();
      teardownRef.current = null;
    };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <AuthProvider>
        <NotificationsProvider>
          <NavigationContainer
            ref={navRef}
            theme={navTheme}
            onReady={() => {
              // The tap handler needs a live navigation ref. Registering it
              // here (rather than in useEffect) means any push tap that
              // arrives *before* the first render still lands correctly —
              // pushNotifications.ts queues taps until a handler exists.
              setNotificationTapHandler(handleNotificationTap);
            }}>
            <RootNavigator />
            <AppUpdateManager />
          </NavigationContainer>
        </NotificationsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

export default App;
