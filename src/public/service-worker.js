/* eslint-disable no-restricted-globals */

// Nama cache
const CACHE_NAME = 'storyshare-v1';

// Daftar aset yang akan di-cache
const urlsToCache = [
  '/',
  '/index.html',
  '/favicon.png',
  '/manifest.json',
  '/scripts/index.js',
  '/styles/base.css',
  '/styles/buttons.css',
  '/styles/forms.css',
  '/styles/header.css',
  '/styles/footer.css',
  '/styles/home.css',
  '/styles/story-item.css',
  '/styles/story-detail.css',
  '/styles/new-story.css',
  '/styles/maps.css',
  '/styles/auth.css',
  '/styles/bookmart.css',
  '/styles/loader.css',
  '/styles/welcome.css',
  '/styles/responsive.css',
  '/styles/transitions.css',
  '/images/placeholder-image.jpg',
  '/images/icons/icon-72x72.png',
  '/images/icons/icon-96x96.png',
  '/images/icons/icon-128x128.png',
  '/images/icons/icon-144x144.png',
  '/images/icons/icon-152x152.png',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-384x384.png',
  '/images/icons/icon-512x512.png',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css',
];

// Instalasi Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Cache dibuka');
      return cache.addAll(urlsToCache);
    }),
  );
});

// Aktivasi Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME;
          })
          .map((cacheName) => {
            return caches.delete(cacheName);
          }),
      );
    }),
  );
});

// Strategi Cache: Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jika permintaan ke API, gunakan network-first
  if (requestUrl.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Cache hit - return response
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Jika respons valid, simpan ke cache
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('Fetch gagal:', error);
            // Jika offline dan tidak ada di cache, tampilkan halaman offline
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            return null;
          });

        return response || fetchPromise;
      }),
    );
  } else {
    // Untuk permintaan lain (API), gunakan network-first
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        }),
    );
  }
});

// Menangani push notification
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Notifikasi Baru',
    options: {
      body: 'Ada pembaruan dari StoryShare',
      icon: '/images/icons/icon-192x192.png',
      badge: '/images/icons/icon-72x72.png',
    },
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        options: {
          ...notificationData.options,
          body: data.message || notificationData.options.body,
          data: {
            url: data.url || '/',
          },
        },
      };
    } catch (error) {
      console.error('Gagal memproses data notifikasi:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData.options),
  );
});

// Menangani klik pada notifikasi
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((windowClients) => {
        // Cek apakah ada jendela yang sudah terbuka
        const hadWindowToFocus = windowClients.some((windowClient) => {
          if (windowClient.url === urlToOpen) {
            windowClient.focus();
            return true;
          }
          return false;
        });

        // Jika tidak ada jendela yang terbuka, buka jendela baru
        if (!hadWindowToFocus) {
          clients.openWindow(urlToOpen).catch((error) => {
            console.error('Gagal membuka jendela:', error);
          });
        }
      }),
  );
});
