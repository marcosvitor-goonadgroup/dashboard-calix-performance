import { useMemo, useState } from 'react';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ProcessedCampaignData } from '../types/campaign';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImpressionsChartProps {
  data: ProcessedCampaignData[]; // Dados já filtrados pelo período
  allData?: ProcessedCampaignData[]; // Todos os dados (para calcular período anterior)
  periodFilter: '7days' | 'all';
  comparisonMode?: 'benchmark' | 'previous';
  showComparison?: boolean;
  maxAvailableDate?: Date; // Data máxima disponível nos dados
  sevenDaysAgoFromMaxDate?: Date; // 7 dias atrás a partir da data máxima
}

type MetricType = 'impressoes' | 'cliques' | 'views' | 'engajamento' | 'ctr' | 'vtr' | 'taxaEngajamento';

const metricOptions = [
  { value: 'impressoes', label: 'Impressões', type: 'count', color: '#0ea5e9' },
  { value: 'cliques', label: 'Cliques', type: 'count', color: '#8b5cf6' },
  { value: 'views', label: 'Views', type: 'count', color: '#10b981' },
  { value: 'engajamento', label: 'Engajamento', type: 'count', color: '#f59e0b' },
  { value: 'ctr', label: 'CTR', type: 'percentage', color: '#ef4444' },
  { value: 'vtr', label: 'VTR', type: 'percentage', color: '#ec4899' },
  { value: 'taxaEngajamento', label: 'Taxa Engajamento', type: 'percentage', color: '#6366f1' }
];

const ImpressionsChart = ({
  data,
  allData,
  periodFilter,
  comparisonMode = 'benchmark',
  showComparison = false,
  maxAvailableDate: propMaxAvailableDate,
  sevenDaysAgoFromMaxDate: propSevenDaysAgoFromMaxDate
}: ImpressionsChartProps) => {
  const [selectedMetrics, setSelectedMetrics] = useState<MetricType[]>(['impressoes']);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Usa a data máxima disponível passada como prop, ou calcula localmente como fallback
  const yesterday = useMemo(() => {
    return propMaxAvailableDate || subDays(new Date(), 1);
  }, [propMaxAvailableDate]);

  const sevenDaysAgo = useMemo(() => {
    return propSevenDaysAgoFromMaxDate || subDays(yesterday, 7);
  }, [propSevenDaysAgoFromMaxDate, yesterday]);

  const fourteenDaysAgo = useMemo(() => subDays(yesterday, 14), [yesterday]);

  // Usa allData se disponível, senão usa data (para manter compatibilidade)
  const sourceData = allData || data;

  // Função auxiliar para processar dados de um período
  const processDataForPeriod = (filteredData: ProcessedCampaignData[]) => {
    const aggregatedData = filteredData.reduce((acc, item) => {
      const dateKey = format(item.date, 'dd/MM/yyyy', { locale: ptBR });

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          impressoes: 0,
          investimento: 0,
          cliques: 0,
          views: 0,
          engajamento: 0,
          totalImpressions: 0,
          videoCompletions: 0,
          dateObj: item.date
        };
      }

      acc[dateKey].impressoes += item.impressions;
      acc[dateKey].investimento += item.cost;
      acc[dateKey].cliques += item.clicks;
      acc[dateKey].views += item.videoViews;
      acc[dateKey].engajamento += item.totalEngagements;
      acc[dateKey].totalImpressions += item.impressions;
      acc[dateKey].videoCompletions += item.videoCompletions;

      return acc;
    }, {} as Record<string, { date: string; impressoes: number; investimento: number; cliques: number; views: number; engajamento: number; totalImpressions: number; videoCompletions: number; dateObj: Date }>);

    return Object.values(aggregatedData)
      .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
      .map(({ date, impressoes, investimento, cliques, views, engajamento, totalImpressions, videoCompletions }) => ({
        date,
        impressoes,
        investimento,
        cliques,
        views,
        engajamento,
        cpm: totalImpressions > 0 ? (investimento / totalImpressions) * 1000 : 0,
        cpc: cliques > 0 ? investimento / cliques : 0,
        cpv: views > 0 ? investimento / views : 0,
        cpe: engajamento > 0 ? investimento / engajamento : 0,
        ctr: totalImpressions > 0 ? (cliques / totalImpressions) * 100 : 0,
        vtr: totalImpressions > 0 ? (videoCompletions / totalImpressions) * 100 : 0,
        taxaEngajamento: totalImpressions > 0 ? (engajamento / totalImpressions) * 100 : 0
      }));
  };

  const chartData: object[] = useMemo(() => {
    const currentPeriodData = periodFilter === '7days'
      ? data.filter(item => item.date >= sevenDaysAgo && item.date <= yesterday)
      : data.filter(item => item.date <= yesterday);

    const currentData = processDataForPeriod(currentPeriodData);

    // Se não estiver no modo de comparação com período anterior, retorna apenas dados atuais
    if (comparisonMode !== 'previous' || !showComparison || periodFilter !== '7days') {
      return currentData;
    }

    // Calcula dados do período anterior (7 dias antes) usando sourceData (dados completos)
    const previousPeriodData = sourceData.filter(item =>
      item.date >= fourteenDaysAgo && item.date < sevenDaysAgo
    );

    const previousData = processDataForPeriod(previousPeriodData);

    console.log('🔍 Debug - Período atual:', {
      inicio: sevenDaysAgo,
      fim: new Date(),
      registros: currentPeriodData.length,
      dataProcessada: currentData.length
    });

    console.log('🔍 Debug - Período anterior:', {
      inicio: fourteenDaysAgo,
      fim: sevenDaysAgo,
      registros: previousPeriodData.length,
      dataProcessada: previousData.length
    });

    console.log('📅 Dados do período atual:', currentData);
    console.log('📅 Dados do período anterior:', previousData);

    // Se não houver dados do período anterior, retorna apenas os dados atuais
    if (previousData.length === 0) {
      console.warn('⚠️ Não há dados disponíveis para o período anterior. Mostrando apenas período atual.');
      return currentData;
    }

    // Cria um array combinado com TODAS as datas em ordem cronológica
    // Período anterior primeiro, depois período atual
    const combinedData = [
      // Adiciona dados do período anterior (com valores apenas para linha amarela)
      ...previousData.map(item => ({
        date: item.date,
        // Valores do período anterior vão para a linha amarela
        impressoes_anterior: item.impressoes,
        cliques_anterior: item.cliques,
        views_anterior: item.views,
        engajamento_anterior: item.engajamento,
        ctr_anterior: item.ctr,
        vtr_anterior: item.vtr,
        taxaEngajamento_anterior: item.taxaEngajamento,
        // Deixa undefined para não mostrar linha azul nesse período
        impressoes: undefined,
        cliques: undefined,
        views: undefined,
        engajamento: undefined,
        ctr: undefined,
        vtr: undefined,
        taxaEngajamento: undefined,
        investimento: undefined
      })),
      // Adiciona dados do período atual (com valores apenas para linha azul)
      ...currentData.map(item => ({
        date: item.date,
        // Valores do período atual vão para a linha azul
        impressoes: item.impressoes,
        cliques: item.cliques,
        views: item.views,
        engajamento: item.engajamento,
        ctr: item.ctr,
        vtr: item.vtr,
        taxaEngajamento: item.taxaEngajamento,
        investimento: item.investimento,
        // Deixa undefined para não mostrar linha amarela nesse período
        impressoes_anterior: undefined,
        cliques_anterior: undefined,
        views_anterior: undefined,
        engajamento_anterior: undefined,
        ctr_anterior: undefined,
        vtr_anterior: undefined,
        taxaEngajamento_anterior: undefined
      }))
    ];

    console.log('📊 Dados combinados para o gráfico:', combinedData);
    console.log('📊 Primeiro item (período anterior):', combinedData[0]);
    console.log('📊 Item do meio (transição):', combinedData[Math.floor(combinedData.length / 2)]);
    console.log('📊 Último item (período atual):', combinedData[combinedData.length - 1]);

    return combinedData;
  }, [data, sourceData, yesterday, sevenDaysAgo, fourteenDaysAgo, periodFilter, comparisonMode, showComparison]);

  const toggleMetric = (metric: MetricType) => {
    setSelectedMetrics(prev => {
      if (prev.includes(metric)) {
        // Não permite desmarcar se for a última métrica selecionada
        if (prev.length === 1) return prev;
        return prev.filter(m => m !== metric);
      } else {
        return [...prev, metric];
      }
    });
  };

  // Verifica se há métricas de ambos os tipos selecionadas
  const hasCountMetrics = selectedMetrics.some(m => {
    const option = metricOptions.find(o => o.value === m);
    return option?.type === 'count';
  });

  const hasPercentageMetrics = selectedMetrics.some(m => {
    const option = metricOptions.find(o => o.value === m);
    return option?.type === 'percentage';
  });

  const formatYAxisCount = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)} mi`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)} mil`;
    }
    return value.toString();
  };

  const formatYAxisPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTooltip = (value: unknown, name: unknown) => {
    const v = typeof value === 'number' ? value : undefined;
    const n = typeof name === 'string' ? name : undefined;
    if (v === undefined || n === undefined) return '';

    const metricName = n.replace(' (Período Anterior)', '');
    const metric = metricOptions.find(m => m.label === metricName);

    if (metric?.type === 'percentage') {
      return `${v.toFixed(2)}%`;
    }

    return new Intl.NumberFormat('pt-BR').format(v);
  };

  const chartTitle = selectedMetrics.length === 1
    ? `${metricOptions.find(m => m.value === selectedMetrics[0])?.label} vs Data`
    : 'Métricas vs Data';

  // Verifica se há dados do período anterior disponíveis
  const hasPreviousPeriodData = useMemo(() => {
    if (comparisonMode !== 'previous' || !showComparison || periodFilter !== '7days') {
      return true; // Não precisa mostrar aviso se não está no modo de comparação
    }

    const previousPeriodData = sourceData.filter(item =>
      item.date >= fourteenDaysAgo && item.date < sevenDaysAgo
    );

    return previousPeriodData.length > 0;
  }, [sourceData, fourteenDaysAgo, sevenDaysAgo, periodFilter, comparisonMode, showComparison]);

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6 h-full flex flex-col">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">
              {chartTitle}
            </h2>
            {periodFilter === '7days' && propMaxAvailableDate && (
              <span className="text-xs text-gray-400 font-normal">
                último dado: {format(propMaxAvailableDate, 'dd/MM/yyyy')}
              </span>
            )}
          </div>

          {/* Botão dropdown para seleção de métricas */}
          <div className="relative">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Métricas ({selectedMetrics.length})
              <svg className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Menu dropdown */}
            {isDropdownOpen && (
              <>
                {/* Overlay para fechar o dropdown ao clicar fora */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />

                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Selecione as métricas:</p>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {metricOptions.map(option => (
                        <label
                          key={option.value}
                          className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-colors ${
                            selectedMetrics.includes(option.value as MetricType)
                              ? 'bg-blue-50 border-blue-300'
                              : 'bg-white border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedMetrics.includes(option.value as MetricType)}
                            onChange={() => toggleMetric(option.value as MetricType)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: option.color }}
                            />
                            <span className="text-sm text-gray-700">{option.label}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Aviso quando não há dados do período anterior */}
        {comparisonMode === 'previous' && showComparison && periodFilter === '7days' && !hasPreviousPeriodData && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              ⚠️ Não há dados disponíveis para o período anterior. Mostrando apenas o período atual.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#9ca3af"
            />

            {/* Eixo Y à esquerda para métricas de contagem */}
            {hasCountMetrics && (
              <YAxis
                yAxisId="count"
                tickFormatter={formatYAxisCount}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
                orientation="left"
              />
            )}

            {/* Eixo Y à direita para métricas de porcentagem */}
            {hasPercentageMetrics && (
              <YAxis
                yAxisId="percentage"
                tickFormatter={formatYAxisPercentage}
                tick={{ fill: '#6b7280', fontSize: 12 }}
                stroke="#9ca3af"
                orientation="right"
              />
            )}

            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              animationDuration={150}
            />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            {/* Define gradientes para cada métrica */}
            <defs>
              {selectedMetrics.map(metric => {
                const option = metricOptions.find(o => o.value === metric);
                if (!option) return null;

                return (
                  <linearGradient key={`gradient-${metric}`} id={`gradient-${metric}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={option.color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={option.color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
              {/* Gradientes para período anterior */}
              {comparisonMode === 'previous' && showComparison && periodFilter === '7days' && selectedMetrics.map(metric => {
                const option = metricOptions.find(o => o.value === metric);
                if (!option) return null;

                return (
                  <linearGradient key={`gradient-${metric}-anterior`} id={`gradient-${metric}-anterior`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={option.color} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={option.color} stopOpacity={0} />
                  </linearGradient>
                );
              })}
            </defs>

            {/* Renderiza áreas com gradiente para cada métrica selecionada */}
            {selectedMetrics.map(metric => {
              const option = metricOptions.find(o => o.value === metric);
              if (!option) return null;

              const yAxisId = option.type === 'percentage' ? 'percentage' : 'count';

              return (
                <Area
                  key={`area-${metric}`}
                  type="monotone"
                  dataKey={metric}
                  stroke="none"
                  fill={`url(#gradient-${metric})`}
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-in-out"
                  yAxisId={yAxisId}
                  connectNulls={true}
                />
              );
            })}

            {/* Renderiza áreas do período anterior se habilitado */}
            {comparisonMode === 'previous' && showComparison && periodFilter === '7days' && selectedMetrics.map(metric => {
              const option = metricOptions.find(o => o.value === metric);
              if (!option) return null;

              const yAxisId = option.type === 'percentage' ? 'percentage' : 'count';

              return (
                <Area
                  key={`area-${metric}-anterior`}
                  type="monotone"
                  dataKey={`${metric}_anterior`}
                  stroke="none"
                  fill={`url(#gradient-${metric}-anterior)`}
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-in-out"
                  yAxisId={yAxisId}
                  connectNulls={true}
                />
              );
            })}

            {/* Renderiza linhas para cada métrica selecionada */}
            {selectedMetrics.map(metric => {
              const option = metricOptions.find(o => o.value === metric);
              if (!option) return null;

              const yAxisId = option.type === 'percentage' ? 'percentage' : 'count';

              return (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={option.color}
                  strokeWidth={2.5}
                  dot={{ fill: option.color, r: 3 }}
                  activeDot={{ r: 5 }}
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-in-out"
                  name={option.label}
                  yAxisId={yAxisId}
                  connectNulls={true}
                />
              );
            })}

            {/* Renderiza período anterior se habilitado */}
            {comparisonMode === 'previous' && showComparison && periodFilter === '7days' && selectedMetrics.map(metric => {
              const option = metricOptions.find(o => o.value === metric);
              if (!option) return null;

              const yAxisId = option.type === 'percentage' ? 'percentage' : 'count';

              return (
                <Line
                  key={`${metric}_anterior`}
                  type="monotone"
                  dataKey={`${metric}_anterior`}
                  stroke={option.color}
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ fill: option.color, r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={true}
                  isAnimationActive={true}
                  animationDuration={300}
                  animationEasing="ease-in-out"
                  name={`${option.label} (Período Anterior)`}
                  yAxisId={yAxisId}
                />
              );
            })}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ImpressionsChart;
