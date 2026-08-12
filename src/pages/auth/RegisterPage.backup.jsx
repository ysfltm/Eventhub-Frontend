import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
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
import { Sparkles } from 'lucide-react';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    companyName: '',
    position: '',
    role: 'Attendee',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        address: formData.address,
        companyName: formData.companyName,
        position: formData.position,
        role: 'Attendee',
      };
      await axiosClient.post(ENDPOINTS.AUTH.REGISTER, payload);
      navigate('/login', { state: { message: 'Account created successfully! Please sign in.' } });
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)', minHeight: '100vh', position: 'relative' }}
      className="flex items-center justify-center px-4 py-12 relative overflow-hidden"
    >
      <ParticleNetwork />
      {/* Ambient accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(29,86,182,0.12)' }} />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(181,31,36,0.10)' }} />

      <div
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
          <div className="mb-4">
            <CSTLogo height={52} showText={false} to={null} />
          </div>
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
              <Input
                id="reg-phone"
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+1 (555) 019-2834"
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
            <div className="space-y-1.5">
              <Label htmlFor="reg-companyName">Company Name</Label>
              <Input
                id="reg-companyName"
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder="Acme Innovations"
                disabled={loading}
              />
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

          {/* Security Policy Notice: All self-registered accounts defaulted to Attendee */}
          <div className="p-3.5 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-start gap-2.5 text-xs text-blue-300">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-blue-200">Security Policy: </span>
              All new accounts are provisioned with the <strong>Attendee</strong> role by default.
              Elevated privileges (VIP, Speaker, Sponsor, Organiser) are managed by SuperAdmins in User Management.
            </div>
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
        </form>

        {/* Login Redirect */}
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <Link to="/login" className="font-semibold transition-colors" style={{ color: 'var(--cst-blue-500)' }}>
            Sign in
          </Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;