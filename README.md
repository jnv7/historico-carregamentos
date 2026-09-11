# Histórico de Carregamentos

Webapp para telemóvel para registar um diário de carregamentos elétricos do carro: calendário de registos, modo "live" (começar/terminar), estatísticas, tarifas configuráveis e cópias de segurança em ficheiro.

## Funcionalidades

- **Registos num calendário** — cada carregamento fica associado a um dia; só a data e a energia (kWh) são obrigatórias, tudo o resto é opcional.
- **Carregamento "live"** — começar agora, terminar mais tarde e só nessa altura preencher os detalhes.
- **Tarifas** — até 3 tarifas com intervalo horário; o custo é sugerido automaticamente com base na tarifa ativa à hora do carregamento (mas pode ser sempre substituído manualmente).
- **Estatísticas** — totais e médias de energia e custo, custo médio por kWh e por km (a partir da quilometragem registada).
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

## Deploy

O workflow em `.github/workflows/deploy.yml` corre lint + type-check + testes + build em cada push/PR, e publica automaticamente `dist/` no GitHub Pages sempre que há um push para `main` (depois de o `Settings → Pages → Source` do repositório estar definido como "GitHub Actions").
