import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProcessedCampaignData, Filters, CampaignSummary, CampaignMetrics } from '../types/campaign';
import { fetchCampaignData } from '../services/api';
import { subDays, isAfter } from 'date-fns';

interface CampaignContextType {
  data: ProcessedCampaignData[];
  filteredData: ProcessedCampaignData[];
  filters: Filters;
  setFilters: (filters: Filters) => void;
  loading: boolean;
  error: string | null;
  campaigns: CampaignSummary[];
  overallMetrics: CampaignMetrics;
  agencia: string;
  availableFilters: {
    veiculos: string[];
    tiposDeCompra: string[];
    campanhas: string[];
    numerosPi: string[];
    clientes: string[];
  };
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export const useCampaign = () => {
  const context = useContext(CampaignContext);
  if (!context) {
    throw new Error('useCampaign deve ser usado dentro de um CampaignProvider');
  }
  return context;
};

interface CampaignProviderProps {
  children: ReactNode;
}

export const CampaignProvider = ({ children }: CampaignProviderProps) => {
  const [data, setData] = useState<ProcessedCampaignData[]>([]);
  const [filteredData, setFilteredData] = useState<ProcessedCampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    dateRange: { start: null, end: null },
    veiculo: [],
    tipoDeCompra: [],
    campanha: [],
    numeroPi: null
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        const campaignData = await fetchCampaignData();

        const filteredCampaignData = campaignData.filter(item => item.campanha && item.campanha.trim() !== '');

        const normalizedData = filteredCampaignData.map(item => {
          let normalizedPI = item.numeroPi;
          if (normalizedPI) {
            normalizedPI = normalizedPI.replace(/^0+/, '') || '0';
          }
          return { ...item, numeroPi: normalizedPI };
        });

        setData(normalizedData);
        setFilteredData(normalizedData);
        setError(null);
      } catch (err) {
        setError('Erro ao carregar dados das campanhas');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    let filtered = [...data];

    if (filters.dateRange.start) {
      filtered = filtered.filter(d => d.date >= filters.dateRange.start!);
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(d => d.date <= filters.dateRange.end!);
    }
    if (filters.campanha.length > 0) {
      filtered = filtered.filter(d => filters.campanha.includes(d.campanha));
    }
    if (filters.numeroPi) {
      filtered = filtered.filter(d => d.numeroPi === filters.numeroPi);
    }
    if (filters.veiculo.length > 0) {
      filtered = filtered.filter(d => filters.veiculo.includes(d.veiculo));
    }
    if (filters.tipoDeCompra.length > 0) {
      filtered = filtered.filter(d => filters.tipoDeCompra.includes(d.tipoDeCompra));
    }

    setFilteredData(filtered);
  }, [filters, data]);

  const calculateMetrics = (dataSet: ProcessedCampaignData[]): CampaignMetrics => {
    const totals = dataSet.reduce(
      (acc, row) => ({
        investimento: acc.investimento + row.cost,
        investimentoReal: acc.investimentoReal + (row.realInvestment ?? row.cost),
        impressoes: acc.impressoes + row.impressions,
        cliques: acc.cliques + row.clicks,
        views: acc.views + row.videoViews,
        engajamento: acc.engajamento + row.totalEngagements
      }),
      { investimento: 0, investimentoReal: 0, impressoes: 0, cliques: 0, views: 0, engajamento: 0 }
    );

    return {
      ...totals,
      cpm: totals.impressoes > 0 ? (totals.investimento / totals.impressoes) * 1000 : 0,
      cpc: totals.cliques > 0 ? totals.investimento / totals.cliques : 0,
      cpv: totals.views > 0 ? totals.investimento / totals.views : 0,
      cpe: totals.engajamento > 0 ? totals.investimento / totals.engajamento : 0,
      ctr: totals.impressoes > 0 ? (totals.cliques / totals.impressoes) * 100 : 0,
      vtr: totals.impressoes > 0 ? (dataSet.reduce((acc, row) => acc + row.videoCompletions, 0) / totals.impressoes) * 100 : 0,
      taxaEngajamento: totals.impressoes > 0 ? (totals.engajamento / totals.impressoes) * 100 : 0
    };
  };

  const campaigns: CampaignSummary[] = Array.from(
    new Set(filteredData.map(d => d.campanha))
  )
    .filter(Boolean)
    .map(campanhaNome => {
      const campanhaData = filteredData.filter(d => d.campanha === campanhaNome);

      const sevenDaysAgoFromToday = subDays(new Date(), 7);
      const recentData = campanhaData.filter(d => isAfter(d.date, sevenDaysAgoFromToday));

      const isActive = recentData.some(
        d => (d.impressions > 0 || d.clicks > 0 || d.videoViews > 0) && d.cost > 0
      );

      const lastActivity = campanhaData.reduce(
        (latest, d) => (d.date > latest ? d.date : latest),
        new Date(0)
      );

      return {
        nome: campanhaNome,
        status: (isActive ? 'active' : 'inactive') as 'active' | 'inactive',
        lastActivity,
        metrics: calculateMetrics(campanhaData)
      };
    })
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  const overallMetrics = calculateMetrics(filteredData);

  const availableFilters = {
    veiculos: Array.from(new Set(data.map(d => d.veiculo).filter(Boolean))),
    tiposDeCompra: Array.from(new Set(data.map(d => d.tipoDeCompra).filter(Boolean))),
    campanhas: Array.from(new Set(data.map(d => d.campanha).filter(Boolean))),
    numerosPi: Array.from(new Set(data.map(d => d.numeroPi).filter(Boolean))),
    clientes: Array.from(new Set(data.map(d => d.cliente).filter(Boolean)))
  };

  // BRB é cliente único — agência não está nos dados, deixa vazio
  const agencia = '';

  return (
    <CampaignContext.Provider
      value={{
        data,
        filteredData,
        filters,
        setFilters,
        loading,
        error,
        campaigns,
        overallMetrics,
        agencia,
        availableFilters
      }}
    >
      {children}
    </CampaignContext.Provider>
  );
};
