import { useMemo, useState } from 'react';
import { apenasMes, centavos, formatarBRL, mesDe, nomeDoDia } from '../lib/formato';
import LinhaTransacao from './LinhaTransacao';
import { Botao, classeCampo, SeletorDeMes } from './ui';

export default function Lancamentos({ dados, mes, aoMudarMes, aoEditar, aoAlternarPago, aoNovo }) {
  const { contas, categorias, transacoes } = dados;
  const [categoriaId, setCategoriaId] = useState('');
  const [contaId, setContaId] = useState('');

  const categoriaPorId = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const contaPorId = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  const filtradas = transacoes
    .filter(
      (t) =>
        mesDe(t.data) === mes && (!categoriaId || t.categoria_id === categoriaId) && (!contaId || t.conta_id === contaId),
    )
    .sort((a, b) => (a.data === b.data ? (a.criado_em < b.criado_em ? 1 : -1) : a.data < b.data ? 1 : -1));

  const entradas = filtradas.reduce((s, t) => s + (t.tipo === 'Receita' ? centavos(t.valor) : 0), 0) / 100;
  const saidas = filtradas.reduce((s, t) => s + (t.tipo === 'Despesa' ? centavos(t.valor) : 0), 0) / 100;

  // Agrupa por dia, mantendo a ordem (mais recente primeiro).
  const dias = [];
  for (const t of filtradas) {
    const ultimo = dias[dias.length - 1];
    if (ultimo && ultimo.data === t.data) ultimo.itens.push(t);
    else dias.push({ data: t.data, itens: [t] });
  }

  const comFiltro = Boolean(categoriaId || contaId);

  return (
    <div>
      <SeletorDeMes mes={mes} aoMudar={aoMudarMes} />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          aria-label="Filtrar por categoria"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className={classeCampo}
        >
          <option value="">Todas as categorias</option>
          {['Despesa', 'Receita'].map((tipo) => (
            <optgroup key={tipo} label={tipo === 'Despesa' ? 'Despesas' : 'Receitas'}>
              {categorias
                .filter((c) => c.tipo === tipo)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <select aria-label="Filtrar por conta" value={contaId} onChange={(e) => setContaId(e.target.value)} className={classeCampo}>
          <option value="">Todas as contas</option>
          {contas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-folha px-3.5 py-2.5">
          <dt className="text-apagado">Entradas</dt>
          <dd className="font-semibold tabular-nums text-entrada">{formatarBRL(entradas)}</dd>
        </div>
        <div className="rounded-xl bg-folha px-3.5 py-2.5">
          <dt className="text-apagado">Saídas</dt>
          <dd className="font-semibold tabular-nums text-saida">{formatarBRL(saidas)}</dd>
        </div>
      </dl>

      {dias.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-linha px-5 py-8 text-center">
          <p className="text-apagado">
            {comFiltro
              ? `Nenhum lançamento em ${apenasMes(mes)} com esses filtros.`
              : `Nenhum lançamento em ${apenasMes(mes)}.`}
          </p>
          {comFiltro ? (
            <Botao
              variante="neutro"
              className="mt-4"
              onClick={() => {
                setCategoriaId('');
                setContaId('');
              }}
            >
              Limpar filtros
            </Botao>
          ) : (
            <Botao className="mt-4" onClick={aoNovo}>
              Novo lançamento
            </Botao>
          )}
        </div>
      ) : (
        dias.map((dia) => (
          <section key={dia.data} className="mt-5">
            <h2 className="mb-1.5 px-1 text-sm font-semibold text-apagado">{nomeDoDia(dia.data)}</h2>
            <ul className="divide-y divide-linha rounded-2xl bg-folha px-4">
              {dia.itens.map((t) => (
                <LinhaTransacao
                  key={t.id}
                  transacao={t}
                  categoria={categoriaPorId.get(t.categoria_id)}
                  conta={contaPorId.get(t.conta_id)}
                  aoEditar={aoEditar}
                  aoAlternarPago={aoAlternarPago}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
