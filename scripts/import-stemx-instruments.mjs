import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const importDir = path.join(rootDir, '_import', 'stemx-studio');
const outputDir = path.join(rootDir, 'data', 'instruments');

const masterPath = path.join(importDir, 'instruments.master.json');
const sourcesPath = path.join(importDir, 'sources.json');
const packsPath = path.join(importDir, 'packs.config.json');
const corePath = path.join(importDir, 'instruments.core.json');

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

function normalizeMaster(raw) {
  if (Array.isArray(raw)) return raw;

  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([id, value]) => ({
      id,
      ...value
    }));
  }

  throw new Error('instruments.master.json must be an array or object.');
}

function getInstrumentIdsFromPack(pack) {
  const candidates = [
    pack.instrumentIds,
    pack.instruments,
    pack.items,
    pack.ids
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate
        .map((item) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') return item.id;
          return null;
        })
        .filter(Boolean);
    }
  }

  return [];
}

function derivePackIds(instrumentId, instrument, packs, coreInstruments) {
  if (Array.isArray(instrument.packIds) && instrument.packIds.length > 0) {
    return uniq(instrument.packIds);
  }

  const packIds = [];

  for (const pack of packs) {
    const ids = getInstrumentIdsFromPack(pack);
    if (ids.includes(instrumentId)) {
      packIds.push(pack.id);
    }
  }

  if (packIds.length === 0 && coreInstruments.some((item) => {
    if (typeof item === 'string') return item === instrumentId;
    return item && item.id === instrumentId;
  })) {
    packIds.push('core');
  }

  return uniq(packIds);
}

function normalizeMetadata(instrument, source) {
  const metadata = {
    wikidataId: null,
    sourceRefs: [],
    license: 'CC0'
  };

  if (instrument.metadata && typeof instrument.metadata === 'object') {
    metadata.wikidataId = instrument.metadata.wikidataId ?? metadata.wikidataId;
    metadata.sourceRefs = uniq(instrument.metadata.sourceRefs ?? metadata.sourceRefs);
    metadata.license = instrument.metadata.license ?? metadata.license;
  }

  if (source && typeof source === 'object') {
    metadata.wikidataId = source.wikidataId ?? metadata.wikidataId;
    metadata.sourceRefs = uniq([
      ...metadata.sourceRefs,
      ...asArray(source.sourceRefs)
    ]);
    metadata.license = source.license ?? metadata.license;
  }

  return metadata;
}

function normalizeInstrument(instrument, sources, packs, coreInstruments) {
  if (!instrument.id || typeof instrument.id !== 'string') {
    throw new Error(`Instrument is missing valid id: ${JSON.stringify(instrument)}`);
  }

  const id = instrument.id;

  if (!id.startsWith('inst_')) {
    throw new Error(`Invalid instrument id "${id}". Instrument IDs should start with "inst_".`);
  }

  const source = sources?.[id];

  const normalized = {
    id,
    family: instrument.family ?? null,
    subfamily: instrument.subfamily ?? null,
    tags: uniq(instrument.tags),
    regions: uniq(instrument.regions),
    materials: uniq(instrument.materials),
    playingMethods: uniq(instrument.playingMethods),
    isPercussive: Boolean(instrument.isPercussive),
    isPitched: Boolean(instrument.isPitched),
    pitchRange: instrument.pitchRange ?? null,
    similarInstruments: uniq(instrument.similarInstruments),
    minorInstrumentScore:
      typeof instrument.minorInstrumentScore === 'number'
        ? instrument.minorInstrumentScore
        : 0,
    packIds: derivePackIds(id, instrument, packs, coreInstruments),
    metadata: normalizeMetadata(instrument, source)
  };

  if (!normalized.family) {
    throw new Error(`Instrument "${id}" is missing family.`);
  }

  if (normalized.minorInstrumentScore < 0 || normalized.minorInstrumentScore > 1) {
    throw new Error(`Instrument "${id}" has invalid minorInstrumentScore: ${normalized.minorInstrumentScore}`);
  }

  return normalized;
}

function main() {
  if (!fs.existsSync(masterPath)) {
    throw new Error(`Missing input file: ${masterPath}`);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const masterRaw = readJson(masterPath);
  const master = normalizeMaster(masterRaw);

  const sources = readJson(sourcesPath, {});
  const packs = readJson(packsPath, []);
  const coreInstruments = readJson(corePath, []);

  const seenIds = new Set();

  for (const instrument of master) {
    const normalized = normalizeInstrument(instrument, sources, packs, coreInstruments);

    if (seenIds.has(normalized.id)) {
      throw new Error(`Duplicate instrument id found: ${normalized.id}`);
    }

    seenIds.add(normalized.id);

    const outputPath = path.join(outputDir, `${normalized.id}.json`);
    writeJson(outputPath, normalized);
  }

  console.log(`Imported ${seenIds.size} instruments into ${path.relative(rootDir, outputDir)}`);
}

main();