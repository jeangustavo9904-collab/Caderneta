import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

// Nada sai do aparelho: o navegador só aceita arquivos do próprio app.
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
].join('; ');

/**
 * Depois do build, grava no sw.js a lista de todos os arquivos gerados
 * (os nomes têm hash e mudam a cada versão) e um identificador da versão.
 * Assim o app inteiro entra no cache já na primeira visita.
 */
function prepararOffline() {
  let pastaFinal = 'dist';
  const listar = (pasta) =>
    readdirSync(pasta).flatMap((nome) => {
      const caminho = join(pasta, nome);
      return statSync(caminho).isDirectory() ? listar(caminho) : [caminho];
    });

  return {
    name: 'caderneta-preparar-offline',
    apply: 'build',
    configResolved(config) {
      pastaFinal = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml() {
      return [
        {
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
          injectTo: 'head-prepend',
        },
      ];
    },
    closeBundle() {
      const arquivos = listar(pastaFinal)
        .map((caminho) => relative(pastaFinal, caminho).split('\\').join('/'))
        .filter((caminho) => caminho !== 'sw.js' && !caminho.endsWith('.map'))
        .sort();

      const hash = createHash('sha256');
      for (const arquivo of arquivos) {
        hash.update(arquivo).update(readFileSync(join(pastaFinal, arquivo)));
      }
      const versao = hash.digest('hex').slice(0, 10);

      const caminhoSW = join(pastaFinal, 'sw.js');
      const sw = readFileSync(caminhoSW, 'utf8')
        .replace("'__VERSAO__'", JSON.stringify(versao))
        .replace('[/* __ARQUIVOS__ */]', JSON.stringify(['./', ...arquivos.map((a) => `./${a}`)]));
      writeFileSync(caminhoSW, sw);
      console.log(`\n  sw.js: ${arquivos.length} arquivos no cache offline (versão ${versao})`);
    },
  };
}

export default defineConfig({
  // Caminhos relativos: o app funciona na raiz do domínio ou em subpasta (ex.: GitHub Pages).
  base: './',
  plugins: [react(), prepararOffline()],
});
