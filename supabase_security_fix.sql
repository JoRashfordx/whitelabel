
BEGIN;

-- ==============================================================================
-- 1. DROP DUPLICATE INDEXES
-- ==============================================================================

DROP INDEX IF EXISTS public.idx_chat_participants_video_user;
DROP INDEX IF EXISTS public.profiles_username_idx;

-- ==============================================================================
-- 2. FIX RLS POLICIES (PERFORMANCE & CONSOLIDATION)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Table: public.blocked_users
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Blocker can delete" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can manage blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Blocker can insert" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can see blocked status" ON public.blocked_users;

CREATE POLICY "performance_consolidated_select" ON public.blocked_users FOR SELECT USING (
  blocker_id = (select auth.uid()) OR blocked_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_insert" ON public.blocked_users FOR INSERT WITH CHECK (
  blocker_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_delete" ON public.blocked_users FOR DELETE USING (
  blocker_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.chat_messages
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users insert chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Auth insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Chat: Public Read" ON public.chat_messages;
DROP POLICY IF EXISTS "Public read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Public view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Owner delete messages" ON public.chat_messages;

CREATE POLICY "performance_consolidated_select" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_insert" ON public.chat_messages FOR INSERT WITH CHECK (
  (select auth.role()) = 'authenticated'
);
CREATE POLICY "performance_consolidated_delete" ON public.chat_messages FOR DELETE USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.chat_participants
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth insert participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Owner can manage participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Public can view participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Public read participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Mod update participants" ON public.chat_participants;

CREATE POLICY "performance_consolidated_select" ON public.chat_participants FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_insert" ON public.chat_participants FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.chat_participants FOR UPDATE USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.chat_roles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Roles: Owner Manage" ON public.chat_roles;
DROP POLICY IF EXISTS "Roles: Public Read" ON public.chat_roles;

CREATE POLICY "performance_consolidated_select" ON public.chat_roles FOR SELECT USING (true);
CREATE POLICY "performance_owner_manage" ON public.chat_roles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.comment_interactions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public comment interactions access" ON public.comment_interactions;
DROP POLICY IF EXISTS "Users can manage own comment interactions" ON public.comment_interactions;

CREATE POLICY "performance_consolidated_select" ON public.comment_interactions FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.comment_interactions FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.community_post_likes
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner write community_post_likes" ON public.community_post_likes;
DROP POLICY IF EXISTS "Public read community_post_likes" ON public.community_post_likes;

CREATE POLICY "performance_consolidated_select" ON public.community_post_likes FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.community_post_likes FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.community_posts
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner write community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users delete own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Public read community_posts" ON public.community_posts;
DROP POLICY IF EXISTS "Public view posts" ON public.community_posts;

CREATE POLICY "performance_consolidated_select" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_insert" ON public.community_posts FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_delete" ON public.community_posts FOR DELETE USING (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.community_posts FOR UPDATE USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.conversations
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert Conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "View Conversations" ON public.conversations;
DROP POLICY IF EXISTS "Update Conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;

CREATE POLICY "performance_consolidated_select" ON public.conversations FOR SELECT USING (
  user1_id = (select auth.uid()) OR user2_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_insert" ON public.conversations FOR INSERT WITH CHECK (
  user1_id = (select auth.uid()) OR user2_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.conversations FOR UPDATE USING (
  user1_id = (select auth.uid()) OR user2_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.messages
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Send Messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "View Messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
DROP POLICY IF EXISTS "Update Messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages" ON public.messages;

CREATE POLICY "performance_consolidated_select" ON public.messages FOR SELECT USING (
  sender_id = (select auth.uid()) OR recipient_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_insert" ON public.messages FOR INSERT WITH CHECK (
  sender_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.messages FOR UPDATE USING (
  sender_id = (select auth.uid()) OR recipient_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.premieres
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner write premieres" ON public.premieres;
DROP POLICY IF EXISTS "Public read premieres" ON public.premieres;

CREATE POLICY "performance_consolidated_select" ON public.premieres FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.premieres FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.profiles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Start Profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.profiles;
DROP POLICY IF EXISTS "Public Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Own Profile Update" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own social data" ON public.profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON public.profiles;

CREATE POLICY "performance_consolidated_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_insert" ON public.profiles FOR INSERT WITH CHECK (
  id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.profiles FOR UPDATE USING (
  id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.series
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Age Restriction Policy Series" ON public.series;
DROP POLICY IF EXISTS "Series: Owner Manage" ON public.series;
DROP POLICY IF EXISTS "Series: Public View" ON public.series;

CREATE POLICY "performance_consolidated_select" ON public.series FOR SELECT USING (
  visibility = 'public' OR user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_write" ON public.series FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.series_episodes
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Episodes: Owner Manage" ON public.series_episodes;
DROP POLICY IF EXISTS "Episodes: Public View" ON public.series_episodes;

CREATE POLICY "performance_consolidated_select" ON public.series_episodes FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.series_episodes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_id AND s.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.series_hero_banners
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Banners: Owner Manage" ON public.series_hero_banners;
DROP POLICY IF EXISTS "Banners: Public View" ON public.series_hero_banners;

CREATE POLICY "performance_consolidated_select" ON public.series_hero_banners FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.series_hero_banners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_id AND s.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.unified_comments
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.unified_comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.unified_comments;
DROP POLICY IF EXISTS "Auth users can comment" ON public.unified_comments;
DROP POLICY IF EXISTS "Users can insert comments" ON public.unified_comments;
DROP POLICY IF EXISTS "Comments are public" ON public.unified_comments;
DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.unified_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.unified_comments;

CREATE POLICY "performance_consolidated_select" ON public.unified_comments FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_insert" ON public.unified_comments FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.unified_comments FOR UPDATE USING (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_delete" ON public.unified_comments FOR DELETE USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.user_interests
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can read own interests" ON public.user_interests;
DROP POLICY IF EXISTS "Users can update own interests" ON public.user_interests;

CREATE POLICY "performance_consolidated_select" ON public.user_interests FOR SELECT USING (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_write" ON public.user_interests FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.video_interactions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public video interactions access" ON public.video_interactions;
DROP POLICY IF EXISTS "Users can manage own video interactions" ON public.video_interactions;

CREATE POLICY "performance_consolidated_select" ON public.video_interactions FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.video_interactions FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.video_reactions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner write video_reactions" ON public.video_reactions;
DROP POLICY IF EXISTS "Public read video_reactions" ON public.video_reactions;

CREATE POLICY "performance_consolidated_select" ON public.video_reactions FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.video_reactions FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.video_thumbnails
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Own Thumbnails All" ON public.video_thumbnails;
DROP POLICY IF EXISTS "Users can insert their own thumbnails" ON public.video_thumbnails;
DROP POLICY IF EXISTS "Users can view their own thumbnails" ON public.video_thumbnails;

CREATE POLICY "performance_consolidated_select" ON public.video_thumbnails FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = (select auth.uid()))
);
CREATE POLICY "performance_consolidated_write" ON public.video_thumbnails FOR ALL USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.videos
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Own Videos" ON public.videos;
DROP POLICY IF EXISTS "Own Videos All" ON public.videos;
DROP POLICY IF EXISTS "Users can delete their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can insert their own videos." ON public.videos;
DROP POLICY IF EXISTS "Age Restriction Policy" ON public.videos;
DROP POLICY IF EXISTS "Public Videos" ON public.videos;
DROP POLICY IF EXISTS "Public videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Users can view their own private videos" ON public.videos;
DROP POLICY IF EXISTS "Video Select Policy" ON public.videos;
DROP POLICY IF EXISTS "Videos are viewable by everyone" ON public.videos;
DROP POLICY IF EXISTS "Videos are viewable by everyone." ON public.videos;
DROP POLICY IF EXISTS "Users can update own videos." ON public.videos;
DROP POLICY IF EXISTS "Users can update their own videos" ON public.videos;

CREATE POLICY "performance_consolidated_select" ON public.videos FOR SELECT USING (
  visibility = 'public' OR user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_insert" ON public.videos FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.videos FOR UPDATE USING (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_delete" ON public.videos FOR DELETE USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.subscriptions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Subscription Visibility" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscription Creation" ON public.subscriptions;
DROP POLICY IF EXISTS "Subscription Deletion" ON public.subscriptions;

CREATE POLICY "performance_consolidated_select" ON public.subscriptions FOR SELECT USING (
  subscriber_id = (select auth.uid()) OR creator_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_insert" ON public.subscriptions FOR INSERT WITH CHECK (
  subscriber_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_delete" ON public.subscriptions FOR DELETE USING (
  subscriber_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.playlists
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Playlists are viewable by owner or if public" ON public.playlists;
DROP POLICY IF EXISTS "Users can create playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON public.playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON public.playlists;

CREATE POLICY "performance_consolidated_select" ON public.playlists FOR SELECT USING (
  visibility = 'public' OR user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_write" ON public.playlists FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.playlist_items
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Playlist items viewable if playlist is viewable" ON public.playlist_items;
DROP POLICY IF EXISTS "Users can add items to own playlist" ON public.playlist_items;
DROP POLICY IF EXISTS "Users can remove items from own playlist" ON public.playlist_items;

CREATE POLICY "performance_consolidated_select" ON public.playlist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_items.playlist_id AND (p.visibility = 'public' OR p.user_id = (select auth.uid())))
);
CREATE POLICY "performance_consolidated_write" ON public.playlist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.playlists p WHERE p.id = playlist_items.playlist_id AND p.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.watch_history
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can insert own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can delete own watch history" ON public.watch_history;

CREATE POLICY "performance_consolidated_all" ON public.watch_history FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.thumbnail_layers
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Own Thumbnail Layers" ON public.thumbnail_layers;

-- Assuming linked via design_id to design_projects
CREATE POLICY "performance_consolidated_all" ON public.thumbnail_layers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.design_projects dp WHERE dp.id = design_id AND dp.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.unified_comment_reactions
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Auth users can react" ON public.unified_comment_reactions;
DROP POLICY IF EXISTS "Users can change reaction" ON public.unified_comment_reactions;
DROP POLICY IF EXISTS "Users can remove reaction" ON public.unified_comment_reactions;

CREATE POLICY "performance_consolidated_select" ON public.unified_comment_reactions FOR SELECT USING (true);
CREATE POLICY "performance_consolidated_write" ON public.unified_comment_reactions FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.design_projects
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage own designs" ON public.design_projects;

CREATE POLICY "performance_consolidated_all" ON public.design_projects FOR ALL USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.notifications
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "performance_consolidated_select" ON public.notifications FOR SELECT USING (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_update" ON public.notifications FOR UPDATE USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.premiere_views
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Insert premiere view by user" ON public.premiere_views;
DROP POLICY IF EXISTS "Select premiere views" ON public.premiere_views;

CREATE POLICY "performance_consolidated_write" ON public.premiere_views FOR INSERT WITH CHECK (
  user_id = (select auth.uid())
);
CREATE POLICY "performance_consolidated_select" ON public.premiere_views FOR SELECT USING (
  user_id = (select auth.uid())
);

-- ------------------------------------------------------------------------------
-- Table: public.series_schedule
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Schedule: Owner Manage" ON public.series_schedule;

CREATE POLICY "performance_consolidated_write" ON public.series_schedule FOR ALL USING (
  EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_id AND s.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.series_views
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner read series views" ON public.series_views;

CREATE POLICY "performance_consolidated_read" ON public.series_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.series s WHERE s.id = series_id AND s.user_id = (select auth.uid()))
);

-- ------------------------------------------------------------------------------
-- Table: public.video_views
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owner read video views" ON public.video_views;

CREATE POLICY "performance_consolidated_read" ON public.video_views FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.videos v WHERE v.id = video_id AND v.user_id = (select auth.uid()))
);

COMMIT;
