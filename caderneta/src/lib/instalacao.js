import { useSyncExternalStore } from 'react';

/*
 * Instalação na tela inicial.
 * Android/Chrome dispara "beforeinstallprompt" (às vezes antes de o React montar,
 * por isso o evento é capturado aqui, no carregamento do módulo).
 * No iPhone não existe esse evento: a instalação é manual, pelo menu Compartilhar.
 */
let convite = null;
let estado = calcular();
const ouvintes = new Set();

function calcular() {
  if (typeof window === 'undefined') return 'indisponivel';
  const instalado = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (instalado) return 'instalado';
  if (convite) return 'disponivel';
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  return ios ? 'ios' : 'indisponivel';
}

function atualizar() {
  estado = calcular();
  ouvintes.forEach((avisar) => avisar());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (evento) => {
    evento.preventDefault();
    convite = evento;
    atualizar();
  });
  window.addEventListener('appinstalled', () => {
    convite = null;
    atualizar();
  });
}

export async function instalar() {
  if (!convite) return;
  convite.prompt();
  await convite.userChoice;
  convite = null;
  atualizar();
}

/** 'instalado' | 'disponivel' (dá para instalar com um toque) | 'ios' (instalação manual) | 'indisponivel' */
export function useInstalacao() {
  return useSyncExternalStore(
    (avisar) => {
      ouvintes.add(avisar);
      return () => ouvintes.delete(avisar);
    },
    () => estado,
    () => 'indisponivel',
  );
}
