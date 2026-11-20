import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, User, Menu, X, ChevronDown, LayoutDashboard } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { toggleCart } from '../../store/cartSlice.js';
import { logoutUser } from '../../store/authSlice.js';
import { LanguageSelector, CurrencySelector } from '../common/Selectors.jsx';
import BrandLogo from '../common/BrandLogo.jsx';
import SearchBar from './SearchBar.jsx';

const NAV = [
  { key: 'nav.home', to: '/' },
  { key: 'nav.shop', to: '/shop' },
  { key: 'nav.categories', to: '/categories' },
  { key: 'nav.authors', to: '/authors' },
  { key: 'nav.bestSellers', to: '/shop?sort=bestSellers' },
  { key: 'nav.newArrivals', to: '/shop?sort=newest' },
  { key: 'nav.offers', to: '/shop?sale=1' },
  { key: 'nav.about', to: '/about' },
];

export default function Header() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cartCount = useAppSelector((s) => s.cart.itemCount);
  const wishCount = useAppSelector((s) => s.wishlist.items.length);
  const user = useAppSelector((s) => s.auth.user);
  const type = useAppSelector((s) => s.auth.type);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <div className="bg-burgundy px-5 py-2 text-center text-[11px] tracking-wide text-white/90">
        {t('hero.badge')} · {t('book.freeShipping', { amount: '300 MAD' })}
      </div>
      <header className={`sticky top-0 z-50 border-b border-line/70 bg-canvas/95 backdrop-blur-md transition ${scrolled ? 'shadow-soft' : ''}`}>
        <div className="container-premium">
          <div className="flex h-[74px] items-center gap-4">
            <button className="lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu"><Menu size={24} /></button>

            <Link to="/" className="shrink-0" aria-label="The Reading Room home">
              <span className="hidden sm:block"><BrandLogo /></span>
              <span className="sm:hidden"><BrandLogo compact /></span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-5 xl:flex">
              {NAV.slice(0, 7).map((item) => (
                <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `text-[13px] font-medium transition hover:text-burgundy ${isActive ? 'text-burgundy' : 'text-ink/80'}`}>
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>

            <div className="hidden max-w-[260px] flex-1 md:block xl:max-w-[220px]">
              <SearchBar />
            </div>

            <div className="ms-auto flex items-center gap-0.5 sm:gap-1">
              <div className="hidden lg:block"><LanguageSelector compact /></div>
              <div className="hidden lg:block"><CurrencySelector /></div>
              <Link to={user && type === 'user' ? '/account/wishlist' : '/login'} className="relative rounded p-2 hover:bg-sand" aria-label={t('common.wishlist')}>
                <Heart size={20} />
                {wishCount > 0 && <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[10px] text-white">{wishCount}</span>}
              </Link>
              <button onClick={() => dispatch(toggleCart(true))} className="relative rounded p-2 hover:bg-sand" aria-label={t('common.cart')}>
                <ShoppingBag size={20} />
                {cartCount > 0 && <span className="absolute -top-0.5 -end-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-burgundy px-1 text-[10px] text-white">{cartCount}</span>}
              </button>
              <div className="relative">
                <button onClick={() => setUserOpen(!userOpen)} className="flex items-center gap-1 rounded p-2 hover:bg-sand" aria-label={t('common.account')}>
                  <User size={20} /><ChevronDown size={12} className="hidden sm:block" />
                </button>
                {userOpen && (
                  <div className="absolute end-0 top-full z-50 mt-2 w-52 rounded-lg border border-line bg-white p-1.5 shadow-lift">
                    {type === 'admin' ? (
                      <Link to="/admin" onClick={() => setUserOpen(false)} className="block rounded px-3 py-2 text-sm hover:bg-sand">{t('nav.admin')}</Link>
                    ) : user ? (
                      <>
                        <Link to="/account" onClick={() => setUserOpen(false)} className="block rounded px-3 py-2 text-sm hover:bg-sand">{t('nav.myAccount')}</Link>
                        <Link to="/account/orders" onClick={() => setUserOpen(false)} className="block rounded px-3 py-2 text-sm hover:bg-sand">{t('nav.orders')}</Link>
                        <Link to="/admin/login" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-sand"><LayoutDashboard size={14} />{t('nav.admin')}</Link>
                      </>
                    ) : (
                      <>
                        <Link to="/login" onClick={() => setUserOpen(false)} className="block rounded px-3 py-2 text-sm hover:bg-sand">{t('common.login')}</Link>
                        <Link to="/register" onClick={() => setUserOpen(false)} className="block rounded px-3 py-2 text-sm hover:bg-sand">{t('common.register')}</Link>
                        <Link to="/admin/login" onClick={() => setUserOpen(false)} className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-sand"><LayoutDashboard size={14} />{t('nav.admin')}</Link>
                      </>
                    )}
                    {user && <button onClick={() => { dispatch(logoutUser()); setUserOpen(false); navigate('/'); }} className="w-full rounded px-3 py-2 text-start text-sm text-burgundy hover:bg-sand">{t('common.logout')}</button>}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-line/60 py-2.5 md:hidden">
            <div className="flex-1"><SearchBar /></div>
            <LanguageSelector compact />
            <CurrencySelector />
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 start-0 w-[82%] max-w-sm overflow-y-auto bg-white p-5 shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <BrandLogo />
              <button onClick={() => setMenuOpen(false)}><X size={22} /></button>
            </div>
            <nav className="flex flex-col">
              {[...NAV, { key: 'nav.contact', to: '/contact' }].map((item) => (
                <NavLink key={item.to} to={item.to} onClick={() => setMenuOpen(false)} className={({ isActive }) => `border-b border-line py-3 text-sm ${isActive ? 'text-burgundy' : ''}`}>
                  {t(item.key)}
                </NavLink>
              ))}
            </nav>
            <div className="mt-6 flex gap-2">
              <Link to="/login" onClick={() => setMenuOpen(false)} className="btn-secondary flex-1">{t('common.login')}</Link>
              <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary flex-1">{t('common.register')}</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
