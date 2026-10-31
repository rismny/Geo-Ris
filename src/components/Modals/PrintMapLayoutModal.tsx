import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import L from 'leaflet';
import { PolygonField, Coordinate, BasemapType } from '../../types/gis';
import {
  formatArea,
  formatDistance,
  calculateDistanceMeters,
} from '../../utils/geoCalculations';
import {
  Printer,
  X,
  Compass,
  Layers,
  MapPin,
  Settings2,
  Check,
  RefreshCw,
  Maximize2,
  FileText,
  Sliders,
  ChevronDown,
  Download,
  Info,
  Building2,
  Shield,
  Eye,
  Plus,
  Trash2,
  Edit2,
  Image as ImageIcon,
  Minus,
  ExternalLink,
} from 'lucide-react';

interface PrintMapLayoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: PolygonField[];
  activeFieldId: string | null;
  basemap: BasemapType;
  projectName?: string;
  onSelectField?: (id: string) => void;
  onAddOverlapField?: () => void;
}

export interface LegendItem {
  id: string;
  color: string;
  borderStyle: 'solid' | 'dashed' | 'point';
  label: string;
}

export const PrintMapLayoutModal: React.FC<PrintMapLayoutModalProps> = ({
  isOpen,
  onClose,
  fields,
  activeFieldId,
  basemap: initialBasemap,
  projectName = 'Proyek Pengukuran YSR',
  onSelectField,
  onAddOverlapField,
}) => {
  // Paper orientation and size
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [paperSize, setPaperSize] = useState<'A4' | 'A3'>('A4');
  const [selectedBasemap, setSelectedBasemap] = useState<BasemapType>(
    initialBasemap === 'osm' ? 'osm' : 'satellite'
  );

  // Layer assignments:
  // Layer Merah = Peta Bidang BHUMI ATR/BPN
  // Layer Kuning = Koordinat PKKPR
  const [redFieldId, setRedFieldId] = useState<string>('');
  const [yellowFieldId, setYellowFieldId] = useState<string>('');

  // Automatically assign fields if available
  useEffect(() => {
    if (fields.length > 0) {
      if (!redFieldId || !fields.some((f) => f.id === redFieldId)) {
        setRedFieldId(fields[0].id);
      }
      if (fields.length > 1) {
        if (!yellowFieldId || !fields.some((f) => f.id === yellowFieldId)) {
          setYellowFieldId(fields[1].id);
        }
      }
    }
  }, [fields, redFieldId, yellowFieldId]);

  // Customizable Administrative Header Texts
  const [instansiLevel1, setInstansiLevel1] = useState('PEMERINTAH KABUPATEN KAMPAR');
  const [instansiLevel2, setInstansiLevel2] = useState('DINAS PERUMAHAN DAN KAWASAN PERMUKIMAN');
  const [instansiLevel3, setInstansiLevel3] = useState('BIDANG TATA RUANG DAN PERTANAHAN');
  const [selectedLogoPreset, setSelectedLogoPreset] = useState<'garuda' | 'atrbpn' | 'pemda' | 'pupr' | 'custom'>('garuda');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');

  // Customizable Map Title & Subtitle
  const [mapTitle, setMapTitle] = useState('PETA TUMPANG TINDIH BIDANG TANAH & PKKPR');
  const [mapSubtitle, setMapSubtitle] = useState('Lokasi: Desa Rimbo Panjang, Kec. Tambang');
  const [docNumber, setDocNumber] = useState('No. Dokumen: 590/PR-DISPERKIM/2026');

  // Inset Map customization
  const [insetZoom, setInsetZoom] = useState<number>(10);
  const [insetLocationText, setInsetLocationText] = useState('Wilayah Administrasi Kabupaten Kampar & Sekitarnya');

  // Customizable Identification Labels inside polygons
  const [shgbLabel, setShgbLabel] = useState('SHGB NO. 01425 / RIMBO PANJANG');
  const [pkkprLabel, setPkkprLabel] = useState('KOORDINAT PKKPR NO. 503/DPMPTSP/2024');

  // Projection and Coordinate Settings
  const [utmZone, setUtmZone] = useState('UTM Zone 50 S');
  const [datum, setDatum] = useState('WGS 1984');
  const [projectionSystem, setProjectionSystem] = useState('Transverse Mercator');
  const [customScaleText, setCustomScaleText] = useState('1 : 2.500');
  const [scaleComparisonText, setScaleComparisonText] = useState('1 centimeter = 25 Meter (0.025 Km)');

  // Customizable Legend Items
  const [legendItems, setLegendItems] = useState<LegendItem[]>([
    {
      id: 'leg-1',
      color: '#ef4444',
      borderStyle: 'solid',
      label: 'Delineasi berdasarkan Peta Bidang BHUMI ATR/BPN',
    },
    {
      id: 'leg-2',
      color: '#eab308',
      borderStyle: 'solid',
      label: 'Delineasi berdasarkan Koordinat PKKPR',
    },
    {
      id: 'leg-3',
      color: '#38bdf8',
      borderStyle: 'dashed',
      label: 'Batas Bidang Tambahan / Sekitarnya',
    },
    {
      id: 'leg-4',
      color: '#ef4444',
      borderStyle: 'point',
      label: 'Titik Patok Batas Geodesi (BPN)',
    },
  ]);

  // Data Sources & Footnote (4 standard items)
  const [dataSources, setDataSources] = useState<string[]>([
    'Citra Satelit Resolusi Tinggi (CSRT) World View.',
    'Database Siteplan Perencanaan Dinas Perumahan dan Permukiman.',
    'Peta Rencana Tata Ruang Wilayah (RTRW).',
    'Pengolahan Data Spasial Tahun 2026.',
  ]);

  // Signature Block
  const [showSignatures, setShowSignatures] = useState(true);
  const [approverTitle, setApproverTitle] = useState('Kepala Dinas Perumahan dan Permukiman');
  const [approverName, setApproverName] = useState('Drs. H. AHMAD YANI, M.Si');
  const [approverNip, setApproverNip] = useState('NIP. 19740512 199903 1 002');
  const [surveyorTitle, setSurveyorTitle] = useState('Petugas Pemetaan / Surveyor');
  const [surveyorName, setSurveyorName] = useState('IR. M. RIDWAN, S.T.');
  const [currentCityDate, setCurrentCityDate] = useState('Bangkinang, 30 Oktober 2026');

  // Interactive controls drawer / settings toggle
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showLabelsOnMap, setShowLabelsOnMap] = useState(true);
  const [showDimensionsOnMap, setShowDimensionsOnMap] = useState(true);
  const [showPatokOnMap, setShowPatokOnMap] = useState(true);

  // References to Leaflet map instances
  const mainMapContainerRef = useRef<HTMLDivElement | null>(null);
  const insetMapContainerRef = useRef<HTMLDivElement | null>(null);
  const mainMapInstance = useRef<L.Map | null>(null);
  const insetMapInstance = useRef<L.Map | null>(null);
  const mainLayerGroup = useRef<L.LayerGroup | null>(null);
  const insetLayerGroup = useRef<L.LayerGroup | null>(null);
  const insetRectangleRef = useRef<L.Rectangle | null>(null);
  const insetMarkerRef = useRef<L.Marker | null>(null);

  // Active fields
  const redField = fields.find((f) => f.id === redFieldId) || fields[0] || null;
  const yellowField = fields.find((f) => f.id === yellowFieldId) || (fields.length > 1 ? fields[1] : null);

  // Compute default center from active polygons or fallback
  const initialCenter = useMemo(() => {
    const fieldWithCoords = (redField && redField.coordinates.length > 0)
      ? redField
      : fields.find((f) => f.coordinates.length > 0) || null;

    if (fieldWithCoords && fieldWithCoords.coordinates.length > 0) {
      const lat = fieldWithCoords.coordinates.reduce((sum, c) => sum + c.lat, 0) / fieldWithCoords.coordinates.length;
      const lng = fieldWithCoords.coordinates.reduce((sum, c) => sum + c.lng, 0) / fieldWithCoords.coordinates.length;
      return { lat, lng };
    }
    return { lat: 0.526, lng: 101.448 };
  }, [redField, fields]);

  // Map state calculated bounds for coordinate grid neatline
  const [mapBounds, setMapBounds] = useState<{
    north: number;
    south: number;
    east: number;
    west: number;
    zoom: number;
  }>({
    north: initialCenter.lat + 0.005,
    south: initialCenter.lat - 0.005,
    east: initialCenter.lng + 0.007,
    west: initialCenter.lng - 0.007,
    zoom: 16,
  });

  // Current real-world center of main map
  const currentCenterLat = useMemo(() => {
    return (mapBounds.north + mapBounds.south) / 2 || initialCenter.lat;
  }, [mapBounds, initialCenter]);

  const currentCenterLng = useMemo(() => {
    return (mapBounds.east + mapBounds.west) / 2 || initialCenter.lng;
  }, [mapBounds, initialCenter]);

  // Format DMS (Degrees Minutes Seconds) for cartographic border
  const formatDMS = (coord: number, isLat: boolean): string => {
    const dir = isLat ? (coord >= 0 ? 'U' : 'S') : coord >= 0 ? 'T' : 'B';
    const abs = Math.abs(coord);
    const deg = Math.floor(abs);
    const minFloat = (abs - deg) * 60;
    const min = Math.floor(minFloat);
    const sec = Math.round((minFloat - min) * 60);
    return `${deg}°${min.toString().padStart(2, '0')}'${sec.toString().padStart(2, '0')}"${dir}`;
  };

  // Format UTM Metric label approximation for border neatline
  const formatUTMMeter = (coord: number, isLat: boolean): string => {
    if (isLat) {
      const yMeter = Math.round(Math.abs(coord) * 111320);
      return `${yMeter.toLocaleString('id-ID')} mU`;
    } else {
      const xMeter = Math.round(500000 + (coord - 102) * 111320);
      return `${xMeter.toLocaleString('id-ID')} mT`;
    }
  };

  // 1. Initialize and update Main Leaflet Map with smooth fractional zoom & right-click drag
  useEffect(() => {
    if (!isOpen || !mainMapContainerRef.current) return;

    if (mainMapInstance.current) {
      mainMapInstance.current.remove();
      mainMapInstance.current = null;
    }

    const map = L.map(mainMapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: 16,
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

    mainMapInstance.current = map;
    mainLayerGroup.current = L.layerGroup().addTo(map);

    const getTileUrl = (base: BasemapType) => {
      switch (base) {
        case 'google_hybrid':
          return 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
        case 'osm':
          return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        case 'satellite':
        default:
          return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      }
    };

    const getMaxNativeZoom = (base: BasemapType) => {
      if (base === 'google_hybrid') return 19;
      if (base === 'osm') return 19;
      return 18; // ESRI World Imagery
    };

    L.tileLayer(getTileUrl(selectedBasemap), {
      maxZoom: 22,
      maxNativeZoom: getMaxNativeZoom(selectedBasemap),
      subdomains: selectedBasemap === 'osm' ? ['a', 'b', 'c'] : [],
    }).addTo(map);

    // Right-Click and Left-Click Drag Panning Handler
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
      // Prevent browser context menu on right-click map pan
      e.preventDefault();
    };

    const container = map.getContainer();
    container.addEventListener('mousedown', handleRightMouseDown);
    window.addEventListener('mousemove', handleRightMouseMove);
    window.addEventListener('mouseup', handleRightMouseUp);
    container.addEventListener('contextmenu', handleContextMenu);

    const updateBoundsState = () => {
      const b = map.getBounds();
      setMapBounds({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
        zoom: map.getZoom(),
      });

      const metersPerPixel = (40075016.686 * Math.abs(Math.cos(b.getCenter().lat * Math.PI / 180))) / Math.pow(2, map.getZoom() + 8);
      const estRatio = Math.round(metersPerPixel * 3779.5);
      setCustomScaleText(`1 : ${estRatio.toLocaleString('id-ID')}`);
      setScaleComparisonText(`1 centimeter = ${(estRatio / 100).toFixed(1)} Meter`);
    };

    map.on('moveend', updateBoundsState);
    map.on('zoomend', updateBoundsState);

    setTimeout(() => {
      map.invalidateSize();
      fitMainMapToPolygons(map);
      updateBoundsState();
    }, 250);

    return () => {
      container.removeEventListener('mousedown', handleRightMouseDown);
      window.removeEventListener('mousemove', handleRightMouseMove);
      window.removeEventListener('mouseup', handleRightMouseUp);
      container.removeEventListener('contextmenu', handleContextMenu);
      map.off('moveend', updateBoundsState);
      map.off('zoomend', updateBoundsState);
      map.remove();
      mainMapInstance.current = null;
    };
  }, [isOpen, selectedBasemap]);

  // Fit map to polygons helper
  const fitMainMapToPolygons = (mapInstance?: L.Map | null) => {
    const map = mapInstance || mainMapInstance.current;
    if (!map) return;

    const allCoords: [number, number][] = [];
    fields.forEach((f) => {
      if (f.visible && f.coordinates.length > 0) {
        f.coordinates.forEach((c) => allCoords.push([c.lat, c.lng]));
      }
    });

    if (allCoords.length > 0) {
      const latLngBounds = L.latLngBounds(allCoords);
      map.fitBounds(latLngBounds, {
        padding: [35, 35],
        maxZoom: 17,
        animate: true,
      });
    } else {
      map.setView([initialCenter.lat, initialCenter.lng], 16, { animate: true });
    }
  };

  // 2. Render Polygons, Labels, and Markers on Main Map
  useEffect(() => {
    if (!mainMapInstance.current || !mainLayerGroup.current) return;
    const group = mainLayerGroup.current;
    group.clearLayers();

    fields.forEach((field) => {
      if (!field.visible || field.coordinates.length < 3) return;

      const isRed = field.id === redFieldId;
      const isYellow = field.id === yellowFieldId;

      const strokeColor = isRed ? '#ef4444' : isYellow ? '#eab308' : field.strokeColor || '#06b6d4';
      const fillColor = isRed ? '#ef4444' : isYellow ? '#eab308' : field.fillColor || '#0891b2';
      const strokeWidth = isRed || isYellow ? 3.5 : 2;
      const fillOpacity = isRed || isYellow ? 0.22 : 0.15;

      const latlngs = field.coordinates.map((c) => [c.lat, c.lng] as [number, number]);

      L.polygon(latlngs, {
        color: strokeColor,
        weight: strokeWidth,
        fillColor: fillColor,
        fillOpacity: fillOpacity,
      }).addTo(group);

      const centerLat = field.coordinates.reduce((sum, c) => sum + c.lat, 0) / field.coordinates.length;
      const centerLng = field.coordinates.reduce((sum, c) => sum + c.lng, 0) / field.coordinates.length;

      let customBadgeText = field.name;
      if (isRed) {
        customBadgeText = shgbLabel || 'SHGB NO. 01425 / RIMBO PANJANG';
      } else if (isYellow) {
        customBadgeText = pkkprLabel || 'KOORDINAT PKKPR NO. 503/2024';
      }

      const areaHa = (field.areaSquareMeters / 10000).toFixed(4);

      if (showLabelsOnMap) {
        const badgeHtml = `
          <div class="print-polygon-label-badge" style="border-left: 4px solid ${strokeColor};">
            <div class="print-label-main">${customBadgeText}</div>
            <div class="print-label-sub">
              <span>L: ${field.areaSquareMeters.toLocaleString('id-ID', { maximumFractionDigits: 1 })} m²</span>
              <span style="color: ${strokeColor}; font-weight: 800;">(${areaHa} ha)</span>
            </div>
          </div>
        `;

        const labelIcon = L.divIcon({
          className: 'print-label-marker',
          html: badgeHtml,
          iconSize: [180, 40],
          iconAnchor: [90, 20],
        });

        L.marker([centerLat, centerLng], { icon: labelIcon, interactive: false }).addTo(group);
      }

      if (showPatokOnMap) {
        field.coordinates.forEach((coord, idx) => {
          const patokHtml = `
            <div class="print-patok-pill" style="background-color: ${strokeColor};">
              P${idx + 1}
            </div>
          `;
          const patokIcon = L.divIcon({
            className: 'print-patok-wrapper',
            html: patokHtml,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });
          L.marker([coord.lat, coord.lng], { icon: patokIcon, interactive: false }).addTo(group);
        });
      }

      if (showDimensionsOnMap && field.segments) {
        field.segments.forEach((seg) => {
          const distHtml = `
            <div class="print-seg-badge">
              ${seg.lengthMeters.toFixed(1)} m
            </div>
          `;
          const segIcon = L.divIcon({
            className: 'print-seg-wrapper',
            html: distHtml,
            iconSize: [60, 18],
            iconAnchor: [30, 9],
          });
          L.marker([seg.midpoint.lat, seg.midpoint.lng], { icon: segIcon, interactive: false }).addTo(group);
        });
      }
    });
  }, [
    fields,
    redFieldId,
    yellowFieldId,
    shgbLabel,
    pkkprLabel,
    showLabelsOnMap,
    showDimensionsOnMap,
    showPatokOnMap,
  ]);

  // 3. Inset Map (Regional macro orientation map) - INITIALIZE ONCE
  useEffect(() => {
    if (!isOpen || !insetMapContainerRef.current) return;

    if (insetMapInstance.current) {
      insetMapInstance.current.remove();
      insetMapInstance.current = null;
    }

    const insetMap = L.map(insetMapContainerRef.current, {
      center: [initialCenter.lat, initialCenter.lng],
      zoom: insetZoom,
      zoomControl: false,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
      zoomAnimation: true,
    });

    insetMapInstance.current = insetMap;
    const layerGroup = L.layerGroup().addTo(insetMap);
    insetLayerGroup.current = layerGroup;

    // Use OpenStreetMap for clear regional geography & administrative boundaries
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 16,
    }).addTo(insetMap);

    const bounds: L.LatLngBoundsExpression = [
      [mapBounds.south, mapBounds.west],
      [mapBounds.north, mapBounds.east],
    ];

    insetRectangleRef.current = L.rectangle(bounds, {
      color: '#dc2626',
      weight: 2.5,
      fillColor: '#ef4444',
      fillOpacity: 0.35,
    }).addTo(layerGroup);

    const pinHtml = `
      <div class="inset-center-pin">
        <span class="inset-pin-pulse"></span>
        <span class="inset-pin-core"></span>
      </div>
    `;
    const pinIcon = L.divIcon({
      className: 'inset-pin-wrapper',
      html: pinHtml,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });

    insetMarkerRef.current = L.marker([initialCenter.lat, initialCenter.lng], {
      icon: pinIcon,
      interactive: false,
    }).addTo(layerGroup);

    setTimeout(() => {
      insetMap.invalidateSize();
    }, 250);

    return () => {
      insetMap.remove();
      insetMapInstance.current = null;
      insetRectangleRef.current = null;
      insetMarkerRef.current = null;
    };
  }, [isOpen]);

  // 4. Inset Map Update Effect (SMOOTH & WITHOUT DESTROYING MAP!)
  useEffect(() => {
    const insetMap = insetMapInstance.current;
    if (!insetMap) return;

    // Smoothly pan to the current center of the main map or active field
    insetMap.setView([currentCenterLat, currentCenterLng], insetZoom, { animate: true });

    const bounds: L.LatLngBoundsExpression = [
      [mapBounds.south, mapBounds.west],
      [mapBounds.north, mapBounds.east],
    ];

    if (insetRectangleRef.current) {
      insetRectangleRef.current.setBounds(bounds);
    }
    if (insetMarkerRef.current) {
      insetMarkerRef.current.setLatLng([currentCenterLat, currentCenterLng]);
    }
  }, [mapBounds, insetZoom, currentCenterLat, currentCenterLng]);

  // Zoom handlers for main map (ultra-smooth 0.35 increments)
  const handleMainZoomIn = () => {
    mainMapInstance.current?.zoomIn(0.35, { animate: true });
  };
  const handleMainZoomOut = () => {
    mainMapInstance.current?.zoomOut(0.35, { animate: true });
  };

  // Zoom handler for inset map
  const handleInsetZoom = (delta: number) => {
    setInsetZoom((prev) => {
      const next = Math.max(6, Math.min(15, prev + delta));
      return next;
    });
  };

  // Robust Print Action with pre-flight map invalidation
  const handlePrint = () => {
    setIsSettingsOpen(false);

    if (mainMapInstance.current) {
      mainMapInstance.current.invalidateSize();
    }
    if (insetMapInstance.current) {
      insetMapInstance.current.invalidateSize();
    }

    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Pop-up clean isolated print window for 100% reliable PDF printing
  const handlePrintIsolatedWindow = () => {
    const docEl = document.querySelector('.print-map-document');
    if (!docEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1280,height=900');
    if (!printWindow) {
      // Fallback to standard window.print if popup was blocked
      handlePrint();
      return;
    }

    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map((s) => s.outerHTML)
      .join('\n');

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${mapTitle} - Cetak Dokumen Peta ATR/BPN</title>
          ${styles}
          <style>
            @page { size: landscape; margin: 4mm; }
            html, body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-map-document {
              width: 100vw !important;
              height: 98vh !important;
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
            ${docEl.outerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.focus();
                window.print();
              }, 400);
            };
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCreateOverlapField = () => {
    if (!redField || redField.coordinates.length < 3) return;
    if (onAddOverlapField) {
      onAddOverlapField();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="print-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="print-modal-inner w-full max-w-[1520px] h-[95vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden my-auto">
        {/* ========================================================= */}
        {/* TOP TOOLBAR (SCREEN ONLY - HIDDEN IN PRINT)               */}
        {/* ========================================================= */}
        <div className="no-print bg-slate-950 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Layout Pratinjau Cetak Peta Standar Instansi</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono">
                  ATR/BPN & Pemda
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Peta citra satelit resolusi tinggi dengan grid koordinat, kop instansi, legenda, skala, arah utara & peta orientasi
              </p>
            </div>
          </div>

          {/* Quick Toolbar Controls */}
          <div className="flex items-center gap-2">
            {/* Orientation Selector */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setOrientation('landscape')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  orientation === 'landscape'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format Lanskap (Standar Peta Instansi)"
              >
                Lanskap
              </button>
              <button
                onClick={() => setOrientation('portrait')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  orientation === 'portrait'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Format Potret"
              >
                Potret
              </button>
            </div>

            {/* Paper Size */}
            <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-semibold">
              <button
                onClick={() => setPaperSize('A4')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperSize === 'A4'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                A4
              </button>
              <button
                onClick={() => setPaperSize('A3')}
                className={`px-2 py-1 rounded transition-colors ${
                  paperSize === 'A3'
                    ? 'bg-cyan-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                A3
              </button>
            </div>

            {/* Basemap switcher */}
            <select
              value={selectedBasemap}
              onChange={(e) => setSelectedBasemap(e.target.value as BasemapType)}
              aria-label="Pilih Peta Dasar Citra Satelit"
              className="bg-slate-900 border border-slate-800 text-xs text-cyan-300 font-semibold px-2.5 py-1.5 rounded-lg focus:outline-none"
            >
              <option value="satellite">Citra Satelit ESRI (WorldView)</option>
              <option value="google_hybrid">Google Satelit Hibrida</option>
              <option value="osm">Peta Vektor OpenStreetMap</option>
            </select>

            {/* Re-center button */}
            <button
              onClick={() => fitMainMapToPolygons()}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
              title="Pusatkan Peta ke Poligon Bidang"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
            </button>

            {/* Settings Drawer Toggle */}
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
                isSettingsOpen
                  ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Edit Metadata & Layer</span>
            </button>

            {/* Primary Print to PDF Button */}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all"
              title="Cetak langsung atau Simpan PDF via dialog cetak browser (Ctrl+P)"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / PDF</span>
            </button>

            {/* Isolated Window Print Fallback */}
            <button
              onClick={handlePrintIsolatedWindow}
              className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg flex items-center gap-1.5 transition-colors shadow-sm"
              title="Buka dokumen di tab baru khusus cetak PDF (bebas dari gangguan modal)"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF Tab Baru</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* MAIN BODY: WORKSPACE CANVAS & COLLAPSIBLE SETTINGS PANEL   */}
        {/* ========================================================= */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* MAP DOCUMENT WRAPPER (SCROLLABLE PREVIEW) */}
          <div className="print-document-wrapper flex-1 bg-slate-950/70 p-4 overflow-auto flex items-center justify-center">
            {/* The printable document card */}
            <div
              className={`print-map-document bg-white text-slate-900 shadow-2xl relative transition-all duration-300 ${
                orientation === 'landscape'
                  ? 'w-[1140px] h-[790px] max-w-full'
                  : 'w-[790px] h-[1100px] max-w-full'
              }`}
              style={{
                fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
              }}
            >
              {/* DOUBLE NEATLINE BORDER STANDAR KARTOGRAFI */}
              <div className="w-full h-full p-2 border-[2.5px] border-black bg-white flex flex-col box-border">
                <div className="w-full h-full border border-black p-1.5 flex flex-col box-border">
                  {/* INNER CONTENT GRID (TWO COLUMN LANDSCAPE OR STACKED PORTRAIT) */}
                  <div
                    className={`w-full h-full flex ${
                      orientation === 'landscape' ? 'flex-row gap-2' : 'flex-col gap-2'
                    }`}
                  >
                    {/* ========================================================= */}
                    {/* 1. AREA UTAMA (CANVAS PETA / MAP VIEW)                   */}
                    {/* ========================================================= */}
                    <div
                      className={`relative border-2 border-black bg-slate-900 overflow-hidden flex flex-col ${
                        orientation === 'landscape' ? 'w-[73%] h-full' : 'w-full h-[66%]'
                      }`}
                    >
                      {/* COORDINATE TICKS BORDER (UTM & GEOGRAFI ON FRAME) */}
                      {/* Top Coordinate Ticks (Longitude / Easting) */}
                      <div className="absolute top-0 left-0 right-0 h-4 bg-white/90 z-10 border-b border-black flex items-center justify-between px-6 text-[8.5px] font-mono font-bold text-black pointer-events-none">
                        <span>{formatDMS(mapBounds.west + 0.002, false)} • {formatUTMMeter(mapBounds.west + 0.002, false)}</span>
                        <span>{formatDMS((mapBounds.west + mapBounds.east) / 2, false)}</span>
                        <span>{formatDMS(mapBounds.east - 0.002, false)} • {formatUTMMeter(mapBounds.east - 0.002, false)}</span>
                      </div>

                      {/* Bottom Coordinate Ticks (Longitude / Easting) */}
                      <div className="absolute bottom-0 left-0 right-0 h-4 bg-white/90 z-10 border-t border-black flex items-center justify-between px-6 text-[8.5px] font-mono font-bold text-black pointer-events-none">
                        <span>{formatDMS(mapBounds.west + 0.002, false)}</span>
                        <span>{formatDMS((mapBounds.west + mapBounds.east) / 2, false)}</span>
                        <span>{formatDMS(mapBounds.east - 0.002, false)}</span>
                      </div>

                      {/* Left Coordinate Ticks (Latitude / Northing) */}
                      <div className="absolute top-4 bottom-4 left-0 w-4 bg-white/90 z-10 border-r border-black flex flex-col justify-between items-center py-4 text-[8px] font-mono font-bold text-black pointer-events-none">
                        <span className="-rotate-90 whitespace-nowrap">{formatDMS(mapBounds.north - 0.001, true)}</span>
                        <span className="-rotate-90 whitespace-nowrap">{formatDMS((mapBounds.north + mapBounds.south) / 2, true)}</span>
                        <span className="-rotate-90 whitespace-nowrap">{formatDMS(mapBounds.south + 0.001, true)}</span>
                      </div>

                      {/* Right Coordinate Ticks (Latitude / Northing) */}
                      <div className="absolute top-4 bottom-4 right-0 w-4 bg-white/90 z-10 border-l border-black flex flex-col justify-between items-center py-4 text-[8px] font-mono font-bold text-black pointer-events-none">
                        <span className="rotate-90 whitespace-nowrap">{formatUTMMeter(mapBounds.north - 0.001, true)}</span>
                        <span className="rotate-90 whitespace-nowrap">{formatDMS((mapBounds.north + mapBounds.south) / 2, true)}</span>
                        <span className="rotate-90 whitespace-nowrap">{formatUTMMeter(mapBounds.south + 0.001, true)}</span>
                      </div>

                      {/* Interactive Leaflet Map Instance */}
                      <div
                        ref={mainMapContainerRef}
                        className="w-full h-full relative z-0"
                        style={{ cursor: 'grab' }}
                      />

                      {/* Floating Smooth Zoom & Navigation Controls on Canvas */}
                      <div className="no-print absolute top-6 left-6 z-20 flex flex-col gap-1 bg-slate-900/90 backdrop-blur-md border border-slate-700/90 rounded-lg p-1 shadow-2xl">
                        <button
                          onClick={handleMainZoomIn}
                          title="Perbesar Peta (Zoom In Halus 0.5x)"
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 text-cyan-400" />
                        </button>
                        <button
                          onClick={handleMainZoomOut}
                          title="Perkecil Peta (Zoom Out Halus 0.5x)"
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        >
                          <Minus className="w-4 h-4 text-cyan-400" />
                        </button>
                        <div className="h-px bg-slate-800 my-0.5" />
                        <button
                          onClick={() => fitMainMapToPolygons()}
                          title="Pusatkan ke Poligon Bidang"
                          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                        </button>
                      </div>

                      {/* Floating Guidance Badge */}
                      <div className="no-print absolute top-6 right-6 z-20 bg-slate-900/85 backdrop-blur-sm border border-slate-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-mono flex items-center gap-1.5 pointer-events-none shadow-lg">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Geser: Klik Kiri / Kanan Mouse • Zoom Halus (0.1)</span>
                      </div>
                    </div>

                    {/* ========================================================= */}
                    {/* 2. PANEL INFORMASI / SIDEBAR ADMINISTRASI (KOLOM KANAN)   */}
                    {/* ========================================================= */}
                    <div
                      className={`border-2 border-black flex flex-col bg-white overflow-hidden divide-y-2 divide-black text-black ${
                        orientation === 'landscape' ? 'w-[27%] h-full' : 'w-full h-[34%]'
                      }`}
                    >
                      {/* =================================================== */}
                      {/* A. LOGO DAN KOP INSTANSI (HEADER)                   */}
                      {/* =================================================== */}
                      <div className="p-2.5 text-center flex flex-col items-center justify-center bg-slate-50/50">
                        {/* Official Emblem Logo */}
                        <div className="mb-1.5 flex items-center justify-center">
                          {selectedLogoPreset === 'custom' && customLogoUrl ? (
                            <img
                              src={customLogoUrl}
                              alt="Logo Instansi"
                              className="h-11 w-auto object-contain"
                            />
                          ) : selectedLogoPreset === 'atrbpn' ? (
                            /* ATR/BPN Emblem Vector */
                            <svg className="w-10 h-10 text-amber-600" viewBox="0 0 100 100" fill="currentColor">
                              <circle cx="50" cy="50" r="46" fill="#1e3a8a" stroke="#d97706" strokeWidth="4" />
                              <circle cx="50" cy="50" r="32" fill="#d97706" />
                              <path d="M50 20 L58 38 L78 38 L62 50 L68 70 L50 58 L32 70 L38 50 L22 38 L42 38 Z" fill="#ffffff" />
                              <circle cx="50" cy="50" r="10" fill="#dc2626" />
                            </svg>
                          ) : (
                            /* Indonesian Garuda Pancasila Standard Cartographic Vector */
                            <svg className="w-11 h-11 text-amber-700" viewBox="0 0 100 100" fill="currentColor">
                              <path d="M50 10 C46 15 32 15 28 28 C26 35 22 45 15 52 C22 53 32 50 35 45 C32 55 28 65 30 75 C34 70 38 65 42 62 C40 70 42 78 45 84 C48 80 50 75 50 70 C50 75 52 80 55 84 C58 78 60 70 58 62 C62 65 66 70 70 75 C72 65 68 55 65 45 C68 50 78 53 85 52 C78 45 74 35 72 28 C68 15 54 15 50 10 Z" fill="#d97706" />
                              <path d="M42 34 H58 V52 H42 Z" fill="#dc2626" />
                              <path d="M42 52 H58 V68 H42 Z" fill="#ffffff" stroke="#991b1b" strokeWidth="1" />
                              <circle cx="50" cy="50" r="5" fill="#facc15" />
                            </svg>
                          )}
                        </div>

                        {/* Instansi Text Lines (Editable) */}
                        <div className="space-y-0.5">
                          <h4 className="text-[10px] font-bold tracking-wider text-slate-800 uppercase leading-tight">
                            {instansiLevel1}
                          </h4>
                          <h3 className="text-[11px] font-extrabold tracking-tight text-black uppercase leading-snug">
                            {instansiLevel2}
                          </h3>
                          <h5 className="text-[9px] font-semibold text-slate-700 uppercase tracking-wide">
                            {instansiLevel3}
                          </h5>
                        </div>
                      </div>

                      {/* =================================================== */}
                      {/* B. JUDUL PETA & NOMOR DOKUMEN                       */}
                      {/* =================================================== */}
                      <div className="p-2.5 text-center bg-white space-y-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          DOKUMEN SPASIAL PERTANAHAN
                        </div>
                        <h2 className="text-[12px] font-black text-black uppercase tracking-tight leading-tight">
                          {mapTitle}
                        </h2>
                        <p className="text-[10px] font-medium text-slate-800 leading-tight">
                          {mapSubtitle}
                        </p>
                        <div className="text-[8.5px] font-mono text-slate-600 pt-0.5">
                          {docNumber}
                        </div>
                      </div>

                      {/* =================================================== */}
                      {/* C. PETUNJUK ARAH DAN SKALA                          */}
                      {/* =================================================== */}
                      <div className="p-2 bg-slate-50/50 flex flex-col items-center justify-center space-y-1.5">
                        <div className="flex items-center justify-between w-full px-3">
                          {/* Compass North Arrow */}
                          <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black font-serif text-black leading-none">U</span>
                            <div className="relative w-8 h-8 flex items-center justify-center my-0.5">
                              <svg className="w-8 h-8" viewBox="0 0 100 100">
                                <polygon points="50,5 60,50 50,42" fill="#000000" />
                                <polygon points="50,5 40,50 50,42" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                                <polygon points="50,95 60,50 50,58" fill="#ffffff" stroke="#000000" strokeWidth="2" />
                                <polygon points="50,95 40,50 50,58" fill="#000000" />
                                <circle cx="50" cy="50" r="4" fill="#000000" />
                              </svg>
                            </div>
                            <span className="text-[8px] font-black font-serif text-slate-600 leading-none">N</span>
                          </div>

                          {/* Numeric & Verbal Scale */}
                          <div className="text-center flex-1 px-2 space-y-0.5">
                            <div className="text-[11px] font-extrabold font-mono text-black">
                              SKALA {customScaleText}
                            </div>
                            <div className="text-[8.5px] text-slate-700 font-medium">
                              ({scaleComparisonText})
                            </div>
                            {/* Graphic Scale Bar (Alternating Black and White) */}
                            <div className="pt-1 flex flex-col items-center">
                              <div className="w-36 h-2 border border-black flex overflow-hidden">
                                <div className="w-1/4 h-full bg-black" />
                                <div className="w-1/4 h-full bg-white" />
                                <div className="w-1/4 h-full bg-black" />
                                <div className="w-1/4 h-full bg-white" />
                              </div>
                              <div className="w-36 flex justify-between text-[7.5px] font-mono font-bold text-black pt-0.5">
                                <span>0</span>
                                <span>25</span>
                                <span>50</span>
                                <span>75</span>
                                <span>100m</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Projection Details */}
                        <div className="w-full border-t border-slate-300 pt-1 px-1 grid grid-cols-2 text-[8px] text-slate-700 leading-relaxed font-sans">
                          <div>
                            <span className="font-semibold text-black">Proyeksi:</span> {projectionSystem}
                          </div>
                          <div>
                            <span className="font-semibold text-black">Sistem Grid:</span> Geografi & UTM
                          </div>
                          <div>
                            <span className="font-semibold text-black">Datum:</span> {datum}
                          </div>
                          <div>
                            <span className="font-semibold text-black">Zona:</span> {utmZone}
                          </div>
                        </div>
                      </div>

                      {/* =================================================== */}
                      {/* D. KOTAK LEGENDA (LEGEND BOX)                       */}
                      {/* =================================================== */}
                      <div className="p-2 space-y-1 bg-white">
                        <div className="text-[10px] font-black uppercase tracking-wider text-black border-b border-black pb-0.5">
                          LEGENDA
                        </div>
                        <div className="space-y-1 text-[8.5px] font-medium text-slate-800 pt-0.5">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-3 border-2 border-red-600 bg-red-600/25 shrink-0" />
                            <span className="leading-tight">
                              {legendItems[0]?.label || 'Delineasi berdasarkan Peta Bidang BHUMI ATR/BPN'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-5 h-3 border-2 border-yellow-500 bg-yellow-500/25 shrink-0" />
                            <span className="leading-tight">
                              {legendItems[1]?.label || 'Delineasi berdasarkan Koordinat PKKPR'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-5 h-3 border-2 border-dashed border-sky-500 bg-sky-500/15 shrink-0" />
                            <span className="leading-tight">
                              {legendItems[2]?.label || 'Batas Bidang Tambahan / Sekitarnya'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="w-5 flex items-center justify-center shrink-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white inline-block shadow-sm" />
                            </div>
                            <span className="leading-tight">
                              {legendItems[3]?.label || 'Titik Patok Batas Geodesi (BPN)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* =================================================== */}
                      {/* E. PETA LOKASI / PETA ORIENTASI (INSET MAP)         */}
                      {/* =================================================== */}
                      <div className="p-2 space-y-1 bg-slate-50/50 flex-1 flex flex-col min-h-[120px]">
                        <div className="text-[9.5px] font-black uppercase tracking-wider text-black border-b border-black pb-0.5 flex items-center justify-between">
                          <span>PETA ORIENTASI (INSET)</span>
                          <div className="no-print flex items-center gap-1 font-mono text-[8px]">
                            <button
                              onClick={() => handleInsetZoom(0.5)}
                              className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center font-bold text-black"
                              title="Perbesar Peta Inset"
                            >
                              +
                            </button>
                            <button
                              onClick={() => handleInsetZoom(-0.5)}
                              className="w-4 h-4 rounded bg-slate-200 hover:bg-slate-300 border border-slate-300 flex items-center justify-center font-bold text-black"
                              title="Perkecil Peta Inset"
                            >
                              -
                            </button>
                            <span className="text-[7.5px] text-slate-600">Z:{insetZoom.toFixed(1)}</span>
                          </div>
                        </div>

                        {/* Interactive Inset Mini Map */}
                        <div className="flex-1 w-full border border-black rounded relative overflow-hidden bg-slate-200 min-h-[75px]">
                          <div ref={insetMapContainerRef} className="w-full h-full" />
                          <div className="absolute bottom-1 right-1 bg-white/95 px-1 py-0.5 text-[7px] font-mono font-bold text-red-600 border border-red-500 rounded pointer-events-none z-10 shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
                            <span>Lokasi Bidang</span>
                          </div>
                        </div>

                        {/* Dynamic Coordinate Location Caption */}
                        <div className="text-[7.5px] font-mono text-slate-700 text-center leading-tight pt-0.5 space-y-0.5">
                          <div className="font-bold text-red-600 flex items-center justify-center gap-1">
                            <span>Titik:</span>
                            <span>{currentCenterLat.toFixed(5)}°, {currentCenterLng.toFixed(5)}°</span>
                          </div>
                          <div className="text-slate-600 truncate max-w-[220px] mx-auto">
                            {insetLocationText}
                          </div>
                        </div>
                      </div>

                      {/* =================================================== */}
                      {/* F. SUMBER DATA DAN CATATAN KAKI (FOOTER PANEL)      */}
                      {/* =================================================== */}
                      <div className="p-2 space-y-1 bg-white text-[8px] text-slate-700">
                        <div className="font-bold text-black uppercase tracking-wider text-[8.5px] border-b border-slate-300 pb-0.5">
                          SUMBER DATA:
                        </div>
                        <ol className="list-decimal pl-3 space-y-0.5 leading-snug">
                          {dataSources.map((src, idx) => (
                            <li key={idx}>{src}</li>
                          ))}
                        </ol>
                      </div>

                      {/* =================================================== */}
                      {/* G. LEMBAR PENGESAHAN / TANDA TANGAN (OPSIONAL)      */}
                      {/* =================================================== */}
                      {showSignatures && (
                        <div className="p-2 bg-slate-50/60 border-t border-black text-[8px] text-slate-800">
                          <div className="text-right text-[7.5px] font-medium text-slate-600 pb-1">
                            {currentCityDate}
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div>
                              <div className="text-[7.5px] font-medium text-slate-600 mb-6">
                                Mengetahui:
                                <br />
                                <strong>{approverTitle}</strong>
                              </div>
                              <div className="font-bold underline text-black text-[8.5px]">
                                {approverName}
                              </div>
                              <div className="text-[7px] font-mono text-slate-600">{approverNip}</div>
                            </div>
                            <div>
                              <div className="text-[7.5px] font-medium text-slate-600 mb-6">
                                Disurvei & Dibuat Oleh:
                                <br />
                                <strong>{surveyorTitle}</strong>
                              </div>
                              <div className="font-bold underline text-black text-[8.5px]">
                                {surveyorName}
                              </div>
                              <div className="text-[7px] font-mono text-slate-600">Surveyor Pemetaan</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* SLIDE-OUT EDITING DRAWER (SETTINGS PANEL)                 */}
          {/* ========================================================= */}
          {isSettingsOpen && (
            <div className="no-print w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-30 shadow-2xl overflow-y-auto divide-y divide-slate-800 text-xs">
              <div className="p-3 bg-slate-950 flex items-center justify-between">
                <div className="font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Pengaturan Teks & Layer Peta</span>
                </div>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. LAYER ASSIGNMENT MERAH & KUNING */}
              <div className="p-3 space-y-2.5">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  Penetapan Layer Vektor
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-semibold text-red-400 block mb-1 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                      Garis Delineasi Merah (BHUMI ATR/BPN):
                    </label>
                    <select
                      value={redFieldId}
                      onChange={(e) => setRedFieldId(e.target.value)}
                      className="w-full bg-slate-950 border border-red-500/50 rounded-lg p-2 text-xs text-white outline-none"
                    >
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({(f.areaSquareMeters / 10000).toFixed(2)} ha)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-yellow-400 block mb-1 flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
                      Garis Delineasi Kuning (Koordinat PKKPR):
                    </label>
                    <select
                      value={yellowFieldId}
                      onChange={(e) => setYellowFieldId(e.target.value)}
                      className="w-full bg-slate-950 border border-yellow-500/50 rounded-lg p-2 text-xs text-white outline-none"
                    >
                      <option value="">-- Tidak Dipilih / Poligon Tunggal --</option>
                      {fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name} ({(f.areaSquareMeters / 10000).toFixed(2)} ha)
                        </option>
                      ))}
                    </select>
                  </div>

                  {fields.length < 2 && onAddOverlapField && (
                    <button
                      onClick={handleCreateOverlapField}
                      className="w-full py-1.5 px-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 border border-yellow-500/40 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Buat Pasangan Bidang Tumpang Tindih PKKPR
                    </button>
                  )}
                </div>
              </div>

              {/* 2. TEXT INSIDE POLYGONS (SHGB / PKKPR NUMBER) */}
              <div className="p-3 space-y-2.5">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Edit2 className="w-3.5 h-3.5 text-cyan-400" />
                  Label Teks Nomor Bidang
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Nomor Identifikasi Bidang Merah (SHGB / Hak):
                    </label>
                    <input
                      type="text"
                      value={shgbLabel}
                      onChange={(e) => setShgbLabel(e.target.value)}
                      placeholder="Contoh: SHGB NO. 01425 / RIMBO PANJANG"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Nomor Identifikasi Bidang Kuning (PKKPR):
                    </label>
                    <input
                      type="text"
                      value={pkkprLabel}
                      onChange={(e) => setPkkprLabel(e.target.value)}
                      placeholder="Contoh: KOORDINAT PKKPR NO. 503/2024"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              </div>

              {/* 3. KOP INSTANSI & LOGO */}
              <div className="p-3 space-y-2.5">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Logo & Teks Kop Instansi
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Preset Logo:</label>
                    <div className="grid grid-cols-3 gap-1 text-[10px]">
                      <button
                        onClick={() => setSelectedLogoPreset('garuda')}
                        className={`py-1 px-1.5 rounded border text-center font-semibold ${
                          selectedLogoPreset === 'garuda'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Garuda
                      </button>
                      <button
                        onClick={() => setSelectedLogoPreset('atrbpn')}
                        className={`py-1 px-1.5 rounded border text-center font-semibold ${
                          selectedLogoPreset === 'atrbpn'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        ATR/BPN
                      </button>
                      <button
                        onClick={() => setSelectedLogoPreset('custom')}
                        className={`py-1 px-1.5 rounded border text-center font-semibold ${
                          selectedLogoPreset === 'custom'
                            ? 'bg-blue-600 border-blue-400 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        Custom URL
                      </button>
                    </div>
                  </div>

                  {selectedLogoPreset === 'custom' && (
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">URL Logo Kustom:</label>
                      <input
                        type="text"
                        value={customLogoUrl}
                        onChange={(e) => setCustomLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Pemerintah Daerah / Wilayah:</label>
                    <input
                      type="text"
                      value={instansiLevel1}
                      onChange={(e) => setInstansiLevel1(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nama Dinas Instansi:</label>
                    <input
                      type="text"
                      value={instansiLevel2}
                      onChange={(e) => setInstansiLevel2(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Bidang / Sub Instansi:</label>
                    <input
                      type="text"
                      value={instansiLevel3}
                      onChange={(e) => setInstansiLevel3(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 4. JUDUL PETA & KETERANGAN */}
              <div className="p-3 space-y-2.5">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Judul & Keterangan Peta
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Judul Dokumen Peta:</label>
                    <input
                      type="text"
                      value={mapTitle}
                      onChange={(e) => setMapTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Lokasi / Subjudul:</label>
                    <input
                      type="text"
                      value={mapSubtitle}
                      onChange={(e) => setMapSubtitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nomor Surat / Dokumen:</label>
                    <input
                      type="text"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Keterangan Wilayah Peta Inset:</label>
                    <input
                      type="text"
                      value={insetLocationText}
                      onChange={(e) => setInsetLocationText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 5. ZONA UTM & PROYEKSI */}
              <div className="p-3 space-y-2.5">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  Sistem Proyeksi & Zona UTM
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Zona UTM:</label>
                    <select
                      value={utmZone}
                      onChange={(e) => setUtmZone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    >
                      <option value="UTM Zone 50 S">UTM Zone 50 S</option>
                      <option value="UTM Zone 50 N">UTM Zone 50 N</option>
                      <option value="UTM Zone 49 S">UTM Zone 49 S</option>
                      <option value="UTM Zone 49 N">UTM Zone 49 N</option>
                      <option value="UTM Zone 48 S">UTM Zone 48 S</option>
                      <option value="UTM Zone 48 N">UTM Zone 48 N</option>
                      <option value="UTM Zone 47 S">UTM Zone 47 S</option>
                      <option value="UTM Zone 51 S">UTM Zone 51 S</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Datum Geodesi:</label>
                    <input
                      type="text"
                      value={datum}
                      onChange={(e) => setDatum(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 6. SUMBER DATA (4 POIN) */}
              <div className="p-3 space-y-2.5">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-cyan-400" />
                  Sumber Data & Referensi
                </div>
                <div className="space-y-1.5">
                  {dataSources.map((src, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-500 w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={src}
                        onChange={(e) => {
                          const updated = [...dataSources];
                          updated[idx] = e.target.value;
                          setDataSources(updated);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 7. TOGGLE MAP ELEMENTS */}
              <div className="p-3 space-y-2">
                <div className="font-bold text-slate-200 uppercase tracking-wider text-[11px]">
                  Tampilan Elemen Peta
                </div>
                <div className="space-y-1 text-xs">
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLabelsOnMap}
                      onChange={(e) => setShowLabelsOnMap(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600"
                    />
                    <span>Tampilkan Label Nomor Bidang di Peta</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showDimensionsOnMap}
                      onChange={(e) => setShowDimensionsOnMap(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600"
                    />
                    <span>Tampilkan Panjang Sisi di Garis Batas</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showPatokOnMap}
                      onChange={(e) => setShowPatokOnMap(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600"
                    />
                    <span>Tampilkan Titik Patok (P1, P2...)</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSignatures}
                      onChange={(e) => setShowSignatures(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-blue-600"
                    />
                    <span>Tampilkan Kolom Tanda Tangan / Pengesahan</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
