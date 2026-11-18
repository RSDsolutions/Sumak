import QRCode from 'qrcode';

export interface AcademyStudentCardData {
  userId: string;
  fullName: string;
  studentCode: string;
  academicRank: string;
  facultyLabel: string;
  status: 'ACTIVO' | 'INACTIVO' | 'PENDIENTE' | 'SUSPENDIDO';
  avatarInitials: string;
  avatarImage?: string;
  ciudad?: string;
  registeredAt?: string;
  activeCoursesCount: number;
  completedCoursesCount: number;
  diplomasCount: number;
  qrUrl: string;
}

export function getAcademyStudentCode(userId?: string | null, registeredAt?: string | null): string {
  const year = registeredAt
    ? new Date(registeredAt).getFullYear() || new Date().getFullYear()
    : new Date().getFullYear();
  const cleanHex = (userId || '000000').replace(/-/g, '').slice(0, 6).toUpperCase();
  return `ACAD-${year}-${cleanHex || '000000'}`;
}

export function getAcademyAcademicRank(
  activeCourses: number,
  completedCourses: number,
  diplomasCount: number
): string {
  if (diplomasCount > 0) return 'ESPECIALISTA CERTIFICADO';
  if (completedCourses > 0) return 'ESTUDIANTE AVANZADO';
  if (activeCourses > 0) return 'ESTUDIANTE REGULAR ACTIVO';
  return 'ESTUDIANTE CAMPUS VIRTUAL';
}

export function getStudentInitials(name?: string | null): string {
  if (!name) return 'SA';
  const parts = name.replace('@', '').split(' ').filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return 'SA';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Genera el código QR redondeado exclusivo de SUMAK Academy en alta resolución.
 */
export async function renderAcademyRoundedQR(
  canvas: HTMLCanvasElement,
  url: string,
  logoImgSrc: string = '/logo_qr.png',
  size: number = 1000,
  fillColor: string = '#0F2E18'
): Promise<void> {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const modCount = qr.modules.size;
  const border = 2;
  const cellSize = size / (modCount + border * 2);

  ctx.fillStyle = fillColor;

  const isEyeArea = (row: number, col: number) => {
    if (row < 7 && col < 7) return true;
    if (row < 7 && col >= modCount - 7) return true;
    if (row >= modCount - 7 && col < 7) return true;
    return false;
  };

  const modRadius = cellSize * 0.45;
  for (let row = 0; row < modCount; row++) {
    for (let col = 0; col < modCount; col++) {
      if (qr.modules.get(row, col) && !isEyeArea(row, col)) {
        const x = (col + border) * cellSize;
        const y = (row + border) * cellSize;
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(x, y, cellSize, cellSize, modRadius);
        } else {
          ctx.rect(x, y, cellSize, cellSize);
        }
        ctx.fill();
      }
    }
  }

  const eyes = [
    { row: 0, col: 0 },
    { row: 0, col: modCount - 7 },
    { row: modCount - 7, col: 0 },
  ];

  for (const eye of eyes) {
    const x0 = (eye.col + border) * cellSize;
    const y0 = (eye.row + border) * cellSize;
    const eyeSize = 7 * cellSize;

    ctx.fillStyle = fillColor;
    ctx.beginPath();
    const outRadius = cellSize * 2.2;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x0, y0, eyeSize, eyeSize, outRadius);
    } else {
      ctx.rect(x0, y0, eyeSize, eyeSize);
    }
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    const inRadius = cellSize * 1.5;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x0 + cellSize, y0 + cellSize, 5 * cellSize, 5 * cellSize, inRadius);
    } else {
      ctx.rect(x0 + cellSize, y0 + cellSize, 5 * cellSize, 5 * cellSize);
    }
    ctx.fill();

    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    const centerRadius = cellSize * 1.2;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x0 + 2 * cellSize, y0 + 2 * cellSize, 3 * cellSize, 3 * cellSize, centerRadius);
    } else {
      ctx.rect(x0 + 2 * cellSize, y0 + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }
    ctx.fill();
  }

  try {
    const logo = await loadImage(logoImgSrc);
    const logoRatio = 0.24;
    const targetW = size * logoRatio;
    const ratio = targetW / logo.width;
    const targetH = logo.height * ratio;

    const badgePadding = targetW * 0.09;
    const badgeW = targetW + badgePadding * 2;
    const badgeH = targetH + badgePadding * 2;
    const badgeX = (size - badgeW) / 2;
    const badgeY = (size - badgeH) / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 6;
    ctx.beginPath();
    const badgeRadius = Math.min(badgeW, badgeH) * 0.28;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeRadius);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.drawImage(logo, badgeX + badgePadding, badgeY + badgePadding, targetW, targetH);
  } catch (e) {
    console.warn('No se pudo cargar el logo para el QR académico:', e);
  }
}

/**
 * Renderiza el FRENTE del Carnet Estudiantil de SUMAK Academy en Canvas (1000x1500).
 */
export async function renderAcademyStudentCardFront(
  canvas: HTMLCanvasElement,
  data: AcademyStudentCardData,
  width: number = 1000,
  height: number = 1500
): Promise<void> {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const margin = 35;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  // Fondo marfil académico con borde dorado/esmeralda
  ctx.fillStyle = '#FAFDFB';
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 42);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Cabecera institucional Academia SUMAK (#0F2E18)
  const headerH = 260;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 42);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.clip();

  const grad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + headerH);
  grad.addColorStop(0, '#0B2412');
  grad.addColorStop(0.5, '#133A1C');
  grad.addColorStop(1, '#1A4E26');
  ctx.fillStyle = grad;
  ctx.fillRect(margin, margin, cardW, headerH);

  // Franja dorada académica
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(margin, margin + headerH, cardW, 10);
  ctx.restore();

  // Título superior de la Academia
  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CAMPUS VIRTUAL • FORMACIÓN CLÍNICA Y BOTÁNICA', width / 2, margin + 55);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 48px sans-serif';
  ctx.fillText('ACADEMIA SUMAK', width / 2, margin + 125);

  // Pastilla en cabecera
  const pillW = 480;
  const pillH = 48;
  const pillX = (width - pillW) / 2;
  const pillY = margin + 165;
  ctx.fillStyle = 'rgba(212, 175, 55, 0.18)';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(pillX, pillY, pillW, pillH, 24);
  } else {
    ctx.rect(pillX, pillY, pillW, pillH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#FBE697';
  ctx.font = 'bold 21px sans-serif';
  ctx.fillText('CREDENCIAL OFICIAL DE ESTUDIANTE', width / 2, pillY + 32);

  // Avatar circular del Estudiante
  const avatarSize = 300;
  const avatarY = margin + headerH + 55;
  const avatarX = (width - avatarSize) / 2;

  let avatarLoaded = false;
  if (data.avatarImage) {
    try {
      const avatarImg = await loadImage(data.avatarImage);
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
      avatarLoaded = true;
    } catch {
      avatarLoaded = false;
    }
  }

  if (!avatarLoaded) {
    ctx.fillStyle = '#0F2E18';
    ctx.beginPath();
    ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 115px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(data.avatarInitials || 'SA', width / 2, avatarY + avatarSize / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // Doble anillo dorado académico
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Nombre del Estudiante
  let displayName = (data.fullName || 'ESTUDIANTE SUMAK').toUpperCase();
  if (displayName.length > 34) displayName = displayName.slice(0, 32) + '...';

  const nameY = avatarY + avatarSize + 60;
  ctx.fillStyle = '#0F2E18';
  ctx.font = displayName.length > 24 ? 'bold 32px sans-serif' : 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(displayName, width / 2, nameY);

  ctx.fillStyle = '#4A7C59';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(data.facultyLabel || 'ESCUELA DE BIOMEDICINA ANCESTRAL Y SALUD RENAL', width / 2, nameY + 36);

  // Caja de Matrícula Estudiantil
  const codeBoxW = 500;
  const codeBoxH = 85;
  const codeBoxX = (width - codeBoxW) / 2;
  const codeBoxY = nameY + 65;

  ctx.fillStyle = '#EBF4ED';
  ctx.strokeStyle = '#1A4E26';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 22);
  } else {
    ctx.rect(codeBoxX, codeBoxY, codeBoxW, codeBoxH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#4A7C59';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('MATRÍCULA ACADÉMICA ESTUDIANTIL', width / 2, codeBoxY + 28);

  ctx.fillStyle = '#0F2E18';
  ctx.font = 'bold 34px monospace';
  ctx.fillText(data.studentCode, width / 2, codeBoxY + 66);

  // Grado / Nivel Académico
  const rankY = codeBoxY + codeBoxH + 50;
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CONDICIÓN ACADÉMICA', width / 2, rankY);

  ctx.fillStyle = '#B8860B';
  ctx.font = '900 28px sans-serif';
  ctx.fillText(data.academicRank, width / 2, rankY + 34);

  // Bloque de indicadores académicos (Cursos Activos / Completados / Diplomas)
  const statsY = rankY + 65;
  const statsW = 720;
  const statsH = 92;
  const statsX = (width - statsW) / 2;

  ctx.fillStyle = '#F4F7F5';
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(statsX, statsY, statsW, statsH, 20);
  } else {
    ctx.rect(statsX, statsY, statsW, statsH);
  }
  ctx.fill();
  ctx.stroke();

  const colW = statsW / 3;
  const statsItems = [
    { label: 'EN CURSO', value: String(data.activeCoursesCount) },
    { label: 'APROBADOS', value: String(data.completedCoursesCount) },
    { label: 'DIPLOMAS', value: String(data.diplomasCount) },
  ];

  statsItems.forEach((item, idx) => {
    const cx = statsX + colW * idx + colW / 2;
    ctx.fillStyle = '#1A4E26';
    ctx.font = '900 32px sans-serif';
    ctx.fillText(item.value, cx, statsY + 44);

    ctx.fillStyle = '#6B7280';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(item.label, cx, statsY + 72);

    if (idx < 2) {
      ctx.strokeStyle = '#C8D8CB';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(statsX + colW * (idx + 1), statsY + 18);
      ctx.lineTo(statsX + colW * (idx + 1), statsY + statsH - 18);
      ctx.stroke();
    }
  });

  // Badge Estado Estudiantil
  const badgeW = 320;
  const badgeH = 48;
  const badgeX = (width - badgeW) / 2;
  const badgeY = statsY + statsH + 35;

  ctx.fillStyle = '#EBF7EE';
  ctx.strokeStyle = '#1A4E26';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 24);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.arc(badgeX + 35, badgeY + badgeH / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0F2E18';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ESTUDIANTE ${data.status}`, width / 2 + 10, badgeY + badgeH / 2 + 7);

  // Pie
  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DOCUMENTO ACADÉMICO VERIFICABLE • SUMAK ACADEMY', width / 2, height - margin - 30);
}

/**
 * Renderiza el REVERSO del Carnet Estudiantil con el QR Académico (1000x1500).
 */
export async function renderAcademyStudentCardBack(
  canvas: HTMLCanvasElement,
  data: AcademyStudentCardData,
  qrCanvas: HTMLCanvasElement,
  width: number = 1000,
  height: number = 1500
): Promise<void> {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const margin = 35;
  const cardW = width - margin * 2;
  const cardH = height - margin * 2;

  ctx.fillStyle = '#FAFDFB';
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 42);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  const headerH = 190;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 42);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.clip();

  const grad = ctx.createLinearGradient(margin, margin, margin + cardW, margin + headerH);
  grad.addColorStop(0, '#0B2412');
  grad.addColorStop(1, '#1A4E26');
  ctx.fillStyle = grad;
  ctx.fillRect(margin, margin, cardW, headerH);

  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(margin, margin + headerH, cardW, 10);
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '900 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ACADEMIA SUMAK ECUADOR', width / 2, margin + 75);

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('VERIFICACIÓN DIGITAL DE MATRÍCULA ESTUDIANTIL', width / 2, margin + 125);

  // Contenedor del QR
  const qrDisplaySize = 680;
  const qrPadding = 28;
  const qrBoxSize = qrDisplaySize + qrPadding * 2;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = margin + headerH + 55;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32);
  } else {
    ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
  }
  ctx.fill();
  ctx.stroke();

  ctx.drawImage(qrCanvas, qrBoxX + qrPadding, qrBoxY + qrPadding, qrDisplaySize, qrDisplaySize);

  const instY = qrBoxY + qrBoxSize + 55;
  ctx.fillStyle = '#0F2E18';
  ctx.font = '900 28px sans-serif';
  ctx.fillText('¡VALIDACIÓN ACADÉMICA CON QR!', width / 2, instY);

  ctx.fillStyle = '#4B5563';
  ctx.font = '22px sans-serif';
  ctx.fillText('Escanea este código QR con la cámara de tu teléfono', width / 2, instY + 42);
  ctx.fillText('para verificar la matrícula estudiantil, cursos aprobados', width / 2, instY + 74);
  ctx.fillText('y certificaciones oficiales emitidas por SUMAK Academy.', width / 2, instY + 106);

  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(`Matrícula Estudiantil: ${data.studentCode}`, width / 2, instY + 155);

  ctx.fillStyle = '#0F2E18';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('Campus Virtual SUMAK Academy • Registro Académico Oficial', width / 2, height - margin - 35);
}

/**
 * Renderiza la vista DUAL (Frente y Reverso lado a lado) del Carnet Estudiantil.
 */
export function renderAcademyStudentCardDual(
  canvas: HTMLCanvasElement,
  frontCanvas: HTMLCanvasElement,
  backCanvas: HTMLCanvasElement
): void {
  const cw = frontCanvas.width;
  const ch = frontCanvas.height;
  const gap = 80;
  const margin = 70;

  canvas.width = cw * 2 + gap + margin * 2;
  canvas.height = ch + margin * 2 + 60;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#E8EFEA';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0F2E18';
  ctx.font = '900 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ANVERSO — CREDENCIAL ESTUDIANTIL', margin + cw / 2, margin - 15);
  ctx.fillText('REVERSO — VERIFICACIÓN QR ACADÉMICA', margin + cw + gap + cw / 2, margin - 15);

  ctx.drawImage(frontCanvas, margin, margin + 25);
  ctx.drawImage(backCanvas, margin + cw + gap, margin + 25);
}
