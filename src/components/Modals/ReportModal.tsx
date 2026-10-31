import React from 'react';
import { PolygonField } from '../../types/gis';
import { Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  field: PolygonField | null;
  onOpenPrintMap?: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  field,
  onOpenPrintMap,
}) => {
  if (!isOpen || !field) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Header - Screen only */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Pratinjau Berita Acara & Laporan Pengukuran</h3>
          </div>
          <div className="flex items-center gap-3">
            {onOpenPrintMap && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPrintMap();
                }}
                className="px-3 py-2 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900 border border-amber-500/50 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Buka Template Layout Cetak Peta Standar ATR/BPN & Pemda"
              >
                <Printer className="w-4 h-4 text-amber-400" />
                Layout Peta ATR/BPN
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg flex items-center gap-2 transition-colors shadow-lg shadow-blue-900/30"
            >
              <Printer className="w-4 h-4" />
              Cetak / Simpan PDF
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Paper */}
        <div className="p-8 overflow-y-auto bg-white text-slate-900 font-sans">
          {/* Header Surat */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight uppercase text-slate-900">
              Laporan Hasil Pengukuran Geospasial Bidang Tanah
            </h1>
            <p className="text-xs text-slate-600 mt-1">
              Dokumen Resmi Hasil Digitasi Polygon & Pengukuran Koordinat Geodesi WGS84 • YSR PETA PRO
            </p>
            <p className="text-[11px] font-mono text-slate-500 mt-0.5">
              Ref ID: {field.id} • Tanggal Pengukuran: {currentDate}
            </p>
          </div>

          {/* Field Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <div>
              <div className="text-slate-500">Nama Bidang / Kavling:</div>
              <div className="font-bold text-sm text-slate-900">{field.name}</div>
            </div>
            <div>
              <div className="text-slate-500">Sistem Proyeksi / Datum:</div>
              <div className="font-semibold text-slate-900">Geografis WGS 84 (EPSG:4326)</div>
            </div>
            <div>
              <div className="text-slate-500">Jumlah Patok / Titik Batas:</div>
              <div className="font-semibold text-slate-900">{field.coordinates.length} Titik</div>
            </div>
            <div>
              <div className="text-slate-500">Status Geometri:</div>
              <div className="font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Valid & Tertutup (LinearRing)
              </div>
            </div>
          </div>

          {/* Area & Perimeter Measurement Summary */}
          <div className="mb-6 grid grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <div className="text-[11px] font-medium text-cyan-800">Luas (Hektar)</div>
              <div className="text-lg font-bold font-mono text-cyan-900">
                {(field.areaSquareMeters / 10000).toFixed(4)} <span className="text-xs font-normal">ha</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-[11px] font-medium text-blue-800">Luas (Meter Persegi)</div>
              <div className="text-lg font-bold font-mono text-blue-900">
                {field.areaSquareMeters.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-normal">m²</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-medium text-slate-700">Total Keliling</div>
              <div className="text-lg font-bold font-mono text-slate-900">
                {field.perimeterMeters.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                <span className="text-xs font-normal">m</span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-[11px] font-medium text-slate-700">Dimensi (P × L)</div>
              <div className="text-xs font-bold font-mono text-slate-900 mt-1">
                P: {(field.dimension?.lengthMeters ?? field.bounds.lengthMeters).toFixed(1)}m • L: {(field.dimension?.widthMeters ?? field.bounds.widthMeters).toFixed(1)}m
              </div>
            </div>
          </div>

          {/* Coordinate Table */}
          <div className="mb-8">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Daftar Koordinat Titik Patok Batas & Sudut
            </h3>
            <div className="border border-slate-300 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-100 text-slate-800 border-b border-slate-300">
                  <tr>
                    <th className="py-2 px-3">No. Patok</th>
                    <th className="py-2 px-3">Lintang (Latitude Y)</th>
                    <th className="py-2 px-3">Bujur (Longitude X)</th>
                    <th className="py-2 px-3 text-right">Sudut Dalam (°)</th>
                    <th className="py-2 px-3 text-right">Panjang Sisi ke Next</th>
                    <th className="py-2 px-3 text-right">Azimuth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {field.coordinates.map((c, idx) => {
                    const seg = field.segments[idx];
                    const ang = field.angles[idx];
                    return (
                      <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="py-1.5 px-3 font-bold text-slate-900">P{idx + 1}</td>
                        <td className="py-1.5 px-3">{c.lat.toFixed(7)}°</td>
                        <td className="py-1.5 px-3">{c.lng.toFixed(7)}°</td>
                        <td className="py-1.5 px-3 text-right font-medium">
                          {ang ? `${ang.angleDeg.toFixed(2)}°` : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right font-semibold text-slate-900">
                          {seg ? `${seg.lengthMeters.toFixed(2)} m` : '-'}
                        </td>
                        <td className="py-1.5 px-3 text-right text-slate-600">
                          {seg ? `${seg.bearingDeg.toFixed(1)}°` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature Block */}
          <div className="grid grid-cols-2 gap-12 text-center text-xs pt-8 border-t border-slate-300">
            <div>
              <div className="text-slate-600 mb-16">Petugas / Surveyor Pengukuran:</div>
              <div className="font-bold border-b border-slate-400 inline-block px-8 pb-1">
                ( .................................................... )
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Petugas Pemetaan Lapangan</div>
            </div>
            <div>
              <div className="text-slate-600 mb-16">Pemilik / Pengelola Lahan:</div>
              <div className="font-bold border-b border-slate-400 inline-block px-8 pb-1">
                ( .................................................... )
              </div>
              <div className="text-[10px] text-slate-500 mt-1">Saksi / Pemohon</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
