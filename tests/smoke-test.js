const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('src/no-adlink.user.js', 'utf8');
assert.match(source, /^\/\/ @version\s+0\.5\.0$/m);
assert.match(source, /const VERSION = '0\.5\.0'/);
assert.doesNotMatch(source, /^\/\/\s*@(?:require|connect)\b/m);
assert.match(source, /^\/\/ @grant\s+none$/m);
assert.doesNotThrow(() => new vm.Script(source));
for (const feature of ['function normalizeText', 'function decodeBase64', 'function unwrap', 'Structured JSON URL', 'URL fragment parameter', 'Rescan page', 'Work.ink visible outbound destination']) {
  assert.ok(source.includes(feature), `missing feature: ${feature}`);
}
const shortBlock = source.match(/shortlinkHosts: Object\.freeze\(\[([\s\S]*?)\]\)/);
const downloadBlock = source.match(/downloadHosts: Object\.freeze\(\[([\s\S]*?)\]\)/);
assert.ok(shortBlock && downloadBlock, 'registry groups missing');
const shortHosts = [...shortBlock[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
const downloadHosts = [...downloadBlock[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
assert.ok(shortHosts.length >= 50, 'shortlink registry unexpectedly small');
assert.ok(downloadHosts.includes('mediafire.com'), 'MediaFire destination host missing');
assert.ok(downloadHosts.includes('gofile.io'), 'Gofile destination host missing');
assert.ok(!shortHosts.includes('mediafire.com'), 'download host must not be filtered as a shortlink');
assert.ok(!shortHosts.includes('gofile.io'), 'download host must not be filtered as a shortlink');
assert.ok(!/api\.bypass\.vip|dlr\.kys\.gay|rtaoexe\.xyz/i.test(source), 'external bypass API/dependency found');
assert.ok(!/window\.location\s*=\s*(?:redirectUrl|result|destination)/i.test(source), 'automatic redirect assignment found');
console.log(`PASS: syntax, metadata, standalone runtime, ${shortHosts.length} wrapper hosts, ${downloadHosts.length} download hosts, and safety checks`);
