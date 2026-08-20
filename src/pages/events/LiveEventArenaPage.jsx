import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Gamepad2, Calendar, Building2, MapPin } from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { LiveKahootArena } from '../../components/events/LiveKahootArena';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';

export const LiveEventArenaPage = () => {
  const { id } = useParams();

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['eventDetails', id],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BY_ID(id));
      return res.data;
    },
    enabled: !!id,
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      {/* Navigation Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to={`/events/${id}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Event Details
        </Link>

        {event && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-400 font-mono uppercase tracking-widest bg-amber-950/40 px-3 py-1 rounded-full border border-amber-800/40">
              Live Session Active
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">Connecting to Live Kahoot Arena...</p>
        </div>
      ) : isError || !event ? (
        <Alert variant="destructive">
          Failed to load event details for Event #{id}. Please ensure the event exists.
        </Alert>
      ) : (
        <LiveKahootArena
          eventId={id}
          eventTitle={event.title || event.name}
        />
      )}
    </div>
  );
};

export default LiveEventArenaPage;
