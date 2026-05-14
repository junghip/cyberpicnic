import { normalizePartyRecord } from "./party-service.js";
import { extractPartyCode } from "./party-code.js";
import { requireNickname } from "./user-profile.js";

const PARTY_STORAGE_KEY = "cyberbab.currentParty";

const backButton = document.querySelector("#back-to-social-button");
const sharePartyMessage = document.querySelector("#share-party-message");
const sharePartyCode = document.querySelector("#share-party-code");
const sharePartyFeedback = document.querySelector("#share-party-feedback");
const sharePartyEnterButton = document.querySelector("#share-party-enter-button");
const copyPartyCodeButton = document.querySelector("[data-copy-party-code]");
const enterSharedPartyButton = document.querySelector("[data-enter-shared-party]");
const locationTiles = document.querySelectorAll("[data-location-id]");

let currentParty = null;

requireNickname();

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

function setShareFeedback(message, type = "success") {
  if (!sharePartyFeedback) {
    return;
  }

  sharePartyFeedback.textContent = message;
  sharePartyFeedback.hidden = !message;
  sharePartyFeedback.classList.remove("is-error", "is-success");
  sharePartyFeedback.classList.add(type === "error" ? "is-error" : "is-success");
}

function redirectToCreateParty() {
  window.location.href = "social-create-party.html";
}

function enterPartyDetail() {
  window.location.href = "social-party-detail.html";
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

function highlightSelectedLocation(locationId) {
  locationTiles.forEach((tile) => {
    tile.classList.toggle("is-active", tile.dataset.locationId === locationId);
  });
}

function renderShareParty(party) {
  const normalizedParty = normalizePartyRecord(party);
  const code = extractPartyCode(normalizedParty) || extractPartyCode(party);
  const partyName = `${normalizedParty.name || party.name || ""}`.trim();
  const locationId = `${party.locationId ?? "1"}`;

  if (!code || !partyName) {
    setShareFeedback("파티 정보를 불러오지 못했습니다. 새로고침 후 다시 생성해 주세요.", "error");
    return;
  }

  currentParty = {
    ...normalizedParty,
    ...readStoredParty(),
    code,
    name: partyName,
    locationId,
  };

  highlightSelectedLocation(locationId);

  if (sharePartyMessage) {
    sharePartyMessage.textContent = `‘${partyName}’ 파티가 생성되었어요!\n친구들을 초대하러 가볼까요?`;
  }

  if (sharePartyCode) {
    sharePartyCode.textContent = `파티 코드: ${code}`;
  }

  if (sharePartyEnterButton) {
    sharePartyEnterButton.textContent = `${partyName}에서 피크닉하러 가기`;
  }
}

const storedParty = readStoredParty();

if (!storedParty) {
  redirectToCreateParty();
} else {
  renderShareParty(storedParty);
}

backButton?.addEventListener("click", () => {
  window.location.href = "social.html";
});

copyPartyCodeButton?.addEventListener("click", async () => {
  const code = extractPartyCode(currentParty);

  if (!code) {
    setShareFeedback("복사할 파티 코드가 없습니다.", "error");
    return;
  }

  await copyText(code);
  setShareFeedback("파티 코드를 복사했습니다.", "success");
});

enterSharedPartyButton?.addEventListener("click", () => {
  if (!currentParty) {
    return;
  }

  enterPartyDetail();
});
