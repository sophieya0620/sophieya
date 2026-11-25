/* =========================================================
   저장소: IndexedDB (사용할 수 없으면 localStorage로 대체)
   모든 기록은 이 기기 안에만 저장됩니다.
   ========================================================= */
const Store = (() => {
  const DB_NAME = 'maeum-guseul', STORE = 'entries', LS_KEY = 'maeum-guseul-entries';
  let dbPromise = null, useLS = false;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(resolve => {
      try {
        if (!('indexedDB' in window)) { useLS = true; return resolve(null); }
        const rq = indexedDB.open(DB_NAME, 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore(STORE, { keyPath: 'id' });
        rq.onsuccess = () => resolve(rq.result);
        rq.onerror = () => { useLS = true; resolve(null); };
      } catch (_) { useLS = true; resolve(null); }
    });
    return dbPromise;
  }

  function run(mode, fn) {
    return open().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    }));
  }

  const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (_) { return []; } };
  const lsWrite = list => localStorage.setItem(LS_KEY, JSON.stringify(list));

  const sortEntries = list => list.sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

  return {
    async all() {
      await open();
      const list = useLS ? lsRead() : (await run('readonly', s => s.getAll())) || [];
      return sortEntries(list);
    },
    async put(entry) {
      await open();
      if (useLS) {
        const list = lsRead().filter(e => e.id !== entry.id);
        list.push(entry); lsWrite(list); return;
      }
      await run('readwrite', s => s.put(entry));
    },
    async remove(id) {
      await open();
      if (useLS) { lsWrite(lsRead().filter(e => e.id !== id)); return; }
      await run('readwrite', s => s.delete(id));
    },
  };
})();
