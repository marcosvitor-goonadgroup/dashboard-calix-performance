import { useMemo, useState, useEffect } from 'react';
import { ProcessedCampaignData } from '../types/campaign';
import BenchmarkIndicator from './BenchmarkIndicator';
import CreativeImage from './CreativeImage';
import CreativeDetailModal from './CreativeDetailModal';
import { fetchAllBenchmarks, BenchmarkData } from '../services/benchmarkService';

interface CreativePerformanceProps {
  data: ProcessedCampaignData[];
}

interface CreativeData {
  name: string;
  campanha: string;
  veiculo: string;
  tipoDeCompra: string;
  tipoMidia: string;
  imageUrl: string; // URL da imagem do criativo da API
  impressoes: number;
  cliques: number;
  views: number;
  engajamento: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)} mi`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} mil`;
  }
  return num.toFixed(0);
};

/**
 * Cria chave de benchmark para busca
 */
const getBenchmarkKey = (veiculo: string, tipoDeCompra: string, tipoMidia: string): string => {
  return `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|${tipoMidia.toLowerCase()}`;
};

/**
 * Formata tipo de mídia para exibição
 */
const formatTipoMidia = (tipoMidia: string): string => {
  const tipo = tipoMidia.toLowerCase();
  if (tipo.includes('video') || tipo.includes('vídeo')) return 'Vídeo';
  if (tipo.includes('estatico') || tipo.includes('estático')) return 'Estático';
  if (tipo.includes('audio') || tipo.includes('áudio')) return 'Áudio';
  return 'Estático'; // default
};

type SortField = 'name' | 'impressoes' | 'views' | 'engajamento' | 'cliques' | 'vtr' | 'taxaEngajamento' | 'ctr';
type SortDirection = 'asc' | 'desc';

const CreativePerformance = ({ data }: CreativePerformanceProps) => {
  const [selectedVeiculo, setSelectedVeiculo] = useState<string>('all');
  const [selectedTipoCompra, setSelectedTipoCompra] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [benchmarks, setBenchmarks] = useState<Map<string, BenchmarkData>>(new Map());
  const [sortField, setSortField] = useState<SortField>('impressoes');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCreative, setSelectedCreative] = useState<string | null>(null);
  const itemsPerPage = 5;

  // Carrega benchmarks ao montar o componente
  useEffect(() => {
    fetchAllBenchmarks().then(setBenchmarks);
  }, []);

  // Handler para ordenação
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Se já está ordenando por este campo, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é um novo campo, começa com descendente (maior para menor)
      setSortField(field);
      setSortDirection('desc');
    }
    setCurrentPage(1); // Volta para primeira página ao ordenar
  };

  // Extract unique values for filters
  const { veiculos, tiposCompra } = useMemo(() => {
    const campanhasSet = new Set<string>();
    const veiculosSet = new Set<string>();
    const tiposCompraSet = new Set<string>();

    data.forEach(item => {
      if (item.campanha) campanhasSet.add(item.campanha);
      if (item.veiculo) veiculosSet.add(item.veiculo);
      if (item.tipoDeCompra) tiposCompraSet.add(item.tipoDeCompra);
    });

    return {
      campanhas: Array.from(campanhasSet).sort(),
      veiculos: Array.from(veiculosSet).sort(),
      tiposCompra: Array.from(tiposCompraSet).sort()
    };
  }, [data]);

  // Filter and aggregate data by creative (adName)
  const creativeData = useMemo(() => {
    // Os dados já vêm filtrados do componente pai (displayData)
    // Aqui aplicamos apenas os filtros locais deste componente
    let filteredData = data;

    // Apply local filters (veículo e tipo de compra)
    if (selectedVeiculo !== 'all') {
      filteredData = filteredData.filter(d => d.veiculo === selectedVeiculo);
    }
    if (selectedTipoCompra !== 'all') {
      filteredData = filteredData.filter(d => d.tipoDeCompra === selectedTipoCompra);
    }

    // Aggregate by creative (adName)
    const aggregated = filteredData.reduce((acc, item) => {
      const key = item.adName || 'Sem nome';

      if (!acc[key]) {
        acc[key] = {
          name: key,
          campanha: item.campanha,
          veiculo: item.veiculo,
          tipoDeCompra: item.tipoDeCompra,
          tipoMidia: item.videoEstaticoAudio || 'estatico',
          imageUrl: item.image || '', // URL da imagem do criativo
          impressoes: 0,
          cliques: 0,
          views: 0,
          engajamento: 0,
          videoCompletions: 0
        };
      }

      // Se ainda não tem imagem e o item atual tem, usa a imagem do item
      if (!acc[key].imageUrl && item.image) {
        acc[key].imageUrl = item.image;
      }

      acc[key].impressoes += item.impressions;
      acc[key].cliques += item.clicks;
      acc[key].views += item.videoViews;
      acc[key].engajamento += item.totalEngagements;
      acc[key].videoCompletions += item.videoCompletions;

      return acc;
    }, {} as Record<string, any>);

    // Calculate metrics and convert to array
    let creativesArray = Object.values(aggregated)
      .map((item: any) => {
        const ctr = item.impressoes > 0 ? (item.cliques / item.impressoes) * 100 : 0;
        const vtr = item.impressoes > 0 ? (item.videoCompletions / item.impressoes) * 100 : 0;
        const taxaEngajamento = item.impressoes > 0 ? (item.engajamento / item.impressoes) * 100 : 0;

        return {
          name: item.name,
          campanha: item.campanha,
          veiculo: item.veiculo,
          tipoDeCompra: item.tipoDeCompra,
          tipoMidia: item.tipoMidia,
          imageUrl: item.imageUrl,
          impressoes: item.impressoes,
          cliques: item.cliques,
          views: item.views,
          engajamento: item.engajamento,
          ctr,
          vtr,
          taxaEngajamento
        };
      }) as CreativeData[];

    // Apply sorting
    creativesArray.sort((a, b) => {
      let valueA = a[sortField];
      let valueB = b[sortField];

      // Para ordenação alfabética (nome)
      if (sortField === 'name') {
        valueA = valueA.toString().toLowerCase();
        valueB = valueB.toString().toLowerCase();

        if (sortDirection === 'asc') {
          return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
          return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
      }

      // Para ordenação numérica
      const numA = typeof valueA === 'number' ? valueA : 0;
      const numB = typeof valueB === 'number' ? valueB : 0;

      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      creativesArray = creativesArray.filter(creative =>
        creative.name.toLowerCase().includes(query) ||
        creative.veiculo.toLowerCase().includes(query) ||
        creative.tipoDeCompra.toLowerCase().includes(query)
      );
    }

    return creativesArray;
  }, [data, selectedVeiculo, selectedTipoCompra, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(creativeData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return creativeData.slice(startIndex, startIndex + itemsPerPage);
  }, [creativeData, currentPage]);

  // Reset to page 1 when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedVeiculo, selectedTipoCompra, searchQuery]);

  // Componente para header ordenável
  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      onClick={() => handleSort(field)}
      className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors select-none"
    >
      <div className="flex items-center justify-center gap-1">
        <span>{children}</span>
        <span className="text-xs">
          {sortField === field ? (
            sortDirection === 'asc' ? (
              <span className="text-blue-600">▲</span>
            ) : (
              <span className="text-blue-600">▼</span>
            )
          ) : (
            <span className="text-gray-300">▼</span>
          )}
        </span>
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Performance de Criativos
        </h2>

        {/* Filters - New Layout */}
        <div className="flex gap-4 items-end">
          {/* Search Bar - 40% */}
          <div className="flex-[0.4]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Pesquisar
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, veículo ou tipo de compra..."
                className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <svg
                className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Veículo - 30% */}
          <div className="flex-[0.3]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Veículo
            </label>
            <select
              value={selectedVeiculo}
              onChange={(e) => setSelectedVeiculo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os veículos</option>
              {veiculos.map(veiculo => (
                <option key={veiculo} value={veiculo}>
                  {veiculo}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Compra - 30% */}
          <div className="flex-[0.3]">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Tipo de Compra
            </label>
            <select
              value={selectedTipoCompra}
              onChange={(e) => setSelectedTipoCompra(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos os tipos</option>
              {tiposCompra.map(tipo => (
                <option key={tipo} value={tipo}>
                  {tipo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {creativeData.length === 0 ? (
        <div className="py-12 text-center text-gray-500">
          Nenhum criativo encontrado com os filtros selecionados
        </div>
      ) : (
        <>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm table-fixed">
                <colgroup>
                  <col style={{ width: '80px' }} />
                  <col style={{ width: '200px' }} />
                  <col style={{ width: '120px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '130px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '100px' }} />
                  <col style={{ width: '110px' }} />
                  <col style={{ width: '100px' }} />
                </colgroup>
                <thead className="sticky top-0 bg-gray-50 z-10">
                  <tr className="border-b border-gray-200">
                    <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                      Preview
                    </th>
                    <SortableHeader field="name">Criativo</SortableHeader>
                    <SortableHeader field="impressoes">Impressões</SortableHeader>
                    <SortableHeader field="views">Views</SortableHeader>
                    <SortableHeader field="engajamento">Engajamento</SortableHeader>
                    <SortableHeader field="cliques">Cliques</SortableHeader>
                    <SortableHeader field="vtr">VTR</SortableHeader>
                    <SortableHeader field="taxaEngajamento">Tx. Eng.</SortableHeader>
                    <th
                      onClick={() => handleSort('ctr')}
                      className="text-center py-3 px-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>CTR</span>
                        <span className="text-xs">
                          {sortField === 'ctr' ? (
                            sortDirection === 'asc' ? (
                              <span className="text-blue-600">▲</span>
                            ) : (
                              <span className="text-blue-600">▼</span>
                            )
                          ) : (
                            <span className="text-gray-300">▼</span>
                          )}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {paginatedData.map((creative, index) => {
                    return (
                      <tr
                        key={`${creative.name}-${index}`}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <td className="py-3 px-4 border-r border-gray-200">
                          <div
                            className="flex items-center justify-center cursor-pointer"
                            title={creative.name}
                            onClick={() => setSelectedCreative(creative.name)}
                          >
                            <CreativeImage
                              imageUrl={creative.imageUrl || null}
                              creativeName={creative.name}
                              size="small"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 border-r border-gray-200">
                          <div
                            className="font-medium text-gray-900 truncate text-center cursor-pointer hover:text-blue-600"
                            title={creative.name}
                            onClick={() => setSelectedCreative(creative.name)}
                          >
                            {creative.name}
                          </div>
                          <div
                            className="text-xs text-gray-500 truncate text-center cursor-help"
                            title={`${creative.veiculo} • ${creative.tipoDeCompra} • ${formatTipoMidia(creative.tipoMidia)}`}
                          >
                            {creative.veiculo} • {creative.tipoDeCompra} • {formatTipoMidia(creative.tipoMidia)}
                          </div>
                        </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.impressoes)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.views)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.engajamento)}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-700 border-r border-gray-200">
                        {formatNumber(creative.cliques)}
                      </td>
                      <td className="py-3 px-4 border-r border-gray-200">
                        <div className="flex items-center justify-center">
                          {(() => {
                            // Não mostra comparação se a métrica estiver zerada
                            if (creative.vtr === 0) {
                              return (
                                <span className="font-medium text-gray-700">
                                  {creative.vtr.toFixed(2)}%
                                </span>
                              );
                            }

                            const benchmarkKey = getBenchmarkKey(creative.veiculo, creative.tipoDeCompra, creative.tipoMidia);
                            const benchmark = benchmarks.get(benchmarkKey);
                            return benchmark ? (
                              <BenchmarkIndicator
                                value={creative.vtr}
                                benchmark={benchmark.vtr}
                                format="percentage"
                                hidePercentageDiff={true}
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                {creative.vtr.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4 border-r border-gray-200">
                        <div className="flex items-center justify-center">
                          {(() => {
                            // Não mostra comparação se a métrica estiver zerada
                            if (creative.taxaEngajamento === 0) {
                              return (
                                <span className="font-medium text-gray-700">
                                  {creative.taxaEngajamento.toFixed(2)}%
                                </span>
                              );
                            }

                            const benchmarkKey = getBenchmarkKey(creative.veiculo, creative.tipoDeCompra, creative.tipoMidia);
                            const benchmark = benchmarks.get(benchmarkKey);
                            return benchmark ? (
                              <BenchmarkIndicator
                                value={creative.taxaEngajamento}
                                benchmark={benchmark.taxaEngajamento}
                                format="percentage"
                                hidePercentageDiff={true}
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                {creative.taxaEngajamento.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center">
                          {(() => {
                            // Não mostra comparação se a métrica estiver zerada
                            if (creative.ctr === 0) {
                              return (
                                <span className="font-medium text-gray-700">
                                  {creative.ctr.toFixed(2)}%
                                </span>
                              );
                            }

                            const benchmarkKey = getBenchmarkKey(creative.veiculo, creative.tipoDeCompra, creative.tipoMidia);
                            const benchmark = benchmarks.get(benchmarkKey);
                            return benchmark ? (
                              <BenchmarkIndicator
                                value={creative.ctr}
                                benchmark={benchmark.ctr}
                                format="percentage"
                                hidePercentageDiff={true}
                              />
                            ) : (
                              <span className="font-medium text-gray-700">
                                {creative.ctr.toFixed(2)}%
                              </span>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-gray-500">
              {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, creativeData.length)} de {creativeData.length}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${
                    currentPage === 1
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline">Anterior</span>
                  <span className="sm:hidden">‹</span>
                </button>

                <div className="flex items-center gap-0.5 sm:gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                    // No mobile, mostra apenas 3 páginas: anterior, atual e próxima
                    const showOnMobile = Math.abs(page - currentPage) <= 1 || page === 1 || page === totalPages;

                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded text-xs sm:text-sm ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        } ${!showOnMobile ? 'hidden sm:flex items-center justify-center' : 'flex items-center justify-center'}`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-2 sm:px-3 py-1 rounded border text-xs sm:text-sm ${
                    currentPage === totalPages
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="hidden sm:inline">Próxima</span>
                  <span className="sm:hidden">›</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal */}
      {selectedCreative && (
        <CreativeDetailModal
          creativeName={selectedCreative}
          data={data}
          benchmark={(() => {
            const creative = creativeData.find(c => c.name === selectedCreative);
            if (!creative) return undefined;
            const benchmarkKey = getBenchmarkKey(creative.veiculo, creative.tipoDeCompra, creative.tipoMidia);
            return benchmarks.get(benchmarkKey);
          })()}
          onClose={() => setSelectedCreative(null)}
        />
      )}
    </div>
  );
};

export default CreativePerformance;
