import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from 'ioredis';

interface AnalysisRequest {
  dataKey: string;
  analysis?: string;
  date?: string;
}

interface HistoryEntry {
  date: string;
  analysis: string;
  timestamp: string;
}

const redisUrl = process.env.REDIS_URL || '';

let redis: Redis;
try {
  redis = new Redis(redisUrl, {
    tls: redisUrl.startsWith('rediss://') ? {} : undefined,
    maxRetriesPerRequest: 3,
    connectTimeout: 10000,
  });
} catch (e) {
  console.error('Erro ao criar cliente Redis:', e);
  redis = new Redis(redisUrl);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('📥 Request recebida:', req.method, req.url);
    console.log('🔌 Redis URL configurado?', !!redisUrl, '| Prefixo:', redisUrl.substring(0, 10) + '...');

    // Verifica se é uma requisição de histórico
    if (req.method === 'GET' && req.url?.includes('/history')) {
      const dataKey = req.query.dataKey as string;

      if (!dataKey) {
        return res.status(400).json({ error: 'dataKey é obrigatório' });
      }

      const history: HistoryEntry[] = [];
      const today = new Date();

      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const cacheKey = `analysis:${dateStr}:${dataKey}`;

        const cached = await redis.get(cacheKey);
        const timestamp = await redis.get(`${cacheKey}:timestamp`);

        if (cached) {
          history.push({
            date: dateStr,
            analysis: cached,
            timestamp: timestamp || new Date(date).toISOString()
          });
        }
      }

      return res.status(200).json(history);
    }

    const dataKey = req.method === 'GET'
      ? (req.query.dataKey as string)
      : (req.body as AnalysisRequest).dataKey;

    const analysis = req.method === 'POST'
      ? (req.body as AnalysisRequest).analysis
      : undefined;

    const requestDate = req.method === 'GET'
      ? (req.query.date as string)
      : undefined;

    if (!dataKey) {
      return res.status(400).json({ error: 'dataKey é obrigatório' });
    }

    const targetDate = requestDate || new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${targetDate}:${dataKey}`;

    // GET - Buscar análise do cache
    if (req.method === 'GET' || !analysis) {
      console.log('🔍 Buscando no Redis, chave:', cacheKey);
      const cached = await redis.get(cacheKey);

      if (cached) {
        const timestamp = await redis.get(`${cacheKey}:timestamp`);
        console.log('✅ Cache HIT:', cacheKey);
        return res.status(200).json({
          analysis: cached,
          cached: true,
          timestamp: timestamp || new Date().toISOString()
        });
      }

      console.log('❌ Cache MISS:', cacheKey);
      return res.status(404).json({ cached: false, message: 'Análise não encontrada no cache' });
    }

    // POST - Salvar análise no cache
    if (req.method === 'POST' && analysis) {
      const timestamp = new Date().toISOString();

      // Salva por 30 dias (2592000 segundos)
      await redis.set(cacheKey, analysis, 'EX', 2592000);
      await redis.set(`${cacheKey}:timestamp`, timestamp, 'EX', 2592000);

      console.log('💾 Cache SAVED:', cacheKey);
      return res.status(200).json({ analysis, cached: false, timestamp, message: 'Análise salva no cache' });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (error: any) {
    console.error('❌ Erro na API de cache:', error.message);
    console.error('Redis URL configurado?', !!redisUrl);
    return res.status(500).json({
      error: 'Erro ao processar requisição',
      message: error.message
    });
  }
}
