interface ComparisonToggleProps {
  comparisonMode: 'benchmark' | 'previous';
  onModeChange: (mode: 'benchmark' | 'previous') => void;
}

const ComparisonToggle = ({ comparisonMode, onModeChange }: ComparisonToggleProps) => {
  return (
    <div className="flex gap-2">
      <button
        onClick={() => onModeChange('benchmark')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          comparisonMode === 'benchmark'
            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
            : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
        }`}
      >
        Comparação com o Benchmark
      </button>
      <button
        onClick={() => onModeChange('previous')}
        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
          comparisonMode === 'previous'
            ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
            : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
        }`}
      >
        Comparação com o Período Anterior
      </button>
    </div>
  );
};

export default ComparisonToggle;
