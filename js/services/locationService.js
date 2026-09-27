// Location: manual place selection is primary; GPS is optional and only used to pick the nearest Kosovo place.
import { CITIES, KOSOVO_BBOX, cityById } from './cities.js';
import { store } from '../core/store.js';

export function haversineKm(a, b) {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLon = (b.lon - a.lon) * rad;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export const inKosovo = ({ lat, lon }) =>
  lat >= KOSOVO_BBOX.minLat && lat <= KOSOVO_BBOX.maxLat && lon >= KOSOVO_BBOX.minLon && lon <= KOSOVO_BBOX.maxLon;

export function nearestCity(pos) {
  const real = CITIES.filter((c) => !c.zone);
  return real.map((c) => ({ c, km: haversineKm(pos, c) })).sort((a, b) => a.km - b.km)[0];
}

export const gpsSupported = () => 'geolocation' in navigator;

/** Resolves {ok:true, city, coords, km} or {ok:false, reason:'unsupported'|'denied'|'unavailable'|'timeout'|'outside'}. */
export function detect() {
  return new Promise((resolve) => {
    if (!gpsSupported()) return resolve({ ok: false, reason: 'unsupported' });
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const coords = { lat: +p.coords.latitude.toFixed(4), lon: +p.coords.longitude.toFixed(4) };
        if (!inKosovo(coords)) return resolve({ ok: false, reason: 'outside', coords });
        const n = nearestCity(coords);
        resolve({ ok: true, city: n.c, km: n.km, coords });
      },
      (e) => resolve({ ok: false, reason: e.code === 1 ? 'denied' : e.code === 3 ? 'timeout' : 'unavailable' }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

export function currentCity() { return cityById(store.get('city')); }

/** Coordinates for Qibla: GPS fix if the user allowed it earlier, otherwise the chosen place. */
export function currentCoords() {
  const loc = store.get('loc');
  if (loc?.mode === 'gps' && loc.coords) return { ...loc.coords, source: 'gps' };
  const c = currentCity();
  return { lat: c.lat, lon: c.lon, source: 'city' };
}
