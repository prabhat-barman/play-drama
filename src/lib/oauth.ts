import {Platform} from 'react-native';
import {
  GoogleSignin,
  statusCodes,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import appleAuth from '@invertase/react-native-apple-authentication';
import {GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID} from './config';

// ------------------------------
// Google
// ------------------------------

let googleConfigured = false;

function isPlaceholder(id: string | undefined | null): boolean {
  return (
    !id ||
    id.startsWith('REPLACE_WITH_') ||
    id === 'YOUR_GOOGLE_CLIENT_ID'
  );
}

function ensureGoogleConfigured() {
  if (googleConfigured) {
    return;
  }
  const webMissing = isPlaceholder(GOOGLE_WEB_CLIENT_ID);
  const iosMissing = isPlaceholder(GOOGLE_IOS_CLIENT_ID);

  if (Platform.OS === 'ios' && iosMissing) {
    throw new Error(
      "Google Sign-In isn't configured for iOS yet. Add your iOS OAuth " +
        'Client ID to src/lib/config.ts (GOOGLE_IOS_CLIENT_ID) and the ' +
        'iOS URL scheme to ios/CineStream/Info.plist, then rebuild.',
    );
  }
  if (Platform.OS === 'android' && webMissing) {
    throw new Error(
      "Google Sign-In isn't configured for Android yet. Add your Web " +
        'OAuth Client ID to src/lib/config.ts (GOOGLE_WEB_CLIENT_ID) and ' +
        'register your Android app (package + SHA-1) in Google Console.',
    );
  }
  GoogleSignin.configure({
    webClientId: webMissing ? undefined : GOOGLE_WEB_CLIENT_ID,
    iosClientId: iosMissing ? undefined : GOOGLE_IOS_CLIENT_ID,
    offlineAccess: false,
    forceCodeForRefreshToken: false,
  });
  googleConfigured = true;
}

export class SocialSignInCancelled extends Error {
  constructor() {
    super('Sign in was cancelled');
    this.name = 'SocialSignInCancelled';
  }
}

export type GoogleIdTokenResult = {
  idToken: string;
  email: string;
  name?: string;
};

// Decodes a JWT payload WITHOUT verifying the signature — purely for
// diagnostic logging so we can see what `aud` / `exp` claims the token
// carries before it hits our backend. Do NOT use for trust decisions.
function decodeJwtPayloadUnsafe(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) {
      return null;
    }
    let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const pad = b64.length % 4;
    if (pad) {
      b64 += '='.repeat(4 - pad);
    }
    // React Native has `global.atob` on Hermes; fall back to Buffer if not.
    const decoded =
      typeof atob === 'function'
        ? atob(b64)
        : // @ts-ignore — Buffer is available in RN
          Buffer.from(b64, 'base64').toString('binary');
    // atob returns a binary string; JSON is ASCII so this is fine.
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function logGoogleIdTokenClaims(idToken: string): void {
  const claims = decodeJwtPayloadUnsafe(idToken);
  if (!claims) {
    console.log('[oauth] google idToken: could not decode payload');
    return;
  }
  const nowSec = Math.floor(Date.now() / 1000);
  const exp = typeof claims.exp === 'number' ? claims.exp : null;
  const iat = typeof claims.iat === 'number' ? claims.iat : null;
  const secondsUntilExpiry = exp !== null ? exp - nowSec : null;
  console.log('[oauth] google idToken claims', {
    aud: claims.aud,
    azp: claims.azp,
    iss: claims.iss,
    email: claims.email,
    email_verified: claims.email_verified,
    iat,
    exp,
    now: nowSec,
    ageSeconds: iat !== null ? nowSec - iat : null,
    secondsUntilExpiry,
    alreadyExpired: secondsUntilExpiry !== null && secondsUntilExpiry <= 0,
  });
}

export async function signInWithGoogleNative(): Promise<GoogleIdTokenResult> {
  ensureGoogleConfigured();
  await GoogleSignin.hasPlayServices({showPlayServicesUpdateDialog: true});

  // Google Play Services caches the last account + idToken at the OS level,
  // and `signIn()` can hand that cached idToken back — often already past
  // its 1-hour expiry — even on the "first" attempt after a fresh install
  // when the device previously had this app / package installed. The backend
  // then rejects it with "token expired". Signing out first forces a fresh
  // interactive flow so the token is always minted right now.
  // Refs:
  //   https://github.com/react-native-google-signin/google-signin/issues/105
  //   https://github.com/react-native-google-signin/google-signin/issues/926
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort — proceed with signIn regardless.
  }

  try {
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) {
      throw new SocialSignInCancelled();
    }
    const {idToken} = response.data;
    const {user} = response.data;

    if (!idToken) {
      throw new Error(
        'Google did not return an ID token. Check your webClientId configuration.',
      );
    }
    if (__DEV__) {
      logGoogleIdTokenClaims(idToken);
    }
    return {idToken, email: user.email, name: user.name ?? undefined};
  } catch (err) {
    const code = (err as {code?: string}).code;
    if (
      code === statusCodes.SIGN_IN_CANCELLED ||
      code === statusCodes.IN_PROGRESS
    ) {
      throw new SocialSignInCancelled();
    }
    // DEVELOPER_ERROR (code 10 on Android) is almost always a misconfigured
    // OAuth client — usually one of:
    //   1. SHA-1 of the signing keystore not registered in Google Cloud /
    //      Firebase console for this package (com.cinestream).
    //   2. `webClientId` in src/lib/config.ts belongs to a different Google
    //      Cloud project than the one the Android app is registered in.
    //   3. `google-services.json` is stale — re-download after adding SHA-1.
    // Surface a user-actionable message so testers stop guessing.
    // Note: the library's TypeScript surface doesn't expose DEVELOPER_ERROR
    // even though the native module emits it, so compare by string literal.
    if (code === 'DEVELOPER_ERROR' || code === '10') {
      throw new Error(
        Platform.OS === 'android'
          ? "Google Sign-In isn't set up correctly for this build. " +
            "Register this app's SHA-1 fingerprint in Google Cloud Console " +
            'under the same project as the Web Client ID, then reinstall.'
          : "Google Sign-In isn't set up correctly for this build. " +
            'Verify the iOS OAuth Client ID and URL scheme.',
      );
    }
    throw err;
  }
}

export async function signOutGoogle(): Promise<void> {
  if (!googleConfigured) {
    return;
  }
  try {
    await GoogleSignin.signOut();
  } catch {
    // best-effort
  }
}

// ------------------------------
// Apple
// ------------------------------

export const isAppleAuthAvailable =
  Platform.OS === 'ios' && appleAuth.isSupported;

export type AppleIdentityTokenResult = {
  identityToken: string;
  name?: string;
  email?: string;
};

export async function signInWithAppleNative(): Promise<AppleIdentityTokenResult> {
  if (!isAppleAuthAvailable) {
    throw new Error('Sign in with Apple is only available on iOS 13+.');
  }

  // NOTE: the enums `AppleRequestOperation` / `AppleRequestScope` exist only
  // as TypeScript types in `@invertase/react-native-apple-authentication` and
  // are `undefined` at runtime. Use the values exposed on the module instance
  // instead (`appleAuth.Operation.LOGIN`, `appleAuth.Scope.*`).
  const response = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  const {identityToken, fullName, email} = response;
  if (!identityToken) {
    throw new Error('Apple did not return an identity token.');
  }

  const name = [fullName?.givenName, fullName?.familyName]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    identityToken,
    name: name || undefined,
    email: email ?? undefined,
  };
}
