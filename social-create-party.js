import { createParty, normalizePartyRecord } from "./party-service.js";
import { getGuestId } from "./guest-session.js";
import { requireNickname } from "./user-profile.js";
import { extractPartyCode } from "./party-code.js";

const PARTY_STORAGE_KEY = "cyberbab.currentParty";

const backButton = document.querySelector("#back-to-social-button");
const createPartyForm = document.querySelector("#create-party-form");
const createPartyNameInput = document.querySelector("#create-party-name");
const createPartyError = document.querySelector("#create-party-error");
const createPartyConfirmButton = document.querySelector("#create-party-confirm-button");
const memberCountInput = document.querySelector("#create-party-member-count");
const locationIdInput = document.querySelector("#create-party-location-id");
const memberCountOptions = document.querySelectorAll("[data-member-count]");
const locationOptions = document.querySelectorAll("[data-location-id]");

requireNickname();

function saveCurrentParty(party) {
  sessionStorage.setItem(PARTY_STORAGE_KEY, JSON.stringify(party));
}

function setCreatePartyError(message) {
  if (!createPartyError) {
    return;
  }

  createPartyError.textContent = message;
  createPartyError.hidden = !message;
}

function getCreateErrorMessage(error) {
  if (!(error instanceof Error)) {
    return "파티 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.";
  }

  if (error.message === "empty-name") {
    return "파티 이름을 입력해 주세요.";
  }

  if (error.message === "code-generation-failed") {
    return "파티 코드를 만들지 못했습니다. 다시 시도해 주세요.";
  }

  return "파티 생성에 실패했습니다. Supabase SQL 적용 여부를 확인해 주세요.";
}

function setActiveOption(options, activeOption, hiddenInput, valueAttribute) {
  options.forEach((option) => {
    const isActive = option === activeOption;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-checked", String(isActive));
  });

  if (hiddenInput) {
    hiddenInput.value = activeOption.dataset[valueAttribute] ?? "";
  }
}

function bindMemberCountOptions() {
  memberCountOptions.forEach((option) => {
    option.addEventListener("click", () => {
      setActiveOption(memberCountOptions, option, memberCountInput, "memberCount");
    });
  });
}

function bindLocationOptions() {
  locationOptions.forEach((option) => {
    option.addEventListener("click", () => {
      setActiveOption(locationOptions, option, locationIdInput, "locationId");
    });
  });
}

backButton?.addEventListener("click", () => {
  window.location.href = "social.html";
});

createPartyForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const partyName = createPartyNameInput?.value.trim() ?? "";
  const memberCount = Number(memberCountInput?.value ?? 0);
  const locationId = locationIdInput?.value ?? "";

  setCreatePartyError("");

  if (!partyName) {
    setCreatePartyError("파티 이름을 입력해 주세요.");
    createPartyNameInput?.focus();
    return;
  }

  if (!memberCount || memberCount < 2) {
    setCreatePartyError("참여할 친구 수를 선택해 주세요.");
    return;
  }

  if (!locationId) {
    setCreatePartyError("피크닉 장소를 선택해 주세요.");
    return;
  }

  if (createPartyConfirmButton) {
    createPartyConfirmButton.disabled = true;
  }

  try {
    const party = normalizePartyRecord(await createParty(partyName, getGuestId()));
    const code = extractPartyCode(party);

    saveCurrentParty({
      ...party,
      code,
      memberCount,
      locationId,
      joinedMemberCount: party.memberCount ?? 1,
      memberGuestIds: [getGuestId()],
    });

    if (!code) {
      setCreatePartyError("파티 코드를 받지 못했습니다. 새로고침 후 다시 시도해 주세요.");
      return;
    }

    window.location.href = "social-party-share.html";
  } catch (error) {
    setCreatePartyError(getCreateErrorMessage(error));
  } finally {
    if (createPartyConfirmButton) {
      createPartyConfirmButton.disabled = false;
    }
  }
});

bindMemberCountOptions();
bindLocationOptions();
createPartyNameInput?.focus();
