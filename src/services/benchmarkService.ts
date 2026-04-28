import axios from 'axios';

const BENCHMARK_APIS = [
  `${import.meta.env.DEV ? '/api-proxy' : 'https://nmbcoamazonia-api.vercel.app'}/google/sheets/1HykUxjCGGdveDS_5vlLOOkAq7Wkl058453xkYGTAzNM/data?range=Bench`,
  `${import.meta.env.DEV ? '/api-proxy' : 'https://nmbcoamazonia-api.vercel.app'}/google/sheets/1abcar-ESRB_f8ytKGQ_ru_slZ67cXhjxKt8gL7TrEVw/data?range=Bench`
];

export interface BenchmarkData {
  veiculo: string;
  tipoDeCompra: string;
  tipoMidia: string; // "estatico" ou "video"
  impressoes: number;
  cliques: number;
  views: number;
  views100: number;
  engajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

interface BenchmarkApiResponse {
  success: boolean;
  data: {
    range: string;
    majorDimension: string;
    values: string[][];
    totalRows: number;
    totalColumns: number;
  };
}

/**
 * Converte string de porcentagem para número
 * Ex: "0,28%" -> 0.28
 */
const parsePercentage = (value: string): number => {
  if (!value || value === '0') return 0;
  // Remove o símbolo % e substitui vírgula por ponto
  const numStr = value.replace('%', '').replace(',', '.');
  return parseFloat(numStr) || 0;
};

/**
 * Converte string numérica para número
 */
const parseNumber = (value: string): number => {
  if (!value || value === '0') return 0;
  // Remove pontos de milhar e substitui vírgula decimal por ponto
  const numStr = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(numStr) || 0;
};

/**
 * Busca dados de benchmark de uma API
 */
const fetchBenchmarkFromApi = async (apiUrl: string): Promise<BenchmarkData[]> => {
  try {
    const response = await axios.get<BenchmarkApiResponse>(apiUrl);

    if (!response.data.success || !response.data.data.values) {
      console.warn(`Benchmark API ${apiUrl} retornou dados inválidos`);
      return [];
    }

    const values = response.data.data.values;

    // Ignora o cabeçalho (primeira linha) e a última linha (totais)
    const dataRows = values.slice(1, -1);

    return dataRows.map(row => {
      // Estrutura esperada:
      // [0] Veículo, [1] Tipo de Compra, [2] Estatico/Video, [3] Impressões,
      // [4] Cliques, [5] Views, [6] Views 100%, [7] Engajamentos,
      // [8] CTR, [9] VTR, [10] Taxa de Engajamento

      return {
        veiculo: row[0] || '',
        tipoDeCompra: row[1] || '',
        tipoMidia: row[2]?.toLowerCase() || 'estatico',
        impressoes: parseNumber(row[3] || '0'),
        cliques: parseNumber(row[4] || '0'),
        views: parseNumber(row[5] || '0'),
        views100: parseNumber(row[6] || '0'),
        engajamentos: parseNumber(row[7] || '0'),
        ctr: parsePercentage(row[8] || '0'),
        vtr: parsePercentage(row[9] || '0'),
        taxaEngajamento: parsePercentage(row[10] || '0')
      };
    }).filter(item => item.veiculo && item.tipoDeCompra); // Remove linhas inválidas
  } catch (error) {
    console.error(`Erro ao buscar benchmark de ${apiUrl}:`, error);
    return [];
  }
};

/**
 * Cria uma chave única para agrupar benchmarks
 */
const getBenchmarkKey = (veiculo: string, tipoDeCompra: string, tipoMidia: string): string => {
  return `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|${tipoMidia.toLowerCase()}`;
};

/**
 * Agrupa e soma métricas de benchmarks com mesma chave
 */
const aggregateBenchmarks = (benchmarks: BenchmarkData[]): Map<string, BenchmarkData> => {
  const aggregated = new Map<string, BenchmarkData>();

  benchmarks.forEach(benchmark => {
    const key = getBenchmarkKey(benchmark.veiculo, benchmark.tipoDeCompra, benchmark.tipoMidia);

    if (!aggregated.has(key)) {
      aggregated.set(key, { ...benchmark });
    } else {
      const existing = aggregated.get(key)!;

      // Soma as métricas absolutas
      existing.impressoes += benchmark.impressoes;
      existing.cliques += benchmark.cliques;
      existing.views += benchmark.views;
      existing.views100 += benchmark.views100;
      existing.engajamentos += benchmark.engajamentos;
    }
  });

  // Recalcula as taxas baseado nos totais
  aggregated.forEach(benchmark => {
    if (benchmark.impressoes > 0) {
      benchmark.ctr = (benchmark.cliques / benchmark.impressoes) * 100;
      benchmark.vtr = (benchmark.views100 / benchmark.impressoes) * 100;
      benchmark.taxaEngajamento = (benchmark.engajamentos / benchmark.impressoes) * 100;
    }
  });

  return aggregated;
};

/**
 * Cache para os dados de benchmark
 */
let benchmarkCache: Map<string, BenchmarkData> | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Busca e processa dados de benchmark de ambas as APIs
 * Retorna um Map com chave "veiculo|tipoDeCompra|tipoMidia"
 */
export const fetchAllBenchmarks = async (): Promise<Map<string, BenchmarkData>> => {
  // Verifica se o cache ainda é válido
  const now = Date.now();
  if (benchmarkCache && (now - lastFetchTime) < CACHE_DURATION) {
    return benchmarkCache;
  }

  console.log('Buscando dados de benchmark das APIs...');

  try {
    // Busca dados de ambas as APIs em paralelo
    const results = await Promise.all(
      BENCHMARK_APIS.map(api => fetchBenchmarkFromApi(api))
    );

    // Combina todos os resultados
    const allBenchmarks = results.flat();

    console.log(`Total de linhas de benchmark encontradas: ${allBenchmarks.length}`);

    // Agrupa e calcula as métricas finais
    benchmarkCache = aggregateBenchmarks(allBenchmarks);
    lastFetchTime = now;

    console.log(`Benchmarks únicos processados: ${benchmarkCache.size}`);

    return benchmarkCache;
  } catch (error) {
    console.error('Erro ao buscar benchmarks:', error);
    return new Map();
  }
};

/**
 * Busca benchmark específico para um criativo
 */
export const getBenchmarkForCreative = async (
  veiculo: string,
  tipoDeCompra: string,
  tipoMidia: string
): Promise<BenchmarkData | null> => {
  const benchmarks = await fetchAllBenchmarks();
  const key = getBenchmarkKey(veiculo, tipoDeCompra, tipoMidia);

  return benchmarks.get(key) || null;
};

/**
 * Força atualização do cache (útil para desenvolvimento)
 */
export const refreshBenchmarkCache = async (): Promise<void> => {
  benchmarkCache = null;
  lastFetchTime = 0;
  await fetchAllBenchmarks();
};
