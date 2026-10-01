---
title: Your first repository
summary: Git saves snapshots of your project, so you can always see what changed and go back.
---

Have you ever saved files called `page-final.html`, `page-final-2.html` and `page-really-final.html`? **Git** fixes that. It keeps every saved version of your project in one place, with a note about what changed. Almost every coding team in the world uses it.

A folder that git looks after is called a **repository** (or "repo"). A saved version is a **commit**. Making a commit takes two steps:

1. **Stage** the changes you want to save: `git add index.html` (or `git add .` for everything).
2. **Commit** them with a short message: `git commit -m "Add my home page"`.

```text
git init                        start a repository here (once)
git status                      what changed since the last commit
git add index.html              stage a file
git commit -m "Add my page"     save the staged changes
git log --oneline               the history, newest first
```

Write messages that say what the commit does: "Add a footer", "Fix the heading colour". Your future self (and your team) will thank you.

### How this lesson works

On the left is your project's folder: pick a file to edit it (your changes are saved as you type). On the right is a **terminal**: type a command and press **Enter**. Type `help` to see every command you can use here. When you think you're done, press **Check my work**.
