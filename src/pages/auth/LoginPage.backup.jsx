import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Sparkles } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
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
import { useLanguage } from '../../context/LanguageContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await axiosClient.post(ENDPOINTS.AUTH.LOGIN, { email, password });
      const { token, user: userDto, userPerson } = res.data || {};
      const authToken = token || res.data?.token || res.data;
      const userPayload = userDto || userPerson || res.data?.user;

      if (typeof authToken === 'string' && authToken.length > 20) {
        login(authToken, userPayload);
        navigate('/dashboard');
      } else {
        setError('Authentication failed. Server did not return a valid token.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message ||
          'Invalid email or password. Please verify credentials and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative p-4"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <ParticleNetwork />

      <div
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10"
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
            <span>CST Solutions</span>
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
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>{t('auth.welcomeBack', 'Welcome back')}</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {t('auth.signInSubtitle', 'Sign in to access your event passes & management console')}
          </p>
        </div>

        <div className="mt-6"></div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-5">
            {error}
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">{t('auth.emailAddress', 'Email Address')}</Label>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('auth.emailPlaceholder', 'name@company.com')}
              disabled={loading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">{t('auth.password', 'Password')}</Label>
              <a href="#forgot" className="text-xs font-medium transition-colors" style={{ color: 'var(--cst-blue-500)' }}>
                {t('auth.forgotPassword', 'Forgot password?')}
              </a>
            </div>
            <div className="relative">
              <Input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                <span>{t('auth.authenticating', 'Authenticating...')}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                <span>{t('auth.logIn', 'Log In')}</span>
              </div>
            )}
          </Button>
        </form>

        {/* Register Redirect */}
        <p className="mt-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          {t('auth.noAccount', 'Need an EventHub account?')}{' '}
          <Link to="/register" className="font-semibold transition-colors" style={{ color: 'var(--cst-blue-500)' }}>
            {t('auth.registerHere', 'Register here')}
          </Link>
        </p>

      </div>
    </div>
  );
};

export default LoginPage;
