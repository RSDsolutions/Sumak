import { Link } from 'react-router-dom';
import { ArrowRight, Lock, Network, DollarSign, Package } from 'lucide-react';

export default function Login() {
  return (
    <div className="w-full bg-brand-black min-h-screen flex flex-col justify-center relative overflow-hidden">
      
      {/* Visual background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-brand-emerald/10 blur-[150px] opacity-40"></div>
        <div className="absolute inset-0 bg-[#000000] opacity-50"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 w-full py-24 flex flex-col items-center">
         
         <div className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[24px] border-t-4 border-t-brand-emerald shadow-[0_20px_60px_rgba(0,168,107,0.15)] p-10 mb-12 relative">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2">
                <div className="w-20 h-20 rounded-full border border-brand-emerald flex items-center justify-center bg-brand-black shadow-emerald-glow">
                  <div className="flex flex-col items-center">
                    <span className="font-heading font-bold text-[#F0F0F0] text-sm tracking-widest">SUMAK</span>
                    <span className="text-brand-gold text-[8px] font-medium tracking-[0.25em] uppercase mt-[1px]">ECUADOR</span>
                  </div>
                </div>
            </div>

            <div className="mt-10 text-center mb-10">
               <h1 className="font-heading font-bold text-2xl text-[#F0F0F0]">Acceso a Distribuidores</h1>
            </div>

            <form className="flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
               <div className="flex flex-col gap-2">
                  <label className="text-sm text-[#888] font-medium ml-1">Correo o Código ID</label>
                  <input type="text" placeholder="ID-00000" className="w-full bg-[#111] border border-[#333] rounded-xl px-5 py-4 text-white focus:outline-none focus:border-brand-emerald transition-colors" />
               </div>
               
               <div className="flex flex-col gap-2">
                  <label className="text-sm text-[#888] font-medium ml-1">Contraseña</label>
                  <input type="password" placeholder="••••••••" className="w-full bg-[#111] border border-[#333] rounded-xl px-5 py-4 text-white focus:outline-none focus:border-brand-emerald transition-colors" />
               </div>
               
               <button type="submit" className="w-full bg-brand-emerald text-white rounded-xl py-4 font-bold text-lg hover:bg-brand-emerald-hover transition-colors shadow-emerald-glow flex justify-center items-center gap-2 mt-2">
                 Ingresar <ArrowRight size={18} />
               </button>

               <div className="text-center mt-2">
                  <a href="#" className="text-brand-emerald text-sm hover:underline">¿Olvidaste tu contraseña?</a>
               </div>
            </form>

            <div className="w-full h-px bg-[#333] my-8"></div>

            <div className="text-center">
               <span className="text-[#888] text-sm">¿No tienes cuenta?</span> 
               <Link to="/registro" className="text-brand-gold text-sm font-semibold ml-2 hover:underline">Regístrate aquí</Link>
            </div>
            
            <div className="mt-8 text-center">
               <span className="text-[#666] text-[11px] uppercase tracking-wider font-medium flex items-center justify-center gap-2">
                  <Lock size={12} /> Conexión Segura Backoffice 3.0
               </span>
            </div>
         </div>

         {/* Teasers below */}
         <div className="w-full max-w-4xl opacity-70 hover:opacity-100 transition-opacity">
            <h3 className="text-center text-[#888] text-sm uppercase tracking-widest font-medium mb-8">La gestión total de tu negocio en un solo lugar</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="bg-[#111] border border-[#222] p-6 rounded-2xl flex flex-col items-center text-center">
                  <Network className="text-brand-emerald w-8 h-8 mb-4 border border-brand-emerald/30 p-1.5 rounded-lg bg-brand-emerald/10" />
                  <span className="font-heading font-semibold text-[#F0F0F0] mb-2">Mi Red Binaria</span>
                  <span className="text-xs text-[#777]">Acceso exclusivo para visualizar tu árbol de red en tiempo real.</span>
               </div>
               <div className="bg-[#111] border border-[#222] p-6 rounded-2xl flex flex-col items-center text-center">
                  <DollarSign className="text-brand-emerald w-8 h-8 mb-4 border border-brand-emerald/30 p-1.5 rounded-lg bg-brand-emerald/10" />
                  <span className="font-heading font-semibold text-[#F0F0F0] mb-2">Mis Comisiones</span>
                  <span className="text-xs text-[#777]">Estado de cuenta, cobros semanales e historial de bonos.</span>
               </div>
               <div className="bg-[#111] border border-[#222] p-6 rounded-2xl flex flex-col items-center text-center">
                  <Package className="text-brand-emerald w-8 h-8 mb-4 border border-brand-emerald/30 p-1.5 rounded-lg bg-brand-emerald/10" />
                  <span className="font-heading font-semibold text-[#F0F0F0] mb-2">Mis Pedidos</span>
                  <span className="text-xs text-[#777]">Compras, autotienda con precio afiliado y rastreo nacional.</span>
               </div>
            </div>
         </div>

      </div>
    </div>
  );
}
