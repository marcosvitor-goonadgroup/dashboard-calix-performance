export interface CampaignDataRow {
  Date: string;
  "Campaign name": string;
  "Ad Set Name": string;
  "Ad Name": string;
  Cost: string;
  Impressions: string;
  Reach: string;
  Clicks: string;
  "Video views": string;
  "Video views 25%": string;
  "Video views 50%": string;
  "Video views 75%": string;
  "Video completions": string;
  "Total engagements": string;
  Veículo: string;
  "Tipo de Compra": string;
  video_estatico_audio: string;
  Campanha: string;
  "Número PI": string;
}

export interface ApiResponse {
  success: boolean;
  data: {
    range: string;
    majorDimension: string;
    values: string[][];
  };
}

export interface ProcessedCampaignData {
  date: Date;
  campaignName: string;
  adSetName: string;
  adName: string;
  cost: number;
  impressions: number;
  reach: number;
  clicks: number;
  videoViews: number;
  videoViews25: number;
  videoViews50: number;
  videoViews75: number;
  videoCompletions: number;
  totalEngagements: number;
  veiculo: string;
  tipoDeCompra: string;
  videoEstaticoAudio: string;
  image: string; // URL da imagem do criativo
  campanha: string;
  numeroPi: string;
  cliente: string;
  realInvestment?: number; // Investimento calculado pela tabela de preços
}

export interface CampaignMetrics {
  investimento: number;
  investimentoReal?: number; // Investimento calculado pela tabela de preços
  impressoes: number;
  cliques: number;
  views: number;
  engajamento: number;
  cpm: number;
  cpc: number;
  cpv: number;
  cpe: number;
  ctr: number;
  vtr: number;
  taxaEngajamento: number;
}

export interface CampaignSummary {
  nome: string;
  status: 'active' | 'inactive';
  lastActivity: Date;
  metrics: CampaignMetrics;
}

export interface Filters {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  veiculo: string[];
  tipoDeCompra: string[];
  campanha: string[];
  numeroPi: string | null;
}

export interface GoogleSearchDataRow {
  Day: string;
  "Campaign Name": string;
  "Search term": string;
  "Cost (Spend)": string;
  Impressions: string;
  Clicks: string;
  Veículo: string;
  Campanha: string;
}

export interface ProcessedSearchData {
  date: Date;
  campaignName: string;
  searchTerm: string;
  cost: number;
  impressions: number;
  clicks: number;
  veiculo: string;
  campanha: string;
  ctr: number;
}

export interface SearchTermMetrics {
  term: string;
  clicks: number;
  impressions: number;
  ctr: number;
  cost: number;
}

export interface BenchmarkKPIs {
  vtr: number;
  ctr: number;
  taxaEngajamento: number;
}

export interface VehicleBenchmark {
  veiculo: string;
  kpis: BenchmarkKPIs;
  tiposDeCompra: {
    [tipoDeCompra: string]: BenchmarkKPIs;
  };
}

export interface BenchmarkConfig {
  geral: BenchmarkKPIs;
  veiculos: VehicleBenchmark[];
}

export interface PricingTableRow {
  veiculo: string;
  canal: string;
  formato: string;
  tipoDeCompra: string;
  valorUnitario: number;
  desconto: number;
  valorFinal: number;
}

export interface PIInfo {
  numeroPi: string;
  veiculo: string;
  canal: string;
  formato: string;
  modeloCompra: string;
  valorNegociado: string;
  quantidade: string;
  totalBruto: string;
  status: string;
  segmentacao: string;
  alcance: string;
  inicio: string;
  fim: string;
  publico: string;
  praca: string;
  objetivo: string;
}
