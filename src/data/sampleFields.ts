import { PolygonField } from '../types/gis';
import { updatePolygonMetrics } from '../utils/geoCalculations';

// Sample polygon matching the geometry and layout seen in government land delineation
export const INITIAL_SAMPLE_FIELD: PolygonField = updatePolygonMetrics({
  id: 'sample-field-atrbpn-1',
  name: 'Peta Bidang BHUMI ATR/BPN (SHGB 01425)',
  color: '#ef4444',
  strokeColor: '#ef4444', // Red border for ATR/BPN
  fillColor: '#dc2626', // Red fill
  strokeWidth: 3.5,
  opacity: 0.25,
  visible: true,
  isCompleted: true,
  createdAt: Date.now() - 3600000,
  coordinates: [
    { lat: 0.528430, lng: 101.442800 }, // P1
    { lat: 0.526800, lng: 101.446800 }, // P2
    { lat: 0.526800, lng: 101.454100 }, // P3
    { lat: 0.524050, lng: 101.454100 }, // P4
    { lat: 0.524200, lng: 101.446800 }, // P5
    { lat: 0.524600, lng: 101.446600 }, // P6
    { lat: 0.526100, lng: 101.442800 }, // P7
  ],
});

export const SECOND_SAMPLE_FIELD: PolygonField = updatePolygonMetrics({
  id: 'sample-field-pkkpr-2',
  name: 'Koordinat PKKPR (No. 503/DPMPTSP/2024)',
  color: '#eab308',
  strokeColor: '#eab308', // Bright yellow border for PKKPR
  fillColor: '#ca8a04', // Yellow fill
  strokeWidth: 3.5,
  opacity: 0.25,
  visible: true,
  isCompleted: true,
  createdAt: Date.now() - 1800000,
  coordinates: [
    { lat: 0.529000, lng: 101.447500 }, // Q1
    { lat: 0.529000, lng: 101.458000 }, // Q2
    { lat: 0.524800, lng: 101.458000 }, // Q3
    { lat: 0.524800, lng: 101.447500 }, // Q4
  ],
});
