import JSZip from 'jszip';
import { Coordinate, PolygonField } from '../types/gis';
import { updatePolygonMetrics } from './geoCalculations';

const PALETTE = [
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#14b8a6', // Teal
];

/**
 * Extracts coordinates from KML coordinates text: "lng,lat,alt lng,lat,alt"
 */
function parseCoordinateString(coordStr: string): Coordinate[] {
  const result: Coordinate[] = [];
  const tokens = coordStr.trim().split(/\s+/);

  for (const token of tokens) {
    if (!token) continue;
    const parts = token.split(',');
    if (parts.length >= 2) {
      const lng = parseFloat(parts[0]);
      const lat = parseFloat(parts[1]);
      const altitude = parts[2] ? parseFloat(parts[2]) : undefined;
      if (!isNaN(lat) && !isNaN(lng)) {
        result.push({ lat, lng, altitude });
      }
    }
  }

  // Remove duplicate closing point if present in LinearRing
  if (result.length > 2) {
    const first = result[0];
    const last = result[result.length - 1];
    if (Math.abs(first.lat - last.lat) < 1e-8 && Math.abs(first.lng - last.lng) < 1e-8) {
      result.pop();
    }
  }

  return result;
}

/**
 * Parses KML XML string and extracts all polygon fields
 */
export function parseKMLString(kmlText: string): PolygonField[] {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(kmlText, 'text/xml');
  const placemarks = xmlDoc.getElementsByTagName('Placemark');
  const fields: PolygonField[] = [];

  let colorIdx = 0;

  for (let i = 0; i < placemarks.length; i++) {
    const pm = placemarks[i];
    const nameEl = pm.getElementsByTagName('name')[0];
    const name = nameEl?.textContent?.trim() || `Bidang Impor ${fields.length + 1}`;

    // Look for Polygon coordinates
    const polygonEls = pm.getElementsByTagName('Polygon');
    if (polygonEls.length > 0) {
      for (let j = 0; j < polygonEls.length; j++) {
        const poly = polygonEls[j];
        const coordEls = poly.getElementsByTagName('coordinates');
        if (coordEls.length > 0) {
          const coordText = coordEls[0].textContent || '';
          const coordinates = parseCoordinateString(coordText);
          if (coordinates.length >= 3) {
            const rawField = {
              id: `field-${Date.now()}-${fields.length}-${Math.random().toString(36).slice(2, 7)}`,
              name: polygonEls.length > 1 ? `${name} (Bagian ${j + 1})` : name,
              color: PALETTE[colorIdx % PALETTE.length],
              opacity: 0.35,
              coordinates,
              visible: true,
              isCompleted: true,
              createdAt: Date.now(),
            };
            fields.push(updatePolygonMetrics(rawField));
            colorIdx++;
          }
        }
      }
      continue;
    }

    // Look for LineString coordinates as potential closed paths
    const lineEls = pm.getElementsByTagName('LineString');
    if (lineEls.length > 0) {
      for (let j = 0; j < lineEls.length; j++) {
        const line = lineEls[j];
        const coordEls = line.getElementsByTagName('coordinates');
        if (coordEls.length > 0) {
          const coordText = coordEls[0].textContent || '';
          const coordinates = parseCoordinateString(coordText);
          if (coordinates.length >= 3) {
            const rawField = {
              id: `field-${Date.now()}-${fields.length}-${Math.random().toString(36).slice(2, 7)}`,
              name: lineEls.length > 1 ? `${name} (Garis ${j + 1})` : name,
              color: PALETTE[colorIdx % PALETTE.length],
              opacity: 0.35,
              coordinates,
              visible: true,
              isCompleted: true,
              createdAt: Date.now(),
            };
            fields.push(updatePolygonMetrics(rawField));
            colorIdx++;
          }
        }
      }
    }
  }

  // Fallback: If no Placemark wrapper, search direct coordinates
  if (fields.length === 0) {
    const directCoords = xmlDoc.getElementsByTagName('coordinates');
    for (let k = 0; k < directCoords.length; k++) {
      const coordText = directCoords[k].textContent || '';
      const coordinates = parseCoordinateString(coordText);
      if (coordinates.length >= 3) {
        const rawField = {
          id: `field-${Date.now()}-${fields.length}-${Math.random().toString(36).slice(2, 7)}`,
          name: `Bidang Terdeteksi ${fields.length + 1}`,
          color: PALETTE[colorIdx % PALETTE.length],
          opacity: 0.35,
          coordinates,
          visible: true,
          isCompleted: true,
          createdAt: Date.now(),
        };
        fields.push(updatePolygonMetrics(rawField));
        colorIdx++;
      }
    }
  }

  return fields;
}

/**
 * Parses KMZ (zipped KML) buffer and extracts polygon fields
 */
export async function parseKMZBuffer(arrayBuffer: ArrayBuffer): Promise<PolygonField[]> {
  const zip = await JSZip.loadAsync(arrayBuffer);
  let kmlFile: JSZip.JSZipObject | null = null;

  // Search for .kml file in zip archive
  zip.forEach((relativePath, file) => {
    if (relativePath.toLowerCase().endsWith('.kml') && !kmlFile) {
      kmlFile = file;
    }
  });

  if (!kmlFile) {
    throw new Error('Tidak ditemukan file KML di dalam arsip KMZ.');
  }

  const kmlText = await (kmlFile as JSZip.JSZipObject).async('text');
  return parseKMLString(kmlText);
}

/**
 * Parses GeoJSON text and extracts polygon fields
 */
export function parseGeoJSONString(geojsonText: string): PolygonField[] {
  const data = JSON.parse(geojsonText);
  const fields: PolygonField[] = [];
  let colorIdx = 0;

  const extractCoords = (geometry: any, propName?: string) => {
    if (!geometry) return;
    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates;
      if (rings && rings.length > 0) {
        const ring = rings[0];
        const coordinates: Coordinate[] = ring.map((pt: number[]) => ({
          lng: pt[0],
          lat: pt[1],
          altitude: pt[2],
        }));
        // Remove duplicate end point if closed
        if (coordinates.length > 2) {
          const first = coordinates[0];
          const last = coordinates[coordinates.length - 1];
          if (Math.abs(first.lat - last.lat) < 1e-8 && Math.abs(first.lng - last.lng) < 1e-8) {
            coordinates.pop();
          }
        }
        if (coordinates.length >= 3) {
          fields.push(
            updatePolygonMetrics({
              id: `field-${Date.now()}-${fields.length}-${Math.random().toString(36).slice(2, 7)}`,
              name: propName || `Bidang GeoJSON ${fields.length + 1}`,
              color: PALETTE[colorIdx % PALETTE.length],
              opacity: 0.35,
              coordinates,
              visible: true,
              isCompleted: true,
              createdAt: Date.now(),
            })
          );
          colorIdx++;
        }
      }
    } else if (geometry.type === 'MultiPolygon') {
      const multiRings = geometry.coordinates;
      multiRings.forEach((polyRings: any[], polyIdx: number) => {
        if (polyRings && polyRings.length > 0) {
          const ring = polyRings[0];
          const coordinates: Coordinate[] = ring.map((pt: number[]) => ({
            lng: pt[0],
            lat: pt[1],
            altitude: pt[2],
          }));
          if (coordinates.length > 2) {
            const first = coordinates[0];
            const last = coordinates[coordinates.length - 1];
            if (Math.abs(first.lat - last.lat) < 1e-8 && Math.abs(first.lng - last.lng) < 1e-8) {
              coordinates.pop();
            }
          }
          if (coordinates.length >= 3) {
            fields.push(
              updatePolygonMetrics({
                id: `field-${Date.now()}-${fields.length}-${Math.random().toString(36).slice(2, 7)}`,
                name: `${propName || 'Bidang Multi'} (Bagian ${polyIdx + 1})`,
                color: PALETTE[colorIdx % PALETTE.length],
                opacity: 0.35,
                coordinates,
                visible: true,
                isCompleted: true,
                createdAt: Date.now(),
              })
            );
            colorIdx++;
          }
        }
      });
    }
  };

  if (data.type === 'FeatureCollection' && Array.isArray(data.features)) {
    for (const feat of data.features) {
      const name = feat.properties?.name || feat.properties?.Nama || feat.properties?.title;
      extractCoords(feat.geometry, name);
    }
  } else if (data.type === 'Feature') {
    const name = data.properties?.name || data.properties?.Nama || data.properties?.title;
    extractCoords(data.geometry, name);
  } else if (data.type === 'Polygon' || data.type === 'MultiPolygon') {
    extractCoords(data);
  }

  return fields;
}

/**
 * Generates KML XML string for one or more fields
 */
export function generateKMLString(fields: PolygonField[]): string {
  const activeFields = fields.filter((f) => f.coordinates.length >= 3);

  const placemarksKml = activeFields
    .map((f) => {
      // Hex color in KML is AABBGGRR format
      const strokeHex = (f.strokeColor || f.color).replace('#', '');
      const sR = strokeHex.substring(0, 2);
      const sG = strokeHex.substring(2, 4);
      const sB = strokeHex.substring(4, 6);
      const kmlLineColor = `ff${sB}${sG}${sR}`;

      const fillHex = (f.fillColor || f.color).replace('#', '');
      const fR = fillHex.substring(0, 2);
      const fG = fillHex.substring(2, 4);
      const fB = fillHex.substring(4, 6);
      const alphaHex = Math.round((f.opacity ?? 0.35) * 255).toString(16).padStart(2, '0');
      const kmlFillColor = `${alphaHex}${fB}${fG}${fR}`;

      const coordString = [...f.coordinates, f.coordinates[0]]
        .map((c) => `${c.lng.toFixed(7)},${c.lat.toFixed(7)},0`)
        .join(' ');

      return `
    <Placemark>
      <name><![CDATA[${f.name}]]></name>
      <description><![CDATA[
Panjang Bidang: ${f.dimension ? f.dimension.lengthMeters.toFixed(2) : '-'} m
Lebar Bidang: ${f.dimension ? f.dimension.widthMeters.toFixed(2) : '-'} m
Luas Area: ${(f.areaSquareMeters / 10000).toFixed(4)} ha (${f.areaSquareMeters.toFixed(2)} m²)
Keliling: ${f.perimeterMeters.toFixed(2)} m
Jumlah Titik Patok: ${f.coordinates.length}
      ]]></description>
      <Style>
        <LineStyle>
          <color>${kmlLineColor}</color>
          <width>${f.strokeWidth || 3}</width>
        </LineStyle>
        <PolyStyle>
          <color>${kmlFillColor}</color>
          <fill>1</fill>
          <outline>1</outline>
        </PolyStyle>
      </Style>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>clampToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${coordString}</coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>YSR PETA PRO Ekspor Bidang</name>
    <description>Hasil Pengukuran Peta Polygon YSR PETA PRO (EPSG:4326 WGS84)</description>
    ${placemarksKml}
  </Document>
</kml>`;
}

/**
 * Generates KMZ blob (zip containing doc.kml)
 */
export async function generateKMZBlob(fields: PolygonField[]): Promise<Blob> {
  const kml = generateKMLString(fields);
  const zip = new JSZip();
  zip.file('doc.kml', kml);
  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.google-earth.kmz' });
}

/**
 * Generates GeoJSON string
 */
export function generateGeoJSONString(fields: PolygonField[]): string {
  const activeFields = fields.filter((f) => f.coordinates.length >= 3);

  const features = activeFields.map((f) => {
    const ring = [...f.coordinates, f.coordinates[0]].map((c) => [c.lng, c.lat]);
    return {
      type: 'Feature',
      properties: {
        id: f.id,
        name: f.name,
        color: f.color,
        stroke_color: f.strokeColor,
        fill_color: f.fillColor,
        stroke_width: f.strokeWidth,
        opacity: f.opacity,
        panjang_m: parseFloat(f.dimension.lengthMeters.toFixed(2)),
        lebar_m: parseFloat(f.dimension.widthMeters.toFixed(2)),
        area_m2: parseFloat(f.areaSquareMeters.toFixed(2)),
        area_ha: parseFloat((f.areaSquareMeters / 10000).toFixed(4)),
        perimeter_m: parseFloat(f.perimeterMeters.toFixed(2)),
        vertex_count: f.coordinates.length,
        created_at: new Date(f.createdAt).toISOString(),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ring],
      },
    };
  });

  return JSON.stringify(
    {
      type: 'FeatureCollection',
      features,
    },
    null,
    2
  );
}

/**
 * Generates surveyor CSV coordinate table (BPN format)
 */
export function generatePatokCSV(field: PolygonField): string {
  const rows: string[] = [];
  rows.push('No Patok,Nama Bidang,Latitude (Lintang),Longitude (Bujur),Sudut Dalam (Derajat),Jarak ke Patok Berikutnya (m),Bearing (° Azimuth)');

  field.coordinates.forEach((c, idx) => {
    const seg = field.segments[idx];
    const ang = field.angles[idx];
    const angleStr = ang ? ang.angleDeg.toFixed(2) : '-';
    const distStr = seg ? seg.lengthMeters.toFixed(2) : '-';
    const bearingStr = seg ? seg.bearingDeg.toFixed(1) : '-';

    rows.push(
      `P${idx + 1},"${field.name}",${c.lat.toFixed(7)},${c.lng.toFixed(7)},${angleStr},${distStr},${bearingStr}`
    );
  });

  return rows.join('\n');
}

/**
 * Helper to download file in browser
 */
export function downloadFile(blob: Blob | string, filename: string, mimeType: string = 'text/plain') {
  const fileBlob = typeof blob === 'string' ? new Blob([blob], { type: mimeType }) : blob;
  const url = URL.createObjectURL(fileBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
