export interface ParsedVideoInfo {
  videoId: string | null;
  embedUrl: string;
  directUrl: string;
  thumbnailUrl: string;
  isYoutube: boolean;
  hasValidUrl: boolean;
}

export function parseVideoUrl(rawUrl?: string | null, fallbackTitle?: string): ParsedVideoInfo {
  const url = (rawUrl || '').trim();

  if (!url) {
    const searchParam = encodeURIComponent((fallbackTitle || 'konu anlatımı') + ' ders videosu');
    return {
      videoId: null,
      embedUrl: `https://www.youtube.com/embed?listType=search&list=${searchParam}`,
      directUrl: `https://www.youtube.com/results?search_query=${searchParam}`,
      thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      isYoutube: true,
      hasValidUrl: false
    };
  }

  // Check if it is directly an 11-char YouTube ID (e.g. "dQw4w9WgXcQ")
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return {
      videoId: url,
      embedUrl: `https://www.youtube.com/embed/${url}?autoplay=1&rel=0`,
      directUrl: `https://www.youtube.com/watch?v=${url}`,
      thumbnailUrl: `https://img.youtube.com/vi/${url}/mqdefault.jpg`,
      isYoutube: true,
      hasValidUrl: true
    };
  }

  // Comprehensive Regex for YouTube links (watch, youtu.be, embed, shorts, live, mobile)
  const ytRegex = /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/|live\/))([a-zA-Z0-9_-]{11})/i;
  const legacyRegex = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/i;

  const match1 = url.match(ytRegex);
  if (match1 && match1[1] && match1[1].length === 11) {
    const id = match1[1];
    return {
      videoId: id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      directUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      isYoutube: true,
      hasValidUrl: true
    };
  }

  const match2 = url.match(legacyRegex);
  if (match2 && match2[2] && match2[2].length === 11) {
    const id = match2[2];
    return {
      videoId: id,
      embedUrl: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`,
      directUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/mqdefault.jpg`,
      isYoutube: true,
      hasValidUrl: true
    };
  }

  // If it's a web URL (Vimeo, Google Drive, EBA, etc.)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return {
      videoId: null,
      embedUrl: url,
      directUrl: url,
      thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
      isYoutube: false,
      hasValidUrl: true
    };
  }

  // Fallback: search query for YouTube
  const searchQuery = encodeURIComponent(url + ' ' + (fallbackTitle || 'ders'));
  return {
    videoId: null,
    embedUrl: `https://www.youtube.com/embed?listType=search&list=${searchQuery}`,
    directUrl: `https://www.youtube.com/results?search_query=${searchQuery}`,
    thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80',
    isYoutube: true,
    hasValidUrl: true
  };
}

export function getYoutubeId(url?: string | null): string | null {
  return parseVideoUrl(url).videoId;
}
