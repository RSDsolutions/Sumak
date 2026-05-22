import { Link } from 'react-router-dom';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { TikTokIcon } from './TikTokIcon';

export default function Footer() {
  return (
    <footer className="bg-[#0A0A0A] border-t border-brand-border relative pt-16 pb-8">
      {/* Emerald thin line signature */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-brand-emerald opacity-50"></div>
      
      <div className="max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative w-10 h-10 rounded-full border border-brand-emerald flex items-center justify-center bg-brand-black shrink-0">
                <div className="flex flex-col items-center">
                  <span className="font-heading font-bold text-[#F0F0F0] text-[9px] tracking-widest">SUMAK</span>
                  <span className="text-brand-gold text-[5px] font-medium tracking-[0.25em] uppercase mt-[1px]">ECUADOR</span>
                </div>
              </div>
              <div className="flex flex-col justify-center">
                <span className="font-heading font-bold text-[#F0F0F0] text-lg leading-tight tracking-wide">SUMAK</span>
              </div>
            </div>
            <p className="text-brand-text-muted text-sm leading-relaxed max-w-sm">
              Salud, crecimiento y libertad financiera.<br />
              Suplementos premium y oportunidad de negocio multinivel.
            </p>
            <p className="text-brand-gold-dim text-xs font-medium uppercase tracking-wider mt-2">
              Ecuador · Red de distribuidores activa
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-heading text-[#F0F0F0] font-semibold mb-2">Enlaces Rápidos</h4>
            <Link to="/" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Inicio</Link>
            <Link to="/productos" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Productos</Link>
            <Link to="/plan-multinivel" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Plan Multinivel</Link>
            <Link to="/como-funciona" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Cómo Funciona</Link>
          </div>

          <div className="flex flex-col gap-4">
            <h4 className="font-heading text-[#F0F0F0] font-semibold mb-2">Soporte</h4>
            <Link to="/testimonios" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Testimonios</Link>
            <Link to="/contacto" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Contacto</Link>
            <Link to="/registro" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Crea tu Cuenta</Link>
            <Link to="/login" className="text-brand-text-muted hover:text-brand-emerald transition-colors text-sm">Acceso Distribuidores</Link>
          </div>

          <div className="flex flex-col gap-6">
            <h4 className="font-heading text-[#F0F0F0] font-semibold">Conéctate</h4>
            <a 
              href="https://wa.me/593999999999" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-emerald text-white text-xs font-semibold shadow-emerald-glow hover:bg-brand-emerald-hover transition-colors w-fit"
            >
              Contactar por WhatsApp
            </a>
            <div className="flex items-center gap-3">
              <a href="#" className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text-muted hover:border-brand-emerald hover:text-brand-emerald transition-colors">
                <Instagram size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text-muted hover:border-brand-emerald hover:text-brand-emerald transition-colors">
                <Facebook size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text-muted hover:border-brand-emerald hover:text-brand-emerald transition-colors">
                <TikTokIcon size={18} />
              </a>
              <a href="#" className="w-10 h-10 rounded-full border border-brand-border flex items-center justify-center text-brand-text-muted hover:border-brand-emerald hover:text-brand-emerald transition-colors">
                <Youtube size={18} />
              </a>
            </div>
            <a href="mailto:info@sumakecuador.com" className="text-brand-text-muted text-sm hover:text-brand-emerald transition-colors">
              info@sumakecuador.com
            </a>
          </div>

        </div>

        <div className="pt-8 border-t border-brand-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#555555] text-xs">
            © 2025 Sumak Ecuador · Todos los derechos reservados.
          </p>
          <div className="flex gap-4">
            <Link to="#" className="text-[#555555] text-xs hover:text-brand-text-muted">Términos y Condiciones</Link>
            <Link to="#" className="text-[#555555] text-xs hover:text-brand-text-muted">Políticas de Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
