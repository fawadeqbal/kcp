# Kids Coding: the mobile app

Flutter app for students and parents (Android and iOS). Students do today's practice
and quizzes, keep their streak, and follow lessons; parents follow each child and
change their switches behind a parental gate. Code challenges, projects, sign-up and
payments stay on the website.

```bash
melos bootstrap                                               # from the repository root
flutter run --flavor dev --dart-define-from-file=config/dev.json
flutter test
flutter analyze --fatal-infos
```

| Folder                  | What's in it                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `lib/api`               | The API client (Dio) with the token refresh                                                       |
| `lib/auth`              | Sign-in, the session, secure token storage                                                        |
| `lib/router`            | Screens and who may see them; website links → app screens                                         |
| `lib/features`          | The screens: student (today, practice, lessons, leaderboard, me), parent, settings                |
| `lib/features/quiz`     | Quizzes: order the lines, find the bug, predict the output, choose                                |
| `lib/push`, `lib/crash` | Notifications (Firebase, off until configured) and crash reports to our API                       |
| `lib/l10n`              | Texts in English, Arabic and Urdu (`app_*.arb`); `badge_texts.g.dart` comes from the web messages |
| `lib/theme`             | The look (light and dark); `tokens.g.dart` and `icons.g.dart` come from `packages/ui`             |
| `config/`               | Settings per flavour (API and website address, Firebase)                                          |
| `tool/shared.mjs`       | Writes the generated Dart files from the web packages                                             |

The API client is `packages/api-client-dart` (generated: `pnpm api:client:dart`).

Adding a text: put it in `lib/l10n/app_en.arb`, then `app_ar.arb` and `app_ur.arb`
(the test `test/l10n_test.dart` fails if one is missing), and run `flutter gen-l10n`.

Building and releasing, Firebase, signing, iOS on a Mac: [docs/mobile-release.md](../../docs/mobile-release.md).
Store privacy answers and the SDK audit: [docs/mobile-store-privacy.md](../../docs/mobile-store-privacy.md).
