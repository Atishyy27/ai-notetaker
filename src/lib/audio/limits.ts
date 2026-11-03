// Gnani's REST STT accepts up to 30 s per request. Recording stops at 25 s so
// container overhead and timer drift never push a clip over the limit.
export const GNANI_MAX_SECONDS = 25;
