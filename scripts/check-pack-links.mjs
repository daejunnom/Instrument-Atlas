import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const instrumentsDir = path.join(rootDir, 'data', 'instruments');
const packsDir = path.join(rootDir, 'data', 'packs');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
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

function loadInstruments() {
  const instruments = new Map();

  for (const fileName of listJsonFiles(instrumentsDir)) {
    const filePath = path.join(instrumentsDir, fileName);
    const instrument = readJson(filePath);

    if (!instrument.id) {
      throw new Error(`Instrument is missing id: ${filePath}`);
    }

    if (fileName !== `${instrument.id}.json`) {
      throw new Error(`Instrument filename mismatch: ${fileName} !== ${instrument.id}.json`);
    }

    if (instruments.has(instrument.id)) {
      throw new Error(`Duplicate instrument id: ${instrument.id}`);
    }

    instruments.set(instrument.id, {
      fileName,
      filePath,
      data: instrument
    });
  }

  return instruments;
}

function loadPacks() {
  const packs = new Map();

  for (const fileName of listJsonFiles(packsDir)) {
    const filePath = path.join(packsDir, fileName);
    const pack = readJson(filePath);

    if (!pack.id) {
      throw new Error(`Pack is missing id: ${filePath}`);
    }

    if (fileName !== `${pack.id}.json`) {
      throw new Error(`Pack filename mismatch: ${fileName} !== ${pack.id}.json`);
    }

    if (packs.has(pack.id)) {
      throw new Error(`Duplicate pack id: ${pack.id}`);
    }

    if (!Array.isArray(pack.instrumentIds)) {
      throw new Error(`Pack instrumentIds must be an array: ${pack.id}`);
    }

    packs.set(pack.id, {
      fileName,
      filePath,
      data: pack
    });
  }

  return packs;
}

function main() {
  const errors = [];

  const instruments = loadInstruments();
  const packs = loadPacks();

  for (const { data: pack } of packs.values()) {
    for (const instrumentId of pack.instrumentIds) {
      if (!instruments.has(instrumentId)) {
        errors.push(`Pack "${pack.id}" references missing instrument "${instrumentId}".`);
      }
    }
  }

  for (const { data: instrument } of instruments.values()) {
    if (!Array.isArray(instrument.packIds)) {
      errors.push(`Instrument "${instrument.id}" has invalid packIds.`);
      continue;
    }

    if (instrument.packIds.length === 0) {
      errors.push(`Instrument "${instrument.id}" has no packIds.`);
      continue;
    }

    for (const packId of instrument.packIds) {
      if (!packs.has(packId)) {
        errors.push(`Instrument "${instrument.id}" references missing pack "${packId}".`);
      }
    }
  }

  for (const { data: pack } of packs.values()) {
    for (const instrumentId of pack.instrumentIds) {
      const instrument = instruments.get(instrumentId)?.data;

      if (!instrument) continue;

      if (!instrument.packIds.includes(pack.id)) {
        errors.push(
          `Mismatch: pack "${pack.id}" contains "${instrumentId}", but instrument.packIds is [${instrument.packIds.join(', ')}].`
        );
      }
    }
  }

  for (const { data: instrument } of instruments.values()) {
    for (const packId of instrument.packIds) {
      const pack = packs.get(packId)?.data;

      if (!pack) continue;

      if (!pack.instrumentIds.includes(instrument.id)) {
        errors.push(
          `Mismatch: instrument "${instrument.id}" points to "${packId}", but pack does not contain it.`
        );
      }
    }
  }

  if (errors.length > 0) {
    console.error(`Pack link check failed with ${errors.length} error(s):`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log('OK');
  console.log(`Checked ${instruments.size} instruments.`);
  console.log(`Checked ${packs.size} packs.`);
}

main();