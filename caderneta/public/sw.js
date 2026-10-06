/*
 * Service Worker da Caderneta: guarda o app inteiro no aparelho.
 *
 * VERSAO e ARQUIVOS são preenchidos automaticamente no `npm run build`
 * (veja o plugin "prepararOffline" em vite.config.js). Cada build gera um
 * cache novo; o antigo é apagado quando a versão nova assume.
 */
const VERSAO = '__VERSAO__';
const ARQUIVOS = [/* __ARQUIVOS__ */];
const PREFIXO = 'caderneta-';
const CACHE = PREFIXO + VERSAO;

// Instalação: baixa tudo de uma vez. Se um arquivo falhar, a instalação inteira falha
// e o navegador tenta de novo depois, sem deixar o app pela metade.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)));
});

// Ativação: apaga caches de versões anteriores e assume as abas abertas.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const nomes = await caches.keys();
      await Promise.all(
        nomes.filter((nome) => nome.startsWith(PREFIXO) && nome !== CACHE).map((nome) => caches.delete(nome)),
      );
      await self.clients.claim();
    })(),
  );
});

// O app pede para a versão nova assumir quando a pessoa toca em "Atualizar".
self.addEventListener('message', (event) => {
  if (event.data === 'ATIVAR_AGORA') self.skipWaiting();
});

// Leitura: sempre do cache primeiro. A rede só é usada se o arquivo não estiver guardado.
self.addEventListener('fetch', (event) => {
  const pedido = event.request;
  if (pedido.method !== 'GET') return;
  if (new URL(pedido.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      // Abrir o app (com ou sem ?acao=novo) sempre entrega a página guardada.
      if (pedido.mode === 'navigate') {
        const pagina = (await cache.match('./index.html')) || (await cache.match('./'));
        if (pagina) return pagina;
      }

      const guardado = await cache.match(pedido, { ignoreSearch: true });
      if (guardado) return guardado;

      try {
        const resposta = await fetch(pedido);
        if (resposta.ok) cache.put(pedido, resposta.clone());
        return resposta;
      } catch {
        return new Response('Sem conexão e arquivo fora do cache.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      }
    })(),
  );
});
