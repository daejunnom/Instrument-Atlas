# Planned Metadata: Motion Profile

`motionProfile` is planned metadata for describing how a sound changes over time.

It is not part of the active Instrument Atlas source schema yet.

## Purpose

`frequencyProfile` describes where a sound tends to live in the frequency spectrum.

`motionProfile` describes how a sound changes over time.

Examples:

```txt
rising pitch
falling pitch
accelerating rhythm
decelerating rhythm
spectral brightening
spectral darkening
time-scale slowdown
time-scale speedup
```

## Draft simple shape

```json
{
  "motionProfile": {
    "type": "estimated",
    "confidence": "medium",
    "motionTypes": [
      "rising_pitch",
      "spectral_brightening"
    ],
    "notes": "Commonly perceived as a rising transition effect."
  }
}
```

## Draft motion types

```txt
none
rising_pitch
falling_pitch
accelerating_rhythm
decelerating_rhythm
spectral_brightening
spectral_darkening
time_scale_slowdown
time_scale_speedup
```

## Future requirements before activation

Before `motionProfile` becomes active source metadata, the project should define:

```txt
allowed motion types
estimated vs measured policy
confidence policy
whether detailed pitch/rhythm/spectral/time-scale objects are needed
validation rules
runtime export rules
```

Until then, active source files must not include `motionProfile`.