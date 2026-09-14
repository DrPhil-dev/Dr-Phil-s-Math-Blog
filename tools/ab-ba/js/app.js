(function () {
  'use strict';

  const themeToggle = document.getElementById('themeToggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });

  (function initTheme() {
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(prefersDark ? 'dark' : 'light');
  })();
})();
