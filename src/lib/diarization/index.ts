// Diarization seam: who said what. A MOCK stands in for Sarvam until a key is
// added; the selector swaps the real one in behind SARVAM_API_KEY with no change
// to callers.

export type Turn = { speaker: string; text: string };

export interface Diarizer {
  label: string;
  diarize(transcript: string): Promise<Turn[]>;
}

// MOCK: no real speaker identification. If the transcript already carries
// "Name: line" prefixes it keeps them; otherwise it alternates two speakers by
// sentence. Clearly a stand-in, labeled so.
const mockDiarizer: Diarizer = {
  label: "MOCK (no real diarization)",
  async diarize(transcript) {
    const lines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
    const prefixed = lines.length > 0 && lines.every((l) => /^[A-Z][\w .'-]{0,30}:/.test(l));
    if (prefixed) {
      return lines.map((l) => {
        const i = l.indexOf(":");
        return { speaker: l.slice(0, i).trim(), text: l.slice(i + 1).trim() };
      });
    }
    const sentences = transcript.split(/(?<=[.?!])\s+/).filter(Boolean);
    return sentences.map((s, i) => ({ speaker: `Speaker ${(i % 2) + 1}`, text: s }));
  },
};

// Real Sarvam (Saaras) diarizer, when SARVAM_API_KEY is set. Not implemented yet;
// swapping it in is writing this one method, nothing else.
const sarvamDiarizer: Diarizer = {
  label: "Sarvam Saaras",
  async diarize() {
    throw new Error("Sarvam diarization not implemented yet; set SARVAM_API_KEY and add the adapter.");
  },
};

export function getDiarizer(): Diarizer {
  return process.env.SARVAM_API_KEY ? sarvamDiarizer : mockDiarizer;
}
