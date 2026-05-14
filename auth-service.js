import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

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

function isSupabaseSchemaError(error) {
  if (!error) {
    return false;
  }

  const message = `${error?.code ?? ""} ${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  return (
    message.includes("pgrst202") ||
    message.includes("could not find the function") ||
    message.includes("failed to fetch") ||
    message.includes("networkerror")
  );
}

function getAuthErrorCode(error) {
  const message = `${error?.message ?? ""} ${error?.details ?? ""}`.toLowerCase();

  if (message.includes("empty_nickname")) {
    return "empty-nickname";
  }

  if (message.includes("weak_password")) {
    return "weak-password";
  }

  if (message.includes("nickname_taken")) {
    return "nickname-taken";
  }

  if (message.includes("invalid_credentials")) {
    return "invalid-credentials";
  }

  if (isSupabaseSchemaError(error)) {
    return "supabase-schema-not-applied";
  }

  return "unknown";
}

function mapAuthRow(row) {
  if (!row || typeof row !== "object") {
    return null;
  }

  const userId = row.user_id ?? row.userId ?? row.id ?? "";
  const nickname = `${row.nickname ?? ""}`.trim();

  if (!userId || !nickname) {
    return null;
  }

  return { userId, nickname };
}

async function callAuthRpc(functionName, params) {
  if (!isSupabaseConfigured()) {
    throw new Error("supabase-not-configured");
  }

  const supabase = createSupabaseClient();
  const { data, error } = await supabase.rpc(functionName, params);

  if (error) {
    throw new Error(getAuthErrorCode(error));
  }

  const row = Array.isArray(data) ? data[0] : data;
  const session = mapAuthRow(row);

  if (!session) {
    throw new Error("invalid-response");
  }

  return session;
}

export async function registerUser(nickname, password) {
  return callAuthRpc("register_user", {
    p_nickname: nickname,
    p_password: password,
  });
}

export async function loginUser(nickname, password) {
  return callAuthRpc("login_user", {
    p_nickname: nickname,
    p_password: password,
  });
}

export function getAuthErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "계정 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error.message === "empty-nickname") {
    return "닉네임을 입력해 주세요.";
  }

  if (error.message === "weak-password") {
    return "비밀번호는 4자 이상이어야 합니다.";
  }

  if (error.message === "nickname-taken") {
    return "이미 사용 중인 닉네임입니다.";
  }

  if (error.message === "invalid-credentials") {
    return "닉네임 또는 비밀번호가 올바르지 않습니다.";
  }

  if (error.message === "supabase-not-configured") {
    return "Supabase 설정이 필요합니다. supabase-config.js를 확인해 주세요.";
  }

  if (error.message === "supabase-schema-not-applied") {
    return "계정 테이블이 아직 없습니다. Supabase SQL Editor에서 supabase/users-auth.sql을 실행해 주세요.";
  }

  return "계정 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.";
}
