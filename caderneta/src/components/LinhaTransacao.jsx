import { Check } from 'lucide-react';
import { formatarBRL } from '../lib/formato';
import { Ponto } from './ui';

/** Uma linha de lançamento: toque no círculo marca como pago, toque no restante abre a edição. */
export default function LinhaTransacao({ transacao: t, categoria, conta, aoEditar, aoAlternarPago, mostrarData }) {
  const receita = t.tipo === 'Receita';
  const acao = receita ? 'recebido' : 'pago';
  const detalhes = [categoria?.nome || 'Sem categoria', conta?.nome].filter(Boolean).join(', ');
  const parcela = t.parcelas > 1 && t.parcela_numero ? `${t.parcela_numero}/${t.parcelas}` : null;

  return (
    <li className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => aoAlternarPago(t)}
        aria-pressed={Boolean(t.pago)}
        aria-label={t.pago ? `Marcar como não ${acao}` : `Marcar como ${acao}`}
        className="-ml-2 grid h-11 w-11 shrink-0 place-items-center"
      >
        <span
          className={`grid h-6 w-6 place-items-center rounded-full border-2 ${
            t.pago ? 'border-garoupa bg-garoupa text-sobre-garoupa' : 'border-mico text-transparent'
          }`}
        >
          <Check size={14} strokeWidth={3} />
        </span>
      </button>

      <button type="button" onClick={() => aoEditar(t)} className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{t.descricao || categoria?.nome || 'Lançamento'}</span>
          <span className="mt-0.5 flex items-center gap-1.5 text-sm text-apagado">
            <Ponto cor={categoria?.cor_hex} />
            <span className="truncate">
              {mostrarData ? `${mostrarData}, ` : ''}
              {detalhes}
              {parcela ? `, parcela ${parcela}` : ''}
            </span>
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className={`block font-semibold tabular-nums ${receita ? 'text-entrada' : 'text-tinta'}`}>
            {receita ? '+ ' : '− '}
            {formatarBRL(t.valor)}
          </span>
          {t.pago ? null : <span className="block text-xs font-medium text-mico">{receita ? 'a receber' : 'a pagar'}</span>}
        </span>
      </button>
    </li>
  );
}
