import { LineCapStyle, PDFDocument, type PDFFont, type PDFPage, rgb, StandardFonts } from 'pdf-lib';
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

/** "#c67139" → the colour pdf-lib wants. */
const hex = (value: string) =>
  rgb(
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  );

// The Organic design system's light colours (packages/ui/src/theme.css).
const CANVAS = hex('#f5ead8');
const RAISED = hex('#f9f4ed');
const INK = hex('#201e1d');
const MUTED = hex('#645c50');
const BRAND = hex('#c67139');
const BRAND_200 = hex('#ffe1d0');
const BRAND_TEXT = hex('#8c491a');
const SAGE_200 = hex('#e1eecc');
const ON_BRAND = hex('#fffaf3');

/** Standard PDF fonts only know Latin letters; nicknames are Latin by policy. */
const latin = (text: string) => text.replace(/[^ -~ -ÿ]/g, '');

/** A rounded rectangle as SVG path data (pdf-lib draws it from its top-left corner). */
const roundedRect = (width: number, height: number, r: number) =>
  `M ${r} 0 H ${width - r} A ${r} ${r} 0 0 1 ${width} ${r} V ${height - r} ` +
  `A ${r} ${r} 0 0 1 ${width - r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height - r} ` +
  `V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;

/** The product mark: a terracotta circle with the code brackets. */
function drawMark(page: PDFPage, x: number, y: number, r: number) {
  page.drawCircle({ x, y, size: r, color: BRAND });
  const arm = r * 0.38;
  const gap = r * 0.42;
  const line = (from: [number, number], to: [number, number]) =>
    page.drawLine({
      start: { x: from[0], y: from[1] },
      end: { x: to[0], y: to[1] },
      thickness: r * 0.16,
      color: ON_BRAND,
      lineCap: LineCapStyle.Round,
    });
  line([x - gap + arm * 0.8, y + arm], [x - gap, y]);
  line([x - gap, y], [x - gap + arm * 0.8, y - arm]);
  line([x + gap - arm * 0.8, y + arm], [x + gap, y]);
  line([x + gap, y], [x + gap - arm * 0.8, y - arm]);
}

/**
 * The certificate as a one-page A4 PDF (landscape), in English: nickname, module,
 * date, and a code with a QR code for checking it online. Warm and round like the
 * apps: a cream page, soft circles, a terracotta mark, serif headings.
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
  const display = await pdf.embedFont(StandardFonts.TimesRomanBold);

  // The page, two soft circles, and the card on top.
  page.drawRectangle({ x: 0, y: 0, width, height, color: CANVAS });
  page.drawCircle({ x: width - 40, y: height - 20, size: 170, color: BRAND_200 });
  page.drawCircle({ x: 50, y: 40, size: 120, color: SAGE_200 });
  const card = { x: 48, y: 48, width: width - 96, height: height - 96 };
  page.drawSvgPath(roundedRect(card.width, card.height, 36), {
    x: card.x,
    y: card.y + card.height,
    color: RAISED,
  });

  const center = (text: string, y: number, size: number, font: PDFFont, color = INK) => {
    const clean = latin(text);
    const textWidth = font.widthOfTextAtSize(clean, size);
    page.drawText(clean, { x: (width - textWidth) / 2, y, size, font, color });
  };

  // The mark and the name, top left of the card.
  drawMark(page, 96, height - 96, 18);
  page.drawText('Kids Coding Platform', {
    x: 124,
    y: height - 102,
    size: 18,
    font: display,
    color: INK,
  });

  center('CERTIFICATE OF COMPLETION', height - 168, 13, bold, BRAND_TEXT);
  center('This certifies that', height - 206, 16, regular, MUTED);
  center(input.nickname, height - 262, 46, display);
  center('finished the module', height - 304, 16, regular, MUTED);
  center(input.moduleTitle, height - 346, 30, display);
  center(
    `${input.trackTitle} track · ${input.lessons} lessons and a project`,
    height - 380,
    14,
    regular,
    MUTED,
  );
  const date = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(
    input.issuedAt,
  );
  center(`Awarded on ${date}`, height - 412, 14, bold, INK);

  // Code and QR code for checking it online.
  const qr = QRCode.create(input.verifyUrl, { errorCorrectionLevel: 'M' });
  const cells = qr.modules.size;
  const qrSize = 92;
  const cell = qrSize / cells;
  const qrX = width - 84 - qrSize;
  const qrY = 76;
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
  page.drawText(`Certificate ${input.code}`, { x: 84, y: 112, size: 12, font: bold, color: INK });
  page.drawText('Check it is real:', { x: 84, y: 94, size: 11, font: regular, color: MUTED });
  page.drawText(latin(input.verifyUrl), {
    x: 84,
    y: 78,
    size: 11,
    font: regular,
    color: BRAND_TEXT,
  });
  return pdf.save();
}
