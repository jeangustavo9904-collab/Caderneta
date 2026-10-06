import { centavos, hojeISO, mesAtual, mesDe, ultimoDiaDoMes } from './formato';

/**
 * Números do painel.
 *
 * saldo        saldo inicial das contas + tudo que já foi pago/recebido (todas as datas)
 * receitasMes  todas as receitas com data no mês, pagas ou não
 * despesasMes  todas as despesas com data no mês, pagas ou não
 * aReceber     receitas ainda não recebidas com data até o fim do mês
 * aPagar       despesas ainda não pagas com data até o fim do mês (inclui atrasadas)
 * projecao     saldo + aReceber - aPagar: quanto sobra no fim do mês se tudo se confirmar
 */
export function resumoFinanceiro({ contas, transacoes }, mes) {
  const fim = ultimoDiaDoMes(mes);
  let saldo = contas.reduce((soma, conta) => soma + centavos(conta.saldo_inicial), 0);
  let receitasMes = 0;
  let despesasMes = 0;
  let aReceber = 0;
  let aPagar = 0;

  for (const t of transacoes) {
    const valor = centavos(t.valor);
    const receita = t.tipo === 'Receita';
    if (mesDe(t.data) === mes) {
      if (receita) receitasMes += valor;
      else despesasMes += valor;
    }
    if (t.pago) saldo += receita ? valor : -valor;
    else if (t.data <= fim) {
      if (receita) aReceber += valor;
      else aPagar += valor;
    }
  }

  return {
    saldo: saldo / 100,
    receitasMes: receitasMes / 100,
    despesasMes: despesasMes / 100,
    aReceber: aReceber / 100,
    aPagar: aPagar / 100,
    projecao: (saldo + aReceber - aPagar) / 100,
  };
}

/** Total gasto por categoria no mês. Devolve Map(categoria_id -> reais). */
export function gastoPorCategoria(transacoes, mes) {
  const total = new Map();
  for (const t of transacoes) {
    if (t.tipo !== 'Despesa' || mesDe(t.data) !== mes) continue;
    total.set(t.categoria_id, (total.get(t.categoria_id) || 0) + centavos(t.valor));
  }
  for (const [id, valor] of total) total.set(id, valor / 100);
  return total;
}

export function saldoDaConta(conta, transacoes) {
  let saldo = centavos(conta.saldo_inicial);
  for (const t of transacoes) {
    if (t.conta_id !== conta.id || !t.pago) continue;
    saldo += t.tipo === 'Receita' ? centavos(t.valor) : -centavos(t.valor);
  }
  return saldo / 100;
}

/** Quanto do mês já passou (0 a 1). Só faz sentido para o mês corrente; nos outros devolve null. */
export function fracaoDoMes(mes) {
  if (mes !== mesAtual()) return null;
  const hoje = hojeISO();
  return Number(hoje.slice(8)) / Number(ultimoDiaDoMes(mes).slice(8));
}
