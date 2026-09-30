export class LivenessResponseDto {
  /** Always "ok" while the process is running. */
  status!: 'ok';
  /** Build version (git SHA or tag). */
  version!: string;
  /** Seconds since the process started. */
  uptimeSeconds!: number;
}
