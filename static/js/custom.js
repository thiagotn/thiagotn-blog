// Dark/Light mode toggle — lightweight fallback.
// Primary logic lives in the inline header script (header.html).
// This file re-syncs theme/hljs/icon on DOMContentLoaded as a safety net.
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
    var light = document.getElementById("hljs-light");
    var dark = document.getElementById("hljs-dark");
    if (light && dark) {
      light.disabled = effective !== "light";
      dark.disabled = effective !== "dark";
    }
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

  document.addEventListener("DOMContentLoaded", function () {
    var saved = localStorage.getItem(STORAGE_KEY) || "system";
    applyTheme(saved);
    updateToggleIcon(saved);
  });
})();
