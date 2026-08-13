import React, { useState } from 'react';
import { adminLogin } from '../../api/client';
import { Lock, User, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

interface Props {
  onLoginSuccess: (username: string, role?: string) => void;
}

export const AdminLogin: React.FC<Props> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await adminLogin(username, password);
      onLoginSuccess(res.username, res.role);
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-10 animate-slide-up">
      <div className="card border border-[#2e2e2e] bg-[#1a1a1a] shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-950/60 border border-indigo-800/60 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-400 shadow-sm">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white mb-1">Admin Portal Login</h1>
          <p className="text-xs text-gray-400">Sign in to manage daily allocations and queue requests.</p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-xs bg-red-950/80 border border-red-800 text-red-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Username</label>
            <div className="input-icon-group">
              <div className="icon-box">
                <User className="w-4 h-4 text-indigo-400" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-300 uppercase mb-1.5">Password</label>
            <div className="input-icon-group">
              <div className="icon-box">
                <Lock className="w-4 h-4 text-indigo-400" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-base py-3.5 mt-2"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </div>
            ) : (
              <span>Sign In to Admin Dashboard</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
