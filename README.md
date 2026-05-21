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
