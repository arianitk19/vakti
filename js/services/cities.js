// Kosovo places. Coordinates are approximate town centres (used for nearest-place matching and Qibla).
// `offsetKey` links to the dataset's `city_offsets_minutes`; places without one use the base (Deçan reference) times.
export const CITIES = [
  { id: 'prishtine', name: 'Prishtinë', lat: 42.6629, lon: 21.1655, offsetKey: 'Prishtina' },
  { id: 'prizren', name: 'Prizren', lat: 42.2139, lon: 20.7397 },
  { id: 'peje', name: 'Pejë', lat: 42.6593, lon: 20.2883 },
  { id: 'gjakove', name: 'Gjakovë', lat: 42.3803, lon: 20.4308 },
  { id: 'ferizaj', name: 'Ferizaj', lat: 42.3702, lon: 21.1483, offsetKey: 'Ferizaj' },
  { id: 'gjilan', name: 'Gjilan', lat: 42.4635, lon: 21.4694, offsetKey: 'Gjilan' },
  { id: 'mitrovice', name: 'Mitrovicë', lat: 42.8914, lon: 20.866 },
  { id: 'vushtrri', name: 'Vushtrri', lat: 42.8231, lon: 20.9675, offsetKey: 'Vushtrri' },
  { id: 'podujeve', name: 'Podujevë', lat: 42.9107, lon: 21.1933, offsetKey: 'Podujeva' },
  { id: 'suhareke', name: 'Suharekë', lat: 42.3589, lon: 20.8253 },
  { id: 'rahovec', name: 'Rahovec', lat: 42.3994, lon: 20.6547 },
  { id: 'decan', name: 'Deçan', lat: 42.5403, lon: 20.2878 },
  { id: 'kline', name: 'Klinë', lat: 42.6217, lon: 20.5772 },
  { id: 'malisheve', name: 'Malishevë', lat: 42.4822, lon: 20.7458 },
  { id: 'lipjan', name: 'Lipjan', lat: 42.5222, lon: 21.1258 },
  { id: 'drenas', name: 'Drenas', lat: 42.6278, lon: 20.8933 },
  { id: 'fushe-kosove', name: 'Fushë Kosovë', lat: 42.6392, lon: 21.0961 },
  { id: 'kacanik', name: 'Kaçanik', lat: 42.2311, lon: 21.2597 },
  { id: 'viti', name: 'Viti', lat: 42.3214, lon: 21.3586 },
  { id: 'istog', name: 'Istog', lat: 42.7828, lon: 20.4853 },
  { id: 'skenderaj', name: 'Skenderaj', lat: 42.7467, lon: 20.7894 },
  { id: 'dragash', name: 'Dragash', lat: 42.0625, lon: 20.6533 },
  { id: 'kamenice', name: 'Kamenicë', lat: 42.5781, lon: 21.5806 },
  { id: 'shtime', name: 'Shtime', lat: 42.4328, lon: 21.0392 },
  { id: 'obiliq', name: 'Obiliq', lat: 42.6867, lon: 21.0706 },
  { id: 'gracanice', name: 'Graçanicë', lat: 42.6019, lon: 21.1931 },
  { id: 'sharri', name: 'Sharri (zonë sipas Takvimit)', lat: 42.2, lon: 20.95, offsetKey: 'Sharri', zone: true },
  { id: 'presheve', name: 'Preshevë (sipas Takvimit)', lat: 42.3072, lon: 21.6491, offsetKey: 'Presheva', zone: true }
];
export const cityById = (id) => CITIES.find((c) => c.id === id) || CITIES[0];
export const KOSOVO_BBOX = { minLat: 41.85, maxLat: 43.30, minLon: 19.95, maxLon: 21.85 };
