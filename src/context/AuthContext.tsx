import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ApiError,
  api,
  configureAuth,
  mePayloadToPublicUser,
  toPublicUser,
  type AuthTokens,
  type AuthTokenResponseData,
  type MobileUserProfile,
  type PublicUser,
  type SessionBridge,
  type SignUpResponseData,
} from '../lib/api';
import {
  SocialSignInCancelled,
  signInWithAppleNative,
  signInWithGoogleNative,
  signOutGoogle,
} from '../lib/oauth';
import {
  registerDeviceForPush,
  unregisterDeviceFromPush,
} from '../lib/pushNotifications';

const ACCESS_KEY = 'playdrama.auth.accessToken';
const REFRESH_KEY = 'playdrama.auth.refreshToken';
const USER_KEY = 'playdrama.auth.user';

type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: PublicUser | null;
  token: string | null;
  refreshToken: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  // Signup no longer authenticates — it kicks off the OTP flow and returns
  // the server response (userId, dev otp, etc.) so the UI can navigate to the
  // OTP verification screen.
  signUp: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<SignUpResponseData>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  refreshProfile: () => Promise<MobileUserProfile | null>;
  updateProfile: (input: {
    fullName?: string;
    phone?: string;
  }) => Promise<MobileUserProfile>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export {SocialSignInCancelled};

// Thrown when the backend hasn't shipped the /auth/oauth/* endpoint yet.
export class SocialNotEnabledError extends Error {
  constructor(provider: 'Google' | 'Apple') {
    super(
      `${provider} sign-in isn’t enabled on the server yet. Please continue with email + password.`,
    );
    this.name = 'SocialNotEnabledError';
  }
}

/**
 * Thrown when a valid backend account tries to sign in but isn't one of
 * the two roles this app supports (MOBILE_USER — full app; STUDENT —
 * profile-only). Institute / super admins are blocked here because
 * every non-admin endpoint (profile, watchlist, notifications, device
 * tokens…) would 403 anyway — better a single clear error at the door
 * than access-denied banners scattered across every tab.
 */
export class WrongAppRoleError extends Error {
  readonly role: string;
  constructor(role: string) {
    super(
      `This account (role: ${role}) can't sign in here. Please use the admin dashboard instead.`,
    );
    this.name = 'WrongAppRoleError';
    this.role = role;
  }
}

// Roles that are allowed to pass the login gate. Keep this in one place
// so applySession + hydration + the /auth/me refresh all agree.
const ALLOWED_ROLES = new Set<string>(['MOBILE_USER', 'STUDENT']);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<PublicUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Refs mirror the latest tokens/user so the api.ts session bridge (a
  // synchronous getter) always sees fresh values, independent of React's
  // render cycle.
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const userRef = useRef<PublicUser | null>(null);

  const persistSession = useCallback(
    async (
      nextAccess: string | null,
      nextRefresh: string | null,
      nextUser: PublicUser | null,
    ) => {
      if (nextAccess && nextUser) {
        await Promise.all([
          AsyncStorage.setItem(ACCESS_KEY, nextAccess),
          nextRefresh
            ? AsyncStorage.setItem(REFRESH_KEY, nextRefresh)
            : AsyncStorage.removeItem(REFRESH_KEY),
          AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser)),
        ]);
      } else {
        await Promise.all([
          AsyncStorage.removeItem(ACCESS_KEY),
          AsyncStorage.removeItem(REFRESH_KEY),
          AsyncStorage.removeItem(USER_KEY),
        ]);
      }
    },
    [],
  );

  const applySession = useCallback((tokens: AuthTokenResponseData) => {
    // Gate on role BEFORE persisting anything. MOBILE_USER gets the full
    // app; STUDENT gets a stripped-down profile-only shell (see
    // navigation/RootNavigator). Any other role would just 403 across the
    // board, so we reject them at the door with a clear message instead.
    if (!ALLOWED_ROLES.has(tokens.user.role)) {
      throw new WrongAppRoleError(tokens.user.role);
    }
    const nextUser = toPublicUser(tokens.user);
    tokenRef.current = tokens.accessToken;
    refreshRef.current = tokens.refreshToken;
    userRef.current = nextUser;
    setToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    setUser(nextUser);
    setStatus('authenticated');
    // Fire-and-forget: register this device with the push backend so the
    // user gets FCM notifications on this handset. Failures here (denied
    // permission, missing native SDK, backend hiccup) must not block the
    // sign-in — the app still works, just without push.
    void registerDeviceForPush(tokens.accessToken);
    return nextUser;
  }, []);

  const clearSession = useCallback(async () => {
    tokenRef.current = null;
    refreshRef.current = null;
    userRef.current = null;
    await persistSession(null, null, null);
    try {
      await signOutGoogle();
    } catch {
      // ignore
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }, [persistSession]);

  // Wire the api.ts session bridge exactly once on mount. It lets the
  // request pipeline read the current refresh token, persist rotated
  // tokens, and force-logout when refresh fails.
  useEffect(() => {
    const bridge: SessionBridge = {
      getAccessToken: () => tokenRef.current,
      getRefreshToken: () => refreshRef.current,
      onTokensRefreshed: async (tokens: AuthTokens) => {
        tokenRef.current = tokens.accessToken;
        refreshRef.current = tokens.refreshToken;
        setToken(tokens.accessToken);
        setRefreshToken(tokens.refreshToken);
        if (userRef.current) {
          await persistSession(
            tokens.accessToken,
            tokens.refreshToken,
            userRef.current,
          );
        }
      },
      onSessionExpired: async () => {
        await clearSession();
      },
    };
    configureAuth(bridge);
    return () => {
      configureAuth(null);
    };
  }, [clearSession, persistSession]);

  // Hydrate from AsyncStorage on cold start, then best-effort refresh the
  // user via /auth/me (falls back to stored copy on network failure).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [storedAccess, storedRefresh, storedUser] = await Promise.all([
          AsyncStorage.getItem(ACCESS_KEY),
          AsyncStorage.getItem(REFRESH_KEY),
          AsyncStorage.getItem(USER_KEY),
        ]);
        if (cancelled) {
          return;
        }
        if (!storedAccess || !storedUser) {
          setStatus('unauthenticated');
          return;
        }
        let parsedUser: PublicUser | null = null;
        try {
          parsedUser = JSON.parse(storedUser) as PublicUser;
        } catch {
          await persistSession(null, null, null);
          setStatus('unauthenticated');
          return;
        }
        // Defensive: if a legacy build stored a session for a role that
        // this app no longer supports (e.g. INSTITUTE_ADMIN from an older
        // shared-login flow), drop it on cold start so we don't leak the
        // same 403 loop to the user.
        if (!ALLOWED_ROLES.has(parsedUser.role)) {
          await persistSession(null, null, null);
          setStatus('unauthenticated');
          return;
        }
        tokenRef.current = storedAccess;
        refreshRef.current = storedRefresh;
        userRef.current = parsedUser;
        setToken(storedAccess);
        setRefreshToken(storedRefresh);
        setUser(parsedUser);
        setStatus('authenticated');
        // Best-effort re-register on cold start so a token refreshed by
        // FCM while the app was closed reaches our backend.
        void registerDeviceForPush(storedAccess);

        // Fire-and-forget /auth/me. Failure is non-fatal because the 401
        // path will already have triggered logout via the session bridge.
        try {
          const me = await api.auth.me({token: storedAccess});
          if (cancelled) {
            return;
          }
          const fresh = mePayloadToPublicUser(me);
          // Same guard as sign-in: if the backend ever flips this account
          // off one of the supported roles, drop the session locally
          // instead of showing 403s across the tabs.
          if (!ALLOWED_ROLES.has(fresh.role)) {
            await clearSession();
            return;
          }
          userRef.current = fresh;
          setUser(fresh);
          await persistSession(
            tokenRef.current ?? storedAccess,
            refreshRef.current,
            fresh,
          );
        } catch {
          // Keep the cached user; the bridge already handled 401 if that
          // was the failure mode.
        }
      } catch {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [persistSession, clearSession]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const res = await api.auth.login({email, password});
      const nextUser = applySession(res);
      await persistSession(res.accessToken, res.refreshToken, nextUser);
    },
    [applySession, persistSession],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(async input => {
    return api.auth.signUp({
      email: input.email,
      password: input.password,
      fullName: input.fullName,
      phone: input.phone,
    });
  }, []);

  const verifyOtp = useCallback(
    async (email: string, otp: string) => {
      const res = await api.auth.verifyOtp({email, otp});
      const nextUser = applySession(res);
      await persistSession(res.accessToken, res.refreshToken, nextUser);
    },
    [applySession, persistSession],
  );

  const signInWithGoogle = useCallback(async () => {
    const google = await signInWithGoogleNative();
    try {
      const res = await api.auth.oauthGoogle({
        idToken: google.idToken,
        email: google.email,
        name: google.name,
      });
      const nextUser = applySession(res);
      await persistSession(res.accessToken, res.refreshToken, nextUser);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        throw new SocialNotEnabledError('Google');
      }
      throw err;
    }
  }, [applySession, persistSession]);

  const signInWithApple = useCallback(async () => {
    const apple = await signInWithAppleNative();
    try {
      const res = await api.auth.oauthApple({
        identityToken: apple.identityToken,
        email: apple.email,
        name: apple.name,
      });
      const nextUser = applySession(res);
      await persistSession(res.accessToken, res.refreshToken, nextUser);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        throw new SocialNotEnabledError('Apple');
      }
      throw err;
    }
  }, [applySession, persistSession]);

  const signOut = useCallback(async () => {
    // Best-effort server-side logout — bumps tokenVersion so any leaked
    // tokens are invalidated. Ignore failures so the local session still
    // clears (e.g. offline, expired token, etc.).
    const current = tokenRef.current;
    if (current) {
      // Unregister push token FIRST — while the JWT still works. Order
      // matters: if we clear the session first, /device-tokens/:token
      // would 401 and we'd leave a stale token in the DB that keeps
      // pinging the wrong user on this device.
      try {
        await unregisterDeviceFromPush(current);
      } catch {
        // ignore
      }
      try {
        await api.auth.logout({token: current});
      } catch {
        // ignore
      }
    }
    await clearSession();
  }, [clearSession]);

  const changePassword = useCallback<AuthContextValue['changePassword']>(
    async ({currentPassword, newPassword}) => {
      const current = tokenRef.current;
      if (!current) {
        throw new ApiError('You are not signed in.', 401);
      }
      await api.auth.changePassword({
        token: current,
        currentPassword,
        newPassword,
      });
      // Server bumped tokenVersion; existing tokens are now invalid on other
      // devices. On this device we sign out so the user re-authenticates.
      await clearSession();
    },
    [clearSession],
  );

  const refreshProfile = useCallback<
    AuthContextValue['refreshProfile']
  >(async () => {
    const current = tokenRef.current;
    if (!current) {
      return null;
    }
    try {
      const profile = await api.profile.get({token: current});
      const merged: PublicUser = {
        id: profile.userId,
        name: profile.fullName,
        email: profile.email,
        role: profile.role,
        provider: 'email',
        emailVerified: profile.emailVerified,
        status: profile.status,
        instituteId: null,
      };
      userRef.current = merged;
      setUser(merged);
      await persistSession(
        tokenRef.current ?? current,
        refreshRef.current,
        merged,
      );
      return profile;
    } catch {
      return null;
    }
  }, [persistSession]);

  const updateProfile = useCallback<AuthContextValue['updateProfile']>(
    async input => {
      const current = tokenRef.current;
      if (!current) {
        throw new ApiError('You are not signed in.', 401);
      }
      const profile = await api.profile.update({
        token: current,
        fullName: input.fullName,
        phone: input.phone ?? undefined,
      });
      const merged: PublicUser = {
        id: profile.userId,
        name: profile.fullName,
        email: profile.email,
        role: profile.role,
        provider: 'email',
        emailVerified: profile.emailVerified,
        status: profile.status,
        instituteId: null,
      };
      userRef.current = merged;
      setUser(merged);
      await persistSession(
        tokenRef.current ?? current,
        refreshRef.current,
        merged,
      );
      return profile;
    },
    [persistSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      token,
      refreshToken,
      signIn,
      signUp,
      verifyOtp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      changePassword,
      refreshProfile,
      updateProfile,
    }),
    [
      status,
      user,
      token,
      refreshToken,
      signIn,
      signUp,
      verifyOtp,
      signInWithGoogle,
      signInWithApple,
      signOut,
      changePassword,
      refreshProfile,
      updateProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
