// Qibla: great-circle bearing to the Kaaba plus a real compass (Device Orientation) when available.
import { haversineKm } from './locationService.js';
export const KAABA = { lat: 21.4225, lon: 39.8262 };

export function bearing(from) {
  const rad = Math.PI / 180, deg = 180 / Math.PI;
  const φ1 = from.lat * rad, φ2 = KAABA.lat * rad, Δλ = (KAABA.lon - from.lon) * rad;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (Math.atan2(y, x) * deg + 360) % 360;
}
export const distanceKm = (from) => haversineKm(from, KAABA);

export const needsGesture = () => typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';
export const compassSupported = () => 'DeviceOrientationEvent' in window;
const needsPermission = () => typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function';

/** Live heading. Calls onHeading(deg|null) ; resolves state string. Must be started from a user gesture on iOS. */
export class Compass {
  constructor(onHeading, onState) { this.onHeading = onHeading; this.onState = onState; this.got = false; this.h = null; }
  async start() {
    if (!compassSupported()) { this.onState('unsupported'); return; }
    if (needsPermission()) {
      try {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') { this.onState('denied'); return; }
      } catch { this.onState('denied'); return; }
    }
    this.handler = (e) => {
      let hd = null;
      if (typeof e.webkitCompassHeading === 'number') hd = e.webkitCompassHeading;             // iOS: already clockwise from north
      else if (e.absolute && typeof e.alpha === 'number') hd = (360 - e.alpha) % 360;          // Android absolute
      if (hd == null || Number.isNaN(hd)) return;
      this.got = true;
      // light smoothing on the circle
      if (this.h == null) this.h = hd; else { let d = ((hd - this.h + 540) % 360) - 180; this.h = (this.h + d * 0.25 + 360) % 360; }
      this.onHeading(this.h);
    };
    window.addEventListener('deviceorientationabsolute', this.handler, true);
    window.addEventListener('deviceorientation', this.handler, true);
    this.onState('waiting');
    this.timeout = setTimeout(() => { if (!this.got) this.onState('no-data'); }, 2500);
    this.check = setInterval(() => { if (this.got) { this.onState('active'); clearInterval(this.check); clearTimeout(this.timeout); } }, 300);
  }
  stop() {
    window.removeEventListener('deviceorientationabsolute', this.handler, true);
    window.removeEventListener('deviceorientation', this.handler, true);
    clearInterval(this.check); clearTimeout(this.timeout);
  }
}
