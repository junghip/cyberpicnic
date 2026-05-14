import { normalizePartyRecord } from "./party-service.js";
import { extractPartyCode } from "./party-code.js";
import { getGuestId } from "./guest-session.js";
import { getNickname, requireNickname } from "./user-profile.js";

const PARTY_STORAGE_KEY = "cyberbab.currentParty";

const backButton = document.querySelector("#back-to-share-button");
const partyDetailTitle = document.querySelector("#party-detail-title");
const partyDetailStage = document.querySelector("#party-detail-stage");
const partyDetailBoards = document.querySelector("#party-detail-boards");

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

function redirectToCreateParty() {
  window.location.href = "social-create-party.html";
}

function getBoardGridConfig(memberCount) {
  const normalizedCount = Math.max(2, Math.min(7, Number(memberCount) || 2));

  if (normalizedCount <= 2) {
    return { columns: 2, rows: 1, slotCount: 2 };
  }

  if (normalizedCount <= 4) {
    return { columns: 2, rows: 2, slotCount: 4 };
  }

  if (normalizedCount === 7) {
    return { columns: 2, rows: 4, slotCount: 7 };
  }

  return { columns: 2, rows: 3, slotCount: 6 };
}

function buildMemberList(party) {
  const guestId = getGuestId();
  const currentNickname = getNickname() || "나";
  const memberGuestIds = Array.isArray(party.memberGuestIds) ? party.memberGuestIds : [guestId];
  const joinedCount = Math.max(
    memberGuestIds.length,
    Number(party.joinedMemberCount ?? party.actualMemberCount ?? 1)
  );

  return Array.from({ length: joinedCount }, (_, index) => {
    const memberGuestId = memberGuestIds[index];

    if (index === 0 || memberGuestId === guestId) {
      return {
        guestId: memberGuestId ?? guestId,
        nickname: currentNickname,
        isSelf: memberGuestId === guestId || index === 0,
      };
    }

    return {
      guestId: memberGuestId ?? `guest-${index + 1}`,
      nickname: `참여자 ${index + 1}`,
      isSelf: false,
    };
  });
}

function createBoardElement(member, index) {
  const board = document.createElement("article");
  board.className = "party-detail-board";

  if (!member) {
    board.classList.add("is-empty");
    board.setAttribute("aria-label", `빈 도시락판 ${index + 1}`);
    return board;
  }

  const label = document.createElement("span");
  label.className = "party-detail-board__label";
  label.textContent = member.nickname.slice(0, 1);

  board.append(label);
  board.setAttribute("aria-label", `${member.nickname} 도시락판`);
  return board;
}

function renderBoards(party, memberCount) {
  if (!partyDetailBoards) {
    return;
  }

  const { rows, slotCount } = getBoardGridConfig(memberCount);
  const members = buildMemberList(party);

  partyDetailBoards.dataset.gridRows = String(rows);
  partyDetailBoards.replaceChildren();

  for (let index = 0; index < slotCount; index += 1) {
    partyDetailBoards.append(createBoardElement(members[index] ?? null, index));
  }
}

function renderPartyDetail(party) {
  const normalizedParty = normalizePartyRecord(party);
  const code = extractPartyCode(normalizedParty) || extractPartyCode(party);
  const partyName = `${normalizedParty.name || party.name || ""}`.trim();
  const memberCount = Number(party.memberCount ?? normalizedParty.memberCount ?? 2);
  const locationId = `${party.locationId ?? "1"}`;

  if (!code || !partyName) {
    redirectToCreateParty();
    return;
  }

  if (partyDetailTitle) {
    partyDetailTitle.textContent = partyName;
  }

  if (partyDetailStage) {
    partyDetailStage.dataset.locationId = locationId;
  }

  renderBoards(party, memberCount);
}

const storedParty = readStoredParty();

if (!storedParty) {
  redirectToCreateParty();
} else {
  renderPartyDetail(storedParty);
}

backButton?.addEventListener("click", () => {
  window.location.href = "social-party-share.html";
});
