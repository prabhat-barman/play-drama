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
export function webseriesToContent(w: any): ContentItem {
  if (!w) {
    return {
      id: '',
      title: '',
      genres: [],
      poster: '',
      backdrop: '',
      synopsis: '',
    };
  }
  const id = w._id || w.id || w.redirectId || '';
  return {
    id,
    title: w.title || '',
    year: parseYear(w.releaseDate),
    totalEpisodes: w.totalEpisodes,
    seasons:
      typeof w.totalEpisodes === 'number' && w.totalEpisodes > 0
        ? 1
        : undefined,
    genres: (w.genres ?? []).map(capitalize),
    poster: w.thumbnail || w.image || w.coverImage || '',
    backdrop: w.image || w.coverImage || w.thumbnail || '',
    synopsis:
      w.description ||
      w.synopsis ||
      w.summary ||
      w.shortDescription ||
      w.tagline ||
      '',
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

