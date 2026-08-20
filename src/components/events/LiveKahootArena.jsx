import React, { useState, useEffect, useMemo } from 'react';
import {
  Gamepad2,
  Trophy,
  Users,
  Timer,
  Play,
  RotateCcw,
  Lock,
  Sparkles,
  CheckCircle2,
  XCircle,
  Zap,
  ShieldCheck,
  Crown,
  Clock,
  Radio,
  HelpCircle,
  Target,
  BarChart2,
  Check,
  Plus,
  Trash2,
  Vote,
  Flame,
  Swords,
  Layers,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Card } from '../ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';

const KAHOOT_COLORS = [
  {
    bg: 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700',
    selectedBg: 'bg-rose-600 ring-4 ring-white shadow-2xl scale-[1.02]',
    border: 'border-rose-400/50',
    text: 'text-rose-100',
    icon: '🔺',
    name: 'Red Triangle',
    glow: 'shadow-rose-600/30',
    barColor: 'bg-rose-500',
  },
  {
    bg: 'bg-blue-600 hover:bg-blue-500 active:bg-blue-700',
    selectedBg: 'bg-blue-600 ring-4 ring-white shadow-2xl scale-[1.02]',
    border: 'border-blue-400/50',
    text: 'text-blue-100',
    icon: '🔷',
    name: 'Blue Diamond',
    glow: 'shadow-blue-600/30',
    barColor: 'bg-blue-500',
  },
  {
    bg: 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600',
    selectedBg: 'bg-amber-500 ring-4 ring-white shadow-2xl scale-[1.02]',
    border: 'border-amber-300/50',
    text: 'text-amber-950 font-black',
    icon: '🟡',
    name: 'Yellow Circle',
    glow: 'shadow-amber-500/30',
    barColor: 'bg-amber-400',
  },
  {
    bg: 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700',
    selectedBg: 'bg-emerald-600 ring-4 ring-white shadow-2xl scale-[1.02]',
    border: 'border-emerald-400/50',
    text: 'text-emerald-100',
    icon: '🟩',
    name: 'Green Square',
    glow: 'shadow-emerald-600/30',
    barColor: 'bg-emerald-500',
  },
  {
    bg: 'bg-purple-600 hover:bg-purple-500 active:bg-purple-700',
    selectedBg: 'bg-purple-600 ring-4 ring-white shadow-2xl scale-[1.02]',
    border: 'border-purple-400/50',
    text: 'text-purple-100',
    icon: '⭐',
    name: 'Purple Star',
    glow: 'shadow-purple-600/30',
    barColor: 'bg-purple-500',
  },
  {
    bg: 'bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700',
    selectedBg: 'bg-cyan-600 ring-4 ring-white shadow-2xl scale-[1.02]',
    border: 'border-cyan-400/50',
    text: 'text-cyan-100',
    icon: '⬡',
    name: 'Cyan Hexagon',
    glow: 'shadow-cyan-600/30',
    barColor: 'bg-cyan-500',
  },
];

const PRESET_QUESTIONS = [
  {
    title: 'Framework Battle (Quiz)',
    gameMode: 'quiz',
    question: 'Which framework dominates production AI model fine-tuning & inference in 2026?',
    options: ['PyTorch 2.x', 'TensorFlow / Keras', 'JAX / Flax', 'ONNX Runtime'],
    correctOptionIndex: 0,
  },
  {
    title: 'CUDA vs ROCm (2-Option Battle)',
    gameMode: 'poll',
    question: 'NVIDIA CUDA vs AMD ROCm: Which ecosystem will capture more enterprise AI inference market share by 2027?',
    options: ['Option A: NVIDIA (CUDA / TensorRT)', 'Option B: AMD (ROCm / Instinct)'],
    correctOptionIndex: null,
  },
  {
    title: 'LLM Deployment (3-Option Poll)',
    gameMode: 'poll',
    question: 'What is your company’s primary deployment strategy for LLMs?',
    options: ['Cloud Managed APIs (OpenAI / Anthropic)', 'Self-Hosted Inference (vLLM / Triton)', 'Local / On-Device (Ollama / MLX)'],
    correctOptionIndex: null,
  },
  {
    title: 'Hardware Trivia (Quiz)',
    gameMode: 'quiz',
    question: 'In modern GPU architectures, which specialized core accelerates Matrix Multiply-Accumulate (MMA)?',
    options: ['Tensor Cores', 'Streaming Multiprocessors (SM)', 'Ray Tracing (RT) Cores', 'Texture Units (TMU)'],
    correctOptionIndex: 0,
  },
  {
    title: 'Attention Speed (True/False)',
    gameMode: 'true_false',
    question: 'Standard multi-head self-attention has quadratic O(N²) computational complexity with respect to token sequence length.',
    options: ['True (Quadratic O(N²))', 'False (Linear O(N))'],
    correctOptionIndex: 0,
  },
];

export const LiveKahootArena = ({ eventId, eventTitle }) => {
  const { user } = useAuth();
  const { addNotification } = useNotification();
  const queryClient = useQueryClient();

  // Role detection: Event Organiser, Super Admin, and Speaker act as Hosts
  const isHost = Boolean(
    user?.isSuperAdmin ||
    user?.isOrganiser ||
    user?.role === 'EventOrganiser' ||
    user?.role === 'SuperAdmin' ||
    user?.role === 'Speaker'
  );

  const personId = user?.idPerson || user?.id || user?.email || 'anon-voter';

  // Unique session-scoped voter identifier for cross-tab and multi-device isolation
  const voterId = useMemo(() => {
    let vid = sessionStorage.getItem(`eventhub_voter_session_${eventId}`);
    if (!vid) {
      const uId = user?.idPerson || user?.id || user?.email || 'user';
      vid = `${uId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      sessionStorage.setItem(`eventhub_voter_session_${eventId}`, vid);
    }
    return vid;
  }, [user, eventId]);

  // Game Mode State: 'quiz' (1 correct answer), 'poll' (opinion breakdown, A vs B or 3+), 'true_false' (2 choices)
  const [gameMode, setGameMode] = useState('quiz');
  const [questionText, setQuestionText] = useState('Which framework dominates production AI model fine-tuning & inference in 2026?');
  const [options, setOptions] = useState([
    'PyTorch 2.x',
    'TensorFlow / Keras',
    'JAX / Flax',
    'ONNX Runtime',
  ]);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0); // 0..5 or null
  const [timerSeconds, setTimerSeconds] = useState(45);
  const [timeLeft, setTimeLeft] = useState(45);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [selectedVoteIndex, setSelectedVoteIndex] = useState(null);

  // 1. Fetch Active Poll for this Event (with automatic 1.5s real-time polling)
  const { data: pollData, isLoading, refetch } = useQuery({
    queryKey: ['livePoll', eventId],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.LIVE_POLL.BY_EVENT(eventId));
        if (res.data && res.data.question) {
          localStorage.setItem(`eventhub_live_poll_${eventId}`, JSON.stringify(res.data));
          return res.data;
        }
      } catch {
        // Fallback to local storage
      }

      const localRaw = localStorage.getItem(`eventhub_live_poll_${eventId}`);
      if (localRaw) {
        try {
          return JSON.parse(localRaw);
        } catch {
          return null;
        }
      }
      return null;
    },
    refetchInterval: 1500, // 1.5s real-time sync across all clients
  });

  // Cross-tab real-time sync listener
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === `eventhub_live_poll_${eventId}` || e.key === 'eventhub_poll_sync') {
        refetch();
        queryClient.invalidateQueries({ queryKey: ['livePoll', eventId] });
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [eventId, refetch, queryClient]);

  // Sync user's cast vote for THIS specific poll (isolated per tab session)
  useEffect(() => {
    if (!pollData?.id) {
      setSelectedVoteIndex(null);
      return;
    }

    const myVote = sessionStorage.getItem(`eventhub_voted_${eventId}_${pollData.id}`);
    if (myVote !== null && myVote !== undefined) {
      setSelectedVoteIndex(Number(myVote));
    } else if (pollData.voters && pollData.voters[voterId] !== undefined) {
      setSelectedVoteIndex(Number(pollData.voters[voterId]));
    } else {
      setSelectedVoteIndex(null);
    }
  }, [pollData?.id, pollData?.startedAt, voterId, eventId]);

  // Handle Game Mode change in Question Builder
  const handleSelectGameMode = (mode) => {
    setGameMode(mode);
    if (mode === 'true_false') {
      setOptions(['True', 'False']);
      setCorrectOptionIndex(0);
    } else if (mode === 'poll') {
      if (options.length < 2) setOptions(['Option A: Agree', 'Option B: Disagree']);
      setCorrectOptionIndex(null);
    } else if (mode === 'quiz') {
      if (options.length < 2) setOptions(['Choice 1', 'Choice 2', 'Choice 3', 'Choice 4']);
      if (correctOptionIndex === null) setCorrectOptionIndex(0);
    }
  };

  // Add Option (up to 6 options)
  const handleAddOption = () => {
    if (options.length >= 6) return;
    const nextIdx = options.length + 1;
    setOptions([...options, `Choice ${nextIdx}`]);
  };

  // Remove Option (minimum 2 options)
  const handleRemoveOption = (indexToRemove) => {
    if (options.length <= 2) return;
    const next = options.filter((_, idx) => idx !== indexToRemove);
    setOptions(next);
    if (correctOptionIndex === indexToRemove) {
      setCorrectOptionIndex(0);
    } else if (correctOptionIndex > indexToRemove) {
      setCorrectOptionIndex(correctOptionIndex - 1);
    }
  };

  // 2. Create Poll Mutation
  const createPollMutation = useMutation({
    mutationFn: async (payload) => {
      const initialVotes = {};
      payload.options.forEach((_, idx) => {
        initialVotes[idx] = 0;
      });

      const now = Date.now();
      const dur = payload.durationSeconds || 45;
      const expTime = now + dur * 1000;

      const newPoll = {
        id: now,
        idEvent: parseInt(eventId, 10),
        gameMode: payload.gameMode || 'quiz',
        question: payload.question,
        options: payload.options,
        correctOptionIndex: payload.correctOptionIndex !== undefined ? payload.correctOptionIndex : null,
        durationSeconds: dur,
        isActive: true,
        startedAt: now,
        expiresAt: expTime,
        votes: initialVotes,
        totalVotes: 0,
        voters: {},
      };

      try {
        const res = await axiosClient.post(ENDPOINTS.LIVE_POLL.CREATE, payload);
        const saved = res.data?.id ? { ...newPoll, ...res.data, startedAt: now, expiresAt: expTime } : newPoll;
        localStorage.setItem(`eventhub_live_poll_${eventId}`, JSON.stringify(saved));
        localStorage.setItem('eventhub_poll_sync', String(Date.now()));
        return saved;
      } catch {
        localStorage.setItem(`eventhub_live_poll_${eventId}`, JSON.stringify(newPoll));
        localStorage.setItem('eventhub_poll_sync', String(Date.now()));
        return newPoll;
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['livePoll', eventId] });
      setTimeLeft(data.durationSeconds || timerSeconds);
      setIsTimerRunning(true);
      setSelectedVoteIndex(null);
      addNotification({
        type: 'success',
        title: 'Live Arena Launched! 🚀',
        message: 'The question is live for attendees to lock in their answers.',
      });
    },
  });

  // 3. Vote Mutation
  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionIndex, currentVoterId }) => {
      try {
        await axiosClient.post(ENDPOINTS.LIVE_POLL.VOTE, {
          pollId,
          personId: user?.idPerson || user?.id || 1,
          optionIndex,
        });
      } catch {
        // Fallback to local vote tracking
      }

      const localRaw = localStorage.getItem(`eventhub_live_poll_${eventId}`);
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (!parsed.votes) parsed.votes = {};
          parsed.votes[optionIndex] = (parsed.votes[optionIndex] || 0) + 1;
          parsed.totalVotes = (parsed.totalVotes || 0) + 1;
          if (!parsed.voters) parsed.voters = {};
          parsed.voters[currentVoterId] = optionIndex;
          localStorage.setItem(`eventhub_live_poll_${eventId}`, JSON.stringify(parsed));
          localStorage.setItem('eventhub_poll_sync', String(Date.now()));
          return parsed;
        } catch {
          // ignore
        }
      }
      return { success: true };
    },
    onSuccess: (data, variables) => {
      setSelectedVoteIndex(variables.optionIndex);
      sessionStorage.setItem(`eventhub_voted_${eventId}_${variables.pollId}`, String(variables.optionIndex));
      queryClient.invalidateQueries({ queryKey: ['livePoll', eventId] });
      addNotification({
        type: 'success',
        title: 'Answer Locked In! 🗳️',
        message: `Your choice has been registered. Results will reveal when voting ends!`,
      });
    },
  });

  // 4. Close Poll Mutation (End voting and reveal results to everyone)
  const closePollMutation = useMutation({
    mutationFn: async (pollId) => {
      try {
        await axiosClient.post(ENDPOINTS.LIVE_POLL.CLOSE(pollId));
      } catch {
        // ignore
      }

      const localRaw = localStorage.getItem(`eventhub_live_poll_${eventId}`);
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          parsed.isActive = false;
          localStorage.setItem(`eventhub_live_poll_${eventId}`, JSON.stringify(parsed));
          localStorage.setItem('eventhub_poll_sync', String(Date.now()));
          return parsed;
        } catch {
          // ignore
        }
      }
      return { isActive: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['livePoll', eventId] });
      setIsTimerRunning(false);
      setTimeLeft(0);
      addNotification({
        type: 'info',
        title: 'Poll Closed 🔒',
        message: 'Voting has ended. Final results and breakdown are now revealed!',
      });
    },
  });

  // Universal Synchronized Timer Effect (Absolute Clock - No Background Tab Drift)
  useEffect(() => {
    if (!pollData || !pollData.isActive) {
      setTimeLeft(0);
      setIsTimerRunning(false);
      return;
    }

    const calcRemaining = () => {
      const now = Date.now();
      const startTime = typeof pollData.startedAt === 'number'
        ? pollData.startedAt
        : (pollData.startedAt ? new Date(pollData.startedAt).getTime() : now);
      const dur = Number(pollData.durationSeconds || 45);
      const expTime = pollData.expiresAt ? Number(pollData.expiresAt) : (startTime + dur * 1000);

      const remainingMs = Math.max(0, expTime - now);
      const remainingSec = Math.ceil(remainingMs / 1000);

      setTimeLeft(remainingSec);
      setIsTimerRunning(remainingSec > 0);

      if (remainingSec <= 0 && pollData.isActive) {
        if (isHost && !closePollMutation.isPending) {
          closePollMutation.mutate(pollData.id);
        }
      }
    };

    calcRemaining();
    const interval = setInterval(calcRemaining, 250);
    return () => clearInterval(interval);
  }, [pollData?.id, pollData?.startedAt, pollData?.expiresAt, pollData?.durationSeconds, pollData?.isActive, isHost]);

  // Handle Preset Question Selection
  const handleApplyPreset = (preset) => {
    setGameMode(preset.gameMode || (preset.correctOptionIndex !== null ? 'quiz' : 'poll'));
    setQuestionText(preset.question);
    setOptions(preset.options);
    setCorrectOptionIndex(preset.correctOptionIndex !== undefined ? preset.correctOptionIndex : null);
  };

  // Handle Launch Poll (Host Action)
  const handleLaunchPoll = (e) => {
    e?.preventDefault();
    const validOptions = options.filter((opt) => opt.trim().length > 0);
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options for the poll.');
      return;
    }

    createPollMutation.mutate({
      idEvent: parseInt(eventId, 10),
      gameMode: gameMode,
      question: questionText.trim(),
      options: validOptions,
      correctOptionIndex: gameMode === 'poll' ? null : correctOptionIndex,
      durationSeconds: timerSeconds,
      isActive: true,
    });
  };

  // Handle Cast Vote (Participant Action)
  const handleCastVote = (optIdx) => {
    if (!pollData?.id || !pollData.isActive || timeLeft <= 0) return;
    if (selectedVoteIndex !== null) return; // Prevent double voting

    // Instant optimistic local update
    setSelectedVoteIndex(optIdx);
    sessionStorage.setItem(`eventhub_voted_${eventId}_${pollData.id}`, String(optIdx));

    voteMutation.mutate({
      pollId: pollData.id,
      optionIndex: optIdx,
      currentVoterId: voterId,
    });
  };

  // Total Votes & Statistics
  const totalVotes = useMemo(() => {
    if (pollData?.totalVotes !== undefined && pollData?.totalVotes !== null) {
      return pollData.totalVotes;
    }
    if (pollData?.votes) {
      return Object.values(pollData.votes).reduce((a, b) => Number(a || 0) + Number(b || 0), 0);
    }
    return 0;
  }, [pollData]);

  // Calculate highest vote count for winning option badge
  const winningInfo = useMemo(() => {
    if (!pollData?.options || totalVotes === 0) return { maxVotes: 0, winningIndex: -1 };
    let max = -1;
    let winIdx = -1;
    pollData.options.forEach((opt, idx) => {
      const count = Number(pollData.votes?.[idx] || pollData.votes?.[opt] || 0);
      if (count > max) {
        max = count;
        winIdx = idx;
      }
    });
    return { maxVotes: max, winningIndex: winIdx };
  }, [pollData, totalVotes]);

  // Poll state checks
  const isPollActive = Boolean(pollData?.question && pollData?.isActive && timeLeft > 0);
  const isPollClosed = Boolean(pollData?.question && (!pollData?.isActive || timeLeft <= 0));
  const hasVoted = selectedVoteIndex !== null;
  const hasCorrectAnswer = pollData?.correctOptionIndex !== null && pollData?.correctOptionIndex !== undefined;
  const isUserCorrect = hasCorrectAnswer && selectedVoteIndex === pollData.correctOptionIndex;
  const activeGameMode = pollData?.gameMode || (hasCorrectAnswer ? 'quiz' : 'poll');

  return (
    <div className="space-y-6">
      {/* ── ARENA HERO BANNER ──────────────────────────────────────────────── */}
      <Card className="cst-hero-gradient p-6 md:p-8 rounded-3xl border-[var(--border-default)] shadow-2xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-500/40 rounded-full text-amber-300 text-[10px] font-black uppercase tracking-widest">
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Interactive Live Poll &amp; Kahoot Arena</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              {eventTitle ? `Live Arena: ${eventTitle}` : 'Interactive Event Arena'}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {isHost
                ? 'Organiser Control Room: Choose from Trivia Quizzes, Audience Opinion Polls (A vs B or 3+), and True/False speed challenges.'
                : 'Participant Arena: Pick your answer on the colorful cards. Results reveal once time expires or host closes the poll!'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Countdown Timer */}
            <div className="p-3.5 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl text-center min-w-[95px] shadow-lg">
              <span className="text-[10px] font-bold uppercase text-amber-400 block flex items-center justify-center gap-1">
                <Timer className="w-3 h-3" /> Timer
              </span>
              <span className={`text-2xl font-black font-mono ${
                timeLeft <= 10 && isPollActive ? 'text-red-400 animate-pulse' : isPollActive ? 'text-emerald-300' : 'text-slate-400'
              }`}>
                {isPollActive ? `${timeLeft}s` : '0s'}
              </span>
            </div>

            {/* Total Votes Count */}
            <div className="p-3.5 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl text-center min-w-[95px] shadow-lg">
              <span className="text-[10px] font-bold uppercase text-sky-400 block flex items-center justify-center gap-1">
                <Users className="w-3 h-3" /> Total Votes
              </span>
              <span className="text-2xl font-black text-sky-300 font-mono">
                {totalVotes}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ── ACTIVE POLL OR RESULTS DISPLAY ─────────────────────────────────── */}
      {pollData && pollData.question ? (
        <div className="space-y-6">
          {/* Question Banner */}
          <div className={`p-6 md:p-8 rounded-3xl text-center shadow-2xl relative overflow-hidden transition-all ${
            isPollActive
              ? 'bg-slate-900 border-2 border-indigo-500/60 ring-2 ring-indigo-500/20'
              : 'bg-slate-900/90 border-2 border-amber-500/40'
          }`}>
            <div className="text-[11px] font-black uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
              {isPollActive ? (
                <span className="text-indigo-400 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                  Live {activeGameMode === 'quiz' ? 'Trivia Quiz 🎯' : activeGameMode === 'true_false' ? 'True / False Challenge ⚡' : 'Audience Opinion Poll 📊'} in Session
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Voting Closed • Final Results
                </span>
              )}
            </div>

            <h2 className="text-xl md:text-2xl font-black text-white leading-snug max-w-3xl mx-auto">
              {pollData.question}
            </h2>

            {/* Status & Feedback Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full font-bold ${
                isPollActive
                  ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}>
                {isPollActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Voting Active ({timeLeft}s left)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Poll Closed</span>
                  </>
                )}
              </span>

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                <span>{pollData.options?.length || 2} Choices</span>
              </span>

              {hasVoted && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-950/70 border border-indigo-500/50 text-indigo-300 font-bold shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>You Selected: {pollData.options?.[selectedVoteIndex] || `Option #${selectedVoteIndex + 1}`}</span>
                </span>
              )}

              {/* Host Secret Correct Answer Pill during voting */}
              {isHost && isPollActive && hasCorrectAnswer && (
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 font-bold">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Host Secret: Correct Answer is Option #{pollData.correctOptionIndex + 1}</span>
                </span>
              )}
            </div>

            {/* Attendee Instruction Alert during Voting */}
            {isPollActive && !isHost && (
              <div className="mt-4 max-w-lg mx-auto p-2.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center justify-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>
                  {hasVoted
                    ? 'Your answer is registered! Results & breakdown reveal once countdown ends.'
                    : 'Tap your choice below before the timer runs out!'}
                </span>
              </div>
            )}

            {/* Post-Poll Participant Score Celebration Banner */}
            {isPollClosed && !isHost && hasVoted && hasCorrectAnswer && (
              <div className="mt-5 max-w-md mx-auto">
                {isUserCorrect ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-950/80 border-2 border-emerald-500 text-emerald-200 text-xs font-black shadow-lg flex items-center justify-center gap-2 animate-bounce">
                    <Trophy className="w-5 h-5 text-amber-300" />
                    <span>GENIUS! You nailed the correct answer! +1,000 Pts 🏆</span>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-rose-950/80 border-2 border-rose-500/60 text-rose-200 text-xs font-bold shadow-lg flex items-center justify-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Good effort! The correct answer was: {pollData.options?.[pollData.correctOptionIndex]}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── DYNAMIC KAHOOT ACTION / RESULTS GRID (2 to 6 Choices) ─────── */}
          <div className={`grid gap-4 ${
            (pollData.options?.length || 4) === 2
              ? 'grid-cols-1 sm:grid-cols-2'
              : (pollData.options?.length || 4) === 3
              ? 'grid-cols-1 sm:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2'
          }`}>
            {(pollData.options || []).map((optionText, idx) => {
              const color = KAHOOT_COLORS[idx % KAHOOT_COLORS.length];
              const isSelected = selectedVoteIndex === idx;
              const voteCount = Number(pollData.votes?.[idx] || pollData.votes?.[optionText] || 0);
              const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
              const isCorrectAnswer = isPollClosed && hasCorrectAnswer && pollData.correctOptionIndex === idx;
              const isWinningOption = isPollClosed && !hasCorrectAnswer && winningInfo.winningIndex === idx && winningInfo.maxVotes > 0;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleCastVote(idx)}
                  disabled={!isPollActive || hasVoted || voteMutation.isPending}
                  className={`p-6 rounded-3xl border-2 transition-all transform text-left relative overflow-hidden shadow-xl ${
                    isSelected ? color.selectedBg : `${color.bg} ${color.border} ${color.glow}`
                  } ${
                    isPollActive && !hasVoted
                      ? 'cursor-pointer hover:scale-[1.02] active:scale-95'
                      : isPollActive && hasVoted
                      ? 'cursor-default opacity-85'
                      : 'cursor-default'
                  } ${
                    isCorrectAnswer
                      ? 'ring-4 ring-emerald-400 shadow-emerald-500/40 shadow-2xl scale-[1.01]'
                      : isWinningOption
                      ? 'ring-4 ring-amber-400 shadow-amber-500/30 shadow-2xl'
                      : ''
                  }`}
                >
                  {/* Top Badge Indicators (Correct Answer / Winner / Voted) */}
                  <div className="flex items-center justify-between gap-2 mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-3xl drop-shadow-md">{color.icon}</span>
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider opacity-80 text-white">
                        {color.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isCorrectAnswer && (
                        <span className="px-3 py-1 rounded-full bg-emerald-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg animate-pulse">
                          <Target className="w-3.5 h-3.5" /> Correct Answer ✅
                        </span>
                      )}
                      {isWinningOption && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-lg animate-bounce">
                          <Crown className="w-3 h-3" /> Most Popular Choice
                        </span>
                      )}
                      {isSelected && (
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md ${
                          isCorrectAnswer
                            ? 'bg-emerald-300 text-slate-950'
                            : isPollClosed && hasCorrectAnswer
                            ? 'bg-rose-200 text-rose-950'
                            : 'bg-white text-slate-950'
                        }`}>
                          {isCorrectAnswer ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Your Choice (Correct!)
                            </>
                          ) : isPollClosed && hasCorrectAnswer ? (
                            <>
                              <XCircle className="w-3 h-3 text-rose-700" /> Your Choice
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Your Choice
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Option Text */}
                  <div className="relative z-10">
                    <h3 className={`text-base md:text-lg font-black ${color.text} leading-tight`}>
                      {optionText}
                    </h3>
                  </div>

                  {/* ── RESULTS BREAKDOWN (Shown when poll is closed OR to Host) ── */}
                  {(isPollClosed || (isHost && isPollActive)) && (
                    <div className="mt-4 pt-3 border-t border-white/20 relative z-10 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 opacity-80" />
                          <span>{voteCount} {voteCount === 1 ? 'vote' : 'votes'}</span>
                        </span>
                        <span className="font-mono text-sm font-black">{percentage}%</span>
                      </div>

                      {/* Animated Progress Bar Fill */}
                      <div className="w-full h-2 rounded-full bg-black/30 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-1000 ease-out rounded-full ${
                            isCorrectAnswer ? 'bg-emerald-300' : 'bg-white'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Ambient Progress Fill on Button */}
                  {isPollClosed && (
                    <div
                      className="absolute left-0 bottom-0 top-0 bg-black/25 transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ── HOST CONTROL BAR (For Event Organiser & SuperAdmin) ────────────── */}
          {isHost && (
            <Card className="p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl flex flex-wrap items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-slate-300">Host Controls (Event Organiser)</span>
              </div>

              <div className="flex items-center gap-2">
                {isPollActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => closePollMutation.mutate(pollData.id)}
                    disabled={closePollMutation.isPending}
                    className="text-xs border-red-500/40 text-red-400 hover:bg-red-950/40 font-bold cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1" /> Lock &amp; Show Results
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    setTimeLeft(timerSeconds);
                    handleLaunchPoll();
                  }}
                  disabled={createPollMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset / Launch New Question
                </Button>
              </div>
            </Card>
          )}
        </div>
      ) : (
        /* ── EMPTY / WAITING LOBBY STATE ──────────────────────────────────── */
        <Card className="p-10 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl text-center space-y-4 shadow-xl">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-lg">
            <Trophy className="w-10 h-10" />
          </div>
          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-black text-white">
              {isHost ? 'Launch a Live Question / Poll' : 'Kahoot Live Arena Lobby'}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {isHost
                ? 'Select a game mode below (Trivia Quiz, Opinion Poll A/B/C, or True/False) and launch the session for your attendees.'
                : 'Waiting for the Event Organiser to launch the next live question... Get ready to pick your answer!'}
            </p>
          </div>

          {!isHost && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-bold animate-pulse">
              <Radio className="w-3.5 h-3.5 text-indigo-400" />
              <span>Live Arena Connected • Ready for question</span>
            </div>
          )}
        </Card>
      )}

      {/* ── HOST QUESTION BUILDER PANEL (Only visible to Event Organiser / SuperAdmin) ── */}
      {isHost && (
        <Card className="p-6 md:p-8 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-2xl space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Event Organiser Question Builder</h3>
            </div>
            <span className="text-[10px] text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-1 rounded-full font-mono font-bold">
              Organiser Exclusive
            </span>
          </div>

          {/* 1. Game Mode Selector Cards */}
          <div>
            <Label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2.5 block">
              Step 1: Choose Game Mode
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Mode A: Trivia Quiz */}
              <button
                type="button"
                onClick={() => handleSelectGameMode('quiz')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  gameMode === 'quiz'
                    ? 'bg-indigo-950/60 border-indigo-500 ring-2 ring-indigo-500/40 shadow-lg'
                    : 'bg-[var(--surface-800)] border-[var(--border-default)] hover:border-indigo-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">🎯</span>
                  {gameMode === 'quiz' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Trivia Quiz</h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Multiple choices with 1 correct answer &amp; competitive scoring.
                  </p>
                </div>
              </button>

              {/* Mode B: Opinion Poll / A vs B */}
              <button
                type="button"
                onClick={() => handleSelectGameMode('poll')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  gameMode === 'poll'
                    ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/40 shadow-lg'
                    : 'bg-[var(--surface-800)] border-[var(--border-default)] hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">📊</span>
                  {gameMode === 'poll' && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">Audience Opinion Poll</h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Agree/Disagree (A vs B) or 3+ options to measure consensus.
                  </p>
                </div>
              </button>

              {/* Mode C: True / False */}
              <button
                type="button"
                onClick={() => handleSelectGameMode('true_false')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                  gameMode === 'true_false'
                    ? 'bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40 shadow-lg'
                    : 'bg-[var(--surface-800)] border-[var(--border-default)] hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">⚡</span>
                  {gameMode === 'true_false' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">True / False Duel</h4>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                    Fast 2-choice fact check with 1 correct answer.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Preset Suggestions */}
          <div>
            <Label className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 block">
              Quick AI &amp; Tech Presets
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {PRESET_QUESTIONS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className="p-3 rounded-2xl bg-[var(--surface-800)] border border-[var(--border-default)] hover:border-indigo-500/60 text-left text-xs text-slate-200 transition-all cursor-pointer truncate hover:bg-[var(--surface-850)]"
                  title={p.question}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-bold text-indigo-300 truncate">{p.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 font-mono">
                      {p.gameMode === 'quiz' ? '🎯 Quiz' : p.gameMode === 'true_false' ? '⚡ T/F' : '📊 Poll'}
                    </span>
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] truncate block">{p.question}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleLaunchPoll} className="space-y-5">
            <div>
              <Label htmlFor="poll-question" className="text-xs font-bold">Question / Poll Prompt *</Label>
              <Input
                id="poll-question"
                required
                placeholder={
                  gameMode === 'poll'
                    ? 'e.g. NVIDIA CUDA vs AMD ROCm: Which ecosystem will dominate AI in 2027?'
                    : gameMode === 'true_false'
                    ? 'e.g. Attention mechanism in transformers has O(N²) quadratic computational complexity.'
                    : 'e.g. Which framework dominates production AI model fine-tuning in 2026?'
                }
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                className="mt-1 text-xs font-semibold"
              />
            </div>

            {/* Mode Guide & Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-[var(--surface-800)] border border-[var(--border-default)] rounded-2xl text-xs">
              <div className="flex items-center gap-2">
                {gameMode === 'quiz' || gameMode === 'true_false' ? (
                  <>
                    <Target className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-slate-300 font-medium">
                      <strong>Mark Correct Answer:</strong> Click <span className="text-emerald-400 font-bold">"Mark as Correct"</span> on the winning choice.
                    </span>
                  </>
                ) : (
                  <>
                    <BarChart2 className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-300 font-medium">
                      <strong>Audience Poll Mode:</strong> No right/wrong answer. Measures percentage of audience consensus.
                    </span>
                  </>
                )}
              </div>

              {/* Dynamic Add Option Button (up to 6 options) */}
              {gameMode !== 'true_false' && (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[var(--text-muted)] font-mono">
                    {options.length}/6 Choices
                  </span>
                  <button
                    type="button"
                    onClick={handleAddOption}
                    disabled={options.length >= 6}
                    className="px-3 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Choice
                  </button>
                </div>
              )}
            </div>

            {/* Variable Option Choices Grid (2 to 6 Options) */}
            <div className={`grid gap-4 ${
              options.length === 2
                ? 'grid-cols-1 sm:grid-cols-2'
                : options.length === 3
                ? 'grid-cols-1 sm:grid-cols-3'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {options.map((opt, idx) => {
                const color = KAHOOT_COLORS[idx % KAHOOT_COLORS.length];
                const isSelectedCorrect = (gameMode === 'quiz' || gameMode === 'true_false') && correctOptionIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isSelectedCorrect
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40'
                        : 'bg-[var(--surface-800)] border-[var(--border-default)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Label htmlFor={`opt-${idx}`} className="text-xs flex items-center gap-1.5 font-bold">
                        <span>{color.icon}</span>
                        <span>Option #{idx + 1} ({color.name}) *</span>
                      </Label>

                      <div className="flex items-center gap-1.5">
                        {/* Mark Correct Button (for Quiz & True/False modes) */}
                        {(gameMode === 'quiz' || gameMode === 'true_false') && (
                          <button
                            type="button"
                            onClick={() => setCorrectOptionIndex(idx)}
                            className={`text-[10px] px-2.5 py-1 rounded-xl font-black transition-all cursor-pointer flex items-center gap-1 ${
                              isSelectedCorrect
                                ? 'bg-emerald-400 text-slate-950 shadow-md font-black'
                                : 'bg-[var(--surface-700)] text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/50 border border-[var(--border-subtle)]'
                            }`}
                          >
                            {isSelectedCorrect ? (
                              <>
                                <Check className="w-3 h-3 stroke-[3]" /> Correct Answer
                              </>
                            ) : (
                              <>
                                <Target className="w-3 h-3" /> Mark Correct
                              </>
                            )}
                          </button>
                        )}

                        {/* Remove Option Button (when > 2 options) */}
                        {gameMode !== 'true_false' && options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
                            title="Remove choice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <Input
                      id={`opt-${idx}`}
                      required
                      placeholder={`Choice ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const next = [...options];
                        next[idx] = e.target.value;
                        setOptions(next);
                      }}
                      className="text-xs"
                    />
                  </div>
                );
              })}
            </div>

            {/* Timer & Launch Action */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[var(--border-subtle)]">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Label htmlFor="timer-select" className="text-xs font-bold whitespace-nowrap flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Countdown Timer:</span>
                </Label>
                <select
                  id="timer-select"
                  value={timerSeconds}
                  onChange={(e) => setTimerSeconds(Number(e.target.value))}
                  className="bg-[var(--surface-800)] border border-[var(--border-default)] text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-bold"
                >
                  <option value={15}>15 Seconds (Fast Duel)</option>
                  <option value={30}>30 Seconds</option>
                  <option value={45}>45 Seconds (Standard)</option>
                  <option value={60}>60 Seconds (1 Min)</option>
                  <option value={120}>120 Seconds (2 Min)</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={createPollMutation.isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 py-2.5 px-6 rounded-2xl cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current text-amber-300" />
                {createPollMutation.isPending
                  ? 'Launching Arena...'
                  : gameMode === 'poll'
                  ? 'Launch Audience Opinion Poll 📊'
                  : 'Launch Live Kahoot Quiz 🚀'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
};

export default LiveKahootArena;
