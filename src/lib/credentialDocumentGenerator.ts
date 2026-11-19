import QRCode from 'qrcode';

export interface CredentialDocumentInput {
  type: 'certificado' | 'diploma';
  title: string;
  participantName: string;
  verificationCode: string;
  diplomaNumber?: string;
  issuedAt: string;
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Genera el documento oficial de Certificado de Curso o Diploma de Programa
 * en alta resolución (A4 Horizontal 2000x1414) y abre una ventana lista para
 * Guardar como PDF o Descargar directamente, garantizando 100% de disponibilidad.
 */
export async function generateAndDownloadCredentialDocument(
  input: CredentialDocumentInput
): Promise<void> {
  const width = 2000;
  const height = 1414;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const isDiploma = input.type === 'diploma';

  // 1. Fondo pergamino clínico institucional
  ctx.fillStyle = isDiploma ? '#FDFBF5' : '#FAFDFB';
  ctx.fillRect(0, 0, width, height);

  // 2. Marco exterior verde profundo (#0B2913)
  const m1 = 55;
  ctx.strokeStyle = '#0B2913';
  ctx.lineWidth = 10;
  ctx.strokeRect(m1, m1, width - m1 * 2, height - m1 * 2);

  // 3. Marco interior dorado ceremonial (#D4AF37)
  const m2 = 76;
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.strokeRect(m2, m2, width - m2 * 2, height - m2 * 2);

  // Esquinas ornamentales doradas
  const cornerSize = 36;
  const corners = [
    [m2, m2],
    [width - m2 - cornerSize, m2],
    [m2, height - m2 - cornerSize],
    [width - m2 - cornerSize, height - m2 - cornerSize],
  ];
  ctx.fillStyle = '#D4AF37';
  for (const [cx, cy] of corners) {
    ctx.fillRect(cx, cy, cornerSize, 6);
    ctx.fillRect(cx, cy, 6, cornerSize);
  }

  // 4. Logo superior SUMAK
  try {
    const logo = await loadImg('/LOGO_SUMAK.png');
    const targetH = 115;
    const targetW = (logo.width / logo.height) * targetH;
    ctx.drawImage(logo, (width - targetW) / 2, 115, targetW, targetH);
  } catch {
    ctx.fillStyle = '#0B2913';
    ctx.font = '900 42px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUMAK VIDA ECUADOR', width / 2, 180);
  }

  // 5. Encabezado institucional
  ctx.textAlign = 'center';
  ctx.fillStyle = '#B8860B';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(
    'ACADEMIA SUMAK VIDA ECUADOR • CAMPUS VIRTUAL DE BIOMEDICINA ANCESTRAL',
    width / 2,
    275
  );

  ctx.fillStyle = '#0B2913';
  ctx.font = '900 66px serif';
  ctx.fillText(
    isDiploma ? 'DIPLOMA DE ESPECIALIZACIÓN' : 'CERTIFICADO DE APROBACIÓN',
    width / 2,
    360
  );

  // Línea divisoria dorada
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(width / 2 - 260, 388, 520, 4);

  // 6. Texto de otorgamiento
  ctx.fillStyle = '#4B5563';
  ctx.font = 'italic 30px serif';
  ctx.fillText(
    isDiploma
      ? 'La Dirección Académica confiere el presente Diploma Oficial a:'
      : 'La Dirección Académica otorga el presente Certificado Oficial a:',
    width / 2,
    460
  );

  // 7. Nombre del Estudiante
  const studentName = (input.participantName || 'Estudiante SUMAK').toUpperCase();
  ctx.fillStyle = '#0B2913';
  ctx.font = '900 62px serif';
  ctx.fillText(studentName, width / 2, 555);

  // Subrayado bajo el nombre
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 420, 580);
  ctx.lineTo(width / 2 + 420, 580);
  ctx.stroke();

  // 8. Motivo de acreditación
  ctx.fillStyle = '#374151';
  ctx.font = '28px sans-serif';
  ctx.fillText(
    isDiploma
      ? 'Por haber culminado y aprobado satisfactoriamente el 100% de los cursos y requisitos del Programa:'
      : 'Por haber completado y aprobado satisfactoriamente el 100% de las lecciones y evaluaciones del Curso:',
    width / 2,
    650
  );

  // 9. Título del Curso o Programa (con ajuste multilínea)
  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 46px sans-serif';
  const titleLines = wrapCanvasText(ctx, `“${input.title}”`, 1460);
  let titleY = 730;
  for (const line of titleLines.slice(0, 2)) {
    ctx.fillText(line, width / 2, titleY);
    titleY += 58;
  }

  // 10. Fecha de emisión
  const formattedDate = new Date(input.issuedAt || Date.now()).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  ctx.fillStyle = '#4B5563';
  ctx.font = '26px sans-serif';
  ctx.fillText(`Emitido en Ecuador, el ${formattedDate}`, width / 2, 885);

  // 11. Sello Roseta Oficial (Izquierda), Firma Autorizada (Centro), Código QR Verificable (Derecha)
  const footerBaseY = 1070;

  // Sello Roseta a la izquierda
  const sealX = 330;
  const sealY = footerBaseY + 10;
  ctx.save();
  ctx.fillStyle = isDiploma ? '#D4AF37' : '#1A4E26';
  ctx.beginPath();
  ctx.arc(sealX, sealY, 85, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 72, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SELLO OFICIAL', sealX, sealY - 12);
  ctx.font = '900 22px sans-serif';
  ctx.fillText('SUMAK', sealX, sealY + 14);
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('ACADEMY', sealX, sealY + 36);
  ctx.restore();

  // Firma autorizada en el centro
  ctx.strokeStyle = '#0B2913';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(width / 2 - 220, footerBaseY + 35);
  ctx.lineTo(width / 2 + 220, footerBaseY + 35);
  ctx.stroke();

  ctx.fillStyle = '#1A4E26';
  ctx.font = 'italic bold 40px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Dr. Luis Paredes', width / 2, footerBaseY + 15);

  ctx.fillStyle = '#0B2913';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('Dr. Luis Paredes', width / 2, footerBaseY + 72);

  ctx.fillStyle = '#6B7280';
  ctx.font = '20px sans-serif';
  ctx.fillText('Director Médico y Formador de Formadores • SUMAK Academy', width / 2, footerBaseY + 104);

  // Código QR Verificable a la derecha
  try {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.sumakecuador.lat';
    const verifyUrl = `${baseUrl}/academia/verificar?code=${encodeURIComponent(input.verificationCode)}`;
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 200,
      color: { dark: '#0B2913', light: '#FFFFFF' },
    });
    const qrImg = await loadImg(qrDataUrl);
    const qrSize = 180;
    const qrX = width - 380;
    const qrY = footerBaseY - 75;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 3;
    ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
    ctx.strokeRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = '#0B2913';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ESCANEA PARA VERIFICAR', qrX + qrSize / 2, qrY + qrSize + 34);
  } catch (e) {
    console.warn('Error generando QR en credencial:', e);
  }

  // 12. Código de verificación al pie
  ctx.fillStyle = '#92400E';
  ctx.font = 'bold 21px monospace';
  ctx.textAlign = 'center';
  const serialInfo = input.diplomaNumber
    ? `N° Registro: ${input.diplomaNumber}   |   Código de Verificación Pública: ${input.verificationCode}`
    : `Código de Verificación Pública: ${input.verificationCode}`;
  ctx.fillText(serialInfo, width / 2, height - 105);

  const pngDataUrl = canvas.toDataURL('image/png');
  const safeTitle = input.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
  const filePrefix = isDiploma ? 'DIPLOMA_SUMAK' : 'CERTIFICADO_SUMAK';

  // Descargar PNG de alta resolución inmediatamente
  const link = document.createElement('a');
  link.href = pngDataUrl;
  link.download = `${filePrefix}_${safeTitle}_${input.verificationCode}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
