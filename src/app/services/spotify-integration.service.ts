import { Injectable } from '@angular/core';

export interface SpotifyPlaylistInfo {
  id: string;
  name: string;
  description?: string;
  trackCount: number;
  duration: string;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class SpotifyIntegrationService {
  
  constructor() {}

  // ─── URL Validation ─────────────────────────────────────────
  isValidSpotifyUrl(url: string): boolean {
    if (!url) return false;
    
    const spotifyRegex = /^https?:\/\/(open\.spotify\.com\/(playlist|album|track)\/[a-zA-Z0-9]+|spotify:(playlist|album|track):[a-zA-Z0-9]+)/;
    return spotifyRegex.test(url);
  }

  extractSpotifyId(url: string): string | null {
    if (!this.isValidSpotifyUrl(url)) return null;
    
    // Handle both web URLs and Spotify URIs
    const webMatch = url.match(/open\.spotify\.com\/(?:playlist|album|track)\/([a-zA-Z0-9]+)/);
    const uriMatch = url.match(/spotify:(?:playlist|album|track):([a-zA-Z0-9]+)/);
    
    return webMatch?.[1] || uriMatch?.[1] || null;
  }

  getSpotifyType(url: string): 'playlist' | 'album' | 'track' | null {
    if (!this.isValidSpotifyUrl(url)) return null;
    
    if (url.includes('playlist')) return 'playlist';
    if (url.includes('album')) return 'album';
    if (url.includes('track')) return 'track';
    
    return null;
  }

  // ─── Embed Generation ───────────────────────────────────────
  getEmbedUrl(spotifyUrl: string): string | null {
    const id = this.extractSpotifyId(spotifyUrl);
    const type = this.getSpotifyType(spotifyUrl);
    
    if (!id || !type) return null;
    
    return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
  }

  getCompactEmbedUrl(spotifyUrl: string): string | null {
    const embedUrl = this.getEmbedUrl(spotifyUrl);
    if (!embedUrl) return null;
    
    return embedUrl + '&compact=1';
  }

  // ─── Playlist Info (Mock) ───────────────────────────────────
  async getPlaylistInfo(url: string): Promise<SpotifyPlaylistInfo | null> {
    const id = this.extractSpotifyId(url);
    const type = this.getSpotifyType(url);
    
    if (!id || !type) return null;
    
    // Mock implementation - in real app, you'd use Spotify Web API
    // This requires OAuth and API credentials
    return this.generateMockPlaylistInfo(id, type);
  }

  private generateMockPlaylistInfo(id: string, type: string): SpotifyPlaylistInfo {
    // Generate consistent mock data based on ID
    const hash = this.hashCode(id);
    
    const mockNames = [
      'Workout Motivation', 'Chill Vibes', 'Focus Flow', 'Morning Energy',
      'Study Session', 'Running Beats', 'Meditation Sounds', 'Night Owl',
      'Weekend Vibes', 'Deep Focus', 'Happy Mood', 'Productivity Boost'
    ];
    
    const trackCounts = [15, 25, 30, 45, 50, 67, 80, 120];
    const durations = ['45 min', '1 hr 15 min', '2 hr', '1 hr 30 min', '3 hr', '2 hr 45 min'];
    
    return {
      id,
      name: mockNames[hash % mockNames.length],
      description: `Perfect for your habits and goals`,
      trackCount: trackCounts[hash % trackCounts.length],
      duration: durations[hash % durations.length],
      imageUrl: `https://picsum.photos/300/300?random=${hash}`
    };
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  // ─── Quick Play ─────────────────────────────────────────────
  openInSpotify(url: string): void {
    // Try to open in Spotify app first, fallback to web
    const spotifyAppUrl = this.convertToSpotifyUri(url);
    
    // Create hidden link to test if Spotify app is available
    const testLink = document.createElement('a');
    testLink.href = spotifyAppUrl;
    testLink.style.display = 'none';
    document.body.appendChild(testLink);
    
    try {
      testLink.click();
      // If click succeeds, assume app is available
      setTimeout(() => document.body.removeChild(testLink), 100);
    } catch {
      // Fallback to web version
      window.open(url, '_blank');
      document.body.removeChild(testLink);
    }
  }

  private convertToSpotifyUri(url: string): string {
    const id = this.extractSpotifyId(url);
    const type = this.getSpotifyType(url);
    
    if (!id || !type) return url;
    
    return `spotify:${type}:${id}`;
  }

  // ─── Embed Player Configuration ─────────────────────────────
  getEmbedConfig(spotifyUrl: string, options: {
    height?: number;
    theme?: 'dark' | 'light';
    showCover?: boolean;
    compact?: boolean;
  } = {}): { src: string; height: number; style: string } | null {
    const embedUrl = this.getEmbedUrl(spotifyUrl);
    if (!embedUrl) return null;
    
    const {
      height = 352,
      theme = 'dark',
      showCover = true,
      compact = false
    } = options;
    
    let src = embedUrl;
    if (theme === 'light') src += '&theme=1';
    if (!showCover) src += '&show-cover=0';
    if (compact) src += '&compact=1';
    
    return {
      src,
      height: compact ? 152 : height,
      style: `
        border-radius: 12px;
        border: none;
        width: 100%;
        background: transparent;
      `
    };
  }

  // ─── URL Formatting ─────────────────────────────────────────
  formatSpotifyUrl(input: string): string {
    if (!input) return '';
    
    // If it's already a valid URL, return as-is
    if (this.isValidSpotifyUrl(input)) return input;
    
    // Try to extract ID from various formats
    let id = '';
    
    // Handle bare IDs
    if (/^[a-zA-Z0-9]{22}$/.test(input.trim())) {
      id = input.trim();
    }
    
    // Handle partial URLs
    const idMatch = input.match(/[a-zA-Z0-9]{22}/);
    if (idMatch) {
      id = idMatch[0];
    }
    
    if (id) {
      // Default to playlist if type can't be determined
      return `https://open.spotify.com/playlist/${id}`;
    }
    
    return input; // Return as-is if we can't parse it
  }

  // ─── Utility ────────────────────────────────────────────────
  getDisplayName(url: string): string {
    const type = this.getSpotifyType(url);
    if (!type) return 'Spotify Link';
    
    return `Spotify ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  }

  isPlayable(url: string): boolean {
    // All Spotify content types are playable in embed
    return this.isValidSpotifyUrl(url);
  }

  // ─── Error Handling ─────────────────────────────────────────
  getErrorMessage(url: string): string | null {
    if (!url) return 'URL is required';
    
    if (!this.isValidSpotifyUrl(url)) {
      return 'Please enter a valid Spotify URL (playlist, album, or track)';
    }
    
    return null;
  }
}