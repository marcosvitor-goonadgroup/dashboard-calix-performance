import { useState, useMemo, useEffect } from 'react';
import { CampaignProvider, useCampaign } from '../contexts/CampaignContext';
import BigNumbers from '../components/BigNumbers';
import ImpressionsChart from '../components/ImpressionsChart';
import VehicleMetrics from '../components/VehicleMetrics';
import ComparisonToggle from '../components/ComparisonToggle';
import PIInfoCard from '../components/PIInfoCard';
import ClientCampaignList from '../components/ClientCampaignList';
import CreativePerformance from '../components/CreativePerformance';
import ParticlesBackground from '../components/ParticlesBackground';
import Footer from '../components/Footer';
import adDeskWhite from '../images/ad-desk-white.svg';
import { subDays, startOfDay, format } from 'date-fns';
import { toSlug } from '../utils/slug';

interface CampaignDashboardProps {
  clientSlug: string;
  campaignSlug: string;
}

const CampaignHeader = ({
  clientName,
  campaignName,
  agencia,
}: {
  clientName: string;
  campaignName: string;
  agencia: string;
}) => (
  <header className="w-full bg-[#153ece] rounded-[34px] px-8 py-6 mb-6">
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-6 min-w-0">
        <img src={adDeskWhite} alt="AD Desk" className="h-14 w-auto shrink-0" />
        <div className="border-l border-white/30 pl-6 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white/70 text-sm font-medium">{clientName}</span>
            <span className="text-white/40">/</span>
            <h1 className="text-white font-bold text-sm sm:text-base leading-tight truncate max-w-[400px]">
              {campaignName}
            </h1>
          </div>
          {agencia && (
            <p className="text-white/60 text-xs mt-0.5">
              Painel de Campanhas | {agencia}
            </p>
          )}
        </div>
      </div>
    </div>
  </header>
);

const CampaignDashboardContent = ({ clientSlug, campaignSlug }: CampaignDashboardProps) => {
  const { loading, error, filteredData, data, agencia } = useCampaign();

  const [periodFilter, setPeriodFilter] = useState<'7days' | 'all'>('7days');
  const [comparisonMode, setComparisonMode] = useState<'benchmark' | 'previous'>('benchmark');
  const [selectedPI, setSelectedPI] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const clientName = useMemo(() => {
    const found = data.find(d => toSlug(d.cliente || '') === clientSlug);
    return found?.cliente || clientSlug.toUpperCase();
  }, [data, clientSlug]);

  const campaignName = useMemo(() => {
    const clientData = data.filter(d => toSlug(d.cliente || '') === clientSlug);
    const found = clientData.find(d => toSlug(d.campanha || '') === campaignSlug);
    return found?.campanha || campaignSlug;
  }, [data, clientSlug, campaignSlug]);

  const campaignData = useMemo(
    () =>
      filteredData.filter(
        d =>
          toSlug(d.cliente || '') === clientSlug &&
          toSlug(d.campanha || '') === campaignSlug
      ),
    [filteredData, clientSlug, campaignSlug]
  );

  const maxAvailableDate = useMemo(() => {
    if (campaignData.length === 0) return startOfDay(new Date());
    return startOfDay(new Date(Math.max(...campaignData.map(d => d.date.getTime()))));
  }, [campaignData]);

  const sevenDaysAgoFromMaxDate = useMemo(
    () => startOfDay(subDays(maxAvailableDate, 7)),
    [maxAvailableDate]
  );

  const minAvailableDate = useMemo(() => {
    if (campaignData.length === 0) return new Date();
    return new Date(Math.min(...campaignData.map(d => d.date.getTime())));
  }, [campaignData]);

  const generalBenchmarks = useMemo(() => {
    const totalImp = data.reduce((s, i) => s + i.impressions, 0);
    const totalClk = data.reduce((s, i) => s + i.clicks, 0);
    const totalVid = data.reduce((s, i) => s + i.videoCompletions, 0);
    const totalEng = data.reduce((s, i) => s + i.totalEngagements, 0);
    return {
      ctr: totalImp > 0 ? (totalClk / totalImp) * 100 : 0,
      vtr: totalImp > 0 ? (totalVid / totalImp) * 100 : 0,
      taxaEngajamento: totalImp > 0 ? (totalEng / totalImp) * 100 : 0,
    };
  }, [data]);

  const vehicleBenchmarks = useMemo(() => {
    const map = new Map<string, { ctr: number; vtr: number; taxaEngajamento: number }>();
    const vMap = new Map<string, { imp: number; clk: number; vid: number; eng: number }>();
    data.forEach(item => {
      if (!item.veiculo) return;
      const e = vMap.get(item.veiculo) ?? { imp: 0, clk: 0, vid: 0, eng: 0 };
      e.imp += item.impressions; e.clk += item.clicks;
      e.vid += item.videoCompletions; e.eng += item.totalEngagements;
      vMap.set(item.veiculo, e);
    });
    vMap.forEach((e, v) => {
      map.set(v, {
        ctr: e.imp > 0 ? (e.clk / e.imp) * 100 : 0,
        vtr: e.imp > 0 ? (e.vid / e.imp) * 100 : 0,
        taxaEngajamento: e.imp > 0 ? (e.eng / e.imp) * 100 : 0,
      });
    });
    return map;
  }, [data]);

  const displayData = useMemo(() => {
    let d = campaignData;
    if (periodFilter === '7days') d = d.filter(i => i.date >= sevenDaysAgoFromMaxDate);
    if (selectedVehicle) d = d.filter(i => i.veiculo === selectedVehicle);
    if (selectedPI) d = d.filter(i => i.numeroPi === selectedPI);
    return d;
  }, [campaignData, periodFilter, sevenDaysAgoFromMaxDate, selectedVehicle, selectedPI]);

  const previousPeriodMetrics = useMemo(() => {
    if (periodFilter !== '7days') return null;
    const fourteenDaysAgo = startOfDay(subDays(maxAvailableDate, 14));
    const prev = campaignData.filter(i => i.date >= fourteenDaysAgo && i.date < sevenDaysAgoFromMaxDate);
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
      taxaEngajamento: totalImp > 0 ? (totalEng / totalImp) * 100 : 0,
    };
  }, [campaignData, periodFilter, maxAvailableDate, sevenDaysAgoFromMaxDate]);

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
      taxaEngajamento: totalImp > 0 ? (totalEng / totalImp) * 100 : 0,
    };
  }, [displayData]);

  useEffect(() => {
    setSelectedPI(null);
  }, [periodFilter]);

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
        <CampaignHeader
          clientName={clientName}
          campaignName={campaignName}
          agencia={agencia}
        />

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
                filters={{ dateRange: { start: null, end: null }, veiculo: [], tipoDeCompra: [], campanha: [], numeroPi: null }}
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
                campaignData={campaignData.filter(d => d.numeroPi === selectedPI)}
              />
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[35fr_65fr] gap-6 items-stretch">
              <ClientCampaignList
                data={campaignData}
                selectedPI={selectedPI}
                onSelectPI={setSelectedPI}
              />
              <ImpressionsChart
                data={campaignData}
                allData={campaignData}
                periodFilter={periodFilter}
                comparisonMode={comparisonMode}
                showComparison={periodFilter === '7days'}
                maxAvailableDate={maxAvailableDate}
                sevenDaysAgoFromMaxDate={sevenDaysAgoFromMaxDate}
              />
            </div>

            <VehicleMetrics
              data={displayData}
              selectedCampaign={null}
              periodFilter={periodFilter}
              vehicleBenchmarks={vehicleBenchmarks}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={setSelectedVehicle}
              selectedPI={selectedPI}
            />

            <CreativePerformance data={displayData} />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
};

const CampaignDashboard = ({ clientSlug, campaignSlug }: CampaignDashboardProps) => (
  <CampaignProvider>
    <CampaignDashboardContent clientSlug={clientSlug} campaignSlug={campaignSlug} />
  </CampaignProvider>
);

export default CampaignDashboard;
