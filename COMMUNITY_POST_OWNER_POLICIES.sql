-- साहित्य सूत्रधार
-- लेखक केवल अपनी संगोष्ठी पोस्ट अपडेट और डिलीट कर सकेगा।

ALTER TABLE public.community_posts
ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN

  -- अपनी पोस्ट एडिट करने की अनुमति
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'Authors can update own community posts'
  ) THEN

    CREATE POLICY "Authors can update own community posts"
    ON public.community_posts
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = author_id)
    WITH CHECK (auth.uid() = author_id);

  END IF;

  -- अपनी पोस्ट डिलीट करने की अनुमति
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_posts'
      AND policyname = 'Authors can delete own community posts'
  ) THEN

    CREATE POLICY "Authors can delete own community posts"
    ON public.community_posts
    FOR DELETE
    TO authenticated
    USING (auth.uid() = author_id);

  END IF;

END $$;
