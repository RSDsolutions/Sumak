import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, CheckCircle2, AlertCircle, TrendingUp } from 'lucide-react';
import { products, levelCommissions } from '../../data';
import { supabase, supabaseAdmin } from '../../lib/supabase';
import { useAuth } from '../../lib/auth';

interface CartItem {
  codigo: string;
  nombre: string;
  pvp: number;
  precio: number;
  cantidad: number;
}

export default function NuevoPedido() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [earnedPuntos, setEarnedPuntos] = useState(0);
  const [compraCalificada, setCompraCalificada] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const DISCOUNT = 0.5;

  useEffect(() => {
    if (!user) return;
    async function checkMonthly() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data } = await supabase
        .from('pedidos')
        .select('id')
        .eq('distribuidor_id', user!.id)
        .eq('estado', 'entregado')
        .gte('total', 100)
        .gte('created_at', startOfMonth)
        .limit(1);
      setCompraCalificada((data?.length ?? 0) > 0);
      setLoadingStatus(false);
    }
    checkMonthly();
  }, [user]);

  function setQty(codigo: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [codigo]: Math.max(0, qty) }));
  }

  const cartItems: CartItem[] = products
    .filter((p) => (quantities[p.codigo] ?? 0) > 0)
    .map((p) => ({
      codigo: p.codigo,
      nombre: p.nombre,
      pvp: p.pvp,
      precio: parseFloat((p.pvp * DISCOUNT).toFixed(2)),
      cantidad: quantities[p.codigo],
    }));

  const total = cartItems.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const savingsTotal = cartItems.reduce((s, i) => s + (i.pvp - i.precio) * i.cantidad, 0);
  const totalPuntos = cartItems.reduce((s, i) => s + Math.round(i.precio * i.cantidad), 0);
  const willQualify = total >= 100;

  async function handleSubmit() {
    if (cartItems.length === 0 || !user) return;
    setSubmitting(true);
    setError('');

    try {
      const puntos = totalPuntos;
      const distribId = user.id;

      // 1. Crear pedido
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

      // 2. Insertar ítems
      const items = cartItems.map((item) => ({
        pedido_id: pedidoData.id,
        producto_codigo: item.codigo,
        producto_nombre: item.nombre,
        cantidad: item.cantidad,
        precio_unitario: item.precio,
        subtotal: parseFloat((item.precio * item.cantidad).toFixed(2)),
      }));
      const { error: itemsError } = await supabase.from('pedido_items').insert(items);
      if (itemsError) {
        setError('Error al guardar los productos: ' + itemsError.message);
        return;
      }

      // 3. Sumar puntos al comprador inmediatamente
      if (puntos > 0) {
        const { data: myProfile } = await supabaseAdmin
          .from('profiles')
          .select('puntos')
          .eq('id', distribId)
          .single();
        if (myProfile) {
          await supabaseAdmin
            .from('profiles')
            .update({ puntos: Number(myProfile.puntos) + puntos })
            .eq('id', distribId);
        }
      }

      // 4. Comisiones por nivel para upline elegible (requiere compra mensual ≥ $100)
      if (puntos > 0) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

        const { data: allProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, patrocinador_id');

        const profMap = new Map<string, string | null>();
        for (const p of allProfiles ?? []) profMap.set(p.id, p.patrocinador_id);

        // Construir cadena de upline (hasta 14 niveles)
        const uplineChain: Array<{ id: string; nivel: number; porcentaje: number }> = [];
        let upId: string | null = distribId;
        for (const lc of levelCommissions) {
          const sponsorId = profMap.get(upId!) ?? null;
          if (!sponsorId) break;
          upId = sponsorId;
          uplineChain.push({ id: upId, nivel: lc.nivel, porcentaje: lc.porcentaje });
        }

        if (uplineChain.length > 0) {
          // Verificar qué miembros del upline tienen compra mensual ≥ $100 (en una sola compra)
          const uplineIds = uplineChain.map((u) => u.id);
          const { data: eligibleOrders } = await supabaseAdmin
            .from('pedidos')
            .select('distribuidor_id')
            .in('distribuidor_id', uplineIds)
            .eq('estado', 'entregado')
            .gte('total', 100)
            .gte('created_at', startOfMonth);

          const eligibleSet = new Set(
            (eligibleOrders ?? []).map((o: { distribuidor_id: string }) => o.distribuidor_id)
          );

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

      // 5. Marcar pedido como entregado (aprobación automática)
      await supabaseAdmin.from('pedidos').update({ estado: 'entregado' }).eq('id', pedidoData.id);

      // Si esta compra califica ($100+), actualizar estado local
      if (total >= 100) setCompraCalificada(true);
      setEarnedPuntos(puntos);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-[#1A4E26]/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-[#1A4E26]" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-[#111111] mb-2">¡Pedido Procesado!</h2>
          <p className="text-[#6B7280] mb-5">Tu pedido ha sido aprobado automáticamente.</p>

          {earnedPuntos > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-5 py-3 mb-4 w-full justify-center">
              <span className="text-[#D4AF37] text-lg font-bold">★</span>
              <span className="text-[#D4AF37] font-semibold text-sm">
                Ganaste <span className="font-bold text-base">{earnedPuntos} puntos</span>
              </span>
            </div>
          )}

          {willQualify && (
            <div className="flex items-center gap-2 bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl px-5 py-3 mb-6 text-sm text-[#1A4E26] font-semibold">
              <TrendingUp size={16} />
              Estás habilitado para recibir comisiones este mes
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setDone(false); setQuantities({}); setEarnedPuntos(0); }}
              className="px-6 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] font-semibold text-sm hover:border-[#A8C2AD] hover:text-[#111111] transition-all duration-200"
            >
              Nuevo Pedido
            </button>
            <button
              onClick={() => navigate('/dashboard/pedidos')}
              className="px-6 py-3 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] transition-all duration-200 shadow-[0_0_12px_rgba(26,78,38,0.2)]"
            >
              Ver Mis Pedidos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#111111]">Nuevo Pedido</h1>
        <p className="text-[#6B7280] text-sm mt-1">Selecciona los productos que deseas ordenar a precio distribuidor</p>
      </div>

      {/* Estado de compra mensual */}
      {!loadingStatus && (
        <div className={`flex items-center gap-3 rounded-xl px-5 py-3 mb-6 border text-sm font-medium ${
          compraCalificada
            ? 'bg-[#EBF4ED] border-[#1A4E26]/20 text-[#1A4E26]'
            : 'bg-amber-50 border-amber-200 text-amber-700'
        }`}>
          {compraCalificada ? (
            <>
              <CheckCircle2 size={16} className="shrink-0" />
              <span>Compra mensual completada — estás habilitado para recibir comisiones este mes</span>
            </>
          ) : (
            <>
              <AlertCircle size={16} className="shrink-0" />
              <span>
                Para recibir comisiones este mes debes realizar <strong>una compra de $100 o más</strong> (en un solo pedido)
              </span>
            </>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Catálogo de productos */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((p) => {
              const qty = quantities[p.codigo] ?? 0;
              const precioDistribuidor = parseFloat((p.pvp * DISCOUNT).toFixed(2));
              const ahorro = parseFloat((p.pvp - precioDistribuidor).toFixed(2));

              return (
                <div
                  key={p.codigo}
                  className={`bg-white border rounded-2xl p-5 transition-all duration-200 shadow-[0_0_8px_rgba(26,78,38,0.04)] ${
                    qty > 0 ? 'border-[#1A4E26]/40 bg-[#EBF4ED]' : 'border-[#C8D8CB]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[#111111] font-semibold text-sm">{p.nombre}</p>
                      <p className="text-[#6B7280] text-xs mt-0.5">{p.categoria}</p>
                    </div>
                    <span className="text-[#9CA3AF] text-xs font-mono ml-2">#{p.codigo}</span>
                  </div>
                  <p className="text-[#6B7280] text-xs mb-3 leading-relaxed">{p.descripcion}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[#9CA3AF] text-xs line-through">PVP: ${p.pvp.toFixed(2)}</p>
                      <p className="text-[#1A4E26] font-bold">Tu precio: ${precioDistribuidor.toFixed(2)}</p>
                      <p className="text-[#D4AF37] text-xs">Ahorras: ${ahorro.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(p.codigo, qty - 1)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-lg bg-[#F4F7F5] border border-[#C8D8CB] flex items-center justify-center text-[#6B7280] hover:text-[#111111] hover:border-[#A8C2AD] disabled:opacity-30 transition-all duration-200"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-[#111111] font-bold text-sm">{qty}</span>
                      <button
                        onClick={() => setQty(p.codigo, qty + 1)}
                        className="w-8 h-8 rounded-lg bg-[#1A4E26]/10 border border-[#1A4E26]/30 flex items-center justify-center text-[#1A4E26] hover:bg-[#1A4E26]/20 transition-all duration-200"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen del carrito */}
        <div className="xl:col-span-1">
          <div className="sticky top-6 bg-white border border-[#C8D8CB] rounded-2xl p-6 shadow-[0_0_8px_rgba(26,78,38,0.04)]">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingCart size={20} className="text-[#1A4E26]" />
              <h2 className="font-heading font-semibold text-[#111111]">Tu Pedido</h2>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-[#9CA3AF] text-sm text-center py-6">
                Selecciona productos del catálogo
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.codigo} className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#111111] text-sm truncate">{item.nombre}</p>
                        <p className="text-[#6B7280] text-xs">{item.cantidad} × ${item.precio.toFixed(2)}</p>
                      </div>
                      <p className="text-[#111111] font-semibold text-sm shrink-0">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#C8D8CB] pt-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#6B7280]">Subtotal</span>
                    <span className="text-[#111111]">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#D4AF37]">Ahorro total</span>
                    <span className="text-[#D4AF37]">${savingsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#D4AF37]">★ Puntos a ganar</span>
                    <span className="text-[#D4AF37] font-semibold">{totalPuntos} pts</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-[#C8D8CB]">
                    <span className="text-[#111111]">Total</span>
                    <span className="text-[#1A4E26] text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>

                {willQualify && !compraCalificada && (
                  <div className="flex items-center gap-2 text-xs text-[#1A4E26] bg-[#EBF4ED] rounded-lg px-3 py-2 mb-4">
                    <TrendingUp size={12} />
                    Este pedido te habilitará para recibir comisiones este mes
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={cartItems.length === 0 || submitting}
              className="w-full py-4 rounded-xl bg-[#1A4E26] text-white font-bold text-sm hover:bg-[#163F1E] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(26,78,38,0.2)] transition-all duration-200"
            >
              {submitting ? 'Procesando...' : `Realizar Pedido ($${total.toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
