import express from "express";
import cors from "cors";
import "dotenv/config";

const app = express();
const PORT = 3000;
const API_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = "openai/gpt-oss-120b:free";

if (!API_KEY) {
    console.error("Erro: configure OPENROUTER_API_KEY no arquivo .env.");
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Instruções fixas enviadas ao modelo: definem o papel de avaliador de prompts
// e o formato JSON que o front-end espera receber de volta.
const SYSTEM_PROMPT = `Você é um avaliador especialista em engenharia de prompts.
Receberá um prompt escrito por um usuário, destinado a ser enviado a um modelo de IA.
Avalie esse prompt e responda APENAS com um objeto JSON válido (sem markdown, sem texto antes ou depois, sem crases), seguindo exatamente este formato:

{
  "nota": <número de 0 a 10, pode ter uma casa decimal>,
  "criterios": [
    {"nome": "Clareza", "atende": <true ou false>, "comentario": "<frase curta explicando, em português>"},
    {"nome": "Contexto", "atende": <true ou false>, "comentario": "<frase curta>"},
    {"nome": "Especificidade", "atende": <true ou false>, "comentario": "<frase curta>"},
    {"nome": "Formato esperado da resposta", "atende": <true ou false>, "comentario": "<frase curta>"}
  ],
  "pontos_fracos": ["<ponto fraco curto 1>", "<ponto fraco curto 2>"],
  "prompt_melhorado": "<uma versão reescrita e melhorada do prompt original, mantendo a intenção do usuário, mas mais clara, específica e com contexto e formato de resposta bem definidos>"
}

Liste no máximo 4 pontos fracos. Se o prompt já for muito bom, "pontos_fracos" pode ter só 1 item com uma sugestão de refinamento opcional. O campo "prompt_melhorado" nunca deve ficar vazio.`;

app.get("/api/status", (req, res) => {
    res.json({ status: "API local funcionando", model: MODEL });
});

app.post("/api/llm", async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt || prompt.trim().length === 0) {
            return res.status(400).json({ erro: "O campo prompt e obrigatorio." });
        }
        if (prompt.length > 2000) {
            return res.status(400).json({ erro: "Limite: 2000 caracteres." });
        }

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Prompt Coach"
            },
            body: JSON.stringify({
                model: MODEL,
                response_format: { type: "json_object" },
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: prompt }
                ],
                temperature: 0.4,
                max_completion_tokens: 900
            })
        });

        if (!response.ok) {
            const detalhe = await response.text();
            return res.status(502).json({
                erro: "Erro ao consultar o OpenRouter.",
                status: response.status,
                detalhe
            });
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;

        if (!text) {
            return res.status(502).json({ erro: "Resposta vazia ou inesperada." });
        }

        res.json({ modelo: MODEL, resposta: text, uso: data.usage ?? null });

    } catch (error) {
        res.status(500).json({ erro: "Erro interno no servidor.", detalhe: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
