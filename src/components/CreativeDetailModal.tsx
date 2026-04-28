import { useMemo, useState } from 'react';
import { ProcessedCampaignData } from '../types/campaign';
import { BenchmarkData } from '../services/benchmarkService';
import BenchmarkIndicator from './BenchmarkIndicator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

interface CreativeDetailModalProps {
  creativeName: string;
  data: ProcessedCampaignData[];
  benchmark: BenchmarkData | undefined;
  onClose: () => void;
}

type ComparisonMode = 'benchmark' | 'previous-period' | 'self-previous';
type TimelineMetric = 'impressoes' | 'cliques' | 'views' | 'engajamento' | 'alcance';

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)} mi`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)} mil`;
  }
  return num.toFixed(0);
};

const formatTipoMidia = (tipoMidia: string): string => {
  const tipo = tipoMidia.toLowerCase();
  if (tipo.includes('video') || tipo.includes('vídeo')) return 'Vídeo';
  if (tipo.includes('estatico') || tipo.includes('estático')) return 'Estático';
  if (tipo.includes('audio') || tipo.includes('áudio')) return 'Áudio';
  return 'Estático';
};

const CreativeDetailModal = ({ creativeName, data, benchmark, onClose }: CreativeDetailModalProps) => {
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('benchmark');
  const [selectedMetric, setSelectedMetric] = useState<TimelineMetric>('impressoes');

  // Filtra dados do criativo específico
  const creativeData = useMemo(() => {
    return data.filter(item => item.adName === creativeName);
  }, [data, creativeName]);

  // Calcula métricas agregadas do período atual
  const currentMetrics = useMemo(() => {
    if (creativeData.length === 0) return null;

    const aggregated = creativeData.reduce((acc, item) => {
      acc.impressoes += item.impressions;
      acc.cliques += item.clicks;
      acc.views += item.videoViews;
      acc.views25 += item.videoViews25;
      acc.views50 += item.videoViews50;
      acc.views75 += item.videoViews75;
      acc.videoCompletions += item.videoCompletions;
      acc.engajamento += item.totalEngagements;
      acc.alcance += item.reach;
      return acc;
    }, {
      impressoes: 0,
      cliques: 0,
      views: 0,
      views25: 0,
      views50: 0,
      views75: 0,
      videoCompletions: 0,
      engajamento: 0,
      alcance: 0
    });

    const ctr = aggregated.impressoes > 0 ? (aggregated.cliques / aggregated.impressoes) * 100 : 0;
    const vtr = aggregated.impressoes > 0 ? (aggregated.videoCompletions / aggregated.impressoes) * 100 : 0;
    const taxaEngajamento = aggregated.impressoes > 0 ? (aggregated.engajamento / aggregated.impressoes) * 100 : 0;

    const firstItem = creativeData[0];

    // Busca a primeira URL de imagem não vazia
    const imageUrl = creativeData.find(item => item.image)?.image || '';

    return {
      ...aggregated,
      ctr,
      vtr,
      taxaEngajamento,
      veiculo: firstItem.veiculo,
      tipoDeCompra: firstItem.tipoDeCompra,
      tipoMidia: firstItem.videoEstaticoAudio,
      campanha: firstItem.campanha,
      imageUrl
    };
  }, [creativeData]);

  // Calcula dados de retenção de vídeo para o gráfico
  const retentionData = useMemo(() => {
    if (!currentMetrics || formatTipoMidia(currentMetrics.tipoMidia) !== 'Vídeo') return null;

    return [
      { stage: 'Views', value: currentMetrics.views },
      { stage: '25%', value: currentMetrics.views25 },
      { stage: '50%', value: currentMetrics.views50 },
      { stage: '75%', value: currentMetrics.views75 },
      { stage: 'Completo', value: currentMetrics.videoCompletions }
    ];
  }, [currentMetrics]);

  // Calcula dados da linha do tempo agrupados por dia
  const timelineData = useMemo(() => {
    if (creativeData.length === 0) return [];

    // Agrupa por data
    const grouped = creativeData.reduce((acc, item) => {
      const dateKey = format(item.date, 'yyyy-MM-dd');

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: item.date,
          impressoes: 0,
          cliques: 0,
          views: 0,
          engajamento: 0,
          alcance: 0
        };
      }

      acc[dateKey].impressoes += item.impressions;
      acc[dateKey].cliques += item.clicks;
      acc[dateKey].views += item.videoViews;
      acc[dateKey].engajamento += item.totalEngagements;
      acc[dateKey].alcance += item.reach;

      return acc;
    }, {} as Record<string, any>);

    // Converte para array e ordena por data
    return Object.values(grouped)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
      .map((item: any) => ({
        date: format(item.date, 'dd/MM', { locale: ptBR }),
        fullDate: item.date,
        impressoes: item.impressoes,
        cliques: item.cliques,
        views: item.views,
        engajamento: item.engajamento,
        alcance: item.alcance
      }));
  }, [creativeData]);

  // Calcula métricas do período anterior (mesmo período de dias, mas anterior)
  const previousPeriodMetrics = useMemo(() => {
    if (creativeData.length === 0) return null;

    const sortedData = [...creativeData].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstDate = sortedData[0].date;
    const lastDate = sortedData[sortedData.length - 1].date;
    const periodDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

    const previousStart = new Date(firstDate);
    previousStart.setDate(previousStart.getDate() - periodDays - 1);
    const previousEnd = new Date(firstDate);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const previousData = data.filter(item =>
      item.adName === creativeName &&
      item.date >= previousStart &&
      item.date <= previousEnd
    );

    if (previousData.length === 0) return null;

    const aggregated = previousData.reduce((acc, item) => {
      acc.impressoes += item.impressions;
      acc.cliques += item.clicks;
      acc.views += item.videoViews;
      acc.videoCompletions += item.videoCompletions;
      acc.engajamento += item.totalEngagements;
      return acc;
    }, {
      impressoes: 0,
      cliques: 0,
      views: 0,
      videoCompletions: 0,
      engajamento: 0
    });

    const ctr = aggregated.impressoes > 0 ? (aggregated.cliques / aggregated.impressoes) * 100 : 0;
    const vtr = aggregated.impressoes > 0 ? (aggregated.videoCompletions / aggregated.impressoes) * 100 : 0;
    const taxaEngajamento = aggregated.impressoes > 0 ? (aggregated.engajamento / aggregated.impressoes) * 100 : 0;

    return { ...aggregated, ctr, vtr, taxaEngajamento };
  }, [creativeData, data, creativeName]);

  if (!currentMetrics) {
    return null;
  }

  const imageUrl = currentMetrics.imageUrl;
  const isVideo = formatTipoMidia(currentMetrics.tipoMidia) === 'Vídeo';
  const hasImage = imageUrl && imageUrl.length > 0;

  // Função para renderizar comparação
  const renderComparison = (value: number, metricKey: 'ctr' | 'vtr' | 'taxaEngajamento') => {
    if (comparisonMode === 'benchmark' && benchmark) {
      return (
        <BenchmarkIndicator
          value={value}
          benchmark={benchmark[metricKey]}
          format="percentage"
          hidePercentageDiff={false}
        />
      );
    } else if (comparisonMode === 'previous-period' && previousPeriodMetrics) {
      const previousValue = previousPeriodMetrics[metricKey];
      const diff = value - previousValue;
      const percentDiff = previousValue > 0 ? (diff / previousValue) * 100 : 0;
      const isPositive = diff > 0;

      return (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900">{value.toFixed(2)}%</span>
          <span className={`text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '▲' : '▼'} {Math.abs(percentDiff).toFixed(1)}%
          </span>
        </div>
      );
    } else {
      return <span className="font-semibold text-gray-900">{value.toFixed(2)}%</span>;
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Detalhes do Criativo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Creative Info Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Image Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              {hasImage ? (
                <div className="flex items-center justify-center min-h-[400px]">
                  <img
                    src={imageUrl}
                    alt={creativeName}
                    className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
                    onError={(e) => {
                      // Se a imagem falhar ao carregar, mostra placeholder
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `
                        <div class="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                          <span class="text-gray-400 text-lg">Imagem não disponível</span>
                        </div>
                      `;
                    }}
                  />
                </div>
              ) : (
                <div className="w-full h-96 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400 text-lg">Imagem não disponível</span>
                </div>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{creativeName}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Campanha:</span>
                    <span className="font-medium text-gray-900">{currentMetrics.campanha}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Veículo:</span>
                    <span className="font-medium text-gray-900">{currentMetrics.veiculo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Compra:</span>
                    <span className="font-medium text-gray-900">{currentMetrics.tipoDeCompra}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo de Mídia:</span>
                    <span className="font-medium text-gray-900">{formatTipoMidia(currentMetrics.tipoMidia)}</span>
                  </div>
                </div>
              </div>

              {/* Comparison Mode Selector */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modo de Comparação:
                </label>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setComparisonMode('benchmark')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      comparisonMode === 'benchmark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Comparar com Benchmark
                  </button>
                  <button
                    onClick={() => setComparisonMode('previous-period')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      comparisonMode === 'previous-period'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } ${!previousPeriodMetrics ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={!previousPeriodMetrics}
                  >
                    Comparar com Período Anterior
                  </button>
                  <button
                    onClick={() => setComparisonMode('self-previous')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      comparisonMode === 'self-previous'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Sem Comparação
                  </button>
                </div>
                {comparisonMode === 'previous-period' && !previousPeriodMetrics && (
                  <p className="text-xs text-gray-500 mt-2">
                    Não há dados disponíveis para o período anterior
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gráficos de Performance</h3>
            <div className={`grid ${isVideo ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              {/* Video Retention Chart - Only for Videos */}
              {isVideo && retentionData && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Retenção do Vídeo</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={retentionData}>
                      <defs>
                        <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#dc2626" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="stage"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <Tooltip
                        formatter={(value: number | undefined) => [value !== undefined ? formatNumber(value) : '', 'Visualizações']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#dc2626"
                        strokeWidth={2}
                        fill="url(#colorRetention)"
                        dot={{ r: 4, fill: '#dc2626' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Timeline Chart with Metric Selection */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Linha do Tempo</h4>
                  <select
                    value={selectedMetric}
                    onChange={(e) => setSelectedMetric(e.target.value as TimelineMetric)}
                    className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                  >
                    <option value="impressoes">Impressões</option>
                    <option value="cliques">Cliques</option>
                    <option value="views">Views</option>
                    <option value="engajamento">Engajamento</option>
                    <option value="alcance">Alcance</option>
                  </select>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={timelineData}>
                    <defs>
                      <linearGradient id="colorTimeline" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => [value !== undefined ? formatNumber(value) : '', selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1)]}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey={selectedMetric}
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#colorTimeline)"
                      dot={{ r: 3, fill: '#2563eb' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Métricas de Performance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Impressões */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Impressões</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.impressoes)}</div>
              </div>

              {/* Alcance */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Alcance</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.alcance)}</div>
              </div>

              {/* Cliques */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Cliques</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.cliques)}</div>
              </div>

              {/* Engajamento */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-1">Engajamento</div>
                <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.engajamento)}</div>
              </div>

              {/* Views (apenas para vídeos) */}
              {isVideo && (
                <>
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Views</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.views)}</div>
                  </div>

                  <div className="bg-pink-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Views 25%</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.views25)}</div>
                  </div>

                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Views 50%</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.views50)}</div>
                  </div>

                  <div className="bg-orange-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Views 75%</div>
                    <div className="text-2xl font-bold text-gray-900">{formatNumber(currentMetrics.views75)}</div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* KPIs com Comparação */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">KPIs e Comparações</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CTR */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">CTR (Click-Through Rate)</div>
                {renderComparison(currentMetrics.ctr, 'ctr')}
              </div>

              {/* VTR */}
              {isVideo && (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-600 mb-2">VTR (View-Through Rate)</div>
                  {renderComparison(currentMetrics.vtr, 'vtr')}
                </div>
              )}

              {/* Taxa de Engajamento */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">Taxa de Engajamento</div>
                {renderComparison(currentMetrics.taxaEngajamento, 'taxaEngajamento')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreativeDetailModal;
