# Gemini ATS (Electron + React)

App desktop para otimizar currículo para ATS em menos de 1 minuto por vaga.

## Funcionalidades
- Perfil do usuário salvo localmente em JSON (`electron-store`).
- BYOK com chave da API salva no cofre do sistema (`keytar`).
- Análise de vaga com IA (retorno JSON estruturado).
- Geração de currículo ATS com IA (retorno JSON estruturado).
- Exportação para PDF ATS-friendly (layout simples, sem colunas/gráficos).

## Stack
- Electron
- React + Vite
- Gemini SDK (`@google/genai`)
- `electron-store`
- `keytar`
- `puppeteer`

## Executar
```bash
npm.cmd install
npm.cmd run dev
```

## Build de frontend
```bash
npm.cmd run build
```

## Fluxo no app
1. Salve a API Key na seção de configurações.
2. Preencha e salve o perfil do usuário.
3. Cole a descrição da vaga e clique em **Analisar vaga**.
4. Clique em **Gerar currículo ATS**.
5. Clique em **Exportar PDF ATS**.

## Observação
Implementação atual focada em Gemini. A camada de serviço pode ser estendida para OpenAI/Claude adicionando seletor de provider na UI e adaptadores de chamada.
