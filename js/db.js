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

  let memory = [];   // 저장소를 쓸 수 없는 환경에서의 마지막 대비
  const lsRead = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || 'null') || memory; } catch (_) { return memory; } };
  const lsWrite = list => { memory = list; try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (_) {} };

  const sortEntries = list => list.sort((a, b) =>
    (b.date || '').localeCompare(a.date || '') || (b.createdAt || 0) - (a.createdAt || 0));

  // IndexedDB가 실패하면 localStorage(또는 메모리)로 넘어갑니다
  async function withFallback(idbFn, lsFn) {
    await open();
    if (!useLS) {
      try { return await idbFn(); } catch (_) { useLS = true; }
    }
    return lsFn();
  }

  return {
    async all() {
      const list = await withFallback(() => run('readonly', s => s.getAll()), lsRead);
      return sortEntries([...(list || [])]);
    },
    put(entry) {
      return withFallback(() => run('readwrite', s => s.put(entry)), () => {
        const list = lsRead().filter(e => e.id !== entry.id);
        list.push(entry); lsWrite(list);
      });
    },
    remove(id) {
      return withFallback(() => run('readwrite', s => s.delete(id)), () => lsWrite(lsRead().filter(e => e.id !== id)));
    },
  };
})();
