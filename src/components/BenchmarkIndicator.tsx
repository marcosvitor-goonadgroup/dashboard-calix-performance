interface BenchmarkIndicatorProps {
  value: number;
  benchmark: number;
  format?: 'percentage' | 'number';
  className?: string;
  showComparison?: boolean; // Se false, mostra apenas o valor sem comparação
  hidePercentageDiff?: boolean; // Se true, oculta a porcentagem de diferença (mostra apenas valor + seta + ref)
  compactMode?: boolean; // Se true, não mostra o valor principal (apenas seta + porcentagem + ref)
}

const BenchmarkIndicator = ({ value, benchmark, format = 'percentage', className = '', showComparison = true, hidePercentageDiff = false, compactMode = false }: BenchmarkIndicatorProps) => {
  const isAboveBenchmark = value >= benchmark;
  const difference = value - benchmark;
  const percentageDiff = benchmark > 0 ? (difference / benchmark) * 100 : 0;


  // Sempre usar 2 casas decimais para todas as métricas
  const formattedValue = format === 'percentage'
    ? `${value.toFixed(2)}%`
    : value.toLocaleString('pt-BR');

  const formattedBenchmark = format === 'percentage'
    ? `${benchmark.toFixed(2)}%`
    : benchmark.toLocaleString('pt-BR');

  // Se não deve mostrar comparação, mostra apenas o valor em azul
  if (!showComparison) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="font-semibold text-blue-600">
          {formattedValue}
        </span>
      </div>
    );
  }

  // Com comparação, mostra valor + setas + diferença + benchmark
  // No modo compacto, não mostra o valor principal
  // Se hidePercentageDiff=true, mostra métrica + seta + ref na mesma linha
  if (hidePercentageDiff) {
    return (
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Métrica */}
        {!compactMode && (
          <span className={`font-semibold ${
            isAboveBenchmark ? 'text-green-600' : 'text-red-600'
          }`}>
            {formattedValue}
          </span>
        )}

        {/* Seta */}
        {isAboveBenchmark ? (
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}

        {/* Referência */}
        <span className="text-xs text-gray-500">
          (ref: {formattedBenchmark})
        </span>
      </div>
    );
  }

  // Layout padrão horizontal
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compactMode && (
        <span className={`font-semibold ${
          isAboveBenchmark ? 'text-green-600' : 'text-red-600'
        }`}>
          {formattedValue}
        </span>
      )}

      <div className="flex items-center gap-1 text-xs">
        {isAboveBenchmark ? (
          <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
        <span className={isAboveBenchmark ? 'text-green-600' : 'text-red-600'}>
          {Math.abs(percentageDiff).toFixed(2)}%
        </span>
      </div>

      <span className="text-xs text-gray-500" title="Valor do período anterior">
        (ref: {formattedBenchmark})
      </span>
    </div>
  );
};

export default BenchmarkIndicator;
