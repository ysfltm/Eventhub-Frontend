import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, Sparkles, Lock, ArrowRight, RotateCcw, Check, X, ShieldCheck } from 'lucide-react';
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

export const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const isInvitation = searchParams.get('type') === 'invitation' || searchParams.get('welcome') === 'true';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const navigate = useNavigate();

  const isLinkInvalid = !token || !email;

  // Real-time Password Strength Checklist Rules
  const passRequirements = [
    { id: 'length', label: 'At least 8 characters', valid: newPassword.length >= 8 },
    { id: 'uppercase', label: 'At least 1 uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { id: 'lowercase', label: 'At least 1 lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { id: 'number', label: 'At least 1 number (0-9)', valid: /[0-9]/.test(newPassword) },
    { id: 'special', label: 'At least 1 special symbol (!@#$%...)', valid: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const isPasswordStrong = passRequirements.every((req) => req.valid);
  const isConfirmMatching = newPassword && confirmPassword && newPassword === confirmPassword;
  const isFormValid = isPasswordStrong && isConfirmMatching;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isPasswordStrong) {
      setError('Please satisfy all password strength requirements before proceeding.');
      return;
    }

    if (!isConfirmMatching) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      await axiosClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        email,
        Email: email,
        token,
        Token: token,
        newPassword,
        NewPassword: newPassword,
        password: newPassword,
        Password: newPassword,
        isActive: true,
        IsActive: true,
        isAccountActive: true,
        IsAccountActive: true,
        emailConfirmed: true,
        EmailConfirmed: true,
      });
      setIsSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setError(
        err.response?.data?.message ||
          (isInvitation
            ? 'Failed to activate account. The invitation link may be expired. Please contact your event organiser.'
            : 'Failed to reset password. The link may be expired or invalid. Please request a new link below.')
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
            <span>EventHub Security &amp; Access</span>
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
            {isInvitation ? 'Welcome to EventHub! 🎉' : 'Set Your Account Password'}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {isSuccess
              ? 'Your password has been saved successfully.'
              : isLinkInvalid
              ? 'Security verification check failed.'
              : `Create a strong, secure password for ${email} to access your account & digital passes.`}
          </p>
        </div>

        <div className="mt-6"></div>

        {/* INVALID LINK ERROR STATE */}
        {isLinkInvalid ? (
          <div className="space-y-6 text-center animate-in zoom-in-95 fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
              <AlertCircle className="w-8 h-8" />
            </div>

            <Alert variant="destructive" className="text-left">
              <strong>{isInvitation ? 'Invalid or expired invitation link.' : 'Invalid or missing password reset link.'}</strong>
              <p className="mt-1 text-xs text-rose-300">
                {isInvitation
                  ? 'This invitation link is missing required security tokens or has expired. Please ask your event organizer to resend the invitation.'
                  : 'This reset link is incomplete or missing required security tokens.'}
              </p>
            </Alert>

            <div className="space-y-3 pt-2">
              <MagneticIcon maxShift={4} scaleOnHover={1.02} className="w-full">
                <Link to="/forgot-password" className="w-full block">
                  <Button className="w-full h-11 text-sm font-semibold bg-[var(--cst-blue-600)] hover:bg-[var(--cst-blue-500)] text-white">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Request New Link
                  </Button>
                </Link>
              </MagneticIcon>

              <Link to="/login" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors block">
                Return to Login
              </Link>
            </div>
          </div>
        ) : isSuccess ? (
          /* SUCCESS ANIMATION STATE */
          <div className="space-y-6 text-center animate-in zoom-in-95 fade-in duration-400">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-75" />
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center relative z-10 shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 animate-in zoom-in duration-300" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-[var(--text-primary)]">
                {isInvitation ? 'Account Activated! 🎉' : 'Password Reset Complete!'}
              </h2>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {isInvitation
                  ? 'Your password has been set. You can now log in to claim and view your digital event passes.'
                  : 'Your password has been changed successfully. You can now sign in with your new credentials.'}
              </p>
            </div>

            <MagneticIcon maxShift={4} scaleOnHover={1.02} className="w-full pt-2">
              <Button
                onClick={() => navigate('/login')}
                className="w-full h-11 text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30"
              >
                <span>Go to Login</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </MagneticIcon>
          </div>
        ) : (
          /* RESET PASSWORD FORM */
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-300">
            {error && (
              <Alert variant="destructive" className="mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <div>{error}</div>
                  <Link
                    to="/forgot-password"
                    className="inline-flex items-center gap-1 text-xs text-rose-200 hover:text-white font-semibold underline pt-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Request a new password reset link
                  </Link>
                </div>
              </Alert>
            )}

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  disabled={loading}
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* REAL-TIME PASSWORD STRENGTH CHECKLIST */}
            {newPassword && (
              <div className="p-3 bg-[var(--surface-900)] border border-[var(--border-default)] rounded-xl space-y-1.5 animate-in fade-in duration-200 text-xs">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--cst-blue-400)]" />
                  <span>Password Security Checklist</span>
                </div>
                <div className="grid grid-cols-1 gap-1">
                  {passRequirements.map((req) => (
                    <div key={req.id} className="flex items-center gap-2 transition-colors">
                      {req.valid ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span className={req.valid ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                        {req.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="pl-10 pr-11"
                  disabled={loading}
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassword && !isConfirmMatching && (
                <p className="text-[11px] text-rose-400 mt-1 font-medium flex items-center gap-1">
                  <X className="w-3 h-3" /> Passwords do not match.
                </p>
              )}
            </div>

            {/* Magnetic Submit Button */}
            <MagneticIcon maxShift={5} scaleOnHover={1.02} className="w-full">
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full mt-3 h-11 text-sm font-semibold bg-[var(--cst-blue-600)] hover:bg-[var(--cst-blue-500)] text-white shadow-lg shadow-[rgba(29,86,182,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isInvitation ? 'Activating Account...' : 'Updating Password...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {isInvitation ? <Sparkles className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{isInvitation ? 'Activate Account & Continue 🚀' : 'Save Password & Continue 🚀'}</span>
                  </div>
                )}
              </Button>
            </MagneticIcon>

            {/* Link back to login */}
            <p className="mt-6 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Remembered your credentials?{' '}
              <Link to="/login" className="font-semibold transition-colors" style={{ color: 'var(--cst-blue-500)' }}>
                Return to Login
              </Link>
            </p>
          </form>
        )}
      </TiltCard>
    </RippleBackground>
  );
};

export default ResetPassword;
