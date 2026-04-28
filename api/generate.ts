import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

interface GenerateRequest {
  prompt: string;
  model?: string;
}

const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-3.5-turbo'];
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-1.5-flash'];

const callOpenAI = async (prompt: string, apiKey: string): Promise<string> => {
  for (const model of OPENAI_MODELS) {
    try {
      console.log(`🔄 Tentando OpenAI ${model}...`);
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model,
          messages: [
            { role: 'system', content: 'Você é um analista especializado em performance de mídia digital. Seja objetivo, factual e cite números específicos.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1500
        },
        {
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          timeout: 60000
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      if (content) {
        console.log(`✅ Análise gerada via OpenAI ${model}`);
        return content;
      }
    } catch (error: any) {
      const status = error.response?.status;
      console.warn(`⚠️ OpenAI ${model} falhou: ${status || 'rede'}`);
      // 401 = chave inválida, não adianta tentar outros modelos OpenAI
      if (status === 401) throw error;
      // Para outros erros (429, 500, timeout), tenta próximo modelo
    }
  }
  throw new Error('Todos os modelos OpenAI falharam');
};

const callGemini = async (prompt: string, apiKey: string): Promise<string> => {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }]
  };

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    try {
      console.log(`🔄 [${i + 1}/${GEMINI_MODELS.length}] Tentando Gemini ${model}...`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (content) {
        console.log(`✅ Análise gerada via Gemini ${model}`);
        return content;
      }
    } catch (error: any) {
      const status = error.response?.status;
      console.warn(`⚠️ Gemini ${model} falhou: ${status || 'rede'}`);
      // 400/403 = erro de configuração, não tenta mais
      if (status === 400 || status === 403) throw error;
      // Para 429/500/503, tenta próximo modelo com delay
      if (i < GEMINI_MODELS.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error('Todos os modelos Gemini falharam');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { prompt } = req.body as GenerateRequest;
  if (!prompt) return res.status(400).json({ error: 'prompt é obrigatório' });

  const openaiKey = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  const geminiKey = process.env.VITE_GEMINI_API || process.env.GEMINI_API_KEY;

  // Tenta OpenAI primeiro
  if (openaiKey) {
    try {
      const analysis = await callOpenAI(prompt, openaiKey);
      return res.status(200).json({ analysis, provider: 'openai' });
    } catch (error: any) {
      const status = error.response?.status;
      console.error(`❌ OpenAI falhou com status ${status}. Tentando Gemini como fallback...`);
      // Se for 401 e não tiver Gemini configurado, retorna erro direto
      if (status === 401 && !geminiKey) {
        return res.status(401).json({ error: 'Chave OpenAI inválida e Gemini não configurado' });
      }
    }
  }

  // Fallback: Gemini
  if (geminiKey) {
    try {
      const analysis = await callGemini(prompt, geminiKey);
      return res.status(200).json({ analysis, provider: 'gemini' });
    } catch (error: any) {
      console.error('❌ Gemini também falhou:', error.message);
    }
  }

  return res.status(500).json({
    error: 'Todos os provedores de IA falharam',
    message: !openaiKey && !geminiKey ? 'Nenhuma chave de API configurada no servidor' : 'OpenAI e Gemini indisponíveis'
  });
}
