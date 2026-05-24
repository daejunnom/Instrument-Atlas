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

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function findDuplicateStrings(values) {
  const seen = new Set();
  const duplicates = new Set();

  for (const value of values) {
    if (seen.has(value)) {
      duplicates.add(value);
    } else {
      seen.add(value);
    }
  }

  return [...duplicates].sort((a, b) => a.localeCompare(b));
}

function sortedCopy(values) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function isSorted(values) {
  return JSON.stringify(values) === JSON.stringify(sortedCopy(values));
}

function formatList(values) {
  return values.length > 0 ? values.join(', ') : 'none';
}

function validateStringIdArray(values, context, errors) {
  if (!Array.isArray(values)) {
    errors.push(`${context} must be an array.`);
    return false;
  }

  const nonStringValues = values.filter((value) => typeof value !== 'string');

  if (nonStringValues.length > 0) {
    errors.push(`${context} must contain only strings.`);
    return false;
  }

  const emptyValues = values.filter((value) => value.trim() === '');

  if (emptyValues.length > 0) {
    errors.push(`${context} must not contain empty strings.`);
    return false;
  }

  const duplicates = findDuplicateStrings(values);

  if (duplicates.length > 0) {
    errors.push(`${context} contains duplicate value(s): ${formatList(duplicates)}.`);
  }

  if (!isSorted(values)) {
    errors.push(`${context} must be sorted alphabetically.`);
  }

  return true;
}

function loadInstruments(errors) {
  const instruments = new Map();

  for (const fileName of listJsonFiles(instrumentsDir)) {
    const filePath = path.join(instrumentsDir, fileName);
    const instrument = readJson(filePath);

    if (!instrument.id) {
      errors.push(`Instrument is missing id: ${filePath}`);
      continue;
    }

    if (fileName !== `${instrument.id}.json`) {
      errors.push(`Instrument filename mismatch: ${fileName} !== ${instrument.id}.json`);
    }

    if (instruments.has(instrument.id)) {
      errors.push(`Duplicate instrument id: ${instrument.id}`);
      continue;
    }

    instruments.set(instrument.id, {
      fileName,
      filePath,
      data: instrument
    });
  }

  return instruments;
}

function loadPacks(errors) {
  const packs = new Map();

  for (const fileName of listJsonFiles(packsDir)) {
    const filePath = path.join(packsDir, fileName);
    const pack = readJson(filePath);

    if (!pack.id) {
      errors.push(`Pack is missing id: ${filePath}`);
      continue;
    }

    if (fileName !== `${pack.id}.json`) {
      errors.push(`Pack filename mismatch: ${fileName} !== ${pack.id}.json`);
    }

    if (packs.has(pack.id)) {
      errors.push(`Duplicate pack id: ${pack.id}`);
      continue;
    }

    packs.set(pack.id, {
      fileName,
      filePath,
      data: pack
    });
  }

  return packs;
}

function validatePackInstrumentIds(packs, instruments, errors) {
  for (const { data: pack } of packs.values()) {
    const context = `Pack "${pack.id}" instrumentIds`;

    if (!validateStringIdArray(pack.instrumentIds, context, errors)) {
      continue;
    }

    if (pack.instrumentIds.length === 0) {
      errors.push(`Pack "${pack.id}" must not be empty.`);
    }

    for (const instrumentId of pack.instrumentIds) {
      if (!instruments.has(instrumentId)) {
        errors.push(`Pack "${pack.id}" references missing instrument "${instrumentId}".`);
      }
    }
  }
}

function validateInstrumentPackIds(instruments, packs, errors) {
  for (const { data: instrument } of instruments.values()) {
    const context = `Instrument "${instrument.id}" packIds`;

    if (!validateStringIdArray(instrument.packIds, context, errors)) {
      continue;
    }

    if (instrument.packIds.length === 0) {
      errors.push(`Instrument "${instrument.id}" has no packIds.`);
    }

    for (const packId of instrument.packIds) {
      if (!packs.has(packId)) {
        errors.push(`Instrument "${instrument.id}" references missing pack "${packId}".`);
      }
    }
  }
}

function validateBidirectionalPackMembership(instruments, packs, errors) {
  for (const { data: pack } of packs.values()) {
    if (!isStringArray(pack.instrumentIds)) {
      continue;
    }

    for (const instrumentId of pack.instrumentIds) {
      const instrument = instruments.get(instrumentId)?.data;

      if (!instrument || !isStringArray(instrument.packIds)) {
        continue;
      }

      if (!instrument.packIds.includes(pack.id)) {
        errors.push(
          [
            `Pack membership mismatch: pack "${pack.id}" contains "${instrumentId}",`,
            `but instrument "${instrumentId}" packIds is [${formatList(instrument.packIds)}].`
          ].join(' ')
        );
      }
    }
  }

  for (const { data: instrument } of instruments.values()) {
    if (!isStringArray(instrument.packIds)) {
      continue;
    }

    for (const packId of instrument.packIds) {
      const pack = packs.get(packId)?.data;

      if (!pack || !isStringArray(pack.instrumentIds)) {
        continue;
      }

      if (!pack.instrumentIds.includes(instrument.id)) {
        errors.push(
          [
            `Pack membership mismatch: instrument "${instrument.id}" points to "${packId}",`,
            `but pack "${packId}" instrumentIds does not contain it.`
          ].join(' ')
        );
      }
    }
  }
}

function main() {
  const errors = [];

  const instruments = loadInstruments(errors);
  const packs = loadPacks(errors);

  validatePackInstrumentIds(packs, instruments, errors);
  validateInstrumentPackIds(instruments, packs, errors);
  validateBidirectionalPackMembership(instruments, packs, errors);

  if (errors.length > 0) {
    console.error(`Pack link check failed with ${errors.length} error(s):`);

    for (const error of errors) {
      console.error(`- ${error}`);
    }

    process.exit(1);
  }

  console.log('Pack link check OK');
  console.log(`Checked ${instruments.size} instruments.`);
  console.log(`Checked ${packs.size} packs.`);
}

main();