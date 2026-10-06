import { useRef, useState } from 'react';
import { Download, FileUp, Share2 } from 'lucide-react';
import { compartilharBackupJSON, ErroDeBackup, exportarBackupJSON, importarECombinarJSON, ultimoBackup } from '../lib/backup';
import { dataHora } from '../lib/formato';
import { Botao } from './ui';

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export default function Backup({ dados, avisar }) {
  const seletor = useRef(null);
  const [ocupado, setOcupado] = useState(false);
  const [enviado, setEnviado] = useState(null); // resultado da última exportação
  const [pendente, setPendente] = useState(null); // { arquivo, previa } aguardando confirmação
  const [combinado, setCombinado] = useState(null); // resumo da última importação
  const [erro, setErro] = useState('');
  const [ultimo, setUltimo] = useState(ultimoBackup);

  async function exportar(funcao) {
    setOcupado(true);
    setErro('');
    try {
      const resultado = await funcao();
      if (!resultado.cancelado) {
        setEnviado(resultado);
        setUltimo(ultimoBackup());
      }
    } catch (e) {
      console.error(e);
      setErro('Não foi possível gerar o arquivo. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  // 1º passo da importação: lê o arquivo e mostra o que vai mudar, sem gravar nada.
  async function escolherArquivo(evento) {
    const arquivo = evento.target.files?.[0];
    evento.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setErro('');
    setCombinado(null);
    setPendente(null);
    try {
      const previa = await importarECombinarJSON(arquivo, { simular: true });
      setPendente({ arquivo, previa });
    } catch (e) {
      console.error(e);
      setErro(e instanceof ErroDeBackup ? e.message : 'Não foi possível ler o arquivo.');
    }
  }

  // 2º passo: grava de verdade.
  async function confirmar() {
    setOcupado(true);
    try {
      const resumo = await importarECombinarJSON(pendente.arquivo);
      setCombinado(resumo);
      setPendente(null);
      avisar('Dados combinados');
    } catch (e) {
      console.error(e);
      setErro(e instanceof ErroDeBackup ? e.message : 'Não foi possível combinar os dados. Nada foi alterado.');
    } finally {
      setOcupado(false);
    }
  }

  const previa = pendente?.previa;
  const semNovidade = previa && previa.novos + previa.atualizados + previa.removidos === 0;

  return (
    <div className="space-y-4">
      <p className="text-apagado">
        Não existe nuvem: para levar os dados a outro celular, envie o arquivo de backup e importe do outro lado. Importar
        nunca duplica nem apaga por engano. Em caso de conflito, vale a alteração mais recente.
      </p>

      <section className="rounded-3xl bg-folha p-5">
        <h2 className="font-titulo text-lg font-semibold tracking-tight">Enviar dados deste aparelho</h2>
        <p className="mt-1 text-sm text-apagado">
          {plural(dados.transacoes.length, 'lançamento', 'lançamentos')}, {plural(dados.contas.length, 'conta', 'contas')},{' '}
          {plural(dados.categorias.length, 'categoria', 'categorias')} e {plural(dados.orcamentos.length, 'limite', 'limites')} de
          orçamento.
        </p>
        <div className="mt-4 grid gap-2">
          <Botao onClick={() => exportar(compartilharBackupJSON)} disabled={ocupado}>
            <Share2 size={18} /> Enviar pelo WhatsApp
          </Botao>
          <Botao variante="neutro" onClick={() => exportar(exportarBackupJSON)} disabled={ocupado}>
            <Download size={18} /> Baixar arquivo .json
          </Botao>
        </div>

        {enviado ? (
          <p className="mt-3 text-sm" role="status">
            {enviado.compartilhado
              ? `Arquivo ${enviado.nomeArquivo} enviado para compartilhamento.`
              : `Arquivo ${enviado.nomeArquivo} salvo em Downloads. No WhatsApp, toque em anexar, escolha Documento e selecione esse arquivo.`}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-apagado">
          {ultimo ? `Último backup gerado em ${dataHora(ultimo)}.` : 'Nenhum backup gerado neste aparelho ainda.'}
        </p>
      </section>

      <section className="rounded-3xl bg-folha p-5">
        <h2 className="font-titulo text-lg font-semibold tracking-tight">Receber dados de outro aparelho</h2>
        <p className="mt-1 text-sm text-apagado">
          Baixe o arquivo .json recebido no WhatsApp e escolha-o aqui. Você vê o que vai mudar antes de confirmar.
        </p>
        <input ref={seletor} type="file" accept=".json,application/json" onChange={escolherArquivo} className="hidden" />
        <Botao variante="neutro" className="mt-4 w-full" onClick={() => seletor.current?.click()} disabled={ocupado}>
          <FileUp size={18} /> Escolher arquivo de backup
        </Botao>

        {previa ? (
          <div className="mt-4 rounded-2xl border border-linha p-4" role="status">
            <p className="font-medium">{pendente.arquivo.name}</p>
            {previa.exportado_em ? <p className="text-sm text-apagado">Gerado em {dataHora(previa.exportado_em)}</p> : null}
            <Resumo resumo={previa} futuro />
            {semNovidade ? (
              <Botao variante="neutro" className="mt-3 w-full" onClick={() => setPendente(null)}>
                Fechar
              </Botao>
            ) : (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Botao variante="neutro" onClick={() => setPendente(null)} disabled={ocupado}>
                  Cancelar
                </Botao>
                <Botao onClick={confirmar} disabled={ocupado}>
                  Combinar dados
                </Botao>
              </div>
            )}
          </div>
        ) : null}

        {combinado ? (
          <div className="mt-4 rounded-2xl border border-entrada/40 p-4" role="status">
            <p className="font-medium text-entrada">Dados combinados</p>
            <Resumo resumo={combinado} />
          </div>
        ) : null}
      </section>

      {erro ? (
        <p className="rounded-2xl border border-saida/40 p-4 text-saida" role="alert">
          {erro}
        </p>
      ) : null}

      <p className="px-1 text-sm text-apagado">
        O arquivo de backup não é criptografado: quem abrir consegue ler seus lançamentos. Envie só para você ou para quem
        divide as contas com você.
      </p>
    </div>
  );
}

function Resumo({ resumo, futuro = false }) {
  const { novos, atualizados, removidos, mantidos, invalidos } = resumo;
  if (novos + atualizados + removidos === 0) {
    return <p className="mt-2 text-sm">Este aparelho já tem tudo o que está no arquivo. Nada {futuro ? 'vai mudar' : 'mudou'}.</p>;
  }
  const linhas = [
    [novos, futuro ? 'registros novos serão adicionados' : 'registros novos adicionados'],
    [atualizados, futuro ? 'serão atualizados (versão mais recente no arquivo)' : 'atualizados para a versão mais recente'],
    [removidos, futuro ? 'serão removidos (foram excluídos no outro aparelho)' : 'removidos (excluídos no outro aparelho)'],
    [mantidos, futuro ? 'ficam como estão (iguais ou mais recentes aqui)' : 'mantidos como estavam'],
    [invalidos, 'ignorados por estarem incompletos'],
  ];
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {linhas
        .filter(([quantos]) => quantos > 0)
        .map(([quantos, texto]) => (
          <li key={texto} className="flex gap-2">
            <span className="w-10 shrink-0 text-right font-semibold tabular-nums">{quantos}</span>
            <span>{texto}</span>
          </li>
        ))}
    </ul>
  );
}
