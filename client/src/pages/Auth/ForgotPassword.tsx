import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Mail, Lock, ArrowRight, CheckCircle2, AlertCircle, KeyRound, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await api.post('/auth/reset-password', {
        email: email.trim(),
        newPassword,
      });
      setIsLoading(false);
      setIsSubmitted(true);
    } catch (err: any) {
      setIsLoading(false);
      setError(err.response?.data?.error || 'Failed to reset password. Please verify your email.');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-teal-500/25">
              <Layers className="w-6 h-6" />
            </div>
          </Link>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
            Reset Password
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Enter your registered email and choose your new password.
          </p>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-3xl space-y-5">
          {isSubmitted ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Password Reset Successfully!
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Your account password has been updated. You can now log in with your new credentials.
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-lg shadow-teal-500/20"
                >
                  Sign In to Account <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Registered Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@university.edu"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#131B2A] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#131B2A] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#131B2A] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 rounded-xl shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? 'Updating Password...' : 'Reset & Save Password'} <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-xs text-gray-500 hover:underline">
                  &larr; Back to login
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
