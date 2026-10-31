import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PolygonField, Coordinate, BasemapType } from './types/gis';
import { updatePolygonMetrics, calculateRulerMetrics } from './utils/geoCalculations';
import { INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD } from './data/sampleFields';
import { MapViewer } from './components/Map/MapViewer';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ImportModal } from './components/Modals/ImportModal';
import { HelpModal } from './components/Modals/HelpModal';
import { CoordinateTableModal } from './components/Modals/CoordinateTableModal';
import { ReportModal } from './components/Modals/ReportModal';
import { PrintMapLayoutModal } from './components/Modals/PrintMapLayoutModal';
import { StyleModal } from './components/Modals/StyleModal';
import { RenameModal } from './components/Modals/RenameModal';
import { ProjectModal } from './components/Modals/ProjectModal';
import { DesktopAppModal } from './components/Modals/DesktopAppModal';
import {
  loadAutoSavedWorkspace,
  autoSaveWorkspace,
  saveProjectToList,
  getSampleFields,
} from './utils/projectStorage';
import { CheckCircle2 } from 'lucide-react';

export default function App() {
  const initialSaved = useRef(loadAutoSavedWorkspace()).current;

  // Project persistence state
  const [projectName, setProjectName] = useState<string>(
    initialSaved?.projectName || 'Proyek Pengukuran YSR'
  );
  const [projectId, setProjectId] = useState<string | undefined>(
    initialSaved?.projectId
  );
  const [projectDescription, setProjectDescription] = useState<string>(
    initialSaved?.description || ''
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(
    initialSaved?.lastSavedAt || null
  );
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [fields, setFields] = useState<PolygonField[]>(
    initialSaved?.fields && initialSaved.fields.length > 0
      ? initialSaved.fields
      : [INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD]
  );
  // Default to null so workspace starts clean without persistent cards or markers
  const [activeFieldId, setActiveFieldId] = useState<string | null>(
    initialSaved?.activeFieldId ?? null
  );

  // History stack for Undo / Redo
  const [history, setHistory] = useState<PolygonField[][]>([
    initialSaved?.fields && initialSaved.fields.length > 0
      ? initialSaved.fields
      : [INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD],
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingCoords, setDrawingCoords] = useState<Coordinate[]>([]);

  // Ruler (Pita Ukur / Penggaris Lahan) state
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerCoords, setRulerCoords] = useState<Coordinate[]>(
    initialSaved?.rulerCoords || []
  );

  // Workspace layout: collapsible sidebar menu box for clear area
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Map controls
  const [basemap, setBasemap] = useState<BasemapType>(
    initialSaved?.basemap || 'satellite'
  );
  const [showLengths, setShowLengths] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showFieldLabels, setShowFieldLabels] = useState(true);
  const [clickOnlyMeasure, setClickOnlyMeasure] = useState(true); // Default true: ukuran muncul saat diklik & hilang jika tidak diklik
  const [mapCenterTrigger, setMapCenterTrigger] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);

  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isPrintLayoutOpen, setIsPrintLayoutOpen] = useState(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [stylingFieldId, setStylingFieldId] = useState<string | null>(null);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renamingFieldId, setRenamingFieldId] = useState<string | null>(null);
  const [isDesktopModalOpen, setIsDesktopModalOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  }, []);

  // Automatic Persistence: saves state to local browser memory automatically
  useEffect(() => {
    const timer = setTimeout(() => {
      const ts = autoSaveWorkspace({
        projectName,
        projectId,
        description: projectDescription,
        fields,
        activeFieldId,
        basemap,
        rulerCoords,
      });
      setLastSavedAt(ts);
    }, 350);

    return () => clearTimeout(timer);
  }, [projectName, projectId, projectDescription, fields, activeFieldId, basemap, rulerCoords]);

  const activeField = fields.find((f) => f.id === activeFieldId) || null;
  const fieldToStyle = fields.find((f) => f.id === (stylingFieldId || activeFieldId)) || activeField || fields[0] || null;
  const fieldToRename = fields.find((f) => f.id === (renamingFieldId || activeFieldId)) || activeField || fields[0] || null;

  // Push new state to history stack
  const pushHistory = useCallback(
    (newFields: PolygonField[]) => {
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, newFields];
      });
      setHistoryIndex((prev) => prev + 1);
      setFields(newFields);
    },
    [historyIndex]
  );

  // Ruler metrics and callbacks
  const rulerMetrics = calculateRulerMetrics(rulerCoords);

  const handleToggleRuler = useCallback(() => {
    setIsRulerActive((prev) => {
      const next = !prev;
      if (next) {
        setIsDrawing(false);
        setDrawingCoords([]);
      }
      return next;
    });
  }, []);

  const handleAddRulerCoord = useCallback((coord: Coordinate) => {
    setRulerCoords((prev) => [...prev, coord]);
  }, []);

  const handleClearRuler = useCallback(() => {
    setRulerCoords([]);
  }, []);

  const handleUndoRulerPoint = useCallback(() => {
    setRulerCoords((prev) => prev.slice(0, -1));
  }, []);

  const handleConvertRulerToField = useCallback(() => {
    if (rulerCoords.length < 3) return;

    const newId = `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const colorPairs = [
      { stroke: '#f59e0b', fill: '#d97706' },
      { stroke: '#06b6d4', fill: '#0891b2' },
      { stroke: '#10b981', fill: '#059669' },
      { stroke: '#3b82f6', fill: '#2563eb' },
      { stroke: '#8b5cf6', fill: '#7c3aed' },
    ];
    const chosen = colorPairs[fields.length % colorPairs.length];

    const newField = updatePolygonMetrics({
      id: newId,
      name: `Hasil Ukur Penggaris ${fields.length + 1}`,
      color: chosen.stroke,
      strokeColor: chosen.stroke,
      fillColor: chosen.fill,
      strokeWidth: 3,
      opacity: 0.35,
      coordinates: [...rulerCoords],
      visible: true,
      isCompleted: true,
      createdAt: Date.now(),
    });

    const nextFields = [...fields, newField];
    pushHistory(nextFields);
    setActiveFieldId(newId);
    setIsRulerActive(false);
    setRulerCoords([]);
  }, [rulerCoords, fields, pushHistory]);

  // Undo polygon action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetFields = history[targetIndex];
      setHistoryIndex(targetIndex);
      setFields(targetFields);
      if (targetFields.length > 0 && !targetFields.some((f) => f.id === activeFieldId)) {
        setActiveFieldId(targetFields[0].id);
      }
    }
  }, [historyIndex, history, activeFieldId]);

  // Redo polygon action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetFields = history[targetIndex];
      setHistoryIndex(targetIndex);
      setFields(targetFields);
      if (targetFields.length > 0 && !targetFields.some((f) => f.id === activeFieldId)) {
        setActiveFieldId(targetFields[0].id);
      }
    }
  }, [historyIndex, history, activeFieldId]);

  // Add a new empty parcel to draw
  const handleAddField = () => {
    const newId = `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const colorPairs = [
      { stroke: '#06b6d4', fill: '#0891b2' },
      { stroke: '#10b981', fill: '#059669' },
      { stroke: '#3b82f6', fill: '#2563eb' },
      { stroke: '#f59e0b', fill: '#d97706' },
      { stroke: '#ec4899', fill: '#db2777' },
      { stroke: '#8b5cf6', fill: '#7c3aed' },
    ];
    const chosen = colorPairs[fields.length % colorPairs.length];

    const newField = updatePolygonMetrics({
      id: newId,
      name: `Bidang Tanah ${fields.length + 1}`,
      color: chosen.stroke,
      strokeColor: chosen.stroke,
      fillColor: chosen.fill,
      strokeWidth: 3,
      opacity: 0.35,
      coordinates: [],
      visible: true,
      isCompleted: false,
      createdAt: Date.now(),
    });

    setFields((prev) => [...prev, newField]);
    setActiveFieldId(newId);
    // Start drawing right away for the new field
    setIsDrawing(true);
    setDrawingCoords([]);
  };

  // Add Quick Predefined 1-Hectare Rectangular Parcel (100m x 100m)
  const handleAddQuickParcel = () => {
    let centerLat = 0.5255;
    let centerLng = 101.4485;

    if (activeField && activeField.coordinates.length > 0) {
      const avgLat = activeField.coordinates.reduce((sum, c) => sum + c.lat, 0) / activeField.coordinates.length;
      const avgLng = activeField.coordinates.reduce((sum, c) => sum + c.lng, 0) / activeField.coordinates.length;
      centerLat = avgLat + 0.0018 * ((fields.length % 3) + 1);
      centerLng = avgLng + 0.0022 * (fields.length % 2 === 0 ? 1 : -1);
    }

    const dLat = 100 / 110574 / 2;
    const cosLat = Math.cos((centerLat * Math.PI) / 180);
    const dLng = 100 / (111320 * cosLat) / 2;

    const coords: Coordinate[] = [
      { lat: centerLat + dLat, lng: centerLng - dLng }, // P1: Top-Left
      { lat: centerLat + dLat, lng: centerLng + dLng }, // P2: Top-Right
      { lat: centerLat - dLat, lng: centerLng + dLng }, // P3: Bottom-Right
      { lat: centerLat - dLat, lng: centerLng - dLng }, // P4: Bottom-Left
    ];

    const colorPairs = [
      { stroke: '#f59e0b', fill: '#d97706' },
      { stroke: '#8b5cf6', fill: '#7c3aed' },
      { stroke: '#ec4899', fill: '#db2777' },
      { stroke: '#10b981', fill: '#059669' },
      { stroke: '#06b6d4', fill: '#0891b2' },
      { stroke: '#3b82f6', fill: '#2563eb' },
    ];
    const chosen = colorPairs[(fields.length + 2) % colorPairs.length];

    const newField = updatePolygonMetrics({
      id: `field-${Date.now()}`,
      name: `Kavling Cepat ${fields.length + 1} (1 Ha)`,
      color: chosen.stroke,
      strokeColor: chosen.stroke,
      fillColor: chosen.fill,
      strokeWidth: 3,
      opacity: 0.35,
      coordinates: coords,
      visible: true,
      isCompleted: true,
      createdAt: Date.now(),
    });

    const nextFields = [...fields, newField];
    pushHistory(nextFields);
    setActiveFieldId(newField.id);
    setMapCenterTrigger({ lat: centerLat, lng: centerLng, zoom: 17 });
  };

  // Helper to add an overlapping PKKPR yellow polygon for comparison review
  const handleAddOverlapField = useCallback(() => {
    const baseField = fields.find((f) => f.id === activeFieldId) || fields[0];
    if (!baseField || baseField.coordinates.length < 3) return;

    const newCoords: Coordinate[] = baseField.coordinates.map((c, i) => {
      const latOffset = (i % 2 === 0 ? 0.0006 : -0.0004);
      const lngOffset = (i % 3 === 0 ? 0.0007 : -0.0003);
      return {
        lat: Number((c.lat + latOffset).toFixed(6)),
        lng: Number((c.lng + lngOffset).toFixed(6)),
      };
    });

    const newId = `pkkpr-field-${Date.now()}`;
    const newField = updatePolygonMetrics({
      id: newId,
      name: 'Delineasi Koordinat PKKPR (Kuning)',
      color: '#eab308',
      strokeColor: '#eab308',
      fillColor: '#ca8a04',
      strokeWidth: 3.5,
      opacity: 0.25,
      coordinates: newCoords,
      visible: true,
      isCompleted: true,
      createdAt: Date.now(),
    });

    const nextFields = [...fields, newField];
    pushHistory(nextFields);
    showToast('Layer Delineasi Koordinat PKKPR (Kuning) berhasil ditambahkan.');
  }, [fields, activeFieldId, pushHistory, showToast]);

  // Update existing field without recording to undo history (e.g. while live dragging)
  const handleUpdateField = useCallback((updated: PolygonField) => {
    setFields((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  }, []);

  // Commit field update and push to Undo/Redo history stack (when drag ends, patok is nudged, or point is added/removed)
  const handleCommitField = useCallback((updated: PolygonField) => {
    setFields((prev) => {
      const next = prev.map((f) => (f.id === updated.id ? updated : f));
      setHistory((hPrev) => {
        const nextH = hPrev.slice(0, historyIndex + 1);
        return [...nextH, next];
      });
      setHistoryIndex((hPrev) => hPrev + 1);
      return next;
    });
  }, [historyIndex]);

  // Delete a field
  const handleDeleteField = (id: string) => {
    const filtered = fields.filter((f) => f.id !== id);
    if (activeFieldId === id) {
      setActiveFieldId(filtered[0]?.id || null);
    }
    pushHistory(filtered);
  };

  // Reset all
  const handleResetAll = () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua bidang yang digambar?')) {
      const resetField = updatePolygonMetrics({
        id: `field-${Date.now()}`,
        name: 'Bidang Tanah 1',
        color: '#06b6d4',
        strokeColor: '#06b6d4',
        fillColor: '#0891b2',
        strokeWidth: 3,
        opacity: 0.35,
        coordinates: [],
        visible: true,
        isCompleted: false,
        createdAt: Date.now(),
      });
      pushHistory([resetField]);
      setActiveFieldId(resetField.id);
      setIsDrawing(false);
      setDrawingCoords([]);
    }
  };

  // Import fields callback
  const handleImportFields = (imported: PolygonField[]) => {
    const nextFields = [...fields, ...imported];
    pushHistory(nextFields);
    if (imported.length > 0) {
      setActiveFieldId(imported[0].id);
      const firstCoord = imported[0].coordinates[0];
      if (firstCoord) {
        setMapCenterTrigger({ lat: firstCoord.lat, lng: firstCoord.lng, zoom: 16 });
      }
    }
  };

  // Open Style Modal
  const handleOpenStyleModal = (fieldId?: string) => {
    setStylingFieldId(fieldId || activeFieldId);
    setIsStyleModalOpen(true);
  };

  // Open Rename Modal
  const handleOpenRenameModal = (fieldId?: string) => {
    setRenamingFieldId(fieldId || activeFieldId);
    setIsRenameOpen(true);
  };

  // Start Drawing
  const handleStartDrawing = () => {
    setIsRulerActive(false);
    setIsDrawing(true);
    setDrawingCoords([]);
  };

  // Add coordinate to drawing path
  const handleAddDrawingCoord = (coord: Coordinate) => {
    setDrawingCoords((prev) => [...prev, coord]);
  };

  // Finish Drawing
  const handleFinishDrawing = () => {
    if (drawingCoords.length < 3) return;

    if (activeField && !activeField.isCompleted) {
      const updated = updatePolygonMetrics({
        ...activeField,
        coordinates: drawingCoords,
        isCompleted: true,
      });
      const nextFields = fields.map((f) => (f.id === updated.id ? updated : f));
      pushHistory(nextFields);
    } else {
      const newId = `field-${Date.now()}`;
      const colorPairs = [
        { stroke: '#06b6d4', fill: '#0891b2' },
        { stroke: '#10b981', fill: '#059669' },
        { stroke: '#f59e0b', fill: '#d97706' },
        { stroke: '#ec4899', fill: '#db2777' },
        { stroke: '#8b5cf6', fill: '#7c3aed' },
        { stroke: '#3b82f6', fill: '#2563eb' },
      ];
      const chosen = colorPairs[fields.length % colorPairs.length];

      const newField = updatePolygonMetrics({
        id: newId,
        name: `Bidang Tanah ${fields.length + 1}`,
        color: chosen.stroke,
        strokeColor: chosen.stroke,
        fillColor: chosen.fill,
        strokeWidth: 3,
        opacity: 0.35,
        coordinates: drawingCoords,
        visible: true,
        isCompleted: true,
        createdAt: Date.now(),
      });

      const nextFields = [...fields, newField];
      pushHistory(nextFields);
      setActiveFieldId(newId);
    }

    setIsDrawing(false);
    setDrawingCoords([]);
  };

  // Cancel Drawing
  const handleCancelDrawing = () => {
    setIsDrawing(false);
    setDrawingCoords([]);
  };

  // Undo last point in drawing
  const handleUndoDrawingPoint = () => {
    setDrawingCoords((prev) => prev.slice(0, prev.length - 1));
  };

  // Manual / Quick Save project handler
  const handleQuickSave = useCallback(() => {
    const saved = saveProjectToList({
      id: projectId,
      name: projectName,
      description: projectDescription,
      fields,
      activeFieldId,
      basemap,
      rulerCoords,
    });
    setProjectId(saved.id);
    const ts = autoSaveWorkspace({
      projectName: saved.name,
      projectId: saved.id,
      description: saved.description,
      fields,
      activeFieldId,
      basemap,
      rulerCoords,
    });
    setLastSavedAt(ts);
    showToast(`Proyek "${saved.name}" berhasil disimpan! Data aman di perangkat Anda.`);
  }, [projectId, projectName, projectDescription, fields, activeFieldId, basemap, rulerCoords, showToast]);

  // Save current project from modal
  const handleSaveCurrentProject = useCallback(
    (name: string, description: string) => {
      const saved = saveProjectToList({
        id: projectId,
        name,
        description,
        fields,
        activeFieldId,
        basemap,
        rulerCoords,
      });
      setProjectName(saved.name);
      setProjectId(saved.id);
      setProjectDescription(saved.description || '');
      const ts = autoSaveWorkspace({
        projectName: saved.name,
        projectId: saved.id,
        description: saved.description,
        fields,
        activeFieldId,
        basemap,
        rulerCoords,
      });
      setLastSavedAt(ts);
    },
    [projectId, fields, activeFieldId, basemap, rulerCoords]
  );

  // Load project from saved list or file
  const handleLoadProject = useCallback(
    (loaded: {
      projectName: string;
      projectId?: string;
      description?: string;
      fields: PolygonField[];
      activeFieldId?: string | null;
      basemap?: BasemapType;
    }) => {
      setProjectName(loaded.projectName);
      setProjectId(loaded.projectId);
      setProjectDescription(loaded.description || '');
      setFields(loaded.fields);
      setActiveFieldId(loaded.activeFieldId || loaded.fields[0]?.id || null);
      if (loaded.basemap) setBasemap(loaded.basemap);

      setHistory([loaded.fields]);
      setHistoryIndex(0);

      const ts = autoSaveWorkspace({
        projectName: loaded.projectName,
        projectId: loaded.projectId,
        description: loaded.description,
        fields: loaded.fields,
        activeFieldId: loaded.activeFieldId || loaded.fields[0]?.id || null,
        basemap: loaded.basemap,
      });
      setLastSavedAt(ts);

      if (loaded.fields.length > 0 && loaded.fields[0].coordinates.length > 0) {
        const firstCoord = loaded.fields[0].coordinates[0];
        setMapCenterTrigger({ lat: firstCoord.lat, lng: firstCoord.lng, zoom: 16 });
      }
    },
    []
  );

  // New Blank Project
  const handleNewBlankProject = useCallback(() => {
    const blankId = `field-${Date.now()}`;
    const initialBlank = updatePolygonMetrics({
      id: blankId,
      name: 'Bidang Tanah 1',
      color: '#06b6d4',
      strokeColor: '#06b6d4',
      fillColor: '#0891b2',
      strokeWidth: 3,
      opacity: 0.35,
      coordinates: [],
      visible: true,
      isCompleted: false,
      createdAt: Date.now(),
    });

    const newName = `Proyek Pengukuran YSR ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`;
    setProjectName(newName);
    setProjectId(undefined);
    setProjectDescription('');
    setFields([initialBlank]);
    setActiveFieldId(initialBlank.id);
    setIsDrawing(false);
    setDrawingCoords([]);
    setIsRulerActive(false);
    setRulerCoords([]);
    setHistory([[initialBlank]]);
    setHistoryIndex(0);

    const ts = autoSaveWorkspace({
      projectName: newName,
      fields: [initialBlank],
      activeFieldId: initialBlank.id,
      basemap,
    });
    setLastSavedAt(ts);
    showToast('Proyek baru kosong telah dimulai.');
  }, [basemap, showToast]);

  // Load Sample Project
  const handleLoadSampleProject = useCallback(() => {
    const samples = getSampleFields();
    const sampleName = 'Contoh Lahan Kebun Kelapa Sawit (Blok A & B)';
    setProjectName(sampleName);
    setProjectId(undefined);
    setProjectDescription('Data sampel demo lahan kelapa sawit dengan 2 blok bidang tanah dan patok batas.');
    setFields(samples);
    setActiveFieldId(samples[0].id);
    setIsDrawing(false);
    setDrawingCoords([]);
    setIsRulerActive(false);
    setRulerCoords([]);
    setHistory([samples]);
    setHistoryIndex(0);

    const ts = autoSaveWorkspace({
      projectName: sampleName,
      fields: samples,
      activeFieldId: samples[0].id,
      basemap,
    });
    setLastSavedAt(ts);

    if (samples[0]?.coordinates[0]) {
      setMapCenterTrigger({
        lat: samples[0].coordinates[0].lat,
        lng: samples[0].coordinates[0].lng,
        zoom: 16,
      });
    }
    showToast('Data contoh lahan berhasil dimuat.');
  }, [basemap, showToast]);

  // Keyboard shortcuts (including Ctrl+Z for undo, Ctrl+Y for redo, Ctrl+S for save)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawing) {
          handleCancelDrawing();
        } else {
          setIsProjectModalOpen(false);
          setIsImportOpen(false);
          setIsHelpOpen(false);
          setIsTableOpen(false);
          setIsReportOpen(false);
          setIsPrintLayoutOpen(false);
          setIsStyleModalOpen(false);
          setIsRenameOpen(false);
        }
      } else if (e.key === 'Enter' && isDrawing && drawingCoords.length >= 3) {
        handleFinishDrawing();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        handleQuickSave();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (isDrawing) {
          handleUndoDrawingPoint();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      } else if (
        (e.key === 'm' || e.key === 'M') &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) &&
        !isProjectModalOpen &&
        !isImportOpen &&
        !isHelpOpen &&
        !isTableOpen &&
        !isReportOpen &&
        !isPrintLayoutOpen &&
        !isStyleModalOpen &&
        !isRenameOpen
      ) {
        setIsSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isDrawing,
    drawingCoords,
    handleUndo,
    handleRedo,
    handleQuickSave,
    isProjectModalOpen,
    isImportOpen,
    isHelpOpen,
    isTableOpen,
    isReportOpen,
    isPrintLayoutOpen,
    isStyleModalOpen,
    isRenameOpen,
  ]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* Left Sidebar (Minimizable Menu Box) */}
      <Sidebar
        fields={fields}
        activeFieldId={activeFieldId}
        onSelectField={setActiveFieldId}
        onAddField={handleAddField}
        onDeleteField={handleDeleteField}
        onUpdateField={handleUpdateField}
        onResetAll={handleResetAll}
        isDrawing={isDrawing}
        onStartDrawing={handleStartDrawing}
        onFinishDrawing={handleFinishDrawing}
        onCancelDrawing={handleCancelDrawing}
        onUndoDrawingPoint={handleUndoDrawingPoint}
        drawingCoordsCount={drawingCoords.length}
        basemap={basemap}
        onChangeBasemap={setBasemap}
        onOpenStyleModal={handleOpenStyleModal}
        onOpenRenameModal={handleOpenRenameModal}
        canUndo={historyIndex > 0}
        onUndo={handleUndo}
        canRedo={historyIndex < history.length - 1}
        onRedo={handleRedo}
        onAddQuickParcel={handleAddQuickParcel}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenHelp={() => setIsHelpOpen(true)}
        onOpenTable={() => setIsTableOpen(true)}
        onOpenReport={() => setIsReportOpen(true)}
        onOpenPrintMap={() => setIsPrintLayoutOpen(true)}
        onLocateMap={setMapCenterTrigger}
        isRulerActive={isRulerActive}
        rulerCoordsCount={rulerCoords.length}
        rulerTotalDistance={rulerMetrics.totalDistanceMeters}
        onToggleRuler={handleToggleRuler}
        onClearRuler={handleClearRuler}
        onConvertRulerToField={handleConvertRulerToField}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        projectName={projectName}
        lastSavedAt={lastSavedAt}
        onOpenProjectModal={() => setIsProjectModalOpen(true)}
        onQuickSave={handleQuickSave}
        onOpenDesktopApp={() => setIsDesktopModalOpen(true)}
      />

      {/* Main Map Canvas Area */}
      <main className="flex-1 h-full relative">
        <MapViewer
          fields={fields}
          activeFieldId={activeFieldId}
          onSelectField={setActiveFieldId}
          onUpdateField={handleUpdateField}
          onCommitField={handleCommitField}
          isDrawing={isDrawing}
          drawingCoords={drawingCoords}
          onAddDrawingCoord={handleAddDrawingCoord}
          onFinishDrawing={handleFinishDrawing}
          basemap={basemap}
          showLengths={showLengths}
          showAngles={showAngles}
          showGrid={showGrid}
          showFieldLabels={showFieldLabels}
          clickOnlyMeasure={clickOnlyMeasure}
          onToggleShowLengths={() => setShowLengths(!showLengths)}
          onToggleShowAngles={() => setShowAngles(!showAngles)}
          onToggleShowGrid={() => setShowGrid(!showGrid)}
          onToggleShowFieldLabels={() => setShowFieldLabels(!showFieldLabels)}
          onToggleClickOnlyMeasure={() => setClickOnlyMeasure(!clickOnlyMeasure)}
          onOpenStyleModal={() => handleOpenStyleModal(activeFieldId || undefined)}
          onOpenRenameModal={handleOpenRenameModal}
          onDeleteField={handleDeleteField}
          mapCenterTrigger={mapCenterTrigger}
          isRulerActive={isRulerActive}
          rulerCoords={rulerCoords}
          onToggleRuler={handleToggleRuler}
          onAddRulerCoord={handleAddRulerCoord}
          onClearRuler={handleClearRuler}
          onUndoRulerPoint={handleUndoRulerPoint}
          onConvertRulerToField={handleConvertRulerToField}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onStartDrawing={handleStartDrawing}
          projectName={projectName}
          lastSavedAt={lastSavedAt}
          onOpenProjectModal={() => setIsProjectModalOpen(true)}
          onQuickSave={handleQuickSave}
          onOpenPrintMap={() => setIsPrintLayoutOpen(true)}
        />
      </main>

      {/* Top Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-emerald-500/80 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-fade-in">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        fields={fields}
        activeFieldId={activeFieldId}
        basemap={basemap}
        projectName={projectName}
        projectId={projectId}
        projectDescription={projectDescription}
        lastSavedAt={lastSavedAt}
        onSaveCurrentProject={handleSaveCurrentProject}
        onLoadProject={handleLoadProject}
        onNewBlankProject={handleNewBlankProject}
        onLoadSampleProject={handleLoadSampleProject}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImportFields={handleImportFields}
      />

      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />

      <CoordinateTableModal
        isOpen={isTableOpen}
        onClose={() => setIsTableOpen(false)}
        field={activeField || fields[0] || null}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        field={activeField || fields[0] || null}
        onOpenPrintMap={() => setIsPrintLayoutOpen(true)}
      />

      <PrintMapLayoutModal
        isOpen={isPrintLayoutOpen}
        onClose={() => setIsPrintLayoutOpen(false)}
        fields={fields}
        activeFieldId={activeFieldId}
        basemap={basemap}
        projectName={projectName}
        onSelectField={setActiveFieldId}
        onAddOverlapField={handleAddOverlapField}
      />

      <StyleModal
        isOpen={isStyleModalOpen}
        onClose={() => setIsStyleModalOpen(false)}
        field={fieldToStyle || fields[0] || null}
        onUpdateField={handleUpdateField}
      />

      <RenameModal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        field={fieldToRename || fields[0] || null}
        onUpdateField={handleUpdateField}
      />

      <DesktopAppModal
        isOpen={isDesktopModalOpen}
        onClose={() => setIsDesktopModalOpen(false)}
      />
    </div>
  );
}
