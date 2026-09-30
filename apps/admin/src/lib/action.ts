'use client';

import { useState } from 'react';
import { errorCode, errorText } from './api';
import { errorMessage, NETWORK_ERROR } from './errors';

/** Runs one API call at a time for a form or button, keeping its error readable. */
export function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function run(call: () => Promise<{ error?: unknown; response: Response }>) {
    setError(null);
    setBusy(true);
    try {
      const { error: apiError, response } = await call();
      if (response.ok) return true;
      setError(errorMessage(errorCode(apiError), response.status, errorText(apiError)));
    } catch {
      setError(NETWORK_ERROR);
    } finally {
      setBusy(false);
    }
    return false;
  }
  return { error, busy, run, clear: () => setError(null) };
}
