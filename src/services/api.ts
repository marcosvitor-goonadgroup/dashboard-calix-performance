import axios from 'axios';
import { ApiResponse, ProcessedCampaignData } from '../types/campaign';
import { parse, startOfDay } from 'date-fns';

const API_BASE = import.meta.env.DEV ? '/api-proxy' : 'https://nmbcoamazonia-api.vercel.app';

// Planilha BRB — colunas: [0]Date [1]Campaign name [2]Ad Set Name [3]Ad Name [4]Cost
// [5]Impressions [6]Reach [7]Clicks [8]Video views [9]Video views 25% [10]Video views 50%
// [11]Video views 75% [12]Video completions [13]Total engagements [14]Veículo
// [15]Tipo de Compra [16]video_estatico_audio [17]Campanha [18]Número PI
const CAMPAIGN_API_URLS = [
  `${API_BASE}/google/sheets/1iF0N74Bd9s3pBnnzgiRRXE7KmxsFmTFXhK9UyM-ppDw/data?range=Consolidado`
];

const PI_INFO_API_URL = `${API_BASE}/google/sheets/1T35Pzw9ZA5NOTLHsTqMGZL5IEedpSGdZHJ2ElrqLs1M/data`;

const parseNumber = (value: string): number => {
  if (!value || value === '') return 0;
  const cleaned = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

const parseCurrency = (value: string): number => {
  if (!value || value === '') return 0;
  // Remove "R$" e espaços, depois processa como número
  const cleaned = value.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};


const parseDate = (dateString: string): Date => {
  try {
    if (!dateString) return startOfDay(new Date());
    if (dateString.includes('/')) {
      return startOfDay(parse(dateString, 'dd/MM/yyyy', new Date()));
    }
    return startOfDay(parse(dateString, 'yyyy-MM-dd', new Date()));
  } catch {
    return startOfDay(new Date());
  }
};

const normalizeVeiculo = (veiculo: string): string => {
  const normalized = veiculo.trim();
  const lower = normalized.toLowerCase();
  if (lower === 'audience network' || lower === 'messenger' || lower === 'threads' || lower === 'unknown') {
    return 'Facebook';
  }
  return normalized;
};

const META_VEICULOS = new Set(['Facebook', 'Instagram']);
const CPM_RATE_META = 0.01365; // R$ por impressão (CPM Meta BRB)

const calcRealInvestment = (impressions: number, tipoDeCompra: string, veiculo: string): number => {
  if (tipoDeCompra.toUpperCase() === 'CPM' && META_VEICULOS.has(veiculo)) {
    return impressions * CPM_RATE_META;
  }
  return 0;
};

// Colunas BRB Consolidado:
// [0]Date [1]Campaign name [2]Ad Set Name [3]Ad Name [4]Cost [5]Impressions [6]Reach
// [7]Clicks [8]Video views [9]Video views 25% [10]Video views 50% [11]Video views 75%
// [12]Video completions [13]Total engagements [14]Veículo [15]Tipo de Compra
// [16]video_estatico_audio [17]Campanha [18]Número PI
export const fetchCampaignData = async (): Promise<ProcessedCampaignData[]> => {
  try {
    const responses = await Promise.all(
      CAMPAIGN_API_URLS.map(url => axios.get<ApiResponse>(url))
    );

    const allData: ProcessedCampaignData[] = [];

    responses.forEach(response => {
      if (response.data.success && response.data.data.values.length > 1) {
        const rows = response.data.data.values.slice(1);

        rows.forEach(row => {
          if (row.length >= 14) {
            const numeroPi = row[18] || '';
            const veiculoRaw = row[14] || '';
            const veiculo = normalizeVeiculo(veiculoRaw);

            if (numeroPi === '#VALUE!') return;

            const tipoDeCompra = row[15] || '';
            const impressions = parseNumber(row[5]);
            const realInvestment = calcRealInvestment(impressions, tipoDeCompra, veiculo);

            const dataRow: ProcessedCampaignData = {
              date: parseDate(row[0]),
              campaignName: row[1] || '',
              adSetName: row[2] || '',
              adName: row[3] || '',
              cost: parseCurrency(row[4]),
              impressions,
              reach: parseNumber(row[6]),
              clicks: parseNumber(row[7]),
              videoViews: parseNumber(row[8]),
              videoViews25: parseNumber(row[9]),
              videoViews50: parseNumber(row[10]),
              videoViews75: parseNumber(row[11]),
              videoCompletions: parseNumber(row[12]),
              totalEngagements: parseNumber(row[13]),
              veiculo,
              tipoDeCompra,
              videoEstaticoAudio: row[16] || '',
              image: '',
              campanha: row[17] || '',
              numeroPi,
              cliente: 'BRB',
              realInvestment: realInvestment > 0 ? realInvestment : undefined,
            };
            allData.push(dataRow);
          }
        });
      }
    });

    return allData;
  } catch (error) {
    console.error('Erro ao buscar dados das campanhas:', error);
    throw error;
  }
};

export const fetchPIInfo = async (numeroPi: string) => {
  try {
    const response = await axios.get(PI_INFO_API_URL);

    if (!response.data.success || !response.data.data.values) {
      throw new Error('Formato de resposta inválido');
    }

    const values = response.data.data.values;

    // Remove zeros à esquerda para comparação
    const normalizedPi = numeroPi.replace(/^0+/, '');

    // Encontra todas as linhas com o número PI especificado
    // Compara removendo zeros à esquerda de ambos os lados
    const piRows = values.slice(1).filter((row: string[]) => {
      const rowPi = (row[2] || '').replace(/^0+/, '');
      return rowPi === normalizedPi;
    });

    if (piRows.length === 0) {
      return null;
    }

    // Agrupa informações por veículo
    // Colunas: [0] Agência, [1] Cliente, [2] Número PI, [3] Veículo, [4] Canal,
    //          [5] Formato, [6] Modelo Compra, [7] Valor Uni, [8] Desconto,
    //          [9] Valor Negociado, [10] Qtd, [11] TT Bruto, [12] Reaplicação,
    //          [13] Status, [14] Segmentação, [15] Alcance, [16] Inicio, [17] Fim,
    //          [18] Público, [19] Praça, [20] Objetivo
    const piInfo = piRows.map((row: string[]) => ({
      numeroPi: row[2] || '',
      veiculo: row[3] || '',
      canal: row[4] || '',
      formato: row[5] || '',
      modeloCompra: row[6] || '',
      valorNegociado: row[9] || '',
      quantidade: row[10] || '',
      totalBruto: row[11] || '',
      status: row[13] || '',
      segmentacao: row[14] || '',
      alcance: row[15] || '',
      inicio: row[16] || '',
      fim: row[17] || '',
      publico: row[18] || '',
      praca: row[19] || '',
      objetivo: row[20] || ''
    }));

    return piInfo;
  } catch (error) {
    console.error('Erro ao buscar informações do PI:', error);
    return null;
  }
};
