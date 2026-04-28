import React from 'react';

interface MetricThermometerProps {
  currentValue: number;
  benchmarkValue: number;
  metricName?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  compact?: boolean;
}

const MetricThermometer: React.FC<MetricThermometerProps> = ({
  currentValue,
  benchmarkValue,
  unit = '%',
  maxValue,
  compact = false,
}) => {
  // Força o valor mínimo a ser sempre 0
  const minValue = 0;

  // Define o valor máximo dinamicamente baseado nos valores reais
  // Pega o maior valor entre currentValue e benchmarkValue e adiciona uma pequena margem
  const maxValueFromData = Math.max(currentValue, benchmarkValue);
  const effectiveMax = maxValue || Math.ceil(maxValueFromData * 1.2 * 10) / 10; // 20% a mais com arredondamento

  // Calcula as posições percentuais
  const currentPosition = ((currentValue - minValue) / (effectiveMax - minValue)) * 100;
  const benchmarkPosition = ((benchmarkValue - minValue) / (effectiveMax - minValue)) * 100;

  // Limita as posições entre 0 e 100
  const clampedCurrentPosition = Math.min(Math.max(currentPosition, 0), 100);
  const clampedBenchmarkPosition = Math.min(Math.max(benchmarkPosition, 0), 100);

  // Determina a cor do marcador atual
  const isAboveBenchmark = currentValue >= benchmarkValue;
  const markerColor = isAboveBenchmark ? '#22c55e' : '#ef4444'; // Verde se acima, Vermelho se abaixo

  return (
    <div className={compact ? 'mt-1' : 'mt-2'}>
      {/* Barra com 2 zonas de cores */}
      <div className="relative h-2 rounded-full overflow-hidden bg-gray-200">
        {/* Zona Vermelha (0% até o benchmark) */}
        <div
          className="absolute top-0 left-0 h-full bg-red-500"
          style={{ width: `${clampedBenchmarkPosition}%` }}
        />

        {/* Zona Verde (a partir do benchmark) */}
        <div
          className="absolute top-0 h-full bg-green-500"
          style={{
            left: `${clampedBenchmarkPosition}%`,
            width: `${100 - clampedBenchmarkPosition}%`
          }}
        />

        {/* Marcador do Valor Atual - mais visível com círculo */}
        <div
          className="absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
          style={{ left: `${clampedCurrentPosition}%` }}
        >
          {/* Círculo preto com borda colorida */}
          <div
            className="w-3 h-3 rounded-full bg-gray-200 border-2 shadow-md"
            style={{ borderColor: markerColor }}
          />
          {/* Label acima do marcador */}
          <div
            className="absolute -top-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold"
            style={{ color: markerColor }}
          >
            {currentValue.toFixed(2)}{unit}
          </div>
        </div>
      </div>

      {/* Labels das extremidades */}
      <div className="flex justify-between items-center text-[10px] text-gray-400 mt-1">
        <span>0{unit}</span>
        <span>{effectiveMax.toFixed(2)}{unit}</span>
      </div>
    </div>
  );
};

export default MetricThermometer;
