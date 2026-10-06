import { ArrowLeft, ChevronRight, CreditCard, RefreshCw, Smartphone, Tags, Target } from 'lucide-react';
import { instalar, useInstalacao } from '../lib/instalacao';
import Backup from './Backup';
import { Categorias, Contas, Orcamentos } from './Cadastros';
import { Botao } from './ui';

const SECOES = [
  { id: 'backup', titulo: 'Backup e sincronização', descricao: 'Enviar ou receber dados de outro celular', Icone: RefreshCw },
  { id: 'contas', titulo: 'Contas', descricao: 'Bancos, cartões e dinheiro', Icone: CreditCard },
  { id: 'categorias', titulo: 'Categorias', descricao: 'Nomes e cores', Icone: Tags },
  { id: 'orcamentos', titulo: 'Orçamentos', descricao: 'Limite de gasto por categoria', Icone: Target },
];

export default function Ajustes({ dados, secao, aoMudarSecao, mes, aoMudarMes, avisar }) {
  const instalacao = useInstalacao();
  const atual = SECOES.find((s) => s.id === secao);

  if (atual) {
    return (
      <div>
        <button type="button" onClick={() => aoMudarSecao(null)} className="-ml-1 mb-2 inline-flex items-center gap-1.5 py-2 text-sm font-semibold text-garoupa">
          <ArrowLeft size={18} /> Ajustes
        </button>
        <h1 className="mb-4 font-titulo text-2xl font-semibold tracking-tight">{atual.titulo}</h1>
        {secao === 'backup' ? <Backup dados={dados} avisar={avisar} /> : null}
        {secao === 'contas' ? <Contas dados={dados} avisar={avisar} /> : null}
        {secao === 'categorias' ? <Categorias dados={dados} avisar={avisar} /> : null}
        {secao === 'orcamentos' ? <Orcamentos dados={dados} mes={mes} aoMudarMes={aoMudarMes} avisar={avisar} /> : null}
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-titulo text-2xl font-semibold tracking-tight">Ajustes</h1>

      <ul className="mt-4 divide-y divide-linha rounded-2xl bg-folha px-4">
        {SECOES.map(({ id, titulo, descricao, Icone }) => (
          <li key={id}>
            <button type="button" onClick={() => aoMudarSecao(id)} className="flex w-full items-center gap-3 py-3.5 text-left">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-papel text-apagado">
                <Icone size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{titulo}</span>
                <span className="block text-sm text-apagado">{descricao}</span>
              </span>
              <ChevronRight size={20} className="shrink-0 text-apagado" />
            </button>
          </li>
        ))}
      </ul>

      {instalacao === 'disponivel' || instalacao === 'ios' ? (
        <section className="mt-4 rounded-2xl bg-folha p-4">
          <h2 className="flex items-center gap-2 font-medium">
            <Smartphone size={20} className="text-apagado" /> Instalar na tela inicial
          </h2>
          {instalacao === 'disponivel' ? (
            <>
              <p className="mt-1 text-sm text-apagado">Abre em tela cheia, como um app, e funciona sem internet.</p>
              <Botao className="mt-3 w-full" onClick={instalar}>
                Instalar a Caderneta
              </Botao>
            </>
          ) : (
            <p className="mt-1 text-sm text-apagado">
              No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". No iPhone isso também evita que o
              sistema apague os dados de sites pouco usados.
            </p>
          )}
        </section>
      ) : null}

      <p className="mt-5 px-1 text-sm text-apagado">
        Seus dados ficam guardados só neste aparelho e o app não se conecta a nenhum servidor. Se o aparelho for perdido ou
        os dados do navegador forem apagados, só um backup traz tudo de volta: gere um de vez em quando.
      </p>
    </div>
  );
}
