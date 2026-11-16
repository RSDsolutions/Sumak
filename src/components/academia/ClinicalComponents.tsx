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
} from 'lucide-react';
import { products } from '../../data';
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
      badgeLabel: 'Advertencia Fisiológica',
      icon: <AlertTriangle size={20} className="text-amber-600 shrink-0" />,
    },
    contraindication: {
      bg: 'bg-red-50/90',
      border: 'border-red-300',
      accent: 'bg-red-600',
      textTitle: 'text-red-950',
      textBody: 'text-red-900',
      badgeBg: 'bg-red-200/70 text-red-900',
      badgeLabel: 'Contraindicación Clínica Estricta',
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
          <p className={`text-sm leading-relaxed ${s.textBody}`}>
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
  const toxicityBadge: Record<
    AcademyBotanicalSheet['toxicity_level'],
    { label: string; cls: string }
  > = {
    low: {
      label: 'Toxicidad Baja (Segura en dosis estándar)',
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    moderate: {
      label: 'Toxicidad Moderada (Requiere extracto estandarizado)',
      cls: 'bg-amber-100 text-amber-900 border-amber-300',
    },
    high: {
      label: 'Toxicidad Alta (Uso clínico restringido)',
      cls: 'bg-red-100 text-red-800 border-red-300',
    },
    strict_caution: {
      label: 'Precaución Clínica Estricta',
      cls: 'bg-purple-100 text-purple-900 border-purple-300',
    },
  };

  const tox = toxicityBadge[sheet.toxicity_level] ?? toxicityBadge.low;
  const linkedProduct = sheet.related_product_code
    ? products.find((p) => p.codigo === sheet.related_product_code)
    : undefined;

  return (
    <div className="bg-white rounded-2xl border border-[#C8D8CB] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0B2913] via-[#1A4E26] to-[#163F1E] p-5 sm:p-6 text-white flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 p-2 flex items-center justify-center shrink-0">
          {sheet.image_url ? (
            <img
              src={sheet.image_url}
              alt={sheet.common_name}
              className="w-full h-full object-contain drop-shadow"
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
            <p className="text-xs text-white/75 mt-1">
              <strong>Parte utilizada:</strong> {sheet.part_used}
            </p>
          )}
          {clinicalRole && (
            <p className="text-xs text-emerald-100 mt-2 bg-white/10 rounded-lg px-3 py-1.5 border border-white/10">
              <strong>Rol en esta lección:</strong> {clinicalRole}
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
              <FlaskConical size={14} /> Tabla de Compuestos Bioactivos y Mecanismo
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F4F7F5] text-[#0B2913] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3.5 w-2/5">Compuesto Activo</th>
                    <th className="py-2.5 px-3.5">Acción Fisiológica / Renal</th>
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
                Usos Clínicos y Tradicionales
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
            <span className="text-slate-500">
              Presente en formulación estandarizada SUMAK:{' '}
              <strong className="text-[#1A4E26]">{linkedProduct.nombre}</strong>
            </span>
            <Link
              to={`/productos/${linkedProduct.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-[#1A4E26] hover:underline"
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
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#1A4E26] text-white flex items-center justify-center">
          <Leaf size={18} />
        </div>
        <div>
          <h3 className="text-lg font-black text-[#111111]">
            Vademécum y Fichas Botánicas de la Lección
          </h3>
          <p className="text-xs text-[#6B7280]">
            Compuestos activos, mecanismos renales y niveles de seguridad clínica
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
              Posología exacta, fase del protocolo y precauciones terapéuticas
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest bg-[#EBF4ED] text-[#1A4E26] px-3 py-1 rounded-full border border-[#C8D8CB]">
          {items.length} {items.length === 1 ? 'Producto Asociado' : 'Productos Asociados'}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => {
          const catalogProduct = products.find(
            (p) => p.codigo === item.product_code || p.slug === item.product_slug
          );

          return (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-[#F4F7F5] p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-4 hover:border-[#1A4E26]/40 transition-all"
            >
              {/* Product Thumbnail */}
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-[#C8D8CB] p-2 flex items-center justify-center shrink-0">
                {catalogProduct?.imagen ? (
                  <img
                    src={catalogProduct.imagen}
                    alt={item.product_name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Sparkles size={28} className="text-[#1A4E26]" />
                )}
              </div>

              {/* Product Details & Dosage */}
              <div className="flex-1 min-w-0 space-y-2.5 w-full">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      Cód. {item.product_code}
                    </span>
                    {item.protocol_phase && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#1A4E26] text-white px-2.5 py-0.5 rounded-full">
                        {item.protocol_phase}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/productos/${item.product_slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1A4E26] hover:underline"
                  >
                    Ver ficha comercial <ExternalLink size={12} />
                  </Link>
                </div>

                <h4 className="text-base sm:text-lg font-black text-[#111111]">
                  {item.product_name}
                </h4>

                {/* Dosage Box */}
                <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-3">
                  <p className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-0.5">
                    💧 Dosificación Exacta Recomendada:
                  </p>
                  <p className="text-sm font-bold text-[#0B2913]">{item.dosage}</p>
                  {item.administration_route && (
                    <p className="text-xs text-[#4B5563] mt-1">
                      <strong>Modo de administración:</strong> {item.administration_route}
                    </p>
                  )}
                </div>

                {/* Key Ingredients from Catalog */}
                {catalogProduct?.ingredientes && catalogProduct.ingredientes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {catalogProduct.ingredientes.slice(0, 6).map((ing, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] bg-white border border-slate-200 text-slate-700 px-2 py-0.5 rounded-lg font-medium"
                      >
                        🌿 {ing}
                      </span>
                    ))}
                    {catalogProduct.ingredientes.length > 6 && (
                      <span className="text-[11px] text-slate-500 px-1.5 py-0.5">
                        +{catalogProduct.ingredientes.length - 6} activos más
                      </span>
                    )}
                  </div>
                )}

                {/* Precautions */}
                {item.precautions && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-900">
                    <ShieldAlert size={15} className="text-red-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Precaución clínica:</strong> {item.precautions}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 4. Step-By-Step Recipe / Protocol Card ──────────────────────────────────

export function StepByStepRecipeCard({ recipe }: { recipe: RecipeCardData }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-[#D4AF37]/50 shadow-sm overflow-hidden mb-8">
      <div className="bg-gradient-to-r from-[#0B2913] to-[#1A4E26] p-5 sm:p-6 text-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-[#0B2913] px-3 py-1 rounded-full">
            <BookOpen size={12} /> Tarjeta de Protocolo / Receta Paso a Paso
          </span>
          <div className="flex items-center gap-3 text-xs text-white/80">
            {recipe.prep_time && (
              <span className="inline-flex items-center gap-1">
                <Clock size={13} className="text-[#D4AF37]" /> {recipe.prep_time}
              </span>
            )}
            {recipe.servings && <span>• {recipe.servings}</span>}
          </div>
        </div>
        <h3 className="text-lg sm:text-xl font-black text-white">{recipe.title}</h3>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Ingredients / Doses */}
        {recipe.ingredients?.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-3">
              Componentes y Dosificación por Fase
            </h4>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {recipe.ingredients.map((ing, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-[#F4F7F5] border border-[#C8D8CB] flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-[#111111]">{ing.name}</span>
                    {ing.notes && (
                      <span className="text-[10px] font-bold bg-[#1A4E26]/10 text-[#1A4E26] px-2 py-0.5 rounded-full shrink-0">
                        {ing.notes}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-[#1A4E26] mt-1">{ing.dose}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Numbered Steps */}
        {recipe.steps?.length > 0 && (
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#1A4E26] mb-3">
              Secuencia de Aplicación Paso a Paso
            </h4>
            <ol className="space-y-3">
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
      </div>
    </div>
  );
}
