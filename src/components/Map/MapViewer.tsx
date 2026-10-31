import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { PolygonField, Coordinate, BasemapType } from '../../types/gis';
import {
  formatDistance,
  updatePolygonMetrics,
  calculateDistanceMeters,
  calculateRulerMetrics,
  getCompassDirection,
} from '../../utils/geoCalculations';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Compass,
  Eye,
  EyeOff,
  Maximize2,
  AlertTriangle,
  ShieldCheck,
  Edit3,
  Trash2,
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  X,
  Target,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Navigation,
  PlusCircle,
  Ruler,
  Check,
  Copy,
  RotateCcw,
  Sparkles,
  Minus,
  PanelLeftOpen,
  PenTool,
  ChevronUp,
  ChevronDown,
  Save,
  FolderOpen,
  Printer,
} from 'lucide-react';

interface MapViewerProps {
  fields: PolygonField[];
  activeFieldId: string | null;
  onSelectField: (id: string) => void;
  onUpdateField: (updated: PolygonField) => void;
  onCommitField?: (updated: PolygonField) => void;
  isDrawing: boolean;
  drawingCoords: Coordinate[];
  onAddDrawingCoord: (coord: Coordinate) => void;
  onFinishDrawing: () => void;
  basemap: BasemapType;
  showLengths: boolean;
  showAngles: boolean;
  showGrid: boolean;
  showFieldLabels: boolean;
  clickOnlyMeasure: boolean;
  onToggleShowLengths: () => void;
  onToggleShowAngles: () => void;
  onToggleShowGrid: () => void;
  onToggleShowFieldLabels: () => void;
  onToggleClickOnlyMeasure: () => void;
  onOpenStyleModal: () => void;
  onOpenRenameModal: (fieldId?: string) => void;
  onDeleteField: (id: string) => void;
  mapCenterTrigger: { lat: number; lng: number; zoom?: number } | null;
  // Ruler feature props
  isRulerActive: boolean;
  rulerCoords: Coordinate[];
  onToggleRuler: () => void;
  onAddRulerCoord: (coord: Coordinate) => void;
  onClearRuler: () => void;
  onUndoRulerPoint: () => void;
  onConvertRulerToField: () => void;
  // Workspace clear & sidebar minimize props
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onStartDrawing?: () => void;
  // Project & Persistence props
  projectName?: string;
  lastSavedAt?: number | null;
  onOpenProjectModal?: () => void;
  onQuickSave?: () => void;
  onOpenPrintMap?: () => void;
}

export const MapViewer: React.FC<MapViewerProps> = ({
  fields,
  activeFieldId,
  onSelectField,
  onUpdateField,
  onCommitField,
  isDrawing,
  drawingCoords,
  onAddDrawingCoord,
  onFinishDrawing,
  basemap,
  showLengths,
  showAngles,
  showGrid,
  showFieldLabels,
  clickOnlyMeasure,
  onToggleShowLengths,
  onToggleShowAngles,
  onToggleShowGrid,
  onToggleShowFieldLabels,
  onToggleClickOnlyMeasure,
  onOpenStyleModal,
  onOpenRenameModal,
  onDeleteField,
  mapCenterTrigger,
  isRulerActive,
  rulerCoords,
  onToggleRuler,
  onAddRulerCoord,
  onClearRuler,
  onUndoRulerPoint,
  onConvertRulerToField,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onStartDrawing,
  projectName = 'Proyek Pengukuran YSR',
  lastSavedAt,
  onOpenProjectModal,
  onQuickSave,
  onOpenPrintMap,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const placesTileLayerRef = useRef<L.TileLayer | null>(null);
  const polygonsGroupRef = useRef<L.FeatureGroup | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);
  const drawingGroupRef = useRef<L.LayerGroup | null>(null);
  const gridGroupRef = useRef<L.LayerGroup | null>(null);
  const rulerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mouseCoord, setMouseCoord] = useState<Coordinate | null>(null);
  const [liveDistance, setLiveDistance] = useState<number | null>(null);

  // Workspace controls: Clean Mode & Layer Popover & Field Card Dismiss
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [isLayerMenuOpen, setIsLayerMenuOpen] = useState<boolean>(false);
  const [isFieldCardDismissed, setIsFieldCardDismissed] = useState<boolean>(false);

  // Minimizable box states for clear workspace
  const [isFieldCardMinimized, setIsFieldCardMinimized] = useState<boolean>(false);
  const [isWarningMinimized, setIsWarningMinimized] = useState<boolean>(false);
  const [isRulerHudMinimized, setIsRulerHudMinimized] = useState<boolean>(false);
  const [isPatokCardMinimized, setIsPatokCardMinimized] = useState<boolean>(false);

  // Ruler snapping and feedback state
  const [snapCoord, setSnapCoord] = useState<Coordinate | null>(null);
  const [rulerCopied, setRulerCopied] = useState<boolean>(false);

  // Selected Patok for fine-tuning / arrow key nudging
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(null);
  const [nudgeStepMeters, setNudgeStepMeters] = useState<number>(1.0);

  // Mouse editing modes: add patok on click & click-to-move patok
  const [isAddVertexMode, setIsAddVertexMode] = useState<boolean>(false);
  const [isMovePatokMode, setIsMovePatokMode] = useState<boolean>(false);

  // Dragging lifecycle ref to prevent React re-renders while dragging
  const isDraggingRef = useRef<boolean>(false);
  const workingCoordsRef = useRef<Coordinate[]>([]);

  const activeField = fields.find((f) => f.id === activeFieldId) || null;

  // Reset field card dismissal state when active field changes
  useEffect(() => {
    setIsFieldCardDismissed(false);
  }, [activeFieldId]);

  // Handle map canvas resize when sidebar is minimized/expanded
  useEffect(() => {
    if (mapInstanceRef.current) {
      const timer = setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 310);
      return () => clearTimeout(timer);
    }
  }, [isSidebarCollapsed]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [0.526, 101.448], // Plantation default center
      zoom: 15,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.1, // Ultra-smooth fractional zoom
      zoomDelta: 0.35, // Smooth step
      wheelPxPerZoomLevel: 150, // Buttery smooth mouse wheel
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      maxZoom: 22,
    });

    // Custom attribution control in bottom right
    L.control
      .attribution({
        position: 'bottomright',
        prefix: '<span class="text-xs font-bold text-slate-400">YSR PETA PRO</span>',
      })
      .addTo(map);

    polygonsGroupRef.current = L.featureGroup().addTo(map);
    markersGroupRef.current = L.layerGroup().addTo(map);
    drawingGroupRef.current = L.layerGroup().addTo(map);
    gridGroupRef.current = L.layerGroup().addTo(map);
    rulerGroupRef.current = L.layerGroup().addTo(map);

    // Right-Click Drag Panning Handler (Allows dragging with both left & right mouse buttons)
    let isRightDragging = false;
    let lastMousePos = { x: 0, y: 0 };

    const handleRightMouseDown = (e: MouseEvent) => {
      if (e.button === 2) {
        isRightDragging = true;
        lastMousePos = { x: e.clientX, y: e.clientY };
        map.getContainer().classList.add('panning-active');
        e.preventDefault();
      }
    };

    const handleRightMouseMove = (e: MouseEvent) => {
      if (isRightDragging) {
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        lastMousePos = { x: e.clientX, y: e.clientY };
        map.panBy([-dx, -dy], { animate: false });
      }
    };

    const handleRightMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || isRightDragging) {
        isRightDragging = false;
        map.getContainer().classList.remove('panning-active');
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      // Prevent context menu when panning with right mouse button
      e.preventDefault();
    };

    const container = map.getContainer();
    container.addEventListener('mousedown', handleRightMouseDown);
    window.addEventListener('mousemove', handleRightMouseMove);
    window.addEventListener('mouseup', handleRightMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);

    mapInstanceRef.current = map;

    return () => {
      container.removeEventListener('mousedown', handleRightMouseDown);
      window.removeEventListener('mousemove', handleRightMouseMove);
      window.removeEventListener('mouseup', handleRightMouseUp);
      container.removeEventListener('contextmenu', handleContextMenu);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Basemap Tiles with Crisp High-Resolution Overzooming up to Zoom 22
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
      baseTileLayerRef.current = null;
    }
    if (placesTileLayerRef.current) {
      map.removeLayer(placesTileLayerRef.current);
      placesTileLayerRef.current = null;
    }

    let tileUrl = '';
    let maxNativeZoom = 18;
    let hasPlacesOverlay = false;
    let subdomains: string[] | string = ['a', 'b', 'c'];

    switch (basemap) {
      case 'satellite':
        tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
        hasPlacesOverlay = true;
        maxNativeZoom = 18;
        subdomains = [];
        break;
      case 'google_hybrid':
        tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        maxNativeZoom = 19;
        subdomains = [];
        break;
      case 'osm':
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        maxNativeZoom = 19;
        break;
      case 'topo':
        tileUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
        maxNativeZoom = 17;
        break;
      case 'dark':
        tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
        maxNativeZoom = 19;
        break;
    }

    baseTileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 22,
      maxNativeZoom,
      subdomains,
    }).addTo(map);

    if (hasPlacesOverlay) {
      placesTileLayerRef.current = L.tileLayer(
        'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        { maxZoom: 22, maxNativeZoom: 18 }
      ).addTo(map);
    }
  }, [basemap]);

  // Handle Map Centering from external triggers (search, zoom to field, GPS)
  useEffect(() => {
    if (!mapCenterTrigger || !mapInstanceRef.current) return;
    mapInstanceRef.current.setView(
      [mapCenterTrigger.lat, mapCenterTrigger.lng],
      mapCenterTrigger.zoom || 16,
      { animate: true }
    );
  }, [mapCenterTrigger]);

  // Handle Coordinate Grid Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const gridGroup = gridGroupRef.current;
    if (!map || !gridGroup) return;

    gridGroup.clearLayers();
    if (!showGrid) return;

    const drawGrid = () => {
      gridGroup.clearLayers();
      const bounds = map.getBounds();
      const zoom = map.getZoom();

      // Step in degrees according to zoom level
      let step = 0.05;
      if (zoom >= 17) step = 0.001;
      else if (zoom >= 15) step = 0.0025;
      else if (zoom >= 13) step = 0.01;
      else if (zoom >= 10) step = 0.05;

      const south = Math.floor(bounds.getSouth() / step) * step;
      const north = Math.ceil(bounds.getNorth() / step) * step;
      const west = Math.floor(bounds.getWest() / step) * step;
      const east = Math.ceil(bounds.getEast() / step) * step;

      // Latitude lines (parallels)
      for (let lat = south; lat <= north; lat += step) {
        L.polyline(
          [
            [lat, bounds.getWest() - 1],
            [lat, bounds.getEast() + 1],
          ],
          { color: 'rgba(255,255,255,0.18)', weight: 1, dashArray: '3, 4' }
        ).addTo(gridGroup);
      }

      // Longitude lines (meridians)
      for (let lng = west; lng <= east; lng += step) {
        L.polyline(
          [
            [bounds.getSouth() - 1, lng],
            [bounds.getNorth() + 1, lng],
          ],
          { color: 'rgba(255,255,255,0.18)', weight: 1, dashArray: '3, 4' }
        ).addTo(gridGroup);
      }
    };

    drawGrid();
    map.on('moveend', drawGrid);
    return () => {
      map.off('moveend', drawGrid);
    };
  }, [showGrid]);

  // Handle Drawing Mode Events
  useEffect(() => {
    const map = mapInstanceRef.current;
    const drawingGroup = drawingGroupRef.current;
    if (!map || !drawingGroup) return;

    drawingGroup.clearLayers();

    if (!isDrawing) {
      map.getContainer().style.cursor = '';
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    // Render placed drawing points
    const latLngs: L.LatLngTuple[] = drawingCoords.map((c) => [c.lat, c.lng]);

    if (latLngs.length > 0) {
      // Connect existing points with line
      L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 3,
        dashArray: '4, 4',
      }).addTo(drawingGroup);

      // Render red points for each vertex
      drawingCoords.forEach((coord, index) => {
        const marker = L.circleMarker([coord.lat, coord.lng], {
          radius: index === 0 ? 8 : 6,
          fillColor: index === 0 ? '#10b981' : '#ef4444',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        }).addTo(drawingGroup);

        if (index === 0 && drawingCoords.length >= 3) {
          marker.bindTooltip('Klik di sini untuk menutup polygon', {
            permanent: true,
            direction: 'top',
            className: 'bg-emerald-800 text-white text-xs px-2 py-0.5 rounded shadow border-none',
          });
        }
      });

      // Side length labels for placed segments
      if (drawingCoords.length >= 2) {
        for (let i = 0; i < drawingCoords.length - 1; i++) {
          const p1 = drawingCoords[i];
          const p2 = drawingCoords[i + 1];
          const dist = calculateDistanceMeters(p1, p2);
          const midLat = (p1.lat + p2.lat) / 2;
          const midLng = (p1.lng + p2.lng) / 2;

          const labelIcon = L.divIcon({
            className: 'distance-label',
            html: `<div class="distance-badge">${formatDistance(dist)}</div>`,
            iconSize: [0, 0],
          });
          L.marker([midLat, midLng], { icon: labelIcon, interactive: false }).addTo(drawingGroup);
        }
      }

      // Live rubberband line to cursor
      if (mouseCoord) {
        const lastCoord = drawingCoords[drawingCoords.length - 1];
        const rubberband = L.polyline(
          [
            [lastCoord.lat, lastCoord.lng],
            [mouseCoord.lat, mouseCoord.lng],
          ],
          {
            color: '#facc15',
            weight: 2,
            dashArray: '2, 3',
          }
        ).addTo(drawingGroup);

        // Live segment distance badge
        const currentDist = calculateDistanceMeters(lastCoord, mouseCoord);
        const midLat = (lastCoord.lat + mouseCoord.lat) / 2;
        const midLng = (lastCoord.lng + mouseCoord.lng) / 2;

        const liveIcon = L.divIcon({
          className: 'distance-label',
          html: `<div class="distance-badge text-amber-300 font-bold">${formatDistance(currentDist)}</div>`,
          iconSize: [0, 0],
        });
        L.marker([midLat, midLng], { icon: liveIcon, interactive: false }).addTo(drawingGroup);
      }
    }

    const handleClick = (e: L.LeafletMouseEvent) => {
      // Check if clicking near start point to finish polygon
      if (drawingCoords.length >= 3) {
        const start = drawingCoords[0];
        const distToStart = calculateDistanceMeters(start, { lat: e.latlng.lat, lng: e.latlng.lng });
        if (distToStart < 15) {
          onFinishDrawing();
          return;
        }
      }
      onAddDrawingCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
    };

    const handleMouseMove = (e: L.LeafletMouseEvent) => {
      setMouseCoord({ lat: e.latlng.lat, lng: e.latlng.lng });
      if (drawingCoords.length > 0) {
        const last = drawingCoords[drawingCoords.length - 1];
        const dist = calculateDistanceMeters(last, { lat: e.latlng.lat, lng: e.latlng.lng });
        setLiveDistance(dist);
      }
    };

    const handleDblClick = (e: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(e);
      if (drawingCoords.length >= 3) {
        onFinishDrawing();
      }
    };

    map.on('click', handleClick);
    map.on('mousemove', handleMouseMove);
    map.on('dblclick', handleDblClick);

    return () => {
      map.off('click', handleClick);
      map.off('mousemove', handleMouseMove);
      map.off('dblclick', handleDblClick);
    };
  }, [isDrawing, drawingCoords, mouseCoord, onAddDrawingCoord, onFinishDrawing]);

  // Click on map: handles click-to-move patok, click-to-add patok, or deselect
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handleMapClick = (e: L.LeafletMouseEvent) => {
      // 1. If in "Move Patok with Mouse" mode: clicking any spot places the patok right there!
      if (
        isMovePatokMode &&
        activeField &&
        selectedVertexIndex !== null &&
        activeField.coordinates[selectedVertexIndex]
      ) {
        const newCoords = [...activeField.coordinates];
        newCoords[selectedVertexIndex] = { lat: e.latlng.lat, lng: e.latlng.lng };
        const updated = updatePolygonMetrics({ ...activeField, coordinates: newCoords });
        if (onCommitField) {
          onCommitField(updated);
        } else {
          onUpdateField(updated);
        }
        setIsMovePatokMode(false);
        return;
      }

      // 2. If in "Add Patok" mode: clicking anywhere adds a patok to the nearest segment
      if (isAddVertexMode && activeField && activeField.coordinates.length >= 3) {
        let bestIndex = 0;
        let minDistance = Infinity;
        for (let i = 0; i < activeField.coordinates.length; i++) {
          const p1 = activeField.coordinates[i];
          const p2 = activeField.coordinates[(i + 1) % activeField.coordinates.length];
          const mid = { lat: (p1.lat + p2.lat) / 2, lng: (p1.lng + p2.lng) / 2 };
          const dist = calculateDistanceMeters(mid, { lat: e.latlng.lat, lng: e.latlng.lng });
          if (dist < minDistance) {
            minDistance = dist;
            bestIndex = i;
          }
        }
        const newCoords = [...activeField.coordinates];
        newCoords.splice(bestIndex + 1, 0, { lat: e.latlng.lat, lng: e.latlng.lng });
        const updated = updatePolygonMetrics({ ...activeField, coordinates: newCoords });
        setSelectedVertexIndex(bestIndex + 1);
        if (onCommitField) {
          onCommitField(updated);
        } else {
          onUpdateField(updated);
        }
        return;
      }

      // 3. Normal empty canvas click: deselect field if clickOnlyMeasure is true
      if (!isDrawing && !isRulerActive && clickOnlyMeasure) {
        onSelectField('');
        setIsFieldCardDismissed(false);
      }
      setSelectedVertexIndex(null);
    };

    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [
    isDrawing,
    isRulerActive,
    clickOnlyMeasure,
    onSelectField,
    isMovePatokMode,
    isAddVertexMode,
    activeField,
    selectedVertexIndex,
    onCommitField,
    onUpdateField,
  ]);

  // Handle Ruler Mode (Penggaris / Pita Ukur Lahan) Interactions
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!isRulerActive) {
      setSnapCoord(null);
      return;
    }

    map.getContainer().style.cursor = 'crosshair';

    // Magnetic snap helper to find nearest polygon patok or ruler vertex
    const checkSnap = (lat: number, lng: number): Coordinate | null => {
      let nearest: Coordinate | null = null;
      let minDistance = 18; // Snap within 18 meters

      // Check all field vertices
      fields.forEach((field) => {
        field.coordinates.forEach((coord) => {
          const d = calculateDistanceMeters({ lat, lng }, coord);
          if (d < minDistance) {
            minDistance = d;
            nearest = coord;
          }
        });
      });

      // Check existing ruler points
      rulerCoords.forEach((coord) => {
        const d = calculateDistanceMeters({ lat, lng }, coord);
        if (d < minDistance) {
          minDistance = d;
          nearest = coord;
        }
      });

      return nearest;
    };

    const handleRulerClick = (e: L.LeafletMouseEvent) => {
      const snap = checkSnap(e.latlng.lat, e.latlng.lng);
      const target = snap || { lat: e.latlng.lat, lng: e.latlng.lng };
      onAddRulerCoord(target);
    };

    const handleRulerMouseMove = (e: L.LeafletMouseEvent) => {
      const snap = checkSnap(e.latlng.lat, e.latlng.lng);
      setSnapCoord(snap);
      setMouseCoord(snap || { lat: e.latlng.lat, lng: e.latlng.lng });
    };

    map.on('click', handleRulerClick);
    map.on('mousemove', handleRulerMouseMove);

    return () => {
      map.off('click', handleRulerClick);
      map.off('mousemove', handleRulerMouseMove);
    };
  }, [isRulerActive, rulerCoords, fields, onAddRulerCoord]);

  // Render Ruler Path, Waypoints, Segment Badges, and Live Rubberband
  useEffect(() => {
    const map = mapInstanceRef.current;
    const rulerGroup = rulerGroupRef.current;
    if (!map || !rulerGroup) return;

    rulerGroup.clearLayers();

    if (rulerCoords.length === 0) return;

    const rulerMetrics = calculateRulerMetrics(rulerCoords);
    const latLngs: L.LatLngTuple[] = rulerCoords.map((c) => [c.lat, c.lng]);

    // 1. Dark casing polyline for high contrast over any satellite basemap
    L.polyline(latLngs, {
      color: '#000000',
      weight: 6,
      opacity: 0.55,
    }).addTo(rulerGroup);

    // 2. Main surveyor dashed measuring line
    L.polyline(latLngs, {
      color: '#f59e0b',
      weight: 3.5,
      dashArray: '6, 6',
      opacity: 0.95,
    }).addTo(rulerGroup);

    // 3. Waypoint Pins (R1, R2, R3...)
    rulerCoords.forEach((coord, idx) => {
      const cumDist = idx === 0 ? 0 : rulerMetrics.segments[idx - 1]?.cumulativeDistanceMeters || 0;
      const pinIcon = L.divIcon({
        className: 'ruler-pin-wrapper',
        html: `
          <div class="ruler-pin-target">
            <div class="ruler-pin-circle">
              <span>R${idx + 1}</span>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const pinMarker = L.marker([coord.lat, coord.lng], {
        icon: pinIcon,
        zIndexOffset: 3500 + idx,
      }).addTo(rulerGroup);

      pinMarker.bindTooltip(
        `<b>Titik Ukur R${idx + 1}</b><br><span style="color:#fbbf24">Jarak Kumulatif: ${formatDistance(cumDist)}</span>`,
        {
          direction: 'top',
          className: 'bg-slate-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-amber-500/50 leading-tight',
        }
      );
    });

    // 4. Segment Distance Badges at midpoints
    rulerMetrics.segments.forEach((seg) => {
      const dir = getCompassDirection(seg.bearingDeg);
      const badgeIcon = L.divIcon({
        className: 'distance-label',
        html: `
          <div class="ruler-segment-badge">
            <span>${formatDistance(seg.lengthMeters)}</span>
            <span class="ruler-bearing-text">(${seg.bearingDeg.toFixed(0)}° ${dir.split(' ')[0]})</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      L.marker([seg.midpoint.lat, seg.midpoint.lng], {
        icon: badgeIcon,
        interactive: false,
      }).addTo(rulerGroup);
    });

    // 5. Live rubberband line to cursor
    if (isRulerActive && mouseCoord && rulerCoords.length > 0) {
      const last = rulerCoords[rulerCoords.length - 1];
      const target = snapCoord || mouseCoord;

      L.polyline(
        [
          [last.lat, last.lng],
          [target.lat, target.lng],
        ],
        {
          color: '#fbbf24',
          weight: 2.5,
          dashArray: '3, 4',
          opacity: 0.85,
        }
      ).addTo(rulerGroup);

      const liveDist = calculateDistanceMeters(last, target);
      const totalLive = rulerMetrics.totalDistanceMeters + liveDist;
      const midLat = (last.lat + target.lat) / 2;
      const midLng = (last.lng + target.lng) / 2;

      const liveBadgeIcon = L.divIcon({
        className: 'distance-label',
        html: `
          <div class="ruler-segment-badge text-amber-300 font-bold" style="border-color: #fbbf24;">
            <span>+${formatDistance(liveDist)}</span>
            <span class="text-[9px] text-amber-200/80">(Total: ${formatDistance(totalLive)})</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      L.marker([midLat, midLng], {
        icon: liveBadgeIcon,
        interactive: false,
      }).addTo(rulerGroup);
    }

    // 6. Snap indicator ring if near an existing vertex
    if (isRulerActive && snapCoord) {
      const snapIcon = L.divIcon({
        className: 'distance-label',
        html: `<div class="ruler-snap-indicator"></div>`,
        iconSize: [0, 0],
      });
      L.marker([snapCoord.lat, snapCoord.lng], {
        icon: snapIcon,
        interactive: false,
      }).addTo(rulerGroup);
    }
  }, [rulerCoords, isRulerActive, mouseCoord, snapCoord]);

  // Render Completed Polygons & Labels & Draggable Vertices
  useEffect(() => {
    const map = mapInstanceRef.current;
    const polygonsGroup = polygonsGroupRef.current;
    const markersGroup = markersGroupRef.current;
    if (!map || !polygonsGroup || !markersGroup) return;

    polygonsGroup.clearLayers();
    markersGroup.clearLayers();

    fields.forEach((field) => {
      if (!field.visible || field.coordinates.length < 3) return;

      const isSelected = field.id === activeFieldId;
      const latLngs: L.LatLngTuple[] = field.coordinates.map((c) => [c.lat, c.lng]);

      // Polygon stroke and fill styling
      const strokeColor = field.strokeColor || field.color || '#06b6d4';
      const fillColor = field.fillColor || field.color || '#0891b2';
      const strokeWidth = isSelected ? Math.max(3.5, (field.strokeWidth || 3) + 1) : (field.strokeWidth || 3);
      const fillOpacity = isSelected ? Math.min(0.65, (field.opacity ?? 0.35) + 0.15) : (field.opacity ?? 0.35);

      // Draw Polygon
      const polygon = L.polygon(latLngs, {
        color: strokeColor,
        weight: strokeWidth,
        opacity: isSelected ? 1 : 0.85,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
      }).addTo(polygonsGroup);

      // Polygon click selection
      polygon.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectField(field.id);
      });

      // Show measurements logic: if clickOnlyMeasure is true, only show if this field is clicked/selected!
      const shouldShowMeasurements = !clickOnlyMeasure || isSelected;

      // Center Field Info Badge showing Nama, Panjang, Lebar, and Luas!
      if (showFieldLabels && shouldShowMeasurements) {
        const centerLat = field.coordinates.reduce((sum, c) => sum + c.lat, 0) / field.coordinates.length;
        const centerLng = field.coordinates.reduce((sum, c) => sum + c.lng, 0) / field.coordinates.length;

        const pLength = (field.dimension?.lengthMeters ?? field.bounds.lengthMeters).toFixed(1);
        const pWidth = (field.dimension?.widthMeters ?? field.bounds.widthMeters).toFixed(1);
        const pAreaHa = (field.areaSquareMeters / 10000).toFixed(4);
        const pAreaM2 = field.areaSquareMeters.toLocaleString('id-ID', { maximumFractionDigits: 1 });

        const fieldCenterIcon = L.divIcon({
          className: 'field-center-label',
          html: `
            <div class="field-info-badge ${isSelected ? 'selected' : ''}" style="border-left-color: ${strokeColor}">
              <div class="field-title">${field.name}</div>
              <div class="field-dimensions">
                <span class="dim-item"><span class="dim-k">P:</span> ${pLength}m</span>
                <span class="dim-sep">•</span>
                <span class="dim-item"><span class="dim-k">L:</span> ${pWidth}m</span>
              </div>
              <div class="field-area">${pAreaHa} ha <span class="dim-sub">(${pAreaM2} m²)</span></div>
            </div>
          `,
          iconSize: [0, 0],
        });

        const centerMarker = L.marker([centerLat, centerLng], {
          icon: fieldCenterIcon,
          interactive: true,
        }).addTo(markersGroup);

        centerMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onSelectField(field.id);
        });
      }

      // Side Length Badges (Centered on each segment line)
      if (showLengths && shouldShowMeasurements) {
        field.segments.forEach((seg) => {
          const badgeIcon = L.divIcon({
            className: 'distance-label',
            html: `<div class="distance-badge">${formatDistance(seg.lengthMeters)}</div>`,
            iconSize: [0, 0],
          });
          L.marker([seg.midpoint.lat, seg.midpoint.lng], {
            icon: badgeIcon,
            interactive: false,
          }).addTo(markersGroup);
        });
      }

      // Interior Angle Badges (Near each vertex corner with yellow text, as seen in screenshot)
      if (showAngles && shouldShowMeasurements) {
        field.angles.forEach((ang) => {
          const badgeClass = ang.isAcute ? 'angle-badge acute' : 'angle-badge';
          const badgeIcon = L.divIcon({
            className: 'angle-label',
            html: `<div class="${badgeClass}">${ang.angleDeg.toFixed(2)}°</div>`,
            iconSize: [0, 0],
          });

          // Offset angle slightly towards inside midpoint
          const nextIdx = (ang.vertexIndex + 1) % field.coordinates.length;
          const nextCoord = field.coordinates[nextIdx];
          const offsetLat = ang.vertex.lat + (nextCoord.lat - ang.vertex.lat) * 0.08;
          const offsetLng = ang.vertex.lng + (nextCoord.lng - ang.vertex.lng) * 0.08;

          L.marker([offsetLat, offsetLng], {
            icon: badgeIcon,
            interactive: false,
          }).addTo(markersGroup);
        });
      }

      // Render Draggable Vertex Markers, Midpoints, Clickable Edge Lines, and Whole-Polygon Move Handle for Selected Polygon
      if (isSelected) {
        const centerLat = field.coordinates.reduce((sum, c) => sum + c.lat, 0) / field.coordinates.length;
        const centerLng = field.coordinates.reduce((sum, c) => sum + c.lng, 0) / field.coordinates.length;

        // Store references to all vertex markers so the whole-polygon move handle can shift them live
        const vertexMarkersList: L.Marker[] = [];

        // 1. Clickable Edge Lines: Click anywhere along any side of the polygon to add a new patok at that exact spot!
        field.segments.forEach((seg, sIndex) => {
          const p1 = field.coordinates[sIndex];
          const p2 = field.coordinates[(sIndex + 1) % field.coordinates.length];
          const edgeLine = L.polyline(
            [
              [p1.lat, p1.lng],
              [p2.lat, p2.lng],
            ],
            {
              color: '#38bdf8',
              weight: 14,
              opacity: 0.001, // Invisible until mouse hover
              className: 'polygon-edge-hit-area',
            }
          ).addTo(markersGroup);

          edgeLine.bindTooltip(
            `<b>+ Tambah Titik Patok</b><br><span style="color:#38bdf8">Klik di sini untuk menambah titik patok</span>`,
            {
              sticky: true,
              direction: 'top',
              className: 'bg-slate-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-cyan-500/50 leading-tight',
            }
          );

          edgeLine.on('mouseover', () => {
            edgeLine.setStyle({ opacity: 0.85, weight: 6, dashArray: '6, 6' });
          });

          edgeLine.on('mouseout', () => {
            edgeLine.setStyle({ opacity: 0.001, weight: 14, dashArray: '' });
          });

          edgeLine.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            const clickLat = e.latlng.lat;
            const clickLng = e.latlng.lng;
            const newCoords = [...field.coordinates];
            newCoords.splice(sIndex + 1, 0, { lat: clickLat, lng: clickLng });
            const updated = updatePolygonMetrics({ ...field, coordinates: newCoords });
            setSelectedVertexIndex(sIndex + 1);
            if (onCommitField) {
              onCommitField(updated);
            } else {
              onUpdateField(updated);
            }
          });
        });

        // 2. Draggable Patok Markers (P1, P2, P3...)
        field.coordinates.forEach((coord, vIndex) => {
          const isSelectedVertex = vIndex === selectedVertexIndex;
          const markerWrapper = L.divIcon({
            className: 'patok-marker-wrapper',
            html: `
              <div class="patok-pin-target ${isSelectedVertex ? 'is-selected' : ''}">
                <div class="patok-pin-ring ${vIndex === 0 ? 'p1' : ''} ${isSelectedVertex ? 'is-selected' : ''}">
                  <span class="patok-label">P${vIndex + 1}</span>
                </div>
              </div>
            `,
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          });

          const vertexMarker = L.marker([coord.lat, coord.lng], {
            icon: markerWrapper,
            draggable: true,
            zIndexOffset: isSelectedVertex ? 2500 : 1200,
          }).addTo(markersGroup);

          vertexMarkersList.push(vertexMarker);

          vertexMarker.bindTooltip(
            `<b>Patok P${vIndex + 1}</b><br><span style="color:#38bdf8">Tahan & geser dengan mouse</span><br><span style="color:#fde047">Klik untuk pilih / pindah</span>`,
            {
              direction: 'top',
              className: 'bg-slate-900/95 text-white text-xs px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 leading-tight',
            }
          );

          // Click to select this patok for precision nudging / click-to-move
          vertexMarker.on('click', (e: any) => {
            L.DomEvent.stopPropagation(e);
            setSelectedVertexIndex(vIndex);
          });

          // Mouse dragging vertex: locks map panning so mouse movement is 100% dedicated to patok!
          vertexMarker.on('dragstart', (e: any) => {
            map.dragging.disable();
            isDraggingRef.current = true;
            setSelectedVertexIndex(vIndex);
            const el = e.target.getElement();
            el?.querySelector('.patok-pin-target')?.classList.add('is-dragging');
          });

          vertexMarker.on('drag', (e: any) => {
            const newPos = e.target.getLatLng();
            // Update live polygon line stretching at 60fps
            const liveCoords = field.coordinates.map((c, idx) =>
              idx === vIndex ? { lat: newPos.lat, lng: newPos.lng } : { ...c }
            );
            polygon.setLatLngs(liveCoords.map((c) => [c.lat, c.lng] as L.LatLngTuple));
          });

          vertexMarker.on('dragend', (e: any) => {
            map.dragging.enable();
            isDraggingRef.current = false;
            const el = e.target.getElement();
            el?.querySelector('.patok-pin-target')?.classList.remove('is-dragging');

            const finalPos = e.target.getLatLng();
            const newCoords = [...field.coordinates];
            newCoords[vIndex] = { lat: finalPos.lat, lng: finalPos.lng };
            const updated = updatePolygonMetrics({ ...field, coordinates: newCoords });

            // Commit to React state and push to Undo history stack!
            if (onCommitField) {
              onCommitField(updated);
            } else {
              onUpdateField(updated);
            }
          });

          // Right click to delete vertex (if > 3 vertices remain)
          vertexMarker.on('contextmenu', (e: any) => {
            L.DomEvent.stopPropagation(e);
            if (field.coordinates.length <= 3) {
              alert('Polygon minimal harus memiliki 3 titik patok.');
              return;
            }
            const newCoords = field.coordinates.filter((_, idx) => idx !== vIndex);
            const updated = updatePolygonMetrics({ ...field, coordinates: newCoords });
            if (selectedVertexIndex === vIndex) {
              setSelectedVertexIndex(null);
            }
            if (onCommitField) {
              onCommitField(updated);
            } else {
              onUpdateField(updated);
            }
          });
        });

        // 3. Central Move Handle to shift the entire polygon
        const moveMarker = L.marker([centerLat, centerLng], {
          icon: L.divIcon({
            className: 'polygon-move-handle',
            html: `
              <div class="move-handle-badge" title="Tahan dan geser dengan mouse untuk memindahkan seluruh bidang ini">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="5 9 2 12 5 15"></polyline><polyline points="9 5 12 2 15 5"></polyline><polyline points="15 19 12 22 9 19"></polyline><polyline points="19 9 22 12 19 15"></polyline><line x1="2" y1="12" x2="22" y2="12"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>
                <span>Geser Bidang</span>
              </div>
            `,
            iconSize: [0, 0],
          }),
          draggable: true,
          zIndexOffset: 3000,
        }).addTo(markersGroup);

        let initialCenter = L.latLng(centerLat, centerLng);
        let initialCoords = field.coordinates.map((c) => ({ ...c }));

        moveMarker.on('dragstart', (e: any) => {
          map.dragging.disable();
          isDraggingRef.current = true;
          initialCenter = e.target.getLatLng();
          initialCoords = field.coordinates.map((c) => ({ ...c }));
        });

        moveMarker.on('drag', (e: any) => {
          const currentPos = e.target.getLatLng();
          const dLat = currentPos.lat - initialCenter.lat;
          const dLng = currentPos.lng - initialCenter.lng;

          const shifted = initialCoords.map((c) => ({
            lat: c.lat + dLat,
            lng: c.lng + dLng,
          }));

          // Live update the polygon shape
          polygon.setLatLngs(shifted.map((c) => [c.lat, c.lng] as L.LatLngTuple));

          // Live update each patok marker simultaneously
          vertexMarkersList.forEach((marker, idx) => {
            if (shifted[idx]) {
              marker.setLatLng([shifted[idx].lat, shifted[idx].lng]);
            }
          });
        });

        moveMarker.on('dragend', (e: any) => {
          map.dragging.enable();
          isDraggingRef.current = false;
          const currentPos = e.target.getLatLng();
          const dLat = currentPos.lat - initialCenter.lat;
          const dLng = currentPos.lng - initialCenter.lng;

          const shifted = initialCoords.map((c) => ({
            lat: c.lat + dLat,
            lng: c.lng + dLng,
          }));

          const updated = updatePolygonMetrics({ ...field, coordinates: shifted });
          if (onCommitField) {
            onCommitField(updated);
          } else {
            onUpdateField(updated);
          }
        });

        // 4. Draggable & Clickable Midpoint Insertion Handles between each vertex pair
        field.segments.forEach((seg, sIndex) => {
          const midHandle = L.marker([seg.midpoint.lat, seg.midpoint.lng], {
            icon: L.divIcon({
              className: 'midpoint-marker-wrapper',
              html: `
                <div class="midpoint-pin-target" title="Klik atau tarik dengan mouse untuk menambah patok baru di garis ini">
                  <div class="midpoint-pin">+</div>
                </div>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            }),
            draggable: true,
            zIndexOffset: 700,
          }).addTo(markersGroup);

          let hasDraggedMidpoint = false;

          midHandle.on('dragstart', (e: any) => {
            map.dragging.disable();
            isDraggingRef.current = true;
            hasDraggedMidpoint = true;
            // Setup temporary working coordinates with the new midpoint inserted
            const working = [...field.coordinates];
            working.splice(sIndex + 1, 0, { ...seg.midpoint });
            workingCoordsRef.current = working;
          });

          midHandle.on('drag', (e: any) => {
            const newPos = e.target.getLatLng();
            if (workingCoordsRef.current[sIndex + 1]) {
              workingCoordsRef.current[sIndex + 1] = { lat: newPos.lat, lng: newPos.lng };
              polygon.setLatLngs(workingCoordsRef.current.map((c) => [c.lat, c.lng] as L.LatLngTuple));
            }
          });

          midHandle.on('dragend', (e: any) => {
            map.dragging.enable();
            isDraggingRef.current = false;
            const finalPos = e.target.getLatLng();
            const finalCoords = [...field.coordinates];
            finalCoords.splice(sIndex + 1, 0, { lat: finalPos.lat, lng: finalPos.lng });
            const updated = updatePolygonMetrics({ ...field, coordinates: finalCoords });
            setSelectedVertexIndex(sIndex + 1);
            if (onCommitField) {
              onCommitField(updated);
            } else {
              onUpdateField(updated);
            }
          });

          midHandle.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (hasDraggedMidpoint) return;
            const newCoords = [...field.coordinates];
            newCoords.splice(sIndex + 1, 0, seg.midpoint);
            const updated = updatePolygonMetrics({ ...field, coordinates: newCoords });
            setSelectedVertexIndex(sIndex + 1);
            if (onCommitField) {
              onCommitField(updated);
            } else {
              onUpdateField(updated);
            }
          });
        });
      }
    });
  }, [
    fields,
    activeFieldId,
    selectedVertexIndex,
    showLengths,
    showAngles,
    showFieldLabels,
    clickOnlyMeasure,
    onSelectField,
    onUpdateField,
    onCommitField,
  ]);

  // Fit bounds to all fields on initial load if map exists
  const hasFittedInitial = useRef(false);
  useEffect(() => {
    if (hasFittedInitial.current || !mapInstanceRef.current || fields.length === 0) return;
    const allCoords = fields.flatMap((f) => f.coordinates);
    if (allCoords.length >= 3) {
      const bounds = L.latLngBounds(allCoords.map((c) => [c.lat, c.lng]));
      mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60] });
      hasFittedInitial.current = true;
    }
  }, [fields]);

  // Reset selected patok when active field changes
  useEffect(() => {
    setSelectedVertexIndex(null);
  }, [activeFieldId]);

  // Micro-nudge patok by direction (North, South, East, West) with geodesic precision
  const handleNudgePatok = useCallback(
    (direction: 'north' | 'south' | 'east' | 'west') => {
      if (!activeField || selectedVertexIndex === null) return;
      const coord = activeField.coordinates[selectedVertexIndex];
      if (!coord) return;

      const deltaLat = nudgeStepMeters / 110574;
      const cosLat = Math.cos((coord.lat * Math.PI) / 180);
      const deltaLng = nudgeStepMeters / (111320 * (cosLat || 1));

      let newLat = coord.lat;
      let newLng = coord.lng;

      switch (direction) {
        case 'north':
          newLat += deltaLat;
          break;
        case 'south':
          newLat -= deltaLat;
          break;
        case 'east':
          newLng += deltaLng;
          break;
        case 'west':
          newLng -= deltaLng;
          break;
      }

      const updatedCoords = [...activeField.coordinates];
      updatedCoords[selectedVertexIndex] = { lat: newLat, lng: newLng };
      const updated = updatePolygonMetrics({ ...activeField, coordinates: updatedCoords });

      if (onCommitField) {
        onCommitField(updated);
      } else {
        onUpdateField(updated);
      }
    },
    [activeField, selectedVertexIndex, nudgeStepMeters, onCommitField, onUpdateField]
  );

  // Keyboard navigation & nudging for selected patok
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedVertexIndex === null || !activeField) return;

      // Don't intercept if user is typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleNudgePatok('north');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNudgePatok('south');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleNudgePatok('west');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNudgePatok('east');
      } else if (e.key === 'Escape') {
        setSelectedVertexIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedVertexIndex, activeField, handleNudgePatok]);

  const handlePanToSelectedPatok = () => {
    if (!activeField || selectedVertexIndex === null) return;
    const coord = activeField.coordinates[selectedVertexIndex];
    if (coord && mapInstanceRef.current) {
      mapInstanceRef.current.panTo([coord.lat, coord.lng], { animate: true });
    }
  };

  const handleDeleteSelectedPatok = () => {
    if (!activeField || selectedVertexIndex === null) return;
    if (activeField.coordinates.length <= 3) {
      alert('Polygon minimal harus memiliki 3 titik patok.');
      return;
    }
    const updatedCoords = activeField.coordinates.filter((_, idx) => idx !== selectedVertexIndex);
    const updated = updatePolygonMetrics({ ...activeField, coordinates: updatedCoords });
    setSelectedVertexIndex(null);
    if (onCommitField) {
      onCommitField(updated);
    } else {
      onUpdateField(updated);
    }
  };

  // Zoom handlers (smooth 0.35 step with animation)
  const handleZoomIn = () => mapInstanceRef.current?.zoomIn(0.35, { animate: true });
  const handleZoomOut = () => mapInstanceRef.current?.zoomOut(0.35, { animate: true });

  const handleZoomToActive = () => {
    if (!activeField || activeField.coordinates.length < 3 || !mapInstanceRef.current) return;
    const bounds = L.latLngBounds(activeField.coordinates.map((c) => [c.lat, c.lng]));
    mapInstanceRef.current.fitBounds(bounds, { padding: [80, 80] });
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert('Perangkat tidak mendukung geolokasi GPS.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        mapInstanceRef.current?.setView([latitude, longitude], 17, { animate: true });
        L.circleMarker([latitude, longitude], {
          radius: 8,
          fillColor: '#3b82f6',
          color: '#ffffff',
          weight: 2,
          fillOpacity: 1,
        })
          .addTo(mapInstanceRef.current!)
          .bindPopup('Lokasi Anda Saat Ini')
          .openPopup();
      },
      () => {
        alert('Gagal mengambil lokasi GPS Anda. Pastikan izin lokasi diizinkan di peramban.');
      }
    );
  };

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-slate-950">
      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Drawing Instructions Banner (shown when drawing) */}
      {isDrawing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-slate-100 px-5 py-2.5 rounded-lg shadow-2xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="text-xs">
            <span className="font-semibold text-cyan-300">Mode Digitasi Aktif:</span> Klik pada peta untuk membuat titik patok polygon.
            {drawingCoords.length >= 3 ? (
              <span className="text-emerald-400 ml-1 font-medium">Klik titik awal hijau atau klik dua kali untuk menyelesaikan.</span>
            ) : (
              <span className="text-slate-300 ml-1">Minimal 3 titik patok dibutuhkan ({drawingCoords.length}/3).</span>
            )}
          </div>
          {drawingCoords.length >= 3 && (
            <button
              onClick={onFinishDrawing}
              className="ml-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded transition-colors"
            >
              Selesai Gambar
            </button>
          )}
        </div>
      )}

      {/* Mode Tambah Titik Patok Banner */}
      {isAddVertexMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 backdrop-blur-md border border-cyan-500 text-slate-100 px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-cyan-300">Mode Tambah Patok:</span> Klik pada garis batas bidang untuk menyisipkan titik patok baru dengan mouse.
          </div>
          <button
            onClick={() => setIsAddVertexMode(false)}
            className="ml-2 px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors"
          >
            Selesai
          </button>
        </div>
      )}

      {/* Mode Pindah Patok dengan Mouse Banner */}
      {isMovePatokMode && activeField && selectedVertexIndex !== null && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-slate-900/95 backdrop-blur-md border border-amber-500 text-slate-100 px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <div className="text-xs">
            <span className="font-bold text-amber-300">Mode Pindah Patok P{selectedVertexIndex + 1}:</span> Klik di posisi baru pada peta untuk menaruh patok ini.
          </div>
          <button
            onClick={() => setIsMovePatokMode(false)}
            className="ml-2 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-lg transition-colors"
          >
            Batal
          </button>
        </div>
      )}

      {/* Floating Buka Menu & Quick Tools Bar when Sidebar is Collapsed (Clear Workspace Mode) */}
      {isSidebarCollapsed && (
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 animate-fade-in">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 text-slate-100 border border-slate-700/90 rounded-xl shadow-2xl flex items-center gap-2 backdrop-blur-md transition-all font-semibold text-xs group"
              title="Buka Menu Box / Panel Alat (Shortcut: M)"
            >
              <PanelLeftOpen className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span>Buka Menu</span>
            </button>
          )}

          {/* Quick Floating Action Tools for Clear Workspace */}
          {!isDrawing ? (
            onStartDrawing && (
              <button
                onClick={onStartDrawing}
                className="px-3 py-2 bg-blue-600/90 hover:bg-blue-500 text-white border border-blue-500/50 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all text-xs font-semibold"
                title="Mulai Gambar Polygon"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Gambar</span>
              </button>
            )
          ) : (
            <button
              onClick={onFinishDrawing}
              disabled={drawingCoords.length < 3}
              className="px-3 py-2 bg-emerald-600/95 hover:bg-emerald-500 disabled:opacity-40 text-white border border-emerald-500/50 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all text-xs font-semibold"
              title="Selesai Gambar Polygon"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Selesai ({drawingCoords.length})</span>
            </button>
          )}

          <button
            onClick={onToggleRuler}
            className={`px-3 py-2 rounded-xl border flex items-center gap-1.5 backdrop-blur-md transition-all text-xs font-semibold shadow-lg ${
              isRulerActive
                ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                : 'bg-slate-900/95 hover:bg-slate-800 text-amber-300 border-slate-700/90'
            }`}
            title="Penggaris Ukur Panjang Lahan"
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>{isRulerActive ? 'Penggaris ON' : 'Penggaris'}</span>
          </button>

          {onOpenProjectModal && (
            <button
              onClick={onOpenProjectModal}
              className="px-3 py-2 bg-slate-900/95 hover:bg-slate-800 text-slate-100 border border-slate-700/90 rounded-xl shadow-lg flex items-center gap-1.5 backdrop-blur-md transition-all text-xs font-semibold"
              title="Kelola & Simpan Proyek (Ctrl+S)"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline max-w-[120px] truncate">{projectName}</span>
              <span className="md:hidden">Simpan</span>
            </button>
          )}
        </div>
      )}

      {/* Floating Validation Warning Alert Banner (matches the red floating warning in user screenshot, minimizable) */}
      {activeField && (activeField.hasSelfIntersection || activeField.hasAcuteAngle) && (
        isWarningMinimized ? (
          <div
            className="absolute top-4 right-4 z-20 bg-red-950/95 backdrop-blur-md border border-red-500/80 text-red-200 px-3 py-1.5 rounded-xl shadow-2xl flex items-center gap-2 cursor-pointer animate-fade-in hover:bg-red-900 transition-colors"
            onClick={() => setIsWarningMinimized(false)}
            title="Klik untuk memperluas info peringatan geometri"
          >
            <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-xs font-semibold">Peringatan Geometri</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsWarningMinimized(false);
              }}
              className="p-0.5 text-red-300 hover:text-white rounded"
              title="Perluas Peringatan"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="absolute top-4 right-4 z-10 max-w-sm bg-red-950/95 backdrop-blur-md border border-red-500/60 text-red-200 p-3.5 rounded-xl shadow-2xl animate-fade-in">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  {activeField.hasSelfIntersection && (
                    <div className="font-semibold text-red-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                      Polygon memiliki sisi yang saling bersilangan
                    </div>
                  )}
                  {activeField.hasAcuteAngle && (
                    <div className="text-red-300 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      Polygon memiliki sudut yang terlalu lancip (&lt; 2°)
                    </div>
                  )}
                  <div className="text-[11px] text-red-400/90 pt-1">
                    Tarik titik patok merah pada peta untuk memperbaiki geometri polygon.
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsWarningMinimized(true)}
                className="p-1 text-red-300 hover:text-white hover:bg-red-900/60 rounded-md transition-colors shrink-0"
                title="Minimize peringatan ini agar area kerja bersih"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Ruler Top Control Bar HUD (Displayed during measuring or when ruler has points, minimizable) */}
      {(isRulerActive || rulerCoords.length > 0) && (
        isRulerHudMinimized ? (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/80 text-slate-100 px-3.5 py-1.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in cursor-pointer select-none"
            onClick={() => setIsRulerHudMinimized(false)}
            title="Klik untuk memperluas menu penggaris"
          >
            <div className="flex items-center gap-2">
              <Ruler className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-bold font-mono text-white">
                {formatDistance(calculateRulerMetrics(rulerCoords).totalDistanceMeters)}
              </span>
              <span className="text-[10px] text-amber-200/80 font-mono">({rulerCoords.length} titik)</span>
            </div>
            <div className="flex items-center gap-1 border-l border-slate-700 pl-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRulerHudMinimized(false);
                }}
                className="p-1 text-slate-400 hover:text-cyan-300 rounded"
                title="Perluas Penggaris"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRuler();
                }}
                className="p-1 text-slate-400 hover:text-amber-300 rounded"
                title="Reset Ukur"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleRuler();
                }}
                className="p-1 text-slate-400 hover:text-red-400 rounded"
                title="Tutup Penggaris"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-slate-900/95 backdrop-blur-md border border-amber-500/80 text-slate-100 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-4 animate-fade-in max-w-2xl select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-sm">
                <Ruler className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300">Penggaris Lahan:</span>
                  <span className="text-sm font-extrabold font-mono text-white tabular-nums tracking-tight">
                    {formatDistance(calculateRulerMetrics(rulerCoords).totalDistanceMeters)}
                  </span>
                  {rulerCoords.length >= 2 && (
                    <span className="text-[10px] text-amber-200/80 font-mono">({rulerCoords.length} titik ukur)</span>
                  )}
                </div>
                <div className="text-[10px] text-slate-300">
                  {rulerCoords.length === 0 ? (
                    'Klik pada peta untuk menaruh titik ukur awal.'
                  ) : (
                    <span>
                      {rulerCoords.length === 1
                        ? 'Gerakkan kursor & klik titik berikutnya untuk mengukur panjang.'
                        : `Segmen akhir: ${formatDistance(
                            calculateRulerMetrics(rulerCoords).segments[
                              calculateRulerMetrics(rulerCoords).segments.length - 1
                            ]?.lengthMeters || 0
                          )} • Arah: ${calculateRulerMetrics(rulerCoords).segments[
                            calculateRulerMetrics(rulerCoords).segments.length - 1
                          ]?.bearingDeg.toFixed(0)}°`}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 border-l border-slate-800 pl-3">
              {rulerCoords.length >= 2 && (
                <button
                  onClick={() => {
                    const m = calculateRulerMetrics(rulerCoords);
                    navigator.clipboard.writeText(
                      `Pengukuran Panjang Lahan: ${formatDistance(m.totalDistanceMeters)} (${rulerCoords.length} Titik Ukur)`
                    );
                    setRulerCopied(true);
                    setTimeout(() => setRulerCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                  title="Salin hasil ukuran ke clipboard"
                >
                  {rulerCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{rulerCopied ? 'Tersalin' : 'Salin'}</span>
                </button>
              )}

              {rulerCoords.length >= 3 && onConvertRulerToField && (
                <button
                  onClick={onConvertRulerToField}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-sm transition-colors"
                  title="Jadikan hasil ukur penggaris ini sebagai bidang tanah polygon baru"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Jadikan Bidang</span>
                </button>
              )}

              {rulerCoords.length > 0 && (
                <button
                  onClick={onClearRuler}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors"
                  title="Hapus garis ukur dan mulai ulang"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>
              )}

              <button
                onClick={() => setIsRulerHudMinimized(true)}
                className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg transition-colors ml-1"
                title="Minimize menu penggaris agar area kerja bersih"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                onClick={onToggleRuler}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                title="Tutup Penggaris"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
      )}

      {/* Floating Map Controls on Top-Right */}
      <div className="absolute top-20 right-4 z-10 flex flex-col gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 shadow-xl flex flex-col gap-1 relative">
          <button
            onClick={handleZoomIn}
            title="Perbesar Peta"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            title="Perkecil Peta"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <div className="h-px bg-slate-700/60 my-0.5" />

          {/* RULER TOOL BUTTON */}
          <button
            onClick={onToggleRuler}
            title={isRulerActive ? 'Matikan Alat Penggaris (R)' : 'Aktifkan Penggaris Ukur Panjang Lahan (R)'}
            className={`p-2 rounded transition-colors flex items-center justify-center relative ${
              isRulerActive
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                : 'text-slate-300 hover:text-amber-400 hover:bg-slate-800'
            }`}
          >
            <Ruler className="w-4 h-4" />
            {isRulerActive && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-300 animate-ping" />
            )}
          </button>

          {/* LAYER OVERLAYS POPOVER TOGGLE BUTTON */}
          <button
            onClick={() => setIsLayerMenuOpen(!isLayerMenuOpen)}
            title="Pengaturan Tampilan Ukuran & Grid"
            className={`p-2 rounded transition-colors ${
              isLayerMenuOpen ? 'bg-cyan-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* ZEN MODE (CLEAN WORKSPACE) BUTTON */}
          <button
            onClick={() => setIsZenMode(!isZenMode)}
            title={isZenMode ? 'Tampilkan Semua Panel Peta' : 'Sembunyikan Panel Peta (Area Kerja Bersih)'}
            className={`p-2 rounded transition-colors ${
              isZenMode ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isZenMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>

          <div className="h-px bg-slate-700/60 my-0.5" />

          <button
            onClick={handleZoomToActive}
            disabled={!activeField}
            title="Pusatkan ke Bidang Aktif"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors disabled:opacity-40"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleLocateMe}
            title="Lokasi GPS Saya"
            className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            <Compass className="w-4 h-4" />
          </button>
          {onOpenPrintMap && (
            <button
              onClick={onOpenPrintMap}
              title="Review Hasil Cetak Peta Standar ATR/BPN & Pemda"
              className="p-2 text-cyan-300 hover:text-white hover:bg-cyan-600/30 rounded transition-colors"
            >
              <Printer className="w-4 h-4" />
            </button>
          )}

          {/* Collapsible Layer Overlays Popover */}
          {isLayerMenuOpen && (
            <div
              className="absolute top-0 right-14 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl p-2.5 shadow-2xl flex flex-col gap-1.5 z-30 animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 px-1">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Tampilan Lapisan</span>
                <button
                  onClick={() => setIsLayerMenuOpen(false)}
                  className="p-0.5 text-slate-400 hover:text-white rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={onToggleShowLengths}
                className={`px-2 py-1.5 text-[11px] font-mono rounded-lg flex items-center justify-between gap-2 transition-colors ${
                  showLengths ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Jarak Sisi Lahan</span>
                <span className="text-[10px]">{showLengths ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleShowAngles}
                className={`px-2 py-1.5 text-[11px] font-mono rounded-lg flex items-center justify-between gap-2 transition-colors ${
                  showAngles ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Sudut Patok (°)</span>
                <span className="text-[10px]">{showAngles ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleShowGrid}
                className={`px-2 py-1.5 text-[11px] font-mono rounded-lg flex items-center justify-between gap-2 transition-colors ${
                  showGrid ? 'bg-purple-500/20 text-purple-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Grid Kisi Koordinat</span>
                <span className="text-[10px]">{showGrid ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleShowFieldLabels}
                className={`px-2 py-1.5 text-[11px] font-mono rounded-lg flex items-center justify-between gap-2 transition-colors ${
                  showFieldLabels ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Label P×L×Luas</span>
                <span className="text-[10px]">{showFieldLabels ? 'ON' : 'OFF'}</span>
              </button>

              <div className="h-px bg-slate-800 my-0.5" />

              <button
                onClick={onToggleClickOnlyMeasure}
                className={`px-2 py-1.5 text-[11px] font-mono rounded-lg flex items-center justify-between gap-2 transition-colors ${
                  clickOnlyMeasure ? 'bg-cyan-500/25 text-cyan-300 font-bold border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Ukuran Saat Diklik</span>
                <span className="text-[10px]">{clickOnlyMeasure ? 'AKTIF' : 'SEMUA'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Selected Field Quick Action Card on Map (Closable with 'X', and minimizable for clear workspace) */}
        {!isZenMode && !isFieldCardDismissed && activeField && (
          isFieldCardMinimized ? (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl px-3 py-2 shadow-2xl flex items-center justify-between gap-3 min-w-[210px] animate-fade-in text-xs">
              <div
                className="flex items-center gap-2 cursor-pointer flex-1 min-w-0"
                onClick={() => setIsFieldCardMinimized(false)}
                title="Klik untuk memperluas info bidang & dimensi"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/60"
                  style={{ backgroundColor: activeField.fillColor || activeField.color }}
                />
                <span className="font-bold text-white truncate max-w-[95px]" title={activeField.name}>
                  {activeField.name}
                </span>
                <span className="text-cyan-300 font-mono font-bold shrink-0">
                  {(activeField.areaSquareMeters / 10000).toFixed(2)} ha
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setIsFieldCardMinimized(false)}
                  className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                  title="Perluas Info Box (Lihat P×L & Alat)"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsFieldCardDismissed(true)}
                  className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  title="Sembunyikan Panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-xl p-3 shadow-2xl flex flex-col gap-2 min-w-[210px] animate-fade-in">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
                <div className="text-xs font-bold text-white truncate max-w-[110px]" title={activeField.name}>
                  {activeField.name}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onOpenRenameModal(activeField.id)}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded transition-colors"
                    title="Ganti Nama Bidang"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsFieldCardMinimized(true)}
                    className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors"
                    title="Minimize Info Box agar area kerja lebih clear"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsFieldCardDismissed(true)}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                    title="Sembunyikan Panel Ini"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-300 space-y-0.5">
                <div>
                  P: <span className="text-cyan-300 font-bold">{(activeField.dimension?.lengthMeters ?? activeField.bounds.lengthMeters).toFixed(1)}m</span> • L:{' '}
                  <span className="text-cyan-300 font-bold">{(activeField.dimension?.widthMeters ?? activeField.bounds.widthMeters).toFixed(1)}m</span>
                </div>
                <div>
                  Luas: <span className="text-emerald-400 font-bold">{(activeField.areaSquareMeters / 10000).toFixed(4)} ha</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-800">
                <button
                  onClick={onOpenStyleModal}
                  className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors"
                  title="Ganti Warna Garis & Bidang"
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full border border-white/60 shrink-0"
                    style={{
                      backgroundColor: activeField.fillColor || activeField.color,
                      borderColor: activeField.strokeColor || activeField.color,
                      borderWidth: '1.5px',
                    }}
                  />
                  Warna
                </button>

                <button
                  onClick={() => onOpenRenameModal(activeField.id)}
                  className="py-1 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-medium rounded flex items-center justify-center gap-1.5 transition-colors"
                  title="Ganti Nama Bidang"
                >
                  <Edit3 className="w-3 h-3 text-cyan-400" />
                  Nama
                </button>
              </div>

              <button
                onClick={() => setIsAddVertexMode(!isAddVertexMode)}
                className={`w-full py-1.5 px-2 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors border ${
                  isAddVertexMode
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold shadow-md'
                    : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
                }`}
                title="Aktifkan mode klik garis untuk menambah patok baru"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{isAddVertexMode ? 'Mode Tambah Aktif' : '+ Tambah Titik Patok'}</span>
              </button>
            </div>
          )
        )}
      </div>

      {/* Floating Precision Nudge & Coordinate Card for Selected Patok (Minimizable) */}
      {!isZenMode &&
        activeField &&
        selectedVertexIndex !== null &&
        activeField.coordinates[selectedVertexIndex] && (
          isPatokCardMinimized ? (
            <div
              className="absolute bottom-14 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-cyan-500/70 rounded-xl px-3 py-2 shadow-2xl flex items-center gap-3 animate-fade-in text-xs select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setIsPatokCardMinimized(false)}
                title="Klik untuk memperluas pengaturan patok"
              >
                <div
                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-extrabold text-white font-mono shadow ${
                    selectedVertexIndex === 0 ? 'bg-emerald-500' : 'bg-red-500'
                  }`}
                >
                  P{selectedVertexIndex + 1}
                </div>
                <span className="font-mono text-cyan-300 font-semibold">
                  {activeField.coordinates[selectedVertexIndex].lat.toFixed(5)}°, {activeField.coordinates[selectedVertexIndex].lng.toFixed(5)}°
                </span>
              </div>
              <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                <button
                  onClick={() => setIsPatokCardMinimized(false)}
                  className="p-1 text-slate-400 hover:text-cyan-300 rounded"
                  title="Perluas Pengaturan Patok"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setSelectedVertexIndex(null);
                    setIsMovePatokMode(false);
                  }}
                  className="p-1 text-slate-400 hover:text-red-400 rounded"
                  title="Tutup Panel Patok"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div
              className="absolute bottom-14 left-4 z-20 bg-slate-900/95 backdrop-blur-md border border-cyan-500/60 rounded-2xl p-4 shadow-2xl max-w-xs text-slate-100 select-none animate-fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white font-mono shadow ${
                      selectedVertexIndex === 0
                        ? 'bg-emerald-500 ring-2 ring-emerald-300'
                        : 'bg-red-500 ring-2 ring-red-300'
                    }`}
                  >
                    P{selectedVertexIndex + 1}
                  </div>
                  <div className="text-xs font-bold text-white">
                    Atur Patok P{selectedVertexIndex + 1}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {/* Prev Patok */}
                  <button
                    onClick={() =>
                      setSelectedVertexIndex(
                        (selectedVertexIndex - 1 + activeField.coordinates.length) %
                          activeField.coordinates.length
                      )
                    }
                    title="Pindah ke Patok Sebelumnya"
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {/* Next Patok */}
                  <button
                    onClick={() =>
                      setSelectedVertexIndex(
                        (selectedVertexIndex + 1) % activeField.coordinates.length
                      )
                    }
                    title="Pindah ke Patok Berikutnya"
                    className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {/* Minimize */}
                  <button
                    onClick={() => setIsPatokCardMinimized(true)}
                    title="Minimize Panel Patok"
                    className="p-1 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition-colors ml-0.5"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  {/* Close */}
                  <button
                    onClick={() => {
                      setSelectedVertexIndex(null);
                      setIsMovePatokMode(false);
                    }}
                    title="Tutup Panel Patok"
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

            {/* Click-to-Move with Mouse Button */}
            <button
              onClick={() => setIsMovePatokMode(!isMovePatokMode)}
              className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors mb-2.5 ${
                isMovePatokMode
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-lg animate-pulse'
                  : 'bg-cyan-600/90 hover:bg-cyan-500 text-white'
              }`}
              title="Pindahkan patok ini dengan mengeklik posisi baru pada peta"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>
                {isMovePatokMode
                  ? 'Klik di Peta untuk Menaruh'
                  : 'Pindah Patok dengan Klik Mouse'}
              </span>
            </button>

            {/* Coordinates Readout */}
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-[11px] font-mono space-y-1 mb-2.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Lat (Y):</span>
                <span className="text-cyan-300 font-semibold">
                  {activeField.coordinates[selectedVertexIndex].lat.toFixed(7)}°
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Lng (X):</span>
                <span className="text-cyan-300 font-semibold">
                  {activeField.coordinates[selectedVertexIndex].lng.toFixed(7)}°
                </span>
              </div>
            </div>

            {/* Nudge Step Selector */}
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Langkah Geser:</span>
                <span className="text-cyan-400 font-mono font-bold">{nudgeStepMeters} meter</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[0.2, 0.5, 1.0, 5.0].map((step) => (
                  <button
                    key={step}
                    onClick={() => setNudgeStepMeters(step)}
                    className={`py-1 text-[10px] font-mono rounded font-semibold transition-colors ${
                      nudgeStepMeters === step
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {step}m
                  </button>
                ))}
              </div>
            </div>

            {/* 4-way Nudge D-Pad Controls */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex flex-col items-center gap-1.5 mb-2.5">
              {/* North */}
              <button
                onClick={() => handleNudgePatok('north')}
                title={`Geser patok ke Utara sejauh ${nudgeStepMeters}m (atau tekan Panah Atas)`}
                className="px-3 py-1 bg-slate-800 hover:bg-cyan-600 active:bg-cyan-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                <ArrowUp className="w-3.5 h-3.5 text-cyan-400" />
                <span>Utara (+{nudgeStepMeters}m)</span>
              </button>

              {/* West & East */}
              <div className="flex items-center justify-between w-full px-1">
                <button
                  onClick={() => handleNudgePatok('west')}
                  title={`Geser patok ke Barat sejauh ${nudgeStepMeters}m (atau tekan Panah Kiri)`}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 active:bg-cyan-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Barat</span>
                </button>

                <div className="p-1.5 rounded-full bg-slate-800/60 text-cyan-400" title="Gunakan tombol panah keyboard untuk geser">
                  <Move className="w-3.5 h-3.5" />
                </div>

                <button
                  onClick={() => handleNudgePatok('east')}
                  title={`Geser patok ke Timur sejauh ${nudgeStepMeters}m (atau tekan Panah Kanan)`}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-cyan-600 active:bg-cyan-700 text-white rounded-md text-xs font-semibold flex items-center gap-1 transition-colors shadow"
                >
                  <span>Timur</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                </button>
              </div>

              {/* South */}
              <button
                onClick={() => handleNudgePatok('south')}
                title={`Geser patok ke Selatan sejauh ${nudgeStepMeters}m (atau tekan Panah Bawah)`}
                className="px-3 py-1 bg-slate-800 hover:bg-cyan-600 active:bg-cyan-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors shadow"
              >
                <ArrowDown className="w-3.5 h-3.5 text-cyan-400" />
                <span>Selatan (-{nudgeStepMeters}m)</span>
              </button>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
              <button
                onClick={handlePanToSelectedPatok}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors font-medium"
                title="Arahkan peta tepat ke patok ini"
              >
                <Target className="w-3 h-3" />
                <span>Pusatkan</span>
              </button>

              <button
                onClick={handleDeleteSelectedPatok}
                disabled={activeField.coordinates.length <= 3}
                className="text-red-400 hover:text-red-300 disabled:opacity-40 flex items-center gap-1 transition-colors font-medium"
                title={
                  activeField.coordinates.length <= 3
                    ? 'Minimal 3 patok untuk polygon'
                    : 'Hapus patok ini dari polygon'
                }
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus Patok</span>
              </button>
            </div>

            <div className="text-[10px] text-slate-400 text-center mt-2 leading-tight">
              💡 Tarik patok di peta atau gunakan tombol panah keyboard!
            </div>
          </div>
        )
      )}

      {/* Bottom Floating Coordinate / Status Bar */}
      <div className="absolute bottom-3 left-4 z-10 flex items-center gap-3 bg-slate-900/85 backdrop-blur-md border border-slate-800 text-slate-400 px-3 py-1.5 rounded-md text-xs font-mono">
        {mouseCoord ? (
          <div>
            Lintang: <span className="text-slate-200">{mouseCoord.lat.toFixed(6)}°</span>, Bujur:{' '}
            <span className="text-slate-200">{mouseCoord.lng.toFixed(6)}°</span>
          </div>
        ) : (
          <div>Arahkan kursor pada peta untuk melihat koordinat</div>
        )}
        <div className="h-3 w-px bg-slate-700" />
        <div>CRS: <span className="text-cyan-400">EPSG:4326 (WGS84)</span></div>
      </div>
    </div>
  );
};
