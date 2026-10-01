/**
 * Children who signed in on this device before (username, nickname and avatar only),
 * so the next time a younger child just taps their avatar and then their pictures.
 * Only in this browser's storage; "Forget" removes a child. Never a password.
 */

export interface KidOnDevice {
  username: string;
  nickname: string;
  avatarKey: string;
  /** Signed in with a picture password last time. */
  pictures?: boolean;
}

const KEY = 'kcp-kids-on-device';
const MAX = 6;

export function kidsOnDevice(): KidOnDevice[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(value)
      ? value.filter(
          (kid): kid is KidOnDevice =>
            !!kid &&
            typeof kid.username === 'string' &&
            typeof kid.nickname === 'string' &&
            typeof kid.avatarKey === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export function rememberKid(kid: KidOnDevice) {
  try {
    const others = kidsOnDevice().filter((k) => k.username !== kid.username);
    localStorage.setItem(KEY, JSON.stringify([kid, ...others].slice(0, MAX)));
  } catch {
    // Storage off (private window): nothing to remember.
  }
}

export function forgetKid(username: string) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(kidsOnDevice().filter((k) => k.username !== username)),
    );
  } catch {
    // Nothing stored.
  }
}
