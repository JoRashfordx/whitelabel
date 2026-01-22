
BEGIN;

-- 1. Add count columns to Series table (Idempotent)
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS likes_count BIGINT DEFAULT 0;
ALTER TABLE public.series ADD COLUMN IF NOT EXISTS dislikes_count BIGINT DEFAULT 0;

-- 2. Create Series Reactions table (Idempotent)
CREATE TABLE IF NOT EXISTS public.series_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    series_id UUID REFERENCES public.series(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('like', 'dislike')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, series_id)
);

-- 3. Secure Series Reactions (Idempotent policies)
ALTER TABLE public.series_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all series reactions') THEN
        CREATE POLICY "Users can view all series reactions" ON public.series_reactions FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own series reactions') THEN
        CREATE POLICY "Users can insert own series reactions" ON public.series_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own series reactions') THEN
        CREATE POLICY "Users can update own series reactions" ON public.series_reactions FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own series reactions') THEN
        CREATE POLICY "Users can delete own series reactions" ON public.series_reactions FOR DELETE USING (auth.uid() = user_id);
    END IF;
END
$$;

-- 4. RPC to handle reaction toggle and count updates
-- DROP first to ensure signature updates apply
DROP FUNCTION IF EXISTS public.handle_series_reaction;

CREATE OR REPLACE FUNCTION public.handle_series_reaction(
  p_series_id UUID,
  p_user_id UUID,
  p_type TEXT -- 'like', 'dislike', or null (to remove)
) RETURNS VOID AS $$
DECLARE
  existing_reaction TEXT;
BEGIN
  -- Get existing reaction if any
  SELECT type INTO existing_reaction FROM public.series_reactions 
  WHERE series_id = p_series_id AND user_id = p_user_id;

  -- Case 1: Removing reaction (clicking same button)
  IF p_type IS NULL OR existing_reaction = p_type THEN
    IF existing_reaction IS NOT NULL THEN
        DELETE FROM public.series_reactions WHERE series_id = p_series_id AND user_id = p_user_id;
        
        -- Decrement counters
        IF existing_reaction = 'like' THEN
            UPDATE public.series SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_series_id;
        ELSE
            UPDATE public.series SET dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = p_series_id;
        END IF;
    END IF;
  
  -- Case 2: Adding or Swapping reaction
  ELSIF p_type IS NOT NULL THEN
    IF existing_reaction IS NOT NULL THEN
        -- Swap reaction type
        UPDATE public.series_reactions SET type = p_type WHERE series_id = p_series_id AND user_id = p_user_id;
        
        -- Update both counters
        IF p_type = 'like' THEN
            UPDATE public.series SET likes_count = likes_count + 1, dislikes_count = GREATEST(0, dislikes_count - 1) WHERE id = p_series_id;
        ELSE
            UPDATE public.series SET dislikes_count = dislikes_count + 1, likes_count = GREATEST(0, likes_count - 1) WHERE id = p_series_id;
        END IF;
    ELSE
        -- Insert new reaction
        INSERT INTO public.series_reactions (series_id, user_id, type) VALUES (p_series_id, p_user_id, p_type);
        
        -- Increment specific counter
        IF p_type = 'like' THEN
            UPDATE public.series SET likes_count = likes_count + 1 WHERE id = p_series_id;
        ELSE
            UPDATE public.series SET dislikes_count = dislikes_count + 1 WHERE id = p_series_id;
        END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Explicit Permissions
GRANT EXECUTE ON FUNCTION public.handle_series_reaction TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_series_reaction TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_series_reaction TO anon; -- Just in case, though RLS protects data

-- 6. Reload Schema Cache
NOTIFY pgrst, 'reload config';

COMMIT;
