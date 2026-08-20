import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Sparkles, Building2, CheckCircle2, X } from 'lucide-react';
import { LinkedInIcon } from '../../components/ui/LinkedInIcon';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Alert } from '../../components/ui/Alert';
import ThemeToggle from '../../components/navigation/ThemeToggle';
import LanguageSelector from '../../components/ui/LanguageSelector';
import CSTLogo from '../../components/ui/CSTLogo';
import ParticleNetwork from '../../components/ui/ParticleNetwork';
import { TiltCard } from '../../components/ui/TiltCard';
import { RippleBackground } from '../../components/ui/RippleBackground';
import { MagneticIcon } from '../../components/ui/MagneticIcon';
import { PhoneInputWithCountryCode } from '../../components/ui/PhoneInputWithCountryCode';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    companyName: '',
    idCompany: null,
    position: '',
    linkedInUrl: '',
    role: 'Attendee',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Company Autocomplete State
  const [companies, setCompanies] = useState([]);
  const [companySuggestions, setCompanySuggestions] = useState([]);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const companyInputContainerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Prefetch registered companies for instant autocomplete
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axiosClient.get(ENDPOINTS.COMPANY.BASE);
        const list = Array.isArray(res.data) ? res.data : (res.data?.items || []);
        setCompanies(list);
      } catch (err) {
        console.warn('Failed to prefetch companies for autocomplete:', err);
      }
    };
    fetchCompanies();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        companyInputContainerRef.current &&
        !companyInputContainerRef.current.contains(e.target)
      ) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleCompanyInputChange = (e) => {
    const val = e.target.value;
    setFormData((prev) => ({
      ...prev,
      companyName: val,
      idCompany: null,
    }));
    setSelectedCompany(null);
    setHighlightedIndex(-1);

    if (val.trim().length > 0) {
      const query = val.toLowerCase();
      const matches = companies.filter((c) =>
        (c.name || '').toLowerCase().includes(query)
      );
      setCompanySuggestions(matches);
      setIsCompanyDropdownOpen(true);
    } else {
      setCompanySuggestions([]);
      setIsCompanyDropdownOpen(false);
    }
  };

  const handleSelectCompany = (company) => {
    const cId = company.idCompany || company.id;
    setFormData((prev) => ({
      ...prev,
      companyName: company.name,
      idCompany: cId,
    }));
    setSelectedCompany(company);
    setIsCompanyDropdownOpen(false);
    setHighlightedIndex(-1);
  };

  const handleClearCompany = () => {
    setFormData((prev) => ({
      ...prev,
      companyName: '',
      idCompany: null,
    }));
    setSelectedCompany(null);
    setCompanySuggestions([]);
    setIsCompanyDropdownOpen(false);
  };

  const handleCompanyKeyDown = (e) => {
    if (!isCompanyDropdownOpen || companySuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < companySuggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : companySuggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < companySuggestions.length) {
        e.preventDefault();
        handleSelectCompany(companySuggestions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsCompanyDropdownOpen(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const effectiveCompanyId = formData.idCompany || selectedCompany?.idCompany || selectedCompany?.id || null;
      const payload = {
        firstName: formData.firstName,
        FirstName: formData.firstName,
        lastName: formData.lastName,
        LastName: formData.lastName,
        email: formData.email,
        Email: formData.email,
        phone: formData.phone,
        Phone: formData.phone,
        password: formData.password,
        Password: formData.password,
        address: formData.address,
        Address: formData.address,
        companyName: formData.companyName,
        CompanyName: formData.companyName,
        idCompany: effectiveCompanyId,
        IdCompany: effectiveCompanyId,
        position: formData.position,
        Position: formData.position,
        linkedInUrl: formData.linkedInUrl ? formData.linkedInUrl.trim() : null,
        LinkedInUrl: formData.linkedInUrl ? formData.linkedInUrl.trim() : null,
        role: 'Attendee',
        Role: 'Attendee',
      };
      await axiosClient.post(ENDPOINTS.AUTH.REGISTER, payload);
      navigate('/login', { state: { message: 'Account created successfully! Please sign in.' } });
    } catch (err) {
      console.error('Registration error details:', err.response?.data);
      let errMsg = 'Registration failed. Please check your information and try again.';
      if (err.response?.data) {
        const data = err.response.data;
        if (data.message) {
          errMsg = data.message;
        } else if (data.errors && typeof data.errors === 'object') {
          const firstErrKey = Object.keys(data.errors)[0];
          const firstErrList = data.errors[firstErrKey];
          errMsg = Array.isArray(firstErrList) ? firstErrList[0] : String(firstErrList);
        } else if (typeof data === 'string') {
          errMsg = data;
        }
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <RippleBackground
      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh' }}
      className="flex items-center justify-center px-4 py-12 relative overflow-hidden"
    >
      <ParticleNetwork />
      {/* Ambient accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(29,86,182,0.12)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(181,31,36,0.10)' }} />

      {/* 3D Tilt Container */}
      <TiltCard
        className="max-w-xl w-full p-8 rounded-3xl shadow-2xl z-10 relative"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Top Header Row with ThemeToggle & LanguageSelector */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--cst-blue-500)]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Join EventHub Platform</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector size="sm" />
            <ThemeToggle size="sm" />
          </div>
        </div>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <MagneticIcon maxShift={8} scaleOnHover={1.05} className="mb-4">
            <CSTLogo height={52} showText={false} to={null} />
          </MagneticIcon>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Create your account</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Select your role to manage or attend high-impact events
          </p>
        </div>

        <div className="mt-6"></div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-5">
            {error}
          </Alert>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-firstName">First Name</Label>
              <Input
                id="reg-firstName"
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                placeholder="Alex"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-lastName">Last Name</Label>
              <Input
                id="reg-lastName"
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                placeholder="Morgan"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="reg-email">Email Address</Label>
              <Input
                id="reg-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="alex@company.com"
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-phone">Phone Number</Label>
              <PhoneInputWithCountryCode
                id="reg-phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-address">Address</Label>
            <Input
              id="reg-address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="123 Corporate Blvd, Suite 400"
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name with Live Autocomplete */}
            <div className="space-y-1.5 relative" ref={companyInputContainerRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="reg-companyName">Company Name</Label>
                {selectedCompany && (
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Linked Host
                  </span>
                )}
              </div>
              <div className="relative">
                <Input
                  id="reg-companyName"
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleCompanyInputChange}
                  onFocus={() => {
                    if (formData.companyName.trim().length > 0) {
                      const query = formData.companyName.toLowerCase();
                      const matches = companies.filter((c) =>
                        (c.name || '').toLowerCase().includes(query)
                      );
                      setCompanySuggestions(matches);
                      setIsCompanyDropdownOpen(true);
                    }
                  }}
                  onKeyDown={handleCompanyKeyDown}
                  placeholder="Type company (e.g. Acme, TechCorp)..."
                  disabled={loading}
                  autoComplete="off"
                  className={selectedCompany ? 'border-emerald-500/50 bg-emerald-950/15 pr-8' : ''}
                />
                {selectedCompany && (
                  <button
                    type="button"
                    onClick={handleClearCompany}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Clear selected company"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Autocomplete Suggestions Dropdown */}
              {isCompanyDropdownOpen && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 right-0 top-full mt-1.5 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-2xl shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-[var(--border-subtle)]"
                  style={{ backdropFilter: 'blur(20px)' }}
                >
                  {companySuggestions.length > 0 ? (
                    <>
                      <div className="px-3 py-1.5 bg-[var(--surface-850)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] flex items-center justify-between">
                        <span>Matching Registered Companies</span>
                        <span className="font-mono text-[10px] text-[var(--cst-blue-400)]">{companySuggestions.length} found</span>
                      </div>
                      {companySuggestions.map((comp, idx) => {
                        const isHighlighted = idx === highlightedIndex;
                        return (
                          <button
                            key={comp.idCompany || comp.id || idx}
                            type="button"
                            onClick={() => handleSelectCompany(comp)}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isHighlighted ? 'bg-[var(--cst-blue-600)]/25 text-white' : 'text-[var(--text-primary)] hover:bg-[var(--surface-800)]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-[var(--surface-800)] border border-[var(--border-default)] flex items-center justify-center shrink-0">
                                <Building2 className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                              </div>
                              <div className="truncate">
                                <div className="font-bold truncate">{comp.name}</div>
                                {comp.address && (
                                  <div className="text-[10px] text-[var(--text-muted)] truncate">{comp.address}</div>
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0 ml-2">
                              Select
                            </span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <div className="p-3 text-center space-y-1">
                      <p className="text-xs text-[var(--text-muted)]">No registered company matching "{formData.companyName}"</p>
                      <button
                        type="button"
                        onClick={() => setIsCompanyDropdownOpen(false)}
                        className="text-[10px] font-semibold text-[var(--cst-blue-400)] hover:underline cursor-pointer"
                      >
                        Use as unlisted organization
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reg-position">Position / Role in Company</Label>
              <Input
                id="reg-position"
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="Head of Operations"
                disabled={loading}
              />
            </div>
          </div>

          {/* System Role Selection Field (Locked to Attendee) */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-role">System Role Assignment</Label>
            <Input
              id="reg-role"
              type="text"
              name="role"
              value="Attendee (Standard Event Participant)"
              disabled
              readOnly
              className="bg-[var(--surface-800)] border-[var(--border-default)] text-[var(--text-muted)] font-semibold text-xs cursor-not-allowed"
            />
          </div>

          {/* Security Policy Notice: All self-registered accounts defaulted to Attendee */}
          <div className="p-3.5 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-blue-300">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-200">Security Policy: </span>
              All new accounts are provisioned with the <strong>Attendee</strong> role by default.
              Elevated privileges (VIP, Speaker, Sponsor, Organiser) are managed by SuperAdmins in User Management.
            </div>
          </div>

          {/* LinkedIn Profile URL Field */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-linkedin" className="flex items-center gap-1.5">
              <LinkedInIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>LinkedIn Profile (Optional)</span>
            </Label>
            <Input
              id="reg-linkedin"
              type="url"
              name="linkedInUrl"
              value={formData.linkedInUrl}
              onChange={handleChange}
              placeholder="https://linkedin.com/in/username"
              disabled={loading}
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-password">Security Password</Label>
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="pr-11"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Magnetic Submit Button */}
          <MagneticIcon maxShift={5} scaleOnHover={1.02} className="w-full">
            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-3 h-11 text-sm font-semibold"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Complete Registration</span>
                </div>
              )}
            </Button>
          </MagneticIcon>
        </form>

        {/* Login Redirect */}
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <Link to="/login" className="font-semibold transition-colors" style={{ color: 'var(--cst-blue-500)' }}>
            Sign in
          </Link>
        </p>
      </TiltCard>
    </RippleBackground>
  );
};

export default RegisterPage;