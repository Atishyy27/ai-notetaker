// Audio storage seam: keep the recording for the dataset. A MOCK no-op stands in
// for R2/S3 until a bucket is provisioned; the selector swaps the real one in
// behind S3_ENDPOINT with no change to callers.

export interface AudioStore {
  label: string;
  // Returns the key the audio is addressable by. The mock does not store bytes.
  put(key: string, bytes: Uint8Array): Promise<{ key: string }>;
}

// MOCK: a no-op that hands back the key without storing anything, so the pipeline
// can carry an audio key with nothing provisioned. Labeled so.
const mockStore: AudioStore = {
  label: "MOCK (not stored)",
  async put(key) {
    return { key };
  },
};

// Real S3-compatible store (R2 / Backblaze B2 / S3) when S3_ENDPOINT is set. Left
// unimplemented here; the STT custom-provider seam already proves the S3 path and
// the real adapter slots in the same way.
const realStore: AudioStore = {
  label: "S3-compatible",
  async put() {
    throw new Error("Real audio storage not implemented here; set S3_* and add the adapter.");
  },
};

export function getAudioStore(): AudioStore {
  return process.env.S3_ENDPOINT ? realStore : mockStore;
}
