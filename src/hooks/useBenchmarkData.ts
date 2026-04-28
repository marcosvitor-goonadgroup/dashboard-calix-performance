import { useState, useEffect, useMemo } from 'react';

export interface BenchmarkRow {
  veiculo: string;
  tipoDeCompra: string;
  tipo: string; // estatico/video
  impressoes: number;
  cliques: number;
  views: number;
  views100: number;
  engajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

export interface BenchmarkData {
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

export interface BenchmarkFilters {
  veiculo?: string;
  tipoDeCompra?: string;
  tipo?: 'estatico' | 'video';
}

const API_URLS = [
  `${import.meta.env.DEV ? '/api-proxy' : 'https://nmbcoamazonia-api.vercel.app'}/google/sheets/1abcar-ESRB_f8ytKGQ_ru_slZ67cXhjxKt8gL7TrEVw/data?range=Bench`,
  `${import.meta.env.DEV ? '/api-proxy' : 'https://nmbcoamazonia-api.vercel.app'}/google/sheets/1HykUxjCGGdveDS_5vlLOOkAq7Wkl058453xkYGTAzNM/data?range=Bench`
];

const parsePercentage = (value: string): number => {
  if (!value || value === '0') return 0;
  // Remove % e converte vírgula para ponto
  const cleaned = value.replace('%', '').replace(',', '.');
  return parseFloat(cleaned);
};

const parseNumber = (value: string): number => {
  if (!value || value === '0') return 0;
  // Remove pontos de milhar e converte vírgula para ponto
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned);
};

const processApiData = (apiResponse: any): BenchmarkRow[] => {
  if (!apiResponse?.data?.values || !Array.isArray(apiResponse.data.values)) {
    return [];
  }

  const values = apiResponse.data.values;

  // Pula a linha de cabeçalho (índice 0) e a linha de totais (última linha)
  const dataRows = values.slice(1, values.length - 1);

  return dataRows.map((row: string[]) => ({
    veiculo: row[0] || '',
    tipoDeCompra: row[1] || '',
    tipo: row[2] || '',
    impressoes: parseNumber(row[3] || '0'),
    cliques: parseNumber(row[4] || '0'),
    views: parseNumber(row[5] || '0'),
    views100: parseNumber(row[6] || '0'),
    engajamentos: parseNumber(row[7] || '0'),
    ctr: parsePercentage(row[8] || '0'),
    vtr: parsePercentage(row[9] || '0'),
    taxaEngajamento: parsePercentage(row[10] || '0')
  }));
};

const filterBenchmarkRows = (rows: BenchmarkRow[], filters?: BenchmarkFilters): BenchmarkRow[] => {
  if (!filters) return rows;

  return rows.filter(row => {
    if (filters.veiculo && row.veiculo !== filters.veiculo) return false;
    if (filters.tipoDeCompra && row.tipoDeCompra !== filters.tipoDeCompra) return false;
    if (filters.tipo && row.tipo !== filters.tipo) return false;
    return true;
  });
};

const calculateBenchmarks = (allRows: BenchmarkRow[], filters?: BenchmarkFilters): BenchmarkData => {
  // Filtra os dados se houver filtros
  const filteredRows = filterBenchmarkRows(allRows, filters);

  // Soma todos os valores
  const totals = filteredRows.reduce(
    (acc, row) => ({
      impressoes: acc.impressoes + row.impressoes,
      cliques: acc.cliques + row.cliques,
      views100: acc.views100 + row.views100,
      engajamentos: acc.engajamentos + row.engajamentos
    }),
    { impressoes: 0, cliques: 0, views100: 0, engajamentos: 0 }
  );

  // Calcula as métricas baseadas nos totais
  return {
    ctr: totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0,
    vtr: totals.impressoes > 0 ? (totals.views100 / totals.impressoes) * 100 : 0,
    taxaEngajamento: totals.impressoes > 0 ? (totals.engajamentos / totals.impressoes) * 100 : 0
  };
};

export const useBenchmarkData = () => {
  const [allRows, setAllRows] = useState<BenchmarkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBenchmarks = async () => {
      try {
        setLoading(true);
        setError(null);

        // Busca dados de ambas as APIs em paralelo
        const responses = await Promise.all(
          API_URLS.map(url => fetch(url).then(res => res.json()))
        );

        // Processa os dados de cada API
        const rows: BenchmarkRow[] = [];
        responses.forEach(response => {
          const processedRows = processApiData(response);
          rows.push(...processedRows);
        });

        console.log('📊 Dados de benchmark processados:', {
          totalLinhas: rows.length,
          amostra: rows.slice(0, 3),
          veiculos: [...new Set(rows.map(r => r.veiculo))],
          tiposDeCompra: [...new Set(rows.map(r => r.tipoDeCompra))],
          tipos: [...new Set(rows.map(r => r.tipo))]
        });

        setAllRows(rows);
      } catch (err) {
        console.error('Erro ao buscar dados de benchmark:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmarks();
  }, []);

  // Calcula benchmarks totais (sem filtros)
  const benchmarks = useMemo(() => calculateBenchmarks(allRows), [allRows]);

  // Função para obter benchmarks com filtros específicos
  const getBenchmarksByFilters = (filters: BenchmarkFilters): BenchmarkData => {
    return calculateBenchmarks(allRows, filters);
  };

  return {
    benchmarks,
    allRows,
    loading,
    error,
    getBenchmarksByFilters
  };
};
