import { useEffect, useMemo, useState } from 'react';
import {
  Package, Plus, Search, Pencil, Trash2, Eye, EyeOff, ImagePlus,
  AlertCircle, CheckCircle2, Loader2, X, Tag, Star, Sparkles, Download,
  DollarSign, Percent, Upload, RefreshCw, ArrowUpDown,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../lib/toast';
import { useProducts, type ProductoExtended } from '../../lib/productos';
import { products as staticProducts, categoryFilters } from '../../data';
import Modal from '../../components/Modal';

const STORAGE_BUCKET = 'producto-imagenes';

/** Devuelve la URL publica para mostrar una imagen, sea de storage o local. */
function imagenSrc(imagen: string | undefined | null): string | null {
  if (!imagen) return null;
  if (imagen.startsWith('http://') || imagen.startsWith('https://')) return imagen;
  if (imagen.startsWith('/')) return imagen;
  // Es una ruta de storage relativa al bucket
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(imagen);
  return data.publicUrl;
}

// ─────────────────────────────────────────────────────────────
// EDIT MODAL (crear o editar)
// ─────────────────────────────────────────────────────────────
interface FormState {
  codigo: string;
  slug: string;
  nombre: string;
  categoria: string;
  categoria_key: string;
  pvp: string;
  precio_distribuidor: string;
  descripcion: string;
  imagen: string;
  tagline: string;
  presentacion: string;
  detalle_largo: string;
  modo_uso: string;
  precauciones: string;
  revista_pagina: string;
  beneficios: string;     // textarea, 1 por linea
  ingredientes: string;   // textarea, 1 por linea
  destacado: boolean;
  nuevo: boolean;
  bestseller: boolean;
  proximamente: boolean;
  activo: boolean;
  descuento_porcentaje: string;
  descuento_activo: boolean;
  descuento_label: string;
  orden: string;
}

function emptyForm(): FormState {
  return {
    codigo: '', slug: '', nombre: '', categoria: '', categoria_key: 'bebidas',
    pvp: '', precio_distribuidor: '', descripcion: '',
    imagen: '', tagline: '', presentacion: '',
    detalle_largo: '', modo_uso: '', precauciones: '', revista_pagina: '',
    beneficios: '', ingredientes: '',
    destacado: false, nuevo: false, bestseller: false, proximamente: false, activo: true,
    descuento_porcentaje: '', descuento_activo: false, descuento_label: '',
    orden: '0',
  };
}

function fromProducto(p: ProductoExtended): FormState {
  return {
    codigo: p.codigo,
    slug: p.slug,
    nombre: p.nombre,
    categoria: p.categoria,
    categoria_key: p.categoriaKey,
    pvp: p.pvp.toString(),
    precio_distribuidor: p.precioDistribuidor?.toString() ?? '',
    descripcion: p.descripcion,
    imagen: p.imagen ?? '',
    tagline: p.tagline ?? '',
    presentacion: p.presentacion ?? '',
    detalle_largo: p.detalleLargo ?? '',
    modo_uso: p.modoUso ?? '',
    precauciones: p.precauciones ?? '',
    revista_pagina: p.revistaPagina ?? '',
    beneficios: (p.beneficios ?? []).join('\n'),
    ingredientes: (p.ingredientes ?? []).join('\n'),
    destacado: !!p.destacado,
    nuevo: !!p.nuevo,
    bestseller: !!p.bestseller,
    proximamente: !!p.proximamente,
    activo: p.activo,
    descuento_porcentaje: p.descuentoPorcentaje?.toString() ?? '',
    descuento_activo: p.descuentoActivo,
    descuento_label: p.descuentoLabel ?? '',
    orden: p.orden.toString(),
  };
}

function ProductoFormModal({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: ProductoExtended | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<'general' | 'contenido' | 'descuento' | 'flags'>('general');

  useEffect(() => {
    if (open) {
      setForm(editing ? fromProducto(editing) : emptyForm());
      setError(null);
      setSaving(false);
      setTab('general');
    }
  }, [open, editing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function slugify(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async function handleImageUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no debe superar los 5 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${form.slug || slugify(form.nombre) || 'producto'}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      set('imagen', data.publicUrl);
      toast.success('Imagen subida.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error subiendo imagen.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.codigo.trim()) { setError('Falta el código del producto.'); setTab('general'); return; }
    if (!form.nombre.trim()) { setError('Falta el nombre.'); setTab('general'); return; }
    if (!form.slug.trim()) { setError('Falta el slug.'); setTab('general'); return; }
    if (!form.categoria.trim()) { setError('Falta la categoria.'); setTab('general'); return; }
    if (!form.categoria_key.trim()) { setError('Falta la clave de categoria.'); setTab('general'); return; }
    const pvp = Number(form.pvp);
    if (!Number.isFinite(pvp) || pvp < 0) { setError('PVP invalido.'); setTab('general'); return; }
    const precioDist = form.precio_distribuidor.trim() ? Number(form.precio_distribuidor) : null;
    if (precioDist !== null && (!Number.isFinite(precioDist) || precioDist < 0)) {
      setError('Precio de distribuidor invalido.'); setTab('general'); return;
    }
    let descuentoPct: number | null = null;
    if (form.descuento_porcentaje.trim()) {
      descuentoPct = Number(form.descuento_porcentaje);
      if (!Number.isFinite(descuentoPct) || descuentoPct < 0 || descuentoPct > 100) {
        setError('Descuento debe estar entre 0 y 100.'); setTab('descuento'); return;
      }
    }

    setSaving(true);
    const payload = {
      codigo: form.codigo.trim(),
      slug: form.slug.trim(),
      nombre: form.nombre.trim(),
      categoria: form.categoria.trim(),
      categoria_key: form.categoria_key.trim(),
      pvp,
      precio_distribuidor: precioDist,
      descripcion: form.descripcion.trim(),
      imagen: form.imagen.trim() || null,
      tagline: form.tagline.trim() || null,
      presentacion: form.presentacion.trim() || null,
      detalle_largo: form.detalle_largo.trim() || null,
      modo_uso: form.modo_uso.trim() || null,
      precauciones: form.precauciones.trim() || null,
      revista_pagina: form.revista_pagina.trim() || null,
      beneficios: form.beneficios.split('\n').map((s) => s.trim()).filter(Boolean),
      ingredientes: form.ingredientes.split('\n').map((s) => s.trim()).filter(Boolean),
      destacado: form.destacado,
      nuevo: form.nuevo,
      bestseller: form.bestseller,
      proximamente: form.proximamente,
      activo: form.activo,
      descuento_porcentaje: descuentoPct,
      descuento_activo: form.descuento_activo && descuentoPct !== null && descuentoPct > 0,
      descuento_label: form.descuento_label.trim() || null,
      orden: Number(form.orden) || 0,
    };

    try {
      if (editing && editing.dbId) {
        const { error: updErr } = await supabase
          .from('productos')
          .update(payload)
          .eq('id', editing.dbId);
        if (updErr) throw new Error(updErr.message);
        toast.success('Producto actualizado.');
      } else {
        const { error: insErr } = await supabase
          .from('productos')
          .insert(payload);
        if (insErr) throw new Error(insErr.message);
        toast.success('Producto creado.');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  const previewSrc = imagenSrc(form.imagen);

  return (
    <Modal
      open={open}
      onClose={saving ? () => {} : onClose}
      title={editing ? `Editar producto: ${editing.nombre}` : 'Nuevo producto'}
      subtitle={editing ? `Código ${editing.codigo}` : undefined}
      size="xl"
      closeOnBackdrop={!saving}
      showClose={!saving}
      labelledById="prod-form-title"
    >
      <form onSubmit={handleSubmit} className="px-6 py-5">
        {/* Tabs */}
        <div className="flex gap-1 bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-1 mb-5 w-fit overflow-x-auto">
          {([
            { key: 'general', label: 'General' },
            { key: 'contenido', label: 'Contenido' },
            { key: 'descuento', label: 'Descuento' },
            { key: 'flags', label: 'Visibilidad' },
          ] as const).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                tab === t.key
                  ? 'bg-[#1A4E26] text-white'
                  : 'text-[#6B7280] hover:text-[#111111]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB GENERAL */}
        {tab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Código <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required value={form.codigo}
                  onChange={(e) => set('codigo', e.target.value)}
                  placeholder="00001"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required value={form.nombre}
                  onChange={(e) => {
                    const newName = e.target.value;
                    set('nombre', newName);
                    if (!editing && !form.slug) set('slug', slugify(newName));
                  }}
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Slug (URL) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text" required value={form.slug}
                  onChange={(e) => set('slug', slugify(e.target.value))}
                  placeholder="te-extractos-de-la-vida"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Categoria clave <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.categoria_key}
                  onChange={(e) => set('categoria_key', e.target.value)}
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
                >
                  {categoryFilters.filter((c) => c.key !== 'todos').map((c) => (
                    <option key={c.key} value={c.key}>{c.label} ({c.key})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Categoria (label visible) <span className="text-red-500">*</span>
              </label>
              <input
                type="text" required value={form.categoria}
                onChange={(e) => set('categoria', e.target.value)}
                placeholder="Bebida a base de hierbas"
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  PVP $ <span className="text-red-500">*</span>
                </label>
                <input
                  type="number" step="0.01" min="0" required value={form.pvp}
                  onChange={(e) => set('pvp', e.target.value)}
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Precio distribuidor $ <span className="text-[#9CA3AF] font-normal">(opcional)</span>
                </label>
                <input
                  type="number" step="0.01" min="0" value={form.precio_distribuidor}
                  onChange={(e) => set('precio_distribuidor', e.target.value)}
                  placeholder="Default = 50% del PVP"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Orden (menor = primero)
                </label>
                <input
                  type="number" step="1" value={form.orden}
                  onChange={(e) => set('orden', e.target.value)}
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Descripción corta
              </label>
              <textarea
                value={form.descripcion}
                onChange={(e) => set('descripcion', e.target.value)}
                rows={2}
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>

            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Tagline
              </label>
              <input
                type="text" value={form.tagline}
                onChange={(e) => set('tagline', e.target.value)}
                placeholder="Limpia · Desintoxica · Regenera"
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>

            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Presentación
              </label>
              <input
                type="text" value={form.presentacion}
                onChange={(e) => set('presentacion', e.target.value)}
                placeholder="Botella de 1000 ml"
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>

            {/* Imagen */}
            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Imagen principal
              </label>
              <div className="flex gap-3 items-start">
                <div className="w-24 h-24 rounded-xl border border-[#C8D8CB] bg-[#F4F7F5] flex items-center justify-center overflow-hidden shrink-0">
                  {previewSrc ? (
                    <img src={previewSrc} alt="Preview" className="w-full h-full object-contain" />
                  ) : (
                    <ImagePlus size={28} className="text-[#9CA3AF]" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text" value={form.imagen}
                    onChange={(e) => set('imagen', e.target.value)}
                    placeholder="URL o ruta /products/foo.png"
                    className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2 text-[#111111] text-xs font-mono focus:outline-none focus:border-[#1A4E26]"
                  />
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1A4E26] text-white text-xs font-bold cursor-pointer hover:bg-[#163F1E] transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                      className="sr-only"
                    />
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploading ? 'Subiendo...' : 'Subir imagen'}
                  </label>
                  <p className="text-[10px] text-[#9CA3AF]">JPG, PNG, WebP. Máx 5 MB.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENIDO */}
        {tab === 'contenido' && (
          <div className="space-y-4">
            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Detalle largo
              </label>
              <textarea
                value={form.detalle_largo}
                onChange={(e) => set('detalle_largo', e.target.value)}
                rows={4}
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Beneficios <span className="text-[#9CA3AF] font-normal">(uno por línea)</span>
                </label>
                <textarea
                  value={form.beneficios}
                  onChange={(e) => set('beneficios', e.target.value)}
                  rows={8}
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Ingredientes <span className="text-[#9CA3AF] font-normal">(uno por línea)</span>
                </label>
                <textarea
                  value={form.ingredientes}
                  onChange={(e) => set('ingredientes', e.target.value)}
                  rows={8}
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Modo de uso
              </label>
              <textarea
                value={form.modo_uso}
                onChange={(e) => set('modo_uso', e.target.value)}
                rows={3}
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Precauciones
              </label>
              <textarea
                value={form.precauciones}
                onChange={(e) => set('precauciones', e.target.value)}
                rows={3}
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
              />
            </div>
            <div>
              <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Revista (imagen completa) — ruta o URL
              </label>
              <input
                type="text" value={form.revista_pagina}
                onChange={(e) => set('revista_pagina', e.target.value)}
                placeholder="/products/revista/foo.jpg"
                className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
              />
            </div>
          </div>
        )}

        {/* TAB DESCUENTO */}
        {tab === 'descuento' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-[#FFFDF5] border border-[#D4AF37]/30 rounded-xl p-4">
              <Percent size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
              <p className="text-[#92680A] text-xs leading-relaxed">
                Aplicar un descuento por porcentaje sobre el PVP. Cuando esté activo, el precio mostrado en la tienda
                será PVP × (1 − %). El precio del distribuidor NO se afecta.
              </p>
            </div>

            <label className="flex items-center gap-3 bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 cursor-pointer hover:border-[#A8C2AD] transition-colors">
              <input
                type="checkbox"
                checked={form.descuento_activo}
                onChange={(e) => set('descuento_activo', e.target.checked)}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <div className="flex-1">
                <p className="text-[#111111] text-sm font-bold">Descuento activo</p>
                <p className="text-[#6B7280] text-xs">Si está apagado el PVP se muestra sin modificar.</p>
              </div>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Porcentaje (0-100)
                </label>
                <input
                  type="number" step="0.5" min="0" max="100"
                  value={form.descuento_porcentaje}
                  onChange={(e) => set('descuento_porcentaje', e.target.value)}
                  placeholder="15"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm font-mono focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
              <div>
                <label className="block text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Etiqueta visible
                </label>
                <input
                  type="text" value={form.descuento_label}
                  onChange={(e) => set('descuento_label', e.target.value)}
                  placeholder="Promo Sumak"
                  className="w-full bg-white border border-[#C8D8CB] rounded-xl px-3 py-2.5 text-[#111111] text-sm focus:outline-none focus:border-[#1A4E26]"
                />
              </div>
            </div>

            {form.descuento_porcentaje && Number(form.pvp) > 0 && (
              <div className="bg-[#EBF4ED] border border-[#1A4E26]/30 rounded-xl p-4 text-sm">
                <p className="text-[#1A4E26] text-xs font-bold uppercase tracking-wider mb-1">Vista previa</p>
                <p className="text-[#111111]">
                  PVP original: <strong>${Number(form.pvp).toFixed(2)}</strong>
                  {' → '}
                  Precio con descuento: <strong className="text-[#D4AF37]">
                    ${(Number(form.pvp) * (1 - Number(form.descuento_porcentaje) / 100)).toFixed(2)}
                  </strong>
                  {' '}
                  (ahorra ${(Number(form.pvp) * Number(form.descuento_porcentaje) / 100).toFixed(2)})
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB FLAGS */}
        {tab === 'flags' && (
          <div className="space-y-3">
            {[
              { key: 'activo' as const, label: 'Activo en tienda', desc: 'Visible para el público y los distribuidores.', icon: <Eye size={14} /> },
              { key: 'destacado' as const, label: 'Destacado', desc: 'Aparece en el home y secciones destacadas.', icon: <Star size={14} /> },
              { key: 'bestseller' as const, label: 'Bestseller', desc: 'Etiqueta de los más vendidos.', icon: <Sparkles size={14} /> },
              { key: 'nuevo' as const, label: 'Nuevo', desc: 'Lleva el badge de Novedad.', icon: <Tag size={14} /> },
              { key: 'proximamente' as const, label: 'Próximamente', desc: 'No se puede comprar todavía.', icon: <RefreshCw size={14} /> },
            ].map((flag) => (
              <label
                key={flag.key}
                className="flex items-center gap-3 bg-white border border-[#C8D8CB] rounded-xl px-4 py-3 cursor-pointer hover:border-[#A8C2AD] transition-colors"
              >
                <input
                  type="checkbox"
                  checked={form[flag.key]}
                  onChange={(e) => set(flag.key, e.target.checked)}
                  className="accent-[#1A4E26] w-4 h-4"
                />
                <span className="text-[#1A4E26]">{flag.icon}</span>
                <div className="flex-1">
                  <p className="text-[#111111] text-sm font-bold">{flag.label}</p>
                  <p className="text-[#6B7280] text-xs">{flag.desc}</p>
                </div>
              </label>
            ))}
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex gap-3 pt-5 mt-4 border-t border-[#C8D8CB]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-[1.5] py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" /> Guardando…</>
            ) : (
              <><CheckCircle2 size={14} /> {editing ? 'Guardar cambios' : 'Crear producto'}</>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────
export default function AdminProductos() {
  const { isAdmin, isOperaciones } = useAuth();
  const toast = useToast();
  const { all, loading, fromDb, reload } = useProducts();

  const [search, setSearch] = useState('');
  const [categoria, setCategoria] = useState<string>('todos');
  const [mostrarInactivos, setMostrarInactivos] = useState(true);
  const [editing, setEditing] = useState<ProductoExtended | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ProductoExtended | null>(null);

  const canWrite = isAdmin || isOperaciones;

  const list = useMemo(() => {
    let l = all;
    if (!mostrarInactivos) l = l.filter((p) => p.activo);
    if (categoria !== 'todos') l = l.filter((p) => p.categoriaKey === categoria);
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      l = l.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q),
      );
    }
    return l;
  }, [all, mostrarInactivos, categoria, search]);

  const stats = useMemo(() => ({
    total: all.length,
    activos: all.filter((p) => p.activo).length,
    descuento: all.filter((p) => p.descuentoActivo).length,
    proximamente: all.filter((p) => p.proximamente).length,
  }), [all]);

  async function handleSeedInitial() {
    if (!canWrite) return;
    setSeeding(true);
    try {
      const payload = staticProducts.map((p, idx) => ({
        codigo: p.codigo,
        slug: p.slug,
        nombre: p.nombre,
        categoria: p.categoria,
        categoria_key: p.categoriaKey,
        pvp: p.pvp,
        precio_distribuidor: p.precioDistribuidor ?? null,
        descripcion: p.descripcion,
        imagen: p.imagen ?? null,
        tagline: p.tagline ?? null,
        presentacion: p.presentacion ?? null,
        detalle_largo: p.detalleLargo ?? null,
        modo_uso: p.modoUso ?? null,
        precauciones: p.precauciones ?? null,
        revista_pagina: p.revistaPagina ?? null,
        beneficios: p.beneficios ?? [],
        ingredientes: p.ingredientes ?? [],
        destacado: !!p.destacado,
        nuevo: !!p.nuevo,
        bestseller: !!p.bestseller,
        proximamente: !!p.proximamente,
        orden: idx,
      }));
      const { error } = await supabase.rpc('seed_productos_bulk', { p_productos: payload });
      if (error) throw new Error(error.message);
      toast.success('Catalogo inicial importado.');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al importar catalogo.');
    } finally {
      setSeeding(false);
    }
  }

  async function handleDelete(p: ProductoExtended) {
    if (!p.dbId) {
      toast.error('Producto sin id de base de datos.');
      return;
    }
    setDeletingId(p.dbId);
    try {
      const { error } = await supabase.from('productos').delete().eq('id', p.dbId);
      if (error) throw new Error(error.message);
      toast.success('Producto eliminado.');
      setConfirmDelete(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar.');
    } finally {
      setDeletingId(null);
    }
  }

  async function toggleActivo(p: ProductoExtended) {
    if (!p.dbId) return;
    const { error } = await supabase
      .from('productos')
      .update({ activo: !p.activo })
      .eq('id', p.dbId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(p.activo ? 'Producto ocultado.' : 'Producto publicado.');
    await reload();
  }

  if (!canWrite) {
    return (
      <div className="bg-white border border-red-200 rounded-2xl p-8 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-red-600" />
        <h2 className="font-heading font-bold text-lg text-[#111111] mb-1">Acceso restringido</h2>
        <p className="text-[#6B7280] text-sm">Solo admin y operaciones pueden gestionar el catálogo.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
            <Package size={24} className="text-[#1A4E26]" />
            Gestionar Productos
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            Edita precios, descuentos, imágenes, contenido y visibilidad del catálogo.
          </p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1A4E26] text-white text-sm font-bold hover:bg-[#163F1E] transition-all shadow-[0_4px_12px_rgba(26,78,38,0.2)]"
        >
          <Plus size={16} /> Nuevo producto
        </button>
      </div>

      {/* Banner: tabla vacia → ofrece importar */}
      {!loading && !fromDb && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex items-start gap-3 flex-wrap">
          <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-[240px]">
            <p className="text-amber-900 text-sm font-bold mb-0.5">Catálogo en modo estático</p>
            <p className="text-amber-800 text-xs leading-relaxed">
              La tabla <code>productos</code> está vacía. Estás viendo el catálogo del código (fallback).
              Importa los {staticProducts.length} productos para empezar a editarlos desde aquí.
            </p>
          </div>
          <button
            onClick={handleSeedInitial}
            disabled={seeding}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-60 transition-all"
          >
            {seeding ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
            {seeding ? 'Importando...' : 'Importar catálogo inicial'}
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, icon: <Package size={16} />, color: 'text-[#1A4E26]' },
          { label: 'Activos', value: stats.activos, icon: <Eye size={16} />, color: 'text-[#1A4E26]' },
          { label: 'Con descuento', value: stats.descuento, icon: <Percent size={16} />, color: 'text-[#D4AF37]' },
          { label: 'Próximamente', value: stats.proximamente, icon: <RefreshCw size={16} />, color: 'text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#C8D8CB] rounded-2xl p-4">
            <div className={`flex items-center gap-1.5 mb-1 ${s.color}`}>
              {s.icon}
              <p className="text-[10px] uppercase tracking-widest font-bold">{s.label}</p>
            </div>
            <p className="font-heading font-bold text-2xl text-[#111111]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className="bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl px-3 py-2 text-xs font-medium text-[#111111] focus:outline-none cursor-pointer"
        >
          <option value="todos">Todas las categorías</option>
          {categoryFilters.filter((c) => c.key !== 'todos').map((c) => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-xs text-[#6B7280] cursor-pointer">
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={(e) => setMostrarInactivos(e.target.checked)}
            className="accent-[#1A4E26]"
          />
          Mostrar inactivos
        </label>

        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, código o slug..."
            className="w-full pl-9 pr-3 py-2 bg-[#FAFBFA] border border-[#C8D8CB] rounded-xl text-xs text-[#111111] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1A4E26]"
          />
        </div>

        <button
          onClick={reload}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-xs font-medium hover:border-[#A8C2AD] hover:text-[#111111] transition-colors"
        >
          <RefreshCw size={12} /> Refrescar
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-[#1A4E26]" />
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-16 text-center text-[#6B7280]">
            <Package size={40} className="mx-auto mb-3 text-[#9CA3AF] opacity-30" />
            <p className="text-lg font-bold mb-1 text-[#111111]">Sin productos</p>
            <p className="text-sm">No hay productos con los filtros actuales.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#C8D8CB] bg-[#F4F7F5]">
                  {['Producto', 'Categoría', 'PVP', 'Precio dist.', 'Flags', 'Acciones'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[#9CA3AF] text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((p) => {
                  const previewSrc = imagenSrc(p.imagen);
                  return (
                    <tr
                      key={p.codigo}
                      className={`border-b border-[#C8D8CB] last:border-0 hover:bg-[#FAFBFA] transition-colors ${
                        !p.activo ? 'opacity-60' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-[#F4F7F5] border border-[#C8D8CB] overflow-hidden flex items-center justify-center shrink-0">
                            {previewSrc ? (
                              <img src={previewSrc} alt={p.nombre} className="w-full h-full object-contain" />
                            ) : (
                              <Package size={18} className="text-[#9CA3AF]" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[#111111] text-xs font-bold truncate">{p.nombre}</p>
                            <p className="text-[#9CA3AF] text-[10px] font-mono">{p.codigo} · {p.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[#111111] text-xs">{p.categoria}</p>
                        <p className="text-[#9CA3AF] text-[10px] font-mono">{p.categoriaKey}</p>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {p.descuentoActivo && p.pvpFinal !== p.pvp ? (
                          <div>
                            <p className="text-[#D4AF37] font-bold text-xs">${p.pvpFinal.toFixed(2)}</p>
                            <p className="text-[#9CA3AF] text-[10px] line-through">${p.pvp.toFixed(2)}</p>
                          </div>
                        ) : (
                          <p className="text-[#111111] font-bold text-xs">${p.pvp.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-[#6B7280]">
                        {p.precioDistribuidor !== undefined
                          ? <span className="font-bold text-[#1A4E26]">${p.precioDistribuidor.toFixed(2)}</span>
                          : <span className="italic text-[#9CA3AF]">50% del PVP</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {p.activo
                            ? <span className="inline-flex items-center gap-0.5 bg-[#EBF4ED] text-[#1A4E26] border border-[#1A4E26]/30 px-1.5 py-0.5 rounded text-[9px] font-bold"><Eye size={9} /> activo</span>
                            : <span className="inline-flex items-center gap-0.5 bg-[#F4F7F5] text-[#9CA3AF] border border-[#C8D8CB] px-1.5 py-0.5 rounded text-[9px] font-bold"><EyeOff size={9} /> oculto</span>}
                          {p.destacado && <span className="bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded text-[9px] font-bold">★ destacado</span>}
                          {p.bestseller && <span className="bg-purple-50 text-purple-600 border border-purple-200 px-1.5 py-0.5 rounded text-[9px] font-bold">bestseller</span>}
                          {p.nuevo && <span className="bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded text-[9px] font-bold">nuevo</span>}
                          {p.proximamente && <span className="bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded text-[9px] font-bold">próximamente</span>}
                          {p.descuentoActivo && p.descuentoPorcentaje !== null && (
                            <span className="bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded text-[9px] font-bold">−{p.descuentoPorcentaje}%</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.dbId && (
                            <button
                              onClick={() => toggleActivo(p)}
                              title={p.activo ? 'Ocultar' : 'Publicar'}
                              className="p-1.5 rounded-lg border border-[#C8D8CB] text-[#6B7280] hover:border-[#1A4E26] hover:text-[#1A4E26] transition-colors"
                            >
                              {p.activo ? <EyeOff size={13} /> : <Eye size={13} />}
                            </button>
                          )}
                          <button
                            onClick={() => { setEditing(p); setShowForm(true); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-[#C8D8CB] text-[#111111] text-[11px] font-bold hover:border-[#1A4E26] transition-colors"
                          >
                            <Pencil size={11} /> Editar
                          </button>
                          {p.dbId && isAdmin && (
                            <button
                              onClick={() => setConfirmDelete(p)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                          {!p.dbId && (
                            <span className="text-[10px] text-[#9CA3AF] italic">solo estático</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-3 text-center text-[10px] text-[#9CA3AF]">
        Mostrando <strong>{list.length}</strong> de {all.length} productos · fuente: {fromDb ? 'base de datos' : 'fallback estático'}
      </div>

      <ProductoFormModal
        open={showForm}
        editing={editing}
        onClose={() => { setShowForm(false); setEditing(null); }}
        onSaved={reload}
      />

      <Modal
        open={!!confirmDelete}
        onClose={() => deletingId ? undefined : setConfirmDelete(null)}
        title="Eliminar producto"
        subtitle={confirmDelete?.nombre}
        size="sm"
        closeOnBackdrop={!deletingId}
        showClose={!deletingId}
      >
        <div className="px-6 py-5 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
            <p className="text-red-800 text-xs leading-relaxed">
              Esta acción elimina el producto del catálogo de forma permanente. Si solo quieres ocultarlo de la
              tienda, mejor desactiva la opción "Activo en tienda" y conserva la fila.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              disabled={!!deletingId}
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium hover:border-[#A8C2AD] transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
              disabled={!!deletingId}
              className="flex-[1.5] py-3 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60 transition-all inline-flex items-center justify-center gap-2"
            >
              {deletingId ? <><Loader2 size={14} className="animate-spin" /> Eliminando…</> : <><Trash2 size={14} /> Eliminar</>}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
