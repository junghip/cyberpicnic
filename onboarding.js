import {
  clearAfterOnboardPath,
  getAfterOnboardPath,
  redirectIfOnboarded,
  saveNickname,
} from "./user-profile.js";

const nicknameForm = document.querySelector("#nickname-form");
const nicknameInput = document.querySelector("#nickname-input");
const nicknameError = document.querySelector("#nickname-error");
const nicknameSubmitButton = nicknameForm?.querySelector('button[type="submit"]');

redirectIfOnboarded();

function setNicknameError(message) {
  if (!nicknameError) {
    return;
  }

  nicknameError.textContent = message;
  nicknameError.hidden = !message;
}

nicknameForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  const nickname = nicknameInput?.value ?? "";
  setNicknameError("");

  if (nicknameSubmitButton) {
    nicknameSubmitButton.disabled = true;
    nicknameSubmitButton.textContent = "입장 중...";
  }

  try {
    saveNickname(nickname);
    const destination = getAfterOnboardPath();
    clearAfterOnboardPath();
    window.location.href = destination;
  } catch (error) {
    setNicknameError("닉네임을 입력해 주세요.");
    if (nicknameSubmitButton) {
      nicknameSubmitButton.disabled = false;
      nicknameSubmitButton.textContent = "앱 입장하기";
    }
  }
});
