/* 나라차 학부모앱 서비스워커 sw1.0 — 휴대폰 푸시 알림 전용. 페이지 캐시는 하지 않는다(앱 자동 갱신과 충돌 방지).
   범위(scope)는 parent.html 하나로 좁혀 등록되므로 같은 폴더의 다른 앱(index.html·camp.html 등)에는 영향이 없다. */
var SW_VER="sw1.0";
var GSHEET_URL="https://script.google.com/macros/s/AKfycbysx2hkGfv3onXQHutPA6boYIZ74R4MNY_Jrc5cwgVebI9L1FRmj0YLT9YpYrS0tKVg7A/exec";
var KEY="NARACHA-P-LS25WAT2";
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });
function hex(buf){ var u=new Uint8Array(buf), s=''; for(var i=0;i<u.length;i++) s+=('0'+u[i].toString(16)).slice(-2); return s; }
async function subId(){ var s=await self.registration.pushManager.getSubscription(); if(!s) return ''; var d=await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.endpoint)); return hex(d).slice(0,24); }
/* 서버는 "새 알림 있음"만 보내고, 내용은 여기서 가져온다(fail-closed: 못 가져오면 일반 안내만 표시) */
self.addEventListener('push', function(e){
  e.waitUntil((async function(){
    var shown=0;
    try{
      var id=await subId(); if(!id) throw new Error('nosub');
      var r=await fetch(GSHEET_URL+'?key='+encodeURIComponent(KEY)+'&action=push_pull&id='+id+'&t='+Date.now(), {cache:'no-store'});
      if(!r.ok) throw new Error('http'); var d=await r.json(); var msgs=(d&&d.msgs)||[];
      for(var i=0;i<msgs.length;i++){ var m=msgs[i];
        await self.registration.showNotification(m.ti||'나라차태권도', { body:m.b||'', icon:'parent-icon.png', badge:'parent-icon.png', tag:'nrc-'+(m.i||'')+'-'+i, timestamp:m.t||Date.now(), data:{url:m.u||'', kind:m.k||''} });
        shown++; }
    }catch(err){}
    if(!shown) await self.registration.showNotification('나라차태권도', { body:'새 알림이 있어요. 앱을 열어 확인해 주세요.', icon:'parent-icon.png', badge:'parent-icon.png', tag:'nrc-generic' });
  })());
});
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var target=new URL('parent.html', self.location.href).href;
  e.waitUntil(self.clients.matchAll({type:'window', includeUncontrolled:true}).then(function(cs){
    for(var i=0;i<cs.length;i++){ if(cs[i].url.indexOf('parent.html')>-1 && 'focus' in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow(target); }));
});
self.addEventListener('pushsubscriptionchange', function(e){ /* 구독이 바뀌면 앱을 다시 열 때 자동으로 다시 등록된다 */ });
