/**
 * @format
 */

import { AppRegistry } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import App from './App';
import { name as appName } from './app.json';

// ------------------------------
// Background / quit-state FCM handler
// ------------------------------
//
// This MUST be registered outside of any React component tree — the OS may
// spin up a headless JS instance to run it before the app UI ever mounts.
// The handler's job is to translate the FCM data-only message into a
// user-visible notifee banner so the OS actually renders it.
//
// If a message arrives WITH a `notification` block, the OS displays it
// itself and we don't need to do anything (this handler still fires for
// data + notification hybrid messages, but calling `displayNotification`
// again would show a duplicate — hence the guard below).
try {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    if (remoteMessage?.notification?.title) {
      // OS already displayed it; nothing to do.
      return;
    }
    try {
      // Ensure channel exists on Android — no-op on iOS.
      await notifee.createChannel({
        id: 'cinestream-default',
        name: 'General notifications',
        importance: AndroidImportance.HIGH,
        sound: 'default',
      });
      await notifee.displayNotification({
        title: remoteMessage?.data?.title || 'CineStream',
        body: remoteMessage?.data?.body || '',
        data: remoteMessage?.data || {},
        android: {
          channelId: 'cinestream-default',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
        ios: { sound: 'default' },
      });
    } catch {
      // The headless task can't crash the app — swallow all errors.
    }
  });
} catch {
  // Firebase not initialized yet or not supported on this platform launch
}

AppRegistry.registerComponent(appName, () => App);
