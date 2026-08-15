import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  Edit2,
  Trash2,
  Mail,
  Phone,
  Building2,
  Briefcase,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  X,
  User,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { InteractiveTableRow } from '../../components/ui/InteractiveTableRow';
import { MagneticIcon } from '../../components/ui/MagneticIcon';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Alert } from '../../components/ui/Alert';
import { useNotification } from '../../context/NotificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { ALL_ROLES, getRoleStyle, normalizeRole, ROLES } from '../../utils/roleUtils';
import { PhoneInputWithCountryCode } from '../../components/ui/PhoneInputWithCountryCode';

// Skeleton Component for Table Loading
const UserTableSkeleton = () => (
  <div className="space-y-4 animate-pulse p-4">
    <div className="h-10 bg-slate-800/60 rounded-2xl w-full" />
    {[...Array(6)].map((_, i) => (
      <div key={i} className="h-16 bg-slate-800/40 rounded-2xl w-full" />
    ))}
  </div>
);

const UserManagementPage = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotification();
  const { t } = useLanguage();
  const roleScrollRef = React.useRef(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    idCompany: '',
    position: '',
    role: ROLES.ATTENDEE,
  });

  const [feedback, setFeedback] = useState(null);

  // Debounce search input for performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // 1. Fetch Persons List (GET /api/Person)
  const {
    data: persons = [],
    isLoading: personsLoading,
    isError: personsError,
    refetch,
  } = useQuery({
    queryKey: ['adminPersonsList'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.PERSON.BASE);
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
  });

  // 2. Fetch Companies List for Dropdown (GET /api/Company)
  const { data: companies = [] } = useQuery({
    queryKey: ['adminCompaniesList'],
    queryFn: async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
        return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
      } catch {
        return [];
      }
    },
  });

  // Companies Lookup Map
  const companiesMap = useMemo(() => {
    const map = {};
    companies.forEach((c) => {
      const cId = c.idCompany || c.id;
      if (cId) map[cId] = c;
    });
    return map;
  }, [companies]);

  // Helper for safe error message extraction
  const extractErrorMessage = (err, fallbackMsg) => {
    if (!err) return fallbackMsg;
    if (err.response?.data) {
      const data = err.response.data;
      if (typeof data === 'string' && data.trim()) return data;
      if (data.message && typeof data.message === 'string') return data.message;
      if (data.title && typeof data.title === 'string') return data.title;
      if (data.errors && typeof data.errors === 'object') {
        const flat = Object.values(data.errors).flat().filter(Boolean).join(', ');
        if (flat) return flat;
      }
    }
    if (err.message && typeof err.message === 'string') return err.message;
    return fallbackMsg;
  };

  // 3. Create Person Mutation: POST /api/Person (with Auth register fallback)
  const createPersonMutation = useMutation({
    mutationFn: async (payload) => {
      try {
        const res = await axiosClient.post(ENDPOINTS.PERSON.BASE, payload);
        return res.data;
      } catch (err1) {
        console.warn('POST /api/Person endpoint failed, trying Auth register fallback:', err1?.response?.status);
        try {
          const regPayload = {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            phone: payload.phone || payload.phoneNumber,
            phoneNumber: payload.phoneNumber || payload.phone,
            password: 'EventHubPassword2026!',
            address: payload.address || '',
            position: payload.position || '',
            companyName: payload.companyName || '',
            role: payload.role,
          };
          const res = await axiosClient.post(ENDPOINTS.AUTH.REGISTER, regPayload);
          return res.data;
        } catch {
          throw err1;
        }
      }
    },
    onSuccess: (data, variables) => {
      // Optimistically insert created user into cache
      queryClient.setQueryData(['adminPersonsList'], (old) => {
        const list = Array.isArray(old) ? old : (old?.items || old?.data || []);
        const createdId = data?.idPerson || data?.id || Date.now();
        const createdPerson = {
          idPerson: createdId,
          id: createdId,
          firstName: variables.firstName,
          lastName: variables.lastName,
          email: variables.email,
          phone: variables.phone,
          phoneNumber: variables.phoneNumber,
          position: variables.position,
          companyName: variables.companyName,
          role: variables.role,
          idCompany: variables.idCompany,
          company: variables.idCompany ? companiesMap[variables.idCompany] : null,
          ...(typeof data === 'object' ? data : {}),
        };
        return [createdPerson, ...list];
      });

      queryClient.invalidateQueries({ queryKey: ['adminPersonsList'] });
      queryClient.invalidateQueries({ queryKey: ['allPersonsAnalytics'] });
      setIsCreateOpen(false);
      resetForm();

      const createdName = `${variables.firstName} ${variables.lastName}`.trim();
      const msg = `User '${createdName}' created successfully with role ${variables.role}.`;
      setFeedback({ type: 'success', message: msg });
      addNotification({
        type: 'info',
        title: 'New User Created 👤',
        message: msg,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: extractErrorMessage(err, 'Failed to create user record.') });
    },
  });

  // 4. Update Person Mutation: PUT /api/Person/{id} (with PUT /api/Person fallback)
  const updatePersonMutation = useMutation({
    mutationFn: async ({ id, payload }) => {
      try {
        const res = await axiosClient.put(ENDPOINTS.PERSON.BY_ID(id), payload);
        return res.data;
      } catch (err1) {
        console.warn(`PUT /api/Person/${id} failed, trying base PUT /api/Person fallback:`, err1?.response?.status);
        try {
          const res = await axiosClient.put(ENDPOINTS.PERSON.BASE, payload);
          return res.data;
        } catch {
          throw err1;
        }
      }
    },
    onSuccess: (data, variables) => {
      // Optimistically update target user in cache
      queryClient.setQueryData(['adminPersonsList'], (old) => {
        const list = Array.isArray(old) ? old : (old?.items || old?.data || []);
        return list.map((p) => {
          const pId = p.idPerson || p.id;
          if (pId === variables.id || pId === variables.payload.idPerson) {
            return {
              ...p,
              ...variables.payload,
              company: variables.payload.idCompany ? companiesMap[variables.payload.idCompany] : p.company,
              ...(typeof data === 'object' ? data : {}),
            };
          }
          return p;
        });
      });

      queryClient.invalidateQueries({ queryKey: ['adminPersonsList'] });
      queryClient.invalidateQueries({ queryKey: ['allPersonsAnalytics'] });
      setIsEditOpen(false);
      setSelectedPerson(null);
      resetForm();

      const updatedName = `${variables.payload.firstName} ${variables.payload.lastName}`.trim();
      const msg = `User '${updatedName}' updated successfully with role ${variables.payload.role}.`;
      setFeedback({ type: 'success', message: msg });
      addNotification({
        type: 'info',
        title: 'User Profile Updated ✏️',
        message: msg,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({ type: 'error', message: extractErrorMessage(err, 'Failed to update user record.') });
    },
  });

  // 5. Delete Person Mutation: DELETE /api/Person/{id}
  const deletePersonMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const res = await axiosClient.delete(ENDPOINTS.PERSON.BY_ID(id));
        return res.data;
      } catch (err1) {
        console.warn(`DELETE /api/Person/${id} failed, trying query parameter fallback:`, err1?.response?.status);
        try {
          const res = await axiosClient.delete(`${ENDPOINTS.PERSON.BASE}?id=${id}`);
          return res.data;
        } catch {
          throw err1;
        }
      }
    },
    onSuccess: (_, targetId) => {
      // Optimistically remove deleted user from cache
      queryClient.setQueryData(['adminPersonsList'], (old) => {
        const list = Array.isArray(old) ? old : (old?.items || old?.data || []);
        return list.filter((p) => (p.idPerson || p.id) !== targetId);
      });

      queryClient.invalidateQueries({ queryKey: ['adminPersonsList'] });
      queryClient.invalidateQueries({ queryKey: ['allPersonsAnalytics'] });
      setIsDeleteOpen(false);
      const name = payloadName(selectedPerson);
      setSelectedPerson(null);

      const msg = `User '${name}' deleted successfully.`;
      setFeedback({ type: 'success', message: msg });
      addNotification({
        type: 'info',
        title: 'User Removed 🗑️',
        message: msg,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setIsDeleteOpen(false);
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to delete user record.'),
      });
    },
  });

  const payloadName = (person) => {
    if (!person) return 'User';
    const first = person.firstName || '';
    const last = person.lastName || '';
    return `${first} ${last}`.trim() || person.name || person.email || `User #${person.idPerson || person.id}`;
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      idCompany: '',
      position: '',
      role: ROLES.ATTENDEE,
    });
  };

  const handleOpenCreate = () => {
    resetForm();
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (person) => {
    setSelectedPerson(person);
    const compId = person.idCompany || person.company?.idCompany || person.companyId || '';
    setFormData({
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      email: person.email || '',
      phoneNumber: person.phoneNumber || person.phone || '',
      idCompany: compId ? String(compId) : '',
      position: person.position || '',
      role: normalizeRole(person.role || ROLES.ATTENDEE),
    });
    setIsEditOpen(true);
  };

  const handleOpenDelete = (person) => {
    setSelectedPerson(person);
    setIsDeleteOpen(true);
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    const compId = formData.idCompany ? parseInt(formData.idCompany, 10) : null;
    const compObj = compId ? companiesMap[compId] : null;

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phoneNumber.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      position: formData.position.trim(),
      companyName: compObj?.name || '',
      role: normalizeRole(formData.role),
      idCompany: compId,
    };
    createPersonMutation.mutate(payload);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!selectedPerson) return;
    const personId = selectedPerson.idPerson || selectedPerson.id;
    const compId = formData.idCompany ? parseInt(formData.idCompany, 10) : null;
    const compObj = compId ? companiesMap[compId] : null;

    const payload = {
      id: personId,
      idPerson: personId,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phoneNumber.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      position: formData.position.trim(),
      companyName: compObj?.name || selectedPerson.companyName || '',
      role: normalizeRole(formData.role),
      idCompany: compId,
    };
    updatePersonMutation.mutate({ id: personId, payload });
  };

  // Filtered Persons calculation
  const filteredPersons = useMemo(() => {
    return persons.filter((person) => {
      const fullName = `${person.firstName || ''} ${person.lastName || ''}`.toLowerCase();
      const email = (person.email || '').toLowerCase();
      const phone = (person.phoneNumber || person.phone || '').toLowerCase();
      const position = (person.position || '').toLowerCase();

      const companyId = person.idCompany || person.company?.idCompany;
      const companyObj = person.company || (companyId ? companiesMap[companyId] : null);
      const companyName = (companyObj?.name || person.companyName || '').toLowerCase();

      const query = debouncedSearch.toLowerCase();
      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        position.includes(query) ||
        companyName.includes(query);

      const normRole = normalizeRole(person.role || ROLES.ATTENDEE);
      const matchesRole = !selectedRoleFilter || normRole === selectedRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [persons, debouncedSearch, selectedRoleFilter, companiesMap]);

  // Pagination Calculations
  const totalItems = filteredPersons.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPersons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersons.slice(start, start + pageSize);
  }, [filteredPersons, currentPage, pageSize]);

  // Counter Badges Stats
  const roleStats = useMemo(() => {
    const counts = {};
    ALL_ROLES.forEach((r) => { counts[r] = 0; });
    persons.forEach((p) => {
      const r = normalizeRole(p.role || ROLES.ATTENDEE);
      if (counts[r] !== undefined) counts[r] += 1;
      else counts[ROLES.ATTENDEE] += 1;
    });
    return counts;
  }, [persons]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Operation Feedback Toast / Alert */}
      {feedback && (
        <Alert
          variant={feedback.type === 'error' ? 'destructive' : 'default'}
          className="cst-stagger-1 animate-in fade-in"
        >
          <div className="flex items-center gap-2 text-xs">
            {feedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        </Alert>
      )}

      {/* Header Banner & Stats Bar */}
      <Card className="cst-stagger-1 p-6 md:p-8 cst-hero-gradient border-[var(--border-default)] rounded-3xl shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
              <span>{t('users.title', 'User Management Roster')}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              {t('users.title', 'User Management Roster')}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] max-w-xl">
              {t('users.subtitle', 'Manage platform members, role assignments, and permissions.')}
            </p>
          </div>

          {/* Quick Counter Cards */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-3.5 px-4 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl min-w-[105px] text-center shadow-md">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">{t('users.totalUsers', 'Total Users')}</span>
              <span className="text-2xl font-black text-[var(--text-primary)]">{persons.length}</span>
            </div>
            <div className="p-3.5 px-4 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl min-w-[105px] text-center shadow-md">
              <span className="text-[10px] font-bold uppercase text-[var(--cst-blue-400)] block">Admins &amp; Org</span>
              <span className="text-2xl font-black text-[var(--cst-blue-300)]">
                {(roleStats[ROLES.SUPER_ADMIN] || 0) + (roleStats[ROLES.EVENT_ORGANISER] || 0)}
              </span>
            </div>
            <div className="p-3.5 px-4 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl min-w-[105px] text-center shadow-md">
              <span className="text-[10px] font-bold uppercase text-[var(--cst-red-400)] block">VIP &amp; Guests</span>
              <span className="text-2xl font-black text-[var(--cst-red-400)]">
                {(roleStats[ROLES.VIP] || 0) + (roleStats[ROLES.SPEAKER] || 0) + (roleStats[ROLES.SPONSOR] || 0)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Control Bar: Real-Time Debounced Search, Role Filter & Add Action */}
      <Card className="cst-stagger-2 p-4 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl shadow-lg space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto flex-1">
            {/* Search Input */}
            <div className="flex items-center gap-3 bg-[var(--surface-800)] p-2.5 px-3.5 rounded-2xl border border-[var(--border-default)] w-full md:w-80 shadow-sm">
              <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
              <Input
                type="text"
                placeholder={t('general.search', 'Search by name, email, phone, company, or position...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-none shadow-none focus:ring-0 bg-transparent text-xs p-0 w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-200">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="cst-btn-motion text-xs font-bold rounded-2xl cursor-pointer"
              title="Refresh User Data"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-[var(--cst-blue-400)]" /> Refresh
            </Button>

            <Button
              onClick={handleOpenCreate}
              size="sm"
              className="cst-btn-motion bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white text-xs font-bold rounded-2xl shadow-lg shadow-[rgba(29,86,182,0.3)] cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add New User
            </Button>
          </div>
        </div>

        {/* Interactive Role Filter Pill Bar */}
        <div className="relative border-t border-[var(--border-subtle)] pt-3 flex items-center gap-1 group">
          <button
            type="button"
            onClick={() => {
              if (roleScrollRef.current) roleScrollRef.current.scrollBy({ left: -220, behavior: 'smooth' });
            }}
            className="p-1.5 rounded-full bg-[var(--surface-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-700)] border border-[var(--border-default)] shrink-0 transition-colors cursor-pointer shadow-sm"
            title="Scroll left to view previous roles"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            ref={roleScrollRef}
            className="flex items-center gap-2 overflow-x-auto py-1 scroll-smooth scrollbar-none flex-1 pr-8 px-1"
          >
            <button
              onClick={() => {
                setSelectedRoleFilter('');
                setCurrentPage(1);
              }}
              className={`cst-btn-motion px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                !selectedRoleFilter
                  ? 'bg-[var(--cst-blue-700)] text-white shadow-md'
                  : 'bg-[var(--surface-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
              }`}
            >
              <span>All Roles</span>
              <span className="text-[10px] opacity-75 font-mono">({persons.length})</span>
            </button>

            {ALL_ROLES.map((r) => {
              const style = getRoleStyle(r);
              const RolePillIcon = style.icon;
              const isSelected = selectedRoleFilter === r;
              const count = roleStats[r] || 0;

              return (
                <button
                  key={r}
                  onClick={() => {
                    setSelectedRoleFilter(r);
                    setCurrentPage(1);
                  }}
                  className={`cst-btn-motion px-3.5 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isSelected ? `${style.badgeClass} shadow-md ring-2 ring-blue-500/30` : 'bg-[var(--surface-800)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-slate-600'
                  }`}
                >
                  <RolePillIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>{style.label}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              if (roleScrollRef.current) roleScrollRef.current.scrollBy({ left: 220, behavior: 'smooth' });
            }}
            className="p-1.5 rounded-full bg-[var(--surface-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-700)] border border-[var(--border-default)] shrink-0 transition-colors cursor-pointer shadow-sm"
            title="Scroll right to view Organiser & Admin roles"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </Card>

      {/* Main Roster Data Table */}
      <Card className="cst-stagger-3 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl overflow-hidden shadow-2xl">
        {personsLoading ? (
          <UserTableSkeleton />
        ) : personsError ? (
          <div className="p-8">
            <Alert variant="destructive">
              Failed to load system user directory. Please check backend connection.
            </Alert>
          </div>
        ) : filteredPersons.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Inbox className="w-10 h-10 text-[var(--text-muted)] mx-auto opacity-40" />
            <p className="text-sm font-semibold text-[var(--text-primary)]">No users found</p>
            <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
              {searchQuery || selectedRoleFilter
                ? 'No user records match your active search or role filter criteria.'
                : 'No persons registered in the system yet.'}
            </p>
            <Button size="sm" onClick={handleOpenCreate} className="mt-2 text-xs">
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Add First User
            </Button>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[var(--text-secondary)] border-collapse">
                <thead className="bg-[var(--surface-850)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-default)]">
                  <tr>
                    <th className="py-3.5 px-4">User Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4">Company Affiliation</th>
                    <th className="py-3.5 px-4">Position</th>
                    <th className="py-3.5 px-4">System Role</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {paginatedPersons.map((person) => {
                    const pId = person.idPerson || person.id;
                    const fullName = `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.name || 'Unnamed';
                    const email = person.email || 'N/A';
                    const phone = person.phoneNumber || person.phone || 'N/A';

                    const companyId = person.idCompany || person.company?.idCompany;
                    const companyObj = person.company || (companyId ? companiesMap[companyId] : null);
                    const companyName = companyObj?.name || person.companyName || 'Independent Host';

                    const position = person.position || '—';
                    const roleStyle = getRoleStyle(person.role);

                    return (
                      <InteractiveTableRow key={pId} className="hover:bg-[var(--nav-hover-bg)] transition-colors group">
                        {/* 1. Name & Avatar */}
                        <td className="py-3.5 px-4 font-semibold text-[var(--text-primary)]">
                          <div className="flex items-center gap-3">
                            <MagneticIcon maxShift={6} scaleOnHover={1.12}>
                              <div className="w-8 h-8 rounded-full bg-[var(--surface-800)] border border-[var(--border-default)] flex items-center justify-center font-bold text-xs text-[var(--cst-blue-400)] shrink-0 shadow-sm">
                                {fullName[0]?.toUpperCase() || <User className="w-4 h-4 text-[var(--cst-blue-400)]" />}
                              </div>
                            </MagneticIcon>
                            <div>
                              <div className="font-bold text-[var(--text-primary)]">{fullName}</div>
                              <div className="text-[10px] font-mono text-[var(--text-muted)]">ID #{pId}</div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Email */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                            <MagneticIcon maxShift={3} scaleOnHover={1.05}>
                              <Mail className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                            </MagneticIcon>
                            <span>{email}</span>
                          </div>
                        </td>

                        {/* 3. Phone */}
                        <td className="py-3.5 px-4 font-mono">
                          <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                            <MagneticIcon maxShift={3} scaleOnHover={1.05}>
                              <Phone className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                            </MagneticIcon>
                            <span>{phone}</span>
                          </div>
                        </td>

                        {/* 4. Company */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-[var(--text-primary)] font-medium">
                            <MagneticIcon maxShift={3} scaleOnHover={1.05}>
                              <Building2 className="w-3.5 h-3.5 text-[var(--cst-red-400)] shrink-0" />
                            </MagneticIcon>
                            <span>{companyName}</span>
                          </div>
                        </td>

                        {/* 5. Position */}
                        <td className="py-3.5 px-4 text-[var(--text-muted)]">
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{position}</span>
                          </div>
                        </td>

                        {/* 6. Role Badge */}
                        <td className="py-3.5 px-4">
                          {(() => {
                            const RoleIcon = roleStyle.icon;
                            return (
                              <MagneticIcon maxShift={6} scaleOnHover={1.08}>
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border shadow-sm ${roleStyle.badgeClass}`}
                                >
                                  {RoleIcon ? <RoleIcon className="w-3.5 h-3.5" /> : <span className={`w-1.5 h-1.5 rounded-full ${roleStyle.dotClass}`} />}
                                  {roleStyle.label}
                                </span>
                              </MagneticIcon>
                            );
                          })()}
                        </td>

                        {/* 7. Action Controls */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <MagneticIcon maxShift={4} scaleOnHover={1.05}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenEdit(person)}
                                className="text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 py-1 px-2.5 rounded-xl cursor-pointer"
                                title="Edit user details or role"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                              </Button>
                            </MagneticIcon>
                            <MagneticIcon maxShift={4} scaleOnHover={1.05}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleOpenDelete(person)}
                                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 py-1 px-2.5 rounded-xl cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                              </Button>
                            </MagneticIcon>
                          </div>
                        </td>
                      </InteractiveTableRow>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <div className="p-4 bg-[var(--surface-850)] border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg p-1 text-xs outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-[var(--text-muted)] ml-2">
                  Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}–
                  {Math.min(currentPage * pageSize, totalItems)} of {totalItems} entries
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Previous
                </Button>
                <span className="font-mono text-slate-300 font-semibold px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  className="text-xs"
                >
                  Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ── CREATE USER MODAL ──────────────────────────────────────────────── */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Person"
        description="Add a new user record with role assignment and corporate affiliation"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="create-firstName">First Name *</Label>
              <Input
                id="create-firstName"
                required
                placeholder="e.g. Jane"
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="create-lastName">Last Name *</Label>
              <Input
                id="create-lastName"
                required
                placeholder="e.g. Smith"
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="create-email">Contact Email *</Label>
            <Input
              id="create-email"
              type="email"
              required
              placeholder="jane.smith@company.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="create-phone" className="mb-1 block">Phone Number</Label>
              <PhoneInputWithCountryCode
                id="create-phone"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="create-position">Position / Job Title</Label>
              <Input
                id="create-position"
                placeholder="e.g. Keynote Speaker"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="create-role">Assigned System Role *</Label>
              <select
                id="create-role"
                required
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full mt-1 p-2.5 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] font-semibold"
              >
                {ALL_ROLES.map((r) => {
                  const style = getRoleStyle(r);
                  return (
                    <option key={r} value={r}>
                      {style.label} ({r})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <Label htmlFor="create-company">Company Host Affiliation</Label>
              <select
                id="create-company"
                value={formData.idCompany}
                onChange={(e) => setFormData((prev) => ({ ...prev, idCompany: e.target.value }))}
                className="w-full mt-1 p-2.5 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)]"
              >
                <option value="">-- None (Independent) --</option>
                {companies.map((c) => (
                  <option key={c.idCompany || c.id} value={c.idCompany || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createPersonMutation.isPending}
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white"
            >
              {createPersonMutation.isPending ? 'Creating User...' : 'Create Person Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── EDIT USER MODAL ────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Modify User: ${payloadName(selectedPerson)}`}
        description="Update user details, company affiliation, or promote/demote system role"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-firstName">First Name *</Label>
              <Input
                id="edit-firstName"
                required
                value={formData.firstName}
                onChange={(e) => setFormData((prev) => ({ ...prev, firstName: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="edit-lastName">Last Name *</Label>
              <Input
                id="edit-lastName"
                required
                value={formData.lastName}
                onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="edit-email">Contact Email *</Label>
            <Input
              id="edit-email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className="mt-1 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-phone" className="mb-1 block">Phone Number</Label>
              <PhoneInputWithCountryCode
                id="edit-phone"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={(e) => setFormData((prev) => ({ ...prev, phoneNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-position">Position / Job Title</Label>
              <Input
                id="edit-position"
                value={formData.position}
                onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="edit-role">System Role Assignment *</Label>
              <select
                id="edit-role"
                required
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full mt-1 p-2.5 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] font-semibold"
              >
                {ALL_ROLES.map((r) => {
                  const style = getRoleStyle(r);
                  return (
                    <option key={r} value={r}>
                      {style.label} ({r})
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <Label htmlFor="edit-company">Company Host Affiliation</Label>
              <select
                id="edit-company"
                value={formData.idCompany}
                onChange={(e) => setFormData((prev) => ({ ...prev, idCompany: e.target.value }))}
                className="w-full mt-1 p-2.5 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)]"
              >
                <option value="">-- None (Independent) --</option>
                {companies.map((c) => (
                  <option key={c.idCompany || c.id} value={c.idCompany || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={updatePersonMutation.isPending}
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white"
            >
              {updatePersonMutation.isPending ? 'Saving Changes...' : 'Save User Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────── */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirm User Deletion"
        description="Are you sure you want to delete this user record?"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-950/40 border border-red-800/50 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="text-xs text-red-200">
              <p className="font-bold text-red-100">Warning: Irreversible Action</p>
              <p className="mt-1">
                You are about to delete user record for <strong className="underline">{payloadName(selectedPerson)}</strong> ({selectedPerson?.email}).
                This will remove their event participations and profile credentials.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={deletePersonMutation.isPending}
              onClick={() => {
                if (selectedPerson) {
                  const targetId = selectedPerson.idPerson ?? selectedPerson.id;
                  if (targetId !== undefined && targetId !== null) {
                    deletePersonMutation.mutate(targetId);
                  }
                }
              }}
              className="bg-red-700 hover:bg-red-600 text-white"
            >
              {deletePersonMutation.isPending ? 'Deleting User...' : 'Delete User Record'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
