---
title: Fixing merge conflicts
summary: When two branches change the same lines, git asks you to decide. It's normal — here's how.
---

Most merges just work. But if two branches changed **the same lines of the same file** in different ways, git can't know which one you want. That's a **merge conflict**: git stops the merge and marks the spot in the file:

```text
<<<<<<< HEAD
<h1>Welcome to our club</h1>
=======
<h1>Hello, friends!</h1>
>>>>>>> title
```

- Between `<<<<<<< HEAD` and `=======` is the version on your branch.
- Between `=======` and `>>>>>>> title` is the version from the branch you're merging.

To fix it:

1. Open the file and decide what it should say: one version, the other, or a mix.
2. **Delete the three marker lines** (`<<<<<<<`, `=======`, `>>>>>>>`).
3. `git add` the file to mark it fixed, then `git commit -m "Merge the new title"`.

`git status` tells you which files still have conflicts. Changed your mind? `git merge --abort` puts everything back as it was before the merge.

Conflicts aren't mistakes: they mean two people were busy on the same part. In a team, talk about it and pick the best of both.

### How this lesson works

On the left is your project's folder: pick a file to edit it (your changes are saved as you type). On the right is a **terminal**: type a command and press **Enter**. Type `help` to see every command you can use here. When you think you're done, press **Check my work**.
