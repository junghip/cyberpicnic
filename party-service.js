import {
  extractPartyCode,
  formatPartyCode,
  generatePartyCode,
  isValidPartyCode,
  normalizePartyCode,
} from "./party-code.js";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const MOCK_PARTIES_KEY = "cyberbab.mockParties";

const SEED_PARTIES = {
  BAB026: {
    id: "party-bab026",
    code: "BAB026",
    name: "금요일 저녁 파티",
    memberCount: 0,
    members: [],
  },
  TEST01: {
    id: "party-test01",
    code: "TEST01",
    name: "테스트 그룹",
    memberCount: 0,
    members: [],
  },
};

function getSupabaseConfig() {
  return window.SUPABASE_CONFIG ?? {};
}

export function isSupabaseConfigured() {
  const { url, anonKey } = getSupabaseConfig();

  return Boolean(
    url &&
      anonKey &&
      !url.includes("YOUR_PROJECT_REF") &&
      !anonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

function createSupabaseClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createClient(url, anonKey);
}

function mapPartyRow(row) {
  if (!row || typeof row !== "object") {
    return {
      id: "",
      code: "",
      name: "",
      memberCount: 0,
    };
  }

  return {
    id: row.id ?? "",
    code: extractPartyCode(row),
    name: `${row.name ?? row.NAME ?? ""}`.trim(),
    memberCount: Number(row.member_count ?? row.memberCount ?? row.MEMBER_COUNT ?? 0),
  };
}

function isSupabaseSchemaError(error) {
  if (!error) {
    return false;
  }

  const message = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    message.includes("pgrst202") ||
    message.includes("could not find the function") ||
    message.includes("ambiguous") ||
    message.includes("42702") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

function getRpcErrorCode(error) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  if (message.includes("empty_name")) {
    return "empty-name";
  }

  if (message.includes("empty_guest")) {
    return "empty-guest";
  }

  if (message.includes("empty_code")) {
    return "empty-code";
  }

  if (message.includes("party_full")) {
    return "party-full";
  }

  if (message.includes("invalid_code")) {
    return "invalid-code";
  }

  if (message.includes("code_generation_failed")) {
    return "code-generation-failed";
  }

  return "unknown";
}

function readMockParties() {
  const rawValue = localStorage.getItem(MOCK_PARTIES_KEY);

  if (!rawValue) {
    return structuredClone(SEED_PARTIES);
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return structuredClone(SEED_PARTIES);
  }
}

function writeMockParties(parties) {
  localStorage.setItem(MOCK_PARTIES_KEY, JSON.stringify(parties));
}

function generateMockPartyCode(parties) {
  return generatePartyCode(new Set(Object.keys(parties)));
}

function joinPartyWithMock(code, guestId) {
  const normalizedCode = formatPartyCode(code);

  if (!normalizedCode) {
    throw new Error("invalid-code");
  }

  const parties = readMockParties();
  const party = parties[normalizedCode];

  if (!party) {
    throw new Error("invalid-code");
  }

  if (!party.members.includes(guestId)) {
    if (party.memberCount >= 8) {
      throw new Error("party-full");
    }

    party.members.push(guestId);
    party.memberCount += 1;
    writeMockParties(parties);
  }

  return mapPartyRow({
    id: party.id,
    code: party.code,
    name: party.name,
    member_count: party.memberCount,
  });
}

function createPartyWithMock(name, guestId) {
  const parties = readMockParties();
  const code = generateMockPartyCode(parties);
  const party = {
    id: `party-${code.toLowerCase()}`,
    code,
    name: name.trim(),
    memberCount: 1,
    members: [guestId],
  };

  parties[code] = party;
  writeMockParties(parties);

  return mapPartyRow(party);
}

async function joinPartyWithSupabase(code, guestId) {
  const normalizedCode = formatPartyCode(code);

  if (!normalizedCode) {
    throw new Error("invalid-code");
  }

  const supabase = createSupabaseClient();
  let { data, error } = await supabase.rpc("join_party_by_code", {
    party_code: normalizedCode,
    guest_id: guestId,
  });

  if (error && isSupabaseSchemaError(error)) {
    ({ data, error } = await supabase.rpc("join_party_by_code", {
      party_code: normalizedCode,
    }));
  }

  if (error) {
    if (isSupabaseSchemaError(error)) {
      if (isSupabaseConfigured()) {
        throw new Error("supabase-schema-not-applied");
      }

      return joinPartyWithMock(normalizedCode, guestId);
    }

    throw new Error(getRpcErrorCode(error));
  }

  const party = Array.isArray(data) ? data[0] : data;

  if (!party) {
    throw new Error("invalid-code");
  }

  return mapPartyRow(party);
}

async function createPartyWithSupabase(name, guestId) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc("create_party", {
    party_name: name,
    host_guest_id: guestId,
  });

  if (error) {
    if (isSupabaseSchemaError(error)) {
      if (isSupabaseConfigured()) {
        throw new Error("supabase-schema-not-applied");
      }

      return createPartyWithMock(name, guestId);
    }

    throw new Error(getRpcErrorCode(error));
  }

  const party = Array.isArray(data) ? data[0] : data;

  if (!party) {
    return createPartyWithMock(name, guestId);
  }

  const mappedParty = mapPartyRow(party);

  if (!mappedParty.code) {
    return createPartyWithMock(name, guestId);
  }

  return mappedParty;
}

export function buildInviteUrl(code) {
  const normalizedCode = formatPartyCode(code);

  if (!normalizedCode) {
    return "";
  }

  const url = new URL("social.html", window.location.href);
  url.searchParams.set("code", normalizedCode);
  return url.toString();
}

export function normalizePartyRecord(party) {
  return mapPartyRow(party);
}

export async function createParty(name, guestId) {
  try {
    if (isSupabaseConfigured()) {
      return await createPartyWithSupabase(name, guestId);
    }
  } catch (error) {
    if (!isSupabaseSchemaError(error)) {
      throw error;
    }
  }

  return createPartyWithMock(name, guestId);
}

export async function joinPartyByCode(code, guestId) {
  const normalizedCode = formatPartyCode(code);

  if (!normalizedCode) {
    throw new Error("invalid-code");
  }

  if (isSupabaseConfigured()) {
    return joinPartyWithSupabase(normalizedCode, guestId);
  }

  return joinPartyWithMock(normalizedCode, guestId);
}
