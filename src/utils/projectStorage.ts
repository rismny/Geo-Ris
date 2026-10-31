import { PolygonField, Coordinate, BasemapType, SavedProject } from '../types/gis';
import { updatePolygonMetrics } from './geoCalculations';
import { INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD } from '../data/sampleFields';

const AUTOSAVE_STORAGE_KEY = 'ysr_peta_pro_autosave_v1';
const PROJECTS_LIST_STORAGE_KEY = 'ysr_peta_pro_projects_list_v1';
const CURRENT_PROJECT_META_KEY = 'ysr_peta_pro_current_meta_v1';

export interface WorkspaceState {
  projectName: string;
  projectId?: string;
  description?: string;
  fields: PolygonField[];
  activeFieldId: string | null;
  basemap?: BasemapType;
  rulerCoords?: Coordinate[];
  lastSavedAt: number;
}

/**
 * Load automatic persistent workspace state from localStorage.
 */
export function loadAutoSavedWorkspace(): WorkspaceState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.fields) || parsed.fields.length === 0) {
      return null;
    }

    // Recompute metrics for every field to ensure consistency
    const refreshedFields: PolygonField[] = parsed.fields.map((f: any) =>
      updatePolygonMetrics({
        id: f.id || `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: f.name || 'Bidang Tanah',
        color: f.color || '#06b6d4',
        strokeColor: f.strokeColor || f.color || '#06b6d4',
        fillColor: f.fillColor || '#0891b2',
        strokeWidth: typeof f.strokeWidth === 'number' ? f.strokeWidth : 3,
        opacity: typeof f.opacity === 'number' ? f.opacity : 0.35,
        coordinates: Array.isArray(f.coordinates) ? f.coordinates : [],
        visible: f.visible !== false,
        isCompleted: f.isCompleted !== false,
        createdAt: f.createdAt || Date.now(),
      })
    );

    return {
      projectName: parsed.projectName || 'Proyek Pengukuran YSR',
      projectId: parsed.projectId,
      description: parsed.description || '',
      fields: refreshedFields,
      activeFieldId: parsed.activeFieldId || (refreshedFields[0]?.id ?? null),
      basemap: parsed.basemap || 'satellite',
      rulerCoords: Array.isArray(parsed.rulerCoords) ? parsed.rulerCoords : [],
      lastSavedAt: parsed.lastSavedAt || Date.now(),
    };
  } catch (err) {
    console.error('Gagal membaca data autosave YSR PETA PRO:', err);
    return null;
  }
}

/**
 * Automatically persist workspace state into localStorage.
 */
export function autoSaveWorkspace(state: {
  projectName: string;
  projectId?: string;
  description?: string;
  fields: PolygonField[];
  activeFieldId: string | null;
  basemap?: BasemapType;
  rulerCoords?: Coordinate[];
}): number {
  const timestamp = Date.now();
  try {
    const payload: WorkspaceState = {
      projectName: state.projectName,
      projectId: state.projectId,
      description: state.description,
      fields: state.fields,
      activeFieldId: state.activeFieldId,
      basemap: state.basemap,
      rulerCoords: state.rulerCoords,
      lastSavedAt: timestamp,
    };
    localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('Gagal menyimpan otomatis ke localStorage:', err);
  }
  return timestamp;
}

/**
 * Get all explicitly saved named projects in local browser storage.
 */
export function getSavedProjectsList(): SavedProject[] {
  try {
    const raw = localStorage.getItem(PROJECTS_LIST_STORAGE_KEY);
    if (!raw) return [];
    const list: SavedProject[] = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  } catch (err) {
    console.error('Gagal membaca daftar proyek:', err);
    return [];
  }
}

/**
 * Save current project to the project list in browser storage.
 */
export function saveProjectToList(params: {
  id?: string;
  name: string;
  description?: string;
  fields: PolygonField[];
  activeFieldId?: string | null;
  basemap?: BasemapType;
  rulerCoords?: Coordinate[];
}): SavedProject {
  const existingList = getSavedProjectsList();
  const id = params.id || `proj-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = Date.now();

  const totalAreaM2 = params.fields.reduce((acc, f) => acc + (f.areaSquareMeters || 0), 0);
  const totalPerimeterM = params.fields.reduce((acc, f) => acc + (f.perimeterMeters || 0), 0);

  const existingProject = existingList.find((p) => p.id === id);

  const projectRecord: SavedProject = {
    id,
    name: params.name.trim() || 'Proyek Tanpa Judul',
    description: params.description || '',
    createdAt: existingProject ? existingProject.createdAt : now,
    updatedAt: now,
    fields: params.fields,
    activeFieldId: params.activeFieldId || null,
    basemap: params.basemap || 'satellite',
    rulerCoords: params.rulerCoords || [],
    preview: {
      fieldCount: params.fields.length,
      totalAreaM2,
      totalPerimeterM,
    },
  };

  const updatedList = [
    projectRecord,
    ...existingList.filter((p) => p.id !== id),
  ];

  try {
    localStorage.setItem(PROJECTS_LIST_STORAGE_KEY, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Gagal menyimpan proyek ke daftar:', err);
  }

  return projectRecord;
}

/**
 * Delete a saved project from browser storage.
 */
export function deleteSavedProject(id: string): SavedProject[] {
  const existingList = getSavedProjectsList();
  const filtered = existingList.filter((p) => p.id !== id);
  try {
    localStorage.setItem(PROJECTS_LIST_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error('Gagal menghapus proyek:', err);
  }
  return filtered;
}

/**
 * Export project as a downloadable .ysr or .json file
 */
export function downloadProjectFile(projectData: {
  name: string;
  description?: string;
  fields: PolygonField[];
  activeFieldId?: string | null;
  basemap?: BasemapType;
}) {
  const fileData = {
    app: 'YSR PETA PRO',
    appVersion: '2.0',
    exportDate: new Date().toISOString(),
    projectName: projectData.name,
    description: projectData.description || '',
    basemap: projectData.basemap || 'satellite',
    activeFieldId: projectData.activeFieldId || null,
    fields: projectData.fields,
    summary: {
      totalFields: projectData.fields.length,
      totalAreaM2: projectData.fields.reduce((sum, f) => sum + (f.areaSquareMeters || 0), 0),
      totalPatok: projectData.fields.reduce((sum, f) => sum + f.coordinates.length, 0),
    },
  };

  const jsonStr = JSON.stringify(fileData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const safeName = projectData.name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 40);
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `ysr_proyek_${safeName || 'data'}_${dateStr}.ysr`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parse uploaded .ysr or .json project file.
 */
export function parseProjectFile(fileContent: string): {
  projectName: string;
  description?: string;
  fields: PolygonField[];
  activeFieldId?: string | null;
  basemap?: BasemapType;
} {
  const parsed = JSON.parse(fileContent);

  if (!parsed || (!Array.isArray(parsed.fields) && !Array.isArray(parsed.features))) {
    throw new Error('Format file proyek YSR tidak valid atau rusak.');
  }

  // Handle standard YSR project format
  let rawFields = parsed.fields;

  // Fallback if imported GeoJSON FeatureCollection was given
  if (!rawFields && Array.isArray(parsed.features)) {
    rawFields = parsed.features
      .filter((feat: any) => feat.geometry && feat.geometry.type === 'Polygon')
      .map((feat: any, idx: number) => {
        const ring = feat.geometry.coordinates[0] || [];
        const coords = ring.slice(0, -1).map((pt: any) => ({ lat: pt[1], lng: pt[0] }));
        return {
          id: `field-${Date.now()}-${idx}`,
          name: feat.properties?.name || `Bidang Impor ${idx + 1}`,
          color: '#06b6d4',
          coordinates: coords,
          visible: true,
          isCompleted: true,
          createdAt: Date.now(),
        };
      });
  }

  const fields: PolygonField[] = (rawFields || []).map((f: any, idx: number) => {
    const coords: Coordinate[] = (f.coordinates || []).map((c: any) => ({
      lat: Number(c.lat),
      lng: Number(c.lng),
      altitude: c.altitude !== undefined ? Number(c.altitude) : undefined,
    }));

    return updatePolygonMetrics({
      id: f.id || `field-${Date.now()}-${idx}`,
      name: f.name || `Bidang Tanah ${idx + 1}`,
      color: f.color || f.strokeColor || '#06b6d4',
      strokeColor: f.strokeColor || f.color || '#06b6d4',
      fillColor: f.fillColor || '#0891b2',
      strokeWidth: typeof f.strokeWidth === 'number' ? f.strokeWidth : 3,
      opacity: typeof f.opacity === 'number' ? f.opacity : 0.35,
      coordinates: coords,
      visible: f.visible !== false,
      isCompleted: f.isCompleted !== false,
      createdAt: f.createdAt || Date.now(),
    });
  });

  return {
    projectName: parsed.projectName || 'Proyek YSR Terimpor',
    description: parsed.description || '',
    fields,
    activeFieldId: parsed.activeFieldId || (fields[0]?.id ?? null),
    basemap: parsed.basemap || 'satellite',
  };
}

/**
 * Returns fresh sample fields (Kebun Sawit Blok A & B)
 */
export function getSampleFields(): PolygonField[] {
  return [INITIAL_SAMPLE_FIELD, SECOND_SAMPLE_FIELD];
}
