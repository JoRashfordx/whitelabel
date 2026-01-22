
import { useState, useEffect } from 'react';
import { getSupabase } from '../services/supabase';
import { UserProfile } from '../types';

export const useAuth = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabase();

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Fetch profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .schema('whitelabel')
          .eq('id', session.user.id)
          .single();
        
        if (data) {
          setUser({ ...data, email: session.user.email! });
        }
      }
      setLoading(false);
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
         fetchUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading, isAdmin: user?.role === 'admin' };
};
