import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, getSupabaseConfig } from '../lib/supabase';

const AuthContext = createContext(null);

const ACCESS_DENIED = 'Your account is not active. Please contact the administrator.';
const NO_PROFILE = 'Your account is not set up for access. Please contact the administrator.';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const clearSession = useCallback(() => {
    setUser(null);
    setProfile(null);
  }, []);

  // The role is ONLY ever read from the server-side `profiles` row (protected by RLS).
  // It is never inferred from the email, form input, query params or local storage.
  const loadProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error('Unable to verify your account. Please try again.');
    if (!data || (data.role !== 'admin' && data.role !== 'waiter')) throw new Error(NO_PROFILE);
    if (!data.is_active) throw new Error(ACCESS_DENIED);
    return data;
  }, []);

  // Establish a verified session, or tear it down completely if verification fails.
  const establish = useCallback(async (sessionUser) => {
    try {
      const prof = await loadProfile(sessionUser.id);
      setUser(sessionUser);
      setProfile(prof);
      return prof;
    } catch (err) {
      await supabase.auth.signOut().catch(() => {});
      clearSession();
      setAuthError(err.message);
      throw err;
    }
  }, [loadProfile, clearSession]);

  useEffect(() => {
    let active = true;

    const init = async () => {
      try {
        if (!getSupabaseConfig().isConfigured) return;
        const { data: { session }, error } = await supabase.auth.getSession();
        if (!active) return;
        if (error || !session?.user) {
          clearSession();
        } else {
          await establish(session.user).catch(() => {});
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        clearSession();
      } finally {
        if (active) setLoading(false);
      }
    };
    init();

    // Do not call supabase from inside the callback directly (can deadlock) - defer it.
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session?.user) {
        clearSession();
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session.user);
        return;
      }
      if (event === 'INITIAL_SESSION') return; // handled by init()
    });

    return () => {
      active = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [establish, clearSession]);

  const signIn = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(error.message || 'Login failed');
      throw error;
    }
    const prof = await establish(data.user);
    return { user: data.user, profile: prof };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    } finally {
      clearSession();
      setAuthError(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: profile?.role || null,
        isAdmin: profile?.role === 'admin',
        isWaiter: profile?.role === 'waiter',
        loading,
        authError,
        signIn,
        signOut,
        refreshProfile: () => user && loadProfile(user.id).then(setProfile),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
