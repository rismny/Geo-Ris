import React, { useState, useEffect, useRef } from 'react';
import { PolygonField, BasemapType, SavedProject } from '../../types/gis';
import {
  Save,
  FolderOpen,
  Download,
  Upload,
  Trash2,
  PlusCircle,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  HardDrive,
  FileCheck,
  AlertCircle,
  X,
  RefreshCw,
  FileText
} from 'lucide-react';
import {
  getSavedProjectsList,
  saveProjectToList,
  deleteSavedProject,
  downloadProjectFile,
  parseProjectFile,
} from '../../utils/projectStorage';

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: PolygonField[];
  activeFieldId: string | null;
  basemap: BasemapType;
  projectName: string;
  projectId?: string;
  projectDescription?: string;
  lastSavedAt: number | null;
  onSaveCurrentProject: (name: string, description: string) => void;
  onLoadProject: (project: {
    projectName: string;
    projectId?: string;
    description?: string;
    fields: PolygonField[];
    activeFieldId?: string | null;
    basemap?: BasemapType;
  }) => void;
  onNewBlankProject: () => void;
  onLoadSampleProject: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({
  isOpen,
  onClose,
  fields,
  activeFieldId,
  basemap,
  projectName,
  projectId,
  projectDescription = '',
  lastSavedAt,
  onSaveCurrentProject,
  onLoadProject,
  onNewBlankProject,
  onLoadSampleProject,
}) => {
  const [activeTab, setActiveTab] = useState<'save' | 'list' | 'import' | 'new'>('save');
  const [inputName, setInputName] = useState(projectName || 'Proyek Pengukuran YSR');
  const [inputDesc, setInputDesc] = useState(projectDescription || '');
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isImportDragging, setIsImportDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputName(projectName || 'Proyek Pengukuran YSR');
      setInputDesc(projectDescription || '');
      setSavedProjects(getSavedProjectsList());
    }
  }, [isOpen, projectName, projectDescription]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  if (!isOpen) return null;

  const totalAreaM2 = fields.reduce((sum, f) => sum + (f.areaSquareMeters || 0), 0);
  const totalAreaHa = totalAreaM2 / 10000;
  const totalPatok = fields.reduce((sum, f) => sum + f.coordinates.length, 0);

  const handleSaveToBrowser = () => {
    const trimmed = inputName.trim() || 'Proyek Pengukuran YSR';
    onSaveCurrentProject(trimmed, inputDesc);
    const updated = getSavedProjectsList();
    setSavedProjects(updated);
    showToast(`Proyek "${trimmed}" berhasil disimpan ke penyimpanan browser!`);
  };

  const handleDownloadBackup = () => {
    const trimmed = inputName.trim() || 'Proyek Pengukuran YSR';
    downloadProjectFile({
      name: trimmed,
      description: inputDesc,
      fields,
      activeFieldId,
      basemap,
    });
    showToast(`File cadangan proyek "${trimmed}.ysr" berhasil diunduh!`);
  };

  const handleDeleteSaved = (id: string, name: string) => {
    if (window.confirm(`Hapus proyek "${name}" dari memori tersimpan?`)) {
      const remaining = deleteSavedProject(id);
      setSavedProjects(remaining);
      showToast(`Proyek "${name}" telah dihapus.`);
    }
  };

  const handleSelectSavedProject = (proj: SavedProject) => {
    onLoadProject({
      projectName: proj.name,
      projectId: proj.id,
      description: proj.description,
      fields: proj.fields,
      activeFieldId: proj.activeFieldId,
      basemap: proj.basemap,
    });
    showToast(`Proyek "${proj.name}" berhasil dimuat!`);
    onClose();
  };

  const handleDownloadSavedItem = (proj: SavedProject) => {
    downloadProjectFile({
      name: proj.name,
      description: proj.description,
      fields: proj.fields,
      activeFieldId: proj.activeFieldId,
      basemap: proj.basemap,
    });
    showToast(`File "${proj.name}.ysr" diunduh.`);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseProjectFile(content);
        onLoadProject(parsed);
        showToast(`Proyek "${parsed.projectName}" berhasil dibuka dari file!`);
        onClose();
      } catch (err: any) {
        alert(err?.message || 'Gagal memuat file proyek.');
      }
    };
    reader.readAsText(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const formatDateTime = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Simpan & Kelola Proyek
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded-full font-mono">
                  YSR PETA PRO
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Penyimpanan aman di browser dan cadangan file agar hasil ukur dapat dilanjutkan kapan saja
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/90 px-6 gap-2 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('save')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'save'
                ? 'border-emerald-500 text-emerald-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Save className="w-4 h-4" />
            Simpan Proyek Ini
          </button>

          <button
            onClick={() => {
              setActiveTab('list');
              setSavedProjects(getSavedProjectsList());
            }}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'list'
                ? 'border-blue-500 text-blue-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Daftar Proyek Tersimpan ({savedProjects.length})
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-amber-500 text-amber-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Buka File (.ysr)
          </button>

          <button
            onClick={() => setActiveTab('new')}
            className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
              activeTab === 'new'
                ? 'border-purple-500 text-purple-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Proyek Baru
          </button>
        </div>

        {/* Toast Alert Feedback */}
        {toastMessage && (
          <div className="bg-emerald-950/90 border-b border-emerald-600/50 px-6 py-2.5 text-xs text-emerald-200 flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: SIMPAN PROYEK AKTIF */}
          {activeTab === 'save' && (
            <div className="space-y-6">
              {/* Workspace Summary Card */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-cyan-400" />
                    Status Hasil Kerja Aktif
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2.5 py-0.5 rounded-full font-mono">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Autosave Aktif
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                      <Layers className="w-3 h-3 text-cyan-400" />
                      Jumlah Bidang
                    </div>
                    <div className="text-lg font-bold text-white font-mono">{fields.length} Bidang</div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      Total Luas
                    </div>
                    <div className="text-lg font-bold text-emerald-300 font-mono">
                      {totalAreaHa >= 1
                        ? `${totalAreaHa.toFixed(2)} Ha`
                        : `${totalAreaM2.toLocaleString('id-ID', { maximumFractionDigits: 1 })} m²`}
                    </div>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800/80">
                    <div className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                      <Clock className="w-3 h-3 text-amber-400" />
                      Total Patok Titik
                    </div>
                    <div className="text-lg font-bold text-amber-300 font-mono">{totalPatok} Patok</div>
                  </div>
                </div>

                {lastSavedAt && (
                  <p className="text-[11px] text-slate-400 pt-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Terakhir disimpan otomatis pada: <span className="text-slate-200 font-mono">{formatDateTime(lastSavedAt)}</span>
                  </p>
                )}
              </div>

              {/* Form Input Proyek */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Nama Proyek / Lokasi Pengukuran:
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Contoh: Pengukuran Kebun Sawit Blok B, Desa Tambang"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1.5">
                    Catatan / Keterangan Surveyor (Opsional):
                  </label>
                  <textarea
                    value={inputDesc}
                    onChange={(e) => setInputDesc(e.target.value)}
                    rows={2}
                    placeholder="Contoh: Surveyor: Tim Lapangan YSR. Patok batas sesuai batas alam dan parit batas."
                    className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:border-cyan-500 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  onClick={handleSaveToBrowser}
                  className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all text-xs"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan ke Browser (Slot Memori)</span>
                </button>

                <button
                  onClick={handleDownloadBackup}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-100 border border-slate-700 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all text-xs"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Download File Cadangan (.ysr)</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-900/60 text-xs text-blue-200 space-y-1">
                <div className="font-semibold text-blue-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                  Keamanan Penyimpanan:
                </div>
                <p className="text-[11px] text-blue-200/80 leading-relaxed">
                  Semua digitasi polygon, panjang sisi patok, sudut, dan pengukuran otomatis tersimpan di peramban web perangkat Anda. Anda dapat menutup tab kapan saja dan membukanya kembali besok tanpa kehilangan data. Gunakan tombol <strong>Download File Cadangan (.ysr)</strong> bila ingin memindahkan data ke komputer lain.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: DAFTAR PROYEK TERSIMPAN */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Daftar proyek pengukuran yang tersimpan di peramban perangkat ini:
                </p>
                <button
                  onClick={() => setSavedProjects(getSavedProjectsList())}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Segarkan
                </button>
              </div>

              {savedProjects.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-dashed border-slate-800 space-y-3">
                  <FolderOpen className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-sm font-semibold text-slate-300">Belum ada proyek yang disimpan</p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Buka tab &quot;Simpan Proyek Ini&quot; untuk menyimpan hasil pengukuran saat ini ke dalam memori browser.
                  </p>
                  <button
                    onClick={() => setActiveTab('save')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
                  >
                    Simpan Proyek Sekarang
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {savedProjects.map((proj) => {
                    const previewFields = proj.fields || [];
                    const isCurrent = proj.id === projectId;
                    const areaM2 =
                      proj.preview?.totalAreaM2 ??
                      previewFields.reduce((s, f) => s + (f.areaSquareMeters || 0), 0);
                    const areaHa = areaM2 / 10000;
                    const patokCount = previewFields.reduce((s, f) => s + (f.coordinates?.length || 0), 0);

                    return (
                      <div
                        key={proj.id}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-slate-850 border-cyan-500/80 shadow-lg shadow-cyan-950/40'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-bold text-white text-sm truncate">{proj.name}</h4>
                              {isCurrent && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                                  Proyek Aktif
                                </span>
                              )}
                            </div>
                            {proj.description && (
                              <p className="text-xs text-slate-400 line-clamp-1">{proj.description}</p>
                            )}
                            <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1 flex-wrap font-mono">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {formatDateTime(proj.updatedAt)}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-cyan-400 font-semibold">{previewFields.length} Bidang</span>
                              <span className="text-slate-600">•</span>
                              <span className="text-emerald-400 font-semibold">
                                {areaHa >= 1 ? `${areaHa.toFixed(2)} Ha` : `${areaM2.toLocaleString('id-ID', { maximumFractionDigits: 1 })} m²`}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="text-amber-400">{patokCount} Patok</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleSelectSavedProject(proj)}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition-colors flex items-center gap-1"
                              title="Buka dan lanjutkan pengukuran proyek ini"
                            >
                              <FolderOpen className="w-3.5 h-3.5" />
                              <span>Buka</span>
                            </button>
                            <button
                              onClick={() => handleDownloadSavedItem(proj)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700"
                              title="Download file cadangan .ysr"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSaved(proj.id, proj.name)}
                              className="p-1.5 bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 rounded-lg transition-colors border border-slate-700"
                              title="Hapus proyek ini dari memori"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BUKA FILE CADANGAN (.YSR / .JSON) */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".ysr,.json,.geojson"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsImportDragging(true);
                }}
                onDragLeave={() => setIsImportDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsImportDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`p-8 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isImportDragging
                    ? 'border-cyan-400 bg-cyan-950/20'
                    : 'border-slate-700 bg-slate-950/60 hover:border-cyan-500 hover:bg-slate-950'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Klik atau Tarik File Proyek (.ysr / .json) ke Sini
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mb-3">
                  Buka file proyek yang sebelumnya diekspor dari YSR PETA PRO untuk melanjutkan pekerjaan Anda di laptop atau perangkat lain.
                </p>
                <button
                  type="button"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700"
                >
                  Pilih File dari Perangkat
                </button>
              </div>

              <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 text-xs text-slate-400 space-y-1">
                <span className="font-semibold text-slate-300">Format yang didukung:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-400">
                  <li><strong>.ysr</strong> - Format berkas proyek resmi YSR PETA PRO</li>
                  <li><strong>.json</strong> - Berkas cadangan JSON lengkap</li>
                  <li><strong>.geojson</strong> - Standar GIS FeatureCollection</li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: PROYEK BARU */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl text-xs text-amber-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-amber-300 mb-0.5">Perhatian Sebelum Memulai Lembar Baru:</div>
                  Pastikan proyek aktif saat ini sudah Anda simpan agar tidak tertimpa.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mb-2">
                      <PlusCircle className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Lembar Kerja Kosong</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Mulai proyek baru dengan peta kosong tanpa bidang awal. Siap untuk langsung digitasi atau impor data lapangan.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Buat proyek baru dengan peta kosong?')) {
                        onNewBlankProject();
                        showToast('Memulai lembar proyek baru kosong.');
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Mulai Lembar Kosong
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-2">
                      <Layers className="w-4 h-4" />
                    </div>
                    <h4 className="font-bold text-white text-sm">Muat Contoh Lahan</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Muat 2 bidang contoh (Kebun Sawit Blok A & B) lengkap dengan patok, sudut azimuth, dan pengukuran panjang.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (window.confirm('Muat data contoh lahan Kebun Sawit Blok A & B?')) {
                        onLoadSampleProject();
                        showToast('Data contoh lahan berhasil dimuat.');
                        onClose();
                      }
                    }}
                    className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    Muat Contoh Bidang
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            YSR PETA PRO v2.0 • Sistem Pengukuran Geospasial
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
