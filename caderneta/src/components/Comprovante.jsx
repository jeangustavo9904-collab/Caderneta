import { useState } from 'react';
import { ClipboardPaste, ScanText } from 'lucide-react';
import { analisarComprovante, EXEMPLO_DE_COMPROVANTE } from '../lib/comprovante';
import { salvarLancamento } from '../lib/dados';
import { centavos, dataCurta, formatarBRL } from '../lib/formato';
import { Botao, Campo, classeCampo, Ponto } from './ui';

export default function Comprovante({ dados, aoRevisar, avisar }) {
  const { contas, categorias, transacoes } = dados;
  const [texto, setTexto] = useState('');
  const [resultado, setResultado] = useState(null);
  const [marcados, setMarcados] = useState(new Set());
  const [contaId, setContaId] = useState('');
  const [salvando, setSalvando] = useState(false);

  const categoriaPorId = new Map(categorias.map((c) => [c.id, c]));
  const contaDaFatura = contaId || contas.find((c) => c.tipo === 'Cartão')?.id || contas[0]?.id || '';

  function ler(conteudo = texto) {
    const analise = analisarComprovante(conteudo, { categorias, transacoes });
    setResultado(analise);
    setMarcados(new Set(analise.itens.map((_, i) => i)));
  }

  async function colar() {
    try {
      const colado = await navigator.clipboard.readText();
      if (!colado.trim()) return avisar('A área de transferência está vazia.');
      setTexto(colado);
      ler(colado);
    } catch {
      avisar('O navegador não liberou a área de transferência. Toque no campo e cole o texto.');
    }
  }

  function alternar(i) {
    const novo = new Set(marcados);
    if (novo.has(i)) novo.delete(i);
    else novo.add(i);
    setMarcados(novo);
  }

  async function salvarFatura() {
    setSalvando(true);
    try {
      const escolhidos = resultado.itens.filter((_, i) => marcados.has(i));
      for (const item of escolhidos) await salvarLancamento({ ...item, conta_id: contaDaFatura });
      avisar(`${escolhidos.length} lançamentos salvos`);
      setTexto('');
      setResultado(null);
    } catch (erro) {
      console.error(erro);
      avisar('Não foi possível salvar os lançamentos. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  const item = resultado?.modo === 'unico' ? resultado.itens[0] : null;
  const totalMarcado = resultado
    ? resultado.itens.reduce((s, x, i) => s + (marcados.has(i) ? centavos(x.valor) : 0), 0) / 100
    : 0;

  return (
    <div>
      <h1 className="font-titulo text-2xl font-semibold tracking-tight">Ler comprovante</h1>
      <p className="mt-1 text-apagado">
        Cole o texto de um comprovante Pix ou as linhas de uma fatura. A leitura é feita aqui no aparelho, sem enviar nada.
      </p>

      <textarea
        aria-label="Texto do comprovante"
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value);
          setResultado(null);
        }}
        rows={7}
        placeholder="Cole aqui o texto do comprovante"
        className={`${classeCampo} mt-4 resize-y font-mono text-[0.9rem] leading-relaxed`}
      />

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Botao variante="neutro" onClick={colar}>
          <ClipboardPaste size={18} /> Colar
        </Botao>
        <Botao onClick={() => ler()} disabled={!texto.trim()}>
          <ScanText size={18} /> Ler texto
        </Botao>
      </div>

      {!texto && !resultado ? (
        <button
          type="button"
          className="mt-3 py-2 text-sm font-semibold text-garoupa"
          onClick={() => {
            setTexto(EXEMPLO_DE_COMPROVANTE);
            ler(EXEMPLO_DE_COMPROVANTE);
          }}
        >
          Testar com um comprovante de exemplo
        </button>
      ) : null}

      {resultado?.modo === 'vazio' ? <p className="mt-5 text-saida">Cole algum texto para ler.</p> : null}

      {item ? (
        <section className="mt-6" aria-live="polite">
          <h2 className="font-titulo text-lg font-semibold tracking-tight">O que foi encontrado</h2>
          <dl className="mt-2 divide-y divide-linha rounded-2xl bg-folha px-4">
            <Achado rotulo="Valor" achou={resultado.achou.valor}>
              <span className={`font-semibold tabular-nums ${item.tipo === 'Receita' ? 'text-entrada' : 'text-saida'}`}>
                {formatarBRL(item.valor)}
              </span>
            </Achado>
            <Achado rotulo="Data" achou={resultado.achou.data} reserva="usando a data de hoje">
              {dataCurta(item.data)}
            </Achado>
            <Achado rotulo="Descrição" achou={resultado.achou.descricao}>
              {item.descricao}
            </Achado>
            <Achado rotulo="Tipo" achou>
              {item.tipo}
              {item.cartao_credito ? `, cartão de crédito${item.parcelas > 1 ? ` em ${item.parcelas}x` : ''}` : ''}
            </Achado>
            <Achado rotulo="Categoria sugerida" achou={Boolean(item.categoria_id)}>
              <span className="inline-flex items-center gap-2">
                <Ponto cor={categoriaPorId.get(item.categoria_id)?.cor_hex} />
                {categoriaPorId.get(item.categoria_id)?.nome}
              </span>
            </Achado>
          </dl>
          <Botao className="mt-4 w-full" onClick={() => aoRevisar(item)}>
            Conferir e salvar
          </Botao>
        </section>
      ) : null}

      {resultado?.modo === 'fatura' ? (
        <section className="mt-6" aria-live="polite">
          <h2 className="font-titulo text-lg font-semibold tracking-tight">{resultado.itens.length} compras encontradas</h2>
          <p className="mt-0.5 text-sm text-apagado">Desmarque o que não quiser lançar. Dá para ajustar cada um depois.</p>

          <ul className="mt-3 divide-y divide-linha rounded-2xl bg-folha px-4">
            {resultado.itens.map((x, i) => (
              <li key={`${x.data}-${x.descricao}-${i}`}>
                <label className="flex items-center gap-3 py-3">
                  <input
                    type="checkbox"
                    checked={marcados.has(i)}
                    onChange={() => alternar(i)}
                    className="h-5 w-5 shrink-0 accent-[rgb(var(--garoupa))]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{x.descricao}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-sm text-apagado">
                      <Ponto cor={categoriaPorId.get(x.categoria_id)?.cor_hex} />
                      <span className="truncate">
                        {dataCurta(x.data)}, {categoriaPorId.get(x.categoria_id)?.nome || 'Sem categoria'}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums">{formatarBRL(x.valor)}</span>
                </label>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            <Campo rotulo="Lançar na conta">
              <select value={contaDaFatura} onChange={(e) => setContaId(e.target.value)} className={classeCampo}>
                {contas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Botao className="mt-4 w-full" onClick={salvarFatura} disabled={salvando || marcados.size === 0 || !contaDaFatura}>
            Salvar {marcados.size} {marcados.size === 1 ? 'lançamento' : 'lançamentos'} ({formatarBRL(totalMarcado)})
          </Botao>
        </section>
      ) : null}
    </div>
  );
}

function Achado({ rotulo, achou, reserva = 'preencha ao conferir', children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-apagado">{rotulo}</dt>
      <dd className="min-w-0 text-right">
        {achou ? children : null}
        {achou ? null : <span className="text-sm font-medium text-mico">Não encontrado, {reserva}</span>}
      </dd>
    </div>
  );
}
