import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Facebook, Linkedin, Youtube, Mail } from 'lucide-react';
import { Button } from '../ui/Button';

const socialLinks = [
  { label: 'Facebook', href: 'https://www.facebook.com/', icon: Facebook },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/', icon: Linkedin },
  { label: 'YouTube', href: 'https://www.youtube.com/', icon: Youtube },
];

export function Footer() {
  return (
    <footer className="relative bg-tactical-black border-t-2 border-tactical-border pt-16">
      {/* Tactical line above border */}
      <div className="absolute top-[-2px] left-0 right-0 h-[2px] bg-alert-red"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16">
          <div className="md:col-span-1">
             <div className="flex items-center gap-3 mb-6">
                <div className="relative">
                  <Shield className="w-6 h-6 text-alert-red opacity-80" strokeWidth={1} />
                </div>
                <span className="font-heading text-xl font-bold text-khaki-white tracking-[0.1em]">TAKTIS</span>
              </div>
              <p className="text-muted-dark text-sm leading-relaxed mb-4">
                Formamos a quienes protegen vidas. Capacitación táctica y operacional certificada para cuerpos de seguridad y emergencia.
              </p>
              <p className="text-muted-dark text-sm uppercase tracking-widest text-[10px] font-medium">Ecuador · Capacitación Táctica Certificada</p>
          </div>

          <div className="grid grid-cols-2 gap-8 md:col-span-2">
            <div>
              <h4 className="font-heading text-khaki-white tracking-widest text-lg mb-6">Navegación</h4>
              <ul className="space-y-4">
                <li><Link to="/cursos" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Catálogo de Cursos</Link></li>
                <li><Link to="/instructores" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Cuerpo Docente</Link></li>
                <li><Link to="/certificaciones" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Certificaciones</Link></li>
                <li><Link to="/nosotros" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Quiénes Somos</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-heading text-khaki-white tracking-widest text-lg mb-6">Legal</h4>
              <ul className="space-y-4">
                <li><Link to="/terminos" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Términos y Condiciones</Link></li>
                <li><Link to="/privacidad" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Política de Privacidad</Link></li>
                <li><Link to="/blog" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Blog Operacional</Link></li>
                <li><Link to="/contacto" className="text-muted-dark hover:text-alert-red transition-colors text-sm">Contacto</Link></li>
              </ul>
            </div>
          </div>

          <div className="md:col-span-1">
             <h4 className="font-heading text-khaki-white tracking-widest text-lg mb-6">Contacto Directo</h4>
             <Link to="/contacto">
               <Button className="w-full mb-4 md:auto">WhatsApp Central</Button>
             </Link>
             <a href="mailto:info@taktis.edu.ec" className="flex items-center gap-2 text-muted-dark hover:text-alert-red transition-colors text-sm mb-8">
               <Mail className="w-4 h-4" />
               info@taktis.edu.ec
             </a>
             <div className="flex items-center gap-4">
               {socialLinks.map(({ label, href, icon: Icon }) => (
                 <a
                   key={label}
                   href={href}
                   target="_blank"
                   rel="noreferrer"
                   aria-label={label}
                   className="w-8 h-8 rounded-full border border-field-green text-field-green flex items-center justify-center hover:bg-field-green hover:text-tactical-black transition-colors"
                 >
                    <Icon className="w-4 h-4" />
                 </a>
               ))}
             </div>
          </div>
        </div>
      </div>
      <div className="bg-olive-dark py-4 text-center border-t border-tactical-border/50">
        <p className="text-muted-light text-[11px] uppercase tracking-widest">
          © 2025 TAKTIS Training Institute · Ecuador · Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
