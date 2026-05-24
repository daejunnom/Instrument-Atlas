# Planned Metadata: Isolation Hints

`isolationHints` is planned metadata for helping consuming applications focus on likely regions of a sound inside an audio recording.

It is not part of the active Instrument Atlas source schema yet.

Instrument Atlas should not perform audio isolation itself.

A consuming application may use future `isolationHints` to configure filtering, mid-side focus, transient focus, or visual analysis tools.

## Draft shape

```json
{
  "isolationHints": {
    "recommendedMode": "band_limited_center_focus",
    "frequencyFocusHz": [
      700,
      5000
    ],
    "stereoFocus": "center_or_narrow",
    "transientFocus": true,
    "expectedDifficulty": "medium"
  }
}
```

## Draft isolation modes

```txt
frequency_focus
center_focus
side_focus
band_limited_center_focus
transient_focus
```

## Future requirements before activation

Before `isolationHints` becomes active source metadata, the project should define:

```txt
allowed isolation modes
allowed stereo focus values
allowed expected difficulty values
frequency range policy
relationship to frequencyProfile
relationship to motionProfile
validation rules
runtime export rules
```

Until then, active source files must not include `isolationHints`.