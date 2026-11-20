import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Star, Quote } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/index.js';
import { cmsApi } from '../../services/index.js';
import { ProductGrid } from '../../components/books/BookCard.jsx';
import { SectionHeader, Skeleton, EmptyState } from '../../components/common/UI.jsx';
import { localize } from '../../utils/localized.js';

const fade = { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 } };

export default function HomePage() {
  const { t, i18n } = useTranslation();
  const currency = useAppSelector((s) => s.ui.currency);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    cmsApi.homepage({ lang: i18n.language, currency }).then((res) => setData(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, [i18n.language, currency]);

  const visible = (key) => data?.sections?.find((s) => s.key === key)?.isVisible !== false;

  return (
    <>
      <Helmet>
        <title>The Reading Room — Discover Your Next Great Read</title>
        <meta name="description" content={t('hero.subtitle')} />
      </Helmet>

      {/* Hero */}
      <section className="relative overflow-hidden bg-sand">
        <div className="container-premium grid min-h-[520px] items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
          <motion.div {...fade} transition={{ duration: 0.7 }} className="relative z-10">
            <span className="eyebrow inline-flex items-center gap-2"><Sparkles size={14} /> {t('hero.badge')}</span>
            <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[68px]">
              {t('hero.title')}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{t('hero.subtitle')}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary px-7 py-3 text-base">{t('hero.explore')} <ArrowRight size={17} className="rtl:rotate-180" /></Link>
              <Link to="/categories" className="btn-secondary px-7 py-3 text-base">{t('hero.collections')}</Link>
            </div>
            <div className="mt-10 flex items-center gap-6 text-xs text-muted">
              <span className="flex items-center gap-1"><Star size={14} className="fill-gold text-gold" /> 4.8 / 5</span>
              <span className="h-4 w-px bg-line" />
              <span>10,000+ happy readers</span>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9 }}
            className="relative hidden lg:block"
          >
            <div className="absolute -inset-6 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative grid grid-cols-3 gap-4">
              {['photo-1495446815901-a7297e633e8d', 'photo-1544947950-fa07a98d237f', 'photo-1512820790803-83ca734da794'].map((id, i) => (
                <div key={id} className={i === 1 ? 'translate-y-10' : ''}>
                  <img
                    src={`https://images.unsplash.com/${id}?w=500&q=80`}
                    alt="Book covers"
                    className="aspect-[3/4] w-full rounded-lg object-cover shadow-lift"
                  />
                </div>
              ))}
            </div>
            <div className="absolute -bottom-4 start-4 rounded-lg bg-white px-5 py-3 shadow-lift">
              <p className="font-serif text-lg text-burgundy">Handpicked</p>
              <p className="text-xs text-muted">for curious minds</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Promo banners */}
      {visible('banners') && data?.banners?.length > 0 && (
        <section className="container-premium py-12">
          <div className="grid gap-4 md:grid-cols-2">
            {data.banners.slice(0, 2).map((banner) => (
              <Link key={banner._id} to={banner.link || '/shop'} className="group relative overflow-hidden rounded-xl bg-ink">
                <img src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-700 group-hover:scale-105" />
                <div className="relative p-8 text-white sm:p-12">
                  <h3 className="max-w-sm font-serif text-3xl">{localize(banner.title, i18n.language)}</h3>
                  <p className="mt-3 max-w-sm text-sm text-white/80">{localize(banner.subtitle, i18n.language)}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-gold">{localize(banner.ctaLabel, i18n.language) || t('common.viewAll')} <ArrowRight size={16} className="rtl:rotate-180" /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {[
        { key: 'featured', title: t('home.featured'), sub: t('home.featuredSub'), link: '/shop?filter=featured' },
        { key: 'bestSellers', title: t('home.bestSellers'), sub: t('home.bestSellersSub'), link: '/shop?sort=bestSellers' },
        { key: 'newArrivals', title: t('home.newArrivals'), sub: t('home.newArrivalsSub'), link: '/shop?sort=newest' },
      ].map((section, index) => visible(section.key) && (
        <section key={section.key} className={`container-premium py-10 ${index % 2 ? 'bg-white/40' : ''}`}>
          <SectionHeader
            title={section.title}
            subtitle={section.sub}
            action={<Link to={section.link} className="flex items-center gap-1 text-sm font-medium text-burgundy hover:underline">{t('common.viewAll')} <ArrowRight size={15} className="rtl:rotate-180" /></Link>}
          />
          {loading ? <ProductGrid books={[]} loading /> : <ProductGrid books={data?.[section.key] || []} />}
        </section>
      ))}

      {/* Categories */}
      {visible('categories') && data?.categories?.length > 0 && (
        <section className="container-premium py-12">
          <SectionHeader title={t('home.categories')} subtitle={t('home.categoriesSub')} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {data.categories.map((cat) => (
              <Link key={cat._id} to={`/categories/${cat.slug}`} className="group flex flex-col items-center gap-3 rounded-xl border border-line bg-white p-5 text-center transition hover:-translate-y-1 hover:shadow-lift">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-sand">
                  {cat.image ? <img src={cat.image} alt="" className="h-full w-full object-cover" /> : <span className="font-serif text-xl text-burgundy">{localize(cat.name, i18n.language)?.[0]}</span>}
                </div>
                <span className="text-sm font-medium">{localize(cat.name, i18n.language)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Mid banner */}
      <section className="container-premium py-10">
        <div className="relative overflow-hidden rounded-2xl bg-burgundy px-8 py-14 text-center text-white sm:px-16">
          <div className="absolute -top-20 -start-20 h-64 w-64 rounded-full bg-gold/20 blur-3xl" />
          <p className="eyebrow text-gold">{t('footer.newsletter')}</p>
          <h2 className="mt-3 font-serif text-4xl">{t('home.newsletter')}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/75">{t('home.newsletterSub')}</p>
          <Link to="/shop" className="btn-gold mt-7">{t('hero.explore')}</Link>
        </div>
      </section>

      {/* Offers + trending */}
      {[
        { key: 'offers', title: t('home.offers'), sub: t('home.offersSub'), link: '/shop?sale=1' },
        { key: 'trending', title: t('home.trending'), sub: t('home.trendingSub'), link: '/shop?sort=popular' },
        { key: 'recommended', title: t('home.recommended'), sub: t('home.recommendedSub'), link: '/shop' },
      ].map((section) => visible(section.key) && (
        <section key={section.key} className="container-premium py-10">
          <SectionHeader title={section.title} subtitle={section.sub} action={<Link to={section.link} className="text-sm font-medium text-burgundy hover:underline">{t('common.viewAll')}</Link>} />
          {loading ? <ProductGrid books={[]} loading /> : <ProductGrid books={data?.[section.key] || []} />}
        </section>
      ))}

      {/* Authors */}
      {visible('authors') && data?.authors?.length > 0 && (
        <section className="container-premium py-12">
          <SectionHeader title={t('home.authors')} subtitle={t('home.authorsSub')} />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {data.authors.map((author) => (
              <Link key={author._id} to={`/authors/${author.slug}`} className="card flex items-center gap-3 overflow-hidden p-3 transition hover:shadow-lift">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sand font-serif text-lg text-burgundy">
                  {author.photo ? <img src={author.photo} alt="" className="h-full w-full object-cover" /> : author.name[0]}
                </div>
                <div className="min-w-0"><p className="truncate text-sm font-medium">{author.name}</p><p className="text-xs text-muted">{t('nav.authors')}</p></div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials */}
      {visible('testimonials') && data?.testimonials?.length > 0 && (
        <section className="bg-sand/60 py-16">
          <div className="container-premium">
            <SectionHeader title={t('home.testimonials')} />
            <div className="grid gap-5 md:grid-cols-3">
              {data.testimonials.map((item) => (
                <div key={item._id} className="card p-6">
                  <Quote className="mb-3 text-gold/50" size={28} />
                  <p className="text-sm leading-relaxed text-ink/80">“{localize(item.quote, i18n.language)}”</p>
                  <div className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-burgundy/10 font-serif text-burgundy">{item.name[0]}</span>
                    <div><p className="text-sm font-medium">{item.name}</p><p className="text-xs text-muted">{item.role}</p></div>
                    <div className="ms-auto text-gold">{'★'.repeat(item.rating)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {!data && !loading && <div className="container-premium py-10"><EmptyState title={t('common.error')} /></div>}
    </>
  );
}
