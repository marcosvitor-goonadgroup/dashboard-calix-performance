import { useMemo, useState } from 'react';
import { ProcessedCampaignData } from '../types/campaign';
import { toSlug } from '../utils/slug';

interface ClientCampaignListProps {
  data: ProcessedCampaignData[];
  selectedPI?: string | null;
  onSelectPI?: (pi: string | null) => void;
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(n);

const formatNumber = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

const ClientCampaignList = ({ data, selectedPI, onSelectPI }: ClientCampaignListProps) => {
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const clientSlug = useMemo(() => toSlug(data[0]?.cliente || ''), [data]);

  const campaigns = useMemo(() => {
    const map = new Map<string, { pis: Map<string, ProcessedCampaignData[]> }>();

    data.forEach(item => {
      const campanha = item.campanha || 'Sem campanha';
      const pi = item.numeroPi || '—';

      if (!map.has(campanha)) map.set(campanha, { pis: new Map() });
      const camp = map.get(campanha)!;
      if (!camp.pis.has(pi)) camp.pis.set(pi, []);
      camp.pis.get(pi)!.push(item);
    });

    // Data máxima dos dados para calcular "últimos 7 dias" relativo aos dados
    const maxDate = data.reduce((max, i) => i.date > max ? i.date : max, new Date(0));
    const sevenDaysAgo = new Date(maxDate.getTime() - 7 * 24 * 60 * 60 * 1000);

    return Array.from(map.entries()).map(([nome, { pis }]) => {
      const allItems = Array.from(pis.values()).flat();
      const impressoes = allItems.reduce((s, i) => s + i.impressions, 0);
      const cliques = allItems.reduce((s, i) => s + i.clicks, 0);
      const investimento = allItems.reduce((s, i) => s + (i.realInvestment ?? i.cost), 0);
      const isActive = allItems.some(i => i.date >= sevenDaysAgo && (i.impressions > 0 || i.clicks > 0) && i.cost > 0);

      const piList = Array.from(pis.entries()).map(([pi, items]) => ({
        pi,
        impressoes: items.reduce((s, i) => s + i.impressions, 0),
        cliques: items.reduce((s, i) => s + i.clicks, 0),
        investimento: items.reduce((s, i) => s + (i.realInvestment ?? i.cost), 0),
        veiculos: [...new Set(items.map(i => i.veiculo).filter(Boolean))],
      })).sort((a, b) => b.impressoes - a.impressoes);

      return { nome, impressoes, cliques, investimento, pis: piList, isActive };
    }).sort((a, b) => {
      // Ativas primeiro, depois por impressões
      if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
      return b.impressoes - a.impressoes;
    });
  }, [data]);

  const toggle = (nome: string) => {
    const next = new Set(expandedCampaigns);
    next.has(nome) ? next.delete(nome) : next.add(nome);
    setExpandedCampaigns(next);
  };

  const handlePIClick = (pi: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onSelectPI) return;
    onSelectPI(selectedPI === pi ? null : pi);
  };

  if (campaigns.length === 0) return null;

  return (
    <div className="bg-white rounded-[24px] overflow-hidden flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100 shrink-0">
        <h2 className="text-sm font-semibold text-gray-700">
          Campanhas ({campaigns.length})
        </h2>
      </div>

      <div className="divide-y divide-gray-100 overflow-y-auto flex-1">
        {campaigns.map(camp => (
          <div key={camp.nome}>
            {/* Linha da campanha */}
            <button
              onClick={() => toggle(camp.nome)}
              className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 min-w-0">
                <svg
                  className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandedCampaigns.has(camp.nome) ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <div className={`h-2 w-2 rounded-full shrink-0 ${camp.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`text-sm font-medium truncate ${camp.isActive ? 'text-green-600' : 'text-gray-800'}`}>
                  {camp.nome}
                </span>
                <a
                  href={`/${clientSlug}/${toSlug(camp.nome)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  title={`Ver dashboard de ${camp.nome}`}
                  className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 hover:bg-[#153ece] text-gray-400 hover:text-white transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </a>
              </div>
              <div className="flex items-center gap-4 shrink-0 ml-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">Impressões</p>
                  <p className="text-sm font-medium text-gray-700">{formatNumber(camp.impressoes)}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-xs text-gray-400">Cliques</p>
                  <p className="text-sm font-medium text-gray-700">{formatNumber(camp.cliques)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Investimento</p>
                  <p className="text-sm font-semibold text-[#153ece]">{formatCurrency(camp.investimento)}</p>
                </div>
              </div>
            </button>

            {/* PIs da campanha */}
            {expandedCampaigns.has(camp.nome) && (
              <div className="bg-gray-50 border-t border-gray-100">
                {camp.pis.map(pi => {
                  const isSelected = selectedPI === pi.pi;
                  return (
                    <button
                      key={pi.pi}
                      onClick={e => handlePIClick(pi.pi, e)}
                      className={`w-full px-6 py-3 flex items-center justify-between border-b border-gray-100 last:border-b-0 text-left transition-colors ${
                        isSelected
                          ? 'bg-[#153ece]/8 border-l-4 border-l-[#153ece]'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-4 shrink-0" />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-[#153ece] text-white'
                              : 'bg-[#153ece]/10 text-[#153ece]'
                          }`}>
                            PI {pi.pi}
                          </span>
                          <span className="text-xs text-gray-500 truncate">
                            {pi.veiculos.join(' · ')}
                          </span>
                          <a
                            href={`/${clientSlug}/${toSlug(camp.nome)}/${pi.pi}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            title={`Ver dashboard do PI ${pi.pi}`}
                            className="flex items-center justify-center w-6 h-6 rounded-lg bg-gray-100 hover:bg-[#153ece] text-gray-400 hover:text-white transition-colors shrink-0"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 ml-4">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">Impressões</p>
                          <p className="text-xs font-medium text-gray-600">{formatNumber(pi.impressoes)}</p>
                        </div>
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">Cliques</p>
                          <p className="text-xs font-medium text-gray-600">{formatNumber(pi.cliques)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Investimento</p>
                          <p className="text-xs font-semibold text-[#153ece]">{formatCurrency(pi.investimento)}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ClientCampaignList;
