import { appleAppSiteAssociation, appLinkConfig } from '@/lib/app-links';

/** iOS Universal Links: which app may open this site's links (see lib/app-links.ts). */
export function GET() {
  const body = appleAppSiteAssociation(appLinkConfig());
  if (!body) return new Response('Not found', { status: 404 });
  return Response.json(body, { headers: { 'cache-control': 'public, max-age=3600' } });
}
