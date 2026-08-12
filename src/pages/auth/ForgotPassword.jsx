import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, Sparkles, Send, AlertCircle, RefreshCw } from 'lucide-react';
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
import { TiltCard } from '../../components/ui/TiltCard';
import { RippleBackground } from '../../components/ui/RippleBackground';
import { MagneticIcon } from '../../components/ui/MagneticIcon';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const { t } = useLanguage();

  const isEmailValid = EMAIL_REGEX.test(email.trim());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEmailTouched(true);
    setError('');

    if (!isEmailValid) {
      setError('Please enter a valid email address (e.g. name@company.com).');
      return;
    }

    setLoading(true);

    try {
      await axiosClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email: email.trim() });
      setSubmitted(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError(
        err.response?.data?.message ||
          'Unable to process reset request. Please check your network or try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <RippleBackground
      className="min-h-screen flex items-center justify-center relative p-4"
      style={{
        backgroundColor: 'var(--bg-page)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-sans)',
      }}
    >
      <ParticleNetwork />

      {/* 3D Tilt Auth Card */}
      <TiltCard
        className="w-full max-w-md p-8 rounded-2xl shadow-2xl relative z-10"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          backdropFilter: 'blur(16px)',
        }}
      >
        {/* Top Header Row */}
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
          <MagneticIcon maxShift={8} scaleOnHover={1.05} className="mb-4">
            <CSTLogo height={52} showText={false} to={null} />
          </MagneticIcon>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            {t('auth.resetPasswordTitle', 'Forgot Password')}
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {submitted
              ? t('auth.emailSentSub', 'Instructions have been dispatched to your inbox.')
              : t('auth.forgotPasswordSub', 'Enter your registered email address and we will send you recovery instructions.')}
          </p>
        </div>

        <div className="mt-6"></div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div>{error}</div>
                <button
                  type="button"
                  onClick={() => setError('')}
                  className="text-xs underline text-rose-200 hover:text-white flex items-center gap-1 pt-1"
                >
                  <RefreshCw className="w-3 h-3" /> Dismiss &amp; Retry
                </button>
              </div>
            </div>
          </Alert>
        )}

        {/* SUCCESS CONFIRMATION STATE */}
        {submitted ? (
          <div className="space-y-6 text-center animate-in zoom-in-95 fade-in duration-400">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="p-4 rounded-xl bg-[var(--surface-800)] border border-[var(--border-subtle)] space-y-1">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Check your email!
              </p>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                If an account exists for <span className="font-mono text-sky-400 font-semibold">{email}</span>, instructions have been sent.
              </p>
            </div>

            <p className="text-xs text-[var(--text-muted)]">
              Didn't receive an email? Check your spam folder or{' '}
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="text-[var(--cst-blue-400)] hover:underline font-semibold"
              >
                try again
              </button>
              .
            </p>

            <MagneticIcon maxShift={4} scaleOnHover={1.02} className="w-full pt-2">
              <Link to="/login" className="w-full block">
                <Button variant="outline" className="w-full h-11 text-sm font-semibold">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Return to Sign In
                </Button>
              </Link>
            </MagneticIcon>
          </div>
        ) : (
          /* FORGOT PASSWORD FORM */
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email">{t('auth.emailAddress', 'Email Address')}</Label>
              <div className="relative">
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailTouched) setError('');
                  }}
                  onBlur={() => setEmailTouched(true)}
                  required
                  placeholder={t('auth.emailPlaceholder', 'name@company.com')}
                  disabled={loading}
                  className={`pl-10 ${emailTouched && email && !isEmailValid ? 'border-rose-500 focus:ring-rose-500' : ''}`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
              {emailTouched && email && !isEmailValid && (
                <p className="text-[11px] text-rose-400 mt-1 font-medium">
                  Please enter a valid email format (e.g., user@domain.com).
                </p>
              )}
            </div>

            {/* Magnetic Submit Button */}
            <MagneticIcon maxShift={5} scaleOnHover={1.02} className="w-full">
              <Button
                type="submit"
                disabled={loading || !email.trim() || !isEmailValid}
                className="w-full mt-3 h-11 text-sm font-semibold bg-[var(--cst-blue-600)] hover:bg-[var(--cst-blue-500)] text-white shadow-lg shadow-[rgba(29,86,182,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Sending Link...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    <span>Send Reset Instructions</span>
                  </div>
                )}
              </Button>
            </MagneticIcon>

            {/* Back to Login Redirect */}
            <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Remember your password?{' '}
              <Link to="/login" className="font-semibold transition-colors inline-flex items-center gap-1" style={{ color: 'var(--cst-blue-500)' }}>
                <ArrowLeft className="w-3.5 h-3.5 inline" />
                Back to Sign In
              </Link>
            </p>
          </form>
        )}
      </TiltCard>
    </RippleBackground>
  );
};

export default ForgotPassword;
