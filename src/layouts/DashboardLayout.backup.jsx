import React, { useContext, useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
    Calendar,
    Ticket,
    QrCode,
    User,
    Users,
    LogOut,
    PlusCircle,
    LayoutDashboard,
    Menu,
    ChevronLeft,
    ChevronRight,
    ShieldCheck,
    Building2,
    TrendingUp,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import MobileDrawer from '../components/navigation/MobileDrawer';
import ThemeToggle from '../components/navigation/ThemeToggle';
import LanguageSelector from '../components/ui/LanguageSelector';
import CSTLogo from '../components/ui/CSTLogo';
import ParticleNetwork from '../components/ui/ParticleNetwork';
import { useLanguage } from '../context/LanguageContext';
import { NotificationBell } from '../components/layout/NotificationBell';

/* ─────────────────────────────────────────────────────────────────────────────
   NavItem — Sidebar navigation link with active state
───────────────────────────────────────────────────────────────────────────── */
const NavItem = ({ item, isActive, collapsed, onClick }) => {
    const Icon = item.icon;
    const [hovered, setHovered] = useState(false);

    return (
        <Link
            to={item.path}
            onClick={onClick}
            aria-current={isActive ? 'page' : undefined}
            title={collapsed ? item.label : undefined}
            className="cst-nav-link-animated"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: collapsed ? 0 : '10px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px' : '9px 12px',
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
                position: 'relative',
                overflow: 'hidden',
                minHeight: '40px',
                cursor: 'pointer',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Active left accent bar with animated glow */}
            {isActive && (
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '6px',
                    bottom: '6px',
                    width: '3px',
                    borderRadius: '0 3px 3px 0',
                    background: 'var(--cst-red-600)',
                    boxShadow: '0 0 8px rgba(217,43,43,0.6)',
                }} aria-hidden="true" />
            )}

            <Icon
                size={16}
                aria-hidden="true"
                className="cst-nav-icon"
                style={{
                    flexShrink: 0,
                    color: isActive ? 'var(--cst-blue-500)' : hovered ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
            />

            {!collapsed && (
                <span
                    style={{
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        transition: 'opacity 180ms ease, transform 180ms ease',
                    }}
                >
                    {item.label}
                </span>
            )}
        </Link>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SectionLabel — Collapsible section header in sidebar
───────────────────────────────────────────────────────────────────────────── */
const SectionLabel = ({ label, collapsed }) => {
    if (collapsed) {
        return <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 10px' }} aria-hidden="true" />;
    }
    return (
        <p style={{
            margin: '0 0 4px 0',
            padding: '0 4px',
            fontSize: '10px',
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
        }}>
            {label}
        </p>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   UserCard — Compact user info at bottom of sidebar
───────────────────────────────────────────────────────────────────────────── */
const UserCard = ({ user, collapsed, onLogout }) => {
    const initial = user?.email?.[0]?.toUpperCase() || 'U';
    const displayName = user?.email?.split('@')[0] || 'User';
    const isOrganiser = user?.role === 'EventOrganizer' || user?.role === 'EventOrganiser' || user?.role === 'SuperAdmin' || user?.role === 'Admin';

    return (
        <div style={{
            padding: collapsed ? '8px 6px' : '10px',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--surface-800)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: `all var(--duration-medium) var(--ease-enterprise)`,
            overflow: 'hidden',
        }}>
            {/* Avatar */}
            <div
                className="cst-avatar-glow"
                style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, var(--cst-blue-800), var(--cst-blue-600))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#fff',
                    flexShrink: 0,
                    letterSpacing: '-0.02em',
                    cursor: 'pointer',
                }}
            >
                {initial}
            </div>

            {!collapsed && (
                <>
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                        <p style={{
                            margin: 0,
                            fontSize: 'var(--font-size-sm)',
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                        }}>
                            {displayName}
                        </p>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '10px',
                            fontWeight: 600,
                            color: isOrganiser ? 'var(--cst-blue-400)' : 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            {isOrganiser && <ShieldCheck size={9} aria-hidden="true" />}
                            {user?.role || 'Attendee'}
                        </span>
                    </div>

                    {/* Logout button */}
                    <button
                        onClick={onLogout}
                        aria-label="Sign out"
                        title="Sign out"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '30px',
                            height: '30px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            flexShrink: 0,
                            transition: `all var(--duration-fast)`,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(181,31,36,0.12)';
                            e.currentTarget.style.color = 'var(--cst-red-400)';
                            e.currentTarget.style.borderColor = 'rgba(181,31,36,0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                    >
                        <LogOut size={14} aria-hidden="true" />
                    </button>
                </>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────────────────
   SidebarContent — Shared nav items used in both sidebar and mobile drawer
───────────────────────────────────────────────────────────────────────────── */
const SidebarContent = ({ navSections, location, collapsed, onItemClick, user, onLogout }) => (
    <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: collapsed ? '16px 8px' : '20px 12px',
        gap: '4px',
        transition: `padding var(--duration-medium) var(--ease-enterprise)`,
    }}>
        {/* CST Branding Logo */}
        <div style={{ marginBottom: '20px', paddingLeft: collapsed ? 0 : '4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CSTLogo collapsed={collapsed} height={collapsed ? 32 : 38} />
        </div>

        {/* Nav sections */}
        <nav aria-label="Main navigation" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', overflowX: 'hidden' }}>
            {navSections.map((section) => (
                <div key={section.label}>
                    <SectionLabel label={section.label} collapsed={collapsed} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        {section.items.map((item) => {
                            const isActive = item.path === '/dashboard'
                                ? location.pathname === '/dashboard'
                                : location.pathname.startsWith(item.path);
                            return (
                                <NavItem
                                    key={item.path}
                                    item={item}
                                    isActive={isActive}
                                    collapsed={collapsed}
                                    onClick={onItemClick}
                                />
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>

        {/* Footer: User Card */}
        <div style={{ marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
            <UserCard user={user} collapsed={collapsed} onLogout={onLogout} />
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   DashboardLayout — Main layout shell
───────────────────────────────────────────────────────────────────────────── */
const DashboardLayout = () => {
    const { user, logout, isOrganiser: ctxIsOrganiser } = useContext(AuthContext);
    const isOrganiser = ctxIsOrganiser ?? (user?.role === 'EventOrganizer' || user?.role === 'EventOrganiser' || user?.role === 'SuperAdmin' || user?.role === 'Admin');
    const { t } = useLanguage();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = useCallback(() => {
        logout();
        navigate('/login');
    }, [logout, navigate]);

    const closeMobile = useCallback(() => setMobileOpen(false), []);

    useEffect(() => {
        setMobileOpen(false);
    }, [location.pathname]);

    const coreItems = [
        { label: t('nav.dashboard', 'Workspace Overview'), path: '/dashboard', icon: LayoutDashboard },
        { label: t('nav.events', 'Browse Events'), path: '/events', icon: Calendar },
        { label: t('nav.profile', 'My Profile'), path: '/profile', icon: User },
    ];

    const participantItems = [
        { label: t('nav.registrations', 'My Registrations'), path: '/my-registrations', icon: Ticket },
        { label: t('nav.myPasses', 'My Digital Passes'), path: '/passes', icon: Ticket },
    ];

    const organiserItems = [
        { label: t('nav.createEvent', 'Publish Event'), path: '/events/new', icon: PlusCircle },
        { label: t('nav.users', 'User Roster'), path: '/admin/users', icon: Users },
        { label: t('nav.checkIn', 'Door Check-In'), path: '/admin/check-in', icon: QrCode },
        { label: t('nav.companies', 'Company Hosts'), path: '/admin/companies', icon: Building2 },
        { label: t('nav.analytics', 'Analytics'), path: '/admin/analytics', icon: TrendingUp },
    ];

    const navSections = [
        { label: t('nav.workspace', 'Workspace'), items: coreItems },
        ...(isOrganiser
            ? [{ label: t('nav.management', 'Management'), items: organiserItems }]
            : [{ label: t('nav.myActivity', 'My Activity'), items: participantItems }]
        ),
    ];

    const sidebarWidth = sidebarCollapsed
        ? 'var(--nav-sidebar-collapsed)'
        : 'var(--nav-sidebar-width)';

    const getPageTitle = (path) => {
        if (path === '/dashboard') return t('nav.dashboard', 'Workspace Overview');
        if (path.startsWith('/events/new')) return t('nav.createEvent', 'Publish Event');
        if (path.includes('/attendees')) return t('attendeeRoster.title', 'Attendee Roster');
        if (path.startsWith('/events/')) return t('eventDetails.eventRegistration', 'Event Overview');
        if (path.startsWith('/events')) return t('nav.events', 'Browse Events');
        if (path.startsWith('/tickets')) return t('digitalPass.title', 'Digital Entry Pass');
        if (path.startsWith('/my-registrations')) return t('registrations.title', 'My Registrations');
        if (path.startsWith('/passes')) return t('nav.myPasses', 'My Digital Passes');
        if (path.startsWith('/admin/users')) return t('users.title', 'User Management');
        if (path.startsWith('/admin/check-in') || path.startsWith('/check-in')) return t('checkIn.title', 'Door Check-In Terminal');
        if (path.startsWith('/admin/companies')) return t('companies.title', 'Company Directory');
        if (path.startsWith('/admin/analytics')) return t('analytics.title', 'Executive Analytics');
        if (path.startsWith('/profile')) return t('profile.title', 'Account Profile');
        return t('nav.dashboard', 'Dashboard');
    };

    return (
        <div style={{
            display: 'flex',
            minHeight: '100vh',
            backgroundColor: 'var(--bg-page)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            position: 'relative',
        }}>
            {/* Particle Canvas Background */}
            <ParticleNetwork />

            {/* DESKTOP SIDEBAR */}
            <aside
                aria-label="Sidebar navigation"
                style={{
                    display: 'none',
                    flexDirection: 'column',
                    width: sidebarWidth,
                    minWidth: sidebarWidth,
                    backgroundColor: 'var(--bg-sidebar)',
                    borderRight: '1px solid var(--border-subtle)',
                    position: 'sticky',
                    top: 0,
                    height: '100vh',
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    zIndex: 'var(--z-sidebar)',
                    transition: `width var(--duration-medium) var(--ease-enterprise), min-width var(--duration-medium) var(--ease-enterprise)`,
                    flexShrink: 0,
                }}
                className="cst-sidebar"
            >
                <SidebarContent
                    navSections={navSections}
                    location={location}
                    collapsed={sidebarCollapsed}
                    onItemClick={undefined}
                    user={user}
                    onLogout={handleLogout}
                />

                {/* Sidebar Collapse Toggle Button */}
                <button
                    onClick={() => setSidebarCollapsed((c) => !c)}
                    aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    aria-expanded={!sidebarCollapsed}
                    style={{
                        position: 'absolute',
                        bottom: '16px',
                        right: sidebarCollapsed ? '50%' : '12px',
                        transform: sidebarCollapsed ? 'translateX(50%)' : 'none',
                        width: '24px',
                        height: '24px',
                        borderRadius: 'var(--radius-full)',
                        border: '1px solid var(--border-default)',
                        background: 'var(--surface-800)',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: `all var(--duration-medium) var(--ease-enterprise)`,
                        zIndex: 10,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--surface-700)';
                        e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--surface-800)';
                        e.currentTarget.style.color = 'var(--text-muted)';
                    }}
                >
                    {sidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                </button>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                {/* Desktop Top Header Bar */}
                <header
                    aria-label="Top Header Bar"
                    style={{
                        display: 'none',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 28px',
                        height: 'var(--nav-header-height)',
                        backgroundColor: 'var(--bg-header)',
                        borderBottom: '1px solid var(--border-subtle)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 'var(--z-header)',
                        flexShrink: 0,
                    }}
                    className="cst-desktop-header"
                >
                    {/* Left: Page Title Context */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '15px',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                        }}>
                            {getPageTitle(location.pathname)}
                        </h2>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--nav-active-bg)',
                            color: 'var(--cst-blue-400)',
                            border: '1px solid rgba(29,86,182,0.25)',
                        }}>
                            CST Enterprise
                        </span>
                    </div>

                    {/* Right Utility Bar: ThemeToggle, LanguageSelector, Notification Bell & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <NotificationBell />

                        <LanguageSelector size="sm" />
                        <ThemeToggle size="sm" />
                        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }} />
                        <Link
                            to="/profile"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                textDecoration: 'none',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 500,
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-md)',
                                transition: 'background 180ms ease, transform 180ms ease',
                            }}
                            className="cst-nav-link-animated"
                        >
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {user?.email?.split('@')[0]}
                            </span>
                            <span style={{
                                fontSize: '10px',
                                padding: '2px 6px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--surface-800)',
                                color: 'var(--text-muted)'
                            }}>
                                {user?.role || 'User'}
                            </span>
                        </Link>
                    </div>
                </header>

                {/* Mobile Top Header */}
                <header
                    aria-label="Mobile navigation header"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        height: 'var(--nav-header-height)',
                        backgroundColor: 'var(--bg-header)',
                        borderBottom: '1px solid var(--border-subtle)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 'var(--z-header)',
                        flexShrink: 0,
                    }}
                    className="cst-mobile-header"
                >
                    <CSTLogo height={34} />

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <LanguageSelector size="sm" />
                        <ThemeToggle size="sm" />
                        <button
                            onClick={() => setMobileOpen(true)}
                            aria-label="Open navigation"
                            aria-expanded={mobileOpen}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '36px',
                                height: '36px',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-subtle)',
                                background: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                            }}
                        >
                            <Menu size={18} aria-hidden="true" />
                        </button>
                    </div>
                </header>

                {/* Page Content */}
                <main
                    id="main-content"
                    tabIndex={-1}
                    style={{
                        flex: 1,
                        padding: '28px 32px',
                        overflowY: 'auto',
                    }}
                >
                    <Outlet />
                </main>
            </div>

            {/* MOBILE DRAWER */}
            <MobileDrawer isOpen={mobileOpen} onClose={closeMobile} title="Main navigation">
                <SidebarContent
                    navSections={navSections}
                    location={location}
                    collapsed={false}
                    onItemClick={closeMobile}
                    user={user}
                    onLogout={handleLogout}
                />
            </MobileDrawer>

            {/* Responsive styles */}
            <style>{`
                @media (min-width: 768px) {
                    .cst-sidebar { display: flex !important; }
                    .cst-desktop-header { display: flex !important; }
                    .cst-mobile-header { display: none !important; }
                }
                @media (max-width: 767px) {
                    .cst-sidebar { display: none !important; }
                    .cst-desktop-header { display: none !important; }
                    .cst-mobile-header { display: flex !important; }
                    #main-content { padding: 20px 16px !important; }
                }
            `}</style>
        </div>
    );
};

export default DashboardLayout;