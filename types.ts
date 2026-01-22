
export type UserRole = 'admin' | 'user';

export type AuthMode = 'login' | 'register';

export interface User {
  id: string;
  email?: string;
  role?: string;
  user_metadata?: {
    username?: string;
    role?: string;
  };
}

export type AgeGroup = 'under_13' | '13_15' | '16_17' | '18_plus';

export interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  banner_url?: string;
  bio?: string;
  role: string;
  subscribers_count: number;
  views_count: number;
  updated_at: string;
  created_at: string;
  website?: string;
  theme_color?: string;
  country?: string;
  dob?: string;
  age_group?: AgeGroup;
  social_links?: {
    website?: string;
    twitter?: string;
    instagram?: string;
    youtube?: string;
    facebook?: string;
    snapchat?: string;
    twitch?: string;
  };
  display_preference?: 'alias' | 'name';
  alias?: string;
  first_name?: string;
  last_name?: string;
}

export type UserProfile = Profile & { email?: string };

export type VideoVisibility = 'public' | 'unlisted' | 'private';
export type VideoRating = 'U' | 'PG' | 'R';

export interface Video {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  visibility: VideoVisibility;
  status: string;
  category?: string;
  hashtags?: string[];
  rating?: VideoRating;
  views_count: number;
  likes_count: number;
  dislikes_count: number;
  duration?: string;
  processing_status: 'processing' | 'ready' | 'failed';
  quality_urls?: Record<string, string>;
  filmstrip_urls?: string[];
  momentum_score?: number;
  created_at: string;
  updated_at: string;
  profile?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export interface Series {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  visibility: VideoVisibility;
  rating?: VideoRating;
  status: string;
  likes_count: number;
  dislikes_count: number;
  created_at: string;
  updated_at: string;
}

export interface SeriesEpisode {
  id: string;
  series_id: string;
  video_id: string;
  episode_number: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  release_date: string;
  status: string;
  video?: Video;
}

export interface SeriesHeroBanner {
  id: string;
  series_id: string;
  enabled: boolean;
  banner_image_url: string;
  headline: string;
  subtext: string;
  cta_text: string;
}

export interface Premiere {
  video_id: string;
  start_time: string;
  status: 'scheduled' | 'live' | 'ended';
}

export interface Playlist {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  visibility: VideoVisibility;
  type: 'custom' | 'watch_later';
  created_at: string;
  video_count?: number;
  thumbnail_url?: string | null;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  video_id: string;
  added_at: string;
  video?: Video;
}

export interface SharedComment {
  id: string;
  user_id: string;
  target_type: 'video' | 'community';
  target_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  like_count: number;
  dislike_count: number;
  is_pinned: boolean;
  username?: string;
  avatar_url?: string | null;
  user_reaction?: 'like' | 'dislike' | null;
  replies?: SharedComment[];
  context_title?: string;
  context_thumbnail?: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  content: string;
  attachment_url?: string;
  attachment_type?: 'image' | 'video';
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
  is_liked_by_viewer?: boolean;
}

export interface Conversation {
  id: string;
  user1_id: string;
  user2_id: string;
  last_message_at: string;
  user1_visible: boolean;
  user2_visible: boolean;
  other_user?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  attachment_url?: string | null;
  attachment_type?: 'image' | 'file' | null;
  is_read: boolean;
  created_at: string;
  deleted_by_sender?: boolean;
  deleted_by_recipient?: boolean;
}

export interface ChatMessage {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  type: 'text';
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface ChatParticipant {
  user_id: string;
  video_id: string;
  username: string;
  avatar_url?: string | null;
  is_mod: boolean;
  is_author: boolean;
  online_at: string;
}

export interface ChatLeaderboardEntry {
  video_id: string;
  user_id: string;
  points: number;
  username: string;
  avatar_url?: string;
}

export type DesignType = 'thumbnail' | 'hero' | 'series_cover' | 'banner' | 'avatar' | 'post';

export interface ThumbnailLayer {
  id: string;
  type: 'image' | 'text' | 'shape';
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  content: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: 'left' | 'center' | 'right';
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  strokeWidth?: number;
  strokeColor?: string;
  filters?: FilterState;
}

export interface CanvasConfig {
  width: number;
  height: number;
  backgroundColor: string;
}

export interface FilterState {
  brightness: number;
  contrast: number;
  saturation: number;
  blur: number;
  grayscale: number;
  sepia: number;
}

export interface DesignProject {
  id: string;
  user_id: string;
  type: DesignType;
  name: string;
  json_state: {
    layers: ThumbnailLayer[];
    canvasConfig: CanvasConfig;
  };
  preview_url?: string;
  related_id?: string;
  updated_at: string;
}

export interface WatchHistoryItem {
  history_id: string;
  video_id: string;
  title: string;
  thumbnail_url?: string;
  duration?: string;
  watched_at: string;
  username: string;
}

export interface LikedVideoItem {
  reaction_id: string;
  video_id: string;
  title: string;
  thumbnail_url?: string;
  duration?: string;
  liked_at: string;
  username: string;
}

export interface CommentHistoryItem {
  comment_id: string;
  content: string;
  target_type: 'video' | 'community';
  target_id: string;
  created_at: string;
  context_title?: string;
  context_thumbnail?: string;
}

export type ViewState = 'HOME' | 'TRENDING' | 'EXPLORE' | 'SERIES_BROWSE' | 'WATCH' | 'CHANNEL' | 'SETTINGS' | 'HISTORY' | 'LIBRARY' | 'PLAYLIST_DETAIL' | 'ADMIN_PANEL' | 'RATINGS' | 'TERMS' | 'PRIVACY' | 'SERIES_POLICY';

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  target_type: string;
  target_id: string;
  comment_id?: string;
  is_read: boolean;
  created_at: string;
  actor_profile?: {
    username: string;
    avatar_url: string | null;
  };
}

export interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    textMain: string;
    textSecondary: string;
    border: string;
}

export interface BrandConfig {
    siteName: string;
    logoUrl?: string;
    faviconUrl?: string;
    colors: ThemeColors;
    fontFamily: string;
    footerText: string;
}

export interface WLBranding {
    id: string;
    brand_name: string;
    logo_url?: string;
    primary_color?: string;
    footer_text?: string;
}

// Whitelabel specific interfaces
export interface Whitelabel_UserProfile {
  id: string;
  email?: string;
  username?: string;
  avatar_url?: string;
  role: UserRole;
  created_at: string;
}

export interface Whitelabel_Config {
  id?: string;
  platform_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  text_color: string;
  custom_css?: string;
  footer_text?: string;
  nav_links?: { label: string; href: string }[];
}

export interface Whitelabel_InstallState {
  id: boolean;
  installed: boolean;
  admin_user_id: string;
  platform_name: string;
  installed_at: string;
}

export type Whitelabel_BlockType = 'hero' | 'video_grid' | 'text_block' | 'cta' | 'video_player' | 'features';

export interface Whitelabel_PageBlock {
  id: string;
  type: Whitelabel_BlockType;
  content: any;
  styles?: any;
  visible: boolean;
}

export interface Whitelabel_Page {
  id: string;
  slug: string;
  title: string;
  description?: string;
  blocks: Whitelabel_PageBlock[];
  is_published: boolean;
  is_home: boolean;
  updated_at: string;
}

export interface Whitelabel_Video {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  duration?: number;
  views: number;
  likes: number;
  status: 'processing' | 'ready' | 'failed';
  visibility: 'public' | 'private' | 'unlisted';
  created_at: string;
  profile?: Whitelabel_UserProfile; 
}

export interface Whitelabel_Comment {
  id: string;
  video_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Whitelabel_UserProfile;
}

// Aliases for compatibility
export type WhitelabelConfig = Whitelabel_Config;
export type WhitelabelPage = Whitelabel_Page;
export type PageBlock = Whitelabel_PageBlock;
export type BlockType = Whitelabel_BlockType;
