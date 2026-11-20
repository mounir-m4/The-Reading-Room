import React, { useEffect, useRef, useState } from 'react';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { setLanguage, setCurrency } from '../../store/uiSlice.js';
import { LANGUAGE_NAMES } from '../../i18n.js';
import { SUPPORTED_CURRENCIES, CURRENCIES } from '../../utils/money.js';

function Dropdown({ trigger, children, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm hover:bg-sand" aria-expanded={open}>
        {trigger}<ChevronDown size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className={`absolute top-full z-50 mt-2 min-w-[170px] rounded-lg border border-line bg-white p-1.5 shadow-lift ${align === 'end' ? 'end-0' : 'start-0'}`}>
          {children}
        </div>
      )}
    </div>
  );
}

export function LanguageSelector({ compact = false }) {
  const { i18n, t } = useTranslation();
  const dispatch = useAppDispatch();
  const language = useAppSelector((s) => s.ui.language);
  return (
    <Dropdown trigger={<><Globe size={16} /><span className={compact ? 'hidden sm:inline' : ''}>{LANGUAGE_NAMES[language] || language}</span></>}>
      {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
        <button
          key={code}
          onClick={() => { dispatch(setLanguage(code)); i18n.changeLanguage(code); }}
          className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-sand ${language === code ? 'text-burgundy' : ''}`}
        >
          {name}{language === code && <Check size={14} />}
        </button>
      ))}
      <div className="border-t border-line px-3 py-2 text-[10px] uppercase tracking-wider text-muted">{t('common.language')}</div>
    </Dropdown>
  );
}

export function CurrencySelector() {
  const dispatch = useAppDispatch();
  const currency = useAppSelector((s) => s.ui.currency);
  return (
    <Dropdown trigger={<span className="font-medium">{currency}</span>}>
      {SUPPORTED_CURRENCIES.map((code) => (
        <button
          key={code}
          onClick={() => dispatch(setCurrency(code))}
          className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm hover:bg-sand ${currency === code ? 'text-burgundy' : ''}`}
        >
          <span>{code} <span className="text-muted">· {CURRENCIES[code].symbol}</span></span>
          {currency === code && <Check size={14} />}
        </button>
      ))}
    </Dropdown>
  );
}
