import { levelsFromSamples } from "./waveform";

// Browser-only half of the waveform: decoding needs AudioContext, which the
// node tests do not have, so it lives apart from levelsFromSamples.

/** Decodes a recording and returns its levels, or null if the browser can't decode it. */
export async function computeWaveform(blob: Blob, buckets = 48): Promise<number[] | null> {
  try {
    const Ctx = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    try {
      const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
      return levelsFromSamples(audio.getChannelData(0), buckets);
    } finally {
      void ctx.close();
    }
  } catch {
    return null;
  }
}
