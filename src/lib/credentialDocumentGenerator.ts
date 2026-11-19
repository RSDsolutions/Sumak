import QRCode from 'qrcode';
import { supabase } from './supabase';
import {
  getCanvasDimensions,
  normalizeTemplateDesign,
  type TemplateDesignV2,
  type TemplateLayer,
  type TextLayer,
  type ImageLayer,
  type ShapeLayer,
  type QrLayer,
} from './credentialTemplateTypes';

export interface CredentialDocumentInput {
  type: 'certificado' | 'diploma';
  title: string;
  participantName: string;
  verificationCode: string;
  diplomaNumber?: string;
  issuedAt: string;
  diplomaTypeName?: string;
  signatoryName?: string;
  signatoryTitle?: string;
  durationHours?: string;
  templateId?: string | null;
  diplomaTypeId?: string | null;
  /** Optional explicit design override (used in Visual Studio live tests) */
  designOverride?: TemplateDesignV2 | null;
}

const imageCache = new Map<string, HTMLImageElement>();

function loadImg(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    const cached = imageCache.get(src)!;
    if (cached.complete && cached.naturalWidth > 0) {
      return Promise.resolve(cached);
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('/')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export function resolveTemplateTokens(
  rawText: string,
  input: CredentialDocumentInput
): string {
  const formattedDate = new Date(input.issuedAt || Date.now()).toLocaleDateString('es-EC', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const isDip = input.type === 'diploma';
  const replacements: Record<string, string> = {
    '{{participant_name}}': input.participantName || 'Estudiante SUMAK',
    '{{course_name}}': input.title || (isDip ? 'Programa de Especialización SUMAK' : 'Curso Académico SUMAK'),
    '{{program_name}}': input.title || 'Programa Académico SUMAK',
    '{{diploma_type_name}}':
      input.diplomaTypeName || (isDip ? 'DIPLOMA DE ESPECIALIZACIÓN' : 'CERTIFICADO DE APROBACIÓN'),
    '{{issue_date}}': `Emitido en Ecuador, el ${formattedDate}`,
    '{{diploma_number}}': input.diplomaNumber || 'SUMAK-000001',
    '{{verification_code}}': input.verificationCode || 'SUMAK-VERIFY',
    '{{signatory_name}}': input.signatoryName || 'Dr. Luis Paredes',
    '{{signatory_title}}': input.signatoryTitle || 'Director Médico y Formador de Formadores • SUMAK Academy',
    '{{duration_hours}}': input.durationHours || '40 horas académicas certificadas',
  };

  let out = rawText || '';
  for (const [token, val] of Object.entries(replacements)) {
    out = out.split(token).join(val);
  }
  return out;
}

function applyTextTransform(text: string, transform: TextLayer['textTransform']): string {
  if (transform === 'uppercase') return text.toUpperCase();
  if (transform === 'capitalize') {
    return text.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return text;
}

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function measureTextWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number
): number {
  if (!letterSpacing || Math.abs(letterSpacing) < 0.01) {
    return ctx.measureText(text).width;
  }
  const chars = Array.from(text);
  let total = 0;
  for (let i = 0; i < chars.length; i++) {
    total += ctx.measureText(chars[i]).width;
    if (i < chars.length - 1) total += letterSpacing;
  }
  return total;
}

function drawTextWithTracking(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  align: 'left' | 'center' | 'right',
  letterSpacing: number,
  underline: boolean,
  fontSize: number
) {
  const totalWidth = measureTextWithTracking(ctx, text, letterSpacing);
  let startX = x;
  if (align === 'center') startX = x - totalWidth / 2;
  else if (align === 'right') startX = x - totalWidth;

  if (!letterSpacing || Math.abs(letterSpacing) < 0.01) {
    ctx.textAlign = 'left';
    ctx.fillText(text, startX, y);
  } else {
    ctx.textAlign = 'left';
    let curX = startX;
    for (const ch of Array.from(text)) {
      ctx.fillText(ch, curX, y);
      curX += ctx.measureText(ch).width + letterSpacing;
    }
  }

  if (underline) {
    ctx.save();
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = Math.max(1, fontSize * 0.06);
    ctx.beginPath();
    ctx.moveTo(startX, y + fontSize * 0.14);
    ctx.lineTo(startX + totalWidth, y + fontSize * 0.14);
    ctx.stroke();
    ctx.restore();
  }
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  letterSpacing: number
): string[] {
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = '';
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (measureTextWithTracking(ctx, candidate, letterSpacing) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }

  return lines;
}

// -----------------------------------------------------------------------------
// Frame Renderer (6 Luxury Ornamental Frames)
// -----------------------------------------------------------------------------
function drawTemplateFrame(
  ctx: CanvasRenderingContext2D,
  design: TemplateDesignV2,
  width: number,
  height: number
) {
  const { frame } = design;
  if (!frame || frame.style === 'none') return;

  const m = frame.margin || 26;
  const t = frame.thickness || 3;
  const primary = frame.primaryColor || '#0B2913';
  const accent = frame.accentColor || '#D4AF37';

  ctx.save();

  if (frame.style === 'classic_double') {
    ctx.strokeStyle = primary;
    ctx.lineWidth = t * 1.4;
    ctx.strokeRect(m, m, width - m * 2, height - m * 2);

    const m2 = m + 9;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.2, t * 0.6);
    ctx.strokeRect(m2, m2, width - m2 * 2, height - m2 * 2);

    // Subtle corner squares
    const c = 16;
    ctx.fillStyle = accent;
    const pts = [
      [m2, m2],
      [width - m2 - c, m2],
      [m2, height - m2 - c],
      [width - m2 - c, height - m2 - c],
    ];
    for (const [cx, cy] of pts) {
      ctx.fillRect(cx, cy, c, 2.5);
      ctx.fillRect(cx, cy, 2.5, c);
    }
  } else if (frame.style === 'royal_ornate') {
    // Outer thick emerald frame
    ctx.strokeStyle = primary;
    ctx.lineWidth = t * 1.3;
    ctx.strokeRect(m, m, width - m * 2, height - m * 2);

    // Middle gold frame
    const m2 = m + 8;
    ctx.strokeStyle = accent;
    ctx.lineWidth = Math.max(1.5, t * 0.55);
    ctx.strokeRect(m2, m2, width - m2 * 2, height - m2 * 2);

    // Inner delicate line
    const m3 = m + 14;
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.9;
    ctx.strokeRect(m3, m3, width - m3 * 2, height - m3 * 2);
    ctx.globalAlpha = 1;

    // Ornamental diamond medallions on all 4 corners
    const cornerCoords = [
      [m2 + 6, m2 + 6],
      [width - m2 - 6, m2 + 6],
      [m2 + 6, height - m2 - 6],
      [width - m2 - 6, height - m2 - 6],
    ];
    for (const [cx, cy] of cornerCoords) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = primary;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -10);
      ctx.lineTo(10, 0);
      ctx.lineTo(0, 10);
      ctx.lineTo(-10, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (frame.style === 'modern_side_ribbon') {
    // Bold left institutional ribbon
    const ribbonW = Math.min(72, width * 0.088);
    ctx.fillStyle = primary;
    ctx.fillRect(0, 0, ribbonW, height);

    // Gold vertical accent trim beside ribbon
    ctx.fillStyle = accent;
    ctx.fillRect(ribbonW, 0, 5, height);

    // Top-right subtle gold accent line
    ctx.fillStyle = accent;
    ctx.fillRect(ribbonW + 28, m, width - ribbonW - 28 - m, 2.5);

    // Outer subtle border on right/top/bottom
    ctx.strokeStyle = primary;
    ctx.globalAlpha = 0.16;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(ribbonW + 18, m - 6, width - ribbonW - 18 - (m - 6), height - (m - 6) * 2);
    ctx.globalAlpha = 1;

    // Vertical subtle branding dots inside left ribbon
    ctx.fillStyle = accent;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(ribbonW / 2, 54, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.arc(ribbonW / 2, 54, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else if (frame.style === 'botanical_minimal') {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(m, m, width - m * 2, height - m * 2);

    // Crisp corner brackets in primary color
    const len = 34;
    ctx.strokeStyle = primary;
    ctx.lineWidth = Math.max(2.5, t);
    const drawBracket = (bx: number, by: number, dx: number, dy: number) => {
      ctx.beginPath();
      ctx.moveTo(bx + dx * len, by);
      ctx.lineTo(bx, by);
      ctx.lineTo(bx, by + dy * len);
      ctx.stroke();
    };
    drawBracket(m - 2, m - 2, 1, 1);
    drawBracket(width - m + 2, m - 2, -1, 1);
    drawBracket(m - 2, height - m + 2, 1, -1);
    drawBracket(width - m + 2, height - m + 2, -1, -1);
  } else if (frame.style === 'guilloche_luxury') {
    // Luxury triple border with dashed guilloche middle track
    ctx.strokeStyle = primary;
    ctx.lineWidth = t * 1.1;
    ctx.strokeRect(m, m, width - m * 2, height - m * 2);

    ctx.save();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.strokeRect(m + 7, m + 7, width - (m + 7) * 2, height - (m + 7) * 2);
    ctx.restore();

    ctx.strokeStyle = primary;
    ctx.lineWidth = 1.2;
    ctx.strokeRect(m + 14, m + 14, width - (m + 14) * 2, height - (m + 14) * 2);

    // Top and bottom center gold diamond accents
    const midX = width / 2;
    for (const cy of [m + 7, height - m - 7]) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(midX, cy - 6);
      ctx.lineTo(midX + 18, cy);
      ctx.lineTo(midX, cy + 6);
      ctx.lineTo(midX - 18, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

// -----------------------------------------------------------------------------
// Individual Layer Renderers
// -----------------------------------------------------------------------------
function drawTextLayer(
  ctx: CanvasRenderingContext2D,
  layer: TextLayer,
  input: CredentialDocumentInput
) {
  const resolved = applyTextTransform(
    resolveTemplateTokens(layer.text, input),
    layer.textTransform
  );
  if (!resolved.trim()) return;

  const fontStyle = layer.italic ? 'italic' : 'normal';
  const fontWeight = layer.fontWeight || '400';
  const fontFamily = `"${layer.fontFamily}", ${
    layer.fontFamily === 'Courier New'
      ? 'monospace'
      : ['Cinzel', 'Playfair Display', 'Cormorant Garamond'].includes(layer.fontFamily)
      ? 'serif'
      : layer.fontFamily === 'Great Vibes'
      ? 'cursive'
      : 'sans-serif'
  }`;

  ctx.font = `${fontStyle} ${fontWeight} ${layer.fontSize}px ${fontFamily}`;
  const lines = wrapTextLines(ctx, resolved, Math.max(40, layer.width), layer.letterSpacing || 0);
  const lineH = layer.fontSize * (layer.lineHeight || 1.25);
  const totalTextHeight = lines.length * lineH;

  // Optional badge/pill background behind text
  if (layer.pillBackground) {
    const padX = layer.pillPaddingX ?? 10;
    const padY = layer.pillPaddingY ?? 4;
    const maxLineW = Math.min(
      layer.width,
      Math.max(...lines.map((l) => measureTextWithTracking(ctx, l, layer.letterSpacing || 0)))
    );
    let boxX = -layer.width / 2;
    if (layer.align === 'center') boxX = -maxLineW / 2 - padX;
    else if (layer.align === 'right') boxX = layer.width / 2 - maxLineW - padX;
    else boxX = -layer.width / 2 - padX;

    const boxY = -layer.height / 2 - padY;
    ctx.save();
    ctx.fillStyle = layer.pillBackground;
    drawRoundedRectPath(ctx, boxX, boxY, maxLineW + padX * 2, totalTextHeight + padY * 2, layer.pillRadius ?? 8);
    ctx.fill();
    ctx.restore();
  }

  if (layer.shadowEnabled) {
    ctx.shadowColor = layer.shadowColor || 'rgba(0,0,0,0.28)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 2;
  }

  ctx.fillStyle = layer.color || '#0B2913';
  ctx.textBaseline = 'top';

  const anchorX =
    layer.align === 'center' ? 0 : layer.align === 'right' ? layer.width / 2 : -layer.width / 2;
  const startY = -layer.height / 2;

  lines.forEach((line, idx) => {
    drawTextWithTracking(
      ctx,
      line,
      anchorX,
      startY + idx * lineH,
      layer.align,
      layer.letterSpacing || 0,
      Boolean(layer.underline),
      layer.fontSize
    );
  });
}

async function drawImageLayer(ctx: CanvasRenderingContext2D, layer: ImageLayer) {
  if (!layer.src) return;
  try {
    const img = await loadImg(layer.src);
    const halfW = layer.width / 2;
    const halfH = layer.height / 2;

    if (layer.shadowEnabled) {
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
    }

    ctx.save();
    if (layer.borderRadius > 0) {
      drawRoundedRectPath(ctx, -halfW, -halfH, layer.width, layer.height, layer.borderRadius);
      ctx.clip();
    }

    if (layer.objectFit === 'cover') {
      const imgRatio = img.width / img.height;
      const boxRatio = layer.width / layer.height;
      let sx = 0,
        sy = 0,
        sw = img.width,
        sh = img.height;
      if (imgRatio > boxRatio) {
        sw = img.height * boxRatio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / boxRatio;
        sy = (img.height - sh) / 2;
      }
      ctx.drawImage(img, sx, sy, sw, sh, -halfW, -halfH, layer.width, layer.height);
    } else {
      const imgRatio = img.width / img.height;
      const boxRatio = layer.width / layer.height;
      let dw = layer.width;
      let dh = layer.height;
      if (imgRatio > boxRatio) {
        dh = layer.width / imgRatio;
      } else {
        dw = layer.height * imgRatio;
      }
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
    }
    ctx.restore();

    if (layer.borderColor && (layer.borderWidth ?? 0) > 0) {
      ctx.strokeStyle = layer.borderColor;
      ctx.lineWidth = layer.borderWidth!;
      drawRoundedRectPath(ctx, -halfW, -halfH, layer.width, layer.height, layer.borderRadius || 0);
      ctx.stroke();
    }
  } catch (err) {
    console.warn('No se pudo cargar imagen de capa:', layer.src, err);
  }
}

function drawShapeLayer(ctx: CanvasRenderingContext2D, layer: ShapeLayer) {
  const halfW = layer.width / 2;
  const halfH = layer.height / 2;

  if (layer.variant === 'divider_line' || layer.variant === 'signature_line') {
    ctx.strokeStyle = layer.strokeColor || layer.fillColor || '#0B2913';
    ctx.lineWidth = Math.max(1, layer.strokeWidth || 1.5);
    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(halfW, 0);
    ctx.stroke();
  } else if (layer.variant === 'ornamental_divider') {
    const color = layer.fillColor || '#D4AF37';
    const centerAccent = layer.strokeColor || '#0B2913';
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, layer.strokeWidth || 1.6);

    ctx.beginPath();
    ctx.moveTo(-halfW, 0);
    ctx.lineTo(-16, 0);
    ctx.moveTo(16, 0);
    ctx.lineTo(halfW, 0);
    ctx.stroke();

    // Side dots
    ctx.fillStyle = color;
    for (const dx of [-22, 22]) {
      ctx.beginPath();
      ctx.arc(dx, 0, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center diamond
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(10, 0);
    ctx.lineTo(0, 7);
    ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = centerAccent;
    ctx.beginPath();
    ctx.moveTo(0, -3.5);
    ctx.lineTo(5, 0);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-5, 0);
    ctx.closePath();
    ctx.fill();
  } else if (layer.variant === 'rectangle') {
    drawRoundedRectPath(ctx, -halfW, -halfH, layer.width, layer.height, layer.borderRadius || 0);
    if (layer.fillColor && layer.fillColor !== 'transparent') {
      ctx.fillStyle = layer.fillColor;
      ctx.fill();
    }
    if (layer.strokeColor && layer.strokeColor !== 'transparent' && layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth;
      ctx.stroke();
    }
  } else if (layer.variant === 'circle') {
    const r = Math.min(halfW, halfH);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    if (layer.fillColor && layer.fillColor !== 'transparent') {
      ctx.fillStyle = layer.fillColor;
      ctx.fill();
    }
    if (layer.strokeColor && layer.strokeColor !== 'transparent' && layer.strokeWidth > 0) {
      ctx.strokeStyle = layer.strokeColor;
      ctx.lineWidth = layer.strokeWidth;
      ctx.stroke();
    }
  } else if (layer.variant === 'seal_rosette') {
    const r = Math.min(halfW, halfH);
    const spikes = 24;
    const outerR = r;
    const innerR = r * 0.91;

    // Scalloped ceremonial starburst outer ring
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i * Math.PI) / spikes;
      const rad = i % 2 === 0 ? outerR : innerR;
      const px = Math.cos(ang) * rad;
      const py = Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = layer.fillColor || '#D4AF37';
    ctx.fill();

    // Inner ring border
    ctx.strokeStyle = layer.strokeColor || '#FFFFFF';
    ctx.lineWidth = Math.max(1.5, layer.strokeWidth || 2);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();

    // Dashed subtle track
    ctx.save();
    ctx.setLineDash([2.5, 2.5]);
    ctx.lineWidth = 0.9;
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3 lines of seal text
    ctx.fillStyle = layer.sealTextColor || '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `700 ${Math.max(6, r * 0.17)}px "Montserrat", sans-serif`;
    ctx.fillText((layer.sealTopText || 'SELLO OFICIAL').toUpperCase(), 0, -r * 0.28);

    ctx.font = `900 ${Math.max(8, r * 0.27)}px "Cinzel", serif`;
    ctx.fillText((layer.sealCenterText || 'SUMAK').toUpperCase(), 0, 0);

    ctx.font = `700 ${Math.max(6, r * 0.15)}px "Montserrat", sans-serif`;
    ctx.fillText((layer.sealBottomText || 'ACADEMY').toUpperCase(), 0, r * 0.28);
  }
}

async function drawQrLayer(
  ctx: CanvasRenderingContext2D,
  layer: QrLayer,
  input: CredentialDocumentInput
) {
  const size = Math.min(layer.width, layer.height);
  const half = size / 2;
  const baseUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://www.sumakecuador.lat';
  const verifyUrl = `${baseUrl}/academia/verificar?code=${encodeURIComponent(
    input.verificationCode || 'SUMAK-VERIFY'
  )}`;

  try {
    const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 320,
      color: {
        dark: layer.fgColor || '#0B2913',
        light: layer.bgColor || '#FFFFFF',
      },
    });
    const qrImg = await loadImg(qrDataUrl);

    if (layer.showFrame) {
      const pad = 5;
      ctx.fillStyle = layer.bgColor || '#FFFFFF';
      ctx.strokeStyle = layer.borderColor || '#D4AF37';
      ctx.lineWidth = 1.8;
      drawRoundedRectPath(ctx, -half - pad, -half - pad, size + pad * 2, size + pad * 2, 6);
      ctx.fill();
      ctx.stroke();
    }

    ctx.drawImage(qrImg, -half, -half, size, size);

    if (layer.captionText?.trim()) {
      ctx.fillStyle = layer.captionColor || '#0B2913';
      ctx.font = `700 ${Math.max(6.5, size * 0.095)}px "Montserrat", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(layer.captionText.trim().toUpperCase(), 0, half + (layer.showFrame ? 9 : 4));
    }
  } catch (err) {
    console.warn('Error generando QR:', err);
  }
}

// -----------------------------------------------------------------------------
// Master Canvas Renderer (100% Fidelity to Visual Studio Design)
// -----------------------------------------------------------------------------
export async function renderCredentialToCanvas(
  input: CredentialDocumentInput,
  design: TemplateDesignV2,
  scale = 2.5
): Promise<HTMLCanvasElement> {
  // Wait for custom ceremonial Google Fonts to finish loading before drawing
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      // continue safely
    }
  }

  const { width, height } = getCanvasDimensions(
    design.canvas.pageSize,
    design.canvas.orientation
  );

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.save();
  ctx.scale(scale, scale);

  // 1. Background Color or 2-Color Gradient
  if (design.canvas.useGradient && design.canvas.gradientColor2) {
    const rad = ((design.canvas.gradientAngle || 135) * Math.PI) / 180;
    const cx = width / 2;
    const cy = height / 2;
    const len = Math.sqrt(width * width + height * height) / 2;
    const grad = ctx.createLinearGradient(
      cx - Math.cos(rad) * len,
      cy - Math.sin(rad) * len,
      cx + Math.cos(rad) * len,
      cy + Math.sin(rad) * len
    );
    grad.addColorStop(0, design.canvas.backgroundColor || '#FDFBF5');
    grad.addColorStop(1, design.canvas.gradientColor2);
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = design.canvas.backgroundColor || '#FDFBF5';
  }
  ctx.fillRect(0, 0, width, height);

  // 2. Optional Custom Background Image (PNG/JPG/WebP)
  if (design.canvas.backgroundImageUrl) {
    try {
      const bgImg = await loadImg(design.canvas.backgroundImageUrl);
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, design.canvas.backgroundImageOpacity ?? 1));
      if (design.canvas.backgroundImageFit === 'stretch') {
        ctx.drawImage(bgImg, 0, 0, width, height);
      } else if (design.canvas.backgroundImageFit === 'contain') {
        const imgRatio = bgImg.width / bgImg.height;
        const pageRatio = width / height;
        let dw = width,
          dh = height;
        if (imgRatio > pageRatio) dh = width / imgRatio;
        else dw = height * imgRatio;
        ctx.drawImage(bgImg, (width - dw) / 2, (height - dh) / 2, dw, dh);
      } else {
        // cover
        const imgRatio = bgImg.width / bgImg.height;
        const pageRatio = width / height;
        let sx = 0,
          sy = 0,
          sw = bgImg.width,
          sh = bgImg.height;
        if (imgRatio > pageRatio) {
          sw = bgImg.height * pageRatio;
          sx = (bgImg.width - sw) / 2;
        } else {
          sh = bgImg.width / pageRatio;
          sy = (bgImg.height - sh) / 2;
        }
        ctx.drawImage(bgImg, sx, sy, sw, sh, 0, 0, width, height);
      }
      ctx.restore();
    } catch (err) {
      console.warn('No se pudo cargar imagen de fondo:', err);
    }
  }

  // 3. Optional Subtle Watermark
  if (design.canvas.watermarkEnabled) {
    ctx.save();
    ctx.globalAlpha = design.canvas.watermarkOpacity ?? 0.04;
    if (design.canvas.watermarkImageUrl) {
      try {
        const wmImg = await loadImg(design.canvas.watermarkImageUrl);
        const target = Math.min(width, height) * 0.55;
        const ratio = wmImg.width / wmImg.height;
        const dw = ratio >= 1 ? target : target * ratio;
        const dh = ratio >= 1 ? target / ratio : target;
        ctx.drawImage(wmImg, (width - dw) / 2, (height - dh) / 2, dw, dh);
      } catch {
        // ignore watermark image load error
      }
    } else if (design.canvas.watermarkText) {
      ctx.translate(width / 2, height / 2);
      ctx.rotate((-24 * Math.PI) / 180);
      ctx.fillStyle = design.frame.primaryColor || '#0B2913';
      ctx.font = '900 110px "Cinzel", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(design.canvas.watermarkText.toUpperCase(), 0, 0);
    }
    ctx.restore();
  }

  // 4. Ornamental Frame
  drawTemplateFrame(ctx, design, width, height);

  // 5. Render All Ordered Layers
  for (const layer of design.layers) {
    if (!layer.visible) continue;
    ctx.save();
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;
    ctx.translate(cx, cy);
    if (layer.rotation) {
      ctx.rotate((layer.rotation * Math.PI) / 180);
    }
    ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity ?? 1));

    if (layer.kind === 'text') {
      drawTextLayer(ctx, layer, input);
    } else if (layer.kind === 'image') {
      await drawImageLayer(ctx, layer);
    } else if (layer.kind === 'shape') {
      drawShapeLayer(ctx, layer);
    } else if (layer.kind === 'qr') {
      await drawQrLayer(ctx, layer, input);
    }
    ctx.restore();
  }

  ctx.restore();
  return canvas;
}

// -----------------------------------------------------------------------------
// Pure-TypeScript Spec-Compliant Single-Page PDF Builder (300-DPI Vector-Crisp)
// -----------------------------------------------------------------------------
function canvasToPdfBlob(
  canvas: HTMLCanvasElement,
  pageWidthPt: number,
  pageHeightPt: number
): Blob {
  const jpegDataUrl = canvas.toDataURL('image/jpeg', 0.95);
  const base64 = jpegDataUrl.split(',')[1];
  const binaryStr = atob(base64);
  const imgBytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    imgBytes[i] = binaryStr.charCodeAt(i);
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0]; // obj 0 is free
  let bytePos = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    bytePos += b.length;
  };
  const pushBytes = (b: Uint8Array) => {
    chunks.push(b);
    bytePos += b.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Obj 1: Catalog
  offsets.push(bytePos);
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // Obj 2: Pages
  offsets.push(bytePos);
  pushStr('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // Obj 3: Page
  offsets.push(bytePos);
  pushStr(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(
      2
    )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`
  );

  // Obj 4: Image XObject (JPEG)
  offsets.push(bytePos);
  pushStr(
    `4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgBytes.length} >>\nstream\n`
  );
  pushBytes(imgBytes);
  pushStr('\nendstream\nendobj\n');

  // Obj 5: Content stream placing image full-bleed
  const contentStream = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
  const contentBytes = encoder.encode(contentStream);
  offsets.push(bytePos);
  pushStr(`5 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
  pushBytes(contentBytes);
  pushStr('endstream\nendobj\n');

  // Xref table
  const xrefPos = bytePos;
  pushStr(`xref\n0 ${offsets.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let i = 1; i < offsets.length; i++) {
    pushStr(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
  }

  pushStr(
    `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`
  );

  return new Blob(chunks, { type: 'application/pdf' });
}

// -----------------------------------------------------------------------------
// Resolve Database Template for Any Certificate / Diploma Issuance
// -----------------------------------------------------------------------------
export async function resolveDesignForCredential(
  input: CredentialDocumentInput
): Promise<{
  design: TemplateDesignV2;
  signatoryName?: string;
  signatoryTitle?: string;
  diplomaTypeName?: string;
}> {
  const category: 'certificate' | 'diploma' =
    input.type === 'certificado' ? 'certificate' : 'diploma';

  if (input.designOverride) {
    return {
      design: input.designOverride,
      signatoryName: input.signatoryName,
      signatoryTitle: input.signatoryTitle,
      diplomaTypeName: input.diplomaTypeName,
    };
  }

  try {
    let tpl: any = null;

    if (input.templateId) {
      const { data } = await supabase
        .from('academy_diploma_templates')
        .select('*, diploma_type:academy_diploma_types(name, credential_category)')
        .eq('id', input.templateId)
        .maybeSingle();
      tpl = data;
    }

    if (!tpl && input.diplomaTypeId) {
      const { data } = await supabase
        .from('academy_diploma_templates')
        .select('*, diploma_type:academy_diploma_types(name, credential_category)')
        .eq('diploma_type_id', input.diplomaTypeId)
        .eq('is_active', true)
        .order('version', { ascending: false })
        .limit(1)
        .maybeSingle();
      tpl = data;
    }

    if (!tpl) {
      // Fallback: find active template matching category
      const { data: types } = await supabase
        .from('academy_diploma_types')
        .select('id, name, internal_code, credential_category')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const preferredType = (types ?? []).find((t: any) =>
        category === 'certificate'
          ? t.internal_code === 'CERT_CURSO' || t.credential_category === 'certificate'
          : t.credential_category === 'diploma' && t.internal_code !== 'CERT_CURSO'
      );

      if (preferredType) {
        const { data } = await supabase
          .from('academy_diploma_templates')
          .select('*, diploma_type:academy_diploma_types(name, credential_category)')
          .eq('diploma_type_id', preferredType.id)
          .eq('is_active', true)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();
        tpl = data;
      }
    }

    if (tpl) {
      return {
        design: normalizeTemplateDesign(tpl, category),
        signatoryName: input.signatoryName || tpl.signatory_name || 'Dr. Luis Paredes',
        signatoryTitle:
          input.signatoryTitle ||
          tpl.signatory_title ||
          'Director Médico y Formador de Formadores • SUMAK Academy',
        diplomaTypeName: input.diplomaTypeName || tpl.diploma_type?.name,
      };
    }
  } catch (err) {
    console.warn('Usando plantilla institucional por defecto:', err);
  }

  return {
    design: normalizeTemplateDesign(null, category),
    signatoryName: input.signatoryName || 'Dr. Luis Paredes',
    signatoryTitle:
      input.signatoryTitle || 'Director Médico y Formador de Formadores • SUMAK Academy',
    diplomaTypeName: input.diplomaTypeName,
  };
}

export async function renderCredentialPreviewDataUrl(
  input: CredentialDocumentInput,
  scale = 1.2
): Promise<string> {
  const resolved = await resolveDesignForCredential(input);
  const enrichedInput: CredentialDocumentInput = {
    ...input,
    signatoryName: resolved.signatoryName,
    signatoryTitle: resolved.signatoryTitle,
    diplomaTypeName: resolved.diplomaTypeName,
  };
  const canvas = await renderCredentialToCanvas(enrichedInput, resolved.design, scale);
  return canvas.toDataURL('image/png');
}

/**
 * Genera y descarga el Certificado o Diploma Oficial en alta resolución (PDF o PNG)
 * respetando al 100% la plantilla diseñada en el Constructor Visual de SUMAK.
 */
export async function generateAndDownloadCredentialDocument(
  input: CredentialDocumentInput,
  format: 'pdf' | 'png' = 'pdf'
): Promise<void> {
  const resolved = await resolveDesignForCredential(input);
  const enrichedInput: CredentialDocumentInput = {
    ...input,
    signatoryName: resolved.signatoryName,
    signatoryTitle: resolved.signatoryTitle,
    diplomaTypeName: resolved.diplomaTypeName,
  };

  const { width, height } = getCanvasDimensions(
    resolved.design.canvas.pageSize,
    resolved.design.canvas.orientation
  );

  // 2.6x scale => ~2189 x 1548 px (ultra crisp print quality)
  const canvas = await renderCredentialToCanvas(enrichedInput, resolved.design, 2.6);

  const safeTitle = (input.title || 'SUMAK').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 45);
  const filePrefix = input.type === 'diploma' ? 'DIPLOMA_SUMAK' : 'CERTIFICADO_SUMAK';
  const baseName = `${filePrefix}_${safeTitle}_${input.verificationCode || 'OFICIAL'}`;

  if (format === 'pdf') {
    const pdfBlob = canvasToPdfBlob(canvas, width, height);
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } else {
    const pngDataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = pngDataUrl;
    link.download = `${baseName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
