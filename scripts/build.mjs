import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const rootDir = process.cwd();

const paths = {
  instruments: path.join(rootDir, 'data', 'instruments'),
  packs: path.join(rootDir, 'data', 'packs'),
  locales: path.join(rootDir, 'locales'),
  taxonomy: path.join(rootDir, 'data', 'taxonomy'),
  distRoot: path.join(rootDir, 'dist', 'instruments', 'v1'),
  distPacks: path.join(rootDir, 'dist', 'instruments', 'v1', 'packs'),
  distIndexes: path.join(rootDir, 'dist', 'instruments', 'v1', 'indexes'),
  validateScript: path.join(rootDir, 'scripts', 'validate.mjs'),
  packageJson: path.join(rootDir, 'package.json')
};

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

function readJson(filePath) {
  const raw = stripBom(fs.readFileSync(filePath, 'utf8'));
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Missing directory: ${dir}`);
  }

  return fs
    .readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));
}

function uniq(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).trim())
        .filter(Boolean)
    )
  );
}

function removeDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, {
      recursive: true,
      force: true
    });
  }
}

function runValidation() {
  if (!fs.existsSync(paths.validateScript)) {
    throw new Error('Missing scripts/validate.mjs. Build requires validation first.');
  }

  console.log('Running validation...');
  execFileSync(process.execPath, [paths.validateScript], {
    cwd: rootDir,
    stdio: 'inherit'
  });
  console.log('');
}

function loadPackageVersion() {
  if (!fs.existsSync(paths.packageJson)) {
    return '0.0.0';
  }

  const pkg = readJson(paths.packageJson);
  return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
}

function loadInstruments() {
  const instruments = new Map();

  for (const fileName of listJsonFiles(paths.instruments)) {
    const filePath = path.join(paths.instruments, fileName);
    const instrument = readJson(filePath);
    instruments.set(instrument.id, instrument);
  }

  return instruments;
}

function loadPacks() {
  return listJsonFiles(paths.packs)
    .map((fileName) => readJson(path.join(paths.packs, fileName)))
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });
}

function loadLocales() {
  const locales = new Map();

  const localeCodes = fs
    .readdirSync(paths.locales)
    .filter((name) => fs.statSync(path.join(paths.locales, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b));

  for (const locale of localeCodes) {
    const localeDir = path.join(paths.locales, locale);
    const entries = new Map();

    for (const fileName of listJsonFiles(localeDir)) {
      const entry = readJson(path.join(localeDir, fileName));
      entries.set(entry.id, entry);
    }

    locales.set(locale, entries);
  }

  return locales;
}

function loadTaxonomySummary() {
  if (!fs.existsSync(paths.taxonomy)) {
    return {};
  }

  const summary = {};

  for (const fileName of listJsonFiles(paths.taxonomy)) {
    const id = fileName.replace(/\.json$/, '');
    const data = readJson(path.join(paths.taxonomy, fileName));

    if (Array.isArray(data.values)) {
      summary[id] = {
        count: data.values.length
      };
    } else if (Array.isArray(data.recommendedValues)) {
      summary[id] = {
        count: data.recommendedValues.length,
        mode: data.mode ?? null
      };
    } else if (Array.isArray(data.bands)) {
      summary[id] = {
        count: data.bands.length,
        unit: data.unit ?? null
      };
    } else {
      summary[id] = {
        count: 0
      };
    }
  }

  return summary;
}

function mergeInstrumentWithLocale(instrument, localeEntry) {
  return {
    id: instrument.id,

    name: localeEntry.name,
    aliases: localeEntry.aliases,
    searchKeywords: localeEntry.searchKeywords,
    description: localeEntry.description,

    family: instrument.family,
    subfamily: instrument.subfamily,
    tags: instrument.tags,
    regions: instrument.regions,
    materials: instrument.materials,
    playingMethods: instrument.playingMethods,
    isPercussive: instrument.isPercussive,
    isPitched: instrument.isPitched,
    pitchRange: instrument.pitchRange,
    similarInstruments: instrument.similarInstruments,
    minorInstrumentScore: instrument.minorInstrumentScore,
    packIds: instrument.packIds,

    ...(instrument.frequencyProfile
      ? { frequencyProfile: instrument.frequencyProfile }
      : {}),

    metadata: instrument.metadata
  };
}

function buildPackArtifact(pack, locale, instruments, localeEntries) {
  const outputInstruments = pack.instrumentIds.map((instrumentId) => {
    const instrument = instruments.get(instrumentId);
    const localeEntry = localeEntries.get(instrumentId);

    return mergeInstrumentWithLocale(instrument, localeEntry);
  });

  return {
    schemaVersion: 1,
    atlasVersion: loadPackageVersion(),
    locale,
    pack: {
      id: pack.id,
      level: pack.level,
      title: pack.title,
      description: pack.description,
      category: pack.category,
      defaultEnabled: pack.defaultEnabled,
      recommended: pack.recommended,
      sortOrder: pack.sortOrder,
      instrumentCount: outputInstruments.length
    },
    instruments: outputInstruments
  };
}

function buildSearchIndex(locale, instruments, localeEntries) {
  const items = Array.from(instruments.values())
    .map((instrument) => {
      const localeEntry = localeEntries.get(instrument.id);

      const searchableText = uniq([
        instrument.id,
        localeEntry.name,
        ...localeEntry.aliases,
        ...localeEntry.searchKeywords,
        instrument.family,
        instrument.subfamily,
        ...instrument.tags,
        ...instrument.regions,
        ...instrument.playingMethods
      ]).join(' ');

      return {
        id: instrument.id,
        name: localeEntry.name,
        aliases: localeEntry.aliases,
        searchKeywords: localeEntry.searchKeywords,
        description: localeEntry.description,

        family: instrument.family,
        subfamily: instrument.subfamily,
        tags: instrument.tags,
        regions: instrument.regions,
        isPercussive: instrument.isPercussive,
        isPitched: instrument.isPitched,
        minorInstrumentScore: instrument.minorInstrumentScore,
        packIds: instrument.packIds,

        searchableText
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    schemaVersion: 1,
    atlasVersion: loadPackageVersion(),
    locale,
    generatedAt: new Date().toISOString(),
    count: items.length,
    items
  };
}

function buildManifest({ version, packs, locales, instruments, taxonomySummary }) {
  const packEntries = packs.map((pack) => {
    const files = {};

    for (const locale of locales.keys()) {
      files[locale] = `packs/${pack.id}.${locale}.json`;
    }

    return {
      id: pack.id,
      level: pack.level,
      title: pack.title,
      description: pack.description,
      category: pack.category,
      defaultEnabled: pack.defaultEnabled,
      recommended: pack.recommended,
      sortOrder: pack.sortOrder,
      instrumentCount: pack.instrumentIds.length,
      files
    };
  });

  const indexEntries = {};

  for (const locale of locales.keys()) {
    indexEntries[locale] = `indexes/search.${locale}.json`;
  }

  return {
    schemaVersion: 1,
    atlasVersion: version,
    generatedAt: new Date().toISOString(),
    basePath: 'instruments/v1',
    locales: Array.from(locales.keys()),
    counts: {
      instruments: instruments.size,
      packs: packs.length,
      locales: locales.size
    },
    taxonomy: taxonomySummary,
    indexes: {
      search: indexEntries
    },
    packs: packEntries
  };
}

function main() {
  runValidation();

  const version = loadPackageVersion();
  const instruments = loadInstruments();
  const packs = loadPacks();
  const locales = loadLocales();
  const taxonomySummary = loadTaxonomySummary();

  removeDir(paths.distRoot);

  fs.mkdirSync(paths.distPacks, { recursive: true });
  fs.mkdirSync(paths.distIndexes, { recursive: true });

  let packFileCount = 0;

  for (const pack of packs) {
    for (const [locale, localeEntries] of locales.entries()) {
      const artifact = buildPackArtifact(pack, locale, instruments, localeEntries);
      const outputPath = path.join(paths.distPacks, `${pack.id}.${locale}.json`);
      writeJson(outputPath, artifact);
      packFileCount += 1;
    }
  }

  let indexFileCount = 0;

  for (const [locale, localeEntries] of locales.entries()) {
    const index = buildSearchIndex(locale, instruments, localeEntries);
    const outputPath = path.join(paths.distIndexes, `search.${locale}.json`);
    writeJson(outputPath, index);
    indexFileCount += 1;
  }

  const manifest = buildManifest({
    version,
    packs,
    locales,
    instruments,
    taxonomySummary
  });

  writeJson(path.join(paths.distRoot, 'manifest.json'), manifest);

  console.log('Build OK');
  console.log(`Generated manifest: dist/instruments/v1/manifest.json`);
  console.log(`Generated pack files: ${packFileCount}`);
  console.log(`Generated search indexes: ${indexFileCount}`);
}

main();