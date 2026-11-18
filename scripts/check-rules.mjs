// Mechanical enforcement of the Hard rules in CLAUDE.md, for what this
// repository holds: its own start-up code, the built-in profile and the pin
// on Longboard. Longboard's own checks cover the engine. This catches the
// obvious slips; it does not replace reading the rules.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { extname } from 'node:path';

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => f && existsSync(f));

const problems = [];
const fail = (rule, file, why) => problems.push(`rule ${rule}: ${file}: ${why}`);

// Rule 1: no binaries or fonts that could be someone else's, no CDM.
const BANNED_EXT = new Set(['.so', '.dll', '.dylib', '.ttf', '.otf', '.woff', '.woff2', '.mp4', '.webm', '.mp3', '.wav', '.har', '.crx']);
// Rule 10: nothing captured from a session.
const BANNED_NAMES = /(^|\/)(cookies?(\.txt|\.json|\.sqlite)?|Login Data|Local State|spike-report\.json)$/i;

const TEXT_EXT = new Set(['.ts', '.mjs', '.js', '.json', '.css', '.html', '.yml', '.yaml']);
const SELF = 'scripts/check-rules.mjs';

const CODE_CHECKS = [
  // Rule 2
  [2, /libwidevine|widevinecdm|content_decryption_module|pywidevine|license_?server|getLicense|keyStatuses|MediaKeySession\b.*\.update/i, 'touches the CDM or licence exchange'],
  // Rule 3
  [3, /SMART-TV|SmartTV|Tizen|Web0S|webOS|BRAVIA|AFT[A-Z]|Android TV|PlayStation|Xbox|Cobalt\/|Windows NT|Macintosh|CrOS/, 'looks like a spoofed device or OS identity'],
  // Rule 4
  [4, /onBeforeSendHeaders|onHeadersReceived|onBeforeRequest|interceptBuffer|registerHttpProtocol|setProxy|skipAd|sponsorblock/i, "touches the service's traffic"],
  [4, /\.(currentTime|playbackRate)\s*[-+]?=(?!=)|\.(play|pause)\(\)/, "controls the site's video element directly instead of sending input"],
  // Rule 5: Longboard's ad blocking is left out of this app.
  [5, /FilterStore|filterSession|filterLists|easylist|@ghostery|longboard\/src\/main\/adblock/i, 'brings in ad blocking, which this app leaves out'],
  // Rule 12
  [12, /sentry|google-analytics|gtag\(|posthog|mixpanel|crashReporter\.start/i, 'telemetry or crash upload'],
  // Rule 13
  [13, /contextIsolation:\s*false|sandbox:\s*false|nodeIntegration:\s*true|webSecurity:\s*false|exposeInMainWorld|allowRunningInsecureContent|setPermissionRequestHandler|setPermissionCheckHandler|certificate-error/, 'weakens or replaces what the shell allows a page'],
];

for (const file of files) {
  const ext = extname(file).toLowerCase();
  if (BANNED_EXT.has(ext)) fail(1, file, `binary or font file type ${ext} is not allowed in the repo`);
  if (BANNED_NAMES.test(file)) fail(10, file, 'looks like session data');
  if (file === SELF || file.startsWith('docs/') || file.endsWith('.md') || file === 'package-lock.json') continue;
  if (!TEXT_EXT.has(ext)) continue;
  const inTests = file.startsWith('test/');
  const text = readFileSync(file, 'utf8');
  for (const [rule, pattern, why] of CODE_CHECKS) {
    // Tests may name forbidden things in order to assert they are absent.
    if (inTests && rule !== 13) continue;
    const m = pattern.exec(text);
    if (m) fail(rule, file, `${why} (matched "${m[0]}")`);
  }
}

// Rule 5, the other half: the one place Longboard is told about ad blocking says "off".
{
  const main = readFileSync('src/main/index.ts', 'utf8');
  const said = main.match(/adBlock:\s*\{[^}]*\}/g) ?? [];
  if (said.length !== 1 || !/enabled:\s*false\b/.test(said[0])) fail(5, 'src/main/index.ts', 'must hand Longboard exactly one adBlock setting, with enabled: false');
}

// Rule 6: branding.
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
for (const [key, val] of Object.entries({
  name: pkg.name,
  productName: pkg.build?.productName,
  appId: pkg.build?.appId,
  artifactName: pkg.build?.artifactName,
  desktopName: pkg.desktopName,
})) {
  if (typeof val === 'string' && /apple|itunes|tvos|\bios\b|\bmac\b/i.test(val)) {
    fail(6, 'package.json', `${key} contains a trademark: "${val}"`);
  }
}

// Rules 7 and 8: built-in profiles are data, and name the outline that backs them.
for (const file of files.filter((f) => /^profiles\/[^/]+\/profile\.json$/.test(f))) {
  const p = JSON.parse(readFileSync(file, 'utf8'));
  if ('scripts' in p) fail(7, file, 'a profile cannot contain scripts');
  const outline = file.replace(/profile\.json$/, String(p.evidence?.outline ?? ''));
  if (!p.evidence?.outline || !files.includes(outline)) fail(8, file, 'names no outline file that is in the repository');
  if (!files.includes(file.replace(/profile\.json$/, 'NOTES.md'))) fail(8, file, 'has no NOTES.md saying what was tested');
}

// Rule 14: the engine is Longboard's, at one exact commit, on the Electron Longboard uses.
{
  const dep = pkg.devDependencies?.longboard ?? '';
  if (!/^github:AndrewGBest\/Longboard#[0-9a-f]{40}$/.test(dep)) fail(14, 'package.json', 'longboard must be pinned to a full commit of AndrewGBest/Longboard');
  const theirs = 'node_modules/longboard/package.json';
  if (existsSync(theirs)) {
    const wanted = JSON.parse(readFileSync(theirs, 'utf8')).devDependencies?.electron;
    if (pkg.devDependencies?.electron !== wanted) fail(14, 'package.json', `electron must be the version the pinned Longboard uses (${wanted})`);
  }
  if (pkg.dependencies && Object.keys(pkg.dependencies).length) fail(14, 'package.json', 'has runtime dependencies of its own; everything is bundled from Longboard');
}

if (problems.length) {
  console.error(`Hard-rule check failed:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`Hard-rule check passed (${files.length} files).`);
