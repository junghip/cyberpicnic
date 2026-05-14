import { bindMainTabs } from "./navigation.js";
import { getNickname, requireNickname } from "./user-profile.js";

requireNickname();
bindMainTabs();

const nickname = getNickname();
const profileButton = document.querySelector("#profile-button");
const homeCards = document.querySelectorAll(".home-card--empty");

if (profileButton && nickname) {
  profileButton.setAttribute("aria-label", `${nickname} 프로필`);
  profileButton.textContent = nickname.slice(0, 1);
}

homeCards.forEach((card, index) => {
  card.addEventListener("click", () => {
    window.alert(`홈 카드 ${index + 1}을 선택했습니다.`);
  });
});
