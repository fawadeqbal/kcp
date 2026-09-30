# The mobile app: building, testing and releasing

The Flutter app in `apps/mobile` is for **students and parents** (staff are refused).
Students do quizzes and today's practice, keep their streak, see lessons, badges and
leaderboards; code challenges and projects stay on the website ("continue on your
laptop"). Parents see each child's progress and the plan's status, and change the
switches (public leaderboards, public projects, streak reminders) behind a parental
gate. There are no purchases in the app: plans are bought on the website.

- Store answers and the SDK audit: [mobile-store-privacy.md](mobile-store-privacy.md)
- Store listings in English, Arabic and Urdu: [mobile-store-listing.md](mobile-store-listing.md)

## Tools

| Tool             | Version                  | Notes                                                 |
| ---------------- | ------------------------ | ----------------------------------------------------- |
| Flutter          | 3.47.5 (Dart 3.13)       | `flutter --version`                                   |
| Java             | 17 or 21                 | Android builds; the Dart client generator             |
| Android SDK      | platform 36, build tools | Android Studio installs them; Gradle fetches the rest |
| Xcode (Mac only) | 26 or newer              | iOS builds, TestFlight                                |
| Melos            | 8.9                      | `dart pub global activate melos`                      |

The Android app compiles against and targets API 36 and runs on Android 7.0 (API 24) or
newer; these are Flutter 3.47's defaults (`flutter.compileSdkVersion` and friends in
`android/app/build.gradle.kts`).

The Dart side is a pub workspace (root `pubspec.yaml`): the app and the generated API
client (`packages/api-client-dart`). From the repository root:

```bash
melos bootstrap          # pub get for the whole workspace
melos run analyze        # flutter analyze --fatal-infos, and the client
melos run test           # the app's unit and widget tests (no phone needed)
melos run shared:check   # design tokens and badge texts match the web packages
```

## Running it against your computer

1. Start the API as usual (`pnpm services:up`, `pnpm dev`).
2. Start an Android emulator (Android Studio → Device Manager).
3. From `apps/mobile`:

```bash
flutter run --flavor dev --dart-define-from-file=config/dev.json
```

The dev build talks to `http://10.0.2.2:3000` (your computer, as the emulator sees it;
`config/dev.json`). Only the dev flavour may use plain HTTP. On a real phone on the same
Wi-Fi, copy `config/dev.json` to `config/local.json` (ignored by git), put your
computer's IP address in `API_URL`, and run with that file.

Sign in with a student login name (from the parent dashboard) or a parent's email.
`pnpm demo:accounts` creates both.

## Flavours and settings

| Flavour   | Android app ID               | Name in the launcher | Settings              |
| --------- | ---------------------------- | -------------------- | --------------------- |
| `dev`     | `org.kidscoding.app.dev`     | KCP Dev              | `config/dev.json`     |
| `staging` | `org.kidscoding.app.staging` | KCP Staging          | `config/staging.json` |
| `prod`    | `org.kidscoding.app`         | Kids Coding          | `config/prod.json`    |

Always pass the matching file: `--flavor staging --dart-define-from-file=config/staging.json`.
The files hold the API and website addresses and Firebase's **public** settings; nothing
in them is secret (they ship inside the app). Before the first release, replace the
`kidscoding.example` addresses in `config/staging.json` and `config/prod.json`, the
App Links hosts in `android/app/build.gradle.kts`, and the domain in
`ios/Runner/Runner.entitlements`.

The app icon is a placeholder ("</>" on the brand colour): when the designer's
1024 × 1024 icon exists, draw it in `apps/mobile/tool/make_icons.py` (or replace the
PNGs it writes) and run `python3 tool/make_icons.py`.

`org.kidscoding.app` is a placeholder too: choose the final app ID before the first
upload (it can never change afterwards) and replace it in `android/app/build.gradle.kts`,
`ios/Runner.xcodeproj/project.pbxproj` and the Firebase apps.

## Push notifications (Firebase)

The app and the API work without Firebase: notifications are then only written to the
API's log. To switch them on:

1. Create a Firebase project (console.firebase.google.com). Don't enable Google
   Analytics for it.
2. Add an **Android app** with the app ID (`org.kidscoding.app`, and the `.dev` /
   `.staging` ones if you want them there too) and an **iOS app** with the bundle ID.
   You don't need to download `google-services.json` or `GoogleService-Info.plist`: the
   app reads the settings from `config/<flavour>.json`.
3. From Project settings → General, fill in `config/<flavour>.json`:
   `FIREBASE_PROJECT_ID`, `FIREBASE_SENDER_ID` (the project number), `FIREBASE_API_KEY`
   (the Web API key), `FIREBASE_ANDROID_APP_ID` and `FIREBASE_IOS_APP_ID`
   (`1:1234…:android:…`, `1:1234…:ios:…`).
4. iOS only: Apple Developer → Keys → create an **APNs key**, then in Firebase →
   Project settings → Cloud Messaging → Apple app configuration, upload it.
5. The API: Project settings → Service accounts → Generate new private key. Put the JSON
   in the API's environment, on one line or base64-encoded:
   `FIREBASE_SERVICE_ACCOUNT=<base64 -w0 key.json>`. Keep it secret (it can send
   notifications to every phone). Restart the API.

What is sent: students get one streak reminder at 18:00 their time on days the streak
is alive and today's goal isn't met (parents can switch it off per child); parents get
"trial ends soon" and the monthly summary with their emails. The app asks for
permission only when someone taps "Turn on reminders" (student home) or "Turn on
notifications" (settings); until then it never asks Firebase for a token. Each
phone's token belongs to its sign-in: logging out on the phone, signing out everywhere
or a password reset stops its notifications. Tokens are deleted at logout, when an
account is deleted, and after 60 days unseen.

## Links that open the app

Links to lessons (`/<lang>/learn/…`) and the parent dashboard (`/<lang>/dashboard`) open
the app when it's installed. The website publishes the proof, from its environment
(`apps/web/.env.example`):

- Android: `APP_ANDROID_PACKAGE=org.kidscoding.app` and `APP_ANDROID_SHA256=` the
  SHA-256 fingerprint of the **app signing key** (Play Console → Test and release → App
  integrity → App signing). Check with
  `https://<web host>/.well-known/assetlinks.json`.
- iOS: `APP_IOS_APP_ID=<Team ID>.org.kidscoding.app`. Check with
  `https://<web host>/.well-known/apple-app-site-association`.

## Checking a build against an API

`tool/live_check.dart` signs in as a demo student, does today's practice until the
streak is kept, then signs in as a demo parent, all through the generated client the
app uses. Run it against your computer or staging after API changes:

```bash
cd apps/mobile
dart run tool/live_check.dart --api http://localhost:3000 \
  --student <login name> --parent parent.en@demo.test
```

## Crash reports

The app reports crashes to our own API (`POST /v1/app/crashes`): app version, system
version and the error, never the account or the phone. Staff read them in the admin
panel → App crashes; they are deleted after 90 days. There is no crash-reporting SDK
(store rules for children's apps). Debug builds don't report.

## Versions

`version:` in `apps/mobile/pubspec.yaml` is `1.0.0+1`: the name shown in the stores,
then the build number. Every upload needs a higher build number (`1.0.1+2`). Melos can
bump it: `melos version --all`.

## Android release (Google Play)

1. Create the upload key once, and keep it (and its passwords) somewhere safe:

   ```bash
   keytool -genkey -v -keystore ~/kcp-upload.jks -keyalg RSA -keysize 4096 \
     -validity 10000 -alias upload
   ```

2. Create `apps/mobile/android/key.properties` (ignored by git):

   ```properties
   storeFile=/Users/you/kcp-upload.jks
   storePassword=…
   keyAlias=upload
   keyPassword=…
   ```

3. Build the bundle:

   ```bash
   cd apps/mobile
   flutter build appbundle --release --flavor prod --dart-define-from-file=config/prod.json
   # → build/app/outputs/bundle/prodRelease/app-prod-release.aab
   ```

4. Play Console → Create app (free, app). Fill in the store listing
   ([mobile-store-listing.md](mobile-store-listing.md)), App content (privacy policy,
   ads: none, target audience and content, **Data safety** and **Families** answers from
   [mobile-store-privacy.md](mobile-store-privacy.md)), and let Google manage the app
   signing key (Play App Signing).
5. Test and release → Testing → **Internal testing**: create a release, upload the
   `.aab`, add testers (up to 100 emails), roll out. Testers get a link to install.
6. When it's ready: closed testing (new personal developer accounts need 12 testers for
   14 days), then production. Apps in the Designed for Families programme are reviewed
   more closely: allow a week.

## iOS release (TestFlight, App Store) — on a Mac

The iOS project is ready but can only be built on a Mac with Xcode.

1. Install Xcode, then `flutter doctor` until the iOS line is green.
2. From the repository root: `melos bootstrap`; then `cd apps/mobile`,
   `flutter build ios --config-only --release --dart-define-from-file=config/prod.json`.
3. Open `apps/mobile/ios/Runner.xcworkspace` in Xcode. Runner target → Signing &
   Capabilities: choose your team, keep "Automatically manage signing". Xcode picks up
   **Push Notifications** and **Associated Domains** from `Runner/Runner.entitlements`
   (check the domain). `PrivacyInfo.xcprivacy` is already in the target.
4. App Store Connect → Apps → New app: bundle ID `org.kidscoding.app`, primary language
   English; add Arabic and Urdu localisations for the listing.
5. Build and upload:

   ```bash
   flutter build ipa --release --dart-define-from-file=config/prod.json
   # then open build/ios/archive/Runner.xcarchive in Xcode → Distribute App → App Store Connect
   ```

6. App Store Connect → TestFlight: add internal testers (your team, no review) or
   external testers (a short review). The export-compliance question is answered in
   `Info.plist` (HTTPS only).
7. For the App Store: the App Privacy answers and the Kids Category choice are in
   [mobile-store-privacy.md](mobile-store-privacy.md). Kids Category apps get a stricter
   review (no third-party analytics or ads, a parental gate before links out: both are
   in place).

The iOS build has one scheme; to install dev, staging and production side by side,
add Xcode schemes and bundle ID suffixes per flavour (Flutter's "flavors" guide).

## CI

The `mobile` job in `.github/workflows/ci.yml` (delivered as `_github/workflows/ci.yml`:
copy it over) checks the shared tokens, the Dart API client (regenerated and compared),
formatting, `flutter analyze --fatal-infos`, the tests, and builds a dev APK.

When the API changes: `pnpm api:client` (TypeScript client), then `pnpm api:client:dart`
(needs Java and Flutter) and commit both.
