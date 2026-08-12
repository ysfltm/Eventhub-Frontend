import React from 'react';
import { Link } from 'react-router-dom';

/**
 * CSTLogo
 * Renders the official CST logo image with options for link wrapping, sizing, and collapsed state.
 */
const CSTLogo = ({
    collapsed = false,
    className = '',
    height = 36,
    showText = true,
    to = '/dashboard'
}) => {
    const logoContent = (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', minWidth: 0 }}>
            <img
                src="/cst-logo.png"
                alt="CST Logo"
                style={{
                    height: `${height}px`,
                    width: 'auto',
                    objectFit: 'contain',
                    flexShrink: 0,
                    borderRadius: 'var(--radius-sm)',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))',
                }}
            />
            {!collapsed && showText && (
                <div style={{ overflow: 'hidden', minWidth: 0 }}>
                    <p style={{
                        margin: 0,
                        fontSize: '15px',
                        fontWeight: 800,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                    }}>
                        EventHub
                    </p>
                    <p style={{
                        margin: 0,
                        fontSize: '9px',
                        fontWeight: 700,
                        color: 'var(--cst-blue-500)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                        whiteSpace: 'nowrap',
                        marginTop: '1px',
                    }}>
                        Solutions Intégrées
                    </p>
                </div>
            )}
        </div>
    );

    if (to) {
        return (
            <Link to={to} className={className} style={{ textDecoration: 'none', display: 'inline-block' }}>
                {logoContent}
            </Link>
        );
    }

    return <div className={className}>{logoContent}</div>;
};

export default CSTLogo;
