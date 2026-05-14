const NICKNAME_KEY = "cyberbab.nickname";
const USER_ID_KEY = "cyberbab.userId";
const AFTER_ONBOARD_KEY = "cyberbab.afterOnboard";

export function getNickname() {
  return localStorage.getItem(NICKNAME_KEY)?.trim() ?? "";
}

export function getUserId() {
  return localStorage.getItem(USER_ID_KEY)?.trim() ?? "";
}

export function saveSession({ nickname, userId }) {
  const normalizedNickname = nickname.trim();
  const normalizedUserId = `${userId ?? ""}`.trim();

  if (!normalizedNickname || !normalizedUserId) {
    throw new Error("invalid-session");
  }

  localStorage.setItem(NICKNAME_KEY, normalizedNickname);
  localStorage.setItem(USER_ID_KEY, normalizedUserId);
  return { nickname: normalizedNickname, userId: normalizedUserId };
}

export function saveNickname(nickname) {
  const normalizedNickname = nickname.trim();

  if (!normalizedNickname) {
    throw new Error("empty-nickname");
  }

  localStorage.setItem(NICKNAME_KEY, normalizedNickname);
  return normalizedNickname;
}

export function hasNickname() {
  return getNickname().length > 0;
}

export function hasUserSession() {
  return hasNickname() && getUserId().length > 0;
}

export function getAfterOnboardPath() {
  return sessionStorage.getItem(AFTER_ONBOARD_KEY) ?? "home.html";
}

export function clearAfterOnboardPath() {
  sessionStorage.removeItem(AFTER_ONBOARD_KEY);
}

export function requireNickname() {
  if (!hasUserSession()) {
    sessionStorage.setItem(
      AFTER_ONBOARD_KEY,
      `${window.location.pathname}${window.location.search}`
    );
    window.location.href = "index.html";
  }
}

export function redirectIfOnboarded() {
  if (!hasUserSession()) {
    return;
  }

  const destination = getAfterOnboardPath();
  clearAfterOnboardPath();
  window.location.href = destination;
}
