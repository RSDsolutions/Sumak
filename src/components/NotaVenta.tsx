import { useMemo } from 'react';
import { Printer, X, Download, MapPin, Phone, Mail, CheckCircle2 } from 'lucide-react';
import { contactInfo } from '../data';

export interface NotaVentaItem {
  producto_codigo: string;
  producto_nombre: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface NotaVentaData {
  numero: string;
  fecha: string;
  estado: string;
  cliente: {
    nombre: string;
    codigo?: string;
    cedula?: string;
    email?: string;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
  };
  items: NotaVentaItem[];
  subtotal: number;
  total: number;
  puntos: number;
  banco_destino?: string | null;
  voucher_numero?: string | null;
  notas?: string | null;
}

interface NotaVentaProps {
  data: NotaVentaData;
  open: boolean;
  onClose: () => void;
}

function formatFecha(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('es-EC', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function formatMoney(n: number) {
  return n.toLocaleString('es-EC', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function NotaVenta({ data, open, onClose }: NotaVentaProps) {
  const itemsCount = useMemo(
    () => data.items.reduce((s, i) => s + i.cantidad, 0),
    [data.items],
  );

  if (!open) return null;

  function handlePrint() {
    window.print();
  }

  return (
    // Layout con scroll natural (sin flex centering que atrapa el contenido
    // cuando es mas alto que el viewport). El backdrop ocupa toda la
    // pantalla y el modal scrollea dentro.
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm overflow-y-auto print:static print:bg-white print:overflow-visible">
      <div className="min-h-full flex justify-center p-3 sm:p-6 print:p-0">
        <div className="bg-white rounded-2xl max-w-3xl w-full my-auto shadow-2xl print:shadow-none print:rounded-none print:my-0 print:max-w-none">
        {/* Toolbar (oculto al imprimir) — sticky para que el boton Cerrar
            siempre quede visible aunque hagas scroll en notas largas. */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl flex items-center justify-between gap-3 px-5 py-3 border-b border-[#C8D8CB] print:hidden print:static">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[#1A4E26]" />
            <p className="font-bold text-[#111111] text-sm">Nota de Venta {data.numero}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-[#1A4E26] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#163F1E] transition-colors"
            >
              <Printer size={13} /> Imprimir / Guardar PDF
            </button>
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#111111] p-2 transition-colors"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Documento */}
        <div className="p-8 print:p-10" id="nota-venta-doc">
          {/* Encabezado: logo + datos empresa + número de nota */}
          <div className="flex items-start justify-between gap-6 mb-8 pb-6 border-b border-[#C8D8CB]">
            <div className="flex items-start gap-4">
              <img
                src="/LOGO_SUMAK.png"
                alt="Sumak Vida Ecuador"
                className="h-16 w-auto object-contain"
              />
              <div>
                <h1 className="font-heading font-black text-xl text-[#1A4E26] leading-tight">
                  {contactInfo.empresa}
                </h1>
                <p className="text-[10px] text-[#6B7280] font-bold uppercase tracking-widest mt-0.5">
                  {contactInfo.nombreComercial}
                </p>
                <p className="text-[11px] text-[#6B7280] mt-2 leading-relaxed">
                  RUC: <span className="font-mono font-semibold text-[#111111]">{contactInfo.ruc}</span>
                </p>
                <p className="text-[11px] text-[#6B7280] flex items-center gap-1 mt-1">
                  <MapPin size={10} /> {contactInfo.direccion}
                </p>
                <p className="text-[11px] text-[#6B7280] flex items-center gap-1">
                  <Phone size={10} /> {contactInfo.telefono1}
                  {contactInfo.telefono2 && ` · ${contactInfo.telefono2}`}
                </p>
                <p className="text-[11px] text-[#6B7280] flex items-center gap-1">
                  <Mail size={10} /> {contactInfo.emailPrincipal}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="bg-gradient-to-br from-[#1A4E26] to-[#0F2E18] text-white rounded-xl p-4 inline-block">
                <p className="text-[#D4AF37] text-[9px] font-bold uppercase tracking-[0.2em]">
                  Nota de Venta
                </p>
                <p className="font-heading font-black text-2xl mt-0.5">{data.numero}</p>
              </div>
              <p className="text-[#6B7280] text-xs mt-2">
                Emitida el <strong className="text-[#111111]">{formatFecha(data.fecha)}</strong>
              </p>
              <span className={`inline-flex items-center gap-1 mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${
                data.estado === 'entregado'
                  ? 'bg-[#1A4E26] text-white'
                  : data.estado === 'enviado'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-[#FFF8DC] text-[#92680A] border border-[#D4AF37]/30'
              }`}>
                {data.estado === 'entregado' ? '✓ Entregado' :
                 data.estado === 'enviado' ? '🚚 Enviado' :
                 data.estado}
              </span>
            </div>
          </div>

          {/* Datos del cliente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-7">
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2 pb-1 border-b border-[#C8D8CB]">
                Cliente / Distribuidor
              </h3>
              <p className="font-bold text-[#111111] text-base mb-1">{data.cliente.nombre}</p>
              {data.cliente.codigo && (
                <p className="text-xs text-[#6B7280]">
                  Código: <span className="font-mono font-semibold text-[#1A4E26]">{data.cliente.codigo}</span>
                </p>
              )}
              {data.cliente.cedula && (
                <p className="text-xs text-[#6B7280]">
                  Cédula: <span className="font-mono">{data.cliente.cedula}</span>
                </p>
              )}
              {data.cliente.email && (
                <p className="text-xs text-[#6B7280]">{data.cliente.email}</p>
              )}
              {data.cliente.telefono && (
                <p className="text-xs text-[#6B7280]">{data.cliente.telefono}</p>
              )}
            </div>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2 pb-1 border-b border-[#C8D8CB]">
                Dirección de Envío
              </h3>
              {data.cliente.direccion ? (
                <>
                  <p className="text-sm text-[#111111] leading-relaxed">{data.cliente.direccion}</p>
                  {data.cliente.ciudad && (
                    <p className="text-xs text-[#6B7280] mt-0.5">{data.cliente.ciudad}, Ecuador</p>
                  )}
                </>
              ) : (
                <p className="text-xs text-[#9CA3AF] italic">Dirección no especificada</p>
              )}
            </div>
          </div>

          {/* Detalle de productos */}
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280] mb-2">
            Detalle del Pedido
          </h3>
          <div className="border border-[#C8D8CB] rounded-xl overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead className="bg-[#F4F7F5] text-[#6B7280] text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-2.5 font-bold">Código</th>
                  <th className="text-left px-4 py-2.5 font-bold">Producto</th>
                  <th className="text-center px-3 py-2.5 font-bold">Cant.</th>
                  <th className="text-right px-3 py-2.5 font-bold">Unit.</th>
                  <th className="text-right px-4 py-2.5 font-bold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#C8D8CB]">
                {data.items.map((it, idx) => (
                  <tr key={idx} className="text-[#111111]">
                    <td className="px-4 py-3 text-xs font-mono text-[#6B7280]">{it.producto_codigo}</td>
                    <td className="px-4 py-3 leading-snug">{it.producto_nombre}</td>
                    <td className="px-3 py-3 text-center font-semibold">{it.cantidad}</td>
                    <td className="px-3 py-3 text-right font-mono">${formatMoney(it.precio_unitario)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">${formatMoney(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales */}
          <div className="flex flex-col items-end gap-1 mb-6">
            <div className="w-full sm:w-72 space-y-1.5">
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>Subtotal ({itemsCount} producto{itemsCount !== 1 ? 's' : ''}):</span>
                <span className="font-mono font-semibold text-[#111111]">${formatMoney(data.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-[#6B7280]">
                <span>Puntos generados:</span>
                <span className="font-mono font-semibold text-[#D4AF37]">★ {data.puntos}</span>
              </div>
              <div className="border-t border-[#1A4E26]/30 pt-2 mt-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-heading font-bold text-[#111111] text-base">TOTAL:</span>
                  <span className="font-heading font-black text-[#1A4E26] text-2xl">${formatMoney(data.total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Información del pago */}
          {(data.banco_destino || data.voucher_numero) && (
            <div className="bg-[#EBF4ED] border border-[#1A4E26]/20 rounded-xl p-4 mb-6">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#1A4E26] mb-2">
                Información del Pago
              </p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {data.banco_destino && (
                  <div>
                    <p className="text-[#6B7280]">Banco destino</p>
                    <p className="font-bold text-[#111111]">{data.banco_destino}</p>
                  </div>
                )}
                {data.voucher_numero && (
                  <div>
                    <p className="text-[#6B7280]">N° comprobante</p>
                    <p className="font-bold text-[#111111] font-mono">{data.voucher_numero}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {data.notas && (
            <div className="text-xs text-[#6B7280] mb-6 italic">
              <strong className="text-[#111111] not-italic">Notas: </strong>
              {data.notas}
            </div>
          )}

          {/* Footer */}
          <div className="pt-5 border-t border-[#C8D8CB] text-center">
            <p className="text-[#1A4E26] font-heading font-bold text-sm mb-1">
              ¡Gracias por confiar en SUMAK!
            </p>
            <p className="text-[10px] text-[#6B7280] leading-relaxed max-w-md mx-auto">
              {contactInfo.slogan}. Bienestar natural con sabiduría ancestral andina y amazónica.
              Para reclamos o consultas, escríbenos a {contactInfo.emailPrincipal} o
              al WhatsApp +{contactInfo.whatsapp}.
            </p>
            <p className="text-[9px] text-[#9CA3AF] mt-3 font-mono">
              Documento generado electrónicamente · {contactInfo.empresa} · RUC {contactInfo.ruc}
            </p>
          </div>
        </div>
        </div>
      </div>

      {/* Print styles: ocultar todo lo que no sea el documento */}
      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </div>
  );
}

// Helper para descargar como PDF (usa window.print que el navegador
// convierte a PDF con "Guardar como PDF" en el diálogo de impresión).
export function downloadAsPDF() {
  window.print();
}

export { Download };
