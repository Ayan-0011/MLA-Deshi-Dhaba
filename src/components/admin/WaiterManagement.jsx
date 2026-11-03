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
  Power, 
  Mail, 
  User, 
  Lock 
} from 'lucide-react';

export const WaiterManagement = () => {
  const [waiters, setWaiters] = useState([]);
  const [, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
      setError(err.message);
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
      setName('');
      setEmail('');
      setPassword('');
      setIsAdding(false);
      await fetchWaiters();
    } catch (err) {
      setError(err.message || 'Failed to create waiter account');
    }
  };

  const handleToggleActive = async (waiter) => {
    setError('');
    setSuccess('');
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ is_active: !waiter.is_active })
        .eq('id', waiter.id);

      if (updateErr) throw updateErr;

      setSuccess(`Waiter ${waiter.full_name} status updated.`);
      await fetchWaiters();
    } catch (err) {
      setError(err.message || 'Failed to update waiter');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-3 sm:px-6 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E8E4DE] rounded-xl p-5 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-xl font-bold text-[#2B2623] flex items-center gap-2">
            <Users className="w-6 h-6 text-[#C2570C]" />
            <span>Dhaba Staff & Waiter Accounts</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#6B635C] mt-1">
            Manage authorized staff members who can take table orders and submit bills.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
        >
          {isAdding ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          <span>{isAdding ? 'Cancel' : 'Register New Waiter'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Add Waiter Form */}
      {isAdding && (
        <form onSubmit={handleCreateWaiter} className="bg-[#FAF9F7] border-2 border-[#C2570C]/40 rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-sm text-[#2B2623]">Register Waiter Account</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6B635C] absolute left-3 top-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Shyamu"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#6B635C] absolute left-3 top-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="shyamu@mladhaba.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-[#6B635C] uppercase mb-1">
                Initial Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B635C] absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E8E4DE] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C2570C]"
                  required
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 bg-white text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-semibold border border-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#C2570C] hover:bg-[#A8480A] text-white rounded-xl text-xs font-bold shadow-sm active:scale-95"
            >
              Create Waiter Account
            </button>
          </div>
        </form>
      )}

      {/* Staff List */}
      <div className="bg-white border border-[#E8E4DE] rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-[#FAF9F7] border-b border-[#E8E4DE] flex items-center justify-between">
          <span className="text-xs font-bold text-[#2B2623]">Registered System Users</span>
          <span className="text-xs text-slate-500">{waiters.length} profiles</span>
        </div>

        <div className="divide-y divide-slate-100">
          {waiters.map((w) => (
            <div key={w.id} className="p-4 flex items-center justify-between hover:bg-[#FAF9F7] transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                  w.role === 'admin' ? 'bg-[#C2570C]/20 text-[#C2570C]' : 'bg-emerald-50 text-[#14532D]'
                }`}>
                  {w.full_name?.charAt(0) || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#2B2623]">{w.full_name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      w.role === 'admin' ? 'bg-[#C2570C] text-white' : 'bg-[#C2570C] text-white'
                    }`}>
                      {w.role}
                    </span>
                    {!w.is_active && (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{w.email}</div>
                </div>
              </div>

              {w.role === 'waiter' && (
                <button
                  onClick={() => handleToggleActive(w)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    w.is_active 
                      ? 'border-red-200 text-red-700 hover:bg-red-50' 
                      : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{w.is_active ? 'Deactivate' : 'Activate'}</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
