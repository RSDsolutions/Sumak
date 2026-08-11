import React from 'react';
import { DistributorData, CardStatus, PresetProfile } from './types';
import {
  User,
  ShieldCheck,
  QrCode,
  Sparkles,
  Upload,
  Copy,
  Tag,
  Award
} from 'lucide-react';

interface CustomizePanelProps {
  data: DistributorData;
  onChange: (newData: DistributorData) => void;
  presets: PresetProfile[];
  onSelectPreset: (presetData: DistributorData) => void;
}

export const CustomizePanel: React.FC<CustomizePanelProps> = ({
  data,
  onChange,
  presets,
  onSelectPreset,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleInputChange = (field: keyof DistributorData, value: string) => {
    const updated = { ...data, [field]: value };
    // Auto-update initials if full name changes and no image uploaded
    if (field === 'fullName' && value.trim()) {
      const parts = value.trim().split(' ').filter(Boolean);
      if (parts.length >= 2) {
        updated.avatarInitials = `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      } else if (parts.length === 1) {
        updated.avatarInitials = parts[0].slice(0, 2).toUpperCase();
      }
    }
    onChange(updated);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        onChange({
          ...data,
          avatarImage: event.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatarImage = () => {
    const { avatarImage, ...rest } = data;
    onChange(rest as DistributorData);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(data.officialCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-[#C8D8CB] p-5 w-full max-w-md flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-[#EBF4ED] text-[#1A4E26] rounded-xl border border-[#1A4E26]/20">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm font-heading">
              Personalizar Credencial
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Edita los datos visibles en la tarjeta en tiempo real
            </p>
          </div>
        </div>
      </div>

      {/* Preset Profiles */}
      {presets.length > 0 && (
        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Perfiles Rápidos
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPreset(p.data)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition-all flex flex-col cursor-pointer ${
                  data.officialCode === p.data.officialCode
                    ? 'bg-[#EBF4ED] border-[#1A4E26] text-[#1A4E26] ring-2 ring-[#1A4E26]/20 shadow-2xs'
                    : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="font-bold truncate">{p.label}</span>
                <span className="text-[10px] text-slate-400 font-mono mt-0.5">{p.data.officialCode}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-3.5">
        {/* Full Name */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <User className="w-3.5 h-3.5 text-[#1A4E26]" />
            <span>Nombre Completo</span>
          </label>
          <input
            type="text"
            value={data.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            className="w-full text-xs font-semibold px-3 py-2 border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26]/30 focus:border-[#1A4E26] outline-none"
            placeholder="Ej. Juan Pérez"
          />
        </div>

        {/* Official Code */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#1A4E26]" />
              <span>Código Oficial</span>
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="text-[10px] text-[#1A4E26] font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3 h-3" />
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </label>
          <input
            type="text"
            value={data.officialCode}
            onChange={(e) => handleInputChange('officialCode', e.target.value)}
            className="w-full text-xs font-mono font-bold px-3 py-2 border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26]/30 focus:border-[#1A4E26] outline-none uppercase"
            placeholder="Ej. SUMAK-00030"
          />
        </div>

        {/* Category / Rank */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Rango / Categoría</span>
          </label>
          <input
            type="text"
            value={data.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className="w-full text-xs font-bold text-[#D4AF37] px-3 py-2 border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] outline-none uppercase"
            placeholder="Ej. DISTRIBUIDOR INDEPENDIENTE"
          />
        </div>

        {/* Status Dropdown */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1A4E26]" />
            <span>Estado de Afiliación</span>
          </label>
          <select
            value={data.status}
            onChange={(e) => handleInputChange('status', e.target.value as CardStatus)}
            className="w-full text-xs font-bold px-3 py-2 border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26]/30 focus:border-[#1A4E26] outline-none bg-white"
          >
            <option value="ACTIVO">ACTIVO (Verde)</option>
            <option value="INACTIVO">INACTIVO (Gris)</option>
            <option value="PENDIENTE">PENDIENTE (Ámbar)</option>
            <option value="SUSPENDIDO">SUSPENDIDO (Rojo)</option>
          </select>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Upload className="w-3.5 h-3.5 text-[#1A4E26]" />
            <span>Foto de Perfil</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-[#1A4E26]/40 rounded-xl bg-[#F4F7F5] hover:bg-[#EBF4ED] text-xs font-semibold text-[#1A4E26] cursor-pointer transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>Subir Imagen</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            {data.avatarImage && (
              <button
                type="button"
                onClick={removeAvatarImage}
                className="px-2.5 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                title="Quitar foto y usar iniciales"
              >
                Quitar
              </button>
            )}
          </div>
        </div>

        {/* QR Code Destination Link */}
        <div>
          <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <QrCode className="w-3.5 h-3.5 text-[#1A4E26]" />
            <span>Enlace Codificado en QR</span>
          </label>
          <input
            type="text"
            value={data.qrUrl}
            onChange={(e) => handleInputChange('qrUrl', e.target.value)}
            className="w-full text-xs font-mono px-3 py-2 border border-[#C8D8CB] rounded-xl focus:ring-2 focus:ring-[#1A4E26]/30 focus:border-[#1A4E26] outline-none"
            placeholder="https://sumakecuador.com/registro?ref=..."
          />
        </div>
      </div>
    </div>
  );
};
