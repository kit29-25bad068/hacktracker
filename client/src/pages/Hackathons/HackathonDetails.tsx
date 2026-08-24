import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Layers,
  Calendar,
  MapPin,
  Trophy,
  Users,
  Star,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Share2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Hackathon } from '../../types';

const HackathonDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useNotification();

  const [hackathon, setHackathon] = useState<Hackathon | null>(null);
  const [similar, setSimilar] = useState<Hackathon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Review Form State
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (id) {
      fetchHackathonDetails();
    }
  }, [id]);

  const fetchHackathonDetails = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/hackathons/${id}`);
      setHackathon(res.data.hackathon);
      setSimilar(res.data.similar || []);
    } catch (err) {
      console.error('Failed to load hackathon details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user || !hackathon) {
      addToast('info', 'Sign In Required', 'Please sign in to save hackathons.');
      return;
    }

    try {
      const res = await api.post(`/hackathons/${hackathon.id}/save`);
      setHackathon({ ...hackathon, isSaved: res.data.isSaved });
      addToast('success', res.data.isSaved ? 'Bookmark Saved' : 'Removed', res.data.message);
    } catch (err) {
      console.error('Failed to toggle save');
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('success', 'Link Copied', 'Hackathon link copied to clipboard!');
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hackathon) return;
    if (!userComment.trim()) return;

    try {
      setIsSubmittingReview(true);
      await api.post(`/hackathons/${hackathon.id}/review`, {
        rating: userRating,
        comment: userComment.trim(),
      });

      setUserComment('');
      setIsSubmittingReview(false);
      addToast('success', 'Review Posted', 'Thank you for rating this hackathon!');
      await fetchHackathonDetails();
    } catch (err: any) {
      setIsSubmittingReview(false);
      addToast('error', 'Review Failed', err.response?.data?.error || 'Could not post review.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        Loading hackathon details...
      </div>
    );
  }

  if (!hackathon) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-gray-500">Hackathon not found.</p>
        <Link to="/hackathons" className="text-xs font-bold text-teal-600 hover:underline">
          &larr; Back to Explore Hackathons
        </Link>
      </div>
    );
  }

  let parsedPrizes = [];
  try {
    if (hackathon.prizeBreakdown) {
      parsedPrizes = JSON.parse(hackathon.prizeBreakdown);
    }
  } catch (e) {
    parsedPrizes = [];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. TOP HERO CARD */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-teal-950/60 via-slate-900/80 to-indigo-950/60 border border-teal-500/20 shadow-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-teal-500 text-white shadow-sm">
              {hackathon.platform}
            </span>
            <span className="px-3 py-1 rounded-xl text-xs font-semibold bg-white/10 text-teal-300 border border-white/10">
              {hackathon.theme}
            </span>
            <div className="flex items-center gap-1 text-amber-400 text-xs font-bold">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{hackathon.rating} / 5.0</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSave}
              className={`p-2.5 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
                hackathon.isSaved
                  ? 'bg-teal-500 text-white border-teal-500'
                  : 'bg-white/10 text-white hover:bg-white/20 border-white/10'
              }`}
            >
              {hackathon.isSaved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{hackathon.isSaved ? 'Saved' : 'Save Hackathon'}</span>
            </button>
            <button
              onClick={handleShare}
              className="p-2.5 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {hackathon.title}
          </h1>
          <p className="text-sm sm:text-base text-gray-300 max-w-3xl leading-relaxed">
            {hackathon.description}
          </p>
        </div>

        {/* Primary Action Button Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-4">
          <a
            href={hackathon.registrationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-teal-400 to-indigo-500 hover:from-teal-300 hover:to-indigo-400 text-gray-950 font-black shadow-xl shadow-teal-500/25 transition-transform hover:scale-105 flex items-center gap-2 text-sm"
          >
            Register on {hackathon.platform} <ExternalLink className="w-4 h-4" />
          </a>
          <span className="text-xs text-gray-400">
            Official registration occurs directly on the {hackathon.platform} portal.
          </span>
        </div>
      </div>

      {/* 2. GRID: TIMELINE & DETAILS VS SIDEBAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLS: OVERVIEW, PRIZES, CRITERIA & REVIEWS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Key Milestones Timeline */}
          <div className="glass-card p-6 rounded-3xl space-y-5">
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-500" /> Hackathon Timeline
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold uppercase">Registration Deadline</span>
                <div className="text-base font-bold text-rose-500 font-mono">
                  {new Date(hackathon.registrationDeadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold uppercase">Submission Deadline</span>
                <div className="text-base font-bold text-amber-500 font-mono">
                  {new Date(hackathon.submissionDeadline).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold uppercase">Event Start</span>
                <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                  {hackathon.startDate ? new Date(hackathon.startDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : 'TBA'}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800 space-y-1">
                <span className="text-gray-400 font-bold uppercase">Event Finish</span>
                <div className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                  {hackathon.endDate ? new Date(hackathon.endDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  }) : 'TBA'}
                </div>
              </div>
            </div>
          </div>

          {/* Prize Breakdown Table */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" /> Prize Pool Breakdown
              </h3>
              <span className="text-sm font-black text-emerald-500 font-mono">
                Total: {hackathon.prizePool}
              </span>
            </div>

            {parsedPrizes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {parsedPrizes.map((pz: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800 text-center space-y-1"
                  >
                    <div className="font-bold text-gray-700 dark:text-gray-300">{pz.place}</div>
                    <div className="text-base font-black text-emerald-500 font-mono">{pz.amount}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Prize details available on the official registration page.</p>
            )}
          </div>

          {/* Judging Criteria & Eligibility */}
          <div className="glass-card p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-500" /> Judging Criteria & Eligibility
            </h3>

            <div className="space-y-3 text-gray-600 dark:text-gray-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800">
                <strong className="block text-gray-900 dark:text-white mb-1">Judging Framework:</strong>
                {hackathon.judgingCriteria || 'Innovation (30%), Technical Execution (30%), Impact (20%), Pitch (20%)'}
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800">
                <strong className="block text-gray-900 dark:text-white mb-1">Eligibility Rules:</strong>
                {hackathon.eligibility || 'Open to all enrolled undergraduate and postgraduate students.'}
              </div>
            </div>
          </div>

          {/* Reviews & Ratings */}
          <div className="glass-card p-6 rounded-3xl space-y-5">
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-teal-500" /> Hacker Reviews ({hackathon.reviews?.length || 0})
            </h3>

            {/* Review Form */}
            {user ? (
              <form onSubmit={handleAddReview} className="space-y-3 p-4 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span>Write a review for this hackathon:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setUserRating(star)}
                        className={`text-sm ${userRating >= star ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={userComment}
                  onChange={(e) => setUserComment(e.target.value)}
                  placeholder="Share your experience regarding mentorship, prizes, problem statements..."
                  className="w-full p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-[#111827] text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                <button
                  type="submit"
                  disabled={isSubmittingReview || !userComment.trim()}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl disabled:opacity-50"
                >
                  {isSubmittingReview ? 'Submitting...' : 'Post Review'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-gray-500">Sign in to write a review for this hackathon.</p>
            )}

            {/* Reviews List */}
            <div className="space-y-3">
              {hackathon.reviews && hackathon.reviews.length > 0 ? (
                hackathon.reviews.map((rev) => (
                  <div key={rev.id} className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#131B2A]/50 border border-gray-200/60 dark:border-gray-800 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 dark:text-white">{rev.user.name}</span>
                      <span className="text-amber-400 font-bold">{'★'.repeat(rev.rating)}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{rev.comment}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-400">No reviews yet. Be the first to review!</p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT 1 COL: SUMMARY SPECIFICATIONS & SIMILAR HACKATHONS */}
        <div className="space-y-8">
          
          {/* Specifications Card */}
          <div className="glass-card p-6 rounded-3xl space-y-4 text-xs">
            <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
              Event Specifications
            </h3>

            <div className="space-y-2.5 divide-y divide-gray-100 dark:divide-gray-800/80">
              <div className="flex justify-between pt-1">
                <span className="text-gray-500">Platform</span>
                <span className="font-semibold text-gray-900 dark:text-white">{hackathon.platform}</span>
              </div>
              <div className="flex justify-between pt-2.5">
                <span className="text-gray-500">Format</span>
                <span className="font-semibold text-gray-900 dark:text-white">{hackathon.locationType}</span>
              </div>
              <div className="flex justify-between pt-2.5">
                <span className="text-gray-500">Duration</span>
                <span className="font-semibold text-gray-900 dark:text-white">{hackathon.duration}</span>
              </div>
              <div className="flex justify-between pt-2.5">
                <span className="text-gray-500">Team Size</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {hackathon.teamSizeMin} - {hackathon.teamSizeMax} Members
                </span>
              </div>
              <div className="flex justify-between pt-2.5">
                <span className="text-gray-500">Difficulty</span>
                <span className="font-semibold text-gray-900 dark:text-white">{hackathon.difficulty}</span>
              </div>
              <div className="flex justify-between pt-2.5">
                <span className="text-gray-500">Target Department</span>
                <span className="font-semibold text-gray-900 dark:text-white">{hackathon.department}</span>
              </div>
              <div className="flex justify-between pt-2.5">
                <span className="text-gray-500">Participants</span>
                <span className="font-semibold text-emerald-500">{hackathon.participantCount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Similar Hackathons */}
          {similar.length > 0 && (
            <div className="glass-card p-6 rounded-3xl space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-wider text-gray-900 dark:text-white">
                Similar Hackathons
              </h3>

              <div className="space-y-3">
                {similar.map((sim) => (
                  <Link
                    key={sim.id}
                    to={`/hackathons/${sim.id}`}
                    className="p-3 rounded-2xl bg-gray-50 dark:bg-[#131B2A] border border-gray-200 dark:border-gray-800 hover:border-teal-500/50 flex flex-col space-y-1 transition-all group"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-teal-600 dark:text-teal-400">{sim.platform}</span>
                      <span className="text-emerald-500 font-mono font-bold">{sim.prizePool}</span>
                    </div>
                    <div className="font-bold text-xs text-gray-900 dark:text-white group-hover:text-teal-500 transition-colors truncate">
                      {sim.title}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default HackathonDetails;
