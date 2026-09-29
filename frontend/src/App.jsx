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
  UserPlus,
  Bell,
  Radio,
  Activity,
  CheckCheck,
  X
} from 'lucide-react';
import ReferenceHero from './components/ReferenceHero';
import MinimalNav from './components/layout/MinimalNav';

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

  // Announcements & Broadcast Manager state (Phase 20)
  const [announcements, setAnnouncements] = useState([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [announcementPriority, setAnnouncementPriority] = useState('INFO');
  const [announcementAudience, setAnnouncementAudience] = useState('ALL');
  const [announcementIsBanner, setAnnouncementIsBanner] = useState(false);
  const [activeBanner, setActiveBanner] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [broadcastFilterPriority, setBroadcastFilterPriority] = useState('ALL');

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

  // Reputation & Skill Endorsements (Phase 21)
  const [endorseModalUser, setEndorseModalUser] = useState(null);
  const [endorseSkill, setEndorseSkill] = useState('');
  const [endorseComment, setEndorseComment] = useState('');

  // In-App Notification Center & Activity Feed state (Phase 19)
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState('all'); // 'all', 'unread'
  const [activities, setActivities] = useState([]);
  const [activityFilter, setActivityFilter] = useState('ALL');

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

  // 1. Initial Load: Health, Event & Active Banner
  useEffect(() => {
    fetch('/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));

    fetchEventData();
    fetchActiveBanner();
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
    if (activeTab === 'activity') fetchActivities();
    if (activeTab === 'announcements') fetchAnnouncements();
    if (activeTab === 'hackers') {
      fetchHackers();
      fetchRecruitingTeams();
    }
    if (activeTab === 'judging') fetchJudgingQueue();
    if (activeTab === 'overview') fetchWinners();
  }, [activeTab, leaderboardMode, selectedTrack, searchQuery, hackerSkillFilter, token]);

  // 4. Real-time In-App Notification Center SSE Stream
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    fetchNotifications();

    let eventSource;
    try {
      eventSource = new EventSource(`/api/notifications/stream?token=${token}`);
      
      eventSource.addEventListener('NOTIFICATION_RECEIVED', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data) {
            setNotifications(prev => [payload.data, ...prev]);
            setUnreadCount(prev => prev + 1);
            showToast(`🔔 ${payload.data.title}: ${payload.data.message}`);
          }
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('NOTIFICATION_READ', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data) {
            setUnreadCount(payload.data.unreadCount || 0);
          }
        } catch (err) {
          console.error(err);
        }
      });

      eventSource.addEventListener('NOTIFICATIONS_ALL_READ', () => {
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      });
    } catch (err) {
      console.error('[Notification SSE Error]', err);
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [token]);

  // 5. Real-time Activity Stream SSE Listener
  useEffect(() => {
    let actSource;
    try {
      actSource = new EventSource('/api/activity/stream');
      actSource.addEventListener('ACTIVITY_LOGGED', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data) {
            setActivities(prev => [payload.data, ...prev.slice(0, 49)]);
          }
        } catch (err) {
          console.error(err);
        }
      });

      actSource.addEventListener('BROADCAST_CREATED', (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.data) {
            fetchAnnouncements();
            if (payload.data.isBannerActive) {
              fetchActiveBanner();
            }
          }
        } catch (err) {
          console.error(err);
        }
      });

      actSource.addEventListener('BANNER_STATE_CHANGED', () => {
        fetchActiveBanner();
        fetchAnnouncements();
      });
    } catch (err) {
      console.error('[Activity SSE Error]', err);
    }

    return () => {
      if (actSource) actSource.close();
    };
  }, []);

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

  const fetchActiveBanner = () => {
    fetch('/api/events/dogfood-2026/broadcasts/active-banner')
      .then(res => res.json())
      .then(data => {
        if (data.banner) {
          setActiveBanner(data.banner);
        } else {
          setActiveBanner(null);
        }
      })
      .catch(() => setActiveBanner(null));
  };

  const fetchAnnouncements = () => {
    setLoading(true);
    let url = '/api/events/dogfood-2026/announcements';
    if (broadcastFilterPriority && broadcastFilterPriority !== 'ALL') {
      url += `?priority=${broadcastFilterPriority}`;
    }
    fetch(url)
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
        priority: announcementPriority,
        targetAudience: announcementAudience,
        isBannerActive: announcementIsBanner
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.announcement) {
          showToast(`📢 ${data.announcement.priority} broadcast dispatched!`);
          setAnnouncementTitle('');
          setAnnouncementContent('');
          setAnnouncementPinned(false);
          setAnnouncementPriority('INFO');
          setAnnouncementAudience('ALL');
          setAnnouncementIsBanner(false);
          fetchAnnouncements();
          fetchActiveBanner();
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      })
      .catch(() => showToast('Network error creating announcement.'));
  };

  const handleToggleBanner = (announcementId) => {
    if (!token) return;
    fetch(`/api/announcements/${announcementId}/toggle-banner`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.announcement) {
          showToast(`⚡ Banner state: ${data.announcement.isBannerActive ? 'ACTIVATED' : 'DEACTIVATED'}`);
          fetchAnnouncements();
          fetchActiveBanner();
        } else {
          showToast(`⚠️ ${data.error}`);
        }
      })
      .catch(() => showToast('Network error toggling banner.'));
  };

  const fetchActivities = () => {
    fetch('/api/activity/feed?limit=50')
      .then(res => res.json())
      .then(data => {
        if (data.activities) setActivities(data.activities);
      })
      .catch(err => console.error(err));
  };

  const fetchNotifications = () => {
    if (!token) return;
    fetch('/api/notifications?limit=50', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.notifications) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(err => console.error(err));
  };

  const handleMarkNotifRead = (id) => {
    if (!token) return;
    fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      })
      .catch(console.error);
  };

  const handleMarkAllNotifsRead = () => {
    if (!token) return;
    fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        showToast('All notifications marked as read.');
      })
      .catch(console.error);
  };

  const handleDeleteNotif = (id) => {
    if (!token) return;
    fetch(`/api/notifications/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        const target = notifications.find(n => n.id === id);
        if (target && !target.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        setNotifications(prev => prev.filter(n => n.id !== id));
      })
      .catch(console.error);
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

  const handleEndorseUser = (e) => {
    if (e) e.preventDefault();
    if (!token) {
      setShowAuthModal(true);
      return;
    }
    if (!endorseModalUser || !endorseSkill.trim()) {
      showToast('⚠️ Please specify a skill to endorse.');
      return;
    }

    fetch(`/api/users/${endorseModalUser.id}/endorse`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        skill: endorseSkill.trim(),
        comment: endorseComment.trim() || undefined
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.endorsement) {
          showToast(`✨ Endorsed ${endorseModalUser.name} for ${endorseSkill.trim()}! (+${data.pointsAwarded} pts)`);
          setEndorseModalUser(null);
          setEndorseSkill('');
          setEndorseComment('');
          fetchHackers();
        } else {
          showToast(`⚠️ ${data.error || 'Failed to endorse user.'}`);
        }
      })
      .catch(() => showToast('Network error submitting endorsement.'));
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
    { id: 'activity', label: 'ACTIVITY FEED' },
    { id: 'announcements', label: 'ANNOUNCEMENTS' },
    { id: 'hackers', label: 'HACKER DIRECTORY' },
    { id: 'judging', label: 'JUDGING' },
  ];

  return (
    <div className="min-h-screen bg-[#070609] text-[#f5f4f8] flex flex-col font-sans selection:bg-[#7a4ee0]/40 selection:text-white">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#13111b] border border-[rgba(191,165,255,0.3)] text-[#f5f4f8] px-5 py-3 shadow-2xl rounded-2xl flex items-center space-x-3 font-sans text-xs backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#9eea9a] animate-ping"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Takeover (Phase 20 Broadcast System) */}
      {activeBanner && !bannerDismissed && (
        <div className={`w-full py-2.5 px-6 border-b z-50 transition-all ${
          activeBanner.priority === 'CRITICAL_ALERT'
            ? 'bg-[#180d10] border-red-500/40 text-[#f5f4f8]'
            : activeBanner.priority === 'IMPORTANT'
            ? 'bg-[#150f24] border-[#7a4ee0]/50 text-[#f5f4f8]'
            : 'bg-[#0f0e16] border-[rgba(255,255,255,0.08)] text-[#f5f4f8]'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 text-xs font-sans">
            <div className="flex items-center space-x-3 overflow-hidden">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                activeBanner.priority === 'CRITICAL_ALERT' ? 'bg-red-400 animate-ping' : 'bg-[#9eea9a] animate-pulse'
              }`}></span>
              <span className={`px-2.5 py-0.5 text-[9px] font-bold tracking-wider uppercase shrink-0 rounded-full border ${
                activeBanner.priority === 'CRITICAL_ALERT'
                  ? 'border-red-500/40 bg-red-500/10 text-red-300'
                  : activeBanner.priority === 'IMPORTANT'
                  ? 'border-[#7a4ee0]/40 bg-[#7a4ee0]/20 text-[#bfa5ff]'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-300'
              }`}>
                {activeBanner.priority}
              </span>
              <span className="font-semibold text-[#f5f4f8] shrink-0">{activeBanner.title}:</span>
              <span className="text-[#c5c3d0] truncate">{activeBanner.content}</span>
            </div>
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => setActiveTab('announcements')}
                className="text-[10px] text-[#bfa5ff] hover:text-white underline uppercase tracking-wider font-bold"
              >
                VIEW FULL BROADCAST
              </button>
              <button
                onClick={() => setBannerDismissed(true)}
                className="p-1 hover:text-white text-neutral-400 transition"
                title="Dismiss Banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Minimal Editorial Navigation Header (Dogfood_Design_Reference.md) */}
      <MinimalNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        token={token}
        unreadCount={unreadCount}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onToggleNotificationDrawer={() => setShowNotificationDrawer(!showNotificationDrawer)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-12">
        {/* ============================================================ */}
        {/* TAB 1: OVERVIEW & REFERENCE HERO */}
        {/* ============================================================ */}
        {activeTab === 'overview' && (
          <div className="space-y-12">
            {/* Reference Hero (Dogfood_Design_Reference.md) */}
            <ReferenceHero
              onExploreClick={() => setActiveTab('gallery')}
              onLeaderboardClick={() => setActiveTab('leaderboard')}
              projectCount={eventData?._count?.submissions || gallery.length || 128}
              judgingProgress={96}
              eventStatus={eventData?.status || 'ACTIVE'}
            />

            {/* Architecture Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
              <div className="ambient-card p-5 sm:p-6 rounded-2xl space-y-1.5">
                <p className="hud-mono-label">PRIZE POOL</p>
                <p className="hero-display-headline text-2xl md:text-3xl text-[#f5f4f8]">$20,000</p>
                <p className="text-[11px] text-[#8b8899]">Verified USDC & Grants</p>
              </div>
              <div className="ambient-card p-5 sm:p-6 rounded-2xl space-y-1.5">
                <p className="hud-mono-label">SUBMISSIONS</p>
                <p className="hero-display-headline text-2xl md:text-3xl text-[#bfa5ff]">
                  {eventData?._count?.submissions || gallery.length || 4} SHIPPED
                </p>
                <p className="text-[11px] text-[#8b8899]">Freezed with SHA-256 lock</p>
              </div>
              <div className="ambient-card p-5 sm:p-6 rounded-2xl space-y-1.5">
                <p className="hud-mono-label">TEAMS</p>
                <p className="hero-display-headline text-2xl md:text-3xl text-[#f5f4f8]">
                  {eventData?._count?.teams || 4} SQUADS
                </p>
                <p className="text-[11px] text-[#8b8899]">Active builder rosters</p>
              </div>
              <div className="ambient-card p-5 sm:p-6 rounded-2xl space-y-1.5">
                <p className="hud-mono-label">CALIBRATION</p>
                <p className="hero-display-headline text-2xl md:text-3xl text-[#9eea9a]">Z-SCORE</p>
                <p className="text-[11px] text-[#8b8899]">Zero-bias normalized</p>
              </div>
            </div>

            {/* Championship Prizes */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
                <h2 className="text-base sm:text-lg font-bold text-[#f5f4f8] tracking-tight uppercase flex items-center space-x-2">
                  <Award className="w-4 h-4 text-[#bfa5ff]" />
                  <span>CHAMPIONSHIP REWARDS</span>
                </h2>
                <span className="text-[11px] font-mono text-[#8b8899]">VERIFIED SMART ESCROW</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(eventData?.prizes || [
                  { id: 'p1', title: 'Grand Championship', amount: '$15,000', description: 'Highest overall calibrated score across all rubric dimensions.' },
                  { id: 'p2', title: 'Best AI Architecture', amount: '$5,000', description: 'Outstanding edge intelligence and local inference engine.' },
                  { id: 'p3', title: 'Resilience & Offline Protocol', amount: '$2,500', description: 'Top peer-to-peer decentralized synchronization system.' },
                ]).map((prize, idx) => (
                  <div
                    key={prize.id || idx}
                    className="ambient-card p-6 rounded-2xl space-y-3"
                  >
                    <div className="hud-mono-label text-[#bfa5ff]">
                      TIER 0{idx + 1} // PRIZE
                    </div>
                    <div className="hero-display-headline text-3xl sm:text-4xl text-[#f5f4f8]">
                      {prize.amount}
                    </div>
                    <h3 className="text-sm font-bold text-[#f5f4f8]">{prize.title}</h3>
                    <p className="text-xs text-[#c5c3d0] leading-relaxed font-sans">{prize.description}</p>
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
              <div className="text-center py-24 text-[#8b8899] font-mono text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#bfa5ff] mb-3" />
                SYNCING SUBMISSIONS...
              </div>
            ) : gallery.length === 0 ? (
              <div className="text-center py-20 ambient-card rounded-3xl">
                <p className="text-[#8b8899] text-xs">No matching projects found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {gallery.map((project) => (
                  <div
                    key={project.id}
                    className="ambient-card p-6 sm:p-7 rounded-3xl flex flex-col justify-between space-y-5 group"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="px-3 py-1 text-[9px] font-mono font-semibold text-[#bfa5ff] border border-[rgba(191,165,255,0.25)] bg-[#13111b] rounded-full uppercase tracking-wider">
                          {project.track?.name || 'GENERAL TRACK'}
                        </span>
                        <div className="flex items-center space-x-2">
                          {project.repoUrl && (
                            <a
                              href={project.repoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 rounded-full border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.4)] bg-[#13111b] text-[#8b8899] hover:text-white transition"
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
                              className="p-2 rounded-full border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.4)] bg-[#13111b] text-[#8b8899] hover:text-white transition"
                              title="Live Demo"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="text-lg font-bold text-[#f5f4f8] group-hover:text-[#bfa5ff] transition-colors">{project.title}</h3>
                        <p className="text-xs text-[#c5c3d0] mt-1 leading-relaxed">{project.tagline}</p>
                      </div>

                      {/* Tech stack pills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(project.techStack || []).map((tech, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 text-[9px] font-mono text-[#8b8899] border border-[rgba(255,255,255,0.05)] bg-[#13111b] rounded-full"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-xs text-[#8b8899]">
                        <span className="font-semibold text-[#c5c3d0]">Team: {project.team?.name}</span>
                        <span>{project.team?.members?.length || 1} Member(s)</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-[rgba(255,255,255,0.06)] grid grid-cols-2 gap-3">
                      <button
                        onClick={() => openProjectComments(project)}
                        className="py-2.5 px-4 bg-[#13111b] hover:bg-[#1a1726] text-[#c5c3d0] hover:text-white border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.3)] rounded-full text-xs font-semibold tracking-wider transition uppercase flex items-center justify-center space-x-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-[#bfa5ff]" />
                        <span>DISCUSS</span>
                      </button>
                      <button
                        onClick={() => handleCommunityVote(project.id)}
                        className="pill-cta py-2.5 px-4 text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-1.5"
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
            <div className="border-b border-[rgba(255,255,255,0.06)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#f5f4f8] uppercase flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-[#bfa5ff]" />
                  <span>TOURNAMENT STANDINGS</span>
                </h2>
                <p className="text-xs text-[#c5c3d0] mt-1">
                  Dynamic rankings calibrated across statistical Z-Score, raw arithmetic means, and popular ballots.
                </p>
              </div>

              {/* Mode Tabs */}
              <div className="flex items-center space-x-1 bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] p-1 rounded-full text-xs">
                <button
                  onClick={() => setLeaderboardMode('normalized')}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition uppercase ${
                    leaderboardMode === 'normalized'
                      ? 'bg-[#1e1a2c] text-[#f5f4f8] border border-[rgba(191,165,255,0.3)]'
                      : 'text-[#8b8899] hover:text-[#c5c3d0]'
                  }`}
                >
                  ⚡ Z-SCORE
                </button>
                <button
                  onClick={() => setLeaderboardMode('raw')}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition uppercase ${
                    leaderboardMode === 'raw'
                      ? 'bg-[#1e1a2c] text-[#f5f4f8] border border-[rgba(191,165,255,0.3)]'
                      : 'text-[#8b8899] hover:text-[#c5c3d0]'
                  }`}
                >
                  📊 RAW AVERAGE
                </button>
                <button
                  onClick={() => setLeaderboardMode('community')}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition uppercase ${
                    leaderboardMode === 'community'
                      ? 'bg-[#1e1a2c] text-[#f5f4f8] border border-[rgba(191,165,255,0.3)]'
                      : 'text-[#8b8899] hover:text-[#c5c3d0]'
                  }`}
                >
                  🗳️ COMMUNITY
                </button>
              </div>
            </div>

            {/* Leaderboard Table */}
            <div className="ambient-card rounded-3xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-[rgba(255,255,255,0.06)] bg-[#0c0b12] text-[10px] font-mono text-[#8b8899] uppercase tracking-wider">
                      <th className="py-4 px-6">Rank</th>
                      <th className="py-4 px-6">Project / Team</th>
                      <th className="py-4 px-6">Track</th>
                      <th className="py-4 px-6 text-right">
                        {leaderboardMode === 'normalized' ? 'Calibrated Z-Score' : leaderboardMode === 'raw' ? 'Raw Score Mean' : 'Community Ballots'}
                      </th>
                      <th className="py-4 px-6 text-right">Evals</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {leaderboard.map((entry) => (
                      <tr key={entry.id} className="hover:bg-[#13111b] transition">
                        <td className="py-4 px-6 font-mono text-sm font-bold">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs ${
                            entry.rank === 1
                              ? 'bg-[#7a4ee0]/20 text-[#bfa5ff] border border-[rgba(191,165,255,0.4)]'
                              : 'text-[#8b8899]'
                          }`}>
                            #{entry.rank}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-bold text-sm text-[#f5f4f8]">{entry.title}</p>
                          <p className="text-[11px] text-[#8b8899]">Team: {entry.team?.name}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-[10px] text-[#8b8899] border border-[rgba(255,255,255,0.08)] bg-[#13111b] px-2.5 py-0.5 rounded-full font-mono">
                            {entry.track?.name || 'GENERAL'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-mono text-sm font-bold">
                          {leaderboardMode === 'normalized' ? (
                            <span className="text-[#bfa5ff]">
                              {entry.scores.normalizedZScore > 0 ? '+' : ''}
                              {entry.scores.normalizedZScore.toFixed(2)}
                            </span>
                          ) : leaderboardMode === 'raw' ? (
                            <span className="text-[#f5f4f8]">{entry.scores.rawScoreMean.toFixed(2)}</span>
                          ) : (
                            <span className="text-[#9eea9a]">{entry.scores.communityVotesCount} votes</span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right text-xs text-[#8b8899]">
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
        {/* TAB 4: REAL-TIME ACTIVITY FEED (Phase 19) */}
        {/* ============================================================ */}
        {activeTab === 'activity' && (
          <div className="space-y-8">
            <div className="border-b border-[rgba(255,255,255,0.06)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#f5f4f8] uppercase flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-[#bfa5ff]" />
                  <span>ACTIVITY TIMELINE // LIVE AUDIT STREAM</span>
                </h2>
                <p className="text-xs text-[#c5c3d0] mt-1">
                  Real-time immutable ledger of platform events, squad formations, shipments, and evaluations.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[#0c0b12] text-[10px] font-mono text-[#9eea9a]">
                  <Radio className="w-3.5 h-3.5 animate-pulse" />
                  <span>LIVE SSE BEACON</span>
                </div>
                <button
                  onClick={fetchActivities}
                  className="p-2 rounded-full border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.3)] bg-[#0c0b12] text-[#8b8899] hover:text-white transition"
                  title="Refresh activity feed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2">
              {['ALL', 'SUBMISSION_SHIPPED', 'TEAM_CREATED', 'SCORE_SUBMITTED', 'ANNOUNCEMENT_CREATED', 'EVENT_CREATED'].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setActivityFilter(filterKey)}
                  className={`px-3.5 py-1.5 rounded-full text-[10px] font-mono tracking-wider transition uppercase ${
                    activityFilter === filterKey
                      ? 'bg-[#1e1a2c] text-[#f5f4f8] border border-[rgba(191,165,255,0.3)] font-bold'
                      : 'border border-[rgba(255,255,255,0.06)] text-[#8b8899] hover:text-[#f5f4f8] bg-[#0c0b12]'
                  }`}
                >
                  {filterKey.replace(/_/g, ' ')}
                </button>
              ))}
            </div>

            {/* Activity Stream List */}
            <div className="space-y-3">
              {activities
                .filter(act => activityFilter === 'ALL' || act.action === activityFilter)
                .map((act) => (
                  <div
                    key={act.id}
                    className="ambient-card p-4 sm:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start md:items-center space-x-3">
                      <span className="w-2 h-2 rounded-full bg-[#9eea9a] mt-1.5 md:mt-0 flex-shrink-0"></span>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#f5f4f8]">{act.actor?.name || 'System'}</span>
                          <span className="text-[9px] px-2 py-0.5 font-mono uppercase bg-[#1e1a2c] text-[#bfa5ff] rounded-full border border-[rgba(191,165,255,0.2)]">
                            {act.actor?.role || 'SYSTEM'}
                          </span>
                          <span className="text-neutral-500 font-mono text-[11px]">—</span>
                          <span className="font-mono text-[#bfa5ff] font-semibold">{act.action}</span>
                        </div>
                        {act.metadata && Object.keys(act.metadata).length > 0 && (
                          <p className="text-[11px] text-[#8b8899] mt-1 font-mono">
                            {JSON.stringify(act.metadata)}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-[#8b8899] flex-shrink-0">
                      {new Date(act.timestamp).toLocaleTimeString()} · {new Date(act.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                ))}

              {activities.filter(act => activityFilter === 'ALL' || act.action === activityFilter).length === 0 && (
                <div className="p-12 ambient-card rounded-3xl text-center text-xs text-[#8b8899]">
                  Zero matching audit events recorded yet.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: ORGANIZER BROADCASTS & MULTI-CHANNEL ALERTS (Phase 20) */}
        {/* ============================================================ */}
        {activeTab === 'announcements' && (
          <div className="space-y-8">
            <div className="border-b border-[rgba(255,255,255,0.06)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#f5f4f8] uppercase flex items-center space-x-2">
                  <Radio className="w-5 h-5 text-[#bfa5ff]" />
                  <span>ORGANIZER BROADCAST SYSTEM & ALERTS</span>
                </h2>
                <p className="text-xs text-[#c5c3d0] mt-1">
                  Targeted broadcasts, multi-channel alert dispatches, and active critical banner takeovers.
                </p>
              </div>

              {/* Priority Filter */}
              <div className="flex items-center space-x-2">
                <span className="hud-mono-label">PRIORITY:</span>
                <div className="flex bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] p-1 rounded-full text-xs">
                  {['ALL', 'CRITICAL_ALERT', 'IMPORTANT', 'INFO'].map(p => (
                    <button
                      key={p}
                      onClick={() => setBroadcastFilterPriority(p)}
                      className={`px-3 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase transition ${
                        broadcastFilterPriority === p
                          ? 'bg-[#1e1a2c] text-[#f5f4f8] font-bold border border-[rgba(191,165,255,0.3)]'
                          : 'text-[#8b8899] hover:text-[#c5c3d0]'
                      }`}
                    >
                      {p.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Organizer composer */}
            {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
              <div className="ambient-card p-6 sm:p-7 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-mono font-bold text-[#bfa5ff] uppercase tracking-wider flex items-center space-x-2">
                    <Megaphone className="w-4 h-4" />
                    <span>DISPATCH NEW BROADCAST</span>
                  </p>
                  <span className="text-[10px] font-mono text-[#8b8899] uppercase">
                    ORGANIZER / ADMIN CONSOLE
                  </span>
                </div>
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input
                      type="text"
                      placeholder="Broadcast headline..."
                      value={announcementTitle}
                      onChange={(e) => setAnnouncementTitle(e.target.value)}
                      className="md:col-span-1 bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                    />
                    <div>
                      <select
                        value={announcementPriority}
                        onChange={(e) => setAnnouncementPriority(e.target.value)}
                        className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                      >
                        <option value="INFO">PRIORITY: INFO</option>
                        <option value="IMPORTANT">PRIORITY: IMPORTANT</option>
                        <option value="CRITICAL_ALERT">PRIORITY: CRITICAL ALERT</option>
                      </select>
                    </div>
                    <div>
                      <select
                        value={announcementAudience}
                        onChange={(e) => setAnnouncementAudience(e.target.value)}
                        className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                      >
                        <option value="ALL">AUDIENCE: ALL ATTENDEES</option>
                        <option value="PARTICIPANTS_ONLY">AUDIENCE: PARTICIPANTS ONLY</option>
                        <option value="JUDGES_ONLY">AUDIENCE: JUDGES ONLY</option>
                        <option value="ORGANIZERS_ONLY">AUDIENCE: ORGANIZERS ONLY</option>
                      </select>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Broadcast message content and instructions..."
                    value={announcementContent}
                    onChange={(e) => setAnnouncementContent(e.target.value)}
                    className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center space-x-6">
                      <label className="flex items-center space-x-2 text-xs text-[#c5c3d0] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={announcementPinned}
                          onChange={(e) => setAnnouncementPinned(e.target.checked)}
                          className="accent-[#7a4ee0]"
                        />
                        <span>Pin to Top</span>
                      </label>
                      <label className="flex items-center space-x-2 text-xs text-[#c5c3d0] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={announcementIsBanner}
                          onChange={(e) => setAnnouncementIsBanner(e.target.checked)}
                          className="accent-[#7a4ee0]"
                        />
                        <span className="text-[#bfa5ff] font-semibold">⚡ Activate Top Banner Takeover</span>
                      </label>
                    </div>
                    <button
                      type="submit"
                      className="pill-cta px-6 py-2.5 text-xs font-bold tracking-wider uppercase flex items-center justify-center space-x-1.5 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>DISPATCH BROADCAST</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Broadcasts Feed */}
            <div className="space-y-4">
              {announcements
                .filter(a => broadcastFilterPriority === 'ALL' || a.priority === broadcastFilterPriority)
                .map((a) => (
                  <div
                    key={a.id}
                    className={`ambient-card p-6 rounded-3xl space-y-4 transition-all ${
                      a.priority === 'CRITICAL_ALERT'
                        ? 'border-red-500/50 bg-[#140b0d]'
                        : a.isPinned
                        ? 'border-[rgba(191,165,255,0.3)] bg-[#100e18]'
                        : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Priority Badge */}
                        <span className={`px-2.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded-full border ${
                          a.priority === 'CRITICAL_ALERT'
                            ? 'border-red-500/50 bg-red-500/10 text-red-400'
                            : a.priority === 'IMPORTANT'
                            ? 'border-[#7a4ee0]/50 bg-[#7a4ee0]/20 text-[#bfa5ff]'
                            : 'border-[rgba(255,255,255,0.08)] bg-[#13111b] text-[#8b8899]'
                        }`}>
                          {a.priority || 'INFO'}
                        </span>

                        {/* Audience Badge */}
                        <span className="px-2.5 py-0.5 text-[9px] font-mono border border-[rgba(255,255,255,0.08)] bg-[#13111b] text-[#8b8899] rounded-full uppercase">
                          TARGET: {a.targetAudience?.replace('_', ' ') || 'ALL'}
                        </span>

                        {/* Pinned Badge */}
                        {a.isPinned && (
                          <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-[#7a4ee0]/20 text-[#bfa5ff] border border-[rgba(191,165,255,0.3)] rounded-full uppercase flex items-center space-x-1">
                            <Pin className="w-2.5 h-2.5" />
                            <span>PINNED</span>
                          </span>
                        )}

                        {/* Banner Active Badge */}
                        {a.isBannerActive && (
                          <span className="px-2.5 py-0.5 text-[9px] font-mono font-bold bg-[#9eea9a]/10 text-[#9eea9a] border border-[#9eea9a]/30 rounded-full uppercase flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a] animate-pulse"></span>
                            <span>BANNER TAKEOVER ACTIVE</span>
                          </span>
                        )}

                        <h3 className="text-base font-bold text-[#f5f4f8] ml-1">{a.title}</h3>
                      </div>
                      <span className="text-[10px] text-[#8b8899] shrink-0 font-mono">
                        {new Date(a.createdAt).toLocaleDateString()} · {new Date(a.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className="text-xs text-[#c5c3d0] leading-relaxed whitespace-pre-wrap font-sans">{a.content}</p>

                    <div className="pt-3 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between text-[10px] text-[#8b8899] font-mono">
                      <span>Posted by {a.author?.name || 'Tournament Director'} ({a.author?.role || 'ORGANIZER'})</span>

                      {/* Organizer Banner Toggle Control */}
                      {(currentUser?.role === 'ORGANIZER' || currentUser?.role === 'ADMIN') && (
                        <button
                          onClick={() => handleToggleBanner(a.id)}
                          className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border transition ${
                            a.isBannerActive
                              ? 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                              : 'border-[#7a4ee0]/40 text-[#bfa5ff] hover:bg-[#7a4ee0]/10'
                          }`}
                        >
                          {a.isBannerActive ? '✕ Deactivate Banner Takeover' : '⚡ Activate Banner Takeover'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}

              {announcements.filter(a => broadcastFilterPriority === 'ALL' || a.priority === broadcastFilterPriority).length === 0 && (
                <div className="p-12 ambient-card rounded-3xl text-center text-xs text-[#8b8899]">
                  No broadcasts found for priority {broadcastFilterPriority}.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* TAB 5: HACKER DIRECTORY & MATCHMAKING (Phase 18) */}
        {/* ============================================================ */}
        {activeTab === 'hackers' && (
          <div className="space-y-8">
            <div className="border-b border-[rgba(255,255,255,0.06)] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#f5f4f8] uppercase flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#bfa5ff]" />
                  <span>HACKER DIRECTORY & MATCHMAKING</span>
                </h2>
                <p className="text-xs text-[#c5c3d0] mt-1">
                  Discover builders looking for teams and connect with recruiting squads.
                </p>
              </div>

              <div className="flex items-center bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] rounded-full px-3.5 py-2 text-xs">
                <Search className="w-3.5 h-3.5 text-[#8b8899] mr-2" />
                <input
                  type="text"
                  placeholder="Filter by skill (e.g. Rust, React)..."
                  value={hackerSkillFilter}
                  onChange={(e) => setHackerSkillFilter(e.target.value)}
                  className="bg-transparent text-xs text-[#f5f4f8] outline-none placeholder-neutral-600 w-48"
                />
              </div>
            </div>

            {/* Two Column Layout: Hackers on Left, Recruiting Teams on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left: Hackers looking for squad */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-[#f5f4f8] tracking-wider uppercase flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-[#9eea9a]" />
                  <span>AVAILABLE BUILDERS ({hackers.length})</span>
                </h3>

                <div className="space-y-4">
                  {hackers.map((hacker) => (
                    <div key={hacker.id} className="ambient-card p-5 sm:p-6 rounded-3xl space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <p className="font-bold text-sm text-[#f5f4f8]">{hacker.name}</p>
                            <span className="px-2 py-0.5 text-[8px] font-mono font-bold bg-[#7a4ee0]/15 text-[#bfa5ff] border border-[#7a4ee0]/40 rounded-full">
                              LVL {hacker.level || 1} // {hacker.rankTitle || 'Scout'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-0.5">
                            {hacker.githubUsername && (
                              <p className="text-[10px] text-[#8b8899]">@{hacker.githubUsername}</p>
                            )}
                            <span className="text-[10px] font-mono text-[#9eea9a] font-semibold">
                              ✦ {hacker.reputationScore || 0} pts
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEndorseModalUser(hacker);
                              setEndorseSkill(hacker.skills?.[0] || '');
                            }}
                            className="px-2.5 py-1 text-[9px] font-bold font-mono text-[#bfa5ff] bg-[#161322] hover:bg-[#201a35] border border-[rgba(191,165,255,0.3)] rounded-full transition"
                          >
                            + ENDORSE
                          </button>
                          <span className="px-2.5 py-0.5 text-[9px] font-mono text-[#9eea9a] border border-[#9eea9a]/30 bg-[#9eea9a]/10 rounded-full uppercase font-semibold">
                            LOOKING FOR TEAM
                          </span>
                        </div>
                      </div>

                      {hacker.bio && <p className="text-xs text-[#c5c3d0] leading-relaxed font-sans">{hacker.bio}</p>}

                      {/* Earned Badges */}
                      {hacker.badges && hacker.badges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {hacker.badges.map((b, bIdx) => (
                            <span
                              key={bIdx}
                              className="px-2 py-0.5 text-[8px] font-mono text-amber-300 border border-amber-400/30 bg-amber-400/10 rounded-md flex items-center space-x-1"
                              title={b.name}
                            >
                              <span>🏆</span>
                              <span>{b.name}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Skills */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(hacker.skills || []).map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 text-[9px] text-[#bfa5ff] border border-[rgba(191,165,255,0.2)] bg-[#13111b] rounded-full font-mono">
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
                <h3 className="text-sm font-bold text-[#f5f4f8] tracking-wider uppercase flex items-center space-x-2">
                  <UserPlus className="w-4 h-4 text-[#bfa5ff]" />
                  <span>RECRUITING SQUADS ({recruitingTeams.length})</span>
                </h3>

                <div className="space-y-4">
                  {recruitingTeams.map((team) => (
                    <div key={team.id} className="ambient-card p-5 sm:p-6 rounded-3xl space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-[#f5f4f8]">{team.name}</p>
                          <p className="text-[10px] text-[#8b8899]">{team.membersCount} / {team.maxMembers} Members</p>
                        </div>
                        <button
                          onClick={() => setSelectedTeamForApply(team)}
                          className="pill-cta px-3.5 py-1 text-[10px] font-bold tracking-wider uppercase"
                        >
                          APPLY TO JOIN
                        </button>
                      </div>

                      {team.description && <p className="text-xs text-[#c5c3d0] leading-relaxed font-sans">{team.description}</p>}

                      {/* Skills needed */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(team.skillsNeeded || []).map((skill, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 text-[9px] text-[#8b8899] border border-[rgba(255,255,255,0.06)] bg-[#13111b] rounded-full font-mono">
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
              <div className="ambient-card p-12 text-center max-w-lg mx-auto rounded-3xl space-y-4">
                <Lock className="w-8 h-8 text-[#bfa5ff] mx-auto" />
                <h3 className="text-base font-bold text-[#f5f4f8] uppercase tracking-wider">JUDGE AUTHENTICATION REQUIRED</h3>
                <p className="text-xs text-[#c5c3d0] leading-relaxed">
                  Sign in with an official Judge or Organizer account to view your evaluation queue and score submissions.
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="pill-cta px-6 py-2.5 text-xs font-bold uppercase tracking-wider"
                >
                  SIGN IN ↗
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Queue List */}
                <div className="ambient-card p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold text-[#f5f4f8] tracking-wider uppercase flex justify-between items-center">
                    <span>EVALUATION QUEUE</span>
                    <span className="text-[#bfa5ff] font-mono">{judgeAssignments.length} Assigned</span>
                  </h3>

                  <div className="space-y-2">
                    {judgeAssignments.map((a) => (
                      <div
                        key={a.id}
                        onClick={() => setSelectedAssignment(a)}
                        className={`p-4 rounded-2xl border cursor-pointer transition ${
                          selectedAssignment?.id === a.id
                            ? 'bg-[#181424] border-[#7a4ee0] shadow-md'
                            : 'bg-[#070609] border-[rgba(255,255,255,0.06)] hover:border-[rgba(191,165,255,0.3)]'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-[#f5f4f8]">{a.submission?.title}</p>
                          <span className={`text-[8px] font-mono px-2 py-0.5 rounded-full border ${
                            a.status === 'COMPLETED'
                              ? 'border-[#9eea9a]/30 text-[#9eea9a] bg-[#9eea9a]/10'
                              : 'border-amber-400/30 text-amber-400 bg-amber-400/10'
                          }`}>
                            {a.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#8b8899] mt-1 font-mono">Team: {a.submission?.team?.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Rubric Scoring Form */}
                <div className="lg:col-span-2 ambient-card p-8 rounded-3xl space-y-6">
                  {selectedAssignment ? (
                    <form onSubmit={handleScoreSubmit} className="space-y-6">
                      <div className="border-b border-[rgba(255,255,255,0.06)] pb-4">
                        <span className="hud-mono-label text-[#bfa5ff] font-bold">
                          EVALUATING SUBMISSION
                        </span>
                        <h2 className="text-xl font-bold text-[#f5f4f8] mt-1">{selectedAssignment.submission?.title}</h2>
                        <p className="text-xs text-[#c5c3d0] mt-1">{selectedAssignment.submission?.tagline}</p>
                      </div>

                      {/* Rubric Criteria Sliders */}
                      <div className="space-y-6">
                        {(selectedAssignment.event?.rubricCriteria || [
                          { id: 'c1', name: 'Technical Depth (35%)', minScore: 1, maxScore: 10 },
                          { id: 'c2', name: 'Innovation & Novelty (25%)', minScore: 1, maxScore: 10 },
                          { id: 'c3', name: 'Offline Resilience (20%)', minScore: 1, maxScore: 10 },
                          { id: 'c4', name: 'UI / UX Design Polish (20%)', minScore: 1, maxScore: 10 },
                        ]).map((crit) => (
                          <div key={crit.id} className="ambient-card p-5 rounded-2xl space-y-3">
                            <div className="flex justify-between items-center text-xs">
                              <label className="font-bold text-[#f5f4f8]">{crit.name}</label>
                              <span className="text-[#bfa5ff] font-bold font-mono">
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
                              className="w-full accent-[#7a4ee0] cursor-pointer"
                            />

                            <input
                              type="text"
                              placeholder="Qualitative feedback comments..."
                              value={feedbackInput[crit.id] || ''}
                              onChange={(e) => setFeedbackInput({ ...feedbackInput, [crit.id]: e.target.value })}
                              className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-xl px-4 py-2 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                            />
                          </div>
                        ))}
                      </div>

                      {scoreSuccess && (
                        <div className="p-3.5 rounded-2xl border border-[#9eea9a]/30 bg-[#9eea9a]/10 text-[#9eea9a] text-xs flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{scoreSuccess}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="pill-cta w-full py-3 text-xs font-bold tracking-wider uppercase"
                      >
                        SUBMIT FINAL RUBRIC SCORES
                      </button>
                    </form>
                  ) : (
                    <p className="text-[#8b8899] text-xs text-center py-20">Select an assigned project from the queue.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Project Threaded Discussion Modal */}
      {discussionProject && (
        <div className="fixed inset-0 z-50 bg-[#070609]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ambient-card p-6 md:p-8 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
              <div>
                <span className="hud-mono-label text-[#bfa5ff] font-bold">PROJECT DISCUSSION</span>
                <h3 className="text-lg font-bold text-[#f5f4f8] flex items-center space-x-2 mt-1">
                  <MessageSquare className="w-4 h-4 text-[#bfa5ff]" />
                  <span>{discussionProject.title}</span>
                </h3>
              </div>
              <button
                onClick={() => {
                  setDiscussionProject(null);
                  setReplyParentId(null);
                  setReplyParentAuthor('');
                }}
                className="p-1 rounded-full text-[#8b8899] hover:text-white hover:bg-[#1e1a2c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {commentsList.length === 0 ? (
                <div className="text-center py-12 text-[#8b8899] text-xs">
                  No comments yet. Be the first to start the discussion!
                </div>
              ) : (
                commentsList.map(comment => renderCommentNode(comment))
              )}
            </div>

            {/* Comment Composer */}
            <div className="border-t border-[rgba(255,255,255,0.06)] pt-4 space-y-2">
              {replyParentId && (
                <div className="flex items-center justify-between text-xs bg-[#13111b] px-3.5 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)]">
                  <span className="text-[#8b8899]">
                    Replying to <strong className="text-[#f5f4f8]">{replyParentAuthor}</strong>
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
                  className="flex-1 bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-full px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!currentUser || !commentInput.trim()}
                  className="pill-cta px-6 py-2.5 disabled:opacity-50 text-xs font-bold tracking-wider uppercase flex items-center space-x-1.5"
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
        <div className="fixed inset-0 z-50 bg-[#070609]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ambient-card p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
              <div>
                <span className="hud-mono-label text-[#bfa5ff] font-bold">SQUAD APPLICATION</span>
                <h3 className="text-base font-bold text-[#f5f4f8] mt-1">{selectedTeamForApply.name}</h3>
              </div>
              <button
                onClick={() => setSelectedTeamForApply(null)}
                className="p-1 rounded-full text-[#8b8899] hover:text-white hover:bg-[#1e1a2c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyToTeam} className="space-y-4">
              <div>
                <label className="block text-xs text-[#c5c3d0] mb-1">Application Message</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Introduce yourself and your skills..."
                  value={applyMessage}
                  onChange={(e) => setApplyMessage(e.target.value)}
                  className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                />
              </div>

              <button
                type="submit"
                className="pill-cta w-full py-3 text-xs font-bold tracking-wider uppercase"
              >
                SUBMIT APPLICATION
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* IN-APP NOTIFICATION CENTER MODAL / DRAWER (Phase 19) */}
      {/* ============================================================ */}
      {showNotificationDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070609]/80 backdrop-blur-md">
          <div className="ambient-card max-w-lg w-full p-6 sm:p-7 rounded-3xl space-y-5 shadow-2xl relative max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.06)] pb-4">
              <div className="flex items-center space-x-2">
                <Bell className="w-4 h-4 text-[#bfa5ff]" />
                <h3 className="text-sm font-bold tracking-tight text-[#f5f4f8] uppercase">
                  NOTIFICATIONS // INBOX
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[9px] bg-[#7a4ee0] text-white rounded-full font-bold font-mono">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNotificationDrawer(false)}
                className="p-1 rounded-full text-[#8b8899] hover:text-white hover:bg-[#1e1a2c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Global Actions */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex space-x-2">
                <button
                  onClick={() => setNotificationFilter('all')}
                  className={`px-3 py-1 text-[10px] font-mono uppercase rounded-full transition ${
                    notificationFilter === 'all'
                      ? 'bg-[#1e1a2c] text-[#f5f4f8] font-bold border border-[rgba(191,165,255,0.3)]'
                      : 'border border-[rgba(255,255,255,0.06)] text-[#8b8899] hover:text-white'
                  }`}
                >
                  ALL ({notifications.length})
                </button>
                <button
                  onClick={() => setNotificationFilter('unread')}
                  className={`px-3 py-1 text-[10px] font-mono uppercase rounded-full transition ${
                    notificationFilter === 'unread'
                      ? 'bg-[#1e1a2c] text-[#f5f4f8] font-bold border border-[rgba(191,165,255,0.3)]'
                      : 'border border-[rgba(255,255,255,0.06)] text-[#8b8899] hover:text-white'
                  }`}
                >
                  UNREAD ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllNotifsRead}
                  className="text-[10px] text-[#bfa5ff] hover:text-white flex items-center space-x-1 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all as read</span>
                </button>
              )}
            </div>

            {/* Notifications Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-[rgba(255,255,255,0.04)]">
              {notifications
                .filter(n => notificationFilter === 'all' || !n.isRead)
                .map((notif) => (
                  <div
                    key={notif.id}
                    className={`pt-3 first:pt-0 space-y-2 rounded-2xl ${!notif.isRead ? 'bg-[#181424]/40 p-3 border border-[rgba(191,165,255,0.2)]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {!notif.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a] flex-shrink-0"></span>
                        )}
                        <span className="text-[9px] px-2 py-0.5 font-mono uppercase bg-[#1e1a2c] text-[#bfa5ff] rounded-full border border-[rgba(191,165,255,0.2)]">
                          {notif.type}
                        </span>
                        <h4 className="text-xs font-bold text-[#f5f4f8]">{notif.title}</h4>
                      </div>
                      <span className="text-[9px] text-[#8b8899] font-mono flex-shrink-0">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-[#c5c3d0] leading-relaxed pl-3.5 font-sans">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 pl-3.5 text-[10px] font-mono text-[#8b8899]">
                      {notif.link ? (
                        <button
                          onClick={() => {
                            setShowNotificationDrawer(false);
                            if (notif.link.includes('announcements')) setActiveTab('announcements');
                            if (notif.link.includes('matchmaking')) setActiveTab('hackers');
                          }}
                          className="text-[#bfa5ff] hover:underline flex items-center space-x-1"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      ) : <span></span>}

                      <div className="flex items-center space-x-3">
                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkNotifRead(notif.id)}
                            className="hover:text-[#9eea9a] transition"
                            title="Mark as read"
                          >
                            Mark read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteNotif(notif.id)}
                          className="hover:text-rose-400 transition"
                          title="Dismiss notification"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

              {notifications.filter(n => notificationFilter === 'all' || !n.isRead).length === 0 && (
                <div className="p-8 ambient-card rounded-2xl text-center text-xs text-[#8b8899]">
                  Zero notifications to display.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal with Quick Demo Accounts */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-[#070609]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ambient-card p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
              <h3 className="text-base font-bold text-[#f5f4f8] flex items-center space-x-2 tracking-tight uppercase">
                <LogIn className="w-4 h-4 text-[#bfa5ff]" />
                <span>SIGN IN TO DOGFOOD 2026</span>
              </h3>
              <button
                onClick={() => setShowAuthModal(false)}
                className="p-1 rounded-full text-[#8b8899] hover:text-white hover:bg-[#1e1a2c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Login Test Accounts */}
            <div className="space-y-2">
              <p className="hud-mono-label">ONE-CLICK DEMO ACCOUNTS:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('organizer@dogfood.test')}
                  className="p-3 bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.3)] rounded-2xl text-left text-xs transition"
                >
                  <p className="font-bold text-[#f5f4f8]">Organizer</p>
                  <p className="text-[10px] text-[#bfa5ff]">Full Control</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('judge1@dogfood.test')}
                  className="p-3 bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.3)] rounded-2xl text-left text-xs transition"
                >
                  <p className="font-bold text-[#f5f4f8]">Judge Elena</p>
                  <p className="text-[10px] text-amber-400">Scoring Queue</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('alice@dogfood.test')}
                  className="p-3 bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.3)] rounded-2xl text-left text-xs transition"
                >
                  <p className="font-bold text-[#f5f4f8]">Alice (Leader)</p>
                  <p className="text-[10px] text-[#9eea9a]">Team Alpha</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin('bob@dogfood.test')}
                  className="p-3 bg-[#0c0b12] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(191,165,255,0.3)] rounded-2xl text-left text-xs transition"
                >
                  <p className="font-bold text-[#f5f4f8]">Bob (Hacker)</p>
                  <p className="text-[10px] text-[#9eea9a]">Participant</p>
                </button>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-[rgba(255,255,255,0.06)]"></div>
              <span className="flex-shrink mx-3 text-[9px] font-mono text-[#8b8899] uppercase tracking-wider">OR EMAIL</span>
              <div className="flex-grow border-t border-[rgba(255,255,255,0.06)]"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[11px] text-[#c5c3d0] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                />
              </div>

              <div>
                <label className="block text-[11px] text-[#c5c3d0] mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                />
              </div>

              {authError && (
                <p className="text-xs text-rose-400 font-mono">{authError}</p>
              )}

              <button
                type="submit"
                className="pill-cta w-full py-3 text-xs font-bold tracking-wider uppercase"
              >
                SIGN IN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Peer Skill Endorsement Modal (Phase 21) */}
      {endorseModalUser && (
        <div className="fixed inset-0 z-50 bg-[#070609]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="ambient-card p-8 rounded-3xl max-w-md w-full space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[rgba(255,255,255,0.06)] pb-4">
              <div>
                <span className="hud-mono-label text-[#bfa5ff]">TRUST GRAPH & REPUTATION</span>
                <h3 className="text-base font-bold text-[#f5f4f8] tracking-tight">
                  ENDORSE {endorseModalUser.name.toUpperCase()}
                </h3>
              </div>
              <button
                onClick={() => setEndorseModalUser(null)}
                className="p-1 rounded-full text-[#8b8899] hover:text-white hover:bg-[#1e1a2c]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEndorseUser} className="space-y-4">
              <div>
                <label className="block text-[11px] text-[#c5c3d0] mb-1 font-mono">Skill or Competency</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. React, Rust, Distributed Systems"
                  value={endorseSkill}
                  onChange={(e) => setEndorseSkill(e.target.value)}
                  className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0]"
                />
              </div>

              {/* Quick skill select suggestions from hacker's profile */}
              {endorseModalUser.skills && endorseModalUser.skills.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-[#8b8899] font-mono">Suggested from builder profile:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {endorseModalUser.skills.map((s, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setEndorseSkill(s)}
                        className={`px-2.5 py-0.5 text-[9px] font-mono rounded-full border transition ${
                          endorseSkill === s
                            ? 'border-[#7a4ee0] bg-[#7a4ee0]/20 text-[#bfa5ff]'
                            : 'border-[rgba(255,255,255,0.08)] text-[#8b8899] hover:text-[#f5f4f8]'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-[#c5c3d0] mb-1 font-mono">Endorsement Rationale (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Explain why you vouch for this builder's technical execution..."
                  value={endorseComment}
                  onChange={(e) => setEndorseComment(e.target.value)}
                  className="w-full bg-[#070609] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-2.5 text-xs text-[#f5f4f8] outline-none focus:border-[#7a4ee0] resize-none font-sans"
                />
              </div>

              <div className="p-3 rounded-2xl bg-[#13111b] border border-[rgba(191,165,255,0.15)] flex items-center space-x-2 text-[10px] font-mono text-[#bfa5ff]">
                <ShieldCheck className="w-4 h-4 text-[#9eea9a] flex-shrink-0" />
                <span>Awards +15 reputation points to recipient. Irreversible on-chain record.</span>
              </div>

              <button
                type="submit"
                className="pill-cta w-full py-3 text-xs font-bold tracking-wider uppercase"
              >
                CONFIRM ENDORSEMENT (+15 PTS)
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Minimalist Atmospheric Footer (Dogfood_Design_Reference.md) */}
      <footer className="border-t border-[rgba(255,255,255,0.06)] py-6 px-8 flex flex-col sm:flex-row justify-between items-center text-[10px] font-mono text-[#8b8899] bg-[#070609] gap-4">
        <div className="flex items-center space-x-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#9eea9a]"></span>
          <span>DOGFOOD 2026 // NEXERA ARCHITECTURE</span>
        </div>
        <span>100% OFFLINE-FIRST // ZERO EXTERNAL RUNTIME DEPENDENCIES</span>
      </footer>
    </div>
  );
}
