# Instrument Atlas

Instrument Atlas is a multilingual metadata catalog for musical instruments and sound sources.

It provides structured, app-friendly JSON data for music generation tools, video editors, audio editors, sample browsers, educational tools, search systems, and other creative applications.

Instrument Atlas is not an audio sample repository. It does not store sound files. Instead, it focuses on metadata such as instrument names, aliases, multilingual labels, categories, packs, regions, materials, playing methods, search keywords, related instruments, rarity information, optional frequency profiles, and source/license metadata.

## Goals

Instrument Atlas aims to help applications:

- Normalize instrument names and aliases
- Support multilingual instrument search
- Group instruments and sound sources into useful packs
- Provide structured metadata for UI, search, filtering, and recommendation features
- Include both common and minor instruments
- Keep source data easy to review and contribute to
- Generate runtime-friendly release artifacts for applications

## What this project is

Instrument Atlas is:

- A metadata catalog for instruments and sound sources
- A multilingual instrument naming and alias database
- A structured JSON dataset
- A source dataset for app-ready build artifacts
- A contribution-friendly repository where each instrument can be edited independently

## What this project is not

Instrument Atlas is not:

- An audio sample library
- A sound pack repository
- A VST/plugin collection
- A loop or preset marketplace
- A replacement for licensed sample databases
- An audio isolation or stem separation engine

Actual audio files should not be added to this repository.

## Current status

Instrument Atlas is in early alpha development.

Current source data includes:

```txt
96 instruments and sound sources
12 packs
2 locales: en, ko
7 taxonomy files
validation script
runtime catalog build script
release package script
```

The current focus is stabilizing the source data, validation pipeline, runtime build artifacts, and release package workflow before expanding the catalog further.

## Repository structure

```txt
instrument-atlas/
  README.md
  package.json

  data/
    instruments/
      inst_grand_piano.json
      inst_acoustic_guitar.json
      inst_kick_drum.json
      inst_hihat.json
      ...

    packs/
      core.json
      standard-drums.json
      standard-orchestral.json
      synths.json
      foley.json
      extended.json
      world-east-asia.json
      world-south-asia.json
      world-europe.json
      world-africa.json
      world-latin.json
      world-oceania.json

    taxonomy/
      families.json
      frequency-bands.json
      licenses.json
      materials.json
      playing-methods.json
      regions.json
      tags.json

  locales/
    en/
      inst_grand_piano.json
      inst_acoustic_guitar.json
      ...

    ko/
      inst_grand_piano.json
      inst_acoustic_guitar.json
      ...

  scripts/
    validate.mjs
    build.mjs
    package-release.mjs
    check-pack-links.mjs

  dist/
    instruments/
      v1/
        manifest.json
        packs/
        indexes/

  release/
    instrument-atlas-v0.1.0.zip
```

`dist/` and `release/` are generated artifacts and should not be committed.

`_import/` and `_local/` are local-only folders and should not be committed.

## Core principles

1. Source data is managed as one JSON file per instrument.
2. Localized names, aliases, keywords, and descriptions are stored separately.
3. Runtime distribution files are generated from source data.
4. Actual audio sample files are not stored in this repository.
5. This repository provides metadata only.
6. Applications should consume versioned release artifacts, not the latest branch state.
7. External contributors should be able to add or edit one instrument without touching the whole dataset.
8. Optional advanced metadata such as frequency profiles should remain optional and additive.

## Data model

Each instrument is managed as a separate source JSON file.

Example:

```txt
data/instruments/inst_grand_piano.json
```

Language-specific names, aliases, search keywords, and descriptions are stored separately under `locales/`.

Example:

```txt
locales/en/inst_grand_piano.json
locales/ko/inst_grand_piano.json
```

This separation keeps core instrument metadata independent from translation data.

## Instrument source example

```json
{
  "id": "inst_grand_piano",
  "family": "Keys",
  "subfamily": null,
  "tags": [
    "keyboard",
    "acoustic",
    "hammer",
    "classical",
    "jazz"
  ],
  "regions": [
    "Global",
    "Europe"
  ],
  "materials": [
    "Metal",
    "Wood"
  ],
  "playingMethods": [
    "Struck"
  ],
  "isPercussive": true,
  "isPitched": true,
  "pitchRange": "A0-C8",
  "similarInstruments": [
    "inst_upright_piano",
    "inst_rhodes"
  ],
  "minorInstrumentScore": 0.1,
  "packIds": [
    "core"
  ],
  "metadata": {
    "wikidataId": "Q5994",
    "sourceRefs": [],
    "license": "CC0-1.0"
  }
}
```

Instrument source files should not contain localized names or localized descriptions. Localized data belongs in `locales/{locale}/`.

## Locale source example

```json
{
  "id": "inst_grand_piano",
  "name": "Grand Piano",
  "aliases": [
    "Grand Piano",
    "piano",
    "grand piano",
    "studio piano"
  ],
  "searchKeywords": [
    "piano",
    "keyboard",
    "hammer percussion"
  ],
  "description": "A large acoustic piano where the frame and strings are horizontal."
}
```

## Optional frequency profile metadata

Some instruments may include optional `frequencyProfile` metadata.

This data is intended as a practical hint for search, filtering, analysis, or audio-tool integrations. It is not required for every instrument.

Example:

```json
{
  "frequencyProfile": {
    "type": "estimated",
    "confidence": "medium",
    "fundamentalRangeHz": [
      40,
      120
    ],
    "prominentBands": [
      {
        "role": "sub",
        "rangeHz": [
          40,
          80
        ],
        "description": "Low-end weight and thump"
      }
    ],
    "transientBands": [],
    "noiseBands": [],
    "notes": "Estimated mix-oriented profile. Actual values vary by tuning, sample, and processing."
  }
}
```

Frequency metadata should be treated as optional and approximate unless backed by measured or cited data.

## Packs

Packs group instruments and sound sources into loadable units.

Current packs:

```txt
core
standard-drums
standard-orchestral
synths
foley
extended
world-east-asia
world-south-asia
world-europe
world-africa
world-latin
world-oceania
```

Pack levels:

```txt
Level 1: Core
  Common instruments and essential sound sources.

Level 2: Standard
  Frequently used instrument groups such as drums, orchestral instruments, synths, foley, and regional/world instruments.

Level 3: Extended
  Rare, minor, experimental, or specialized instruments and sound sources.
```

## Runtime build artifacts

Source files are optimized for contribution and review.

Runtime artifacts are optimized for application usage.

Generated output structure:

```txt
dist/instruments/v1/
  manifest.json

  indexes/
    search.en.json
    search.ko.json
    pack-search.en.json
    pack-search.ko.json

  packs/
    core.en.json
    core.ko.json
    standard-drums.en.json
    standard-drums.ko.json
    standard-orchestral.en.json
    standard-orchestral.ko.json
    ...
```

Applications should initially load `manifest.json`, then load the required search index or pack files on demand.

Instrument search indexes are intended for finding individual instruments.

Pack search indexes are intended for finding loadable instrument groups, onboarding presets, category bundles, and recommended pack selections.

## Release package

The package script creates a zip file for GitHub Releases.

Expected output:

```txt
release/instrument-atlas-v0.1.0.zip
```

Expected zip contents:

```txt
instruments/v1/manifest.json
instruments/v1/indexes/search.en.json
instruments/v1/indexes/search.ko.json
instruments/v1/indexes/pack-search.en.json
instruments/v1/indexes/pack-search.ko.json
instruments/v1/packs/core.en.json
instruments/v1/packs/core.ko.json
...
```

Applications should use a fixed release version instead of directly depending on the latest branch state.

Example:

```txt
INSTRUMENT_ATLAS_VERSION=v0.1.0
INSTRUMENT_ATLAS_URL=https://github.com/<owner>/Instrument-Atlas/releases/download/v0.1.0/instrument-atlas-v0.1.0.zip
```

## Scripts

Install dependencies:

```sh
npm install
```

Validate source data:

```sh
npm run validate
```

Build runtime catalog files:

```sh
npm run build
```

Create a release zip:

```sh
npm run package
```

Check pack and instrument links only:

```sh
npm run check:packs
```

## Validation

The validation script checks:

- JSON parse errors
- Duplicate instrument IDs
- Instrument filename and ID consistency
- Pack filename and ID consistency
- Locale filename and ID consistency
- Required fields
- Pack ID references
- Pack membership bidirectional consistency
- Pack and instrument membership sorting
- Similar instrument references
- Locale coverage
- Missing locale names
- `minorInstrumentScore` range
- Source reference URL format
- Family taxonomy values
- Metadata license taxonomy values
- Region taxonomy values
- Material taxonomy values
- Playing method taxonomy values
- Empty packs
- Optional `frequencyProfile` structure

## Build process

Recommended local workflow:

```sh
npm run validate
npm run build
npm run package
```

Expected successful validation:

```txt
Validation OK
Checked 96 instruments.
Checked 12 packs.
Checked 2 locales.
```

Expected successful build:

```txt
Build OK
Generated manifest: dist/instruments/v1/manifest.json
Generated pack files: 24
Generated search indexes: 4
```

With 12 packs and 2 locales, the build should generate 24 localized pack files and 4 localized search index files.

The 4 search index files are:

```txt
search.en.json
search.ko.json
pack-search.en.json
pack-search.ko.json
```

## Contribution guide

Contributions are welcome.

You can contribute by:

- Adding a new instrument or sound source
- Improving aliases
- Adding or improving locale files
- Improving search keywords
- Adding source references
- Fixing taxonomy values
- Improving validation or build scripts
- Adding optional frequency metadata where useful

Before opening a pull request, make sure:

- The instrument ID starts with `inst_`
- The filename matches the instrument ID
- No audio files are included
- Locale files match existing instrument IDs
- Pack IDs are valid
- Pack and instrument membership lists are sorted and bidirectionally consistent
- Similar instrument references are valid
- `metadata.license` uses a canonical value from `data/taxonomy/licenses.json`
- `regions`, `materials`, and `playingMethods` use canonical values from `data/taxonomy/`
- Validation passes successfully

Run:

```sh
npm run validate
```

## Data and code license

Instrument Atlas uses a split license structure:

```txt
Code, scripts, and tooling: MIT License
Structured catalog data: CC0 1.0 Universal
```

See:

```txt
LICENSE
DATA-LICENSE
```

The structured data in `data/`, `locales/`, and generated catalog artifacts is dedicated under CC0 1.0 Universal to make reuse as easy as possible for applications, tools, datasets, and research projects.

Actual audio samples should not be included in this repository.

## Roadmap

### Phase 1: Alpha catalog

- Maintain the current 96-instrument source dataset
- Keep English and Korean locale coverage complete
- Keep validation, build, and package scripts stable
- Publish the first versioned release zip
- Improve README and contribution guidance

### Phase 2: Data quality pass

- Fix inconsistent aliases and search keywords
- Improve empty descriptions
- Normalize taxonomy values
- Add more source references
- Add Wikidata IDs where appropriate
- Add or improve optional frequency profiles where useful

### Phase 3: Expanded catalog

- Add more world, foley, electronic, historical, and minor instruments
- Add additional locales
- Add JSON Schema files
- Add GitHub Actions for validation and release packaging
- Improve release automation and consumer documentation

## Project status

Instrument Atlas is in early alpha development.

The current focus is stabilizing the source data, validation pipeline, runtime build artifacts, and release package workflow before expanding the catalog further.