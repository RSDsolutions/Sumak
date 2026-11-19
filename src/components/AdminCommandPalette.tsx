import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowRight, Command, X, Building2, GraduationCap } from 'lucide-react';

export interface CommandPaletteItem {
  label: string;
  description: string;
  to: string;
  workspace: 'plataforma' | 'academia' | 'cuenta';
  group: string;
  icon: React.ReactNode;
  keywords?: string[];
}

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
}

export default function AdminCommandPalette({ open, onClose, items }: AdminCommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const haystack = [
        item.label,
        item.description,
        item.group,
        item.workspace,
        ...(item.keywords ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
      } else if (e.key === 'Enter' && filtered[activeIndex]) {
        e.preventDefault();
        navigate(filtered[activeIndex].to);
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, activeIndex, navigate, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4 bg-[#071D0F]/65 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white rounded-3xl shadow-[0_24px_70px_rgba(7,29,15,0.35)] border border-[#C8D8CB] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E5ECE6] bg-[#F8FBF9]">
          <Search size={18} className="text-[#1A4E26] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ir a cualquier módulo de Plataforma o Academia..."
            className="flex-1 bg-transparent text-sm font-medium text-[#111111] placeholder:text-slate-400 outline-none focus:ring-0 focus:shadow-none border-0"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors"
            aria-label="Cerrar búsqueda"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[58vh] overflow-y-auto p-2.5 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              No se encontraron módulos para <span className="font-bold text-slate-800">“{query}”</span>.
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === activeIndex;
              return (
                <button
                  key={item.to}
                  type="button"
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => {
                    navigate(item.to);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-2xl text-left transition-all ${
                    isSelected
                      ? 'bg-[#EBF4ED] text-[#0B2913] ring-1 ring-[#1A4E26]/20'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-[#1A4E26] text-white shadow-xs'
                        : item.workspace === 'academia'
                        ? 'bg-amber-50 text-[#92680A] border border-amber-200/60'
                        : 'bg-[#F4F7F5] text-[#1A4E26] border border-[#DCE7DF]'
                    }`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold truncate">{item.label}</span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          item.workspace === 'academia'
                            ? 'bg-amber-100/80 text-amber-900'
                            : item.workspace === 'plataforma'
                            ? 'bg-emerald-100/80 text-[#1A4E26]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.workspace === 'academia' ? (
                          <GraduationCap size={10} />
                        ) : (
                          <Building2 size={10} />
                        )}
                        {item.workspace === 'academia'
                          ? 'Academia'
                          : item.workspace === 'plataforma'
                          ? 'Plataforma'
                          : 'Cuenta'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{item.description}</p>
                  </div>
                  <ArrowRight
                    size={15}
                    className={`shrink-0 transition-transform ${
                      isSelected ? 'text-[#1A4E26] translate-x-0.5' : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-5 py-2.5 bg-[#F8FBF9] border-t border-[#E5ECE6] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑↓</kbd> Navegar
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Enter</kbd> Abrir
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">Esc</kbd> Cerrar
            </span>
          </div>
          <span className="inline-flex items-center gap-1 font-semibold text-[#1A4E26]">
            <Command size={11} /> Acceso Rápido SUMAK
          </span>
        </div>
      </div>
    </div>
  );
}
