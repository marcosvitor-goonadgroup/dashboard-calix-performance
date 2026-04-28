/**
 * Serviço para buscar imagens de criativos do Google Drive
 */

const API_BASE = import.meta.env.DEV ? '/api-proxy' : 'https://nmbcoamazonia-api.vercel.app';
const BRB_FOLDER_ID = '1ge94s1Dcm5sBUjGUvvQj6kEXH6zjiwIV';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
  size?: string;
}

interface FolderResponse {
  success: boolean;
  data: DriveFile[];
  total: number;
}

/**
 * Cache para armazenar mapeamento de nomes de criativos para URLs de imagens
 */
const imageCache = new Map<string, string>();
const debugMapping = new Map<string, string>(); // Para debug: nome original -> nome normalizado
const videoCache = new Map<string, string>(); // Cache para URLs de vídeos
const carouselCache = new Map<string, DriveFile[]>(); // Cache para arquivos de carrossel
let cacheInitialized = false;

/**
 * Extrai apenas o ID numérico do nome do criativo
 * Exemplo: "970413363" de qualquer nome que contenha esse número
 */
const extractCreativeId = (name: string): string | null => {
  // Procura por um número de 8-10 dígitos no nome
  const match = name.match(/\d{8,10}/);
  return match ? match[0] : null;
};

/**
 * Normaliza o nome do criativo para comparação
 * Tenta múltiplas estratégias de normalização para melhor matching
 */
const normalizeCreativeName = (name: string): string => {
  // Primeira tentativa: extrai apenas o ID numérico
  const id = extractCreativeId(name);
  if (id) {
    return id;
  }

  // Segunda tentativa: normalização completa removendo prefixos comuns
  let normalized = name.toLowerCase().trim();

  // Remove prefixos comuns de taxonomia
  normalized = normalized
    .replace(/^(banner|video|imagem|estatico|estático|responsivo)_/g, '')
    .replace(/_none_/g, '_')
    .replace(/_na_/g, '_')
    .replace(/criativo-/g, '')
    .replace(/carrossel-/g, '');

  // Remove caracteres especiais e padroniza
  normalized = normalized
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return normalized;
};

/**
 * Busca arquivos de uma pasta do Google Drive
 */
const getFolderFiles = async (folderId: string): Promise<DriveFile[]> => {
  try {
    const response = await fetch(`${API_BASE}/google/drive/folder/${folderId}/files`);
    const data: FolderResponse = await response.json();

    if (!data.success) {
      console.error('Erro ao buscar arquivos da pasta:', folderId);
      return [];
    }

    return data.data || [];
  } catch (error) {
    console.error('Erro ao buscar arquivos da pasta:', error);
    return [];
  }
};


/**
 * Converte webViewLink do Google Drive para URL de thumbnail
 */
const getThumbnailUrl = (fileId: string): string => {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w300`;
};

/**
 * Converte ID do arquivo para URL de preview do Google Drive
 */
const getPreviewUrl = (fileId: string): string => {
  return `https://drive.google.com/file/d/${fileId}/preview`;
};

/**
 * Processa arquivos de uma pasta de plataforma (META, LINKEDIN, etc.)
 * Retorna mapeamento de nome normalizado para URL da imagem
 */
const processPlatformFolder = async (
  folderId: string
): Promise<Map<string, string>> => {
  const mapping = new Map<string, string>();

  try {
    const files = await getFolderFiles(folderId);

    for (const file of files) {
      // Se for uma pasta (carrossel), pega o primeiro arquivo dentro
      if (file.mimeType === 'application/vnd.google-apps.folder') {
        const carouselFiles = await getFolderFiles(file.id);

        // Filtra apenas arquivos de mídia (imagens e vídeos)
        const mediaFiles = carouselFiles.filter(f =>
          f.mimeType.startsWith('image/') || f.mimeType.startsWith('video/')
        );

        if (mediaFiles.length > 0) {
          const normalizedName = normalizeCreativeName(file.name);
          const firstMedia = mediaFiles[0];
          const thumbnailUrl = getThumbnailUrl(firstMedia.id);

          mapping.set(normalizedName, thumbnailUrl);
          debugMapping.set(file.name, normalizedName);
          carouselCache.set(normalizedName, mediaFiles); // Armazena todos os arquivos do carrossel

        }
      }
      // Se for um arquivo de vídeo
      else if (file.mimeType.startsWith('video/')) {
        const normalizedName = normalizeCreativeName(file.name);
        const thumbnailUrl = getThumbnailUrl(file.id);
        const videoUrl = getPreviewUrl(file.id);

        mapping.set(normalizedName, thumbnailUrl);
        debugMapping.set(file.name, normalizedName);
        videoCache.set(normalizedName, videoUrl); // Armazena URL do vídeo

      }
      // Se for um arquivo de imagem
      else if (file.mimeType.startsWith('image/')) {
        const normalizedName = normalizeCreativeName(file.name);
        const thumbnailUrl = getThumbnailUrl(file.id);
        mapping.set(normalizedName, thumbnailUrl);
        debugMapping.set(file.name, normalizedName);

      }
    }
  } catch (error) {
    console.error('Erro ao processar pasta de plataforma:', error);
  }

  return mapping;
};

/**
 * Busca a pasta 'MATERIAIS' dentro de uma pasta de campanha
 */
const findMaterialsFolder = async (campaignFolderId: string): Promise<string | null> => {
  try {
    const files = await getFolderFiles(campaignFolderId);
    const materialsFolder = files.find(
      f => f.mimeType === 'application/vnd.google-apps.folder' &&
           f.name.toUpperCase() === 'MATERIAIS'
    );

    return materialsFolder?.id || null;
  } catch (error) {
    console.error('Erro ao buscar pasta MATERIAIS:', error);
    return null;
  }
};

/**
 * Busca pastas de plataforma (META, LINKEDIN, etc.) dentro da pasta MATERIAIS
 */
const getPlatformFolders = async (materialsFolderId: string): Promise<DriveFile[]> => {
  try {
    const files = await getFolderFiles(materialsFolderId);
    return files.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  } catch (error) {
    console.error('Erro ao buscar pastas de plataforma:', error);
    return [];
  }
};

/**
 * Inicializa o cache de imagens buscando todos os criativos do Drive
 */
export const initializeImageCache = async (): Promise<void> => {
  if (cacheInitialized) {
    return;
  }


  try {
    // 1. Buscar pastas de campanhas dentro da pasta BRB
    const campaignFolders = await getFolderFiles(BRB_FOLDER_ID);

    // 2. Para cada pasta de campanha
    for (const campaign of campaignFolders) {
      if (campaign.mimeType !== 'application/vnd.google-apps.folder') continue;


      // 3. Buscar pasta MATERIAIS
      const materialsFolderId = await findMaterialsFolder(campaign.id);
      if (!materialsFolderId) {
        continue;
      }

      // 4. Buscar pastas de plataformas (META, LINKEDIN, etc.)
      const platformFolders = await getPlatformFolders(materialsFolderId);

      // 5. Para cada plataforma, processar os criativos
      for (const platform of platformFolders) {
        const platformMapping = await processPlatformFolder(platform.id);

        // Adicionar ao cache global
        platformMapping.forEach((url, name) => {
          imageCache.set(name, url);
        });
      }
    }

    cacheInitialized = true;
  } catch (error) {
    console.error('Erro ao inicializar cache de imagens:', error);
  }
};

/**
 * Busca a URL da imagem de um criativo pelo nome
 * Tenta múltiplas estratégias de matching
 * @param creativeName Nome do criativo
 * @returns URL da imagem ou null se não encontrada
 */
export const getCreativeImageUrl = (creativeName: string): string | null => {
  // Estratégia 1: Match exato pelo nome normalizado
  const normalizedName = normalizeCreativeName(creativeName);
  let url = imageCache.get(normalizedName);

  if (url) {
    return url;
  }

  // Estratégia 2: Busca parcial - procura por correspondência no cache
  // Útil quando o nome do criativo contém informações adicionais
  for (const [cachedKey, cachedUrl] of imageCache.entries()) {
    // Se o nome normalizado contém a chave do cache ou vice-versa
    if (normalizedName.includes(cachedKey) || cachedKey.includes(normalizedName)) {
      return cachedUrl;
    }
  }

  // Estratégia 3: Se não encontrou, loga para debug
  console.warn(`❌ Imagem não encontrada para: "${creativeName}" (normalizado: "${normalizedName}")`);

  return null;
};

/**
 * Verifica se o cache está inicializado
 */
export const isCacheInitialized = (): boolean => {
  return cacheInitialized;
};

/**
 * Retorna o tamanho do cache
 */
export const getCacheSize = (): number => {
  return imageCache.size;
};

/**
 * Limpa o cache (útil para testes ou recarregamento)
 */
export const clearCache = (): void => {
  imageCache.clear();
  debugMapping.clear();
  cacheInitialized = false;
};

/**
 * Retorna todas as chaves do cache (para debug)
 */
export const getCacheKeys = (): string[] => {
  return Array.from(imageCache.keys());
};

/**
 * Retorna o mapeamento debug (nome original → nome normalizado)
 */
export const getDebugMapping = (): Map<string, string> => {
  return new Map(debugMapping);
};

/**
 * Busca a URL do vídeo de um criativo pelo nome
 * @param creativeName Nome do criativo
 * @returns URL do vídeo ou null se não for um vídeo
 */
export const getCreativeVideoUrl = (creativeName: string): string | null => {
  const normalizedName = normalizeCreativeName(creativeName);
  let url = videoCache.get(normalizedName);

  if (url) {
    return url;
  }

  // Busca parcial
  for (const [cachedKey, cachedUrl] of videoCache.entries()) {
    if (normalizedName.includes(cachedKey) || cachedKey.includes(normalizedName)) {
      return cachedUrl;
    }
  }

  return null;
};

/**
 * Busca os arquivos de um carrossel pelo nome do criativo
 * @param creativeName Nome do criativo
 * @returns Array de arquivos do carrossel ou null se não for um carrossel
 */
export const getCreativeCarouselFiles = (creativeName: string): DriveFile[] | null => {
  const normalizedName = normalizeCreativeName(creativeName);
  let files = carouselCache.get(normalizedName);

  if (files) {
    return files;
  }

  // Busca parcial
  for (const [cachedKey, cachedFiles] of carouselCache.entries()) {
    if (normalizedName.includes(cachedKey) || cachedKey.includes(normalizedName)) {
      return cachedFiles;
    }
  }

  return null;
};

/**
 * Verifica se um criativo é um vídeo
 */
export const isCreativeVideo = (creativeName: string): boolean => {
  return getCreativeVideoUrl(creativeName) !== null;
};

/**
 * Verifica se um criativo é um carrossel
 */
export const isCreativeCarousel = (creativeName: string): boolean => {
  return getCreativeCarouselFiles(creativeName) !== null;
};
