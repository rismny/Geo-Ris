import React, { useState } from 'react';
import {
  PolygonField,
  BasemapType,
  UnitType,
  SearchResult,
  Coordinate,
} from '../../types/gis';
import { formatArea, formatDistance } from '../../utils/geoCalculations';
import {
  generateKMLString,
  generateKMZBlob,
  generateGeoJSONString,
  generatePatokCSV,
  downloadFile,
} from '../../utils/kmlKmzParser';
import {
  PenTool,
  Upload,
  RotateCcw,
  Search,
  Crosshair,
  MapPin,
  Layers,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Table,
  FileDown,
  FileText,
  Printer,
  ChevronDown,
  PlayCircle,
  HelpCircle,
  Maximize2,
  Check,
  Undo2,
  Redo2,
  Edit3,
  Ruler,
  PanelLeftClose,
  ChevronUp,
  Minus,
  Save,
  HardDrive,
  FolderOpen,
  Monitor,
} from 'lucide-react';

interface SidebarProps {
  fields: PolygonField[];
  activeFieldId: string | null;
  onSelectField: (id: string) => void;
  onAddField: () => void;
  onDeleteField: (id: string) => void;
  onUpdateField: (updated: PolygonField) => void;
  onResetAll: () => void;
  isDrawing: boolean;
  onStartDrawing: () => void;
  onFinishDrawing: () => void;
  onCancelDrawing: () => void;
  onUndoDrawingPoint: () => void;
  drawingCoordsCount: number;
  basemap: BasemapType;
  onChangeBasemap: (base: BasemapType) => void;
  onOpenStyleModal: (fieldId?: string) => void;
  onOpenRenameModal: (fieldId?: string) => void;
  canUndo: boolean;
  onUndo: () => void;
  canRedo: boolean;
  onRedo: () => void;
  onAddQuickParcel: () => void;
  onOpenImport: () => void;
  onOpenHelp: () => void;
  onOpenTable: () => void;
  onOpenReport: () => void;
  onOpenPrintMap?: () => void;
  onLocateMap: (coord: { lat: number; lng: number; zoom?: number }) => void;
  // Ruler props
  isRulerActive: boolean;
  rulerCoordsCount: number;
  rulerTotalDistance: number;
  onToggleRuler: () => void;
  onClearRuler: () => void;
  onConvertRulerToField: () => void;
  // Collapse / Minimize sidebar props
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  // Project & Persistence props
  projectName?: string;
  lastSavedAt?: number | null;
  onOpenProjectModal: () => void;
  onQuickSave: () => void;
  onOpenDesktopApp?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  fields,
  activeFieldId,
  onSelectField,
  onAddField,
  onDeleteField,
  onUpdateField,
  onResetAll,
  isDrawing,
  onStartDrawing,
  onFinishDrawing,
  onCancelDrawing,
  onUndoDrawingPoint,
  drawingCoordsCount,
  basemap,
  onChangeBasemap,
  onOpenStyleModal,
  onOpenRenameModal,
  canUndo,
  onUndo,
  canRedo,
  onRedo,
  onAddQuickParcel,
  onOpenImport,
  onOpenHelp,
  onOpenTable,
  onOpenReport,
  onOpenPrintMap,
  onLocateMap,
  isRulerActive,
  rulerCoordsCount,
  rulerTotalDistance,
  onToggleRuler,
  onClearRuler,
  onConvertRulerToField,
  isCollapsed = false,
  onToggleCollapse,
  projectName = 'Proyek Pengukuran YSR',
  lastSavedAt,
  onOpenProjectModal,
  onQuickSave,
  onOpenDesktopApp,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<UnitType>('ha');
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  // Collapsible section states for Menu Box and Info Box
  const [isDigitasiOpen, setIsDigitasiOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(true);
  const [isAreaInfoOpen, setIsAreaInfoOpen] = useState(true); // Info Box
  const [isFieldsListOpen, setIsFieldsListOpen] = useState(true);
  const [isBasemapOpen, setIsBasemapOpen] = useState(true);

  const activeField = fields.find((f) => f.id === activeFieldId) || fields[0] || null;

  // Search Location via Nominatim OpenStreetMap Geocoding
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if query is latitude, longitude coordinate format
    const coordMatch = searchQuery.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[3]);
      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        onLocateMap({ lat, lng, zoom: 17 });
        setSearchResults([]);
        return;
      }
    }

    setIsSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery
        )}&countrycodes=id&limit=5`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch {
      // Fallback global search without country limit
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery
          )}&limit=5`
        );
        const data = await res.json();
        setSearchResults(data);
      } catch {
        setSearchResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: SearchResult) => {
    const lat = parseFloat(res.lat);
    const lng = parseFloat(res.lon);
    onLocateMap({ lat, lng, zoom: 16 });
    setSearchResults([]);
    setSearchQuery(res.display_name.split(',')[0]);
  };

  // Export handlers
  const handleExportKML = () => {
    const kml = generateKMLString(fields);
    downloadFile(kml, 'pengukuran_polygon.kml', 'application/vnd.google-earth.kml+xml');
    setExportMenuOpen(false);
  };

  const handleExportKMZ = async () => {
    const blob = await generateKMZBlob(fields);
    downloadFile(blob, 'pengukuran_polygon.kmz', 'application/vnd.google-earth.kmz');
    setExportMenuOpen(false);
  };

  const handleExportGeoJSON = () => {
    const geojson = generateGeoJSONString(fields);
    downloadFile(geojson, 'pengukuran_polygon.geojson', 'application/geo+json');
    setExportMenuOpen(false);
  };

  // Total area of all visible fields
  const totalAreaM2 = fields
    .filter((f) => f.visible)
    .reduce((acc, f) => acc + f.areaSquareMeters, 0);

  const mainAreaDisplay = activeField
    ? formatArea(activeField.areaSquareMeters, 'ha')
    : { value: '0,0000', unitLabel: 'ha' };

  const secondaryAreaDisplay = activeField
    ? formatArea(activeField.areaSquareMeters, selectedUnit)
    : { value: '0,00', unitLabel: selectedUnit };

  return (
    <aside
      className={`h-full bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-200 z-20 shadow-2xl overflow-hidden transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-0 -translate-x-full border-r-0' : 'w-80 md:w-96 translate-x-0'
      }`}
    >
      {/* Top Brand & Help Bar */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-950 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <PenTool className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h1 className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
              YSR <span className="text-cyan-400">PETA PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 truncate">Pengukuran Peta & Polygon KML/KMZ</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenDesktopApp && (
            <button
              onClick={onOpenDesktopApp}
              className="px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-950/40 hover:bg-emerald-800/60 border border-emerald-500/40 rounded-md flex items-center gap-1.5 transition-colors shadow-sm"
              title="Pasang / Gunakan sebagai Aplikasi Komputer PC Standalone"
            >
              <Monitor className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Aplikasi PC</span>
            </button>
          )}

          <button
            onClick={onOpenHelp}
            className="px-2 py-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 rounded-md flex items-center gap-1.5 transition-colors"
            title="Buka panduan cara penggunaan"
          >
            <PlayCircle className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">PANDUAN</span>
          </button>

          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-md transition-colors border border-slate-700/80"
              title="Minimize Menu Box (Sembunyikan panel samping agar area kerja lebih clear)"
            >
              <PanelLeftClose className="w-4 h-4 text-cyan-400" />
            </button>
          )}
        </div>
      </div>

      {/* Project Status & Quick Save Bar */}
      <div className="px-3.5 py-2 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <button
          onClick={onOpenProjectModal}
          className="flex items-center gap-2 min-w-0 text-left hover:opacity-90 group transition-all"
          title="Klik untuk membuka kelola proyek, simpan proyek, atau riwayat"
        >
          <div className="relative flex items-center justify-center shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping absolute" />
          </div>
          <div className="truncate">
            <div className="text-[11px] font-bold text-slate-200 group-hover:text-cyan-300 truncate flex items-center gap-1">
              <span>{projectName || 'Proyek Pengukuran YSR'}</span>
            </div>
            <div className="text-[9.5px] text-slate-400 font-mono flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">Tersimpan</span>
              {lastSavedAt ? (
                <span>• {new Date(lastSavedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
              ) : (
                <span>• Baru saja</span>
              )}
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onQuickSave}
            className="px-2.5 py-1 bg-emerald-600/25 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 hover:border-emerald-500 rounded-md font-semibold text-[10px] flex items-center gap-1 transition-all shadow-sm"
            title="Simpan ke memori browser sekarang (Ctrl+S)"
          >
            <Save className="w-3 h-3" />
            <span>Simpan</span>
          </button>
          <button
            onClick={onOpenProjectModal}
            className="p-1 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-cyan-300 rounded-md border border-slate-700 transition-colors"
            title="Kelola & Buka File Proyek (.ysr)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          </button>
        </div>
      </div>

      {/* Scrollable Panel Area */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 text-xs">
        {/* SECTION: ALAT DIGITASI (MENU BOX) */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5 text-cyan-400" />
              Menu Alat Digitasi
            </div>
            <button
              onClick={() => setIsDigitasiOpen(!isDigitasiOpen)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-[10px]"
              title={isDigitasiOpen ? 'Minimize Box Alat Digitasi' : 'Perluas Box Alat Digitasi'}
            >
              <span className="text-[10px] text-slate-500 font-mono">{isDigitasiOpen ? 'TUTUP' : 'BUKA'}</span>
              {isDigitasiOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isDigitasiOpen ? (
            <div className="space-y-2 animate-fade-in">
              {!isDrawing ? (
                <div className="space-y-2">
                  <button
                    onClick={onStartDrawing}
                    className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <PenTool className="w-4 h-4" />
                    Mulai Gambar Polygon
                  </button>

                  {/* RULER FEATURE BUTTON */}
                  <button
                    onClick={onToggleRuler}
                    className={`w-full py-2 px-3 rounded-lg border flex items-center justify-center gap-2 transition-all font-semibold text-xs ${
                      isRulerActive
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold'
                        : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/40 hover:border-amber-400'
                    }`}
                    title="Gunakan penggaris untuk mengukur panjang sisi lahan atau jarak antar patok"
                  >
                    <Ruler className="w-4 h-4" />
                    <span>{isRulerActive ? 'Mode Penggaris Aktif (Klik Peta)' : 'Penggaris Ukur Panjang Lahan'}</span>
                  </button>

                  {/* Active Ruler Measurement Card in Sidebar */}
                  {rulerCoordsCount >= 2 && (
                    <div className="bg-amber-950/40 border border-amber-500/50 rounded-lg p-2.5 space-y-1.5 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <Ruler className="w-3 h-3" /> Hasil Ukur Penggaris
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">{rulerCoordsCount} titik</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-lg font-extrabold font-mono text-white tabular-nums">
                          {formatDistance(rulerTotalDistance)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        {rulerCoordsCount >= 3 && (
                          <button
                            onClick={onConvertRulerToField}
                            className="py-1 px-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors"
                            title="Ubah garis ukur menjadi bidang polygon baru"
                          >
                            + Jadi Bidang
                          </button>
                        )}
                        <button
                          onClick={onClearRuler}
                          className={`py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
                            rulerCoordsCount >= 3 ? '' : 'col-span-2'
                          }`}
                          title="Hapus pengukuran penggaris"
                        >
                          Reset Ukur
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={onAddQuickParcel}
                    className="w-full py-1.5 px-3 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-800/60 text-cyan-300 font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Buat Kavling Cepat (100m × 100m)
                  </button>
                  {/* Undo / Redo Polygon History Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={onUndo}
                      disabled={!canUndo}
                      title="Urungkan penambahan atau perubahan polygon (Ctrl+Z)"
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors text-xs font-medium"
                    >
                      <Undo2 className="w-3.5 h-3.5 text-amber-400" />
                      Urungkan (Undo)
                    </button>
                    <button
                      onClick={onRedo}
                      disabled={!canRedo}
                      title="Ulangi perubahan (Ctrl+Y)"
                      className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition-colors text-xs font-medium"
                    >
                      <Redo2 className="w-3.5 h-3.5 text-cyan-400" />
                      Ulangi (Redo)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={onFinishDrawing}
                    disabled={drawingCoordsCount < 3}
                    className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold rounded-lg shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    Selesai Gambar ({drawingCoordsCount} Titik)
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={onUndoDrawingPoint}
                      disabled={drawingCoordsCount === 0}
                      className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-md flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Urungkan Titik
                    </button>
                    <button
                      onClick={onCancelDrawing}
                      className="py-1.5 px-3 bg-red-950/80 hover:bg-red-900 border border-red-800/50 text-red-200 rounded-md flex items-center justify-center gap-1.5 transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* Impor & Reset Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onOpenImport}
                  className="py-2 px-3 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  Impor
                </button>
                <button
                  onClick={onResetAll}
                  className="py-2 px-3 bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-slate-200 font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                  Reset
                </button>
              </div>
            </div>
          ) : (
            /* Minimized Compact View for Digitasi */
            <div className="flex items-center gap-1.5 animate-fade-in pt-0.5">
              {!isDrawing ? (
                <button
                  onClick={onStartDrawing}
                  className="flex-1 py-1.5 px-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors"
                  title="Mulai Gambar Polygon"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Gambar</span>
                </button>
              ) : (
                <button
                  onClick={onFinishDrawing}
                  disabled={drawingCoordsCount < 3}
                  className="flex-1 py-1.5 px-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-medium text-xs rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Selesai ({drawingCoordsCount})</span>
                </button>
              )}
              <button
                onClick={onToggleRuler}
                className={`py-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1 transition-colors ${
                  isRulerActive ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-amber-300 border-amber-500/40'
                }`}
                title="Penggaris Ukur Lahan"
              >
                <Ruler className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                title="Urungkan (Undo)"
              >
                <Undo2 className="w-3.5 h-3.5 text-amber-400" />
              </button>
              <button
                onClick={onOpenImport}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
                title="Impor KML/KMZ/GeoJSON"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            </div>
          )}
        </div>

        {/* SECTION: CARI LOKASI */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-cyan-400" />
              Cari Lokasi
            </div>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
              title={isSearchOpen ? 'Minimize Cari Lokasi' : 'Perluas Cari Lokasi'}
            >
              <span className="text-[10px] text-slate-500 font-mono">{isSearchOpen ? 'TUTUP' : 'BUKA'}</span>
              {isSearchOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isSearchOpen && (
            <div className="space-y-2 animate-fade-in">
              <form onSubmit={handleSearch} className="relative flex items-center gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik Desa, Kecamatan atau Koordinat"
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={isSearching}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                  title="Cari"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="text-[10px] text-slate-500">
                Geocoding powered by OpenStreetMap & Nominatim
              </div>

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg overflow-hidden shadow-xl mt-1 max-h-48 overflow-y-auto divide-y divide-slate-800/60">
                  {searchResults.map((res) => (
                    <button
                      key={res.place_id}
                      onClick={() => handleSelectSearchResult(res)}
                      className="w-full text-left p-2.5 hover:bg-slate-800/70 text-slate-300 text-xs flex items-start gap-2 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{res.display_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION: LUAS AREA & STATISTIK (INFO BOX) */}
        <div className="p-3.5 space-y-2.5 bg-slate-950/70 border-y border-slate-800/70">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              Info Box Luas Area
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsAreaInfoOpen(!isAreaInfoOpen)}
                className="px-2 py-0.5 text-[10px] font-mono text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors flex items-center gap-1 border border-slate-700/80 bg-slate-900/80"
                title={isAreaInfoOpen ? 'Minimize Info Box Luas Area agar area kerja lebih clear' : 'Perluas Info Box Luas Area'}
              >
                {isAreaInfoOpen ? (
                  <>
                    <Minus className="w-3 h-3 text-amber-400" />
                    <span>MINIMIZE</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3 h-3 text-cyan-400" />
                    <span>PERLUAS</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {isAreaInfoOpen ? (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                {/* Big Area Hero Number */}
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold font-mono tracking-tight text-white tabular-nums">
                    {mainAreaDisplay.value}
                  </span>
                  <span className="text-lg font-bold text-cyan-400">{mainAreaDisplay.unitLabel}</span>
                </div>

                <div className="text-[10px] font-mono text-slate-400 text-right space-y-0.5">
                  <div>
                    <span className="text-slate-500">CALC:</span>{' '}
                    <span className="text-emerald-400 font-semibold">EPSG:3857</span>
                  </div>
                  <div>
                    <span className="text-slate-500">EXP:</span>{' '}
                    <span className="text-cyan-400 font-semibold">EPSG:4326</span>
                  </div>
                </div>
              </div>

              {/* Conversion row + unit selector & Table button */}
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center justify-between bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 font-mono text-xs">
                  <span className="text-slate-200 tabular-nums font-semibold">
                    {secondaryAreaDisplay.value}
                  </span>
                  <select
                    value={selectedUnit}
                    onChange={(e) => setSelectedUnit(e.target.value as UnitType)}
                    aria-label="Pilih Satuan Luas Area"
                    className="bg-transparent text-cyan-400 font-bold focus:outline-none cursor-pointer pl-1 text-right"
                  >
                    <option value="m2" className="bg-slate-900 text-white">m²</option>
                    <option value="ha" className="bg-slate-900 text-white">ha</option>
                    <option value="are" className="bg-slate-900 text-white">are</option>
                    <option value="km2" className="bg-slate-900 text-white">km²</option>
                    <option value="acre" className="bg-slate-900 text-white">acre</option>
                    <option value="sqft" className="bg-slate-900 text-white">ft²</option>
                  </select>
                </div>
                <button
                  onClick={onOpenTable}
                  disabled={!activeField}
                  title="Buka Tabel Patok & Sudut Lengkap"
                  className="px-3 py-1.5 bg-blue-600/90 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-1 shrink-0"
                >
                  <Table className="w-3.5 h-3.5" />
                  Tabel
                </button>
              </div>

              {/* Secondary Stats Grid: Perimeter and Bounding Length x Width */}
              {activeField && activeField.coordinates.length >= 3 && (
                <div className="space-y-2 pt-1 border-t border-slate-800/80">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Panjang Bidang (P):</div>
                      <div className="font-mono text-sm font-bold text-cyan-300 tabular-nums">
                        {(activeField.dimension?.lengthMeters ?? activeField.bounds.lengthMeters).toFixed(1)} m
                      </div>
                    </div>
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-slate-400 font-medium">Lebar Bidang (L):</div>
                      <div className="font-mono text-sm font-bold text-cyan-300 tabular-nums">
                        {(activeField.dimension?.widthMeters ?? activeField.bounds.widthMeters).toFixed(1)} m
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                      <div className="text-[10px] text-slate-400">Total Keliling:</div>
                      <div className="font-mono text-xs font-bold text-slate-200 tabular-nums">
                        {formatDistance(activeField.perimeterMeters)}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onOpenRenameModal(activeField.id)}
                        className="bg-slate-900/80 hover:bg-slate-800 p-2 rounded-lg border border-slate-700 text-left transition-colors flex items-center justify-between"
                        title="Ganti Nama Bidang"
                      >
                        <div>
                          <div className="text-[10px] text-slate-400">Nama:</div>
                          <div className="text-xs font-semibold text-slate-200 truncate flex items-center gap-1 mt-0.5">
                            <Edit3 className="w-3 h-3 text-cyan-400 shrink-0" />
                            Ganti
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => onOpenStyleModal(activeField.id)}
                        className="bg-slate-900/80 hover:bg-slate-800 p-2 rounded-lg border border-cyan-500/40 text-left transition-colors flex items-center justify-between"
                        title="Ubah Warna Garis & Bidang"
                      >
                        <div>
                          <div className="text-[10px] text-slate-400">Gaya:</div>
                          <div className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5 mt-0.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full inline-block border border-white/60"
                              style={{
                                backgroundColor: activeField.fillColor || activeField.color,
                                borderColor: activeField.strokeColor || activeField.color,
                                borderWidth: '1.5px',
                              }}
                            />
                            Warna
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Minimized Compact View for Info Box */
            <div
              onClick={() => setIsAreaInfoOpen(true)}
              className="p-2.5 bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/50 rounded-lg cursor-pointer transition-all flex items-center justify-between group"
              title="Klik untuk memperluas Info Box Luas Area"
            >
              <div className="flex items-baseline gap-2">
                <span className="text-base font-extrabold font-mono text-white tracking-tight">
                  {mainAreaDisplay.value}
                </span>
                <span className="text-xs font-bold text-cyan-400">{mainAreaDisplay.unitLabel}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({secondaryAreaDisplay.value} {secondaryAreaDisplay.unitLabel})
                </span>
              </div>
              <div className="text-[10px] text-slate-400 group-hover:text-cyan-300 font-semibold flex items-center gap-1">
                <span>Perluas</span>
                <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
              </div>
            </div>
          )}
        </div>

        {/* SECTION: DAFTAR BIDANG PETA (MULTIPOLYGON / MULTI-FIELD) */}
        <div className="p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              Daftar Bidang ({fields.length})
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onAddField}
                className="px-2 py-0.5 text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800/50 rounded flex items-center gap-1 transition-colors"
                title="Tambah Bidang Polygon Baru"
              >
                <Plus className="w-3 h-3" />
                Tambah
              </button>
              <button
                onClick={() => setIsFieldsListOpen(!isFieldsListOpen)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
                title={isFieldsListOpen ? 'Minimize Daftar Bidang' : 'Perluas Daftar Bidang'}
              >
                <span className="text-[10px] text-slate-500 font-mono">{isFieldsListOpen ? 'TUTUP' : 'BUKA'}</span>
                {isFieldsListOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {isFieldsListOpen && (
            <div className="space-y-2 animate-fade-in">
              {/* Fields List with Panjang, Lebar, and Luas */}
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {fields.map((field) => {
                  const isSelected = field.id === activeFieldId;
                  const isEditing = editingNameId === field.id;

                  const pLen = (field.dimension?.lengthMeters ?? field.bounds.lengthMeters).toFixed(0);
                  const pWid = (field.dimension?.widthMeters ?? field.bounds.widthMeters).toFixed(0);
                  const pHa = (field.areaSquareMeters / 10000).toFixed(2);

                  return (
                    <div
                      key={field.id}
                      onClick={() => onSelectField(field.id)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer space-y-1.5 ${
                        isSelected
                          ? 'bg-slate-800/95 border-cyan-500/70 shadow-lg'
                          : 'bg-slate-900/50 hover:bg-slate-800/60 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Color swatch & style trigger */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenStyleModal(field.id);
                            }}
                            className="w-4 h-4 rounded-full cursor-pointer shrink-0 border shadow-sm transition-transform hover:scale-125"
                            style={{
                              backgroundColor: field.fillColor || field.color,
                              borderColor: field.strokeColor || field.color,
                              borderWidth: '2px',
                            }}
                            title="Klik untuk ubah warna bidang & garis"
                          />

                          {/* Field Name */}
                          {isEditing ? (
                            <input
                              type="text"
                              value={tempName}
                              onChange={(e) => setTempName(e.target.value)}
                              onBlur={() => {
                                if (tempName.trim()) {
                                  onUpdateField({ ...field, name: tempName.trim() });
                                }
                                setEditingNameId(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  if (tempName.trim()) {
                                    onUpdateField({ ...field, name: tempName.trim() });
                                  }
                                  setEditingNameId(null);
                                }
                              }}
                              autoFocus
                              className="bg-slate-950 border border-cyan-500 rounded px-1.5 py-0.5 text-xs text-white outline-none"
                            />
                          ) : (
                            <div
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                setEditingNameId(field.id);
                                setTempName(field.name);
                              }}
                              className="truncate font-semibold text-slate-100 text-xs"
                              title="Klik ganda untuk mengubah nama"
                            >
                              {field.name}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenRenameModal(field.id);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Ganti Nama Bidang"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenStyleModal(field.id);
                            }}
                            className="p-1 text-slate-400 hover:text-cyan-300 transition-colors"
                            title="Ubah Warna Garis & Bidang"
                          >
                            <PenTool className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onUpdateField({ ...field, visible: !field.visible });
                            }}
                            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                            title={field.visible ? 'Sembunyikan' : 'Tampilkan'}
                          >
                            {field.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                          </button>

                          {fields.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteField(field.id);
                              }}
                              className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                              title="Hapus Bidang"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dimensions display for each field */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-1 border-t border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <span>P: <strong className="text-slate-200">{pLen}m</strong></span>
                          <span>•</span>
                          <span>L: <strong className="text-slate-200">{pWid}m</strong></span>
                        </div>
                        <span className="font-semibold text-cyan-400">
                          {pHa} ha
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total aggregate summary */}
              {fields.length > 1 && (
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">Total Luas Semua Bidang:</span>
                  <span className="font-mono font-bold text-white">
                    {(totalAreaM2 / 10000).toFixed(4)} ha
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION: PETA DASAR (BASEMAP SELECTOR) */}
        <div className="p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Peta Dasar
            </div>
            <button
              onClick={() => setIsBasemapOpen(!isBasemapOpen)}
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors flex items-center gap-1"
              title={isBasemapOpen ? 'Minimize Peta Dasar' : 'Perluas Peta Dasar'}
            >
              <span className="text-[10px] text-slate-500 font-mono">{isBasemapOpen ? 'TUTUP' : 'BUKA'}</span>
              {isBasemapOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {isBasemapOpen && (
            <div className="grid grid-cols-2 gap-1.5 animate-fade-in">
              <button
                onClick={() => onChangeBasemap('satellite')}
                className={`py-1.5 px-2.5 rounded text-[11px] font-medium border text-left transition-colors ${
                  basemap === 'satellite'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Citra Satelit ESRI
              </button>
              <button
                onClick={() => onChangeBasemap('google_hybrid')}
                className={`py-1.5 px-2.5 rounded text-[11px] font-medium border text-left transition-colors ${
                  basemap === 'google_hybrid'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Google Hibrida
              </button>
              <button
                onClick={() => onChangeBasemap('osm')}
                className={`py-1.5 px-2.5 rounded text-[11px] font-medium border text-left transition-colors ${
                  basemap === 'osm'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                OpenStreetMap
              </button>
              <button
                onClick={() => onChangeBasemap('topo')}
                className={`py-1.5 px-2.5 rounded text-[11px] font-medium border text-left transition-colors ${
                  basemap === 'topo'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 font-bold'
                    : 'bg-slate-800/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                Topografi / Kontur
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer: EKSPOR & CETAK */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
        <div className="relative">
          <button
            onClick={() => setExportMenuOpen(!exportMenuOpen)}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 text-white font-semibold rounded-lg flex items-center justify-between transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-cyan-400" />
              Unduh / Ekspor Data
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Export Dropdown Options */}
          {exportMenuOpen && (
            <div className="absolute bottom-full left-0 right-0 mb-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden divide-y divide-slate-800 z-30">
              <button
                onClick={() => {
                  onOpenProjectModal();
                  setExportMenuOpen(false);
                }}
                className="w-full px-3.5 py-2.5 hover:bg-slate-800 text-left text-xs text-cyan-300 bg-cyan-950/40 flex items-center justify-between transition-colors font-medium"
              >
                <span className="flex items-center gap-2">
                  <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                  Simpan & Cadangkan File Proyek
                </span>
                <span className="text-[10px] text-cyan-400 font-mono font-bold">.ysr</span>
              </button>
              <button
                onClick={handleExportKMZ}
                className="w-full px-3.5 py-2.5 hover:bg-slate-800 text-left text-xs text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Unduh File KMZ (Google Earth)</span>
                <span className="text-[10px] text-cyan-400 font-mono">.kmz</span>
              </button>
              <button
                onClick={handleExportKML}
                className="w-full px-3.5 py-2.5 hover:bg-slate-800 text-left text-xs text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Unduh File KML Standar</span>
                <span className="text-[10px] text-cyan-400 font-mono">.kml</span>
              </button>
              <button
                onClick={handleExportGeoJSON}
                className="w-full px-3.5 py-2.5 hover:bg-slate-800 text-left text-xs text-slate-200 flex items-center justify-between transition-colors"
              >
                <span>Unduh GeoJSON (QGIS / ArcGIS)</span>
                <span className="text-[10px] text-cyan-400 font-mono">.geojson</span>
              </button>
              {activeField && (
                <button
                  onClick={() => {
                    const csv = generatePatokCSV(activeField);
                    downloadFile(csv, `patok_${activeField.name.replace(/\s+/g, '_')}.csv`, 'text/csv');
                    setExportMenuOpen(false);
                  }}
                  className="w-full px-3.5 py-2.5 hover:bg-slate-800 text-left text-xs text-slate-200 flex items-center justify-between transition-colors"
                >
                  <span>Unduh Tabel Koordinat Patok BPN</span>
                  <span className="text-[10px] text-emerald-400 font-mono">.csv</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* PRIMARY ACTION: Review Hasil Cetak Peta Standar Instansi */}
        <button
          onClick={onOpenPrintMap}
          className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 active:from-blue-700 active:to-cyan-700 text-white font-bold rounded-lg shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all text-xs"
          title="Review dan cetak layout peta tematik standar instansi pemerintah (ATR/BPN & Pemda)"
        >
          <Printer className="w-4 h-4 text-cyan-200" />
          <span>Review Hasil Cetak Peta (ATR/BPN)</span>
        </button>

        <button
          onClick={onOpenReport}
          disabled={!activeField}
          className="w-full py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-xs font-medium"
        >
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          Cetak Berita Acara / Laporan PDF
        </button>
      </div>
    </aside>
  );
};
