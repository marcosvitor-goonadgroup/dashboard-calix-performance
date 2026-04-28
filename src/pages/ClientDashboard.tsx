import { useState, useMemo, useEffect } from 'react';
import { CampaignProvider, useCampaign } from '../contexts/CampaignContext';
import BigNumbers from '../components/BigNumbers';
import ImpressionsChart from '../components/ImpressionsChart';
import VehicleMetrics from '../components/VehicleMetrics';
import ComparisonToggle from '../components/ComparisonToggle';
import AIAnalysis from '../components/AIAnalysis';
import OnDemandAnalysis from '../components/OnDemandAnalysis';
import CreativePerformance from '../components/CreativePerformance';
import CreativeAnalysis from '../components/CreativeAnalysis';
import ParticlesBackground from '../components/ParticlesBackground';
import PIInfoCard from '../components/PIInfoCard';
import Filters from '../components/Filters';
import Footer from '../components/Footer';
import ClientCampaignList from '../components/ClientCampaignList';
import adDeskWhite from '../images/ad-desk-white.svg';
import { toSlug } from '../utils/slug';
import { subDays, startOfDay, format } from 'date-fns';

interface ClientHeaderProps {
  clientName: string;
  agencia: string;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
}

const ClientHeader = ({ clientName, agencia, onOpenFilters, onClearFilters, activeFiltersCount }: ClientHeaderProps) => (
  <header className="w-full bg-[#153ece] rounded-[34px] px-8 py-6 mb-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-6 min-w-0">
        <img src={adDeskWhite} alt="AD Desk" className="h-14 w-auto shrink-0" />
        <div className="border-l border-white/30 pl-6 min-w-0">
          <h1 className="text-white font-bold text-xl sm:text-2xl leading-tight whitespace-nowrap">
            {clientName}
          </h1>
          <p className="text-white/60 text-sm sm:text-base whitespace-nowrap mt-0.5">
            Painel de Campanhas
            {agencia && <span className="text-white/80"> | {agencia}</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {activeFiltersCount > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-colors"
            title="Limpar filtros"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <button
          onClick={onOpenFilters}
          className="relative flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-colors font-medium text-sm whitespace-nowrap"
        >
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="hidden sm:inline">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-white text-[#153ece] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>
    </div>
  </header>
);

const ClientDashboardContent = ({ clientName }: { clientName: string }) => {
  const { loading, error, filteredData, filters, setFilters, data, agencia } = useCampaign();

  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'7days' | 'all'>('7days');
  const [comparisonMode, setComparisonMode] = useState<'benchmark' | 'previous'>('benchmark');
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedPI, setSelectedPI] = useState<string | null>(null);

  useEffect(() => {
    setFilters({
      dateRange: { start: null, end: null },
      veiculo: [],
      tipoDeCompra: [],
      campanha: [],
      numeroPi: null
    });
  }, []);

  const clientData = useMemo(
    () => filteredData.filter(d => toSlug(d.cliente ?? '') === clientName),
    [filteredData, clientName]
  );

  const displayClientName = useMemo(
    () => clientData[0]?.cliente ?? clientName,
    [clientData, clientName]
  );

  const maxAvailableDate = useMemo(() => {
    const dates = clientData.map(d => d.date);
    if (dates.length === 0) return startOfDay(new Date());
    return startOfDay(new Date(Math.max(...dates.map(d => d.getTime()))));
  }, [clientData]);

  const sevenDaysAgoFromMaxDate = useMemo(
    () => startOfDay(subDays(maxAvailableDate, 7)),
    [maxAvailableDate]
  );

  const minAvailableDate = useMemo(() => {
    if (clientData.length === 0) return new Date();
    return new Date(Math.min(...clientData.map(d => d.date.getTime())));
  }, [clientData]);

  const generalBenchmarks = useMemo(() => {
    const totalImp = data.reduce((s, i) => s + i.impressions, 0);
    const totalClk = data.reduce((s, i) => s + i.clicks, 0);
    const totalVid = data.reduce((s, i) => s + i.videoCompletions, 0);
    const totalEng = data.reduce((s, i) => s + i.totalEngagements, 0);
    return {
      ctr: totalImp > 0 ? (totalClk / totalImp) * 100 : 0,
      vtr: totalImp > 0 ? (totalVid / totalImp) * 100 : 0,
      taxaEngajamento: totalImp > 0 ? (totalEng / totalImp) * 100 : 0
    };
  }, [data]);

  const vehicleBenchmarks = useMemo(() => {
    const map = new Map<string, { ctr: number; vtr: number; taxaEngajamento: number }>();
    const vMap = new Map<string, { imp: number; clk: number; vid: number; eng: number }>();
    data.forEach(item => {
      if (!item.veiculo) return;
      const v = item.veiculo;
      const e = vMap.get(v) ?? { imp: 0, clk: 0, vid: 0, eng: 0 };
      e.imp += item.impressions; e.clk += item.clicks;
      e.vid += item.videoCompletions; e.eng += item.totalEngagements;
      vMap.set(v, e);
    });
    vMap.forEach((e, v) => {
      map.set(v, {
        ctr: e.imp > 0 ? (e.clk / e.imp) * 100 : 0,
        vtr: e.imp > 0 ? (e.vid / e.imp) * 100 : 0,
        taxaEngajamento: e.imp > 0 ? (e.eng / e.imp) * 100 : 0
      });
    });
    return map;
  }, [data]);

  const displayData = useMemo(() => {
    let d = clientData;
    if (periodFilter === '7days') d = d.filter(i => i.date >= sevenDaysAgoFromMaxDate);
    if (selectedCampaign) d = d.filter(i => i.campanha === selectedCampaign);
    if (selectedVehicle) d = d.filter(i => i.veiculo === selectedVehicle);
    if (selectedPI) d = d.filter(i => i.numeroPi === selectedPI);
    return d;
  }, [clientData, periodFilter, selectedCampaign, selectedVehicle, selectedPI, sevenDaysAgoFromMaxDate]);

  const previousPeriodMetrics = useMemo(() => {
    if (periodFilter !== '7days') return null;
    const fourteenDaysAgo = startOfDay(subDays(maxAvailableDate, 14));
    const prev = clientData.filter(i => i.date >= fourteenDaysAgo && i.date < sevenDaysAgoFromMaxDate);
    const totalInv = prev.reduce((s, i) => s + i.cost, 0);
    const totalImp = prev.reduce((s, i) => s + i.impressions, 0);
    const totalClk = prev.reduce((s, i) => s + i.clicks, 0);
    const totalVid = prev.reduce((s, i) => s + i.videoViews, 0);
    const totalEng = prev.reduce((s, i) => s + i.totalEngagements, 0);
    const totalVidC = prev.reduce((s, i) => s + i.videoCompletions, 0);
    return {
      investimento: totalInv, investimentoReal: 0,
      impressoes: totalImp, cliques: totalClk, views: totalVid, engajamento: totalEng,
      cpm: totalImp > 0 ? (totalInv / totalImp) * 1000 : 0,
      cpc: totalClk > 0 ? totalInv / totalClk : 0,
      cpv: totalVid > 0 ? totalInv / totalVid : 0,
      cpe: totalEng > 0 ? totalInv / totalEng : 0,
      ctr: totalImp > 0 ? (totalClk / totalImp) * 100 : 0,
      vtr: totalImp > 0 ? (totalVidC / totalImp) * 100 : 0,
      taxaEngajamento: totalImp > 0 ? (totalEng / totalImp) * 100 : 0
    };
  }, [clientData, periodFilter, maxAvailableDate, sevenDaysAgoFromMaxDate]);

  const displayMetrics = useMemo(() => {
    const totalInv = displayData.reduce((s, i) => s + i.cost, 0);
    const totalInvR = displayData.reduce((s, i) => s + (i.realInvestment || 0), 0);
    const totalImp = displayData.reduce((s, i) => s + i.impressions, 0);
    const totalClk = displayData.reduce((s, i) => s + i.clicks, 0);
    const totalVid = displayData.reduce((s, i) => s + i.videoViews, 0);
    const totalEng = displayData.reduce((s, i) => s + i.totalEngagements, 0);
    const totalVidC = displayData.reduce((s, i) => s + i.videoCompletions, 0);
    return {
      investimento: totalInv, investimentoReal: totalInvR,
      impressoes: totalImp, cliques: totalClk, views: totalVid, engajamento: totalEng,
      cpm: totalImp > 0 ? (totalInv / totalImp) * 1000 : 0,
      cpc: totalClk > 0 ? totalInv / totalClk : 0,
      cpv: totalVid > 0 ? totalInv / totalVid : 0,
      cpe: totalEng > 0 ? totalInv / totalEng : 0,
      ctr: totalImp > 0 ? (totalClk / totalImp) * 100 : 0,
      vtr: totalImp > 0 ? (totalVidC / totalImp) * 100 : 0,
      taxaEngajamento: totalImp > 0 ? (totalEng / totalImp) * 100 : 0
    };
  }, [displayData]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.veiculo.length > 0) count += filters.veiculo.length;
    if (filters.tipoDeCompra.length > 0) count += filters.tipoDeCompra.length;
    if (filters.campanha.length > 0) count += filters.campanha.length;
    if (filters.numeroPi) count++;
    if (selectedVehicle) count++;
    if (selectedPI) count++;
    return count;
  }, [filters, selectedVehicle, selectedPI]);

  const handleClearFilters = () => {
    setSelectedCampaign(null);
    setSelectedVehicle(null);
    setSelectedPI(null);
    setFilters({
      dateRange: { start: null, end: null },
      veiculo: [],
      tipoDeCompra: [],
      campanha: [],
      numeroPi: null
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#153ece]" />
          <p className="mt-4 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f1f1f1] flex items-center justify-center">
        <p className="text-red-600 text-lg">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f1f1] relative">
      <ParticlesBackground />
      <div className="relative z-10 max-w-[1440px] mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-3 sm:pb-6">
        <ClientHeader
          clientName={displayClientName}
          agencia={agencia}
          onOpenFilters={() => setIsFiltersOpen(true)}
          onClearFilters={handleClearFilters}
          activeFiltersCount={activeFiltersCount}
        />
        <Filters isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} />

        <main>
          <div className="space-y-6">
            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
                <h2 className="text-xs sm:text-sm font-medium text-gray-600">
                  Resultados{' '}
                  <span className="text-gray-400 font-normal">
                    {format(periodFilter === '7days' ? sevenDaysAgoFromMaxDate : minAvailableDate, 'dd/MM/yyyy')} à {format(maxAvailableDate, 'dd/MM/yyyy')}
                  </span>
                </h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={() => setPeriodFilter('7days')}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        periodFilter === '7days'
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                          : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
                      }`}
                    >
                      <span className="hidden sm:inline">Últimos 7 dias</span>
                      <span className="sm:hidden">7 dias</span>
                    </button>
                    <button
                      onClick={() => setPeriodFilter('all')}
                      className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all duration-200 ${
                        periodFilter === 'all'
                          ? 'bg-green-600 text-white shadow-md hover:bg-green-700'
                          : 'bg-white/60 backdrop-blur-md text-gray-700 border border-gray-200/50 hover:bg-white/80'
                      }`}
                    >
                      <span className="hidden sm:inline">Todo o período</span>
                      <span className="sm:hidden">Tudo</span>
                    </button>
                  </div>
                  {periodFilter === '7days' && (
                    <>
                      <div className="hidden sm:block h-8 w-px bg-gradient-to-b from-transparent via-gray-300 to-transparent" />
                      <ComparisonToggle comparisonMode={comparisonMode} onModeChange={setComparisonMode} />
                    </>
                  )}
                </div>
              </div>
              <BigNumbers
                metrics={displayMetrics}
                filters={filters}
                periodFilter={periodFilter}
                generalBenchmarks={generalBenchmarks}
                comparisonMode={comparisonMode}
                previousPeriodMetrics={previousPeriodMetrics}
                selectedPI={selectedPI}
              />
            </div>

            {selectedPI && (
              <PIInfoCard
                numeroPi={selectedPI}
                campaignData={clientData.filter(d => d.numeroPi === selectedPI)}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-6 items-stretch">
              <ClientCampaignList
                data={clientData}
                selectedPI={selectedPI}
                onSelectPI={setSelectedPI}
              />
              <ImpressionsChart
                data={clientData}
                allData={clientData}
                periodFilter={periodFilter}
                comparisonMode={comparisonMode}
                showComparison={periodFilter === '7days'}
                maxAvailableDate={maxAvailableDate}
                sevenDaysAgoFromMaxDate={sevenDaysAgoFromMaxDate}
              />
            </div>

            <VehicleMetrics
              data={displayData}
              selectedCampaign={selectedCampaign}
              periodFilter={periodFilter}
              filters={filters}
              vehicleBenchmarks={vehicleBenchmarks}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              selectedPI={selectedPI}
            />

            <AIAnalysis
              data={displayData}
              allData={clientData}
              periodFilter={periodFilter}
              selectedCampaign={selectedCampaign}
            />

            <OnDemandAnalysis
              data={displayData}
              allData={clientData}
              periodFilter={periodFilter}
            />

            <CreativePerformance data={displayData} />

            <CreativeAnalysis
              data={displayData}
              periodFilter={periodFilter}
              selectedCampaign={selectedCampaign}
            />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

const ClientDashboard = ({ slug }: { slug: string }) => (
  <CampaignProvider>
    <ClientDashboardContent clientName={slug} />
  </CampaignProvider>
);

export default ClientDashboard;
