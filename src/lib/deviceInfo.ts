import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

/**
 * Lightweight device info without pulling in `react-native-device-info`
 * (which is another native module + pod install churn we don't need).
 *
 * - `appVersion` is currently a static constant — bump when the app version
 *   changes. Wire this into a native module later if you want it live from
 *   Info.plist / build.gradle.
 * - `getStableDeviceId()` returns a UUID that we generate on first launch
 *   and cache in AsyncStorage. It's not a "real" hardware ID (Google
 *   restricts those) but it's stable across app launches for the same
 *   install, which is all the backend needs to correlate device tokens.
 */

const DEVICE_ID_KEY = 'playdrama.device.id';

// Small, self-contained UUIDv4. We deliberately avoid the `uuid` package.
function uuidv4(): string {
  const hex: string[] = [];
  for (let i = 0; i < 256; i++) {
    hex[i] = (i < 16 ? '0' : '') + i.toString(16);
  }
  const r0 = (Math.random() * 0x100000000) >>> 0;
  const r1 = (Math.random() * 0x100000000) >>> 0;
  const r2 = (Math.random() * 0x100000000) >>> 0;
  const r3 = (Math.random() * 0x100000000) >>> 0;
  return (
    hex[r0 & 0xff] +
    hex[(r0 >> 8) & 0xff] +
    hex[(r0 >> 16) & 0xff] +
    hex[(r0 >> 24) & 0xff] +
    '-' +
    hex[r1 & 0xff] +
    hex[(r1 >> 8) & 0xff] +
    '-' +
    hex[(((r1 >> 16) & 0x0f) | 0x40) & 0xff] +
    hex[(r1 >> 24) & 0xff] +
    '-' +
    hex[((r2 & 0x3f) | 0x80) & 0xff] +
    hex[(r2 >> 8) & 0xff] +
    '-' +
    hex[(r2 >> 16) & 0xff] +
    hex[(r2 >> 24) & 0xff] +
    hex[r3 & 0xff] +
    hex[(r3 >> 8) & 0xff] +
    hex[(r3 >> 16) & 0xff] +
    hex[(r3 >> 24) & 0xff]
  );
}

async function getStableDeviceId(): Promise<string> {
  const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (stored && stored.length > 0) {
    return stored;
  }
  const fresh = `${Platform.OS}-${uuidv4()}`;
  try {
    await AsyncStorage.setItem(DEVICE_ID_KEY, fresh);
  } catch {
    // ignore — if storage fails we still return a valid id for this session
  }
  return fresh;
}

// Bump alongside package.json `version`. Kept as a plain constant to avoid
// a native module for such a tiny piece of metadata.
const APP_VERSION = '0.0.1';

const DeviceInfo = {
  appVersion: APP_VERSION,
  getStableDeviceId,
};

export default DeviceInfo;
