import React from 'react';
import { PlayCircle, MousePointer, Edit3, Layers, FileDown, CheckCircle2, X } from 'lucide-react';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <PlayCircle className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-semibold text-white">Panduan & Cara Penggunaan YSR PETA PRO</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 font-bold">
              1
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-cyan-400" />
                Menggambar Bidang Polygon Baru (Digitasi)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Klik tombol biru <strong className="text-white">"Mulai Gambar"</strong> di bilah samping. Klik pada peta untuk meletakkan titik sudut patok satu per satu. Garis panduan elastis akan menghitung jarak seketika. Setelah meletakkan minimal 3 titik, klik titik awal berwarna hijau atau klik ganda untuk menutup polygon.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-amber-600/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 font-bold">
              2
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-amber-400" />
                Membaca Hasil Pengukuran & Mengedit Titik Patok
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Setiap segmen sisi polygon otomatis menampilkan label jarak (misal <span className="font-mono text-cyan-300 font-bold">812.14 m</span>), dan setiap sudut patok menampilkan derajat sudut dalam (misal <span className="font-mono text-amber-300 font-bold">88.20°</span>). Tarik titik patok merah untuk menggeser batas tanah secara interaktif, atau klik titik biru di tengah sisi untuk menambah patok baru.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 font-bold">
              3
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                Menambahkan & Mengelola Banyak Bidang (Multi-Parcel)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Anda dapat menambahkan lebih dari satu bidang tanah. Pada panel <strong className="text-white">Daftar Bidang</strong>, Anda bisa memberi nama khusus (misal "Blok A", "Kavling 02"), mengubah warna garis, mengatur transparansi, melihat ringkasan total luas semua bidang, atau menyembunyikan sementara bidang tertentu.
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0 font-bold">
              4
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <FileDown className="w-4 h-4 text-purple-400" />
                Impor & Ekspor Berkas KML, KMZ, GeoJSON, CSV
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gunakan tombol <strong className="text-white">"Impor"</strong> untuk memuat file dari Google Earth (.kml / .kmz) atau GeoJSON. Anda juga dapat mengunduh kembali file dalam format KMZ, KML, GeoJSON, tabel koordinat patok BPN (.csv), atau mencetak Berita Acara Pengukuran resmi.
              </p>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="w-9 h-9 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0 font-bold">
              5
            </div>
            <div className="space-y-1">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Simpan Proyek & Lanjutkan di Kemudian Hari
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pekerjaan Anda otomatis tersimpan di peramban (Autosave). Gunakan menu <strong className="text-white">"Simpan Proyek"</strong> untuk memberi nama proyek, menyimpan ke slot memori lokal, atau mengunduh berkas cadangan <span className="font-mono text-cyan-300 font-bold">.ysr</span>. Berkas .ysr dapat Anda buka kembali kapan saja di kemudian hari pada komputer atau HP mana pun.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors"
          >
            Mengerti & Lanjutkan
          </button>
        </div>
      </div>
    </div>
  );
};
