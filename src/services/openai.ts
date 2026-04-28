import axios from 'axios';
import { ProcessedCampaignData } from '../types/campaign';
import { subDays, format } from 'date-fns';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// Modelo GPT-4o-mini - excelente custo-benefício para análise de dados
// Preço: $0.15/1M input tokens, $0.60/1M output tokens
const MODEL = 'gpt-4o-mini';

interface VehicleMetrics {
  veiculo: string;
  tipoDeCompra: string;
  impressoes: number;
  cliques: number;
  views: number;
  views100: number;
  engajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

interface CampaignMetrics {
  campanha: string;
  totalImpressoes: number;
  totalCliques: number;
  totalViews: number;
  totalViews100: number;
  totalEngajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
  veiculos: VehicleMetrics[];
}

/**
 * Agrupa dados por campanha, depois por veículo e tipo de compra dentro de cada campanha
 */
const aggregateByCampaign = (data: ProcessedCampaignData[]): CampaignMetrics[] => {
  const campaignMap = new Map<string, CampaignMetrics>();

  data.forEach(item => {
    const campanha = item.campanha || 'Sem campanha';

    if (!campaignMap.has(campanha)) {
      campaignMap.set(campanha, {
        campanha,
        totalImpressoes: 0,
        totalCliques: 0,
        totalViews: 0,
        totalViews100: 0,
        totalEngajamentos: 0,
        ctr: 0,
        vtr: 0,
        taxaEngajamento: 0,
        veiculos: []
      });
    }

    const campaign = campaignMap.get(campanha)!;

    campaign.totalImpressoes += item.impressions;
    campaign.totalCliques += item.clicks;
    campaign.totalViews += item.videoViews;
    campaign.totalViews100 += item.videoCompletions;
    campaign.totalEngajamentos += item.totalEngagements;

    let vehicleMetrics = campaign.veiculos.find(
      v => v.veiculo === item.veiculo && v.tipoDeCompra === item.tipoDeCompra
    );

    if (!vehicleMetrics) {
      vehicleMetrics = {
        veiculo: item.veiculo,
        tipoDeCompra: item.tipoDeCompra,
        impressoes: 0,
        cliques: 0,
        views: 0,
        views100: 0,
        engajamentos: 0,
        ctr: 0,
        vtr: 0,
        taxaEngajamento: 0
      };
      campaign.veiculos.push(vehicleMetrics);
    }

    vehicleMetrics.impressoes += item.impressions;
    vehicleMetrics.cliques += item.clicks;
    vehicleMetrics.views += item.videoViews;
    vehicleMetrics.views100 += item.videoCompletions;
    vehicleMetrics.engajamentos += item.totalEngagements;
  });

  campaignMap.forEach(campaign => {
    if (campaign.totalImpressoes > 0) {
      campaign.ctr = (campaign.totalCliques / campaign.totalImpressoes) * 100;
      campaign.vtr = (campaign.totalViews100 / campaign.totalImpressoes) * 100;
      campaign.taxaEngajamento = (campaign.totalEngajamentos / campaign.totalImpressoes) * 100;
    }

    campaign.veiculos.forEach(vehicle => {
      if (vehicle.impressoes > 0) {
        vehicle.ctr = (vehicle.cliques / vehicle.impressoes) * 100;
        vehicle.vtr = (vehicle.views100 / vehicle.impressoes) * 100;
        vehicle.taxaEngajamento = (vehicle.engajamentos / vehicle.impressoes) * 100;
      }
    });

    campaign.veiculos.sort((a, b) => b.impressoes - a.impressoes);
  });

  return Array.from(campaignMap.values())
    .sort((a, b) => b.totalImpressoes - a.totalImpressoes);
};

/**
 * Monta o prompt para análise da semana
 */
const buildAnalysisPrompt = async (
  currentWeekData: ProcessedCampaignData[],
  previousWeekData: ProcessedCampaignData[] | null
): Promise<string> => {
  const currentCampaigns = aggregateByCampaign(currentWeekData);
  const previousCampaigns = previousWeekData ? aggregateByCampaign(previousWeekData) : null;

  const { fetchAllBenchmarks } = await import('./benchmarkService');
  const benchmarksMap = await fetchAllBenchmarks();

  const currentDate = currentWeekData.length > 0
    ? format(currentWeekData[0].date, 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  const totalImpressoes = currentCampaigns.reduce((sum, c) => sum + c.totalImpressoes, 0);
  const totalCliques = currentCampaigns.reduce((sum, c) => sum + c.totalCliques, 0);
  const totalViews100 = currentCampaigns.reduce((sum, c) => sum + c.totalViews100, 0);
  const totalEngajamentos = currentCampaigns.reduce((sum, c) => sum + c.totalEngajamentos, 0);

  const benchGeralCtr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
  const benchGeralVtr = totalImpressoes > 0 ? (totalViews100 / totalImpressoes) * 100 : 0;
  const benchGeralEng = totalImpressoes > 0 ? (totalEngajamentos / totalImpressoes) * 100 : 0;

  let textoDados = `

BENCHMARK GERAL (TOTAL): CTR ${benchGeralCtr.toFixed(2)}%, VTR ${benchGeralVtr.toFixed(2)}%, Engajamento ${benchGeralEng.toFixed(2)}%
`;

  currentCampaigns.forEach(campaign => {
    const { campanha, ctr, vtr, taxaEngajamento, totalImpressoes } = campaign;

    const previousCampaign = previousCampaigns?.find(c => c.campanha === campanha);

    textoDados += `

📊 CAMPANHA: ${campanha}
   Performance Geral: CTR ${ctr.toFixed(2)}%, VTR ${vtr.toFixed(2)}%, Engajamento ${taxaEngajamento.toFixed(2)}% (${formatNumber(totalImpressoes)} impressões)
   ${previousCampaign ? `Semana Anterior: CTR ${previousCampaign.ctr.toFixed(2)}%, VTR ${previousCampaign.vtr.toFixed(2)}%, Engajamento ${previousCampaign.taxaEngajamento.toFixed(2)}%` : 'Semana Anterior: Sem dados'}

   Veículos:`;

    campaign.veiculos.forEach(vehicle => {
      const { veiculo, tipoDeCompra, ctr: vCtr, vtr: vVtr, taxaEngajamento: vEng, impressoes } = vehicle;

      const benchmarkKeyEstatico = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|estatico`;
      const benchmarkKeyVideo = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|video`;

      const benchEstatico = benchmarksMap.get(benchmarkKeyEstatico);
      const benchVideo = benchmarksMap.get(benchmarkKeyVideo);

      const benchmarkToUse = benchEstatico || benchVideo;

      const vBenchCtr = benchmarkToUse?.ctr ?? benchGeralCtr;
      const vBenchVtr = benchmarkToUse?.vtr ?? benchGeralVtr;
      const vBenchEng = benchmarkToUse?.taxaEngajamento ?? benchGeralEng;

      const previousVehicle = previousCampaign?.veiculos.find(
        v => v.veiculo === veiculo && v.tipoDeCompra === tipoDeCompra
      );

      const metricsText: string[] = [];
      if (vCtr > 0) metricsText.push(`CTR ${vCtr.toFixed(2)}%`);
      if (vVtr > 0) metricsText.push(`VTR ${vVtr.toFixed(2)}%`);
      if (vEng > 0) metricsText.push(`Engajamento ${vEng.toFixed(2)}%`);

      const benchText: string[] = [];
      if (vCtr > 0) benchText.push(`CTR ${vBenchCtr.toFixed(2)}%`);
      if (vVtr > 0) benchText.push(`VTR ${vBenchVtr.toFixed(2)}%`);
      if (vEng > 0) benchText.push(`Engajamento ${vBenchEng.toFixed(2)}%`);

      const prevText: string[] = [];
      if (previousVehicle) {
        if (vCtr > 0 && previousVehicle.ctr > 0) prevText.push(`CTR ${previousVehicle.ctr.toFixed(2)}%`);
        if (vVtr > 0 && previousVehicle.vtr > 0) prevText.push(`VTR ${previousVehicle.vtr.toFixed(2)}%`);
        if (vEng > 0 && previousVehicle.taxaEngajamento > 0) prevText.push(`Engajamento ${previousVehicle.taxaEngajamento.toFixed(2)}%`);
      }

      textoDados += `
      • ${veiculo} (${tipoDeCompra}) - ${formatNumber(impressoes)} impressões
        Atual: ${metricsText.join(', ')}
        Benchmark: ${benchText.join(', ')}${prevText.length > 0 ? `\n        Semana Anterior: ${prevText.join(', ')}` : ''}`;
    });
  });

  return `
Você é um analista de performance de mídia online.
Analise a semana iniciada em ${currentDate}.

DADOS:
${textoDados}

REGRAS IMPORTANTES:
1. NÃO analise métricas zeradas (0.00%)
2. Compare cada campanha com o BENCHMARK GERAL mostrado no topo
3. Compare cada veículo com seu BENCHMARK ESPECÍFICO
4. Se houver dados da semana anterior, mencione evolução/queda

FORMATO DA RESPOSTA (EXATAMENTE 2 PARÁGRAFOS):

Parágrafo 1 - CAMPANHAS:
Analise a performance GERAL de cada campanha vs Benchmark Geral. Mencione explicitamente o nome das campanhas e se estão acima/abaixo do benchmark. Cite números específicos. Compare com semana anterior se houver dados.

Parágrafo 2 - VEÍCULOS:
Analise a performance dos VEÍCULOS dentro de cada campanha vs seus benchmarks específicos. Destaque os veículos com melhor e pior performance. Cite números específicos. Identifique padrões claros (ex: todos os veículos de uma campanha estão abaixo do bench).

IMPORTANTE:
- Seja direto e factual
- NÃO dê sugestões ou recomendações
- Foque na LEITURA do que está acontecendo
- Use português profissional
- Cite números específicos
- Máximo 2 parágrafos
  `;
};

/**
 * Formata número de forma legível
 */
const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toFixed(0);
};

/**
 * Chama a API da OpenAI via servidor (evita CORS e protege a chave)
 */
const callOpenAIAPI = async (prompt: string): Promise<string> => {
  // Em produção usa o endpoint serverless; em dev local chama diretamente
  const isProduction = import.meta.env.PROD;

  if (isProduction) {
    try {
      console.log(`🔄 Gerando análise via /api/generate...`);
      const response = await axios.post('/api/generate', { prompt, model: MODEL }, { timeout: 90000 });
      console.log(`✅ Análise gerada com sucesso usando ${response.data.model}`);
      return response.data.analysis;
    } catch (error: any) {
      const statusCode = error.response?.status;
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message;
      console.error(`❌ Erro em /api/generate: ${statusCode || 'rede'} - ${errorMessage}`);
      if (statusCode === 401) throw new Error('Chave de API inválida no servidor.');
      throw new Error(errorMessage || 'Erro ao gerar análise');
    }
  }

  // Desenvolvimento local: chama OpenAI diretamente
  try {
    console.log(`🔄 Gerando análise com modelo: ${MODEL}...`);
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: MODEL,
        messages: [
          { role: 'system', content: 'Você é um analista especializado em performance de mídia digital. Seja objetivo, factual e cite números específicos.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1500
      },
      {
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
        timeout: 60000
      }
    );

    if (response.data.choices?.length > 0) {
      console.log(`✅ Análise gerada com sucesso usando ${MODEL}`);
      return response.data.choices[0].message.content;
    }
    throw new Error('API não retornou conteúdo válido');

  } catch (error: any) {
    const statusCode = error.response?.status;
    const errorMessage = error.response?.data?.error?.message || error.message;
    console.error(`❌ Erro na API OpenAI: ${statusCode || 'Erro de rede'} - ${errorMessage}`);
    if (statusCode === 401) throw new Error('Chave de API inválida. Verifique VITE_OPENAI_API_KEY no .env');
    if (statusCode === 429) throw new Error('Limite de requisições atingido. Aguarde alguns minutos.');
    if (statusCode === 500 || statusCode === 503) throw new Error('Serviço da OpenAI temporariamente indisponível.');
    throw new Error(errorMessage || 'Erro ao gerar análise');
  }
};

/**
 * Gera análise da semana usando IA (com cache)
 */
export const generateWeeklyAnalysis = async (
  currentWeekData: ProcessedCampaignData[],
  allData: ProcessedCampaignData[],
  dataKey: string,
  forceRefresh: boolean = false
): Promise<{ analysis: string; cached: boolean; timestamp: string }> => {
  try {
    if (currentWeekData.length === 0) {
      return {
        analysis: 'Não há dados disponíveis para análise desta semana.',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }

    const { getCachedAnalysis, setCachedAnalysis } = await import('./cache');

    if (!forceRefresh) {
      const cached = await getCachedAnalysis(dataKey);
      if (cached) {
        return cached;
      }
    } else {
      console.log('🔄 Forçando nova análise (ignorando cache)...');
    }

    console.log('🔄 Gerando nova análise...');

    const dates = currentWeekData.map(d => d.date);
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

    const previousWeekStart = subDays(minDate, 7);
    const previousWeekEnd = subDays(maxDate, 7);

    const previousWeekData = allData.filter(
      item => item.date >= previousWeekStart && item.date <= previousWeekEnd
    );

    const prompt = await buildAnalysisPrompt(
      currentWeekData,
      previousWeekData.length > 0 ? previousWeekData : null
    );

    const analysis = await callOpenAIAPI(prompt);

    await setCachedAnalysis(dataKey, analysis);

    return {
      analysis,
      cached: false,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Erro ao gerar análise:', error);
    throw new Error(error.message || 'Erro ao gerar análise');
  }
};

/**
 * Interface para dados de criativos agregados
 */
interface CreativeMetrics {
  creative: string;
  campanha: string;
  veiculo: string;
  tipoDeCompra: string;
  tipoMidia: string;
  impressoes: number;
  cliques: number;
  views100: number;
  engajamentos: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

interface CampaignCreatives {
  campanha: string;
  totalImpressoes: number;
  creativos: CreativeMetrics[];
}

/**
 * Agrupa dados por campanha e depois por criativo
 */
const aggregateByCreative = (data: ProcessedCampaignData[]): CampaignCreatives[] => {
  const campaignMap = new Map<string, CampaignCreatives>();

  data.forEach(item => {
    const campanha = item.campanha || 'Sem campanha';
    const creative = item.adName || 'Sem nome';

    if (!campaignMap.has(campanha)) {
      campaignMap.set(campanha, {
        campanha,
        totalImpressoes: 0,
        creativos: []
      });
    }

    const campaign = campaignMap.get(campanha)!;
    campaign.totalImpressoes += item.impressions;

    let creativeMetrics = campaign.creativos.find(
      c => c.creative === creative && c.veiculo === item.veiculo && c.tipoDeCompra === item.tipoDeCompra
    );

    if (!creativeMetrics) {
      creativeMetrics = {
        creative,
        campanha,
        veiculo: item.veiculo,
        tipoDeCompra: item.tipoDeCompra,
        tipoMidia: item.videoEstaticoAudio || 'estatico',
        impressoes: 0,
        cliques: 0,
        views100: 0,
        engajamentos: 0,
        ctr: 0,
        vtr: 0,
        taxaEngajamento: 0
      };
      campaign.creativos.push(creativeMetrics);
    }

    creativeMetrics.impressoes += item.impressions;
    creativeMetrics.cliques += item.clicks;
    creativeMetrics.views100 += item.videoCompletions;
    creativeMetrics.engajamentos += item.totalEngagements;
  });

  campaignMap.forEach(campaign => {
    campaign.creativos.forEach(creative => {
      if (creative.impressoes > 0) {
        creative.ctr = (creative.cliques / creative.impressoes) * 100;
        creative.vtr = (creative.views100 / creative.impressoes) * 100;
        creative.taxaEngajamento = (creative.engajamentos / creative.impressoes) * 100;
      }
    });

    campaign.creativos.sort((a, b) => b.impressoes - a.impressoes);
  });

  return Array.from(campaignMap.values())
    .sort((a, b) => b.totalImpressoes - a.totalImpressoes);
};

/**
 * Monta o prompt para análise de criativos
 */
const buildCreativeAnalysisPrompt = async (
  currentWeekData: ProcessedCampaignData[]
): Promise<string> => {
  const campaigns = aggregateByCreative(currentWeekData);

  const { fetchAllBenchmarks } = await import('./benchmarkService');
  const benchmarksMap = await fetchAllBenchmarks();

  const currentDate = currentWeekData.length > 0
    ? format(currentWeekData[0].date, 'dd/MM/yyyy')
    : format(new Date(), 'dd/MM/yyyy');

  let textoDados = ``;

  campaigns.forEach(campaign => {
    const { campanha, totalImpressoes, creativos } = campaign;

    textoDados += `

📊 CAMPANHA: ${campanha} (${formatNumber(totalImpressoes)} impressões totais)

   Top Criativos:`;

    const topCreatives = creativos.slice(0, 5);

    topCreatives.forEach((creative, index) => {
      const { creative: name, veiculo, tipoDeCompra, tipoMidia, ctr, vtr, taxaEngajamento, impressoes } = creative;

      const benchmarkKey = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|${tipoMidia.toLowerCase()}`;
      const benchmark = benchmarksMap.get(benchmarkKey);

      const vBenchCtr = benchmark?.ctr ?? 0;
      const vBenchVtr = benchmark?.vtr ?? 0;
      const vBenchEng = benchmark?.taxaEngajamento ?? 0;

      const metricsText: string[] = [];
      if (ctr > 0) metricsText.push(`CTR ${ctr.toFixed(2)}%`);
      if (vtr > 0) metricsText.push(`VTR ${vtr.toFixed(2)}%`);
      if (taxaEngajamento > 0) metricsText.push(`Engajamento ${taxaEngajamento.toFixed(2)}%`);

      const benchText: string[] = [];
      if (ctr > 0) benchText.push(`CTR ${vBenchCtr.toFixed(2)}%`);
      if (vtr > 0) benchText.push(`VTR ${vBenchVtr.toFixed(2)}%`);
      if (taxaEngajamento > 0) benchText.push(`Engajamento ${vBenchEng.toFixed(2)}%`);

      const performanceText: string[] = [];
      if (ctr > 0 && vBenchCtr > 0) {
        const diff = ctr - vBenchCtr;
        performanceText.push(`CTR ${diff > 0 ? 'acima' : 'abaixo'} em ${Math.abs(diff).toFixed(2)}pp`);
      }
      if (vtr > 0 && vBenchVtr > 0) {
        const diff = vtr - vBenchVtr;
        performanceText.push(`VTR ${diff > 0 ? 'acima' : 'abaixo'} em ${Math.abs(diff).toFixed(2)}pp`);
      }
      if (taxaEngajamento > 0 && vBenchEng > 0) {
        const diff = taxaEngajamento - vBenchEng;
        performanceText.push(`Engajamento ${diff > 0 ? 'acima' : 'abaixo'} em ${Math.abs(diff).toFixed(2)}pp`);
      }

      textoDados += `
      ${index + 1}. ${name}
         Veículo: ${veiculo} (${tipoDeCompra}) | Tipo: ${tipoMidia}
         Impressões: ${formatNumber(impressoes)}
         Métricas: ${metricsText.join(', ')}
         Benchmark: ${benchText.join(', ')}
         Performance: ${performanceText.join(', ')}`;
    });
  });

  return `
Você é um analista de performance de criativos de mídia online.
Analise os criativos da semana iniciada em ${currentDate}.

DADOS:
${textoDados}

REGRAS IMPORTANTES:
1. NÃO analise métricas zeradas (0.00%)
2. Compare cada criativo com seu BENCHMARK ESPECÍFICO (por veículo + tipo de compra + tipo de mídia)
3. Identifique padrões de performance (ex: criativos de vídeo performam melhor que estáticos)
4. Destaque os destaques positivos E negativos

FORMATO DA RESPOSTA (UM ÚNICO PARÁGRAFO):

Analise os criativos por campanha. Para cada campanha, identifique os criativos destaque (melhor e pior performance vs benchmark). Mencione explicitamente o nome dos criativos, suas métricas e quanto estão acima/abaixo do benchmark. Identifique padrões claros (ex: todos os criativos de vídeo no Instagram estão acima do benchmark, mas os estáticos no Facebook estão abaixo).

IMPORTANTE:
- Seja direto e factual
- NÃO dê sugestões ou recomendações
- Foque na LEITURA do que está acontecendo
- Use português profissional
- Cite nomes específicos dos criativos
- Máximo 1 parágrafo denso e informativo
  `;
};

/**
 * Gera análise de criativos usando IA (com cache)
 */
export const generateCreativeAnalysis = async (
  currentWeekData: ProcessedCampaignData[],
  dataKey: string,
  forceRefresh: boolean = false
): Promise<{ analysis: string; cached: boolean; timestamp: string }> => {
  try {
    if (currentWeekData.length === 0) {
      return {
        analysis: 'Não há dados disponíveis para análise de criativos desta semana.',
        cached: false,
        timestamp: new Date().toISOString()
      };
    }

    const { getCachedAnalysis, setCachedAnalysis } = await import('./cache');

    if (!forceRefresh) {
      const cached = await getCachedAnalysis(dataKey);
      if (cached) {
        return cached;
      }
    } else {
      console.log('🔄 Forçando nova análise de criativos (ignorando cache)...');
    }

    console.log('🔄 Gerando nova análise de criativos...');

    const prompt = await buildCreativeAnalysisPrompt(currentWeekData);

    const analysis = await callOpenAIAPI(prompt);

    await setCachedAnalysis(dataKey, analysis);

    return {
      analysis,
      cached: false,
      timestamp: new Date().toISOString()
    };

  } catch (error: any) {
    console.error('Erro ao gerar análise de criativos:', error);
    throw new Error(error.message || 'Erro ao gerar análise de criativos');
  }
};

/**
 * Monta o prompt para análise sob demanda
 */
const buildOnDemandAnalysisPrompt = async (
  data: ProcessedCampaignData[],
  allDataForBenchmark: ProcessedCampaignData[]
): Promise<string> => {
  const campaigns = aggregateByCampaign(data);

  const { fetchAllBenchmarks } = await import('./benchmarkService');
  const benchmarksMap = await fetchAllBenchmarks();

  const dates = data.map(d => d.date);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
  const periodStart = format(minDate, 'dd/MM/yyyy');
  const periodEnd = format(maxDate, 'dd/MM/yyyy');

  const allCampaigns = aggregateByCampaign(allDataForBenchmark);
  const totalImpressoes = allCampaigns.reduce((sum, c) => sum + c.totalImpressoes, 0);
  const totalCliques = allCampaigns.reduce((sum, c) => sum + c.totalCliques, 0);
  const totalViews100 = allCampaigns.reduce((sum, c) => sum + c.totalViews100, 0);
  const totalEngajamentos = allCampaigns.reduce((sum, c) => sum + c.totalEngajamentos, 0);

  const benchGeralCtr = totalImpressoes > 0 ? (totalCliques / totalImpressoes) * 100 : 0;
  const benchGeralVtr = totalImpressoes > 0 ? (totalViews100 / totalImpressoes) * 100 : 0;
  const benchGeralEng = totalImpressoes > 0 ? (totalEngajamentos / totalImpressoes) * 100 : 0;

  let textoDados = `

BENCHMARK GERAL (TOTAL): CTR ${benchGeralCtr.toFixed(2)}%, VTR ${benchGeralVtr.toFixed(2)}%, Engajamento ${benchGeralEng.toFixed(2)}%
`;

  campaigns.forEach(campaign => {
    const { campanha, ctr, vtr, taxaEngajamento, totalImpressoes } = campaign;

    textoDados += `

📊 CAMPANHA: ${campanha}
   Performance Geral: CTR ${ctr.toFixed(2)}%, VTR ${vtr.toFixed(2)}%, Engajamento ${taxaEngajamento.toFixed(2)}% (${formatNumber(totalImpressoes)} impressões)

   Veículos:`;

    campaign.veiculos.forEach(vehicle => {
      const { veiculo, tipoDeCompra, ctr: vCtr, vtr: vVtr, taxaEngajamento: vEng, impressoes } = vehicle;

      const benchmarkKeyEstatico = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|estatico`;
      const benchmarkKeyVideo = `${veiculo.toLowerCase()}|${tipoDeCompra.toLowerCase()}|video`;

      const benchEstatico = benchmarksMap.get(benchmarkKeyEstatico);
      const benchVideo = benchmarksMap.get(benchmarkKeyVideo);

      const benchmarkToUse = benchEstatico || benchVideo;

      const vBenchCtr = benchmarkToUse?.ctr ?? benchGeralCtr;
      const vBenchVtr = benchmarkToUse?.vtr ?? benchGeralVtr;
      const vBenchEng = benchmarkToUse?.taxaEngajamento ?? benchGeralEng;

      const metricsText: string[] = [];
      if (vCtr > 0) metricsText.push(`CTR ${vCtr.toFixed(2)}%`);
      if (vVtr > 0) metricsText.push(`VTR ${vVtr.toFixed(2)}%`);
      if (vEng > 0) metricsText.push(`Engajamento ${vEng.toFixed(2)}%`);

      const benchText: string[] = [];
      if (vCtr > 0) benchText.push(`CTR ${vBenchCtr.toFixed(2)}%`);
      if (vVtr > 0) benchText.push(`VTR ${vBenchVtr.toFixed(2)}%`);
      if (vEng > 0) benchText.push(`Engajamento ${vBenchEng.toFixed(2)}%`);

      textoDados += `
      • ${veiculo} (${tipoDeCompra}) - ${formatNumber(impressoes)} impressões
        Atual: ${metricsText.join(', ')}
        Benchmark: ${benchText.join(', ')}`;
    });
  });

  return `
Você é um analista de performance de mídia online.
Analise o período de ${periodStart} a ${periodEnd}.

DADOS:
${textoDados}

REGRAS IMPORTANTES:
1. NÃO analise métricas zeradas (0.00%)
2. Compare cada campanha com o BENCHMARK GERAL mostrado no topo
3. Compare cada veículo com seu BENCHMARK ESPECÍFICO
4. NÃO mencione período anterior, apenas compare com benchmarks

FORMATO DA RESPOSTA (EXATAMENTE 2 PARÁGRAFOS):

Parágrafo 1 - CAMPANHAS:
Analise a performance GERAL de cada campanha vs Benchmark Geral. Mencione explicitamente o nome das campanhas e se estão acima/abaixo do benchmark. Cite números específicos.

Parágrafo 2 - VEÍCULOS:
Analise a performance dos VEÍCULOS dentro de cada campanha vs seus benchmarks específicos. Destaque os veículos com melhor e pior performance. Cite números específicos. Identifique padrões claros (ex: todos os veículos de uma campanha estão abaixo do bench).

IMPORTANTE:
- Seja direto e factual
- NÃO dê sugestões ou recomendações
- Foque na LEITURA do que está acontecendo
- Use português profissional
- Cite números específicos
- Máximo 2 parágrafos
  `;
};

/**
 * Gera análise sob demanda para qualquer período
 */
export const generateOnDemandAnalysis = async (
  data: ProcessedCampaignData[],
  allDataForBenchmark: ProcessedCampaignData[]
): Promise<string> => {
  try {
    if (data.length === 0) {
      throw new Error('Não há dados disponíveis para análise.');
    }

    console.log('🔄 Gerando análise sob demanda...');

    const prompt = await buildOnDemandAnalysisPrompt(data, allDataForBenchmark);

    const analysis = await callOpenAIAPI(prompt);

    console.log('✅ Análise sob demanda gerada com sucesso');

    return analysis;

  } catch (error: any) {
    console.error('Erro ao gerar análise sob demanda:', error);
    throw new Error(error.message || 'Erro ao gerar análise');
  }
};
