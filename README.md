# Prompt Coach

Aplicação web que avalia um prompt escrito pelo usuário e devolve uma versão melhorada dele. Agora com uma API local em Express que guarda a chave da OpenRouter no servidor — ela nunca fica exposta no navegador.

## Para que serve

Quando alguém escreve um prompt para usar em uma IA (ChatGPT, Claude, etc.), é comum esquecer de dar contexto, ser vago sobre o formato de resposta esperado, ou não ser específico o suficiente — e isso resulta em respostas ruins e tempo/tokens desperdiçados.

O **Prompt Coach** resolve um problema específico: você cola o prompt que pretende usar, e o sistema:

1. Dá uma **nota de 0 a 10** para o prompt
2. Avalia **4 critérios** (clareza, contexto, especificidade e formato esperado da resposta), indicando quais o prompt atende ou não
3. Lista os **principais pontos fracos** do prompt
4. Entrega uma **versão reescrita e melhorada**, pronta para copiar e usar

Não é um chat genérico: a entrada é sempre um prompt, e a saída é sempre uma avaliação estruturada no mesmo formato.

## Arquitetura

```
prompt-coach/
├── server.js        → API local em Express (guarda a chave e fala com a OpenRouter)
├── package.json
├── .env.example      → modelo do arquivo de variáveis de ambiente
├── .gitignore
├── public/            → front-end estático, servido pelo próprio Express
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   └── imgs/
│       └── favicon.png
└── README.md
```

- **Entrada:** o usuário cola um prompt no front-end e clica em "Avaliar prompt".
- **Processamento:** o `script.js` envia esse prompt para `POST /api/llm` (rota do próprio servidor Express, na mesma porta). O `server.js` recebe esse prompt, monta a chamada completa — com as instruções de avaliação e a chave guardada no `.env` — e a envia para a OpenRouter (`https://openrouter.ai/api/v1/chat/completions`).
- **Saída:** o `server.js` devolve o texto do modelo para o front-end, que interpreta o JSON e exibe o medidor de nota, os critérios, os pontos fracos e o prompt melhorado.

A chave de API **nunca chega ao navegador** — ela existe só no `.env`, lido pelo `server.js` no servidor.

## Como instalar e executar

### 1. Pré-requisitos

- [Node.js](https://nodejs.org) instalado (versão 18 ou superior, por causa do `fetch` nativo)
- Uma chave de API gratuita da OpenRouter

### 2. Criar sua chave de API da OpenRouter

1. Acesse [openrouter.ai](https://openrouter.ai) e crie uma conta gratuita
2. Vá em **Keys** (ou acesse [openrouter.ai/keys](https://openrouter.ai/keys)) e clique em **Create Key**
3. Copie a chave gerada (começa com `sk-or-v1-...`)

Não é necessário cadastrar cartão de crédito para usar modelos gratuitos. Contas sem créditos têm um número limitado de requisições gratuitas por dia — suficiente para testar o projeto.

### 3. Configurar o projeto

```bash
cd prompt-coach
npm install
cp .env.example .env
```

Abra o arquivo `.env` e cole sua chave:

```
OPENROUTER_API_KEY=sk-or-v1-sua-chave-aqui
```

### 4. Rodar

```bash
npm start
```

Isso inicia o servidor Express em `http://localhost:3000`, que já serve o front-end (pasta `public/`) e a API (`/api/llm`, `/api/status`) na mesma porta.

Abra `http://localhost:3000` no navegador.

### 5. Usar

1. Verifique o indicador no topo da página: se estiver verde, o servidor local está respondendo
2. Cole um prompt no painel "seu prompt" (limite de 2000 caracteres)
3. Clique em **Avaliar prompt →**
4. Veja a nota, os critérios, os pontos fracos e o prompt melhorado no painel da direita
5. Clique em **Copiar prompt melhorado** para usá-lo onde quiser

## Solução de problemas

| Sintoma | Causa provável | Solução |
|---|---|---|
| Indicador vermelho "servidor local não encontrado" | O `npm start` não está rodando | Rode `npm start` no terminal, na pasta do projeto |
| `Erro: configure OPENROUTER_API_KEY` ao iniciar | Faltou criar o `.env` ou colar a chave | Copie `.env.example` para `.env` e cole sua chave |
| Erro com `status: 401` ou `403` ao avaliar | Chave de API inválida ou sem permissão | Gere uma nova chave em openrouter.ai/keys |
| Erro com `status: 429` | Limite diário de requisições gratuitas esgotado | Aguarde o reset diário ou adicione créditos na conta OpenRouter |
| "Não foi possível interpretar a resposta do modelo como JSON" | O modelo não seguiu o formato pedido | Tente novamente; raramente o modelo gratuito ignora a instrução de formato |

## Limitações conhecidas

- O modelo é fixo no `server.js` (`openai/gpt-oss-120b:free`); para trocar, edite a constante `MODEL`.
- Não há histórico de avaliações anteriores — cada avaliação é independente.
- Modelos gratuitos podem ocasionalmente não seguir o formato JSON pedido; o front-end tenta se recuperar disso, mas pode falhar em casos raros.
