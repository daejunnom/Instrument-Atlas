import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const importDir = path.join(rootDir, '_import', 'stemx-studio');
const instrumentsDir = path.join(rootDir, 'data', 'instruments');
const packsDir = path.join(rootDir, 'data', 'packs');

const packsConfigPath = path.join(importDir, 'packs.config.json');
const masterPath = path.join(importDir, 'instruments.master.json');

const PACK_ID_RENAMES = {
  'extended-lite': 'extended'
};

const PACK_TEXT = {
  core: {
    title: 'Core Instruments',
    description: 'Commonly used instruments and essential sound sources.'
  },
  'standard-drums': {
    title: 'Standard Drums',
    description: 'Common drum kit, cymbal, percussion, and rhythm instruments.'
  },
  'standard-orchestral': {
    title: 'Standard Orchestral',
    description: 'Common orchestral, vocal, brass, woodwind, and ensemble instruments.'
  },
  'world-east-asia': {
    title: 'World: East Asia',
    description: 'Traditional and regional instruments from East Asia.'
  },
  'world-south-asia': {
    title: 'World: South Asia',
    description: 'Traditional and regional instruments from South Asia.'
  },
  foley: {
    title: 'Foley & Sound Effects',
    description: 'Foley, environmental, texture, and non-musical sound sources.'
  },
  synths: {
    title: 'Synths',
    description: 'Synthesizers, electronic tones, and synthetic sound sources.'
  },
  extended: {
    title: 'Extended Instruments',
    description: 'Rare, minor, experimental, or specialized instruments and sound sources.'
  }
};

const PROMOTED_CORE_INSTRUMENTS = [
  'inst_upright_piano',
  'inst_rhodes',
  'inst_clavinet',
  'inst_hammond_organ',
  'inst_celesta',
  'inst_harpsichord',
  'inst_accordion',
  'inst_mellotron',
  'inst_cello',
  'inst_double_bass',
  'inst_viola',
  'inst_harp',
  'inst_classical_guitar',
  'inst_ukulele',
  'inst_banjo',
  'inst_mandolin',
  'inst_lute',
  'inst_kick_drum',
  'inst_snare_drum',
  'inst_hihat',
  'inst_tom_tom',
  'inst_congas',
  'inst_bongos',
  'inst_shaker',
  'inst_ride_cymbal',
  'inst_crash_cymbal',
  'inst_tambourine'
];

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

function normalizePackId(packId) {
  return PACK_ID_RENAMES[packId] ?? packId;
}

function titleFromId(id) {
  return id
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

function readSourceInstruments() {
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

      return {
        filePath,
        data
      };
    })
    .sort((a, b) => a.data.id.localeCompare(b.data.id));
}

function fallbackPackId(instrument) {
  if (PROMOTED_CORE_INSTRUMENTS.includes(instrument.id)) {
    return 'core';
  }

  if (typeof instrument.minorInstrumentScore === 'number' && instrument.minorInstrumentScore <= 0.1) {
    return 'core';
  }

  const family = instrument.family;
  const regions = instrument.regions ?? [];

  if (family === 'World / Traditional') {
    if (
      regions.some((region) =>
        String(region).includes('Asia') ||
        String(region).includes('Japan') ||
        String(region).includes('China') ||
        String(region).includes('Korea')
      )
    ) {
      return 'world-east-asia';
    }

    return 'world-south-asia';
  }

  if (family === 'FX & Foley') {
    return 'foley';
  }

  if (family === 'Synths') {
    if (instrument.minorInstrumentScore > 0.8) {
      return 'extended';
    }

    return 'synths';
  }

  if (
    family === 'Drums & Percussion' ||
    family === 'Cymbals & Metals' ||
    family === 'Bells & Idiophones'
  ) {
    if (instrument.minorInstrumentScore > 0.8) {
      return 'extended';
    }

    return 'standard-drums';
  }

  if (family === 'Brass' || family === 'Woodwinds' || family === 'Vocals') {
    if (instrument.minorInstrumentScore > 0.8) {
      return 'extended';
    }

    return 'standard-orchestral';
  }

  if (family === 'Keys' || family === 'Guitars' || family === 'Strings') {
    return 'core';
  }

  return 'core';
}

function determinePackId(sourceInstrument, masterInstrument) {
  if (typeof masterInstrument?.packId === 'string' && masterInstrument.packId.trim()) {
    return normalizePackId(masterInstrument.packId.trim());
  }

  if (Array.isArray(masterInstrument?.packIds) && masterInstrument.packIds.length > 0) {
    return normalizePackId(masterInstrument.packIds[0]);
  }

  if (Array.isArray(sourceInstrument.packIds) && sourceInstrument.packIds.length > 0) {
    return normalizePackId(sourceInstrument.packIds[0]);
  }

  return fallbackPackId({
    ...masterInstrument,
    ...sourceInstrument
  });
}

function normalizePacksConfig(rawPacks) {
  if (!Array.isArray(rawPacks)) {
    throw new Error('packs.config.json must be an array.');
  }

  const normalized = rawPacks.map((pack) => {
    const id = normalizePackId(pack.id);

    return {
      id,
      level:
        id === 'extended'
          ? 3
          : pack.level,
      title: PACK_TEXT[id]?.title ?? titleFromId(id),
      description: PACK_TEXT[id]?.description ?? '',
      category:
        id === 'extended'
          ? 'extended'
          : pack.category ?? 'standard',
      defaultEnabled: Boolean(pack.defaultEnabled),
      recommended: Boolean(pack.recommended),
      sortOrder: pack.sortOrder ?? 999,
      instrumentIds: []
    };
  });

  const byId = new Map();

  for (const pack of normalized) {
    if (byId.has(pack.id)) {
      const existing = byId.get(pack.id);
      existing.instrumentIds = uniq([...existing.instrumentIds, ...pack.instrumentIds]);
      existing.recommended = existing.recommended || pack.recommended;
      existing.defaultEnabled = existing.defaultEnabled || pack.defaultEnabled;
      existing.sortOrder = Math.min(existing.sortOrder, pack.sortOrder);
      continue;
    }

    byId.set(pack.id, pack);
  }

  return Array.from(byId.values());
}

function main() {
  if (!fs.existsSync(packsConfigPath)) {
    throw new Error(`Missing input file: ${packsConfigPath}`);
  }

  if (!fs.existsSync(masterPath)) {
    throw new Error(`Missing input file: ${masterPath}`);
  }

  fs.mkdirSync(packsDir, { recursive: true });

  const packsConfig = normalizePacksConfig(readJson(packsConfigPath));
  const packsById = new Map(packsConfig.map((pack) => [pack.id, pack]));

  const master = normalizeMaster(readJson(masterPath));
  const masterById = new Map(master.map((instrument) => [instrument.id, instrument]));

  const sourceInstruments = readSourceInstruments();

  const missingFromMaster = [];
  const unknownPackIds = new Set();

  for (const { filePath, data } of sourceInstruments) {
    const masterInstrument = masterById.get(data.id);

    if (!masterInstrument) {
      missingFromMaster.push(data.id);
    }

    const packId = determinePackId(data, masterInstrument);

    if (!packsById.has(packId)) {
      unknownPackIds.add(packId);

      packsById.set(packId, {
        id: packId,
        level: packId === 'core' ? 1 : packId === 'extended' ? 3 : 2,
        title: PACK_TEXT[packId]?.title ?? titleFromId(packId),
        description: PACK_TEXT[packId]?.description ?? '',
        category: packId === 'core' ? 'core' : packId === 'extended' ? 'extended' : 'standard',
        defaultEnabled: packId === 'core',
        recommended: false,
        sortOrder: 999,
        instrumentIds: []
      });
    }

    packsById.get(packId).instrumentIds.push(data.id);

    const updated = {
      ...data,
      packIds: [packId]
    };

    writeJson(filePath, updated);
  }

  const packs = Array.from(packsById.values())
    .map((pack) => ({
      ...pack,
      instrumentIds: uniq(pack.instrumentIds).sort((a, b) => a.localeCompare(b))
    }))
    .filter((pack) => pack.instrumentIds.length > 0)
    .sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.id.localeCompare(b.id);
    });

  for (const pack of packs) {
    const outputPath = path.join(packsDir, `${pack.id}.json`);
    writeJson(outputPath, pack);
  }

  console.log(`Imported ${packs.length} pack files into ${path.relative(rootDir, packsDir)}`);

  for (const pack of packs) {
    console.log(`  ${pack.id}: ${pack.instrumentIds.length} instruments`);
  }

  if (missingFromMaster.length > 0) {
    console.warn('');
    console.warn(`Warning: ${missingFromMaster.length} instruments were not found in instruments.master.json`);
    console.warn(missingFromMaster.join(', '));
  }

  if (unknownPackIds.size > 0) {
    console.warn('');
    console.warn('Warning: generated inferred pack definitions for unknown pack IDs:');
    console.warn(Array.from(unknownPackIds).join(', '));
  }
}

main();