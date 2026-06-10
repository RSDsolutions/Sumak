import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  ShoppingCart, Plus, Minus, X, CheckCircle2, AlertCircle, TrendingUp,
  ArrowLeft, ArrowRight, Trash2, Leaf, Sparkles,
} from 'lucide-react';
import { levelCommissions } from '../../data';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';
import { useCart } from '../../lib/cart';

export default function NuevoPedido() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { items, setQty, removeItem, clear, subtotal, savings, puntos } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [earnedPuntos, setEarnedPuntos] = useState(0);
  const [compraCalificada, setCompraCalificada] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [totalMes, setTotalMes] = useState(0);

  const willQualify = subtotal >= 100;
  const total = subtotal;

  useEffect(() => {
    if (!user) return;
    async function checkMonthly() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from('pedidos')
        .select('id, total')
        .eq('distribuidor_id', user!.id)
        .eq('estado', 'entregado')
        .gte('created_at', startOfMonth);

      const all = (data ?? []) as { id: string; total: number }[];
      const totalMesAcum = all.reduce((s, p) => s + Number(p.total), 0);
      setTotalMes(totalMesAcum);
      // qualifying = at least one order ≥ $100
      setCompraCalificada(all.some((p) => Number(p.total) >= 100));
      setLoadingStatus(false);
    }
    checkMonthly();
  }, [user]);

  async function handleSubmit() {
    if (items.length === 0 || !user) return;
    setSubmitting(true);
    setError('');

    try {
      const distribId = user.id;

      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          distribuidor_id: distribId,
          estado: 'pendiente',
          tipo_precio: 'distribuidor',
          total: parseFloat(total.toFixed(2)),
          puntos_generados: puntos,
        })
        .select()
        .single();

      if (pedidoError || !pedidoData) {
        setError('Error al crear el pedido: ' + (pedidoError?.message ?? 'desconocido'));
        return;
      }

      const itemsRows = items.map((item) => ({
        pedido_id: pedidoData.id,
        producto_codigo: item.codigo,
        producto_nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: parseFloat((item.precio * item.cantidad).toFixed(2)),
      }));
      const { error: itemsError } = await supabase.from('pedido_items').insert(itemsRows);
      if (itemsError) {
        setError('Error al guardar los productos: ' + itemsError.message);
        return;
      }

      // Sumar puntos al comprador
      if (puntos > 0) {
        const { data: myProfile } = await supabaseAdmin
          .from('profiles').select('puntos').eq('id', distribId).single();
        if (myProfile) {
          await supabaseAdmin
            .from('profiles')
            .update({ puntos: Number(myProfile.puntos) + puntos })
            .eq('id', distribId);
        }
      }

      // Comisiones por nivel — solo upline con compra calificada del mes
      if (puntos > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: allProfiles } = await supabaseAdmin
          .from('profiles').select('id, patrocinador_id');
        const profMap = new Map<string, string | null>();
        for (const p of allProfiles ?? []) profMap.set(p.id, p.patrocinador_id);

        const uplineChain: Array<{ id: string; nivel: number; porcentaje: number }> = [];
        let upId: string | null = distribId;
        for (const lc of levelCommissions) {
          const sponsorId = profMap.get(upId!) ?? null;
          if (!sponsorId) break;
          upId = sponsorId;
          uplineChain.push({ id: upId, nivel: lc.nivel, porcentaje: lc.porcentaje });
        }

        if (uplineChain.length > 0) {
          const uplineIds = uplineChain.map((u) => u.id);
          const { data: eligibleOrders } = await supabaseAdmin
            .from('pedidos').select('distribuidor_id')
            .in('distribuidor_id', uplineIds).eq('estado', 'entregado').gte('total', 100).gte('created_at', startOfMonth);
          const eligibleSet = new Set((eligibleOrders ?? []).map((o: { distribuidor_id: string }) => o.distribuidor_id));

          const comInserts: object[] = [];
          for (const entry of uplineChain) {
            if (eligibleSet.has(entry.id)) {
              const monto = parseFloat((puntos * entry.porcentaje / 100).toFixed(2));
              if (monto > 0) {
                comInserts.push({
                  beneficiario_id: entry.id,
                  origen_id: distribId,
                  tipo: 'nivel',
                  nivel_red: entry.nivel,
                  monto,
                  estado: 'pendiente',
                  descripcion: `Comisión nivel ${entry.nivel}`,
                });
              }
            }
          }
          if (comInserts.length > 0) await supabaseAdmin.from('comisiones').insert(comInserts);
        }
      }

      await supabaseAdmin.from('pedidos').update({ estado: 'entregado' }).eq('id', pedidoData.id);

      if (total >= 100) setCompraCalificada(true);
      setEarnedPuntos(puntos);
      clear();
      setDone(true);
    } catch (err) {
      setError('Error inesperado. Intenta de nuevo.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-center max-w-md bg-white border border-[#C8D8CB] rounded-3xl p-8 shadow-[0_15px_60px_rgba(26,78,38,0.1)]"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-[#1A4E26] to-[#2B6E3A] rounded-full flex items-center justify-center mx-auto mb-5 shadow-[0_8px_24px_rgba(26,78,38,0.3)]">
            <CheckCircle2 size={40} className="text-white" />
          </div>
          <h2 className="font-heading font-bold text-3xl text-[#111111] mb-2">¡Pedido confirmado!</h2>
          <p className="text-[#6B7280] mb-6">Tu pedido fue procesado y aprobado automáticamente.</p>

          {earnedPuntos > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-5 py-3 mb-4 w-full justify-center">
              <Sparkles size={16} className="text-[#D4AF37]" />
              <span className="text-[#D4AF37] font-semibold text-sm">
                Ganaste <span className="font-bold">{earnedPuntos} puntos</span>
              </span>
            </div>
          )}

          {compraCalificada && (
            <div className="flex items-center gap-2 bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl px-5 py-3 mb-6 text-sm text-[#1A4E26] font-semibold">
              <TrendingUp size={16} />
              Estás habilitado para comisiones este mes
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/dashboard/tienda"
              className="py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm hover:border-[#A8C2AD] hover:text-[#111111] transition-all"
            >
              Seguir comprando
            </Link>
            <button
              onClick={() => navigate('/dashboard/pedidos')}
              className="py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all shadow-[0_4px_16px_rgba(26,78,38,0.2)]"
            >
              Ver mis pedidos
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111] flex items-center gap-2">
            <ShoppingCart size={24} className="text-[#1A4E26]" />
            Tu Carrito
          </h1>
          <p className="text-[#6B7280] text-sm mt-1">
            {items.length === 0
              ? 'Tu carrito está vacío. Visita la tienda para añadir productos.'
              : `Revisa tu pedido y confírmalo. Hola, ${profile?.nombre_completo?.split(' ')[0] ?? ''}.`}
          </p>
        </div>
        <Link
          to="/dashboard/tienda"
          className="inline-flex items-center gap-1.5 text-[#1A4E26] text-sm font-semibold hover:gap-2 transition-all"
        >
          <ArrowLeft size={14} /> Volver a la tienda
        </Link>
      </div>

      {/* Activación mensual */}
      {!loadingStatus && (
        <div className={`flex items-start gap-3 rounded-2xl px-5 py-4 mb-6 border ${
          compraCalificada
            ? 'bg-[#EBF4ED] border-[#1A4E26]/20'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
            compraCalificada ? 'bg-[#1A4E26]' : 'bg-amber-500'
          }`}>
            {compraCalificada ? <CheckCircle2 size={18} className="text-white" /> : <AlertCircle size={18} className="text-white" />}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold mb-1 ${compraCalificada ? 'text-[#1A4E26]' : 'text-amber-700'}`}>
              {compraCalificada
                ? '✓ Activo este mes — recibes comisiones'
                : 'Aún no estás activo este mes'
              }
            </p>
            <p className={`text-xs ${compraCalificada ? 'text-[#1A4E26]/80' : 'text-amber-600'}`}>
              {compraCalificada
                ? `Has cumplido la meta de $100 en un solo pedido este mes. Total acumulado: $${totalMes.toFixed(2)}.`
                : `Realiza al menos un pedido de $100 o más en un solo pedido este mes para mantener tu cupo de comisiones. Acumulado este mes: $${totalMes.toFixed(2)}.`}
            </p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white border border-[#C8D8CB] rounded-3xl p-16 text-center">
          <div className="w-20 h-20 bg-[#F4F7F5] rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={32} className="text-[#9CA3AF]" />
          </div>
          <h3 className="font-heading font-bold text-xl text-[#111111] mb-2">Tu carrito está vacío</h3>
          <p className="text-[#6B7280] text-sm mb-6 max-w-sm mx-auto">
            Explora el catálogo y agrega productos a tu precio distribuidor para empezar.
          </p>
          <Link
            to="/dashboard/tienda"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all shadow-[0_8px_24px_rgba(26,78,38,0.25)]"
          >
            <Plus size={16} /> Ir a la tienda
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Items list */}
          <div className="xl:col-span-2 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#C8D8CB] flex items-center justify-between bg-[#F4F7F5]">
              <h2 className="font-heading font-bold text-[#111111] text-sm">
                {items.length} producto{items.length !== 1 ? 's' : ''} en tu carrito
              </h2>
              <button
                onClick={clear}
                className="text-[#6B7280] hover:text-red-600 text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={13} /> Vaciar carrito
              </button>
            </div>

            <div className="divide-y divide-[#C8D8CB]">
              {items.map((item) => (
                <div key={item.codigo} className="px-6 py-4 flex items-center gap-4">
                  {/* Image */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center shrink-0 overflow-hidden" style={{ background: 'linear-gradient(160deg, #EBF4ED 0%, #D5ECD9 100%)' }}>
                    {item.imagen ? (
                      <img src={item.imagen} alt={item.nombre} className="max-h-full max-w-full object-contain p-2" />
                    ) : (
                      <Leaf size={20} className="text-[#1A4E26] opacity-40" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link to={`/dashboard/tienda/${item.codigo}`} className="block">
                      <p className="text-[#111111] font-bold text-sm leading-tight truncate hover:text-[#1A4E26] transition-colors">
                        {item.nombre}
                      </p>
                    </Link>
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      <span className="line-through">${item.pvp.toFixed(2)}</span>{' '}
                      <span className="text-[#1A4E26] font-bold">${item.precio.toFixed(2)}</span>{' '}
                      <span className="text-[#9CA3AF]">c/u</span>
                    </p>
                  </div>

                  {/* Qty */}
                  <div className="flex items-center border border-[#C8D8CB] rounded-xl overflow-hidden shrink-0">
                    <button
                      onClick={() => setQty(item.codigo, item.cantidad - 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                      aria-label="Disminuir"
                    >
                      <Minus size={12} className="text-[#6B7280]" />
                    </button>
                    <span className="w-9 text-center font-bold text-[#111111] text-sm">{item.cantidad}</span>
                    <button
                      onClick={() => setQty(item.codigo, item.cantidad + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-[#F4F7F5] transition-colors"
                      aria-label="Aumentar"
                    >
                      <Plus size={12} className="text-[#6B7280]" />
                    </button>
                  </div>

                  {/* Subtotal */}
                  <div className="text-right shrink-0 w-20 sm:w-24">
                    <p className="font-heading font-bold text-[#111111] text-base">
                      ${(item.precio * item.cantidad).toFixed(2)}
                    </p>
                    <button
                      onClick={() => removeItem(item.codigo)}
                      className="text-[#9CA3AF] hover:text-red-600 text-xs mt-1 transition-colors flex items-center gap-1 justify-end ml-auto"
                    >
                      <X size={11} /> Quitar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="xl:col-span-1">
            <div className="sticky top-6 bg-white border border-[#C8D8CB] rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-[#C8D8CB] bg-[#F4F7F5]">
                <h2 className="font-heading font-bold text-[#111111] text-sm">Resumen del pedido</h2>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[#6B7280]">Subtotal ({items.length} producto{items.length !== 1 ? 's' : ''})</span>
                  <span className="text-[#111111] font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#D4AF37]">Ahorro total (50% off)</span>
                  <span className="text-[#D4AF37] font-semibold">- ${savings.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#D4AF37]">★ Puntos a ganar</span>
                  <span className="text-[#D4AF37] font-bold">{puntos} pts</span>
                </div>

                <div className="border-t border-[#C8D8CB] pt-3 flex justify-between items-baseline">
                  <span className="font-heading font-bold text-[#111111]">Total</span>
                  <span className="font-heading font-bold text-2xl text-[#1A4E26]">${total.toFixed(2)}</span>
                </div>

                {willQualify && !compraCalificada && (
                  <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-3 flex items-start gap-2 text-xs text-[#1A4E26]">
                    <TrendingUp size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">¡Este pedido te activa el mes!</p>
                      <p className="text-[#1A4E26]/80 leading-snug">Superas los $100 — tendrás cupo a comisiones este mes.</p>
                    </div>
                  </div>
                )}

                {!willQualify && !compraCalificada && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-700">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Faltan ${(100 - subtotal).toFixed(2)} para activarte</p>
                      <p className="text-amber-600 leading-snug">Necesitas $100 en un solo pedido para mantener tu cupo a comisiones este mes.</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-red-600 text-xs">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || items.length === 0}
                  className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(26,78,38,0.25)] transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      Confirmar pedido <ArrowRight size={15} />
                    </>
                  )}
                </button>
                <Link
                  to="/dashboard/tienda"
                  className="w-full py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-semibold hover:border-[#A8C2AD] hover:text-[#111111] transition-all flex items-center justify-center gap-2"
                >
                  <ShoppingCart size={14} /> Seguir comprando
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
