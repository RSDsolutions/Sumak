import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  Skull,
  Leaf,
  FlaskConical,
  Pill,
  Clock,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Droplets,
} from 'lucide-react';
import { products, parseIngredient } from '../../data';
import type {
  ClinicalCalloutData,
  AcademyBotanicalSheet,
  AcademyLessonBotanical,
  AcademyLessonProduct,
  RecipeCardData,
} from '../../lib/academy-types';

// ─── 1. Clinical Callout (Alertas Médicas y Toxicidad) ───────────────────────

export function ClinicalCallout({ callout }: { callout: ClinicalCalloutData }) {
  const styles = {
    info: {
      bg: 'bg-[#EBF4ED]',
      border: 'border-[#1A4E26]/30',
      accent: 'bg-[#1A4E26]',
      textTitle: 'text-[#0B2913]',
      textBody: 'text-[#1A4E26]',
      badgeBg: 'bg-[#1A4E26]/10 text-[#1A4E26]',
      badgeLabel: 'Nota Clínica SUMAK',
      icon: <Info size={20} className="text-[#1A4E26] shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50/90',
      border: 'border-amber-300',
      accent: 'bg-amber-500',
      textTitle: 'text-amber-950',
      textBody: 'text-amber-900',
      badgeBg: 'bg-amber-200/70 text-amber-900',
      badgeLabel: 'Advertencia Fisiológica y Clínica',
      icon: <AlertTriangle size={20} className="text-amber-600 shrink-0" />,
    },
    contraindication: {
      bg: 'bg-red-50/90',
      border: 'border-red-300',
      accent: 'bg-red-600',
      textTitle: 'text-red-950',
      textBody: 'text-red-900',
      badgeBg: 'bg-red-200/70 text-red-900',
      badgeLabel: 'Signos de Alarma y Contraindicación Estricta',
      icon: <ShieldAlert size={20} className="text-red-600 shrink-0" />,
    },
    toxicity: {
      bg: 'bg-rose-950 text-white',
      border: 'border-rose-700',
      accent: 'bg-[#D4AF37]',
      textTitle: 'text-[#D4AF37]',
      textBody: 'text-rose-100',
      badgeBg: 'bg-rose-800 text-[#D4AF37] border border-rose-700',
      badgeLabel: 'Alerta de Toxicidad y Dosificación',
      icon: <Skull size={20} className="text-[#D4AF37] shrink-0" />,
    },
  };

  const s = styles[callout.severity] ?? styles.warning;

  return (
    <div className={`relative rounded-2xl border ${s.border} ${s.bg} p-5 sm:p-6 shadow-sm overflow-hidden mb-6`}>
      <div className={`absolute inset-y-0 left-0 w-1.5 ${s.accent}`} />
      <div className="flex items-start gap-3.5 pl-2">
        <div className="mt-0.5">{s.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${s.badgeBg}`}>
              {s.badgeLabel}
            </span>
          </div>
          <h4 className={`font-bold text-base sm:text-lg leading-snug mb-1.5 ${s.textTitle}`}>
            {callout.title}
          </h4>
          <p className={`text-sm leading-relaxed whitespace-pre-line ${s.textBody}`}>
            {callout.message}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── 2. Botanical Sheet Card (Ficha Botánica Estructurada) ───────────────────

export function BotanicalSheetCard({
  sheet,
  clinicalRole,
}: {
  sheet: AcademyBotanicalSheet;
  clinicalRole?: string | null;
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const toxicityBadge: Record<
    AcademyBotanicalSheet['toxicity_level'],
    { label: string; cls: string }
  > = {
    low: {
      label: 'Toxicidad Baja (Segura en dosis estándar)',
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    moderate: {
      label: 'Toxicidad Moderada (Uso prudente / estandarizado)',
      cls: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    high: {
      label: 'Toxicidad Alta (Uso clínico restringido)',
      cls: 'bg-red-100 text-red-800 border-red-300',
    },
    strict_caution: {
      label: 'Precaución Clínica Estricta (Prohibida ingesta casera)',
      cls: 'bg-rose-200 text-rose-950 border-rose-400',
    },
  };

  const tox = toxicityBadge[sheet.toxicity_level] ?? toxicityBadge.low;
  const linkedProduct = sheet.related_product_code
    ? products.find((p) => p.codigo === sheet.related_product_code)
    : undefined;

  const parsedFallback = parseIngredient(sheet.common_name).image;
  const resolvedImage = !imgFailed ? (sheet.image_url || parsedFallback) : parsedFallback;

  return (
    <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B2913] via-[#1A4E26] to-[#163F1E] p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 border border-white/25 p-2 flex items-center justify-center shrink-0 overflow-hidden">
          {resolvedImage && !imgFailed ? (
            <img
              src={resolvedImage}
              alt={sheet.common_name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-contain rounded-xl drop-shadow"
            />
          ) : (
            <Leaf size={32} className="text-[#D4AF37]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 px-2.5 py-0.5 rounded-full">
              <FlaskConical size={11} /> Ficha Fitofarmacológica SUMAK
            </span>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${tox.cls}`}>
              {tox.label}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
            {sheet.common_name}{' '}
            <span className="font-normal italic text-[#D4AF37] text-base sm:text-lg">
              ({sheet.scientific_name})
            </span>
          </h3>
          {sheet.part_used && (
            <p className="text-xs text-white/80 mt-1">
              <strong>Parte utilizada / Preparación:</strong> {sheet.part_used}
            </p>
          )}
          {clinicalRole && (
            <p className="text-xs text-emerald-100 mt-2 bg-white/10 rounded-lg px-3 py-1.5 border border-white/10">
              <strong>Rol clínico en esta lección:</strong> {clinicalRole}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 sm:p-6 space-y-5">
        {/* Compuestos Activos Table */}
        {sheet.active_compounds && sheet.active_compounds.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-2.5 flex items-center gap-1.5">
              <FlaskConical size={14} /> Tabla de Compuestos Bioactivos y Acción Fisiológica
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F4F7F5] text-[#0B2913] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5 w-2/5">Compuesto Activo</th>
                    <th className="py-2.5 px-3.5">Acción Fisiológica / Clínica</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sheet.active_compounds.map((comp, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3.5 font-semibold text-[#111111]">{comp.name}</td>
                      <td className="py-2.5 px-3.5 text-[#4B5563]">{comp.action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Propiedades y Usos Tradicionales */}
        <div className="grid sm:grid-cols-2 gap-4">
          {sheet.properties?.length > 0 && (
            <div className="bg-[#F8FBF8] border border-[#C8D8CB]/60 rounded-xl p-4">
              <h5 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-2">
                Propiedades Terapéuticas
              </h5>
              <ul className="space-y-1.5">
                {sheet.properties.map((prop, i) => (
                  <li key={i} className="text-xs sm:text-sm text-[#374151] flex items-start gap-2">
                    <CheckCircle2 size={14} className="text-[#1A4E26] shrink-0 mt-0.5" />
                    <span>{prop}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {sheet.traditional_uses?.length > 0 && (
            <div className="bg-[#F8FBF8] border border-[#C8D8CB]/60 rounded-xl p-4">
              <h5 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-2">
                Beneficios Tradicionales y Preparación Prudente
              </h5>
              <ul className="space-y-1.5">
                {sheet.traditional_uses.map((u, i) => (
                  <li key={i} className="text-xs sm:text-sm text-[#374151] flex items-start gap-2">
                    <Leaf size={14} className="text-[#D4AF37] shrink-0 mt-0.5" />
                    <span>{u}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Precauciones Clínicas y Contraindicaciones */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-2 flex-1">
              <h5 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Precauciones Clínicas y Seguridad Fitoterapéutica
              </h5>
              <p className="text-xs sm:text-sm text-amber-950 leading-relaxed">
                {sheet.clinical_precautions}
              </p>
              {sheet.toxicity_notes && (
                <p className="text-xs text-amber-800 italic">
                  <strong>Nota toxicológica:</strong> {sheet.toxicity_notes}
                </p>
              )}
              {sheet.contraindications?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {sheet.contraindications.map((c, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-bold bg-red-100 text-red-800 border border-red-200 px-2.5 py-0.5 rounded-full"
                    >
                      ⛔ {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Producto SUMAK que contiene esta planta */}
        {linkedProduct && (
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center gap-2.5">
              {linkedProduct.imagen && (
                <img
                  src={linkedProduct.imagen}
                  alt={linkedProduct.nombre}
                  className="w-8 h-8 object-contain rounded-lg border border-slate-200 p-0.5 bg-white"
                />
              )}
              <span className="text-slate-600">
                Presente en formulación estandarizada SUMAK:{' '}
                <strong className="text-[#1A4E26]">{linkedProduct.nombre}</strong>
              </span>
            </div>
            <Link
              to={`/productos/${linkedProduct.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#1A4E26] hover:underline shrink-0"
            >
              Ver en catálogo <ExternalLink size={12} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export function BotanicalSheetsSection({ items }: { items: AcademyLessonBotanical[] }) {
  const validItems = items.filter((i) => i.botanical);
  if (validItems.length === 0) return null;

  return (
    <div className="space-y-4 mb-8">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#1A4E26] text-white flex items-center justify-center shadow-xs">
          <Leaf size={18} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#111111]">
            Vademécum y Fichas Botánicas de la Lección ({validItems.length})
          </h3>
          <p className="text-xs text-[#6B7280]">
            Compuestos activos, beneficios tradicionales, preparación prudente y niveles de seguridad clínica
          </p>
        </div>
      </div>
      <div className="space-y-5">
        {validItems.map((item) => (
          <BotanicalSheetCard
            key={item.id}
            sheet={item.botanical!}
            clinicalRole={item.clinical_role}
          />
        ))}
      </div>
    </div>
  );
}

// ─── 3. Dosed Ingredients / Linked SUMAK Products List ───────────────────────

function ProductCardItem({ item }: { item: AcademyLessonProduct }) {
  const [expanded, setExpanded] = useState(false);

  const catalogProduct = products.find(
    (p) => p.codigo === item.product_code || p.slug === item.product_slug
  );

  const rawIngredients = catalogProduct?.ingredientes ?? [];
  const parsedList = rawIngredients.map((raw) => parseIngredient(raw));
  const botanicalIngredients = parsedList.filter((p) => !p.isNutrient);
  const nutrientIngredients = parsedList.filter((p) => p.isNutrient);

  // Extract individual mineral/vitamin pills from nutrient strings
  const nutrientPills = nutrientIngredients.flatMap((n) => {
    const clean = n.name.replace(/^(Minerales esenciales:|Minerales:|Vitaminas:)\s*/i, '');
    return clean
      .split(/,| y /i)
      .map((s) => s.trim())
      .filter(Boolean);
  });

  const visibleBotanicals = expanded ? botanicalIngredients : botanicalIngredients.slice(0, 8);

  return (
    <div className="rounded-2xl border border-[#C8D8CB] bg-gradient-to-br from-white via-white to-[#F4F7F5] p-5 sm:p-6 flex flex-col md:flex-row items-start gap-5 hover:border-[#1A4E26]/50 transition-all shadow-2xs">
      {/* Product Bottle / Package Image */}
      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-white border border-[#C8D8CB] p-2.5 flex items-center justify-center shrink-0 mx-auto md:mx-0 shadow-2xs">
        {catalogProduct?.imagen ? (
          <img
            src={catalogProduct.imagen}
            alt={item.product_name}
            className="w-full h-full object-contain drop-shadow-xs"
          />
        ) : (
          <Sparkles size={32} className="text-[#1A4E26]" />
        )}
      </div>

      {/* Product Details & Dosage */}
      <div className="flex-1 min-w-0 space-y-3 w-full">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-md border border-slate-200">
              Cód. {item.product_code}
            </span>
            {catalogProduct?.presentacion && (
              <span className="text-[10px] font-bold bg-emerald-50 text-[#1A4E26] border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {catalogProduct.presentacion}
              </span>
            )}
            {catalogProduct?.pvp && (
              <span className="text-[10px] font-extrabold bg-[#FEF6E9] text-[#7C4C18] border border-amber-200 px-2.5 py-0.5 rounded-full">
                PVP ${catalogProduct.pvp.toFixed(2)}
              </span>
            )}
            {item.protocol_phase && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1A4E26] text-white px-2.5 py-0.5 rounded-full">
                {item.protocol_phase}
              </span>
            )}
          </div>
          <Link
            to={`/productos/${catalogProduct?.slug || item.product_slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] hover:underline"
          >
            Ver ficha comercial <ExternalLink size={12} />
          </Link>
        </div>

        <div>
          <h4 className="text-lg sm:text-xl font-black text-[#111111]">
            {item.product_name}
          </h4>
          {catalogProduct?.tagline && (
            <p className="text-xs font-semibold text-[#1A4E26]">{catalogProduct.tagline}</p>
          )}
        </div>

        {/* Dosage Box */}
        <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-3.5">
          <p className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-1 flex items-center gap-1.5">
            <Droplets size={14} /> Posología y Dosificación Exacta Recomendada:
          </p>
          <p className="text-sm font-bold text-[#0B2913]">{item.dosage}</p>
          {item.administration_route && (
            <p className="text-xs text-[#2D5A37] mt-1">
              <strong>Vía y modo de administración:</strong> {item.administration_route}
            </p>
          )}
        </div>

        {/* Botanical Ingredients with real /ingredientes/*.png thumbnails */}
        {botanicalIngredients.length > 0 && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Activos Botánicos y Fitonutrientes ({botanicalIngredients.length})
              </span>
              {botanicalIngredients.length > 8 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] hover:underline"
                >
                  {expanded ? (
                    <>
                      Mostrar menos <ChevronUp size={13} />
                    </>
                  ) : (
                    <>
                      Ver los {botanicalIngredients.length} ingredientes <ChevronDown size={13} />
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {visibleBotanicals.map((ing, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-white border border-slate-200/90 rounded-xl p-2 shadow-2xs"
                >
                  {ing.image ? (
                    <img
                      src={ing.image}
                      alt={ing.name}
                      className="w-7 h-7 object-contain shrink-0"
                    />
                  ) : (
                    <Leaf size={15} className="text-[#1A4E26] shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate" title={ing.name}>
                      {ing.name}
                    </p>
                    {ing.description && (
                      <p className="text-[10px] text-slate-500 truncate" title={ing.description}>
                        {ing.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Micronutrients / Vitamins & Minerals Pills */}
        {nutrientPills.length > 0 && (
          <div className="pt-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 block mb-1.5">
              Complejo de Vitaminas, Minerales y Oligoelementos:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nutrientPills.map((pill, idx) => (
                <span
                  key={idx}
                  className="text-[11px] font-bold bg-[#FEF6E9] text-[#5B3407] border border-[#D4AF37]/50 px-2.5 py-0.5 rounded-full shadow-2xs"
                >
                  ✨ {pill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Precautions */}
        {item.precautions && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3.5 py-2.5 text-xs text-red-900">
            <ShieldAlert size={15} className="text-red-600 shrink-0 mt-0.5" />
            <span>
              <strong>Precaución clínica:</strong> {item.precautions}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function DosedIngredientsList({ items }: { items: AcademyLessonProduct[] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-[#C8D8CB] p-6 sm:p-8 shadow-sm mb-8">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#0B2913] flex items-center justify-center">
            <Pill size={18} className="text-[#1A4E26]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#111111]">
              Fórmulas SUMAK Vinculadas y Dosificación Clínica
            </h3>
            <p className="text-xs text-[#6B7280]">
              Envase oficial, ingredientes activos con iconografía botánica, micronutrientes y posología exacta
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-[#EBF4ED] text-[#1A4E26] px-3 py-1 rounded-full border border-[#C8D8CB]">
          {items.length} {items.length === 1 ? 'Fórmula Asociada' : 'Fórmulas Asociadas'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5">
        {items.map((item) => (
          <ProductCardItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// ─── 4. Step-By-Step Recipe / Protocol Card ──────────────────────────────────

export function StepByStepRecipeCard({ recipe }: { recipe: RecipeCardData }) {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="bg-white rounded-2xl border-2 border-[#D4AF37]/50 shadow-sm overflow-hidden mb-8">
      {/* Header with optional Recipe Hero Image */}
      <div className="bg-gradient-to-r from-[#0B2913] via-[#1A4E26] to-[#2B6E3A] p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-[#0B2913] px-3 py-1 rounded-full">
              <BookOpen size={12} /> Receta Magistral / Protocolo Paso a Paso
            </span>
            {recipe.prep_time && (
              <span className="inline-flex items-center gap-1 text-xs bg-white/15 px-2.5 py-0.5 rounded-full text-white/90">
                <Clock size={12} className="text-[#D4AF37]" /> {recipe.prep_time}
              </span>
            )}
            {recipe.servings && (
              <span className="text-xs bg-white/15 px-2.5 py-0.5 rounded-full text-white/90">
                {recipe.servings}
              </span>
            )}
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white leading-snug">
            {recipe.title}
          </h3>
          {recipe.benefits && recipe.benefits.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {recipe.benefits.map((b, i) => (
                <span
                  key={i}
                  className="text-[11px] font-bold bg-emerald-950/60 text-emerald-200 border border-emerald-400/30 px-2.5 py-0.5 rounded-full"
                >
                  ✓ {b}
                </span>
              ))}
            </div>
          )}
        </div>

        {recipe.image_url && !imgErr && (
          <div className="w-full sm:w-36 h-32 sm:h-28 rounded-2xl overflow-hidden border-2 border-white/25 shrink-0 shadow-md">
            <img
              src={recipe.image_url}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Ingredients / Doses with Automatic Botanical Icons */}
        {recipe.ingredients?.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-3 flex items-center gap-1.5">
              <Leaf size={14} /> Ingredientes Exactos y Proporciones
            </h4>
            <div className="grid sm:grid-cols-2 gap-3">
              {recipe.ingredients.map((ing, i) => {
                const resolvedIcon = ing.image_url || parseIngredient(ing.name).image;
                return (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl bg-[#F4F7F5] border border-[#C8D8CB] flex items-center gap-3"
                  >
                    <div className="w-11 h-11 rounded-xl bg-white border border-[#C8D8CB] p-1.5 flex items-center justify-center shrink-0">
                      {resolvedIcon ? (
                        <img
                          src={resolvedIcon}
                          alt={ing.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <Leaf size={18} className="text-[#1A4E26]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-bold text-sm text-[#111111] leading-tight">
                          {ing.name}
                        </span>
                        {ing.notes && (
                          <span className="text-[10px] font-bold bg-[#1A4E26]/10 text-[#1A4E26] px-2 py-0.5 rounded-full shrink-0">
                            {ing.notes}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-[#1A4E26] mt-0.5">{ing.dose}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Numbered Steps */}
        {recipe.steps?.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-3">
              Preparación y Aplicación Paso a Paso
            </h4>
            <ol className="space-y-2.5">
              {recipe.steps.map((step, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="w-6 h-6 rounded-full bg-[#1A4E26] text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <p className="text-sm text-[#374151] leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Posology Footer */}
        {recipe.posology && (
          <div className="p-4 rounded-xl bg-[#FEF6E9] border border-[#D4AF37]/50 flex items-start gap-3">
            <Clock size={18} className="text-[#92400E] shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#92400E] block">
                Posología y Modo de Consumo Clínico
              </span>
              <p className="text-xs sm:text-sm font-semibold text-[#5B3407] mt-0.5">
                {recipe.posology}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
