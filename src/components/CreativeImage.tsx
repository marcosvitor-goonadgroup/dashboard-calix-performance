import { useState } from 'react';

interface CreativeImageProps {
  imageUrl: string | null;
  creativeName: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Componente para exibir imagem de um criativo
 * Mostra um placeholder caso a imagem não esteja disponível
 */
const CreativeImage = ({ imageUrl, creativeName, size = 'small' }: CreativeImageProps) => {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Dimensões baseadas no tamanho
  const dimensions = {
    small: { width: 60, height: 60 },
    medium: { width: 100, height: 100 },
    large: { width: 150, height: 150 }
  };

  const { width, height } = dimensions[size];

  // Se não houver URL ou houver erro ao carregar
  if (!imageUrl || imageError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 rounded border border-gray-200"
        style={{ width, height }}
        title={creativeName}
      >
        <svg
          className="text-gray-400"
          style={{ width: width / 2, height: height / 2 }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="relative rounded border border-gray-200 overflow-hidden"
      style={{ width, height }}
      title={creativeName}
    >
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className="absolute inset-0 bg-gray-200 animate-pulse"
          style={{ width, height }}
        />
      )}

      {/* Imagem */}
      <img
        src={imageUrl}
        alt={creativeName}
        className={`object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ width, height }}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setImageError(true);
          setIsLoading(false);
        }}
        loading="lazy"
      />
    </div>
  );
};

export default CreativeImage;
