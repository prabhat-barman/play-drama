# PlayDrama Mobile App — Detailed Pending API Requirements Specification

> **Target Audience:** Backend Engineering Team (`vertical-admin-backend`)  
> **Frontend Integration Point:** `src/lib/api.ts` & `src/screens/*`  
> **Base URL:** `https://vertical-admin-backend.onrender.com/api/v1`  
> **Auth Header:** `Authorization: Bearer <accessToken>`

---

## 1. Global Conventions & Response Envelopes

All endpoints must strictly adhere to the project's standardized JSON envelopes:

### Success Response (200 / 201)
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... },
  "meta": {
    "total": 120,
    "page": 1,
    "limit": 20,
    "totalPages": 6
  }
}
```

### Error Response (400 / 401 / 403 / 404 / 500)
```json
{
  "success": false,
  "message": "Error description here",
  "errors": [
    {
      "field": "episodeId",
      "message": "Invalid episode ID provided"
    }
  ]
}
```

---

## 2. Detailed Pending API Specifications

---

### Group 1: Advanced Video Playback & Streaming

#### Why it's needed:
Currently, the mobile app receives direct `videoUrl` strings which lack video security, multiple quality options, subtitles, skip-intro markers, and next-episode metadata.

#### 1.1 `GET /episodes/:id/playback`
* **Method:** `GET`
* **Path:** `/api/v1/episodes/:id/playback`
* **Headers:** `Authorization: Bearer <accessToken>`
* **Description:** Generates signed HLS streams (`.m3u8`), subtitle tracks, skip-intro/outro time markers, and next episode information.
* **Response `data` Payload:**
  ```json
  {
    "episodeId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "webseriesId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "title": "Episode 1: The Beginning",
    "streamUrl": "https://cdn.playdrama.com/hls/ep1/master.m3u8?token=xyz123",
    "format": "hls",
    "drm": {
      "type": "none",
      "licenseUrl": null
    },
    "subtitles": [
      {
        "language": "en",
        "label": "English",
        "url": "https://cdn.playdrama.com/subtitles/ep1_en.vtt"
      },
      {
        "language": "hi",
        "label": "Hindi",
        "url": "https://cdn.playdrama.com/subtitles/ep1_hi.vtt"
      }
    ],
    "markers": {
      "skipIntro": { "startSec": 15, "endSec": 90 },
      "skipOutro": { "startSec": 1420, "endSec": 1480 }
    },
    "nextEpisode": {
      "id": "64f1a2b3c4d5e6f7a8b9c0d2",
      "title": "Episode 2: The Rising",
      "thumbnailUrl": "https://cdn.playdrama.com/thumbs/ep2.jpg"
    }
  }
  ```
* **Frontend Impact:** Enables Skip Intro/Outro buttons, subtitle switcher, next-episode auto-play overlay, and HLS streaming in `PlayerScreen.tsx`.

---

#### 1.2 `POST /playback/heartbeat`
* **Method:** `POST`
* **Path:** `/api/v1/playback/heartbeat`
* **Description:** Periodically sent by the mobile app every 30 seconds while playing video to enforce active device concurrency limits.
* **Request Body:**
  ```json
  {
    "sessionId": "sess_987654321",
    "episodeId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "positionSec": 320,
    "playbackState": "playing"
  }
  ```
* **Response `data` Payload:**
  ```json
  {
    "allowed": true,
    "maxConcurrentDevices": 2,
    "activeDevices": 1
  }
  ```
* **Frontend Impact:** Allows grace shut-off or prompt if the user account is streaming on too many devices simultaneously.

---

### Group 2: Watch Progress & Resume Watching

#### Why it's needed:
Allows users to stop watching a video on one device and resume seamlessly from the exact second on any other device.

#### 2.1 `POST /watch-progress`
* **Method:** `POST`
* **Path:** `/api/v1/watch-progress`
* **Description:** Saves the current playback timestamp for an episode.
* **Request Body:**
  ```json
  {
    "webseriesId": "64f1a2b3c4d5e6f7a8b9c0d0",
    "episodeId": "64f1a2b3c4d5e6f7a8b9c0d1",
    "positionSec": 450,
    "durationSec": 1500,
    "isCompleted": false
  }
  ```
* **Response `data` Payload:**
  ```json
  {
    "saved": true,
    "updatedAt": "2026-08-04T10:15:00Z"
  }
  ```

---

#### 2.2 `GET /me/continue-watching`
* **Method:** `GET`
* **Path:** `/api/v1/me/continue-watching`
* **Description:** Fetches list of partially watched shows for the current signed-in user.
* **Response `data` Payload:**
  ```json
  [
    {
      "webseriesId": "64f1a2b3c4d5e6f7a8b9c0d0",
      "title": "College Romance",
      "posterUrl": "https://cdn.playdrama.com/posters/cr.jpg",
      "lastEpisode": {
        "id": "64f1a2b3c4d5e6f7a8b9c0d1",
        "episodeNumber": 3,
        "title": "Exam Pressure"
      },
      "positionSec": 450,
      "durationSec": 1500,
      "progressPercentage": 30
    }
  ]
  ```
* **Frontend Impact:** Populates the **"Continue Watching"** horizontal rail on `HomeScreen.tsx`.

---

### Group 3: Server-side Watchlist Synchronization

#### Why it's needed:
Currently, saved shows are kept in local component state. They need to be backed up on the user's cloud account.

#### 3.1 `GET /me/watchlist`
* **Method:** `GET`
* **Path:** `/api/v1/me/watchlist?page=1&limit=20`
* **Description:** Retrieves all web series saved in the signed-in user's watchlist.

#### 3.2 `POST /me/watchlist`
* **Method:** `POST`
* **Path:** `/api/v1/me/watchlist`
* **Request Body:** `{ "webseriesId": "64f1a2b3c4d5e6f7a8b9c0d0" }`

#### 3.3 `DELETE /me/watchlist/:webseriesId`
* **Method:** `DELETE`
* **Path:** `/api/v1/me/watchlist/64f1a2b3c4d5e6f7a8b9c0d0`
* **Frontend Impact:** Syncs `WatchlistScreen.tsx` across devices and updates the "My List / Bookmark" toggle on `MovieDetailsScreen.tsx`.

---

### Group 4: Institute Module (Colleges & Production Houses)

#### Why it's needed:
PlayDrama highlights drama school & acting institute productions. Users need to browse institutes, view student portfolios, and follow institutes.

#### 4.1 `GET /institutes`
* **Method:** `GET`
* **Path:** `/api/v1/institutes?search=FTII&city=Mumbai&page=1&limit=20`
* **Description:** Lists drama institutes with filtering and search.

#### 4.2 `GET /institutes/:id`
* **Method:** `GET`
* **Path:** `/api/v1/institutes/:id`
* **Response `data` Payload:**
  ```json
  {
    "id": "64f1a2b3c4d5e6f7a8b9c0e0",
    "name": "Film and Television Institute of India",
    "logoUrl": "https://cdn.playdrama.com/logos/ftii.png",
    "coverUrl": "https://cdn.playdrama.com/covers/ftii_cover.jpg",
    "city": "Pune",
    "description": "Premier film school in India.",
    "webseriesCount": 14,
    "studentsCount": 120,
    "followersCount": 4500,
    "isFollowing": false
  }
  ```

#### 4.3 `GET /institutes/:id/webseries`
* **Method:** `GET`
* **Path:** `/api/v1/institutes/:id/webseries`
* **Description:** Retrieves all web series produced by a specific institute.

#### 4.4 `GET /institutes/:id/students`
* **Method:** `GET`
* **Path:** `/api/v1/institutes/:id/students`
* **Description:** Retrieves student profiles associated with an institute.
* **Frontend Impact:** Unlocks `InstituteProfileScreen` and institute filter chips in `DiscoverScreen.tsx`.

---

### Group 5: Actor Portfolios & Filmography

#### Why it's needed:
Enables rich actor profile pages showcasing full filmography, acting reel clips, and upcoming releases.

#### 5.1 `GET /actors/:id/filmography`
* **Method:** `GET`
* **Path:** `/api/v1/actors/:id/filmography`
* **Response `data` Payload:**
  ```json
  [
    {
      "webseriesId": "64f1a2b3c4d5e6f7a8b9c0d0",
      "title": "College Romance",
      "roleName": "Lead Actor (Kabir)",
      "year": 2025,
      "posterUrl": "https://cdn.playdrama.com/posters/cr.jpg"
    }
  ]
  ```

#### 5.2 `GET /actors/:id/clips`
* **Method:** `GET`
* **Path:** `/api/v1/actors/:id/clips`
* **Description:** Returns short acting reel clips for an actor.
* **Frontend Impact:** Unlocks the **Actor Details & Portfolio** modal/screen.

---

### Group 6: Universal Follow System

#### Why it's needed:
Allows users to follow both Institutes and Actors to receive notification updates on new show releases.

#### 6.1 `POST /follow`
* **Method:** `POST`
* **Path:** `/api/v1/follow`
* **Request Body:**
  ```json
  {
    "targetType": "institute", // or "actor"
    "targetId": "64f1a2b3c4d5e6f7a8b9c0e0"
  }
  ```

#### 6.2 `DELETE /follow`
* **Method:** `DELETE`
* **Path:** `/api/v1/follow`
* **Request Body:**
  ```json
  {
    "targetType": "institute",
    "targetId": "64f1a2b3c4d5e6f7a8b9c0e0"
  }
  ```
* **Frontend Impact:** Activates the "+ Follow" button on actor and institute profile headers.

---

### Group 7: Global Multi-Entity Search

#### Why it's needed:
Currently, search only queries web series titles. Users need to search across Shows, Actors, and Institutes simultaneously.

#### 7.1 `GET /search`
* **Method:** `GET`
* **Path:** `/api/v1/search?q=delhi&type=all&page=1&limit=20`
* **Response `data` Payload:**
  ```json
  {
    "webseries": [
      { "id": "1", "title": "Delhi Crime Season 1", "posterUrl": "..." }
    ],
    "actors": [
      { "id": "2", "name": "Shefali Shah", "avatarUrl": "..." }
    ],
    "institutes": [
      { "id": "3", "name": "Delhi Drama School", "logoUrl": "..." }
    ]
  }
  ```

#### 7.2 `GET /search/suggest`
* **Method:** `GET`
* **Path:** `/api/v1/search/suggest?q=col`
* **Response `data` Payload:** `["College Romance", "College Life", "College Nights"]`
* **Frontend Impact:** Powers real-time search suggestions and multi-tab results in `SearchScreen.tsx`.

---

### Group 8: Ratings & Written Reviews

#### Why it's needed:
Enables community engagement with 1-5 star ratings and written reviews on drama series.

#### 8.1 `POST /webseries/:id/rate`
* **Method:** `POST`
* **Path:** `/api/v1/webseries/:id/rate`
* **Request Body:** `{ "rating": 5 }`

#### 8.2 `GET /webseries/:id/reviews`
* **Method:** `GET`
* **Path:** `/api/v1/webseries/:id/reviews?page=1&limit=10`
* **Response `data` Payload:**
  ```json
  [
    {
      "id": "rev_101",
      "userName": "Rohan Sharma",
      "userAvatar": "...",
      "rating": 5,
      "comment": "Amazing acting and great cinematography!",
      "createdAt": "2026-08-01T12:00:00Z",
      "helpfulCount": 42
    }
  ]
  ```
* **Frontend Impact:** Unlocks user reviews section and star rating popups on `MovieDetailsScreen.tsx`.

---

### Group 9: Subscriptions & Payment Integration

#### Why it's needed:
Required to monetize premium drama series and subscriptions.

#### 9.1 `GET /subscriptions/plans`
* **Method:** `GET`
* **Path:** `/api/v1/subscriptions/plans`
* **Response `data` Payload:**
  ```json
  [
    {
      "id": "plan_monthly",
      "name": "Premium Monthly",
      "price": 199,
      "currency": "INR",
      "interval": "month",
      "features": ["1080p Full HD", "Ad-free playback", "Watch on 2 devices"]
    }
  ]
  ```

#### 9.2 `POST /subscriptions/checkout`
* **Method:** `POST`
* **Path:** `/api/v1/subscriptions/checkout`
* **Request Body:** `{ "planId": "plan_monthly" }`
* **Response `data` Payload:** Generates Razorpay Order ID & API credentials for native mobile checkout.

---

## 3. Summary Implementation Matrix for Backend Team

| Priority | Endpoint Group | Key Endpoints | Estimated Effort |
| :--- | :--- | :--- | :--- |
| **P1** | **Playback & HLS** | `GET /episodes/:id/playback`, `POST /playback/heartbeat` | 1.5 Weeks |
| **P2** | **Watch Progress** | `POST /watch-progress`, `GET /me/continue-watching` | 1 Week |
| **P3** | **Watchlist Sync** | `GET/POST/DELETE /me/watchlist` | 0.5 Weeks |
| **P4** | **Institutes** | `GET /institutes`, `/institutes/:id`, `/institutes/:id/webseries` | 1.5 Weeks |
| **P5** | **Actors** | `GET /actors/:id/filmography`, `/clips` | 1 Week |
| **P6** | **Global Search** | `GET /search`, `GET /search/suggest` | 1 Week |
| **P7** | **Reviews & Ratings**| `POST /webseries/:id/rate`, `GET /reviews` | 1 Week |
| **P8** | **Subscriptions** | `GET /subscriptions/plans`, `POST /checkout` | 1.5 Weeks |
