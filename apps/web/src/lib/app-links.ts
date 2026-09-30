/*
 * App links: with these files on the web app's domain, links to lessons and to the
 * parent dashboard open the mobile app when it's installed (Android App Links, iOS
 * Universal Links); otherwise they open here as always. Set from the environment,
 * so nothing is published until the app exists in the stores.
 */

/**
 * The web pages the app can open, per language (the app maps them to its screens):
 * the lesson list, lessons (IDs like builder-m01-l03, not /learn/projects/…,
 * /learn/portfolio…, which only the website has) and the parent dashboard.
 */
export const APP_LINK_PATHS = ['/*/learn', '/*/learn/*-m*-l*', '/*/dashboard'];

export interface AppLinkConfig {
  /** Android package name, e.g. org.kidscoding.app. */
  androidPackage?: string;
  /** SHA-256 fingerprints of the app's signing certificates (Play Console → App signing). */
  androidFingerprints: string[];
  /** Apple Team ID and bundle ID, e.g. ABCDE12345.org.kidscoding.app. */
  iosAppId?: string;
}

const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/;

export function appLinkConfig(
  env: Record<string, string | undefined> = process.env,
): AppLinkConfig {
  return {
    androidPackage: env['APP_ANDROID_PACKAGE']?.trim() || undefined,
    androidFingerprints: (env['APP_ANDROID_SHA256'] ?? '')
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter((value) => FINGERPRINT.test(value)),
    iosAppId: env['APP_IOS_APP_ID']?.trim() || undefined,
  };
}

/** /.well-known/assetlinks.json, or null when the Android app isn't set up. */
export function assetLinks(config: AppLinkConfig) {
  if (!config.androidPackage || config.androidFingerprints.length === 0) return null;
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: config.androidPackage,
        sha256_cert_fingerprints: config.androidFingerprints,
      },
    },
  ];
}

/** /.well-known/apple-app-site-association, or null when the iOS app isn't set up. */
export function appleAppSiteAssociation(config: AppLinkConfig) {
  if (!config.iosAppId || !/^[A-Z0-9]{10}\.[\w.-]+$/.test(config.iosAppId)) return null;
  return {
    applinks: {
      details: [
        {
          appIDs: [config.iosAppId],
          components: APP_LINK_PATHS.map((path) => ({ '/': path })),
        },
      ],
    },
  };
}
