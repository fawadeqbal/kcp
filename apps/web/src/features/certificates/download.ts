import { api } from '@/lib/api';

/** Downloads a certificate's PDF (the API needs the signed-in account's token). */
export async function downloadCertificate(id: string, code: string): Promise<boolean> {
  try {
    const { data } = await api.GET('/v1/certificates/{id}/pdf', {
      params: { path: { id } },
      parseAs: 'blob',
    });
    if (!(data instanceof Blob)) return false;
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kcp-certificate-${code}.pdf`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return true;
  } catch {
    return false;
  }
}
