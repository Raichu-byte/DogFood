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
  Megaphone,
  MessageSquare,
  Pin,
  Trash2,
  CornerDownRight,
  UserCheck,
  UserPlus
} from 'lucide-react';
import KineticHero from './components/KineticHero';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'gallery', 'leaderboard', 'announcements', 'hackers', 'judging'
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

  // Matchmaking & Hacker Directory state (Phase 18)
  const [hackers, setHackers] = useState([]);
  const [recruitingTeams, setRecruitingTeams] = useState([]);
  const [hackerSkillFilter, setHackerSkillFilter] = useState('');
  const [applyMessage, setApplyMessage] = useState('');
  const [selectedTeamForApply, setSelectedTeamForApply] = useState(null);

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
    if (activeTab === 'hackers') {
      fetchHackers();
      fetchRecruitingTeams();
    }
    if (activeTab === 'judging') fetchJudgingQueue();
    if (activeTab === 'overview') fetchWinners();
  }, [activeTab, leaderboardMode, selectedTrack, searchQuery, hackerSkillFilter, token]);

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

  const fetchHackers = () => {
    setLoading(true);
    let url = '/api/matchmaking/hackers?lookingForTeam=true';
    if (hackerSkillFilter) url += `&skill=${encodeURIComponent(hackerSkillFilter)}`;

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setHackers(data.hackers || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const fetchRecruitingTeams = () => {
    fetch('/api/matchmaking/teams?isLookingForMembers=true')
      .then(res => res.json())
      .then(data => {
        setRecruitingTeams(data.teams || []);
      })
      .catch(err => console.error(err));
  };

  const handleApplyToTeam = (e) => {
    if (e) e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!selectedTeamForApply) return;

    fetch(`/api/matchmaking/teams/${selectedTeamForApply.id}/apply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        message: applyMessage || 'Excited to build with your team!',
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.request) {
          showToast('Application sent to team leader!');
          setSelectedTeamForApply(null);
          setApplyMessage('');
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      })
      .catch(() => showToast('Network error applying to team.'));
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
      <div key={node.id} className={`space-y-2 ${depth > 0 ? 'ml-4 pl-3 border-l border-[#242326]' : ''}`}>
        <div className={`p-4 border ${node.isPinned ? 'border-[#a98be8]/40 bg-[#121118]' : 'border-[#242326] bg-[#0c0c0e]'} space-y-2`}>
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {node.isPinned && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#a98be8]/10 text-[#a98be8] border border-[#a98be8]/30 flex items-center space-x-1">
                  <Pin className="w-2.5 h-2.5" />
                  <span>PINNED</span>
                </span>
              )}
              <span className={`font-mono text-xs font-semibold ${node.isDeleted ? 'text-neutral-500 italic' : 'text-[#f1f0ed]'}`}>
                {node.author?.name || 'Anonymous'}
              </span>
              {node.author?.role && (
                <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#16151a] text-[#a98be8] border border-[#242326]">
                  {node.author.role}
                </span>
              )}
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              {new Date(node.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p className={`text-xs leading-relaxed ${node.isDeleted ? 'text-neutral-500 italic font-mono' : 'text-[#c8c6c3]'}`}>
            {node.content}
          </p>

          {!node.isDeleted && (
            <div className="pt-2 border-t border-[#1a191d] flex items-center justify-between text-[11px] font-mono text-neutral-400">
              <button
                onClick={() => {
                  setReplyParentId(node.id);
                  setReplyParentAuthor(node.author?.name || 'User');
                }}
                className="hover:text-[#a98be8] flex items-center space-x-1"
              >
                <CornerDownRight className="w-3 h-3" />
                <span>Reply</span>
              </button>

              <div className="flex items-center space-x-3">
                {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
                  <button
                    onClick={() => handlePinComment(node.id)}
                    className="hover:text-[#a98be8] flex items-center space-x-1"
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
          showToast('🗳️ Ballot recorded in community tally!');
          if (activeTab === 'gallery') fetchGallery();
          if (activeTab === 'leaderboard') fetchLeaderboard();
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

  const navigation = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'gallery', label: 'GALLERY' },
    { id: 'leaderboard', label: 'LEADERBOARD' },
    { id: 'announcements', label: 'ANNOUNCEMENTS' },
    { id: 'hackers', label: 'HACKER DIRECTORY' },
    { id: 'judging', label: 'JUDGING' },
  ];

  return (
    <div className="min-h-screen bg-[#090909] text-[#f1f0ed] flex flex-col font-mono selection:bg-[#a98be8]/30 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0d0d0d] border border-[#a98be8]/50 text-[#f1f0ed] px-5 py-3 shadow-2xl flex items-center space-x-3 font-mono text-xs">
          <span className="w-2 h-2 rounded-full bg-[#9eea9a] animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Thin Editorial Navigation Header (DESIGN.md section 5) */}
      <header className="sticky top-0 z-40 bg-[#090909]/95 backdrop-blur-sm border-b border-[#242326] px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Left: Brand Wordmark */}
          <div
            className="cursor-pointer flex items-center space-x-3 group"
            onClick={() => setActiveTab('overview')}
          >
            <span className="w-2 h-2 rounded-none bg-[#9eea9a]"></span>
            <span className="font-mono text-xs tracking-widest font-bold text-[#f1f0ed] group-hover:text-[#a98be8] transition">
              DOGFOOD 2026 // NEXERA
            </span>
          </div>

          {/* Center: Thin Monospace Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-6 text-[11px] font-mono tracking-wider">
            {navigation.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`transition-colors uppercase pb-1 border-b ${
                  activeTab === tab.id
                    ? 'text-[#f1f0ed] border-[#a98be8] font-bold'
                    : 'text-[#c8c6c3] border-transparent hover:text-[#f1f0ed] hover:border-[#3a393b]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right: Status Pill & Lavender CTA / User Action */}
          <div className="flex items-center space-x-4">
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-[#c8c6c3] border border-[#242326]">
              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${health?.status === 'ok' ? 'bg-[#9eea9a]' : 'bg-rose-400'}`}></span>
              {health?.status === 'ok' ? 'SYSTEM: ONLINE' : 'SYSTEM: OFFLINE'}
            </span>

            {currentUser ? (
              <div className="flex items-center space-x-3 border border-[#242326] px-3 py-1.5 bg-[#0d0d0d]">
                <div className="text-right">
                  <p className="text-[11px] font-bold text-[#f1f0ed] leading-none">{currentUser.name}</p>
                  <p className="text-[9px] text-[#a98be8] font-semibold mt-0.5 uppercase tracking-wider">{currentUser.role}</p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="text-neutral-500 hover:text-[#f1f0ed] transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-mono text-[11px] font-bold tracking-wider transition uppercase"
              >
                SIGN IN ↗
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-12">
        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & KINETIC GEOMETRIC ARTWORK */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* Kinetic Geometric Hero System (DESIGN.md) */}
            <KineticHero
              onExploreClick={() => setActiveTab('gallery')}
              onLeaderboardClick={() => setActiveTab('leaderboard')}
            />

            {/* Architecture Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="bg-[#0c0c0e] border border-[#242326] p-6 space-y-1">
                <p className="text-[10px] font-mono text-[#c8c6c3] tracking-widest uppercase">PRIZE POOL</p>
                <p className="editorial-headline text-2xl md:text-3xl text-[#f1f0ed]">$20,000</p>
                <p className="text-[10px] text-neutral-500">Verified USDC & Grants</p>
              </div>
              <div className="bg-[#0c0c0e] border border-[#242326] p-6 space-y-1">
                <p className="text-[10px] font-mono text-[#c8c6c3] tracking-widest uppercase">SUBMISSIONS</p>
                <p className="editorial-headline text-2xl md:text-3xl text-[#a98be8]">
                  {eventData?._count?.submissions || 4} SHIPPED
                </p>
                <p className="text-[10px] text-neutral-500">Freezed with SHA-256 lock</p>
              </div>
              <div className="bg-[#0c0c0e] border border-[#242326] p-6 space-y-1">
                <p className="text-[10px] font-mono text-[#c8c6c3] tracking-widest uppercase">TEAMS</p>
                <p className="editorial-headline text-2xl md:text-3xl text-[#f1f0ed]">
                  {eventData?._count?.teams || 4} TEAMS
                </p>
                <p className="text-[10px] text-neutral-500">Active hacker rosters</p>
              </div>
              <div className="bg-[#0c0c0e] border border-[#242326] p-6 space-y-1">
                <p className="text-[10px] font-mono text-[#c8c6c3] tracking-widest uppercase">CALIBRATION</p>
                <p className="editorial-headline text-2xl md:text-3xl text-[#9eea9a]">Z-SCORE</p>
                <p className="text-[10px] text-neutral-500">Bias variance mitigated</p>
              </div>
            </div>

            {/* Championship Prizes */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-[#242326] pb-3">
                <h2 className="text-lg font-bold text-[#f1f0ed] tracking-wider uppercase flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#a98be8]" />
                  <span>CHAMPIONSHIP PRIZES</span>
                </h2>
                <span className="text-[11px] font-mono text-neutral-500">VERIFIED ESCROW REWARDS</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {(eventData?.prizes || [
                  { id: 'p1', title: 'Grand Championship', amount: '$15,000', description: 'Highest overall calibrated score across all rubric dimensions.' },
                  { id: 'p2', title: 'Best AI Architecture', amount: '$5,000', description: 'Outstanding edge intelligence and local inference engine.' },
                  { id: 'p3', title: 'Resilience & Offline Protocol', amount: '$2,500', description: 'Top peer-to-peer decentralized synchronization system.' },
                ]).map((prize, idx) => (
                  <div
                    key={prize.id || idx}
                    className="bg-[#0c0c0e] border border-[#242326] hover:border-[#3a393b] p-6 space-y-3 transition group"
                  >
                    <div className="text-[10px] font-mono text-[#a98be8] tracking-widest uppercase">
                      PRIZE CATEGORY 0{idx + 1}
                    </div>
                    <div className="editorial-headline text-3xl text-[#f1f0ed] font-normal">
                      {prize.amount}
                    </div>
                    <h3 className="text-sm font-bold text-[#f1f0ed]">{prize.title}</h3>
                    <p className="text-xs text-[#c8c6c3] leading-relaxed">{prize.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 2: PROJECT SHOWCASE GALLERY & VOTING */}
        {/* ============================================================ */}
        {activeTab === 'gallery' && (
          <div className="space-y-8">
            <div className="border-b border-[#242326] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-wider text-[#f1f0ed] uppercase flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-[#a98be8]" />
                  <span>PROJECT SHOWCASE GALLERY</span>
                </h2>
                <p className="text-xs text-[#c8c6c3] mt-1">
                  Explore verified submissions, inspect repositories, join discussions, and cast community votes.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center bg-[#0d0d0d] border border-[#242326] px-3 py-2 text-xs">
                  <Search className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                  <input
                    type="text"
                    placeholder="Search by title, tag..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-transparent text-xs text-[#f1f0ed] outline-none placeholder-neutral-600 w-40"
                  />
                </div>

                <select
                  value={selectedTrack}
                  onChange={(e) => setSelectedTrack(e.target.value)}
                  className="bg-[#0d0d0d] border border-[#242326] text-xs text-[#c8c6c3] px-3 py-2 outline-none"
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
              <div className="text-center py-20 text-neutral-500 font-mono text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#a98be8] mb-3" />
                LOADING PROJECT SUBMISSIONS...
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-20 border border-[#242326] bg-[#0c0c0e]">
                <p className="text-neutral-500 text-xs">No matching projects found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gallery.map((project) => (
                  <div
                    key={project.id}
                    className="bg-[#0c0c0e] border border-[#242326] hover:border-[#3a393b] p-6 flex flex-col justify-between space-y-4 transition"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[9px] font-mono text-[#a98be8] border border-[#a98be8]/30 bg-[#a98be8]/10 uppercase tracking-wider">
                          {project.track?.name || 'GENERAL TRACK'}
                        </span>
                        <div className="flex items-center space-x-2">
                          {project.repoUrl && (
                            <a
                              href={project.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 border border-[#242326] hover:border-[#a98be8] text-neutral-400 hover:text-white transition"
                              title="GitHub Source"
                            >
                              <Github className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {project.demoUrl && (
                            <a
                              href={project.demoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 border border-[#242326] hover:border-[#a98be8] text-neutral-400 hover:text-white transition"
                              title="Live Demo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-[#f1f0ed]">{project.title}</h3>
                        <p className="text-xs text-[#c8c6c3] mt-1 leading-relaxed">{project.tagline}</p>
                      </div>

                      {/* Tech stack pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(project.techStack || []).map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-[9px] font-mono text-neutral-400 border border-[#1f1e21] bg-[#090909]"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-[#1a191d] flex items-center justify-between text-xs text-neutral-500">
                        <span className="font-semibold text-neutral-400">Team: {project.team?.name}</span>
                        <span>{project.team?.members?.length || 1} Member(s)</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-[#1a191d] grid grid-cols-2 gap-3">
                      <button
                        onClick={() => openProjectComments(project)}
                        className="py-2.5 bg-[#121118] hover:bg-[#1c1a26] text-[#c8c6c3] hover:text-[#f1f0ed] border border-[#242326] text-xs font-mono tracking-wider transition uppercase flex items-center justify-center space-x-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#a98be8]" />
                        <span>DISCUSS</span>
                      </button>
                      <button
                        onClick={() => handleCommunityVote(project.id)}
                        className="py-2.5 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-mono text-xs font-bold tracking-wider transition uppercase flex items-center justify-center space-x-1.5"
                      >
                        <Vote className="w-3.5 h-3.5" />
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
        {/* TAB 3: LEADERBOARD & STATISTICAL NORMALIZATION */}
        {/* ============================================================ */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-8">
            <div className="border-b border-[#242326] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-wider text-[#f1f0ed] uppercase flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-[#a98be8]" />
                  <span>TOURNAMENT STANDINGS</span>
                </h2>
                <p className="text-xs text-[#c8c6c3] mt-1">
                  Dynamic rankings calibrated across statistical Z-Score, raw arithmetic means, and popular ballots.
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center space-x-1 border border-[#242326] p-1 bg-[#0c0c0e]">
                <button
                  onClick={() => setLeaderboardMode('normalized')}
                  className={`px-3 py-1.5 text-xs font-mono tracking-wider transition uppercase ${
                    leaderboardMode === 'normalized'
                      ? 'bg-[#bca1ee] text-[#161218] font-bold'
                      : 'text-[#c8c6c3] hover:text-[#f1f0ed]'
                  }`}
                >
                  ⚡ Z-SCORE
                </button>
                <button
                  onClick={() => setLeaderboardMode('raw')}
                  className={`px-3 py-1.5 text-xs font-mono tracking-wider transition uppercase ${
                    leaderboardMode === 'raw'
                      ? 'bg-[#bca1ee] text-[#161218] font-bold'
                      : 'text-[#c8c6c3] hover:text-[#f1f0ed]'
                  }`}
                >
                  📊 RAW AVERAGE
                </button>
                <button
                  onClick={() => setLeaderboardMode('community')}
                  className={`px-3 py-1.5 text-xs font-mono tracking-wider transition uppercase ${
                    leaderboardMode === 'community'
                      ? 'bg-[#bca1ee] text-[#161218] font-bold'
                      : 'text-[#c8c6c3] hover:text-[#f1f0ed]'
                  }`}
                >
                  🗳️ COMMUNITY
                </button>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="border border-[#242326] bg-[#0c0c0e] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#242326] bg-[#090909] text-[10px] font-mono text-[#c8c6c3] uppercase tracking-wider">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6">Project / Team</th>
                      <th className="py-4 px-6">Track</th>
                      <th className="py-4 px-6 text-right">
                        {leaderboardMode === 'normalized' ? 'Calibrated Z-Score' : leaderboardMode === 'raw' ? 'Raw Score Mean' : 'Community Ballots'}
                      </th>
                      <th className="py-4 px-6 text-right">Evals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a191d]">
                    {leaderboard.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#121118] transition">
                        <td className="py-4 px-6 font-mono text-sm font-bold">
                          <span className={`px-2 py-0.5 text-xs ${
                            entry.rank === 1
                              ? 'bg-[#a98be8]/20 text-[#a98be8] border border-[#a98be8]/40'
                              : 'text-neutral-400'
                          }`}>
                            #{entry.rank}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-sm text-[#f1f0ed]">{entry.title}</p>
                          <p className="text-[11px] text-neutral-500 font-mono">Team: {entry.team?.name}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] text-neutral-400 border border-[#242326] px-2 py-0.5">
                            {entry.track?.name || 'GENERAL'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-sm font-bold">
                          {leaderboardMode === 'normalized' ? (
                            <span className="text-[#a98be8]">
                              {entry.scores.normalizedZScore > 0 ? '+' : ''}
                              {entry.scores.normalizedZScore.toFixed(2)}
                            </span>
                          ) : leaderboardMode === 'raw' ? (
                            <span className="text-[#f1f0ed]">{entry.scores.rawScoreMean.toFixed(2)}</span>
                          ) : (
                            <span className="text-[#9eea9a]">{entry.scores.communityVotesCount} votes</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-neutral-500">
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
        {/* TAB 4: EVENT ANNOUNCEMENTS */}
        {/* ============================================================ */}
        {activeTab === 'announcements' && (
          <div className="space-y-8">
            <div className="border-b border-[#242326] pb-6">
              <h2 className="text-xl font-bold tracking-wider text-[#f1f0ed] uppercase flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-[#a98be8]" />
                <span>OFFICIAL EVENT ANNOUNCEMENTS</span>
              </h2>
              <p className="text-xs text-[#c8c6c3] mt-1">
                Broadcasts and updates directly from tournament organizers.
              </p>
            </div>

            {/* Organizer composer */}
            {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
              <div className="border border-[#a98be8]/40 bg-[#0d0c12] p-6 space-y-4">
                <p className="text-xs font-mono font-bold text-[#a98be8] uppercase tracking-wider">
                  BROADCAST NEW ANNOUNCEMENT
                </p>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Announcement title..."
                    value={announcementTitle}
                    onChange={(e) => setAnnouncementTitle(e.target.value)}
                    className="w-full bg-[#090909] border border-[#242326] px-4 py-2.5 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8]"
                  />
                  <textarea
                    rows={3}
                    placeholder="Announcement message content..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    className="w-full bg-[#090909] border border-[#242326] px-4 py-2.5 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8]"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-xs text-[#c8c6c3] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={announcementPinned}
                        onChange={(e) => setAnnouncementPinned(e.target.checked)}
                        className="accent-[#a98be8]"
                      />
                      <span>Pin Announcement to Top</span>
                    </label>
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-bold text-xs tracking-wider uppercase flex items-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>BROADCAST</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Feed */}
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`p-6 border ${a.isPinned ? 'border-[#a98be8]/50 bg-[#100f16]' : 'border-[#242326] bg-[#0c0c0e]'} space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {a.isPinned && (
                      <span className="px-2 py-0.5 text-[9px] font-mono font-bold bg-[#a98be8]/10 text-[#a98be8] border border-[#a98be8]/30 uppercase">
                        PINNED
                      </span>
                    )}
                    <h3 className="text-base font-bold text-[#f1f0ed]">{a.title}</h3>
                  </div>
                  <span className="text-[10px] text-neutral-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-[#c8c6c3] leading-relaxed whitespace-pre-wrap">{a.content}</p>
                <div className="pt-2 border-t border-[#1a191d] text-[10px] text-neutral-500">
                  Posted by {a.author?.name || 'Organizer'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: HACKER DIRECTORY & MATCHMAKING (Phase 18) */}
        {/* ============================================================ */}
        {activeTab === 'hackers' && (
          <div className="space-y-8">
            <div className="border-b border-[#242326] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-wider text-[#f1f0ed] uppercase flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#a98be8]" />
                  <span>HACKER DIRECTORY & MATCHMAKING</span>
                </h2>
                <p className="text-xs text-[#c8c6c3] mt-1">
                  Discover builders looking for teams and connect with recruiting squads.
                </p>
              </div>

              <div className="flex items-center bg-[#0d0d0d] border border-[#242326] px-3 py-2 text-xs">
                <Search className="w-3.5 h-3.5 text-neutral-500 mr-2" />
                <input
                  type="text"
                  placeholder="Filter by skill (e.g. Rust, React)..."
                  value={hackerSkillFilter}
                  onChange={(e) => setHackerSkillFilter(e.target.value)}
                  className="bg-transparent text-xs text-[#f1f0ed] outline-none placeholder-neutral-600 w-48"
                />
              </div>
            </div>

            {/* Two Column Layout: Hackers on Left, Recruiting Teams on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Hackers looking for squad */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#f1f0ed] tracking-wider uppercase flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-[#9eea9a]" />
                  <span>AVAILABLE BUILDERS ({hackers.length})</span>
                </h3>

                <div className="space-y-4">
                  {hackers.map((hacker) => (
                    <div key={hacker.id} className="p-5 border border-[#242326] bg-[#0c0c0e] space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-[#f1f0ed]">{hacker.name}</p>
                          {hacker.githubUsername && (
                            <p className="text-[10px] text-neutral-500">@{hacker.githubUsername}</p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 text-[9px] font-mono text-[#9eea9a] border border-[#9eea9a]/30 bg-[#9eea9a]/10 uppercase">
                          LOOKING FOR TEAM
                        </span>
                      </div>

                      {hacker.bio && <p className="text-xs text-[#c8c6c3] leading-relaxed">{hacker.bio}</p>}

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(hacker.skills || []).map((skill, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[9px] text-[#a98be8] border border-[#242326] bg-[#121118]">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Recruiting Teams */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#f1f0ed] tracking-wider uppercase flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-[#a98be8]" />
                  <span>RECRUITING SQUADS ({recruitingTeams.length})</span>
                </h3>

                <div className="space-y-4">
                  {recruitingTeams.map((team) => (
                    <div key={team.id} className="p-5 border border-[#242326] bg-[#0c0c0e] space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-[#f1f0ed]">{team.name}</p>
                          <p className="text-[10px] text-neutral-500">{team.membersCount} / {team.maxMembers} Members</p>
                        </div>
                        <button
                          onClick={() => setSelectedTeamForApply(team)}
                          className="px-3 py-1 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] text-[10px] font-bold tracking-wider uppercase"
                        >
                          APPLY TO JOIN
                        </button>
                      </div>

                      {team.description && <p className="text-xs text-[#c8c6c3] leading-relaxed">{team.description}</p>}

                      {/* Skills needed */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(team.skillsNeeded || []).map((skill, idx) => (
                          <span key={idx} className="px-2 py-0.5 text-[9px] text-neutral-400 border border-[#242326] bg-[#090909]">
                            Needed: {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 6: JUDGING EVALUATION QUEUE */}
        {/* ============================================================ */}
        {activeTab === 'judging' && (
          <div className="space-y-8">
            {!currentUser ? (
              <div className="border border-[#242326] bg-[#0c0c0e] p-12 text-center max-w-lg mx-auto space-y-4">
                <Lock className="w-8 h-8 text-[#a98be8] mx-auto" />
                <h3 className="text-base font-bold text-[#f1f0ed] uppercase tracking-wider">JUDGE AUTHENTICATION REQUIRED</h3>
                <p className="text-xs text-[#c8c6c3] leading-relaxed">
                  Sign in with an official Judge or Organizer account to view your evaluation queue and score submissions.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2.5 bg-[#bca1ee] text-[#161218] text-xs font-bold uppercase tracking-wider"
                >
                  SIGN IN ↗
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Queue List */}
                <div className="border border-[#242326] bg-[#0c0c0e] p-6 space-y-4">
                  <h3 className="text-xs font-bold text-[#f1f0ed] tracking-wider uppercase flex justify-between items-center">
                    <span>EVALUATION QUEUE</span>
                    <span className="text-[#a98be8]">{judgeAssignments.length} Assigned</span>
                  </h3>

                  <div className="space-y-2">
                    {judgeAssignments.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAssignment(a)}
                        className={`p-4 border cursor-pointer transition ${
                          selectedAssignment?.id === a.id
                            ? 'bg-[#15141c] border-[#a98be8]'
                            : 'bg-[#090909] border-[#242326] hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-[#f1f0ed]">{a.submission?.title}</p>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 border ${
                            a.status === 'COMPLETED'
                              ? 'border-[#9eea9a]/30 text-[#9eea9a] bg-[#9eea9a]/10'
                              : 'border-amber-400/30 text-amber-400 bg-amber-400/10'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-1">Team: {a.submission?.team?.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Rubric Scoring Form */}
                <div className="lg:col-span-2 border border-[#242326] bg-[#0c0c0e] p-8 space-y-6">
                  {selectedAssignment ? (
                    <form onSubmit={handleScoreSubmit} className="space-y-6">
                      <div className="border-b border-[#242326] pb-4">
                        <span className="text-[10px] text-[#a98be8] font-bold tracking-widest uppercase">
                          EVALUATING SUBMISSION
                        </span>
                        <h2 className="text-xl font-bold text-[#f1f0ed] mt-1">{selectedAssignment.submission?.title}</h2>
                        <p className="text-xs text-[#c8c6c3] mt-1">{selectedAssignment.submission?.tagline}</p>
                      </div>

                      {/* Rubric Criteria Sliders */}
                      <div className="space-y-6">
                        {(selectedAssignment.event?.rubricCriteria || [
                          { id: 'c1', name: 'Technical Depth (35%)', minScore: 1, maxScore: 10 },
                          { id: 'c2', name: 'Innovation & Novelty (25%)', minScore: 1, maxScore: 10 },
                          { id: 'c3', name: 'Offline Resilience (20%)', minScore: 1, maxScore: 10 },
                          { id: 'c4', name: 'UI / UX Design Polish (20%)', minScore: 1, maxScore: 10 },
                        ]).map((crit) => (
                          <div key={crit.id} className="bg-[#090909] p-5 border border-[#242326] space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <label className="font-bold text-[#f1f0ed]">{crit.name}</label>
                              <span className="text-[#a98be8] font-bold">
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
                              className="w-full accent-[#a98be8] cursor-pointer"
                            />

                            <input
                              type="text"
                              placeholder="Qualitative feedback comments..."
                              value={feedbackInput[crit.id] || ''}
                              onChange={(e) => setFeedbackInput({ ...feedbackInput, [crit.id]: e.target.value })}
                              className="w-full bg-[#0c0c0e] border border-[#242326] px-3 py-2 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8]"
                            />
                          </div>
                        ))}
                      </div>

                      {scoreSuccess && (
                        <div className="p-3 border border-[#9eea9a]/30 bg-[#9eea9a]/10 text-[#9eea9a] text-xs flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{scoreSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full py-3 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-bold text-xs tracking-wider uppercase transition"
                      >
                        SUBMIT FINAL RUBRIC SCORES
                      </button>
                    </form>
                  ) : (
                    <p className="text-neutral-500 text-xs text-center py-20">Select an assigned project from the queue.</p>
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
          <div className="bg-[#0c0c0e] border border-[#242326] p-6 md:p-8 max-w-2xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#242326] pb-4">
              <div>
                <span className="text-[10px] text-[#a98be8] font-bold tracking-widest uppercase">PROJECT DISCUSSION</span>
                <h3 className="text-lg font-bold text-[#f1f0ed] flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-[#a98be8]" />
                  <span>{discussionProject.title}</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setDiscussionProject(null);
                  setReplyParentId(null);
                  setReplyParentAuthor('');
                }}
                className="text-neutral-500 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {commentsList.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs">
                  No comments yet. Be the first to start the discussion!
                </div>
              ) : (
                commentsList.map(comment => renderCommentNode(comment))
              )}
            </div>

            {/* Comment Composer */}
            <div className="border-t border-[#242326] pt-4 space-y-2">
              {replyParentId && (
                <div className="flex items-center justify-between text-xs bg-[#121118] px-3 py-1.5 border border-[#242326]">
                  <span className="text-neutral-400">
                    Replying to <strong className="text-[#f1f0ed]">{replyParentAuthor}</strong>
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
                  placeholder={currentUser ? (replyParentId ? "Write a reply..." : "Ask a question or share feedback...") : "Sign in to join discussion"}
                  disabled={!currentUser}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 bg-[#090909] border border-[#242326] px-4 py-2.5 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentUser || !commentInput.trim()}
                  className="px-5 py-2.5 bg-[#bca1ee] hover:bg-[#caaefc] disabled:opacity-50 text-[#161218] font-bold text-xs tracking-wider uppercase transition flex items-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>POST</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Team Application Modal */}
      {selectedTeamForApply && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-[#242326] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#242326] pb-4">
              <div>
                <span className="text-[10px] text-[#a98be8] font-bold tracking-widest uppercase">SQUAD APPLICATION</span>
                <h3 className="text-base font-bold text-[#f1f0ed]">{selectedTeamForApply.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTeamForApply(null)}
                className="text-neutral-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyToTeam} className="space-y-4">
              <div>
                <label className="block text-xs text-[#c8c6c3] mb-1">Application Message</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Introduce yourself and your skills..."
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  className="w-full bg-[#090909] border border-[#242326] px-4 py-2.5 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8]"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-bold text-xs tracking-wider uppercase transition"
              >
                SUBMIT APPLICATION
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Auth Modal with Quick Demo Accounts */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-[#242326] p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#242326] pb-4">
              <h3 className="text-base font-bold text-[#f1f0ed] flex items-center space-x-2 tracking-wider uppercase">
                <LogIn className="w-4 h-4 text-[#a98be8]" />
                <span>SIGN IN TO DOGFOOD 2026</span>
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-neutral-500 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Quick Login Test Accounts */}
            <div className="space-y-2">
              <p className="text-[10px] font-mono text-[#c8c6c3] tracking-widest uppercase">ONE-CLICK DEMO ACCOUNTS:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('organizer@dogfood.test')}
                  className="p-2.5 bg-[#121118] border border-[#242326] hover:border-[#a98be8] text-left text-xs transition"
                >
                  <p className="font-bold text-[#f1f0ed]">Organizer</p>
                  <p className="text-[10px] text-[#a98be8]">Full Control</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('judge1@dogfood.test')}
                  className="p-2.5 bg-[#121118] border border-[#242326] hover:border-[#a98be8] text-left text-xs transition"
                >
                  <p className="font-bold text-[#f1f0ed]">Judge Elena</p>
                  <p className="text-[10px] text-amber-400">Scoring Queue</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@dogfood.test')}
                  className="p-2.5 bg-[#121118] border border-[#242326] hover:border-[#a98be8] text-left text-xs transition"
                >
                  <p className="font-bold text-[#f1f0ed]">Alice (Leader)</p>
                  <p className="text-[10px] text-[#9eea9a]">Team Alpha</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('bob@dogfood.test')}
                  className="p-2.5 bg-[#121118] border border-[#242326] hover:border-[#a98be8] text-left text-xs transition"
                >
                  <p className="font-bold text-[#f1f0ed]">Bob (Hacker)</p>
                  <p className="text-[10px] text-[#9eea9a]">Participant</p>
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[#242326]"></div>
              <span className="flex-shrink mx-3 text-[9px] font-mono text-neutral-500 uppercase tracking-wider">OR EMAIL</span>
              <div className="flex-grow border-t border-[#242326]"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] text-[#c8c6c3] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#090909] border border-[#242326] px-4 py-2.5 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#c8c6c3] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#090909] border border-[#242326] px-4 py-2.5 text-xs text-[#f1f0ed] outline-none focus:border-[#a98be8]"
                />
              </div>

              {authError && (
                <p className="text-xs text-rose-400 font-mono">{authError}</p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#bca1ee] hover:bg-[#caaefc] text-[#161218] font-bold text-xs tracking-wider uppercase transition"
              >
                SIGN IN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Minimal Footer (DESIGN.md) */}
      <footer className="border-t border-[#242326] py-6 px-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-[#c8c6c3] bg-[#090909] gap-4">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-none bg-[#9eea9a]"></span>
          <span>DOGFOOD 2026 PLATFORM // NEXERA ARCHITECTURE</span>
        </div>
        <span>100% OFFLINE-FIRST // ZERO EXTERNAL RUNTIME DEPENDENCIES</span>
      </footer>
    </div>
  );
}
