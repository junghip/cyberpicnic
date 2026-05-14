export function bindMainTabs() {
  document.querySelectorAll("[data-nav-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetTab = button.dataset.navTab;

      if (targetTab === "home") {
        window.location.href = "home.html";
        return;
      }

      if (targetTab === "social") {
        window.location.href = "social.html";
      }
    });
  });
}
