import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Phone } from 'lucide-react';

export const COUNTRY_DIAL_CODES = [
  { code: '+216', country: 'TN', name: 'Tunisia', flag: '🇹🇳', example: '98 123 456' },
  { code: '+33', country: 'FR', name: 'France', flag: '🇫🇷', example: '6 12 34 56 78' },
  { code: '+213', country: 'DZ', name: 'Algeria', flag: '🇩🇿', example: '555 12 34 56' },
  { code: '+212', country: 'MA', name: 'Morocco', flag: '🇲🇦', example: '612 34 56 78' },
  { code: '+218', country: 'LY', name: 'Libya', flag: '🇱🇾', example: '91 234 5678' },
  { code: '+20', country: 'EG', name: 'Egypt', flag: '🇪🇬', example: '100 123 4567' },
  { code: '+966', country: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', example: '50 123 4567' },
  { code: '+971', country: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', example: '50 123 4567' },
  { code: '+974', country: 'QA', name: 'Qatar', flag: '🇶🇦', example: '3312 3456' },
  { code: '+965', country: 'KW', name: 'Kuwait', flag: '🇰🇼', example: '9123 4567' },
  { code: '+1', country: 'US', name: 'United States / Canada', flag: '🇺🇸', example: '(555) 123-4567' },
  { code: '+44', country: 'GB', name: 'United Kingdom', flag: '🇬🇧', example: '7911 123456' },
  { code: '+49', country: 'DE', name: 'Germany', flag: '🇩🇪', example: '151 12345678' },
  { code: '+39', country: 'IT', name: 'Italy', flag: '🇮🇹', example: '312 345 6789' },
  { code: '+34', country: 'ES', name: 'Spain', flag: '🇪🇸', example: '612 34 56 78' },
  { code: '+41', country: 'CH', name: 'Switzerland', flag: '🇨🇭', example: '78 123 45 67' },
  { code: '+32', country: 'BE', name: 'Belgium', flag: '🇧🇪', example: '470 12 34 56' },
  { code: '+31', country: 'NL', name: 'Netherlands', flag: '🇳🇱', example: '6 12345678' },
  { code: '+90', country: 'TR', name: 'Turkey', flag: '🇹🇷', example: '532 123 4567' },
  { code: '+86', country: 'CN', name: 'China', flag: '🇨🇳', example: '138 1234 5678' },
  { code: '+91', country: 'IN', name: 'India', flag: '🇮🇳', example: '98765 43210' },
  { code: '+81', country: 'JP', name: 'Japan', flag: '🇯🇵', example: '90 1234 5678' },
];

/**
 * Splits an existing full phone string (e.g. "+21698123456" or "+33 612345678")
 * into matching dial code and remaining national digits.
 */
function parsePhone(fullPhone) {
  if (!fullPhone || typeof fullPhone !== 'string') {
    return { dialCode: '+216', nationalNumber: '' };
  }

  const clean = fullPhone.trim();

  // Look for matching country prefix in descending order of code length
  const sorted = [...COUNTRY_DIAL_CODES].sort((a, b) => b.code.length - a.code.length);
  for (const item of sorted) {
    if (clean.startsWith(item.code)) {
      const rest = clean.slice(item.code.length).replace(/^[\s\-.]+/g, '');
      return { dialCode: item.code, nationalNumber: rest };
    }
  }

  // If no prefix with "+", check if it starts with "00" or raw digits
  if (clean.startsWith('+')) {
    const spaceIdx = clean.indexOf(' ');
    if (spaceIdx > 1) {
      return { dialCode: clean.slice(0, spaceIdx), nationalNumber: clean.slice(spaceIdx + 1).trim() };
    }
  }

  return { dialCode: '+216', nationalNumber: clean.replace(/^\+/, '') };
}

export const PhoneInputWithCountryCode = ({
  id,
  name = 'phone',
  value = '',
  onChange,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  defaultCountry = '+216',
}) => {
  const parsed = useMemo(() => parsePhone(value), [value]);

  const [selectedCode, setSelectedCode] = useState(parsed.dialCode || defaultCountry);
  const [nationalNumber, setNationalNumber] = useState(parsed.nationalNumber || '');

  // Keep internal state in sync if external value changes (e.g. edit modal opens)
  useEffect(() => {
    const p = parsePhone(value);
    setSelectedCode(p.dialCode);
    setNationalNumber(p.nationalNumber);
  }, [value]);

  const currentCountry = useMemo(() => {
    return COUNTRY_DIAL_CODES.find((c) => c.code === selectedCode) || COUNTRY_DIAL_CODES[0];
  }, [selectedCode]);

  const emitCombinedValue = (code, num) => {
    // Strip all spaces, dashes, parentheses to store clean E.164 format: e.g. "+21670500600"
    const digitsOnly = num.replace(/\D/g, '');
    const combined = digitsOnly ? `${code}${digitsOnly}` : '';

    if (typeof onChange === 'function') {
      onChange({
        target: {
          name,
          value: combined,
        },
      });
    }
  };

  const handleCountryChange = (e) => {
    const newCode = e.target.value;
    setSelectedCode(newCode);
    emitCombinedValue(newCode, nationalNumber);
  };

  const handleNumberChange = (e) => {
    const newNum = e.target.value;
    setNationalNumber(newNum);
    emitCombinedValue(selectedCode, newNum);
  };

  return (
    <div className={`relative flex items-center rounded-2xl bg-[var(--bg-input)] border border-[var(--border-default)] focus-within:border-[var(--cst-blue-600)] focus-within:ring-2 focus-within:ring-[var(--cst-blue-600)]/20 transition-all overflow-hidden ${className}`}>
      {/* Country Code Dropdown */}
      <div className="relative shrink-0 flex items-center bg-[var(--surface-800)] border-r border-[var(--border-default)] px-3 py-2.5">
        <span className="text-base mr-1.5 select-none">{currentCountry.flag}</span>
        <span className="text-xs font-mono font-bold text-[var(--text-primary)] select-none">
          {currentCountry.code}
        </span>
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-[var(--text-muted)] pointer-events-none" />

        <select
          value={selectedCode}
          onChange={handleCountryChange}
          disabled={disabled}
          aria-label="Select Country Dial Code"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed bg-transparent text-xs"
        >
          {COUNTRY_DIAL_CODES.map((c) => (
            <option key={`${c.country}-${c.code}`} value={c.code} className="bg-slate-900 text-slate-100 py-1">
              {c.flag} {c.name} ({c.code})
            </option>
          ))}
        </select>
      </div>

      {/* National Phone Number Input */}
      <input
        id={id}
        name={name}
        type="tel"
        value={nationalNumber}
        onChange={handleNumberChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder || currentCountry.example || '98 123 456'}
        className="w-full px-3.5 py-2.5 bg-transparent text-xs font-medium text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed font-mono tracking-wide"
      />
    </div>
  );
};

export default PhoneInputWithCountryCode;
