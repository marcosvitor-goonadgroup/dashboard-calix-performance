import { BenchmarkConfig } from '../types/campaign';

/**
 * Configuração de Benchmarks do Cliente
 *
 * Estrutura:
 * - geral: KPIs de referência gerais do cliente
 * - veiculos: KPIs específicos por veículo
 *   - kpis: KPIs gerais do veículo
 *   - tiposDeCompra: KPIs específicos por tipo de compra dentro do veículo
 *
 * Valores em percentual (ex: 25 = 25%)
 */
export const benchmarkConfig: BenchmarkConfig = {
  // Benchmark Geral do Cliente
  geral: {
    vtr: 25.0,           // 25% - Video Through Rate
    ctr: 1.0,            // 1% - Click-Through Rate
    taxaEngajamento: 2.0 // 2% - Taxa de Engajamento
  },

  // Benchmarks por Veículo
  veiculos: [
    {
      veiculo: 'Facebook',
      kpis: {
        vtr: 30.0,
        ctr: 1.2,
        taxaEngajamento: 2.5
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 28.0,
          ctr: 1.0,
          taxaEngajamento: 2.2
        },
        'Reserva': {
          vtr: 32.0,
          ctr: 1.4,
          taxaEngajamento: 2.8
        }
      }
    },
    {
      veiculo: 'Instagram',
      kpis: {
        vtr: 35.0,
        ctr: 1.5,
        taxaEngajamento: 3.0
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 33.0,
          ctr: 1.3,
          taxaEngajamento: 2.8
        },
        'Reserva': {
          vtr: 37.0,
          ctr: 1.7,
          taxaEngajamento: 3.2
        }
      }
    },
    {
      veiculo: 'TikTok',
      kpis: {
        vtr: 40.0,
        ctr: 2.0,
        taxaEngajamento: 4.0
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 38.0,
          ctr: 1.8,
          taxaEngajamento: 3.8
        },
        'Reserva': {
          vtr: 42.0,
          ctr: 2.2,
          taxaEngajamento: 4.2
        }
      }
    },
    {
      veiculo: 'LinkedIn',
      kpis: {
        vtr: 20.0,
        ctr: 0.8,
        taxaEngajamento: 1.5
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 18.0,
          ctr: 0.7,
          taxaEngajamento: 1.3
        },
        'Reserva': {
          vtr: 22.0,
          ctr: 0.9,
          taxaEngajamento: 1.7
        }
      }
    },
    {
      veiculo: 'YouTube',
      kpis: {
        vtr: 45.0,
        ctr: 0.5,
        taxaEngajamento: 1.8
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 43.0,
          ctr: 0.4,
          taxaEngajamento: 1.6
        },
        'Reserva': {
          vtr: 47.0,
          ctr: 0.6,
          taxaEngajamento: 2.0
        }
      }
    },
    {
      veiculo: 'Kwai',
      kpis: {
        vtr: 38.0,
        ctr: 1.8,
        taxaEngajamento: 3.5
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 36.0,
          ctr: 1.6,
          taxaEngajamento: 3.3
        },
        'Reserva': {
          vtr: 40.0,
          ctr: 2.0,
          taxaEngajamento: 3.7
        }
      }
    },
    {
      veiculo: 'Twitter',
      kpis: {
        vtr: 22.0,
        ctr: 1.0,
        taxaEngajamento: 2.2
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 20.0,
          ctr: 0.9,
          taxaEngajamento: 2.0
        },
        'Reserva': {
          vtr: 24.0,
          ctr: 1.1,
          taxaEngajamento: 2.4
        }
      }
    },
    {
      veiculo: 'Google Search',
      kpis: {
        vtr: 0.0,  // Não aplicável para Search
        ctr: 3.0,
        taxaEngajamento: 0.0  // Não aplicável para Search
      },
      tiposDeCompra: {
        'Programática': {
          vtr: 0.0,
          ctr: 2.8,
          taxaEngajamento: 0.0
        },
        'Reserva': {
          vtr: 0.0,
          ctr: 3.2,
          taxaEngajamento: 0.0
        }
      }
    }
  ]
};

/**
 * Função helper para obter o benchmark de um veículo
 */
export const getVehicleBenchmark = (veiculo: string) => {
  return benchmarkConfig.veiculos.find(v => v.veiculo === veiculo);
};

/**
 * Função helper para obter o benchmark de um veículo + tipo de compra
 */
export const getBenchmarkByVehicleAndType = (veiculo: string, tipoDeCompra: string) => {
  const vehicleBenchmark = getVehicleBenchmark(veiculo);
  if (!vehicleBenchmark) return null;

  return vehicleBenchmark.tiposDeCompra[tipoDeCompra] || vehicleBenchmark.kpis;
};
