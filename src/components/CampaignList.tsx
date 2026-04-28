import { CampaignSummary, ProcessedCampaignData, Filters, CampaignMetrics } from '../types/campaign';
import { useMemo, useState } from 'react';
import { subDays } from 'date-fns';
import { toSlug } from '../utils/slug';
import logoBrb from '../images/logo-brb.png';

const clientLogos: Record<string, string> = {
  'BRB': logoBrb,
  'brb': logoBrb,
};

interface CampaignListProps {
  campaigns: CampaignSummary[];
  selectedCampaign: string | null;
  onSelectCampaign: (campaignName: string) => void;
  data?: ProcessedCampaignData[];
  filters?: Filters;
  periodFilter?: '7days' | 'all';
  selectedPI?: string | null;
  onSelectPI?: (pi: string | null) => void;
  selectedVehicle?: string | null;
  selectedClient?: string | null;
  onSelectClient?: (client: string | null) => void;
  maxAvailableDate?: Date;
}

interface ClientData {
  nome: string;
  metrics: CampaignMetrics;
  campanhas: CampaignSummary[];
  isActive: boolean;
}

const formatCurrency = (num: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(num);

const formatNumber = (num: number): string =>
  new Intl.NumberFormat('pt-BR').format(num);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CampaignList = ({
  selectedCampaign,
  onSelectCampaign,
  data,
  filters,
  periodFilter,
  selectedPI,
  onSelectPI,
  selectedVehicle,
  selectedClient,
  onSelectClient,
  maxAvailableDate
}: CampaignListProps) => {
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());

  const calculateMetrics = (items: ProcessedCampaignData[]): CampaignMetrics => {
    const totals = items.reduce(
      (acc, row) => ({
        investimento: acc.investimento + row.cost,
        investimentoReal: acc.investimentoReal + (row.realInvestment || 0),
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
      vtr: totals.impressoes > 0 ? (items.reduce((acc, row) => acc + row.videoCompletions, 0) / totals.impressoes) * 100 : 0,
      taxaEngajamento: totals.impressoes > 0 ? (totals.engajamento / totals.impressoes) * 100 : 0
    };
  };

  const clientsData = useMemo(() => {
    if (!data) return [];

    let filteredData = [...data];

    const latestDataDate = maxAvailableDate ?? data.reduce(
      (latest, d) => (d.date > latest ? d.date : latest),
      new Date(0)
    );

    const yesterday = subDays(new Date(), 1);
    filteredData = filteredData.filter(item => item.date <= yesterday);

    if (filters?.dateRange.start) filteredData = filteredData.filter(d => d.date >= filters.dateRange.start!);
    if (filters?.dateRange.end) filteredData = filteredData.filter(d => d.date <= filters.dateRange.end!);

    if (periodFilter === '7days') {
      const sevenDaysAgo = subDays(latestDataDate, 7);
      filteredData = filteredData.filter(item => item.date >= sevenDaysAgo);
    }

    if (selectedVehicle) filteredData = filteredData.filter(d => d.veiculo === selectedVehicle);

    const clientMap = new Map<string, ProcessedCampaignData[]>();
    filteredData.forEach(item => {
      const cliente = item.cliente || 'Sem Cliente';
      if (!clientMap.has(cliente)) clientMap.set(cliente, []);
      clientMap.get(cliente)!.push(item);
    });

    const clients: ClientData[] = [];
    const sevenDaysAgoFromLatest = subDays(latestDataDate, 7);

    clientMap.forEach((clientItems, clienteName) => {
      const campanhaMap = new Map<string, ProcessedCampaignData[]>();
      clientItems.forEach(item => {
        if (!campanhaMap.has(item.campanha)) campanhaMap.set(item.campanha, []);
        campanhaMap.get(item.campanha)!.push(item);
      });

      const clientMetrics = calculateMetrics(clientItems);
      const isClientActive = clientItems.some(
        d => d.date > sevenDaysAgoFromLatest && (d.impressions > 0 || d.clicks > 0 || d.videoViews > 0) && d.cost > 0
      );

      const clientCampaigns: CampaignSummary[] = Array.from(campanhaMap.entries())
        .map(([campanhaNome, campanhaItems]) => {
          const metrics = calculateMetrics(campanhaItems);
          const lastActivity = campanhaItems.reduce((latest, d) => (d.date > latest ? d.date : latest), new Date(0));
          const isActive = campanhaItems.some(
            d => d.date > sevenDaysAgoFromLatest && (d.impressions > 0 || d.clicks > 0 || d.videoViews > 0) && d.cost > 0
          );
          return { nome: campanhaNome, status: (isActive ? 'active' : 'inactive') as 'active' | 'inactive', lastActivity, metrics };
        })
        .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

      clients.push({ nome: clienteName, metrics: clientMetrics, campanhas: clientCampaigns, isActive: isClientActive });
    });

    return clients.sort((a, b) => b.metrics.investimento - a.metrics.investimento);
  }, [data, filters, periodFilter, selectedVehicle, maxAvailableDate]);

  const campaignPIs = useMemo(() => {
    if (!data) return new Map<string, string[]>();

    const pisByCampaign = new Map<string, Set<string>>();
    let filteredData = [...data];

    const latestDate = maxAvailableDate ?? data.reduce((latest, d) => (d.date > latest ? d.date : latest), new Date(0));
    filteredData = filteredData.filter(item => item.date <= latestDate);

    if (filters?.dateRange.start) filteredData = filteredData.filter(d => d.date >= filters.dateRange.start!);
    if (filters?.dateRange.end) filteredData = filteredData.filter(d => d.date <= filters.dateRange.end!);
    if (periodFilter === '7days') {
      filteredData = filteredData.filter(item => item.date >= subDays(latestDate, 7));
    }
    if (selectedVehicle) filteredData = filteredData.filter(d => d.veiculo === selectedVehicle);

    filteredData.forEach(item => {
      if (item.numeroPi) {
        if (!pisByCampaign.has(item.campanha)) pisByCampaign.set(item.campanha, new Set());
        pisByCampaign.get(item.campanha)!.add(item.numeroPi);
      }
    });

    const result = new Map<string, string[]>();
    pisByCampaign.forEach((pisSet, campanha) => result.set(campanha, Array.from(pisSet).sort()));
    return result;
  }, [data, filters, periodFilter, selectedVehicle, maxAvailableDate]);

  const handlePIClick = (pi: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelectPI) onSelectPI(selectedPI === pi ? null : pi);
  };

  const toggleClient = (clientName: string) => {
    const next = new Set(expandedClients);
    next.has(clientName) ? next.delete(clientName) : next.add(clientName);
    setExpandedClients(next);
  };

  const toggleCampaign = (campaignName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(expandedCampaigns);
    next.has(campaignName) ? next.delete(campaignName) : next.add(campaignName);
    setExpandedCampaigns(next);
  };

  const totalCampaigns = clientsData.reduce((sum, client) => sum + client.campanhas.length, 0);

  return (
    <div className="bg-white rounded-[24px] overflow-hidden h-full flex flex-col">
      <div className="px-6 py-4 border-b border-gray-100 shrink-0 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Clientes ({clientsData.length}) • Campanhas ({totalCampaigns})
        </h2>
        {(selectedCampaign || selectedPI || selectedClient) && (
          <div className="flex gap-2">
            {selectedClient && (
              <button onClick={() => onSelectClient?.(null)} className="text-xs text-[#153ece] hover:text-blue-700 font-medium">
                Limpar cliente
              </button>
            )}
            {selectedCampaign && (
              <button onClick={() => onSelectCampaign('')} className="text-xs text-[#153ece] hover:text-blue-700 font-medium">
                Limpar campanha
              </button>
            )}
            {selectedPI && (
              <button onClick={() => onSelectPI?.(null)} className="text-xs text-[#153ece] hover:text-blue-700 font-medium">
                Limpar PI
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {clientsData.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Nenhum cliente encontrado</div>
        ) : (
          clientsData.map((client) => (
            <div key={client.nome}>
              {/* Card do Cliente */}
              <div
                onClick={() => toggleClient(client.nome)}
                className={`px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedClient === client.nome ? 'bg-[#153ece]/5 border-l-4 border-[#153ece]' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Logo + nome + status */}
                  <div className="flex items-center gap-3 min-w-0">
                    {clientLogos[client.nome] ? (
                      <img
                        src={clientLogos[client.nome]}
                        alt={client.nome}
                        className="h-8 w-24 object-contain object-left shrink-0"
                      />
                    ) : (
                      <div className="h-8 w-8 bg-[#153ece]/10 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-[#153ece]">
                          {client.nome.substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 truncate">{client.nome}</p>
                        <div
                          className={`h-2 w-2 rounded-full shrink-0 ${client.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                          title={client.isActive ? 'Ativo' : 'Inativo'}
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        {client.campanhas.length} campanha{client.campanhas.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>

                  {/* Métricas + olhinho + chevron */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[#153ece]">
                        {formatCurrency(client.metrics.investimentoReal && client.metrics.investimentoReal > 0 ? client.metrics.investimentoReal : client.metrics.investimento)}
                      </p>
                      <p className="text-xs text-gray-400">{formatNumber(client.metrics.impressoes)} imp.</p>
                    </div>

                    {/* Olhinho — abre dashboard do cliente */}
                    <a
                      href={`/${toSlug(client.nome)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      title={`Ver dashboard de ${client.nome}`}
                      className="flex items-center justify-center w-8 h-8 rounded-xl bg-gray-100 hover:bg-[#153ece] text-gray-400 hover:text-white transition-colors"
                    >
                      <EyeIcon />
                    </a>

                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${expandedClients.has(client.nome) ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Campanhas do Cliente */}
              {expandedClients.has(client.nome) && (
                <div className="bg-gray-50 border-t border-gray-100">
                  {client.campanhas.map((campaign) => (
                    <div key={campaign.nome} className="border-b border-gray-100 last:border-b-0">
                      {/* Card da Campanha */}
                      <div
                        onClick={(e) => {
                          onSelectCampaign(campaign.nome === selectedCampaign ? '' : campaign.nome);
                          toggleCampaign(campaign.nome, e);
                        }}
                        className={`px-5 py-3 pl-12 hover:bg-gray-100 transition-colors cursor-pointer ${
                          selectedCampaign === campaign.nome ? 'bg-[#153ece]/5 border-l-4 border-[#153ece]' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 mt-1.5 ${campaign.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${campaign.status === 'active' ? 'text-green-700' : 'text-gray-800'}`}>
                              {campaign.nome}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                              <span>{formatCurrency(campaign.metrics.investimentoReal && campaign.metrics.investimentoReal > 0 ? campaign.metrics.investimentoReal : campaign.metrics.investimento)}</span>
                              <span>{formatNumber(campaign.metrics.impressoes)} imp.</span>
                              <span>{formatNumber(campaign.metrics.cliques)} cliques</span>
                            </div>
                          </div>

                          {/* Olhinho — abre dashboard da campanha */}
                          <a
                            href={`/${toSlug(client.nome)}/${toSlug(campaign.nome)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={`Ver dashboard de ${campaign.nome}`}
                            className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-200 hover:bg-[#153ece] text-gray-400 hover:text-white transition-colors shrink-0"
                          >
                            <EyeIcon />
                          </a>

                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform shrink-0 mt-0.5 ${expandedCampaigns.has(campaign.nome) ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>

                      {/* PIs da Campanha */}
                      {expandedCampaigns.has(campaign.nome) && campaignPIs.get(campaign.nome) && campaignPIs.get(campaign.nome)!.length > 0 && (
                        <div className="px-5 py-3 pl-16 bg-white border-t border-gray-100">
                          <p className="text-xs font-medium text-gray-400 mb-2">Números PI</p>
                          <div className="flex flex-wrap gap-2">
                            {campaignPIs.get(campaign.nome)!.map(pi => (
                              <div key={pi} className="flex items-center gap-1">
                                <button
                                  onClick={(e) => handlePIClick(pi, e)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                    selectedPI === pi
                                      ? 'bg-[#153ece] text-white shadow-sm'
                                      : 'bg-[#153ece]/10 text-[#153ece] hover:bg-[#153ece]/20'
                                  }`}
                                >
                                  PI {pi}
                                </button>
                                {/* Olhinho — abre dashboard do PI */}
                                <a
                                  href={`/${toSlug(client.nome)}/${toSlug(campaign.nome)}/${pi}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  title={`Ver dashboard do PI ${pi}`}
                                  className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 hover:bg-[#153ece] text-gray-400 hover:text-white transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CampaignList;
