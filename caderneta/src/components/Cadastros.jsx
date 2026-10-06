import { useState } from 'react';
import { Banknote, CreditCard, Landmark, PiggyBank, Plus } from 'lucide-react';
import { CORES, TIPOS_DE_CONTA } from '../db';
import { gastoPorCategoria, saldoDaConta } from '../lib/calculos';
import { contarUso, definirOrcamento, excluirRegistro, salvarRegistro } from '../lib/dados';
import { apenasMes, corSegura, deslocarMes, formatarBRL, lerValor } from '../lib/formato';
import { Alternador, Botao, Campo, classeCampo, Folha, Ponto, SeletorDeMes } from './ui';

const ICONE_DA_CONTA = { Corrente: Landmark, Poupança: PiggyBank, Cartão: CreditCard, Dinheiro: Banknote };
const paraCampo = (valor) => (valor ? String(valor).replace('.', ',') : '');

/* ------------------------------ Contas ------------------------------ */

export function Contas({ dados, avisar }) {
  const [editando, setEditando] = useState(null);
  return (
    <div>
      <ul className="divide-y divide-linha rounded-2xl bg-folha px-4">
        {dados.contas.map((conta) => {
          const Icone = ICONE_DA_CONTA[conta.tipo] || Landmark;
          const saldo = saldoDaConta(conta, dados.transacoes);
          return (
            <li key={conta.id}>
              <button type="button" onClick={() => setEditando(conta)} className="flex w-full items-center gap-3 py-3.5 text-left">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-papel text-apagado">
                  <Icone size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{conta.nome}</span>
                  <span className="block text-sm text-apagado">{conta.tipo}</span>
                </span>
                <span className={`shrink-0 font-semibold tabular-nums ${saldo < 0 ? 'text-saida' : ''}`}>{formatarBRL(saldo)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {dados.contas.length === 0 ? <p className="py-4 text-apagado">Nenhuma conta. Crie uma para começar a lançar.</p> : null}
      <Botao variante="neutro" className="mt-4 w-full" onClick={() => setEditando({})}>
        <Plus size={18} /> Nova conta
      </Botao>
      {editando ? <FormularioConta conta={editando} aoFechar={() => setEditando(null)} avisar={avisar} /> : null}
    </div>
  );
}

function FormularioConta({ conta, aoFechar, avisar }) {
  const nova = !conta.id;
  const [nome, setNome] = useState(conta.nome || '');
  const [tipo, setTipo] = useState(conta.tipo || 'Corrente');
  const [saldo, setSaldo] = useState(paraCampo(conta.saldo_inicial));
  const [erro, setErro] = useState('');

  async function salvar(evento) {
    evento.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome para a conta.');
    await salvarRegistro('contas_bancarias', { ...conta, nome: nome.trim(), tipo, saldo_inicial: lerValor(saldo) });
    avisar(nova ? 'Conta criada' : 'Conta atualizada');
    aoFechar();
  }

  async function excluir() {
    const uso = await contarUso('conta_id', conta.id);
    if (uso > 0) {
      return setErro(`Esta conta tem ${uso} ${uso === 1 ? 'lançamento' : 'lançamentos'}. Mova ou exclua esses lançamentos antes.`);
    }
    await excluirRegistro('contas_bancarias', conta.id);
    avisar('Conta excluída');
    aoFechar();
  }

  return (
    <Folha titulo={nova ? 'Nova conta' : 'Editar conta'} aoFechar={aoFechar}>
      <form onSubmit={salvar} noValidate className="space-y-4">
        <Campo rotulo="Nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} placeholder="Ex.: Nubank" className={classeCampo} />
        </Campo>
        <Campo rotulo="Tipo">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={classeCampo}>
            {TIPOS_DE_CONTA.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Saldo inicial (R$)">
          <input
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            inputMode="decimal"
            placeholder="0,00"
            className={`${classeCampo} tabular-nums`}
          />
          <span className="mt-1.5 block text-sm text-apagado">
            Quanto havia na conta antes do primeiro lançamento. Use valor negativo para dívida.
          </span>
        </Campo>
        {erro ? <p className="text-sm text-saida">{erro}</p> : null}
        <Botao type="submit" className="w-full">
          {nova ? 'Criar conta' : 'Salvar alterações'}
        </Botao>
        {nova ? null : (
          <Botao variante="perigo" className="w-full" onClick={excluir}>
            Excluir conta
          </Botao>
        )}
      </form>
    </Folha>
  );
}

/* ---------------------------- Categorias ---------------------------- */

export function Categorias({ dados, avisar }) {
  const [editando, setEditando] = useState(null);
  return (
    <div className="space-y-5">
      {[
        ['Despesa', 'Despesas'],
        ['Receita', 'Receitas'],
      ].map(([tipo, titulo]) => (
        <section key={tipo}>
          <h2 className="mb-1.5 px-1 text-sm font-semibold text-apagado">{titulo}</h2>
          <ul className="divide-y divide-linha rounded-2xl bg-folha px-4">
            {dados.categorias
              .filter((c) => c.tipo === tipo)
              .map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => setEditando(c)} className="flex w-full items-center gap-3 py-3.5 text-left">
                    <Ponto cor={c.cor_hex} className="!h-3.5 !w-3.5" />
                    <span className="font-medium">{c.nome}</span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
      <Botao variante="neutro" className="w-full" onClick={() => setEditando({})}>
        <Plus size={18} /> Nova categoria
      </Botao>
      {editando ? <FormularioCategoria categoria={editando} aoFechar={() => setEditando(null)} avisar={avisar} /> : null}
    </div>
  );
}

function FormularioCategoria({ categoria, aoFechar, avisar }) {
  const nova = !categoria.id;
  const [nome, setNome] = useState(categoria.nome || '');
  const [tipo, setTipo] = useState(categoria.tipo || 'Despesa');
  const [cor, setCor] = useState(corSegura(categoria.cor_hex || CORES[0]));
  const [erro, setErro] = useState('');

  async function salvar(evento) {
    evento.preventDefault();
    if (!nome.trim()) return setErro('Dê um nome para a categoria.');
    await salvarRegistro('categorias', { ...categoria, nome: nome.trim(), tipo, cor_hex: cor });
    avisar(nova ? 'Categoria criada' : 'Categoria atualizada');
    aoFechar();
  }

  async function excluir() {
    const uso = await contarUso('categoria_id', categoria.id);
    if (uso > 0) {
      return setErro(`Esta categoria tem ${uso} ${uso === 1 ? 'lançamento' : 'lançamentos'}. Troque a categoria deles antes de excluir.`);
    }
    await excluirRegistro('categorias', categoria.id);
    avisar('Categoria excluída');
    aoFechar();
  }

  return (
    <Folha titulo={nova ? 'Nova categoria' : 'Editar categoria'} aoFechar={aoFechar}>
      <form onSubmit={salvar} noValidate className="space-y-4">
        <Campo rotulo="Nome">
          <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={30} placeholder="Ex.: Academia" className={classeCampo} />
        </Campo>
        {nova ? (
          <Alternador
            rotulo="Tipo de categoria"
            valor={tipo}
            aoMudar={setTipo}
            opcoes={[
              { valor: 'Despesa', rotulo: 'Despesa', classe: 'text-saida' },
              { valor: 'Receita', rotulo: 'Receita', classe: 'text-entrada' },
            ]}
          />
        ) : null}
        <div>
          <span className="mb-1.5 block text-sm font-medium text-apagado">Cor</span>
          <div role="radiogroup" aria-label="Cor" className="flex flex-wrap gap-2">
            {CORES.map((opcao) => (
              <button
                key={opcao}
                type="button"
                role="radio"
                aria-checked={opcao === cor}
                aria-label={`Cor ${opcao}`}
                onClick={() => setCor(opcao)}
                className={`h-11 w-11 rounded-full border-4 ${opcao === cor ? 'border-tinta' : 'border-transparent'}`}
                style={{ backgroundColor: opcao }}
              />
            ))}
          </div>
        </div>
        {erro ? <p className="text-sm text-saida">{erro}</p> : null}
        <Botao type="submit" className="w-full">
          {nova ? 'Criar categoria' : 'Salvar alterações'}
        </Botao>
        {nova ? null : (
          <Botao variante="perigo" className="w-full" onClick={excluir}>
            Excluir categoria
          </Botao>
        )}
      </form>
    </Folha>
  );
}

/* ---------------------------- Orçamentos ---------------------------- */

export function Orcamentos({ dados, mes, aoMudarMes, avisar }) {
  const doMes = dados.orcamentos.filter((o) => o.mes_ano === mes);
  const mesAnterior = deslocarMes(mes, -1);
  const doMesAnterior = dados.orcamentos.filter((o) => o.mes_ano === mesAnterior);
  const gastos = gastoPorCategoria(dados.transacoes, mes);
  const despesas = dados.categorias.filter((c) => c.tipo === 'Despesa');

  async function copiar() {
    for (const o of doMesAnterior) await definirOrcamento(o.categoria_id, mes, o.valor_limite);
    avisar(`Limites de ${apenasMes(mesAnterior)} copiados`);
  }

  return (
    <div>
      <SeletorDeMes mes={mes} aoMudar={aoMudarMes} />
      <p className="mt-2 text-apagado">
        Digite quanto você quer gastar no máximo em cada categoria. Deixe em branco para não ter limite.
      </p>

      {doMes.length === 0 && doMesAnterior.length > 0 ? (
        <Botao variante="neutro" className="mt-4 w-full" onClick={copiar}>
          Copiar limites de {apenasMes(mesAnterior)}
        </Botao>
      ) : null}

      <ul className="mt-4 divide-y divide-linha rounded-2xl bg-folha px-4">
        {despesas.map((categoria) => {
          const limite = doMes.find((o) => o.categoria_id === categoria.id)?.valor_limite || 0;
          return (
            <LinhaDeLimite
              key={`${categoria.id}-${mes}-${limite}`}
              categoria={categoria}
              limite={limite}
              gasto={gastos.get(categoria.id) || 0}
              aoSalvar={(valor) => definirOrcamento(categoria.id, mes, valor)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function LinhaDeLimite({ categoria, limite, gasto, aoSalvar }) {
  const [texto, setTexto] = useState(paraCampo(limite));

  function gravar() {
    const valor = Math.max(0, lerValor(texto));
    if (valor !== limite) aoSalvar(valor);
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2 font-medium">
          <Ponto cor={categoria.cor_hex} />
          <span className="truncate">{categoria.nome}</span>
        </span>
        <span className="block text-sm text-apagado">Gasto no mês: {formatarBRL(gasto)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="text-sm text-apagado" aria-hidden="true">
          R$
        </span>
        <input
          aria-label={`Limite de ${categoria.nome} em reais`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={gravar}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          inputMode="decimal"
          placeholder="sem limite"
          className="w-28 rounded-xl border border-linha bg-papel px-3 py-2.5 text-right text-base tabular-nums focus:border-garoupa focus:outline-none focus:ring-2 focus:ring-garoupa/30"
        />
      </span>
    </li>
  );
}
