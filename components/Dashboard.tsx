import React from 'react';
import { User, Profile, Video, VideoRating } from '../types';
import ChannelView from './ChannelView';

interface DashboardProps {
  user: User | null;
  profile: Profile | null;
  onRefreshProfile: () => void;
  onVideoSelect: (video: Video) => void;
  onSeriesSelect: (seriesId: string) => void;
  refreshTrigger: number;
  onOpenMessages?: (recipientId: string) => void;
  allowedRatings: VideoRating[];
  initialTab?: string;
  onManageChannel?: () => void;
  onPlaylistSelect?: (playlistId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user, 
  profile, 
  onRefreshProfile, 
  onVideoSelect, 
  onSeriesSelect, 
  refreshTrigger, 
  onOpenMessages, 
  allowedRatings, 
  initialTab,
  onManageChannel,
  onPlaylistSelect
}) => {
  return (
    <div className="w-full h-full bg-black min-h-screen">
      <ChannelView 
        user={user} 
        profile={profile} 
        onRefreshProfile={onRefreshProfile} 
        onVideoSelect={onVideoSelect}
        onSeriesSelect={onSeriesSelect}
        refreshTrigger={refreshTrigger}
        onOpenMessages={onOpenMessages}
        allowedRatings={allowedRatings}
        initialTab={initialTab}
        onManageChannel={onManageChannel}
        onPlaylistSelect={onPlaylistSelect}
      />
    </div>
  );
};

export default Dashboard;