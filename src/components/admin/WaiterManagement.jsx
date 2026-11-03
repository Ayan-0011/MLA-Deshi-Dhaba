import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase, getSupabaseConfig } from '../../lib/supabase';
import { 
  Users, 
  UserPlus, 
  Check, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  User, 
  Lock
} from 'lucide-react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import { notify } from '../../lib/notifications';

export const WaiterManagement = () => {
  const [waiters, setWaiters] = useState([]);
  const [, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingWaiterId, setUpdatingWaiterId] = useState(null);

  const fetchWaiters = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setWaiters(data || []);
    } catch (err) {
      console.error('Failed to fetch waiters:', err);
      setError('Could not load staff accounts. Please refresh and try again.');
      notify.error('Could not load staff accounts. Please refresh and try again.', 'waiter-fetch-error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWaiters();
  }, [fetchWaiters]);

  const handleCreateWaiter = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password || !name.trim()) {
      setError('Name, email, and password are required');
      notify.warning('Name, email and password are required.', 'waiter-create-validation');
      return;
    }

    try {
      // Use a throw-away, non-persistent client so creating a waiter does not
      // replace (log out) the Admin's own session.
      const { url, key } = getSupabaseConfig();
      const tempClient = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error: authErr } = await tempClient.auth.signUp({
        email: email.trim(),
        password: password,
        options: {
          data: {
            full_name: name.trim(),
            role: 'waiter'
          }
        }
      });

      if (authErr) throw authErr;

      // Ensure profile exists in profiles table
      if (data?.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: email.trim(),
          full_name: name.trim(),
          role: 'waiter',
          is_active: true
        });
      }

      setSuccess(`Waiter account for "${name.trim()}" created successfully!`);
      notify.success('Waiter account created.', 'waiter-created');
      setName('');
      setEmail('');
      setPassword('');
      setIsAdding(false);
      await fetchWaiters();
    } catch (err) {
      console.error('Waiter account creation failed:', err);
      setError('Could not create this account. Check the details and try again.');
      notify.error('Could not create this waiter account.', 'waiter-create-error');
    }
  };

  const handleToggleActive = async (waiter) => {
    setUpdatingWaiterId(waiter.id);
    setError('');
    setSuccess('');
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ is_active: !waiter.is_active })
        .eq('id', waiter.id);

      if (updateErr) throw updateErr;

      setSuccess(`Waiter ${waiter.full_name} status updated.`);
      notify.success(`${waiter.full_name} is now ${waiter.is_active ? 'inactive' : 'active'}.`, `waiter-status-${waiter.id}`);
      await fetchWaiters();
    } catch (err) {
      console.error('Waiter status update failed:', err);
      setError('Could not update this account. Please try again.');
      notify.error('Could not update this waiter account.', `waiter-status-error-${waiter.id}`);
    } finally {
      setUpdatingWaiterId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-4 text-foreground sm:px-6 sm:py-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
            <Users className="h-6 w-6 text-primary" />
            <span>Dhaba Staff & Waiter Accounts</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage authorized staff members who can take table orders and submit bills.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
        >
          {isAdding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel' : 'Register New Waiter'}</span>
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger-foreground">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success-foreground">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Waiter Form */}
      {isAdding && (
        <form onSubmit={handleCreateWaiter} className="space-y-4 rounded-xl border border-border bg-surface p-4 shadow-sm sm:p-5">
          <h3 className="text-sm font-bold text-foreground">Register Waiter Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shyamu"
                  className="min-h-11 w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shyamu@mladhaba.com"
                  className="min-h-11 w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">
                Initial Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="min-h-11 w-full rounded-md border border-border bg-surface py-2.5 pl-9 pr-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm"
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="min-h-10 rounded-md border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:bg-surface-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-10 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary-hover"
            >
              Create Waiter Account
            </button>
          </div>
        </form>
      )}

      {/* Staff List */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between border-b border-border bg-surface-muted px-4 py-3.5 sm:px-5">
          <span className="text-sm font-bold text-foreground">Registered System Users</span>
          <span className="text-xs text-muted-foreground">{waiters.length} profiles</span>
        </div>

        <div className="divide-y divide-border">
          {waiters.map((w) => (
            <div key={w.id} className="flex flex-col gap-3 p-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg font-bold text-sm ${
                  w.role === 'admin' ? 'bg-primary-soft text-primary' : 'bg-success-soft text-success-foreground'
                }`}>
                  {w.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{w.full_name}</span>
                    <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
                    
                      {w.role}
                    </span>
                    {!w.is_active && (
                      <span className="rounded-full bg-danger-soft px-2 py-0.5 text-[10px] font-bold text-danger-foreground">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{w.email}</div>
                </div>
              </div>

              {w.role === 'waiter' && (
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <span>{w.is_active ? 'Active' : 'Inactive'}</span>
                  <ToggleSwitch checked={w.is_active} loading={updatingWaiterId === w.id} onChange={() => handleToggleActive(w)} label={`${w.full_name} account status`} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
