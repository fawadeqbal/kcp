import { Matches } from 'class-validator';

export class IssueCertificateDto {
  @Matches(/^[a-z0-9-]{1,100}$/)
  moduleId!: string;
}

export class CertificateDto {
  id!: string;
  /** "KCP-7F3K-9Q2M" */
  code!: string;
  moduleId!: string;
  nickname!: string;
  /** In the requested language (English when missing). */
  moduleTitle!: string;
  trackTitle!: string;
  issuedAt!: Date;
  revoked!: boolean;
}

export class ModuleCertificateDto {
  moduleId!: string;
  moduleTitle!: string;
  /** Every lesson done and the module's project shipped. */
  finished!: boolean;
  /**
   * Finished, but a mentor hasn't approved the module project yet (premium students
   * get their certificate once the review is approved).
   */
  awaitingReview!: boolean;
  certificate!: CertificateDto | null;
}

export class CertificateListDto {
  /** Whether the student has premium now (needed for a new certificate). */
  premium!: boolean;
  modules!: ModuleCertificateDto[];
}

export class ChildCertificatesDto {
  certificates!: CertificateDto[];
}

export class VerifiedCertificateDto {
  code!: string;
  nickname!: string;
  /** Titles by language code. */
  moduleTitles!: Record<string, string>;
  trackTitles!: Record<string, string>;
  issuedAt!: Date;
  /** False once staff revoked it. */
  valid!: boolean;
}

export class CertificateCodeParam {
  @Matches(/^KCP-[0-9A-Z]{4}-[0-9A-Z]{4}$/)
  code!: string;
}
