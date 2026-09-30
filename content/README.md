# Lessons (`content/`)

Every lesson lives here as plain files: YAML for structure and checks, Markdown for the texts in each language. `pnpm content:check` validates everything; `pnpm content:import` writes it into the database. Each deploy imports the lessons again (the `kcp-migrate` image), so a merged change reaches staging on its own.

The content studio in Phase 2 replaces hand-editing these files for tutors; until then, changes go through pull requests like code.

## Layout

```text
content/
  builder/                              a track
    track.yaml
    m01-first-website/                  a module
      module.yaml
      project.yaml                      the module's project: starter, solution, requirements
      project.en.md                     its brief, one file per language
      project.ar.md
      project.ur.md
      l01-hello-html/                   a lesson
        lesson.yaml
        explain.en.md                   the explainer, one file per language
        explain.ar.md
        explain.ur.md
        challenges/
          c1.yaml                       a "try it" step: code, solution, checks
          c1.en.md                      its title, instructions and hints per language
          c1.ar.md
          c1.ur.md
        quizzes/
          q1.yaml                       a quick question, all languages in one file
```

Folder names only keep things tidy; the **IDs inside the files** are what count. IDs use lowercase letters, digits and dashes, start with their parent's ID (`builder` → `builder-m01` → `builder-m01-l01` → `builder-m01-l01-c1`), and **never change once a lesson is live**: progress, drafts and submissions point at them. The `order` numbers decide the sequence and must be unique among siblings.

## Files

### `track.yaml` and `module.yaml`

```yaml
id: builder-m01
order: 1
titles:
  en: Your first website
  ar: موقعك الإلكتروني الأول
  ur: آپ کی پہلی ویب سائٹ
descriptions: # modules only
  en: Build a web page about the things you love, with HTML and CSS.
```

### `lesson.yaml`

```yaml
id: builder-m01-l01
order: 1
xp: 20
isPremium: false # true = needs premium (a trial, a family plan or premium given by our team)
video: # optional, per language; without one in their language, students get the lesson without a video
  en: { provider: youtube, id: dQw4w9WgXcQ } # played through youtube-nocookie.com
  ar: { provider: cloudflare, id: 31c9291ab41fac05471db4e73aa11717 }
```

### `explain.<lang>.md`

```markdown
---
title: What is a website?
summary: Web pages are written in HTML. Write your first tag and see it in the browser.
---

Every website you visit is made of **web pages**…
```

Markdown with headings, lists, bold, links and code. **Raw HTML is not shown** (it is left out on purpose), so write tags as code: `` `<h1>` `` or in a fenced ` ```html ` block. `content:check` warns about bare tags.

### `challenges/<name>.yaml`

```yaml
id: builder-m01-l01-c1
order: 1
type: html # html, css, js or python
xp: 10
starter: # what the editor shows first; its files become the editor's tabs
  html: ''
solution: # never sent to students; `content:check` proves it passes
  html: |
    <h1>Hello, world!</h1>
checks:
  - id: has-h1
    expect: exists
    selector: h1
    hint: add_h1 # a key from the hints in c1.<lang>.md
```

### `challenges/<name>.<lang>.md`

```markdown
---
title: Say hello
hints:
  add_h1: Start with <h1> and finish with </h1>.
checks:
  has-h1: 'The page has a heading'
---

Write a big heading that says **Hello, world!**
```

Hints are plain text (tags are fine there). `checks` names what each check looks at, by the check's `id` in the YAML: the lesson screen lists these beside the editor and ticks them off as they pass. Write them as short statements about the student's page ("The heading has a colour"), not instructions. Missing hints and check names in a language fall back to English. `content:check` fails when a check has no English name, and warns when another language lacks one.

### `project.yaml` and `project.<lang>.md`

Every module ends with a project the student builds in three files (`index.html`, `style.css`, `script.js`) and **ships** to their portfolio. It works like a challenge: `starter`, `solution` and `checks` (here they are the requirements, all of which must pass before the student can ship).

```yaml
id: builder-m01-project # starts with the module's ID
xp: 100
isPremium: false # projects after Module 1 are premium
starter: { html: '<h1>All about me</h1>', css: '…', js: '…' }
solution: { html: '…', css: '…', js: '…' } # never sent to students
checks:
  - id: three-things
    expect: exists
    selector: ul li, ol li
    min: 3
    hint: list
```

`project.<lang>.md` has `title`, `summary`, `hints` and `checks` (the names of the requirements) in its front matter and the brief as its body. Name the button students press ("Ship it" / "انشر المشروع" / "پروجیکٹ شائع کریں") exactly as the app does.

### `quizzes/<name>.yaml`

Quick questions that work on a phone: they sit under the lesson on the web ("Check yourself") and make up the mobile app's **daily practice** (5 a day from the lessons the student is on; finishing them earns 20 XP, the default daily goal, so a streak can be kept from the phone). Aim for **3 per lesson**. The server grades them; answers never reach the apps.

| `kind`   | The student…                        | Needs                                      |
| -------- | ----------------------------------- | ------------------------------------------ |
| `order`  | puts shuffled lines in order        | `code` (3+ lines, in the right order)      |
| `bug`    | taps the line with the mistake      | `code` and `bugLine` (from 1)              |
| `output` | picks what the code prints or shows | `code`, `options` (with `code`), `answer`  |
| `choice` | picks the right answer              | `options` (with `code` or texts), `answer` |

```yaml
id: builder-m02-l01-q3 # starts with the lesson's ID
order: 3
kind: output
xp: 5 # the first right answer earns it
language: python # html, css, js or python: how the code is coloured
prompt: { en: What does this program print?, ar: …, ur: … }
code:
  - '# print("Hello!")'
  - 'print("My age is", 13)'
options:
  - id: a
    code: |- # an option can span lines
      Hello!
      My age is 13
  - id: c
    code: 'My age is 13'
answer: c
explanation: { en: Python skips a line that starts with #…, ar: …, ur: … }
```

Text options have their words per language instead: `options: [{ id: a, text: { en: …, ar: …, ur: … } }]`. Keep code to **14 lines of up to 120 characters** (phones are narrow), the prompt short, and the explanation to one or two sentences: it shows once the student gets it right, or after two wrong tries together with the right answer (the quiz then earns no XP, but still counts for the day's practice). `pnpm content:check` runs every Python and JavaScript `output` quiz and checks that the answer is what the code really prints.

## Checks

Checks run in the student's browser, inside the sandbox, after the page has loaded. Each one passes or fails; a failing check shows its hint.

| `expect`    | Passes when                                                                                                         | Options                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `exists`    | the CSS `selector` matches at least `min` (default 1) and at most `max` elements                                    | `min`, `max`                                          |
| `text`      | a matching element's text is not empty / contains / equals the value (case and spaces don't matter)                 | `notEmpty`, `includes`, `equals`, `all` (every match) |
| `attribute` | a matching element has the attribute `name`, optionally not empty or containing a value                             | `notEmpty`, `includes`, `all`                         |
| `css`       | a CSS rule for exactly `selector` sets `property` (`color\|background-color` for either)                            | `includes`                                            |
| `test`      | the JavaScript in `code` (the body of an async function, run in the page) returns something truthy within 2 seconds | —                                                     |

The server checks the work again when it's submitted: `exists`, `text`, `attribute` and `css` are re-run on the HTML and CSS **with scripts off**, except in JavaScript lessons (`type: js`), where the script is meant to build the page. So in HTML and CSS lessons and in projects, every requirement must be met by the HTML and CSS themselves, not created by the script; `content:check` fails a solution that only passes with its script running. The student can only send the files in the starter (the editor's tabs), so the solution may not use any other file.

### Python checks

Python challenges have `type: python` and a single file, `py` (the editor's `main.py` tab); a project can be a Python program too (`starter: { py: … }`). The program runs with [Pyodide](https://pyodide.org) in a worker inside the sandbox — and in `content:check`, with the same Python — and gets these checks instead of the page checks above:

| `expect` | Passes when                                                                                                                                                                              | Options                                               |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `output` | what the program printed is not empty / contains / equals the value (case and extra spaces don't matter), or has at least `minLines` lines                                               | `stdin`, `notEmpty`, `includes`, `equals`, `minLines` |
| `python` | the Python in `code`, run after the program with its variables and functions, doesn't raise. `__source__` is the program's text and `__output__` what it printed. Write it with `assert` | `stdin`                                               |

`stdin` is what gets typed in when the program calls `input()`, one answer per line (use `|-` in YAML for several lines). The program runs once for each different `stdin` among the checks, with fresh variables, and **a program that stops with an error fails every check that ran it** — so if the program calls `input()`, every check needs a `stdin` with enough answers, even a `python` check that only looks at `__source__`. Programs get 5 seconds.

```yaml
id: builder-m02-l02-c2
order: 2
type: python
xp: 10
starter:
  py: |
    name = "friend"
    print("Nice to meet you, " + name + "!")
solution:
  py: |
    name = input("What's your name? ")
    print("Nice to meet you, " + name + "!")
checks:
  - id: greets-sara
    expect: output
    stdin: Sara
    includes: Sara
    hint: greet_answer
  - id: uses-input
    expect: python
    stdin: Sara
    code: |
      assert "input(" in __source__
    hint: use_input
```

A `python` check can even play the program again with other answers (see the text adventure in `m02-python-first-steps/project.yaml`).

Write checks that accept every reasonable answer: check that a colour is set, not which colour. Students can see the preview, so checks are there to teach, not to police — a determined student could fool them, which is why mentor review (Phase 2) looks at the code itself.

## Before you open a pull request

```bash
pnpm content:check     # every file valid, every solution passes, every starter still fails a check
pnpm content:import    # into your local database, then try the lesson at http://localhost:3001
```

`content:check` also runs in CI. It fails on errors (bad IDs, missing English, a lesson without steps, a solution that doesn't pass or only passes with its script running, a solution file the starter doesn't have, a starter that already passes, an invalid selector) and warns about missing Arabic or Urdu texts and hints.

**Translations:** Arabic and Urdu texts need a review by a native speaker before a lesson goes to students. Keep code, tag names and file names in English inside translated texts.

**Removing things:** deleting a lesson or a step switches it off in the database on the next import — nothing is deleted, so students' progress stays. Deleting a language file removes that translation; students then see English.
