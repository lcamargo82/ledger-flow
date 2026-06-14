import fs from 'fs';
import path from 'path';

// Define the absolute root of the workspace based on the script location
const rootDir = path.resolve(process.cwd());
// We assume this runs from the root or from apps/web.
// Let's resolve relative to the script file.
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const projectRoot = path.resolve(scriptDir, '..');

const webSrcDir = path.join(projectRoot, 'apps/web/src');
const ptBrPath = path.join(webSrcDir, 'locales/pt-BR.json');
const enUsPath = path.join(webSrcDir, 'locales/en-US.json');

// Read JSON files
const ptBr = JSON.parse(fs.readFileSync(ptBrPath, 'utf8'));
const enUs = JSON.parse(fs.readFileSync(enUsPath, 'utf8'));

// Regex to find t("something") or t('something')
// Ensure it matches exactly t( and not something like emit(
const tRegex = /(?<![a-zA-Z])t\(['"]([a-zA-Z0-9_.-]+)['"]/g;

// Helper to flatten JSON object
function flattenObject(ob) {
  const toReturn = {};
  for (const i in ob) {
    if (!ob.hasOwnProperty(i)) continue;
    if (typeof ob[i] == 'object' && ob[i] !== null) {
      const flatObject = flattenObject(ob[i]);
      for (const x in flatObject) {
        if (!flatObject.hasOwnProperty(x)) continue;
        toReturn[i + '.' + x] = flatObject[x];
      }
    } else {
      toReturn[i] = ob[i];
    }
  }
  return toReturn;
}

const ptBrFlat = flattenObject(ptBr);
const enUsFlat = flattenObject(enUs);

// Function to recursively find all .vue and .ts files
function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else if (filePath.endsWith('.vue') || filePath.endsWith('.ts')) {
      fileList.push(filePath);
    }
  }

  return fileList;
}

const allFiles = findFiles(webSrcDir);
const foundKeys = new Set();

allFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    foundKeys.add(match[1]);
  }
});

console.log('--- i18n Audit ---');
let missingKeys = 0;

foundKeys.forEach(key => {
  const inPt = ptBrFlat.hasOwnProperty(key);
  const inEn = enUsFlat.hasOwnProperty(key);

  if (!inPt || !inEn) {
    missingKeys++;
    console.log(`Key used in code: "${key}"`);
    if (!inPt) console.log(`  ❌ Missing in pt-BR.json`);
    if (!inEn) console.log(`  ❌ Missing in en-US.json`);
    console.log('');
  }
});

if (missingKeys === 0) {
  console.log('✅ All keys are translated in both languages!');
  process.exit(0);
} else {
  console.log(`⚠️  Found ${missingKeys} keys with missing translations.`);
  process.exit(1);
}
