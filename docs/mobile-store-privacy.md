# The mobile app: SDK audit and the stores' privacy answers

Children use this app, so both stores apply their strictest rules: Google Play's
**Families policy** (the app's target audience includes children) and Apple's
**Kids Category** rules (if listed there) plus App Privacy "nutrition labels". This page
lists everything inside the app, what leaves the phone, and the answers to give in
Play Console and App Store Connect. Update it whenever a dependency is added (the
reviewer rule: no new SDK without a line here).

Audited: app version 1.0.0, 2026-10. Legal wording belongs to the privacy policy on the
website; have it reviewed before the first release.

## What leaves the phone

| Data                                  | Sent to                    | When                                         | Why                             |
| ------------------------------------- | -------------------------- | -------------------------------------------- | ------------------------------- |
| Parent's email and password           | Our API                    | Parent signs in                              | Sign-in                         |
| Student's login name and password     | Our API                    | Student signs in                             | Sign-in                         |
| Quiz answers, practice, lesson opened | Our API                    | While learning                               | Grading, XP, streaks, progress  |
| Parent's switches                     | Our API                    | After the parental gate                      | Consent and settings            |
| Feedback message                      | Our API                    | Someone sends feedback                       | Support, safety reports         |
| Push token, platform, app language    | Our API; Google (Firebase) | Only after "Turn on reminders/notifications" | Streak and family notifications |
| Crash report (versions, error, stack) | Our API                    | The app crashes (release builds)             | Fixing bugs; no account in it   |

Nothing goes to analytics, advertising or tracking services; there are none in the app.
No location, contacts, photos, camera, microphone or advertising ID. All traffic is
HTTPS (plain HTTP only in the dev build, to a computer on the same network).

On the phone: the refresh token in the Android Keystore / iOS Keychain; the chosen
language and whether reminders were offered in the app's preferences. Backups are off
(`allowBackup="false"`, no cloud or device-transfer backup).

## SDK audit

Every package the app uses, including what the platform plugins bring in.

| Package (version)                                               | By                           | Native code                                                               | Network                       | Collects                                              | Families / Kids OK |
| --------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | ------------------ |
| flutter, flutter_localizations                                  | Google (Flutter)             | engine                                                                    | no                            | nothing                                               | yes                |
| flutter_riverpod 3.4                                            | Remi Rousselet               | no                                                                        | no                            | nothing                                               | yes                |
| go_router 18.0                                                  | Flutter team                 | no                                                                        | no                            | nothing                                               | yes                |
| dio 5.11                                                        | cfug (open source)           | no                                                                        | our API only                  | nothing by itself                                     | yes                |
| kcp_api (ours, generated), json_annotation, copy_with_extension | us / Dart team               | no                                                                        | our API only                  | nothing by itself                                     | yes                |
| intl 0.20                                                       | Dart team                    | no                                                                        | no                            | nothing                                               | yes                |
| flutter_markdown_plus 1.0, markdown 7.3                         | Foresight Mobile / Dart team | no                                                                        | no (images are shown as text) | nothing                                               | yes                |
| flutter_secure_storage 11.2                                     | open source                  | yes (Keystore / Keychain)                                                 | no                            | stores the refresh token on the phone                 | yes                |
| shared_preferences 2.5                                          | Flutter team                 | yes                                                                       | no                            | stores the language choice on the phone               | yes                |
| url_launcher 6.3                                                | Flutter team                 | yes                                                                       | no                            | opens web pages (after the parental gate)             | yes                |
| package_info_plus 10.2                                          | Flutter Community            | yes                                                                       | no                            | reads the app's own version                           | yes                |
| path_provider (via the above)                                   | Flutter team                 | yes                                                                       | no                            | nothing                                               | yes                |
| firebase_core 4.15, firebase_messaging 16.7                     | Google                       | yes (Firebase Android/iOS SDKs: Messaging, Installations, Data Transport) | Google, only after opt-in     | Firebase installation ID and push token; no analytics | yes (see below)    |

**Firebase Cloud Messaging.** Only messaging is included: no Analytics, Crashlytics,
Performance or In-App Messaging. It stays dormant until someone taps "Turn on
reminders" or "Turn on notifications": auto-initialisation is off
(`firebase_messaging_auto_init_enabled`, `FirebaseMessagingAutoInitEnabled`), analytics
collection is deactivated in the manifest and `Info.plist`, and the advertising-ID
permission is removed from the Android manifest. Google processes the token as our
service provider to deliver notifications. The Firebase project must have Google
Analytics **disabled**. The Firebase SDKs ship their own privacy manifests on iOS.

**Not in the app, on purpose:** analytics (Google Analytics, Firebase Analytics,
Mixpanel…), crash SDKs (Crashlytics, Sentry: we report crashes to our own API), ads,
attribution, social sign-in, in-app purchases, webviews.

Check after every dependency change:

```bash
cd apps/mobile
flutter pub deps --no-dev --style=compact      # the full list
# Android: nothing asks for the advertising ID or other identifiers
flutter build apk --release --flavor prod --dart-define-from-file=config/prod.json
$ANDROID_HOME/build-tools/*/aapt2 dump permissions build/app/outputs/flutter-apk/app-prod-release.apk
```

The release build of 1.0.0 asks for exactly these (checked with `aapt2`):

| Permission                                                    | From               | Why                                     |
| ------------------------------------------------------------- | ------------------ | --------------------------------------- |
| `INTERNET`                                                    | the app            | Talking to our API                      |
| `POST_NOTIFICATIONS`                                          | the app            | Android 13+: asked only after "Turn on" |
| `ACCESS_NETWORK_STATE`, `WAKE_LOCK`                           | Firebase Messaging | Delivering notifications                |
| `com.google.android.c2dm.permission.RECEIVE`                  | Firebase Messaging | Receiving notifications                 |
| `org.kidscoding.app.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` | AndroidX           | Keeps the app's own broadcasts private  |

No advertising ID (`com.google.android.gms.permission.AD_ID` is removed in the
manifest), no location, contacts, storage, camera or microphone. Anything new must be
explained here before release.

## Google Play: App content answers

**Target audience and content.** Age groups: the platform is for ages 9–16 with parents,
so choose **9–12** and **13–15** (and 16–17 if accounts for 16-year-olds stay open).
Because the target includes children, the app joins the **Families policy**: the
answers below and the SDK list above are what it requires.

**Ads.** The app contains no ads.

**Data safety** (Play's definitions: "collected" = sent off the phone; "shared" = given
to a third party that is not our service provider):

| Data type (Play)                                       | Collected | Shared | Optional     | Purpose                                          |
| ------------------------------------------------------ | --------- | ------ | ------------ | ------------------------------------------------ |
| Personal info → Email address                          | Yes       | No     | No (parents) | Account management, App functionality            |
| Personal info → User IDs                               | Yes       | No     | No           | Account management                               |
| App activity → App interactions                        | Yes       | No     | No           | App functionality                                |
| App activity → Other user-generated content (feedback) | Yes       | No     | Yes          | Developer communications                         |
| App info and performance → Crash logs                  | Yes       | No     | No           | Analytics (Play's category for "fixing the app") |
| Device or other IDs (push token)                       | Yes       | No     | Yes          | App functionality                                |

- Is all data encrypted in transit? **Yes.**
- Can people ask for their data to be deleted? **Yes**: parents delete a child or the
  whole account on the website (Account → Delete), and can download the data first.
  Give the account page's URL as the deletion link.
- Independent security review: No (unless you commission one).

**Families policy checklist.** No ads, no advertising ID, no location, no
tracking; the app doesn't ask for personal data beyond signing in (accounts are made by
a parent on the website with verified consent); links out of the app and account
changes are behind a parental gate; no social features between children in the app;
the privacy policy link is in the store listing and in the app (Settings).

**Content rating (IARC questionnaire).** Category: Reference, News, or Educational.
No violence, sexuality, language, controlled substances, gambling. Users interact:
**No** (children can't message each other; leaderboards show nicknames only with a
parent's consent). Shares location: No. Digital purchases: No. Expected rating:
Everyone / PEGI 3 / USK 0.

**App access.** Reviewers need an account: create a demo parent and student
(`pnpm demo:accounts` on staging) and give both logins under App access.

## App Store: App Privacy answers

Data used to track you: **none**. Data linked to you (all for **App Functionality**,
none for tracking, advertising or third-party purposes):

- Contact Info → Email Address (parents)
- Identifiers → User ID (login name / account)
- Identifiers → Device ID (push token; only if notifications are turned on)
- User Content → Other User Content (feedback messages)
- Usage Data → Product Interaction (quiz answers, practice, lessons opened)

Data not linked to you: Diagnostics → Crash Data.

These match `ios/Runner/PrivacyInfo.xcprivacy`.

**Kids Category.** Recommended: list the app in Kids, age band **9–11** (the youngest
students; older students still find it). The rules and how the app meets them:

- No third-party analytics or advertising: none in the app.
- Parental gate before links out and before commerce: every web link and every switch
  a parent changes asks a multiplication written in words; there is no commerce.
- No data sent to third parties except as needed to provide the service (push
  delivery through Apple/Google).
- Privacy policy: in the listing and in Settings.

Age rating: 4+. Made for Kids: Yes (Kids Category).

**Sign in with Apple** is not required: the app has no third-party sign-in.
**Account deletion in the app** (guideline 5.1.1(v)) applies to apps that create
accounts; accounts are created on the website, and the app links to deletion there
(Settings → Account and data), which is the accepted way for this case.

## Accessibility

The app is checked by widget tests in English, Arabic and Urdu: tap targets (48 dp
Android, 44 pt iOS), labels on every button, text contrast, and no overflow at 200 %
text size (`apps/mobile/test/accessibility_test.dart`). Arabic and Urdu lay out
right-to-left; code always stays left-to-right. Before each release, also try TalkBack
and VoiceOver on a phone: sign in, do today's practice (the order quiz has "move up /
move down" buttons with spoken results), and change a switch as a parent.
