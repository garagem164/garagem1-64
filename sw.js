// ====== SERVICE WORKER ======
const CACHE_NAME = 'garagem164-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Archivo+Black&display=swap',
  'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js'
];

// ====== INSTALAÇÃO ======
self.addEventListener('install', event => {
  console.log('✅ Service Worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache aberto');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('✅ Assets cacheados com sucesso');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('❌ Erro ao cachear assets:', error);
      })
  );
});

// ====== ATIVAÇÃO ======
self.addEventListener('activate', event => {
  console.log('✅ Service Worker ativando...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('🗑️ Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => {
      console.log('✅ Service Worker ativado e controlando a página');
      return self.clients.claim();
    })
  );
});

// ====== INTERCEPTAÇÃO DE REQUISIÇÕES ======
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retorna do cache
        if (response) {
          return response;
        }

        // Clone da requisição para fazer fetch
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest)
          .then(response => {
            // Verifica se a resposta é válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone da resposta para cachear
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (error) {
                  console.error('❌ Erro ao cachear:', error);
                }
              });

            return response;
          })
          .catch(error => {
            console.error('❌ Erro no fetch:', error);
            // Tenta retornar uma página offline se disponível
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// ====== SYNC PARA DADOS OFFLINE ======
self.addEventListener('sync', event => {
  if (event.tag === 'sync-carros') {
    console.log('🔄 Sincronizando dados offline...');
    event.waitUntil(syncCarros());
  }
});

async function syncCarros() {
  try {
    // Busca dados pendentes no IndexedDB ou localStorage
    const pendingData = await getPendingData();
    if (pendingData && pendingData.length > 0) {
      console.log(`📤 Sincronizando ${pendingData.length} itens pendentes...`);
      // Aqui você pode enviar os dados para o servidor
      // await enviarDadosParaServidor(pendingData);
      // Limpa dados pendentes após sincronizar
      await clearPendingData();
    }
    console.log('✅ Sincronização concluída!');
  } catch (error) {
    console.error('❌ Erro na sincronização:', error);
  }
}

// Funções auxiliares para dados offline (exemplo)
function getPendingData() {
  return new Promise((resolve) => {
    // Exemplo com localStorage
    try {
      const data = localStorage.getItem('pendingCarros');
      resolve(data ? JSON.parse(data) : []);
    } catch {
      resolve([]);
    }
  });
}

function clearPendingData() {
  return new Promise((resolve) => {
    try {
      localStorage.removeItem('pendingCarros');
      resolve();
    } catch {
      resolve();
    }
  });
}

// ====== NOTIFICAÇÕES PUSH ======
self.addEventListener('push', event => {
  console.log('📨 Push recebido:', event);
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Garagem 1:64';
  const options = {
    body: data.body || 'Novas atualizações na sua coleção!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Abrir'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ====== CLIQUE EM NOTIFICAÇÃO ======
self.addEventListener('notificationclick', event => {
  console.log('📨 Notificação clicada:', event);
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const url = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then(windowClients => {
          // Verifica se já tem uma janela aberta
          for (let client of windowClients) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Se não, abre uma nova
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// ====== MENSAGENS ======
self.addEventListener('message', event => {
  console.log('📨 Mensagem recebida:', event.data);
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker carregado!');
