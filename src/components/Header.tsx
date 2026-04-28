import adDeskWhite from '../images/ad-desk-white.svg';

interface HeaderProps {
  onOpenFilters: () => void;
  onClearFilters: () => void;
  activeFiltersCount: number;
  agencia?: string;
}

const Header = ({ onOpenFilters, onClearFilters, activeFiltersCount, agencia }: HeaderProps) => {
  return (
    <header className="w-full bg-[#153ece] rounded-[34px] px-8 py-6 mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          <img
            src={adDeskWhite}
            alt="AD Desk"
            className="h-14 w-auto shrink-0"
          />
          <div className="border-l border-white/30 pl-6 min-w-0">
            <p className="text-white font-bold text-xl sm:text-2xl leading-tight whitespace-nowrap">
              Painel de Campanhas
              {agencia && (
                <span className="text-white/70"> | {agencia}</span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {activeFiltersCount > 0 && (
            <button
              onClick={onClearFilters}
              className="flex items-center justify-center w-10 h-10 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-colors"
              title="Limpar filtros"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <button
            onClick={onOpenFilters}
            className="relative flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white rounded-2xl transition-colors font-medium text-sm whitespace-nowrap"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="hidden sm:inline">Filtros</span>
            {activeFiltersCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-white text-[#153ece] text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {activeFiltersCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
