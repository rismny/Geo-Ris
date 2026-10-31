export interface Coordinate {
  lat: number;
  lng: number;
  altitude?: number;
}

export interface SegmentMeasurement {
  index: number;
  start: Coordinate;
  end: Coordinate;
  lengthMeters: number;
  bearingDeg: number;
  midpoint: Coordinate;
}

export interface AngleMeasurement {
  vertexIndex: number;
  vertex: Coordinate;
  angleDeg: number;
  isAcute: boolean; // < 2 degrees
}

export interface PolygonField {
  id: string;
  name: string;
  color: string; // primary reference color
  strokeColor: string; // warna garis bidang
  fillColor: string; // warna isi bidang
  strokeWidth: number; // ketebalan garis (px)
  opacity: number; // transparansi bidang (0 - 1)
  coordinates: Coordinate[];
  visible: boolean;
  isCompleted: boolean;
  createdAt: number;
  // Computed properties
  areaSquareMeters: number;
  perimeterMeters: number;
  dimension: {
    lengthMeters: number; // Panjang bidang (sisi terpanjang / oriented length)
    widthMeters: number; // Lebar bidang (sisi tegak lurus / oriented width)
  };
  segments: SegmentMeasurement[];
  angles: AngleMeasurement[];
  bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
    widthMeters: number; // bounding width
    lengthMeters: number; // bounding length
  };
  hasSelfIntersection: boolean;
  hasAcuteAngle: boolean;
}

export type UnitType = 'ha' | 'm2' | 'km2' | 'are' | 'acre' | 'sqft';

export type BasemapType = 'satellite' | 'google_hybrid' | 'osm' | 'topo' | 'dark';

export interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type: string;
}

export interface RulerSegment {
  index: number;
  start: Coordinate;
  end: Coordinate;
  lengthMeters: number;
  bearingDeg: number;
  midpoint: Coordinate;
  cumulativeDistanceMeters: number;
}

export interface RulerMeasurement {
  points: Coordinate[];
  totalDistanceMeters: number;
  segments: RulerSegment[];
}

export interface SavedProject {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt: number;
  fields: PolygonField[];
  activeFieldId?: string | null;
  basemap?: BasemapType;
  rulerCoords?: Coordinate[];
  preview?: {
    fieldCount: number;
    totalAreaM2: number;
    totalPerimeterM: number;
  };
}
