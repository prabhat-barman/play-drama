import type {CastMember, Episode as ApiEpisode, Webseries} from './api';
import type {ContentItem} from '../types/movie';

const NEW_RELEASE_WINDOW_DAYS = 45;

function parseYear(date?: string): number | undefined {
  if (!date) {
    return undefined;
  }
  const t = Date.parse(date);
  return Number.isNaN(t) ? undefined : new Date(t).getUTCFullYear();
}

function isRecent(date?: string): boolean {
  if (!date) {
    return false;
  }
  const t = Date.parse(date);
  if (Number.isNaN(t)) {
    return false;
  }
  const ageDays = (Date.now() - t) / (1000 * 60 * 60 * 24);
  return ageDays >= 0 && ageDays <= NEW_RELEASE_WINDOW_DAYS;
}

function capitalize(g: string): string {
  if (!g) {
    return g;
  }
  return g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
}

// Backend Webseries → UI ContentItem. Missing fields degrade to `undefined`;
// components should render fallbacks rather than assuming these exist.
export function webseriesToContent(w: Webseries): ContentItem {
  return {
    id: w._id,
    title: w.title,
    year: parseYear(w.releaseDate),
    totalEpisodes: w.totalEpisodes,
    // The backend models a webseries; if it has episodes we surface a
    // notional "seasons" count of 1 so the details screen shows the
    // Episodes tab. When the backend adds a real seasons field this can
    // be replaced.
    seasons:
      typeof w.totalEpisodes === 'number' && w.totalEpisodes > 0
        ? 1
        : undefined,
    genres: (w.genres ?? []).map(capitalize),
    poster: w.thumbnail || w.coverImage || '',
    backdrop: w.coverImage || w.thumbnail || '',
    synopsis: w.description || '',
    // `cast` is a union: unpopulated ObjectIds on list responses, populated
    // `CastMember[]` on `GET /mobile-users/webseries/:id`. We only surface
    // it when populated (list responses would show meaningless hex IDs).
    cast: castMemberNames(w.cast),
    maturity: w.ageRating,
    isNew: isRecent(w.releaseDate),
    isPremium: w.isPremium,
    language: w.language,
    status: w.status,
  };
}

export function episodeRuntimeMinutes(e: ApiEpisode): number | undefined {
  if (typeof e.duration !== 'number' || e.duration <= 0) {
    return undefined;
  }
  return Math.max(1, Math.round(e.duration / 60));
}

// Extract cast display names from the union `Webseries.cast` field.
// - `CastMember[]` (populated on detail) → return `fullName` values
// - `string[]`     (unpopulated ObjectIds on list) → return `undefined`
//   so the UI shows a fallback rather than raw hex ids
// - `undefined`    → return `undefined`
function castMemberNames(
  cast: Webseries['cast'],
): string[] | undefined {
  if (!Array.isArray(cast) || cast.length === 0) {
    return undefined;
  }
  if (typeof cast[0] === 'string') {
    return undefined;
  }
  return (cast as CastMember[])
    .map(c => c?.fullName)
    .filter((n): n is string => typeof n === 'string' && n.length > 0);
}

