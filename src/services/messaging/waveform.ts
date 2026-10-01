// A voice note's waveform: a few dozen loudness levels, 0..100, computed on the
// sender's device when the note is recorded. The server never analyses audio,
// which is why the column (messages.voice_waveform) can only be filled here.

/** Loudness levels from raw samples: RMS per bucket, scaled so the loudest is 100. */
export function levelsFromSamples(samples: Float32Array, buckets = 48): number[] {
  if (samples.length === 0 || buckets <= 0) return [];
  const size = Math.max(1, Math.floor(samples.length / buckets));
  const rms: number[] = [];
  for (let b = 0; b < buckets; b++) {
    const start = b * size;
    if (start >= samples.length) break;
    let sum = 0;
    const end = Math.min(samples.length, start + size);
    for (let i = start; i < end; i++) sum += samples[i] * samples[i];
    rms.push(Math.sqrt(sum / (end - start)));
  }
  const peak = Math.max(...rms);
  if (!(peak > 0)) return rms.map(() => 0);
  // A floor of 4 keeps silent stretches visible as a line rather than a gap.
  return rms.map((v) => Math.max(4, Math.min(100, Math.round((v / peak) * 100))));
}
