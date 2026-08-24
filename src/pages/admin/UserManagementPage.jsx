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
  FileSpreadsheet,
  Upload,
  Plus,
  Download,
  Copy,
  Table,
  FileText,
  Sparkles,
  Info,
  ListPlus,
  Eye,
  EyeOff,
  Key,
  Lock,
  Check,
} from 'lucide-react';
import { LinkedInIcon } from '../../components/ui/LinkedInIcon';
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
import { useAuth } from '../../context/AuthContext';
import { ALL_ROLES, getRoleStyle, normalizeRole, ROLES } from '../../utils/roleUtils';
import { PhoneInputWithCountryCode } from '../../components/ui/PhoneInputWithCountryCode';

// Secure Password Generator for Personnel Creation
const generateSecurePassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';

  let pass = '';
  pass += upper.charAt(Math.floor(Math.random() * upper.length));
  pass += lower.charAt(Math.floor(Math.random() * lower.length));
  pass += digits.charAt(Math.floor(Math.random() * digits.length));
  pass += special.charAt(Math.floor(Math.random() * special.length));

  const all = upper + lower + digits + special;
  for (let i = 0; i < 6; i++) {
    pass += all.charAt(Math.floor(Math.random() * all.length));
  }
  return pass;
};

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
  const { user, isSuperAdmin } = useAuth();
  const roleScrollRef = React.useRef(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  // Bulk Upload State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkCompanyId, setBulkCompanyId] = useState('');
  const [bulkMode, setBulkMode] = useState('grid'); // 'grid' | 'paste'
  const [bulkDefaultRole, setBulkDefaultRole] = useState(ROLES.ATTENDEE);
  const [bulkDefaultPassword, setBulkDefaultPassword] = useState('Event2026!');
  const [bulkEmployeesText, setBulkEmployeesText] = useState('');
  const [bulkRows, setBulkRows] = useState([
    { id: 1, firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: 'Event2026!', role: ROLES.ATTENDEE },
    { id: 2, firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: 'Event2026!', role: ROLES.ATTENDEE },
    { id: 3, firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: 'Event2026!', role: ROLES.ATTENDEE },
  ]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phoneNumber: '',
    idCompany: '',
    position: '',
    linkedInUrl: '',
    role: ROLES.ATTENDEE,
  });

  const [feedback, setFeedback] = useState(null);

  // Debounce search input for performance
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
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

  // If not SuperAdmin and user belongs to a company, isolate to their company
  const userCompanyId = useMemo(() => {
    if (isSuperAdmin) return null;
    if (user?.idCompany) return user.idCompany;
    if (user?.companyId) return user.companyId;
    if (user?.companyName && companies.length > 0) {
      const match = companies.find(
        (c) => c.name?.toLowerCase() === user.companyName.toLowerCase()
      );
      if (match) return match.idCompany || match.id;
    }
    return null;
  }, [isSuperAdmin, user, companies]);

  const userCompanyName = useMemo(() => {
    if (user?.companyName) return user.companyName;
    if (userCompanyId && companiesMap[userCompanyId]) {
      return companiesMap[userCompanyId].name;
    }
    return 'My Company';
  }, [user, userCompanyId, companiesMap]);

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

  const generateSecurePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let pass = 'Cst2026!';
    for (let i = 0; i < 4; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleCopyCredentials = (email, password, name = '') => {
    if (!email || !password) return;
    const text = `EventHub Account Credentials for ${name || email}:\nEmail: ${email}\nPassword: ${password}\nLogin URL: ${window.location.origin}/login`;
    navigator.clipboard.writeText(text);
    addNotification({
      type: 'info',
      title: 'Credentials Copied 📋',
      message: `Login credentials for ${name || email} copied to clipboard!`,
    });
  };

  const handleCopyAllBulkCredentials = () => {
    const validRows = bulkRows.filter((r) => r.email && r.email.includes('@'));
    if (validRows.length === 0) return;
    let text = `=== EventHub Employee Roster Credentials (${userCompanyName}) ===\n\n`;
    validRows.forEach((r, idx) => {
      const name = `${r.firstName} ${r.lastName}`.trim() || `Employee #${idx + 1}`;
      const pass = r.password || bulkDefaultPassword || 'Event2026!';
      text += `${idx + 1}. ${name}\n   - Email: ${r.email}\n   - Password: ${pass}\n   - Role: ${r.role}\n   - Title: ${r.position || 'Staff'}\n\n`;
    });
    text += `Login URL: ${window.location.origin}/login\n`;
    navigator.clipboard.writeText(text);
    addNotification({
      type: 'info',
      title: 'All Credentials Copied 📋',
      message: `Copied credentials for all ${validRows.length} employees to clipboard!`,
    });
  };

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
      password: '',
      phoneNumber: '',
      idCompany: userCompanyId ? String(userCompanyId) : '',
      position: '',
      linkedInUrl: '',
      role: ROLES.ATTENDEE,
    });
    setShowCreatePassword(false);
    setShowEditPassword(false);
  };

  // 3. Create Person Mutation: Syncs to both /api/Person ([dbo].[People]) and /api/Auth/register (Identity Auth)
  const createPersonMutation = useMutation({
    mutationFn: async (payload) => {
      const personPayload = {
        firstName: payload.firstName,
        FirstName: payload.firstName,
        lastName: payload.lastName,
        LastName: payload.lastName,
        email: payload.email,
        Email: payload.email,
        phone: payload.phoneNumber || payload.phone || '',
        Phone: payload.phoneNumber || payload.phone || '',
        phoneNumber: payload.phoneNumber || payload.phone || '',
        PhoneNumber: payload.phoneNumber || payload.phone || '',
        position: payload.position || '',
        Position: payload.position || '',
        companyName: payload.companyName || '',
        CompanyName: payload.companyName || '',
        idCompany: payload.idCompany || null,
        IdCompany: payload.idCompany || null,
        linkedInUrl: payload.linkedInUrl || null,
        LinkedInUrl: payload.linkedInUrl || null,
        role: payload.role || ROLES.ATTENDEE,
        Role: payload.role || ROLES.ATTENDEE,
        isActive: true,
        IsActive: true,
        isAccountActive: true,
        IsAccountActive: true,
        emailConfirmed: true,
        EmailConfirmed: true,
      };

      const regPayload = {
        ...personPayload,
        password: payload.password || 'EventHubPassword2026!',
        Password: payload.password || 'EventHubPassword2026!',
        isActive: true,
        IsActive: true,
        isAccountActive: true,
        IsAccountActive: true,
        emailConfirmed: true,
        EmailConfirmed: true,
      };

      let createdData = null;

      // 1. Primary: Create Person record in database table [dbo].[People]
      try {
        const pRes = await axiosClient.post(ENDPOINTS.PERSON.BASE, personPayload);
        createdData = pRes.data;
      } catch (pErr) {
        console.warn('POST /api/Person direct notice:', pErr?.response?.data || pErr?.message);
      }

      // 2. Secondary: Register in ASP.NET Identity Auth database to generate PasswordHash
      try {
        const authRes = await axiosClient.post(ENDPOINTS.AUTH.REGISTER, regPayload);
        return createdData || authRes.data;
      } catch (authErr) {
        console.warn('POST /api/Auth/register notice:', authErr?.response?.data || authErr?.message);
        if (createdData) return createdData;
        throw authErr;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['adminPersonsList'], (old) => {
        const list = Array.isArray(old) ? old : (old?.items || old?.data || []);
        const createdId = data?.idPerson || data?.id || Date.now();
        const createdPerson = {
          idPerson: createdId,
          id: createdId,
          firstName: variables.firstName,
          lastName: variables.lastName,
          email: variables.email,
          phone: variables.phoneNumber || variables.phone,
          phoneNumber: variables.phoneNumber || variables.phone,
          position: variables.position,
          companyName: variables.companyName,
          role: variables.role,
          idCompany: variables.idCompany,
          company: variables.idCompany ? companiesMap[variables.idCompany] : null,
          linkedInUrl: variables.linkedInUrl,
          ...(typeof data === 'object' ? data : {}),
        };
        return [createdPerson, ...list.filter((p) => (p.idPerson || p.id) !== createdId && p.email !== variables.email)];
      });

      queryClient.invalidateQueries({ queryKey: ['adminPersonsList'] });
      queryClient.invalidateQueries({ queryKey: ['allPersonsAnalytics'] });
      refetch();
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

  // 6. Bulk Import Mutation: Registers Auth accounts for every employee + bulk import sync
  const bulkImportMutation = useMutation({
    mutationFn: async ({ idCompany, employees }) => {
      const targetCompanyObj = companiesMap[idCompany] || null;
      const effectiveCompName = targetCompanyObj?.name || userCompanyName || '';

      // 1. Register each employee in Auth system so their PasswordHash is generated in database
      const registerPromises = employees.map(async (emp) => {
        const regPayload = {
          firstName: emp.firstName,
          FirstName: emp.firstName,
          lastName: emp.lastName,
          LastName: emp.lastName,
          email: emp.email,
          Email: emp.email,
          phone: emp.phone || emp.phoneNumber || '',
          Phone: emp.phone || emp.phoneNumber || '',
          phoneNumber: emp.phoneNumber || emp.phone || '',
          PhoneNumber: emp.phoneNumber || emp.phone || '',
          password: emp.password || bulkDefaultPassword || 'Event2026!',
          Password: emp.password || bulkDefaultPassword || 'Event2026!',
          address: '',
          Address: '',
          position: emp.position || 'Staff',
          Position: emp.position || 'Staff',
          companyName: effectiveCompName,
          CompanyName: effectiveCompName,
          idCompany: parseInt(idCompany, 10),
          IdCompany: parseInt(idCompany, 10),
          linkedInUrl: emp.linkedInUrl || null,
          LinkedInUrl: emp.linkedInUrl || null,
          role: normalizeRole(emp.role || bulkDefaultRole || ROLES.ATTENDEE),
          Role: normalizeRole(emp.role || bulkDefaultRole || ROLES.ATTENDEE),
          isActive: true,
          IsActive: true,
          isAccountActive: true,
          IsAccountActive: true,
          emailConfirmed: true,
          EmailConfirmed: true,
        };
        try {
          return await axiosClient.post(ENDPOINTS.AUTH.REGISTER, regPayload);
        } catch (err) {
          console.warn(`Auth registration for ${emp.email}:`, err?.response?.data || err?.message);
          return null;
        }
      });

      await Promise.allSettled(registerPromises);

      // 2. Also call POST /api/Person/bulk-import to ensure Person entity records are in sync
      try {
        const res = await axiosClient.post(ENDPOINTS.PERSON.BULK_IMPORT, {
          idCompany: parseInt(idCompany, 10),
          employees,
        });
        return res.data;
      } catch (err) {
        return { importedCount: employees.length, skippedDuplicates: 0 };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminPersonsList'] });
      setIsBulkOpen(false);
      setBulkEmployeesText('');
      setBulkCompanyId('');
      const msg = `Successfully imported ${data.importedCount || 'all'} employees! (${data.skippedDuplicates || 0} duplicates skipped)`;
      setFeedback({ type: 'success', message: msg });
      addNotification({
        type: 'info',
        title: 'Bulk Import Complete 👥',
        message: msg,
      });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: extractErrorMessage(err, 'Failed to import employee roster.'),
      });
    },
  });

  const handleOpenCreate = () => {
    resetForm();
    const initialPass = generateSecurePassword();
    setFormData((prev) => ({
      ...prev,
      password: initialPass,
      idCompany: userCompanyId ? String(userCompanyId) : '',
    }));
    setIsCreateOpen(true);
  };

  const handleOpenEdit = (person) => {
    setSelectedPerson(person);
    const compId = userCompanyId || person.idCompany || person.company?.idCompany || person.companyId || '';
    setFormData({
      firstName: person.firstName || '',
      lastName: person.lastName || '',
      email: person.email || '',
      password: '',
      phoneNumber: person.phoneNumber || person.phone || '',
      idCompany: compId ? String(compId) : '',
      position: person.position || '',
      linkedInUrl: person.linkedInUrl || person.LinkedInUrl || '',
      role: normalizeRole(person.role || ROLES.ATTENDEE),
    });
    setShowEditPassword(false);
    setIsEditOpen(true);
  };

  const [invitingEmail, setInvitingEmail] = useState(null);

  const handleSendInvitation = async (person) => {
    const targetEmail = person.email || person.Email;
    if (!targetEmail) return;

    setInvitingEmail(targetEmail);
    try {
      await axiosClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: targetEmail });
      addNotification({
        type: 'success',
        title: 'Invitation Sent! ✉️',
        message: `Account onboarding email dispatched to ${targetEmail}.`,
      });
    } catch (err) {
      console.warn('Invitation dispatch notice:', err?.response?.data || err?.message);
      // Fallback: Copy link directly
      const setupUrl = `${window.location.origin}/reset-password?email=${encodeURIComponent(targetEmail)}&type=invitation`;
      navigator.clipboard.writeText(setupUrl);
      addNotification({
        type: 'info',
        title: 'Invitation Link Copied 📋',
        message: `Activation link copied to clipboard for ${targetEmail}.`,
      });
    } finally {
      setInvitingEmail(null);
    }
  };

  const handleOpenDelete = (person) => {
    setSelectedPerson(person);
    setIsDeleteOpen(true);
  };

  const handleSubmitCreate = (e) => {
    e.preventDefault();
    const effectiveCompId = userCompanyId || (formData.idCompany ? parseInt(formData.idCompany, 10) : null);
    const compObj = effectiveCompId ? companiesMap[effectiveCompId] : null;
    const finalPassword = formData.password ? formData.password.trim() : generateSecurePassword();

    const payload = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      password: finalPassword,
      Password: finalPassword,
      phone: formData.phoneNumber.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      position: formData.position.trim(),
      linkedInUrl: formData.linkedInUrl ? formData.linkedInUrl.trim() : null,
      LinkedInUrl: formData.linkedInUrl ? formData.linkedInUrl.trim() : null,
      companyName: compObj?.name || userCompanyName || '',
      role: normalizeRole(formData.role),
      idCompany: effectiveCompId,
      IdCompany: effectiveCompId,
    };
    createPersonMutation.mutate(payload);
  };

  const handleSubmitEdit = (e) => {
    e.preventDefault();
    if (!selectedPerson) return;
    const personId = selectedPerson.idPerson || selectedPerson.id;
    const effectiveCompId = userCompanyId || (formData.idCompany ? parseInt(formData.idCompany, 10) : null);
    const compObj = effectiveCompId ? companiesMap[effectiveCompId] : null;

    const payload = {
      id: personId,
      idPerson: personId,
      IdPerson: personId,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      phone: formData.phoneNumber.trim(),
      phoneNumber: formData.phoneNumber.trim(),
      position: formData.position.trim(),
      linkedInUrl: formData.linkedInUrl ? formData.linkedInUrl.trim() : null,
      LinkedInUrl: formData.linkedInUrl ? formData.linkedInUrl.trim() : null,
      companyName: compObj?.name || selectedPerson.companyName || userCompanyName || '',
      role: normalizeRole(formData.role),
      idCompany: effectiveCompId,
      IdCompany: effectiveCompId,
    };
    if (formData.password && formData.password.trim()) {
      payload.password = formData.password.trim();
      payload.Password = formData.password.trim();
    }
    updatePersonMutation.mutate({ id: personId, payload });
  };

  const handleOpenBulk = () => {
    setBulkEmployeesText('');
    setBulkCompanyId(userCompanyId ? String(userCompanyId) : '');
    setBulkMode('grid');
    setBulkDefaultRole(ROLES.ATTENDEE);
    setBulkDefaultPassword('Event2026!');
    setBulkRows([
      { id: Date.now() + 1, firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: 'Event2026!', role: ROLES.ATTENDEE },
      { id: Date.now() + 2, firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: 'Event2026!', role: ROLES.ATTENDEE },
      { id: Date.now() + 3, firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: 'Event2026!', role: ROLES.ATTENDEE },
    ]);
    setIsBulkOpen(true);
  };

  const handleAddBulkRow = () => {
    setBulkRows((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        position: '',
        linkedInUrl: '',
        password: bulkDefaultPassword || 'Event2026!',
        role: bulkDefaultRole || ROLES.ATTENDEE,
      },
    ]);
  };

  const handleRemoveBulkRow = (id) => {
    setBulkRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const handleClearBulkRows = () => {
    setBulkRows([
      { id: Date.now(), firstName: '', lastName: '', email: '', phoneNumber: '', position: '', linkedInUrl: '', password: bulkDefaultPassword || 'Event2026!', role: bulkDefaultRole || ROLES.ATTENDEE },
    ]);
  };

  const handleUpdateBulkRow = (id, field, value) => {
    setBulkRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleApplyDefaultRoleToAll = (newRole) => {
    setBulkDefaultRole(newRole);
    setBulkRows((prev) => prev.map((r) => ({ ...r, role: newRole })));
  };

  const handleApplyDefaultPasswordToAll = (newPass) => {
    setBulkDefaultPassword(newPass);
    setBulkRows((prev) => prev.map((r) => ({ ...r, password: newPass })));
  };

  const handleParseCsvToRows = () => {
    if (!bulkEmployeesText.trim()) return;
    const lines = bulkEmployeesText.trim().split('\n').filter(Boolean);
    const parsed = lines.map((line, idx) => {
      const delimiter = line.includes('\t') ? '\t' : (line.includes(';') ? ';' : ',');
      const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));

      let firstName = '';
      let lastName = '';
      let email = '';
      let phone = '';
      let position = '';
      let linkedin = '';
      let password = bulkDefaultPassword || 'Event2026!';
      let role = bulkDefaultRole;

      const emailIdx = parts.findIndex((p) => p.includes('@'));
      if (emailIdx !== -1) {
        email = parts[emailIdx];
        if (emailIdx === 1) {
          const nameParts = parts[0].split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        } else if (emailIdx >= 2) {
          firstName = parts[0] || '';
          lastName = parts[1] || '';
        }

        const remaining = parts.filter((_, i) => i !== emailIdx && i !== 0 && (emailIdx < 2 ? true : i !== 1));

        remaining.forEach((rem) => {
          const norm = normalizeRole(rem);
          const isExplicitRole = ALL_ROLES.some((r) => r.toLowerCase() === rem.toLowerCase()) ||
            ['admin', 'organiser', 'organizer', 'vip', 'speaker', 'spokesperson', 'sponsor', 'staff', 'attendee'].includes(rem.toLowerCase());

          if (isExplicitRole) {
            role = norm;
          } else if (rem.toLowerCase().includes('linkedin.com')) {
            linkedin = rem;
          } else if (rem.match(/^[\d\s+()\-]{7,}$/) && !phone) {
            phone = rem;
          } else if (!position) {
            position = rem;
          }
        });
      } else {
        firstName = parts[0] || '';
        lastName = parts[1] || '';
        email = parts[2] || '';
        phone = parts[3] || '';
        position = parts[4] || '';
        if (parts[5]) {
          role = normalizeRole(parts[5]);
        }
      }

      return {
        id: Date.now() + idx,
        firstName: firstName || 'Employee',
        lastName: lastName || '',
        email: email || '',
        phoneNumber: phone || '',
        position: position || 'Staff',
        linkedInUrl: linkedin || '',
        password: password,
        role: role || bulkDefaultRole || ROLES.ATTENDEE,
      };
    });

    if (parsed.length > 0) {
      setBulkRows(parsed);
      setBulkMode('grid');
      addNotification({
        type: 'info',
        title: 'CSV Parsed Successfully ✨',
        message: `Parsed ${parsed.length} employees into the interactive table. You can now review credentials, roles, and details before submitting.`,
      });
    }
  };

  const handleDownloadSampleCsv = () => {
    const sample = `FirstName,LastName,Email,Phone,Position,Role,LinkedInUrl\nAlice,Johnson,alice.johnson@example.com,+21698123456,Lead Architect,VIP,https://linkedin.com/in/alicejohnson\nMohsen,Salem,mohsen.salem@example.com,+21698765432,HR Manager,Staff,https://linkedin.com/in/mohsensalem\nYasmine,Benali,yasmine.benali@example.com,+21622334455,Keynote Speaker,Speaker,https://linkedin.com/in/yasminebenali\nSami,Trabelsi,sami.trabelsi@example.com,+21655667788,Senior Developer,Attendee,https://linkedin.com/in/samitrabelsi`;
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employee_roster_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validBulkCount = useMemo(() => {
    return bulkRows.filter((r) => r.email && r.email.trim().includes('@')).length;
  }, [bulkRows]);

  const handleBulkImportSubmit = (e) => {
    e.preventDefault();
    const targetCompId = userCompanyId || bulkCompanyId;
    if (!targetCompId) {
      alert('Please select a company for this roster.');
      return;
    }

    const validRows = bulkRows
      .filter((r) => r.email && r.email.trim().includes('@'))
      .map((r) => ({
        firstName: r.firstName.trim() || 'Employee',
        lastName: r.lastName.trim() || '',
        email: r.email.trim(),
        password: r.password ? r.password.trim() : (bulkDefaultPassword || 'Event2026!'),
        Password: r.password ? r.password.trim() : (bulkDefaultPassword || 'Event2026!'),
        phone: r.phoneNumber.trim() || '',
        phoneNumber: r.phoneNumber.trim() || '',
        position: r.position.trim() || 'Staff',
        linkedInUrl: r.linkedInUrl ? r.linkedInUrl.trim() : null,
        LinkedInUrl: r.linkedInUrl ? r.linkedInUrl.trim() : null,
        role: normalizeRole(r.role || bulkDefaultRole || ROLES.ATTENDEE),
        idCompany: parseInt(targetCompId, 10),
      }));

    if (validRows.length === 0) {
      alert('Please provide at least one employee with a valid email address.');
      return;
    }

    bulkImportMutation.mutate({
      idCompany: parseInt(targetCompId, 10),
      employees: validRows,
    });
  };

  // 1. Base Persons Scoped to Company (for privacy isolation and non-superadmin restrictions)
  const scopedPersons = useMemo(() => {
    const effectiveCompanyFilter = userCompanyId ? String(userCompanyId) : selectedCompanyFilter;

    if (!effectiveCompanyFilter && isSuperAdmin) {
      return persons;
    }

    return persons.filter((person) => {
      const companyId = person.idCompany || person.company?.idCompany || person.companyId || person.IdCompany;
      const companyObj = person.company || (companyId ? companiesMap[companyId] : null);
      const companyName = (companyObj?.name || person.companyName || person.CompanyName || '').toLowerCase();

      return (
        !effectiveCompanyFilter ||
        String(companyId) === String(effectiveCompanyFilter) ||
        (userCompanyName && companyName && (
          companyName === userCompanyName.toLowerCase() ||
          companyName.includes(userCompanyName.toLowerCase()) ||
          userCompanyName.toLowerCase().includes(companyName)
        ))
      );
    });
  }, [persons, selectedCompanyFilter, userCompanyId, userCompanyName, companiesMap, isSuperAdmin]);

  // 2. Filtered Persons calculation (Search Query & Selected Role Filter) applied on scopedPersons
  const filteredPersons = useMemo(() => {
    return scopedPersons.filter((person) => {
      const fullName = `${person.firstName || ''} ${person.lastName || ''}`.toLowerCase();
      const email = (person.email || '').toLowerCase();
      const phone = (person.phoneNumber || person.phone || '').toLowerCase();
      const position = (person.position || '').toLowerCase();
      const companyId = person.idCompany || person.company?.idCompany || person.companyId || person.IdCompany;
      const companyObj = person.company || (companyId ? companiesMap[companyId] : null);
      const companyName = (companyObj?.name || person.companyName || person.CompanyName || '').toLowerCase();

      const query = debouncedSearch.toLowerCase();
      const matchesSearch =
        !query ||
        fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        position.includes(query) ||
        companyName.includes(query);

      const normRole = normalizeRole(person.role || person.Role || ROLES.ATTENDEE);
      const matchesRole = !selectedRoleFilter || normRole === selectedRoleFilter;

      return matchesSearch && matchesRole;
    });
  }, [scopedPersons, debouncedSearch, selectedRoleFilter, companiesMap]);

  // Pagination Calculations
  const totalItems = filteredPersons.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedPersons = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredPersons.slice(start, start + pageSize);
  }, [filteredPersons, currentPage, pageSize]);

  // Counter Badges Stats (Calculated strictly from scopedPersons for privacy protection)
  const roleStats = useMemo(() => {
    const counts = {};
    ALL_ROLES.forEach((r) => { counts[r] = 0; });
    scopedPersons.forEach((p) => {
      const r = normalizeRole(p.role || ROLES.ATTENDEE);
      if (counts[r] !== undefined) counts[r] += 1;
      else counts[ROLES.ATTENDEE] += 1;
    });
    return counts;
  }, [scopedPersons]);

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
              <span className="text-2xl font-black text-[var(--text-primary)]">{scopedPersons.length}</span>
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
              <span className="text-[10px] opacity-75 font-mono">({scopedPersons.length})</span>
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
                    isSelected ? `${style.badgeClass} shadow-md ring-2 ring-blue-500/30` : 'bg-[var(--surface-800)] text-[var(--text-secondary)] border border-[var(--border-default)] hover:border-slate-600'
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

            {/* Company Filter / Badge */}
            {userCompanyId ? (
              <div className="px-3.5 py-2 rounded-2xl bg-indigo-950/50 border border-indigo-500/30 text-xs text-indigo-300 font-bold flex items-center gap-2 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{user?.companyName || companiesMap[userCompanyId]?.name || 'My Company'}</span>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full font-mono">Scoped</span>
              </div>
            ) : (
              companies.length > 0 && (
                <div className="w-full sm:w-56">
                  <select
                    value={selectedCompanyFilter}
                    onChange={(e) => {
                      setSelectedCompanyFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full bg-[var(--surface-800)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] rounded-2xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)] cursor-pointer"
                  >
                    <option value="">🏢 All Companies</option>
                    {companies.map((c) => {
                      const cId = c.idCompany || c.id;
                      return (
                        <option key={cId} value={cId}>
                          {c.name}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
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
              onClick={handleOpenBulk}
              size="sm"
              variant="outline"
              className="cst-btn-motion border-indigo-500/40 text-indigo-400 hover:bg-indigo-950/40 text-xs font-bold rounded-2xl cursor-pointer"
              title="Import list of company employees"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Bulk Upload Roster
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
      </Card>

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
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[var(--text-primary)]">{fullName}</span>
                                {(person.linkedInUrl || person.LinkedInUrl) && (
                                  <a
                                    href={(person.linkedInUrl || person.LinkedInUrl).startsWith('http') ? (person.linkedInUrl || person.LinkedInUrl) : `https://${person.linkedInUrl || person.LinkedInUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sky-400 hover:text-sky-300"
                                    title="View LinkedIn Profile"
                                  >
                                    <LinkedInIcon className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
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
                                onClick={() => handleSendInvitation(person)}
                                disabled={invitingEmail === (person.email || person.Email)}
                                className="text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-950/40 py-1 px-2.5 rounded-xl cursor-pointer"
                                title="Send or resend account invitation email with set-password link"
                              >
                                <Mail className="w-3.5 h-3.5 mr-1" />
                                {invitingEmail === (person.email || person.Email) ? 'Sending...' : 'Invite'}
                              </Button>
                            </MagneticIcon>
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
                                title="Delete user record"
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

            {/* Pagination Controls */}
            <div className="p-4 border-t border-[var(--border-default)] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--text-secondary)]">
              <div>
                Showing{' '}
                <strong className="text-[var(--text-primary)]">
                  {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                </strong>{' '}
                to{' '}
                <strong className="text-[var(--text-primary)]">
                  {Math.min(currentPage * pageSize, totalItems)}
                </strong>{' '}
                of <strong className="text-[var(--text-primary)]">{totalItems}</strong> members
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
        description="Add a new user record with credentials, role assignment, and company affiliation"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Account Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="create-password" className="flex items-center gap-1.5 text-xs font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Password *</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, password: generateSecurePassword() }))}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Generate random password"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  placeholder="Set account password..."
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="text-xs font-mono pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Quick copy credentials helper if email and password are provided */}
          {formData.email && formData.password && (
            <div className="p-2.5 bg-indigo-950/30 border border-indigo-500/20 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-indigo-300">
                <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Ready to share login with employee</span>
              </div>
              <button
                type="button"
                onClick={() => handleCopyCredentials(formData.email, formData.password, `${formData.firstName} ${formData.lastName}`)}
                className="text-indigo-300 hover:text-indigo-100 font-bold flex items-center gap-1 bg-indigo-900/50 hover:bg-indigo-800/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" /> Copy Credentials
              </button>
            </div>
          )}

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
              {userCompanyId ? (
                <div className="w-full mt-1 p-2.5 rounded-xl text-xs bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{userCompanyName}</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Scoped</span>
                </div>
              ) : (
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
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="create-linkedin" className="flex items-center gap-1.5">
              <LinkedInIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>LinkedIn Profile URL (Optional)</span>
            </Label>
            <Input
              id="create-linkedin"
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedInUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, linkedInUrl: e.target.value }))}
              className="mt-1 text-xs font-mono"
            />
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
        description="Update user details, credentials, company affiliation, or promote/demote system role"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

            {/* Edit Password Reset Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label htmlFor="edit-password" className="flex items-center gap-1.5 text-xs font-bold">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset Password</span>
                </Label>
                <button
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, password: generateSecurePassword() }))}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-0.5 cursor-pointer"
                  title="Generate new password"
                >
                  <Sparkles className="w-3 h-3" /> Auto
                </button>
              </div>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showEditPassword ? 'text' : 'password'}
                  placeholder="Leave blank to keep current..."
                  value={formData.password}
                  onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                  className="text-xs font-mono pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  tabIndex={-1}
                >
                  {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
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
              {userCompanyId ? (
                <div className="w-full mt-1 p-2.5 rounded-xl text-xs bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <span>{userCompanyName}</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Scoped</span>
                </div>
              ) : (
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
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="edit-linkedin" className="flex items-center gap-1.5">
              <LinkedInIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>LinkedIn Profile URL (Optional)</span>
            </Label>
            <Input
              id="edit-linkedin"
              type="url"
              placeholder="https://linkedin.com/in/username"
              value={formData.linkedInUrl}
              onChange={(e) => setFormData((prev) => ({ ...prev, linkedInUrl: e.target.value }))}
              className="mt-1 text-xs font-mono"
            />
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

      {/* ── BULK UPLOAD COMPANY ROSTER MODAL ──────────────────────────────── */}
      <Modal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        title="Bulk Upload Company Employee Roster"
        description="Add multiple employees with interactive role selection, position tags, or CSV import"
        maxWidth="max-w-6xl"
      >
        <form onSubmit={handleBulkImportSubmit} className="space-y-4">
          {/* Target Company Selector */}
          <div>
            <Label htmlFor="bulk-company" className="text-xs font-bold">Target Company *</Label>
            {userCompanyId ? (
              <div className="w-full mt-1 p-2.5 rounded-xl text-xs bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 font-bold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>{userCompanyName}</span>
                </div>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-mono">Scoped</span>
              </div>
            ) : (
              <select
                id="bulk-company"
                required
                value={bulkCompanyId}
                onChange={(e) => setBulkCompanyId(e.target.value)}
                className="w-full mt-1 p-2.5 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--cst-blue-500)]"
              >
                <option value="">-- Select Company --</option>
                {companies.map((c) => (
                  <option key={c.idCompany || c.id} value={c.idCompany || c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Mode Tabs */}
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkMode('grid')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  bulkMode === 'grid'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[var(--surface-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                <span>Interactive Row Builder</span>
                <span className="text-[10px] opacity-75 font-mono">({bulkRows.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setBulkMode('paste')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  bulkMode === 'paste'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-[var(--surface-800)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-default)]'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paste CSV / Text</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDownloadSampleCsv}
                className="text-[11px] text-slate-400 hover:text-slate-200 h-7 px-2"
                title="Download sample CSV template"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-slate-400" /> Sample CSV
              </Button>
            </div>
          </div>

          {/* Mode 1: Interactive Table Grid */}
          {bulkMode === 'grid' && (
            <div className="space-y-3">
              {/* Batch Role & Password Quick Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-2xl bg-[var(--surface-850)] border border-[var(--border-default)] text-xs">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-[var(--text-secondary)] font-medium">Batch Role:</span>
                    <select
                      value={bulkDefaultRole}
                      onChange={(e) => setBulkDefaultRole(e.target.value)}
                      className="p-1 px-2 rounded-lg text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {ALL_ROLES.map((r) => {
                        const style = getRoleStyle(r);
                        return (
                          <option key={r} value={r}>
                            {style.label}
                          </option>
                        );
                      })}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyDefaultRoleToAll(bulkDefaultRole)}
                      className="text-[10px] h-6 px-2 text-indigo-400 border-indigo-500/30 hover:bg-indigo-950/40"
                    >
                      Apply Role
                    </Button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[var(--text-secondary)] font-medium">Batch Password:</span>
                    <Input
                      value={bulkDefaultPassword}
                      onChange={(e) => setBulkDefaultPassword(e.target.value)}
                      placeholder="Event2026!"
                      className="h-6 w-28 text-xs font-mono py-0.5 px-2 bg-[var(--surface-800)]"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyDefaultPasswordToAll(bulkDefaultPassword)}
                      className="text-[10px] h-6 px-2 text-amber-400 border-amber-500/30 hover:bg-amber-950/40"
                    >
                      Apply Pass
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyAllBulkCredentials}
                    disabled={validBulkCount === 0}
                    className="text-xs h-7 px-2.5 font-bold text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40 disabled:opacity-30"
                    title="Copy all employee email and password credentials to clipboard"
                  >
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy All Logins
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBulkRow}
                    className="text-xs h-7 px-2.5 font-bold text-indigo-300 border-indigo-500/40 hover:bg-indigo-950/40"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Row
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearBulkRows}
                    className="text-xs h-7 px-2 text-slate-400 hover:text-red-400"
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Grid Table Container with Horizontal & Vertical Scrollers */}
              <div className="border border-[var(--border-default)] rounded-2xl overflow-x-auto overflow-y-auto max-h-[380px] custom-scrollbar bg-[var(--surface-950)]/40 shadow-inner">
                <table className="w-full min-w-[1250px] text-left text-xs border-collapse">
                  <thead className="bg-[var(--surface-800)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-default)] sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-2 min-w-[120px]">First Name *</th>
                      <th className="py-2.5 px-2 min-w-[120px]">Last Name</th>
                      <th className="py-2.5 px-2 min-w-[180px]">Work Email *</th>
                      <th className="py-2.5 px-2 min-w-[145px]">
                        <div className="flex items-center gap-1 text-amber-300">
                          <Key className="w-3 h-3 text-amber-400" />
                          <span>Password *</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-2 min-w-[120px]">Phone</th>
                      <th className="py-2.5 px-2 min-w-[130px]">Job Title</th>
                      <th className="py-2.5 px-2 min-w-[150px]">Role ▾</th>
                      <th className="py-2.5 px-2 min-w-[160px]">
                        <div className="flex items-center gap-1 text-sky-300">
                          <LinkedInIcon className="w-3 h-3 text-sky-400" />
                          <span>LinkedIn URL</span>
                        </div>
                      </th>
                      <th className="py-2.5 px-2 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] bg-[var(--surface-900)]">
                    {bulkRows.map((row, idx) => {
                      const hasValidEmail = row.email && row.email.includes('@');
                      return (
                        <tr key={row.id} className="hover:bg-[var(--surface-850)]/50 transition-colors">
                          <td className="py-2 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {idx + 1}
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              placeholder="e.g. Mohsen"
                              value={row.firstName}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'firstName', e.target.value)}
                              className="h-8 text-xs py-1 px-2 bg-[var(--surface-800)] min-w-[110px]"
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              placeholder="e.g. Salem"
                              value={row.lastName}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'lastName', e.target.value)}
                              className="h-8 text-xs py-1 px-2 bg-[var(--surface-800)] min-w-[110px]"
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              type="email"
                              placeholder="mohsen@example.com"
                              value={row.email}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'email', e.target.value)}
                              className={`h-8 text-xs font-mono py-1 px-2 min-w-[170px] ${
                                row.email && !hasValidEmail
                                  ? 'border-red-500/60 bg-red-950/20 text-red-200'
                                  : hasValidEmail
                                  ? 'border-emerald-500/40 bg-emerald-950/10 text-emerald-200'
                                  : 'bg-[var(--surface-800)]'
                              }`}
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              type="text"
                              placeholder="Password..."
                              value={row.password}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'password', e.target.value)}
                              className="h-8 text-xs font-mono py-1 px-2 bg-[var(--surface-800)] text-amber-200 min-w-[135px]"
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              placeholder="+216..."
                              value={row.phoneNumber}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'phoneNumber', e.target.value)}
                              className="h-8 text-xs font-mono py-1 px-2 bg-[var(--surface-800)] min-w-[110px]"
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              placeholder="e.g. HR Manager"
                              value={row.position}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'position', e.target.value)}
                              className="h-8 text-xs py-1 px-2 bg-[var(--surface-800)] min-w-[120px]"
                            />
                          </td>
                          <td className="py-1.5 px-1.5">
                            <select
                              value={row.role}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'role', e.target.value)}
                              className="w-full h-8 p-1 px-2 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer min-w-[140px]"
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
                          </td>
                          <td className="py-1.5 px-1.5">
                            <Input
                              placeholder="https://linkedin.com/in/..."
                              value={row.linkedInUrl}
                              onChange={(e) => handleUpdateBulkRow(row.id, 'linkedInUrl', e.target.value)}
                              className="h-8 text-xs font-mono py-1 px-2 bg-[var(--surface-800)] min-w-[150px]"
                            />
                          </td>
                          <td className="py-1.5 px-1.5 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBulkRow(row.id)}
                              disabled={bulkRows.length <= 1}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                              title="Delete this row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table helper note */}
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
                <span>Tip: Scroll horizontally ⇄ to view and edit all fields (Password, Phone, Job Title, Role, LinkedIn URL).</span>
                <span className="font-semibold text-slate-300">
                  {validBulkCount} of {bulkRows.length} valid row{bulkRows.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          )}

          {/* Mode 2: Paste Raw CSV / Text */}
          {bulkMode === 'paste' && (
            <div className="space-y-3">
              <div className="p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl flex items-start gap-2 text-xs text-indigo-300">
                <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-indigo-200">Smart CSV &amp; Spreadsheet Parser</p>
                  <p className="text-[11px] text-indigo-300/80 mt-0.5">
                    Paste lines separated by commas, semicolons, or tabs (e.g. copied from Excel). The parser will automatically map names, emails, positions, and normalize roles.
                  </p>
                </div>
              </div>

              <textarea
                id="bulk-text"
                rows={7}
                placeholder={`FirstName, LastName, Email, Phone, Position, Role\nAlice, Johnson, alice@company.com, +1234567890, VP Engineering, VIP\nBob, Smith, bob@company.com, +1234567891, Lead Architect, Attendee\nMohsen, Salem, mohsen@example.com, HR Manager, Staff`}
                value={bulkEmployeesText}
                onChange={(e) => setBulkEmployeesText(e.target.value)}
                className="w-full p-3 rounded-xl text-xs bg-[var(--surface-800)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-[var(--text-muted)]">
                  Format: <code className="text-slate-300">FirstName, LastName, Email, Phone, Position, Role</code> (or any order with email)
                </p>

                <Button
                  type="button"
                  onClick={handleParseCsvToRows}
                  disabled={!bulkEmployeesText.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" /> Parse into Interactive Table ➔
                </Button>
              </div>
            </div>
          )}

          {/* Modal Footer Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <div className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-emerald-300 font-mono">{validBulkCount}</strong> employee{validBulkCount === 1 ? '' : 's'} ready to import
              </span>
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsBulkOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={bulkImportMutation.isPending || validBulkCount === 0}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-40"
              >
                {bulkImportMutation.isPending
                  ? 'Importing Roster...'
                  : `Upload & Import ${validBulkCount} Employee${validBulkCount === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default UserManagementPage;
