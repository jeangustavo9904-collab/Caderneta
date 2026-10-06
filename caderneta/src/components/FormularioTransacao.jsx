import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { excluirParcelas, excluirRegistro, salvarLancamento } from '../lib/dados';
import { centavos, formatarBRL, hojeISO } from '../lib/formato';
import { Alternador, Botao, Campo, classeCampo, Folha, Interruptor, Ponto } from './ui';

const CHAVE_ULTIMA_CONTA = 'caderneta.ultima_conta';
const lembrar = (id) => {
  try {
    localStorage.setItem(CHAVE_ULTIMA_CONTA, id);
  } catch {
    /* sem armazenamento: só não lembramos a conta */
  }
};
const ultimaConta = () => {
  try {
    return localStorage.getItem(CHAVE_ULTIMA_CONTA);
  } catch {
    return null;
  }
};

/**
 * @param inicial  lançamento existente (tem id) para editar, ou valores sugeridos
 *                 (sem id, ex.: vindos do leitor de comprovantes), ou null para começar vazio
 * @param aoConcluir(mensagem)  chamado depois de salvar ou excluir
 */
export default function FormularioTransacao({ inicial, contas, categorias, aoFechar, aoConcluir }) {
  const editando = Boolean(inicial?.id);
  const contaInicial = () => {
    const candidata = inicial?.conta_id || ultimaConta();
    return contas.some((c) => c.id === candidata) ? candidata : contas[0]?.id || '';
  };

  const [tipo, setTipo] = useState(inicial?.tipo || 'Despesa');
  const [valorCentavos, setValorCentavos] = useState(centavos(inicial?.valor));
  const [descricao, setDescricao] = useState(inicial?.descricao || '');
  const [data, setData] = useState(inicial?.data || hojeISO());
  const [contaId, setContaId] = useState(contaInicial);
  const [categoriaId, setCategoriaId] = useState(inicial?.categoria_id || '');
  const [pago, setPago] = useState(inicial ? Boolean(inicial.pago) : true);
  const [cartao, setCartao] = useState(Boolean(inicial?.cartao_credito));
  const [parcelas, setParcelas] = useState(inicial?.parcelas || 1);
  const [erros, setErros] = useState({});
  const [salvando, setSalvando] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  const despesa = tipo === 'Despesa';
  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);
  const noCartao = despesa && cartao;
  const emGrupo = editando && Boolean(inicial.grupo_parcelas_id);

  function mudarTipo(novo) {
    setTipo(novo);
    if (!categorias.some((c) => c.id === categoriaId && c.tipo === novo)) setCategoriaId('');
  }

  function mudarCartao(ligado) {
    setCartao(ligado);
    if (!ligado) {
      setParcelas(1);
      return;
    }
    // Compra no cartão ainda não saiu da conta: fica "a pagar" até a fatura ser quitada.
    setPago(false);
    const contaCartao = contas.find((c) => c.tipo === 'Cartão');
    if (contaCartao) setContaId(contaCartao.id);
  }

  async function salvar(evento) {
    evento.preventDefault();
    const faltando = {};
    if (valorCentavos <= 0) faltando.valor = 'Digite um valor maior que zero.';
    if (!contaId) faltando.conta = 'Escolha uma conta. Você pode criar contas em Ajustes.';
    if (!categoriaId) faltando.categoria = 'Escolha uma categoria.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) faltando.data = 'Escolha a data.';
    setErros(faltando);
    if (Object.keys(faltando).length > 0) return;

    setSalvando(true);
    try {
      const categoria = categorias.find((c) => c.id === categoriaId);
      const salvos = await salvarLancamento({
        ...(editando ? inicial : {}),
        tipo,
        valor: valorCentavos / 100,
        descricao: descricao.trim() || categoria?.nome || '',
        data,
        conta_id: contaId,
        categoria_id: categoriaId,
        pago,
        cartao_credito: noCartao,
        parcelas: editando ? inicial.parcelas || 1 : noCartao ? parcelas : 1,
      });
      lembrar(contaId);
      aoConcluir(salvos.length > 1 ? `${salvos.length} parcelas lançadas` : editando ? 'Lançamento atualizado' : 'Lançamento salvo');
    } catch (erro) {
      console.error(erro);
      setErros({ geral: 'Não foi possível salvar. Tente de novo.' });
      setSalvando(false);
    }
  }

  async function excluir(todasAsParcelas) {
    if (todasAsParcelas) {
      const quantas = await excluirParcelas(inicial.grupo_parcelas_id);
      aoConcluir(`${quantas} parcelas excluídas`);
    } else {
      await excluirRegistro('transacoes', inicial.id);
      aoConcluir('Lançamento excluído');
    }
  }

  return (
    <Folha titulo={editando ? 'Editar lançamento' : 'Novo lançamento'} aoFechar={aoFechar}>
      <form onSubmit={salvar} noValidate className="space-y-4">
        <Alternador
          rotulo="Tipo de lançamento"
          valor={tipo}
          aoMudar={mudarTipo}
          opcoes={[
            { valor: 'Despesa', rotulo: 'Despesa', classe: 'text-saida' },
            { valor: 'Receita', rotulo: 'Receita', classe: 'text-entrada' },
          ]}
        />

        <div className="rounded-2xl bg-folha px-4 py-5 text-center">
          <label htmlFor="valor" className="block text-sm font-medium text-apagado">
            {noCartao && !editando && parcelas > 1 ? 'Valor total da compra' : 'Valor'}
          </label>
          <input
            id="valor"
            inputMode="numeric"
            autoComplete="off"
            autoFocus={!editando && valorCentavos === 0}
            value={formatarBRL(valorCentavos / 100)}
            onChange={(e) => setValorCentavos(Number(e.target.value.replace(/\D/g, '').slice(0, 11)))}
            className={`mt-1 w-full bg-transparent text-center font-titulo text-4xl font-semibold tracking-tight tabular-nums focus:outline-none ${
              despesa ? 'text-saida' : 'text-entrada'
            }`}
          />
          {erros.valor ? <p className="mt-1.5 text-sm text-saida">{erros.valor}</p> : null}
        </div>

        <Campo rotulo="Descrição">
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            maxLength={80}
            placeholder={despesa ? 'Ex.: compras da semana' : 'Ex.: salário de outubro'}
            className={classeCampo}
          />
        </Campo>

        <div>
          <span className="mb-1.5 block text-sm font-medium text-apagado">Categoria</span>
          <div role="radiogroup" aria-label="Categoria" className="flex flex-wrap gap-2">
            {categoriasDoTipo.map((c) => {
              const ativa = c.id === categoriaId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={ativa}
                  onClick={() => setCategoriaId(c.id)}
                  className={`inline-flex min-h-[2.5rem] items-center gap-2 rounded-full border px-3.5 text-[0.95rem] ${
                    ativa ? 'border-tinta bg-tinta font-semibold text-papel' : 'border-linha bg-folha'
                  }`}
                >
                  <Ponto cor={c.cor_hex} />
                  {c.nome}
                </button>
              );
            })}
          </div>
          {erros.categoria ? <p className="mt-1.5 text-sm text-saida">{erros.categoria}</p> : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Campo rotulo="Data" erro={erros.data}>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className={classeCampo} />
          </Campo>
          <Campo rotulo="Conta" erro={erros.conta}>
            <select value={contaId} onChange={(e) => setContaId(e.target.value)} className={classeCampo}>
              {contas.length === 0 ? <option value="">Nenhuma conta</option> : null}
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="divide-y divide-linha rounded-2xl bg-folha px-4">
          <Interruptor
            marcado={pago}
            aoMudar={setPago}
            rotulo={despesa ? 'Já foi pago' : 'Já recebi'}
            descricao={pago ? 'Entra no saldo consolidado' : 'Fica na projeção até ser confirmado'}
          />
          {despesa ? <Interruptor marcado={cartao} aoMudar={mudarCartao} rotulo="Compra no cartão de crédito" /> : null}
          {noCartao && !editando ? (
            <label className="flex items-center justify-between gap-4 py-3">
              <span>
                <span className="block font-medium">Parcelas</span>
                <span className="block text-sm text-apagado">
                  {parcelas > 1
                    ? `${parcelas}x de ${formatarBRL(Math.floor(valorCentavos / parcelas) / 100)}, uma por mês`
                    : 'À vista, na próxima fatura'}
                </span>
              </span>
              <select
                value={parcelas}
                onChange={(e) => setParcelas(Number(e.target.value))}
                className="rounded-xl border border-linha bg-papel px-3 py-2 text-base"
              >
                {Array.from({ length: 24 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {emGrupo ? (
            <p className="py-3 text-sm text-apagado">
              Parcela {inicial.parcela_numero} de {inicial.parcelas}. As alterações valem só para esta parcela.
            </p>
          ) : null}
        </div>

        {erros.geral ? <p className="text-sm text-saida">{erros.geral}</p> : null}

        <Botao type="submit" disabled={salvando} className="w-full">
          {editando ? 'Salvar alterações' : 'Salvar lançamento'}
        </Botao>

        {editando && !confirmandoExclusao ? (
          <Botao variante="perigo" className="w-full" onClick={() => setConfirmandoExclusao(true)}>
            <Trash2 size={18} /> Excluir lançamento
          </Botao>
        ) : null}

        {confirmandoExclusao ? (
          <div className="space-y-2 rounded-2xl border border-saida/40 p-3">
            <p className="px-1 text-sm">
              {emGrupo ? 'Excluir só esta parcela ou a compra inteira?' : 'Excluir este lançamento? Ele também sai dos outros aparelhos na próxima sincronização.'}
            </p>
            <Botao variante="perigo" className="w-full" onClick={() => excluir(false)}>
              {emGrupo ? 'Excluir só esta parcela' : 'Excluir lançamento'}
            </Botao>
            {emGrupo ? (
              <Botao variante="perigo" className="w-full" onClick={() => excluir(true)}>
                Excluir as {inicial.parcelas} parcelas
              </Botao>
            ) : null}
            <Botao variante="neutro" className="w-full" onClick={() => setConfirmandoExclusao(false)}>
              Manter
            </Botao>
          </div>
        ) : null}
      </form>
    </Folha>
  );
}
