---
title: Branches
summary: Try an idea on a branch without breaking the working version, then merge it in when it's ready.
---

A **branch** is a line of commits. Every repository starts with one, called `main`: that's the version that works. When you want to try something — a dark mode, a new page — make a **new branch**, work there, and `main` stays safe.

```text
git branch                     list the branches (* marks the one you're on)
git switch -c dark-mode        make a branch called dark-mode and move to it
git switch main                go back to main
git merge dark-mode            bring dark-mode's commits into the branch you're on
git branch -d dark-mode        delete a branch once it's merged
```

When you switch branches, git changes the files in your folder to match that branch. Nothing is lost: the commits are still on their branch.

**Merging** brings another branch's work in. If `main` hasn't changed since the branch started, git simply moves `main` forward (a "fast-forward"). If both branches have new commits, git makes a **merge commit** that joins them.

In a team, everyone works on their own branch and merges into `main` when the work is ready — usually with a **pull request**, so a teammate or mentor can look at it first. You'll do that in hackathons.

### How this lesson works

On the left is your project's folder: pick a file to edit it (your changes are saved as you type). On the right is a **terminal**: type a command and press **Enter**. Type `help` to see every command you can use here. When you think you're done, press **Check my work**.
