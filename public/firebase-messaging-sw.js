
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA-omMCb0dmWa1C7bPvJxxx0ILYnlqDHEU",
  authDomain: "studio-3833026271-4abb2.firebaseapp.com",
  projectId: "studio-3833026271-4abb2",
  messagingSenderId: "667815738576",
  appId: "1:667815738576:web:ce3c7fa9ae7890782532d5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Notificação em segundo plano recebida:', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png',
    tag: payload.data?.taskId || 'default-tag',
    renotify: false, // Do not vibrate/sound if the same tag is already shown
    data: {
      link: payload.fcmOptions?.link || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data.link;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      return clients.openWindow(link);
    })
  );
});
