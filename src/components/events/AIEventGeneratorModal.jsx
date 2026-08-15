import React, { useState } from 'react';
import {
  Sparkles,
  Wand2,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Globe,
  X,
  ChevronRight,
  Lightbulb,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Alert } from '../ui/Alert';

const PROMPT_SUGGESTIONS = [
  'National AI & Cloud Computing Summit 2026',
  'FinTech Security & Blockchain Forum Tunis',
  'NextGen DevOps & Kubernetes Masterclass',
  'Healthcare Data Science & Robotics Expo',
];

export const AIEventGeneratorModal = ({ isOpen, onClose, onApplyGeneratedData }) => {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState('Technology');
  const [language, setLanguage] = useState('en');
  const [durationHours, setDurationHours] = useState(6);
  const [targetAudience, setTargetAudience] = useState('Developers, Executives & Tech Enthusiasts');
  const [locationPreference, setLocationPreference] = useState('Tunis Convention Center');
  const [preferredCapacity, setPreferredCapacity] = useState(150);

  const [generatedPlan, setGeneratedPlan] = useState(null);

  const generateMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await axiosClient.post(ENDPOINTS.AI.GENERATE_EVENT_PLAN, payload);
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedPlan(data);
    },
  });

  if (!isOpen) return null;

  const handleGenerate = (e) => {
    e?.preventDefault();
    if (!topic.trim()) return;

    generateMutation.mutate({
      topic,
      category,
      language,
      durationHours: parseInt(durationHours, 10) || 6,
      targetAudience,
      locationPreference,
      preferredCapacity: parseInt(preferredCapacity, 10) || 150,
    });
  };

  const handleApply = () => {
    if (!generatedPlan) return;
    onApplyGeneratedData(generatedPlan);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 md:p-6 border-b border-[var(--border-default)] flex items-center justify-between bg-[var(--surface-850)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[var(--cst-blue-600)] to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-[var(--text-primary)]">
                  EventHub AI Co-Pilot
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-blue-300">
                  Gemini 1.5 Flash
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Generate complete descriptions, agenda schedule, venue details, and capacity in seconds.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-800)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quick Suggestions Chips */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
              <span>Prompt Ideas / Topics</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PROMPT_SUGGESTIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTopic(preset)}
                  className={`text-xs px-3 py-1.5 rounded-xl border transition-all text-left cursor-pointer ${
                    topic === preset
                      ? 'bg-[var(--cst-blue-800)]/40 border-[var(--cst-blue-500)] text-[var(--cst-blue-300)] font-semibold shadow-sm'
                      : 'bg-[var(--surface-800)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Form Parameters */}
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <Label htmlFor="ai-topic" className="text-xs font-bold text-[var(--text-secondary)]">
                Event Topic or Concept Prompt *
              </Label>
              <Input
                id="ai-topic"
                type="text"
                required
                placeholder="e.g. AI & Cloud Architecture Summit Tunisia 2026"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-bold text-[var(--text-secondary)]">Category</Label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)]"
                >
                  <option value="Technology">Technology & AI</option>
                  <option value="Business">Business & Corporate</option>
                  <option value="Workshop">Technical Workshop</option>
                  <option value="Networking">Networking & Expo</option>
                  <option value="Education">Education & Academic</option>
                  <option value="Health">Healthcare & Biotech</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-bold text-[var(--text-secondary)]">Target Capacity</Label>
                <Input
                  type="number"
                  min={10}
                  max={5000}
                  value={preferredCapacity}
                  onChange={(e) => setPreferredCapacity(e.target.value)}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-bold text-[var(--text-secondary)]">Language</Label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-[var(--bg-input)] border border-[var(--border-default)] rounded-xl text-xs text-[var(--text-primary)]"
                >
                  <option value="en">English (Global)</option>
                  <option value="fr">French (Français)</option>
                  <option value="ar">Arabic (العربية)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-bold text-[var(--text-secondary)]">Target Audience</Label>
                <Input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. CTOs, Software Engineers, Data Scientists"
                  className="mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-bold text-[var(--text-secondary)]">Preferred Venue / City</Label>
                <Input
                  type="text"
                  value={locationPreference}
                  onChange={(e) => setLocationPreference(e.target.value)}
                  placeholder="e.g. Tunis Convention Center, Tunis"
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={generateMutation.isPending || !topic.trim()}
                className="bg-gradient-to-r from-[var(--cst-blue-700)] to-purple-600 hover:from-[var(--cst-blue-600)] hover:to-purple-500 text-white font-bold text-xs px-6 py-2.5 rounded-2xl shadow-lg shadow-blue-500/20 flex items-center gap-2 cursor-pointer"
              >
                {generateMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Gemini 1.5 Flash is writing agenda...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    <span>Generate Complete Event Plan</span>
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Generated Result Preview */}
          {generatedPlan && (
            <div className="space-y-4 pt-4 border-t border-[var(--border-default)] animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>AI Event Plan Ready for Application</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--surface-800)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {generatedPlan.isFallback ? '⚡ Heuristic Mode' : '✨ Gemini 1.5 Flash'}
                </span>
              </div>

              {/* Preview Card */}
              <div className="p-5 bg-[var(--surface-950)] border border-[var(--border-default)] rounded-2xl space-y-4">
                <div>
                  <h3 className="text-base font-black text-[var(--text-primary)]">
                    {generatedPlan.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)] mt-1.5">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                      {generatedPlan.startTime} – {generatedPlan.endTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                      {generatedPlan.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                      {generatedPlan.capacity} seats
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                    Generated Description
                  </h4>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-line bg-[var(--surface-900)] p-3 rounded-xl border border-[var(--border-subtle)]">
                    {generatedPlan.description}
                  </p>
                </div>

                {generatedPlan.agendaSchedule && generatedPlan.agendaSchedule.length > 0 && (
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                      Hourly Agenda Tracks ({generatedPlan.agendaSchedule.length} Sessions)
                    </h4>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {generatedPlan.agendaSchedule.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-start justify-between gap-3 p-2 bg-[var(--surface-900)] rounded-xl border border-[var(--border-subtle)] text-xs"
                        >
                          <div className="space-y-0.5">
                            <div className="font-bold text-[var(--text-primary)]">{item.title}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{item.description}</div>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-mono text-[10px] font-bold text-[var(--cst-blue-400)] block">
                              {item.time}
                            </span>
                            <span className="text-[9px] text-[var(--text-secondary)]">{item.speakerRole}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[var(--surface-850)] border-t border-[var(--border-default)] flex items-center justify-between shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Cancel
          </Button>
          {generatedPlan ? (
            <Button
              size="sm"
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-5 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Apply AI Plan to Event Form</span>
            </Button>
          ) : (
            <div className="text-[11px] text-[var(--text-muted)] font-medium">
              Click &apos;Generate&apos; to preview structured agenda.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIEventGeneratorModal;
