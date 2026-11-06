// Development-only vendor tool. The application never calls these sources.
import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sources = [
  { repository: 'kongvut/thai-province-data', revision: '07319ed40eb3440c9a1b17cc48fa223340ddce55', files: ['api/latest/province.json', 'api/latest/district.json', 'api/latest/sub_district.json', 'LICENSE'] },
  { repository: 'earthchie/jquery.Thailand.js', revision: '2f2737e560acc88e6bf1144e8fad3355a72d977d', files: ['jquery.Thailand.js/database/raw_database/raw_database.json', 'LICENSE'] },
];
const output = new URL('../src/data/thai-addresses/', import.meta.url);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const downloaded = [];
for (const source of sources) {
  const files = [];
  for (const file of source.files) {
    const response = await fetch(`https://raw.githubusercontent.com/${source.repository}/${source.revision}/${file}`);
    if (!response.ok) throw Error(`Download failed: ${response.status} ${file}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    files.push({ path: file, sha256: sha(bytes), bytes });
  }
  downloaded.push(files);
}
const json = (source, file) => JSON.parse(downloaded[source][file].bytes);
const provinces = json(0, 0), districts = json(0, 1), subdistricts = json(0, 2), postal = json(1, 0);
const unique = (rows, key) => { const keys = new Set(rows.map(row => row[key])); if (keys.size !== rows.length) throw Error(`Duplicate ${key}`); return keys; };
const provinceIds = unique(provinces, 'id'), districtIds = unique(districts, 'id'); unique(subdistricts, 'id');
if (provinces.length !== 77 || districts.length !== 930 || subdistricts.length !== 7436 || postal.length !== 7498) throw Error('Unexpected source coverage');
if (districts.some(row => !provinceIds.has(row.province_id)) || subdistricts.some(row => !districtIds.has(row.district_id))) throw Error('Broken parent reference');
const byPostalName = new Map();
for (const row of postal) {
  // Offshore/non-administrative places in this source can have no postcode.
  if (row.zipcode === '') continue;
  if (!/^\d{5}$/.test(String(row.zipcode))) throw Error('Invalid postal code');
  const key = JSON.stringify([row.province, row.amphoe, row.district]);
  if (!byPostalName.has(key)) byPostalName.set(key, new Set());
  byPostalName.get(key).add(String(row.zipcode));
}
let missing = 0, conflicting = 0, multiple = 0;
const data = provinces.map(province => [province.name.th, districts.filter(row => row.province_id === province.id).map(district => [district.name.th,
  subdistricts.filter(row => row.district_id === district.id).map(subdistrict => {
    if (!/^\d{5}$/.test(String(subdistrict.zip_code))) throw Error('Invalid primary postal code');
    const codes = byPostalName.get(JSON.stringify([province.name.th, district.name.th, subdistrict.name.th]));
    // A disagreement is not evidence that both codes are valid. Never union it.
    const reason = !codes ? 'unmatched' : !codes.has(String(subdistrict.zip_code)) ? 'conflicting' : null;
    if (reason === 'unmatched') missing++; else if (reason) conflicting++; else if (codes.size > 1) multiple++;
    return [subdistrict.name.th, reason ? [] : [...codes].sort(), ...(reason ? [reason] : [])];
  })])]);
await fs.mkdir(output, { recursive: true });
const bytes = Buffer.from(JSON.stringify(data) + '\n');
await fs.writeFile(new URL('areas.json', output), bytes);
for (let i = 0; i < sources.length; i++) await fs.writeFile(new URL(`${sources[i].repository.split('/')[0]}.LICENSE`, output), downloaded[i].at(-1).bytes);
const metadata = { version: 'fitm-th-address-2026-11-06.1', sources: sources.map((source, i) => ({ ...source, files: downloaded[i].map(({ path, sha256 }) => ({ path, sha256 })) })), counts: { provinces: provinces.length, districts: districts.length, subdistricts: subdistricts.length, multiplePostalCodes: multiple, unmatchedPostalCodes: missing, conflictingPostalCodes: conflicting }, sha256: sha(bytes) };
await fs.writeFile(new URL('metadata.json', output), JSON.stringify(metadata, null, 2) + '\n');
console.log(JSON.stringify({ ...metadata.counts, sha256: metadata.sha256 }));
