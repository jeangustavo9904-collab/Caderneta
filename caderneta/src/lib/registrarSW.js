/**
 * Registra o Service Worker (só no build de produção; em `npm run dev` ele atrapalharia).
 * Quando uma versão nova termina de baixar, chama aoHaverAtualizacao(ativar):
 * o app mostra o aviso e, se a pessoa aceitar, ativar() troca a versão e recarrega.
 */
export async function registrarServiceWorker(aoHaverAtualizacao) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  try {
    const registro = await navigator.serviceWorker.register('./sw.js');
    let pediuAtualizacao = false;

    const avisar = (worker) =>
      aoHaverAtualizacao(() => {
        pediuAtualizacao = true;
        worker.postMessage('ATIVAR_AGORA');
      });

    if (registro.waiting && navigator.serviceWorker.controller) avisar(registro.waiting);

    registro.addEventListener('updatefound', () => {
      const novo = registro.installing;
      if (!novo) return;
      novo.addEventListener('statechange', () => {
        // Só é "atualização" se já havia uma versão controlando a página.
        if (novo.state === 'installed' && navigator.serviceWorker.controller) avisar(novo);
      });
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (pediuAtualizacao) window.location.reload();
    });
  } catch (erro) {
    console.warn('Service Worker não registrado:', erro);
  }
}
