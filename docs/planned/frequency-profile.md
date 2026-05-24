# Planned Metadata: Frequency Profile

`frequencyProfile` is planned metadata for future audio-aware filtering, search, analysis, and mix-assist features.

It is not part of the active Instrument Atlas source schema yet.

## Why this is planned

Frequency data is difficult to keep reliable without clear measurement rules.

Different recordings, tunings, microphone positions, synthesis methods, sample packs, and processing chains can produce very different frequency behavior for the same instrument.

Until the project has a stronger data policy, frequency metadata should stay out of active instrument source files.

## Draft shape

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
    "notes": "Estimated mix-oriented profile. Actual values vary by tuning, sample, recording, and processing."
  }
}
```

## Draft frequency bands

```txt
sub          20-60 Hz
bass         60-250 Hz
low_mid      250-500 Hz
mid          500-2000 Hz
presence     2000-6000 Hz
brilliance   6000-12000 Hz
air          12000-20000 Hz
```

## Future requirements before activation

Before `frequencyProfile` becomes active source metadata, the project should define:

```txt
measurement source
estimated vs measured policy
confidence policy
allowed band roles
instrument variation handling
sample/synthesis dependency policy
validation rules
runtime export rules
```

Until then, active source files must not include `frequencyProfile`.