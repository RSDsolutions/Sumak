import { Link } from 'react-router-dom';
import { Instagram, Facebook, Phone, Mail, MapPin } from 'lucide-react';
import { contactInfo } from '../data';

export default function Footer() {
  return (
    <footer className="bg-[#F4F7F5] border-t border-[#C8D8CB] relative pt-14 pb-8">
      <div className="absolute top-0 left-0 w-full h-[2px] bg-[#1A4E26] opacity-40" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* Brand column */}
          <div className="flex flex-col gap-4">
            <Link to="/" className="inline-block">
              <img src="/LOGO_SUMAK.png" alt="Sumak Vida" className="h-16 w-auto object-contain" />
            </Link>
            <p className="text-[#6B7280] text-sm leading-relaxed">
              {contactInfo.slogan}
            </p>
            <p className="text-[#D4AF37] text-xs font-medium uppercase tracking-widest mt-1">
              Sumak Vida Ecuador S.A.
            </p>
          </div>

          {/* Navigation */}
          <div className="flex flex-col gap-3">
            <h4 className="font-heading text-[#111111] font-semibold mb-1 text-sm uppercase tracking-wider">
              Navegación
            </h4>
            {[
              { label: 'Inicio', to: '/' },
              { label: 'Nosotros', to: '/nosotros' },
              { label: 'Productos', to: '/productos' },
              { label: 'Oportunidad', to: '/oportunidad' },
              { label: 'Plan Multinivel', to: '/plan-multinivel' },
              { label: 'Escaleras de Éxito', to: '/escaleras' },
              { label: 'Contacto', to: '/contacto' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[#6B7280] hover:text-[#1A4E26] transition-colors text-sm"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Contact + Social */}
          <div className="flex flex-col gap-5">
            <div>
              <h4 className="font-heading text-[#111111] font-semibold mb-3 text-sm uppercase tracking-wider">
                Contacto
              </h4>
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2 text-[#6B7280] text-sm">
                  <Phone size={14} className="mt-0.5 shrink-0 text-[#1A4E26]" />
                  <span>{contactInfo.telefono1}</span>
                </div>
                <div className="flex items-start gap-2 text-[#6B7280] text-sm">
                  <Mail size={14} className="mt-0.5 shrink-0 text-[#1A4E26]" />
                  <div className="flex flex-col gap-0.5">
                    <a href={`mailto:${contactInfo.emailPrincipal}`} className="hover:text-[#1A4E26] transition-colors">
                      {contactInfo.emailPrincipal}
                    </a>
                    <a href={`mailto:${contactInfo.emailSecundario}`} className="hover:text-[#1A4E26] transition-colors">
                      {contactInfo.emailSecundario}
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-[#6B7280] text-sm">
                  <MapPin size={14} className="mt-0.5 shrink-0 text-[#1A4E26]" />
                  <span>{contactInfo.direccion}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-heading text-[#111111] font-semibold mb-3 text-sm uppercase tracking-wider">
                Síguenos
              </h4>
              <div className="flex items-center gap-3">
                <a
                  href="https://www.facebook.com/SumakVidaEcuador"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-[#C8D8CB] flex items-center justify-center text-[#6B7280] hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
                  aria-label="Facebook"
                >
                  <Facebook size={16} />
                </a>
                <a
                  href="https://www.instagram.com/sumakvidaecuador"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-[#C8D8CB] flex items-center justify-center text-[#6B7280] hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
                  aria-label="Instagram"
                >
                  <Instagram size={16} />
                </a>
                <a
                  href={`https://wa.me/${contactInfo.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-[#C8D8CB] flex items-center justify-center text-[#6B7280] hover:border-[#25D366] hover:text-[#25D366] transition-all duration-200"
                  aria-label="WhatsApp"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[#E0EAE2] flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-[#9CA3AF] text-xs text-center sm:text-left">
            RUC: {contactInfo.ruc} &nbsp;|&nbsp; © 2026 Sumak Vida Ecuador S.A. &nbsp;|&nbsp; Todos los derechos reservados
          </p>
          <div className="flex gap-5 flex-wrap justify-center">
            <Link to="/manual" className="text-[#9CA3AF] text-xs hover:text-[#6B7280] transition-colors">
              Manual de Políticas
            </Link>
            <Link to="/login" className="text-[#9CA3AF] text-xs hover:text-[#6B7280] transition-colors">
              Acceso Distribuidores
            </Link>
            <Link to="/registro" className="text-[#9CA3AF] text-xs hover:text-[#6B7280] transition-colors">
              Únete
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
