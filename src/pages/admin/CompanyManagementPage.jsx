import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Plus,
  Search,
  Globe,
  Mail,
  Phone,
  LayoutGrid,
  List,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { Modal } from '../../components/ui/Modal';
import { Label } from '../../components/ui/Label';
import { ParallaxCard } from '../../components/ui/ParallaxCard';
import { MagneticIcon } from '../../components/ui/MagneticIcon';
import { InteractiveTableRow } from '../../components/ui/InteractiveTableRow';
import { AddressLocationPicker } from '../../components/maps/AddressLocationPicker';
import { AddressMapTrigger } from '../../components/maps/AddressMapTrigger';
import { ImageUploader } from '../../components/common/ImageUploader';
import { useLanguage } from '../../context/LanguageContext';

const getCompanyLogo = (comp) => {
  if (!comp) return null;
  const raw = comp.logo || comp.Logo || comp.logoUrl || comp.LogoUrl || comp.logo_url || comp.Logo_Url;
  if (!raw) return null;
  if (typeof raw === 'string' && (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('data:'))) {
    return raw;
  }
  if (typeof raw === 'string' && (raw.startsWith('iVBORw0KGgo') || raw.startsWith('/9j/') || raw.startsWith('PHN2Zw'))) {
    return `data:image/png;base64,${raw}`;
  }
  const backendBase = (import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api').replace('/api', '');
  return `${backendBase}${raw.startsWith('/') ? '' : '/'}${raw}`;
};

const CompanyLogoImage = ({ company, className = "w-full h-full object-cover" }) => {
  const [hasError, setHasError] = useState(false);

  const customLogo = getCompanyLogo(company);

  useEffect(() => {
    setHasError(false);
  }, [company?.id, company?.idCompany, company?.logo, company?.Logo, company?.logoUrl, company?.LogoUrl]);

  if (!hasError && customLogo) {
    return (
      <img
        src={customLogo}
        alt={company?.name || 'Company Logo'}
        className={className}
        referrerPolicy="no-referrer"
        onError={() => {
          console.warn('[CompanyLogoImage Error] Failed to load logo URL:', customLogo, 'Company:', company?.name);
          setHasError(true);
        }}
      />
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center font-black text-[var(--cst-blue-400)]">
      {company?.name?.[0]?.toUpperCase() || <Building2 className="w-6 h-6 text-[var(--cst-blue-400)]" />}
    </div>
  );
};

export const CompanyManagementPage = () => {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null); // For details modal
  const [editingCompany, setEditingCompany] = useState(null); // For edit modal
  const [feedback, setFeedback] = useState(null);

  // Form State for New Company
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    address: '',
  });

  // Form State for Editing Company
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: '',
    email: '',
    phone: '',
    website: '',
    logoUrl: '',
    address: '',
  });

  // Fetch Companies
  const {
    data: companies = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
  });

  // Create Company Mutation
  const createCompanyMutation = useMutation({
    mutationFn: async (payload) => {
      const formattedPayload = {
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        address: payload.address,
        expertise: payload.description || payload.expertise,
        description: payload.description,
        website: payload.website,
        logo: payload.logoUrl,
        Logo: payload.logoUrl,
        logoUrl: payload.logoUrl,
        LogoUrl: payload.logoUrl,
      };
      const res = await axiosClient.post(ENDPOINTS.COMPANY.BASE, formattedPayload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setIsAddModalOpen(false);
      setFormData({
        name: '',
        description: '',
        email: '',
        phone: '',
        website: '',
        logoUrl: '',
        address: '',
      });
      setFeedback({ type: 'success', message: 'Company created successfully!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to create company. Please try again.',
      });
    },
  });

  // Update Company Mutation
  const updateCompanyMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const payload = {
        idCompany: parseInt(id, 10),
        id: parseInt(id, 10),
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        expertise: data.description || data.expertise,
        description: data.description,
        website: data.website,
        logo: data.logoUrl,
        Logo: data.logoUrl,
        logoUrl: data.logoUrl,
        LogoUrl: data.logoUrl,
      };
      try {
        const res = await axiosClient.put(ENDPOINTS.COMPANY.BY_ID(id), payload);
        return res.data;
      } catch {
        const res = await axiosClient.put(ENDPOINTS.COMPANY.BASE, payload);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setEditingCompany(null);
      setFeedback({ type: 'success', message: 'Company profile updated successfully!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update company profile.',
      });
    },
  });

  // Delete Company Mutation
  const deleteCompanyMutation = useMutation({
    mutationFn: async (id) => {
      try {
        const res = await axiosClient.delete(ENDPOINTS.COMPANY.BY_ID(id));
        return res.data;
      } catch {
        const res = await axiosClient.delete(`${ENDPOINTS.COMPANY.BASE}/${id}`);
        return res.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      setSelectedCompany(null);
      setFeedback({ type: 'success', message: 'Company deleted successfully!' });
      setTimeout(() => setFeedback(null), 4000);
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Failed to delete company. It may be linked to active events.',
      });
    },
  });

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    createCompanyMutation.mutate(formData);
  };

  const filteredCompanies = companies.filter((comp) => {
    const q = searchQuery.toLowerCase();
    return (
      comp.name?.toLowerCase().includes(q) ||
      comp.description?.toLowerCase().includes(q) ||
      comp.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Feedback Banner */}
      {feedback && (
        <Alert variant={feedback.type === 'error' ? 'destructive' : 'default'} className="cst-stagger-1">
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            )}
            <span>{feedback.message}</span>
          </div>
        </Alert>
      )}

      {/* Header Banner */}
      <Card className="cst-stagger-1 p-6 md:p-8 cst-hero-gradient border-[var(--border-default)] rounded-3xl shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
              <span>{t('companies.title', 'Event-Hosting Companies')}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              {t('companies.title', 'Event-Hosting Companies')}
            </h1>
            <p className="text-xs text-[var(--text-secondary)]">
              {t('companies.subtitle', 'Manage corporate host organization profiles, branding credentials, and partner relationships.')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Metrics */}
            <div className="p-3.5 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl text-center min-w-[100px] shadow-md">
              <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">Total Hosts</span>
              <span className="text-2xl font-black text-[var(--text-primary)]">{companies.length}</span>
            </div>
            <div className="p-3.5 bg-[var(--surface-850)] border border-[var(--border-default)] rounded-2xl text-center min-w-[100px] shadow-md">
              <span className="text-[10px] font-bold uppercase text-[var(--cst-red-400)] block">Active Partners</span>
              <span className="text-2xl font-black text-[var(--cst-red-400)]">{companies.length}</span>
            </div>

            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="cst-btn-motion bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white font-bold text-xs py-3 px-5 rounded-2xl shadow-lg shadow-[rgba(29,86,182,0.3)]"
            >
              <Plus className="w-4 h-4 mr-1.5" /> {t('companies.addNew', 'Add Host Company')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Control Bar: Search & View Toggles */}
      <div className="cst-stagger-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-[var(--surface-900)] p-2.5 px-3 rounded-2xl border border-[var(--border-default)] w-full sm:w-96 shadow-sm">
          <Search className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          <Input
            type="text"
            placeholder={t('general.search', 'Search company by name, email, or domain...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-none shadow-none focus:ring-0 bg-transparent text-xs p-0"
          />
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-[var(--surface-900)] p-1 rounded-2xl border border-[var(--border-default)] self-end sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'grid'
                ? 'bg-[var(--cst-blue-700)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewMode === 'table'
                ? 'bg-[var(--cst-blue-700)] text-white shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <List className="w-3.5 h-3.5" /> Table
          </button>
        </div>
      </div>

      {/* Main Company Content */}
      {isLoading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[var(--cst-blue-600)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[var(--text-secondary)]">Loading company directory...</p>
        </div>
      ) : isError ? (
        <Alert variant="destructive">
          Failed to fetch companies. Please verify backend API availability.
        </Alert>
      ) : filteredCompanies.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-3xl p-8">
          <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto opacity-40" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">No companies found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            {searchQuery
              ? `No registered company matches "${searchQuery}".`
              : 'Click "Add Company" above to register your first event-hosting organization.'}
          </p>
          {!searchQuery && (
            <Button size="sm" onClick={() => setIsAddModalOpen(true)} className="mt-2">
              <Plus className="w-4 h-4 mr-1" /> Add First Company
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="cst-stagger-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company, idx) => {
            const id = company.idCompany || company.id;
            return (
              <ParallaxCard
                key={id || idx}
                className="group relative bg-[var(--surface-900)] border-[var(--border-default)] hover:border-[var(--cst-blue-500)] rounded-3xl p-6 pt-6 shadow-xl cst-card-hover flex flex-col justify-between overflow-hidden transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <MagneticIcon maxShift={8} scaleOnHover={1.08}>
                      <div className="w-14 h-14 rounded-2xl bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/40 flex items-center justify-center font-black text-xl text-[var(--cst-blue-400)] overflow-hidden shrink-0 shadow-md relative">
                        <CompanyLogoImage company={company} />
                      </div>
                    </MagneticIcon>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCompany(company);
                          setEditFormData({
                            name: company.name || '',
                            description: company.description || company.expertise || '',
                            email: company.email || '',
                            phone: company.phone || '',
                            website: company.website || '',
                            logoUrl: company.logo || company.Logo || company.logoUrl || company.LogoUrl || '',
                            address: company.address || '',
                          });
                        }}
                        className="p-1.5 text-slate-400 hover:text-sky-400 bg-slate-900/60 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors cursor-pointer"
                        title="Edit Company Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete '${company.name}'?`)) {
                            deleteCompanyMutation.mutate(id);
                          }
                        }}
                        disabled={deleteCompanyMutation.isPending}
                        className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900/60 hover:bg-slate-800 rounded-xl border border-slate-800 transition-colors cursor-pointer"
                        title="Delete Company"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-[var(--surface-800)] text-[var(--text-muted)] border border-[var(--border-default)] shadow-sm">
                        #{id}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight group-hover:text-[var(--cst-blue-400)] transition-colors">
                    {company.name}
                  </h3>

                  {(company.expertise || company.description) && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2 leading-relaxed">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--cst-blue-400)] block mb-0.5">
                        Expertise
                      </span>
                      {company.expertise || company.description}
                    </p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] space-y-2.5 text-xs text-[var(--text-secondary)]">
                  {company.email && (
                    <div className="flex items-center gap-2">
                      <MagneticIcon maxShift={3} scaleOnHover={1.05}>
                        <Mail className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                      </MagneticIcon>
                      <span className="truncate font-mono">{company.email}</span>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2">
                      <MagneticIcon maxShift={3} scaleOnHover={1.05}>
                        <Phone className="w-3.5 h-3.5 text-[var(--cst-blue-400)] shrink-0" />
                      </MagneticIcon>
                      <span className="font-mono">{company.phone}</span>
                    </div>
                  )}
                  {company.website && (
                    <div className="flex items-center gap-2 pt-0.5">
                      <MagneticIcon maxShift={3} scaleOnHover={1.05}>
                        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      </MagneticIcon>
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px] truncate"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </div>
                  )}

                  <div className="pt-3 flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCompany(company)}
                      className="cst-btn-motion text-[11px] font-bold flex-1 rounded-2xl py-2 cursor-pointer"
                    >
                      {t('companies.viewDetails', 'View Partner Details')}
                    </Button>
                  </div>
                </div>
              </ParallaxCard>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="cst-stagger-3 bg-[var(--surface-900)] border-[var(--border-default)] rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--text-secondary)]">
              <thead className="bg-[var(--surface-850)] text-[var(--text-muted)] uppercase tracking-wider font-semibold border-b border-[var(--border-default)]">
                <tr>
                  <th className="py-3.5 px-6">Company</th>
                  <th className="py-3.5 px-6">ID</th>
                  <th className="py-3.5 px-6">Contact Email</th>
                  <th className="py-3.5 px-6">Phone</th>
                  <th className="py-3.5 px-6">Website</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {filteredCompanies.map((company, idx) => {
                  const id = company.idCompany || company.id;
                  return (
                    <InteractiveTableRow key={id || idx} className="cst-table-row hover:bg-[var(--nav-hover-bg)] transition-colors">
                      <td className="py-4 px-6 font-bold text-[var(--text-primary)]">
                        <div className="flex items-center gap-3">
                          <MagneticIcon maxShift={4} scaleOnHover={1.1}>
                            <div className="w-8 h-8 rounded-xl bg-[var(--surface-800)] border border-[var(--border-default)] flex items-center justify-center font-bold text-xs text-[var(--cst-blue-400)] shrink-0 overflow-hidden shadow-sm relative">
                              <CompanyLogoImage company={company} />
                            </div>
                          </MagneticIcon>
                          <div>
                            <div className="font-bold text-[var(--text-primary)]">{company.name}</div>
                            <div className="text-[10px] text-[var(--text-muted)] font-mono">
                              {company.expertise || company.description
                                ? `${(company.expertise || company.description).substring(0, 35)}...`
                                : 'Partner Host'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-[var(--text-muted)]">#{id}</td>
                      <td className="py-4 px-6 font-mono">{company.email || '—'}</td>
                      <td className="py-4 px-6 font-mono">{company.phone || '—'}</td>
                      <td className="py-4 px-6">
                        {company.website ? (
                          <a
                            href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono text-[11px]"
                          >
                            {company.website.replace(/^https?:\/\//, '')}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCompany(company)}
                            className="cst-btn-motion text-[11px] font-bold text-[var(--cst-blue-400)] hover:text-[var(--cst-blue-300)] cursor-pointer"
                          >
                            Details
                          </Button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCompany(company);
                              setEditFormData({
                                name: company.name || '',
                                description: company.description || company.expertise || '',
                                email: company.email || '',
                                phone: company.phone || '',
                                website: company.website || '',
                                logoUrl: company.logo || company.Logo || company.logoUrl || company.LogoUrl || '',
                                address: company.address || '',
                              });
                            }}
                            className="p-1 text-slate-400 hover:text-sky-400 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete '${company.name}'?`)) {
                                deleteCompanyMutation.mutate(id);
                              }
                            }}
                            disabled={deleteCompanyMutation.isPending}
                            className="p-1 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </InteractiveTableRow>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ADD COMPANY MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Register Event Hosting Company"
        description="Add a new organization to host and manage events on EventHub."
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div>
            <Label htmlFor="company-name" className="text-xs">
              Company / Host Name *
            </Label>
            <Input
              id="company-name"
              name="name"
              type="text"
              required
              placeholder="e.g. CST Technology Labs"
              value={formData.name}
              onChange={handleFormChange}
              className="mt-1 text-xs"
            />
          </div>

          <div>
            <Label htmlFor="company-description" className="text-xs">
              Domain Expertise &amp; Focus Area
            </Label>
            <Input
              id="company-description"
              name="description"
              type="text"
              placeholder="e.g. Cloud Security & AI Engineering"
              value={formData.description}
              onChange={handleFormChange}
              className="mt-1 text-xs"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="company-email" className="text-xs">
                Contact Email
              </Label>
              <Input
                id="company-email"
                name="email"
                type="email"
                placeholder="contact@company.com"
                value={formData.email}
                onChange={handleFormChange}
                className="mt-1 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="company-phone" className="text-xs">
                Phone Number
              </Label>
              <Input
                id="company-phone"
                name="phone"
                type="text"
                placeholder="+1 (555) 000-0000"
                value={formData.phone}
                onChange={handleFormChange}
                className="mt-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="company-website" className="text-xs">
                Website URL
              </Label>
              <Input
                id="company-website"
                name="website"
                type="text"
                placeholder="https://company.com"
                value={formData.website}
                onChange={handleFormChange}
                className="mt-1 text-xs"
              />
            </div>
          <div>
            <ImageUploader
              label="Company Logo"
              value={formData.logoUrl}
              onChange={(url) => setFormData((prev) => ({ ...prev, logoUrl: url }))}
            />
          </div>
          </div>

          <div>
            <Label className="text-xs">Headquarters Location &amp; Map Picker</Label>
            <div className="mt-1">
              <AddressLocationPicker
                value={formData.address}
                onChange={(newAddr) =>
                  setFormData((prev) => ({ ...prev, address: newAddr }))
                }
                placeholder="Search company headquarters address or click map..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={createCompanyMutation.isPending || !formData.name.trim()}
              className="bg-[var(--cst-blue-700)] hover:bg-[var(--cst-blue-600)] text-white"
            >
              {createCompanyMutation.isPending ? 'Registering...' : 'Register Company'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* COMPANY DETAILS MODAL */}
      {selectedCompany && (
        <Modal
          isOpen={Boolean(selectedCompany)}
          onClose={() => setSelectedCompany(null)}
          title={selectedCompany.name}
          description={`Organization Details (ID #${selectedCompany.idCompany || selectedCompany.id})`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center gap-4 p-3 bg-[var(--surface-800)] rounded-2xl border border-[var(--border-default)]">
              <div className="w-14 h-14 rounded-xl bg-[var(--surface-900)] border border-[var(--border-default)] flex items-center justify-center font-bold text-xl text-[var(--cst-blue-400)] overflow-hidden shrink-0">
                <CompanyLogoImage company={selectedCompany} />
              </div>
              <div>
                <div className="font-bold text-sm text-[var(--text-primary)]">{selectedCompany.name}</div>
                <div className="text-[var(--text-muted)]">Registered Event Host</div>
              </div>
            </div>

            {(selectedCompany.expertise || selectedCompany.description) && (
              <div>
                <span className="font-semibold text-[var(--text-muted)] block mb-1">Domain Expertise &amp; Industry Focus</span>
                <p className="text-[var(--text-secondary)] bg-[var(--surface-800)] p-3 rounded-xl border border-[var(--border-subtle)] leading-relaxed">
                  {selectedCompany.expertise || selectedCompany.description}
                </p>
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Email</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedCompany.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Phone</span>
                <span className="font-mono text-[var(--text-primary)]">{selectedCompany.phone || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Headquarters</span>
                <span className="font-medium text-[var(--text-primary)]">
                  <AddressMapTrigger address={selectedCompany.address || selectedCompany.name} showIcon={true}>
                    <span>{selectedCompany.address || selectedCompany.name}</span>
                  </AddressMapTrigger>
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[var(--text-muted)]">Website</span>
                <span>
                  {selectedCompany.website ? (
                    <a
                      href={selectedCompany.website.startsWith('http') ? selectedCompany.website : `https://${selectedCompany.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline font-mono"
                    >
                      {selectedCompany.website}
                    </a>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)]">
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-800/40 hover:bg-red-950/40"
                onClick={() => {
                  const compId = selectedCompany.idCompany || selectedCompany.id;
                  if (window.confirm(`Are you sure you want to delete '${selectedCompany.name}'?`)) {
                    deleteCompanyMutation.mutate(compId);
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Organization
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setEditingCompany(selectedCompany);
                    setEditFormData({
                      name: selectedCompany.name || '',
                      description: selectedCompany.description || selectedCompany.expertise || '',
                      email: selectedCompany.email || '',
                      phone: selectedCompany.phone || '',
                      website: selectedCompany.website || '',
                      logoUrl: selectedCompany.logo || selectedCompany.Logo || selectedCompany.logoUrl || selectedCompany.LogoUrl || '',
                      address: selectedCompany.address || '',
                    });
                    setSelectedCompany(null);
                  }}
                  className="bg-sky-600 hover:bg-sky-500 text-white"
                >
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Profile
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedCompany(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* EDIT COMPANY MODAL */}
      {editingCompany && (
        <Modal
          isOpen={Boolean(editingCompany)}
          onClose={() => setEditingCompany(null)}
          title={`Edit Organization: ${editingCompany.name}`}
          description="Modify company host branding, contact info, and headquarters."
          maxWidth="max-w-lg"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const id = editingCompany.idCompany || editingCompany.id;
              updateCompanyMutation.mutate({ id, data: editFormData });
            }}
            className="space-y-4"
          >
            <div>
              <Label htmlFor="edit-company-name" className="text-xs">
                Company / Host Name *
              </Label>
              <Input
                id="edit-company-name"
                name="name"
                type="text"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <div>
              <Label htmlFor="edit-company-description" className="text-xs">
                Description / Mission
              </Label>
              <Input
                id="edit-company-description"
                name="description"
                type="text"
                value={editFormData.description}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="mt-1 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-company-email" className="text-xs">
                  Contact Email
                </Label>
                <Input
                  id="edit-company-email"
                  name="email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <Label htmlFor="edit-company-phone" className="text-xs">
                  Phone Number
                </Label>
                <Input
                  id="edit-company-phone"
                  name="phone"
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="edit-company-website" className="text-xs">
                  Website URL
                </Label>
                <Input
                  id="edit-company-website"
                  name="website"
                  type="text"
                  value={editFormData.website}
                  onChange={(e) => setEditFormData((prev) => ({ ...prev, website: e.target.value }))}
                  className="mt-1 text-xs"
                />
              </div>

          <div>
            <ImageUploader
              label="Company Logo"
              value={editFormData.logoUrl}
              onChange={(url) => setEditFormData((prev) => ({ ...prev, logoUrl: url }))}
            />
          </div>
            </div>

            <div>
              <Label className="text-xs">Headquarters Location &amp; Map Picker</Label>
              <div className="mt-1">
                <AddressLocationPicker
                  value={editFormData.address}
                  onChange={(newAddr) =>
                    setEditFormData((prev) => ({ ...prev, address: newAddr }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border-subtle)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEditingCompany(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={updateCompanyMutation.isPending || !editFormData.name.trim()}
                className="bg-sky-600 hover:bg-sky-500 text-white"
              >
                {updateCompanyMutation.isPending ? 'Saving...' : 'Save Profile Changes'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CompanyManagementPage;
