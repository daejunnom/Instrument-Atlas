import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const importDir = path.join(rootDir, '_import', 'stemx-studio');
const instrumentsDir = path.join(rootDir, 'data', 'instruments');
const localesDir = path.join(rootDir, 'locales');

const localeCodes = ['en', 'ko'];

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value == null) return [];
  return [value];
}

function uniq(values) {
  return Array.from(
    new Set(
      asArray(values)
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
}

function titleFromId(id) {
  return id
    .replace(/^inst_/, '')
    .split('_')
    .filter(Boolean)
    .map((part) => {
      if (/^\d+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function readInstrumentIds() {
  if (!fs.existsSync(instrumentsDir)) {
    throw new Error(`Missing instruments directory: ${instrumentsDir}`);
  }

  return fs
    .readdirSync(instrumentsDir)
    .filter((fileName) => fileName.endsWith('.json'))
    .map((fileName) => {
      const filePath = path.join(instrumentsDir, fileName);
      const data = readJson(filePath);

      if (!data?.id) {
        throw new Error(`Instrument file is missing id: ${filePath}`);
      }

      if (fileName !== `${data.id}.json`) {
        throw new Error(`Instrument filename and id mismatch: ${fileName} !== ${data.id}.json`);
      }

      return data.id;
    })
    .sort((a, b) => a.localeCompare(b));
}

function normalizeLocaleEntry(id, aliasEntry, description) {
  const name =
    typeof aliasEntry?.name === 'string' && aliasEntry.name.trim()
      ? aliasEntry.name.trim()
      : titleFromId(id);

  return {
    id,
    name,
    aliases: uniq(aliasEntry?.aliases),
    searchKeywords: uniq(aliasEntry?.searchKeywords),
    description:
      typeof description === 'string'
        ? description.trim()
        : ''
  };
}

function main() {
  const instrumentIds = readInstrumentIds();

  for (const locale of localeCodes) {
    const aliasPath = path.join(importDir, `aliases.${locale}.json`);
    const descriptionPath = path.join(importDir, `descriptions.${locale}.json`);

    const aliases = readJson(aliasPath, {});
    const descriptions = readJson(descriptionPath, {});

    if (!aliases || typeof aliases !== 'object' || Array.isArray(aliases)) {
      throw new Error(`Invalid alias file: ${aliasPath}`);
    }

    if (!descriptions || typeof descriptions !== 'object' || Array.isArray(descriptions)) {
      throw new Error(`Invalid description file: ${descriptionPath}`);
    }

    const outputDir = path.join(localesDir, locale);
    fs.mkdirSync(outputDir, { recursive: true });

    let written = 0;
    let fallbackNames = 0;
    let emptyDescriptions = 0;

    for (const id of instrumentIds) {
      const aliasEntry = aliases[id] ?? {};
      const description = descriptions[id] ?? '';

      const normalized = normalizeLocaleEntry(id, aliasEntry, description);

      if (!aliasEntry.name) fallbackNames += 1;
      if (!normalized.description) emptyDescriptions += 1;

      const outputPath = path.join(outputDir, `${id}.json`);
      writeJson(outputPath, normalized);
      written += 1;
    }

    console.log(
      `Imported ${written} ${locale} locale files into ${path.relative(rootDir, outputDir)}`
    );

    if (fallbackNames > 0) {
      console.warn(`  ${fallbackNames} ${locale} files used fallback names from id.`);
    }

    if (emptyDescriptions > 0) {
      console.warn(`  ${emptyDescriptions} ${locale} files have empty descriptions.`);
    }
  }
}

main();