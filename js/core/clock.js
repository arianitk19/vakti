// Real-time clock: one aligned 1s ticker shared by all views.
const subs = new Set();
let timer;
function loop() {
  const now = Date.now();
  subs.forEach((f) => { try { f(now); } catch (e) { console.error(e); } });
  timer = setTimeout(loop, 1000 - (now % 1000) + 5);
}
export const clock = {
  start() { if (!timer) loop(); },
  subscribe(fn) { subs.add(fn); fn(Date.now()); return () => subs.delete(fn); }
};
document.addEventListener('visibilitychange', () => { if (!document.hidden) subs.forEach((f) => f(Date.now())); });
