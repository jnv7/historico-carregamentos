# Histórico de Carregamentos

Webapp para telemóvel para registar um diário de carregamentos elétricos do carro: calendário de registos, modo "live" (começar/terminar), estatísticas, tarifas configuráveis e cópias de segurança em ficheiro.

## Funcionalidades

- **Registos num calendário** — cada carregamento fica associado a um dia; só a data e a energia (kWh) são obrigatórias, tudo o resto é opcional.
- **Carregamento "live"** — começar agora e terminar mais tarde; os detalhes já conhecidos (bateria inicial, km, carregador, local) podem ser indicados logo no início ou durante o carregamento.
- **Tarifas** — até 3 tarifas com intervalo horário; o custo é sugerido automaticamente com base na tarifa ativa à hora do carregamento (mas pode ser sempre substituído manualmente).
- **Estatísticas** — totais e médias de energia e custo, custo médio por kWh e por km (a partir da quilometragem registada).
- **Novidades** — depois de cada atualização, uma janela mostra o que mudou (gerado a partir dos commits); o histórico completo está nas Definições.
- **Cópia de segurança** — exportar/importar todos os dados num ficheiro `.json`, com lembrete periódico configurável.
- **Apagar tudo** — com confirmação explícita.
- Dados guardados localmente no telemóvel (`localStorage`); nada é enviado para um servidor.
- Instalável como PWA (funciona offline depois da primeira visita).

Pensado para um único carro por agora, mas o modelo de dados já guarda um `carId` por registo para facilitar suporte a vários carros no futuro.

## Stack técnica

- [Vite](https://vite.dev) + [React](https://react.dev) + TypeScript
- [Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com) para testes
- [oxlint](https://oxc.rs) para lint, [Prettier](https://prettier.io) para formatação
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) para o service worker/manifesto
- Deploy automático para GitHub Pages via GitHub Actions

## Desenvolvimento

```bash
npm install
npm run dev           # servidor de desenvolvimento
npm run test          # testes em modo watch
npm run test:run      # testes (execução única, usado em CI)
npm run lint          # oxlint
npm run format        # prettier --write
npm run format:check  # prettier --check (usado em CI)
npm run build         # build de produção em dist/
```

Todas as funcionalidades têm testes automatizados (`*.test.ts` / `*.test.tsx` ao lado do código).

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

Na compilação, o mesmo histórico alimenta a janela "Novidades" (mostrada uma só vez depois de cada atualização, com no máximo 5 frases) e o ficheiro `CHANGELOG.md` publicado junto com a app. Em `npm run dev` o changelog é lido quando o servidor arranca: reinicia-o depois de um commit novo.

## Deploy

O workflow em `.github/workflows/deploy.yml` corre lint + type-check + testes + build em cada push/PR, e publica automaticamente `dist/` no GitHub Pages sempre que há um push para `main` (depois de o `Settings → Pages → Source` do repositório estar definido como "GitHub Actions").
