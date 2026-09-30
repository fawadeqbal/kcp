import { createApiClient } from './index.js';

describe('createApiClient', () => {
  it('calls typed paths on the configured base URL', async () => {
    const calls: Request[] = [];
    const api = createApiClient({
      baseUrl: 'http://api.test/',
      fetch: async (input: Request) => {
        calls.push(input);
        return new Response(JSON.stringify({ status: 'ok', version: 'x', uptimeSeconds: 1 }), {
          headers: { 'content-type': 'application/json' },
        });
      },
    });

    const { data, error } = await api.GET('/v1/health/live');

    expect(error).toBeUndefined();
    expect(data?.status).toBe('ok');
    expect(calls[0]?.url).toBe('http://api.test/v1/health/live');
  });
});
