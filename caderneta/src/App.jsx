import { useCallback, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowLeftRight, Home, Plus, Receipt, Settings } from 'lucide-react';
import { db } from './db';
import { salvarRegistro } from './lib/dados';
import { mesAtual } from './lib/formato';
import { registrarServiceWorker } from './lib/registrarSW';
import Ajustes from './components/Ajustes';
import Comprovante from './components/Comprovante';
import FormularioTransacao from './components/FormularioTransacao';
import Lancamentos from './components/Lancamentos';
import Painel from './components/Painel';

const ABAS = [
  { id: 'inicio', rotulo: 'Início', Icone: Home },
  { id: 'lancamentos', rotulo: 'Lançamentos', Icone: ArrowLeftRight },
  { id: 'comprovante', rotulo: 'Comprovante', Icone: Receipt },
  { id: 'ajustes', rotulo: 'Ajustes', Icone: Settings },
];

const porNome = (a, b) => a.nome.localeCompare(b.nome, 'pt-BR');
const ativos = (lista) => lista.filter((registro) => !registro.excluido);

/** Lê o banco inteiro e se atualiza sozinho a cada gravação (useLiveQuery). */
function useDados() {
  return useLiveQuery(async () => {
    const [contas, categorias, transacoes, orcamentos] = await Promise.all([
      db.contas_bancarias.toArray(),
      db.categorias.toArray(),
      db.transacoes.toArray(),
      db.orcamentos.toArray(),
    ]);
    return {
      contas: ativos(contas).sort(porNome),
      categorias: ativos(categorias).sort(porNome),
      transacoes: ativos(transacoes),
      orcamentos: ativos(orcamentos),
    };
  }, []);
}

export default function App() {
  const dados = useDados();
  const [aba, setAba] = useState('inicio');
  const [secaoAjustes, setSecaoAjustes] = useState(null);
  const [mes, setMes] = useState(mesAtual);
  const [formulario, setFormulario] = useState(null); // null = fechado; { inicial } = aberto
  const [aviso, setAviso] = useState('');
  const [ativarAtualizacao, setAtivarAtualizacao] = useState(null);

  useEffect(() => {
    registrarServiceWorker((ativar) => setAtivarAtualizacao(() => ativar));
    // Atalho "Novo lançamento" do ícone do app (manifest.json > shortcuts).
    if (new URLSearchParams(window.location.search).get('acao') === 'novo') {
      setFormulario({ inicial: null });
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!aviso) return undefined;
    const relogio = setTimeout(() => setAviso(''), 3500);
    return () => clearTimeout(relogio);
  }, [aviso]);

  const fecharFormulario = useCallback(() => setFormulario(null), []);
  const abrirFormulario = (inicial = null) => setFormulario({ inicial });
  const alternarPago = (t) => salvarRegistro('transacoes', { ...t, pago: !t.pago });

  function irPara(novaAba, secao = null) {
    setAba(novaAba);
    setSecaoAjustes(secao);
    window.scrollTo(0, 0);
  }

  return (
    <div className="mx-auto min-h-dvh max-w-xl px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))]">
      <main>
        {!dados ? null : aba === 'inicio' ? (
          <Painel
            dados={dados}
            mes={mes}
            aoMudarMes={setMes}
            aoNovo={() => abrirFormulario()}
            aoEditar={abrirFormulario}
            aoAlternarPago={alternarPago}
            aoVerTodos={() => irPara('lancamentos')}
            aoDefinirLimites={() => irPara('ajustes', 'orcamentos')}
          />
        ) : aba === 'lancamentos' ? (
          <Lancamentos
            dados={dados}
            mes={mes}
            aoMudarMes={setMes}
            aoNovo={() => abrirFormulario()}
            aoEditar={abrirFormulario}
            aoAlternarPago={alternarPago}
          />
        ) : aba === 'comprovante' ? (
          <Comprovante dados={dados} aoRevisar={abrirFormulario} avisar={setAviso} />
        ) : (
          <Ajustes
            dados={dados}
            secao={secaoAjustes}
            aoMudarSecao={setSecaoAjustes}
            mes={mes}
            aoMudarMes={setMes}
            avisar={setAviso}
          />
        )}
      </main>

      {formulario && dados ? (
        <FormularioTransacao
          key={formulario.inicial?.id || 'novo'}
          inicial={formulario.inicial}
          contas={dados.contas}
          categorias={dados.categorias}
          aoFechar={fecharFormulario}
          aoConcluir={(mensagem) => {
            setFormulario(null);
            setAviso(mensagem);
          }}
        />
      ) : null}

      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 flex flex-col items-center gap-2 px-4">
        {ativarAtualizacao ? (
          <div className="pointer-events-auto flex items-center gap-3 rounded-2xl bg-tinta py-2 pl-4 pr-2 text-sm text-papel shadow-lg">
            Nova versão do app disponível
            <button type="button" onClick={ativarAtualizacao} className="rounded-xl bg-papel/15 px-3 py-2 font-semibold">
              Atualizar
            </button>
          </div>
        ) : null}
        {aviso ? (
          <div role="status" className="pointer-events-auto animate-subir rounded-2xl bg-tinta px-4 py-3 text-sm font-medium text-papel shadow-lg">
            {aviso}
          </div>
        ) : null}
      </div>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-linha bg-folha pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {ABAS.slice(0, 2).map((item) => (
            <BotaoDeAba key={item.id} item={item} ativa={aba === item.id} aoTocar={() => irPara(item.id)} />
          ))}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => abrirFormulario()}
              aria-label="Novo lançamento"
              className="-mt-6 mb-2 grid h-14 w-14 place-items-center rounded-full bg-garoupa text-sobre-garoupa shadow-lg ring-4 ring-papel active:brightness-95"
            >
              <Plus size={28} />
            </button>
          </div>
          {ABAS.slice(2).map((item) => (
            <BotaoDeAba key={item.id} item={item} ativa={aba === item.id} aoTocar={() => irPara(item.id)} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function BotaoDeAba({ item, ativa, aoTocar }) {
  const { Icone, rotulo } = item;
  return (
    <button
      type="button"
      onClick={aoTocar}
      aria-current={ativa ? 'page' : undefined}
      className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1 text-[0.7rem] font-medium ${
        ativa ? 'text-garoupa' : 'text-apagado'
      }`}
    >
      <Icone size={22} strokeWidth={ativa ? 2.4 : 2} />
      {rotulo}
    </button>
  );
}
