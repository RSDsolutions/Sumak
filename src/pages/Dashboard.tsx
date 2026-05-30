import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { User, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  return (
    <div className="bg-white min-h-screen flex items-center justify-center px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg text-center"
      >
        <div className="w-20 h-20 rounded-2xl bg-[#1A4E26]/10 flex items-center justify-center mx-auto mb-6">
          <LayoutDashboard size={40} className="text-[#1A4E26]" />
        </div>

        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-[#111111] mb-3">
          Panel de Distribuidor
        </h1>

        <div className="bg-white border border-[#C8D8CB] rounded-2xl p-8 mt-8 text-left shadow-[0_0_20px_rgba(26,78,38,0.06)]">
          <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[#C8D8CB]">
            <div className="w-12 h-12 rounded-full bg-[#1A4E26]/10 flex items-center justify-center text-[#1A4E26]">
              <User size={22} />
            </div>
            <div>
              <p className="font-heading font-semibold text-[#111111]">Distribuidor SUMAK</p>
              <p className="text-[#6B7280] text-xs">Código: SUMAK-XXXXX</p>
            </div>
          </div>

          <div className="bg-[#F4F7F5] border border-[#C8D8CB] rounded-xl p-5 text-center">
            <p className="text-[#6B7280] text-sm leading-relaxed">
              Bienvenido a tu panel de control. El sistema completo estará disponible
              próximamente. Pronto podrás ver tus comisiones, genealogía y estadísticas
              de red aquí.
            </p>
          </div>

          <div className="mt-5 flex gap-3">
            <Link
              to="/productos"
              className="flex-1 py-3 rounded-xl border border-[#C8D8CB] text-[#6B7280] text-sm font-medium text-center hover:border-[#1A4E26] hover:text-[#1A4E26] transition-all duration-200"
            >
              Ver Productos
            </Link>
            <Link
              to="/"
              className="flex-1 py-3 rounded-xl bg-[#1A4E26] text-white text-sm font-bold text-center hover:bg-[#163F1E] transition-all duration-200"
            >
              Inicio
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
