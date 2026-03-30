(function initStorage(window) {
  const OG = window.OrbitGame;

  function getJSON(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  OG.storage = Object.assign(OG.storage || {}, {
    getJSON,
    setJSON
  });
})(window);
