# TODO

Plano de trabalho em três partes. Faz as partes pela ordem **A → B → C** e, dentro de cada parte, as tarefas pela ordem em que aparecem: algumas dependem das anteriores. Quando uma tarefa estiver feita, marca a caixa (`- [x]`) no mesmo commit.

## Antes de começar

- Antes de cada commit corre, por esta ordem: `npm run test:run`, `npm run lint`, `npx tsc -b`, `npm run format`. É o que o CI verifica; se algum falhar, o deploy não acontece.
- Faz um commit por tarefa. Depois da tarefa B1, segue a convenção de mensagens de commit que essa tarefa escreve no README.
- Todo o texto visível na app é em português de Portugal ("ecrã", "guardar", "telemóvel").
- Segue o estilo do código à volta: componentes funcionais, classes CSS existentes (`stack`, `row`, `card`, `field`, `btn`, `btn-primary`, `muted`), sem bibliotecas novas.
- Não alteres ficheiros que a tarefa não menciona. Se achares que é preciso, pergunta primeiro.

---

## Parte A — Detalhes logo no início do carregamento live

### Comportamento pretendido

- No ecrã Live, sem carregamento em curso, o botão **"▶ Começar carregamento"** continua a funcionar sem preencher nada.
- Por cima do botão aparece uma secção fechada **"Adicionar detalhes (opcional)"** com 5 campos: Bateria inicial (%), Quilometragem (km), Tipo de carregador, Local, Notas.
- Ao começar, o que estiver preenchido fica guardado no carregamento em curso. Campos vazios ficam `null`.
- Valores inválidos (bateria fora de 0–100, km negativos) mostram um erro e o carregamento **não** começa.
- Com o carregamento em curso, o cartão mostra os detalhes já preenchidos e há um botão **"Editar detalhes"** que abre uma janela com os mesmos 5 campos. Guardar atualiza os dados sem terminar o carregamento.
- Ao terminar, o formulário final já vem com estes valores preenchidos.
- Bateria final, energia e custo **não** aparecem antes de terminar, porque ainda não se sabem.

### - [x] A1. Mover os nomes dos tipos de carregador para um ficheiro partilhado

Ficheiros: novo `src/domain/chargerTypes.ts` · altera `src/features/sessions/SessionForm.tsx`

1. Cria `src/domain/chargerTypes.ts`:

   ```ts
   import type { ChargerType } from './types'

   export const CHARGER_TYPE_LABELS: Record<ChargerType, string> = {
     home: 'Casa',
     public_ac: 'Público AC',
     public_dc: 'Público DC (rápido)',
     other: 'Outro',
   }
   ```

2. Em `SessionForm.tsx`, apaga a constante `CHARGER_TYPE_LABELS` (linhas 8–13) e acrescenta `import { CHARGER_TYPE_LABELS } from '../../domain/chargerTypes'`.
3. Mantém o import de `ChargerType` em `SessionForm.tsx` (continua a ser usado no `useState` e no `select`).

**Pronto quando:** todos os testes passam sem teres mudado nenhum teste.

### - [x] A2. Criar a lógica de rascunho e validação dos detalhes

Ficheiros: novo `src/features/live/liveDetails.ts`

Este ficheiro não tem React. Converte o que está escrito nos campos (texto) em valores para guardar, e valida.

```ts
import type { ChargerType, ChargingSession } from '../../domain/types'

/** Os detalhes que se podem saber antes de o carregamento terminar. */
export type LiveDetails = Pick<
  ChargingSession,
  'batteryStartPct' | 'odometerKm' | 'chargerType' | 'location' | 'notes'
>

/** O que está escrito nos campos, sempre como texto. */
export interface LiveDetailsDraft {
  batteryStartPct: string
  odometerKm: string
  chargerType: ChargerType | ''
  location: string
  notes: string
}

export const EMPTY_LIVE_DETAILS_DRAFT: LiveDetailsDraft = {
  batteryStartPct: '',
  odometerKm: '',
  chargerType: '',
  location: '',
  notes: '',
}

export function draftFromSession(session: ChargingSession): LiveDetailsDraft {
  return {
    batteryStartPct: session.batteryStartPct != null ? String(session.batteryStartPct) : '',
    odometerKm: session.odometerKm != null ? String(session.odometerKm) : '',
    chargerType: session.chargerType ?? '',
    location: session.location ?? '',
    notes: session.notes ?? '',
  }
}

export type ParseResult = { ok: true; details: LiveDetails } | { ok: false; error: string }

export function parseLiveDetailsDraft(draft: LiveDetailsDraft): ParseResult {
  // implementa as regras da tabela abaixo
}
```

Regras de `parseLiveDetailsDraft` (aplica `.trim()` a todos os textos primeiro):

| Campo           | Vazio                  | Válido                                 | Inválido → erro                                                        |
| --------------- | ---------------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| batteryStartPct | `null`                 | `Number(texto)` entre 0 e 100, incluso | "A bateria inicial tem de estar entre 0 e 100%." (também se der `NaN`) |
| odometerKm      | `null`                 | `Number(texto)` ≥ 0                    | "A quilometragem não pode ser negativa." (também se der `NaN`)         |
| chargerType     | `null` (quando é `''`) | o próprio valor                        | —                                                                      |
| location        | `null`                 | texto sem espaços nas pontas           | —                                                                      |
| notes           | `null`                 | texto sem espaços nas pontas           | —                                                                      |

Valida a bateria primeiro e os km depois; devolve só o primeiro erro encontrado.

**Pronto quando:** `npx tsc -b` passa.

### - [x] A3. Testar a lógica de rascunho

Ficheiros: novo `src/features/live/liveDetails.test.ts`

Usa `describe`/`it`/`expect` do `vitest`, como em `liveSession.test.ts`. Um `it` por caso:

1. Rascunho vazio → `ok: true` e todos os campos `null`.
2. `{ batteryStartPct: ' 20 ', odometerKm: '12345', chargerType: 'public_dc', location: ' Ionity ', notes: 'x' }` → `20`, `12345`, `'public_dc'`, `'Ionity'`, `'x'`.
3. Bateria `'0'` e `'100'` → aceites.
4. Bateria `'101'` → `ok: false` com a mensagem da bateria.
5. Bateria `'-1'` → `ok: false` com a mensagem da bateria.
6. Km `'-5'` → `ok: false` com a mensagem dos km.
7. Bateria `'150'` e km `'-5'` → devolve a mensagem da **bateria**.
8. `draftFromSession` de uma sessão com tudo `null` → igual a `EMPTY_LIVE_DETAILS_DRAFT`.
9. `draftFromSession` de uma sessão com `batteryStartPct: 35` → `batteryStartPct: '35'`.

**Pronto quando:** os 9 testes passam.

### - [x] A4. Criar o componente com os 5 campos

Ficheiros: novo `src/features/live/LiveDetailsFields.tsx`

1. Componente `LiveDetailsFields` com props `{ draft: LiveDetailsDraft; onChange: (draft: LiveDetailsDraft) => void }`. **Não** tem estado próprio (`useState`): mostra o que recebe e avisa as alterações com `onChange({ ...draft, campo: valor })`.
2. Copia o HTML dos campos da secção "Mais detalhes" de `SessionForm.tsx`, **sem** o campo "Bateria final". Fica: Bateria inicial, Quilometragem, Local, Tipo de carregador, Notas.
3. Os `id` e `htmlFor` levam o prefixo `live-`: `live-battery-start`, `live-odometer`, `live-location`, `live-charger-type`, `live-notes`. Isto evita ids repetidos quando o formulário de terminar também está aberto.
4. As opções do `select` vêm de `CHARGER_TYPE_LABELS` (de A1), com a primeira opção `<option value="">—</option>`.
5. O elemento de topo é `<div className="stack">`.

**Pronto quando:** compila (ainda não está a ser usado).

### - [x] A5. Detalhes opcionais antes de começar

Ficheiros: altera `src/features/live/LiveScreen.tsx`

1. Acrescenta dois estados: `const [startDraft, setStartDraft] = useState(EMPTY_LIVE_DETAILS_DRAFT)` e `const [startError, setStartError] = useState<string | null>(null)`.
2. No bloco `if (!liveSession)`, entre o `<p className="muted">` e o botão, acrescenta:

   ```tsx
   <details>
     <summary>Adicionar detalhes (opcional)</summary>
     <div style={{ marginTop: 12 }}>
       <LiveDetailsFields draft={startDraft} onChange={setStartDraft} />
     </div>
   </details>
   ```

3. Logo a seguir, mostra o erro como em `SessionForm`: `{startError && <p className="muted" role="alert" style={{ color: 'var(--danger)' }}>{startError}</p>}`.
4. Substitui `handleStart` por:

   ```ts
   function handleStart() {
     const result = parseLiveDetailsDraft(startDraft)
     if (!result.ok) {
       setStartError(result.error)
       return
     }
     setStartError(null)
     onAdd({
       carId,
       kind: 'electric',
       startAt: new Date().toISOString(),
       endAt: null,
       energyKwh: 0,
       cost: null,
       batteryEndPct: null,
       ...result.details,
       isLive: true,
     })
     setStartDraft(EMPTY_LIVE_DETAILS_DRAFT)
   }
   ```

5. Muda o texto do parágrafo para: "Começa agora e preenche o resto quando terminares. Se já souberes alguns detalhes, podes indicá-los já."

**Pronto quando:** com `npm run dev`, consegues começar sem preencher nada e também com detalhes; com bateria 150 aparece o erro e o carregamento não começa.

### - [x] A6. Mostrar os detalhes no cartão do carregamento em curso

Ficheiros: altera `src/features/live/LiveScreen.tsx`

1. Dentro do `<div className="card">`, depois da Duração, mostra cada detalhe **só se não for `null`**, no mesmo formato de "Início"/"Duração": rótulo em `<div className="muted" style={{ marginTop: 10 }}>`, valor em `<strong>`.
2. Rótulos e formato do valor:
   - "Bateria inicial" → `` `${liveSession.batteryStartPct}%` ``
   - "Quilometragem" → `` `${liveSession.odometerKm.toLocaleString('pt-PT')} km` ``
   - "Tipo de carregador" → `CHARGER_TYPE_LABELS[liveSession.chargerType]`
   - "Local" → o texto
   - "Notas" → o texto

**Pronto quando:** começando com bateria 20 e km 12345, o cartão mostra "20%" e "12 345 km"; começando sem nada, o cartão fica igual ao de hoje.

### - [x] A7. Botão "Editar detalhes" durante o carregamento

Ficheiros: altera `src/features/live/LiveScreen.tsx`

1. Novos estados: `editOpen` (boolean, começa `false`), `editDraft` (começa `EMPTY_LIVE_DETAILS_DRAFT`) e `editError` (`string | null`).
2. Entre o cartão e o botão "■ Terminar carregamento", acrescenta `<button type="button" className="btn">Editar detalhes</button>`. Ao clicar: `setEditDraft(draftFromSession(liveSession))`, `setEditError(null)`, `setEditOpen(true)`.
3. Quando `editOpen` é `true`, mostra `<Modal title="Detalhes do carregamento" onClose={() => setEditOpen(false)}>` com um `<form className="stack" onSubmit={handleEditSubmit}>` que contém: `LiveDetailsFields` (com `editDraft`/`setEditDraft`), a mensagem de erro (mesmo formato de A5) e uma `<div className="row">` com "Cancelar" (`type="button"`, fecha a janela) e "Guardar" (`type="submit"`, `className="btn btn-primary"`), ambos com `style={{ flex: 1 }}`.
4. `handleEditSubmit(event: FormEvent)`: `event.preventDefault()`; se `!liveSession` sai; faz `parseLiveDetailsDraft(editDraft)`; se der erro, `setEditError(result.error)` e sai; senão `onUpdate(liveSession.id, result.details)` e `setEditOpen(false)`.
5. **Atenção:** aqui **não** se envia `isLive` nem `endAt`. O carregamento tem de continuar em curso.

**Pronto quando:** editar e guardar atualiza o cartão, o cronómetro continua a contar e o carregamento continua em curso depois de recarregar a página.

### - [x] A8. Formulário de terminar: sem "0" na energia e com os detalhes visíveis

Ficheiros: altera `src/features/sessions/SessionForm.tsx`

1. Hoje, ao terminar um carregamento live, o campo de energia aparece com "0" (o valor provisório). Troca a linha do estado `energyKwh` por:

   ```ts
   const [energyKwh, setEnergyKwh] = useState(
     initialSession && initialSession.energyKwh > 0 ? String(initialSession.energyKwh) : '',
   )
   ```

2. No `<details>` de "Mais detalhes", acrescenta `open={hasInitialDetails}`, com esta constante calculada antes do `return`:

   ```ts
   const hasInitialDetails =
     initialSession?.batteryStartPct != null ||
     initialSession?.odometerKm != null ||
     initialSession?.chargerType != null ||
     initialSession?.location != null ||
     initialSession?.notes != null
   ```

**Pronto quando:** os testes existentes de `SessionForm` continuam a passar.

### - [x] A9. Testes do ecrã Live

Ficheiros: altera `src/features/live/LiveScreen.test.tsx`

Usa a função `makeLiveSession()` que já existe e `userEvent`, como nos testes atuais. Para procurar campos só dentro de uma janela aberta, usa `within(screen.getByRole('dialog'))` em vez de `screen`. Um `it` por caso:

1. Começar sem abrir os detalhes → `onAdd` recebe `batteryStartPct: null` e `odometerKm: null`.
2. Abrir "Adicionar detalhes (opcional)", escrever 20 em "Bateria inicial (%)" e 12345 em "Quilometragem (km)", começar → `onAdd` recebe `batteryStartPct: 20, odometerKm: 12345, isLive: true`.
3. Escrever 150 na bateria e começar → aparece "A bateria inicial tem de estar entre 0 e 100%." e `onAdd` **não** foi chamado.
4. Sessão live com `batteryStartPct: 20` → o ecrã mostra "20%".
5. Clicar "Editar detalhes", mudar a bateria para 25, "Guardar" → `onUpdate` chamado com `('live-1', expect.objectContaining({ batteryStartPct: 25 }))`, e `expect(onUpdate.mock.calls[0][1]).not.toHaveProperty('isLive')`.
6. Clicar "Editar detalhes" e depois "Cancelar" → `onUpdate` não foi chamado.
7. Sessão live com `odometerKm: 12345`, clicar "Terminar carregamento" → o campo "Quilometragem (km)" da janela tem o valor 12345 e o campo de energia está vazio.

**Pronto quando:** os 7 testes novos passam.

### - [x] A10. Atualizar o README

Ficheiros: altera `README.md`

Na lista de funcionalidades, troca a linha do carregamento live por:

> **Carregamento "live"** — começar agora e terminar mais tarde; os detalhes já conhecidos (bateria inicial, km, carregador, local) podem ser indicados logo no início ou durante o carregamento.

**Pronto quando:** `npm run format:check` passa.

---

## Parte B — Changelog automático e popup de novidades

### Comportamento pretendido

- **Ninguém escreve o changelog à mão.** É gerado a partir das mensagens de commit do git, sempre que a app é compilada.
- São gerados dois formatos a partir da mesma lista de commits:
  - **`CHANGELOG.md` completo**: todos os commits com impacto para o utilizador, agrupados por dia, com título e descrição. É publicado junto com a app (`…/historico-carregamentos/CHANGELOG.md`) e pode ser gerado localmente com `npm run changelog`.
  - **Versão simplificada para o popup**: uma frase curta por commit, incluída no código da app.
- Um commit tem **impacto para o utilizador** se mexer em ficheiros da app (`src/`, `public/`, `index.html`) que não sejam testes. Commits só de testes, CI, README ou configuração não aparecem.
- O texto do popup é, por defeito, o título do commit. Se a mensagem do commit tiver linhas `Novidade: <frase curta>`, usam-se essas frases. `Novidade: nenhuma` esconde o commit, mesmo que mexa em `src/`.
- No primeiro arranque depois de uma atualização, aparece a janela **"Novidades"** com os commits novos desde a última vez (no máximo 5).
- A janela aparece **uma única vez**. Fica marcada como vista no momento em que aparece, mesmo que a pessoa feche a app sem carregar em OK.
- Instalação nova (sem nenhum registo guardado): não aparece nada.
- Telemóvel que já tinha a app mas nunca viu nenhuma novidade (o caso de toda a gente na primeira publicação desta funcionalidade): mostra só os commits posteriores a `FIRST_ANNOUNCED_AT` (em `src/domain/whatsNew.ts`), para não anunciar alterações antigas.
- A "versão" da app é a data do último commit incluído na compilação. A versão vista é guardada fora das definições, para que importar uma cópia de segurança não a altere.

### - [x] B1. Documentar a convenção de mensagens de commit

Ficheiros: altera `README.md`

Acrescenta, antes da secção "Deploy", esta secção (copia tal como está):

````md
## Mensagens de commit e changelog

O changelog é gerado automaticamente a partir das mensagens de commit, por isso:

- O título do commit (1.ª linha) descreve a mudança do ponto de vista de quem usa a app, em português, a começar por um verbo: "Adiciona…", "Corrige…", "Mostra…". Idealmente até 72 caracteres.
- Commits que mexem em ficheiros da app (`src/`, `public/`, `index.html`, exceto testes) aparecem no popup de novidades e no `CHANGELOG.md`. Os outros (testes, CI, README) não aparecem.
- Para escolher o texto do popup, acrescenta à descrição do commit uma ou mais linhas `Novidade: <frase curta>`:

  ```
  Adiciona detalhes ao carregamento live e refaz o formulário

  Novidade: Já podes indicar a bateria e os km ao começar um carregamento live.
  ```

- Para esconder um commit que mexe em `src/` mas não muda nada visível (ex.: refactor), acrescenta a linha `Novidade: nenhuma`.
- `npm run changelog` gera o `CHANGELOG.md` localmente para veres o resultado.
````

**Pronto quando:** `npm run format:check` passa.

### - [x] B2. Dar ao CI o histórico completo do git

Ficheiros: altera `.github/workflows/deploy.yml`

O `actions/checkout` só descarrega o último commit por defeito, e sem histórico não há changelog. No passo `- uses: actions/checkout@v4`, acrescenta:

```yaml
- uses: actions/checkout@v4
  with:
    fetch-depth: 0
```

**Pronto quando:** o ficheiro tem esta alteração (só se confirma no CI depois do push).

### - [x] B3. Script que lê o git e gera o changelog

Ficheiros: novo `scripts/changelog.mjs`

É JavaScript simples (não TypeScript) para poder correr com `node` e também ser importado pelo `vite.config.ts`. Estrutura completa (implementa as funções marcadas com `// TODO`):

```js
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const FIELD = '\x1f'
const RECORD = '\x1e'
const MAX_COMMITS = 300
const MAX_ITEM_LENGTH = 120

/** Saída crua do `git log`, ou null se o git não estiver disponível. */
export function readGitLog(cwd) {
  try {
    return execFileSync(
      'git',
      [
        'log',
        '--no-merges',
        `-n${MAX_COMMITS}`,
        `--format=${RECORD}%H${FIELD}%cI${FIELD}%s${FIELD}%b${FIELD}`,
        '--name-only',
      ],
      { cwd, encoding: 'utf8' },
    )
  } catch {
    return null
  }
}

/** Converte a saída do git em [{ hash, date, subject, body, files }], do mais recente para o mais antigo. */
export function parseGitLog(raw) {
  // TODO
}

/** True se o commit muda algo que quem usa a app vê. */
export function isUserFacing(commit) {
  // TODO
}

/** As frases curtas do popup para um commit. */
export function popupItems(commit) {
  // TODO
}

/** Dados para o popup: { builtFrom, entries: [{ hash, date, items }] }. */
export function buildChangelog(commits) {
  // TODO
}

/** O CHANGELOG.md completo. */
export function toMarkdown(commits) {
  // TODO
}

// Quando é corrido com `node scripts/changelog.mjs`, escreve o CHANGELOG.md na raiz.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const raw = readGitLog(process.cwd())
  writeFileSync('CHANGELOG.md', toMarkdown(parseGitLog(raw ?? '')))
  console.log('CHANGELOG.md gerado.')
}
```

Regras de cada função:

- **`parseGitLog(raw)`**
  1. `raw.split(RECORD)` e descarta o primeiro pedaço (é vazio).
  2. Cada pedaço faz `.split(FIELD)` e dá `[hash, date, subject, body, filesBlock]`.
  3. `files` = `filesBlock.split('\n').map((f) => f.trim()).filter(Boolean)`.
  4. `body` = `body.trim()`, `subject` = `subject.trim()`.
  5. Se `raw` for `''`, devolve `[]`.
- **`isUserFacing(commit)`**, por esta ordem:
  1. Se alguma linha do `body` corresponder a `/^Novidade:\s*nenhuma\s*$/i` → `false`.
  2. Se alguma linha do `body` começar por `Novidade:` → `true`.
  3. Se algum ficheiro em `files` começar por `src/` ou `public/`, ou for `index.html`, **e** não terminar em `.test.ts`/`.test.tsx` **e** não começar por `src/test/` → `true`.
  4. Caso contrário → `false`.
- **`popupItems(commit)`**
  1. Junta o texto depois de `Novidade:` (com `trim()`) de cada linha do `body` que começa por `Novidade:`.
  2. Se não houver nenhuma, usa `[commit.subject]`.
  3. Cada frase com mais de `MAX_ITEM_LENGTH` caracteres é cortada para `MAX_ITEM_LENGTH - 1` caracteres + `'…'`.
- **`buildChangelog(commits)`** devolve:
  - `builtFrom`: `commits[0]?.date ?? null`. É a data do último commit, **mesmo que não tenha impacto** (é a versão da compilação).
  - `entries`: os commits com `isUserFacing`, no máximo 50, cada um como `{ hash: commit.hash.slice(0, 7), date: commit.date, items: popupItems(commit) }`.
- **`toMarkdown(commits)`**
  1. Começa com `# Changelog\n\nGerado automaticamente a partir do histórico do git. Não editar à mão.\n`.
  2. Só commits com `isUserFacing`, agrupados pelo dia `commit.date.slice(0, 10)`, do mais recente para o mais antigo.
  3. Por dia: uma linha em branco, `## AAAA-MM-DD` e outra linha em branco.
  4. Por commit: `- <subject>`. A seguir, cada linha não vazia do `body` que **não** seja um trailer (`/^[A-Za-z-]+:\s/`, ex.: `Co-Authored-By:` ou `Novidade:`) vai como `  <linha>` (2 espaços antes).
  5. Termina com `\n`.

**Pronto quando:** `node scripts/changelog.mjs` cria um `CHANGELOG.md` com os commits recentes do repositório.

### - [x] B4. Tipos, script npm e ficheiros ignorados

Ficheiros: novo `scripts/changelog.d.mts` · altera `tsconfig.node.json`, `package.json`, `.gitignore`

1. Cria `scripts/changelog.d.mts` (dá tipos ao `.mjs` para o `vite.config.ts`):

   ```ts
   export interface GitCommit {
     hash: string
     date: string
     subject: string
     body: string
     files: string[]
   }
   export interface ChangelogEntry {
     hash: string
     date: string
     items: string[]
   }
   export interface Changelog {
     builtFrom: string | null
     entries: ChangelogEntry[]
   }
   export function readGitLog(cwd: string): string | null
   export function parseGitLog(raw: string): GitCommit[]
   export function isUserFacing(commit: GitCommit): boolean
   export function popupItems(commit: GitCommit): string[]
   export function buildChangelog(commits: GitCommit[]): Changelog
   export function toMarkdown(commits: GitCommit[]): string
   ```

2. Em `tsconfig.node.json`, muda `"include": ["vite.config.ts"]` para `"include": ["vite.config.ts", "scripts"]`.
3. Em `package.json`, dentro de `"scripts"`, acrescenta `"changelog": "node scripts/changelog.mjs"`.
4. Em `.gitignore`, acrescenta no fim uma linha `CHANGELOG.md`. O ficheiro é sempre gerado, por isso não vai para o repositório.

**Pronto quando:** `npm run changelog` funciona, `npx tsc -b` passa e `git status` não mostra o `CHANGELOG.md`.

### - [x] B5. Testes do script

Ficheiros: novo `scripts/changelog.test.ts`

Importa as funções de `./changelog.mjs`. Para não depender do git real, cria uma função auxiliar no teste que monta texto no formato do git:

```ts
const F = '\x1f'
const R = '\x1e'
function fakeLog(
  commits: { hash: string; date: string; subject: string; body?: string; files: string[] }[],
) {
  return commits
    .map(
      (c) =>
        `${R}${c.hash}${F}${c.date}${F}${c.subject}${F}${c.body ?? ''}${F}\n\n${c.files.join('\n')}\n`,
    )
    .join('')
}
```

Um `it` por caso:

1. `parseGitLog('')` → `[]`.
2. `parseGitLog` de 2 commits → 2 objetos com `hash`, `date`, `subject`, `body` e `files` corretos.
3. `isUserFacing`: só `src/App.tsx` → `true`.
4. `isUserFacing`: só `src/App.test.tsx` e `README.md` → `false`.
5. `isUserFacing`: só `README.md`, mas com `Novidade: Algo` no body → `true`.
6. `isUserFacing`: `src/App.tsx` com `Novidade: nenhuma` → `false`.
7. `popupItems` sem linhas `Novidade:` → `[subject]`.
8. `popupItems` com duas linhas `Novidade:` → as duas frases, sem o prefixo.
9. `popupItems` com um título de 200 caracteres → frase com 120 caracteres a terminar em `…`.
10. `buildChangelog`: o commit mais recente é só de testes → `builtFrom` é a data dele, mas `entries` não o inclui.
11. `buildChangelog`: `hash` com 7 caracteres.
12. `toMarkdown`: 2 commits no mesmo dia e 1 noutro → 2 cabeçalhos `##`, por ordem decrescente.
13. `toMarkdown`: as linhas `Co-Authored-By:` e `Novidade:` do body não aparecem.

**Pronto quando:** os 13 testes passam.

### - [x] B6. Plugin do Vite que entrega o changelog à app

Ficheiros: altera `vite.config.ts`, `src/vite-env.d.ts`

1. Em `vite.config.ts`, acrescenta os imports `import type { Plugin } from 'vite'` e `import { buildChangelog, parseGitLog, readGitLog, toMarkdown } from './scripts/changelog.mjs'`.
2. Antes do `export default defineConfig(...)`, acrescenta:

   ```ts
   /** Gera o changelog a partir do git: `virtual:changelog` para o popup e CHANGELOG.md no build. */
   function changelogPlugin(): Plugin {
     const VIRTUAL_ID = 'virtual:changelog'
     const RESOLVED_ID = '\0' + VIRTUAL_ID
     const commits = parseGitLog(readGitLog(process.cwd()) ?? '')
     return {
       name: 'changelog',
       resolveId(id) {
         if (id === VIRTUAL_ID) return RESOLVED_ID
       },
       load(id) {
         if (id === RESOLVED_ID) return `export default ${JSON.stringify(buildChangelog(commits))}`
       },
       generateBundle() {
         this.emitFile({ type: 'asset', fileName: 'CHANGELOG.md', source: toMarkdown(commits) })
       },
     }
   }
   ```

3. Na lista `plugins`, acrescenta `changelogPlugin(),` logo a seguir a `react(),`.
4. Em `src/vite-env.d.ts`, acrescenta no fim:

   ```ts
   declare module 'virtual:changelog' {
     const changelog: {
       /** Data ISO do último commit incluído na compilação; é a "versão" da app. */
       builtFrom: string | null
       entries: { hash: string; date: string; items: string[] }[]
     }
     export default changelog
   }
   ```

5. Nota: em `npm run dev`, o changelog é lido quando o servidor arranca. Depois de um commit novo, reinicia o servidor para o ver.

**Pronto quando:** `npm run build` passa e existe `dist/CHANGELOG.md`.

### - [x] B7. Guardar a última versão vista

Ficheiros: novo `src/storage/appVersionRepository.ts` · novo `src/storage/appVersionRepository.test.ts`

```ts
import { readJson, writeJson } from './localStorage'

const KEY = 'historico-carregamentos:lastSeenVersion'

export function loadLastSeenVersion(): string | null {
  return readJson<string | null>(KEY, null, (value) => typeof value === 'string')
}

export function saveLastSeenVersion(version: string): void {
  writeJson(KEY, version)
}
```

**Não** guardes isto em `CarSettings`: as definições entram nas cópias de segurança e seriam substituídas ao importar.

Testes, com `beforeEach(() => { localStorage.clear(); resetUnreadableData() })` como em `settingsRepository.test.ts`:

1. Sem nada guardado → `null`.
2. `saveLastSeenVersion('2026-10-20T10:00:00+01:00')` e depois `loadLastSeenVersion()` → o mesmo texto.
3. Com `localStorage.setItem(KEY, '42')` (um número, não texto) → `null`.

**Pronto quando:** os 3 testes passam.

### - [x] B8. Decidir que novidades mostrar

Ficheiros: novo `src/domain/whatsNew.ts` · novo `src/domain/whatsNew.test.ts`

```ts
import type changelog from 'virtual:changelog'

export type Changelog = typeof changelog
export type ChangelogEntry = Changelog['entries'][number]

export const MAX_ENTRIES_SHOWN = 5

/**
 * Commits ainda não vistos, do mais recente para o mais antigo.
 * `hasExistingData` distingue uma instalação nova de quem já usava a app antes desta funcionalidade.
 */
export function entriesToShow(
  changelog: Changelog,
  lastSeenVersion: string | null,
  hasExistingData: boolean,
): ChangelogEntry[] {
  // implementa as regras abaixo, por esta ordem
}
```

Regras:

1. `changelog.builtFrom === null` ou `changelog.entries` vazio → `[]`.
2. `lastSeenVersion === changelog.builtFrom` → `[]`.
3. `lastSeenVersion === null` → `hasExistingData ? entries.slice(0, MAX_ENTRIES_SHOWN) : []`.
4. Se `Date.parse(lastSeenVersion)` der `NaN` → `entries.slice(0, 1)`.
5. Caso contrário → as entradas com `Date.parse(entry.date) > Date.parse(lastSeenVersion)`, e depois `.slice(0, MAX_ENTRIES_SHOWN)`.

As datas comparam-se com `Date.parse` e não como texto, porque podem ter fusos horários diferentes (`+01:00` e `+00:00`).

Testes: changelog falso com `builtFrom: '2026-10-07T10:00:00+01:00'` e 7 entradas com datas de `2026-10-07` (a primeira) até `2026-10-01` (a última), todas às `10:00:00+01:00`. Um `it` por caso:

1. `builtFrom: null` → `[]`.
2. Última vista igual a `builtFrom` → `[]`.
3. Última vista `null`, sem dados → `[]`.
4. Última vista `null`, com dados → as 5 primeiras.
5. Última vista `'2026-10-05T10:00:00+01:00'` → as entradas de 07 e 06.
6. Última vista `'2026-09-01T00:00:00Z'` → as 5 primeiras (limite).
7. Última vista `'xpto'` → só a de 07.
8. Última vista `'2026-10-06T09:00:00Z'` (= 10:00 em `+01:00`) → só a de 07 (confirma a comparação com fusos).

**Pronto quando:** os 8 testes passam.

### - [x] B9. Criar a janela "Novidades"

Ficheiros: novo `src/features/whatsNew/WhatsNewModal.tsx` · novo `src/features/whatsNew/WhatsNewModal.test.tsx`

1. Props: `{ entries: ChangelogEntry[]; onClose: () => void }` (o tipo vem de `src/domain/whatsNew.ts`).
2. Usa o `Modal` existente: `<Modal title="Novidades" onClose={onClose}>`.
3. Dentro, um `<div className="stack">` com:
   - `<p className="muted">Desde a última vez que abriste a app:</p>`
   - um `<ul>` com um `<li>` por frase de todas as entradas, pela ordem recebida (`entries.flatMap((e) => e.items.map((item, i) => ({ key: `${e.hash}-${i}`, item })))`).
   - `<button type="button" className="btn btn-primary" onClick={onClose}>OK</button>`.

Testes:

1. Com 2 entradas (uma com 2 frases, outra com 1) → aparece o diálogo "Novidades" com as 3 frases.
2. Clicar "OK" chama `onClose` uma vez.
3. Clicar "Fechar" (o ✕ do `Modal`) também chama `onClose`.

**Pronto quando:** os 3 testes passam.

### - [x] B10. Ligar a janela à app

Ficheiros: altera `src/App.tsx`, `src/App.test.tsx`

1. Em `App.tsx`, importa `useEffect`, `changelog from 'virtual:changelog'`, `entriesToShow`, `loadLastSeenVersion`/`saveLastSeenVersion` e `WhatsNewModal`.
2. **Depois** das chamadas a `useSessions()` e `useFuelEntries()` (precisa dos dados já carregados), acrescenta:

   ```ts
   const [whatsNew, setWhatsNew] = useState(() =>
     entriesToShow(changelog, loadLastSeenVersion(), sessions.length > 0 || fuelEntries.length > 0),
   )

   // Marca como vista logo ao abrir, para a janela só aparecer uma vez.
   useEffect(() => {
     if (changelog.builtFrom) saveLastSeenVersion(changelog.builtFrom)
   }, [])
   ```

3. No JSX, depois de `<TabBar … />` e antes de `</>`: `{whatsNew.length > 0 && <WhatsNewModal entries={whatsNew} onClose={() => setWhatsNew([])} />}`.
4. Em `App.test.tsx`, logo a seguir aos imports, fixa o changelog para os testes não dependerem do git:

   ```ts
   vi.mock('virtual:changelog', () => ({
     default: {
       builtFrom: '2026-10-20T10:00:00+01:00',
       entries: [
         { hash: 'abc1234', date: '2026-10-20T10:00:00+01:00', items: ['Novidade de teste.'] },
       ],
     },
   }))
   ```

   (acrescenta `vi` ao import de `vitest`).

5. Para criar "dados existentes" nos testes, guarda um carregamento antes do `render` com `localStorage.setItem('historico-carregamentos:sessions', JSON.stringify([sessão]))`. Copia o formato da sessão de `makeLiveSession()` em `LiveScreen.test.tsx`, com `isLive: false` e `energyKwh: 10`.
6. Testes novos:
   1. Sem nada guardado → `screen.queryByRole('dialog', { name: 'Novidades' })` é `null`, e depois do render `loadLastSeenVersion()` devolve `'2026-10-20T10:00:00+01:00'`.
   2. Com um carregamento guardado e sem versão vista → o diálogo aparece com "Novidade de teste.".
   3. Com um carregamento guardado e `saveLastSeenVersion('2026-10-20T10:00:00+01:00')` antes do render → não aparece.
   4. Com o diálogo aberto, clicar "OK" → o diálogo desaparece.
   5. Com um carregamento guardado: `render`, depois `cleanup()` (de `@testing-library/react`) e `render` outra vez → na segunda vez **não** aparece.

**Pronto quando:** os testes antigos e os 5 novos passam.

### - [x] B11. Versão e histórico completo nas Definições

Ficheiros: altera `src/features/settings/AppUpdateSection.tsx`

1. Importa `changelog from 'virtual:changelog'`.
2. Troca a frase "Versão de {data}. Recarregar procura…" por:

   ```tsx
   Versão de {new Date(changelog.builtFrom ?? __APP_BUILD_TIME__).toLocaleString('pt-PT')}.
   Recarregar procura uma versão nova sem apagar os teus dados.
   ```

3. Logo a seguir a esse parágrafo, acrescenta um link para o histórico completo:

   ```tsx
   <a href={`${import.meta.env.BASE_URL}CHANGELOG.md`} target="_blank" rel="noreferrer">
     Ver histórico de alterações
   </a>
   ```

4. Em `AppUpdateSection.test.tsx`, acrescenta o mesmo `vi.mock('virtual:changelog', …)` de B10 e atualiza qualquer teste que procure o texto antigo.

**Pronto quando:** os testes de `AppUpdateSection` passam.

### - [ ] B12. Verificação manual antes de publicar

Sem alterações de código.

1. `npm run build` e depois `npm run preview`; abre o endereço indicado.
2. Nas ferramentas de programador do browser (Application → Local Storage), apaga todas as chaves e recarrega → **não** aparece popup.
3. Cria um carregamento. Apaga só a chave `historico-carregamentos:lastSeenVersion` e recarrega → aparece "Novidades" com até 5 frases.
4. Recarrega outra vez → já não aparece.
5. Muda o valor de `lastSeenVersion` para `"2020-01-01T00:00:00Z"` (com as aspas) e recarrega → aparecem as 5 mais recentes.
6. Em Definições, "Ver histórico de alterações" abre o `CHANGELOG.md`.

**Pronto quando:** os 6 passos dão o resultado indicado. Só então faz push.

---

## Parte C — Correções às estatísticas

### Problemas a resolver

1. **Consumo por registo errado com carregamentos parciais.** Hoje, consumo = kWh carregados ÷ km desde a leitura anterior. Exemplo: 300 km, chegas com 20% e carregas só 10% (≈5 kWh) → "1,7 kWh/100 km". No dia seguinte carregas até 100% com 5 km feitos → centenas de kWh/100 km. A % da bateria é guardada mas não é usada. **Correção:** energia gasta = (bateria final do carregamento anterior − bateria inicial deste) × capacidade da bateria. A capacidade é uma definição nova, com estimativa automática.
2. **"Custo médio por km" do Resumo usa uma fórmula diferente da dos gráficos** e pior: conta o custo do primeiro carregamento do mês (que pagou km do mês anterior) e perde os km entre meses. **Correção:** usar o mesmo cálculo dos gráficos.
3. **Híbrido plug-in: os consumos "só elétrico" e "só combustível" dividem por todos os km**, incluindo os feitos com a outra energia, por isso saem sempre abaixo do real. **Correção:** campo novo no carregamento, "Km em modo elétrico desde o carregamento anterior" (vem do computador de bordo).
4. **Abastecimentos parciais estragam o consumo de combustível** (hoje assume sempre depósito cheio). **Correção:** caixa nova no abastecimento, "Depósito cheio", e consumo calculado só entre depósitos cheios.
5. **Um carregamento live em curso conta para o Resumo** (com 0 kWh).

Os pontos 1, 3 e 4 precisam de dados que hoje não existem. Os campos novos são opcionais; sem eles, as contas ficam como hoje.

### - [x] C1. Não contar o carregamento em curso no Resumo

Ficheiros: altera `src/features/stats/StatsScreen.tsx`, `src/features/stats/StatsScreen.test.tsx`

1. No `useMemo` de `periodSessions`, filtra os carregamentos live antes de tudo: usa `const finished = sessions.filter((s) => !s.isLive)` e aplica a lógica atual a `finished` em vez de `sessions`.
2. Teste: com um carregamento terminado e um live no mesmo mês, a vista Elétrico mostra "Carregamentos" = 1.

**Pronto quando:** o teste novo passa.

### - [x] C2. "Custo médio por km" do Resumo igual ao dos gráficos

Ficheiros: altera `src/features/stats/StatsScreen.tsx`, `src/domain/stats.ts`, `src/domain/stats.test.ts`, `src/features/stats/StatsScreen.test.tsx`

1. Em `StatsScreen.tsx`, calcula a eficiência do período da mesma forma que `EntryEfficiencyView`:

   ```ts
   const efficiencySummary = useMemo(() => {
     const points = computeEfficiencyPoints(sessions, fuelEntries, filter)
     const inPeriod =
       period === 'total'
         ? points
         : filterByMonth(points, monthCursor.getFullYear(), monthCursor.getMonth())
     return summarizeEfficiency(inPeriod)
   }, [sessions, fuelEntries, filter, period, monthCursor])
   const costPerKm =
     efficiencySummary.costPer100Km !== null ? efficiencySummary.costPer100Km / 100 : null
   ```

2. Nas três vistas (Ambos, Elétrico, Combustível), o cartão "Custo médio por km" passa a mostrar `formatCurrency(costPerKm)` e "Baseado em {efficiencySummary.kmDriven.toLocaleString('pt-PT')} km percorridos". Só aparece quando `costPerKm !== null`. A vista Combustível ainda não tem este cartão: acrescenta-o a seguir a "Custo médio por litro", igual ao das outras.
3. Em `stats.ts`, apaga `deriveDistanceStats` e os campos `totalKmDriven` e `averageCostPerKm` de `ElectricStats` e `CombinedStats` (e o código que os calcula).
4. Em `stats.test.ts`, apaga os testes "derives km driven and cost per km…", "does not compute km driven with fewer than two odometer readings" e "derives km driven from odometer readings across both kinds", e tira esses dois campos das expectativas dos outros testes.
5. Teste novo em `StatsScreen.test.tsx`. Carregamentos: 1 set. com 1000 km e 10 €; 5 out. com 1100 km e 10 €; 20 out. com 1300 km e 10 €. Em outubro, vista Elétrico → "Custo médio por km" é `formatCurrency(20 / 300)` e "Baseado em 300 km". Com a fórmula antiga dava 20 € ÷ 200 km.

**Pronto quando:** todos os testes passam.

### - [x] C3. Campos novos no modelo de dados

Ficheiros: altera `src/domain/types.ts`, `src/storage/settingsRepository.ts`

1. Em `ChargingSession`, acrescenta (opcional, porque os registos antigos não o têm):

   ```ts
   /** Km feitos em modo elétrico desde o carregamento anterior, lidos no computador de bordo. Ausente em registos antigos. */
   electricKm?: number | null
   ```

2. Em `FuelEntry`, acrescenta:

   ```ts
   /** False num abastecimento parcial. Ausente em registos antigos, que contam como depósito cheio. */
   fullTank?: boolean | null
   ```

3. Em `CarSettings`, acrescenta:

   ```ts
   /** Capacidade útil da bateria em kWh, indicada pelo utilizador. Null usa a estimativa automática. */
   batteryCapacityKwh: number | null
   ```

4. Em `DEFAULT_SETTINGS`, acrescenta `batteryCapacityKwh: null`. Como `withSettingsDefaults` já junta os valores por defeito, as definições antigas e as cópias de segurança antigas passam a ter `null`.
5. Corre `npx tsc -b`. Onde der erro por faltar `batteryCapacityKwh` (provavelmente em testes que criam um `CarSettings` completo), acrescenta `batteryCapacityKwh: null`.
6. **Regra para todo o código novo:** testa sempre `fullTank !== false` (nunca `=== true`) e `electricKm != null` (com `!=`, que também apanha `undefined`).

**Pronto quando:** `npx tsc -b` e todos os testes passam.

### - [x] C4. Caixa "Depósito cheio" no abastecimento

Ficheiros: altera `src/features/fuel/FuelEntryForm.tsx`, `src/features/fuel/FuelEntryForm.test.tsx`

1. Novo estado: `const [fullTank, setFullTank] = useState(initialEntry?.fullTank !== false)`. Assim, um registo novo começa marcado e um registo antigo, sem o campo, também.
2. Logo a seguir à `<div className="row">` dos litros/€/total (fora de "Mais detalhes", porque importa sempre), acrescenta:

   ```tsx
   <label htmlFor="fuel-full-tank" className="row" style={{ alignItems: 'center', gap: 8 }}>
     <input
       id="fuel-full-tank"
       type="checkbox"
       checked={fullTank}
       onChange={(e) => setFullTank(e.target.checked)}
     />
     Depósito cheio (atestei)
   </label>
   ```

3. No `onSubmit`, acrescenta `fullTank,` ao objeto enviado.
4. Testes:
   1. Novo registo sem mexer na caixa → `onSubmit` recebe `fullTank: true`.
   2. Desmarcar a caixa → `fullTank: false`.
   3. Editar um registo com `fullTank: false` → a caixa aparece desmarcada.

**Pronto quando:** os 3 testes passam.

### - [x] C5. Campo "Km em modo elétrico" no carregamento

Ficheiros: altera `src/features/sessions/SessionForm.tsx`, `src/features/sessions/SessionForm.test.tsx`

1. Novo estado `electricKm`, iniciado como o `odometerKm` (`initialSession?.electricKm != null ? String(initialSession.electricKm) : ''`).
2. Em "Mais detalhes", logo a seguir ao campo Quilometragem, acrescenta um campo igual com `id="electric-km"`, rótulo "Km em modo elétrico desde o carregamento anterior" e, por baixo, `<small className="muted">Vê no computador de bordo. Serve para separar o consumo elétrico do de combustível.</small>`.
3. Validação no `handleSubmit`, antes do `onSubmit`: se não estiver vazio e `Number(electricKm)` for `NaN` ou negativo → `setError('Os km em modo elétrico não podem ser negativos.')` e `return`.
4. No `onSubmit`, acrescenta `electricKm: electricKm.trim() !== '' ? Number(electricKm) : null`.
5. Testes:
   1. Preencher 150 → `onSubmit` recebe `electricKm: 150`.
   2. Vazio → `electricKm: null`.
   3. `-3` → aparece o erro e `onSubmit` não é chamado.

**Pronto quando:** os 3 testes passam.

### - [x] C6. Estimar a capacidade da bateria

Ficheiros: novo `src/domain/batteryCapacity.ts` · novo `src/domain/batteryCapacity.test.ts`

```ts
import type { ChargingSession } from './types'

/** Só carregamentos que subiram pelo menos isto contam para a estimativa (os pequenos têm muito erro de arredondamento). */
const MIN_PCT_GAIN = 20
const MIN_SAMPLES = 3

/**
 * Capacidade estimada em kWh: mediana de energia ÷ (% carregada / 100) dos carregamentos
 * com bateria inicial e final. Inclui as perdas de carregamento, que também se pagam.
 * Null se houver menos de MIN_SAMPLES carregamentos que sirvam.
 */
export function estimateBatteryCapacity(sessions: ChargingSession[]): number | null {
  // TODO
}

/** A capacidade a usar nas contas: a indicada pelo utilizador ou, se não houver, a estimada. */
export function effectiveBatteryCapacity(
  setting: number | null,
  sessions: ChargingSession[],
): number | null {
  return setting ?? estimateBatteryCapacity(sessions)
}
```

Regras de `estimateBatteryCapacity`:

1. Considera só sessões com `!isLive`, `batteryStartPct != null`, `batteryEndPct != null`, `energyKwh > 0` e `batteryEndPct - batteryStartPct >= MIN_PCT_GAIN`.
2. Para cada uma, calcula `energyKwh / ((batteryEndPct - batteryStartPct) / 100)`.
3. Se houver menos de `MIN_SAMPLES` valores → `null`.
4. Ordena os valores e tira a mediana (com número par de valores, a média dos dois do meio).
5. Arredonda a 1 casa decimal: `Math.round(x * 10) / 10`.

Testes:

1. Sem sessões → `null`.
2. 2 sessões válidas → `null`.
3. 3 sessões: 10 kWh de 20→40%, 15 kWh de 20→50%, 30 kWh de 20→80% → valores 50, 50, 50 → `50`.
4. 4 sessões que dão 48, 50, 52 e 60 → `51`.
5. Uma sessão de 50→60% (ganho de 10) não conta.
6. `effectiveBatteryCapacity(40, sessões do teste 3)` → `40`; `effectiveBatteryCapacity(null, sessões do teste 3)` → `50`.

**Pronto quando:** os 6 testes passam.

### - [x] C7. Capacidade da bateria nas Definições

Ficheiros: novo `src/features/settings/BatterySection.tsx` · novo `src/features/settings/BatterySection.test.tsx` · altera `src/features/settings/SettingsScreen.tsx`

1. Props: `{ settings: CarSettings; sessions: ChargingSession[]; onSettingsChange: (settings: CarSettings) => void }`.
2. Estado local `value` (texto), iniciado com `settings.batteryCapacityKwh != null ? String(settings.batteryCapacityKwh) : ''`.
3. `const estimate = useMemo(() => estimateBatteryCapacity(sessions), [sessions])`.
4. Conteúdo:
   - `<h3>Bateria</h3>`
   - `<div className="field">` com `<label htmlFor="battery-capacity">Capacidade útil (kWh)</label>` e um `<input id="battery-capacity" type="number" inputMode="decimal" min="0" step="0.1">`, com `placeholder={estimate != null ? String(estimate) : ''}`.
   - Por baixo, `<p className="muted">`: se `estimate != null`, "Estimada pelos teus carregamentos: {estimate} kWh. Deixa vazio para usar a estimativa."; senão, "Para estimar, regista a bateria inicial e final em pelo menos 3 carregamentos."
5. `onChange`: atualiza `value`. A seguir, se o texto estiver vazio → `onSettingsChange({ ...settings, batteryCapacityKwh: null })`; se for um número maior que 0 → `onSettingsChange({ ...settings, batteryCapacityKwh: Number(texto) })`; noutro caso não guarda nada.
6. Em `SettingsScreen.tsx`, mostra `<BatterySection … />` logo a seguir ao `TariffEditor`.
7. Testes:
   1. Escrever 52 → `onSettingsChange` com `batteryCapacityKwh: 52`.
   2. Apagar o valor → `batteryCapacityKwh: null`.
   3. Com 3 sessões como em C6 → aparece "Estimada pelos teus carregamentos: 50 kWh".
   4. Sem sessões → aparece a frase "Para estimar…".

**Pronto quando:** os 4 testes passam.

### - [x] C8. Preparar o cálculo de eficiência (sem mudar resultados)

Ficheiros: altera `src/domain/efficiency.ts`, `src/domain/efficiency.test.ts`

Esta tarefa só prepara a estrutura. Os resultados ficam iguais e os testes atuais têm de continuar a passar.

1. Acrescenta as opções:

   ```ts
   export interface EfficiencyOptions {
     /** Capacidade útil da bateria em kWh; null desliga o cálculo pela % da bateria. */
     batteryCapacityKwh: number | null
   }

   const DEFAULT_OPTIONS: EfficiencyOptions = { batteryCapacityKwh: null }
   ```

2. `computeEfficiencyPoints` ganha um 4.º parâmetro `options: EfficiencyOptions = DEFAULT_OPTIONS`.
3. Em `EfficiencyPoint`, acrescenta:

   ```ts
   /** Km usados para dividir: os do conta-quilómetros ou, quando conhecidos, só os feitos nesta energia. */
   distanceKm: number
   /** 'total' = conta-quilómetros; 'mode' = só km em elétrico (ou só a combustível). */
   kmBasis: 'total' | 'mode'
   /** 'charged' = energia carregada; 'battery' = calculada pela % da bateria. */
   energyMethod: 'charged' | 'battery'
   ```

4. Em `Item`, acrescenta `batteryStartPct: number | null`, `batteryEndPct: number | null`, `electricKm: number | null` e `fullTank: boolean`. Em `toItems`, preenche:
   - sessões: `batteryStartPct: s.batteryStartPct`, `batteryEndPct: s.batteryEndPct`, `electricKm: s.electricKm ?? null`, `fullTank: true`;
   - abastecimentos: `batteryStartPct: null`, `batteryEndPct: null`, `electricKm: null`, `fullTank: e.fullTank !== false`.
5. No ciclo, troca `let previousKm: number | null = null` por `let previous: Item | null = null` e usa `previous.odometerKm!` onde antes usavas `previousKm`. No fim do bloco, `previous = item` em vez de `previousKm = item.odometerKm`.
6. No `points.push`, acrescenta `distanceKm: kmDriven`, `kmBasis: 'total'` e `energyMethod: 'charged'`, e calcula `consumptionPer100Km` e `costPer100Km` com `distanceKm` em vez de `kmDriven`.
7. Em `summarizeEfficiency`, troca **todos** os `p.kmDriven` por `p.distanceKm`. O campo `kmDriven` do resumo passa a ser a soma de `distanceKm`; acrescenta-lhe o comentário `/** Soma dos km usados para dividir (ver EfficiencyPoint.distanceKm). */`.

**Pronto quando:** todos os testes existentes passam sem alterações.

### - [x] C9. Combustível: consumo só entre depósitos cheios

Ficheiros: altera `src/domain/efficiency.ts`, `src/domain/efficiency.test.ts`

1. No ciclo, troca a condição `if (item.odometerKm === null) continue` por:

   ```ts
   // No âmbito do combustível, um abastecimento parcial não fecha o intervalo: os litros passam para o próximo depósito cheio.
   const closesInterval = item.odometerKm !== null && (scope !== 'fuel' || item.fullTank)
   if (!closesInterval) continue
   ```

2. Teste: abastecimentos com 1000 km, cheio, 40 L; 1200 km, **parcial**, 10 L; 1500 km, cheio, 25 L. No âmbito `'fuel'` → um só ponto, no de 1500 km, com `quantity: 35`, `kmDriven: 500` e `consumptionPer100Km: 7`.
3. Teste: um abastecimento sem o campo `fullTank` (registo antigo) conta como cheio.

**Pronto quando:** os 2 testes novos e os antigos passam.

### - [x] C10. Elétrico: energia gasta pela % da bateria

Ficheiros: altera `src/domain/efficiency.ts`, `src/domain/efficiency.test.ts`

1. Acrescenta esta função no ficheiro (fora de `computeEfficiencyPoints`):

   ```ts
   /**
    * Energia gasta entre duas leituras, pela bateria: o que havia no fim do carregamento anterior,
    * menos o que havia no início deste, mais o que foi carregado pelo meio. Null se faltar algum dado.
    */
   function energyFromBattery(
     previous: Item,
     current: Item,
     chargedBetween: number,
     costBetween: number | null,
     capacityKwh: number | null,
   ): { quantity: number; cost: number | null } | null {
     if (
       capacityKwh === null ||
       previous.batteryEndPct === null ||
       current.batteryStartPct === null
     )
       return null
     const fromBattery = ((previous.batteryEndPct - current.batteryStartPct) / 100) * capacityKwh
     const quantity = fromBattery + chargedBetween
     if (quantity <= 0) return null
     // A energia que estava na bateria foi paga ao preço do carregamento anterior.
     const previousPrice =
       previous.cost !== null && previous.quantity > 0 ? previous.cost / previous.quantity : null
     const cost =
       previousPrice === null || costBetween === null
         ? null
         : fromBattery * previousPrice + costBetween
     return { quantity, cost }
   }
   ```

2. No ciclo, **antes** de somar o item atual a `quantity` e `cost`, guarda os valores do que já estava acumulado:

   ```ts
   const chargedBetween = quantity
   const costBetween = cost
   ```

3. Dentro do `if (kmDriven > 0)`, antes do `points.push`, troca as constantes por variáveis e aplica o método da bateria só no âmbito elétrico:

   ```ts
   let pointQuantity = scope === 'all' ? null : quantity
   let pointCost = cost
   let energyMethod: EfficiencyPoint['energyMethod'] = 'charged'
   if (scope === 'electric' && previous !== null) {
     const fromBattery = energyFromBattery(
       previous,
       item,
       chargedBetween,
       costBetween,
       options.batteryCapacityKwh,
     )
     if (fromBattery) {
       pointQuantity = fromBattery.quantity
       pointCost = fromBattery.cost
       energyMethod = 'battery'
     }
   }
   ```

   Usa `pointQuantity`, `pointCost` e `energyMethod` no `points.push`.

4. Testes, todos com âmbito `'electric'` e `{ batteryCapacityKwh: 50 }`:
   1. A: 1000 km, termina a 80%, 40 kWh, 8 €. B: 1300 km, começa a 20%, 5 kWh. → ponto B com `quantity: 30`, `consumptionPer100Km: 10`, `cost: 6` (30 kWh × 0,20 €), `energyMethod: 'battery'`.
   2. Igual, mas com um carregamento X **sem km** entre A e B (10 kWh, 2 €) e B a começar a 40%. → `quantity: 30` (20 da bateria + 10 de X), `cost: 6` (20 × 0,20 + 2).
   3. B sem `batteryStartPct` → `quantity: 5`, `energyMethod: 'charged'` (como hoje).
   4. Sem capacidade (`batteryCapacityKwh: null`) → como hoje.
   5. A termina a 20% e B começa a 30% (energia negativa) → como hoje.
   6. No âmbito `'all'` com os dados do caso 1 → como hoje (o método da bateria só se aplica ao âmbito elétrico).

**Pronto quando:** os 6 testes novos e os antigos passam.

### - [x] C11. Elétrico: dividir pelos km feitos em elétrico

Ficheiros: altera `src/domain/efficiency.ts`, `src/domain/efficiency.test.ts`

1. No início do ciclo, junto a `quantity`, `cost` e `entries`, acrescenta `let electricKm: number | null = 0`.
2. Onde se soma o item atual, acrescenta `electricKm = electricKm === null || item.electricKm === null ? null : electricKm + item.electricKm`.
3. Onde se põem a zero `quantity`, `cost` e `entries` no fim do bloco, põe também `electricKm = 0`.
4. Dentro do `if (kmDriven > 0)`, a seguir ao bloco de C10:

   ```ts
   let distanceKm = kmDriven
   let kmBasis: EfficiencyPoint['kmBasis'] = 'total'
   if (scope === 'electric' && electricKm !== null && electricKm > 0) {
     distanceKm = electricKm
     kmBasis = 'mode'
   }
   ```

   Usa `distanceKm` e `kmBasis` no `points.push`.

5. Testes (âmbito `'electric'`, sem capacidade):
   1. A: 1000 km. B: 1300 km, 30 kWh, `electricKm: 200` → `distanceKm: 200`, `kmDriven: 300`, `consumptionPer100Km: 15`, `kmBasis: 'mode'`.
   2. Com um carregamento X sem km entre A e B, com `electricKm: 50`, e B com `electricKm: 150` → `distanceKm: 200`.
   3. Igual ao anterior mas X sem `electricKm` → `distanceKm: 300`, `kmBasis: 'total'`.

**Pronto quando:** os 3 testes novos e os antigos passam.

### - [x] C12. Combustível: tirar os km feitos em elétrico

Ficheiros: altera `src/domain/efficiency.ts`, `src/domain/efficiency.test.ts`

1. Acrescenta esta função no ficheiro:

   ```ts
   /**
    * Km em elétrico registados nos carregamentos entre dois abastecimentos (aproximado: cada
    * carregamento conta os km desde o anterior). Null se não houver carregamentos ou algum não os tiver.
    */
   function electricKmBetween(
     sessions: ChargingSession[],
     fromStartAt: string,
     toStartAt: string,
   ): number | null {
     const between = sessions.filter(
       (s) => !s.isLive && s.startAt > fromStartAt && s.startAt <= toStartAt,
     )
     if (between.length === 0 || between.some((s) => s.electricKm == null)) return null
     return between.reduce((acc, s) => acc + s.electricKm!, 0)
   }
   ```

2. Dentro do `if (kmDriven > 0)`, a seguir ao bloco de C11:

   ```ts
   if (scope === 'fuel' && previous !== null) {
     const evKm = electricKmBetween(sessions, previous.startAt, item.startAt)
     if (evKm !== null && kmDriven - evKm > 0) {
       distanceKm = kmDriven - evKm
       kmBasis = 'mode'
     }
   }
   ```

3. Testes (âmbito `'fuel'`):
   1. F1: 1000 km, cheio. Carregamento S entre os dois, `electricKm: 150`. F2: 1500 km, cheio, 20 L → `distanceKm: 350`, `consumptionPer100Km` ≈ 5,71 (usa `toBeCloseTo`), `kmBasis: 'mode'`.
   2. S sem `electricKm` → `distanceKm: 500`, `consumptionPer100Km: 4`.
   3. Sem carregamentos entre F1 e F2 → `distanceKm: 500`.

**Pronto quando:** os 3 testes novos e os antigos passam.

### - [x] C13. Passar a capacidade da bateria até às estatísticas

Ficheiros: altera `src/App.tsx`, `src/features/stats/StatsScreen.tsx`, `src/features/stats/EntryEfficiencyView.tsx`, `src/features/stats/MonthlyCharts.tsx`, `src/domain/monthly.ts`

1. Em `App.tsx`: `const batteryCapacityKwh = useMemo(() => effectiveBatteryCapacity(settings.batteryCapacityKwh, sessions), [settings.batteryCapacityKwh, sessions])` e passa `batteryCapacityKwh={batteryCapacityKwh}` ao `StatsScreen`.
2. `StatsScreen`: nova prop `batteryCapacityKwh: number | null`. Passa-a a `EntryEfficiencyView` e `MonthlyCharts` (prop com o mesmo nome) e usa-a no `computeEfficiencyPoints` de C2: `computeEfficiencyPoints(sessions, fuelEntries, filter, { batteryCapacityKwh })` (acrescenta-a às dependências do `useMemo`).
3. `EntryEfficiencyView`: nova prop igual, usada em `computeEfficiencyPoints(…, { batteryCapacityKwh })` e nas dependências do `useMemo`.
4. `computeMonthlySummaries` em `monthly.ts`: novo 4.º parâmetro `options: EfficiencyOptions = { batteryCapacityKwh: null }`, passado às três chamadas a `computeEfficiencyPoints`.
5. `MonthlyCharts`: nova prop igual, passada como `computeMonthlySummaries(sessions, fuelEntries, months, { batteryCapacityKwh })`.
6. Atualiza os testes que fazem `render(<StatsScreen … />)` para passarem `batteryCapacityKwh={null}`.

**Pronto quando:** `npx tsc -b` e todos os testes passam.

### - [x] C14. Textos do ecrã de estatísticas

Ficheiros: altera `src/features/stats/EntryEfficiencyView.tsx`, `src/features/stats/StatsScreen.tsx`, `src/features/stats/StatsScreen.test.tsx`

1. Subtítulos do gráfico "Por registo":
   - Elétrico: "Energia gasta ÷ km desde o carregamento anterior. Usa a % da bateria quando a registas."
   - Combustível: "Litros ÷ km entre depósitos cheios."
   - Ambos: fica igual.
2. Em `renderDetails`, a primeira linha passa a ser:
   - se `p.kmBasis === 'mode'` e o âmbito é elétrico: `${formatDecimal(p.distanceKm, 0)} km em elétrico (de ${formatDecimal(p.kmDriven, 0)} no total)`;
   - se `p.kmBasis === 'mode'` e o âmbito é combustível: `${formatDecimal(p.distanceKm, 0)} km a combustível (de ${formatDecimal(p.kmDriven, 0)} no total)`;
   - senão, como hoje.
3. Também em `renderDetails`, acrescenta à lista `p.energyMethod === 'battery' ? 'calculado pela % da bateria' : null`.
4. Na tabela, a coluna "km" passa a mostrar `p.distanceKm`.
5. No cartão de média do "Por registo" e no cartão "Custo médio por km" do Resumo, o texto "Em X km" / "Baseado em X km percorridos" passa a usar `summary.kmDriven` (já é a soma de `distanceKm`, desde C8).
6. Muda o parágrafo final do "Por registo" para: "Registos sem km não têm linha própria: o que foi carregado ou abastecido conta para o registo seguinte com km. Abastecimentos parciais contam para o próximo depósito cheio."
7. Atualiza os testes de `StatsScreen.test.tsx` que procuram os subtítulos antigos.

**Pronto quando:** todos os testes passam.

### - [x] C15. Atualizar o README

Ficheiros: altera `README.md`

Troca a linha das estatísticas por:

> **Estatísticas** — totais e médias de energia, combustível e custo; consumo e custo por 100 km calculados pela % da bateria (quando registada), só entre depósitos cheios no combustível e, num híbrido plug-in, separando os km feitos em elétrico.

**Pronto quando:** `npm run format:check` passa.

### - [ ] C16. Verificação manual com o caso real

Sem alterações de código.

1. `npm run dev`. Em Definições, põe a capacidade da bateria a 50 kWh.
2. Cria: carregamento dia 1 com 1000 km, 20→80%, 30 kWh, 6 €; carregamento dia 5 com 1300 km, 20→30%, 5 kWh; carregamento dia 6 com 1305 km, 29→100%, 36 kWh.
3. Estatísticas → Por registo → Elétrico: o dia 5 mostra cerca de 10 kWh/100 km e o dia 6 cerca de 10 kWh/100 km. Antes destas correções davam 1,7 e 720.
4. Apaga a capacidade (campo vazio) com menos de 3 carregamentos com % → os valores voltam ao método antigo e aparece a frase "Para estimar…".
5. Cria dois abastecimentos cheios e um parcial entre eles → só aparece um ponto de combustível.

**Pronto quando:** os 5 passos dão o resultado indicado.
