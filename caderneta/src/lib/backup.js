import { agoraISO, db, TABELAS } from '../db';

const APP = 'caderneta';
const FORMATO = 1; // aumente quando a estrutura do arquivo mudar
const TAMANHO_MAXIMO = 25 * 1024 * 1024; // 25 MB
const CHAVE_ULTIMO_BACKUP = 'caderneta.ultimo_backup';

/** Erro com mensagem pronta para mostrar na tela. */
export class ErroDeBackup extends Error {}

/* ------------------------------------------------------------------ */
/* Exportar                                                            */
/* ------------------------------------------------------------------ */

/** Lê todas as tabelas (inclusive os registros marcados como excluídos, que precisam viajar junto). */
export async function montarBackup() {
  const dados = {};
  await db.transaction('r', TABELAS.map((nome) => db.table(nome)), async () => {
    for (const nome of TABELAS) dados[nome] = await db.table(nome).toArray();
  });
  return { app: APP, formato: FORMATO, exportado_em: agoraISO(), dados };
}

function criarArquivo(backup) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  const carimbo = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  const nome = `caderneta-backup-${carimbo}.json`;
  return new File([JSON.stringify(backup)], nome, { type: 'application/json' });
}

function baixar(arquivo) {
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = arquivo.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

const contarAtivos = (backup) =>
  Object.fromEntries(TABELAS.map((nome) => [nome, backup.dados[nome].filter((r) => !r.excluido).length]));

function registrarExportacao() {
  try {
    localStorage.setItem(CHAVE_ULTIMO_BACKUP, agoraISO());
  } catch {
    /* armazenamento indisponível: só perdemos o lembrete da data */
  }
}

export function ultimoBackup() {
  try {
    return localStorage.getItem(CHAVE_ULTIMO_BACKUP);
  } catch {
    return null;
  }
}

/**
 * Gera o arquivo .json com todos os dados e inicia o download.
 * Devolve { nomeArquivo, totais } para a tela confirmar o que foi salvo.
 */
export async function exportarBackupJSON() {
  const backup = await montarBackup();
  const arquivo = criarArquivo(backup);
  baixar(arquivo);
  registrarExportacao();
  return { nomeArquivo: arquivo.name, totais: contarAtivos(backup), compartilhado: false };
}

/**
 * Abre a folha de compartilhamento do celular (WhatsApp, e-mail...) já com o arquivo anexado.
 * Nem todo navegador aceita compartilhar .json: nesse caso faz o download normal e a
 * pessoa anexa o arquivo no WhatsApp como "Documento".
 */
export async function compartilharBackupJSON() {
  const backup = await montarBackup();
  const arquivo = criarArquivo(backup);
  const podeCompartilhar = typeof navigator.canShare === 'function' && navigator.canShare({ files: [arquivo] });

  if (!podeCompartilhar) {
    baixar(arquivo);
    registrarExportacao();
    return { nomeArquivo: arquivo.name, totais: contarAtivos(backup), compartilhado: false };
  }

  try {
    await navigator.share({ files: [arquivo], title: 'Backup da Caderneta' });
  } catch (erro) {
    if (erro?.name === 'AbortError') return { cancelado: true };
    throw erro;
  }
  registrarExportacao();
  return { nomeArquivo: arquivo.name, totais: contarAtivos(backup), compartilhado: true };
}

/* ------------------------------------------------------------------ */
/* Importar e combinar                                                 */
/* ------------------------------------------------------------------ */

const texto = (v) => typeof v === 'string' && v.length > 0 && v.length <= 500;
const objeto = (r) => r !== null && typeof r === 'object' && !Array.isArray(r) && texto(r.id);
const tipoValido = (t) => t === 'Receita' || t === 'Despesa';

// O arquivo vem de fora do app: cada registro é conferido antes de entrar no banco.
const VALIDADORES = {
  contas_bancarias: (r) => objeto(r) && texto(r.nome),
  categorias: (r) => objeto(r) && texto(r.nome) && tipoValido(r.tipo),
  transacoes: (r) =>
    objeto(r) && tipoValido(r.tipo) && Number.isFinite(r.valor) && /^\d{4}-\d{2}-\d{2}$/.test(r.data || ''),
  orcamentos: (r) =>
    objeto(r) && texto(r.categoria_id) && Number.isFinite(r.valor_limite) && /^\d{4}-\d{2}$/.test(r.mes_ano || ''),
};

/** Carimbo de data em milissegundos. Sem carimbo (ou inválido) conta como o mais antigo possível. */
const instante = (registro) => Date.parse(registro?.atualizado_em) || 0;

/**
 * O coração da sincronização. Para cada registro recebido:
 *   - id que não existe aqui            -> novo, entra no banco
 *   - id existe e o recebido é mais novo -> substitui o local
 *   - id existe e o local é igual/mais novo -> o local fica como está
 *
 * `locais[i]` é o registro local com o mesmo id de `recebidos[i]` (ou undefined).
 */
export function combinarRegistros(locais, recebidos) {
  const plano = { gravar: [], novos: 0, atualizados: 0, removidos: 0, mantidos: 0 };
  recebidos.forEach((recebido, i) => {
    const local = locais[i];
    if (!local) {
      plano.gravar.push(recebido);
      // Um registro já excluído no outro aparelho é guardado, mas não conta como novidade.
      if (!recebido.excluido) plano.novos += 1;
    } else if (instante(recebido) > instante(local)) {
      plano.gravar.push(recebido);
      if (recebido.excluido && !local.excluido) plano.removidos += 1;
      else if (!recebido.excluido) plano.atualizados += 1;
    } else {
      plano.mantidos += 1;
    }
  });
  return plano;
}

/** Se o mesmo id aparecer duas vezes no arquivo, fica a versão mais recente. */
function semRepetidos(registros) {
  const porId = new Map();
  for (const r of registros) {
    const anterior = porId.get(r.id);
    if (!anterior || instante(r) > instante(anterior)) porId.set(r.id, r);
  }
  return [...porId.values()];
}

/**
 * Dois celulares podem ter criado, cada um, um limite para a mesma categoria no mesmo mês
 * (ids diferentes). Depois da fusão fica só o mais recente; o outro é marcado como excluído.
 */
async function unificarOrcamentos() {
  const ativos = (await db.orcamentos.toArray()).filter((o) => !o.excluido);
  const melhor = new Map();
  const sobrando = [];
  for (const o of ativos) {
    const chave = `${o.categoria_id}|${o.mes_ano}`;
    const atual = melhor.get(chave);
    if (!atual) melhor.set(chave, o);
    else if (instante(o) > instante(atual)) {
      sobrando.push(atual);
      melhor.set(chave, o);
    } else sobrando.push(o);
  }
  if (sobrando.length === 0) return;
  const agora = agoraISO();
  await db.orcamentos.bulkPut(sobrando.map((o) => ({ ...o, excluido: true, atualizado_em: agora })));
}

/**
 * Lê um arquivo de backup e combina com os dados deste aparelho, sem duplicar nada.
 *
 * @param {File} arquivo  arquivo .json escolhido pela pessoa
 * @param {{ simular?: boolean }} opcoes  com simular: true nada é gravado; serve para
 *        mostrar o que vai mudar antes de confirmar
 * @returns resumo com totais gerais e por tabela: novos, atualizados, removidos, mantidos, invalidos
 *
 * Tudo acontece em uma única transação: se algo falhar no meio, nada é alterado.
 */
export async function importarECombinarJSON(arquivo, { simular = false } = {}) {
  if (!arquivo) throw new ErroDeBackup('Nenhum arquivo foi escolhido.');
  if (arquivo.size > TAMANHO_MAXIMO) throw new ErroDeBackup('O arquivo é grande demais para ser um backup da Caderneta.');

  let pacote;
  try {
    pacote = JSON.parse(await arquivo.text());
  } catch {
    throw new ErroDeBackup('Não foi possível ler o arquivo. Confira se é o .json gerado pela Caderneta.');
  }
  if (!pacote || pacote.app !== APP || !pacote.dados || typeof pacote.dados !== 'object') {
    throw new ErroDeBackup('Este arquivo não é um backup da Caderneta.');
  }
  if (Number(pacote.formato) > FORMATO) {
    throw new ErroDeBackup('Este backup foi gerado por uma versão mais nova do app. Atualize a Caderneta neste aparelho e tente de novo.');
  }

  const resumo = {
    simulado: simular,
    exportado_em: typeof pacote.exportado_em === 'string' ? pacote.exportado_em : null,
    novos: 0,
    atualizados: 0,
    removidos: 0,
    mantidos: 0,
    invalidos: 0,
    tabelas: {},
  };

  await db.transaction('rw', TABELAS.map((nome) => db.table(nome)), async () => {
    for (const nome of TABELAS) {
      const bruto = Array.isArray(pacote.dados[nome]) ? pacote.dados[nome] : [];
      const recebidos = semRepetidos(bruto.filter(VALIDADORES[nome]));
      const locais = await db.table(nome).bulkGet(recebidos.map((r) => r.id));
      const plano = combinarRegistros(locais, recebidos);

      if (!simular && plano.gravar.length > 0) await db.table(nome).bulkPut(plano.gravar);

      const invalidos = bruto.length - bruto.filter(VALIDADORES[nome]).length;
      resumo.tabelas[nome] = {
        novos: plano.novos,
        atualizados: plano.atualizados,
        removidos: plano.removidos,
        mantidos: plano.mantidos,
        invalidos,
      };
      resumo.novos += plano.novos;
      resumo.atualizados += plano.atualizados;
      resumo.removidos += plano.removidos;
      resumo.mantidos += plano.mantidos;
      resumo.invalidos += invalidos;
    }
    if (!simular) await unificarOrcamentos();
  });

  return resumo;
}
