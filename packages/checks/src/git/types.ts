/**
 * Git lessons (Pro track): a practice repository that lives in the lesson. The student
 * types git commands and edits files; every step is kept as an action, and the same
 * simulator replays the actions in the browser and on the server, so a result can't
 * be typed in by hand. No real git runs, and nothing leaves the page.
 */

/** One thing the student did: a command line, or a file written or removed. */
export type GitAction = { run: string } | { write: string; content: string } | { remove: string };

/** Where a git lesson starts: the files in the folder, and steps already taken. */
export interface GitSetup {
  files: Record<string, string>;
  /** Run before the student starts (an existing history, a branch someone made). */
  setup?: GitAction[];
}

export interface GitCommit {
  oid: string;
  message: string;
  parents: string[];
  /** The files as they were committed: path → content. */
  tree: Record<string, string>;
  /** Order of creation (for `git log`). */
  seq: number;
}

export interface GitMerge {
  /** The branch being merged in, and its commit. */
  branch: string;
  oid: string;
  /** Files with conflict markers, until they are added again. */
  conflicts: string[];
}

export interface GitState {
  initialized: boolean;
  /** The working folder: path → content. */
  files: Record<string, string>;
  /** The staging area: what the next commit will contain. */
  index: Record<string, string>;
  commits: Record<string, GitCommit>;
  /** Branch → its latest commit (null until the first commit). */
  branches: Record<string, string | null>;
  /** The current branch. */
  head: string;
  merging: GitMerge | null;
  seq: number;
}

export interface GitOutput {
  /** What the terminal shows (English, like git itself). */
  output: string;
  ok: boolean;
}

/** Limits that keep a practice repository small. */
export const GIT_LIMITS = {
  actions: 400,
  files: 30,
  fileLength: 20_000,
  messageLength: 200,
  commandLength: 300,
} as const;
