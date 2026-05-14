import { getAuthErrorMessage, loginUser, registerUser } from "./auth-service.js";
import {
  clearAfterOnboardPath,
  getAfterOnboardPath,
  redirectIfOnboarded,
  saveSession,
} from "./user-profile.js";

const nicknameForm = document.querySelector("#nickname-form");
const nicknameInput = document.querySelector("#nickname-input");
const passwordInput = document.querySelector("#password-input");
const passwordConfirmInput = document.querySelector("#password-confirm-input");
const passwordConfirmLabel = document.querySelector("#password-confirm-label");
const nicknameError = document.querySelector("#nickname-error");
const onboardingTitle = document.querySelector("#onboarding-title");
const onboardingDescription = document.querySelector("#onboarding-description");
const onboardingSubmitButton = document.querySelector("#onboarding-submit-button");
const authModeButtons = document.querySelectorAll("[data-auth-mode]");

let authMode = "signup";

redirectIfOnboarded();

function setFormError(message) {
  if (!nicknameError) {
    return;
  }

  nicknameError.textContent = message;
  nicknameError.hidden = !message;
}

function setSubmitting(isSubmitting) {
  if (!onboardingSubmitButton) {
    return;
  }

  onboardingSubmitButton.disabled = isSubmitting;
  onboardingSubmitButton.textContent = isSubmitting
    ? authMode === "signup"
      ? "계정 만드는 중..."
      : "로그인 중..."
    : authMode === "signup"
      ? "계정 만들고 입장하기"
      : "로그인하고 입장하기";
}

function updateAuthMode(nextMode) {
  authMode = nextMode;

  authModeButtons.forEach((button) => {
    const isActive = button.dataset.authMode === nextMode;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  if (onboardingTitle) {
    onboardingTitle.textContent = nextMode === "signup" ? "계정을 만들어 주세요" : "다시 만나서 반가워요";
  }

  if (onboardingDescription) {
    onboardingDescription.textContent =
      nextMode === "signup"
        ? "닉네임과 비밀번호로 계정을 만들면 다른 기기에서도 같은 이름으로 이어갈 수 있습니다."
        : "가입한 닉네임과 비밀번호로 로그인하면 이어서 이용할 수 있습니다.";
  }

  if (passwordConfirmLabel) {
    passwordConfirmLabel.hidden = nextMode === "login";
  }

  if (passwordConfirmInput) {
    passwordConfirmInput.hidden = nextMode === "login";
    passwordConfirmInput.required = nextMode === "signup";
    passwordConfirmInput.value = "";
  }

  if (passwordInput) {
    passwordInput.autocomplete = nextMode === "signup" ? "new-password" : "current-password";
  }

  setSubmitting(false);
  setFormError("");
}

authModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    updateAuthMode(button.dataset.authMode === "login" ? "login" : "signup");
  });
});

nicknameForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const nickname = nicknameInput?.value.trim() ?? "";
  const password = passwordInput?.value ?? "";
  const passwordConfirm = passwordConfirmInput?.value ?? "";

  setFormError("");

  if (!nickname) {
    setFormError("닉네임을 입력해 주세요.");
    nicknameInput?.focus();
    return;
  }

  if (password.length < 4) {
    setFormError("비밀번호는 4자 이상이어야 합니다.");
    passwordInput?.focus();
    return;
  }

  if (authMode === "signup" && password !== passwordConfirm) {
    setFormError("비밀번호 확인이 일치하지 않습니다.");
    passwordConfirmInput?.focus();
    return;
  }

  setSubmitting(true);

  try {
    const session =
      authMode === "signup" ? await registerUser(nickname, password) : await loginUser(nickname, password);

    saveSession(session);
    const destination = getAfterOnboardPath();
    clearAfterOnboardPath();
    window.location.href = destination;
  } catch (error) {
    setFormError(getAuthErrorMessage(error));
    setSubmitting(false);
  }
});

updateAuthMode("signup");
nicknameInput?.focus();
