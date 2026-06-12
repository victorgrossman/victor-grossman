export type DetectedLang = "en" | "de";

/** Lightweight heuristic for memorial content (English bulletins vs German articles). */
export function detectContentLang(text: string): DetectedLang {
  const sample = text.slice(0, 2000).toLowerCase();
  const german =
    (sample.match(
      /\b(der|die|das|und|ist|ein|eine|mit|für|auf|nicht|auch|von|dem|den|des|sich|war|wurde|nach|bei|am|im|zum|zur)\b/g,
    ) ?? []).length;
  const english =
    (sample.match(
      /\b(the|and|is|are|was|were|with|for|not|also|from|that|this|have|has|had|but|they|their|been|would)\b/g,
    ) ?? []).length;
  return german > english ? "de" : "en";
}
