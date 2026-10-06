import { CAT } from '../db';
import { dataValida, hojeISO } from './formato';

/*
 * Leitor de comprovantes: transforma o texto colado em lançamentos.
 * Roda inteiro no aparelho, com regras e expressões regulares. Nenhum texto é enviado
 * para lugar nenhum. Como todo leitor por regras, acerta os formatos comuns e pode errar
 * nos incomuns, por isso a tela sempre pede para conferir antes de salvar.
 */

/** minúsculas e sem acento, para comparar texto sem depender de como o banco escreveu */
const simples = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const NUMERO = String.raw`-?\s?\d{1,3}(?:\.\d{3})+,\d{2}|-?\s?\d+,\d{2}`;
const RE_DINHEIRO = new RegExp(String.raw`R\$\s*(${NUMERO})`, 'i');
const RE_NUMERO = new RegExp(String.raw`(?<![\d/.,])(${NUMERO})(?![\d/])`);
const paraNumero = (txt) => Number.parseFloat(txt.replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));

const MESES = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 };
const ABREV = Object.keys(MESES).join('|');

/* ------------------------------ valor ------------------------------ */

function valorNaLinha(linha) {
  const achado = linha.match(RE_DINHEIRO) || linha.match(RE_NUMERO);
  return achado ? Math.abs(paraNumero(achado[1])) : null;
}

function extrairValor(linhas) {
  const normal = linhas.map(simples);
  const acessorio = /(tarifa|taxa|juros|multa|desconto|iof|troco|saldo|limite)/;
  const buscas = [
    /valor (pago|total|do pagamento|da transferencia|do pix|da compra|da transacao|cobrado)|total pago/,
    /\b(valor|total|quantia)\b/,
  ];
  for (const busca of buscas) {
    for (let i = 0; i < linhas.length; i += 1) {
      if (!busca.test(normal[i]) || acessorio.test(normal[i])) continue;
      const aqui = valorNaLinha(linhas[i]);
      if (aqui) return aqui;
      // rótulo em uma linha e valor na de baixo
      const abaixo = linhas[i + 1] ? valorNaLinha(linhas[i + 1]) : null;
      if (abaixo) return abaixo;
    }
  }
  const texto = linhas.join('\n');
  const achado = texto.match(RE_DINHEIRO) || texto.match(RE_NUMERO);
  return achado ? Math.abs(paraNumero(achado[1])) : null;
}

/* ------------------------------ data ------------------------------- */

function anoCompleto(ano) {
  return ano < 100 ? 2000 + ano : ano;
}

/** Dia e mês sem ano (comum em fatura): assume o ano corrente, ou o anterior se cair muito no futuro. */
function completarAno(dia, mes) {
  const hoje = new Date();
  let ano = hoje.getFullYear();
  const limite = new Date(hoje.getFullYear(), hoje.getMonth() + 2, hoje.getDate());
  if (new Date(ano, mes - 1, dia) > limite) ano -= 1;
  return dataValida(ano, mes, dia);
}

function dataNaLinha(linha, aceitarSemAno = false) {
  const n = simples(linha);
  let m = n.match(/(?<!\d)(\d{2})\/(\d{2})\/(\d{4}|\d{2})(?!\d)/);
  if (m) return dataValida(anoCompleto(Number(m[3])), Number(m[2]), Number(m[1]));
  m = n.match(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/);
  if (m) return dataValida(Number(m[1]), Number(m[2]), Number(m[3]));
  m = n.match(new RegExp(String.raw`(?<!\d)(\d{1,2})\s*(?:de\s+)?(${ABREV})[a-z]*\.?,?\s*(?:de\s+)?(\d{4})`));
  if (m) return dataValida(Number(m[3]), MESES[m[2]], Number(m[1]));
  if (aceitarSemAno) {
    m = n.match(/(?<![\d/])(\d{2})\/(\d{2})(?![\d/])/);
    if (m) return completarAno(Number(m[1]), Number(m[2]));
    m = n.match(new RegExp(String.raw`(?<!\d)(\d{1,2})\s*(?:de\s+)?(${ABREV})\b`));
    if (m) return completarAno(Number(m[1]), MESES[m[2]]);
  }
  return null;
}

function extrairData(linhas) {
  const normal = linhas.map(simples);
  // Primeiro a data ligada ao pagamento em si (um boleto também traz vencimento, emissão...).
  const preferidas = /(pagamento|pago em|transferencia|transacao|realizad|efetuad|debitad|compra|data e hora|data:)/;
  for (let i = 0; i < linhas.length; i += 1) {
    if (!preferidas.test(normal[i]) || /vencimento|emissao/.test(normal[i])) continue;
    const data = dataNaLinha(linhas[i]) || (linhas[i + 1] ? dataNaLinha(linhas[i + 1]) : null);
    if (data) return data;
  }
  for (const linha of linhas) {
    const data = dataNaLinha(linha);
    if (data) return data;
  }
  return null;
}

/* ---------------------------- descrição ---------------------------- */

const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

/** "MERCADO SAO JOSE LTDA" -> "Mercado Sao Jose Ltda". Texto que já tem minúsculas não é alterado. */
function arrumarNome(nome) {
  const limpo = nome.replace(/\s+/g, ' ').replace(/^[\s:\-–]+|[\s:\-–]+$/g, '');
  if (limpo !== limpo.toUpperCase()) return limpo.slice(0, 80);
  return limpo
    .toLowerCase()
    .split(' ')
    .map((p, i) => {
      if (/^(?:[a-z]\.)+[a-z]?$/.test(p)) return p.toUpperCase(); // siglas: S.A., M.E.
      return i > 0 && MINUSCULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join(' ')
    .slice(0, 80);
}

const pareceDado = (linha) => {
  const n = simples(linha);
  return (
    !/[a-z]{2}/.test(n) || // só números e símbolos (CPF, valor, id)
    /^(cpf|cnpj|cpf\/cnpj|instituicao|banco|agencia|conta|chave|tipo|id\b|data|valor|autenticacao|codigo|ag\b)/.test(n)
  );
};

/** Procura "Rótulo: Fulano" ou o rótulo sozinho com o nome na linha de baixo. */
function nomeAposRotulo(linhas, rotulos, exato = false) {
  const alternativas = rotulos.join('|');
  const re = exato
    ? new RegExp(String.raw`^(?:${alternativas})\s*:\s*(.*)$`)
    : new RegExp(String.raw`^(?:dados\s+(?:do|da|de)\s+|nome\s+(?:do|da|de)\s+)?(?:${alternativas})\b\s*[:\-]?\s*(.*)$`);

  for (let i = 0; i < linhas.length; i += 1) {
    const achado = simples(linhas[i]).match(re);
    if (!achado) continue;
    // O texto depois do rótulo, tirado da linha original para manter os acentos.
    const resto = achado[1] ? linhas[i].slice(linhas[i].length - achado[1].length) : '';
    const candidatas = [resto, linhas[i + 1], linhas[i + 2]].filter(Boolean);
    for (const candidata of candidatas) {
      const semRotulo = candidata.replace(/^\s*(nome|raz[aã]o social|favorecido)\s*[:\-]?\s*/i, '').trim();
      if (semRotulo && !pareceDado(semRotulo)) return arrumarNome(semRotulo);
    }
  }
  return null;
}

function extrairDescricao(linhas, tipo, texto) {
  const quemRecebe = ['recebedor', 'destinatario', 'destino', 'favorecido', 'beneficiario', 'quem recebeu', 'estabelecimento', 'loja', 'pago a', 'pago para', 'para quem'];
  const quemPaga = ['pagador', 'origem', 'remetente', 'quem pagou', 'recebido de', 'de quem'];
  const despesa = tipo === 'Despesa';

  const nome =
    nomeAposRotulo(linhas, despesa ? quemRecebe : quemPaga) ||
    nomeAposRotulo(linhas, despesa ? ['para'] : ['de'], true) ||
    nomeLinhaSolta(linhas, despesa ? 'para' : 'de');

  if (nome) {
    if (!/\bpix\b/.test(simples(texto))) return nome;
    return despesa ? `Pix para ${nome}` : `Pix de ${nome}`;
  }

  const mensagem = nomeAposRotulo(linhas, ['descricao', 'mensagem', 'identificacao', 'referencia']);
  if (mensagem) return mensagem;

  const titulo = linhas.find((l) => !pareceDado(l) && !RE_DINHEIRO.test(l));
  return titulo ? arrumarNome(titulo) : '';
}

/** Alguns bancos escrevem só "Para" (ou "De") em uma linha e o nome na seguinte. */
function nomeLinhaSolta(linhas, rotulo) {
  const i = linhas.findIndex((l) => simples(l).replace(/[:\s]/g, '') === rotulo);
  if (i === -1) return null;
  const candidata = [linhas[i + 1], linhas[i + 2]].find((l) => l && !pareceDado(l.replace(/^\s*nome\s*[:\-]?\s*/i, '')));
  return candidata ? arrumarNome(candidata.replace(/^\s*nome\s*[:\-]?\s*/i, '')) : null;
}

/* ---------------------------- categoria ---------------------------- */

// A ordem importa: "mercado livre" precisa ser testado antes de "mercado".
const REGRAS = [
  [CAT.compras, /\b(mercado ?livre|mercado ?pago|magazine|magalu|amazon|shopee|shein|aliexpress|americanas|casas bahia|havan|renner|riachuelo)/],
  [CAT.mercado, /\b(supermercado|mercado|mercearia|atacad|assai|carrefour|hortifruti|acougue|sacolao|emporio)/],
  [CAT.alimentacao, /\b(restaurante|lanchonete|ifood|rappi|pizzaria|hamburgu|burger|padaria|panificadora|cafeteria|churrascaria|sorveteria|pastelaria|delivery)|\bbar\b/],
  [CAT.transporte, /\b(uber|99 ?app|99 ?pop|posto|combustivel|gasolina|etanol|estacionamento|pedagio|onibus|metro\b|passagem|ipiranga|shell|auto ?pecas|oficina)/],
  [CAT.moradia, /\b(aluguel|condominio|imobiliaria|iptu)/],
  [CAT.contas, /\b(energia|copel|sanepar|sabesp|cemig|enel|celesc|saneamento|internet|telefon|vivo|claro|tim\b|fatura|conta de (luz|agua|gas))/],
  [CAT.saude, /\b(farmacia|drogaria|droga ?raia|hospital|clinica|medic|dentista|odonto|laboratorio|unimed|plano de saude)/],
  [CAT.lazer, /\b(cinema|netflix|spotify|ingresso|show\b|hotel|pousada|prime video|disney|youtube premium|steam|playstation|xbox)/],
  [CAT.educacao, /\b(escola|colegio|faculdade|universidade|curso|livraria|udemy|alura|material escolar)/],
  [CAT.salario, /\b(salario|folha de pagamento|holerite|pro-?labore|adiantamento salarial)/],
];

function sugerirCategoria(descricao, texto, tipo, { categorias = [], transacoes = [] } = {}) {
  const ativas = categorias.filter((c) => c.tipo === tipo);
  const existe = (id) => ativas.some((c) => c.id === id);
  const d = simples(descricao);
  const t = simples(texto);

  // 1. Você já lançou algo com esta mesma descrição? Repete a categoria usada da última vez.
  if (d) {
    const anterior = transacoes
      .filter((x) => x.tipo === tipo && simples(x.descricao) === d && existe(x.categoria_id))
      .sort((a, b) => (a.data < b.data ? 1 : -1))[0];
    if (anterior) return anterior.categoria_id;
  }
  // 2. Palavras-chave: primeiro na descrição (mais confiável), depois no texto inteiro.
  for (const alvo of [d, t]) {
    for (const [id, re] of REGRAS) if (existe(id) && re.test(alvo)) return id;
  }
  // 3. O nome de uma categoria sua aparece no texto?
  const porNome = ativas.find((c) => c.nome.length >= 4 && t.includes(simples(c.nome)));
  if (porNome) return porNome.id;
  // 4. Sem pista: "Outras".
  const reserva = tipo === 'Receita' ? CAT.outrasReceitas : CAT.outrasDespesas;
  return existe(reserva) ? reserva : '';
}

/* ----------------------------- fatura ------------------------------ */

// "05/10 MERCADO BOM PRECO 123,45"   "05/10/2026 UBER *TRIP R$ 23,90"   "05 OUT POSTO IPIRANGA 150,00"
const RE_LINHA_FATURA = new RegExp(
  String.raw`^\s*(\d{1,2}(?:\/\d{2}(?:\/\d{2,4})?|\s+(?:${ABREV})[a-zç]*\.?))\s+(.+?)\s+(?:R\$\s*)?(${NUMERO})\s*$`,
  'i',
);
const NAO_E_COMPRA = /(pagamento (recebido|efetuado|de fatura)|pagto|saldo anterior|total da fatura|total a pagar|limite|encargos? totais)/;

function lerFatura(linhas, contexto) {
  const itens = [];
  for (const linha of linhas) {
    const m = linha.match(RE_LINHA_FATURA);
    if (!m) continue;
    const valor = paraNumero(m[3]);
    const descricaoBruta = m[2].trim();
    if (!(valor > 0) || NAO_E_COMPRA.test(simples(descricaoBruta))) continue; // estornos e pagamentos ficam de fora
    const data = dataNaLinha(m[1], true);
    if (!data) continue;
    const descricao = arrumarNome(descricaoBruta);
    itens.push({
      tipo: 'Despesa',
      valor,
      data,
      descricao,
      categoria_id: sugerirCategoria(descricao, descricao, 'Despesa', contexto),
      cartao_credito: true,
      pago: false,
      parcelas: 1,
    });
  }
  return itens;
}

/* ---------------------------- principal ---------------------------- */

/**
 * @param {string} texto  texto colado (comprovante Pix, recibo, linhas de fatura)
 * @param {{ categorias: object[], transacoes: object[] }} contexto  dados do app, usados para sugerir a categoria
 * @returns {{ modo: 'vazio' | 'unico' | 'fatura', itens: object[], achou?: object }}
 *   modo 'unico'  -> 1 item; `achou` diz quais campos foram realmente encontrados no texto
 *   modo 'fatura' -> vários itens, um por linha de compra
 */
export function analisarComprovante(texto, contexto = {}) {
  const linhas = String(texto ?? '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (linhas.length === 0) return { modo: 'vazio', itens: [] };

  const fatura = lerFatura(linhas, contexto);
  if (fatura.length >= 2) return { modo: 'fatura', itens: fatura };

  const corrido = simples(linhas.join('\n'));
  const tipo = /(pix recebido|voce recebeu|transferencia recebida|recebimento de pix|deposito recebido|credito em conta|valor recebido|comprovante de recebimento)/.test(corrido)
    ? 'Receita'
    : 'Despesa';

  const valor = extrairValor(linhas);
  const data = extrairData(linhas);
  const descricao = extrairDescricao(linhas, tipo, corrido);
  const vezes = corrido.match(/(?:parcelado em|em)\s*(\d{1,2})\s*x\b|(\d{1,2})\s*parcelas/);
  const parcelas = vezes ? Math.min(48, Math.max(1, Number(vezes[1] || vezes[2]))) : 1;
  const cartao =
    tipo === 'Despesa' &&
    (parcelas > 1 || /(cartao de credito|compra no credito|credito a vista|credito parcelado|funcao credito)/.test(corrido));

  return {
    modo: 'unico',
    achou: { valor: valor !== null, data: data !== null, descricao: descricao !== '' },
    itens: [
      {
        tipo,
        valor: valor ?? 0,
        data: data ?? hojeISO(),
        descricao,
        categoria_id: sugerirCategoria(descricao, corrido, tipo, contexto),
        cartao_credito: cartao,
        pago: !cartao,
        parcelas,
      },
    ],
  };
}

export const EXEMPLO_DE_COMPROVANTE = `Comprovante de transferência Pix
05/10/2026 - 14:32:10
Valor: R$ 187,90

Destino
Nome: SUPERMERCADO BOM PRECO LTDA
CNPJ: 12.345.678/0001-90
Instituição: Banco Exemplo S.A.

Origem
Nome: Maria Souza
ID da transação: E1234567820261005143210`;
