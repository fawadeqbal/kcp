import { appleAppSiteAssociation, appLinkConfig, assetLinks } from './app-links';

const fingerprint = Array.from({ length: 32 }, () => 'AB').join(':');

describe('app links', () => {
  it('publishes nothing until the apps are set up', () => {
    const config = appLinkConfig({});
    expect(assetLinks(config)).toBeNull();
    expect(appleAppSiteAssociation(config)).toBeNull();
  });

  it('names the Android app and its signing certificates', () => {
    const config = appLinkConfig({
      APP_ANDROID_PACKAGE: 'org.kidscoding.app',
      APP_ANDROID_SHA256: `${fingerprint.toLowerCase()}, not-a-fingerprint`,
    });
    expect(assetLinks(config)).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'org.kidscoding.app',
          sha256_cert_fingerprints: [fingerprint],
        },
      },
    ]);
  });

  it('names the iOS app and the pages it opens', () => {
    const body = appleAppSiteAssociation(
      appLinkConfig({ APP_IOS_APP_ID: 'ABCDE12345.org.kidscoding.app' }),
    );
    expect(body?.applinks.details[0]?.appIDs).toEqual(['ABCDE12345.org.kidscoding.app']);
    expect(body?.applinks.details[0]?.components).toContainEqual({ '/': '/*/learn/*-m*-l*' });
    expect(
      appleAppSiteAssociation(appLinkConfig({ APP_IOS_APP_ID: 'org.kidscoding.app' })),
    ).toBeNull();
  });
});
