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
  Briefcase,
  SlidersHorizontal,
  Sparkles,
  Gem,
  Mic,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getRoleStyle, normalizeRole, ALL_ROLES, ROLES } from '../../utils/roleUtils';

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

/**
 * Priority rank for roles (VIP, Keynote Speakers, Spokesperson first)
 */
const getRolePriorityWeight = (roleInput) => {
  const norm = normalizeRole(roleInput);
  switch (norm) {
    case ROLES.VIP:
      return 1;
    case ROLES.SPEAKER:
      return 2;
    case ROLES.SPOKESPERSON:
      return 3;
    case ROLES.SPONSOR:
      return 4;
    case ROLES.STAFF:
      return 5;
    case ROLES.EVENT_ORGANISER:
      return 6;
    case ROLES.SUPER_ADMIN:
      return 7;
    case ROLES.ATTENDEE:
    default:
      return 8;
  }
};

export const PersonAutocomplete = ({
  persons = [],
  selectedPersonIds = [],
  onSelectPersons,
  existingPersonIds = new Set(),
  companyScopeName = '',
  isSuperAdmin = false,
  placeholder = "Type name, email, position (e.g. Doctor, Pharmacist), or ID...",
  multiSelect = true,
  className = '',
}) => {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedPositionFilter, setSelectedPositionFilter] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

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

  // Unique Positions extracted from available persons in scope
  const availablePositions = useMemo(() => {
    const posCount = {};
    persons.forEach((p) => {
      const pos = (p.position || p.Position || '').trim();
      if (pos) {
        posCount[pos] = (posCount[pos] || 0) + 1;
      }
    });
    return Object.entries(posCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [persons]);

  // Unique Roles extracted from available persons in scope
  const availableRoles = useMemo(() => {
    const roleCount = {};
    persons.forEach((p) => {
      const r = normalizeRole(p.role || p.Role || ROLES.ATTENDEE);
      roleCount[r] = (roleCount[r] || 0) + 1;
    });
    return ALL_ROLES.filter((r) => roleCount[r] > 0).map((r) => ({
      role: r,
      count: roleCount[r],
      priority: getRolePriorityWeight(r),
    }));
  }, [persons]);

  // Multi-dimensional Filter and Priority Sorting
  const filteredPersons = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const matches = persons.filter((p) => {
      const pId = String(p.idPerson || p.id || '');
      const firstName = (p.firstName || '').toLowerCase();
      const lastName = (p.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();
      const name = (p.name || '').toLowerCase();
      const email = (p.email || p.user?.email || '').toLowerCase();
      const compName = (p.company?.name || p.companyName || '').toLowerCase();
      const position = (p.position || p.Position || '').toLowerCase();
      const role = normalizeRole(p.role || p.Role || ROLES.ATTENDEE);

      // 1. Text Query Match (Name, Email, ID, Position, Company, Role)
      const matchesQuery =
        !query ||
        fullName.includes(query) ||
        firstName.includes(query) ||
        lastName.includes(query) ||
        name.includes(query) ||
        email.includes(query) ||
        compName.includes(query) ||
        position.includes(query) ||
        role.toLowerCase().includes(query) ||
        pId === query ||
        pId.includes(query);

      // 2. Role Filter Match
      const matchesRole = !selectedRoleFilter || role === selectedRoleFilter;

      // 3. Position Filter Match
      const rawPos = (p.position || p.Position || '').trim();
      const matchesPosition =
        !selectedPositionFilter || rawPos.toLowerCase() === selectedPositionFilter.toLowerCase();

      return matchesQuery && matchesRole && matchesPosition;
    });

    // Sort by priority roles first (VIP, Speakers, Spokespersons at top), then alphabetically by name
    return matches.sort((a, b) => {
      const weightA = getRolePriorityWeight(a.role || a.Role);
      const weightB = getRolePriorityWeight(b.role || b.Role);
      if (weightA !== weightB) return weightA - weightB;

      const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim();
      const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim();
      return nameA.localeCompare(nameB);
    });
  }, [persons, searchQuery, selectedRoleFilter, selectedPositionFilter]);

  // Eligible filtered candidates (excluding already-registered attendees)
  const filteredEligiblePersons = useMemo(() => {
    return filteredPersons.filter((p) => {
      const pId = String(p.idPerson || p.id);
      return !existingPersonIds.has(pId);
    });
  }, [filteredPersons, existingPersonIds]);

  const isAllFilteredSelected = useMemo(() => {
    if (filteredEligiblePersons.length === 0) return false;
    return filteredEligiblePersons.every((p) => selectedSet.has(String(p.idPerson || p.id)));
  }, [filteredEligiblePersons, selectedSet]);

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

  // Reset highlighted index on filter/search change
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
    if (existingPersonIds.has(pId)) return;

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
    const allEligibleIds = unRegisteredPersons.map((p) => String(p.idPerson || p.id));
    onSelectPersons(allEligibleIds, unRegisteredPersons);
    setIsOpen(false);
  };

  const handleSelectAllFiltered = () => {
    if (filteredEligiblePersons.length === 0) return;

    const filteredIds = filteredEligiblePersons.map((p) => String(p.idPerson || p.id));
    const mergedIds = Array.from(new Set([...currentSelectedIds, ...filteredIds]));
    const mergedObjects = persons.filter((p) => mergedIds.includes(String(p.idPerson || p.id)));

    onSelectPersons(mergedIds, mergedObjects);
  };

  const handleDeselectAllFiltered = () => {
    const filteredIdSet = new Set(filteredEligiblePersons.map((p) => String(p.idPerson || p.id)));
    const updatedIds = currentSelectedIds.filter((id) => !filteredIdSet.has(id));
    const updatedObjects = persons.filter((p) => updatedIds.includes(String(p.idPerson || p.id)));

    onSelectPersons(updatedIds, updatedObjects);
  };

  const handleClearAll = () => {
    onSelectPersons([], []);
    setSearchQuery('');
    setSelectedRoleFilter('');
    setSelectedPositionFilter('');
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

  const isFilterActive = !!(selectedRoleFilter || selectedPositionFilter || searchQuery);

  return (
    <div ref={containerRef} className={cn('relative space-y-3', className)}>
      {/* ── Scope Indicator & Global Counter ──────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-secondary)]">
        <div className="flex items-center gap-1.5 truncate">
          {companyScopeName ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 font-bold truncate shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">Scoped to: <strong>{companyScopeName}</strong></span>
            </span>
          ) : isSuperAdmin ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Global Scope (All Companies)</span>
            </span>
          ) : null}
          <span className="text-[11px] text-[var(--text-muted)] font-mono">
            ({persons.length} registered personnel)
          </span>
        </div>

        {multiSelect && unRegisteredPersons.length > 0 && (
          <div className="flex items-center gap-2">
            {!isFilterActive && (
              <button
                type="button"
                onClick={handleSelectAllInScope}
                className="text-[11px] font-bold text-[var(--cst-blue-400)] hover:text-[var(--cst-blue-300)] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Select All Scope ({unRegisteredPersons.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Dual Dimension Filter Toolbar: Position & Role ───────────────── */}
      <div className="p-3 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl space-y-2 shadow-sm">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-[var(--cst-blue-400)]">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Target Filters (Position &amp; Priority Role)</span>
          </span>

          {isFilterActive && (
            <button
              type="button"
              onClick={() => {
                setSelectedRoleFilter('');
                setSelectedPositionFilter('');
                setSearchQuery('');
              }}
              className="text-[10px] text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* 1. Filter by Position / Medical Profession */}
          <div className="relative">
            <select
              value={selectedPositionFilter}
              onChange={(e) => {
                setSelectedPositionFilter(e.target.value);
                setIsOpen(true);
              }}
              className="w-full bg-[var(--surface-800)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] cursor-pointer font-medium"
            >
              <option value="">💼 All Positions / Titles ({availablePositions.length > 0 ? availablePositions.length : '0'})</option>
              {availablePositions.map((pos) => (
                <option key={pos.name} value={pos.name}>
                  {pos.name} ({pos.count})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Filter by Role (Priority Roles: VIP, Speaker, Spokesperson, Staff, Attendee) */}
          <div className="relative">
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setIsOpen(true);
              }}
              className="w-full bg-[var(--surface-800)] border border-[var(--border-default)] text-xs text-[var(--text-primary)] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] cursor-pointer font-medium"
            >
              <option value="">⭐ All Privilege Roles ({availableRoles.length})</option>
              {availableRoles.map((r) => {
                const style = getRoleStyle(r.role);
                const prefix =
                  r.role === ROLES.VIP
                    ? '👑 VIP:'
                    : r.role === ROLES.SPEAKER
                    ? '🎤 Speaker:'
                    : r.role === ROLES.SPOKESPERSON
                    ? '📢 Spokesperson:'
                    : r.role === ROLES.SPONSOR
                    ? '💎 Sponsor:'
                    : r.role === ROLES.STAFF
                    ? '🛠️ Staff:'
                    : '👤';
                return (
                  <option key={r.role} value={r.role}>
                    {prefix} {style.label} ({r.count})
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Dynamic Bulk-Select Action for Filtered Candidates */}
        {isFilterActive && (
          <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2 text-[11px] animate-in fade-in">
            <div className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Found <strong>{filteredEligiblePersons.length}</strong> eligible {selectedPositionFilter ? `"${selectedPositionFilter}"` : ''} {selectedRoleFilter ? `(${selectedRoleFilter})` : 'candidates'}
              </span>
            </div>

            {filteredEligiblePersons.length > 0 && (
              <div>
                {!isAllFilteredSelected ? (
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-[10px] font-bold shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Select All {filteredEligiblePersons.length} Filtered</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleDeselectAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800/80 text-rose-200 text-[10px] font-bold border border-rose-700/50 shadow-md transition-all cursor-pointer flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Deselect Filtered ({filteredEligiblePersons.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Selected Persons Chips (Multi-select) ────────────────────────── */}
      {currentSelectedIds.length > 0 && (
        <div className="p-3 bg-[var(--surface-850)] border border-[var(--cst-blue-700)]/40 rounded-2xl space-y-2 animate-in fade-in duration-200 shadow-md">
          <div className="flex items-center justify-between text-[11px] px-1">
            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {currentSelectedIds.length} {currentSelectedIds.length === 1 ? 'Person Selected' : 'People Selected for Event Registration'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 hover:underline cursor-pointer"
            >
              Clear All Selection
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
            {selectedPersonsList.map((person) => {
              const pId = String(person.idPerson || person.id);
              const name = getPersonName(person);
              const position = person.position || person.Position || '';

              return (
                <div
                  key={pId}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl text-xs font-semibold bg-[var(--cst-blue-900)]/90 border border-[var(--cst-blue-500)]/40 text-slate-100 shadow-sm"
                >
                  <div className="w-5 h-5 rounded-full bg-[var(--cst-blue-700)] text-white text-[10px] flex items-center justify-center font-bold">
                    {name[0]?.toUpperCase() || <User className="w-3 h-3" />}
                  </div>
                  <span className="truncate max-w-[130px] font-bold">{name}</span>
                  {position && (
                    <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/60 px-1 py-0.2 rounded border border-indigo-800/40">
                      {position}
                    </span>
                  )}
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

      {/* ── Search & Autofill Input ───────────────────────────────────────── */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
          <Search className="w-4 h-4 text-[var(--cst-blue-400)]" />
        </div>

        <input
          ref={inputRef}
          type="text"
          placeholder={currentSelectedIds.length > 0 ? 'Type name or position to add more...' : placeholder}
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

      {/* ── Floating Suggestions Dropdown ─────────────────────────────────── */}
      {isOpen && (
        <div
          ref={listRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-72 overflow-y-auto rounded-2xl bg-[var(--surface-900)] border border-[var(--border-default)] shadow-2xl divide-y divide-[var(--border-subtle)] animate-in fade-in zoom-in-95 duration-150"
        >
          {filteredPersons.length === 0 ? (
            <div className="p-5 text-center space-y-1.5">
              <p className="text-xs font-semibold text-[var(--text-primary)]">No matching person found</p>
              <p className="text-[11px] text-[var(--text-muted)] max-w-sm mx-auto">
                {selectedPositionFilter || selectedRoleFilter || searchQuery
                  ? `No registered personnel match the active position "${selectedPositionFilter || 'Any'}", role "${selectedRoleFilter || 'Any'}", or search "${searchQuery || 'Any'}".`
                  : `No persons registered in ${companyScopeName || 'the system'}.`}
              </p>
            </div>
          ) : (
            filteredPersons.map((person, index) => {
              const pId = String(person.idPerson || person.id);
              const name = getPersonName(person);
              const email = person.email || person.user?.email || 'No email';
              const compName = person.company?.name || person.companyName || companyScopeName || '';
              const position = (person.position || person.Position || '').trim();
              const roleStyle = getRoleStyle(person.role || 'Attendee');
              const roleNorm = normalizeRole(person.role);
              const isPriorityRole = [ROLES.VIP, ROLES.SPEAKER, ROLES.SPOKESPERSON, ROLES.SPONSOR].includes(roleNorm);
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
                  <div className="flex items-center gap-3 overflow-hidden min-w-0 flex-1">
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

                    {/* Avatar Initials with Priority Ring */}
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0',
                        isPriorityRole
                          ? 'bg-amber-950/80 border-amber-500/70 text-amber-300 ring-2 ring-amber-500/20'
                          : isSelected
                          ? 'bg-[var(--cst-blue-700)] border-[var(--cst-blue-400)] text-white shadow-md'
                          : 'bg-[var(--surface-800)] border-[var(--border-default)] text-[var(--cst-blue-400)]'
                      )}
                    >
                      {roleNorm === ROLES.VIP ? (
                        <Gem className="w-4 h-4 text-amber-300" />
                      ) : roleNorm === ROLES.SPEAKER ? (
                        <Mic className="w-4 h-4 text-emerald-300" />
                      ) : (
                        name[0]?.toUpperCase() || <User className="w-4 h-4" />
                      )}
                    </div>

                    {/* Person Details (Name, Role, Position, Email, Company) */}
                    <div className="truncate min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-100 truncate">
                          <HighlightMatch text={name} query={searchQuery} />
                        </span>

                        {/* Role Badge */}
                        {person.role && (
                          <span
                            className={cn(
                              'text-[9px] font-bold px-1.5 py-0.5 rounded-md border shrink-0',
                              roleStyle.badgeClass
                            )}
                          >
                            {roleStyle.label}
                          </span>
                        )}

                        {/* Position / Profession Badge */}
                        {position && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-300 bg-sky-950/50 border border-sky-800/40 px-1.5 py-0.2 rounded shrink-0">
                            <Briefcase className="w-2.5 h-2.5 text-sky-400" />
                            <HighlightMatch text={position} query={searchQuery} />
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
