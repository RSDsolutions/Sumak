import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, CheckCircle2 } from 'lucide-react';
import { products } from '../../data';
import { supabase } from '../../lib/supabase';
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

  const DISCOUNT = 0.5; // 50% discount for distributors

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

  async function handleSubmit() {
    if (cartItems.length === 0 || !user) return;
    setSubmitting(true);
    setError('');

    try {
      const puntos = totalPuntos;

      // Insert pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
          distribuidor_id: user.id,
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

      // Insert items
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
        <div className="text-center">
          <div className="w-20 h-20 bg-[#00A86B]/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={40} className="text-[#00A86B]" />
          </div>
          <h2 className="font-heading font-bold text-2xl text-[#F0F0F0] mb-2">¡Pedido Enviado!</h2>
          <p className="text-[#888888] mb-4">Tu pedido ha sido registrado. El equipo SUMAK lo procesará pronto.</p>
          {earnedPuntos > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-xl px-5 py-3 mb-6">
              <span className="text-[#D4AF37] text-lg font-bold">★</span>
              <span className="text-[#D4AF37] font-semibold text-sm">
                Ganarás <span className="font-bold text-base">{earnedPuntos} puntos</span> cuando tu pedido sea entregado
              </span>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setDone(false); setQuantities({}); setEarnedPuntos(0); }}
              className="px-6 py-3 rounded-xl border border-[#2E2E2E] text-[#888888] font-semibold text-sm hover:border-[#3A3A3A] hover:text-[#F0F0F0] transition-all duration-200"
            >
              Nuevo Pedido
            </button>
            <button
              onClick={() => navigate('/dashboard/pedidos')}
              className="px-6 py-3 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] transition-all duration-200"
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
      <div className="mb-8">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-[#F0F0F0]">Nuevo Pedido</h1>
        <p className="text-[#888888] text-sm mt-1">Selecciona los productos que deseas ordenar a precio distribuidor</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Product catalog */}
        <div className="xl:col-span-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {products.map((p) => {
              const qty = quantities[p.codigo] ?? 0;
              const precioDistribuidor = parseFloat((p.pvp * DISCOUNT).toFixed(2));
              const ahorro = parseFloat((p.pvp - precioDistribuidor).toFixed(2));

              return (
                <div
                  key={p.codigo}
                  className={`bg-[#1A1A1A] border rounded-2xl p-5 transition-all duration-200 ${
                    qty > 0 ? 'border-[#00A86B]/40 bg-[#00A86B]/5' : 'border-[#2E2E2E]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-[#F0F0F0] font-semibold text-sm">{p.nombre}</p>
                      <p className="text-[#888888] text-xs mt-0.5">{p.categoria}</p>
                    </div>
                    <span className="text-[#888888] text-xs font-mono ml-2">#{p.codigo}</span>
                  </div>
                  <p className="text-[#888888] text-xs mb-3 leading-relaxed">{p.descripcion}</p>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-[#888888] text-xs line-through">PVP: ${p.pvp.toFixed(2)}</p>
                      <p className="text-[#00A86B] font-bold">Tu precio: ${precioDistribuidor.toFixed(2)}</p>
                      <p className="text-[#D4AF37] text-xs">Ahorras: ${ahorro.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQty(p.codigo, qty - 1)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-lg bg-[#222222] border border-[#2E2E2E] flex items-center justify-center text-[#888888] hover:text-[#F0F0F0] hover:border-[#3A3A3A] disabled:opacity-30 transition-all duration-200"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-[#F0F0F0] font-bold text-sm">{qty}</span>
                      <button
                        onClick={() => setQty(p.codigo, qty + 1)}
                        className="w-8 h-8 rounded-lg bg-[#00A86B]/10 border border-[#00A86B]/30 flex items-center justify-center text-[#00A86B] hover:bg-[#00A86B]/20 transition-all duration-200"
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

        {/* Cart summary */}
        <div className="xl:col-span-1">
          <div className="sticky top-6 bg-[#1A1A1A] border border-[#2E2E2E] rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-5">
              <ShoppingCart size={20} className="text-[#00A86B]" />
              <h2 className="font-heading font-semibold text-[#F0F0F0]">Tu Pedido</h2>
            </div>

            {cartItems.length === 0 ? (
              <p className="text-[#888888] text-sm text-center py-6">
                Selecciona productos del catálogo
              </p>
            ) : (
              <>
                <div className="space-y-3 mb-5 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.codigo} className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-[#F0F0F0] text-sm truncate">{item.nombre}</p>
                        <p className="text-[#888888] text-xs">{item.cantidad} × ${item.precio.toFixed(2)}</p>
                      </div>
                      <p className="text-[#F0F0F0] font-semibold text-sm shrink-0">
                        ${(item.precio * item.cantidad).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[#2E2E2E] pt-4 space-y-2 mb-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#888888]">Subtotal</span>
                    <span className="text-[#F0F0F0]">${total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#D4AF37]">Ahorro total</span>
                    <span className="text-[#D4AF37]">${savingsTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#D4AF37]">★ Puntos a ganar</span>
                    <span className="text-[#D4AF37] font-semibold">{totalPuntos} pts</span>
                  </div>
                  <div className="flex justify-between font-bold pt-2 border-t border-[#2E2E2E]">
                    <span className="text-[#F0F0F0]">Total</span>
                    <span className="text-[#00A86B] text-lg">${total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={cartItems.length === 0 || submitting}
              className="w-full py-4 rounded-xl bg-[#00A86B] text-white font-bold text-sm hover:bg-[#008F5A] disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,168,107,0.2)] transition-all duration-200"
            >
              {submitting ? 'Enviando...' : `Realizar Pedido ($${total.toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
