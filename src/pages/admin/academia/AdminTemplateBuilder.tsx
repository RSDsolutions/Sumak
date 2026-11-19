import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Save, X, Image as ImageIcon, Type, LayoutTemplate, Plus, Trash2, Copy,
  Eye, EyeOff, Lock, Unlock, Undo2, Redo2, ZoomIn, ZoomOut, Grid,
  AlignLeft, AlignCenter, AlignRight, AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter, ArrowUp, ArrowDown, Upload, Download,
  Sparkles, Shapes, Layers, QrCode, FileText, Loader2,
  Bold, Italic, Underline, Palette, Wand2
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import { useToast } from '../../../lib/toast';
import {
  BUILT_IN_GRAPHICS,
  STARTER_PRESETS,
  SUMAK_COLOR_SWATCHES,
  TEMPLATE_FONTS,
  TEMPLATE_VARIABLES,
  getCanvasDimensions,
  normalizeTemplateDesign,
  type FrameStyleId,
  type ImageLayer,
  type PageOrientation,
  type PageSizeId,
  type QrLayer,
  type ShapeLayer,
  type ShapeVariant,
  type TemplateDesignV2,
  type TemplateFontFamily,
  type TemplateLayer,
  type TextLayer,
} from '../../../lib/credentialTemplateTypes';
import {
  generateAndDownloadCredentialDocument,
  renderCredentialToCanvas,
  resolveTemplateTokens,
  type CredentialDocumentInput,
} from '../../../lib/credentialDocumentGenerator';

interface TemplateBuilderProps {
  templateId: string;
  onClose: () => void;
  onSaved?: () => void;
}

type LeftTab = 'design' | 'add' | 'layers' | 'presets';

type DragMode =
  | { kind: 'move'; layerId: string; startClientX: number; startClientY: number; origX: number; origY: number }
  | {
      kind: 'resize';
      layerId: string;
      handle: 'nw' | 'ne' | 'sw' | 'se' | 'e' | 'w' | 'n' | 's';
      startClientX: number;
      startClientY: number;
      origX: number;
      origY: number;
      origW: number;
      origH: number;
    };

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const FRAME_OPTIONS: { id: FrameStyleId; label: string; desc: string }[] = [
  { id: 'none', label: 'Sin Marco', desc: 'Ideal si subes fondo PNG/JPG propio' },
  { id: 'royal_ornate', label: 'Real Ornamental', desc: 'Triple borde con rombos dorados' },
  { id: 'classic_double', label: 'Clásico Doble', desc: 'Doble marco esmeralda y oro' },
  { id: 'modern_side_ribbon', label: 'Banda Lateral', desc: 'Cinta vertical institucional moderna' },
  { id: 'botanical_minimal', label: 'Botánico Minimal', desc: 'Esquinas limpias estilo editorial' },
  { id: 'guilloche_luxury', label: 'Guilloché Lujo', desc: 'Doble línea punteada ceremonial' },
];

export default function AdminTemplateBuilder({ templateId, onClose, onSaved }: TemplateBuilderProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingGraphic, setUploadingGraphic] = useState(false);
  const [uploadingWatermark, setUploadingWatermark] = useState(false);

  const [templateMeta, setTemplateMeta] = useState<any>(null);
  const [signatoryName, setSignatoryName] = useState('Dr. Luis Paredes');
  const [signatoryTitle, setSignatoryTitle] = useState('Director Médico y Formador de Formadores • SUMAK Academy');

  // Design + Undo/Redo History
  const [design, setDesign] = useState<TemplateDesignV2 | null>(null);
  const [history, setHistory] = useState<TemplateDesignV2[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);

  // Studio UI State
  const [leftTab, setLeftTab] = useState<LeftTab>('design');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.82);
  const [showGrid, setShowGrid] = useState(false);
  const [previewRealData, setPreviewRealData] = useState(true);
  const [sampleName, setSampleName] = useState('Dra. María Elena Zambrano Paredes');
  const [sampleCourse, setSampleCourse] = useState('Especialización Clínica en Fitoterapia y Salud Renal');
  const [sessionUploads, setSessionUploads] = useState<{ url: string; name: string }[]>([]);

  // Magnetic snap guides
  const [snapGuideX, setSnapGuideX] = useState<number | null>(null);
  const [snapGuideY, setSnapGuideY] = useState<number | null>(null);
  const dragRef = useRef<DragMode | null>(null);
  const backdropCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Cached live QR data URLs by color combination
  const [qrPreviews, setQrPreviews] = useState<Record<string, string>>({});

  // Load template from Supabase
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from('academy_diploma_templates')
        .select('*, diploma_type:academy_diploma_types(*)')
        .eq('id', templateId)
        .single();

      if (!active) return;
      if (error || !data) {
        toast.error('Error al cargar la plantilla');
        onClose();
        return;
      }

      setTemplateMeta(data);
      setSignatoryName(data.signatory_name || 'Dr. Luis Paredes');
      setSignatoryTitle(
        data.signatory_title || 'Director Médico y Formador de Formadores • SUMAK Academy'
      );

      const category: 'certificate' | 'diploma' =
        data.diploma_type?.credential_category === 'certificate' ||
        String(data.diploma_type?.internal_code || '').toUpperCase().startsWith('CERT')
          ? 'certificate'
          : 'diploma';

      const normalized = normalizeTemplateDesign(data, category);
      setDesign(normalized);
      setHistory([normalized]);
      setHistoryIdx(0);
      setLoading(false);
    }
    void load();
    return () => {
      active = false;
    };
  }, [templateId, onClose, toast]);

  // History-aware setter
  const commitDesign = useCallback(
    (updater: TemplateDesignV2 | ((prev: TemplateDesignV2) => TemplateDesignV2), recordHistory = true) => {
      setDesign((prev) => {
        if (!prev) return prev;
        const next = typeof updater === 'function' ? updater(prev) : updater;
        if (recordHistory) {
          setHistory((h) => {
            const sliced = h.slice(0, historyIdx + 1);
            const updated = [...sliced, next].slice(-40);
            setHistoryIdx(updated.length - 1);
            return updated;
          });
        }
        return next;
      });
    },
    [historyIdx]
  );

  const canUndo = historyIdx > 0;
  const canRedo = historyIdx >= 0 && historyIdx < history.length - 1;

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    const targetIdx = historyIdx - 1;
    setHistoryIdx(targetIdx);
    setDesign(history[targetIdx]);
  }, [canUndo, history, historyIdx]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    const targetIdx = historyIdx + 1;
    setHistoryIdx(targetIdx);
    setDesign(history[targetIdx]);
  }, [canRedo, history, historyIdx]);

  const credentialCategory: 'certificate' | 'diploma' =
    templateMeta?.diploma_type?.credential_category === 'certificate' ||
    String(templateMeta?.diploma_type?.internal_code || '').toUpperCase().startsWith('CERT')
      ? 'certificate'
      : 'diploma';

  const sampleInput: CredentialDocumentInput = {
    type: credentialCategory === 'certificate' ? 'certificado' : 'diploma',
    title: sampleCourse,
    participantName: sampleName,
    verificationCode: 'SUMAK-8F4K9P2Q',
    diplomaNumber: credentialCategory === 'certificate' ? 'SUMAK-CERT-2026-000128' : 'SUMAK-DIP-2026-000042',
    issuedAt: new Date().toISOString(),
    diplomaTypeName: templateMeta?.diploma_type?.name || (credentialCategory === 'certificate' ? 'CERTIFICADO DE APROBACIÓN' : 'DIPLOMA DE ESPECIALIZACIÓN'),
    signatoryName,
    signatoryTitle,
    durationHours: '40 horas académicas certificadas',
    designOverride: design,
  };

  // Render Backdrop Canvas (Background + Image + Watermark + Frame) whenever canvas/frame changes
  useEffect(() => {
    if (!design || !backdropCanvasRef.current) return;
    let cancelled = false;
    async function paintBackdrop() {
      if (!design || !backdropCanvasRef.current) return;
      const backdropOnly: TemplateDesignV2 = {
        ...design,
        layers: [], // only draw bg + frame on the backdrop canvas!
      };
      const rendered = await renderCredentialToCanvas(sampleInput, backdropOnly, 2);
      if (cancelled || !backdropCanvasRef.current) return;
      const target = backdropCanvasRef.current;
      target.width = rendered.width;
      target.height = rendered.height;
      const ctx = target.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, target.width, target.height);
        ctx.drawImage(rendered, 0, 0);
      }
    }
    void paintBackdrop();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.canvas, design?.frame]);

  // Generate live QR previews for any QR layers
  useEffect(() => {
    if (!design) return;
    const qrLayers = design.layers.filter((l): l is QrLayer => l.kind === 'qr');
    qrLayers.forEach((ql) => {
      const cacheKey = `${ql.fgColor}|${ql.bgColor}`;
      if (qrPreviews[cacheKey]) return;
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://www.sumakecuador.lat';
      QRCode.toDataURL(`${baseUrl}/academia/verificar?code=SUMAK-8F4K9P2Q`, {
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 240,
        color: { dark: ql.fgColor || '#0B2913', light: ql.bgColor || '#FFFFFF' },
      })
        .then((url) => setQrPreviews((prev) => ({ ...prev, [cacheKey]: url })))
        .catch(() => {});
    });
  }, [design?.layers, qrPreviews]);

  // Keyboard shortcuts (Arrow nudge, Delete, Ctrl+Z, Ctrl+Y, Ctrl+D)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      const isEditingInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !isEditingInput) {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !isEditingInput) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (isEditingInput || !selectedId || !design) return;

      const sel = design.layers.find((l) => l.id === selectedId);
      if (!sel) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        duplicateLayer(selectedId);
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!sel.locked) {
          e.preventDefault();
          removeLayer(selectedId);
        }
        return;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !sel.locked) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        commitDesign((prev) => ({
          ...prev,
          layers: prev.layers.map((l) => (l.id === selectedId ? { ...l, x: l.x + dx, y: l.y + dy } : l)),
        }));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId, design, handleUndo, handleRedo, commitDesign]);

  // Pointer Drag & Resize Handlers
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || !design) return;

      const { width: canvasW, height: canvasH } = getCanvasDimensions(
        design.canvas.pageSize,
        design.canvas.orientation
      );
      const dx = (e.clientX - drag.startClientX) / zoom;
      const dy = (e.clientY - drag.startClientY) / zoom;

      if (drag.kind === 'move') {
        let nextX = drag.origX + dx;
        let nextY = drag.origY + dy;

        const targetLayer = design.layers.find((l) => l.id === drag.layerId);
        if (targetLayer) {
          const centerX = nextX + targetLayer.width / 2;
          const centerY = nextY + targetLayer.height / 2;

          // Magnetic Snap to Horizontal Center
          if (Math.abs(centerX - canvasW / 2) < 6) {
            nextX = canvasW / 2 - targetLayer.width / 2;
            setSnapGuideX(canvasW / 2);
          } else {
            setSnapGuideX(null);
          }

          // Magnetic Snap to Vertical Center
          if (Math.abs(centerY - canvasH / 2) < 6) {
            nextY = canvasH / 2 - targetLayer.height / 2;
            setSnapGuideY(canvasH / 2);
          } else {
            setSnapGuideY(null);
          }
        }

        setDesign((prev) =>
          prev
            ? {
                ...prev,
                layers: prev.layers.map((l) =>
                  l.id === drag.layerId ? { ...l, x: Math.round(nextX), y: Math.round(nextY) } : l
                ),
              }
            : prev
        );
      } else if (drag.kind === 'resize') {
        let nextX = drag.origX;
        let nextY = drag.origY;
        let nextW = drag.origW;
        let nextH = drag.origH;

        const minSize = 16;
        if (drag.handle.includes('e')) nextW = Math.max(minSize, drag.origW + dx);
        if (drag.handle.includes('s')) nextH = Math.max(minSize, drag.origH + dy);
        if (drag.handle.includes('w')) {
          const clamped = Math.min(dx, drag.origW - minSize);
          nextX = drag.origX + clamped;
          nextW = drag.origW - clamped;
        }
        if (drag.handle.includes('n')) {
          const clamped = Math.min(dy, drag.origH - minSize);
          nextY = drag.origY + clamped;
          nextH = drag.origH - clamped;
        }

        // Keep QR code square when resizing
        const layer = design.layers.find((l) => l.id === drag.layerId);
        if (layer?.kind === 'qr' || (layer?.kind === 'shape' && (layer.variant === 'seal_rosette' || layer.variant === 'circle'))) {
          const sq = Math.max(36, Math.round((nextW + nextH) / 2));
          nextW = sq;
          nextH = sq;
        }

        setDesign((prev) =>
          prev
            ? {
                ...prev,
                layers: prev.layers.map((l) =>
                  l.id === drag.layerId
                    ? {
                        ...l,
                        x: Math.round(nextX),
                        y: Math.round(nextY),
                        width: Math.round(nextW),
                        height: Math.round(nextH),
                      }
                    : l
                ),
              }
            : prev
        );
      }
    };

    const onPointerUp = () => {
      if (dragRef.current && design) {
        // Push final dragged state into undo history
        setHistory((h) => {
          const sliced = h.slice(0, historyIdx + 1);
          const updated = [...sliced, design].slice(-40);
          setHistoryIdx(updated.length - 1);
          return updated;
        });
      }
      dragRef.current = null;
      setSnapGuideX(null);
      setSnapGuideY(null);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [design, zoom, historyIdx]);

  // ── Layer Helpers ──────────────────────────────────────────────────────────

  const selectedLayer = design?.layers.find((l) => l.id === selectedId) ?? null;

  function updateLayer<T extends TemplateLayer>(id: string, patch: Partial<T>, record = true) {
    commitDesign(
      (prev) => ({
        ...prev,
        layers: prev.layers.map((l) => (l.id === id ? ({ ...l, ...patch } as TemplateLayer) : l)),
      }),
      record
    );
  }

  function addLayer(newLayer: TemplateLayer) {
    commitDesign((prev) => ({
      ...prev,
      layers: [...prev.layers, newLayer],
    }));
    setSelectedId(newLayer.id);
  }

  function removeLayer(id: string) {
    commitDesign((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateLayer(id: string) {
    if (!design) return;
    const orig = design.layers.find((l) => l.id === id);
    if (!orig) return;
    const copy: TemplateLayer = {
      ...orig,
      id: uid(orig.kind),
      name: `${orig.name} (copia)`,
      x: orig.x + 18,
      y: orig.y + 18,
      locked: false,
    };
    addLayer(copy);
  }

  function moveLayerOrder(id: string, direction: 'up' | 'down') {
    commitDesign((prev) => {
      const idx = prev.layers.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx + 1 : idx - 1;
      if (targetIdx < 0 || targetIdx >= prev.layers.length) return prev;
      const next = [...prev.layers];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return { ...prev, layers: next };
    });
  }

  function alignSelectedLayer(mode: 'centerX' | 'centerY' | 'left' | 'right') {
    if (!selectedLayer || !design) return;
    const { width: canvasW, height: canvasH } = getCanvasDimensions(
      design.canvas.pageSize,
      design.canvas.orientation
    );
    const m = design.frame.style !== 'none' ? (design.frame.margin || 26) + 20 : 40;
    if (mode === 'centerX') {
      updateLayer(selectedLayer.id, { x: Math.round((canvasW - selectedLayer.width) / 2) });
    } else if (mode === 'centerY') {
      updateLayer(selectedLayer.id, { y: Math.round((canvasH - selectedLayer.height) / 2) });
    } else if (mode === 'left') {
      updateLayer(selectedLayer.id, { x: m });
    } else if (mode === 'right') {
      updateLayer(selectedLayer.id, { x: Math.round(canvasW - m - selectedLayer.width) });
    }
  }

  // ── Add Element Factories ──────────────────────────────────────────────────

  function addTextBlock(opts?: {
    name?: string;
    text?: string;
    fontFamily?: TemplateFontFamily;
    fontSize?: number;
    fontWeight?: TextLayer['fontWeight'];
    color?: string;
    italic?: boolean;
  }) {
    if (!design) return;
    const { width: cw, height: ch } = getCanvasDimensions(design.canvas.pageSize, design.canvas.orientation);
    const w = Math.min(540, cw - 120);
    const layer: TextLayer = {
      id: uid('txt'),
      kind: 'text',
      name: opts?.name || 'Nuevo Texto',
      x: Math.round((cw - w) / 2),
      y: Math.round(ch / 2 - 22),
      width: w,
      height: Math.max(28, Math.round((opts?.fontSize || 18) * 1.6)),
      rotation: 0,
      opacity: 1,
      visible: true,
      text: opts?.text || 'Escribe tu texto aquí',
      fontFamily: opts?.fontFamily || 'Playfair Display',
      fontSize: opts?.fontSize || 18,
      fontWeight: opts?.fontWeight || '700',
      italic: opts?.italic ?? false,
      underline: false,
      textTransform: 'none',
      color: opts?.color || (design.canvas.backgroundColor === '#0A2213' ? '#FFFFFF' : '#0B2913'),
      align: 'center',
      letterSpacing: 0,
      lineHeight: 1.25,
    };
    addLayer(layer);
  }

  function addImageBlock(src: string, name: string, w = 130, h = 90) {
    if (!design) return;
    const { width: cw, height: ch } = getCanvasDimensions(design.canvas.pageSize, design.canvas.orientation);
    const layer: ImageLayer = {
      id: uid('img'),
      kind: 'image',
      name,
      x: Math.round((cw - w) / 2),
      y: Math.round((ch - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      src,
      objectFit: 'contain',
      borderRadius: 0,
      shadowEnabled: false,
    };
    addLayer(layer);
  }

  function addShapeBlock(variant: ShapeVariant) {
    if (!design) return;
    const { width: cw, height: ch } = getCanvasDimensions(design.canvas.pageSize, design.canvas.orientation);
    const isSeal = variant === 'seal_rosette';
    const isLine = variant === 'divider_line' || variant === 'signature_line' || variant === 'ornamental_divider';
    const w = isSeal ? 98 : isLine ? 280 : variant === 'circle' ? 90 : 220;
    const h = isSeal ? 98 : variant === 'ornamental_divider' ? 18 : isLine ? 6 : variant === 'circle' ? 90 : 36;
    const names: Record<ShapeVariant, string> = {
      seal_rosette: 'Sello Roseta Oficial',
      ornamental_divider: 'Divisor Ornamental Dorado',
      signature_line: 'Línea de Firma',
      divider_line: 'Línea Divisoria',
      rectangle: 'Banda / Recuadro Decorativo',
      circle: 'Círculo Decorativo',
    };
    const layer: ShapeLayer = {
      id: uid('shp'),
      kind: 'shape',
      name: names[variant],
      variant,
      x: Math.round((cw - w) / 2),
      y: Math.round((ch - h) / 2),
      width: w,
      height: h,
      rotation: 0,
      opacity: 1,
      visible: true,
      fillColor: isSeal ? '#D4AF37' : variant === 'rectangle' ? '#1A4E26' : '#D4AF37',
      strokeColor: isSeal ? '#FFFFFF' : '#0B2913',
      strokeWidth: isSeal ? 2 : 1.5,
      borderRadius: variant === 'rectangle' ? 8 : 0,
      sealTopText: 'SELLO OFICIAL',
      sealCenterText: 'SUMAK',
      sealBottomText: 'ACADEMY',
      sealTextColor: '#FFFFFF',
    };
    addLayer(layer);
  }

  function addQrBlock() {
    if (!design) return;
    const { width: cw, height: ch } = getCanvasDimensions(design.canvas.pageSize, design.canvas.orientation);
    const layer: QrLayer = {
      id: uid('qr'),
      kind: 'qr',
      name: 'Código QR Verificable',
      x: Math.round(cw - 145),
      y: Math.round(ch - 155),
      width: 86,
      height: 86,
      rotation: 0,
      opacity: 1,
      visible: true,
      fgColor: '#0B2913',
      bgColor: '#FFFFFF',
      borderColor: '#D4AF37',
      showFrame: true,
      captionText: 'ESCANEA PARA VERIFICAR',
      captionColor: design.canvas.backgroundColor === '#0A2213' ? '#F6E27A' : '#0B2913',
    };
    addLayer(layer);
  }

  // ── File Upload Handlers (Background PNG/JPG, Graphic PNG, Watermark PNG) ──

  async function handleUploadBackground(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !design) return;
    setUploadingBg(true);
    try {
      const publicUrl = await academyAPI.uploadDiplomaTemplateAsset(templateId, file, 'bg');
      commitDesign((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas,
          backgroundImageUrl: publicUrl,
          backgroundImageOpacity: 1,
        },
      }));
      toast.success('Imagen de fondo cargada y aplicada.');
    } catch {
      toast.error('No se pudo subir la imagen de fondo.');
    } finally {
      setUploadingBg(false);
      e.target.value = '';
    }
  }

  async function handleUploadGraphic(e: React.ChangeEvent<HTMLInputElement>, replaceSelected = false) {
    const file = e.target.files?.[0];
    if (!file || !design) return;
    setUploadingGraphic(true);
    try {
      const publicUrl = await academyAPI.uploadDiplomaTemplateAsset(templateId, file, 'graphic');
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ');
      setSessionUploads((prev) => [{ url: publicUrl, name: cleanName }, ...prev]);

      if (replaceSelected && selectedLayer?.kind === 'image') {
        updateLayer<ImageLayer>(selectedLayer.id, { src: publicUrl });
        toast.success('Imagen actualizada.');
      } else {
        // Probe natural aspect ratio so PNG inserts cleanly without distortion
        const probe = new Image();
        probe.onload = () => {
          const maxSide = 160;
          const ratio = probe.width / Math.max(1, probe.height);
          const w = ratio >= 1 ? maxSide : Math.round(maxSide * ratio);
          const h = ratio >= 1 ? Math.round(maxSide / ratio) : maxSide;
          addImageBlock(publicUrl, cleanName || 'Imagen PNG', w, h);
        };
        probe.onerror = () => addImageBlock(publicUrl, cleanName || 'Imagen PNG', 140, 100);
        probe.src = publicUrl;
        toast.success('Imagen PNG subida y agregada al lienzo.');
      }
    } catch {
      toast.error('No se pudo subir la imagen PNG.');
    } finally {
      setUploadingGraphic(false);
      e.target.value = '';
    }
  }

  async function handleUploadWatermark(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !design) return;
    setUploadingWatermark(true);
    try {
      const publicUrl = await academyAPI.uploadDiplomaTemplateAsset(templateId, file, 'watermark');
      commitDesign((prev) => ({
        ...prev,
        canvas: {
          ...prev.canvas,
          watermarkEnabled: true,
          watermarkImageUrl: publicUrl,
        },
      }));
      toast.success('Marca de agua PNG aplicada.');
    } catch {
      toast.error('No se pudo subir la marca de agua.');
    } finally {
      setUploadingWatermark(false);
      e.target.value = '';
    }
  }

  // ── Page Orientation / Size Change (gracefully scales positions) ───────────

  function handleChangePageGeometry(nextSize: PageSizeId, nextOrientation: PageOrientation) {
    if (!design) return;
    const oldDim = getCanvasDimensions(design.canvas.pageSize, design.canvas.orientation);
    const newDim = getCanvasDimensions(nextSize, nextOrientation);
    const sx = newDim.width / oldDim.width;
    const sy = newDim.height / oldDim.height;

    commitDesign((prev) => ({
      ...prev,
      canvas: { ...prev.canvas, pageSize: nextSize, orientation: nextOrientation },
      layers: prev.layers.map((l) => ({
        ...l,
        x: Math.round(l.x * sx),
        y: Math.round(l.y * sy),
        width: Math.min(Math.round(l.width * sx), Math.round(newDim.width - 40)),
      })),
    }));
  }

  // ── Save & Export ──────────────────────────────────────────────────────────

  async function handleSaveTemplate() {
    if (!design) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('academy_diploma_templates')
        .update({
          page_size: design.canvas.pageSize,
          orientation: design.canvas.orientation,
          background_image_url: design.canvas.backgroundImageUrl || null,
          signatory_name: signatoryName.trim() || null,
          signatory_title: signatoryTitle.trim() || null,
          layout_config: design,
        })
        .eq('id', templateId);

      if (error) throw error;
      toast.success('Plantilla visual guardada correctamente.');
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la plantilla.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTestExport(format: 'pdf' | 'png') {
    if (!design) return;
    setExporting(format);
    try {
      await generateAndDownloadCredentialDocument(sampleInput, format);
      toast.success(`Prueba ${format.toUpperCase()} generada con éxito.`);
    } catch {
      toast.error('No se pudo exportar la prueba.');
    } finally {
      setExporting(null);
    }
  }

  // ── Render Loading ─────────────────────────────────────────────────────────

  if (loading || !design) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0B1E12] text-white gap-3">
        <Loader2 className="animate-spin text-[#D4AF37]" size={40} />
        <p className="text-sm font-semibold text-emerald-100">Cargando Estudio Visual de Plantillas SUMAK...</p>
      </div>
    );
  }

  const { width: canvasW, height: canvasH } = getCanvasDimensions(
    design.canvas.pageSize,
    design.canvas.orientation
  );

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0E1612] text-slate-900 overflow-hidden select-none">
      {/* ── TOP STUDIO HEADER ─────────────────────────────────────────────── */}
      <header className="h-14 bg-[#0B2913] text-white border-b border-white/10 px-4 flex items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
            <LayoutTemplate size={18} className="text-[#D4AF37]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black truncate">{templateMeta?.diploma_type?.name || 'Estudio Visual'}</h1>
              <span
                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                  credentialCategory === 'certificate'
                    ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                    : 'bg-[#D4AF37]/20 text-[#F6E27A] border border-[#D4AF37]/40'
                }`}
              >
                {credentialCategory === 'certificate' ? 'Certificado de Curso' : 'Diploma de Programa'}
              </span>
            </div>
            <p className="text-[11px] text-emerald-200/70 truncate">
              {design.canvas.pageSize} • {design.canvas.orientation === 'landscape' ? 'Horizontal' : 'Vertical'} • {design.layers.length} capas
            </p>
          </div>
        </div>

        {/* Center Studio Controls: Undo/Redo, Zoom, Grid, Preview Mode */}
        <div className="hidden xl:flex items-center gap-1.5 bg-black/25 px-2.5 py-1.5 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            title="Deshacer (Ctrl+Z)"
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition"
          >
            <Undo2 size={15} />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={!canRedo}
            title="Rehacer (Ctrl+Y)"
            className="p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 transition"
          >
            <Redo2 size={15} />
          </button>

          <div className="w-px h-4 bg-white/15 mx-1" />

          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.45, +(z - 0.1).toFixed(2)))}
            title="Alejar"
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <ZoomOut size={15} />
          </button>
          <span className="text-xs font-mono font-bold w-11 text-center text-emerald-100">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.3, +(z + 0.1).toFixed(2)))}
            title="Acercar"
            className="p-1.5 rounded-lg hover:bg-white/10 transition"
          >
            <ZoomIn size={15} />
          </button>

          <div className="w-px h-4 bg-white/15 mx-1" />

          <button
            type="button"
            onClick={() => setShowGrid((g) => !g)}
            className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              showGrid ? 'bg-[#D4AF37] text-[#0B2913]' : 'text-white/80 hover:bg-white/10'
            }`}
          >
            <Grid size={13} /> Cuadrícula
          </button>

          <button
            type="button"
            onClick={() => setPreviewRealData((p) => !p)}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
              previewRealData ? 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/30' : 'text-white/80 hover:bg-white/10'
            }`}
            title="Alternar entre datos de prueba reales y variables {{...}}"
          >
            <Eye size={13} /> {previewRealData ? 'Datos Reales' : '{{Variables}}'}
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleTestExport('png')}
            disabled={exporting !== null}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15 transition"
          >
            {exporting === 'png' ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            Prueba PNG
          </button>
          <button
            type="button"
            onClick={() => handleTestExport('pdf')}
            disabled={exporting !== null}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold border border-white/15 transition"
          >
            {exporting === 'pdf' ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
            Prueba PDF
          </button>
          <button
            type="button"
            onClick={handleSaveTemplate}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C49E2A] text-[#0B2913] text-xs font-black shadow transition disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar Diseño'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/80 text-white transition"
            title="Cerrar estudio"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* ── MAIN 3-COLUMN WORKSPACE ───────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── LEFT TOOL RAIL & PANEL ─────────────────────────────────────── */}
        <div className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
          {/* 4 Studio Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-200 bg-slate-50 p-1 gap-1 shrink-0">
            {(
              [
                { id: 'design', label: 'Fondo', icon: <Palette size={14} /> },
                { id: 'add', label: 'Añadir', icon: <Plus size={14} /> },
                { id: 'layers', label: 'Capas', icon: <Layers size={14} /> },
                { id: 'presets', label: 'Estilos', icon: <Sparkles size={14} /> },
              ] as { id: LeftTab; label: string; icon: React.ReactNode }[]
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setLeftTab(t.id)}
                className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[11px] font-bold transition ${
                  leftTab === t.id
                    ? 'bg-[#1A4E26] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">
            {/* TAB 1: DESIGN, BACKGROUND, FRAME, WATERMARK */}
            {leftTab === 'design' && (
              <>
                {/* Page Size & Orientation */}
                <section className="space-y-2.5">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Formato del Documento
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={design.canvas.pageSize}
                      onChange={(e) => handleChangePageGeometry(e.target.value as PageSizeId, design.canvas.orientation)}
                      className="px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-[#1A4E26]"
                    >
                      <option value="A4">Hoja A4</option>
                      <option value="letter">Hoja Carta (Letter)</option>
                    </select>
                    <select
                      value={design.canvas.orientation}
                      onChange={(e) => handleChangePageGeometry(design.canvas.pageSize, e.target.value as PageOrientation)}
                      className="px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-bold bg-white outline-none focus:ring-2 focus:ring-[#1A4E26]"
                    >
                      <option value="landscape">Horizontal</option>
                      <option value="portrait">Vertical</option>
                    </select>
                  </div>
                </section>

                {/* Background Color & Gradient */}
                <section className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Color y Degradado de Fondo
                  </h3>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={design.canvas.backgroundColor}
                      onChange={(e) =>
                        commitDesign((p) => ({ ...p, canvas: { ...p.canvas, backgroundColor: e.target.value } }))
                      }
                      className="w-9 h-9 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={design.canvas.backgroundColor}
                      onChange={(e) =>
                        commitDesign((p) => ({ ...p, canvas: { ...p.canvas, backgroundColor: e.target.value } }))
                      }
                      className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {['#FDFBF5', '#FAFDFB', '#FFFFFF', '#F6EFE0', '#EBF4ED', '#0A2213', '#12263A', '#1F1B18'].map(
                      (hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() =>
                            commitDesign((p) => ({ ...p, canvas: { ...p.canvas, backgroundColor: hex } }))
                          }
                          className="w-6 h-6 rounded-full border border-slate-300 shadow-2xs hover:scale-110 transition"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      )
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={design.canvas.useGradient}
                      onChange={(e) =>
                        commitDesign((p) => ({ ...p, canvas: { ...p.canvas, useGradient: e.target.checked } }))
                      }
                      className="accent-[#1A4E26] w-4 h-4"
                    />
                    Activar degradado de lujo (2 colores)
                  </label>

                  {design.canvas.useGradient && (
                    <div className="space-y-2 pl-2 border-l-2 border-[#C8D8CB]">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-slate-500">Color 2:</span>
                        <input
                          type="color"
                          value={design.canvas.gradientColor2 || '#F6EFE0'}
                          onChange={(e) =>
                            commitDesign((p) => ({ ...p, canvas: { ...p.canvas, gradientColor2: e.target.value } }))
                          }
                          className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                        />
                        <span className="text-[11px] font-mono text-slate-500 ml-auto">
                          {design.canvas.gradientAngle}°
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={360}
                        value={design.canvas.gradientAngle}
                        onChange={(e) =>
                          commitDesign((p) => ({
                            ...p,
                            canvas: { ...p.canvas, gradientAngle: Number(e.target.value) },
                          }))
                        }
                        className="w-full accent-[#1A4E26]"
                      />
                    </div>
                  )}
                </section>

                {/* Custom Background Image Upload */}
                <section className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Imagen de Fondo (PNG / JPG)
                  </h3>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-[#C8D8CB] hover:border-[#1A4E26] bg-[#F8FBF8] rounded-xl p-3 text-center transition">
                      {uploadingBg ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1A4E26]">
                          <Loader2 size={15} className="animate-spin" /> Subiendo fondo...
                        </div>
                      ) : (
                        <>
                          <Upload size={18} className="mx-auto text-[#1A4E26] mb-1" />
                          <span className="text-xs font-bold text-[#1A4E26] block">
                            Subir Fondo Personalizado
                          </span>
                          <span className="text-[10px] text-slate-500">
                            PNG, JPG o WebP (ej. diseño hecho en Canva)
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="sr-only"
                      disabled={uploadingBg}
                      onChange={handleUploadBackground}
                    />
                  </label>

                  {design.canvas.backgroundImageUrl && (
                    <div className="space-y-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <img
                          src={design.canvas.backgroundImageUrl}
                          alt="Fondo actual"
                          className="w-12 h-9 object-cover rounded border border-slate-200"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-bold text-slate-700 truncate">Fondo cargado</p>
                          <button
                            type="button"
                            onClick={() =>
                              commitDesign((p) => ({
                                ...p,
                                canvas: { ...p.canvas, backgroundImageUrl: null },
                              }))
                            }
                            className="text-[11px] font-bold text-red-600 hover:underline"
                          >
                            Quitar fondo
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(['cover', 'stretch', 'contain'] as const).map((fit) => (
                          <button
                            key={fit}
                            type="button"
                            onClick={() =>
                              commitDesign((p) => ({ ...p, canvas: { ...p.canvas, backgroundImageFit: fit } }))
                            }
                            className={`py-1 rounded text-[10px] font-bold border ${
                              design.canvas.backgroundImageFit === fit
                                ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                                : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {fit === 'cover' ? 'Cubrir' : fit === 'stretch' ? 'Estirar' : 'Contener'}
                          </button>
                        ))}
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-0.5">
                          <span>Opacidad del fondo</span>
                          <span>{Math.round((design.canvas.backgroundImageOpacity ?? 1) * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0.1}
                          max={1}
                          step={0.05}
                          value={design.canvas.backgroundImageOpacity ?? 1}
                          onChange={(e) =>
                            commitDesign((p) => ({
                              ...p,
                              canvas: { ...p.canvas, backgroundImageOpacity: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-[#1A4E26]"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* Ornamental Frame Picker */}
                <section className="space-y-3 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Marco Ornamental Institucional
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {FRAME_OPTIONS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() =>
                          commitDesign((p) => ({ ...p, frame: { ...p.frame, style: f.id } }))
                        }
                        className={`p-2 rounded-xl border text-left transition ${
                          design.frame.style === f.id
                            ? 'border-[#1A4E26] bg-[#EBF4ED] ring-1 ring-[#1A4E26]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <p className="text-[11px] font-extrabold text-slate-900 leading-tight">{f.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{f.desc}</p>
                      </button>
                    ))}
                  </div>

                  {design.frame.style !== 'none' && (
                    <div className="space-y-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">Color Primario</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={design.frame.primaryColor}
                              onChange={(e) =>
                                commitDesign((p) => ({
                                  ...p,
                                  frame: { ...p.frame, primaryColor: e.target.value },
                                }))
                              }
                              className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono">{design.frame.primaryColor}</span>
                          </div>
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500 block mb-1">Color Acento</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="color"
                              value={design.frame.accentColor}
                              onChange={(e) =>
                                commitDesign((p) => ({
                                  ...p,
                                  frame: { ...p.frame, accentColor: e.target.value },
                                }))
                              }
                              className="w-7 h-7 rounded border border-slate-200 cursor-pointer"
                            />
                            <span className="text-[10px] font-mono">{design.frame.accentColor}</span>
                          </div>
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500">Margen ({design.frame.margin}pt)</span>
                          <input
                            type="range"
                            min={12}
                            max={56}
                            value={design.frame.margin}
                            onChange={(e) =>
                              commitDesign((p) => ({ ...p, frame: { ...p.frame, margin: Number(e.target.value) } }))
                            }
                            className="w-full accent-[#1A4E26]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-[10px] font-bold text-slate-500">Grosor ({design.frame.thickness})</span>
                          <input
                            type="range"
                            min={1}
                            max={8}
                            value={design.frame.thickness}
                            onChange={(e) =>
                              commitDesign((p) => ({ ...p, frame: { ...p.frame, thickness: Number(e.target.value) } }))
                            }
                            className="w-full accent-[#1A4E26]"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </section>

                {/* Watermark */}
                <section className="space-y-2.5 pt-3 border-t border-slate-100">
                  <label className="flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer">
                    <span>Marca de Agua Central</span>
                    <input
                      type="checkbox"
                      checked={design.canvas.watermarkEnabled}
                      onChange={(e) =>
                        commitDesign((p) => ({
                          ...p,
                          canvas: { ...p.canvas, watermarkEnabled: e.target.checked },
                        }))
                      }
                      className="accent-[#1A4E26] w-4 h-4"
                    />
                  </label>
                  {design.canvas.watermarkEnabled && (
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={design.canvas.watermarkText || ''}
                        onChange={(e) =>
                          commitDesign((p) => ({
                            ...p,
                            canvas: { ...p.canvas, watermarkText: e.target.value, watermarkImageUrl: null },
                          }))
                        }
                        placeholder="Texto de marca de agua (ej: SUMAK)"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                      />
                      <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#1A4E26] cursor-pointer hover:underline">
                        {uploadingWatermark ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                        O subir logo PNG como marca de agua
                        <input
                          type="file"
                          accept="image/png,image/webp"
                          className="sr-only"
                          onChange={handleUploadWatermark}
                        />
                      </label>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">
                          Transparencia ({Math.round((design.canvas.watermarkOpacity ?? 0.04) * 100)}%)
                        </span>
                        <input
                          type="range"
                          min={0.02}
                          max={0.22}
                          step={0.01}
                          value={design.canvas.watermarkOpacity ?? 0.04}
                          onChange={(e) =>
                            commitDesign((p) => ({
                              ...p,
                              canvas: { ...p.canvas, watermarkOpacity: Number(e.target.value) },
                            }))
                          }
                          className="w-full accent-[#1A4E26]"
                        />
                      </div>
                    </div>
                  )}
                </section>

                {/* Default Signatory Metadata */}
                <section className="space-y-2.5 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Autoridad Firmante por Defecto
                  </h3>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Ej: Dr. Luis Paredes"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                  <input
                    type="text"
                    value={signatoryTitle}
                    onChange={(e) => setSignatoryTitle(e.target.value)}
                    placeholder="Cargo / Título del firmante"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                  />
                </section>
              </>
            )}

            {/* TAB 2: ADD ELEMENTS (TEXT, VARIABLES, PNG IMAGES, GRAPHICS, SHAPES, QR) */}
            {leftTab === 'add' && (
              <>
                {/* Upload PNG Image / Logo / Signature */}
                <section className="space-y-2.5">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Añadir Imagen PNG / Firma / Logo
                  </h3>
                  <label className="block cursor-pointer">
                    <div className="border-2 border-dashed border-[#1A4E26]/40 hover:border-[#1A4E26] bg-[#EBF4ED]/50 rounded-xl p-3.5 text-center transition">
                      {uploadingGraphic ? (
                        <div className="flex items-center justify-center gap-2 text-xs font-bold text-[#1A4E26]">
                          <Loader2 size={15} className="animate-spin" /> Subiendo PNG...
                        </div>
                      ) : (
                        <>
                          <ImageIcon size={20} className="mx-auto text-[#1A4E26] mb-1" />
                          <span className="text-xs font-extrabold text-[#1A4E26] block">
                            Subir PNG / Logo / Firma desde PC
                          </span>
                          <span className="text-[10px] text-slate-600">
                            Soporta transparencia PNG (firmas, sellos, logos)
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      disabled={uploadingGraphic}
                      onChange={(e) => handleUploadGraphic(e, false)}
                    />
                  </label>

                  {sessionUploads.length > 0 && (
                    <div className="grid grid-cols-3 gap-1.5 pt-1">
                      {sessionUploads.map((up, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => addImageBlock(up.url, up.name)}
                          className="p-1.5 rounded-lg border border-slate-200 hover:border-[#1A4E26] bg-white flex flex-col items-center gap-1"
                        >
                          <img src={up.url} alt={up.name} className="w-10 h-10 object-contain" />
                          <span className="text-[9px] font-bold text-slate-600 truncate w-full text-center">
                            {up.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>

                {/* Built-in SUMAK Graphics & Seals Library */}
                <section className="space-y-2.5 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Galería SUMAK (Logos, Sellos y Adornos)
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {BUILT_IN_GRAPHICS.map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => addImageBlock(g.src, g.label, g.defaultWidth, g.defaultHeight)}
                        className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] hover:bg-[#F8FBF8] transition flex flex-col items-center gap-1.5 text-center"
                      >
                        <div className="w-full h-11 flex items-center justify-center bg-slate-50 rounded-lg p-1">
                          <img src={g.src} alt={g.label} className="max-h-9 max-w-full object-contain" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 leading-tight">{g.label}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Text & Dynamic Variables */}
                <section className="space-y-2.5 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Textos y Campos Automáticos
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        addTextBlock({
                          name: 'Título Ceremonial',
                          text: 'TÍTULO DEL DIPLOMA',
                          fontFamily: 'Cinzel',
                          fontSize: 28,
                          fontWeight: '900',
                        })
                      }
                      className="px-2.5 py-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-xs font-bold text-slate-800 flex items-center gap-1.5"
                    >
                      <Type size={14} className="text-[#1A4E26]" /> Título
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addTextBlock({
                          name: 'Texto / Párrafo',
                          text: 'Por haber aprobado satisfactoriamente el plan académico oficial.',
                          fontFamily: 'Inter',
                          fontSize: 12,
                          fontWeight: '400',
                        })
                      }
                      className="px-2.5 py-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-xs font-bold text-slate-800 flex items-center gap-1.5"
                    >
                      <FileText size={14} className="text-[#1A4E26]" /> Párrafo
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        addTextBlock({
                          name: 'Firma Caligráfica',
                          text: '{{signatory_name}}',
                          fontFamily: 'Great Vibes',
                          fontSize: 28,
                          fontWeight: '400',
                        })
                      }
                      className="col-span-2 px-2.5 py-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5"
                    >
                      <Wand2 size={14} className="text-[#D4AF37]" /> Firma Caligráfica Elegante
                    </button>
                  </div>

                  <p className="text-[10px] font-bold text-slate-400 uppercase pt-1">
                    Variables automáticas (se llenan solas al emitir):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.token}
                        type="button"
                        onClick={() =>
                          addTextBlock({
                            name: v.label,
                            text: v.token,
                            fontFamily:
                              v.token === '{{participant_name}}'
                                ? 'Playfair Display'
                                : v.token === '{{verification_code}}' || v.token === '{{diploma_number}}'
                                ? 'Courier New'
                                : 'Poppins',
                            fontSize: v.token === '{{participant_name}}' ? 30 : v.token === '{{course_name}}' ? 20 : 12,
                            fontWeight: '700',
                          })
                        }
                        className="px-2 py-1 rounded-lg bg-[#EBF4ED] hover:bg-[#1A4E26] hover:text-white text-[#1A4E26] text-[10px] font-bold border border-[#C8D8CB] transition"
                        title={v.description}
                      >
                        + {v.label}
                      </button>
                    ))}
                  </div>
                </section>

                {/* Vector Shapes & QR */}
                <section className="space-y-2.5 pt-3 border-t border-slate-100">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Formas, Sellos y Código QR
                  </h3>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => addShapeBlock('seal_rosette')}
                      className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <Sparkles size={14} className="text-[#D4AF37]" /> Sello Roseta
                    </button>
                    <button
                      type="button"
                      onClick={addQrBlock}
                      className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <QrCode size={14} className="text-[#1A4E26]" /> Código QR
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeBlock('ornamental_divider')}
                      className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <Shapes size={14} className="text-[#D4AF37]" /> Divisor Oro
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeBlock('signature_line')}
                      className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <Shapes size={14} className="text-slate-600" /> Línea Firma
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeBlock('rectangle')}
                      className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <Shapes size={14} className="text-[#1A4E26]" /> Banda / Caja
                    </button>
                    <button
                      type="button"
                      onClick={() => addShapeBlock('circle')}
                      className="p-2 rounded-xl border border-slate-200 hover:border-[#1A4E26] text-[11px] font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <Shapes size={14} className="text-emerald-600" /> Círculo
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* TAB 3: LAYERS STACK */}
            {leftTab === 'layers' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Orden de Capas ({design.layers.length})
                  </h3>
                  <span className="text-[10px] text-slate-400">Arriba = al frente</span>
                </div>
                <div className="space-y-1.5">
                  {[...design.layers].reverse().map((layer) => {
                    const isSel = selectedId === layer.id;
                    return (
                      <div
                        key={layer.id}
                        onClick={() => setSelectedId(layer.id)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border cursor-pointer transition ${
                          isSel
                            ? 'border-[#1A4E26] bg-[#EBF4ED]'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span className="text-[#1A4E26] shrink-0">
                          {layer.kind === 'text' ? (
                            <Type size={13} />
                          ) : layer.kind === 'image' ? (
                            <ImageIcon size={13} />
                          ) : layer.kind === 'qr' ? (
                            <QrCode size={13} />
                          ) : (
                            <Shapes size={13} />
                          )}
                        </span>
                        <span
                          className={`text-xs font-bold flex-1 truncate ${
                            layer.visible ? 'text-slate-800' : 'text-slate-400 line-through'
                          }`}
                        >
                          {layer.name}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayerOrder(layer.id, 'up');
                            }}
                            className="p-1 text-slate-400 hover:text-[#1A4E26]"
                            title="Subir capa"
                          >
                            <ArrowUp size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              moveLayerOrder(layer.id, 'down');
                            }}
                            className="p-1 text-slate-400 hover:text-[#1A4E26]"
                            title="Bajar capa"
                          >
                            <ArrowDown size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLayer(layer.id, { locked: !layer.locked });
                            }}
                            className={`p-1 ${layer.locked ? 'text-amber-600' : 'text-slate-400 hover:text-slate-700'}`}
                            title={layer.locked ? 'Desbloquear' : 'Bloquear posición'}
                          >
                            {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateLayer(layer.id, { visible: !layer.visible });
                            }}
                            className="p-1 text-slate-400 hover:text-[#1A4E26]"
                            title={layer.visible ? 'Ocultar' : 'Mostrar'}
                          >
                            {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* TAB 4: ONE-CLICK LUXURY STARTER PRESETS */}
            {leftTab === 'presets' && (
              <section className="space-y-3">
                <div>
                  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                    Diseños Profesionales de 1 Clic
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aplica una base de lujo y personaliza cualquier texto, color, logo o firma.
                  </p>
                </div>
                <div className="space-y-2.5">
                  {STARTER_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className="rounded-xl border border-slate-200 overflow-hidden bg-white hover:border-[#1A4E26] transition shadow-2xs"
                    >
                      <div
                        className="h-16 p-3 flex items-end justify-between relative"
                        style={{ background: preset.previewBg }}
                      >
                        <div
                          className="absolute inset-2 border rounded pointer-events-none"
                          style={{ borderColor: preset.previewAccent }}
                        />
                        <span
                          className="relative z-10 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-black/70 text-white"
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <div className="p-3 space-y-1.5">
                        <p className="text-xs font-extrabold text-slate-900">{preset.name}</p>
                        <p className="text-[11px] text-slate-500 leading-snug">{preset.description}</p>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `¿Aplicar el diseño "${preset.name}"? Podrás deshacerlo con Ctrl+Z si deseas volver atrás.`
                              )
                            ) {
                              commitDesign(preset.build(credentialCategory));
                              setSelectedId(null);
                              toast.success(`Diseño "${preset.name}" aplicado.`);
                            }
                          }}
                          className="w-full mt-1 py-1.5 rounded-lg bg-[#EBF4ED] hover:bg-[#1A4E26] text-[#1A4E26] hover:text-white text-xs font-bold transition"
                        >
                          Aplicar este Diseño
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>

        {/* ── CENTER INTERACTIVE CANVAS STAGE ────────────────────────────── */}
        <div
          className="flex-1 bg-[#1B2420] overflow-auto p-8 flex items-center justify-center relative"
          onClick={() => setSelectedId(null)}
        >
          <div
            className="relative shadow-[0_24px_70px_rgba(0,0,0,0.55)] ring-1 ring-white/20 transition-all duration-150"
            style={{
              width: canvasW * zoom,
              height: canvasH * zoom,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Live Backdrop Canvas (Background + Image + Watermark + Frame) */}
            <canvas
              ref={backdropCanvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
            />

            {/* Optional Alignment Grid */}
            {showGrid && (
              <div
                className="absolute inset-0 pointer-events-none opacity-25"
                style={{
                  backgroundImage:
                    'linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)',
                  backgroundSize: `${30 * zoom}px ${30 * zoom}px`,
                }}
              />
            )}

            {/* Magnetic Center Snap Guidelines */}
            {snapGuideX !== null && (
              <div
                className="absolute top-0 bottom-0 w-px border-l border-dashed border-[#D4AF37] pointer-events-none z-40"
                style={{ left: snapGuideX * zoom }}
              />
            )}
            {snapGuideY !== null && (
              <div
                className="absolute left-0 right-0 h-px border-t border-dashed border-[#D4AF37] pointer-events-none z-40"
                style={{ top: snapGuideY * zoom }}
              />
            )}

            {/* Interactive Layers */}
            {design.layers.map((layer) => {
              if (!layer.visible) return null;
              const isSelected = selectedId === layer.id;

              return (
                <div
                  key={layer.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setSelectedId(layer.id);
                    if (layer.locked) return;
                    dragRef.current = {
                      kind: 'move',
                      layerId: layer.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: layer.x,
                      origY: layer.y,
                    };
                  }}
                  style={{
                    position: 'absolute',
                    left: layer.x * zoom,
                    top: layer.y * zoom,
                    width: layer.width * zoom,
                    height: layer.height * zoom,
                    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                    opacity: layer.opacity,
                    cursor: layer.locked ? 'not-allowed' : 'move',
                  }}
                  className={`group ${
                    isSelected
                      ? 'ring-2 ring-sky-500 z-30'
                      : 'hover:ring-1 hover:ring-sky-400/70'
                  }`}
                >
                  {/* TEXT LAYER RENDER */}
                  {layer.kind === 'text' && (
                    <div
                      className="w-full h-full flex items-start overflow-visible"
                      style={{
                        justifyContent:
                          layer.align === 'center'
                            ? 'center'
                            : layer.align === 'right'
                            ? 'flex-end'
                            : 'flex-start',
                        textAlign: layer.align,
                      }}
                    >
                      <span
                        className="w-full whitespace-pre-wrap break-words"
                        style={{
                          fontFamily: `"${layer.fontFamily}", sans-serif`,
                          fontSize: layer.fontSize * zoom,
                          fontWeight: Number(layer.fontWeight || 400),
                          fontStyle: layer.italic ? 'italic' : 'normal',
                          textDecoration: layer.underline ? 'underline' : 'none',
                          textTransform: layer.textTransform === 'none' ? undefined : layer.textTransform,
                          color: layer.color,
                          letterSpacing: `${(layer.letterSpacing || 0) * zoom}px`,
                          lineHeight: layer.lineHeight || 1.25,
                          textShadow: layer.shadowEnabled
                            ? `1px 2px 4px ${layer.shadowColor || 'rgba(0,0,0,0.28)'}`
                            : undefined,
                          ...(layer.pillBackground
                            ? {
                                backgroundColor: layer.pillBackground,
                                borderRadius: (layer.pillRadius ?? 8) * zoom,
                                padding: `${(layer.pillPaddingY ?? 4) * zoom}px ${(layer.pillPaddingX ?? 10) * zoom}px`,
                                display: 'inline-block',
                                width: 'auto',
                              }
                            : {}),
                        }}
                      >
                        {previewRealData ? resolveTemplateTokens(layer.text, sampleInput) : layer.text}
                      </span>
                    </div>
                  )}

                  {/* IMAGE LAYER RENDER */}
                  {layer.kind === 'image' && (
                    <img
                      src={layer.src}
                      alt={layer.name}
                      draggable={false}
                      className="w-full h-full pointer-events-none"
                      style={{
                        objectFit: layer.objectFit || 'contain',
                        borderRadius: (layer.borderRadius || 0) * zoom,
                        boxShadow: layer.shadowEnabled ? '0 4px 12px rgba(0,0,0,0.25)' : undefined,
                        border:
                          layer.borderColor && (layer.borderWidth ?? 0) > 0
                            ? `${layer.borderWidth! * zoom}px solid ${layer.borderColor}`
                            : undefined,
                      }}
                    />
                  )}

                  {/* SHAPE LAYER RENDER */}
                  {layer.kind === 'shape' && (
                    <div className="w-full h-full flex items-center justify-center pointer-events-none">
                      {(layer.variant === 'divider_line' || layer.variant === 'signature_line') && (
                        <div
                          className="w-full"
                          style={{
                            height: Math.max(1, (layer.strokeWidth || 1.5) * zoom),
                            backgroundColor: layer.strokeColor || layer.fillColor,
                          }}
                        />
                      )}
                      {layer.variant === 'ornamental_divider' && (
                        <svg viewBox="0 0 360 20" className="w-full h-full overflow-visible">
                          <line x1="0" y1="10" x2="162" y2="10" stroke={layer.fillColor} strokeWidth="2" />
                          <line x1="198" y1="10" x2="360" y2="10" stroke={layer.fillColor} strokeWidth="2" />
                          <circle cx="154" cy="10" r="2.8" fill={layer.fillColor} />
                          <circle cx="206" cy="10" r="2.8" fill={layer.fillColor} />
                          <polygon points="180,2 192,10 180,18 168,10" fill={layer.fillColor} />
                          <polygon points="180,6 186,10 180,14 174,10" fill={layer.strokeColor} />
                        </svg>
                      )}
                      {layer.variant === 'rectangle' && (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundColor: layer.fillColor,
                            border:
                              layer.strokeWidth > 0 && layer.strokeColor !== 'transparent'
                                ? `${layer.strokeWidth * zoom}px solid ${layer.strokeColor}`
                                : undefined,
                            borderRadius: (layer.borderRadius || 0) * zoom,
                          }}
                        />
                      )}
                      {layer.variant === 'circle' && (
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            backgroundColor: layer.fillColor,
                            border:
                              layer.strokeWidth > 0 && layer.strokeColor !== 'transparent'
                                ? `${layer.strokeWidth * zoom}px solid ${layer.strokeColor}`
                                : undefined,
                          }}
                        />
                      )}
                      {layer.variant === 'seal_rosette' && (
                        <svg viewBox="0 0 200 200" className="w-full h-full">
                          <circle cx="100" cy="100" r="95" fill={layer.fillColor} />
                          <circle
                            cx="100"
                            cy="100"
                            r="78"
                            fill="none"
                            stroke={layer.strokeColor}
                            strokeWidth="4"
                          />
                          <circle
                            cx="100"
                            cy="100"
                            r="68"
                            fill="none"
                            stroke={layer.strokeColor}
                            strokeWidth="2"
                            strokeDasharray="5 5"
                            opacity="0.8"
                          />
                          <text
                            x="100"
                            y="73"
                            textAnchor="middle"
                            fill={layer.sealTextColor || '#FFFFFF'}
                            fontFamily="Montserrat, sans-serif"
                            fontWeight="700"
                            fontSize="16"
                          >
                            {(layer.sealTopText || 'SELLO OFICIAL').toUpperCase()}
                          </text>
                          <text
                            x="100"
                            y="108"
                            textAnchor="middle"
                            fill={layer.sealTextColor || '#FFFFFF'}
                            fontFamily="Cinzel, serif"
                            fontWeight="900"
                            fontSize="27"
                          >
                            {(layer.sealCenterText || 'SUMAK').toUpperCase()}
                          </text>
                          <text
                            x="100"
                            y="133"
                            textAnchor="middle"
                            fill={layer.sealTextColor || '#FFFFFF'}
                            fontFamily="Montserrat, sans-serif"
                            fontWeight="700"
                            fontSize="15"
                          >
                            {(layer.sealBottomText || 'ACADEMY').toUpperCase()}
                          </text>
                        </svg>
                      )}
                    </div>
                  )}

                  {/* QR LAYER RENDER */}
                  {layer.kind === 'qr' && (
                    <div className="w-full h-full flex flex-col items-center pointer-events-none">
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={
                          layer.showFrame
                            ? {
                                backgroundColor: layer.bgColor,
                                border: `${Math.max(1.5, 1.8 * zoom)}px solid ${layer.borderColor}`,
                                borderRadius: 6 * zoom,
                                padding: 4 * zoom,
                              }
                            : undefined
                        }
                      >
                        {qrPreviews[`${layer.fgColor}|${layer.bgColor}`] ? (
                          <img
                            src={qrPreviews[`${layer.fgColor}|${layer.bgColor}`]}
                            alt="QR Verificable"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-2/3 h-2/3 text-slate-700" />
                        )}
                      </div>
                      {layer.captionText?.trim() && (
                        <span
                          className="whitespace-nowrap font-bold uppercase mt-1"
                          style={{
                            color: layer.captionColor,
                            fontSize: Math.max(6, Math.min(layer.width, layer.height) * 0.095 * zoom),
                            fontFamily: 'Montserrat, sans-serif',
                          }}
                        >
                          {layer.captionText}
                        </span>
                      )}
                    </div>
                  )}

                  {/* RESIZE HANDLES WHEN SELECTED */}
                  {isSelected && !layer.locked && (
                    <>
                      {(['nw', 'ne', 'sw', 'se', 'e', 'w'] as const).map((handle) => {
                        const posStyle: Record<string, React.CSSProperties> = {
                          nw: { top: -5, left: -5, cursor: 'nwse-resize' },
                          ne: { top: -5, right: -5, cursor: 'nesw-resize' },
                          sw: { bottom: -5, left: -5, cursor: 'nesw-resize' },
                          se: { bottom: -5, right: -5, cursor: 'nwse-resize' },
                          e: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' },
                          w: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'ew-resize' },
                        };
                        return (
                          <div
                            key={handle}
                            onPointerDown={(e) => {
                              e.stopPropagation();
                              dragRef.current = {
                                kind: 'resize',
                                layerId: layer.id,
                                handle,
                                startClientX: e.clientX,
                                startClientY: e.clientY,
                                origX: layer.x,
                                origY: layer.y,
                                origW: layer.width,
                                origH: layer.height,
                              };
                            }}
                            style={posStyle[handle]}
                            className="absolute w-2.5 h-2.5 bg-white border-2 border-sky-500 rounded-xs shadow z-40"
                          />
                        );
                      })}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── RIGHT INSPECTOR PANEL ──────────────────────────────────────── */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Type size={14} className="text-[#1A4E26]" />
              {selectedLayer ? 'Propiedades de Capa' : 'Vista Previa & Atajos'}
            </h3>
            {selectedLayer && (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-700"
              >
                Deseleccionar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedLayer ? (
              <>
                {/* Layer Name + Quick Actions */}
                <div className="space-y-2">
                  <input
                    type="text"
                    value={selectedLayer.name}
                    onChange={(e) => updateLayer(selectedLayer.id, { name: e.target.value }, false)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-[#0B2913] bg-[#F8FBF8]"
                  />

                  <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => alignSelectedLayer('centerX')}
                      title="Centrar horizontalmente en la página"
                      className="flex-1 py-1.5 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition"
                    >
                      <AlignHorizontalJustifyCenter size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => alignSelectedLayer('centerY')}
                      title="Centrar verticalmente en la página"
                      className="flex-1 py-1.5 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition"
                    >
                      <AlignVerticalJustifyCenter size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayerOrder(selectedLayer.id, 'up')}
                      title="Traer hacia adelante"
                      className="flex-1 py-1.5 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveLayerOrder(selectedLayer.id, 'down')}
                      title="Enviar hacia atrás"
                      className="flex-1 py-1.5 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicateLayer(selectedLayer.id)}
                      title="Duplicar (Ctrl+D)"
                      className="flex-1 py-1.5 rounded-lg hover:bg-white text-slate-700 flex items-center justify-center transition"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateLayer(selectedLayer.id, { locked: !selectedLayer.locked })}
                      title={selectedLayer.locked ? 'Desbloquear' : 'Bloquear'}
                      className={`flex-1 py-1.5 rounded-lg hover:bg-white flex items-center justify-center transition ${
                        selectedLayer.locked ? 'text-amber-600 bg-amber-50' : 'text-slate-700'
                      }`}
                    >
                      {selectedLayer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLayer(selectedLayer.id)}
                      title="Eliminar capa (Supr)"
                      className="flex-1 py-1.5 rounded-lg hover:bg-red-50 text-red-500 flex items-center justify-center transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* TEXT LAYER INSPECTOR */}
                {selectedLayer.kind === 'text' && (
                  <div className="space-y-3.5 pt-2 border-t border-slate-100">
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">
                        Contenido del Texto
                      </label>
                      <textarea
                        rows={3}
                        value={selectedLayer.text}
                        onChange={(e) => updateLayer<TextLayer>(selectedLayer.id, { text: e.target.value })}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#1A4E26]"
                      />
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {[
                          { label: '+Nombre', token: '{{participant_name}}' },
                          { label: '+Curso', token: '{{course_name}}' },
                          { label: '+Fecha', token: '{{issue_date}}' },
                          { label: '+Registro', token: '{{diploma_number}}' },
                          { label: '+Código', token: '{{verification_code}}' },
                          { label: '+Firmante', token: '{{signatory_name}}' },
                        ].map((chip) => (
                          <button
                            key={chip.token}
                            type="button"
                            onClick={() =>
                              updateLayer<TextLayer>(selectedLayer.id, {
                                text: `${selectedLayer.text}${selectedLayer.text ? ' ' : ''}${chip.token}`,
                              })
                            }
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-[#EBF4ED] text-[#1A4E26] rounded hover:bg-[#1A4E26] hover:text-white transition"
                          >
                            {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Family */}
                    <div>
                      <label className="text-[11px] font-bold text-slate-600 block mb-1">Tipografía</label>
                      <select
                        value={selectedLayer.fontFamily}
                        onChange={(e) =>
                          updateLayer<TextLayer>(selectedLayer.id, {
                            fontFamily: e.target.value as TemplateFontFamily,
                          })
                        }
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white"
                      >
                        {TEMPLATE_FONTS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label} — {f.styleTag}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Size & Weight / Style Toggles */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">
                          Tamaño ({selectedLayer.fontSize}pt)
                        </label>
                        <input
                          type="number"
                          min={7}
                          max={96}
                          step={0.5}
                          value={selectedLayer.fontSize}
                          onChange={(e) =>
                            updateLayer<TextLayer>(selectedLayer.id, { fontSize: Number(e.target.value) || 12 })
                          }
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 block mb-1">Mayúsculas</label>
                        <select
                          value={selectedLayer.textTransform}
                          onChange={(e) =>
                            updateLayer<TextLayer>(selectedLayer.id, {
                              textTransform: e.target.value as TextLayer['textTransform'],
                            })
                          }
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value="none">Normal</option>
                          <option value="uppercase">MAYÚSCULAS</option>
                          <option value="capitalize">Tipo Título</option>
                        </select>
                      </div>
                    </div>

                    {/* Bold / Italic / Underline / Alignment */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateLayer<TextLayer>(selectedLayer.id, {
                            fontWeight: selectedLayer.fontWeight === '700' || selectedLayer.fontWeight === '900' ? '400' : '700',
                          })
                        }
                        className={`p-2 rounded-lg border text-xs ${
                          selectedLayer.fontWeight === '700' || selectedLayer.fontWeight === '900'
                            ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                            : 'border-slate-200 text-slate-600'
                        }`}
                        title="Negrita"
                      >
                        <Bold size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLayer<TextLayer>(selectedLayer.id, { italic: !selectedLayer.italic })}
                        className={`p-2 rounded-lg border text-xs ${
                          selectedLayer.italic
                            ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                            : 'border-slate-200 text-slate-600'
                        }`}
                        title="Cursiva"
                      >
                        <Italic size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLayer<TextLayer>(selectedLayer.id, { underline: !selectedLayer.underline })}
                        className={`p-2 rounded-lg border text-xs ${
                          selectedLayer.underline
                            ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                            : 'border-slate-200 text-slate-600'
                        }`}
                        title="Subrayado"
                      >
                        <Underline size={13} />
                      </button>
                      <div className="w-px h-5 bg-slate-200 mx-1" />
                      {(['left', 'center', 'right'] as const).map((al) => (
                        <button
                          key={al}
                          type="button"
                          onClick={() => updateLayer<TextLayer>(selectedLayer.id, { align: al })}
                          className={`p-2 rounded-lg border text-xs ${
                            selectedLayer.align === al
                              ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                              : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          {al === 'left' ? <AlignLeft size={13} /> : al === 'center' ? <AlignCenter size={13} /> : <AlignRight size={13} />}
                        </button>
                      ))}
                    </div>

                    {/* Text Color + SUMAK Swatches */}
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Color de Texto</label>
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          type="color"
                          value={selectedLayer.color}
                          onChange={(e) => updateLayer<TextLayer>(selectedLayer.id, { color: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedLayer.color}
                          onChange={(e) => updateLayer<TextLayer>(selectedLayer.id, { color: e.target.value })}
                          className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                        />
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {SUMAK_COLOR_SWATCHES.map((hex) => (
                          <button
                            key={hex}
                            type="button"
                            onClick={() => updateLayer<TextLayer>(selectedLayer.id, { color: hex })}
                            className="w-5 h-5 rounded-full border border-slate-300"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Letter Spacing & Line Height */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">
                          Espaciado ({selectedLayer.letterSpacing}px)
                        </span>
                        <input
                          type="range"
                          min={-1}
                          max={8}
                          step={0.2}
                          value={selectedLayer.letterSpacing || 0}
                          onChange={(e) =>
                            updateLayer<TextLayer>(selectedLayer.id, { letterSpacing: Number(e.target.value) })
                          }
                          className="w-full accent-[#1A4E26]"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-500">
                          Interlineado ({selectedLayer.lineHeight})
                        </span>
                        <input
                          type="range"
                          min={1}
                          max={2}
                          step={0.05}
                          value={selectedLayer.lineHeight || 1.25}
                          onChange={(e) =>
                            updateLayer<TextLayer>(selectedLayer.id, { lineHeight: Number(e.target.value) })
                          }
                          className="w-full accent-[#1A4E26]"
                        />
                      </div>
                    </div>

                    {/* Optional Pill Badge & Shadow */}
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedLayer.shadowEnabled)}
                          onChange={(e) =>
                            updateLayer<TextLayer>(selectedLayer.id, { shadowEnabled: e.target.checked })
                          }
                          className="accent-[#1A4E26]"
                        />
                        Sombra sutil de texto
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={Boolean(selectedLayer.pillBackground)}
                          onChange={(e) =>
                            updateLayer<TextLayer>(selectedLayer.id, {
                              pillBackground: e.target.checked ? '#1A4E26' : null,
                            })
                          }
                          className="accent-[#1A4E26]"
                        />
                        Fondo tipo etiqueta / cinta
                      </label>
                      {selectedLayer.pillBackground && (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="color"
                            value={selectedLayer.pillBackground}
                            onChange={(e) =>
                              updateLayer<TextLayer>(selectedLayer.id, { pillBackground: e.target.value })
                            }
                            className="w-7 h-7 rounded border border-slate-200"
                          />
                          <span className="text-[10px] font-bold text-slate-500">Color de etiqueta</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* IMAGE LAYER INSPECTOR */}
                {selectedLayer.kind === 'image' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <img
                        src={selectedLayer.src}
                        alt={selectedLayer.name}
                        className="w-12 h-12 object-contain bg-white rounded border border-slate-200 p-1"
                      />
                      <label className="text-xs font-bold text-[#1A4E26] cursor-pointer hover:underline">
                        Reemplazar imagen PNG
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          onChange={(e) => handleUploadGraphic(e, true)}
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateLayer<ImageLayer>(selectedLayer.id, { objectFit: 'contain' })}
                        className={`py-1.5 rounded-lg text-xs font-bold border ${
                          selectedLayer.objectFit === 'contain'
                            ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Contener (Proporción)
                      </button>
                      <button
                        type="button"
                        onClick={() => updateLayer<ImageLayer>(selectedLayer.id, { objectFit: 'cover' })}
                        className={`py-1.5 rounded-lg text-xs font-bold border ${
                          selectedLayer.objectFit === 'cover'
                            ? 'bg-[#1A4E26] text-white border-[#1A4E26]'
                            : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        Cubrir (Recorte)
                      </button>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Esquinas redondeadas ({selectedLayer.borderRadius}px)
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={selectedLayer.borderRadius || 0}
                        onChange={(e) =>
                          updateLayer<ImageLayer>(selectedLayer.id, { borderRadius: Number(e.target.value) })
                        }
                        className="w-full accent-[#1A4E26]"
                      />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(selectedLayer.shadowEnabled)}
                        onChange={(e) =>
                          updateLayer<ImageLayer>(selectedLayer.id, { shadowEnabled: e.target.checked })
                        }
                        className="accent-[#1A4E26]"
                      />
                      Sombra flotante suave
                    </label>
                  </div>
                )}

                {/* SHAPE LAYER INSPECTOR */}
                {selectedLayer.kind === 'shape' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Color Relleno</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedLayer.fillColor === 'transparent' ? '#FFFFFF' : selectedLayer.fillColor}
                            onChange={(e) => updateLayer<ShapeLayer>(selectedLayer.id, { fillColor: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-200"
                          />
                          <span className="text-[10px] font-mono">{selectedLayer.fillColor}</span>
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Color Borde/Acento</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={selectedLayer.strokeColor === 'transparent' ? '#0B2913' : selectedLayer.strokeColor}
                            onChange={(e) => updateLayer<ShapeLayer>(selectedLayer.id, { strokeColor: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-200"
                          />
                          <span className="text-[10px] font-mono">{selectedLayer.strokeColor}</span>
                        </div>
                      </label>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Grosor de línea/borde ({selectedLayer.strokeWidth}px)
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={8}
                        step={0.5}
                        value={selectedLayer.strokeWidth}
                        onChange={(e) =>
                          updateLayer<ShapeLayer>(selectedLayer.id, { strokeWidth: Number(e.target.value) })
                        }
                        className="w-full accent-[#1A4E26]"
                      />
                    </div>

                    {selectedLayer.variant === 'seal_rosette' && (
                      <div className="space-y-2 bg-[#F8FBF8] p-2.5 rounded-xl border border-[#C8D8CB]">
                        <p className="text-[10px] font-black uppercase text-[#1A4E26]">Textos del Sello</p>
                        <input
                          type="text"
                          value={selectedLayer.sealTopText || ''}
                          onChange={(e) => updateLayer<ShapeLayer>(selectedLayer.id, { sealTopText: e.target.value })}
                          placeholder="Línea superior (SELLO OFICIAL)"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                        />
                        <input
                          type="text"
                          value={selectedLayer.sealCenterText || ''}
                          onChange={(e) => updateLayer<ShapeLayer>(selectedLayer.id, { sealCenterText: e.target.value })}
                          placeholder="Línea central (SUMAK)"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white font-bold"
                        />
                        <input
                          type="text"
                          value={selectedLayer.sealBottomText || ''}
                          onChange={(e) => updateLayer<ShapeLayer>(selectedLayer.id, { sealBottomText: e.target.value })}
                          placeholder="Línea inferior (ACADEMY)"
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs bg-white"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* QR LAYER INSPECTOR */}
                {selectedLayer.kind === 'qr' && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block text-center">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">QR</span>
                        <input
                          type="color"
                          value={selectedLayer.fgColor}
                          onChange={(e) => updateLayer<QrLayer>(selectedLayer.id, { fgColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 mx-auto block"
                        />
                      </label>
                      <label className="block text-center">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Fondo</span>
                        <input
                          type="color"
                          value={selectedLayer.bgColor}
                          onChange={(e) => updateLayer<QrLayer>(selectedLayer.id, { bgColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 mx-auto block"
                        />
                      </label>
                      <label className="block text-center">
                        <span className="text-[10px] font-bold text-slate-500 block mb-1">Marco</span>
                        <input
                          type="color"
                          value={selectedLayer.borderColor}
                          onChange={(e) => updateLayer<QrLayer>(selectedLayer.id, { borderColor: e.target.value })}
                          className="w-8 h-8 rounded border border-slate-200 mx-auto block"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedLayer.showFrame}
                        onChange={(e) => updateLayer<QrLayer>(selectedLayer.id, { showFrame: e.target.checked })}
                        className="accent-[#1A4E26]"
                      />
                      Mostrar recuadro elegante alrededor del QR
                    </label>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">Leyenda debajo del QR</label>
                      <input
                        type="text"
                        value={selectedLayer.captionText}
                        onChange={(e) => updateLayer<QrLayer>(selectedLayer.id, { captionText: e.target.value })}
                        placeholder="Ej: ESCANEA PARA VERIFICAR"
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>
                )}

                {/* GEOMETRY: X, Y, W, H, ROTATION, OPACITY */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Posición, Tamaño y Rotación
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500">X (Horizontal)</span>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.x)}
                        onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500">Y (Vertical)</span>
                      <input
                        type="number"
                        value={Math.round(selectedLayer.y)}
                        onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500">Ancho</span>
                      <input
                        type="number"
                        min={16}
                        value={Math.round(selectedLayer.width)}
                        onChange={(e) => updateLayer(selectedLayer.id, { width: Math.max(16, Number(e.target.value)) })}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-bold text-slate-500">Alto</span>
                      <input
                        type="number"
                        min={4}
                        value={Math.round(selectedLayer.height)}
                        onChange={(e) => updateLayer(selectedLayer.id, { height: Math.max(4, Number(e.target.value)) })}
                        className="w-full px-2 py-1 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">Rotación ({selectedLayer.rotation}°)</span>
                      <input
                        type="range"
                        min={-45}
                        max={45}
                        value={selectedLayer.rotation || 0}
                        onChange={(e) => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                        className="w-full accent-[#1A4E26]"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500">
                        Opacidad ({Math.round((selectedLayer.opacity ?? 1) * 100)}%)
                      </span>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={selectedLayer.opacity ?? 1}
                        onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                        className="w-full accent-[#1A4E26]"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* NO SELECTION: LIVE DATA SIMULATOR + SHORTCUTS */
              <div className="space-y-4">
                <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-3.5 space-y-2.5">
                  <p className="text-xs font-black text-[#0B2913] flex items-center gap-1.5">
                    <Eye size={14} className="text-[#1A4E26]" /> Simulador de Datos Reales
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Prueba cómo lucirá tu diseño con nombres largos o cortos antes de guardarlo:
                  </p>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Nombre de prueba</label>
                    <input
                      type="text"
                      value={sampleName}
                      onChange={(e) => setSampleName(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-0.5">Curso / Programa de prueba</label>
                    <input
                      type="text"
                      value={sampleCourse}
                      onChange={(e) => setSampleCourse(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5 text-[11px] text-slate-600">
                  <p className="font-black text-slate-800 mb-1">💡 Atajos Rápidos del Estudio</p>
                  <p>• <strong>Arrastra</strong> cualquier elemento para moverlo (se imanta al centro).</p>
                  <p>• <strong>Esquinas azules</strong> para cambiar ancho, alto o tamaño de PNGs.</p>
                  <p>• <strong>Flechas del teclado</strong> para ajuste fino de 1pt (<strong>Shift + Flecha</strong> = 10pt).</p>
                  <p>• <strong>Ctrl + Z / Ctrl + Y</strong> para Deshacer / Rehacer.</p>
                  <p>• <strong>Ctrl + D</strong> para Duplicar la capa seleccionada.</p>
                  <p>• <strong>Supr</strong> para eliminar la capa seleccionada.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
