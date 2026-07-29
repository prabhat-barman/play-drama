# Beta distribution — Firebase App Distribution + TestFlight

CineStream distributes beta builds two ways:

- **Android** → [Firebase App Distribution](https://firebase.google.com/products/app-distribution) (no paid Google Play Console account needed).
- **iOS** → Firebase App Distribution *(recommended for internal testing)* **or** Apple TestFlight *(recommended once the app is closer to store submission)*.

| Info | Value |
| --- | --- |
| Firebase project | **cinestream-1464c** |
| Android app ID | **1:55460051377:android:44de0ae4a092b408a6e590** |
| iOS bundle id | **com.cinestream** |
| iOS Firebase app ID | *(create in Firebase console — see [iOS setup](#ios-distribution) below)* |

---

## Table of contents

- [Android distribution](#android-distribution)
- [iOS distribution](#ios-distribution)
  - [Prerequisites for iOS](#prerequisites-for-ios)
  - [Local: ship a Simulator build (no Apple Dev needed)](#local-ship-a-simulator-build-no-apple-dev-needed)
  - [Local: ship a real-device beta (needs Apple Dev)](#local-ship-a-real-device-beta-needs-apple-dev)
  - [Local: ship to TestFlight](#local-ship-to-testflight)
  - [CI: GitHub Actions for iOS](#ci-github-actions-for-ios)
- [Before going to production](#before-going-to-production)

---

## Android distribution

### One-time setup

#### 1. Sign in to Firebase (once per machine)

```bash
npm run firebase:login
```

A browser window opens — sign in with the Google account that owns
the Firebase project (or that has "App Distribution Admin" access on it).

#### 2. Create the "testers" group (once per Firebase project)

1. Open <https://console.firebase.google.com/project/cinestream-1464c/appdistribution>
2. Go to the **Testers & Groups** tab.
3. Click **Add group** → name it **`testers`** exactly.
4. Add tester emails (one per line). Each tester will get an invite
   email the first time you ship a build to them.

> The group alias `testers` is referenced by the `distribute:android`
> npm script. If you rename the group, update that script too.

### Shipping a new Android beta

There are two paths — automated (recommended) and manual.

#### Path A — Automated via GitHub Actions (default)

Every push to `main` triggers `.github/workflows/distribute-android.yml`
which builds a release APK on GitHub-hosted Ubuntu and uploads it to
Firebase App Distribution under the `testers` group. Release notes for
each build are auto-generated from the latest commit message.

Docs-only, iOS-only, and `.github/**` changes are skipped so you don't
waste CI minutes on non-code updates. You can also trigger a build
manually from the GitHub **Actions** tab (`Run workflow`).

One-time CI setup (see "CI: GitHub Actions for Android" below)
requires adding a `FIREBASE_SERVICE_ACCOUNT` repo secret.

#### Path B — Manual from your machine

1. Update `RELEASE_NOTES.md` at the repo root — write what's new for
   testers. Anything in that file is emailed to testers verbatim.

2. Run the distribute script:

   ```bash
   npm run distribute:android
   ```

   This does three things:
   - `./gradlew clean assembleRelease` — builds a release APK
     (currently signed with the debug keystore; fine for beta).
   - Uploads the APK to Firebase App Distribution.
   - Notifies everyone in the `testers` group by email.

3. Testers install:
   - Open the invite email on their Android phone.
   - Install the **App Tester** app when prompted (one-time).
   - Tap the download button — the APK installs directly.

### CI: GitHub Actions for Android

The CI workflow authenticates to Firebase using a **service account
JSON key**. Steps:

#### 1. Create the service account

1. Open the Google Cloud Console for this Firebase project:
   <https://console.cloud.google.com/iam-admin/serviceaccounts?project=cinestream-1464c>
2. Click **Create service account**.
   - Name: `github-actions-app-distribution`
   - ID: leave auto-generated.
   - Description: `Uploads Android betas to Firebase App Distribution from CI`.
3. Click **Create and continue**.
4. Under **Grant this service account access**, add these roles:
   - `Firebase App Distribution Admin`
   - `Firebase Viewer` *(needed for CLI project lookups)*
5. Click **Done**.

#### 2. Generate a JSON key

1. Click the newly created service account.
2. Go to the **Keys** tab.
3. **Add key → Create new key → JSON**. A JSON file downloads —
   treat it like a password, never commit it.

#### 3. Add it as a GitHub secret

1. Open the repo on GitHub:
   <https://github.com/prabhat-barman/play-drama/settings/secrets/actions>
2. **New repository secret**.
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Value: paste the **entire JSON file contents**.
3. **Add secret**.

#### 4. Verify the `testers` group exists in Firebase

The workflow ships to the `testers` group. Create it once at
<https://console.firebase.google.com/project/cinestream-1464c/appdistribution>
under **Testers & Groups → Add group**, name it exactly `testers`,
and add tester emails. Without this group the CI step fails with a
404 at the "distributing to testers/groups" line.

#### 5. Trigger the first CI run

Push any commit to `main` (or open the Actions tab and run the
workflow manually). If the secret and group are set up correctly you
should see the APK appear on the Firebase console within ~5 minutes.

### Handy variants

Ship to specific emails without touching the Firebase group:

```bash
firebase appdistribution:distribute android/app/build/outputs/apk/release/app-release.apk \
  --app 1:55460051377:android:44de0ae4a092b408a6e590 \
  --testers "friend1@gmail.com,friend2@gmail.com" \
  --release-notes-file RELEASE_NOTES.md
```

Ship an AAB instead of an APK (Play-style bundle):

```bash
cd android && ./gradlew clean bundleRelease && cd ..
firebase appdistribution:distribute android/app/build/outputs/bundle/release/app-release.aab \
  --app 1:55460051377:android:44de0ae4a092b408a6e590 \
  --release-notes-file RELEASE_NOTES.md \
  --groups testers
```

---

## iOS distribution

iOS distribution is orchestrated by **fastlane** (`ios/fastlane/Fastfile`).
Three lanes are wired up out of the box:

| Lane | What it does | Distribution channel | Needs Apple Developer Program? |
| --- | --- | --- | --- |
| `fastlane ios simulator` | Builds an unsigned Simulator `.app`, zips it, exposes it as a build artifact. | **GitHub Actions run artifact** — testers download & install via `xcrun simctl`. | **No** — works today with just a Mac + Xcode. |
| `fastlane ios beta` | Builds a signed **ad-hoc IPA**. | **Firebase App Distribution** — testers install on registered iPhones/iPads. | **Yes** — needs paid Apple Dev + registered UDIDs. |
| `fastlane ios testflight` | Builds a signed **app-store IPA**. | **Apple TestFlight** via App Store Connect API. | **Yes** — needs paid Apple Dev + a matching App Store Connect app record. |

> **Why isn't the simulator lane wired to Firebase App Distribution?** Firebase App Distribution only accepts signed `.ipa` (real device) / `.apk` / `.aab`. Simulator `.app` builds are not distributable through Firebase — see their own [codelab note](https://firebase.google.com/codelabs/appdistribution-udid-collection) ("simulators cannot download releases"). For simulator builds we therefore rely on GitHub Actions' artifact storage, which is free, per-run, and needs zero extra configuration.

### Prerequisites for iOS

Common to all three lanes:

1. **macOS + Xcode 15+** (Xcode 15.4 recommended). Fastlane cannot build iOS on Linux/Windows.
2. **Ruby + Bundler** already installed (the same setup CocoaPods needs). From `CineStream/` run once:
   ```bash
   bundle install
   ```
   This installs `fastlane` alongside `cocoapods`.
3. **Firebase project has an iOS app registered** *(needed for `simulator` + `beta`)*:
   - Open <https://console.firebase.google.com/project/cinestream-1464c/settings/general>.
   - Under **Your apps** click **Add app → iOS+**.
   - Bundle ID: `com.cinestream` (must match exactly).
   - App nickname: `CineStream iOS`.
   - Skip the "Download GoogleService-Info.plist" step for now — App Distribution does not need the SDK to be integrated.
   - Copy the resulting app id (`1:55460051377:ios:xxxxxxxxxxx`). This becomes the `FIREBASE_IOS_APP_ID` env var / repo secret.
4. **CocoaPods installed** for the current native modules:
   ```bash
   cd ios && bundle exec pod install
   ```

Additional prerequisites per lane are called out inline below.

### Local: ship a Simulator build (no Apple Dev needed)

Great for internal review before signing/certs are ready. **No env vars required.**

```bash
npm run distribute:ios:simulator
```

Under the hood: `xcodebuild build -sdk iphonesimulator` → `ditto -c -k` produces `ios/fastlane/build/CineStream-simulator.zip`.

The zip contains a `CineStream.app` bundle. Testers (Mac only) install it into a booted simulator with:

```bash
unzip CineStream-simulator.zip
open -a Simulator                          # boot the default simulator
xcrun simctl install booted CineStream.app # install
xcrun simctl launch  booted com.cinestream  # launch
```

In CI, the same zip is uploaded as an artifact named **`ios-simulator-<sha>`** on every workflow run. Testers can grab it directly from the run summary page on GitHub. No Firebase account, no Apple ID, no email invites needed.

### Local: ship a real-device beta (needs Apple Dev)

Prereqs *(one-time)*:

- An **Apple Distribution certificate** installed in your Mac's login keychain (or as a `.p12` file — see the [CI section](#ci-github-actions-for-ios) below).
- An **Ad Hoc provisioning profile** for `com.cinestream` that includes every test-device UDID. Create it at <https://developer.apple.com/account/resources/profiles/list>. Fastlane will install it automatically when you run the lane.
- All tester devices registered under **Devices** in the Apple Developer portal.

Then:

```bash
export FIREBASE_IOS_APP_ID='1:55460051377:ios:xxxxxxxxxxx'
npm run distribute:ios
```

Testers get a Firebase invite email, install the **Firebase App Tester** iOS app (one-time), then tap through to install the beta.

### Local: ship to TestFlight

Prereqs *(one-time)*:

1. **Apple Developer Program active** ($99/year — <https://developer.apple.com/programs/enroll/>).
2. **App record created in App Store Connect** at <https://appstoreconnect.apple.com/apps> with bundle id `com.cinestream`.
3. **App Store Connect API key** *(recommended over Apple ID auth — no 2FA prompts, works headless)*:
   - Open <https://appstoreconnect.apple.com/access/integrations/api>.
   - Click the **+** next to *Active*. Name: `CineStream CI`. Access: **App Manager**.
   - Download the `.p8` file — **you only get one chance to download it**, store it in a password manager.
   - Note the **Key ID** and **Issuer ID** shown on the same page.
4. An **App Store distribution certificate** + **App Store provisioning profile** installed on your Mac (same story as ad-hoc but for the `app-store` export method).

Then:

```bash
export APP_STORE_CONNECT_API_KEY_ID='ABC123XYZ'
export APP_STORE_CONNECT_API_ISSUER_ID='69a6de88-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
export APP_STORE_CONNECT_API_KEY_CONTENT_BASE64="$(base64 -i ~/Downloads/AuthKey_ABC123XYZ.p8)"
npm run distribute:ios:testflight
```

The lane bumps `CFBundleVersion`, builds an `app-store` signed IPA, and uploads it via the App Store Connect API. Testers you've added under **TestFlight → Internal Testing** in App Store Connect get a build-ready email a few minutes after Apple finishes processing.

### CI: GitHub Actions for iOS

Every push to `main` (excluding docs / android-only / the android workflow file itself) triggers `.github/workflows/distribute-ios.yml`, which runs on a `macos-14` runner and executes `fastlane ios beta` by default.

You can also dispatch the workflow manually from the **Actions** tab and pick which lane to run (`beta`, `simulator`, `testflight`).

#### iOS repo secrets

Add the following under **Settings → Secrets and variables → Actions**:

| Secret | Used by lane | How to get it |
| --- | --- | --- |
| `FIREBASE_IOS_GOOGLE_SERVICE_INFO_PLIST_BASE64` | **all** (`simulator`, `beta`, `testflight`) | `ios/CineStream/GoogleService-Info.plist` is `.gitignore`d, so CI has to recreate it before Xcode's "Copy Bundle Resources" phase runs. Encode your local copy once: `base64 -i ios/CineStream/GoogleService-Info.plist \| pbcopy`. If you don't have it locally, download from <https://console.firebase.google.com/project/cinestream-1464c/settings/general> → iOS app → `GoogleService-Info.plist`. |
| `FIREBASE_SERVICE_ACCOUNT` | `beta` | Already set up for Android — reused as-is. |
| `FIREBASE_IOS_APP_ID` | `beta` | The `1:...:ios:...` string shown in Firebase console after registering the iOS app. |
| `IOS_DIST_CERT_P12_BASE64` | `beta`, `testflight` | Export your distribution cert from Keychain Access → *Certificates* → right-click → *Export* → `.p12`. Then `base64 -i cert.p12 \| pbcopy`. |
| `IOS_DIST_CERT_PASSWORD` | `beta`, `testflight` | The password you set when exporting the `.p12`. |
| `IOS_ADHOC_PROVISION_PROFILE_BASE64` | `beta` | `base64 -i CineStream_AdHoc.mobileprovision \| pbcopy` after downloading the profile from the Apple Developer portal. |
| `IOS_APPSTORE_PROVISION_PROFILE_BASE64` | `testflight` | Same as above but for the *App Store* profile. |
| `IOS_KEYCHAIN_PASSWORD` | `beta`, `testflight` | Any random string — used to unlock the temporary keychain fastlane creates on the runner. |
| `APP_STORE_CONNECT_API_KEY_ID` | `testflight` | The 10-char Key ID shown in App Store Connect. |
| `APP_STORE_CONNECT_API_ISSUER_ID` | `testflight` | The Issuer ID shown at the top of the API keys page. |
| `APP_STORE_CONNECT_API_KEY_CONTENT_BASE64` | `testflight` | `base64 -i AuthKey_XXXX.p8 \| pbcopy`. |

The workflow **pre-flights** which secrets are required for the selected lane and fails early with a nice error listing missing ones — so you never burn build minutes on a run that would fail during upload.

#### First iOS CI run

1. Add the secrets above.
2. In Firebase console, add the same tester emails to the `testers` group for the iOS app (or reuse the existing group — it works across platforms as long as those testers accepted the invite).
3. Push a commit that touches `ios/**`, `src/**`, or `package.json`, or dispatch the workflow manually with lane `beta`. Expect ~15–25 min for the first run (Ruby cache, CocoaPods repo, xcodebuild); subsequent runs are ~10 min.

---

## Before going to production

The release build currently reuses the **debug keystore** — this is
fine for beta testers but **must be replaced before Play Store
launch**. Steps:

1. Generate a proper release keystore:

   ```bash
   keytool -genkeypair -v -storetype PKCS12 \
     -keystore android/app/release.keystore \
     -alias cinestream-release -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Store the passwords in `~/.gradle/gradle.properties` (never in
   the repo):

   ```
   CINESTREAM_UPLOAD_STORE_FILE=release.keystore
   CINESTREAM_UPLOAD_KEY_ALIAS=cinestream-release
   CINESTREAM_UPLOAD_STORE_PASSWORD=...
   CINESTREAM_UPLOAD_KEY_PASSWORD=...
   ```

3. Add a `release` signing config in `android/app/build.gradle` that
   reads those properties and wire it into `buildTypes.release`.

4. Extract the release SHA-1:

   ```bash
   keytool -list -v -alias cinestream-release -keystore android/app/release.keystore
   ```

5. Register that SHA-1 in the Google Cloud Console (under the same
   OAuth client that the debug SHA-1 was registered on) so Google
   Sign-In works in the release build.
