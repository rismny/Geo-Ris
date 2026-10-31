import React, { useState } from 'react';
import { PolygonField } from '../../types/gis';
import { generatePatokCSV, downloadFile } from '../../utils/kmlKmzParser';
import { Table, Download, Copy, Check, X, ShieldAlert } from 'lucide-react';

interface CoordinateTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: PolygonField | null;
}

export const CoordinateTableModal: React.FC<CoordinateTableModalProps> = ({ isOpen, onClose, field }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !field) return null;

  const handleDownloadCSV = () => {
    const csv = generatePatokCSV(field);
    const sanitizedName = field.name.replace(/\s+/g, '_').toLowerCase();
    downloadFile(csv, `koordinat_${sanitizedName}.csv`, 'text/csv;charset=utf-8;');
  };

  const handleCopyClipboard = () => {
    const csv = generatePatokCSV(field);
    navigator.clipboard.writeText(csv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <Table className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-white">Tabel Patok Koordinat & Ukuran</h3>
              <p className="text-xs text-slate-400">{field.name} • {field.coordinates.length} Titik Sudut</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Table Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-800/80 text-slate-300 border-b border-slate-700">
                <tr>
                  <th className="py-2.5 px-3">No</th>
                  <th className="py-2.5 px-3">Latitude (Y)</th>
                  <th className="py-2.5 px-3">Longitude (X)</th>
                  <th className="py-2.5 px-3 text-right">Sudut Dalam (°)</th>
                  <th className="py-2.5 px-3 text-right">Jarak ke Berikutnya</th>
                  <th className="py-2.5 px-3 text-right">Azimuth Bearing</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {field.coordinates.map((coord, idx) => {
                  const seg = field.segments[idx];
                  const ang = field.angles[idx];
                  const isAcute = ang?.isAcute;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 font-semibold text-cyan-400">P{idx + 1}</td>
                      <td className="py-2 px-3 text-slate-300">{coord.lat.toFixed(7)}°</td>
                      <td className="py-2 px-3 text-slate-300">{coord.lng.toFixed(7)}°</td>
                      <td className={`py-2 px-3 text-right font-medium ${isAcute ? 'text-red-400 font-bold' : 'text-amber-300'}`}>
                        {ang ? `${ang.angleDeg.toFixed(2)}°` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-emerald-300 font-medium">
                        {seg ? `${seg.lengthMeters.toFixed(2)} m` : '-'}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400">
                        {seg ? `${seg.bearingDeg.toFixed(1)}°` : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Geometry summary footer inside table modal */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-800/40 border border-slate-800 rounded-xl text-xs">
            <div>
              <span className="text-slate-400">Total Luas:</span>
              <div className="font-semibold text-cyan-300 text-sm">
                {(field.areaSquareMeters / 10000).toFixed(4)} ha ({field.areaSquareMeters.toFixed(2)} m²)
              </div>
            </div>
            <div>
              <span className="text-slate-400">Total Keliling:</span>
              <div className="font-semibold text-white text-sm">
                {field.perimeterMeters.toFixed(2)} m
              </div>
            </div>
            <div>
              <span className="text-slate-400">Sistem Koordinat:</span>
              <div className="font-semibold text-slate-300 text-sm">
                WGS 84 (EPSG:4326)
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={handleCopyClipboard}
            className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Tersalin ke Clipboard' : 'Salin Data Tabel'}
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-cyan-900/30"
            >
              <Download className="w-4 h-4" />
              Unduh CSV Patok BPN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
