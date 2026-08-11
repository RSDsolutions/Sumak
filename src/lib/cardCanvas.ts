import QRCode from 'qrcode';
import type { Profile } from './types';

export interface CardRequirements {
  hasPhoto: boolean;
  hasNombre: boolean;
  hasCodigo: boolean;
  hasTelefono: boolean;
  allValid: boolean;
  missing: string[];
}

export function checkCardRequirements(profile: Profile | null): CardRequirements {
  const hasPhoto = !!(profile?.avatar_url && profile.avatar_url.trim().length > 0);
  const hasNombre = !!(profile?.nombre_completo && profile.nombre_completo.trim().length > 0);
  const hasCodigo = !!(profile?.codigo_distribuidor && profile.codigo_distribuidor.trim().length > 0);
  const hasTelefono = !!(profile?.telefono && profile.telefono.trim().length > 0);

  const missing: string[] = [];
  if (!hasPhoto) missing.push('Foto de perfil');
  if (!hasNombre) missing.push('Nombre completo');
  if (!hasCodigo) missing.push('Código de distribuidor');
  if (!hasTelefono) missing.push('Número de celular');

  return {
    hasPhoto,
    hasNombre,
    hasCodigo,
    hasTelefono,
    allValid: missing.length === 0,
    missing,
  };
}

/**
 * Carga una imagen de forma asíncrona para usar en Canvas con crossOrigin.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Genera un código QR con esquinas redondeadas y logo corporativo central en un Canvas.
 */
export async function renderRoundedQR(
  canvas: HTMLCanvasElement,
  url: string,
  logoImgSrc: string = '/logo_qr.png',
  size: number = 1000,
  fillColor: string = '#1A4E26'
): Promise<void> {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Limpiar fondo blanco
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);

  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const modCount = qr.modules.size;
  const border = 2;
  const cellSize = size / (modCount + border * 2);

  ctx.fillStyle = fillColor;

  // 1. Dibujar módulos con esquinas redondeadas (omitiendo las 3 esquinas de ojos 7x7)
  const isEyeArea = (row: number, col: number) => {
    if (row < 7 && col < 7) return true; // Top-Left
    if (row < 7 && col >= modCount - 7) return true; // Top-Right
    if (row >= modCount - 7 && col < 7) return true; // Bottom-Left
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

  // 2. Dibujar las 3 esquinas redondeadas (ojos de posición)
  const eyes = [
    { row: 0, col: 0 },
    { row: 0, col: modCount - 7 },
    { row: modCount - 7, col: 0 },
  ];

  for (const eye of eyes) {
    const x0 = (eye.col + border) * cellSize;
    const y0 = (eye.row + border) * cellSize;
    const eyeSize = 7 * cellSize;

    // Marco exterior redondeado (7x7)
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    const outRadius = cellSize * 2.2;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x0, y0, eyeSize, eyeSize, outRadius);
    } else {
      ctx.rect(x0, y0, eyeSize, eyeSize);
    }
    ctx.fill();

    // Hueco blanco interior (5x5)
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    const inRadius = cellSize * 1.5;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x0 + cellSize, y0 + cellSize, 5 * cellSize, 5 * cellSize, inRadius);
    } else {
      ctx.rect(x0 + cellSize, y0 + cellSize, 5 * cellSize, 5 * cellSize);
    }
    ctx.fill();

    // Punto central redondeado (3x3)
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    const centerRadius = cellSize * 1.2;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(x0 + 2 * cellSize, y0 + 2 * cellSize, 3 * cellSize, 3 * cellSize, centerRadius);
    } else {
      ctx.rect(x0 + 2 * cellSize, y0 + 2 * cellSize, 3 * cellSize, 3 * cellSize);
    }
    ctx.fill();
  }

  // 3. Incrustar el logo en el centro
  try {
    const logo = await loadImage(logoImgSrc);
    const logoRatio = 0.25;
    const targetW = size * logoRatio;
    const ratio = targetW / logo.width;
    const targetH = logo.height * ratio;

    const badgePadding = targetW * 0.08;
    const badgeW = targetW + badgePadding * 2;
    const badgeH = targetH + badgePadding * 2;
    const badgeX = (size - badgeW) / 2;
    const badgeY = (size - badgeH) / 2;

    // Placa blanca protectora con borde
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#C8D8CB';
    ctx.lineWidth = 4;
    ctx.beginPath();
    const badgeRadius = Math.min(badgeW, badgeH) * 0.28;
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, badgeRadius);
    } else {
      ctx.rect(badgeX, badgeY, badgeW, badgeH);
    }
    ctx.fill();
    ctx.stroke();

    // Dibujar logo
    ctx.drawImage(logo, badgeX + badgePadding, badgeY + badgePadding, targetW, targetH);
  } catch (e) {
    console.warn('No se pudo cargar el logo para el QR:', e);
  }
}

/**
 * Genera el FRENTE de la tarjeta de identificación en un Canvas.
 */
export async function renderCardFront(
  canvas: HTMLCanvasElement,
  profile: Profile | null,
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

  // Fondo blanco con borde
  ctx.fillStyle = '#FAFCFA';
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 40);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Cabecera verde corporativa
  const headerH = 240;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 40);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.clip();

  ctx.fillStyle = '#1A4E26';
  ctx.fillRect(margin, margin, cardW, headerH);

  // Línea dorada
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(margin, margin + headerH, cardW, 8);
  ctx.restore();

  // Logo de cabecera
  try {
    const logo = await loadImage('/LOGO_SUMAK.png');
    const targetH = 120;
    const ratio = targetH / logo.height;
    const targetW = logo.width * ratio;
    const logoX = (width - targetW) / 2;
    const logoY = margin + 35;
    ctx.drawImage(logo, logoX, logoY, targetW, targetH);
  } catch {
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SUMAK VIDA', width / 2, margin + 90);
  }

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('CREDENCIAL OFICIAL DE DISTRIBUIDOR', width / 2, margin + 195);

  // Foto de perfil o avatar
  const avatarSize = 320;
  const avatarY = margin + headerH + 50;
  const avatarX = (width - avatarSize) / 2;

  let avatarLoaded = false;
  if (profile?.avatar_url) {
    try {
      const avatarImg = await loadImage(profile.avatar_url);
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
    // Dibujar avatar con iniciales
    ctx.fillStyle = '#1A4E26';
    ctx.beginPath();
    ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
    ctx.fill();

    const name = profile?.nombre_completo || profile?.username || 'Distribuidor';
    const words = name.replace('@', '').split(' ').filter(Boolean);
    const initials = words.length >= 2 ? `${words[0][0]}${words[1][0]}`.toUpperCase() : name.slice(0, 2).toUpperCase();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 120px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, width / 2, avatarY + avatarSize / 2);
    ctx.textBaseline = 'alphabetic';
  }

  // Anillo dorado exterior del avatar
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(width / 2, avatarY + avatarSize / 2, avatarSize / 2 - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Nombre completo
  let displayName = (profile?.nombre_completo || `@${profile?.username}` || 'DISTRIBUIDOR INDEPENDIENTE').toUpperCase();
  if (displayName.length > 34) displayName = displayName.slice(0, 32) + '...';
  
  const nameY = avatarY + avatarSize + 55;
  ctx.fillStyle = '#111111';
  ctx.font = displayName.length > 24 ? 'bold 32px sans-serif' : 'bold 38px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(displayName, width / 2, nameY);

  // Pastilla con Código Oficial
  const codeBoxW = 420;
  const codeBoxH = 70;
  const codeBoxX = (width - codeBoxW) / 2;
  const codeBoxY = nameY + 30;

  ctx.fillStyle = '#EBF4ED';
  ctx.strokeStyle = 'rgba(26, 78, 38, 0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 20);
  } else {
    ctx.rect(codeBoxX, codeBoxY, codeBoxW, codeBoxH);
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#6B7280';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('CÓDIGO OFICIAL', width / 2, codeBoxY + 24);

  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 30px monospace';
  ctx.fillText(profile?.codigo_distribuidor || 'SUMAK-00000', width / 2, codeBoxY + 54);

  // Rango / Categoría
  let rangoStr = profile?.paquete ? `PAQUETE ${profile.paquete.toUpperCase()}` : 'DISTRIBUIDOR INDEPENDIENTE';
  if (profile?.rol === 'admin') rangoStr = 'ADMINISTRADOR GENERAL';
  else if (profile?.rol === 'operaciones') rangoStr = 'EQUIPO DE OPERACIONES';

  const rangoY = codeBoxY + codeBoxH + 45;
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('RANGO / CATEGORÍA', width / 2, rangoY);

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(rangoStr, width / 2, rangoY + 32);

  // Badge Estado Activo
  const badgeW = 250;
  const badgeH = 50;
  const badgeX = (width - badgeW) / 2;
  const badgeY = rangoY + 70;

  ctx.fillStyle = '#EBF7EE';
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 25);
  } else {
    ctx.rect(badgeX, badgeY, badgeW, badgeH);
  }
  ctx.fill();
  ctx.stroke();

  // Punto verde
  ctx.fillStyle = '#22C55E';
  ctx.beginPath();
  ctx.arc(badgeX + 35, badgeY + badgeH / 2, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`ESTADO: ${(profile?.estado || 'ACTIVO').toUpperCase()}`, badgeX + 55, badgeY + badgeH / 2 + 7);

  // Pie
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VÁLIDO EN TODO EL TERRITORIO NACIONAL', width / 2, height - margin - 35);
}

/**
 * Genera el REVERSO de la tarjeta con el código QR redondeado y SIN link de texto visible.
 */
export async function renderCardBack(
  canvas: HTMLCanvasElement,
  profile: Profile | null,
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

  // Fondo
  ctx.fillStyle = '#FAFCFA';
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 40);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.fill();
  ctx.stroke();

  // Cabecera verde
  const headerH = 180;
  ctx.save();
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(margin, margin, cardW, cardH, 40);
  } else {
    ctx.rect(margin, margin, cardW, cardH);
  }
  ctx.clip();

  ctx.fillStyle = '#1A4E26';
  ctx.fillRect(margin, margin, cardW, headerH);

  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(margin, margin + headerH, cardW, 8);
  ctx.restore();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUMAK VIDA ECUADOR', width / 2, margin + 65);

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('CÓDIGO DIGITAL DE AFILIACIÓN', width / 2, margin + 115);

  // Marco contenedor del QR
  const qrDisplaySize = 700;
  const qrPadding = 25;
  const qrBoxSize = qrDisplaySize + qrPadding * 2;
  const qrBoxX = (width - qrBoxSize) / 2;
  const qrBoxY = margin + headerH + 50;

  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#C8D8CB';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 30);
  } else {
    ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
  }
  ctx.fill();
  ctx.stroke();

  // Pegar imagen del QR
  ctx.drawImage(qrCanvas, qrBoxX + qrPadding, qrBoxY + qrPadding, qrDisplaySize, qrDisplaySize);

  // Instrucciones (SIN link de texto visible)
  const instY = qrBoxY + qrBoxSize + 45;
  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('¡ESCANEA Y CONÉCTATE!', width / 2, instY);

  ctx.fillStyle = '#4B5563';
  ctx.font = '21px sans-serif';
  ctx.fillText('Apunta la cámara de tu teléfono a este código QR', width / 2, instY + 40);
  ctx.fillText('para afiliarte directamente como nuevo distribuidor', width / 2, instY + 70);
  ctx.fillText('o comprar tus productos con descuento exclusivo.', width / 2, instY + 100);

  // Código distribuidor sutil
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 20px monospace';
  ctx.fillText(`Distribuidor ID: ${profile?.codigo_distribuidor || 'SUMAK-00000'}`, width / 2, instY + 145);

  // Pie
  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('www.sumakecuador.com • Soporte Oficial', width / 2, height - margin - 35);
}

/**
 * Genera la vista dual (Frente y Reverso lado a lado).
 */
export function renderCardDual(
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

  // Fondo neutro elegante
  ctx.fillStyle = '#EBEFEA';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Etiquetas
  ctx.fillStyle = '#1A4E26';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FRENTE', margin + cw / 2, margin - 15);
  ctx.fillText('REVERSO', margin + cw + gap + cw / 2, margin - 15);

  // Dibujar Frente y Reverso
  ctx.drawImage(frontCanvas, margin, margin + 25);
  ctx.drawImage(backCanvas, margin + cw + gap, margin + 25);
}
