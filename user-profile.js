const NICKNAME_KEY = "cyberbab.nickname";
const AFTER_ONBOARD_KEY = "cyberbab.afterOnboard";

export function getNickname() {
  return localStorage.getItem(NICKNAME_KEY)?.trim() ?? "";
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

export function getAfterOnboardPath() {
  return sessionStorage.getItem(AFTER_ONBOARD_KEY) ?? "home.html";
}

export function clearAfterOnboardPath() {
  sessionStorage.removeItem(AFTER_ONBOARD_KEY);
}

export function requireNickname() {
  if (!hasNickname()) {
    sessionStorage.setItem(
      AFTER_ONBOARD_KEY,
      `${window.location.pathname}${window.location.search}`
    );
    window.location.href = "index.html";
  }
}

export function redirectIfOnboarded() {
  if (!hasNickname()) {
    return;
  }

  const destination = getAfterOnboardPath();
  clearAfterOnboardPath();
  window.location.href = destination;
}
