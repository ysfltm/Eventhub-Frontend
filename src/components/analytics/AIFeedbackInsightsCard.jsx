import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  TrendingUp,
  ThumbsUp,
  AlertTriangle,
  RefreshCw,
  Award,
  CheckCircle2,
  Brain,
  MessageSquareQuote,
  Star,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';

export const AIFeedbackInsightsCard = ({ eventId, eventTitle = 'Selected Event' }) => {
  const {
    data: insights,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['aiFeedbackInsights', eventId],
    queryFn: async () => {
      if (!eventId) return null;
      const res = await axiosClient.get(ENDPOINTS.AI.FEEDBACK_INSIGHTS(eventId));
      return res.data;
    },
    enabled: Boolean(eventId),
  });

  if (!eventId) return null;

  const sentimentColor =
    insights?.sentimentScorePercent >= 80
      ? 'from-emerald-500/20 via-emerald-600/10 to-transparent border-emerald-500/30 text-emerald-400'
      : insights?.sentimentScorePercent >= 60
      ? 'from-blue-500/20 via-blue-600/10 to-transparent border-blue-500/30 text-blue-400'
      : 'from-amber-500/20 via-amber-600/10 to-transparent border-amber-500/30 text-amber-400';

  return (
    <Card className="cst-stagger-2 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl overflow-hidden shadow-2xl relative border-2 border-indigo-500/20">
      {/* Top Gradient Stripe */}
      <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

      <CardHeader className="p-6 pb-4 border-b border-[var(--border-subtle)] flex flex-row items-center justify-between gap-4 bg-[var(--surface-850)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
            <Brain className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-black text-[var(--text-primary)]">
                AI Executive Sentiment &amp; Feedback Analysis
              </CardTitle>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
                Gemini 1.5 Flash
              </span>
            </div>
            <CardDescription className="text-xs text-[var(--text-secondary)]">
              Real-time semantic sentiment extraction across verified attendee reviews for &ldquo;{eventTitle}&rdquo;.
            </CardDescription>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Re-Analyze</span>
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {isLoading ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-[var(--text-secondary)]">Gemini 1.5 Flash is analyzing feedback reviews...</p>
          </div>
        ) : !insights ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            Select an event with feedback reviews to generate AI insights.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Score Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-2xl bg-gradient-to-br border ${sentimentColor} flex items-center gap-4`}>
                <div className="w-12 h-12 rounded-xl bg-slate-900/60 flex items-center justify-center font-black text-xl shrink-0">
                  {insights.sentimentScorePercent}%
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">Sentiment Score</span>
                  <span className="text-sm font-black tracking-tight">{insights.sentimentLabel}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-800)] border border-[var(--border-subtle)] flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900/60 flex items-center justify-center text-amber-400 shrink-0">
                  <Star className="w-6 h-6 fill-amber-400" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Avg Review Rating</span>
                  <span className="text-base font-black text-[var(--text-primary)]">{insights.averageRating} / 5.0</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-[var(--surface-800)] border border-[var(--border-subtle)] flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-slate-900/60 flex items-center justify-center text-[var(--cst-blue-400)] shrink-0">
                  <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">Total Analyzed</span>
                  <span className="text-base font-black text-[var(--text-primary)]">{insights.totalReviewsAnalyzed} Attendee Reviews</span>
                </div>
              </div>
            </div>

            {/* Executive Summary Paragraph */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Executive Summary Briefing
              </span>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed bg-[var(--surface-950)] p-4 rounded-2xl border border-[var(--border-subtle)]">
                {insights.executiveSummary}
              </p>
            </div>

            {/* Strengths & Actionable Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Top Strengths */}
              <div className="p-4 rounded-2xl bg-[var(--surface-950)] border border-[var(--border-subtle)] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Key Strengths &amp; Praise
                </span>
                <ul className="space-y-1.5">
                  {insights.topStrengths && insights.topStrengths.length > 0 ? (
                    insights.topStrengths.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-[var(--text-muted)]">No specific strengths recorded.</li>
                  )}
                </ul>
              </div>

              {/* Areas for Improvement */}
              <div className="p-4 rounded-2xl bg-[var(--surface-950)] border border-[var(--border-subtle)] space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Recommended Action Items
                </span>
                <ul className="space-y-1.5">
                  {insights.areasForImprovement && insights.areasForImprovement.length > 0 ? (
                    insights.areasForImprovement.map((imp, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                        <span>{imp}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-xs text-[var(--text-muted)]">All metrics meeting optimal targets.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AIFeedbackInsightsCard;
