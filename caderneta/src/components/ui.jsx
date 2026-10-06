import { useEffect } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { corSegura, deslocarMes, mesAtual, nomeDoMes } from '../lib/formato';

export const classeCampo =
  'w-full rounded-xl border border-linha bg-folha px-3.5 py-3 text-base text-tinta placeholder:text-apagado/70 focus:border-garoupa focus:outline-none focus:ring-2 focus:ring-garoupa/30';

const VARIANTES = {
  primario: 'bg-garoupa text-sobre-garoupa active:brightness-95',
  neutro: 'border border-linha bg-folha text-tinta active:bg-linha/50',
  perigo: 'bg-saida/10 text-saida active:bg-saida/20',
  texto: 'text-garoupa active:bg-garoupa/10',
};

export function Botao({ variante = 'primario', className = '', children, ...resto }) {
  return (
    <button
      type="button"
      {...resto}
      className={`inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl px-4 text-[0.95rem] font-semibold transition-colors disabled:opacity-50 ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Campo({ rotulo, erro, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-apagado">{rotulo}</span>
      {children}
      {erro ? <span className="mt-1.5 block text-sm text-saida">{erro}</span> : null}
    </label>
  );
}

export function Interruptor({ marcado, aoMudar, rotulo, descricao }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={marcado}
      onClick={() => aoMudar(!marcado)}
      className="flex w-full items-center justify-between gap-4 py-3 text-left"
    >
      <span>
        <span className="block font-medium">{rotulo}</span>
        {descricao ? <span className="block text-sm text-apagado">{descricao}</span> : null}
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${marcado ? 'bg-garoupa' : 'bg-linha'}`}
        aria-hidden="true"
      >
        <span
          className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${marcado ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
  );
}

/** Dois botões lado a lado, um selecionado. */
export function Alternador({ opcoes, valor, aoMudar, rotulo }) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="grid grid-cols-2 gap-1 rounded-2xl bg-linha/60 p-1">
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => aoMudar(opcao.valor)}
            className={`min-h-[2.75rem] rounded-xl text-[0.95rem] font-semibold transition-colors ${
              ativo ? `bg-folha shadow-sm ${opcao.classe || 'text-tinta'}` : 'text-apagado'
            }`}
          >
            {opcao.rotulo}
          </button>
        );
      })}
    </div>
  );
}

export function Ponto({ cor, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${className}`}
      style={{ backgroundColor: corSegura(cor) }}
    />
  );
}

export function SeletorDeMes({ mes, aoMudar }) {
  const foraDoAtual = mes !== mesAtual();
  const classeSeta = 'grid h-11 w-11 place-items-center rounded-full text-apagado active:bg-linha/60';
  return (
    <div className="flex items-center justify-between">
      <button type="button" onClick={() => aoMudar(deslocarMes(mes, -1))} aria-label="Mês anterior" className={classeSeta}>
        <ChevronLeft size={22} />
      </button>
      <div className="text-center">
        <h1 className="font-titulo text-xl font-semibold tracking-tight">{nomeDoMes(mes)}</h1>
        {foraDoAtual ? (
          <button type="button" onClick={() => aoMudar(mesAtual())} className="text-sm font-medium text-garoupa">
            Voltar para o mês atual
          </button>
        ) : null}
      </div>
      <button type="button" onClick={() => aoMudar(deslocarMes(mes, 1))} aria-label="Próximo mês" className={classeSeta}>
        <ChevronRight size={22} />
      </button>
    </div>
  );
}

/** Painel que sobe da base da tela (formulários e edições). */
export function Folha({ titulo, aoFechar, children }) {
  useEffect(() => {
    const aoTeclar = (evento) => {
      if (evento.key === 'Escape') aoFechar();
    };
    document.addEventListener('keydown', aoTeclar);
    const rolagemAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = rolagemAnterior;
    };
  }, [aoFechar]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" aria-label="Fechar" onClick={aoFechar} className="absolute inset-0 cursor-default bg-black/50" />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg animate-subir flex-col rounded-t-3xl bg-papel shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="font-titulo text-lg font-semibold tracking-tight">{titulo}</h2>
          <button
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-full text-apagado active:bg-linha/60"
          >
            <X size={22} />
          </button>
        </header>
        <div className="overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

export function Secao({ titulo, acao, children }) {
  return (
    <section className="mt-7">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-titulo text-lg font-semibold tracking-tight">{titulo}</h2>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function LinkDeAcao({ children, ...resto }) {
  return (
    <button type="button" {...resto} className="-my-2 py-2 text-sm font-semibold text-garoupa">
      {children}
    </button>
  );
}
