import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { academyAPI } from '../../../lib/academy';
import { useAuth } from '../../../lib/auth';
import {
  Download,
  FileText,
  Leaf,
  ShoppingCart,
  CheckCircle,
  Lock,
  Sparkles,
  BookOpen,
  GraduationCap,
  Award,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { useToast } from '../../../lib/toast';
import AcademyTransferCheckout from '../../../components/AcademyTransferCheckout';
import type { BankAccount } from '../../../data';

interface Recipe {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  pdf_url: string;
  price: number;
}

const RECETAS_PASTEL_PALETTE = [
  {
    bg: 'from-[#EBF5EE] via-[#E1EFE5] to-[#D5E8DB]',
    title: 'text-[#12361B]',
    textMuted: 'text-[#2D5A37]',
    btn: 'bg-[#1A4E26] hover:bg-[#12361A] text-white',
  },
  {
    bg: 'from-[#FEF6E9] via-[#FDEED7] to-[#FCE3C2]',
    title: 'text-[#5B3407]',
    textMuted: 'text-[#7C4C18]',
    btn: 'bg-[#92400E] hover:bg-[#78350F] text-white',
  },
  {
    bg: 'from-[#EAF2F7] via-[#DFEBF2] to-[#D2E2EB]',
    title: 'text-[#102D3E]',
    textMuted: 'text-[#2C526A]',
    btn: 'bg-[#1E3A5F] hover:bg-[#0F2232] text-white',
  },
  {
    bg: 'from-[#ECF6EE] via-[#DCEFDF] to-[#CDE7D2]',
    title: 'text-[#0D381E]',
    textMuted: 'text-[#1F542F]',
    btn: 'bg-[#1A4E26] hover:bg-[#12361A] text-white',
  },
  {
    bg: 'from-[#FBF4E8] via-[#F5EAD6] to-[#EFE0C2]',
    title: 'text-[#4D3A13]',
    textMuted: 'text-[#71541B]',
    btn: 'bg-[#71541B] hover:bg-[#523B0F] text-white',
  },
];

export default function MisRecetas() {
  const { profile } = useAuth();
  const toast = useToast();

  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [purchased, setPurchased] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Carrito de compras
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [profile?.id]);

  async function fetchData() {
    try {
      setLoading(true);
      // Obtener todas las recetas activas
      const { data: recipesData, error: recipesError } = await supabase
        .from('academy_recipes')
        .select('id, title, description, cover_image_url, pdf_url, price')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (recipesError) throw recipesError;
      setRecipes(recipesData || []);

      if (profile?.id) {
        // Obtener estado de compras del usuario
        const { data: purchasesData, error: purchasesError } = await supabase
          .from('academy_recipe_purchases')
          .select('status, items:academy_recipe_purchase_items(recipe_id)')
          .eq('user_id', profile.id);

        if (purchasesError) throw purchasesError;

        const purchasedMap: Record<string, string> = {};
        purchasesData?.forEach((p) => {
          if (p.status !== 'rejected') {
            (p.items as any[])?.forEach((item) => {
              purchasedMap[item.recipe_id] = p.status;
            });
          }
        });
        setPurchased(purchasedMap);
      }
    } catch (error) {
      console.error('Error fetching recipes data:', error);
      toast.error('Error al cargar las recetas');
    } finally {
      setLoading(false);
    }
  }

  function toggleSelection(id: string) {
    if (purchased[id]) return;
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  }

  const selectedRecipes = recipes.filter((r) => selectedIds.has(r.id));
  const totalAmount = selectedRecipes.reduce((sum, r) => sum + r.price, 0);
  const unlockedCount = Object.values(purchased).filter((status) => status === 'approved').length;

  async function handleCheckout(receiptFile: File, bank: BankAccount, voucherNumber: string) {
    if (selectedIds.size === 0) return;
    if (!profile?.id) {
      toast.error('Sesión no encontrada');
      return;
    }

    try {
      setIsSubmitting(true);
      void bank;
      void voucherNumber;
      await academyAPI.uploadAndCreateRecipePurchase({
        userId: profile.id,
        recipeIds: Array.from(selectedIds),
        receiptFile,
        bankName: bank.banco,
        voucherNumber,
      });

      toast.success('¡Solicitud enviada! Verificaremos tu pago pronto 🌿');
      setIsCheckoutOpen(false);
      setSelectedIds(new Set());
      fetchData(); // Recargar datos
    } catch (error: any) {
      console.error('Error in checkout:', error);
      toast.error('Error al procesar la compra: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDownload(pdf_url: string) {
    try {
      toast.info('Generando enlace seguro...');
      const { data, error } = await supabase.storage
        .from('academy-recipes')
        .createSignedUrl(pdf_url, 60 * 5); // 5 minutos validez

      if (error) throw error;
      toast.success('¡Descarga iniciada!');
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading recipe:', error);
      toast.error('No se pudo descargar la receta.');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="w-10 h-10 border-2 border-[#1A4E26] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full pb-32">
      {/* 1. Header Institucional Full Width — Sin caja contenedora */}
      <section className="w-full bg-gradient-to-r from-[#0F2E18] via-[#1A4E26] to-[#2B6E3A] px-4 sm:px-6 lg:px-8 py-8 sm:py-10 text-white relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative flex items-center justify-between">
          <div className="relative z-10 space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white font-heading tracking-tight leading-tight">
              Mis Recetas
            </h1>

            <p className="text-sm sm:text-base text-white/95 font-medium leading-relaxed">
              Catálogo de recetas de biomedicina ancestral. Compra y desbloquea fórmulas y guías nutricionales exclusivas del Dr. Luis Paredes.
            </p>

            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed pt-0.5">
              Dispones de{' '}
              <strong className="text-amber-300 font-bold">
                {recipes.length} {recipes.length === 1 ? 'receta ancestral' : 'recetas ancestrales'}
              </strong>{' '}
              en catálogo
              {unlockedCount > 0 ? (
                <>
                  {' '}·{' '}
                  <strong className="text-white font-bold">
                    {unlockedCount} {unlockedCount === 1 ? 'desbloqueada' : 'desbloqueadas'}
                  </strong>{' '}
                  en tu biblioteca
                </>
              ) : null}
              .
            </p>
          </div>

          {/* Floating 3D/Glass Badges */}
          <div className="hidden lg:block relative w-80 h-36 pointer-events-none select-none shrink-0">
            <div className="absolute top-0 left-6 w-11 h-11 rounded-2xl bg-amber-400/90 text-amber-950 flex items-center justify-center shadow-lg transform -rotate-6">
              <Sparkles size={20} />
            </div>
            <div className="absolute top-6 left-20 w-14 h-14 rounded-2xl bg-[#E8C94A] text-[#111111] flex items-center justify-center shadow-xl transform rotate-3">
              <BookOpen size={26} />
            </div>
            <div className="absolute top-1 right-20 w-10 h-10 rounded-xl bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 flex items-center justify-center shadow-md transform -rotate-12">
              <GraduationCap size={18} />
            </div>
            <div className="absolute top-0 right-6 w-11 h-11 rounded-2xl bg-teal-400/90 text-teal-950 flex items-center justify-center shadow-md transform rotate-6">
              <Leaf size={18} />
            </div>
            <div className="absolute bottom-1 left-28 w-16 h-16 rounded-3xl bg-white text-[#1A4E26] flex items-center justify-center shadow-2xl transform rotate-6 border border-white/40">
              <Award size={32} />
            </div>
            <div className="absolute bottom-3 left-4 w-10 h-10 rounded-xl bg-emerald-700/90 text-white flex items-center justify-center shadow-md transform -rotate-6">
              <ShieldCheck size={18} />
            </div>
            <div className="absolute bottom-2 right-10 w-11 h-11 rounded-2xl bg-[#D4AF37] text-amber-950 flex items-center justify-center shadow-lg transform rotate-12">
              <Clock size={18} />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Grid de Contenido */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
        {recipes.length === 0 ? (
          <div className="bg-white/80 rounded-3xl p-12 text-center shadow-xs border-0">
            <Leaf size={44} className="text-[#1A4E26] mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Próximamente nuevas recetas</h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              Aún no hay recetas publicadas en el catálogo. Las guías nutricionales y fórmulas ancestrales aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {recipes.map((recipe, idx) => {
              const status = purchased[recipe.id];
              const isSelected = selectedIds.has(recipe.id);
              const isApproved = status === 'approved';
              const isPending = status === 'pending' || status === 'processing';
              const theme = RECETAS_PASTEL_PALETTE[idx % RECETAS_PASTEL_PALETTE.length];

              return (
                <div
                  key={recipe.id}
                  className={`bg-gradient-to-br ${theme.bg} rounded-3xl overflow-hidden flex flex-col transition-all duration-300 border-0 shadow-xs hover:shadow-lg hover:-translate-y-0.5 ${
                    isSelected
                      ? 'ring-2 ring-[#1A4E26] shadow-xl shadow-[#1A4E26]/10 scale-[1.02]'
                      : ''
                  }`}
                >
                  {/* Imagen y Estado */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#0F2E18] to-[#1A4E26] relative overflow-hidden">
                    {recipe.cover_image_url ? (
                      <img
                        src={recipe.cover_image_url}
                        alt={recipe.title}
                        referrerPolicy="no-referrer"
                        className={`w-full h-full object-cover ${!isApproved ? 'opacity-70 blur-[2px]' : ''}`}
                        onError={(e) => {
                          const target = e.currentTarget;
                          if (target.src !== 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80') {
                            target.src = 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80';
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                        <FileText size={44} className="mb-2 opacity-50" />
                      </div>
                    )}

                    {/* Badge de Precio */}
                    {!isApproved && !isPending && (
                      <div className="absolute top-3 right-3 bg-[#D4AF37] text-[#0B2913] px-2.5 py-1 rounded-xl text-xs font-black shadow-xs border-0">
                        ${recipe.price.toFixed(2)}
                      </div>
                    )}

                    {/* Overlay visual */}
                    {isApproved ? (
                      <div className="absolute inset-0 bg-[#1A4E26]/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <CheckCircle size={44} className="text-white drop-shadow-md" />
                      </div>
                    ) : isPending ? (
                      <div className="absolute inset-0 bg-amber-500/30 flex items-center justify-center">
                        <div className="bg-white/90 backdrop-blur-xs text-amber-800 px-3 py-1 rounded-full text-xs font-bold shadow-xs">
                          En revisión
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Lock size={28} className="text-white/80 drop-shadow-md" />
                      </div>
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <p className="text-[11px] font-extrabold uppercase tracking-widest text-[#1A4E26]">
                        Dr. Luis Paredes
                      </p>
                      <h3 className={`font-black ${theme.title} line-clamp-2 mt-1.5 leading-snug text-base`}>
                        {recipe.title}
                      </h3>
                      <p className={`text-xs ${theme.textMuted} line-clamp-2 mt-1.5 leading-relaxed`}>
                        {recipe.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-black/5">
                      {isApproved ? (
                        <button
                          onClick={() => handleDownload(recipe.pdf_url)}
                          className="w-full flex items-center justify-center gap-2 bg-[#D4AF37] text-[#0B2913] py-2.5 rounded-xl font-bold text-xs hover:bg-[#C19B2E] transition-all shadow-xs border-0 cursor-pointer"
                        >
                          <Download size={16} /> Descargar PDF
                        </button>
                      ) : isPending ? (
                        <div className="w-full flex items-center justify-center gap-2 bg-white/70 text-amber-800 py-2.5 rounded-xl font-semibold text-xs border-0 shadow-xs">
                          <CheckCircle size={15} /> Verificando pago...
                        </div>
                      ) : (
                        <button
                          onClick={() => toggleSelection(recipe.id)}
                          className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 border-0 cursor-pointer ${
                            isSelected
                              ? 'bg-red-500 hover:bg-red-600 text-white shadow-xs'
                              : `${theme.btn} shadow-xs`
                          }`}
                        >
                          {isSelected ? 'Quitar del Carrito' : 'Registrar Pago'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── BARRA FLOTANTE DE CARRITO ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-8px_32px_rgba(0,0,0,0.12)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <ShoppingCart size={28} className="text-[#1A4E26] shrink-0" />
              <div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">
                  {selectedIds.size} receta{selectedIds.size !== 1 ? 's' : ''} seleccionada{selectedIds.size !== 1 ? 's' : ''}
                </p>
                <p className="text-xl sm:text-2xl font-black text-slate-900">Total: ${totalAmount.toFixed(2)}</p>
              </div>
            </div>
            <button
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full sm:w-auto px-8 py-3 bg-[#D4AF37] hover:bg-[#C19B2E] text-[#0B2913] font-black rounded-xl transition-all shadow-md text-sm sm:text-base border-0 cursor-pointer"
            >
              Completar Pago
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL DE CHECKOUT ── */}
      {isCheckoutOpen && (
        <AcademyTransferCheckout
          recipes={selectedRecipes}
          total={totalAmount}
          submitting={isSubmitting}
          onClose={() => setIsCheckoutOpen(false)}
          onSubmit={(file, bank, voucherNumber) => handleCheckout(file, bank, voucherNumber)}
        />
      )}
    </div>
  );
}
