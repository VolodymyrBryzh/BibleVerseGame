importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBmBLtbarrkDb7DyP2cEey1xfc6-Rh8XQk",
  authDomain: "bible-verse-game-seven.firebaseapp.com",
  projectId: "bible-verse-game-seven",
  storageBucket: "bible-verse-game-seven.firebasestorage.app",
  messagingSenderId: "881993495113",
  appId: "1:881993495113:web:20b5adb36e103dfa37c598",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Слово Живе', {
    body: body || 'Час вивчити вірш дня!',
    icon: icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
