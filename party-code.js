export const PARTY_CODE_LENGTH = 6;
export const PARTY_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const PARTY_CODE_PATTERN = /^[A-Z0-9]{6}$/;

export function normalizePartyCode(value) {
  return `${value ?? ""}`.trim().toUpperCase();
}

export function extractPartyCode(value) {
  if (value && typeof value === "object") {
    return normalizePartyCode(
      value.code ?? value.CODE ?? value.party_code ?? value.partyCode ?? ""
    );
  }

  return normalizePartyCode(value);
}

export function hasLetterAndNumber(code) {
  return /[A-Z]/.test(code) && /[0-9]/.test(code);
}

export function isValidPartyCode(value) {
  const code = normalizePartyCode(value);
  return PARTY_CODE_PATTERN.test(code) && hasLetterAndNumber(code);
}

export function generatePartyCode(existingCodes = new Set()) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let code = "";

    for (let index = 0; index < PARTY_CODE_LENGTH; index += 1) {
      const randomIndex = Math.floor(Math.random() * PARTY_CODE_ALPHABET.length);
      code += PARTY_CODE_ALPHABET[randomIndex];
    }

    if (!isValidPartyCode(code)) {
      continue;
    }

    if (existingCodes.has(code)) {
      continue;
    }

    return code;
  }

  throw new Error("code-generation-failed");
}

export function formatPartyCode(value) {
  const code = normalizePartyCode(value);
  return isValidPartyCode(code) ? code : "";
}
