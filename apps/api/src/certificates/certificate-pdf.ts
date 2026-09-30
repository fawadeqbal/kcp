import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';

export interface CertificatePdfInput {
  code: string;
  nickname: string;
  moduleTitle: string;
  trackTitle: string;
  lessons: number;
  issuedAt: Date;
  verifyUrl: string;
}

const INK = rgb(0.11, 0.11, 0.12);
const BRAND = rgb(0.31, 0.27, 0.9);
const MUTED = rgb(0.43, 0.43, 0.45);
const GOLD = rgb(0.96, 0.73, 0.2);

/** Standard PDF fonts only know Latin letters; nicknames are Latin by policy. */
const latin = (text: string) => text.replace(/[^ -~ -ÿ]/g, '');

/**
 * The certificate as a one-page A4 PDF (landscape), in English: nickname, module,
 * date, and a code with a QR code for checking it online.
 */
export async function certificatePdf(input: CertificatePdfInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Certificate ${input.code}`);
  pdf.setAuthor('Kids Coding Platform');
  pdf.setSubject(`${latin(input.moduleTitle)} — ${latin(input.nickname)}`);
  pdf.setCreationDate(input.issuedAt);
  const page = pdf.addPage([842, 595]);
  const { width, height } = page.getSize();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  // Frame.
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: BRAND,
    borderWidth: 4,
  });
  page.drawRectangle({
    x: 36,
    y: 36,
    width: width - 72,
    height: height - 72,
    borderColor: GOLD,
    borderWidth: 1.5,
  });

  const center = (text: string, y: number, size: number, font = regular, color = INK) => {
    const clean = latin(text);
    const textWidth = font.widthOfTextAtSize(clean, size);
    page.drawText(clean, { x: (width - textWidth) / 2, y, size, font, color });
  };

  center('Kids Coding Platform', height - 90, 18, bold, BRAND);
  center('CERTIFICATE OF COMPLETION', height - 140, 30, bold);
  center('This certifies that', height - 190, 16, regular, MUTED);
  center(input.nickname, height - 240, 40, bold, BRAND);
  center('finished the module', height - 285, 16, regular, MUTED);
  center(input.moduleTitle, height - 325, 26, bold);
  center(
    `${input.trackTitle} track · ${input.lessons} lessons and a project`,
    height - 360,
    14,
    regular,
    MUTED,
  );
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    input.issuedAt,
  );
  center(`Awarded on ${date}`, height - 395, 14);

  // Code and QR code for checking it online.
  const qr = QRCode.create(input.verifyUrl, { errorCorrectionLevel: 'M' });
  const cells = qr.modules.size;
  const qrSize = 92;
  const cell = qrSize / cells;
  const qrX = width - 60 - qrSize;
  const qrY = 60;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      if (qr.modules.get(row, col)) {
        page.drawRectangle({
          x: qrX + col * cell,
          y: qrY + (cells - 1 - row) * cell,
          width: cell,
          height: cell,
          color: INK,
        });
      }
    }
  }
  page.drawText(`Certificate ${input.code}`, { x: 60, y: 96, size: 12, font: bold, color: INK });
  page.drawText('Check it is real:', { x: 60, y: 78, size: 11, font: regular, color: MUTED });
  page.drawText(latin(input.verifyUrl), { x: 60, y: 62, size: 11, font: regular, color: BRAND });
  return pdf.save();
}
