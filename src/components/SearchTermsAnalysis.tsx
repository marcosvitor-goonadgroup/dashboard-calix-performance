import { useMemo, useState } from 'react';
import { ProcessedSearchData, SearchTermMetrics } from '../types/campaign';
import { subDays } from 'date-fns';

interface SearchTermsAnalysisProps {
  data: ProcessedSearchData[];
  selectedCampaign: string | null;
  periodFilter: '7days' | 'all';
}

const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('pt-BR').format(num);
};

const SearchTermsAnalysis = ({ data, selectedCampaign, periodFilter }: SearchTermsAnalysisProps) => {
  const [minClicks, setMinClicks] = useState<number>(10);

  // Aggregate data by search term
  const aggregatedTerms = useMemo(() => {
    let filteredData = data;

    // Filter by period
    if (periodFilter === '7days') {
      const sevenDaysAgo = subDays(new Date(), 7);
      filteredData = filteredData.filter(item => item.date >= sevenDaysAgo);
    }

    // Filter by selected campaign from parent
    if (selectedCampaign) {
      filteredData = filteredData.filter(d => d.campanha === selectedCampaign);
    }

    // Aggregate by search term
    const termMap = new Map<string, SearchTermMetrics>();

    filteredData.forEach(item => {
      const term = item.searchTerm.toLowerCase().trim();
      if (!term || term === '') return;

      if (termMap.has(term)) {
        const existing = termMap.get(term)!;
        existing.clicks += item.clicks;
        existing.impressions += item.impressions;
        existing.cost += item.cost;
      } else {
        termMap.set(term, {
          term: item.searchTerm,
          clicks: item.clicks,
          impressions: item.impressions,
          cost: item.cost,
          ctr: 0
        });
      }
    });

    // Calculate CTR for each term
    const terms: SearchTermMetrics[] = Array.from(termMap.values()).map(term => ({
      ...term,
      ctr: term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0
    }));

    return terms;
  }, [data, selectedCampaign, periodFilter]);

  // Top terms by clicks (for word cloud)
  const topTermsByClicks = useMemo(() => {
    return [...aggregatedTerms]
      .filter(term => term.clicks >= minClicks)
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 50);
  }, [aggregatedTerms, minClicks]);

  // Top terms by CTR (ranking)
  const topTermsByCTR = useMemo(() => {
    return [...aggregatedTerms]
      .filter(term => term.clicks >= minClicks && term.impressions >= 100)
      .sort((a, b) => b.ctr - a.ctr)
      .slice(0, 15);
  }, [aggregatedTerms, minClicks]);

  // Calculate font size for word cloud
  const getWordSize = (clicks: number, maxClicks: number, minClicks: number): number => {
    const range = maxClicks - minClicks;
    if (range === 0) return 16;
    const normalized = (clicks - minClicks) / range;
    return 12 + normalized * 32; // Font size from 12px to 44px
  };

  const maxClicks = topTermsByClicks.length > 0 ? topTermsByClicks[0].clicks : 1;
  const minClicksInCloud = topTermsByClicks.length > 0 ? topTermsByClicks[topTermsByClicks.length - 1].clicks : 0;

  // Não renderiza o componente se não houver dados
  if (aggregatedTerms.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">
          Termos de Busca - Google Search
        </h2>
        <p className="text-sm text-gray-600">
          Análise de {formatNumber(aggregatedTerms.length)} termos únicos
        </p>
      </div>

      {/* Filter */}
      <div className="mb-6">
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Filtro de cliques mínimos: {minClicks}
        </label>
        <input
          type="range"
          min="1"
          max="100"
          value={minClicks}
          onChange={(e) => setMinClicks(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>1 clique</span>
          <span>100 cliques</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Word Cloud */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-4">
            Principais Termos por Cliques
          </h3>
          {topTermsByClicks.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Nenhum termo encontrado com os filtros aplicados
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg p-6 min-h-[400px] flex flex-wrap items-center justify-center gap-3">
              {topTermsByClicks.map((term, index) => {
                const fontSize = getWordSize(term.clicks, maxClicks, minClicksInCloud);
                const opacity = 0.5 + (term.clicks / maxClicks) * 0.5;

                return (
                  <span
                    key={`${term.term}-${index}`}
                    className="inline-block cursor-default hover:text-blue-600 transition-colors"
                    style={{
                      fontSize: `${fontSize}px`,
                      opacity,
                      fontWeight: fontSize > 24 ? 600 : 400,
                      lineHeight: 1.2
                    }}
                    title={`${term.term}: ${formatNumber(term.clicks)} cliques | CTR: ${term.ctr.toFixed(2)}%`}
                  >
                    {term.term}
                  </span>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2 text-center">
            Tamanho representa número de cliques
          </p>
        </div>

        {/* Top CTR Ranking */}
        <div>
          <h3 className="text-md font-semibold text-gray-700 mb-4">
            Top 15 Termos com Melhor CTR
          </h3>
          {topTermsByCTR.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-sm">
              Nenhum termo encontrado com os filtros aplicados
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50 z-10">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700 w-8">
                        #
                      </th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">
                        Termo
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">
                        CTR
                      </th>
                      <th className="text-right py-2 px-3 font-semibold text-gray-700">
                        Cliques
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {topTermsByCTR.map((term, index) => (
                      <tr key={`${term.term}-${index}`} className="hover:bg-blue-50 transition-colors">
                        <td className="py-2 px-3 text-gray-500 font-medium">
                          {index + 1}
                        </td>
                        <td className="py-2 px-3 text-gray-900">
                          <div className="max-w-xs truncate" title={term.term}>
                            {term.term}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatNumber(term.impressions)} impressões
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <span className={`font-semibold ${
                            term.ctr >= 5 ? 'text-green-600' :
                            term.ctr >= 2 ? 'text-blue-600' :
                            'text-gray-700'
                          }`}>
                            {term.ctr.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-gray-700">
                          {formatNumber(term.clicks)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            * Termos com mínimo de {minClicks} cliques e 100 impressões
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchTermsAnalysis;
