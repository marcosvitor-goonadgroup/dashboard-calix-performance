import { useEffect, useState, useMemo } from 'react';
import { PIInfo, ProcessedCampaignData } from '../types/campaign';
import { fetchPIInfo } from '../services/api';
import { parse, isValid, differenceInDays } from 'date-fns';

interface PIInfoCardProps {
  numeroPi: string | null;
  campaignData?: ProcessedCampaignData[];
  defaultExpanded?: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const fmtNum = (n: number) => new Intl.NumberFormat('pt-BR').format(Math.round(n));

const PIInfoCard = ({ numeroPi, campaignData = [], defaultExpanded = false }: PIInfoCardProps) => {
  const [piInfo, setPiInfo] = useState<PIInfo[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const normalizeVehicleName = (name: string): string => name.toLowerCase().trim();

  // Pacing temporal: % dos dias decorridos no período do PI
  const pacingExpected = useMemo(() => {
    if (!piInfo || piInfo.length === 0) return null;
    const info = piInfo[0];
    if (!info.inicio || !info.fim) return null;
    const start = parse(info.inicio, 'dd/MM/yyyy', new Date());
    const end = parse(info.fim, 'dd/MM/yyyy', new Date());
    if (!isValid(start) || !isValid(end)) return null;
    const totalDays = differenceInDays(end, start) + 1;
    if (totalDays <= 0) return null;
    const daysElapsed = Math.min(Math.max(differenceInDays(new Date(), start) + 1, 0), totalDays);
    return { percentElapsed: daysElapsed / totalDays, daysElapsed, totalDays };
  }, [piInfo]);

  // Totais realizados de toda a campaignData filtrada por PI no pai
  const totaisRealizados = useMemo(() => {
    return campaignData.reduce(
      (acc, item) => {
        acc.realizado += item.realInvestment ?? item.cost;
        acc.impressoes += item.impressions;
        acc.cliques += item.clicks;
        return acc;
      },
      { realizado: 0, impressoes: 0, cliques: 0 }
    );
  }, [campaignData]);

  // Detalhamento por veículo+tipo do PI, cruzado com os dados realizados
  const veiculacaoPorVeiculoTipo = useMemo(() => {
    if (!piInfo || piInfo.length === 0) return [];

    const piGrouped = new Map<string, {
      veiculo: string;
      tipoDeCompra: string;
      previsto: number;
      quantidade: number;
    }>();

    piInfo.forEach(info => {
      const key = `${normalizeVehicleName(info.veiculo)}|${info.modeloCompra.toUpperCase()}`;
      const valor = parseFloat(info.totalBruto.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0;
      const qtd = parseFloat(info.quantidade.replace(/\./g, '').replace(',', '.').trim()) || 0;
      if (piGrouped.has(key)) {
        const e = piGrouped.get(key)!;
        e.previsto += valor;
        e.quantidade += qtd;
      } else {
        piGrouped.set(key, { veiculo: info.veiculo, tipoDeCompra: info.modeloCompra, previsto: valor, quantidade: qtd });
      }
    });

    const realizadoGrouped = new Map<string, { realizado: number; cliques: number; impressoes: number }>();
    campaignData.forEach(item => {
      const key = `${normalizeVehicleName(item.veiculo)}|${item.tipoDeCompra.toUpperCase()}`;
      if (realizadoGrouped.has(key)) {
        const e = realizadoGrouped.get(key)!;
        e.realizado += item.realInvestment ?? item.cost;
        e.cliques += item.clicks;
        e.impressoes += item.impressions;
      } else {
        realizadoGrouped.set(key, {
          realizado: item.realInvestment ?? item.cost,
          cliques: item.clicks,
          impressoes: item.impressions,
        });
      }
    });

    const resultado: Array<{
      veiculo: string;
      tipoDeCompra: string;
      previsto: number;
      realizado: number;
      quantidade: number;
      impressoesRealizadas: number;
      cliquesRealizados: number;
      matchedByVehicle: boolean;
    }> = [];

    piGrouped.forEach((piData) => {
      const tipoKey = piData.tipoDeCompra.toUpperCase();
      const veiculoKey = normalizeVehicleName(piData.veiculo);

      let match = realizadoGrouped.get(`${veiculoKey}|${tipoKey}`);
      let matchedByVehicle = !!match;

      if (!match) {
        for (const [k, v] of realizadoGrouped.entries()) {
          if (k.endsWith(`|${tipoKey}`)) {
            match = v;
            break;
          }
        }
      }

      if (!match && piGrouped.size === 1) {
        match = { realizado: totaisRealizados.realizado, cliques: totaisRealizados.cliques, impressoes: totaisRealizados.impressoes };
      }

      resultado.push({
        veiculo: piData.veiculo,
        tipoDeCompra: piData.tipoDeCompra,
        previsto: piData.previsto,
        realizado: match?.realizado ?? 0,
        quantidade: piData.quantidade,
        impressoesRealizadas: match?.impressoes ?? 0,
        cliquesRealizados: match?.cliques ?? 0,
        matchedByVehicle,
      });
    });

    return resultado;
  }, [campaignData, piInfo, totaisRealizados]);

  useEffect(() => {
    if (!numeroPi) { setPiInfo(null); return; }
    setLoading(true);
    fetchPIInfo(numeroPi)
      .then(setPiInfo)
      .catch(() => setPiInfo(null))
      .finally(() => setLoading(false));
  }, [numeroPi]);

  if (!numeroPi) return null;

  if (loading) {
    return (
      <div className="bg-white rounded-[24px] shadow border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#153ece]" />
          <span className="ml-3 text-gray-600">Carregando informações do PI...</span>
        </div>
      </div>
    );
  }

  if (!piInfo || piInfo.length === 0) {
    return (
      <div className="bg-white rounded-[24px] shadow border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Informações do PI {numeroPi}</h3>
        <p className="text-gray-500">Nenhuma informação encontrada para este PI.</p>
      </div>
    );
  }

  const firstInfo = piInfo[0];
  const totalInvestimento = piInfo.reduce((sum, info) => {
    return sum + (parseFloat(info.totalBruto.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()) || 0);
  }, 0);
  const pacingInvestPrevisto = totalInvestimento * (pacingExpected?.percentElapsed ?? 1);
  const pacingOk = totaisRealizados.realizado >= pacingInvestPrevisto;

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-[24px] shadow-lg border border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800">PI {numeroPi}</h3>
          <div className="flex items-center gap-2">
            {firstInfo.status && (
              <span className="px-3 py-1 bg-[#153ece] text-white text-xs font-semibold rounded-full">
                {firstInfo.status}
              </span>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg
                className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Período + Investimento */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">Período</p>
            <p className="text-sm font-semibold text-gray-800">{firstInfo.inicio} a {firstInfo.fim}</p>
            {pacingExpected && (
              <p className="text-xs text-gray-400 mt-1">
                Dia {pacingExpected.daysElapsed} de {pacingExpected.totalDays}
                {' '}({(pacingExpected.percentElapsed * 100).toFixed(0)}% decorrido)
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-1">Investimento Contratado</p>
            <p className="text-sm font-semibold text-gray-800">{fmt(totalInvestimento)}</p>
            {pacingExpected && (
              <p className="text-xs text-gray-400 mt-0.5">
                Esperado hoje: <span className="font-medium text-gray-600">{fmt(pacingInvestPrevisto)}</span>
                {' '}({(pacingExpected.percentElapsed * 100).toFixed(0)}%)
              </p>
            )}
            {totaisRealizados.realizado > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs text-gray-500">Realizado</p>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${pacingOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {pacingOk ? '✓ Pacing ok' : '! Abaixo do pacing'}
                  </span>
                </div>
                <p className={`text-sm font-semibold ${pacingOk ? 'text-green-700' : 'text-red-700'}`}>
                  {fmt(totaisRealizados.realizado)}
                  <span className="text-xs ml-1 font-normal text-gray-500">
                    ({((totaisRealizados.realizado / totalInvestimento) * 100).toFixed(1)}% do total)
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Objetivo */}
        {firstInfo.objetivo && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-2">Objetivo</p>
            <p className="text-sm text-gray-700 leading-relaxed">{firstInfo.objetivo}</p>
          </div>
        )}
      </div>

      {/* Conteúdo expansível */}
      <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 space-y-4">

          {/* Detalhamento por Veículo */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <p className="text-xs font-medium text-gray-500 mb-3">Detalhamento por Veículo</p>
            <div className="space-y-4">
              {veiculacaoPorVeiculoTipo.map((item, index) => {
                const isCPM = item.tipoDeCompra.toUpperCase().includes('CPM');
                const isCPC = item.tipoDeCompra.toUpperCase().includes('CPC');
                const pacingPrevisto = item.previsto * (pacingExpected?.percentElapsed ?? 1);
                const investOk = item.realizado >= pacingPrevisto;

                const volumeRealizado = isCPM ? item.impressoesRealizadas : isCPC ? item.cliquesRealizados : 0;
                const volumePacingPrevisto = item.quantidade * (pacingExpected?.percentElapsed ?? 1);
                const volumePercent = item.quantidade > 0 ? Math.min((volumeRealizado / item.quantidade) * 100, 100) : 0;
                const volumePacingPercent = item.quantidade > 0 ? Math.min((volumePacingPrevisto / item.quantidade) * 100, 100) : 0;
                const volumeOk = volumeRealizado >= volumePacingPrevisto;

                return (
                  <div key={index} className="border-l-4 border-[#153ece] pl-3 py-2 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{item.veiculo}</p>
                        <p className="text-xs text-gray-500">{item.tipoDeCompra}</p>
                      </div>
                      <div className="flex gap-1">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${investOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {investOk ? '✓ Invest.' : '! Invest.'}
                        </span>
                        {(isCPM || isCPC) && item.quantidade > 0 && (
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-lg ${volumeOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {volumeOk ? `✓ ${isCPM ? 'Impr.' : 'Cliques'}` : `! ${isCPM ? 'Impr.' : 'Cliques'}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <p className="text-xs text-gray-500">Invest. Contratado</p>
                        <p className="text-sm font-semibold text-gray-700">{fmt(item.previsto)}</p>
                        {pacingExpected && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Esperado: <span className="font-medium">{fmt(pacingPrevisto)}</span>
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Invest. Realizado</p>
                        <p className={`text-sm font-semibold ${investOk ? 'text-green-700' : 'text-red-700'}`}>
                          {fmt(item.realizado)}
                          {item.previsto > 0 && (
                            <span className="text-xs ml-1 font-normal">({((item.realizado / item.previsto) * 100).toFixed(1)}%)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {(isCPM || isCPC) && item.quantidade > 0 && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-xs text-gray-500">
                            {isCPM ? 'Impressões' : 'Cliques'} contratados:{' '}
                            <span className="font-medium text-gray-700">{fmtNum(item.quantidade)}</span>
                          </p>
                          <p className="text-xs font-medium text-gray-600">
                            {fmtNum(volumeRealizado)} ({volumePercent.toFixed(1)}%)
                          </p>
                        </div>
                        <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`absolute h-full rounded-full transition-all ${volumeOk ? 'bg-green-500' : 'bg-[#153ece]'}`}
                            style={{ width: `${volumePercent}%` }}
                          />
                          {pacingExpected && (
                            <div
                              className="absolute top-0 h-full w-0.5 bg-orange-400"
                              style={{ left: `${volumePacingPercent}%` }}
                              title={`Pacing esperado: ${fmtNum(volumePacingPrevisto)}`}
                            />
                          )}
                        </div>
                        {pacingExpected && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Esperado hoje: <span className="font-medium">{fmtNum(volumePacingPrevisto)}</span>
                            {' '}— linha laranja na barra
                          </p>
                        )}
                        {isCPC && item.realizado > 0 && item.cliquesRealizados > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            CPC Real: {fmt(item.realizado / item.cliquesRealizados)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Praça + Segmentação + Público */}
          {(firstInfo.praca || firstInfo.segmentacao || firstInfo.publico) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {firstInfo.praca && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 mb-2">Praça</p>
                  <p className="text-sm text-gray-700">{firstInfo.praca}</p>
                </div>
              )}
              {firstInfo.segmentacao && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 mb-2">Segmentação</p>
                  <p className="text-sm text-gray-700">{firstInfo.segmentacao}</p>
                </div>
              )}
              {firstInfo.publico && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <p className="text-xs font-medium text-gray-500 mb-2">Público</p>
                  <p className="text-sm text-gray-700">{firstInfo.publico}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PIInfoCard;
