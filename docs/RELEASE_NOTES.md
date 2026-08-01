Play Drama — beta build

What's new
- Fixed Google Sign-In "token expired" error on Android — signOut() before signIn() to force a fresh idToken every time.
- Added typed stubs for upcoming backend endpoints (Institute, Playback, Watchlist, Watch progress, Search, Reviews, Home aggregator, Genres, Uploads, Subscriptions) — no user-visible change yet, wiring lands as endpoints ship.

Known issues
- Backend endpoints for Institute profiles, Watchlist, Watch progress, Reviews, and multi-entity Search aren't shipped yet — those tabs/screens still show placeholder content. Tracked in docs/API_ROADMAP.yaml.
- Continue Watching + Downloads rails on Watchlist still show empty state.

How to install
1. Open the invite email from Firebase App Distribution on your Android phone.
2. Install the "App Tester" app when prompted (one-time).
3. Tap the download button — the APK will install directly.

Feedback: reply to the invite email, or ping Prabhat.
