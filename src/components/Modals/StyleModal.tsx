import React from 'react';
import { PolygonField } from '../../types/gis';
import { Palette, X, Check, Sliders, Shield } from 'lucide-react';

interface StyleModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: PolygonField | null;
  onUpdateField: (updated: PolygonField) => void;
}

const PRESET_COLORS = [
  { name: 'Sian Cerah', stroke: '#06b6d4', fill: '#0891b2' },
  { name: 'Hijau Zamrud', stroke: '#10b981', fill: '#059669' },
  { name: 'Biru Royal', stroke: '#3b82f6', fill: '#2563eb' },
  { name: 'Kuning Amber', stroke: '#f59e0b', fill: '#d97706' },
  { name: 'Merah Oranye', stroke: '#ef4444', fill: '#dc2626' },
  { name: 'Ungu Violet', stroke: '#8b5cf6', fill: '#7c3aed' },
  { name: 'Merah Muda', stroke: '#ec4899', fill: '#db2777' },
  { name: 'Putih Platinum', stroke: '#f8fafc', fill: '#94a3b8' },
];

export const StyleModal: React.FC<StyleModalProps> = ({
  isOpen,
  onClose,
  field,
  onUpdateField,
}) => {
  if (!isOpen || !field) return null;

  const currentStroke = field.strokeColor || field.color || '#06b6d4';
  const currentFill = field.fillColor || field.color || '#0891b2';
  const currentWidth = field.strokeWidth || 3;
  const currentOpacity = field.opacity !== undefined ? field.opacity : 0.35;

  const handleApplyPreset = (preset: { stroke: string; fill: string }) => {
    onUpdateField({
      ...field,
      color: preset.stroke,
      strokeColor: preset.stroke,
      fillColor: preset.fill,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Palette className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-white">Gaya Warna & Garis Bidang</h3>
              <p className="text-xs text-slate-400">{field.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Live Preview Box */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="text-xs space-y-0.5">
              <div className="text-slate-400">Pratinjau Tampilan:</div>
              <div className="font-semibold text-white">{field.name}</div>
              <div className="text-[11px] text-slate-400 font-mono">
                P: {field.dimension ? field.dimension.lengthMeters.toFixed(1) : 0}m • L:{' '}
                {field.dimension ? field.dimension.widthMeters.toFixed(1) : 0}m
              </div>
            </div>
            <div
              className="w-24 h-16 rounded-lg transition-all shadow-md flex items-center justify-center text-[10px] font-mono font-bold"
              style={{
                borderColor: currentStroke,
                borderWidth: `${currentWidth}px`,
                borderStyle: 'solid',
                backgroundColor: currentFill,
                opacity: 1, // container opacity
                color: '#ffffff',
              }}
            >
              <div
                className="w-full h-full rounded flex items-center justify-center"
                style={{
                  backgroundColor: currentFill,
                  opacity: currentOpacity,
                }}
              >
                <span className="bg-slate-950/80 px-1 py-0.5 rounded text-white text-[9px]">
                  {Math.round(currentOpacity * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Quick Preset Themes */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
              Pilihan Tema Cepat:
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map((p) => {
                const isActive = currentStroke === p.stroke && currentFill === p.fill;
                return (
                  <button
                    key={p.name}
                    onClick={() => handleApplyPreset(p)}
                    className={`p-2 rounded-lg border text-left transition-all flex flex-col items-center gap-1.5 ${
                      isActive
                        ? 'border-cyan-400 bg-slate-800'
                        : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-md shadow"
                      style={{
                        backgroundColor: p.fill,
                        border: `2px solid ${p.stroke}`,
                      }}
                    />
                    <span className="text-[10px] text-slate-300 truncate w-full text-center">
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 1: Warna Garis Bidang (Border Stroke) */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-white/40"
                  style={{ backgroundColor: currentStroke }}
                />
                Warna Garis Bidang (Tepi/Batas)
              </label>
              <span className="text-[11px] font-mono text-cyan-400 uppercase font-semibold">
                {currentStroke}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={currentStroke}
                onChange={(e) =>
                  onUpdateField({
                    ...field,
                    color: e.target.value,
                    strokeColor: e.target.value,
                  })
                }
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
              />
              <div className="text-xs text-slate-400">
                Klik kotak warna untuk memilih warna garis batas bidang tanah.
              </div>
            </div>

            {/* Ketebalan Garis */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">Ketebalan Garis Batas:</span>
                <span className="font-mono text-cyan-400 font-bold">{currentWidth} px</span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 6].map((w) => (
                  <button
                    key={w}
                    onClick={() => onUpdateField({ ...field, strokeWidth: w })}
                    className={`flex-1 py-1.5 text-xs font-mono font-medium rounded border transition-colors ${
                      currentWidth === w
                        ? 'bg-cyan-600 text-white border-cyan-500'
                        : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {w}px
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 2: Warna Bidang (Fill Color) & Transparansi */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block border border-white/40"
                  style={{ backgroundColor: currentFill }}
                />
                Warna Bidang (Isi / Arsiran)
              </label>
              <span className="text-[11px] font-mono text-emerald-400 uppercase font-semibold">
                {currentFill}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="color"
                value={currentFill}
                onChange={(e) => onUpdateField({ ...field, fillColor: e.target.value })}
                className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-0 p-0"
              />
              <div className="text-xs text-slate-400">
                Klik kotak warna untuk memilih warna isi / arsiran area bidang.
              </div>
            </div>

            {/* Slider Transparansi */}
            <div className="pt-2 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-300">Transparansi / Opasitas Isi:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {Math.round(currentOpacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={currentOpacity}
                onChange={(e) =>
                  onUpdateField({ ...field, opacity: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Lebih Transparan</span>
                <span>Pekat</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Selesai & Simpan Gaya
          </button>
        </div>
      </div>
    </div>
  );
};
