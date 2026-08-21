import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  User,
  Mail,
  Building2,
  CheckCircle2,
  X,
  ShieldCheck,
  ChevronDown,
  UserCheck,
  CheckSquare,
  Square,
  Users,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getRoleStyle } from '../../utils/roleUtils';

/**
 * Helper to highlight matching search query substrings in text
 */
const HighlightMatch = ({ text = '', query = '' }) => {
  if (!query || !text) return <span>{text}</span>;

  const parts = String(text).split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="text-[var(--cst-blue-400)] font-black underline decoration-[var(--cst-blue-500)]/60">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
};

export const PersonAutocomplete = ({
  persons = [],
  selectedPersonIds = [],
  onSelectPersons,
  existingPersonIds = new Set(),
  companyScopeName = '',
  isSuperAdmin = false,
  placeholder = "Type a person's name, email, or ID to add...",
  multiSelect = true,
  className = '',
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Normalize selected IDs to string array
  const currentSelectedIds = useMemo(() => {
    if (Array.isArray(selectedPersonIds)) {
      return selectedPersonIds.map(String);
    }
    if (selectedPersonIds) {
      return [String(selectedPersonIds)];
    }
    return [];
  }, [selectedPersonIds]);

  const selectedSet = useMemo(() => new Set(currentSelectedIds), [currentSelectedIds]);

  // Extract display name helper
  const getPersonName = (p) => {
    if (!p) return '';
    const firstName = p.firstName || '';
    const lastName = p.lastName || '';
    const full = `${firstName} ${lastName}`.trim();
    return full || p.name || (p.email ? p.email.split('@')[0] : `Person #${p.idPerson || p.id}`);
  };

  // Find objects for all currently selected persons
  const selectedPersonsList = useMemo(() => {
    return persons.filter((p) => {
      const pId = String(p.idPerson || p.id);
      return selectedSet.has(pId);
    });
  }, [persons, selectedSet]);

  // Available persons that are NOT already in the event roster
  const unRegisteredPersons = useMemo(() => {
    return persons.filter((p) => {
      const pId = String(p.idPerson || p.id);
      return !existingPersonIds.has(pId);
    });
  }, [persons, existingPersonIds]);

  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Filter persons list based on user search query
  const filteredPersons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return persons.slice(0, 20); // Show first 20 by default on focus
    }

    return persons.filter((p) => {
      const pId = String(p.idPerson || p.id || '');
      const firstName = (p.firstName || '').toLowerCase();
      const lastName = (p.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const name = (p.name || '').toLowerCase();
      const email = (p.email || p.user?.email || '').toLowerCase();
      const compName = (p.company?.name || p.companyName || '').toLowerCase();

      return (
        fullName.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        name.includes(query) ||
        email.includes(query) ||
        compName.includes(query) ||
        pId === query ||
        pId.includes(query)
      );
    });
  }, [persons, searchQuery]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Reset highlighted index on search change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredPersons]);

  // Scroll active item into view during keyboard navigation
  useEffect(() => {
    if (isOpen && listRef.current) {
      const activeEl = listRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const togglePerson = (person) => {
    const pId = String(person.idPerson || person.id);
    if (existingPersonIds.has(pId)) return; // Prevent toggling already-registered participants

    let updatedIds;
    if (multiSelect) {
      if (selectedSet.has(pId)) {
        updatedIds = currentSelectedIds.filter((id) => id !== pId);
      } else {
        updatedIds = [...currentSelectedIds, pId];
      }
      setSearchQuery('');
    } else {
      if (selectedSet.has(pId)) {
        updatedIds = [];
      } else {
        updatedIds = [pId];
        setSearchQuery(getPersonName(person));
      }
      setIsOpen(false);
    }

    const updatedObjects = persons.filter((p) => updatedIds.includes(String(p.idPerson || p.id)));
    onSelectPersons(updatedIds, updatedObjects);

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const removePerson = (pId) => {
    const updatedIds = currentSelectedIds.filter((id) => id !== String(pId));
    const updatedObjects = persons.filter((p) => updatedIds.includes(String(p.idPerson || p.id)));
    onSelectPersons(updatedIds, updatedObjects);
  };

  const handleSelectAllInScope = () => {
    // Select all available persons in scope who are NOT already in the event
    const allEligibleIds = unRegisteredPersons.map((p) => String(p.idPerson || p.id));
    onSelectPersons(allEligibleIds, unRegisteredPersons);
    setIsOpen(false);
  };

  const handleClearAll = () => {
    onSelectPersons([], []);
    setSearchQuery('');
    setIsOpen(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev + 1) % Math.max(1, filteredPersons.length));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightedIndex((prev) => (prev - 1 + filteredPersons.length) % Math.max(1, filteredPersons.length));
      }
    } else if (e.key === 'Enter') {
      if (isOpen && filteredPersons.length > 0) {
        e.preventDefault();
        togglePerson(filteredPersons[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const isAllEligibleSelected =
    unRegisteredPersons.length > 0 &&
    unRegisteredPersons.every((p) => selectedSet.has(String(p.idPerson || p.id)));

  return (
    <div ref={containerRef} className={cn('relative space-y-2.5', className)}>
      {/* Scope Indicator & Bulk Action Shortcuts */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 truncate">
          {companyScopeName ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-950/50 border border-indigo-800/40 text-indigo-300 font-medium truncate">
              <Building2 className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="truncate">Scoped to: <strong>{companyScopeName}</strong></span>
            </span>
          ) : isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-800/40 text-emerald-300 font-medium">
              <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>Global Scope (All Companies)</span>
            </span>
          ) : null}
          <span className="text-[10px] text-[var(--text-muted)] font-mono">
            ({persons.length} total)
          </span>
        </div>

        {multiSelect && unRegisteredPersons.length > 0 && (
          <div className="flex items-center gap-2">
            {!isAllEligibleSelected ? (
              <button
                type="button"
                onClick={handleSelectAllInScope}
                className="text-[11px] font-bold text-[var(--cst-blue-400)] hover:text-[var(--cst-blue-300)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Select All ({unRegisteredPersons.length})</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Deselect All</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Selected Persons Chips (Multi-select) */}
      {currentSelectedIds.length > 0 && (
        <div className="p-2.5 bg-[var(--surface-850)] border border-[var(--cst-blue-700)]/40 rounded-2xl space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                {currentSelectedIds.length} {currentSelectedIds.length === 1 ? 'Person Selected' : 'People Selected for Bulk Addition'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
            >
              Clear Selection
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
            {selectedPersonsList.map((person) => {
              const pId = String(person.idPerson || person.id);
              const name = getPersonName(person);
              return (
                <div
                  key={pId}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl text-xs font-semibold bg-[var(--cst-blue-900)]/80 border border-[var(--cst-blue-500)]/40 text-slate-100 shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--cst-blue-700)] text-white text-[10px] flex items-center justify-center font-bold">
                    {name[0]?.toUpperCase() || <User className="w-3 h-3" />}
                  </div>
                  <span className="truncate max-w-[150px]">{name}</span>
                  <button
                    type="button"
                    onClick={() => removePerson(pId)}
                    className="p-0.5 hover:bg-[var(--cst-blue-800)] rounded-md text-slate-300 hover:text-rose-300 transition-colors cursor-pointer"
                    title="Remove from batch"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Autofill Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
          <Search className="w-4 h-4 text-[var(--cst-blue-400)]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={currentSelectedIds.length > 0 ? 'Type to add more people to batch...' : placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={cn(
            'w-full pl-10 pr-16 py-2.5 rounded-xl text-xs bg-[var(--surface-800)] border text-[var(--text-primary)]',
            'placeholder:text-[var(--text-muted)] transition-all font-medium',
            currentSelectedIds.length > 0
              ? 'border-[var(--cst-blue-600)] ring-1 ring-[var(--cst-blue-600)]/40 bg-[var(--surface-850)]'
              : 'border-[var(--border-default)] focus:border-[var(--cst-blue-500)] focus:ring-1 focus:ring-[var(--cst-blue-500)]'
          )}
        />

        {/* Right Actions: Clear search & Dropdown toggle */}
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 rounded-md text-[var(--text-muted)] hover:text-slate-200 hover:bg-[var(--surface-700)] transition-colors cursor-pointer"
              title="Clear search text"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIsOpen((prev) => !prev);
              if (!isOpen && inputRef.current) inputRef.current.focus();
            }}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-slate-200 hover:bg-[var(--surface-700)] transition-colors cursor-pointer"
          >
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform duration-200', isOpen && 'rotate-180')} />
          </button>
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-2xl bg-[var(--surface-900)] border border-[var(--border-default)] shadow-2xl divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-150"
        >
          {filteredPersons.length === 0 ? (
            <div className="p-4 text-center space-y-1">
              <p className="text-xs font-semibold text-[var(--text-primary)]">No matching person found</p>
              <p className="text-[11px] text-[var(--text-muted)]">
                {companyScopeName
                  ? `No person matching "${searchQuery}" registered in ${companyScopeName}.`
                  : `No person matching "${searchQuery}".`}
              </p>
            </div>
          ) : (
            filteredPersons.map((person, index) => {
              const pId = String(person.idPerson || person.id);
              const name = getPersonName(person);
              const email = person.email || person.user?.email || 'No email';
              const compName = person.company?.name || person.companyName || companyScopeName || '';
              const roleStyle = getRoleStyle(person.role || 'Attendee');
              const isAlreadyInEvent = existingPersonIds.has(pId);
              const isSelected = selectedSet.has(pId);
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={pId || index}
                  onClick={() => !isAlreadyInEvent && togglePerson(person)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={cn(
                    'p-3 flex items-center justify-between gap-3 text-xs transition-colors',
                    isAlreadyInEvent
                      ? 'opacity-60 cursor-not-allowed bg-[var(--surface-950)]/40'
                      : 'cursor-pointer hover:bg-[var(--surface-800)]',
                    isSelected && !isAlreadyInEvent && 'bg-[var(--cst-blue-950)]/80 text-[var(--cst-blue-200)]',
                    isHighlighted && !isSelected && !isAlreadyInEvent && 'bg-[var(--surface-800)]'
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden min-w-0">
                    {/* Multi-select Checkbox indicator */}
                    {multiSelect && !isAlreadyInEvent && (
                      <div className="text-[var(--cst-blue-400)] shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                      </div>
                    )}

                    {/* Avatar Initials */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0',
                        isSelected
                          ? 'bg-[var(--cst-blue-700)] border-[var(--cst-blue-400)] text-white shadow-md'
                          : 'bg-[var(--surface-800)] border-[var(--border-default)] text-[var(--cst-blue-400)]'
                      )}
                    >
                      {name[0]?.toUpperCase() || <User className="w-4 h-4" />}
                    </div>

                    {/* Person Details */}
                    <div className="truncate min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-100 truncate">
                          <HighlightMatch text={name} query={searchQuery} />
                        </span>
                        {person.role && (
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.2 rounded border shrink-0',
                              roleStyle.border,
                              roleStyle.bg,
                              roleStyle.color
                            )}
                          >
                            {roleStyle.label}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-[var(--text-secondary)] truncate">
                        <span className="flex items-center gap-1 font-mono truncate">
                          <Mail className="w-3 h-3 text-[var(--text-muted)] shrink-0" />
                          <HighlightMatch text={email} query={searchQuery} />
                        </span>

                        {compName && (
                          <span className="flex items-center gap-1 truncate text-slate-400 hidden sm:inline-flex">
                            <Building2 className="w-3 h-3 text-indigo-400/80 shrink-0" />
                            <span className="truncate">{compName}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Tags (Person ID & Already Added badge) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isAlreadyInEvent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 border border-cyan-800/50 text-cyan-300">
                        <UserCheck className="w-3 h-3 text-cyan-400" /> In Roster
                      </span>
                    ) : isSelected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/60 border border-emerald-800/50 text-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Selected
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--surface-800)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                        #{pId}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
