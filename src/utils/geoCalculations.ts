import * as turf from '@turf/turf';
import { Coordinate, SegmentMeasurement, AngleMeasurement, PolygonField, UnitType, RulerMeasurement, RulerSegment } from '../types/gis';

/**
 * Calculates geodesic distance between two coordinates in meters
 */
export function calculateDistanceMeters(p1: Coordinate, p2: Coordinate): number {
  const from = turf.point([p1.lng, p1.lat]);
  const to = turf.point([p2.lng, p2.lat]);
  return turf.distance(from, to, { units: 'meters' });
}

/**
 * Calculates forward bearing from p1 to p2 in degrees (-180 to 180)
 */
export function calculateBearing(p1: Coordinate, p2: Coordinate): number {
  const from = turf.point([p1.lng, p1.lat]);
  const to = turf.point([p2.lng, p2.lat]);
  return turf.bearing(from, to);
}

/**
 * Calculates geographic midpoint between two coordinates
 */
export function calculateMidpoint(p1: Coordinate, p2: Coordinate): Coordinate {
  const from = turf.point([p1.lng, p1.lat]);
  const to = turf.point([p2.lng, p2.lat]);
  const mid = turf.midpoint(from, to);
  return {
    lat: mid.geometry.coordinates[1],
    lng: mid.geometry.coordinates[0],
  };
}

/**
 * Calculates internal vertex angles for a closed polygon in degrees.
 * Uses polygon winding orientation to ensure true interior angles.
 */
export function calculateInteriorAngles(coords: Coordinate[]): AngleMeasurement[] {
  const n = coords.length;
  if (n < 3) return [];

  // Determine polygon winding order using standard surveyor cross-product on projected coordinates
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const curr = coords[i];
    const next = coords[(i + 1) % n];
    signedArea += (next.lng - curr.lng) * (next.lat + curr.lat);
  }
  // signedArea > 0 means clockwise in standard geographic coordinates (lng x, lat y)
  const isClockwise = signedArea > 0;

  const angles: AngleMeasurement[] = [];

  for (let i = 0; i < n; i++) {
    const prev = coords[(i - 1 + n) % n];
    const curr = coords[i];
    const next = coords[(i + 1) % n];

    // Bearing from curr to prev and curr to next
    const bPrev = (calculateBearing(curr, prev) + 360) % 360;
    const bNext = (calculateBearing(curr, next) + 360) % 360;

    let angleDeg: number;
    if (isClockwise) {
      angleDeg = (bPrev - bNext + 360) % 360;
    } else {
      angleDeg = (bNext - bPrev + 360) % 360;
    }

    // Acute angle threshold (< 2° like in the reference app)
    const isAcute = angleDeg < 2.0;

    angles.push({
      vertexIndex: i,
      vertex: curr,
      angleDeg,
      isAcute,
    });
  }

  return angles;
}

/**
 * Calculates segment measurements (length, bearing, midpoint)
 */
export function calculateSegments(coords: Coordinate[]): SegmentMeasurement[] {
  const n = coords.length;
  if (n < 2) return [];

  const segments: SegmentMeasurement[] = [];
  for (let i = 0; i < n; i++) {
    const start = coords[i];
    const end = coords[(i + 1) % n];

    const lengthMeters = calculateDistanceMeters(start, end);
    const bearingDeg = (calculateBearing(start, end) + 360) % 360;
    const midpoint = calculateMidpoint(start, end);

    segments.push({
      index: i,
      start,
      end,
      lengthMeters,
      bearingDeg,
      midpoint,
    });
  }
  return segments;
}

/**
 * Check if polygon has self-intersecting edges using Turf.js kinks
 */
export function checkSelfIntersection(coords: Coordinate[]): boolean {
  if (coords.length < 4) return false;

  try {
    const ring = coords.map((c) => [c.lng, c.lat]);
    // Close the ring if not already closed
    if (
      ring[0][0] !== ring[ring.length - 1][0] ||
      ring[0][1] !== ring[ring.length - 1][1]
    ) {
      ring.push(ring[0]);
    }
    const poly = turf.polygon([ring]);
    const kinks = turf.kinks(poly);
    return kinks.features.length > 0;
  } catch {
    return false;
  }
}

/**
 * Calculates geodesic area in square meters (EPSG:4326 WGS84)
 */
export function calculateGeodesicArea(coords: Coordinate[]): number {
  if (coords.length < 3) return 0;
  try {
    const ring = coords.map((c) => [c.lng, c.lat]);
    ring.push(ring[0]); // Close ring
    const poly = turf.polygon([ring]);
    return turf.area(poly);
  } catch {
    return 0;
  }
}

/**
 * Calculates authentic oriented bounding dimensions (Panjang & Lebar tanah sesungguhnya)
 */
export function calculateOrientedDimensions(coords: Coordinate[]): { lengthMeters: number; widthMeters: number } {
  if (coords.length < 2) return { lengthMeters: 0, widthMeters: 0 };
  if (coords.length === 2) {
    const len = calculateDistanceMeters(coords[0], coords[1]);
    return { lengthMeters: len, widthMeters: 0 };
  }

  // Centroid
  let avgLat = 0;
  let avgLng = 0;
  coords.forEach((c) => {
    avgLat += c.lat;
    avgLng += c.lng;
  });
  avgLat /= coords.length;
  avgLng /= coords.length;

  // Convert to local Cartesian in meters
  const cosLat = Math.cos((avgLat * Math.PI) / 180);
  const mPerLat = 110574;
  const mPerLng = 111320 * cosLat;

  const pts = coords.map((c) => ({
    x: (c.lng - avgLng) * mPerLng,
    y: (c.lat - avgLat) * mPerLat,
  }));

  // Test edge rotation angles and step samples
  const anglesToTest: number[] = [];
  for (let i = 0; i < coords.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % coords.length];
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
    anglesToTest.push(angle);
  }
  for (let deg = 0; deg < 90; deg += 5) {
    anglesToTest.push((deg * Math.PI) / 180);
  }

  let minArea = Infinity;
  let bestDim = { lengthMeters: 0, widthMeters: 0 };

  for (const angle of anglesToTest) {
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const pt of pts) {
      const rx = pt.x * cos - pt.y * sin;
      const ry = pt.x * sin + pt.y * cos;
      if (rx < minX) minX = rx;
      if (rx > maxX) maxX = rx;
      if (ry < minY) minY = ry;
      if (ry > maxY) maxY = ry;
    }

    const spanX = Math.max(0, maxX - minX);
    const spanY = Math.max(0, maxY - minY);
    const area = spanX * spanY;

    if (area < minArea && area > 0) {
      minArea = area;
      const lengthMeters = Math.max(spanX, spanY);
      const widthMeters = Math.min(spanX, spanY);
      bestDim = { lengthMeters, widthMeters };
    }
  }

  return bestDim;
}

/**
 * Calculates bounding box and approximate width and length
 */
export function calculateBoundsAndDimensions(coords: Coordinate[]) {
  if (coords.length === 0) {
    return {
      minLat: 0,
      maxLat: 0,
      minLng: 0,
      maxLng: 0,
      widthMeters: 0,
      lengthMeters: 0,
    };
  }

  let minLat = coords[0].lat;
  let maxLat = coords[0].lat;
  let minLng = coords[0].lng;
  let maxLng = coords[0].lng;

  for (const c of coords) {
    if (c.lat < minLat) minLat = c.lat;
    if (c.lat > maxLat) maxLat = c.lat;
    if (c.lng < minLng) minLng = c.lng;
    if (c.lng > maxLng) maxLng = c.lng;
  }

  // Width: East-West distance along mid-latitude
  const midLat = (minLat + maxLat) / 2;
  const widthMeters = calculateDistanceMeters(
    { lat: midLat, lng: minLng },
    { lat: midLat, lng: maxLng }
  );

  // Length: North-South distance along mid-longitude
  const midLng = (minLng + maxLng) / 2;
  const lengthMeters = calculateDistanceMeters(
    { lat: minLat, lng: midLng },
    { lat: maxLat, lng: midLng }
  );

  return {
    minLat,
    maxLat,
    minLng,
    maxLng,
    widthMeters,
    lengthMeters,
  };
}

export interface RawPolygonField {
  id: string;
  name: string;
  color?: string;
  strokeColor?: string;
  fillColor?: string;
  strokeWidth?: number;
  opacity?: number;
  coordinates: Coordinate[];
  visible: boolean;
  isCompleted?: boolean;
  createdAt: number;
}

/**
 * Recomputes all geometric metrics for a polygon field
 */
export function updatePolygonMetrics(field: RawPolygonField & Partial<PolygonField>): PolygonField {
  const coords = field.coordinates || [];
  const isCompleted = field.isCompleted !== undefined ? field.isCompleted : coords.length >= 3;

  const defaultColor = field.color || '#06b6d4';
  const strokeColor = field.strokeColor || defaultColor;
  const fillColor = field.fillColor || defaultColor;
  const strokeWidth = field.strokeWidth || 3;
  const opacity = field.opacity !== undefined ? field.opacity : 0.35;

  const areaSquareMeters = isCompleted ? calculateGeodesicArea(coords) : 0;
  const segments = calculateSegments(coords);
  const perimeterMeters = segments.reduce((acc, s) => acc + s.lengthMeters, 0);
  const angles = isCompleted ? calculateInteriorAngles(coords) : [];
  const bounds = calculateBoundsAndDimensions(coords);
  const dimension = calculateOrientedDimensions(coords);
  const hasSelfIntersection = isCompleted ? checkSelfIntersection(coords) : false;
  const hasAcuteAngle = angles.some((a) => a.isAcute);

  return {
    ...field,
    color: defaultColor,
    strokeColor,
    fillColor,
    strokeWidth,
    opacity,
    isCompleted,
    areaSquareMeters,
    perimeterMeters,
    dimension,
    segments,
    angles,
    bounds,
    hasSelfIntersection,
    hasAcuteAngle,
  };
}

/**
 * Convert area into different units
 */
export function formatArea(areaM2: number, unit: UnitType): { value: string; unitLabel: string } {
  switch (unit) {
    case 'ha': {
      const ha = areaM2 / 10000;
      return {
        value: ha.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        unitLabel: 'ha',
      };
    }
    case 'm2':
      return {
        value: areaM2.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        unitLabel: 'm²',
      };
    case 'km2': {
      const km2 = areaM2 / 1000000;
      return {
        value: km2.toLocaleString('id-ID', { minimumFractionDigits: 4, maximumFractionDigits: 4 }),
        unitLabel: 'km²',
      };
    }
    case 'are': {
      const are = areaM2 / 100;
      return {
        value: are.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        unitLabel: 'are',
      };
    }
    case 'acre': {
      const acre = areaM2 * 0.000247105;
      return {
        value: acre.toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
        unitLabel: 'acre',
      };
    }
    case 'sqft': {
      const sqft = areaM2 * 10.7639;
      return {
        value: sqft.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
        unitLabel: 'ft²',
      };
    }
  }
}

/**
 * Formats distance with meters or kilometers
 */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km`;
  }
  return `${meters.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`;
}

/**
 * Returns compass direction abbreviation (Indonesian/International) for bearing in degrees
 */
export function getCompassDirection(bearingDeg: number): string {
  const norm = ((bearingDeg % 360) + 360) % 360;
  const directions = [
    { label: 'U (Utara)', min: 337.5, max: 360 },
    { label: 'U (Utara)', min: 0, max: 22.5 },
    { label: 'TL (Timur Laut)', min: 22.5, max: 67.5 },
    { label: 'T (Timur)', min: 67.5, max: 112.5 },
    { label: 'TG (Tenggara)', min: 112.5, max: 157.5 },
    { label: 'S (Selatan)', min: 157.5, max: 202.5 },
    { label: 'BD (Barat Daya)', min: 202.5, max: 247.5 },
    { label: 'B (Barat)', min: 247.5, max: 292.5 },
    { label: 'BL (Barat Laut)', min: 292.5, max: 337.5 },
  ];
  const found = directions.find((d) => norm >= d.min && norm < d.max);
  return found ? found.label : 'U';
}

/**
 * Calculates comprehensive ruler measurement metrics for a polyline of points
 */
export function calculateRulerMetrics(points: Coordinate[]): RulerMeasurement {
  if (points.length < 2) {
    return {
      points,
      totalDistanceMeters: 0,
      segments: [],
    };
  }

  const segments: RulerSegment[] = [];
  let totalDistanceMeters = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i];
    const end = points[i + 1];
    const segDist = calculateDistanceMeters(start, end);
    const bearingDeg = (calculateBearing(start, end) + 360) % 360;
    const midpoint = calculateMidpoint(start, end);
    totalDistanceMeters += segDist;

    segments.push({
      index: i,
      start,
      end,
      lengthMeters: segDist,
      bearingDeg,
      midpoint,
      cumulativeDistanceMeters: totalDistanceMeters,
    });
  }

  return {
    points,
    totalDistanceMeters,
    segments,
  };
}
