import {API_URL} from './config';

// ------------------------------
// Backend contract
// Ref: https://vertical-admin-backend.onrender.com/api-docs
// Frontend guide: docs/MOBILE_API.md (this repo's backend)
// ------------------------------

export type UserRole = 'MOBILE_USER' | 'STUDENT';
export type UserStatus = 'active' | 'locked' | 'pending_verification';

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  name: string;
  instituteId?: string | null;
};

// UI-friendly user shape used throughout the app.
export type AuthProvider = 'email' | 'google' | 'apple';

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole | 'admin' | 'user';
  provider: AuthProvider;
  emailVerified: boolean;
  status?: UserStatus;
  instituteId?: string | null;
  // Optional so both MOBILE_USER (from /mobile-users/profile) and STUDENT
  // (from /auth/me → studentProfile.phone) can populate it without every
  // caller having to guard on a role check.
  phone?: string | null;
  avatarUrl?: string | null;
  // For STUDENT role only: the student record _id (MongoDB ObjectId) used
  // for GET /mobile-users/students/:id. Differs from `id` which is the
  // auth user ID (JWT subject).
  studentId?: string | null;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type SignUpResponseData = {
  userId: string;
  email: string;
  role: 'MOBILE_USER';
  status: 'pending_verification';
  emailVerified: boolean;
  name: string;
  phone?: string;
  emailSent: boolean;
  otpExpiresInMinutes: number;
  message: string;
  otp?: string;
};

export type AuthTokenResponseData = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  message?: string;
};

export type RefreshResponseData = {
  accessToken: string;
  refreshToken: string;
};

export type ForgotPasswordResponseData = {
  message: string;
  email: string;
  emailSent: boolean;
  otpExpiresInMinutes: number;
  otp?: string;
};

export type ResendOtpResponseData = ForgotPasswordResponseData;

export type MessageResponseData = {message: string};

// ------------------------------
// Profile
// ------------------------------

export type LinkedProvider = {
  provider: 'google' | 'apple';
  linkedAt: string;
};

export type MobileUserProfile = {
  userId: string;
  email: string;
  role: 'MOBILE_USER';
  status: UserStatus;
  emailVerified: boolean;
  fullName: string;
  phone?: string | null;
  subscriptionStatus?: string;
  linkedProviders?: LinkedProvider[];
  createdAt?: string;
  updatedAt?: string;
};

// Shape returned by /auth/me when the caller is a STUDENT. Diverges from
// MobileUserProfile because the backend nests the domain-specific fields
// under `profile` (the actual `Student` document) instead of flattening
// them onto the response.
export type StudentAuthProfile = {
  _id?: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  admissionNumber?: string;
  instituteId?: string;
  isDeleted?: boolean;
  // Academic fields returned by /auth/me → profile
  course?: string;
  department?: string;
  batch?: string;
  semester?: string;
  bio?: string;
  skills?: string[];
};

export type StudentMeResponse = {
  id: string;
  email: string;
  role: 'STUDENT';
  instituteId?: string;
  profile: StudentAuthProfile | null;
};

export type MeResponseData =
  | (MobileUserProfile & {name?: never})
  | StudentMeResponse
  | AuthUser;

// ------------------------------
// Content
// ------------------------------

export type WebseriesStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'PUBLISHED'
  | 'ARCHIVED';

// Populated cast entry on `GET /mobile-users/webseries/{id}`. When the
// Actors DB table was dropped (2026-07-27) the backend kept the `cast`
// field on webseries but switched its populated shape from `Actor` to a
// lightweight student-like summary (fullName + profileImage). On list
// responses `cast` comes back as unpopulated ObjectIds (`string[]`) which
// the mobile app currently doesn't use.
export type CastMember = {
  _id: string;
  fullName: string;
  profileImage?: string;
};

export type Season = {
  _id: string;
  seasonNumber: number;
  title: string | null;
  description: string | null;
  thumbnail: string | null;
  releaseDate: string | null;
  totalEpisodes: number;
};

export type Webseries = {
  _id: string;
  title: string;
  description: string;
  thumbnail: string;
  coverImage?: string;
  language?: string;
  totalSeasons?: number;
  seasons?: Season[];
  ageRating?: string;
  genres?: string[];
  tags?: string[];
  isPremium?: boolean;
  totalEpisodes?: number;
  status: WebseriesStatus;
  releaseDate?: string;
  createdAt?: string;
  updatedAt?: string;
  // On list responses (`GET /mobile-users/webseries`) `cast` comes back as
  // unpopulated ObjectIds (`string[]`); on detail (`GET .../{id}`) it is
  // populated with `CastMember[]`. Union kept so both list and detail
  // deserialise cleanly — screens should type-guard before rendering
  // names / avatars. See `webseriesToContent` for the read path.
  cast?: string[] | CastMember[];
  visibility?: string;
  popularity?: number;
  // Populated on GET /mobile-users/webseries/:id — first page of episodes
  // embedded to save the client one round-trip. NOT emitted by the backend
  // yet (proposed in the client → Swapnil handoff on 2026-07-29). Kept
  // optional so the field appears the day the backend ships it without a
  // client redeploy. `hasMoreEpisodes: true` will signal the client to
  // paginate via GET /mobile-users/episodes.
  episodes?: Episode[];
  hasMoreEpisodes?: boolean;
  // Roadmap fields (Phase 2/3). All optional so existing screens keep working
  // even before the backend starts emitting them.
  trailerUrl?: string;
  trailerThumb?: string;
  duration?: number; // total runtime in seconds
  instituteId?: string;
  institute?: InstituteSummary; // populated on detail / list endpoints
  averageRating?: number;
  ratingsCount?: number;
  reviewsCount?: number;
  followersCount?: number;
  isInWatchlist?: boolean;
  userRating?: number; // caller's own star rating, 1-5
};

export type EpisodeStatus =
  | 'DRAFT'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED';

export type Episode = {
  _id: string;
  webSeriesId: string;
  title: string;
  description?: string;
  episodeNumber: number;
  orderIndex?: number;
  duration?: number; // seconds
  videoUrl?: string;
  thumbnail?: string;
  status: EpisodeStatus;
  releaseDate?: string;
};

// ------------------------------
// Students (Actors) — publicly browsable directory
// Ref: GET /mobile-users/students, /mobile-users/students/{studentId}
// This replaces the legacy `Actor` type (backend dropped the Actors table
// on 2026-07-27; students carry institute-scoped fields — course,
// department, batch, ... — and are what the mobile "Actors" surface shows
// going forward).
// ------------------------------

export type Student = {
  _id: string;
  fullName: string;
  profileImage?: string;
  course?: string;
  department?: string;
  batch?: string;
  semester?: string;
  studentCode?: string;
};

export type StudentSocialLink = {
  platform: string;
  url: string;
};

export type StudentAchievement = {
  title?: string;
  description?: string;
  date?: string; // ISO date (YYYY-MM-DD)
  certificateUrl?: string;
};

export type StudentInstituteSummary = {
  _id?: string;
  id?: string;
  name?: string;
  logo?: string;
};

export type StudentDetail = Student & {
  phone?: string;
  email?: string;
  bio?: string;
  skills?: string[];
  socialLinks?: StudentSocialLink[];
  achievements?: StudentAchievement[];
  institute?: StudentInstituteSummary;
};

export type UpdateStudentInput = {
  fullName?: string;
  phone?: string;
  course?: string;
  department?: string;
  batch?: string;
  semester?: string;
  bio?: string;
  skills?: string[];
  socialLinks?: StudentSocialLink[];
  achievements?: StudentAchievement[];
  email?: string;
};


// ------------------------------
// Notifications & push
// ------------------------------

export type NotificationType =
  | 'system'
  | 'subscription'
  | 'upload'
  | 'content_approval'
  | 'general'
  | 'new_release'
  | 'trending'
  | 'recommendation'
  | 'reminder';

export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  deepLink?: string;
  imageUrl?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type NotificationsListData = {
  notifications: AppNotification[];
  unreadCount: number;
};

export type UnreadCountData = {
  count: number;
};

export type MarkReadResponseData = {
  updated: number;
};

export type DevicePlatform = 'ios' | 'android' | 'web';

export type DeviceTokenRecord = {
  id: string;
  token: string;
  platform: DevicePlatform;
  deviceId?: string;
  appVersion?: string;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type PageMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  meta: PageMeta;
};

// ------------------------------
// Roadmap types (Phase 1-9) — spec: docs/API_ROADMAP.yaml
// Kept optional / additive so existing screens keep compiling until the
// matching endpoints ship. See docs/API_ROADMAP.yaml for the full contract.
// ------------------------------

// ---- Institutes (Phase 2) ----
export type InstituteSummary = {
  id: string;
  name: string;
  slug?: string;
  logo?: string;
  logoUrl?: string;
  city?: string;
  followersCount?: number;
  webseriesCount?: number;
};

export type Institute = InstituteSummary & {
  coverImage?: string;
  description?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  website?: string;
  foundedYear?: number;
  totalStudents?: number;
  isFollowing?: boolean;
  featuredWebseries?: Webseries[];
};

export type FollowState = {
  isFollowing: boolean;
  followersCount: number;
};

export type FollowerUser = {
  id: string;
  name: string;
  avatarUrl?: string;
  followedAt: string;
};

// ---- Actors extras (Phase 4/8) ----
export type ActingClip = {
  id: string;
  title?: string;
  videoUrl: string;
  thumbnail?: string;
  durationSec?: number;
  webSeriesId?: string;
  episodeId?: string;
  createdAt?: string;
};

// ---- Playback (Phase 5) ----
export type PlaybackQualityLabel =
  | '4K'
  | '1080p'
  | '720p'
  | '480p'
  | '360p'
  | 'Auto';

export type PlaybackSubtitle = {
  lang: string; // BCP-47
  label: string;
  url: string;
  default?: boolean;
};

export type PlaybackAudioTrack = {
  lang: string;
  label: string;
  default?: boolean;
};

export type PlaybackQualityHint = {
  label: PlaybackQualityLabel;
  bitrate?: number;
  width?: number;
  height?: number;
};

export type PlaybackSkipMarker = {
  startSec: number;
  endSec: number;
};

export type PlaybackAdBreak = {
  atSec: number;
  vastUrl: string;
};

export type PlaybackManifest = {
  hlsUrl: string;
  dashUrl?: string;
  drm?: {
    widevineLicenseUrl?: string;
    fairplayLicenseUrl?: string;
    fairplayCertificateUrl?: string;
  };
  subtitles?: PlaybackSubtitle[];
  audioTracks?: PlaybackAudioTrack[];
  qualities?: PlaybackQualityHint[];
  skipIntro?: PlaybackSkipMarker;
  skipCredits?: PlaybackSkipMarker;
  nextEpisodeId?: string;
  durationSec: number;
  adBreaks?: PlaybackAdBreak[];
  sessionId?: string;
};

export type Trailer = {
  hlsUrl?: string;
  mp4Url?: string;
  thumbnail?: string;
  durationSec?: number;
};

export type HeartbeatState = 'playing' | 'paused' | 'buffering' | 'ended';

export type HeartbeatRequest = {
  sessionId: string;
  episodeId: string;
  positionSec: number;
  bufferedSec?: number;
  playbackState?: HeartbeatState;
};

// ---- Watch progress / history (Phase 5) ----
export type WatchProgress = {
  episodeId: string;
  webSeriesId: string;
  positionSec: number;
  durationSec: number;
  completed: boolean;
  updatedAt: string;
};

export type WatchProgressUpsert = {
  episodeId: string;
  positionSec: number;
  durationSec: number;
  completed?: boolean;
};

export type ContinueWatchingItem = {
  webseries: Webseries;
  episode: {
    id: string;
    title: string;
    episodeNumber: number;
    thumbnail?: string;
    durationSec?: number;
  };
  progress: WatchProgress;
};

export type WatchHistoryItem = ContinueWatchingItem & {
  watchedAt: string;
};

// ---- Search (Phase 6) ----
export type SearchEntityType = 'webseries' | 'student' | 'institute' | 'genre';

export type SearchResult = {
  query: string;
  webseries: Webseries[];
  students: Student[];
  institutes: InstituteSummary[];
  genres: Genre[];
};

export type SearchSuggestion = {
  type: SearchEntityType;
  id: string;
  label: string;
  subtitle?: string;
  thumbnail?: string;
};

export type SearchHistoryItem = {
  id: string;
  query: string;
  createdAt: string;
};

// ---- Discover / Genres (Phase 7) ----
export type Genre = {
  id: string;
  slug: string;
  name: string;
  icon?: string;
  coverImage?: string;
  webseriesCount?: number;
};

// ---- Home aggregator (Phase 1) ----
export type HomeFeed = {
  featuredBanner: Webseries | null;
  trending: Webseries[];
  recentlyReleased: Webseries[];
  popularInstitutes: InstituteSummary[];
  newStudents: Student[];
  categories: Genre[];
  continueWatching?: ContinueWatchingItem[];
  recommendations?: Webseries[];
};

// ---- Reviews / Ratings ----
export type RatingSummary = {
  averageRating: number;
  ratingsCount: number;
  userRating?: number;
  distribution?: Record<string, number>;
};

export type Review = {
  id: string;
  webSeriesId: string;
  author: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  text: string;
  stars: number;
  helpfulCount: number;
  isHelpful: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
};

// ---- Uploads (Phase 9) ----
export type UploadPurpose =
  | 'webseries_poster'
  | 'webseries_cover'
  | 'webseries_trailer'
  | 'episode_video'
  | 'actor_photo'
  | 'institute_logo'
  | 'institute_cover'
  | 'avatar';

export type PresignedUpload = {
  uploadUrl: string;
  key: string;
  headers?: Record<string, string>;
  expiresAt: string;
  maxBytes?: number;
};

// ---- Preferences ----
export type UserPreferences = {
  preferredQuality?: PlaybackQualityLabel;
  downloadQuality?: Exclude<PlaybackQualityLabel, '4K' | 'Auto'>;
  downloadsOverWifiOnly?: boolean;
  autoplayNext?: boolean;
  autoplayPreviews?: boolean;
  subtitleLang?: string;
  audioLang?: string;
  dataSaver?: boolean;
};

export type NotificationPreferences = {
  pushEnabled: boolean;
  emailEnabled: boolean;
  types: Partial<Record<NotificationType, boolean>>;
};

// ---- Subscriptions ----
export type SubscriptionPlanTier = {
  id: string;
  name: string;
  priceMinor: number; // paise / cents
  currency: string;
  interval: 'month' | 'year';
  perks: string[];
  highlighted?: boolean;
};

export type SubscriptionStatus =
  | 'none'
  | 'active'
  | 'cancelled'
  | 'past_due'
  | 'expired'
  | 'trialing';

export type UserSubscription = {
  planId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  willRenew: boolean;
  provider?: 'razorpay' | 'stripe' | 'apple' | 'google';
};

export type CheckoutSession = {
  orderId: string;
  razorpayKeyId: string;
  amountMinor: number;
  currency: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
};

// ---- App config ----
export type AppConfig = {
  minSupportedVersion: {ios?: string; android?: string};
  latestVersion: {ios?: string; android?: string};
  forceUpgrade: boolean;
  maintenance: {enabled: boolean; message?: string};
  featureFlags: Record<string, boolean>;
};

// ------------------------------
// Response envelope
// ------------------------------

type ApiSuccessEnvelope<T> = {
  success: true;
  message?: string;
  data: T;
  meta?: PageMeta;
};

type ApiErrorEnvelope = {
  success: false;
  message?: string;
  errors?: Array<{
    message?: string;
    field?: string;
    property?: string;
    constraints?: string[] | Record<string, string>;
    [k: string]: unknown;
  }>;
};

function extractErrorMessage(env?: ApiErrorEnvelope, fallback?: string): string {
  const first = env?.errors?.[0];
  if (first) {
    if (typeof first.message === 'string' && first.message) {
      return first.message;
    }
    const c = first.constraints;
    if (Array.isArray(c) && c.length && typeof c[0] === 'string') {
      return c[0];
    }
    if (c && typeof c === 'object') {
      const values = Object.values(c).filter(v => typeof v === 'string');
      if (values.length) {
        return values[0] as string;
      }
    }
  }
  return env?.message || fallback || 'Request failed';
}

// ------------------------------
// Errors
// ------------------------------

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// Thrown when the server hits its global rate limit (HTTP 429). The caller
// can inspect `retryAfterMs` and either wait or show a friendly message.
export class RateLimitError extends ApiError {
  retryAfterMs: number;
  retryAt: Date;
  constructor(message: string, retryAfterMs: number, details?: unknown) {
    super(message, 429, details);
    this.name = 'RateLimitError';
    this.retryAfterMs = retryAfterMs;
    this.retryAt = new Date(Date.now() + retryAfterMs);
  }
}

// ------------------------------
// Session bridge — plugged in by AuthContext at mount so the request
// pipeline can auto-refresh tokens and notify on session death.
// ------------------------------

export type SessionBridge = {
  getAccessToken: () => string | null;
  getRefreshToken: () => string | null;
  onTokensRefreshed: (tokens: AuthTokens) => void | Promise<void>;
  onSessionExpired: () => void | Promise<void>;
};

let sessionBridge: SessionBridge | null = null;

export function configureAuth(bridge: SessionBridge | null): void {
  sessionBridge = bridge;
}

// ------------------------------
// Retry + backoff
// ------------------------------

const RETRY_MAX_ATTEMPTS = 3; // 1 original + up to 2 retries
const RETRY_BASE_DELAY_MS = 800;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Full jitter exponential backoff: sleep = random(0, base * 2^attempt)
function backoffDelay(attempt: number): number {
  const cap = RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.floor(Math.random() * cap);
}

// Retriable HTTP statuses. 429 is handled separately (no auto-retry — server
// asked us to slow down). 5xx and network errors (status 0) are retriable.
function isRetriableStatus(status: number): boolean {
  if (status === 0) {
    return true;
  }
  if (status === 408 || status === 425) {
    return true;
  }
  if (status >= 500 && status < 600 && status !== 501) {
    return true;
  }
  return false;
}

// GET is always safe to retry. Non-idempotent POSTs are still safe to retry
// when the request never reached the server (network error / timeout — status
// 0), because the server never processed the first attempt.
function shouldRetry(
  status: number,
  method: HttpMethod,
  attempt: number,
): boolean {
  if (attempt >= RETRY_MAX_ATTEMPTS - 1) {
    return false;
  }
  if (!isRetriableStatus(status)) {
    return false;
  }
  if (method === 'GET' || method === 'HEAD') {
    return true;
  }
  // Non-idempotent verbs: only retry when server never saw the request.
  return status === 0;
}

// ------------------------------
// Single-flight refresh
// ------------------------------

let refreshInFlight: Promise<AuthTokens | null> | null = null;

async function performRefresh(): Promise<AuthTokens | null> {
  if (refreshInFlight) {
    return refreshInFlight;
  }
  const bridge = sessionBridge;
  const refreshToken = bridge?.getRefreshToken();
  if (!bridge || !refreshToken) {
    return null;
  }
  refreshInFlight = (async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30_000);
      let res: Response;
      try {
        res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({refreshToken}),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (!res.ok) {
        return null;
      }
      const json = (await res.json().catch(() => undefined)) as
        | ApiSuccessEnvelope<RefreshResponseData>
        | undefined;
      if (!json?.success || !json.data?.accessToken || !json.data?.refreshToken) {
        return null;
      }
      const tokens: AuthTokens = {
        accessToken: json.data.accessToken,
        refreshToken: json.data.refreshToken,
      };
      await bridge.onTokensRefreshed(tokens);
      return tokens;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

// ------------------------------
// Core request
// ------------------------------

type HttpMethod = 'GET' | 'HEAD' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  token?: string | null;
  signal?: AbortSignal;
  // Backend is on Render free tier which cold-starts in ~30-60s, so default
  // is generous. Set lower for interactive flows if you want to fail fast.
  timeoutMs?: number;
  // If true, the request will not attempt an automatic 401 refresh. Used by
  // the refresh call itself to avoid recursion, and by explicit login flows
  // where a 401 is a legitimate "wrong password" signal.
  skipAuthRefresh?: boolean;
};

type EnvelopeResult<T> = {
  data: T;
  meta?: PageMeta;
};

function buildUrl(
  path: string,
  query: RequestOptions['query'],
): string {
  if (!query) {
    return `${API_URL}${path}`;
  }
  const params: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    params.push(
      `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    );
  }
  if (!params.length) {
    return `${API_URL}${path}`;
  }
  const sep = path.includes('?') ? '&' : '?';
  return `${API_URL}${path}${sep}${params.join('&')}`;
}

async function attemptOnce<T>(
  path: string,
  method: HttpMethod,
  body: unknown,
  query: RequestOptions['query'],
  token: string | null | undefined,
  signal: AbortSignal | undefined,
  timeoutMs: number,
): Promise<EnvelopeResult<T>> {
  const headers: Record<string, string> = {Accept: 'application/json'};
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Compose caller-supplied AbortSignal with our own timeout so the request
  // cannot hang forever if the server never responds.
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', onExternalAbort);
    }
  }
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    const externallyAborted = signal?.aborted === true;
    if (externallyAborted) {
      throw new ApiError('Request cancelled', 0, err);
    }
    if (controller.signal.aborted) {
      throw new ApiError(
        'The server took too long to respond. It may be waking up — please try again in a few seconds.',
        0,
        err,
      );
    }
    throw new ApiError(
      'Cannot reach the server. Please check your internet connection.',
      0,
      err,
    );
  } finally {
    clearTimeout(timeoutId);
    if (signal) {
      signal.removeEventListener('abort', onExternalAbort);
    }
  }

  // 429 — surface immediately with retry hint. No auto-retry: the doc says
  // "Backoff, retry after 15 min" which is a UI decision, not a burst retry.
  if (res.status === 429) {
    const reset = res.headers.get('RateLimit-Reset');
    const retryAfter = res.headers.get('Retry-After');
    let retryAfterMs = 60_000;
    if (reset) {
      const n = Number(reset);
      if (Number.isFinite(n) && n > 0) {
        // IETF header: seconds until the current window resets.
        retryAfterMs = n * 1000;
      }
    } else if (retryAfter) {
      const n = Number(retryAfter);
      if (Number.isFinite(n) && n > 0) {
        retryAfterMs = n * 1000;
      }
    }
    let details: unknown;
    try {
      details = await res.json();
    } catch {
      // ignore
    }
    throw new RateLimitError(
      'Too many requests. Please wait a moment and try again.',
      retryAfterMs,
      details,
    );
  }

  const isJson = res.headers
    .get('content-type')
    ?.toLowerCase()
    .includes('application/json');
  const payload = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const errPayload = payload as ApiErrorEnvelope | undefined;
    const message = extractErrorMessage(
      errPayload,
      `Request failed with ${res.status}`,
    );
    throw new ApiError(message, res.status, errPayload?.errors);
  }

  const okPayload = payload as ApiSuccessEnvelope<T> | undefined;
  if (!okPayload || !okPayload.success) {
    throw new ApiError(
      okPayload?.message || 'Unexpected response from server',
      res.status,
      okPayload,
    );
  }
  return {data: okPayload.data, meta: okPayload.meta};
}

async function requestEnvelope<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<EnvelopeResult<T>> {
  const {
    method = 'GET',
    body,
    query,
    token,
    signal,
    timeoutMs = 75_000,
    skipAuthRefresh,
  } = opts;

  let currentToken = token;
  let refreshAttempted = false;
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt++) {
    try {
      return await attemptOnce<T>(
        path,
        method,
        body,
        query,
        currentToken,
        signal,
        timeoutMs,
      );
    } catch (err) {
      if (!(err instanceof ApiError)) {
        throw err;
      }
      lastError = err;

      // 401 → try one refresh, then retry the ORIGINAL call once.
      if (
        err.status === 401 &&
        !skipAuthRefresh &&
        !refreshAttempted &&
        sessionBridge?.getRefreshToken()
      ) {
        refreshAttempted = true;
        const newTokens = await performRefresh();
        if (newTokens) {
          currentToken = newTokens.accessToken;
          continue; // retry with new token, same attempt slot
        }
        // Refresh failed. Wipe session and surface the original 401.
        await sessionBridge?.onSessionExpired();
        throw err;
      }

      // RateLimitError is thrown directly by attemptOnce — never retried.
      if (err instanceof RateLimitError) {
        throw err;
      }

      if (signal?.aborted) {
        throw err;
      }

      if (shouldRetry(err.status, method, attempt)) {
        await sleep(backoffDelay(attempt));
        continue;
      }
      throw err;
    }
  }

  // Loop exit: exhausted retries.
  throw lastError ?? new ApiError('Request failed', 0);
}

// ------------------------------
// Public helpers
// ------------------------------

async function request<T>(path: string, opts?: RequestOptions): Promise<T> {
  const {data} = await requestEnvelope<T>(path, opts);
  return data;
}

async function requestPaginated<T>(
  path: string,
  opts?: RequestOptions,
): Promise<Paginated<T>> {
  const {data, meta} = await requestEnvelope<T[]>(path, opts);
  return {
    data,
    meta: meta ?? {
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    },
  };
}

// ------------------------------
// Endpoints
// ------------------------------

export const api = {
  auth: {
    signUp: (input: {
      email: string;
      password: string;
      fullName: string;
      phone?: string;
    }) =>
      request<SignUpResponseData>('/auth/ott/signup', {
        method: 'POST',
        body: input,
      }),

    verifyOtp: (input: {email: string; otp: string}) =>
      request<AuthTokenResponseData>('/auth/ott/verify-otp', {
        method: 'POST',
        body: input,
        // A failed OTP is a legitimate 401/400 — do NOT try to refresh a
        // (nonexistent) session token here.
        skipAuthRefresh: true,
      }),

    resendOtp: (input: {email: string}) =>
      request<ResendOtpResponseData>('/auth/ott/resend-otp', {
        method: 'POST',
        body: input,
      }),

    login: (input: {email: string; password: string}) =>
      request<AuthTokenResponseData>('/auth/login', {
        method: 'POST',
        body: input,
        skipAuthRefresh: true,
      }),

    // Social OAuth. Backend accepts { idToken, email?, name? } and returns
    // the standard login token envelope. See docs/MOBILE_API.md.
    oauthGoogle: (input: {idToken: string; email?: string; name?: string}) =>
      request<AuthTokenResponseData>('/auth/oauth/google', {
        method: 'POST',
        body: input,
        skipAuthRefresh: true,
      }),

    oauthApple: (input: {
      identityToken: string;
      email?: string;
      name?: string;
    }) =>
      request<AuthTokenResponseData>('/auth/oauth/apple', {
        method: 'POST',
        body: input,
        skipAuthRefresh: true,
      }),

    // Exchanges a refresh token for a new access + refresh pair. Rarely
    // called directly — the request pipeline handles this transparently on
    // 401. Exposed for completeness / edge cases.
    refresh: (input: {refreshToken: string}) =>
      request<RefreshResponseData>('/auth/refresh', {
        method: 'POST',
        body: input,
        skipAuthRefresh: true,
      }),

    logout: (input: {token: string}) =>
      request<MessageResponseData | Record<string, never>>('/auth/logout', {
        method: 'POST',
        token: input.token,
        // If the token is already invalid we don't want to loop through
        // refresh — the user is logging out anyway.
        skipAuthRefresh: true,
      }),

    // Current authenticated user. Role-aware — for MOBILE_USER returns
    // fullName + phone + subscriptionStatus etc.
    me: (input: {token: string}) =>
      request<MeResponseData>('/auth/me', {
        method: 'GET',
        token: input.token,
      }),

    changePassword: (input: {
      token: string;
      currentPassword: string;
      newPassword: string;
    }) =>
      request<MessageResponseData | Record<string, never>>(
        '/auth/change-password',
        {
          method: 'POST',
          token: input.token,
          body: {
            currentPassword: input.currentPassword,
            newPassword: input.newPassword,
          },
        },
      ),

    forgotPassword: (input: {email: string}) =>
      request<ForgotPasswordResponseData>('/auth/forgot-password', {
        method: 'POST',
        body: input,
      }),

    resetPassword: (input: {email: string; otp: string; password: string}) =>
      request<MessageResponseData | Record<string, never>>(
        '/auth/reset-password',
        {
          method: 'POST',
          body: input,
        },
      ),
  },

  profile: {
    // GET /mobile-users/profile — full composed profile.
    get: (input: {token: string; signal?: AbortSignal}) =>
      request<MobileUserProfile>('/mobile-users/profile', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    // PUT /mobile-users/profile — update fullName and/or phone. At least
    // one field must be provided; backend returns 400 on empty body.
    update: (input: {
      token: string;
      fullName?: string;
      phone?: string;
    }) => {
      const body: Record<string, string> = {};
      if (input.fullName !== undefined) {
        body.fullName = input.fullName;
      }
      if (input.phone !== undefined) {
        body.phone = input.phone;
      }
      return request<MobileUserProfile>('/mobile-users/profile', {
        method: 'PUT',
        token: input.token,
        body,
      });
    },
  },

  webseries: {
    list: (input: {
      token: string;
      status?: WebseriesStatus;
      genre?: string;
      search?: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>('/mobile-users/webseries', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          status: input.status,
          genre: input.genre,
          search: input.search,
          page: input.page,
          limit: input.limit,
        },
      }),

    get: (input: {token: string; id: string; signal?: AbortSignal}) =>
      request<Webseries>(`/mobile-users/webseries/${encodeURIComponent(input.id)}`, {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    getSeriesById: (input: {token: string; id: string; signal?: AbortSignal}) =>
      request<Webseries>(`/webseries/${encodeURIComponent(input.id)}`, {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    upcomingSeries: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/webseries/upcoming-series', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),
  },

  episodes: {
    list: (input: {
      token: string;
      webSeriesId: string;
      seasonId?: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Episode>('/mobile-users/episodes', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          webSeriesId: input.webSeriesId,
          seasonId: input.seasonId,
          page: typeof input.page === 'number' ? Math.max(1, input.page) : undefined,
          limit: typeof input.limit === 'number' ? Math.min(100, Math.max(1, input.limit)) : undefined,
        },
      }),

    get: (input: {token: string; id: string; signal?: AbortSignal}) =>
      request<Episode>(`/mobile-users/episodes/${encodeURIComponent(input.id)}`, {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),
  },

  seasons: {
    list: (input: {
      token: string;
      webSeriesId: string;
      signal?: AbortSignal;
    }) =>
      request<Season[]>('/mobile-users/seasons', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          webSeriesId: input.webSeriesId,
        },
      }),
  },

  // NOTE: The legacy `actors` group (`GET /actors`, `GET /actors/:id`) was
  // removed on 2026-07-27 when the backend dropped the Actors DB table.
  // Use `api.students.*` (institute-scoped student directory) instead — that
  // is the surface the mobile "Actors" tabs consume going forward.

  // Institute-scoped student directory. The backend sorts alphabetically
  // by name and filters out deleted / inactive / blocked students, so the
  // client doesn't need to post-filter.
  students: {
    list: (input: {
      token: string;
      page?: number;
      limit?: number;
      search?: string;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Student>('/mobile-users/students', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          page: input.page,
          limit: input.limit,
          search: input.search,
        },
      }),

    get: (input: {token: string; id: string; signal?: AbortSignal}) =>
      request<StudentDetail>(
        `/mobile-users/students/${encodeURIComponent(input.id)}`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
        },
      ),

    update: (input: {
      token: string;
      id: string;
      body: UpdateStudentInput;
    }) =>
      request<StudentDetail>(`/students/${encodeURIComponent(input.id)}`, {
        method: 'PUT',
        token: input.token,
        body: input.body,
      }),
  },

  notifications: {
    // Paginated list. Response body has both the notification array AND the
    // unread count so callers can drive the bell badge from any list call.
    list: (input: {
      token: string;
      page?: number;
      limit?: number;
      status?: 'unread' | 'read' | 'all';
      type?: NotificationType;
      signal?: AbortSignal;
    }) =>
      request<NotificationsListData>('/notifications', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          page: input.page,
          limit: input.limit,
          status: input.status,
          type: input.type,
        },
      }),

    send: (input: {
      token: string;
      title: string;
      message: string;
      type?: NotificationType;
      targetUserId?: string;
      deepLink?: string;
    }) =>
      request<MessageResponseData>('/notifications/send', {
        method: 'POST',
        token: input.token,
        body: {
          title: input.title,
          message: input.message,
          type: input.type || 'general',
          targetUserId: input.targetUserId,
          deepLink: input.deepLink,
        },
      }),


    unreadCount: (input: {token: string; signal?: AbortSignal}) =>
      request<UnreadCountData>('/notifications/unread-count', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    // Omit `ids` (or pass empty) to mark all unread as read.
    markRead: (input: {token: string; ids?: string[]}) =>
      request<MarkReadResponseData>('/notifications/mark-read', {
        method: 'POST',
        token: input.token,
        body: input.ids && input.ids.length > 0 ? {ids: input.ids} : {},
      }),

    delete: (input: {token: string; id: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/notifications/${encodeURIComponent(input.id)}`,
        {method: 'DELETE', token: input.token},
      ),

    clear: (input: {token: string}) =>
      request<{deleted: number}>('/notifications/all', {
        method: 'DELETE',
        token: input.token,
      }),
  },

  deviceTokens: {
    // Idempotent: safe to call on every app launch. Backend upserts by
    // token, so refresh events don't create duplicate rows.
    register: (input: {
      token: string;
      body: {
        token: string;
        platform: DevicePlatform;
        deviceId?: string;
        appVersion?: string;
      };
    }) =>
      request<DeviceTokenRecord>('/device-tokens', {
        method: 'POST',
        token: input.token,
        body: input.body,
      }),

    unregister: (input: {token: string; deviceToken: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/device-tokens/${encodeURIComponent(input.deviceToken)}`,
        {method: 'DELETE', token: input.token},
      ),
  },

  // ============================================================
  // Roadmap endpoints (docs/API_ROADMAP.yaml)
  // Every group below hits an endpoint the backend still needs to
  // ship. The stubs are wired the same way as the existing groups
  // so screens can start integrating against the contract now and
  // the API team can implement per-phase without frontend churn.
  // ============================================================

  // ---- Phase 1: Home feed aggregator ----
  home: {
    get: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<HomeFeed>('/home', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    banners: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<any[]>('/home/banners', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    continueWatching: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<ContinueWatchingItem[]>('/home/continue-watching', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    upcomingMovies: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/upcoming-movies', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    recentlyAdded: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/recently-added', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    featuredMovies: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/featured-movies', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    featuredSeries: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/featured-series', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    categories: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Genre[]>('/home/categories', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    popularDramas: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/dramas/popular', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    popularActors: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Student[]>('/home/actors/popular', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    featuredInstitutes: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<InstituteSummary[]>('/home/institutes/featured', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    recommended: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/recommended', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    trending: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/trending', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    topRated: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/top-rated', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    newReleases: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Webseries[]>('/home/new-releases', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),
  },

  // ---- Phase 2: Institutes ----
  institutes: {
    list: (input: {
      token?: string | null;
      page?: number;
      limit?: number;
      search?: string;
      sort?: 'followers' | 'recent' | 'name' | 'webseriesCount';
      city?: string;
      signal?: AbortSignal;
    }) =>
      requestPaginated<InstituteSummary>('/institutes', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          page: input.page,
          limit: input.limit,
          search: input.search,
          sort: input.sort,
          city: input.city,
        },
      }),

    get: (input: {token?: string | null; id: string; signal?: AbortSignal}) =>
      request<Institute>(`/institutes/${encodeURIComponent(input.id)}`, {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    listWebseries: (input: {
      token?: string | null;
      id: string;
      status?: WebseriesStatus;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>(
        `/institutes/${encodeURIComponent(input.id)}/webseries`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
          query: {
            status: input.status,
            page: input.page,
            limit: input.limit,
          },
        },
      ),

    listStudents: (input: {
      token?: string | null;
      id: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Student>(
        `/institutes/${encodeURIComponent(input.id)}/students`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
          query: {page: input.page, limit: input.limit},
        },
      ),

    follow: (input: {token: string; id: string}) =>
      request<FollowState>(
        `/institutes/${encodeURIComponent(input.id)}/follow`,
        {method: 'POST', token: input.token},
      ),

    unfollow: (input: {token: string; id: string}) =>
      request<FollowState>(
        `/institutes/${encodeURIComponent(input.id)}/follow`,
        {method: 'DELETE', token: input.token},
      ),

    followers: (input: {
      token?: string | null;
      id: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<FollowerUser>(
        `/institutes/${encodeURIComponent(input.id)}/followers`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
          query: {page: input.page, limit: input.limit},
        },
      ),
  },

  // ---- Phase 3: Web series extensions ----
  webseriesExtras: {
    related: (input: {
      token?: string | null;
      id: string;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>(
        `/webseries/${encodeURIComponent(input.id)}/related`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
          query: {limit: input.limit},
        },
      ),

    trailer: (input: {token?: string | null; id: string; signal?: AbortSignal}) =>
      request<Trailer>(
        `/webseries/${encodeURIComponent(input.id)}/trailer`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
        },
      ),
  },

  // ---- Phase 4 & 8: Actor extras (REMOVED) ----
  // The `actorsExtras` group (filmography / clips / upcoming / follow /
  // unfollow / followers under `/actors/:id/*`) was removed on 2026-07-27
  // along with the Actors DB table. When students-based cast / filmography
  // endpoints ship, add them under `api.studentsExtras.*` or extend
  // `api.students` directly.

  // ---- Phase 5: Playback ----
  playback: {
    get: (input: {token: string; episodeId: string; signal?: AbortSignal}) =>
      request<PlaybackManifest>(
        `/episodes/${encodeURIComponent(input.episodeId)}/playback`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
        },
      ),

    // Fire-and-forget-ish. Server may return `{allowed: false}` when another
    // device booted the caller off the concurrency-limited stream.
    heartbeat: (input: {token: string; body: HeartbeatRequest}) =>
      request<{allowed: boolean}>('/playback/heartbeat', {
        method: 'POST',
        token: input.token,
        body: input.body,
        // Heartbeats are frequent; keep the timeout tight so a stalled call
        // never blocks the render loop.
        timeoutMs: 10_000,
      }),
  },

  // ---- Phase 5: Watch progress + history ----
  watchProgress: {
    upsert: (input: {token: string; body: WatchProgressUpsert}) =>
      request<WatchProgress>('/watch-progress', {
        method: 'POST',
        token: input.token,
        body: input.body,
      }),

    get: (input: {token: string; episodeId: string; signal?: AbortSignal}) =>
      request<WatchProgress>(
        `/watch-progress/${encodeURIComponent(input.episodeId)}`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
        },
      ),

    continueWatching: (input: {
      token: string;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      request<ContinueWatchingItem[]>('/me/continue-watching', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {limit: input.limit},
      }),

    history: (input: {
      token: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<WatchHistoryItem>('/me/watch-history', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {page: input.page, limit: input.limit},
      }),

    removeHistory: (input: {token: string; id: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/me/watch-history/${encodeURIComponent(input.id)}`,
        {method: 'DELETE', token: input.token},
      ),
  },

  // ---- Watchlist ----
  watchlist: {
    list: (input: {
      token: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>('/me/watchlist', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {page: input.page, limit: input.limit},
      }),

    add: (input: {token: string; webSeriesId: string}) =>
      request<MessageResponseData | Record<string, never>>('/me/watchlist', {
        method: 'POST',
        token: input.token,
        body: {webSeriesId: input.webSeriesId},
      }),

    remove: (input: {token: string; webSeriesId: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/me/watchlist/${encodeURIComponent(input.webSeriesId)}`,
        {method: 'DELETE', token: input.token},
      ),
  },

  // ---- Phase 6: Search ----
  search: {
    query: (input: {
      token?: string | null;
      q: string;
      type?: 'all' | SearchEntityType;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      request<SearchResult>('/search', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {q: input.q, type: input.type, limit: input.limit},
      }),

    suggest: (input: {
      token?: string | null;
      q: string;
      signal?: AbortSignal;
    }) =>
      request<SearchSuggestion[]>('/search/suggest', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {q: input.q},
        // Suggest is called on every keystroke — fail fast rather than
        // hang the input while the server wakes up.
        timeoutMs: 8_000,
      }),

    history: (input: {token: string; signal?: AbortSignal}) =>
      request<SearchHistoryItem[]>('/me/search-history', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    recordHistory: (input: {token: string; query: string}) =>
      request<MessageResponseData | Record<string, never>>(
        '/me/search-history',
        {
          method: 'POST',
          token: input.token,
          body: {query: input.query},
        },
      ),

    clearHistory: (input: {token: string}) =>
      request<MessageResponseData | Record<string, never>>(
        '/me/search-history',
        {method: 'DELETE', token: input.token},
      ),

    removeHistoryItem: (input: {token: string; id: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/me/search-history/${encodeURIComponent(input.id)}`,
        {method: 'DELETE', token: input.token},
      ),
  },

  // ---- Phase 7: Discover ----
  discover: {
    feed: (input: {token?: string | null; signal?: AbortSignal}) =>
      request<{
        sections: Record<
          string,
          {
            title: string;
            type: string;
            items: any[];
            pagination?: {limit: number; offset: number; total: number; hasNext: boolean};
          }
        >;
      }>('/discover', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    search: (input: {
      token?: string | null;
      q?: string;
      genre?: string;
      type?: string;
      signal?: AbortSignal;
    }) =>
      request<{
        sections: Record<
          string,
          {
            title: string;
            type: string;
            items: any[];
            pagination?: {limit: number; offset: number; total: number; hasNext: boolean};
          }
        >;
      }>('/discover/search', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {
          q: input.q,
          genre: input.genre,
          type: input.type,
        },
      }),

    section: (input: {
      token?: string | null;
      section: string;
      limit?: number;
      offset?: number;
      signal?: AbortSignal;
    }) =>
      request<any>(`/discover/${encodeURIComponent(input.section)}`, {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {limit: input.limit, offset: input.offset},
      }),

    genres: (input: {token?: string | null; signal?: AbortSignal} = {}) =>
      request<Genre[]>('/genres', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    byGenre: (input: {
      token?: string | null;
      slug: string;
      page?: number;
      limit?: number;
      sort?: 'trending' | 'newest' | 'rating';
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>(
        `/genres/${encodeURIComponent(input.slug)}/webseries`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
          query: {
            page: input.page,
            limit: input.limit,
            sort: input.sort,
          },
        },
      ),

    trending: (input: {
      token?: string | null;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>('/discover/trending', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {limit: input.limit},
      }),

    collegeStories: (input: {
      token?: string | null;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>('/discover/college-stories', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {limit: input.limit},
      }),

    shortFilms: (input: {
      token?: string | null;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<Webseries>('/discover/short-films', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {limit: input.limit},
      }),
  },

  // ---- Reviews + ratings ----
  reviews: {
    rate: (input: {token: string; webSeriesId: string; stars: number}) =>
      request<RatingSummary>(
        `/webseries/${encodeURIComponent(input.webSeriesId)}/rate`,
        {
          method: 'POST',
          token: input.token,
          body: {stars: input.stars},
        },
      ),

    unrate: (input: {token: string; webSeriesId: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/webseries/${encodeURIComponent(input.webSeriesId)}/rate`,
        {method: 'DELETE', token: input.token},
      ),

    list: (input: {
      token?: string | null;
      webSeriesId: string;
      page?: number;
      limit?: number;
      sort?: 'recent' | 'helpful' | 'stars_desc' | 'stars_asc';
      signal?: AbortSignal;
    }) =>
      requestPaginated<Review>(
        `/webseries/${encodeURIComponent(input.webSeriesId)}/reviews`,
        {
          method: 'GET',
          token: input.token,
          signal: input.signal,
          query: {
            page: input.page,
            limit: input.limit,
            sort: input.sort,
          },
        },
      ),

    create: (input: {
      token: string;
      webSeriesId: string;
      text: string;
      stars?: number;
    }) =>
      request<Review>(
        `/webseries/${encodeURIComponent(input.webSeriesId)}/reviews`,
        {
          method: 'POST',
          token: input.token,
          body: {text: input.text, stars: input.stars},
        },
      ),

    update: (input: {
      token: string;
      id: string;
      text?: string;
      stars?: number;
    }) => {
      const body: Record<string, unknown> = {};
      if (input.text !== undefined) body.text = input.text;
      if (input.stars !== undefined) body.stars = input.stars;
      return request<Review>(`/reviews/${encodeURIComponent(input.id)}`, {
        method: 'PATCH',
        token: input.token,
        body,
      });
    },

    delete: (input: {token: string; id: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/reviews/${encodeURIComponent(input.id)}`,
        {method: 'DELETE', token: input.token},
      ),

    markHelpful: (input: {token: string; id: string}) =>
      request<{helpfulCount: number; isHelpful: boolean}>(
        `/reviews/${encodeURIComponent(input.id)}/helpful`,
        {method: 'POST', token: input.token},
      ),

    unmarkHelpful: (input: {token: string; id: string}) =>
      request<MessageResponseData | Record<string, never>>(
        `/reviews/${encodeURIComponent(input.id)}/helpful`,
        {method: 'DELETE', token: input.token},
      ),
  },

  // ---- Followed lists on /me ----
  // `following.actors` (`GET /me/following/actors`) was removed on
  // 2026-07-27 with the Actors table. If per-student follow ships later,
  // add `following.students` here pointing at `/me/following/students`.
  following: {
    institutes: (input: {
      token: string;
      page?: number;
      limit?: number;
      signal?: AbortSignal;
    }) =>
      requestPaginated<InstituteSummary>('/me/following/institutes', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
        query: {page: input.page, limit: input.limit},
      }),
  },

  // ---- Phase 9: Uploads (presigned) ----
  uploads: {
    presign: (input: {
      token: string;
      purpose: UploadPurpose;
      contentType: string;
      fileSize?: number;
    }) =>
      request<PresignedUpload>('/uploads/presign', {
        method: 'POST',
        token: input.token,
        body: {
          purpose: input.purpose,
          contentType: input.contentType,
          fileSize: input.fileSize,
        },
      }),

    confirm: (input: {
      token: string;
      key: string;
      purpose: UploadPurpose;
      resourceId?: string;
    }) =>
      request<{url: string}>('/uploads/confirm', {
        method: 'POST',
        token: input.token,
        body: {
          key: input.key,
          purpose: input.purpose,
          resourceId: input.resourceId,
        },
      }),
  },

  // ---- Preferences ----
  preferences: {
    get: (input: {token: string; signal?: AbortSignal}) =>
      request<UserPreferences>('/me/preferences', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    update: (input: {token: string; body: UserPreferences}) =>
      request<UserPreferences>('/me/preferences', {
        method: 'PUT',
        token: input.token,
        body: input.body,
      }),

    getNotifications: (input: {token: string; signal?: AbortSignal}) =>
      request<NotificationPreferences>('/notifications/preferences', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    updateNotifications: (input: {
      token: string;
      body: NotificationPreferences;
    }) =>
      request<NotificationPreferences>('/notifications/preferences', {
        method: 'PUT',
        token: input.token,
        body: input.body,
      }),
  },

  // ---- Subscriptions (Razorpay) ----
  subscriptions: {
    plans: (input: {signal?: AbortSignal} = {}) =>
      request<SubscriptionPlanTier[]>('/subscriptions/plans', {
        method: 'GET',
        signal: input.signal,
      }),

    mine: (input: {token: string; signal?: AbortSignal}) =>
      request<UserSubscription>('/subscriptions/my', {
        method: 'GET',
        token: input.token,
        signal: input.signal,
      }),

    checkout: (input: {token: string; planId: string}) =>
      request<CheckoutSession>('/subscriptions/checkout', {
        method: 'POST',
        token: input.token,
        body: {planId: input.planId},
      }),

    verify: (input: {
      token: string;
      razorpayOrderId: string;
      razorpayPaymentId: string;
      razorpaySignature: string;
    }) =>
      request<UserSubscription>('/subscriptions/verify', {
        method: 'POST',
        token: input.token,
        body: {
          razorpayOrderId: input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        },
      }),

    cancel: (input: {token: string}) =>
      request<UserSubscription>('/subscriptions/cancel', {
        method: 'POST',
        token: input.token,
      }),
  },

  // ---- App config ----
  config: {
    get: (input: {signal?: AbortSignal} = {}) =>
      request<AppConfig>('/app/config', {
        method: 'GET',
        signal: input.signal,
      }),
  },
};

// ------------------------------
// Adapters
// ------------------------------

export function toPublicUser(u: AuthUser): PublicUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    provider: 'email',
    emailVerified: u.status === 'active',
    status: u.status,
    instituteId: u.instituteId ?? null,
  };
}

// /auth/me is role-aware — normalise each shape into PublicUser so the
// rest of the app can stay role-agnostic.
export function mePayloadToPublicUser(payload: MeResponseData): PublicUser {
  // STUDENT: {id, email, role, instituteId, profile: {fullName, phone, ...}}
  if (
    'role' in payload &&
    payload.role === 'STUDENT' &&
    'profile' in payload
  ) {
    const p = payload.profile;
    return {
      id: payload.id,
      name: p?.fullName ?? payload.email.split('@')[0] ?? 'Student',
      email: payload.email,
      role: 'STUDENT',
      provider: 'email',
      emailVerified: true,
      instituteId: payload.instituteId ?? p?.instituteId ?? null,
      phone: p?.phone ?? null,
      // Store the student record _id so screens can call
      // GET /mobile-users/students/:studentId directly.
      studentId: p?._id ?? null,
    };
  }
  // MOBILE_USER: flattened MobileUserProfile
  if ('fullName' in payload && payload.fullName) {
    return {
      id: payload.userId,
      name: payload.fullName,
      email: payload.email,
      role: payload.role,
      provider: 'email',
      emailVerified: payload.emailVerified ?? payload.status === 'active',
      status: payload.status,
      instituteId: null,
      phone: payload.phone ?? null,
    };
  }
  return toPublicUser(payload as AuthUser);
}
