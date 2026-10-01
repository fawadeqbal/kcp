# Kids Coding: the mobile app

Flutter app for students and parents (Android and iOS). Students do today's practice
and quizzes, keep their streak, follow lessons and build Explorer steps with blocks
(ages 9–12); younger children can sign in with a picture password or from a parent's
phone. Parents follow each child, change their switches behind a parental gate, set a
picture password and sign in a child's device. Code challenges (they need a keyboard),
projects, sign-up, parental consent and payments stay on the website.

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
| `lib/features/explorer` | Explorer steps: the block editor and Bit's world in a WebView (`assets/explorer`, see below)      |
| `lib/push`, `lib/crash` | Notifications (Firebase, off until configured) and crash reports to our API                       |
| `lib/l10n`              | Texts in English, Arabic and Urdu (`app_*.arb`); `badge_texts.g.dart` comes from the web messages |
| `lib/theme`             | The look (light and dark); `tokens.g.dart` and `icons.g.dart` come from `packages/ui`             |
| `config/`               | Settings per flavour (API and website address, Firebase)                                          |
| `tool/shared.mjs`       | Writes the generated Dart files from the web packages                                             |

The API client is `packages/api-client-dart` (generated: `pnpm api:client:dart`).

`assets/explorer` is built from `tools/explorer-embed` (Blockly and the stage from
`packages/checks`, with the Explorer texts): run `pnpm --filter @kcp/explorer-embed build`
after changing the blocks, the stage or their texts, and commit the result (CI checks it
is up to date). The page loads nothing from the network; the app starts it with the
level and the program (`window.KcpExplorer`) and hears back through the `KcpBridge`
channel (`lib/features/explorer/explorer_bridge.dart`).

Adding a text: put it in `lib/l10n/app_en.arb`, then `app_ar.arb` and `app_ur.arb`
(the test `test/l10n_test.dart` fails if one is missing), and run `flutter gen-l10n`.

Building and releasing, Firebase, signing, iOS on a Mac: [docs/mobile-release.md](../../docs/mobile-release.md).
Store privacy answers and the SDK audit: [docs/mobile-store-privacy.md](../../docs/mobile-store-privacy.md).
