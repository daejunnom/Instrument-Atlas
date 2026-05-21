# Instrument Atlas

Instrument Atlas is a multilingual metadata catalog for musical instruments and sound sources.

It is designed to provide structured, app-friendly instrument data for music generation tools, video editors, audio editors, sample browsers, educational tools, and other creative applications.

Instrument Atlas is not an audio sample repository. It does not store actual sound files. Instead, it focuses on structured metadata such as instrument names, aliases, multilingual labels, categories, regions, materials, playing methods, search tags, related instruments, rarity information, and source/license metadata.

## Goals

The goal of this project is to provide a reusable instrument metadata catalog that can be shared across multiple applications.

Instrument Atlas aims to help applications:

- Normalize instrument names and aliases
- Support multilingual instrument search
- Group instruments into useful packs
- Provide structured metadata for UI, search, filtering, and recommendation features
- Include both common and minor instruments
- Keep source data easy to review and contribute to
- Provide runtime-friendly release artifacts for applications

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

Actual audio files should not be added to this repository.

## Data model

Each instrument is managed as a separate source JSON file.

Example:

```txt
data/instruments/inst_808_cowbell.json
````

Language-specific names, aliases, search keywords, and descriptions are stored separately under `locales/`.

Example:

```txt
locales/en/inst_808_cowbell.json
locales/ko/inst_808_cowbell.json
```

This separation keeps core instrument metadata independent from translation data.

## Repository structure

```txt
instrument-atlas/
  README.md
  LICENSE
  package.json

  data/
    instruments/
      inst_grand_piano.json
      inst_acoustic_guitar.json
      inst_electric_guitar.json
      inst_808_cowbell.json
      inst_agogo_bells.json

    packs/
      core.json
      standard-drums.json
      standard-keys.json
      standard-guitars.json
      standard-orchestral.json
      electronic-percussion.json
      world-east-asia.json
      world-south-asia.json
      world-middle-east.json
      world-africa.json
      world-latin.json
      foley.json
      synths.json

    taxonomy/
      families.json
      regions.json
      materials.json
      playing-methods.json
      tags.json

  locales/
    en/
      inst_grand_piano.json
      inst_808_cowbell.json

    ko/
      inst_grand_piano.json
      inst_808_cowbell.json

    ja/
      inst_grand_piano.json

    zh/
      inst_grand_piano.json

  scripts/
    validate.mjs
    build.mjs
    package-release.mjs

  dist/
    instruments/
      v1/
        manifest.json
        indexes/
        packs/
```

## Core principles

1. Source data is managed as one JSON file per instrument.
2. Runtime distribution files are not provided as one file per instrument.
3. Source data and build artifacts are separated.
4. Actual audio sample files are not stored in this repository.
5. This repository provides metadata only.
6. UI translations and instrument data translations are managed separately.
7. External contributors should be able to add or edit one instrument easily.
8. Applications should consume release artifacts by pack or index.

## Instrument source example

```json
{
  "id": "inst_808_cowbell",
  "family": "bells_idiophones",
  "subfamily": "electronic_percussion",
  "tags": ["808", "cowbell", "electronic", "funk", "latin", "drum_machine"],
  "regions": ["global"],
  "materials": ["electronics"],
  "playingMethods": ["triggered", "sequenced"],
  "isPercussive": true,
  "isPitched": true,
  "pitchRange": null,
  "similarInstruments": ["inst_cowbell", "inst_agogo_bells"],
  "minorInstrumentScore": 0.75,
  "packIds": ["core", "electronic-percussion", "standard-drums"],
  "metadata": {
    "wikidataId": null,
    "sourceRefs": [],
    "license": "CC0"
  }
}
```

Instrument source files should not contain localized names or descriptions. Localized data belongs in `locales/{locale}/`.

## Locale example

```json
{
  "id": "inst_808_cowbell",
  "name": "808 Cowbell",
  "aliases": ["TR-808 cowbell", "808 bell", "electronic cowbell"],
  "searchKeywords": ["808", "cowbell", "funk", "latin", "drum machine", "electronic percussion"],
  "description": "A synthetic cowbell sound associated with classic drum machines, funk, electro, and dance music."
}
```

## Packs

Packs are used to group instruments into downloadable or loadable units.

Initial pack levels:

```txt
Level 1: Core
  Common instruments and essential sound sources.

Level 2: Standard
  Frequently used instrument groups such as drums, keys, guitars, orchestral instruments, and synths.

Level 3: Extended
  World instruments, rare instruments, foley, historical instruments, and special sound sources.
```

Example packs:

```txt
core
standard-drums
standard-keys
standard-guitars
standard-orchestral
standard-vocals
electronic-percussion
synths
foley
world-east-asia
world-south-asia
world-middle-east
world-africa
world-latin
rare-folk
historical
```

## Build artifacts

Source files are optimized for contribution and review.

Build artifacts are optimized for application runtime usage.

Recommended output structure:

```txt
dist/instruments/v1/
  manifest.json

  indexes/
    core.en.json
    core.ko.json
    standard.en.json
    standard.ko.json
    extended.en.json
    extended.ko.json

  packs/
    core.en.json
    core.ko.json
    standard-drums.en.json
    standard-drums.ko.json
    standard-keys.en.json
    standard-keys.ko.json
    electronic-percussion.en.json
    electronic-percussion.ko.json
```

Applications should initially load only `manifest.json` and the required core pack. Additional packs can be loaded on demand.

## Validation

The validation script should check:

* Duplicate instrument IDs
* Filename and ID consistency
* Required fields
* Pack ID references
* Similar instrument references
* Locale ID consistency
* Missing locale names
* `minorInstrumentScore` range
* Source reference URL format
* Taxonomy values
* Empty packs
* JSON parse errors

## Build process

Recommended commands:

```sh
npm run validate
npm run build
npm run package
```

Expected release package:

```txt
instrument-atlas-v1.0.0.zip
```

Expected package contents:

```txt
instruments/v1/manifest.json
instruments/v1/indexes/...
instruments/v1/packs/...
```

Applications should use a fixed release version instead of directly depending on the latest branch state.

Example:

```txt
INSTRUMENT_ATLAS_VERSION=v1.0.0
INSTRUMENT_ATLAS_URL=https://github.com/<owner>/instrument-atlas/releases/download/v1.0.0/instrument-atlas-v1.0.0.zip
```

## MVP scope

The first version should stay small and complete.

Initial MVP:

* 10 to 30 instruments
* English and Korean locales
* Core pack only
* Validation script
* Build script
* Manifest generation
* Pack JSON generation
* GitHub Release zip package

Suggested initial instruments:

```txt
inst_grand_piano
inst_acoustic_guitar
inst_electric_guitar
inst_drum_kit
inst_kick_drum
inst_snare_drum
inst_hi_hat
inst_cowbell
inst_808_cowbell
inst_agogo_bells
```

## Roadmap

### Phase 1: MVP

* Create source directory structure
* Add 10 to 30 core instruments
* Add English and Korean locale files
* Add validation script
* Add build script
* Generate core pack
* Publish first alpha release

### Phase 2: Standard packs

* Add 100+ instruments
* Add standard drum, key, guitar, orchestral, and synth packs
* Add search index generation
* Improve contribution guide
* Add JSON Schema validation

### Phase 3: Extended catalog

* Add 300 to 1000+ instruments and sound sources
* Add world, foley, rare, and historical packs
* Expand multilingual aliases
* Add source references and Wikidata IDs
* Strengthen automated validation

## License

Recommended license structure:

```txt
Code and scripts: MIT
Data: CC0 or CC BY 4.0
```

CC0 is recommended if maximum reuse is the priority.

CC BY 4.0 is recommended if attribution and contributor/source visibility are important.

Actual audio samples should not be included in this repository.

## Contributing

Contributions are welcome.

You can contribute by:

* Adding a new instrument
* Improving aliases
* Adding locale files
* Improving search keywords
* Adding source references
* Fixing taxonomy values
* Improving validation or build scripts

Before opening a pull request, please make sure:

* The instrument ID follows the project naming rules
* The filename matches the instrument ID
* No audio files are included
* Locale files match existing instrument IDs
* Pack IDs and taxonomy values are valid
* Validation passes successfully

## Project status

Instrument Atlas is in early planning and MVP development.

The current focus is building a small but complete catalog structure before expanding the number of instruments.
