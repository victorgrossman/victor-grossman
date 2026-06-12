import type { SiteLang } from "./types";

/** Lightweight heuristic — good enough to skip unnecessary API calls. */
export function detectLang(text: string): SiteLang {
  const sample = text.slice(0, 1200).toLowerCase();
  if (!sample.trim()) return "en";

  const deHints =
    (sample.match(/[äöüß]/g) || []).length +
    (sample.match(
      /\b(der|die|das|und|ist|nicht|ein|eine|mit|auf|für|auch|wurde|sind|haben|wird|nach|bei|aus|dem|den|des|vom|zum|zur|über|unter|zwischen|während|weil|wenn|dass|schon|noch|nur|sehr|mehr|alle|dieser|diese|dieses|jahr|jahren|berlin|deutschland)\b/g,
    ) || []).length;

  const enHints =
    (sample.match(
      /\b(the|and|is|was|with|for|that|this|from|have|has|had|were|been|being|would|could|should|about|into|through|during|before|after|above|below|between|under|again|further|then|once|here|there|when|where|why|how|all|each|few|more|most|other|some|such|only|own|same|than|too|very|can|will|just|don|now|year|years|berlin|germany)\b/g,
    ) || []).length;

  return deHints > enHints ? "de" : "en";
}

export function needsTranslation(text: string, targetLang: SiteLang): boolean {
  if (!text.trim()) return false;
  return detectLang(text) !== targetLang;
}
