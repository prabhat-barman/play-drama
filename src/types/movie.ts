// Re-exports of backend content types + view-model shapes used by the UI.
//
// The frontend used to carry a hand-authored `Movie` type with fields (rating,
// match, director, etc.) that the backend does not expose. We now source the
// authoritative shape from `src/lib/api.ts` and derive a light view-model that
// components can render safely — missing fields degrade gracefully.

export type {
  Episode as ApiEpisode,
  MobileUserProfile,
  Paginated,
  PageMeta,
  Webseries,
  WebseriesStatus,
  EpisodeStatus,
} from '../lib/api';

// View-model derived from Webseries. Screens and card components render this;
// unknown values (rating, director, cast when unpopulated) stay `undefined`
// and the UI shows a sensible fallback instead of a stale mock value.
export type ContentItem = {
  id: string;
  title: string;
  year?: number;
  runtimeMin?: number;
  totalEpisodes?: number;
  seasons?: number;
  genres: string[];
  poster: string;
  backdrop: string;
  synopsis: string;
  cast?: string[];
  maturity?: string;
  isNew?: boolean;
  isPremium?: boolean;
  language?: string;
  status?: string;
};

// Legacy alias — kept so existing components (MovieCard, MovieRow) don't need
// simultaneous renames. Prefer `ContentItem` in new code.
export type Movie = ContentItem;

export type MovieRow = {
  id: string;
  title: string;
  movies: ContentItem[];
};

// Backend-TODO placeholder types. Endpoints for these do not exist yet
// (see docs/MOBILE_API.md "Known gaps"). Rendered from static seed data in
// src/data/placeholders.ts until the backend ships them.
export type Podcast = {
  id: string;
  title: string;
  author: string;
  cover: string;
  episodes: number;
  category: string;
};

export type AudioStory = {
  id: string;
  title: string;
  description: string;
  cover: string;
  durationMin: number;
};

export type NotificationItem = {
  id: string;
  type: 'new_release' | 'recommendation' | 'reminder' | 'trending';
  title: string;
  body: string;
  thumb?: string;
  time: string;
  unread?: boolean;
};

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: string;
  interval: 'month' | 'year';
  perks: string[];
  highlighted?: boolean;
};
