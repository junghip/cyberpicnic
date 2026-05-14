import { buildInviteUrl } from "./party-service.js";
import { extractPartyCode } from "./party-code.js";
import { requireNickname } from "./user-profile.js";

const PARTY_STORAGE_KEY = "cyberbab.currentParty";

const partyCodeBadge = document.querySelector("#party-code-badge");
const partyName = document.querySelector("#party-name");
const partyDescription = document.querySelector("#party-description");
const copyInviteButton = document.querySelector("#copy-invite-button");
const leavePartyButton = document.querySelector("#leave-party-button");

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

function readPartyFromQuery() {
  const params = new URLSearchParams(window.location.search);

  return {
    code: params.get("code") ?? "",
    name: params.get("name") ?? "",
    memberCount: Number(params.get("members") ?? 0),
  };
}

function redirectToLanding() {
  window.location.href = "home.html";
}

requireNickname();

function renderPartyRoom(party) {
  if (!party?.code || !party?.name) {
    redirectToLanding();
    return;
  }

  partyCodeBadge.textContent = extractPartyCode(party);
  partyName.textContent = party.name;

  const memberText =
    party.memberCount > 0 ? `현재 ${party.memberCount}명이 함께하고 있습니다.` : "멤버가 함께 모이는 중입니다.";

  partyDescription.textContent = `코드 ${party.code}로 입장한 파티입니다. ${memberText}`;
}

async function copyInviteLink(code) {
  const inviteUrl = buildInviteUrl(code);

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(inviteUrl);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = inviteUrl;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

const storedParty = readStoredParty();
const queryParty = readPartyFromQuery();
const currentParty = storedParty ?? queryParty;

renderPartyRoom(currentParty);

copyInviteButton?.addEventListener("click", async () => {
  if (!currentParty?.code) {
    return;
  }

  await copyInviteLink(currentParty.code);
  partyDescription.textContent = "초대 링크를 복사했습니다. 친구에게 공유해 보세요.";
});

leavePartyButton.addEventListener("click", () => {
  sessionStorage.removeItem(PARTY_STORAGE_KEY);
  redirectToLanding();
});
