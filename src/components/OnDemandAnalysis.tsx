import { useState } from 'react';
import { ProcessedCampaignData } from '../types/campaign';
import { generateOnDemandAnalysis } from '../services/openai';
import ShinyText from './ShinyText';

interface OnDemandAnalysisProps {
  data: ProcessedCampaignData[];
  allData: ProcessedCampaignData[];
  periodFilter: '7days' | 'all';
}

const OnDemandAnalysis = ({ data, allData, periodFilter }: OnDemandAnalysisProps) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [saving, setSaving] = useState(false);

  // Só renderiza quando NÃO estiver em "Últimos 7 dias"
  if (periodFilter === '7days') {
    return null;
  }

  const handleGenerateAnalysis = async () => {
    setLoading(true);
    setError(null);
    setAnalysis('');

    try {
      console.log('🚀 Iniciando geração de análise sob demanda...');
      const result = await generateOnDemandAnalysis(data, allData);
      setAnalysis(result);
      console.log('✅ Análise sob demanda gerada com sucesso');
    } catch (err: any) {
      console.error('❌ Erro ao gerar análise:', err);
      setError(err.message || 'Erro ao gerar análise. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!customName.trim() || !analysis) return;

    setSaving(true);
    try {
      console.log('📤 Salvando análise com nome personalizado...');

      // Importa o serviço de cache
      const { setCachedAnalysis } = await import('../services/cache');

      // Cria uma chave personalizada com o nome do usuário
      const customKey = `custom:${customName.trim()}`;

      // Salva a análise no Redis/localStorage
      await setCachedAnalysis(customKey, analysis);

      console.log('✅ Análise salva com sucesso');
      setShowSaveModal(false);
      setCustomName('');

      // Mostra confirmação
      alert('Análise salva com sucesso!');
    } catch (err: any) {
      console.error('❌ Erro ao salvar:', err);
      alert('Erro ao salvar a análise. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-800">
            Análise
          </h2>
        </div>

        {analysis && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5"
            title="Salvar análise com nome personalizado"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
              />
            </svg>
            Salvar
          </button>
        )}
      </div>

      <div className="mt-4">
        {!analysis && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <div className="text-center mb-2">
              <p className="text-sm text-gray-600 mb-1">
                Gere uma análise comparativa com benchmarks para o período selecionado
              </p>
              <p className="text-xs text-gray-500">
                A análise será baseada em dados agregados de campanhas e veículos
              </p>
            </div>
            <button
              onClick={handleGenerateAnalysis}
              className="px-6 py-3 text-base font-medium text-white bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Gerar Análise
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <ShinyText
              text="Analisando..."
              disabled={false}
              speed={2}
              className="text-2xl font-bold"
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 mb-1">
                  Erro ao gerar análise
                </h3>
                <p className="text-sm text-red-700">
                  {error}
                </p>
                <button
                  onClick={handleGenerateAnalysis}
                  className="mt-2 text-sm font-medium text-red-800 hover:text-red-900 underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="prose prose-sm max-w-none">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-100">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div className="flex-1">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {analysis}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 flex justify-center">
              <button
                onClick={handleGenerateAnalysis}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Gerar nova análise
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <span>
            Análise gerada com base em dados agregados e benchmarks
          </span>
        </div>
      </div>

      {/* Modal de Salvar */}
      {showSaveModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowSaveModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Salvar Análise
                </h3>
              </div>
              <button
                onClick={() => setShowSaveModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Fechar"
              >
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da análise:
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Ex: Análise Janeiro 2025"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                autoFocus
                disabled={saving}
              />
              <p className="text-xs text-gray-500 mt-2">
                Escolha um nome descritivo para identificar esta análise no futuro
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowSaveModal(false)}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveAnalysis}
                disabled={saving || !customName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Salvar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnDemandAnalysis;
