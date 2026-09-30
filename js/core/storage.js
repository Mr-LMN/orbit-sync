(function initStorage(window) {
  const OG = window.OrbitGame;
  const SECRET = 'orbit-sync-s3cr3t';
  const fallbackStorage = Object.create(null);
  let revision = 0;
  if (window.addEventListener) window.addEventListener('storage', () => { revision++; });

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
      const encoded = window.btoa(unescape(encodeURIComponent(strValue)));
      const signature = _hash(encoded + SECRET);
      const finalValue = `v2:${encoded}.${signature}`;
      fallbackStorage[key] = finalValue;
      revision++;
      try {
        window.localStorage.setItem(key, finalValue);
        delete fallbackStorage[key];
      } catch (e) {
        fallbackStorage[key] = finalValue;
        return false;
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function getItem(key, fallback) {
    try {
      let raw = Object.prototype.hasOwnProperty.call(fallbackStorage, key) ? fallbackStorage[key] : null;
      try {
        if (raw === null) raw = window.localStorage.getItem(key);
      } catch (e) {
        raw = Object.prototype.hasOwnProperty.call(fallbackStorage, key) ? fallbackStorage[key] : null;
      }

      if (raw === null) return fallback;

      const unicode = raw.startsWith('v2:');
      if (!unicode && raw.trim() !== '' && Number.isFinite(Number(raw))) return raw;
      const parts = (unicode ? raw.slice(3) : raw).split('.');
      // Plain decimal legacy values are not signed payloads.
      const looksSigned = parts.length === 2 && /^[0-9a-f]{1,8}$/.test(parts[1]) && /^[A-Za-z0-9+/]*={0,2}$/.test(parts[0]) && parts[0].length % 4 === 0;
      if (unicode || looksSigned) {
        const [encoded, signature] = parts;
        if (_hash(encoded + SECRET) === signature) {
          try {
            const decoded = window.atob(encoded);
            return unicode ? decodeURIComponent(escape(decoded)) : decoded;
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
    revision++;
    delete fallbackStorage[key];
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete fallbackStorage[key];
    }
  }

  OG.storage = Object.assign(OG.storage || {}, {
    getRevision: () => revision,
    getItem,
    setItem,
    getJSON,
    setJSON,
    removeItem
  });
})(window);
