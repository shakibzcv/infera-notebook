/**
 * Audio Waveform Utility
 * Functions for processing audio buffers to generate visual waveform data.
 */

/**
 * Generates an array of peaks from a raw 16-bit PCM buffer.
 *
 * @param buffer - The raw PCM buffer (16-bit signed LE)
 * @param numPeaks - Number of data points to generate (default: 100)
 * @returns Array of normalized peak values (0 to 1)
 */
export function getWaveformPeaks(buffer: Buffer, numPeaks: number = 100): number[] {
  if (!buffer || buffer.length === 0) return [];

  // Each sample is 2 bytes for 16-bit PCM
  const samples = buffer.length / 2;
  const samplesPerPeak = Math.floor(samples / numPeaks);
  const peaks: number[] = [];

  for (let i = 0; i < numPeaks; i++) {
    const start = i * samplesPerPeak;
    const end = Math.min(start + samplesPerPeak, samples);
    let max = 0;

    for (let j = start; j < end; j++) {
      // Read 16-bit signed integer (Little Endian)
      const sample = Math.abs(buffer.readInt16LE(j * 2));
      if (sample > max) {
        max = sample;
      }
    }

    // Normalize max sample (max value for 16-bit signed is 32767)
    // We round to 3 decimal places to keep the JSON payload small
    peaks.push(Number((max / 32767).toFixed(3)));
  }

  return peaks;
}
