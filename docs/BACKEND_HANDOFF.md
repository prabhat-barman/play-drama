# Vertical / PlayDrama — Backend API Handoff

> **Audience:** Backend team owning `vertical-admin-backend`
> **Deliverable spec:** [`docs/API_ROADMAP.yaml`](./API_ROADMAP.yaml) (OpenAPI 3.1)
> **Frontend integration point:** [`src/lib/api.ts`](../src/lib/api.ts) — all groups already typed and stubbed
> **Last updated:** 2026-07-23

---

## TL;DR

Vertical mobile app ka roadmap **9 phases** mein hai (Home, Institute, WebSeries, Actor Portfolio, Player, Search, Discover, Actor Pages, Institute Dashboard). Current backend sirf `/auth`, `/webseries`, `/episodes`, `/actors`, `/notifications`, `/device-tokens`, `/mobile-users/profile` deta hai. Baaki sab implement karna hai.

Full contract [`docs/API_ROADMAP.yaml`](./API_ROADMAP.yaml) mein hai — existing envelope `{success, message, data, meta}` + Bearer auth + pagination convention preserve karke.

---

## 1. Build order (frontend priority)

| # | Endpoint group | Kyun pehle | Unblocks |
|---|---|---|---|
| 1 | **Institutes** (`/institutes`, `/institutes/:id`, `.../webseries`, `.../students`, follow) | Roadmap ka core: Institute → Students, WebSeries, Followers. Har entity is pe depend karti hai. | Phase 2 pura, Phase 3 ka `institute` field, Phase 4 ka `institute` field |
| 2 | **Follow system** — institute + actor (`POST/DELETE /follow`, `/followers`, `/me/following/*`) | Chhota kaam, dono screens unlock | Phase 2 + Phase 4/8 |
| 3 | **Actor extras** (`/actors/:id/filmography`, `/clips`, `/upcoming`) + `Actor` schema extension | Actor Portfolio + auto-generated Filmography roadmap ka core vision | Phase 4, Phase 8 |
| 4 | **Playback** (`GET /episodes/:id/playback`, `POST /playback/heartbeat`) — signed HLS + subtitles + skip markers + next episode + DRM | Abhi `episode.videoUrl` seedha use ho raha hai (insecure). Skip Intro, Next Episode, Quality Selection, Subtitles sab yahin se aayenge. | Phase 5 pura |
| 5 | **Watch progress + Continue Watching** (`POST /watch-progress`, `GET /me/continue-watching`, `/me/watch-history`) | Home screen "Continue Watching" rail + Player resume | Phase 1 personalized section, Phase 5 |
| 6 | **Watchlist** (`GET/POST/DELETE /me/watchlist`) — chhota | `WatchlistScreen` mein abhi "Server-side sync coming soon" placeholder | Watchlist tab |
| 7 | **Search** (`GET /search?type=…`, `/search/suggest`, `/me/search-history`) — multi-entity | Abhi bas `webseries?search=` hai — actor/institute search kaam nahi karta | Phase 6 |
| 8 | **Genres + Discover rails** (`GET /genres`, `/genres/:slug/webseries`, `/discover/trending`, `/discover/college-stories`, `/discover/short-films`) | Discover screen abhi hardcoded chips use kar raha hai | Phase 7 |
| 9 | **Reviews + Ratings** (`POST /webseries/:id/rate`, `/reviews`, `/reviews/:id/helpful`) | High UX value, future enhancements bucket | Rating stars + reviews section |
| 10 | **Home aggregator** (`GET /home`) — sab sections ek call mein | End mein banao jab saare sources ready ho — RN app single round-trip mein render hoga | Phase 1 |
| 11 | **Uploads** (`POST /uploads/presign` + `/uploads/confirm`) presigned S3 flow | Phase 9 institute dashboard writes | Video/poster upload |
| 12 | Subscriptions, preferences, app config | Nice-to-have, non-blocking | Premium tier launch |

---

## 2. Schema changes on existing resources

Sab **optional additive** hain — koi breaking change nahi.

### `Webseries` object (extend response)

```
+ trailerUrl, trailerThumb
+ duration                      // total series runtime in seconds
+ instituteId, institute        // populated summary (id, name, logo, city, followersCount, webseriesCount)
+ averageRating, ratingsCount, reviewsCount
+ followersCount
+ isInWatchlist                 // per-caller boolean
+ userRating                    // caller's own 1-5 star, null if unrated
```

### `Actor` object (extend response)

```
+ city, age, gender
+ instituteId, institute        // populated summary
+ followersCount, isFollowing
+ filmographyCount
```

Populate rules:
- `/webseries/:id` → full `institute` + `cast[]` (already done for cast)
- `/webseries` (list) → `institute` (summary) only, no `cast`
- `/actors/:id` → full `institute`, `filmographyCount`, `isFollowing`
- `/actors` (list) → `institute` (summary) only

---

## 3. Conventions (existing — preserve karna hai)

| | |
|---|---|
| Base URL | `https://<host>/api/v1` |
| Auth | `Authorization: Bearer <accessToken>` |
| Success envelope | `{success: true, message?, data, meta?}` |
| Error envelope | `{success: false, message, errors?: [{message, field?, constraints?}]}` |
| Pagination | `?page=1&limit=20` → response `meta: {total, page, limit, totalPages}` |
| IDs | Mongo ObjectId (24 hex chars) |
| Timestamps | ISO 8601 UTC strings |
| Rate limit | `RateLimit-Reset` (seconds) / `Retry-After` headers on 429 |
| Refresh flow | `POST /auth/refresh` — already implemented; frontend handles 401 → refresh → retry automatically |

---

## 4. Decisions team ko lena hai

1. **DRM required hai ya sirf signed HLS URL enough hai?**
   Spec Widevine + FairPlay slots ready rakhta hai but licensing setup lagega. Early decide karo.

2. **Concurrency limit** — ek user kitne devices se ek saath stream kar sakta hai?
   `POST /playback/heartbeat` response `{allowed: boolean}` mein enforce hoga.

3. **Recent searches** server pe rakhne hain ya client-side `AsyncStorage` kaafi hai?
   Agar client-side kaafi hai toh `/me/search-history` endpoints skip kar sakte ho — bas frontend ko batao.

4. **Ratings vs Reviews** — har user rate + review dono kar sakta hai, ya rating alag hai review se?
   Spec dono support karta hai; final rule confirm karo.

5. **Podcasts / Audio Stories** — roadmap mein nahi hai, but `HomeScreen` mein UI sections hain.
   Confirm: drop karna hai ya kabhi build karenge?

6. **Payment provider** — Razorpay confirm?
   Spec Razorpay assume karta hai. Stripe / Apple IAP / Google Play Billing alag hoga.

7. **Institute detail response** — `featuredWebseries` populated karke bhejna hai (2-3 titles), ya sirf `/institutes/:id/webseries` alag call se aayega?

8. **Playback URL expiry** — signed HLS URLs kitne minute valid rakhein? (5min / 15min / 1hr — CDN + player buffering ke hisaab se)

9. **Watch progress granularity** — client kitne seconds pe `POST /watch-progress` maare? (Recommendation: every 10s + on pause/quit)

10. **Institute dashboard** — mobile se writes allow karne hain (Phase 9) ya sirf web admin?

---

## 5. Testing / integration

- Frontend `src/lib/api.ts` mein saare endpoint stubs already type-safe hain (2140 lines, 0 lint errors, TypeScript clean).
- Existing screens ko koi refactor nahi chahiye — endpoint deploy hote hi hum wire kar denge.
- Har group ka usage example TypeScript IntelliSense mein visible hai (JSDoc comments included).

### Sample integration (already working pattern)

```ts
// Institute profile screen ke liye
const {data, loading, error} = useApi(
  signal => api.institutes.get({token, id: instituteId, signal}),
  [token, instituteId],
);

// Playback
const manifest = await api.playback.get({token, episodeId});
// Heartbeat every 30s while playing
await api.playback.heartbeat({token, body: {sessionId, episodeId, positionSec, playbackState: 'playing'}});

// Watchlist toggle
await api.watchlist.add({token, webSeriesId});
```

---

## 6. Ballpark estimate (rough, 1 backend dev full-time)

| Batch | Scope | Weeks |
|---|---|---|
| Priority 1-3 | Institute + Follow + Actor extras (mostly CRUD + populates) | ~1.5 |
| Priority 4-5 | Playback + Watch progress (signed URLs + CloudFront/S3 config) | ~1.5 |
| Priority 6-10 | Watchlist + Search + Genres + Reviews + Home aggregator | ~2 |
| Priority 11+ | Uploads + Subscriptions + Config | ~1 |
| **Total MVP** | | **~6 weeks** |

---

## 7. References

- OpenAPI spec: [`docs/API_ROADMAP.yaml`](./API_ROADMAP.yaml)
- Existing Swagger: <https://vertical-admin-backend.onrender.com/api-docs>
- Existing mobile API client: [`src/lib/api.ts`](../src/lib/api.ts)
- Existing placeholders being replaced: [`src/data/placeholders.ts`](../src/data/placeholders.ts)

### Roadmap phase mapping

- **Phase 1 — Home Feed:** `/home`, `/discover/*`
- **Phase 2 — Institute Profile:** `/institutes/*`
- **Phase 3 — Web Series Details:** extended `/webseries/:id`, `/webseries/:id/related`, `/webseries/:id/trailer`
- **Phase 4 — Actor Portfolio:** `/actors/:id/filmography`, `/clips`, `/upcoming`, follow
- **Phase 5 — Video Player:** `/episodes/:id/playback`, `/watch-progress`, `/me/continue-watching`, `/playback/heartbeat`
- **Phase 6 — Search:** `/search`, `/search/suggest`, `/me/search-history`
- **Phase 7 — Discover:** `/genres`, `/genres/:slug/webseries`, `/discover/*`
- **Phase 8 — Actor Pages:** same as Phase 4 + `/actors/:id/followers`
- **Phase 9 — Institute Dashboard:** writes on `/webseries` + `/episodes` + `/uploads/presign` flow
- **Cross-cutting:** follow, reviews, watchlist, `/app/config`, `/me/preferences`, subscriptions
