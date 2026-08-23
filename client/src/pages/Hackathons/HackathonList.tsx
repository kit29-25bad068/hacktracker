import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Layers,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Star,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  Flame,
  ArrowRight,
  Sparkles,
  SlidersHorizontal,
  X,
  RefreshCw,
  Zap,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Hackathon } from '../../types';

const PLATFORMS = ['All', 'Devpost', 'Unstop', 'DoraHacks', 'Devfolio', 'MLH'];
const THEMES = ['All', 'AI/ML', 'Web Development', 'Blockchain', 'Fintech', 'IoT', 'Data Science', 'Cybersecurity', 'Open Innovation'];
const LOCATIONS = ['All', 'Online', 'Offline', 'Hybrid'];
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Expert'];
const DEPARTMENTS = ['All', 'CSE', 'ECE', 'IT', 'AI & DS', 'Others'];
const DURATIONS = ['All', '24 hours', '48 hours', '1 week', '2 weeks', 'Open-ended'];

const HackathonList: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Filters State
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [platform, setPlatform] = useState(searchParams.get('platform') || 'All');
  const [theme, setTheme] = useState(searchParams.get('theme') || 'All');
  const [locationType, setLocationType] = useState(searchParams.get('location') || 'All');
  const [difficulty, setDifficulty] = useState('All');
  const [department, setDepartment] = useState('All');
  const [duration, setDuration] = useState('All');
  const [dateStatus, setDateStatus] = useState('all'); // upcoming, past, all
  const [sortBy, setSortBy] = useState('date');
  const [page, setPage] = useState(1);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    fetchHackathons();
  }, [search, platform, theme, locationType, difficulty, department, duration, dateStatus, sortBy, page]);

  const fetchHackathons = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        search,
        platform,
        theme,
        locationType,
        difficulty,
        department,
        duration,
        dateStatus,
        sortBy,
        page: String(page),
        limit: '12',
      });

      const res = await api.get(`/hackathons?${params.toString()}`);
      setHackathons(res.data.hackathons || []);
      setPagination(res.data.pagination || { page: 1, limit: 12, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch hackathons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshFeed = async () => {
    try {
      setIsSyncing(true);
      addToast('info', 'Refreshing Feed', 'Loading latest aggregated hackathons from Devpost, Unstop, DoraHacks, Devfolio, and MLH...');
      const res = await api.post('/hackathons/sync-all', { forceFreshRun: true });
      addToast('success', 'Feed Updated', res.data.message || `Refreshed ${res.data.syncedCount || 78} live hackathons!`);
      await fetchHackathons();
    } catch (err: any) {
      console.error('Refresh failed:', err);
      addToast('error', 'Notice', err?.response?.data?.error || 'Could not refresh feed.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSave = async (hackathonId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      addToast('info', 'Sign in Required', 'Please sign in to save hackathons to your bookmarks.');
      return;
    }

    try {
      const res = await api.post(`/hackathons/${hackathonId}/save`);
      setHackathons((prev) =>
        prev.map((h) => (h.id === hackathonId ? { ...h, isSaved: res.data.isSaved } : h))
      );
      addToast('success', res.data.isSaved ? 'Hackathon Saved' : 'Removed', res.data.message);
    } catch (err) {
      console.error('Failed to toggle bookmark');
    }
  };

  const resetFilters = () => {
    setSearch('');
    setPlatform('All');
    setTheme('All');
    setLocationType('All');
    setDifficulty('All');
    setDepartment('All');
    setDuration('All');
    setDateStatus('all');
    setSortBy('date');
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>5-Platform Discovery (Live Synced)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Explore Hackathons
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Live aggregated challenges across Devpost, Unstop, DoraHacks, Devfolio, and MLH.
          </p>
        </div>

        {/* Action Buttons & Search Bar */}
        <div className="flex items-center gap-2 max-w-lg w-full">
          <button
            onClick={handleRefreshFeed}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/20 disabled:opacity-50 transition-all shrink-0"
            title="Refreshes the live aggregated feed (Auto-synced daily at 00:00 UTC)"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Refreshing...' : '🔄 Refresh Feed'}</span>
          </button>

          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by title, platform..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none shadow-sm"
            />
          </div>
          <button
            onClick={() => setShowMobileFilters((prev) => !prev)}
            className="lg:hidden p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Layout: Filters Sidebar + Hackathons Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* FILTERS SIDEBAR */}
        <div
          className={`lg:block ${
            showMobileFilters ? 'block fixed inset-0 z-50 p-6 bg-black/70 backdrop-blur-md overflow-y-auto' : 'hidden'
          } lg:relative lg:p-0 lg:bg-transparent`}
        >
          <div className="glass-card p-5 rounded-3xl space-y-5 bg-white dark:bg-[#111827] max-w-lg mx-auto lg:max-w-none">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2 font-bold text-sm text-gray-900 dark:text-white">
                <Filter className="w-4 h-4 text-teal-500" /> Filter Hackathons
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={resetFilters}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-semibold"
                >
                  Reset
                </button>
                {showMobileFilters && (
                  <button onClick={() => setShowMobileFilters(false)} className="lg:hidden p-1 text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Platform Filter */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Platform
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setPlatform(p);
                      setPage(1);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                      platform === p
                        ? 'bg-teal-500 text-white font-bold shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Status */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Timeline
              </label>
              <div className="grid grid-cols-3 gap-1.5 text-xs">
                {['upcoming', 'past', 'all'].map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      setDateStatus(status);
                      setPage(1);
                    }}
                    className={`py-1.5 rounded-xl capitalize font-semibold ${
                      dateStatus === status
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {/* Themes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Theme / Track
              </label>
              <select
                value={theme}
                onChange={(e) => {
                  setTheme(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#131B2A] text-xs font-semibold text-gray-900 dark:text-white"
              >
                {THEMES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Type */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Format
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                {LOCATIONS.map((loc) => (
                  <button
                    key={loc}
                    onClick={() => {
                      setLocationType(loc);
                      setPage(1);
                    }}
                    className={`py-1.5 px-2 rounded-xl text-center font-semibold ${
                      locationType === loc
                        ? 'bg-teal-500 text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Difficulty Level
              </label>
              <select
                value={difficulty}
                onChange={(e) => {
                  setDifficulty(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#131B2A] text-xs font-semibold text-gray-900 dark:text-white"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Sort Results
              </label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#131B2A] text-xs font-semibold text-gray-900 dark:text-white"
              >
                <option value="date">Date (Earliest First)</option>
                <option value="prize">Highest Prize Pool</option>
                <option value="rating">Top Rated</option>
                <option value="participants">Most Popular</option>
                <option value="deadline">Registration Deadline Soon</option>
              </select>
            </div>

            {showMobileFilters && (
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-2.5 text-xs font-bold text-white bg-teal-600 rounded-xl"
              >
                Apply Filters
              </button>
            )}
          </div>
        </div>

        {/* HACKATHONS GRID (12 Cards / Page) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>
              Showing <strong>{hackathons.length}</strong> of <strong>{pagination.total}</strong> hackathons
            </span>
          </div>

          {isLoading ? (
            <div className="py-24 text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
              Loading live hackathons...
            </div>
          ) : hackathons.length === 0 ? (
            <div className="glass-card p-12 rounded-3xl text-center space-y-3">
              <Layers className="w-12 h-12 text-gray-400 mx-auto" />
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">No matching hackathons found</h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Try widening your search keywords or resetting filters to view all upcoming events.
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 rounded-xl"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {hackathons.map((h) => (
                <div
                  key={h.id}
                  className="glass-card-hover rounded-3xl overflow-hidden flex flex-col justify-between border border-gray-200/80 dark:border-gray-800/80"
                >
                  {/* Card Header & Banner/Logo */}
                  <div className="p-5 space-y-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                        {h.platform}
                      </span>
                      <button
                        onClick={(e) => handleToggleSave(h.id, e)}
                        className={`p-1.5 rounded-xl border transition-colors ${
                          h.isSaved
                            ? 'bg-teal-500 text-white border-teal-500'
                            : 'text-gray-400 hover:text-gray-700 dark:hover:text-white border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60'
                        }`}
                        title={h.isSaved ? 'Saved to bookmarks' : 'Save Hackathon'}
                      >
                        {h.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      </button>
                    </div>

                    <div>
                      <Link
                        to={`/hackathons/${h.id}`}
                        className="font-bold text-base text-gray-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 line-clamp-1"
                      >
                        {h.title}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
                        {h.description}
                      </p>
                    </div>

                    {/* Metadata Badges */}
                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" /> Prize Pool:
                        </span>
                        <span className="font-extrabold text-emerald-500 font-mono">
                          {h.prizePool}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-teal-500" /> Deadline:
                        </span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {new Date(h.registrationDeadline).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-purple-500" /> Format:
                        </span>
                        <span>{h.locationType} &bull; {h.theme}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-blue-500" /> Hackers:
                        </span>
                        <span>{h.participantCount.toLocaleString()} registered</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-gray-50/80 dark:bg-[#0D131F] border-t border-gray-100 dark:border-gray-800/80 flex items-center gap-2">
                    <Link
                      to={`/hackathons/${h.id}`}
                      className="flex-1 py-2 text-center text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-700"
                    >
                      View Details
                    </Link>
                    <a
                      href={h.registrationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 text-center text-xs font-bold text-white bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-600 hover:to-indigo-700 rounded-xl shadow-md shadow-teal-500/20 transition-all flex items-center justify-center gap-1"
                    >
                      Register Now <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="pt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pagination.page <= 1}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold px-3 py-2 text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={pagination.page >= pagination.totalPages}
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] text-gray-700 dark:text-gray-300 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HackathonList;
