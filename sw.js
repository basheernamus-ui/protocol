const CACHE = 'protocol-v8';
const ASSETS = [
  '/protocol.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// ── Motivation quotes for 2pm ─────────────────────────────────────
const QUOTES = [
  "The strong man is not one who wrestles well, but the one who controls himself in anger. — Hadith",
  "Discipline is the bridge between goals and accomplishment.",
  "You don't rise to the level of your goals. You fall to the level of your systems.",
  "Every day is a new beginning. Take a deep breath and start again.",
  "The secret of getting ahead is getting started.",
  "Work hard in silence. Let your success be your noise.",
  "Push yourself — no one else is going to do it for you.",
  "Small daily improvements are the key to staggering long-term results.",
  "You are what you repeatedly do. Excellence is not an act but a habit.",
  "Do something today that your future self will thank you for.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Don't watch the clock. Do what it does — keep going.",
  "Dream big. Start small. Act now.",
  "Strength doesn't come from what you can do. It comes from overcoming what you thought you couldn't.",
  "Success is the sum of small efforts repeated day in and day out.",
  "A year from now you'll wish you had started today.",
  "Make today count. You'll never get it back.",
  "إن مع العسر يسرا — With hardship comes ease. (94:6)",
  "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ — Man will only have what he strives for. (53:39)",
  "Be the person you needed when you were struggling.",
  "Consistency beats intensity. Show up every single day.",
  "The body achieves what the mind believes.",
  "Your future is created by what you do today, not tomorrow.",
  "No pain, no gain. No discipline, no glory.",
  "Champions train, losers complain.",
  "It always seems impossible until it's done.",
  "Rise up, start fresh, see the bright opportunity in each new day.",
  "Believe in yourself and all that you are.",
  "Today's pain is tomorrow's power.",
  "One day or day one — you decide."
];

function todayQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return QUOTES[dayOfYear % QUOTES.length];
}

// ── Notification scheduling ───────────────────────────────────────
let _scheduledDate = null;
let _t9pm = null;
let _t2pm = null;

function scheduleToday() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  if (_scheduledDate === dateStr) return; // already scheduled today

  if (_t9pm) clearTimeout(_t9pm);
  if (_t2pm) clearTimeout(_t2pm);
  _scheduledDate = dateStr;

  // 9 PM — daily reminder
  const pm9 = new Date(now);
  pm9.setHours(21, 0, 0, 0);
  if (pm9 > now) {
    _t9pm = setTimeout(() => {
      self.registration.showNotification('Protocol ◆ Daily Check', {
        body: "Time to log today's tasks. Every point counts.",
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'protocol-reminder',
        renotify: true,
        requireInteraction: false,
        data: { url: '/protocol.html' }
      });
      _scheduledDate = null; // allow rescheduling tomorrow
    }, pm9 - now);
  }

  // 2 PM — motivation
  const pm2 = new Date(now);
  pm2.setHours(14, 0, 0, 0);
  if (pm2 > now) {
    _t2pm = setTimeout(() => {
      self.registration.showNotification('Protocol ◆ Midday', {
        body: todayQuote(),
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'protocol-motivation',
        renotify: true,
        requireInteraction: false,
        data: { url: '/protocol.html' }
      });
    }, pm2 - now);
  }
}

// ── Tap notification → open app ───────────────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/protocol.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes('protocol') && 'focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── Install ───────────────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => {
      self.clients.claim();
      scheduleToday();
    })
  );
});

// ── Message from app (re-trigger schedule) ────────────────────────
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFS') {
    _scheduledDate = null; // force reschedule
    scheduleToday();
  }
});

// ── Fetch (cache-first) ───────────────────────────────────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
