---
title: Staging, and undoing mistakes
summary: Choose exactly what goes into each commit, and get a file back when an edit goes wrong.
---

Git sees your files in three places:

- the **folder** — your files as they are now;
- the **staging area** — what the next commit will contain (`git add` puts changes here);
- the **commits** — the versions you saved.

Because you choose what to stage, one commit can hold one idea. Changed the page _and_ the colours? Stage and commit the page first, then the colours: two small commits with clear messages are easier to understand than one big one.

```text
git status                   lists "Changes to be committed" (staged) and "not staged"
git diff                     changes you haven't staged yet
git diff --staged            changes that are staged
git restore index.html       throw away changes to a file (back to the staged version)
git restore --staged a.css   unstage a file (the change stays in the folder)
```

Be careful with `git restore`: changes you throw away are gone. That's exactly why you commit often.

### How this lesson works

On the left is your project's folder: pick a file to edit it (your changes are saved as you type). On the right is a **terminal**: type a command and press **Enter**. Type `help` to see every command you can use here. When you think you're done, press **Check my work**.
