import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Save, X, Image as ImageIcon, Type, LayoutTemplate, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../lib/toast';

interface TemplateBuilderProps {
  templateId: string;
  onClose: () => void;
}

type LayoutElement = {
  x: number;
  y: number;
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  font: 'normal' | 'bold' | 'italic';
  visible: boolean;
};

type LayoutConfig = {
  participant_name: LayoutElement;
  course_name: LayoutElement;
  issue_date: LayoutElement;
  qr_code: LayoutElement & { size?: number };
  verification_text: LayoutElement;
  [key: string]: any;
};

// A4 Landscape points: 841.89 x 595.28
const CANVAS_WIDTH = 841.89;
const CANVAS_HEIGHT = 595.28;
// Usaremos un factor de escala para mostrarlo en pantalla
const SCALE = 0.8;

const defaultLayout: LayoutConfig = {
  participant_name: { x: CANVAS_WIDTH/2, y: 290, size: 36, color: "#0a2213", align: "center", font: "bold", visible: true },
  course_name: { x: CANVAS_WIDTH/2, y: 380, size: 24, color: "#111111", align: "center", font: "bold", visible: true },
  issue_date: { x: CANVAS_WIDTH/2, y: 440, size: 12, color: "#333333", align: "center", font: "normal", visible: true },
  qr_code: { x: 50, y: 50, size: 80, color: "#000000", align: "left", font: "normal", visible: true },
  verification_text: { x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT - 45, size: 9, color: "#ab8224", align: "center", font: "normal", visible: true }
};

const labels: Record<keyof LayoutConfig, string> = {
  participant_name: 'Nombre del Estudiante',
  course_name: 'Nombre del Curso/Programa',
  issue_date: 'Fecha de Emisión',
  qr_code: 'Código QR',
  verification_text: 'Texto de Verificación / URL'
};

const placeholders: Record<keyof LayoutConfig, string> = {
  participant_name: 'JUAN PÉREZ GARCÍA',
  course_name: 'LIDERAZGO TRANSFORMACIONAL',
  issue_date: 'Emitido el 20 de Septiembre de 2026',
  qr_code: 'QR',
  verification_text: 'Diploma N° 00001 | Código: A1B2-C3D4'
};

export default function AdminTemplateBuilder({ templateId, onClose }: TemplateBuilderProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<any>(null);
  const [layout, setLayout] = useState<LayoutConfig>(defaultLayout);
  const [selectedElement, setSelectedElement] = useState<keyof LayoutConfig | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplate();
  }, [templateId]);

  async function loadTemplate() {
    setLoading(true);
    const { data, error } = await supabase
      .from('academy_diploma_templates')
      .select('*, diploma_type:academy_diploma_types(*)')
      .eq('id', templateId)
      .single();

    if (error) {
      toast.error('Error al cargar la plantilla');
      onClose();
      return;
    }

    setTemplate(data);
    if (data.layout_config) {
      // Merge with default to ensure all keys exist
      setLayout({ ...defaultLayout, ...data.layout_config });
    }
    setLoading(false);
  }

  async function saveTemplate() {
    setSaving(true);
    const { error } = await supabase
      .from('academy_diploma_templates')
      .update({ layout_config: layout })
      .eq('id', templateId);

    if (error) {
      toast.error('Error al guardar el diseño');
    } else {
      toast.success('Diseño guardado correctamente');
    }
    setSaving(false);
  }

  const handleDragEnd = (key: keyof LayoutConfig, info: any) => {
    // Convert translated pixels back to unscaled canvas coordinates
    setLayout(prev => {
      const el = prev[key];
      // info.point is global, easier to use the drag delta or the transform of the element.
      // motion provides the offset in info.offset which is relative to the drag start.
      const newX = el.x + (info.offset.x / SCALE);
      const newY = el.y + (info.offset.y / SCALE);
      return {
        ...prev,
        [key]: { ...el, x: newX, y: newY }
      };
    });
  };

  const updateSelected = (updates: Partial<LayoutElement>) => {
    if (!selectedElement) return;
    setLayout(prev => ({
      ...prev,
      [selectedElement]: { ...prev[selectedElement], ...updates }
    }));
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="w-10 h-10 border-4 border-[#1A4E26] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LayoutTemplate className="text-[#1A4E26]" /> 
            Constructor Visual de Plantilla
          </h1>
          <p className="text-sm text-gray-500">{template.diploma_type?.name} (v{template.version})</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50">
            Cerrar
          </button>
          <button onClick={saveTemplate} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#1A4E26] text-white rounded-lg text-sm font-semibold hover:bg-[#163F1E]">
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Diseño'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Left: Elements */}
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Elementos del Certificado</h3>
            <p className="text-xs text-gray-500 mt-1">Activa o desactiva los textos.</p>
          </div>
          <div className="p-4 space-y-3">
            {(Object.keys(layout) as Array<keyof LayoutConfig>).map(key => (
              <div key={key} className={`p-3 rounded-xl border cursor-pointer transition ${selectedElement === key ? 'border-[#1A4E26] bg-[#EBF4ED]' : 'border-gray-200 hover:border-gray-300'}`} onClick={() => setSelectedElement(key)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{labels[key]}</span>
                  <input type="checkbox" checked={layout[key].visible} onChange={(e) => { e.stopPropagation(); setLayout(prev => ({ ...prev, [key]: { ...prev[key], visible: e.target.checked } })); }} className="accent-[#1A4E26]" />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto p-4 bg-blue-50 border-t border-blue-100 text-sm text-blue-800">
            <AlertCircle size={16} className="mb-2" />
            <p>Arrastra los elementos en el lienzo para posicionarlos. Selecciona un elemento para editar su fuente, tamaño y color en el panel derecho.</p>
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 bg-slate-200 overflow-auto p-8 flex items-center justify-center relative">
          <div 
            ref={containerRef}
            className="bg-white shadow-2xl relative overflow-hidden ring-1 ring-black/5"
            style={{ 
              width: CANVAS_WIDTH * SCALE, 
              height: CANVAS_HEIGHT * SCALE,
              backgroundImage: template.background_image_url ? `url(${template.background_image_url})` : 'none',
              backgroundSize: '100% 100%'
            }}
          >
            {/* Fallback frame if no background */}
            {!template.background_image_url && (
              <div className="absolute inset-8 border-[3px] border-[#0a2213] pointer-events-none" />
            )}

            {(Object.keys(layout) as Array<keyof LayoutConfig>).map(key => {
              const el = layout[key];
              if (!el.visible) return null;

              const isSelected = selectedElement === key;
              
              // For "center" align, CSS translation handles centering the text horizontally around the X coordinate
              const translateX = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0%';

              return (
                <motion.div
                  key={key}
                  drag
                  dragMomentum={false}
                  dragConstraints={containerRef}
                  onDragEnd={(e, info) => handleDragEnd(key, info)}
                  onClick={() => setSelectedElement(key)}
                  className={`absolute whitespace-nowrap cursor-move ${isSelected ? 'ring-2 ring-blue-500 bg-blue-500/10' : 'hover:ring-1 hover:ring-gray-300'}`}
                  style={{
                    x: el.x * SCALE,
                    y: el.y * SCALE,
                    // Center transform applied to the motion div position
                    translateX,
                    color: el.color,
                    fontSize: el.size * SCALE,
                    fontWeight: el.font === 'bold' ? 'bold' : 'normal',
                    fontStyle: el.font === 'italic' ? 'italic' : 'normal',
                    // The rendering origin in PDF is from the bottom-left usually, but our logic inverted it.
                    // X/Y here acts as top-left of the bounding box.
                  }}
                >
                  {key === 'qr_code' ? (
                    <div className="border-2 border-black border-dashed flex items-center justify-center bg-white/50" style={{ width: el.size * SCALE, height: el.size * SCALE }}>
                      <span className="text-xs font-bold text-black">QR</span>
                    </div>
                  ) : (
                    placeholders[key]
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Right: Properties */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col p-4">
          <h3 className="font-bold text-gray-700 border-b border-gray-100 pb-3 mb-4 flex items-center gap-2">
            <Type size={16} /> Propiedades
          </h3>
          
          {selectedElement ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Elemento Seleccionado</label>
                <div className="text-sm font-semibold text-[#1A4E26] bg-[#EBF4ED] p-2 rounded-lg">
                  {labels[selectedElement]}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Tamaño de Fuente (pt)</label>
                <input 
                  type="number" 
                  value={layout[selectedElement].size}
                  onChange={e => updateSelected({ size: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    value={layout[selectedElement].color}
                    onChange={e => updateSelected({ color: e.target.value })}
                    className="w-10 h-10 p-1 border border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input 
                    type="text" 
                    value={layout[selectedElement].color}
                    onChange={e => updateSelected({ color: e.target.value })}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Estilo</label>
                <select 
                  value={layout[selectedElement].font}
                  onChange={e => updateSelected({ font: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Negrita (Bold)</option>
                  <option value="italic">Cursiva (Italic)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Alineación</label>
                <select 
                  value={layout[selectedElement].align}
                  onChange={e => updateSelected({ align: e.target.value as any })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                >
                  <option value="left">Izquierda</option>
                  <option value="center">Centrado</option>
                  <option value="right">Derecha</option>
                </select>
                <p className="text-[10px] text-gray-400 mt-1">El anclaje se ajusta según la alineación. Para centrar en la página, arrastra al medio y usa "Centrado".</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">X (Pos)</label>
                  <input 
                    type="number" 
                    value={Math.round(layout[selectedElement].x)}
                    onChange={e => updateSelected({ x: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Y (Pos)</label>
                  <input 
                    type="number" 
                    value={Math.round(layout[selectedElement].y)}
                    onChange={e => updateSelected({ y: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 p-4">
              <Type size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Selecciona un elemento en el lienzo o en la lista para ver sus propiedades.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
