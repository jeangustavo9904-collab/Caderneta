import { agoraISO, db, novoId } from '../db';
import { centavos, somarMeses } from './formato';

/** Cria ou atualiza um registro, carimbando criado_em e atualizado_em. */
export async function salvarRegistro(tabela, registro) {
  const agora = agoraISO();
  const completo = {
    ...registro,
    id: registro.id || novoId(),
    criado_em: registro.criado_em || agora,
    atualizado_em: agora,
  };
  await db.table(tabela).put(completo);
  return completo;
}

/**
 * Exclusão lógica: o registro some das telas, mas fica no banco marcado como excluído.
 * É isso que permite que a exclusão chegue ao outro celular na próxima sincronização.
 */
export async function excluirRegistro(tabela, id) {
  const atual = await db.table(tabela).get(id);
  if (!atual) return;
  await db.table(tabela).put({ ...atual, excluido: true, atualizado_em: agoraISO() });
}

/**
 * Salva um lançamento.
 * Lançamento novo com parcelas > 1 vira N registros, um por mês, com o valor total
 * dividido entre eles (os centavos que sobram vão para as primeiras parcelas).
 */
export async function salvarLancamento(lancamento) {
  const base = {
    conta_id: lancamento.conta_id,
    categoria_id: lancamento.categoria_id,
    tipo: lancamento.tipo,
    valor: centavos(lancamento.valor) / 100,
    data: lancamento.data,
    descricao: (lancamento.descricao || '').trim(),
    pago: Boolean(lancamento.pago),
    cartao_credito: Boolean(lancamento.cartao_credito),
    parcelas: Math.max(1, Number.parseInt(lancamento.parcelas, 10) || 1),
  };

  if (lancamento.id) return [await salvarRegistro('transacoes', { ...lancamento, ...base })];
  if (base.parcelas === 1) return [await salvarRegistro('transacoes', base)];

  const total = centavos(base.valor);
  const parte = Math.floor(total / base.parcelas);
  const sobra = total - parte * base.parcelas;
  const grupo = novoId();
  const agora = agoraISO();
  const registros = Array.from({ length: base.parcelas }, (_, i) => ({
    ...base,
    id: novoId(),
    valor: (parte + (i < sobra ? 1 : 0)) / 100,
    data: somarMeses(base.data, i),
    pago: i === 0 ? base.pago : false,
    parcela_numero: i + 1,
    grupo_parcelas_id: grupo,
    criado_em: agora,
    atualizado_em: agora,
  }));
  await db.transacoes.bulkPut(registros);
  return registros;
}

/** Exclui todas as parcelas de uma mesma compra. */
export async function excluirParcelas(grupoId) {
  const agora = agoraISO();
  const todas = await db.transacoes.where('grupo_parcelas_id').equals(grupoId).toArray();
  const parcelas = todas.filter((p) => !p.excluido);
  await db.transacoes.bulkPut(parcelas.map((p) => ({ ...p, excluido: true, atualizado_em: agora })));
  return parcelas.length;
}

/** Define (ou remove, com valor 0) o limite de uma categoria em um mês. */
export async function definirOrcamento(categoriaId, mesAno, valorLimite) {
  const existentes = await db.orcamentos.where('[categoria_id+mes_ano]').equals([categoriaId, mesAno]).toArray();
  const atual = existentes.find((o) => !o.excluido);
  if (!(valorLimite > 0)) {
    if (atual) await excluirRegistro('orcamentos', atual.id);
    return null;
  }
  return salvarRegistro('orcamentos', {
    ...(atual || {}),
    categoria_id: categoriaId,
    mes_ano: mesAno,
    valor_limite: centavos(valorLimite) / 100,
  });
}

/** Quantos lançamentos ativos usam esta conta ou categoria (para impedir exclusão que deixaria lançamentos órfãos). */
export async function contarUso(campo, id) {
  const lista = await db.transacoes.where(campo).equals(id).toArray();
  return lista.filter((t) => !t.excluido).length;
}
