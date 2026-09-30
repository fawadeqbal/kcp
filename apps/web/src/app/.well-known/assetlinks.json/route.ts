import { appLinkConfig, assetLinks } from '@/lib/app-links';

/** Android App Links: which app may open this site's links (see lib/app-links.ts). */
export function GET() {
  const body = assetLinks(appLinkConfig());
  if (!body) return new Response('Not found', { status: 404 });
  return Response.json(body, { headers: { 'cache-control': 'public, max-age=3600' } });
}
