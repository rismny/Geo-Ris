import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Sparkles } from 'lucide-react';
import { PolygonField } from '../../types/gis';
import { parseKMLString, parseKMZBuffer, parseGeoJSONString } from '../../utils/kmlKmzParser';
import { INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD } from '../../data/sampleFields';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFields: (newFields: PolygonField[]) => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImportFields }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const fileName = file.name.toLowerCase();
      let imported: PolygonField[] = [];

      if (fileName.endsWith('.kmz')) {
        const buffer = await file.arrayBuffer();
        imported = await parseKMZBuffer(buffer);
      } else if (fileName.endsWith('.kml')) {
        const text = await file.text();
        imported = parseKMLString(text);
      } else if (fileName.endsWith('.geojson') || fileName.endsWith('.json')) {
        const text = await file.text();
        imported = parseGeoJSONString(text);
      } else {
        throw new Error('Format file tidak didukung. Harap unggah file berekstensi .kml, .kmz, atau .geojson');
      }

      if (imported.length === 0) {
        throw new Error('Tidak ada geometri polygon tertutup yang valid ditemukan di dalam file.');
      }

      onImportFields(imported);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memproses file. Periksa struktur file.');
    } finally {
      setLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSamples = () => {
    onImportFields([INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Impor File Peta (KML / KMZ / GeoJSON)</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMsg && (
            <div className="flex items-start gap-2.5 p-3.5 bg-red-950/80 border border-red-500/40 rounded-xl text-xs text-red-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-800/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".kml,.kmz,.geojson,.json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessFile(e.target.files[0]);
                }
              }}
            />
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 mb-3 border border-slate-700">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-white mb-1">
              {loading ? 'Memproses berkas...' : 'Tarik & lepas file KML atau KMZ ke sini'}
            </p>
            <p className="text-xs text-slate-400">
              atau klik untuk memilih file dari komputer (.kml, .kmz, .geojson)
            </p>
          </div>

          {/* Format descriptions */}
          <div className="bg-slate-800/60 rounded-xl p-3.5 border border-slate-700/60 text-xs text-slate-300 space-y-2">
            <div className="font-semibold text-slate-200">Format yang didukung:</div>
            <ul className="space-y-1 text-slate-400 list-disc list-inside">
              <li><strong className="text-cyan-300">.KMZ</strong> - Arsip Google Earth (otomatis diekstrak)</li>
              <li><strong className="text-cyan-300">.KML</strong> - Keyhole Markup Language standar OGC</li>
              <li><strong className="text-cyan-300">.GeoJSON</strong> - Standar GIS RFC 7946 Polygon & MultiPolygon</li>
            </ul>
          </div>

          {/* Quick Sample Button */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Belum punya file?</span>
            <button
              onClick={handleLoadSamples}
              className="px-3.5 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/60 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Muat Sampel Lahan Sawit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
