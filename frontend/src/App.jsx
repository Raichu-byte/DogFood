import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Users,
  Award,
  Layers,
  Sparkles,
  Search,
  ExternalLink,
  Github,
  Youtube,
  Vote,
  CheckCircle2,
  Lock,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Zap,
  LogIn,
  LogOut,
  Send,
  PlusCircle,
  HelpCircle,
  Megaphone,
  MessageSquare,
  Pin,
  Trash2,
  CornerDownRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'gallery', 'leaderboard', 'announcements', 'judging', 'team'
  const [health, setHealth] = useState(null);
  const [eventData, setEventData] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardMode, setLeaderboardMode] = useState('normalized'); // 'normalized', 'raw', 'community'
  const [selectedTrack, setSelectedTrack] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // Announcements state
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementPinned, setAnnouncementPinned] = useState(false);

  // Discussions & Threaded Comments state
  const [discussionProject, setDiscussionProject] = useState(null);
  const [commentsList, setCommentsList] = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const [replyParentId, setReplyParentId] = useState(null);
  const [replyParentAuthor, setReplyParentAuthor] = useState('');

  // Auth Modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('Password123!');
  const [authError, setAuthError] = useState('');

  // Judging state
  const [judgeAssignments, setJudgeAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [scoresInput, setScoresInput] = useState({});
  const [feedbackInput, setFeedbackInput] = useState({});
  const [scoreSuccess, setScoreSuccess] = useState('');

  // Team & Submission Draft state
  const [teamName, setTeamName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [myTeam, setMyTeam] = useState(null);
  const [submissionDraft, setSubmissionDraft] = useState({
    title: '',
    tagline: '',
    description: '',
    techStack: 'React, Express, TailwindCSS',
    repoUrl: '',
    demoUrl: '',
    videoUrl: '',
    trackId: '',
  });
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  // 1. Initial Load: Health & Event
  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));

    fetchEventData();
  }, []);

  // 2. Fetch current user profile if token exists
  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setCurrentUser(data.user);
          } else {
            handleLogout();
          }
        })
        .catch(() => handleLogout());
    } else {
      setCurrentUser(null);
    }
  }, [token]);

  // 3. Tab-based data fetching
  useEffect(() => {
    if (activeTab === 'gallery') fetchGallery();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'judging') fetchJudgingQueue();
    if (activeTab === 'overview') fetchWinners();
  }, [activeTab, leaderboardMode, selectedTrack, searchQuery, token]);

  const fetchEventData = () => {
    fetch('/api/events/dogfood-2026')
      .then(res => res.json())
      .then(data => {
        if (data.event) {
          setEventData(data.event);
        }
      })
      .catch(err => console.error(err));
  };

  const fetchGallery = () => {
    setLoading(true);
    let url = '/api/gallery?limit=50';
    if (selectedTrack) url += `&trackId=${selectedTrack}`;
    if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setGallery(data.projects || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchLeaderboard = () => {
    setLoading(true);
    let url = `/api/leaderboard/dogfood-2026?mode=${leaderboardMode}`;
    if (selectedTrack) url += `&trackId=${selectedTrack}`;

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(url, { headers })
      .then(res => res.json())
      .then(data => {
        setLeaderboard(data.leaderboard || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchWinners = () => {
    fetch('/api/events/dogfood-2026/winners')
      .then(res => res.json())
      .then(data => {
        if (data.prizes) setWinners(data.prizes);
      })
      .catch(err => console.error(err));
  };

  const fetchAnnouncements = () => {
    setLoading(true);
    fetch('/api/events/dogfood-2026/announcements')
      .then(res => res.json())
      .then(data => {
        setAnnouncements(data.announcements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const handleCreateAnnouncement = (e) => {
    if (e) e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      showToast('⚠️ Title and content are required.');
      return;
    }

    fetch('/api/events/dogfood-2026/announcements', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        title: announcementTitle,
        content: announcementContent,
        isPinned: announcementPinned,
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.announcement) {
          showToast('📢 Announcement broadcasted!');
          setAnnouncementTitle('');
          setAnnouncementContent('');
          setAnnouncementPinned(false);
          fetchAnnouncements();
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      })
      .catch(() => showToast('Network error creating announcement.'));
  };

  const openProjectComments = (project) => {
    setDiscussionProject(project);
    fetchCommentsForProject(project.id);
  };

  const fetchCommentsForProject = (submissionId) => {
    fetch(`/api/submissions/${submissionId}/comments`)
      .then(res => res.json())
      .then(data => {
        setCommentsList(data.comments || []);
      })
      .catch(err => console.error(err));
  };

  const handlePostComment = (e) => {
    if (e) e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!commentInput.trim()) return;

    fetch(`/api/submissions/${discussionProject.id}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        content: commentInput.trim(),
        parentId: replyParentId || undefined,
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.comment) {
          showToast('💬 Comment posted!');
          setCommentInput('');
          setReplyParentId(null);
          setReplyParentAuthor('');
          fetchCommentsForProject(discussionProject.id);
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      })
      .catch(() => showToast('Network error posting comment.'));
  };

  const handlePinComment = (commentId) => {
    if (!token) return;
    fetch(`/api/comments/${commentId}/pin`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.comment) {
          showToast(data.message);
          fetchCommentsForProject(discussionProject.id);
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      });
  };

  const handleDeleteComment = (commentId) => {
    if (!token) return;
    fetch(`/api/comments/${commentId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          showToast('Comment deleted.');
          fetchCommentsForProject(discussionProject.id);
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      });
  };

  const renderCommentNode = (node, depth = 0) => {
    return (
      <div key={node.id} className={`space-y-2 ${depth > 0 ? 'ml-6 pl-4 border-l border-[#1e2330]' : ''}`}>
        <div className={`p-4 rounded-xl border ${node.isPinned ? 'border-amber-400/40 bg-[#161a28]' : 'border-[#1a1f2c] bg-[#0d1017]'} space-y-2`}>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {node.isPinned && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center space-x-1">
                  <Pin className="w-2.5 h-2.5" />
                  <span>PINNED</span>
                </span>
              )}
              <span className={`font-bold ${node.isDeleted ? 'text-neutral-500 italic' : 'text-white'}`}>
                {node.author?.name || 'Anonymous'}
              </span>
              {node.author?.role && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#1a1f2c] text-[#ff5500]">
                  {node.author.role}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              {new Date(node.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className={`text-xs leading-relaxed ${node.isDeleted ? 'text-neutral-500 italic font-mono' : 'text-neutral-300'}`}>
            {node.content}
          </p>

          {!node.isDeleted && (
            <div className="pt-2 border-t border-[#161922] flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <button
                onClick={() => {
                  setReplyParentId(node.id);
                  setReplyParentAuthor(node.author?.name || 'User');
                }}
                className="hover:text-[#ff5500] flex items-center space-x-1"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Reply</span>
              </button>

              <div className="flex items-center space-x-3">
                {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
                  <button
                    onClick={() => handlePinComment(node.id)}
                    className="hover:text-amber-400 flex items-center space-x-1"
                    title={node.isPinned ? "Unpin comment" : "Pin comment to top"}
                  >
                    <Pin className="w-3 h-3" />
                    <span>{node.isPinned ? 'Unpin' : 'Pin'}</span>
                  </button>
                )}

                {(currentUser?.id === node.author?.id || currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
                  <button
                    onClick={() => handleDeleteComment(node.id)}
                    className="hover:text-rose-400 flex items-center space-x-1"
                    title="Delete comment"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Nested replies */}
        {node.replies && node.replies.length > 0 && (
          <div className="space-y-2 mt-2">
            {node.replies.map(reply => renderCommentNode(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const fetchJudgingQueue = () => {
    if (!token) return;
    fetch('/api/judging/my-assignments', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setJudgeAssignments(data.assignments || []);
        if (data.assignments && data.assignments.length > 0 && !selectedAssignment) {
          setSelectedAssignment(data.assignments[0]);
        }
      })
      .catch(err => console.error(err));
  };

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setAuthError('');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password: authPassword })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
          setCurrentUser(data.user);
          setShowAuthModal(false);
          showToast(`Welcome back, ${data.user.name} (${data.user.role})!`);
        } else {
          setAuthError(data.error || 'Authentication failed.');
        }
      })
      .catch(() => setAuthError('Network error connecting to API.'));
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
    setCurrentUser(null);
    showToast('Logged out successfully.');
  };

  const handleQuickLogin = (email) => {
    setAuthEmail(email);
    setAuthPassword('Password123!');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'Password123!' })
    })
      .then(res => res.json())
      .then(data => {
        if (data.token) {
          localStorage.setItem('token', data.token);
          setToken(data.token);
          setCurrentUser(data.user);
          setShowAuthModal(false);
          showToast(`Signed in as ${data.user.name} (${data.user.role})`);
        }
      });
  };

  const handleCommunityVote = (submissionId) => {
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    fetch('/api/voting/vote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        eventId: eventData?.id || 'dogfood-2026',
        submissionId
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.vote) {
          showToast('🎉 Your community vote was cast successfully!');
          fetchGallery();
          fetchLeaderboard();
        } else {
          showToast(`⚠️ ${data.error || 'Unable to vote'}`);
        }
      })
      .catch(() => showToast('Network error casting vote.'));
  };

  const handleScoreSubmit = (e) => {
    e.preventDefault();
    if (!selectedAssignment) return;

    const scoresPayload = (selectedAssignment.event?.rubricCriteria || []).map(crit => ({
      criteriaId: crit.id,
      scoreValue: parseFloat(scoresInput[crit.id] || 8.0),
      feedback: feedbackInput[crit.id] || 'Well constructed implementation.'
    }));

    fetch('/api/judging/scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        assignmentId: selectedAssignment.id,
        scores: scoresPayload
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.assignment) {
          setScoreSuccess('Scores saved and normalized successfully!');
          showToast('Evaluation submitted!');
          fetchJudgingQueue();
          setTimeout(() => setScoreSuccess(''), 3000);
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      });
  };

  return (
    <div className="min-h-screen bg-[#090a0f] text-[#f3f4f6] flex flex-col font-sans selection:bg-[#ff5500]/30 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#161922] border border-[#ff5500]/40 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-fade-in font-mono text-sm">
          <Sparkles className="w-4 h-4 text-[#ff5500]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1e2330] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Logo & Platform Tag */}
          <div className="flex items-center space-x-4 cursor-pointer" onClick={() => setActiveTab('overview')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ff5500] to-[#ff2200] flex items-center justify-center font-black text-black shadow-lg shadow-[#ff5500]/20 text-lg">
              DF
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-lg tracking-tight">DOGFOOD</h1>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[#ff5500]/10 text-[#ff5500] font-mono font-bold border border-[#ff5500]/20">
                  2026
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono tracking-wider">HACKATHON PLATFORM</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-[#12151e] p-1.5 rounded-xl border border-[#1e2330]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-2 ${
                activeTab === 'overview'
                  ? 'bg-[#ff5500] text-black shadow-md shadow-[#ff5500]/20'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1f2c]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>OVERVIEW</span>
            </button>

            <button
              onClick={() => setActiveTab('gallery')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-2 ${
                activeTab === 'gallery'
                  ? 'bg-[#ff5500] text-black shadow-md shadow-[#ff5500]/20'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1f2c]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>GALLERY</span>
            </button>

            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-2 ${
                activeTab === 'leaderboard'
                  ? 'bg-[#ff5500] text-black shadow-md shadow-[#ff5500]/20'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1f2c]'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>LEADERBOARD</span>
            </button>

            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-2 ${
                activeTab === 'announcements'
                  ? 'bg-[#ff5500] text-black shadow-md shadow-[#ff5500]/20'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1f2c]'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>ANNOUNCEMENTS</span>
            </button>

            <button
              onClick={() => setActiveTab('judging')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold font-mono transition-all flex items-center space-x-2 ${
                activeTab === 'judging'
                  ? 'bg-[#ff5500] text-black shadow-md shadow-[#ff5500]/20'
                  : 'text-neutral-400 hover:text-white hover:bg-[#1a1f2c]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>JUDGING</span>
            </button>
          </nav>

          {/* User Auth & Status */}
          <div className="flex items-center space-x-3">
            <span className="hidden lg:inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono bg-[#12151e] text-neutral-300 border border-[#1e2330]">
              <span className={`w-2 h-2 rounded-full mr-2 ${health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
              API: {health?.status === 'ok' ? 'ONLINE' : 'OFFLINE'}
            </span>

            {currentUser ? (
              <div className="flex items-center space-x-2 bg-[#12151e] border border-[#1e2330] p-1.5 pl-3 rounded-xl">
                <div className="text-right">
                  <p className="text-xs font-bold leading-tight">{currentUser.name}</p>
                  <p className="text-[10px] font-mono text-[#ff5500] font-semibold">{currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-1.5 hover:bg-[#1e2330] rounded-lg text-neutral-400 hover:text-rose-400 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#1e2330] hover:bg-[#282f42] text-white border border-[#2c3447] flex items-center space-x-2 transition"
              >
                <LogIn className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>SIGN IN</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8">
        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & EVENT HERO */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* Hero Section */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#151924] to-[#0d1017] border border-[#1e2330] p-8 md:p-14 overflow-hidden text-center md:text-left">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#ff5500]/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="max-w-3xl space-y-6">
                <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/20 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>STATUS: {eventData?.status || 'PUBLISHED'} • ZERO CLOUD DEPENDENCIES</span>
                </div>

                <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
                  {eventData?.name || 'Dogfood 2026: The Builder’s Playground'}
                </h1>

                <p className="text-lg text-neutral-400 leading-relaxed max-w-2xl">
                  {eventData?.description ||
                    'The premier open-source hacker tournament. Build offline-first resilient architectures, submit your creation, and compete for verified prizes.'}
                </p>

                {/* Event Deadlines & Stats Strip */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 text-left">
                  <div className="bg-[#0e1118] border border-[#1e2330] p-4 rounded-2xl">
                    <p className="text-[11px] font-mono text-neutral-400">PRIZE POOL</p>
                    <p className="text-xl font-black text-white">$20,000</p>
                  </div>
                  <div className="bg-[#0e1118] border border-[#1e2330] p-4 rounded-2xl">
                    <p className="text-[11px] font-mono text-neutral-400">SUBMISSIONS</p>
                    <p className="text-xl font-black text-[#ff5500]">{eventData?._count?.submissions || 4} SHIPPED</p>
                  </div>
                  <div className="bg-[#0e1118] border border-[#1e2330] p-4 rounded-2xl">
                    <p className="text-[11px] font-mono text-neutral-400">TEAMS</p>
                    <p className="text-xl font-black text-white">{eventData?._count?.teams || 4} TEAMS</p>
                  </div>
                  <div className="bg-[#0e1118] border border-[#1e2330] p-4 rounded-2xl">
                    <p className="text-[11px] font-mono text-neutral-400">NORMALIZATION</p>
                    <p className="text-xl font-black text-emerald-400">Z-SCORE</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={() => setActiveTab('gallery')}
                    className="px-6 py-3.5 rounded-xl font-mono text-sm font-bold bg-[#ff5500] text-black hover:bg-[#ff661a] transition shadow-lg shadow-[#ff5500]/20 flex items-center space-x-2"
                  >
                    <Layers className="w-4 h-4" />
                    <span>EXPLORE PROJECT GALLERY</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('leaderboard')}
                    className="px-6 py-3.5 rounded-xl font-mono text-sm font-bold bg-[#181c27] text-white hover:bg-[#222838] border border-[#2b3347] transition flex items-center space-x-2"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    <span>VIEW LIVE LEADERBOARD</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Prizes Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black tracking-tight flex items-center space-x-2">
                    <Award className="w-6 h-6 text-[#ff5500]" />
                    <span>CHAMPIONSHIP PRIZES</span>
                  </h2>
                  <p className="text-sm text-neutral-400 font-mono">Verified rewards for top-ranked submissions</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(eventData?.prizes || []).map((prize, idx) => (
                  <div
                    key={prize.id || idx}
                    className="bg-[#10131c] border border-[#1e2330] hover:border-[#ff5500]/50 p-6 rounded-2xl transition duration-300 relative group overflow-hidden"
                  >
                    <div className="text-4xl mb-4">{idx === 0 ? '🏆' : idx === 1 ? '🥇' : '🥈'}</div>
                    <div className="text-2xl font-black text-[#ff5500] font-mono mb-2">{prize.amount}</div>
                    <h3 className="text-lg font-bold text-white mb-2">{prize.title}</h3>
                    <p className="text-xs text-neutral-400 leading-relaxed">{prize.description}</p>
                    {prize.track && (
                      <span className="inline-block mt-4 px-2.5 py-1 rounded-md text-[10px] font-mono bg-[#1a1f2c] text-neutral-300 border border-[#262e42]">
                        TRACK: {prize.track.name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tracks & Rubric Criteria */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Tracks */}
              <div className="bg-[#10131c] border border-[#1e2330] p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-[#ff5500]" />
                  <span>COMPETITION TRACKS</span>
                </h3>
                <div className="space-y-3">
                  {(eventData?.tracks || []).map(track => (
                    <div key={track.id} className="bg-[#0b0d13] p-4 rounded-xl border border-[#1a1f2c]">
                      <p className="font-bold text-sm text-white">{track.name}</p>
                      <p className="text-xs text-neutral-400 mt-1">{track.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rubric Criteria */}
              <div className="bg-[#10131c] border border-[#1e2330] p-6 rounded-2xl space-y-4">
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span>JUDGING RUBRIC & WEIGHTS</span>
                </h3>
                <div className="space-y-3">
                  <div className="bg-[#0b0d13] p-4 rounded-xl border border-[#1a1f2c] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">Technical Architecture & Execution</p>
                      <p className="text-xs text-neutral-400 mt-1">Code elegance, system performance, offline fidelity</p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 bg-[#1a1f2c] rounded text-[#ff5500]">40%</span>
                  </div>
                  <div className="bg-[#0b0d13] p-4 rounded-xl border border-[#1a1f2c] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">Innovation & Novelty</p>
                      <p className="text-xs text-neutral-400 mt-1">Creative breakthroughs and unique engineering solutions</p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 bg-[#1a1f2c] rounded text-[#ff5500]">30%</span>
                  </div>
                  <div className="bg-[#0b0d13] p-4 rounded-xl border border-[#1a1f2c] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">Design & Usability (UI/UX)</p>
                      <p className="text-xs text-neutral-400 mt-1">Simplicity, keyboard accessibility, visual polish</p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-1 bg-[#1a1f2c] rounded text-[#ff5500]">30%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PROJECT GALLERY & COMMUNITY VOTING */}
        {/* ============================================================ */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            {/* Gallery Controls Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#10131c] border border-[#1e2330] p-6 rounded-2xl">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white">PROJECT SHOWCASE</h2>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Discover published projects, test live demos, and vote for community favorites
                </p>
              </div>

              {/* Search Bar & Track Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                  <input
                    type="text"
                    placeholder="Search projects or tech..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#090a0f] border border-[#1e2330] focus:border-[#ff5500] text-xs font-mono text-white pl-9 pr-4 py-2.5 rounded-xl outline-none w-56 transition"
                  />
                </div>

                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="bg-[#090a0f] border border-[#1e2330] text-xs font-mono text-neutral-300 px-3 py-2.5 rounded-xl outline-none"
                >
                  <option value="">All Tracks</option>
                  {(eventData?.tracks || []).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Gallery Cards Grid */}
            {loading ? (
              <div className="text-center py-20 text-neutral-400 font-mono">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#ff5500] mb-3" />
                Loading showcase submissions...
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-20 bg-[#10131c] border border-[#1e2330] rounded-2xl">
                <p className="text-neutral-400 font-mono">No matching submissions found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gallery.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[#10131c] border border-[#1e2330] hover:border-[#ff5500]/50 rounded-2xl p-6 flex flex-col justify-between transition duration-300 group shadow-lg"
                  >
                    <div className="space-y-4">
                      {/* Track Pill & Links */}
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-[#ff5500]/10 text-[#ff5500] border border-[#ff5500]/20">
                          {project.track?.name || 'GENERAL TRACK'}
                        </span>
                        <div className="flex items-center space-x-2">
                          {project.repoUrl && (
                            <a
                              href={project.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-[#181c27] hover:bg-[#252b3b] text-neutral-300 rounded-lg transition"
                              title="GitHub Repository"
                            >
                              <Github className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {project.demoUrl && (
                            <a
                              href={project.demoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 bg-[#181c27] hover:bg-[#252b3b] text-neutral-300 rounded-lg transition"
                              title="Live Demo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Title & Tagline */}
                      <div>
                        <h3 className="text-xl font-black text-white group-hover:text-[#ff5500] transition">
                          {project.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1 line-clamp-2">{project.tagline}</p>
                      </div>

                      {/* Tech Stack Pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(project.techStack || []).map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#161a24] text-neutral-300 border border-[#22293a]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      {/* Team Members List */}
                      <div className="pt-2 border-t border-[#181c27] flex items-center justify-between text-xs text-neutral-400">
                        <div className="flex items-center space-x-2">
                          <Users className="w-3.5 h-3.5 text-neutral-500" />
                          <span className="font-semibold text-neutral-300">{project.team?.name}</span>
                        </div>
                        <span className="font-mono text-[10px] text-neutral-500">
                          {project.team?.members?.length || 1} Member(s)
                        </span>
                      </div>
                    </div>

                    {/* Discuss & Community Vote Action Buttons */}
                    <div className="pt-5 mt-4 border-t border-[#181c27] grid grid-cols-2 gap-3">
                      <button
                        onClick={() => openProjectComments(project)}
                        className="py-2.5 rounded-xl font-mono text-xs font-bold bg-[#141824] hover:bg-[#202738] text-neutral-300 hover:text-white transition border border-[#232a3d] flex items-center justify-center space-x-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#ff5500]" />
                        <span>DISCUSS</span>
                      </button>
                      <button
                        onClick={() => handleCommunityVote(project.id)}
                        className="py-2.5 rounded-xl font-mono text-xs font-bold bg-[#1a1f2c] hover:bg-[#ff5500] text-white hover:text-black transition border border-[#262d3e] hover:border-[#ff5500] flex items-center justify-center space-x-1.5"
                      >
                        <Vote className="w-3.5 h-3.5 text-[#ff5500] group-hover:text-black" />
                        <span>VOTE</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 3: LIVE LEADERBOARDS & MULTI-MODAL RANKINGS */}
        {/* ============================================================ */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            {/* Leaderboard Header & Mode Switcher */}
            <div className="bg-[#10131c] border border-[#1e2330] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <span>TOURNAMENT STANDINGS</span>
                </h2>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Live rankings with statistical Z-Score bias mitigation
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center space-x-2 bg-[#090a0f] p-1.5 rounded-xl border border-[#1e2330]">
                <button
                  onClick={() => setLeaderboardMode('normalized')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    leaderboardMode === 'normalized'
                      ? 'bg-[#ff5500] text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  ⚡ Z-SCORE (CALIBRATED)
                </button>
                <button
                  onClick={() => setLeaderboardMode('raw')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    leaderboardMode === 'raw'
                      ? 'bg-[#ff5500] text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  📊 RAW AVERAGE
                </button>
                <button
                  onClick={() => setLeaderboardMode('community')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                    leaderboardMode === 'community'
                      ? 'bg-[#ff5500] text-black shadow'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                >
                  🗳️ COMMUNITY
                </button>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="bg-[#10131c] border border-[#1e2330] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#1e2330] bg-[#0c0e14] text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6">Project / Team</th>
                      <th className="py-4 px-6">Track</th>
                      <th className="py-4 px-6 text-right">
                        {leaderboardMode === 'normalized'
                          ? 'Z-Score'
                          : leaderboardMode === 'raw'
                          ? 'Raw Mean'
                          : 'Votes'}
                      </th>
                      <th className="py-4 px-6 text-right">Evals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#181c27] text-sm">
                    {leaderboard.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#141824] transition duration-150">
                        {/* Rank Badge */}
                        <td className="py-4 px-6 font-mono font-black text-base">
                          {entry.rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/30">
                              🥇
                            </span>
                          ) : entry.rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-neutral-300/10 text-neutral-300 border border-neutral-300/30">
                              🥈
                            </span>
                          ) : entry.rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-amber-700/10 text-amber-600 border border-amber-700/30">
                              🥉
                            </span>
                          ) : (
                            <span className="text-neutral-500 pl-2">#{entry.rank}</span>
                          )}
                        </td>

                        {/* Title & Team */}
                        <td className="py-4 px-6">
                          <p className="font-bold text-white hover:text-[#ff5500] transition cursor-pointer">
                            {entry.title}
                          </p>
                          <p className="text-xs text-neutral-400 font-mono mt-0.5">
                            Team: <span className="text-neutral-300 font-semibold">{entry.team?.name}</span>
                          </p>
                        </td>

                        {/* Track */}
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-md text-[10px] font-mono bg-[#161a24] text-neutral-300 border border-[#22293a]">
                            {entry.track?.name || 'General'}
                          </span>
                        </td>

                        {/* Score Metric */}
                        <td className="py-4 px-6 text-right font-mono font-bold text-base">
                          {leaderboardMode === 'normalized' ? (
                            <span
                              className={
                                entry.scores.normalizedZScore >= 0
                                  ? 'text-emerald-400'
                                  : 'text-amber-400'
                              }
                            >
                              {entry.scores.normalizedZScore > 0 ? '+' : ''}
                              {entry.scores.normalizedZScore.toFixed(2)}
                            </span>
                          ) : leaderboardMode === 'raw' ? (
                            <span className="text-white">{entry.scores.rawScoreMean.toFixed(2)}</span>
                          ) : (
                            <span className="text-[#ff5500]">{entry.scores.communityVotesCount} votes</span>
                          )}
                        </td>

                        {/* Evaluations Count */}
                        <td className="py-4 px-6 text-right font-mono text-xs text-neutral-400">
                          {entry.scores.evaluationsCount || 3}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB: ANNOUNCEMENTS & ORGANIZER BROADCASTS */}
        {/* ============================================================ */}
        {activeTab === 'announcements' && (
          <div className="space-y-8">
            <div className="bg-[#10131c] border border-[#1e2330] p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-white flex items-center space-x-2">
                  <Megaphone className="w-6 h-6 text-[#ff5500]" />
                  <span>EVENT ANNOUNCEMENTS</span>
                </h2>
                <p className="text-xs text-neutral-400 font-mono mt-1">
                  Official updates and broadcasts from tournament organizers
                </p>
              </div>
            </div>

            {/* Organizer Announcement Composer */}
            {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
              <div className="bg-[#121622] border border-[#ff5500]/30 p-6 rounded-2xl space-y-4 shadow-xl">
                <h3 className="text-sm font-mono font-bold text-[#ff5500] flex items-center space-x-2">
                  <Megaphone className="w-4 h-4" />
                  <span>BROADCAST NEW ANNOUNCEMENT (ORGANIZER)</span>
                </h3>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Announcement headline..."
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-[#090a0f] border border-[#1e2330] rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
                  />
                  <textarea
                    rows={3}
                    placeholder="Full announcement details..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    className="w-full bg-[#090a0f] border border-[#1e2330] rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-xs font-mono text-neutral-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcementPinned}
                        onChange={(e) => setAnnouncementPinned(e.target.checked)}
                        className="accent-[#ff5500]"
                      />
                      <span>Pin to Top of Feed</span>
                    </label>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff661a] text-black font-mono font-bold text-xs transition flex items-center space-x-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>BROADCAST</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Announcements Feed */}
            {loading ? (
              <div className="text-center py-20 text-neutral-400 font-mono">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#ff5500] mb-3" />
                Loading announcements...
              </div>
            ) : announcements.length === 0 ? (
              <div className="text-center py-20 bg-[#10131c] border border-[#1e2330] rounded-2xl">
                <p className="text-neutral-400 font-mono">No announcements posted yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {announcements.map((a) => (
                  <div
                    key={a.id}
                    className={`bg-[#10131c] border p-6 rounded-2xl space-y-3 transition ${
                      a.isPinned ? 'border-amber-400/50 bg-[#141724]' : 'border-[#1e2330]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        {a.isPinned && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-400/10 text-amber-400 border border-amber-400/30 flex items-center space-x-1">
                            <Pin className="w-3 h-3" />
                            <span>PINNED</span>
                          </span>
                        )}
                        <h3 className="text-lg font-bold text-white">{a.title}</h3>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {new Date(a.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{a.content}</p>
                    <div className="pt-2 border-t border-[#181c27] flex items-center justify-between text-xs text-neutral-500 font-mono">
                      <span>Posted by {a.author?.name || 'Organizer'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 4: JUDGING EVALUATION QUEUE & RUBRIC SCORING */}
        {/* ============================================================ */}
        {activeTab === 'judging' && (
          <div className="space-y-8">
            {!currentUser ? (
              <div className="bg-[#10131c] border border-[#1e2330] rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
                <Lock className="w-10 h-10 text-[#ff5500] mx-auto" />
                <h3 className="text-xl font-bold text-white">JUDGE AUTHENTICATION REQUIRED</h3>
                <p className="text-xs text-neutral-400 leading-relaxed font-mono">
                  Sign in with an official Judge or Organizer account to view your evaluation queue and score submissions.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2.5 rounded-xl bg-[#ff5500] text-black font-mono text-xs font-bold hover:bg-[#ff661a] transition"
                >
                  OPEN SIGN IN
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Queue List */}
                <div className="bg-[#10131c] border border-[#1e2330] p-6 rounded-2xl space-y-4">
                  <h3 className="text-lg font-bold text-white flex items-center justify-between">
                    <span>MY EVALUATION QUEUE</span>
                    <span className="text-xs font-mono text-[#ff5500]">{judgeAssignments.length} Assigned</span>
                  </h3>

                  <div className="space-y-3">
                    {judgeAssignments.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAssignment(a)}
                        className={`p-4 rounded-xl border cursor-pointer transition ${
                          selectedAssignment?.id === a.id
                            ? 'bg-[#1a1f2e] border-[#ff5500]'
                            : 'bg-[#0b0d13] border-[#1a1f2c] hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-sm text-white">{a.submission?.title}</p>
                          <span
                            className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                              a.status === 'COMPLETED'
                                ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
                                : 'bg-amber-400/10 text-amber-400 border border-amber-400/20'
                            }`}
                          >
                            {a.status}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 font-mono">
                          Team: {a.submission?.team?.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Rubric Scoring Form */}
                <div className="lg:col-span-2 bg-[#10131c] border border-[#1e2330] p-8 rounded-2xl space-y-6">
                  {selectedAssignment ? (
                    <form onSubmit={handleScoreSubmit} className="space-y-6">
                      <div className="border-b border-[#1e2330] pb-4">
                        <span className="text-[10px] font-mono text-[#ff5500] font-bold">
                          EVALUATING SUBMISSION
                        </span>
                        <h2 className="text-2xl font-black text-white">{selectedAssignment.submission?.title}</h2>
                        <p className="text-xs text-neutral-400 mt-1">{selectedAssignment.submission?.tagline}</p>
                      </div>

                      {/* Rubric Criteria Sliders */}
                      <div className="space-y-6">
                        {(selectedAssignment.event?.rubricCriteria || [
                          { id: 'c1', name: 'Technical Depth (40%)', minScore: 1, maxScore: 10 },
                          { id: 'c2', name: 'Innovation & Novelty (30%)', minScore: 1, maxScore: 10 },
                          { id: 'c3', name: 'UI / UX Design Polish (30%)', minScore: 1, maxScore: 10 }
                        ]).map((crit) => (
                          <div key={crit.id} className="bg-[#0b0d13] p-5 rounded-xl border border-[#1a1f2c] space-y-3">
                            <div className="flex justify-between items-center">
                              <label className="font-bold text-sm text-white">{crit.name}</label>
                              <span className="font-mono text-sm font-black text-[#ff5500]">
                                {scoresInput[crit.id] || 8.0} / {crit.maxScore || 10}
                              </span>
                            </div>

                            <input
                              type="range"
                              min={crit.minScore || 1}
                              max={crit.maxScore || 10}
                              step="0.5"
                              value={scoresInput[crit.id] || 8.0}
                              onChange={(e) => setScoresInput({ ...scoresInput, [crit.id]: e.target.value })}
                              className="w-full accent-[#ff5500] cursor-pointer"
                            />

                            <input
                              type="text"
                              placeholder="Qualitative feedback comments..."
                              value={feedbackInput[crit.id] || ''}
                              onChange={(e) => setFeedbackInput({ ...feedbackInput, [crit.id]: e.target.value })}
                              className="w-full bg-[#12151e] border border-[#1e2330] rounded-lg px-3 py-2 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
                            />
                          </div>
                        ))}
                      </div>

                      {scoreSuccess && (
                        <div className="p-3 rounded-lg bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 text-xs font-mono flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{scoreSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-[#ff661a] text-black font-mono font-bold text-sm transition shadow-lg shadow-[#ff5500]/20"
                      >
                        SUBMIT FINAL RUBRIC SCORES
                      </button>
                    </form>
                  ) : (
                    <p className="text-neutral-400 font-mono text-center py-20">Select an assigned project from the queue.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Project Threaded Discussion Modal */}
      {discussionProject && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10131c] border border-[#1e2330] rounded-3xl p-6 md:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center border-b border-[#1e2330] pb-4">
              <div>
                <span className="text-[10px] font-mono text-[#ff5500] font-bold">PROJECT DISCUSSION</span>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5 text-[#ff5500]" />
                  <span>{discussionProject.title}</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setDiscussionProject(null);
                  setReplyParentId(null);
                  setReplyParentAuthor('');
                }}
                className="text-neutral-400 hover:text-white text-lg font-bold p-1.5"
              >
                ✕
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {commentsList.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 font-mono text-xs">
                  No comments yet. Be the first to start the discussion!
                </div>
              ) : (
                commentsList.map(comment => renderCommentNode(comment))
              )}
            </div>

            {/* Comment Composer */}
            <div className="border-t border-[#1e2330] pt-4 space-y-2">
              {replyParentId && (
                <div className="flex items-center justify-between text-xs font-mono bg-[#161a26] px-3 py-1.5 rounded-lg border border-[#22283a]">
                  <span className="text-neutral-400">
                    Replying to <strong className="text-white">{replyParentAuthor}</strong>
                  </span>
                  <button
                    onClick={() => {
                      setReplyParentId(null);
                      setReplyParentAuthor('');
                    }}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <form onSubmit={handlePostComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder={currentUser ? (replyParentId ? "Write a reply..." : "Ask a question or share feedback...") : "Sign in to join the discussion"}
                  disabled={!currentUser}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-[#090a0f] border border-[#1e2330] rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-[#ff5500] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentUser || !commentInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#ff5500] hover:bg-[#ff661a] disabled:opacity-50 text-black font-mono font-bold text-xs transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>POST</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10131c] border border-[#1e2330] rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center border-b border-[#1e2330] pb-4">
              <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                <LogIn className="w-5 h-5 text-[#ff5500]" />
                <span>SIGN IN TO DOGFOOD</span>
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-neutral-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Login Test Accounts */}
            <div className="space-y-2">
              <p className="text-[11px] font-mono text-neutral-400">ONE-CLICK DEMO ACCOUNTS:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('organizer@dogfood.test')}
                  className="p-2.5 rounded-xl bg-[#161a26] border border-[#22283a] hover:border-[#ff5500] text-left text-xs font-mono transition"
                >
                  <p className="font-bold text-white">Organizer</p>
                  <p className="text-[10px] text-[#ff5500]">Full Control</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('judge.dan@dogfood.test')}
                  className="p-2.5 rounded-xl bg-[#161a26] border border-[#22283a] hover:border-[#ff5500] text-left text-xs font-mono transition"
                >
                  <p className="font-bold text-white">Judge Dan</p>
                  <p className="text-[10px] text-amber-400">Scoring Queue</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@dogfood.test')}
                  className="p-2.5 rounded-xl bg-[#161a26] border border-[#22283a] hover:border-[#ff5500] text-left text-xs font-mono transition"
                >
                  <p className="font-bold text-white">Alice (Leader)</p>
                  <p className="text-[10px] text-emerald-400">HyperScale</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('evan@dogfood.test')}
                  className="p-2.5 rounded-xl bg-[#161a26] border border-[#22283a] hover:border-[#ff5500] text-left text-xs font-mono transition"
                >
                  <p className="font-bold text-white">Evan (Leader)</p>
                  <p className="text-[10px] text-emerald-400">ZeroLag</p>
                </button>
              </div>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-[#1e2330]"></div>
              <span className="flex-shrink mx-4 text-[10px] font-mono text-neutral-500">OR EMAIL & PASSWORD</span>
              <div className="flex-grow border-t border-[#1e2330]"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#090a0f] border border-[#1e2330] rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-neutral-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#090a0f] border border-[#1e2330] rounded-xl px-4 py-2.5 text-xs font-mono text-white outline-none focus:border-[#ff5500]"
                />
              </div>

              {authError && (
                <p className="text-xs text-rose-400 font-mono">{authError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#ff5500] hover:bg-[#ff661a] text-black font-mono font-bold text-sm transition"
              >
                SIGN IN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#1e2330] py-6 px-8 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-neutral-500 bg-[#07080c] gap-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-[#ff5500]"></div>
          <span>DOGFOOD 2026 PLATFORM • TIER 1 & TIER 2 ACTIVE</span>
        </div>
        <span>100% OFFLINE-FIRST • ZERO EXTERNAL RUNTIME CALLS</span>
      </footer>
    </div>
  );
}
