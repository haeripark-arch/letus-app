// ═══════════════════════════════════════════════════
//  LETUS 근태관리 — Service Worker
//  오프라인 시 캐시된 앱 셸을 보여줍니다
// ═══════════════════════════════════════════════════

const CACHE_NAME  = 'letus-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@900&family=Noto+Sans+KR:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap',
];

// ── 설치: 앱 셸 캐싱 ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(SHELL_FILES).catch(() => {})
    )
  );
  self.skipWaiting();
});

// ── 활성화: 이전 캐시 정리 ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── 요청 가로채기 ─────────────────────────────────
// API(Apps Script) 요청은 항상 네트워크 우선
// 나머지는 캐시 우선 → 오프라인 fallback
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // Apps Script API는 네트워크만 사용 (캐싱 안 함)
  if (url.includes('script.google.com')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 구글 폰트 등 외부 리소스: 캐시 우선
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // 성공한 GET 요청만 캐싱
        if (event.request.method === 'GET' && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 오프라인 + 캐시 없음 → index.html 반환
        return caches.match('./index.html');
      });
    })
  );
});
