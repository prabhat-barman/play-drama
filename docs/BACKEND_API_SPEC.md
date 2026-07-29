# Play Drama — Backend API Specification

> **Purpose of this document**
> Single reference for the backend team. Every endpoint the Play Drama mobile app calls (or plans to call) is listed here with **path, method, purpose, request payload, response shape, error codes, and current status**.
>
> **Audience:** Backend team owning `vertical-admin-backend`
> **Frontend contract:** [`src/lib/api.ts`](../src/lib/api.ts) (typed, 0 lint errors)
> **Live Swagger:** <https://vertical-admin-backend.onrender.com/api-docs>
> **Companion docs:**
> - [`docs/BACKEND_HANDOFF.md`](./BACKEND_HANDOFF.md) — priorities, timeline, open decisions
> - [`docs/API_ROADMAP.yaml`](./API_ROADMAP.yaml) — full OpenAPI 3.1 spec
>
> **Last updated:** 2026-07-29
>
> **Recent changes:**
> - **2026-07-29** — Web series and episodes moved under `/mobile-users/*` (was `/webseries*`, `/episodes*`). See [§ 5](#5-web-series-mobile-) and [§ 6](#6-episodes-mobile-).
> - **2026-07-29** — Verified live shapes against Swagger. `Webseries.cast` is **not gone** — its shape changed: unpopulated ObjectIds (`string[]`) on list, populated `CastMember[]` = `{_id, fullName, profileImage?}` on `/mobile-users/webseries/:id`. `WebseriesStatus.IN_REVIEW` was renamed to `UNDER_REVIEW`; `EpisodeStatus.PENDING` was renamed to `DRAFT`. New optional fields on webseries: `visibility`, `popularity`.
> - **2026-07-27** — Backend dropped the `Actors` DB table. `GET /actors*` and `GET /me/following/actors` are removed. Cast is now returned as student-like `CastMember` objects on detail responses (see below). The mobile app uses [Students](#4-students--actors-directory-) (`/mobile-users/students`) for the standalone Actors surface.

---

## Legend

| Badge | Meaning |
|---|---|
| ✅ **Live** | Already implemented in `vertical-admin-backend`, verified in Swagger |
| 🚧 **To build** | Spec ready, mobile app already typed & stubbed, backend implementation pending |
| 🔒 | Requires `Authorization: Bearer <accessToken>` |
| 🌓 | Auth optional — response may differ (e.g. `isFollowing`, `userRating`) when authed |

---

## Table of contents

1. [Conventions](#1-conventions)
2. [Auth](#2-auth-)
3. [Mobile user profile](#3-mobile-user-profile-)
4. [Students / Actors directory](#4-students--actors-directory-)
5. [Web series](#5-web-series-mobile-)
6. [Episodes](#6-episodes-mobile-)
7. ~~Actors~~ **REMOVED 2026-07-27** — see [§ 7](#7-actors-removed-2026-07-27)
8. [Notifications](#8-notifications-)
9. [Device tokens (push)](#9-device-tokens-push-)
10. [Home aggregator](#10-home-aggregator-)
11. [Institutes](#11-institutes-)
12. [Web series extras](#12-web-series-extras-)
13. ~~Actor extras~~ **REMOVED 2026-07-27** — see [§ 13](#13-actor-extras-removed-2026-07-27)
14. [Playback](#14-playback-)
15. [Watch progress / history](#15-watch-progress--history-)
16. [Watchlist](#16-watchlist-)
17. [Search](#17-search-)
18. [Discover / Genres](#18-discover--genres-)
19. [Reviews / Ratings](#19-reviews--ratings-)
20. [Following](#20-following-)
21. [Uploads (presigned)](#21-uploads-presigned-)
22. [Preferences](#22-preferences-)
23. [Subscriptions](#23-subscriptions-)
24. [App config](#24-app-config-)
25. [Appendix: error codes, rate limits, open decisions](#25-appendix)

---

## 1. Conventions

| | |
|---|---|
| **Base URL** | `https://<host>/api/v1` |
| **Auth header** | `Authorization: Bearer <accessToken>` |
| **Content type** | `application/json` on request & response |
| **IDs** | Mongo ObjectId (24 hex chars) |
| **Timestamps** | ISO 8601 UTC strings (e.g. `"2026-07-27T06:15:00.000Z"`) |
| **Durations** | Seconds (integer) unless specified |
| **Money** | Minor units (paise / cents, integer) + `currency` (ISO 4217 code) |

### Success envelope

Every success response follows this shape:

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": { /* endpoint-specific payload */ },
  "meta": { /* pagination or extra info, when applicable */ }
}
```

### Error envelope

```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [
    {
      "message": "Optional per-field error",
      "field": "email",
      "constraints": ["isEmail", "isNotEmpty"]
    }
  ]
}
```

The mobile client will extract the message via `errors[0].message || errors[0].constraints[0] || message`.

### Pagination

Query params: `?page=1&limit=20`
Response `meta`:

```json
{
  "total": 150,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

Default `page=1`, `limit=20`. Max `limit=100` recommended.

### Rate limiting

429 responses must include either `RateLimit-Reset` (seconds until window resets) or `Retry-After` (seconds) header. The mobile client already surfaces a friendly "Too many requests, try in ~Xs" message and does **not** auto-retry — it's up to the user.

### Refresh flow

Access tokens expire; client transparently:
1. Detects `401` on any request
2. Calls `POST /auth/refresh` with the stored refresh token
3. Retries the original request with the new access token
4. If refresh fails, wipes session and routes user to Login

Backend must accept the refresh token even shortly after issuance (no server-side session pinning to a single IP).

---

## 2. Auth ✅

All auth endpoints are **public** (no bearer token) except `POST /auth/logout`, `POST /auth/change-password`, `GET /auth/me` which require the bearer token.

### `POST /auth/ott/signup` ✅

**Purpose:** Register a new mobile (OTT) user with email + password. Sends an OTP to email for verification.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "MinLength8!",
  "fullName": "Prabhat Barman",
  "phone": "+919999999999"       // optional (E.164)
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "userId": "6631a2b3c4d5e6f7a8b9c0d1",
    "email": "user@example.com",
    "role": "MOBILE_USER",
    "status": "pending_verification",
    "emailVerified": false,
    "name": "Prabhat Barman",
    "emailSent": true,
    "otpExpiresInMinutes": 10,
    "message": "OTP sent to your email",
    "otp": "123456"    // dev/staging only — MUST be omitted in production
  }
}
```

**Errors:** `400` bad body · `409` email already registered · `429` throttled

---

### `POST /auth/ott/verify-otp` ✅

**Purpose:** Verify the OTP and mark the account as active. Returns the access + refresh token pair on success.

**Body:**
```json
{ "email": "user@example.com", "otp": "123456" }
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "6631a2b3...",
      "email": "user@example.com",
      "role": "MOBILE_USER",
      "status": "active",
      "name": "Prabhat Barman"
    }
  }
}
```

**Errors:** `400` malformed · `401` wrong / expired OTP · `429` throttled

---

### `POST /auth/ott/resend-otp` ✅

**Purpose:** Re-send an OTP if the previous one expired or the user didn't receive it.

**Body:** `{ "email": "user@example.com" }`

**Response 200:** same shape as forgot-password (see below): `{ email, emailSent, otpExpiresInMinutes, message, otp? }`.

**Errors:** `404` no such account · `429` throttled

---

### `POST /auth/login` ✅

**Purpose:** Unified email + password login for both `MOBILE_USER` (OTT signups) and `STUDENT` (institute-provisioned) roles. Response identifies the role so the app can route to the right shell.

**Body:** `{ "email": "user@example.com", "password": "•••••••" }`

**Response 200:** same shape as `verify-otp` — `{ accessToken, refreshToken, user }` where `user.role` is `MOBILE_USER` or `STUDENT`.

**Errors:** `400` bad body · `401` wrong password · `403` account locked / pending_verification · `429` throttled

---

### `POST /auth/refresh` ✅

**Purpose:** Exchange a valid refresh token for a new access + refresh pair. Called transparently by the mobile client on `401`.

**Body:** `{ "refreshToken": "eyJhbGciOi..." }`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

**Errors:** `401` invalid / revoked refresh token

**Important:** Rotate the refresh token on every use (return a new one). Old refresh token must be invalidated after use.

---

### `POST /auth/logout` ✅ 🔒

**Purpose:** Invalidate the current session server-side. Client also wipes local state.

**Body:** empty `{}`

**Response 200:** `{ "success": true, "data": { "message": "Logged out" } }` or `{ "success": true, "data": {} }`

**Notes:** Backend should revoke the refresh token associated with this access token. Idempotent — repeated calls with an already-invalid token should also return 200.

---

### `GET /auth/me` ✅ 🔒

**Purpose:** Fetch the currently authenticated user. Role-aware — response shape differs.

**Response 200 (MOBILE_USER):**
```json
{
  "success": true,
  "data": {
    "userId": "6631a2b3...",
    "email": "user@example.com",
    "role": "MOBILE_USER",
    "status": "active",
    "emailVerified": true,
    "fullName": "Prabhat Barman",
    "phone": "+919999999999",
    "subscriptionStatus": "active",
    "linkedProviders": [
      { "provider": "google", "linkedAt": "2026-07-01T..." }
    ],
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Response 200 (STUDENT):**
```json
{
  "success": true,
  "data": {
    "id": "6631a2b3...",
    "email": "student@institute.edu",
    "role": "STUDENT",
    "instituteId": "6631a2b3...",
    "profile": {
      "_id": "...",
      "fullName": "Anaya Sharma",
      "firstName": "Anaya",
      "lastName": "Sharma",
      "phone": "+91...",
      "admissionNumber": "STU001",
      "instituteId": "...",
      "isDeleted": false
    }
  }
}
```

**Errors:** `401` invalid token

---

### `POST /auth/change-password` ✅ 🔒

**Purpose:** Change password for an authenticated user (must know the current password).

**Body:**
```json
{ "currentPassword": "••••••", "newPassword": "NewStrong@123" }
```

**Response 200:** `{ "success": true, "data": { "message": "Password changed" } }`

**Errors:** `400` new password too weak · `401` current password wrong

---

### `POST /auth/forgot-password` ✅

**Purpose:** Request an OTP for password reset. Always returns 200 (email enumeration protection).

**Body:** `{ "email": "user@example.com" }`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "If an account exists, an OTP has been sent",
    "email": "user@example.com",
    "emailSent": true,
    "otpExpiresInMinutes": 10,
    "otp": "654321"    // dev/staging only
  }
}
```

---

### `POST /auth/reset-password` ✅

**Purpose:** Complete a password reset using the OTP.

**Body:** `{ "email": "user@example.com", "otp": "654321", "password": "NewStrong@123" }`

**Response 200:** `{ "success": true, "data": { "message": "Password reset successful" } }`

**Errors:** `400` weak · `401` OTP wrong / expired

---

### `POST /auth/oauth/google` ✅

**Purpose:** Sign in / sign up via Google (native Sign-In on iOS/Android).

**Body:**
```json
{
  "idToken": "eyJhbGciOi...",   // Google-issued
  "email": "user@gmail.com",     // optional, hint
  "name":  "Prabhat Barman"      // optional, hint
}
```

**Response 200:** same as `/auth/login` — `{ accessToken, refreshToken, user }`.

Backend must verify `idToken` against Google's public keys, extract `sub` + `email` + `email_verified`, and either look up or create a `MOBILE_USER`.

---

### `POST /auth/oauth/apple` ✅

**Purpose:** Sign in / sign up via "Sign in with Apple".

**Body:** `{ "identityToken": "...", "email": "...", "name": "..." }`  (last two are only provided on first sign-in by Apple)

**Response 200:** same as `/auth/login`.

---

## 3. Mobile user profile ✅

### `GET /mobile-users/profile` ✅ 🔒

**Purpose:** Full composed profile of the authenticated `MOBILE_USER`. Powers the Profile screen.

**Response 200:** Same shape as `GET /auth/me` MOBILE_USER response.

---

### `PUT /mobile-users/profile` ✅ 🔒

**Purpose:** Update editable profile fields. Backend rejects an empty body.

**Body (at least one field required):**
```json
{ "fullName": "New Name", "phone": "+919999999999" }
```

**Response 200:** the updated `MobileUserProfile` object.

**Errors:** `400` empty body / invalid phone · `409` phone already used by another account

---

## 4. Students / Actors directory ✅

Publicly browsable directory of institute-provisioned students who double as the "actors" surface in the app.

### `GET /mobile-users/students` ✅ 🔒

**Purpose:** Paginated list of active students across all institutes. Sorted alphabetically. Excludes deleted / inactive / blocked.

**Query params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | 1 | 1-indexed |
| `limit` | int | 10 | Max page size |
| `search` | string | — | Partial, case-insensitive name search |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6631a2b3...",
      "fullName": "John Doe",
      "profileImage": "https://cdn.example.com/profiles/john.jpg",
      "course": "B.Tech",
      "department": "Computer Science",
      "batch": "2024-2028",
      "semester": "3",
      "studentCode": "STU001"
    }
  ],
  "meta": { "total": 50, "page": 1, "limit": 10, "totalPages": 5 }
}
```

---

### `GET /mobile-users/students/{studentId}` ✅ 🔒

**Purpose:** Public detail view for a single student. Excludes admin / sensitive fields.

**Path param:** `studentId` — Mongo ObjectId

**Response 200:**
```json
{
  "success": true,
  "data": {
    "_id": "6631a2b3...",
    "fullName": "John Doe",
    "profileImage": "...",
    "course": "B.Tech",
    "department": "Computer Science",
    "batch": "2024-2028",
    "semester": "3",
    "studentCode": "STU001",
    "bio": "Passionate software developer and open source contributor",
    "skills": ["JavaScript", "React", "Node.js"],
    "socialLinks": [
      { "platform": "github", "url": "https://github.com/johndoe" }
    ],
    "achievements": [
      {
        "title": "Winner - Hackathon 2025",
        "description": "Secured first place",
        "date": "2025-03-15",
        "certificateUrl": "..."
      }
    ],
    "institute": {
      "_id": "6631a2b3...",
      "name": "IIT Delhi",
      "logo": "..."
    }
  }
}
```

**Errors:** `404` student not found / inactive / deleted

---

## 5. Web series (mobile) ✅

> **Path migration (2026-07-29):** These endpoints previously lived under `/webseries*` and moved to `/mobile-users/webseries*` to match the `/mobile-users/students` and `/mobile-users/profile` naming convention. The mobile client (`src/lib/api.ts`) has been updated; there are no live callers of the old paths.

### `GET /mobile-users/webseries` ✅ 🔒

**Purpose:** Browse published series. Powers Home / Discover / Watchlist rails.

**Query params:** `status` (WebseriesStatus), `genre`, `search`, `page`, `limit`

`WebseriesStatus` enum: `DRAFT | SUBMITTED | UNDER_REVIEW | APPROVED | REJECTED | PUBLISHED | ARCHIVED`. Mobile only ever passes `PUBLISHED`.

**Response 200 (paginated):** array of `MobileWebSeriesItem` (see [`src/lib/api.ts`](../src/lib/api.ts) `Webseries` type). Populate `institute` summary. On list responses, `cast` is `string[]` (unpopulated ObjectIds) — the mobile client does not read this on lists. **Do not embed `episodes[]` on list responses** — keep list payloads slim.

**Extra fields the server emits (client tolerates all):** `visibility`, `popularity`, `trailerUrl`, `trailerThumb`, `duration`, `averageRating`, `ratingsCount`, `reviewsCount`, `followersCount`, `isInWatchlist`, `userRating`.

---

### `GET /mobile-users/webseries/{id}` ✅ 🔒

**Purpose:** Full detail view (Movie Details screen).

**Response 200:** full `MobileWebSeriesDetail` object with populated `institute`. All `MobileWebSeriesItem` fields, plus:

- **`cast: CastMember[]`** — populated members: `{ _id: string; fullName: string; profileImage?: string }`. This is the current live shape (verified via Swagger 2026-07-29). Drives the Movie Details "Cast" tab.
- **`episodes: Episode[]`** ⏳ *Requested but not yet implemented.* First page of episodes (sorted by `episodeNumber` ASC), max 30 items — saves the mobile client one round-trip. Client is already typed for this; ship when ready.
- **`hasMoreEpisodes: boolean`** ⏳ *Requested but not yet implemented.* `true` if `totalEpisodes > episodes.length`. Client paginates via `GET /mobile-users/episodes?webSeriesId={id}&page=2` when this is `true`.

Extended fields (all optional, tolerated if missing):

- `trailerUrl`, `trailerThumb`, `duration`
- `averageRating`, `ratingsCount`, `reviewsCount`
- `followersCount`
- `isInWatchlist` (per-caller)
- `userRating` (per-caller, null when unrated)

> **Cast history note (2026-07-27):** When the Actors DB table was dropped, the top-level `/actors*` endpoints were removed but `Webseries.cast` was **kept** on the detail response — its shape switched from the old `Actor` (with `bio`, `photo`, `skills`, ...) to the current lightweight `CastMember` (`_id`, `fullName`, `profileImage`). If richer per-cast data is needed later (bio / skills / follow), consider linking `CastMember._id` to a Student and letting the client fetch [Student detail](#4-students--actors-directory-) on demand rather than fattening this response.

---

## 6. Episodes (mobile) ✅

> **Path migration (2026-07-29):** These endpoints previously lived under `/episodes*` and moved to `/mobile-users/episodes*`.

### `GET /mobile-users/episodes?webSeriesId={id}` ✅ 🔒

**Purpose:** Paginated tail of episodes when the first page in `webseries/{id}.episodes` isn't enough (i.e. `hasMoreEpisodes: true`).

**Query params:** `webSeriesId` (required), `page`, `limit`

**Response 200 (paginated):** array of `MobileEpisodeItem` objects: `_id, webSeriesId, title, description, episodeNumber, orderIndex, duration, videoUrl, thumbnail, status, releaseDate`.

`EpisodeStatus` enum: `DRAFT | PROCESSING | COMPLETED | FAILED`. Mobile filters to `COMPLETED` client-side today; feel free to filter server-side by default.

---

### `GET /mobile-users/episodes/{id}` ✅ 🔒

**Purpose:** Single-episode fetch (used when opening the player from a deep link).

**Response 200:** single `Episode` object.

> **Note:** `episode.videoUrl` is currently a raw HLS URL. This is temporary — see [Playback](#14-playback-) for the secure replacement.

---

## 7. Actors (REMOVED 2026-07-27)

> **This section is intentionally kept as a tombstone** so future readers understand why `/actors*` no longer exists.

The Actors DB table and all top-level `/actors*` endpoints were removed on 2026-07-27 by the backend team (they were creating confusion vs. institute-scoped Students).

**What survived:** `Webseries.cast` is still emitted — populated on `GET /mobile-users/webseries/{id}` as `CastMember[]` (`{_id, fullName, profileImage?}`) rather than the old `Actor[]`. The Movie Details "Cast" tab renders these names/avatars. See [§ 5 detail response](#5-web-series-mobile-).

**What was removed:**

- `GET /actors`, `GET /actors/{id}` (top-level directory)
- `GET /actors/{id}/filmography`, `.../clips`, `.../upcoming`, `.../follow`, `.../followers`
- `GET /me/following/actors`

**Client migration:** `api.actors.*`, `api.actorsExtras.*`, `api.following.actors`, and the `Actor` type have been deleted from `src/lib/api.ts`. The Cast tab in MovieDetailsScreen was retained — it renders from the still-present `Webseries.cast` field.

**Replacement for the standalone Actors directory:** [Students / Actors directory](#4-students--actors-directory-) (`/mobile-users/students`) — richer institute-scoped model with `course`, `department`, `batch`, achievements, etc.

**If richer per-cast data is needed later** (bio, skills, follow), link `CastMember._id` to a Student `_id` so the client can fetch [Student detail](#4-students--actors-directory-) on-demand rather than fattening the webseries detail response.

---

## 8. Notifications ✅

### `GET /notifications` ✅ 🔒

**Purpose:** Notifications tab — paginated list + unread count in the same payload (drives the bell badge across the app).

**Query params:** `page`, `limit`, `status` (`unread` | `read` | `all`), `type` (any `NotificationType`)

`NotificationType` enum: `system | subscription | upload | content_approval | general | new_release | trending | recommendation | reminder`.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "...",
        "title": "New episode available",
        "message": "Ep 3 of \"Campus Diaries\" is live.",
        "type": "new_release",
        "isRead": false,
        "deepLink": "cinestream://webseries/6631a2b3...",
        "imageUrl": "...",
        "data": { "webSeriesId": "..." },
        "createdAt": "...",
        "updatedAt": "..."
      }
    ],
    "unreadCount": 3
  }
}
```

---

### `GET /notifications/unread-count` ✅ 🔒

**Purpose:** Fast bell-badge check (called on foreground, tab switch).

**Response 200:** `{ "success": true, "data": { "count": 3 } }`

---

### `POST /notifications/mark-read` ✅ 🔒

**Purpose:** Mark specific notifications as read; empty body → mark all unread as read.

**Body:** `{ "ids": ["6631a2b3...", "..."] }` or `{}` for "mark all"

**Response 200:** `{ "success": true, "data": { "updated": 3 } }`

---

### `DELETE /notifications/{id}` ✅ 🔒

**Purpose:** User-driven delete of a single notification (swipe / three-dot menu).

**Response 200:** `{ "success": true, "data": { "message": "Deleted" } }`

---

### `DELETE /notifications/all` ✅ 🔒

**Purpose:** "Clear all" bulk action.

**Response 200:** `{ "success": true, "data": { "deleted": 42 } }`

---

## 9. Device tokens (push) ✅

Both endpoints are **idempotent** — safe to call on every launch. Backend upserts by `token`.

### `POST /device-tokens` ✅ 🔒

**Purpose:** Register / refresh the FCM device token for push. Called after user grants permission.

**Body:**
```json
{
  "token": "fcm_registration_token_here",
  "platform": "ios",           // ios | android | web
  "deviceId": "device-uuid",   // optional, stable per device
  "appVersion": "1.2.3"        // optional
}
```

**Response 200:** `DeviceTokenRecord` — `{ id, token, platform, deviceId, appVersion, lastSeenAt, createdAt, updatedAt }`.

---

### `DELETE /device-tokens/{token}` ✅ 🔒

**Purpose:** Unregister on logout / permission revocation.

**Response 200:** `{ "success": true, "data": { "message": "Unregistered" } }`

---

# 🚧 To-build endpoints (roadmap)

Everything below is **not yet implemented** in the backend. Mobile app has typed stubs ready in [`src/lib/api.ts`](../src/lib/api.ts). See [`docs/BACKEND_HANDOFF.md`](./BACKEND_HANDOFF.md) for build priority order.

---

## 10. Home aggregator 🚧

### `GET /home` 🚧 🌓

**Purpose:** Single call that hydrates the entire Home screen (banner + trending + new + popular institutes + new actors + genres + continue-watching + recommendations). Reduces cold-start round-trips from ~7 to 1.

**Auth:** Optional. `continueWatching` and `recommendations` only populated when authed.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "featuredBanner": { /* Webseries */ } || null,
    "trending":        [ /* Webseries[] */ ],
    "recentlyReleased":[ /* Webseries[] */ ],
    "popularInstitutes":[ /* InstituteSummary[] */ ],
    "newStudents":     [ /* Student[] — replaces the deprecated newActors field */ ],
    "categories":      [ /* Genre[] */ ],
    "continueWatching":[ /* ContinueWatchingItem[] */ ],
    "recommendations": [ /* Webseries[] */ ]
  }
}
```

Each nested list should be capped server-side (10-15 items) so the payload stays under ~50 KB.

---

## 11. Institutes 🚧

### `GET /institutes` 🚧 🌓

**Query:** `page, limit, search, city, sort` (`followers | recent | name | webseriesCount`)

**Response 200 (paginated):** `InstituteSummary[]` — `{ id, name, slug?, logo?, city?, followersCount?, webseriesCount? }`.

---

### `GET /institutes/{id}` 🚧 🌓

**Purpose:** Institute profile screen (Phase 2).

**Response 200:** `Institute` — extends `InstituteSummary` with `coverImage, description, location {city,state,country}, website, foundedYear, totalStudents, isFollowing (per-caller), featuredWebseries (2-3 titles for the hero rail)`.

**Open decision:** should `featuredWebseries` be inlined here or requested separately? See [Handoff § 4.7](./BACKEND_HANDOFF.md#4-decisions-team-ko-lena-hai).

---

### `GET /institutes/{id}/webseries` 🚧 🌓

**Query:** `status, page, limit` — same as `/mobile-users/webseries`.

**Response 200 (paginated):** `Webseries[]` scoped to that institute.

---

### `GET /institutes/{id}/students` 🚧 🌓

**Query:** `page, limit`

**Response 200 (paginated):** `Student[]` (see [§ 4](#4-students--actors-directory-) shape).

---

### `POST /institutes/{id}/follow` 🚧 🔒

**Purpose:** Follow an institute. Idempotent (repeat calls no-op).

**Response 200:** `{ "success": true, "data": { "isFollowing": true, "followersCount": 1234 } }`

---

### `DELETE /institutes/{id}/follow` 🚧 🔒

**Purpose:** Unfollow.

**Response 200:** `{ "success": true, "data": { "isFollowing": false, "followersCount": 1233 } }`

---

### `GET /institutes/{id}/followers` 🚧 🌓

**Purpose:** "Who follows" list (public modal / social proof).

**Response 200 (paginated):** `FollowerUser[]` — `{ id, name, avatarUrl?, followedAt }`.

---

## 12. Web series extras 🚧

> All sub-paths in this section extend the live `/mobile-users/webseries/{id}` endpoint documented in [§ 5](#5-web-series-mobile-).

### `GET /mobile-users/webseries/{id}/related` 🚧 🌓

**Purpose:** "You may also like" rail on the Details screen.

**Query:** `limit` (default 10)

**Response 200 (paginated):** `Webseries[]`.

Recommendation algorithm free-form (genre overlap / same institute / cast overlap). Cache aggressively.

---

### `GET /mobile-users/webseries/{id}/trailer` 🚧 🌓

**Purpose:** Play the trailer button on Details screen — the trailer may live on a separate CDN than the main HLS asset.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "hlsUrl": "https://cdn.../trailer.m3u8",
    "mp4Url": "https://cdn.../trailer.mp4",     // optional fallback
    "thumbnail": "...",
    "durationSec": 90
  }
}
```

---

## 13. Actor extras (REMOVED 2026-07-27)

> **Tombstone** — kept so future readers see the deprecation reason.

All `/actors/:id/*` roadmap endpoints (filmography, clips, upcoming, follow, unfollow, followers) were dropped with the Actors table on 2026-07-27. The mobile client no longer references them; `api.actorsExtras.*` has been deleted from `src/lib/api.ts`.

**If similar functionality is needed later**, propose it under `/mobile-users/students/{id}/*` — e.g.:

- `GET /mobile-users/students/{id}/filmography` → `Webseries[]` (series where the student appeared)
- `GET /mobile-users/students/{id}/clips` → highlight clips
- `POST /mobile-users/students/{id}/follow` · `DELETE ...` → follow the student

Model derivation would be: a webseries has a `students: StudentSummary[]` field (per [§ 5](#5-web-series-mobile-)); filmography = webseries whose `students[]` contains `studentId`.

---

## 14. Playback 🚧

Critical for Phase 5. Replaces the current insecure `episode.videoUrl` in `GET /mobile-users/episodes/{id}`.

### `GET /mobile-users/episodes/{episodeId}/playback` 🚧 🔒

**Purpose:** Issue a **short-lived signed HLS URL** + player context. Backend enforces entitlement here (subscription tier, geo, DRM, concurrency).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "hlsUrl":  "https://cdn.../signed/episode.m3u8?expires=...&sig=...",
    "dashUrl": "https://cdn.../signed/episode.mpd",   // optional
    "drm": {
      "widevineLicenseUrl":      "https://.../licence",
      "fairplayLicenseUrl":      "https://.../licence",
      "fairplayCertificateUrl":  "https://.../cert.der"
    },
    "subtitles":  [{ "lang": "en", "label": "English", "url": "...", "default": true }],
    "audioTracks":[{ "lang": "en", "label": "English",         "default": true }],
    "qualities":  [{ "label": "1080p", "bitrate": 5000000, "width": 1920, "height": 1080 }],
    "skipIntro":   { "startSec": 0,  "endSec": 45  },
    "skipCredits": { "startSec": 2650, "endSec": 2700 },
    "nextEpisodeId": "6631a2b3...",
    "durationSec": 2700,
    "adBreaks": [{ "atSec": 900, "vastUrl": "https://ads.example.com/vast.xml" }],
    "sessionId": "sess_9zXK..."   // used to correlate heartbeats
  }
}
```

**Errors:** `402` subscription required · `403` geo-blocked / device limit reached · `404` episode not found / not COMPLETED

**Open decisions:** DRM required? URL expiry duration? See [Handoff § 4.1, 4.8](./BACKEND_HANDOFF.md#4-decisions-team-ko-lena-hai).

---

### `POST /playback/heartbeat` 🚧 🔒

**Purpose:** Fire every ~10-30 s while playing. Enforces concurrency limit; can revoke session.

**Body:**
```json
{
  "sessionId":    "sess_9zXK...",
  "episodeId":    "...",
  "positionSec":  128,
  "bufferedSec":  156,
  "playbackState":"playing"    // playing | paused | buffering | ended
}
```

**Response 200:** `{ "success": true, "data": { "allowed": true } }`

When another device kicks the current one, respond `{ "allowed": false }` — the player will stop and show a "Signed out on another device" message.

Timeouts kept tight on the client (10 s). Return quickly.

---

## 15. Watch progress / history 🚧

### `POST /watch-progress` 🚧 🔒

**Purpose:** Upsert per-user, per-episode progress. Client calls on: every ~10 s while playing, on pause, on backgrounding, on `ended`.

**Body:**
```json
{
  "episodeId":  "...",
  "positionSec": 640,
  "durationSec": 2700,
  "completed":  false
}
```

**Response 200:** the resulting `WatchProgress` — `{ episodeId, webSeriesId, positionSec, durationSec, completed, updatedAt }`.

---

### `GET /watch-progress/{episodeId}` 🚧 🔒

**Purpose:** Resume-point lookup when the player opens (before hitting `/playback`).

**Response 200:** `WatchProgress` or `404`.

---

### `GET /me/continue-watching?limit=10` 🚧 🔒

**Purpose:** "Continue Watching" rail on Home / Watchlist.

**Response 200:** array of `ContinueWatchingItem`:
```json
{
  "webseries": { /* Webseries */ },
  "episode": {
    "id": "...", "title": "...", "episodeNumber": 3,
    "thumbnail": "...", "durationSec": 2700
  },
  "progress": { /* WatchProgress */ }
}
```

Sort: most recently updated first. Exclude items with `completed = true` and `nextEpisodeId = null`.

---

### `GET /me/watch-history` 🚧 🔒

**Query:** `page, limit`

**Response 200 (paginated):** array of `WatchHistoryItem` — same as `ContinueWatchingItem` + `watchedAt`.

---

### `DELETE /me/watch-history/{id}` 🚧 🔒

**Purpose:** User removes a single item from their history (privacy).

**Response 200:** `{ "success": true, "data": { "message": "Removed" } }`

---

## 16. Watchlist 🚧

### `GET /me/watchlist` 🚧 🔒

**Query:** `page, limit`
**Response 200 (paginated):** `Webseries[]` (ordered by `addedAt desc`).

---

### `POST /me/watchlist` 🚧 🔒

**Body:** `{ "webSeriesId": "..." }`
**Response 200:** `{ "success": true, "data": { "message": "Added" } }`

Idempotent — re-adding an existing item returns 200, doesn't duplicate.

---

### `DELETE /me/watchlist/{webSeriesId}` 🚧 🔒

**Response 200:** `{ "success": true, "data": { "message": "Removed" } }`

Idempotent — removing something not in the list is still 200.

> **UX note:** `webseries.isInWatchlist` field on `GET /mobile-users/webseries/{id}` (see [§ 5](#5-web-series-mobile-)) drives the heart icon state. Toggling calls the add / remove endpoints and optimistically flips the flag.

---

## 17. Search 🚧

### `GET /search?q=&type=&limit=` 🚧 🌓

**Purpose:** Multi-entity search. Powers the Search screen (single result page with sections).

**Query:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Query, min 2 chars |
| `type` | `all \| webseries \| actor \| institute \| genre` | Default `all` |
| `limit` | int | Per-section cap, default 10 |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "query": "avengers",
    "webseries":  [ /* Webseries[] */ ],
    "students":   [ /* Student[] — replaces the deprecated actors field */ ],
    "institutes": [ /* InstituteSummary[] */ ],
    "genres":     [ /* Genre[] */ ]
  }
}
```

---

### `GET /search/suggest?q=` 🚧 🌓

**Purpose:** Autocomplete — called on every keystroke (debounced client-side to 200 ms). Must be fast (< 300 ms).

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "type":  "webseries",         // webseries | actor | institute | genre
      "id":    "...",
      "label": "Campus Diaries",
      "subtitle": "2024 · Drama",
      "thumbnail": "..."
    }
  ]
}
```

Client timeout: 8 s (aggressive). Don't do heavy joins here — a prefix index on titles is fine.

---

### `GET /me/search-history` · `POST /me/search-history` · `DELETE /me/search-history` · `DELETE /me/search-history/{id}` 🚧 🔒

Server-side recent searches per user.

- `GET` → `SearchHistoryItem[]` — `{ id, query, createdAt }`
- `POST { query }` → 200
- `DELETE` → clear all
- `DELETE /{id}` → remove one

**Open decision:** Do we need server-side history at all? Client-side `AsyncStorage` may be enough. See [Handoff § 4.3](./BACKEND_HANDOFF.md#4-decisions-team-ko-lena-hai).

---

## 18. Discover / Genres 🚧

### `GET /genres` 🚧 🌓

**Response 200:** `Genre[]` — `{ id, slug, name, icon?, coverImage?, webseriesCount? }`.

---

### `GET /genres/{slug}/webseries` 🚧 🌓

**Query:** `page, limit, sort` (`trending | newest | rating`)
**Response 200 (paginated):** `Webseries[]`.

---

### `GET /discover/trending?limit=` 🚧 🌓

**Response 200 (paginated):** trending series (server-computed — 24 h view volume, likes, etc.).

---

### `GET /discover/college-stories?limit=` 🚧 🌓

**Response 200 (paginated):** curated rail — series tagged `college-stories` or from campus institutes.

---

### `GET /discover/short-films?limit=` 🚧 🌓

**Response 200 (paginated):** series with `duration < 30 min` or tag `short-film`.

---

## 19. Reviews / Ratings 🚧

> Review/rating sub-paths extend the live `/mobile-users/webseries/{id}` endpoint documented in [§ 5](#5-web-series-mobile-). Individual review actions (`PATCH /reviews/{id}`, etc.) stay top-level for shareability across surfaces.

### `POST /mobile-users/webseries/{id}/rate` 🚧 🔒

**Body:** `{ "stars": 4 }` (1-5 integer)
**Response 200:** `RatingSummary` — `{ averageRating, ratingsCount, userRating, distribution?: {"5": n5, "4": n4, ...} }`.

Idempotent — re-rating updates the previous vote.

---

### `DELETE /mobile-users/webseries/{id}/rate` 🚧 🔒

**Purpose:** Withdraw the user's rating.
**Response 200:** `{ "success": true, "data": { "message": "Unrated" } }`

---

### `GET /mobile-users/webseries/{id}/reviews` 🚧 🌓

**Query:** `page, limit, sort` (`recent | helpful | stars_desc | stars_asc`)
**Response 200 (paginated):** `Review[]`:
```json
{
  "id": "...",
  "webSeriesId": "...",
  "author": { "id": "...", "name": "Prabhat", "avatarUrl": "..." },
  "text": "Loved episode 3...",
  "stars": 5,
  "helpfulCount": 12,
  "isHelpful": false,   // per-caller
  "isOwner":   false,   // per-caller (true = show edit/delete UI)
  "createdAt": "...", "updatedAt": "..."
}
```

---

### `POST /mobile-users/webseries/{id}/reviews` 🚧 🔒

**Body:** `{ "text": "...", "stars": 5 }` — `stars` optional (rating can be posted separately via `/rate`).
**Response 200:** the created `Review`.

**Errors:** `409` user already reviewed this series (one review per user per series).

---

### `PATCH /reviews/{id}` 🚧 🔒

**Body:** `{ "text": "...", "stars": 4 }` — either or both.
**Response 200:** the updated `Review`.
**Errors:** `403` not owner

---

### `DELETE /reviews/{id}` 🚧 🔒

**Response 200:** `{ "success": true, "data": { "message": "Deleted" } }`
**Errors:** `403` not owner

---

### `POST /reviews/{id}/helpful` · `DELETE /reviews/{id}/helpful` 🚧 🔒

**POST Response 200:** `{ "helpfulCount": 13, "isHelpful": true }`
**DELETE Response 200:** `{ "success": true, "data": { "message": "Unmarked" } }`

**Open decision:** allow rating without a written review? See [Handoff § 4.4](./BACKEND_HANDOFF.md#4-decisions-team-ko-lena-hai).

---

## 20. Following 🚧

> `GET /me/following/actors` was removed on 2026-07-27 along with the Actors table. If per-student follow ships later, add `GET /me/following/students` returning `Student[]`.

### `GET /me/following/institutes` 🚧 🔒

**Query:** `page, limit`
**Response 200 (paginated):** `InstituteSummary[]` the user follows.

---

## 21. Uploads (presigned) 🚧

Phase 9 — institute dashboard on mobile. Not needed for MOBILE_USER flows.

### `POST /uploads/presign` 🚧 🔒

**Purpose:** Get a short-lived S3 (or equivalent) upload URL. Client PUTs the file directly to storage — the backend never handles binary bytes.

**Body:**
```json
{
  "purpose": "webseries_poster",   // see enum below
  "contentType": "image/jpeg",
  "fileSize": 384000               // bytes, optional but recommended
}
```

`UploadPurpose` enum:
`webseries_poster | webseries_cover | webseries_trailer | episode_video | actor_photo | institute_logo | institute_cover | avatar`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "uploadUrl": "https://s3.../put?sig=...&expires=...",
    "key":       "webseries/6631/poster.jpg",
    "headers":   { "Content-Type": "image/jpeg" },
    "expiresAt": "2026-07-27T07:00:00Z",
    "maxBytes":  10485760
  }
}
```

Client PUTs to `uploadUrl` with the given headers, then calls `/uploads/confirm`.

---

### `POST /uploads/confirm` 🚧 🔒

**Body:**
```json
{
  "key": "webseries/6631/poster.jpg",
  "purpose": "webseries_poster",
  "resourceId": "6631a2b3..."      // e.g. webseries id — optional depending on purpose
}
```

**Response 200:** `{ "success": true, "data": { "url": "https://cdn.../webseries/6631/poster.jpg" } }`

Backend responsibilities on confirm:
1. Verify the object exists at `key` in S3
2. Validate size / mime
3. Attach the resulting CDN URL to `resourceId` (if applicable)
4. Return the public / CDN-signed URL

---

## 22. Preferences 🚧

### `GET /me/preferences` · `PUT /me/preferences` 🚧 🔒

**Body / Response:** `UserPreferences`:
```json
{
  "preferredQuality":    "1080p",     // 4K | 1080p | 720p | 480p | 360p | Auto
  "downloadQuality":     "720p",      // Auto/4K excluded
  "downloadsOverWifiOnly": true,
  "autoplayNext":        true,
  "autoplayPreviews":    false,
  "subtitleLang":        "en",
  "audioLang":           "en",
  "dataSaver":           false
}
```

---

### `GET /notifications/preferences` · `PUT /notifications/preferences` 🚧 🔒

**Body / Response:** `NotificationPreferences`:
```json
{
  "pushEnabled":  true,
  "emailEnabled": true,
  "types": {
    "new_release": true,
    "trending":    true,
    "reminder":    false
  }
}
```

Missing keys in `types` default to `true`.

---

## 23. Subscriptions 🚧

Assumes Razorpay. See [Handoff § 4.6](./BACKEND_HANDOFF.md#4-decisions-team-ko-lena-hai) for provider decision.

### `GET /subscriptions/plans` 🚧

**Auth:** None (public — pricing page).

**Response 200:** `SubscriptionPlanTier[]`:
```json
{
  "id": "premium_monthly",
  "name": "Premium (Monthly)",
  "priceMinor": 29900,      // 299.00 INR in paise
  "currency": "INR",
  "interval": "month",
  "perks": ["Ad-free", "4K", "3 devices"],
  "highlighted": true
}
```

---

### `GET /subscriptions/my` 🚧 🔒

**Response 200:** `UserSubscription`:
```json
{
  "planId": "premium_monthly" || null,
  "status": "active",       // none | active | cancelled | past_due | expired | trialing
  "currentPeriodStart": "...",
  "currentPeriodEnd":   "...",
  "willRenew": true,
  "provider":  "razorpay"
}
```

---

### `POST /subscriptions/checkout` 🚧 🔒

**Body:** `{ "planId": "premium_monthly" }`
**Response 200:** `CheckoutSession`:
```json
{
  "orderId":        "order_9abc",
  "razorpayKeyId":  "rzp_live_...",
  "amountMinor":    29900,
  "currency":       "INR",
  "prefill":        { "name": "...", "email": "...", "contact": "+91..." }
}
```

Client opens Razorpay checkout with these params.

---

### `POST /subscriptions/verify` 🚧 🔒

**Body (from Razorpay success callback):**
```json
{
  "razorpayOrderId":    "order_9abc",
  "razorpayPaymentId":  "pay_xyz",
  "razorpaySignature":  "hmac..."
}
```

Backend verifies the HMAC signature, marks subscription active, returns the updated `UserSubscription`.

---

### `POST /subscriptions/cancel` 🚧 🔒

**Response 200:** the updated `UserSubscription` (`status: "cancelled"`, `willRenew: false`).

Doesn't refund — user retains access until `currentPeriodEnd`.

---

## 24. App config 🚧

### `GET /app/config` 🚧

**Auth:** None (called on cold start, before login).

**Response 200:**
```json
{
  "success": true,
  "data": {
    "minSupportedVersion": { "ios": "1.0.0", "android": "1.0.0" },
    "latestVersion":       { "ios": "1.2.3", "android": "1.2.3" },
    "forceUpgrade":        false,
    "maintenance": {
      "enabled": false,
      "message": "Back in 20 minutes"
    },
    "featureFlags": {
      "newPlayer":  true,
      "reviewsV2":  false
    }
  }
}
```

Client behavior:
- If `forceUpgrade` and installed version < `minSupportedVersion`, show blocking upgrade screen with store link
- If `maintenance.enabled`, show maintenance splash

Cache client-side for 15 min.

---

## 25. Appendix

### 25.1 HTTP status codes used

| Code | When |
|---|---|
| 200 | Success (all endpoints) |
| 400 | Bad request — malformed body, missing field, validation failure |
| 401 | Missing / invalid / expired access token — client will refresh & retry once |
| 402 | Subscription / payment required (playback, premium content) |
| 403 | Auth OK but forbidden — wrong role, not owner, geo-blocked, device limit |
| 404 | Resource not found / deleted / not published |
| 409 | Conflict — duplicate email, already reviewed, watchlist duplicate |
| 423 | Account locked |
| 429 | Rate limited — must include `RateLimit-Reset` or `Retry-After` header |
| 5xx | Retriable — client auto-retries GET / HEAD with jittered backoff (max 3 attempts) |

### 25.2 Client retry policy (already implemented)

The mobile client (`src/lib/api.ts`) retries automatically:
- **GET / HEAD** — retried on `408, 425, 500-599 (except 501)` with jittered exponential backoff (max 3 attempts, base 800 ms)
- **POST / PATCH / PUT / DELETE** — retried **only** when the request never reached the server (`status === 0`, i.e. network error). Otherwise treated as terminal.
- **429** — never auto-retried. Message + retry-after surfaced to user.
- **401** — one silent refresh attempt, then session wipe.

### 25.3 Auth token lifetimes (proposed)

| Token | Lifetime | Rotation |
|---|---|---|
| Access token | 15 min | Rotated on refresh |
| Refresh token | 30 days | Rotated on every use, old one invalidated |

Backend should support "sliding" refresh: if a refresh token is used within its 30-day window, the new one gets a fresh 30-day window.

### 25.4 Response payload budgets (soft targets)

| Endpoint | Target payload |
|---|---|
| `GET /home` | < 50 KB |
| `GET /mobile-users/webseries` (list) | < 30 KB / page |
| `GET /mobile-users/webseries/{id}` (detail, with embedded episodes) | < 60 KB |
| `GET /search` | < 40 KB |
| `GET /search/suggest` | < 5 KB |
| `GET /me/continue-watching` | < 15 KB |

Keep image URLs short (CDN base is repetitive — can be gzipped). Server-side compression (`gzip` / `br`) recommended.

### 25.5 Open decisions (for backend team lead)

Reference [`docs/BACKEND_HANDOFF.md` § 4](./BACKEND_HANDOFF.md#4-decisions-team-ko-lena-hai) for the full list. Key ones:

1. DRM required or signed HLS enough?
2. Playback URL expiry (5 / 15 / 60 min)?
3. Concurrency limit — how many devices per user?
4. Search history — server or client-side?
5. Ratings vs reviews — separate or bundled?
6. Payment provider — Razorpay confirmed?
7. Institute detail — inline `featuredWebseries` or separate call?
8. Watch progress heartbeat cadence — 10 s? 30 s?
9. Institute dashboard writes on mobile (Phase 9)?

### 25.6 Cross-references

- Frontend client (typed, ready to call every endpoint): [`src/lib/api.ts`](../src/lib/api.ts)
- Build priority order + estimates: [`docs/BACKEND_HANDOFF.md`](./BACKEND_HANDOFF.md)
- Full OpenAPI 3.1 spec (machine-readable): [`docs/API_ROADMAP.yaml`](./API_ROADMAP.yaml)
- Live Swagger (current backend): <https://vertical-admin-backend.onrender.com/api-docs>

---

**Change log**

| Date | Change |
|---|---|
| 2026-07-27 | Initial consolidated spec — merged Swagger + roadmap + api.ts contracts |
