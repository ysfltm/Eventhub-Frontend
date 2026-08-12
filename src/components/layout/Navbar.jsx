import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Ticket, QrCode, Building2, TrendingUp, Menu, X } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import UserMenu from '../navigation/UserMenu';
import ThemeToggle from '../navigation/ThemeToggle';
import LanguageSelector from '../ui/LanguageSelector';
import CSTLogo from '../ui/CSTLogo';
import { useLanguage } from '../../context/LanguageContext';

const CSTNavLogo = () => <CSTLogo height={34} to="/dashboard" />;

/* ── Nav Link ────────────────────────────────────────────────────────────── */
const NavLink = ({ to, icon: Icon, label, isActive }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <Link
            to={to}
            aria-current={isActive ? 'page' : undefined}
            className="cst-nav-underline cst-nav-link-animated"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '7px',
                padding: '7px 12px',
                borderRadius: 'var(--radius-lg)',
                border: `1px solid ${isActive ? 'rgba(29,86,182,0.25)' : 'transparent'}`,
                background: isActive
                    ? 'var(--nav-active-bg)'
                    : hovered
                    ? 'var(--nav-hover-bg)'
                    : 'transparent',
                color: isActive ? 'var(--cst-blue-400)' : hovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                textDecoration: 'none',
                fontSize: 'var(--font-size-sm)',
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Icon size={15} aria-hidden="true" className="cst-nav-icon" />
            {label}
        </Link>
    );
};

/* ─────────────────────────────────────────────────────────────────────────── */
const Navbar = () => {
    const { user, logout, isAuthenticated } = useContext(AuthContext);
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    // Body scroll lock while mobile menu open
    useEffect(() => {
        document.body.style.overflow = mobileOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    if (!isAuthenticated) return null;

    const isOrganiserOrAdmin = user?.role === 'EventOrganizer' || user?.role === 'EventOrganiser' || user?.role === 'SuperAdmin' || user?.role === 'Admin';

    const navLinks = [
        { name: t('nav.events', 'Events'), path: '/events', icon: Calendar },
        { name: t('nav.myPasses', 'My Passes'), path: '/passes', icon: Ticket },
        ...(isOrganiserOrAdmin
            ? [
                { name: t('nav.checkIn', 'Check-In'), path: '/admin/check-in', icon: QrCode },
                { name: t('nav.companies', 'Companies'), path: '/admin/companies', icon: Building2 },
                { name: t('nav.analytics', 'Analytics'), path: '/admin/analytics', icon: TrendingUp },
              ]
            : []),
    ];

    return (
        <>
            {/* Top Bar */}
            <nav
                aria-label="Primary navigation"
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 'var(--z-header)',
                    backgroundColor: 'var(--bg-header)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--border-subtle)',
                    fontFamily: 'var(--font-sans)',
                }}
            >
                <div style={{
                    maxWidth: '1280px',
                    margin: '0 auto',
                    padding: '0 20px',
                    height: 'var(--nav-header-height)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                }}>
                    {/* Left: Logo + nav links */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0 }}>
                        <CSTNavLogo />

                        {/* Desktop nav links */}
                        <div
                            role="menubar"
                            aria-label="Main navigation links"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                            }}
                            className="cst-navbar-links"
                        >
                            {navLinks.map((link) => (
                                <NavLink
                                    key={link.path}
                                    to={link.path}
                                    icon={link.icon}
                                    label={link.name}
                                    isActive={location.pathname === link.path}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right: user menu + mobile toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {/* Desktop: language selector + theme toggle + user menu */}
                        <div className="cst-navbar-usermenu" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <LanguageSelector />
                            <ThemeToggle />
                            <UserMenu user={user} onLogout={handleLogout} />
                        </div>

                        {/* Mobile: hamburger */}
                        <button
                            onClick={() => setMobileOpen((o) => !o)}
                            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={mobileOpen}
                            aria-haspopup="dialog"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '40px',
                                height: '40px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                background: mobileOpen ? 'var(--surface-800)' : 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: `background var(--duration-fast)`,
                                flexShrink: 0,
                            }}
                            className="cst-navbar-hamburger"
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-800)'; }}
                            onMouseLeave={(e) => { if (!mobileOpen) e.currentTarget.style.background = 'transparent'; }}
                        >
                            {mobileOpen
                                ? <X size={18} aria-hidden="true" />
                                : <Menu size={18} aria-hidden="true" />
                            }
                        </button>
                    </div>
                </div>
            </nav>

            {/* Mobile Dropdown Menu */}
            {mobileOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        aria-hidden="true"
                        onClick={() => setMobileOpen(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 'calc(var(--z-header) - 1)',
                            backgroundColor: 'rgba(2,6,23,0.6)',
                        }}
                    />
                    {/* Panel */}
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Mobile navigation"
                        style={{
                            position: 'fixed',
                            top: 'var(--nav-header-height)',
                            left: 0,
                            right: 0,
                            zIndex: 'var(--z-header)',
                            backgroundColor: 'var(--surface-900)',
                            borderBottom: '1px solid var(--border-default)',
                            padding: '12px 16px 16px',
                            boxShadow: 'var(--shadow-lg)',
                            animation: 'slideDownFade 0.18s var(--ease-enterprise) both',
                        }}
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                            {navLinks.map((link) => {
                                const Icon = link.icon;
                                const isActive = location.pathname === link.path;
                                return (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        aria-current={isActive ? 'page' : undefined}
                                        onClick={() => setMobileOpen(false)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '11px 14px',
                                            borderRadius: 'var(--radius-lg)',
                                            border: `1px solid ${isActive ? 'rgba(29,86,182,0.25)' : 'transparent'}`,
                                            background: isActive ? 'var(--nav-active-bg)' : 'transparent',
                                            color: isActive ? 'var(--cst-blue-400)' : 'var(--text-secondary)',
                                            textDecoration: 'none',
                                            fontSize: 'var(--font-size-base)',
                                            fontWeight: isActive ? 600 : 500,
                                            minHeight: '44px',
                                        }}
                                    >
                                        <Icon size={17} aria-hidden="true" />
                                        {link.name}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* User info + controls in mobile */}
                        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', alignItems: 'center', justify: 'space-between', gap: '8px' }}>
                            <UserMenu user={user} onLogout={handleLogout} />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LanguageSelector />
                                <ThemeToggle />
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Keyframe for mobile panel */}
            <style>{`
                @keyframes slideDownFade {
                    from { opacity: 0; transform: translateY(-8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @media (min-width: 768px) {
                    .cst-navbar-links { display: flex !important; }
                    .cst-navbar-usermenu { display: flex !important; }
                    .cst-navbar-hamburger { display: none !important; }
                }
                @media (max-width: 767px) {
                    .cst-navbar-links { display: none !important; }
                    .cst-navbar-usermenu { display: flex !important; }
                    .cst-navbar-hamburger { display: flex !important; }
                }
            `}</style>
        </>
    );
};

export default Navbar;