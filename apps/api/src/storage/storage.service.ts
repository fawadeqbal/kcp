import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../config/app-config.service.js';

/**
 * Files in S3-compatible storage: Cloudflare R2 in staging and production, the
 * storage container (infra/storage) locally. Keys are paths like
 * "projects/<userId>/<projectId>/v3/index.html".
 */
@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  readonly bucket: string;

  constructor(private readonly config: AppConfigService) {
    const accessKeyId = config.get('S3_ACCESS_KEY_ID');
    const secretAccessKey = config.get('S3_SECRET_ACCESS_KEY');
    this.bucket = config.get('S3_BUCKET');
    this.client = new S3Client({
      endpoint: config.get('S3_ENDPOINT'),
      region: config.get('S3_REGION'),
      forcePathStyle: config.get('S3_FORCE_PATH_STYLE'),
      credentials: accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
      // R2 and the local server don't need the newer optional checksums.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      maxAttempts: 2,
    });
  }

  /** Outside production, create the bucket if the local storage doesn't have it yet. */
  async onModuleInit(): Promise<void> {
    if (this.config.isProduction) return;
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      try {
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      } catch {
        this.logger.warn(
          `File storage isn't reachable (${(error as Error).name}). Start it with "pnpm services:up".`,
        );
      }
    }
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  /** Throws if the bucket can't be reached (used by the readiness check). */
  async ping(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
  }

  async putText(key: string, body: string, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: body, ContentType: contentType }),
    );
  }

  /** The file's text, or null when it doesn't exist. */
  async getText(key: string): Promise<string | null> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return (await result.Body?.transformToString('utf-8')) ?? '';
    } catch (error) {
      if (error instanceof NoSuchKey || (error as { name?: string }).name === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  /** Deletes every file whose key starts with `prefix` (e.g. everything of one student). */
  /**
   * Deletes every file in a folder, except those under `keep` (a sub-folder). Throws
   * if any file could not be deleted, so callers can try again.
   */
  async deletePrefix(prefix: string, { keep }: { keep?: string } = {}): Promise<number> {
    if (!prefix.endsWith('/') || (keep !== undefined && !keep.endsWith('/'))) {
      throw new Error('Delete only whole folders (prefixes ending in "/")');
    }
    let deleted = 0;
    let failed = 0;
    let token: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, ContinuationToken: token }),
      );
      const keys = (page.Contents ?? []).flatMap((item) =>
        item.Key && !(keep && item.Key.startsWith(keep)) ? [{ Key: item.Key }] : [],
      );
      if (keys.length) {
        const result = await this.client.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys, Quiet: true } }),
        );
        failed += result.Errors?.length ?? 0;
        deleted += keys.length - (result.Errors?.length ?? 0);
      }
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
    if (failed) throw new Error(`${failed} file(s) under ${prefix} could not be deleted`);
    return deleted;
  }
}
