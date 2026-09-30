# Accessibility and right to left

The goal is WCAG 2.1 level AA in English, Arabic and Urdu, on phones, tablets and laptops. This page records the Sprint 8 review (30 September 2026) and what to check again.

## Automated, on every CI run

`apps/web/e2e/accessibility.spec.ts`:

- **axe-core** (WCAG 2.1 A and AA rules) on 18 pages in each of the three languages: home, both logins, sign-up, safety, terms, privacy and the "page not found" page; the parent dashboard, adding a child, plans and payments, and account; the lesson map, a lesson, a project, the portfolio, leaderboards and badges. The code preview and videos are left out: they are separate documents (the sandbox, YouTube).
- **Right to left on a 360-pixel phone** (Arabic and Urdu): 11 main pages (home, login, sign-up, terms, the parent's four pages, the lesson map, portfolio and leaderboards) are mirrored (`dir="rtl"`) and never scroll sideways.
- **Nastaliq line height:** Urdu paragraphs have at least 1.9 times their font size between lines, so the tall letters don't collide.

The other browser tests find elements by their accessible role and name (for example `getByRole('button', { name: … })`), which also checks that controls are labelled in every language.

## Fixed in this review

- **Code colours:** the editor's syntax colours didn't reach 4.5:1 contrast. The editor now uses its own colour set that does.
- **Pages that don't exist** under a language (for example `/ar/nothing`) now show the app's own "page not found" page in that language, with `lang`, `dir` and a heading, instead of a bare page without a language.
- **Feedback form:** the "Safety concern" choice spans a full row, so its longer label doesn't squeeze in Urdu.
- **Admin panel:** with every section on the menu, the sidebar scrolls on its own, so "Log out" is always reachable on short screens.

## Checked in the code review

- **Keyboard:** every page has a "Skip to content" link. Dialogs use the native `<dialog>`, which keeps focus inside, closes on Escape and returns focus to the button that opened it. The lesson step tabs follow the ARIA tabs pattern, with the arrow keys reversed in right to left (a browser test presses them in Arabic).
- **Announcements:** check results, saving and loading states use live regions (`aria-live` or `role="status"`).
- **Right to left:** the whole page follows `dir` from the language; direction arrows (previous and next lesson) are mirrored; the code editor is always left to right; a project written in another language is marked with its `lang`.
- **Motion:** animations and transitions are switched off when the device asks for reduced motion.

## Still to do

- **A keyboard-only walk-through** of sign-up, adding a child, a whole lesson, shipping a project and paying, and a check at **200% zoom**, in all three languages, before the pilot.

- **Native speakers** of Arabic and Urdu should read every screen before the pilot: the texts were written by Claude, and a real reader will catch wording and layout problems a test can't.
- **A real screen reader session** (TalkBack on Android, which most pilot families will have; VoiceOver on iPad) through a whole lesson, with a native speaker.
- **Children with disabilities:** ask pilot schools whether any students use assistive technology, and watch them use the app.
- The admin panel and marketing site have no automated axe checks yet (staff only, and a few static pages); add them in Phase 2.
