import axios from 'axios';
import { format, subDays } from 'date-fns';

interface CacheResponse {
  analysis: string;
  cached: boolean;
  timestamp: string;
}

interface HistoryEntry {
  date: string;
  analysis: string;
  timestamp: string;
}

const CACHE_API_URL = import.meta.env.PROD
  ? '/api/analysis'  // Produção (Vercel)
  : null;            // Local (usa localStorage)

/**
 * Busca análise do cache
 */
export const getCachedAnalysis = async (dataKey: string): Promise<CacheResponse | null> => {
  try {
    // Produção: Busca do Redis via API
    if (CACHE_API_URL) {
      try {
        const response = await axios.get(CACHE_API_URL, {
          params: { dataKey },
          timeout: 5000
        });
        console.log('📦 Cache Redis HIT:', dataKey);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('❌ Cache Redis MISS:', dataKey);
          return null;
        }
        throw error;
      }
    }

    // Local: Usa localStorage
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${today}:${dataKey}`;

    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}:timestamp`);

    if (cached) {
      console.log('📦 Cache localStorage HIT:', cacheKey);
      return {
        analysis: cached,
        cached: true,
        timestamp: timestamp || new Date().toISOString()
      };
    }

    console.log('❌ Cache localStorage MISS:', cacheKey);
    return null;

  } catch (error) {
    console.error('Erro ao buscar cache:', error);
    return null;
  }
};

/**
 * Salva análise no cache
 */
export const setCachedAnalysis = async (
  dataKey: string,
  analysis: string
): Promise<void> => {
  try {
    const timestamp = new Date().toISOString();

    // Produção: Salva no Redis via API
    if (CACHE_API_URL) {
      await axios.post(CACHE_API_URL, {
        dataKey,
        analysis
      });
      console.log('💾 Cache Redis SAVED:', dataKey);
      return;
    }

    // Local: Salva no localStorage
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `analysis:${today}:${dataKey}`;

    localStorage.setItem(cacheKey, analysis);
    localStorage.setItem(`${cacheKey}:timestamp`, timestamp);

    console.log('💾 Cache localStorage SAVED:', cacheKey);

    // Limpa cache antigo (mais de 2 dias)
    cleanOldCache();

  } catch (error) {
    console.error('Erro ao salvar cache:', error);
  }
};

/**
 * Busca histórico de análises dos últimos 30 dias
 */
export const getAnalysisHistory = async (dataKey: string): Promise<HistoryEntry[]> => {
  try {
    const history: HistoryEntry[] = [];

    // Produção: Busca do Redis via API
    if (CACHE_API_URL) {
      try {
        const response = await axios.get(`${CACHE_API_URL}/history`, {
          params: { dataKey },
          timeout: 10000
        });
        console.log('📚 Histórico Redis carregado:', response.data.length, 'entradas');
        return response.data;
      } catch (error: any) {
        console.error('Erro ao buscar histórico Redis:', error);
        return [];
      }
    }

    // Local: Busca no localStorage dos últimos 30 dias
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const cacheKey = `analysis:${dateStr}:${dataKey}`;

      const cached = localStorage.getItem(cacheKey);
      const timestamp = localStorage.getItem(`${cacheKey}:timestamp`);

      if (cached) {
        history.push({
          date: dateStr,
          analysis: cached,
          timestamp: timestamp || new Date(date).toISOString()
        });
      }
    }

    console.log('📚 Histórico localStorage carregado:', history.length, 'entradas');
    return history;

  } catch (error) {
    console.error('Erro ao buscar histórico:', error);
    return [];
  }
};

/**
 * Busca análise de uma data específica
 */
export const getAnalysisByDate = async (
  dataKey: string,
  date: string
): Promise<CacheResponse | null> => {
  try {
    // Produção: Busca do Redis via API
    if (CACHE_API_URL) {
      try {
        const response = await axios.get(CACHE_API_URL, {
          params: { dataKey, date },
          timeout: 5000
        });
        console.log('📦 Cache Redis HIT (data específica):', date);
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 404) {
          console.log('❌ Cache Redis MISS (data específica):', date);
          return null;
        }
        throw error;
      }
    }

    // Local: Busca no localStorage
    const cacheKey = `analysis:${date}:${dataKey}`;
    const cached = localStorage.getItem(cacheKey);
    const timestamp = localStorage.getItem(`${cacheKey}:timestamp`);

    if (cached) {
      console.log('📦 Cache localStorage HIT (data específica):', date);
      return {
        analysis: cached,
        cached: true,
        timestamp: timestamp || new Date().toISOString()
      };
    }

    console.log('❌ Cache localStorage MISS (data específica):', date);
    return null;

  } catch (error) {
    console.error('Erro ao buscar análise por data:', error);
    return null;
  }
};

/**
 * Limpa cache antigo do localStorage (mais de 30 dias)
 */
const cleanOldCache = () => {
  try {
    const keys = Object.keys(localStorage);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const cutoffDate = format(thirtyDaysAgo, 'yyyy-MM-dd');

    keys.forEach(key => {
      if (key.startsWith('analysis:')) {
        const dateMatch = key.match(/analysis:(\d{4}-\d{2}-\d{2}):/);
        if (dateMatch && dateMatch[1] < cutoffDate) {
          localStorage.removeItem(key);
          console.log('🗑️ Cache antigo removido:', key);
        }
      }
    });
  } catch (error) {
    console.error('Erro ao limpar cache antigo:', error);
  }
};
