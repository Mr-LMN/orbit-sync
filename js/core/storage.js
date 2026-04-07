(function initStorage(window) {
  const OG = window.OrbitGame;
  const SECRET = 'orbit-sync-s3cr3t';

  function _hash(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
    }
    return (hash >>> 0).toString(16);
  }

  function setItem(key, value) {
    try {
      const strValue = String(value);
      const encoded = window.btoa(strValue);
      const signature = _hash(encoded + SECRET);
      const finalValue = `${encoded}.${signature}`;
      window.localStorage.setItem(key, finalValue);
      return true;
    } catch (err) {
      return false;
    }
  }

  function getItem(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return fallback;

      const parts = raw.split('.');
      if (parts.length === 2) {
        const [encoded, signature] = parts;
        if (_hash(encoded + SECRET) === signature) {
          try {
            return window.atob(encoded);
          } catch (e) {
            return fallback;
          }
        } else {
          console.warn(`Storage integrity check failed for key: ${key}`);
          return fallback;
        }
      }

      // Migration: Return raw if it's not in the new format (e.g. legacy plain text)
      return raw;
    } catch (err) {
      return fallback;
    }
  }

  function getJSON(key, fallback) {
    const val = getItem(key, null);
    if (val === null) return fallback;
    try {
      return JSON.parse(val);
    } catch (err) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    return setItem(key, JSON.stringify(value));
  }

  function removeItem(key) {
    window.localStorage.removeItem(key);
  }

  OG.storage = Object.assign(OG.storage || {}, {
    getItem,
    setItem,
    getJSON,
    setJSON,
    removeItem
  });
})(window);
