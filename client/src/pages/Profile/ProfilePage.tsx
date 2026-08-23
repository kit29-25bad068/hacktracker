import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  User,
  ShieldCheck,
  Trophy,
  Award,
  Sparkles,
  Github,
  Linkedin,
  Globe,
  ExternalLink,
  Code2,
  ThumbsUp,
  FolderGit2,
  Share2,
  Mail,
  Calendar,
  GraduationCap,
  Plus,
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  Check,
  Trash2,
} from 'lucide-react';
import api, { formatImageUrl } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import TrustScoreMeter from '../../components/TrustScoreMeter';
import { Project, Badge, Milestone, UserSkill } from '../../types';

const COVER_PRESETS = [
  {
    name: 'Cyber Matrix',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1600&h=600&fit=crop',
    preview: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=300&h=120&fit=crop',
  },
  {
    name: 'AI Neural Mesh',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&h=600&fit=crop',
    preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&h=120&fit=crop',
  },
  {
    name: 'Deep Cyberpunk',
    url: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1600&h=600&fit=crop',
    preview: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=300&h=120&fit=crop',
  },
  {
    name: 'Quantum Circuit',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1600&h=600&fit=crop',
    preview: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=120&fit=crop',
  },
  {
    name: 'Cosmic Nebula',
    url: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=1600&h=600&fit=crop',
    preview: 'https://images.unsplash.com/photo-1507499739999-097706ad8914?w=300&h=120&fit=crop',
  },
  {
    name: 'Cloud Infrastructure',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1600&h=600&fit=crop',
    preview: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=120&fit=crop',
  },
];

const ProfilePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const { user: currentUser, updateUser } = useAuth();
  const { addToast } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profileUser, setProfileUser] = useState<any>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cover Background Modal State
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [bannerInputUrl, setBannerInputUrl] = useState('');
  const [previewBannerUrl, setPreviewBannerUrl] = useState<string | null>(null);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  // New Skill Add State (if viewing own profile)
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [allSkillsCatalog, setAllSkillsCatalog] = useState<any[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [proficiency, setProficiency] = useState('Intermediate');

  useEffect(() => {
    fetchProfile();
  }, [username, currentUser]);

  const fetchProfile = async () => {
    const targetUsername = username || currentUser?.username;
    if (!targetUsername) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.get(`/users/${targetUsername}`);
      const userData = res.data.profile || res.data.user;
      
      if (!userData) {
        setProfileUser(null);
        return;
      }

      setProfileUser(userData);
      setPreviewBannerUrl(userData.bannerUrl || null);

      try {
        const [projRes, skillRes, badgeRes, msRes, catalogRes] = await Promise.all([
          api.get(`/projects?userId=${userData.id}`),
          api.get(`/skills/user/${userData.id}`),
          api.get(`/badges/user/${userData.id}`),
          api.get(`/milestones/user/${userData.id}`),
          api.get('/skills/catalog'),
        ]);

        setProjects(projRes.data.projects || userData.projects || []);
        setSkills(skillRes.data.userSkills || userData.skills || []);
        setBadges((badgeRes.data.userBadges || []).map((ub: any) => ub.badge) || userData.badges || []);
        setMilestones((msRes.data.userMilestones || []).map((um: any) => um.milestone) || userData.milestones || []);
        setAllSkillsCatalog(catalogRes.data.skills || []);
      } catch {
        // Fallback to pre-loaded arrays on userData
        setProjects(userData.projects || []);
        setSkills(userData.skills || []);
        setBadges((userData.badges || []).map((ub: any) => ub.badge || ub));
        setMilestones((userData.milestones || []).map((um: any) => um.milestone || um));
      }
    } catch (e) {
      console.error('Failed to load profile');
      setProfileUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndorseSkill = async (userSkillId: string, skillName: string) => {
    if (!currentUser) {
      addToast('info', 'Sign In Required', 'Please sign in to endorse peer skills.');
      return;
    }

    try {
      const res = await api.post(`/skills/${userSkillId}/endorse`);
      setSkills((prev) =>
        prev.map((s) => (s.id === userSkillId ? { ...s, endorsementCount: res.data.endorsementCount } : s))
      );
      addToast('success', 'Endorsed!', `You endorsed ${profileUser.name} for ${skillName}. (+10 pts)`);
    } catch (err: any) {
      addToast('error', 'Notice', err.response?.data?.error || 'Could not endorse skill.');
    }
  };

  const handleAddSkillToProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkillId) return;

    try {
      await api.post('/skills/user', {
        skillId: selectedSkillId,
        proficiencyLevel: proficiency,
      });

      addToast('success', 'Skill Added', 'Added skill to your profile.');
      setShowAddSkill(false);
      await fetchProfile();
    } catch (err: any) {
      addToast('error', 'Error', err.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleSaveBanner = async (newUrl?: string | null) => {
    const targetUrl = newUrl !== undefined ? newUrl : (bannerInputUrl.trim() || null);
    try {
      setIsUploadingBanner(true);
      const res = await api.put('/users/profile', { bannerUrl: targetUrl });
      
      setProfileUser((prev: any) => ({ ...prev, bannerUrl: targetUrl }));
      if (currentUser && currentUser.id === profileUser.id && updateUser) {
        updateUser({ bannerUrl: targetUrl });
      }
      
      addToast('success', 'Cover Updated', targetUrl ? 'Custom cover background updated!' : 'Cover background reset.');
      setShowCoverModal(false);
      setBannerInputUrl('');
    } catch (err: any) {
      addToast('error', 'Update Failed', err.response?.data?.error || 'Could not update cover photo.');
    } finally {
      setIsUploadingBanner(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      addToast('error', 'File Too Large', 'Please select an image smaller than 15MB.');
      return;
    }

    setIsUploadingBanner(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;

      // Optimize & resize image using Canvas for instant cloud storage
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1600;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setBannerInputUrl(optimizedDataUrl);

          try {
            const res = await api.put('/users/profile', { bannerUrl: optimizedDataUrl });
            const finalUrl = res.data?.user?.bannerUrl || optimizedDataUrl;

            setProfileUser((prev: any) => ({ ...prev, bannerUrl: finalUrl }));
            if (currentUser && currentUser.id === profileUser.id && updateUser) {
              updateUser({ bannerUrl: finalUrl });
            }

            addToast('success', 'Cover Photo Live', 'Your profile cover photo is now live!');
            setShowCoverModal(false);
          } catch (err: any) {
            addToast('error', 'Upload Failed', err.response?.data?.error || 'Could not save cover image.');
          } finally {
            setIsUploadingBanner(false);
          }
        }
      };

      img.onerror = () => {
        addToast('error', 'Invalid Image', 'Could not process the selected image.');
        setIsUploadingBanner(false);
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      addToast('error', 'Read Error', 'Failed to read image from device.');
      setIsUploadingBanner(false);
    };

    reader.readAsDataURL(file);
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    addToast('success', 'Profile Copied', 'Profile link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        Loading hacker profile...
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="py-24 text-center space-y-4 max-w-md mx-auto px-4">
        <div className="w-14 h-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mx-auto">
          <User className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-white">Profile Not Found</h2>
        <p className="text-xs text-gray-400">
          {!currentUser && !username
            ? 'You are not logged in. Please sign in to view your profile or explore public profiles from the leaderboard.'
            : `We couldn't find a hacker profile with username "@${username || ''}".`}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          {!currentUser && (
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold transition-all shadow-md shadow-teal-500/20"
            >
              Sign In to Your Account
            </Link>
          )}
          <Link
            to="/leaderboard"
            className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold border border-gray-700 transition-all"
          >
            Explore Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === profileUser.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* 1. PROFILE HEADER CARD (LinkedIn-Style Customizable Cover Banner) */}
      <div className="glass-card rounded-3xl overflow-hidden border border-gray-200/80 dark:border-gray-800/80 shadow-2xl">
        
        {/* Banner Cover */}
        <div className="h-48 sm:h-64 relative overflow-hidden bg-slate-900 border-b border-gray-200/10 group">
          {/* Default High-Tech Gradient & Grid Pattern (Always active base) */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-900 via-indigo-950 to-purple-950">
            <div className="absolute inset-0 bg-[radial-gradient(#14b8a6_1px,transparent_1px)] [background-size:16px_16px] opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Custom User Banner Image */}
          {profileUser.bannerUrl && (
            <img
              src={formatImageUrl(profileUser.bannerUrl)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover object-center transition-all duration-700 group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          )}

          {/* Vignette Overlay for Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/40 pointer-events-none z-10" />

          {/* Top-Right Action Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            {isOwnProfile && (
              <button
                onClick={() => {
                  setBannerInputUrl(profileUser.bannerUrl || '');
                  setShowCoverModal(true);
                }}
                className="px-3 py-2 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-white/20 shadow-lg transition-all hover:scale-105"
                title="Customize your cover background photo"
              >
                <Camera className="w-4 h-4 text-teal-400" />
                <span className="hidden sm:inline">{profileUser.bannerUrl ? 'Change Cover' : 'Add Cover Photo'}</span>
              </button>
            )}

            <button
              onClick={handleShare}
              className="p-2 rounded-xl bg-black/50 hover:bg-black/70 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-md border border-white/10 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Share
            </button>
            
            <Link
              to={`/portfolio/${profileUser.username}`}
              className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-black flex items-center gap-1.5 shadow-lg shadow-teal-500/30 transition-all"
            >
              <Globe className="w-4 h-4" /> Public Portfolio <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Profile Info Row (Elevated with relative z-10) */}
        <div className="px-6 sm:px-8 pb-8 pt-0 flex flex-col md:flex-row items-start md:items-end justify-between gap-6 -mt-16 sm:-mt-20 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
            {/* Avatar */}
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-3xl bg-teal-600 text-white font-extrabold text-3xl flex items-center justify-center border-4 border-white dark:border-[#111827] shadow-2xl overflow-hidden flex-shrink-0 bg-gradient-to-tr from-teal-500 to-indigo-600">
              {profileUser.avatar ? (
                <img src={formatImageUrl(profileUser.avatar)} alt={profileUser.name} className="w-full h-full object-cover" />
              ) : (
                profileUser.name.charAt(0)
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
                  {profileUser.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20">
                  Rank #{profileUser.currentRank || 1}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                @{profileUser.username} &bull; {profileUser.department} ({profileUser.year} Year)
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{profileUser.college || 'Engineering Institute of Technology'}</span>
              </div>
            </div>
          </div>

          {/* Trust Meter Gauge */}
          <div className="p-4 rounded-2xl bg-gray-50/80 dark:bg-[#131B2A]/80 border border-gray-200 dark:border-gray-800 flex items-center gap-4 self-stretch md:self-auto">
            <TrustScoreMeter score={profileUser.trustScore} size="md" />
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-gray-400">Final Score</div>
              <div className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                {profileUser.finalScore.toFixed(1)}
              </div>
              <div className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                {profileUser.points} points
              </div>
            </div>
          </div>
        </div>

        {/* Bio & Social Links */}
        <div className="px-6 sm:px-8 pb-6 border-t border-gray-100 dark:border-gray-800 pt-5 space-y-4">
          <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed max-w-3xl">
            {profileUser.bio || 'Collegiate developer focused on hackathons, full-stack systems, and distributed architecture.'}
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            {profileUser.githubUrl && (
              <a
                href={profileUser.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:text-teal-500 flex items-center gap-1.5 transition-colors"
              >
                <Github className="w-4 h-4" /> GitHub
              </a>
            )}
            {profileUser.linkedinUrl && (
              <a
                href={profileUser.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:text-teal-500 flex items-center gap-1.5 transition-colors"
              >
                <Linkedin className="w-4 h-4" /> LinkedIn
              </a>
            )}
            {profileUser.devpostUrl && (
              <a
                href={profileUser.devpostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:text-teal-500 flex items-center gap-1.5 transition-colors"
              >
                <Globe className="w-4 h-4" /> Devpost
              </a>
            )}
          </div>
        </div>
      </div>

      {/* 2. GRID: SKILLS MATRIX & ACHIEVEMENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLS: PROJECTS & VERIFICATIONS */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="glass-card p-6 rounded-3xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <FolderGit2 className="w-5 h-5 text-teal-500" /> Hackathon Projects ({projects.length})
              </h3>
              {isOwnProfile && (
                <Link
                  to="/projects"
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Submit New Project
                </Link>
              )}
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                <p className="text-xs text-gray-400">No project submissions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-2xl bg-gray-50/50 dark:bg-[#111827]/50 border border-gray-200 dark:border-gray-800/80 space-y-3 hover:border-teal-500/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                          {proj.title}
                          {proj.isVerified && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-teal-500" /> Verified (+8)
                            </span>
                          )}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {proj.hackathon ? proj.hackathon.title : proj.hackathonCustomName || 'Independent Hackathon'}
                        </p>
                      </div>

                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                        {proj.status}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{proj.description}</p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
                      <div className="flex items-center gap-2">
                        {proj.githubUrl && (
                          <a
                            href={proj.githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                          >
                            <Github className="w-3.5 h-3.5" /> Code
                          </a>
                        )}
                        {proj.projectUrl && (
                          <a
                            href={proj.projectUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
                          >
                            <ExternalLink className="w-3.5 h-3.5" /> Demo
                          </a>
                        )}
                      </div>

                      <span className="text-[11px] text-gray-400">
                        {new Date(proj.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VERIFIED BADGES & MILESTONES */}
          <div className="glass-card p-6 rounded-3xl space-y-4">
            <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" /> Earned Badges & Milestones ({badges.length + milestones.length})
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {badges.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-2xl bg-gray-50/50 dark:bg-[#111827]/50 border border-gray-200 dark:border-gray-800 text-center space-y-1.5 hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-teal-500 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                    {b.icon || '🏆'}
                  </div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white">{b.name}</div>
                  <div className="text-[10px] text-gray-500">{b.category}</div>
                </div>
              ))}
              {milestones.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-2xl bg-gray-50/50 dark:bg-[#111827]/50 border border-gray-200 dark:border-gray-800 text-center space-y-1.5 hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white font-extrabold text-lg flex items-center justify-center mx-auto shadow-md">
                    ⭐
                  </div>
                  <div className="font-bold text-xs text-gray-900 dark:text-white">{m.title}</div>
                  <div className="text-[10px] text-teal-400 font-bold">+{m.targetValue || 50} pts</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COL: VERIFIED SKILLS & PEER ENDORSEMENTS */}
        <div className="space-y-8">
          <div className="glass-card p-6 rounded-3xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-5 h-5 text-indigo-500" /> Technical Skills
              </h3>
              {isOwnProfile && (
                <button
                  onClick={() => setShowAddSkill(true)}
                  className="p-1.5 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 text-xs font-bold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              )}
            </div>

            {skills.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400">No skills added yet.</div>
            ) : (
              <div className="space-y-3">
                {skills.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-2xl bg-gray-50/50 dark:bg-[#111827]/50 border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                        {s.skill.name}
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {s.proficiencyLevel}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {s.endorsementCount} peer {s.endorsementCount === 1 ? 'endorsement' : 'endorsements'}
                      </div>
                    </div>

                    {!isOwnProfile && (
                      <button
                        onClick={() => handleEndorseSkill(s.id, s.skill.name)}
                        className="px-2.5 py-1 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-600 dark:text-teal-400 text-xs font-bold flex items-center gap-1 transition-colors"
                        title="Endorse peer (+10 pts)"
                      >
                        <ThumbsUp className="w-3 h-3" /> Endorse
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. LINKEDIN-STYLE COVER CUSTOMIZATION MODAL */}
      {showCoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="glass-card max-w-xl w-full p-6 sm:p-8 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    Customize Cover Background
                  </h3>
                  <p className="text-xs text-gray-400">
                    Add your personal banner like on LinkedIn
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCoverModal(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Live Preview */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Live Preview</label>
              <div className="h-32 rounded-2xl overflow-hidden relative border border-gray-700 bg-slate-900">
                {(bannerInputUrl.trim() || profileUser.bannerUrl) ? (
                  <img
                    src={formatImageUrl(bannerInputUrl.trim() || profileUser.bannerUrl)}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-r from-teal-900 via-indigo-950 to-purple-950 flex items-center justify-center text-xs text-gray-400">
                    Default Gradient & Grid
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>
            </div>

            {/* Option 1: File Upload */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Upload Image File (PNG, JPG, WebP)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingBanner}
                className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-gray-700 hover:border-teal-500 bg-gray-900/50 hover:bg-teal-950/20 text-xs font-bold text-gray-300 hover:text-teal-300 flex items-center justify-center gap-2 transition-all"
              >
                <Upload className="w-4 h-4 text-teal-400" />
                {isUploadingBanner ? 'Uploading Cover...' : 'Choose File from Device'}
              </button>
            </div>

            {/* Option 2: Image URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Or Paste Image URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={bannerInputUrl}
                  onChange={(e) => setBannerInputUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/photo-..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-700 bg-[#0E1624] text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Option 3: Curated Developer Presets */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-300">Or Pick a Tech Preset</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {COVER_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => setBannerInputUrl(preset.url)}
                    className={`p-1.5 rounded-xl border transition-all text-left overflow-hidden relative group ${
                      bannerInputUrl === preset.url
                        ? 'border-teal-400 ring-2 ring-teal-500/50'
                        : 'border-gray-700 hover:border-gray-500'
                    }`}
                  >
                    <div className="h-14 rounded-lg overflow-hidden relative">
                      <img src={preset.preview} alt={preset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white tracking-wide">{preset.name}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 gap-3">
              {profileUser.bannerUrl && (
                <button
                  type="button"
                  onClick={() => handleSaveBanner(null)}
                  disabled={isUploadingBanner}
                  className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Remove Cover
                </button>
              )}
              
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setShowCoverModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveBanner()}
                  disabled={isUploadingBanner}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold shadow-lg shadow-teal-500/20 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Save Cover
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 4. ADD SKILL MODAL */}
      {showAddSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="glass-card max-w-md w-full p-6 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl space-y-5">
            <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Add Technical Skill</h3>
            <form onSubmit={handleAddSkillToProfile} className="space-y-4">
              <div>
                <label className="text-xs text-gray-400">Select Skill</label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  required
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] text-xs text-gray-900 dark:text-white"
                >
                  <option value="">-- Choose Skill --</option>
                  {allSkillsCatalog.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400">Proficiency Level</label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value)}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#111827] text-xs text-gray-900 dark:text-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddSkill(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-black text-xs font-bold"
                >
                  Add Skill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
