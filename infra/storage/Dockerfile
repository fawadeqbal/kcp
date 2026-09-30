# syntax=docker/dockerfile:1
#
# File storage for local development and CI: an S3-compatible server (SeaweedFS)
# with the development credentials and the "kcp-files" bucket built in.
# Staging and production use Cloudflare R2 through the same S3 API.
#
#   docker compose up -d storage        (part of `pnpm services:up`)
#   S3 API:        http://localhost:8333
#   Browse files:  http://localhost:8888  (the filer's web page)
#
# MinIO's free images were withdrawn in 2026; SeaweedFS (Apache 2.0) replaces it here.
FROM chrislusf/seaweedfs:4.48

# Development-only credentials: they match the API's defaults (.env.example).
COPY s3.json /etc/seaweedfs/s3.json

EXPOSE 8333 8888
VOLUME /data

HEALTHCHECK --interval=5s --timeout=3s --start-period=10s --retries=20 \
  CMD wget -qO- http://127.0.0.1:8333/healthz > /dev/null || exit 1

# One process: master, volume server, filer and the S3 gateway. Volumes stay small
# (64 MB) for a laptop, and writes stop when less than 1 GiB of disk is left (the
# default, 1%, stops them far too early on a large but fairly full disk). The S3
# gateway creates the "kcp-files" bucket on the first upload.
CMD ["server", "-dir=/data", "-ip=127.0.0.1", "-ip.bind=0.0.0.0", \
     "-filer", "-s3", "-s3.config=/etc/seaweedfs/s3.json", \
     "-master.volumeSizeLimitMB=64", "-volume.max=0", "-volume.minFreeSpace=1GiB"]
