// Datas são guardadas como texto: 'AAAA-MM-DD' (dia) e 'AAAA-MM' (mês).
// Texto nesse formato ordena e compara corretamente, e não sofre com fuso horário.

const pad = (n) => String(n).padStart(2, '0');
const iso = (ano, mes, dia) => `${ano}-${pad(mes)}-${pad(dia)}`;
const partes = (texto) => texto.split('-').map(Number);
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatarBRL = (valor) => moeda.format(Number(valor) || 0);

/** Converte reais em centavos inteiros. As somas são feitas em centavos para não acumular erro de arredondamento. */
export const centavos = (valor) => Math.round((Number(valor) || 0) * 100);

/** Lê o que a pessoa digitou ("1.234,56", "1234.56", "-50") e devolve um número em reais. */
export function lerValor(texto) {
  const limpo = String(texto ?? '').replace(/[^\d,.-]/g, '');
  const numero = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  const valor = Number.parseFloat(numero);
  return Number.isFinite(valor) ? Math.round(valor * 100) / 100 : 0;
}

export function hojeISO() {
  const d = new Date();
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export const mesAtual = () => hojeISO().slice(0, 7);
export const mesDe = (data) => (data || '').slice(0, 7);

export function deslocarMes(mesAno, quantos) {
  const [ano, mes] = partes(mesAno);
  const d = new Date(ano, mes - 1 + quantos, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function ultimoDiaDoMes(mesAno) {
  const [ano, mes] = partes(mesAno);
  return iso(ano, mes, new Date(ano, mes, 0).getDate());
}

/** Mesma data, N meses à frente. Dia 31 vira o último dia quando o mês é mais curto. */
export function somarMeses(data, quantos) {
  const [ano, mes, dia] = partes(data);
  const alvo = new Date(ano, mes - 1 + quantos, 1);
  const ultimo = new Date(alvo.getFullYear(), alvo.getMonth() + 1, 0).getDate();
  return iso(alvo.getFullYear(), alvo.getMonth() + 1, Math.min(dia, ultimo));
}

const maiuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

/** 'Outubro de 2026' */
export function nomeDoMes(mesAno) {
  const [ano, mes] = partes(mesAno);
  return maiuscula(new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }));
}

/** 'outubro' */
export function apenasMes(mesAno) {
  const [ano, mes] = partes(mesAno);
  return new Date(ano, mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long' });
}

/** 'Hoje', 'Ontem' ou 'Seg., 5 de out.' */
export function nomeDoDia(data) {
  const hoje = hojeISO();
  if (data === hoje) return 'Hoje';
  const [ano, mes, dia] = partes(data);
  const d = new Date(ano, mes - 1, dia);
  const ontem = new Date();
  ontem.setDate(ontem.getDate() - 1);
  if (d.toDateString() === ontem.toDateString()) return 'Ontem';
  const opcoes = { weekday: 'short', day: 'numeric', month: 'short' };
  if (mesDe(data).slice(0, 4) !== hoje.slice(0, 4)) opcoes.year = 'numeric';
  return maiuscula(d.toLocaleDateString('pt-BR', opcoes));
}

/** '05/10/2026' */
export function dataCurta(data) {
  const [ano, mes, dia] = partes(data);
  return `${pad(dia)}/${pad(mes)}/${ano}`;
}

/** '5 de outubro' */
export function diaEMes(data) {
  const [ano, mes, dia] = partes(data);
  return new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

/** Data e hora legíveis a partir de um carimbo ISO completo. */
export function dataHora(carimbo) {
  const d = new Date(carimbo);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export const dataValida = (ano, mes, dia) => {
  const d = new Date(ano, mes - 1, dia);
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia ? iso(ano, mes, dia) : null;
};

/** Só aceita cor no formato #RRGGBB (o valor pode ter vindo de um arquivo importado). */
export const corSegura = (cor) => (/^#[0-9a-f]{6}$/i.test(cor || '') ? cor : '#7B8794');
