import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateDistanceKm, getDirectionsUrl, DAY_PALETTE } from '../js/map.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('====================================================');
console.log('🧪 YATRALOCAL MAP & COORDINATES VERIFICATION SUITE');
console.log('====================================================');

let passed = 0;
let total = 0;

function assert(title, cond, detail = '') {
  total++;
  if (cond) {
    passed++;
    console.log(`[PASS] ${title}`);
    if (detail) console.log(`       └─ ${detail}`);
  } else {
    console.error(`[FAIL] ${title}`);
    if (detail) console.error(`       └─ ${detail}`);
  }
}

// 1. Haversine Calculation
const d = calculateDistanceKm(32.2483, 77.1804, 32.2618, 77.1884);
assert(
  'Haversine distance calculation',
  d !== null && d >= 1.4 && d <= 1.9,
  `Calculated Hadimba -> Vashisht distance as ${d} km (expected ~1.7 km)`
);

// 2. Directions Deep Links
const gUrl = getDirectionsUrl(32.2483, 77.1804, 'Hadimba Temple', 'google');
const osmUrl = getDirectionsUrl(32.2483, 77.1804, 'Hadimba Temple', 'osm');
assert(
  'Keyless Directions deep link URLs',
  gUrl.startsWith('https://www.google.com/maps/dir/') &&
  gUrl.includes('destination=32.2483,77.1804') &&
  osmUrl.startsWith('https://www.openstreetmap.org/directions') &&
  osmUrl.includes('route=%3B32.2483%2C77.1804'),
  `Google: ${gUrl}\n       OSM:    ${osmUrl}`
);

// 3. Coordinate coverage in data/destinations.json
const destData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/destinations.json'), 'utf8'));
let totalActivities = 0;
let validActivities = 0;
let missingDestCoords = [];

destData.forEach(dest => {
  if (!dest.center || typeof dest.center.lat !== 'number' || typeof dest.center.lng !== 'number') {
    missingDestCoords.push(`Destination center: ${dest.id}`);
  }
  (dest.activities || []).forEach(act => {
    totalActivities++;
    if (typeof act.lat === 'number' && typeof act.lng === 'number' && !isNaN(act.lat) && !isNaN(act.lng)) {
      validActivities++;
    } else {
      missingDestCoords.push(`Activity: ${dest.id} -> ${act.id || act.title}`);
    }
  });
});

assert(
  'All 48 activities & destination centers have real coordinates',
  totalActivities === 48 && validActivities === 48 && missingDestCoords.length === 0,
  `Found ${validActivities}/${totalActivities} valid coordinates across ${destData.length} destinations. Missing: ${missingDestCoords.join(', ') || 'none'}`
);

// 4. Coordinate coverage in data/hosts.json
const hostsJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/hosts.json'), 'utf8'));
const allHosts = [...(hostsJson.stays || []), ...(hostsJson.guides || [])];
let totalHosts = 0;
let validHosts = 0;
let missingHostCoords = [];

allHosts.forEach(h => {
  totalHosts++;
  if (typeof h.lat === 'number' && typeof h.lng === 'number' && !isNaN(h.lat) && !isNaN(h.lng)) {
    validHosts++;
  } else {
    missingHostCoords.push(`Host: ${h.name} (${h.type || 'host'})`);
  }
});

assert(
  'All 20 hosts (12 stays + 8 guides) have real coordinates',
  totalHosts === 20 && validHosts === 20 && missingHostCoords.length === 0,
  `Found ${validHosts}/${totalHosts} valid coordinates. Missing: ${missingHostCoords.join(', ') || 'none'}`
);

// 5. Day Palette configured
assert(
  'Day Palette color array covers up to 6 days',
  Array.isArray(DAY_PALETTE) && DAY_PALETTE.length >= 6,
  `Colors: ${DAY_PALETTE.join(', ')}`
);

// 6. Check Leaflet CDN & SRI in index.html
const indexHtml = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const hasLeafletCss = indexHtml.includes('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css') && indexHtml.includes('integrity="sha384-sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H"');
const hasLeafletJs = indexHtml.includes('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js') && indexHtml.includes('integrity="sha384-cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH"');

assert(
  'Leaflet 1.9.4 CDN and verified SRI hashes in index.html',
  hasLeafletCss && hasLeafletJs,
  `Leaflet CSS and JS pinned with SHA-384 integrity hashes`
);

console.log('----------------------------------------------------');
console.log(`TOTAL: ${passed}/${total} assertions passed (${passed === total ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'})`);
console.log('====================================================');

if (passed !== total) {
  process.exit(1);
}
