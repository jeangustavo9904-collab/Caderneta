# Caderneta

Gestão financeira pessoal que funciona sem internet. Os dados ficam no IndexedDB do próprio aparelho, não existe servidor, conta, mensalidade nem API externa. Para levar os dados a outro celular, você exporta um arquivo `.json`, envia pelo WhatsApp e importa do outro lado.

React + Tailwind CSS + Lucide, banco local com Dexie.js, PWA com `manifest.json` e Service Worker próprio.

## Rodar no computador

Você precisa do Node.js 18 ou mais novo.

```bash
npm install        # baixa as dependências (única etapa que usa internet)
npm run dev        # desenvolvimento, em http://localhost:5173
```

Para testar como PWA de verdade (offline, instalável), gere o build e sirva a pasta final:

```bash
npm run build      # gera a pasta dist/ e preenche o sw.js com a lista de arquivos
npm run preview    # serve dist/ em http://localhost:4173
```

Abra `http://localhost:4173`, espere carregar, desligue a rede e recarregue: o app continua abrindo. O Service Worker só é registrado no build (em `npm run dev` ele fica desligado para não atrapalhar o desenvolvimento).

## Instalar no celular

O navegador só permite instalar um PWA e usar Service Worker em **HTTPS ou em `localhost`**. Abrir pelo IP da rede (`http://192.168.x.x:4173`) mostra o app, mas não instala nem funciona offline. Há dois caminhos:

**1. Android, sem hospedar nada (cabo USB)**

1. No celular, ative a depuração USB e conecte ao computador.
2. No computador, deixe `npm run preview` rodando.
3. No Chrome do computador, abra `chrome://inspect/#devices`, clique em *Port forwarding* e adicione `4173` para `localhost:4173`. (Com o adb instalado, `adb reverse tcp:4173 tcp:4173` faz o mesmo.)
4. No Chrome do celular, abra `http://localhost:4173` e toque em *Instalar app* (ou em Ajustes, dentro da Caderneta, "Instalar a Caderneta").

Depois de instalado, pode desconectar o cabo e desligar o computador: o app inteiro está no cache do celular. Só é preciso reconectar para instalar uma versão nova.

**2. Android ou iPhone, com hospedagem estática gratuita**

Envie o conteúdo de `dist/` para qualquer hospedagem de arquivos estáticos com HTTPS (GitHub Pages, Cloudflare Pages, Netlify). A hospedagem entrega apenas os arquivos do app, uma vez; seus lançamentos nunca passam por ela. O build usa caminhos relativos, então funciona em subpasta sem configurar nada. No iPhone, abra no Safari, toque em Compartilhar e em "Adicionar à Tela de Início".

**3. Sem instalar nada no computador (GitHub Pages)**

O projeto traz `.github/workflows/publicar.yml`, que compila e publica o app nos servidores do GitHub:

1. Crie uma conta em github.com e um repositório **público** (o plano gratuito só publica páginas de repositórios públicos; o que fica público é o código, nunca os seus lançamentos).
2. Na página do repositório, use "uploading an existing file" e arraste todo o conteúdo da pasta `caderneta`, incluindo a pasta `.github`. Confirme em "Commit changes".
3. Em Settings > Pages, em "Source", escolha **GitHub Actions**.
4. Na aba Actions, abra "Publicar no GitHub Pages" e clique em "Run workflow" (ou em "Re-run jobs", se a primeira execução tiver falhado).
5. Quando ficar verde, o endereço aparece em Settings > Pages, no formato `https://seu-usuario.github.io/nome-do-repositorio/`. Abra no celular e instale.

> Os dados pertencem ao endereço por onde o app foi aberto. Se um dia você mudar de endereço (por exemplo, de `localhost:4173` para um domínio), gere um backup antes e importe no endereço novo.

## Sincronizar dois celulares

1. No celular A: Ajustes > Backup e sincronização > **Enviar pelo WhatsApp** (ou "Baixar arquivo .json" e anexar como Documento).
2. No celular B: baixe o arquivo, abra Ajustes > Backup e sincronização > **Escolher arquivo de backup**. O app mostra o que vai mudar; confirme em **Combinar dados**.
3. Para o caminho de volta, repita de B para A.

Regras da fusão (`importarECombinarJSON` em `src/lib/backup.js`):

- registro cujo `id` (UUID) não existe no aparelho: é inserido;
- `id` já existe: vence quem tem o `atualizado_em` mais recente;
- excluir um registro marca `excluido: true` em vez de apagá-lo, e essa marca viaja no backup. Sem isso, um lançamento apagado no celular A voltaria a aparecer assim que A importasse o backup de B;
- tudo roda em uma única transação: se o arquivo estiver corrompido, nada é alterado;
- importar o mesmo arquivo duas vezes não muda nada.

A comparação usa o relógio de cada aparelho, então mantenha data e hora automáticas nos dois.

## Onde está cada coisa

| Arquivo | O que faz |
| --- | --- |
| `src/db.js` | Inicialização do IndexedDB com Dexie: tabelas, índices, UUIDs e dados iniciais |
| `src/lib/backup.js` | `exportarBackupJSON()`, `compartilharBackupJSON()` e `importarECombinarJSON(arquivo)` |
| `src/lib/comprovante.js` | Leitor de comprovantes Pix e faturas (regras locais, sem IA externa) |
| `src/lib/dados.js` | Gravação: salvar, excluir, parcelar, definir orçamento |
| `src/lib/calculos.js` | Saldo consolidado, projeção, gasto por categoria |
| `src/components/Painel.jsx` | Dashboard |
| `src/components/FormularioTransacao.jsx` | Formulário de lançamento |
| `src/components/Lancamentos.jsx` | Lista com filtros por mês, categoria e conta |
| `src/components/Backup.jsx` | Tela de backup e sincronização |
| `src/components/Comprovante.jsx` | Tela do leitor de comprovantes |
| `src/components/Cadastros.jsx` | Contas, categorias e orçamentos |
| `public/manifest.json` | Nome, ícones, modo standalone, atalho "Novo lançamento" |
| `public/sw.js` | Service Worker: guarda o app inteiro no cache |
| `vite.config.js` | Build; preenche o `sw.js` e aplica a política de segurança (CSP) |

## Estrutura dos dados

Além dos campos pedidos, todas as tabelas têm `atualizado_em` e `excluido` (necessários para a fusão), e as transações parceladas têm `parcela_numero` e `grupo_parcelas_id`.

- `contas_bancarias`: `id`, `nome`, `tipo` (Corrente, Poupança, Cartão, Dinheiro), `saldo_inicial`, `criado_em`
- `categorias`: `id`, `nome`, `tipo` (Receita, Despesa), `cor_hex`
- `transacoes`: `id`, `conta_id`, `categoria_id`, `tipo`, `valor`, `data` (`AAAA-MM-DD`), `descricao`, `pago`, `cartao_credito`, `parcelas`, `criado_em`, `atualizado_em`
- `orcamentos`: `id`, `categoria_id`, `valor_limite`, `mes_ano` (`AAAA-MM`)

As categorias iniciais e a conta "Carteira" têm IDs fixos, iguais em todos os aparelhos. Se cada celular sorteasse um UUID para "Mercado", a fusão criaria duas categorias "Mercado".

Uma compra no cartão em N parcelas vira N lançamentos, um por mês, com o valor total dividido entre eles.

Como os números do painel são calculados:

- **Saldo consolidado**: saldo inicial das contas + tudo que já foi pago ou recebido.
- **Receita total** e **Despesas do mês**: lançamentos com data no mês selecionado, pagos ou não.
- **Projeção**: saldo consolidado + o que falta receber − o que falta pagar até o último dia do mês.

## Segurança e privacidade

- O app não faz nenhuma requisição externa. No build, uma Content-Security-Policy impede o navegador de carregar ou enviar qualquer coisa fora do próprio endereço. Até as fontes vêm empacotadas.
- O leitor de comprovantes roda no aparelho; o texto colado não sai dele.
- Registros importados são validados antes de entrar no banco.
- O app pede armazenamento persistente (`navigator.storage.persist()`) para o navegador não descartar os dados quando faltar espaço.

Limites que vale conhecer:

- O arquivo de backup **não é criptografado**. Quem abrir o `.json` lê seus lançamentos.
- Não há senha para abrir o app: a proteção é o bloqueio de tela do celular.
- Limpar os dados do navegador (ou desinstalar o app, em alguns aparelhos) apaga tudo. No iPhone, sites não instalados na tela inicial podem ter os dados removidos após algumas semanas sem uso. Gere backups com alguma frequência.

## Atualizar o app

Altere o código, rode `npm run build` e publique `dist/` de novo (ou reconecte o cabo, no caminho 1). Ao abrir, o app mostra "Nova versão do app disponível" com o botão Atualizar. Os dados não são afetados.

Se mudar a estrutura do banco, crie `db.version(2).stores({...})` em `src/db.js` (com `.upgrade()` quando precisar converter dados) em vez de editar a versão 1.
