import {Platform, PermissionsAndroid} from 'react-native';
import DeviceInfo from './deviceInfo';
import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  EventType,
} from '@notifee/react-native';
import {api} from './api';
import type {DevicePlatform} from './api';

// ------------------------------
// Types
// ------------------------------

export type NotificationTapPayload = {
  deepLink?: string;
  type?: string;
  webSeriesId?: string;
  episodeId?: string;
  raw: Record<string, string>;
};

export type NotificationTapHandler = (payload: NotificationTapPayload) => void;

// ------------------------------
// Constants
// ------------------------------

const CHANNEL_ID = 'cinestream-default';
const CHANNEL_NAME = 'General notifications';

// ------------------------------
// Global tap handler registry — the app installs a single handler at
// startup and re-installs a route-aware one after navigation is ready.
// ------------------------------

let tapHandler: NotificationTapHandler | null = null;
// Queue any taps that arrive before a handler is wired (e.g. cold-start
// from a killed state before navigation has mounted). The RootNavigator
// drains this on ready.
const pendingTaps: NotificationTapPayload[] = [];

// Fires whenever a foreground FCM message is received. Used by the
// notifications badge context to refresh the unread count without waiting
// for the next 60s poll.
type MessageListener = () => void;
const messageListeners = new Set<MessageListener>();

export function onForegroundMessage(listener: MessageListener): () => void {
  messageListeners.add(listener);
  return () => {
    messageListeners.delete(listener);
  };
}

function emitMessageReceived(): void {
  for (const l of messageListeners) {
    try {
      l();
    } catch {
      // ignore
    }
  }
}

export function setNotificationTapHandler(
  handler: NotificationTapHandler | null,
): void {
  tapHandler = handler;
  if (handler && pendingTaps.length > 0) {
    // Copy + clear before dispatch so a re-entrant handler that pushes new
    // taps doesn't lose them.
    const drain = pendingTaps.splice(0, pendingTaps.length);
    for (const payload of drain) {
      try {
        handler(payload);
      } catch {
        // ignore — a broken handler shouldn't kill the queue
      }
    }
  }
}

function dispatchTap(payload: NotificationTapPayload): void {
  if (tapHandler) {
    tapHandler(payload);
  } else {
    pendingTaps.push(payload);
  }
}

// ------------------------------
// Permissions
// ------------------------------

/**
 * Request notification permission.
 *
 * - iOS: uses Firebase Messaging's built-in prompt (calls APNs).
 * - Android 13+: requires the POST_NOTIFICATIONS runtime permission.
 * - Older Android: implicitly granted.
 *
 * Returns true if we're allowed to display / receive notifications.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') {
    const status = await messaging().requestPermission();
    return (
      status === messaging.AuthorizationStatus.AUTHORIZED ||
      status === messaging.AuthorizationStatus.PROVISIONAL
    );
  }

  // Android 13 (API 33) introduced runtime permission for notifications.
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    const granted = await PermissionsAndroid.request(
      // Cast because the const only exists at runtime on API 33+ and the
      // type ships as `keyof Permissions`.
      'android.permission.POST_NOTIFICATIONS' as never,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }

  return true;
}

// ------------------------------
// Foreground display channel (Android needs a channel; iOS ignores)
// ------------------------------

async function ensureChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}

// ------------------------------
// FCM token registration
// ------------------------------

function currentPlatform(): DevicePlatform {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

/**
 * Register with our backend so this device can receive push. Safe to call
 * on every app launch — the backend upserts by token.
 *
 * Silently no-ops if:
 * - permission was denied (bell icon just remains an in-app-only entry)
 * - FCM SDK isn't wired natively yet (native module missing / rebuild
 *   needed) — logged but non-fatal
 */
export async function registerDeviceForPush(
  authToken: string,
): Promise<{token: string; platform: DevicePlatform} | null> {
  try {
    const permitted = await requestNotificationPermission();
    if (!permitted) return null;

    await ensureChannel();

    // iOS needs an APNs token first, but @react-native-firebase/messaging
    // handles the handshake internally when we ask for `getToken`.
    const fcmToken = await messaging().getToken();
    if (!fcmToken) return null;

    const platform = currentPlatform();

    await api.deviceTokens.register({
      token: authToken,
      body: {
        token: fcmToken,
        platform,
        deviceId: await DeviceInfo.getStableDeviceId(),
        appVersion: DeviceInfo.appVersion,
      },
    });

    return {token: fcmToken, platform};
  } catch (err) {
    // Common in dev: rebuilds without google-services.json / Info.plist,
    // simulator without APNs, etc. Not fatal — the app still works, just
    // without push.
    if (__DEV__) {
      console.warn('[push] registerDeviceForPush failed', err);
    }
    return null;
  }
}

/**
 * Unregister the current FCM token from the backend. Called at sign-out
 * so the OS never rings the previous user's notifications on this device.
 */
export async function unregisterDeviceFromPush(
  authToken: string,
): Promise<void> {
  try {
    const fcmToken = await messaging().getToken();
    if (!fcmToken) return;
    await api.deviceTokens.unregister({token: authToken, deviceToken: fcmToken});
  } catch (err) {
    if (__DEV__) {
      console.warn('[push] unregisterDeviceFromPush failed', err);
    }
  } finally {
    // Force a fresh token on next sign-in for a different account.
    try {
      await messaging().deleteToken();
    } catch {
      // ignore
    }
  }
}

// ------------------------------
// Message handlers
// ------------------------------

/**
 * Wire the foreground handlers exactly once per JS lifetime. Returns an
 * unsubscribe function. Safe to no-op if called before RN native bridge
 * has loaded FCM.
 */
export function initPushHandlers(): () => void {
  const unsubs: Array<() => void> = [];

  try {
    // Foreground: FCM won't display banners itself while the app is open.
    // We forward the message to notifee so the user still sees a banner.
    unsubs.push(
      messaging().onMessage(async remote => {
        await ensureChannel();
        await notifee.displayNotification({
          title: remote.notification?.title,
          body: remote.notification?.body,
          data: (remote.data ?? {}) as Record<string, string>,
          android: {
            channelId: CHANNEL_ID,
            smallIcon: 'ic_launcher',
            pressAction: {id: 'default'},
          },
          ios: {
            sound: 'default',
          },
        });
        emitMessageReceived();
      }),
    );
  } catch (err) {
    if (__DEV__) console.warn('[push] messaging().onMessage failed', err);
  }

  // notifee foreground tap
  unsubs.push(
    notifee.onForegroundEvent(({type, detail}) => {
      if (type === EventType.PRESS && detail.notification?.data) {
        dispatchTap(toPayload(detail.notification.data));
      }
    }),
  );

  try {
    // App opened by tapping a push while in background
    unsubs.push(
      messaging().onNotificationOpenedApp(remote => {
        if (remote?.data) dispatchTap(toPayload(remote.data));
      }),
    );
  } catch (err) {
    if (__DEV__) console.warn('[push] messaging().onNotificationOpenedApp failed', err);
  }

  // App opened from killed state via a push.
  try {
    messaging()
      .getInitialNotification()
      .then(remote => {
        if (remote?.data) dispatchTap(toPayload(remote.data));
      })
      .catch(() => {
        // ignore
      });
  } catch (err) {
    if (__DEV__) console.warn('[push] messaging().getInitialNotification failed', err);
  }

  return () => {
    for (const u of unsubs) {
      try {
        u();
      } catch {
        // ignore
      }
    }
  };
}

function toPayload(
  data:
    | FirebaseMessagingTypes.RemoteMessage['data']
    | Record<string, unknown>
    | undefined,
): NotificationTapPayload {
  // FCM data payloads are stringly-typed at the wire level, but notifee
  // widens them to `string | object` and JS runtime can hand us numbers
  // too. Coerce everything to string to keep downstream navigation
  // routing simple and typed.
  const raw: Record<string, string> = {};
  if (data) {
    for (const [k, v] of Object.entries(data)) {
      if (v === undefined || v === null) continue;
      raw[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
  }
  return {
    deepLink: raw.deepLink,
    type: raw.type,
    webSeriesId: raw.webSeriesId,
    episodeId: raw.episodeId,
    raw,
  };
}
