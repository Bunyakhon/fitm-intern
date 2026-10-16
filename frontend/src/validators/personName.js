const MAX_PERSON_NAME_LENGTH = 255;
const letter = /^\p{L}$/u;
const nameScript = /^\p{Script_Extensions=Thai}$/u;
const mark = /^[\p{Mn}\p{Mc}]$/u;
const invisible = /^\p{Default_Ignorable_Code_Point}$/u;
const separators = new Set([" ", "-", "'", "\u2018", "\u2019", "\u2010", "\u2011"]);

// Website registration only; Google identities keep their separate name policy.
function isThaiPersonName(value) {
  if (typeof value !== "string") return false;
  const characters = [...value.trim()];
  // PostgreSQL VARCHAR counts code points, including combining marks, not UTF-16 units.
  if (!characters.length || characters.length > MAX_PERSON_NAME_LENGTH) return false;
  let hasBase = false, afterSpace = false;
  for (const character of characters) {
    if (invisible.test(character)) return false;
    // Thai paiyannoi/maiyamok are Unicode letters but are punctuation, not name letters.
    if (letter.test(character) && nameScript.test(character) && !/[\u0e2f\u0e46]/u.test(character)) {
      hasBase = true; afterSpace = false;
    } else if (mark.test(character) && hasBase && nameScript.test(character)) {
      // Keep Thai spelling and combining sequences exactly as entered.
    } else if (separators.has(character) && hasBase) {
      hasBase = false; afterSpace = character === " ";
    } else if (character === " " && afterSpace) {
      // Preserve runs of ordinary internal spaces; reject controls/zero-width characters.
    } else return false;
  }
  return hasBase; // No leading/trailing separators or detached combining marks.
}

export { MAX_PERSON_NAME_LENGTH, isThaiPersonName };
