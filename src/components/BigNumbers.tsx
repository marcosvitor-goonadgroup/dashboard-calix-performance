import { CampaignMetrics, Filters } from '../types/campaign';
import BenchmarkIndicator from './BenchmarkIndicator';
import AnimatedNumber from './AnimatedNumber';
import MetricThermometer from './MetricThermometer';

interface BigNumbersProps {
  metrics: CampaignMetrics;
  filters?: Filters;
  periodFilter?: '7days' | 'all';
  generalBenchmarks?: {
    ctr: number;
    vtr: number;
    taxaEngajamento: number;
  };
  comparisonMode?: 'benchmark' | 'previous';
  previousPeriodMetrics?: CampaignMetrics | null;
  selectedPI?: string | null;
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

const formatCurrency = (num: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(num);
};

const BigNumbers = ({
  metrics,
  filters,
  periodFilter = 'all',
  generalBenchmarks,
  comparisonMode = 'benchmark',
  previousPeriodMetrics,
  selectedPI
}: BigNumbersProps) => {
  // Detecta se há filtros ativos
  const hasActiveFilters = () => {
    if (!filters) return false;

    // Verifica se o período não é "Todo o período" (all)
    if (periodFilter === '7days') return true;

    // Verifica se há filtros de data
    if (filters.dateRange.start || filters.dateRange.end) return true;

    // Verifica se há filtros de veículo, tipo de compra ou campanha
    if (filters.veiculo.length > 0 || filters.tipoDeCompra.length > 0 || filters.campanha.length > 0) {
      return true;
    }

    // Verifica se há PI selecionado
    if (selectedPI) {
      return true;
    }

    return false;
  };

  const showComparison = hasActiveFilters();

  // Helper para calcular comparação com período anterior
  const getComparisonData = (_currentValue: number, metric: keyof CampaignMetrics) => {
    if (comparisonMode === 'previous' && previousPeriodMetrics) {
      const previousValue = previousPeriodMetrics[metric] as number;
      return {
        benchmark: previousValue,
        hidePercentageDiff: false // Mostra a % de diferença quando comparando com período anterior
      };
    }
    // Modo benchmark
    return {
      benchmark: metric === 'ctr' ? (generalBenchmarks?.ctr ?? 0) :
                 metric === 'vtr' ? (generalBenchmarks?.vtr ?? 0) :
                 metric === 'taxaEngajamento' ? (generalBenchmarks?.taxaEngajamento ?? 0) :
                 0,
      hidePercentageDiff: true // Oculta a % de diferença quando comparando com benchmark
    };
  };

  const investimentoComparison = getComparisonData(metrics.investimento, 'investimento');
  const impressoesComparison = getComparisonData(metrics.impressoes, 'impressoes');
  const viewsComparison = getComparisonData(metrics.views, 'views');
  const vtrComparison = getComparisonData(metrics.vtr, 'vtr');
  const engajamentoComparison = getComparisonData(metrics.engajamento, 'engajamento');
  const taxaEngajamentoComparison = getComparisonData(metrics.taxaEngajamento, 'taxaEngajamento');
  const cliquesComparison = getComparisonData(metrics.cliques, 'cliques');
  const ctrComparison = getComparisonData(metrics.ctr, 'ctr');

  // Usa investimento real se disponível, senão usa o investimento reportado
  const displayInvestment = metrics.investimentoReal && metrics.investimentoReal > 0
    ? metrics.investimentoReal
    : metrics.investimento;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* Investimento - usando valor real */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1">
          Investimento
        </p>
        <p className="text-base sm:text-2xl font-bold text-blue-900 leading-tight">
          <AnimatedNumber
            value={displayInvestment}
            formatter={formatCurrency}
            duration={2000}
          />
        </p>
        {comparisonMode === 'previous' && showComparison && previousPeriodMetrics && (
          <div className="mt-2">
            <BenchmarkIndicator
              value={displayInvestment}
              benchmark={investimentoComparison.benchmark}
              format="number"
              showComparison={true}
              hidePercentageDiff={investimentoComparison.hidePercentageDiff}
              compactMode={true}
            />
          </div>
        )}
      </div>

      {/* Impressões - agora com comparação */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1">
          Impressões
        </p>
        <p className="text-base sm:text-2xl font-bold text-blue-700 leading-tight">
          <AnimatedNumber
            value={metrics.impressoes}
            formatter={formatNumber}
            duration={2000}
          />
        </p>
        {comparisonMode === 'previous' && showComparison && previousPeriodMetrics && (
          <div className="mt-2">
            <BenchmarkIndicator
              value={metrics.impressoes}
              benchmark={impressoesComparison.benchmark}
              format="number"
              showComparison={true}
              hidePercentageDiff={impressoesComparison.hidePercentageDiff}
              compactMode={true}
            />
          </div>
        )}
      </div>

      {/* Views com VTR */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1">
          Views
        </p>
        <p className="text-base sm:text-2xl font-bold text-blue-600 leading-tight">
          <AnimatedNumber
            value={metrics.views}
            formatter={formatNumber}
            duration={2000}
          />
        </p>
        {comparisonMode === 'previous' && showComparison && previousPeriodMetrics && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Views</p>
            <BenchmarkIndicator
              value={metrics.views}
              benchmark={viewsComparison.benchmark}
              format="number"
              showComparison={true}
              hidePercentageDiff={viewsComparison.hidePercentageDiff}
              compactMode={true}
            />
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">VTR</p>
          <BenchmarkIndicator
            value={metrics.vtr}
            benchmark={vtrComparison.benchmark}
            format="percentage"
            showComparison={showComparison}
            hidePercentageDiff={vtrComparison.hidePercentageDiff}
          />
          {showComparison && periodFilter === '7days' && (
            <MetricThermometer
              currentValue={metrics.vtr}
              benchmarkValue={vtrComparison.benchmark}
              metricName="VTR"
            />
          )}
        </div>
      </div>

      {/* Engajamento com Taxa de Engajamento */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1">
          Engajamento
        </p>
        <p className="text-base sm:text-2xl font-bold text-blue-500 leading-tight">
          <AnimatedNumber
            value={metrics.engajamento}
            formatter={formatNumber}
            duration={2000}
          />
        </p>
        {comparisonMode === 'previous' && showComparison && previousPeriodMetrics && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Engajamento</p>
            <BenchmarkIndicator
              value={metrics.engajamento}
              benchmark={engajamentoComparison.benchmark}
              format="number"
              showComparison={true}
              hidePercentageDiff={engajamentoComparison.hidePercentageDiff}
              compactMode={true}
            />
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Taxa Engajamento</p>
          <BenchmarkIndicator
            value={metrics.taxaEngajamento}
            benchmark={taxaEngajamentoComparison.benchmark}
            format="percentage"
            showComparison={showComparison}
            hidePercentageDiff={taxaEngajamentoComparison.hidePercentageDiff}
          />
          {showComparison && periodFilter === '7days' && (
            <MetricThermometer
              currentValue={metrics.taxaEngajamento}
              benchmarkValue={taxaEngajamentoComparison.benchmark}
              metricName="Taxa Engajamento"
            />
          )}
        </div>
      </div>

      {/* Cliques com CTR */}
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <p className="text-[10px] sm:text-xs font-medium text-gray-500 mb-1">
          Cliques
        </p>
        <p className="text-base sm:text-2xl font-bold text-blue-400 leading-tight">
          <AnimatedNumber
            value={metrics.cliques}
            formatter={formatNumber}
            duration={2000}
          />
        </p>
        {comparisonMode === 'previous' && showComparison && previousPeriodMetrics && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">Cliques</p>
            <BenchmarkIndicator
              value={metrics.cliques}
              benchmark={cliquesComparison.benchmark}
              format="number"
              showComparison={true}
              hidePercentageDiff={cliquesComparison.hidePercentageDiff}
              compactMode={true}
            />
          </div>
        )}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">CTR</p>
          <BenchmarkIndicator
            value={metrics.ctr}
            benchmark={ctrComparison.benchmark}
            format="percentage"
            showComparison={showComparison}
            hidePercentageDiff={ctrComparison.hidePercentageDiff}
          />
          {showComparison && periodFilter === '7days' && (
            <MetricThermometer
              currentValue={metrics.ctr}
              benchmarkValue={ctrComparison.benchmark}
              metricName="CTR"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default BigNumbers;
