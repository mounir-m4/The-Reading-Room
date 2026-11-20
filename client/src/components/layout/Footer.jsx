import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Instagram, Facebook, Twitter, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { cmsApi } from '../../services/index.js';
import { pushToast } from '../../store/toastSlice.js';
import BrandLogo from '../common/BrandLogo.jsx';

export default function Footer() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const lang = useAppSelector((s) => s.ui.language);
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);

  const subscribe = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await cmsApi.subscribe(email, lang); dispatch(pushToast(t('toast.subscribed'))); setEmail(''); }
    catch (error) { dispatch(pushToast(error.response?.data?.error?.message || t('toast.error'), 'error')); }
    finally { setBusy(false); }
  };

  return (
    <footer className="mt-20 border-t border-line bg-sand/70">
      <div className="container-premium grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="inline-flex" aria-label="The Reading Room home">
            <BrandLogo size="sm" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">{t('footer.tagline')}</p>
          <div className="mt-5 space-y-2 text-sm text-muted">
            <p className="flex items-start gap-2"><MapPin size={16} className="mt-0.5 shrink-0 text-gold" /> 123 Library Street, Casablanca, Morocco</p>
            <p className="flex items-center gap-2"><Phone size={16} className="text-gold" /> +212 600 000 000</p>
            <p className="flex items-center gap-2"><Mail size={16} className="text-gold" /> hello@thereadingroom.test</p>
          </div>
          <div className="mt-5 flex gap-3">
            {[Instagram, Facebook, Twitter].map((Icon, i) => <a key={i} href="#" className="rounded-full border border-line bg-white p-2 text-muted hover:text-burgundy" aria-label="social"><Icon size={16} /></a>)}
          </div>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">{t('footer.shop')}</h4>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link to="/shop" className="hover:text-burgundy">{t('nav.shop')}</Link></li>
            <li><Link to="/categories" className="hover:text-burgundy">{t('nav.categories')}</Link></li>
            <li><Link to="/authors" className="hover:text-burgundy">{t('nav.authors')}</Link></li>
            <li><Link to="/shop?sale=1" className="hover:text-burgundy">{t('nav.offers')}</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">{t('footer.company')}</h4>
          <ul className="space-y-2.5 text-sm text-muted">
            <li><Link to="/about" className="hover:text-burgundy">{t('nav.about')}</Link></li>
            <li><Link to="/contact" className="hover:text-burgundy">{t('nav.contact')}</Link></li>
            <li><Link to="/pages/faq" className="hover:text-burgundy">FAQ</Link></li>
            <li><Link to="/pages/shipping-policy" className="hover:text-burgundy">Shipping policy</Link></li>
            <li><Link to="/pages/return-policy" className="hover:text-burgundy">Return policy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider">{t('footer.newsletter')}</h4>
          <p className="mb-4 text-sm text-muted">{t('home.newsletterSub')}</p>
          <form onSubmit={subscribe} className="flex overflow-hidden rounded-md border border-line bg-white">
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required placeholder={t('home.newsletterPlaceholder')} className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm outline-none" />
            <button disabled={busy} className="bg-burgundy px-3 text-white hover:bg-burgundy-dark" aria-label="Subscribe"><Send size={16} /></button>
          </form>
          <div className="mt-5 flex flex-wrap gap-3 text-xs text-muted">
            <Link to="/pages/privacy" className="hover:text-burgundy">Privacy</Link>
            <Link to="/pages/terms" className="hover:text-burgundy">Terms</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} The Reading Room. {t('footer.rights')}.
      </div>
    </footer>
  );
}
