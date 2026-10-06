import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';
import { fracaoDoMes, gastoPorCategoria, resumoFinanceiro } from '../lib/calculos';
import { apenasMes, corSegura, diaEMes, formatarBRL, hojeISO, nomeDoDia, ultimoDiaDoMes } from '../lib/formato';
import LinhaTransacao from './LinhaTransacao';
import { Botao, LinkDeAcao, Ponto, Secao, SeletorDeMes } from './ui';

export default function Painel({ dados, mes, aoMudarMes, aoNovo, aoEditar, aoAlternarPago, aoVerTodos, aoDefinirLimites }) {
  const { contas, categorias, transacoes, orcamentos } = dados;
  const resumo = resumoFinanceiro(dados, mes);
  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const contaPorId = new Map(contas.map((c) => [c.id, c]));

  const hoje = hojeISO();
  const ultimas = transacoes
    .filter((t) => t.data <= hoje)
    .sort((a, b) => (a.data === b.data ? (a.criado_em < b.criado_em ? 1 : -1) : a.data < b.data ? 1 : -1))
    .slice(0, 6);

  return (
    <div>
      <SeletorDeMes mes={mes} aoMudar={aoMudarMes} />
      <Saldo resumo={resumo} mes={mes} />
      <Movimento resumo={resumo} mes={mes} />

      <Secao titulo="Orçamento por categoria" acao={<LinkDeAcao onClick={aoDefinirLimites}>Definir limites</LinkDeAcao>}>
        <Orcamentos
          mes={mes}
          orcamentos={orcamentos.filter((o) => o.mes_ano === mes)}
          gastos={gastoPorCategoria(transacoes, mes)}
          categoriaPorId={categoriaPorId}
          aoDefinirLimites={aoDefinirLimites}
        />
      </Secao>

      <Secao
        titulo="Últimos lançamentos"
        acao={ultimas.length > 0 ? <LinkDeAcao onClick={aoVerTodos}>Ver todos</LinkDeAcao> : null}
      >
        {ultimas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-linha px-5 py-8 text-center">
            <p className="text-apagado">Nada lançado ainda. Comece pelo que você gastou ou recebeu hoje.</p>
            <Botao className="mt-4" onClick={aoNovo}>
              <Plus size={18} /> Novo lançamento
            </Botao>
          </div>
        ) : (
          <ul className="divide-y divide-linha rounded-2xl bg-folha px-4">
            {ultimas.map((t) => (
              <LinhaTransacao
                key={t.id}
                transacao={t}
                categoria={categoriaPorId.get(t.categoria_id)}
                conta={contaPorId.get(t.conta_id)}
                aoEditar={aoEditar}
                aoAlternarPago={aoAlternarPago}
                mostrarData={nomeDoDia(t.data)}
              />
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

/** O saldo e a conta que leva até a projeção, armada como numa caderneta: parcelas, traço, resultado. */
function Saldo({ resumo, mes }) {
  const linha = 'flex items-baseline justify-between gap-4 py-1.5';
  return (
    <section className="mt-3 rounded-3xl bg-cofre p-5 text-white">
      <p className="text-sm text-white/70">Saldo consolidado</p>
      <p className="mt-1 font-titulo text-[2.5rem] font-semibold leading-none tracking-tight tabular-nums">
        {formatarBRL(resumo.saldo)}
      </p>

      <dl className="mt-5 text-[0.95rem] tabular-nums">
        <div className={linha}>
          <dt className="text-white/70">A receber até o fim do mês</dt>
          <dd>+ {formatarBRL(resumo.aReceber)}</dd>
        </div>
        <div className={linha}>
          <dt className="text-white/70">A pagar até o fim do mês</dt>
          <dd>− {formatarBRL(resumo.aPagar)}</dd>
        </div>
        <div className={`${linha} mt-1.5 border-t border-white/25 pt-3`}>
          <dt className="font-medium">Projeção para {diaEMes(ultimoDiaDoMes(mes))}</dt>
          <dd className={`font-titulo text-xl font-semibold ${resumo.projecao < 0 ? 'text-[#FFB4AB]' : ''}`}>
            {formatarBRL(resumo.projecao)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Movimento({ resumo, mes }) {
  const { receitasMes, despesasMes } = resumo;
  const sobra = receitasMes - despesasMes;
  const usado = receitasMes > 0 ? Math.min(100, (despesasMes / receitasMes) * 100) : despesasMes > 0 ? 100 : 0;
  const nome = apenasMes(mes);

  let frase = `Nenhuma receita ou despesa em ${nome}.`;
  if (receitasMes > 0 || despesasMes > 0) {
    if (sobra > 0) frase = `Sobram ${formatarBRL(sobra)} das receitas de ${nome}.`;
    else if (sobra < 0) frase = `As despesas de ${nome} passam das receitas em ${formatarBRL(-sobra)}.`;
    else frase = `Receitas e despesas de ${nome} estão empatadas.`;
  }

  return (
    <section className="mt-3 rounded-3xl bg-folha p-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-sm text-apagado">
            <ArrowDownLeft size={16} className="text-entrada" /> Receita total
          </p>
          <p className="mt-1 font-titulo text-2xl font-semibold tracking-tight tabular-nums text-entrada">
            {formatarBRL(receitasMes)}
          </p>
        </div>
        <div>
          <p className="flex items-center gap-1.5 text-sm text-apagado">
            <ArrowUpRight size={16} className="text-saida" /> Despesas do mês
          </p>
          <p className="mt-1 font-titulo text-2xl font-semibold tracking-tight tabular-nums text-saida">
            {formatarBRL(despesasMes)}
          </p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-entrada/25" aria-hidden="true">
        <div className="h-full rounded-full bg-saida" style={{ width: `${usado}%` }} />
      </div>
      <p className="mt-2.5 text-sm text-apagado">{frase}</p>
    </section>
  );
}

function Orcamentos({ mes, orcamentos, gastos, categoriaPorId, aoDefinirLimites }) {
  const itens = orcamentos
    .map((o) => ({ orcamento: o, categoria: categoriaPorId.get(o.categoria_id), gasto: gastos.get(o.categoria_id) || 0 }))
    .filter((item) => item.categoria)
    .sort((a, b) => b.gasto / b.orcamento.valor_limite - a.gasto / a.orcamento.valor_limite);

  if (itens.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-linha px-5 py-6 text-center">
        <p className="text-apagado">Nenhum limite definido para {apenasMes(mes)}.</p>
        <Botao variante="neutro" className="mt-4" onClick={aoDefinirLimites}>
          Definir limites
        </Botao>
      </div>
    );
  }

  const ritmo = fracaoDoMes(mes);
  return (
    <div className="rounded-2xl bg-folha px-4 py-1">
      <ul className="divide-y divide-linha">
        {itens.map(({ orcamento, categoria, gasto }) => {
          const limite = orcamento.valor_limite;
          const fracao = limite > 0 ? gasto / limite : 0;
          const estourou = gasto > limite;
          return (
            <li key={orcamento.id} className="py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="flex min-w-0 items-center gap-2 font-medium">
                  <Ponto cor={categoria.cor_hex} />
                  <span className="truncate">{categoria.nome}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-apagado">
                  <span className={`font-semibold ${estourou ? 'text-saida' : 'text-tinta'}`}>{formatarBRL(gasto)}</span> de{' '}
                  {formatarBRL(limite)}
                </span>
              </div>
              <div
                className="relative mt-2.5 h-2.5 rounded-full bg-linha"
                role="progressbar"
                aria-label={`Orçamento de ${categoria.nome}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(Math.min(1, fracao) * 100)}
              >
                <div
                  className={`h-full rounded-full ${estourou ? 'bg-saida' : ''}`}
                  style={{
                    width: `${Math.min(100, fracao * 100)}%`,
                    backgroundColor: estourou ? undefined : corSegura(categoria.cor_hex),
                  }}
                />
                {ritmo !== null ? (
                  <span
                    aria-hidden="true"
                    className="absolute -top-1 h-[1.125rem] w-0.5 rounded-full bg-tinta"
                    style={{ left: `${ritmo * 100}%` }}
                  />
                ) : null}
              </div>
              <p className={`mt-1.5 text-sm ${estourou ? 'font-medium text-saida' : 'text-apagado'}`}>
                {estourou
                  ? `${formatarBRL(gasto - limite)} acima do limite`
                  : `${Math.round(fracao * 100)}% usado, restam ${formatarBRL(limite - gasto)}`}
              </p>
            </li>
          );
        })}
      </ul>
      {ritmo !== null ? (
        <p className="border-t border-linha py-3 text-sm text-apagado">
          O traço marca o dia de hoje. Barra antes do traço: gasto dentro do ritmo do mês.
        </p>
      ) : null}
    </div>
  );
}
