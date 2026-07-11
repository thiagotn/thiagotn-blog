// Dark/Light mode toggle with localStorage persistence.
// Complementary to the inline anti-FOUC script in header.html.
(function () {
  var STORAGE_KEY = "theme";

  function applyTheme(theme) {
    var effective = theme;
    if (theme === "system" || !theme) {
      effective = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    document.documentElement.setAttribute("data-bs-theme", effective);
    toggleHighlightStyles(effective);
  }

  function toggleHighlightStyles(effective) {
    var light = document.getElementById("hljs-light");
    var dark = document.getElementById("hljs-dark");
    if (light && dark) {
      light.disabled = effective !== "light";
      dark.disabled = effective !== "dark";
    }
  }

  function cycleTheme() {
    var current = localStorage.getItem(STORAGE_KEY) || "system";
    var next;
    if (current === "light") next = "dark";
    else if (current === "dark") next = "system";
    else next = "light";
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    updateToggleIcon(next);
  }

  function updateToggleIcon(theme) {
    var btn = document.getElementById("theme-toggle");
    if (!btn) return;
    var icons = { light: "fa-sun", dark: "fa-moon", system: "fa-circle-half-stroke" };
    var labels = { light: "Light", dark: "Dark", system: "System" };
    var icon = btn.querySelector("i");
    var span = btn.querySelector("span");
    if (icon) icon.className = "fa-solid " + (icons[theme] || icons.system);
    if (span) span.textContent = " " + (labels[theme] || "System");
  }

  // Follow OS preference changes when in system mode.
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", function () {
      var theme = localStorage.getItem(STORAGE_KEY) || "system";
      if (theme === "system") applyTheme("system");
    });

  // Re-apply theme on every navigation (fallback for anti-FOUC + sync hljs/icon).
  document.addEventListener("DOMContentLoaded", function () {
    var saved = localStorage.getItem(STORAGE_KEY) || "system";
    applyTheme(saved);
    updateToggleIcon(saved);
  });

  window.toggleTheme = cycleTheme;
})();
