/* 나라차태권도 학부모앱 알림 일꾼 (parent.html p2.86 · 관리앱 R4.610 · 서버 v15)
   - 이 파일에는 키·주소·개인정보가 없다. 알림을 켤 때 학부모앱이 이 폰의 저장소(IndexedDB)에
     {서버 주소, 학부모 키, 구독 번호, 기기 토큰, 가족 열쇠(밖으로 꺼낼 수 없는 형태)}를 넣어 둔다.
   - 서버는 "새 알림 있음" 신호만 보낸다 → 이 일꾼이 기기 토큰으로 암호문을 가져와 가족 열쇠로 풀어 보여 준다. */
var NRC_DB = 'naracha-push', NRC_ST = 'cfg';

self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });

function nrcDb() {
  return new Promise(function (res, rej) {
    var r = indexedDB.open(NRC_DB, 1);
    r.onupgradeneeded = function () { r.result.createObjectStore(NRC_ST); };
    r.onsuccess = function () { res(r.result); };
    r.onerror = function () { rej(r.error); };
  });
}
function nrcCfg() {
  return nrcDb().then(function (db) {
    return new Promise(function (res) {
      var g = db.transaction(NRC_ST, 'readonly').objectStore(NRC_ST).get('cfg');
      g.onsuccess = function () { res(g.result || null); };
      g.onerror = function () { res(null); };
    });
  }).catch(function () { return null; });
}
function nrcB64(b) { var s = atob(b), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }

async function nrcOpen(m, c) {
  if (m && m.c && c && c.aes) {
    try {
      var pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nrcB64(m.c.iv) }, c.aes, nrcB64(m.c.ct));
      return JSON.parse(new TextDecoder().decode(pt));
    } catch (e) { return null; }
  }
  if (m && m.ti) return { ti: m.ti, b: m.b, u: m.u, k: m.k };   /* 공지(원래 공개 내용) */
  return null;
}

async function nrcHandle() {
  var c = await nrcCfg(), shown = 0;
  if (c && c.url && c.id && c.tok) {
    try {
      var r = await fetch(c.url, { method: 'POST', body: JSON.stringify({ action: 'push_pull2', key: c.key, id: c.id, tok: c.tok }) });
      var j = await r.json(), msgs = (j && j.msgs) || [];
      for (var i = 0; i < msgs.length; i++) {
        var o = await nrcOpen(msgs[i], c); if (!o) continue;
        await self.registration.showNotification(o.ti || '나라차태권도', { body: o.b || '', tag: 'nrc-' + (msgs[i].i || i), data: { u: o.u || '' } });
        shown++;
      }
    } catch (e) {}
  }
  if (!shown) await self.registration.showNotification('나라차태권도', { body: '새 소식이 있어요. 눌러서 확인해 주세요.', tag: 'nrc-generic' });
}
self.addEventListener('push', function (e) { e.waitUntil(nrcHandle()); });

self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  var url = new URL('../parent.html', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf('parent.html') > -1 && 'focus' in list[i]) return list[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
