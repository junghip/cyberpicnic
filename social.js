import { buildInviteUrl, joinPartyByCode, normalizePartyRecord } from "./party-service.js";
import { getGuestId } from "./guest-session.js";
import { bindMainTabs } from "./navigation.js";
import { getNickname, requireNickname } from "./user-profile.js";
import { extractPartyCode, isValidPartyCode, normalizePartyCode } from "./party-code.js";

const PARTY_STORAGE_KEY = "cyberbab.currentParty";

const createPartyButton = document.querySelector("[data-open-create-party]");
const emptyPartyButtons = document.querySelectorAll(".party-card--empty");
const profileButton = document.querySelector("#profile-button");
const partyCodeButton = document.querySelector("[data-open-party-modal]");
const partyCodeModal = document.querySelector("#party-code-modal");
const partyCodeForm = document.querySelector("#party-code-form");
const partyCodeInput = document.querySelector("#party-code-input");
const partyCodeError = document.querySelector("#party-code-error");
const partyCodeFeedback = document.querySelector("#party-code-feedback");
const partyModalCloseButtons = document.querySelectorAll("[data-close-party-modal]");
const partySubmitButton = partyCodeForm?.querySelector('button[type="submit"]');
const sharePartyModal = document.querySelector("#share-party-modal");
const sharePartyCode = document.querySelector("#share-party-code");
const sharePartyUrl = document.querySelector("#share-party-url");
const sharePartyCloseButtons = document.querySelectorAll("[data-close-share-party-modal]");
const copyPartyCodeButton = document.querySelector("[data-copy-party-code]");
const copyPartyUrlButton = document.querySelector("[data-copy-party-url]");
const enterSharedPartyButton = document.querySelector("[data-enter-shared-party]");

let pendingSharedParty = null;

requireNickname();
bindMainTabs();

const nickname = getNickname();

if (profileButton && nickname) {
  profileButton.setAttribute("aria-label", `${nickname} 프로필`);
  profileButton.textContent = nickname.slice(0, 1);
}

function resolvePartyCode(party) {
  const storedParty = readStoredParty();
  const codeFromDisplay = sharePartyCode?.textContent?.trim() ?? "";
  return extractPartyCode(party) || extractPartyCode(storedParty) || normalizePartyCode(codeFromDisplay);
}

function bindPartyCodeInput() {
  if (!partyCodeInput) {
    return;
  }

  partyCodeInput.addEventListener("input", () => {
    partyCodeInput.value = normalizePartyCode(partyCodeInput.value)
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
  });
}

function saveCurrentParty(party) {
  sessionStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(party));
}

function setPartyFeedback(message, type = "success") {
  if (!partyCodeFeedback) {
    return;
  }

  partyCodeFeedback.textContent = message;
  partyCodeFeedback.hidden = false;
  partyCodeFeedback.classList.remove("is-error", "is-success");
  partyCodeFeedback.classList.add(type === "error" ? "is-error" : "is-success");
}

function clearPartyFeedback() {
  if (!partyCodeFeedback) {
    return;
  }

  partyCodeFeedback.textContent = "";
  partyCodeFeedback.hidden = true;
  partyCodeFeedback.classList.remove("is-error", "is-success");
}

function setPartyFormError(message) {
  if (!partyCodeError) {
    return;
  }

  partyCodeError.textContent = message;
  partyCodeError.hidden = !message;
}

function openPartyModal(prefillCode = "") {
  if (!partyCodeModal || !partyCodeInput) {
    return;
  }

  clearPartyFeedback();
  setPartyFormError("");
  partyCodeModal.hidden = false;
  partyCodeInput.value = prefillCode;
  partyCodeInput.focus();
}

function closePartyModal() {
  if (!partyCodeModal) {
    return;
  }

  partyCodeModal.hidden = true;
  setPartyFormError("");
}

function readStoredParty() {
  const rawValue = sessionStorage.getItem(PARTY_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch (error) {
    return null;
  }
}

function openSharePartyModal(party) {
  if (!sharePartyModal || !sharePartyCode || !sharePartyUrl) {
    setPartyFeedback("공유 화면을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.", "error");
    return;
  }

  const normalizedParty = normalizePartyRecord(party);
  const code = extractPartyCode(normalizedParty) || extractPartyCode(party);

  if (!code) {
    setPartyFeedback("파티 코드를 받지 못했습니다. 새로고침 후 다시 생성해 주세요.", "error");
    return;
  }

  const inviteUrl = buildInviteUrl(code) || new URL(`social.html?code=${encodeURIComponent(code)}`, window.location.href).toString();
  const resolvedParty = {
    ...normalizedParty,
    ...readStoredParty(),
    code,
  };
  const descriptionNode = document.querySelector("#share-party-description");

  pendingSharedParty = resolvedParty;
  sharePartyCode.textContent = code;
  sharePartyUrl.textContent = inviteUrl;

  if (descriptionNode) {
    descriptionNode.textContent = `아래 영문+숫자 6자리 코드 ${code}를 공유하면 다른 사용자가 같은 그룹에 들어올 수 있습니다.`;
  }

  sharePartyModal.hidden = false;
}

function closeSharePartyModal() {
  if (sharePartyCode) {
    sharePartyCode.textContent = "";
  }

  if (sharePartyUrl) {
    sharePartyUrl.textContent = "";
  }

  if (sharePartyModal) {
    sharePartyModal.hidden = true;
  }
}

async function joinPartyWithCode(rawCode) {
  const code = normalizePartyCode(rawCode);

  if (!code) {
    throw new Error("empty-code");
  }

  if (!isValidPartyCode(code)) {
    throw new Error("invalid-format");
  }

  const party = await joinPartyByCode(code, getGuestId());
  saveCurrentParty(party);
  return party;
}

function enterPartyRoom(party) {
  const params = new URLSearchParams({
    code: party.code,
    name: party.name,
    members: String(party.memberCount ?? 0),
  });

  window.location.href = `party.html?${params.toString()}`;
}

function getJoinErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "입장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error.message === "empty-code") {
    return "파티 코드를 입력해 주세요.";
  }

  if (error.message === "invalid-format") {
    return "파티 코드는 영문과 숫자를 포함한 6자리여야 합니다.";
  }

  if (error.message === "party-full") {
    return "이 파티는 정원이 가득 찼습니다.";
  }

  if (error.message === "invalid-code") {
    return "유효하지 않은 파티 코드입니다. 다시 확인해 주세요.";
  }

  return "입장에 실패했습니다. Supabase SQL 적용 여부를 확인해 주세요.";
}

function handleShareFromUrl() {
  const shouldShare = new URLSearchParams(window.location.search).get("share") === "1";
  const storedParty = readStoredParty();

  if (!shouldShare || !storedParty) {
    return;
  }

  const code = extractPartyCode(storedParty);

  if (!code) {
    setPartyFeedback("파티 코드를 받지 못했습니다. 새로고침 후 다시 생성해 주세요.", "error");
    return;
  }

  window.location.replace("social-party-share.html");
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function handleInviteFromUrl() {
  const inviteCode = new URLSearchParams(window.location.search).get("code");

  if (!inviteCode) {
    return;
  }

  const normalizedCode = normalizePartyCode(inviteCode);

  if (!isValidPartyCode(normalizedCode)) {
    setPartyFeedback("초대 링크의 파티 코드는 영문과 숫자를 포함한 6자리여야 합니다.", "error");
    return;
  }

  openPartyModal(normalizedCode);
  setPartyFeedback("초대 링크로 들어왔습니다. 코드를 확인하고 입장해 주세요.", "success");
}

createPartyButton?.addEventListener("click", () => {
  window.location.href = "social-create-party.html";
});

emptyPartyButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    window.alert(`빈 파티 카드 ${index + 1}을 선택했습니다.`);
  });
});

profileButton?.addEventListener("click", () => {
  window.alert(`${nickname}님의 프로필 화면으로 이동합니다.`);
});

partyCodeButton?.addEventListener("click", () => openPartyModal());

partyModalCloseButtons.forEach((button) => {
  button.addEventListener("click", closePartyModal);
});

sharePartyCloseButtons.forEach((button) => {
  button.addEventListener("click", closeSharePartyModal);
});

partyCodeForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const code = partyCodeInput?.value ?? "";
  setPartyFormError("");

  if (partySubmitButton) {
    partySubmitButton.disabled = true;
    partySubmitButton.textContent = "입장 확인 중...";
  }

  try {
    const party = await joinPartyWithCode(code);
    closePartyModal();
    setPartyFeedback(`${party.name}에 입장합니다.`);
    enterPartyRoom(party);
  } catch (error) {
    setPartyFormError(getJoinErrorMessage(error));
  } finally {
    if (partySubmitButton) {
      partySubmitButton.disabled = false;
      partySubmitButton.textContent = "입장하기";
    }
  }
});

copyPartyCodeButton?.addEventListener("click", async () => {
  const code = resolvePartyCode(pendingSharedParty);

  if (!code) {
    setPartyFeedback("복사할 파티 코드가 없습니다.", "error");
    return;
  }

  await copyText(code);
  setPartyFeedback("파티 코드를 복사했습니다.", "success");
});

copyPartyUrlButton?.addEventListener("click", async () => {
  const inviteUrl = sharePartyUrl?.textContent?.trim() ?? "";
  const code = resolvePartyCode(pendingSharedParty);

  if (!inviteUrl && !code) {
    setPartyFeedback("복사할 초대 링크가 없습니다.", "error");
    return;
  }

  await copyText(inviteUrl || buildInviteUrl(code));
  setPartyFeedback("초대 링크를 복사했습니다.", "success");
});

enterSharedPartyButton?.addEventListener("click", () => {
  if (!pendingSharedParty) {
    return;
  }

  closeSharePartyModal();
  enterPartyRoom(pendingSharedParty);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (partyCodeModal && !partyCodeModal.hidden) {
    closePartyModal();
  }

  if (sharePartyModal && !sharePartyModal.hidden) {
    closeSharePartyModal();
  }
});

handleShareFromUrl();
handleInviteFromUrl();
bindPartyCodeInput();
