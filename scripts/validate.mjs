import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const paths = {
  instruments: path.join(rootDir, 'data', 'instruments'),
  packs: path.join(rootDir, 'data', 'packs'),
  taxonomy: path.join(rootDir, 'data', 'taxonomy'),
  locales: path.join(rootDir, 'locales')
};

const REQUIRED_INSTRUMENT_FIELDS = [
  'id',
  'family',
  'subfamily',
  'tags',
  'regions',
  'materials',
  'playingMethods',
  'isPercussive',
  'isPitched',
  'pitchRange',
  'similarInstruments',
  'minorInstrumentScore',
  'packIds',
  'metadata'
];

const REQUIRED_LOCALE_FIELDS = [
  'id',
  'name',
  'aliases',
  'searchKeywords',
  'description'
];

const REQUIRED_PACK_FIELDS = [
  'id',
  'level',
  'title',
  'description',
  'category',
  'defaultEnabled',
  'recommended',
  'sortOrder',
  'instrumentIds'
];

const VALID_FREQUENCY_PROFILE_TYPES = new Set([
  'estimated',
  'measured',
  'derived',
  'unknown'
]);

const VALID_CONFIDENCE_VALUES = new Set([
  'low',
  'medium',
  'high'
]);

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function relative(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, '/');
}

function stripBom(text) {
  return text.replace(/^\uFEFF/, '');
}

function readJson(filePath) {
  try {
    const raw = stripBom(fs.readFileSync(filePath, 'utf8'));
    return JSON.parse(raw);
  } catch (error) {
    fail(`Invalid JSON: ${relative(filePath)} (${error.message})`);
    return null;
  }
}

function listJsonFiles(dir) {
  if (!fs.existsSync(dir)) {
    fail(`Missing directory: ${relative(dir)}`);
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((fileName) => fileName.endsWith('.json'))
    .sort((a, b) => a.localeCompare(b));
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function hasDuplicateStrings(values) {
  if (!Array.isArray(values)) return false;
  return new Set(values).size !== values.length;
}

function isSortedStrings(values) {
  if (!Array.isArray(values)) return false;

  const sorted = [...values].sort((a, b) => a.localeCompare(b));
  return JSON.stringify(values) === JSON.stringify(sorted);
}

function validateSortedStringArray(values, context) {
  if (!isStringArray(values)) {
    fail(`${context} must be an array of strings.`);
    return false;
  }

  if (values.some((value) => value.trim() === '')) {
    fail(`${context} must not contain empty strings.`);
  }

  if (hasDuplicateStrings(values)) {
    fail(`${context} contains duplicate values.`);
  }

  if (!isSortedStrings(values)) {
    fail(`${context} must be sorted alphabetically.`);
  }

  return true;
}

function isValidUrlLike(value) {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function loadTaxonomyValues(fileName, key = 'values') {
  const filePath = path.join(paths.taxonomy, fileName);
  const data = readJson(filePath);

  if (!data) return new Set();

  if (!Array.isArray(data[key])) {
    fail(`Taxonomy file "${fileName}" must contain an array field "${key}".`);
    return new Set();
  }

  return new Set(data[key]);
}

function validateTaxonomyValue(value, allowedValues, context) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`${context} must be a non-empty string.`);
    return;
  }

  if (!allowedValues.has(value)) {
    fail(`${context} has unknown value "${value}".`);
  }
}

function validateTaxonomyArray(values, allowedValues, context) {
  if (!isStringArray(values)) {
    fail(`${context} must be an array of strings.`);
    return;
  }

  for (const value of values) {
    validateTaxonomyValue(value, allowedValues, `${context}[]`);
  }
}

function validateRangeHz(value, context) {
  if (value === null) return;

  if (!Array.isArray(value) || value.length !== 2) {
    fail(`${context} must be null or [minHz, maxHz].`);
    return;
  }

  const [min, max] = value;

  if (typeof min !== 'number' || typeof max !== 'number') {
    fail(`${context} must contain numbers.`);
    return;
  }

  if (min < 0 || max < 0 || min >= max) {
    fail(`${context} must satisfy 0 <= min < max.`);
  }
}

function validateFrequencyBandObject(value, context) {
  if (!isPlainObject(value)) {
    fail(`${context} must be an object.`);
    return;
  }

  if (typeof value.role !== 'string' || value.role.trim() === '') {
    fail(`${context}.role must be a non-empty string.`);
  }

  validateRangeHz(value.rangeHz, `${context}.rangeHz`);

  if (
    value.description !== undefined &&
    typeof value.description !== 'string'
  ) {
    fail(`${context}.description must be a string when present.`);
  }
}

function validateFrequencyProfile(instrument) {
  const profile = instrument.frequencyProfile;

  if (profile === undefined) return;

  const context = `Instrument "${instrument.id}" frequencyProfile`;

  if (!isPlainObject(profile)) {
    fail(`${context} must be an object.`);
    return;
  }

  if (!VALID_FREQUENCY_PROFILE_TYPES.has(profile.type)) {
    fail(
      `${context}.type must be one of: ${Array.from(VALID_FREQUENCY_PROFILE_TYPES).join(', ')}.`
    );
  }

  if (!VALID_CONFIDENCE_VALUES.has(profile.confidence)) {
    fail(
      `${context}.confidence must be one of: ${Array.from(VALID_CONFIDENCE_VALUES).join(', ')}.`
    );
  }

  validateRangeHz(profile.fundamentalRangeHz, `${context}.fundamentalRangeHz`);

  for (const field of ['prominentBands', 'transientBands', 'noiseBands']) {
    if (!Array.isArray(profile[field])) {
      fail(`${context}.${field} must be an array.`);
      continue;
    }

    profile[field].forEach((band, index) => {
      validateFrequencyBandObject(band, `${context}.${field}[${index}]`);
    });
  }

  if (profile.notes !== undefined && typeof profile.notes !== 'string') {
    fail(`${context}.notes must be a string when present.`);
  }
}

function loadInstruments(
  familyValues,
  licenseValues,
  materialValues,
  playingMethodValues,
  regionValues
) {
  const instruments = new Map();

  for (const fileName of listJsonFiles(paths.instruments)) {
    const filePath = path.join(paths.instruments, fileName);
    const instrument = readJson(filePath);

    if (!instrument) continue;

    if (!isPlainObject(instrument)) {
      fail(`Instrument file must contain an object: ${relative(filePath)}`);
      continue;
    }

    for (const field of REQUIRED_INSTRUMENT_FIELDS) {
      if (!(field in instrument)) {
        fail(`Instrument "${fileName}" is missing required field "${field}".`);
      }
    }

    if (typeof instrument.id !== 'string' || !instrument.id.startsWith('inst_')) {
      fail(`Instrument "${fileName}" has invalid id "${instrument.id}".`);
      continue;
    }

    if (fileName !== `${instrument.id}.json`) {
      fail(`Instrument filename mismatch: ${fileName} !== ${instrument.id}.json`);
    }

    if (instruments.has(instrument.id)) {
      fail(`Duplicate instrument id: ${instrument.id}`);
    }

    if (typeof instrument.family !== 'string' || instrument.family.trim() === '') {
      fail(`Instrument "${instrument.id}" must have a non-empty family.`);
    } else if (!familyValues.has(instrument.family)) {
      fail(`Instrument "${instrument.id}" has unknown family "${instrument.family}".`);
    }

    if (!(instrument.subfamily === null || typeof instrument.subfamily === 'string')) {
      fail(`Instrument "${instrument.id}" subfamily must be null or string.`);
    }

    for (const field of ['tags', 'regions', 'materials', 'playingMethods', 'similarInstruments']) {
      if (!isStringArray(instrument[field])) {
        fail(`Instrument "${instrument.id}" field "${field}" must be an array of strings.`);
      } else if (hasDuplicateStrings(instrument[field])) {
        warn(`Instrument "${instrument.id}" field "${field}" contains duplicate values.`);
      }
    }

    validateSortedStringArray(
      instrument.packIds,
      `Instrument "${instrument.id}" packIds`
    );

    validateTaxonomyArray(
      instrument.regions,
      regionValues,
      `Instrument "${instrument.id}" regions`
    );

    validateTaxonomyArray(
      instrument.materials,
      materialValues,
      `Instrument "${instrument.id}" materials`
    );

    validateTaxonomyArray(
      instrument.playingMethods,
      playingMethodValues,
      `Instrument "${instrument.id}" playingMethods`
    );

    if (typeof instrument.isPercussive !== 'boolean') {
      fail(`Instrument "${instrument.id}" isPercussive must be boolean.`);
    }

    if (typeof instrument.isPitched !== 'boolean') {
      fail(`Instrument "${instrument.id}" isPitched must be boolean.`);
    }

    if (!(instrument.pitchRange === null || typeof instrument.pitchRange === 'string')) {
      fail(`Instrument "${instrument.id}" pitchRange must be null or string.`);
    }

    if (
      typeof instrument.minorInstrumentScore !== 'number' ||
      instrument.minorInstrumentScore < 0 ||
      instrument.minorInstrumentScore > 1
    ) {
      fail(`Instrument "${instrument.id}" minorInstrumentScore must be a number between 0 and 1.`);
    }

    if (!isPlainObject(instrument.metadata)) {
      fail(`Instrument "${instrument.id}" metadata must be an object.`);
    } else {
      if (!('wikidataId' in instrument.metadata)) {
        fail(`Instrument "${instrument.id}" metadata.wikidataId is missing.`);
      }

      if (
        !(instrument.metadata.wikidataId === null || typeof instrument.metadata.wikidataId === 'string')
      ) {
        fail(`Instrument "${instrument.id}" metadata.wikidataId must be null or string.`);
      }

      if (!isStringArray(instrument.metadata.sourceRefs)) {
        fail(`Instrument "${instrument.id}" metadata.sourceRefs must be an array of strings.`);
      } else {
        for (const sourceRef of instrument.metadata.sourceRefs) {
          if (!isValidUrlLike(sourceRef)) {
            fail(`Instrument "${instrument.id}" has invalid sourceRef URL: ${sourceRef}`);
          }
        }
      }

      validateTaxonomyValue(
        instrument.metadata.license,
        licenseValues,
        `Instrument "${instrument.id}" metadata.license`
      );
    }

    validateFrequencyProfile(instrument);

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

  for (const fileName of listJsonFiles(paths.packs)) {
    const filePath = path.join(paths.packs, fileName);
    const pack = readJson(filePath);

    if (!pack) continue;

    if (!isPlainObject(pack)) {
      fail(`Pack file must contain an object: ${relative(filePath)}`);
      continue;
    }

    for (const field of REQUIRED_PACK_FIELDS) {
      if (!(field in pack)) {
        fail(`Pack "${fileName}" is missing required field "${field}".`);
      }
    }

    if (typeof pack.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(pack.id)) {
      fail(`Pack "${fileName}" has invalid id "${pack.id}".`);
      continue;
    }

    if (fileName !== `${pack.id}.json`) {
      fail(`Pack filename mismatch: ${fileName} !== ${pack.id}.json`);
    }

    if (packs.has(pack.id)) {
      fail(`Duplicate pack id: ${pack.id}`);
    }

    if (typeof pack.level !== 'number') {
      fail(`Pack "${pack.id}" level must be a number.`);
    }

    for (const field of ['title', 'description', 'category']) {
      if (typeof pack[field] !== 'string' || pack[field].trim() === '') {
        fail(`Pack "${pack.id}" field "${field}" must be a non-empty string.`);
      }
    }

    for (const field of ['defaultEnabled', 'recommended']) {
      if (typeof pack[field] !== 'boolean') {
        fail(`Pack "${pack.id}" field "${field}" must be boolean.`);
      }
    }

    if (typeof pack.sortOrder !== 'number') {
      fail(`Pack "${pack.id}" sortOrder must be a number.`);
    }

    if (validateSortedStringArray(pack.instrumentIds, `Pack "${pack.id}" instrumentIds`)) {
      if (pack.instrumentIds.length === 0) {
        fail(`Pack "${pack.id}" must not be empty.`);
      }
    }

    packs.set(pack.id, {
      fileName,
      filePath,
      data: pack
    });
  }

  return packs;
}

function loadLocales(instruments) {
  const locales = new Map();

  if (!fs.existsSync(paths.locales)) {
    fail(`Missing directory: ${relative(paths.locales)}`);
    return locales;
  }

  const localeCodes = fs
    .readdirSync(paths.locales)
    .filter((name) => fs.statSync(path.join(paths.locales, name)).isDirectory())
    .sort((a, b) => a.localeCompare(b));

  for (const locale of localeCodes) {
    const localeDir = path.join(paths.locales, locale);
    const localeEntries = new Map();

    for (const fileName of listJsonFiles(localeDir)) {
      const filePath = path.join(localeDir, fileName);
      const entry = readJson(filePath);

      if (!entry) continue;

      if (!isPlainObject(entry)) {
        fail(`Locale file must contain an object: ${relative(filePath)}`);
        continue;
      }

      for (const field of REQUIRED_LOCALE_FIELDS) {
        if (!(field in entry)) {
          fail(`Locale file "${relative(filePath)}" is missing required field "${field}".`);
        }
      }

      if (typeof entry.id !== 'string' || !entry.id.startsWith('inst_')) {
        fail(`Locale file "${relative(filePath)}" has invalid id "${entry.id}".`);
        continue;
      }

      if (fileName !== `${entry.id}.json`) {
        fail(`Locale filename mismatch: ${relative(filePath)} !== ${entry.id}.json`);
      }

      if (!instruments.has(entry.id)) {
        fail(`Locale "${locale}" references missing instrument "${entry.id}".`);
      }

      if (typeof entry.name !== 'string' || entry.name.trim() === '') {
        fail(`Locale "${locale}/${fileName}" must have a non-empty name.`);
      }

      if (!isStringArray(entry.aliases)) {
        fail(`Locale "${locale}/${fileName}" aliases must be an array of strings.`);
      }

      if (!isStringArray(entry.searchKeywords)) {
        fail(`Locale "${locale}/${fileName}" searchKeywords must be an array of strings.`);
      }

      if (typeof entry.description !== 'string') {
        fail(`Locale "${locale}/${fileName}" description must be a string.`);
      }

      localeEntries.set(entry.id, entry);
    }

    for (const instrumentId of instruments.keys()) {
      if (!localeEntries.has(instrumentId)) {
        fail(`Locale "${locale}" is missing file for instrument "${instrumentId}".`);
      }
    }

    locales.set(locale, localeEntries);
  }

  if (!locales.has('en')) {
    fail('Missing required locale: en');
  }

  if (!locales.has('ko')) {
    fail('Missing required locale: ko');
  }

  return locales;
}

function validateReferences(instruments, packs) {
  for (const { data: instrument } of instruments.values()) {
    for (const similarId of instrument.similarInstruments) {
      if (similarId === instrument.id) {
        fail(`Instrument "${instrument.id}" cannot reference itself in similarInstruments.`);
      }

      if (!instruments.has(similarId)) {
        fail(`Instrument "${instrument.id}" references missing similar instrument "${similarId}".`);
      }
    }

    for (const packId of instrument.packIds) {
      if (!packs.has(packId)) {
        fail(`Instrument "${instrument.id}" references missing pack "${packId}".`);
      }
    }
  }

  for (const { data: pack } of packs.values()) {
    for (const instrumentId of pack.instrumentIds) {
      if (!instruments.has(instrumentId)) {
        fail(`Pack "${pack.id}" references missing instrument "${instrumentId}".`);
      }
    }
  }

  for (const { data: pack } of packs.values()) {
    for (const instrumentId of pack.instrumentIds) {
      const instrument = instruments.get(instrumentId)?.data;

      if (!instrument) continue;

      if (!instrument.packIds.includes(pack.id)) {
        fail(
          [
            `Pack membership mismatch: pack "${pack.id}" contains "${instrumentId}",`,
            `but instrument "${instrumentId}" packIds is [${instrument.packIds.join(', ')}].`
          ].join(' ')
        );
      }
    }
  }

  for (const { data: instrument } of instruments.values()) {
    for (const packId of instrument.packIds) {
      const pack = packs.get(packId)?.data;

      if (!pack) continue;

      if (!pack.instrumentIds.includes(instrument.id)) {
        fail(
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
  const familyValues = loadTaxonomyValues('families.json');
  const licenseValues = loadTaxonomyValues('licenses.json');
  const materialValues = loadTaxonomyValues('materials.json');
  const playingMethodValues = loadTaxonomyValues('playing-methods.json');
  const regionValues = loadTaxonomyValues('regions.json');

  const instruments = loadInstruments(
    familyValues,
    licenseValues,
    materialValues,
    playingMethodValues,
    regionValues
  );
  const packs = loadPacks();

  validateReferences(instruments, packs);
  const locales = loadLocales(instruments);

  if (warnings.length > 0) {
    console.warn(`Validation completed with ${warnings.length} warning(s):`);
    for (const message of warnings) {
      console.warn(`- ${message}`);
    }
    console.warn('');
  }

  if (errors.length > 0) {
    console.error(`Validation failed with ${errors.length} error(s):`);
    for (const message of errors) {
      console.error(`- ${message}`);
    }
    process.exit(1);
  }

  console.log('Validation OK');
  console.log(`Checked ${instruments.size} instruments.`);
  console.log(`Checked ${packs.size} packs.`);
  console.log(`Checked ${locales.size} locales.`);
}

main();