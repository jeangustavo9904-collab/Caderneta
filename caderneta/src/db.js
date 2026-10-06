import Dexie from 'dexie';

/*
 * Banco local da Caderneta (IndexedDB via Dexie).
 *
 * Em stores() entram só a chave primária e os campos INDEXADOS (usados em buscas).
 * Os demais campos são gravados normalmente, sem precisar declarar.
 *
 * Campos de cada registro:
 *
 * contas_bancarias  id, nome, tipo (Corrente | Poupança | Cartão | Dinheiro), saldo_inicial, criado_em
 * categorias        id, nome, tipo (Receita | Despesa), cor_hex
 * transacoes        id, conta_id, categoria_id, tipo (Receita | Despesa), valor, data (AAAA-MM-DD),
 *                   descricao, pago, cartao_credito, parcelas, criado_em, atualizado_em
 *                   + parcela_numero e grupo_parcelas_id quando a compra é parcelada
 * orcamentos        id, categoria_id, valor_limite, mes_ano (AAAA-MM)
 *
 * Dois campos extras existem em TODAS as tabelas, por causa da sincronização entre aparelhos:
 *   atualizado_em  decide qual versão vence na fusão (a mais recente)
 *   excluido       exclusão lógica: o registro fica guardado como "apagado" para que a
 *                  exclusão também chegue ao outro celular, em vez de o item reaparecer
 *
 * Booleanos (pago, cartao_credito, excluido) não são indexáveis no IndexedDB,
 * por isso não aparecem em stores().
 */
export const db = new Dexie('caderneta');

db.version(1).stores({
  contas_bancarias: 'id, nome, tipo, atualizado_em',
  categorias: 'id, nome, tipo, atualizado_em',
  transacoes: 'id, conta_id, categoria_id, tipo, data, grupo_parcelas_id, atualizado_em',
  orcamentos: 'id, categoria_id, mes_ano, [categoria_id+mes_ano], atualizado_em',
});

export const TABELAS = ['contas_bancarias', 'categorias', 'transacoes', 'orcamentos'];
export const TIPOS_DE_CONTA = ['Corrente', 'Poupança', 'Cartão', 'Dinheiro'];

/** UUID v4. Usa crypto.randomUUID quando existe e cai para getRandomValues nos navegadores antigos. */
export function novoId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  const b = globalThis.crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export const agoraISO = () => new Date().toISOString();

/*
 * Dados iniciais.
 *
 * Os IDs são FIXOS de propósito: se cada celular sorteasse um UUID para "Mercado",
 * a fusão dos backups criaria duas categorias "Mercado". A data antiga em atualizado_em
 * garante que qualquer edição feita por você vença o valor de fábrica.
 */
const FABRICA = '2000-01-01T00:00:00.000Z';
const idFixo = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const categoria = (n, nome, tipo, cor_hex) => ({
  id: idFixo(n),
  nome,
  tipo,
  cor_hex,
  criado_em: FABRICA,
  atualizado_em: FABRICA,
});

export const CAT = {
  alimentacao: idFixo(1),
  mercado: idFixo(2),
  transporte: idFixo(3),
  moradia: idFixo(4),
  contas: idFixo(5),
  saude: idFixo(6),
  lazer: idFixo(7),
  compras: idFixo(8),
  educacao: idFixo(9),
  outrasDespesas: idFixo(10),
  salario: idFixo(20),
  rendaExtra: idFixo(21),
  outrasReceitas: idFixo(22),
};

// Cores tiradas das cédulas do real.
export const CORES = [
  '#E07A1F', '#2F8F5B', '#2F6DB5', '#7A5AA8', '#C9A227', '#C8423B',
  '#D2568F', '#0E8A94', '#5C6BC0', '#7B8794', '#177A4D', '#8A6D3B',
];

export const CATEGORIAS_PADRAO = [
  categoria(1, 'Alimentação', 'Despesa', '#E07A1F'),
  categoria(2, 'Mercado', 'Despesa', '#2F8F5B'),
  categoria(3, 'Transporte', 'Despesa', '#2F6DB5'),
  categoria(4, 'Moradia', 'Despesa', '#7A5AA8'),
  categoria(5, 'Contas e serviços', 'Despesa', '#C9A227'),
  categoria(6, 'Saúde', 'Despesa', '#C8423B'),
  categoria(7, 'Lazer', 'Despesa', '#D2568F'),
  categoria(8, 'Compras', 'Despesa', '#0E8A94'),
  categoria(9, 'Educação', 'Despesa', '#5C6BC0'),
  categoria(10, 'Outras despesas', 'Despesa', '#7B8794'),
  categoria(20, 'Salário', 'Receita', '#177A4D'),
  categoria(21, 'Renda extra', 'Receita', '#0E8A94'),
  categoria(22, 'Outras receitas', 'Receita', '#8A6D3B'),
];

export const CONTA_PADRAO = {
  id: idFixo(100),
  nome: 'Carteira',
  tipo: 'Dinheiro',
  saldo_inicial: 0,
  criado_em: FABRICA,
  atualizado_em: FABRICA,
};

// Roda uma única vez, quando o banco é criado no aparelho.
db.on('populate', (tx) => {
  tx.table('categorias').bulkAdd(CATEGORIAS_PADRAO);
  tx.table('contas_bancarias').add(CONTA_PADRAO);
});
