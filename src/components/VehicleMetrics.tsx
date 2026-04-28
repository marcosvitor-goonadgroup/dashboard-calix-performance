import { useMemo, JSX } from 'react';
import { ProcessedCampaignData, Filters } from '../types/campaign';
import BenchmarkIndicator from './BenchmarkIndicator';

interface VehicleMetricsProps {
  data: ProcessedCampaignData[];
  selectedCampaign: string | null;
  periodFilter: '7days' | 'all';
  filters?: Filters;
  vehicleBenchmarks?: Map<string, { ctr: number; vtr: number; taxaEngajamento: number }>;
  selectedVehicle?: string | null;
  onSelectVehicle?: (vehicle: string | null) => void;
  selectedPI?: string | null;
}

interface VehicleData {
  veiculo: string;
  impressoes: number;
  views: number;
  engajamento: number;
  cliques: number;
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

// Social Media Icons
const SocialIcon = ({ name }: { name: string }) => {
  const icons: { [key: string]: JSX.Element } = {
    Facebook: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    Instagram: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </svg>
    ),
    TikTok: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
      </svg>
    ),
    LinkedIn: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    Kwai: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-3.86 0-7-3.14-7-7s3.14-7 7-7 7 3.14 7 7-3.14 7-7 7zm-1-11h2v6h-2zm0-2h2v2h-2z"/>
      </svg>
    ),
    YouTube: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
    Twitter: (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    'Google Search': (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
      </svg>
    ),
    'Programática': (
      <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.09-.16-.26-.25-.44-.25-.06 0-.12.01-.17.03l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.06-.02-.12-.03-.18-.03-.17 0-.34.09-.43.25l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.09.16.26.25.44.25.06 0 .12-.01.17-.03l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.06.02.12.03.18.03.17 0 .34-.09.43-.25l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
      </svg>
    )
  };

  const colors: { [key: string]: string } = {
    Facebook: 'text-blue-600',
    Instagram: 'text-pink-600',
    TikTok: 'text-gray-900',
    LinkedIn: 'text-blue-700',
    Kwai: 'text-orange-500',
    YouTube: 'text-red-600',
    Twitter: 'text-gray-900',
    'Google Search': 'text-blue-500',
    'Programática': 'text-gray-600'
  };

  return (
    <div className={colors[name] || 'text-gray-600'}>
      {icons[name] || (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="12" r="10"/>
        </svg>
      )}
    </div>
  );
};

const VehicleMetrics = ({ data, periodFilter, filters, vehicleBenchmarks, selectedVehicle, onSelectVehicle, selectedPI }: VehicleMetricsProps) => {
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

  // Aggregate data by vehicle
  const vehicleData = useMemo(() => {
    // Os dados já vêm filtrados do componente pai (displayData)
    // Não precisa aplicar filtros aqui
    let filteredData = data;

    // Aggregate by vehicle
    const vehicleMap = new Map<string, {
      impressoes: number;
      views: number;
      engajamento: number;
      cliques: number;
      videoCompletions: number;
    }>();

    let googleSearchItems = 0;
    let googleSearchClicksSum = 0;

    filteredData.forEach(item => {
      const veiculo = item.veiculo;
      if (!veiculo) return;

      if (veiculo === 'Google Search') {
        googleSearchItems++;
        googleSearchClicksSum += item.clicks;
        if (googleSearchItems <= 5) {
          console.log(`Google Search item ${googleSearchItems}:`, {
            clicks: item.clicks,
            impressions: item.impressions,
            campanha: item.campanha,
            adName: item.adName
          });
        }
      }

      if (vehicleMap.has(veiculo)) {
        const existing = vehicleMap.get(veiculo)!;
        existing.impressoes += item.impressions;
        existing.views += item.videoViews;
        existing.engajamento += item.totalEngagements;
        existing.cliques += item.clicks;
        existing.videoCompletions += item.videoCompletions;
      } else {
        vehicleMap.set(veiculo, {
          impressoes: item.impressions,
          views: item.videoViews,
          engajamento: item.totalEngagements,
          cliques: item.clicks,
          videoCompletions: item.videoCompletions
        });
      }
    });

    if (googleSearchItems > 0) {
      console.log(`Total de itens Google Search processados: ${googleSearchItems}`);
      console.log(`Total de clicks somados: ${googleSearchClicksSum}`);
    }

    // Calculate metrics for each vehicle
    const vehicles: VehicleData[] = Array.from(vehicleMap.entries()).map(([veiculo, metrics]) => {
      const ctr = metrics.impressoes > 0 ? (metrics.cliques / metrics.impressoes) * 100 : 0;
      const vtr = metrics.impressoes > 0 ? (metrics.videoCompletions / metrics.impressoes) * 100 : 0;
      const taxaEngajamento = metrics.impressoes > 0 ? (metrics.engajamento / metrics.impressoes) * 100 : 0;

      if (veiculo === 'Google Search') {
        console.log(`Google Search agregado - Cliques: ${metrics.cliques}, Impressões: ${metrics.impressoes}`);
      }

      return {
        veiculo,
        impressoes: metrics.impressoes,
        views: metrics.views,
        engajamento: metrics.engajamento,
        cliques: metrics.cliques,
        ctr,
        vtr,
        taxaEngajamento
      };
    });

    // Sort by impressions
    return vehicles.sort((a, b) => b.impressoes - a.impressoes);
  }, [data]);

  if (vehicleData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Performance por Veículo
        </h2>
        <div className="py-12 text-center text-gray-500">
          Nenhum dado disponível
        </div>
      </div>
    );
  }

  const handleVehicleClick = (vehicle: string) => {
    if (onSelectVehicle) {
      onSelectVehicle(selectedVehicle === vehicle ? null : vehicle);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">
          Performance por Veículo
        </h2>
        {selectedVehicle && (
          <button
            onClick={() => onSelectVehicle?.(null)}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            Limpar filtro
          </button>
        )}
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  Veículo
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  Impressões
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  Views
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  Engajamento
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  Cliques
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  CTR
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700 border-r border-gray-200">
                  VTR
                </th>
                <th className="text-center py-3 px-4 font-semibold text-gray-700">
                  Tx. Eng.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {vehicleData.map((vehicle) => (
                <tr
                  key={vehicle.veiculo}
                  onClick={() => handleVehicleClick(vehicle.veiculo)}
                  className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                    selectedVehicle === vehicle.veiculo ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <td className="py-3 px-4 border-r border-gray-200">
                    <div className="flex items-center justify-center gap-3">
                      <SocialIcon name={vehicle.veiculo} />
                      <span className="font-medium text-gray-900">
                        {vehicle.veiculo}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium border-r border-gray-200">
                    {formatNumber(vehicle.impressoes)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium border-r border-gray-200">
                    {formatNumber(vehicle.views)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium border-r border-gray-200">
                    {formatNumber(vehicle.engajamento)}
                  </td>
                  <td className="py-3 px-4 text-center text-gray-700 font-medium border-r border-gray-200">
                    {formatNumber(vehicle.cliques)}
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      {(() => {
                        const benchmarkData = vehicleBenchmarks?.get(vehicle.veiculo);
                        return benchmarkData ? (
                          <BenchmarkIndicator
                            value={vehicle.ctr}
                            benchmark={benchmarkData.ctr}
                            format="percentage"
                            showComparison={showComparison}
                            hidePercentageDiff={true}
                          />
                        ) : (
                          <span className="font-semibold text-gray-700">
                            {vehicle.ctr.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="py-3 px-4 border-r border-gray-200">
                    <div className="flex items-center justify-center">
                      {(() => {
                        const benchmarkData = vehicleBenchmarks?.get(vehicle.veiculo);
                        return benchmarkData ? (
                          <BenchmarkIndicator
                            value={vehicle.vtr}
                            benchmark={benchmarkData.vtr}
                            format="percentage"
                            showComparison={showComparison}
                            hidePercentageDiff={true}
                          />
                        ) : (
                          <span className="font-semibold text-gray-700">
                            {vehicle.vtr.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center">
                      {(() => {
                        const benchmarkData = vehicleBenchmarks?.get(vehicle.veiculo);
                        return benchmarkData ? (
                          <BenchmarkIndicator
                            value={vehicle.taxaEngajamento}
                            benchmark={benchmarkData.taxaEngajamento}
                            format="percentage"
                            showComparison={showComparison}
                            hidePercentageDiff={true}
                          />
                        ) : (
                          <span className="font-semibold text-gray-700">
                            {vehicle.taxaEngajamento.toFixed(2)}%
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-3">
        Ordenado por número de impressões (maior para menor)
      </p>
    </div>
  );
};

export default VehicleMetrics;
