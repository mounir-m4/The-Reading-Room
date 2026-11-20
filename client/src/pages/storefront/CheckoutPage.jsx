import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CreditCard, Banknote, FlaskConical, Lock, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { clearCart } from '../../store/cartSlice.js';
import { pushToast } from '../../store/toastSlice.js';
import { orderApi, cmsApi, paymentsApi } from '../../services/index.js';
import { formatMoney } from '../../utils/currency.js';
import { Breadcrumbs, Button, Input, Select, Textarea, EmptyState } from '../../components/common/UI.jsx';

const schema = z.object({
  firstName: z.string().min(2), lastName: z.string().min(2),
  email: z.string().email(), phone: z.string().min(5),
  addressLine1: z.string().min(3), addressLine2: z.string().optional(),
  city: z.string().min(2), region: z.string().optional(),
  postalCode: z.string().optional(), country: z.string().default('Morocco'),
  shippingZone: z.string().optional(), paymentMethod: z.enum(['cod', 'stripe', 'mock']),
  notes: z.string().optional(),
});

const STEPS = ['information', 'shipping', 'payment', 'review'];

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const cart = useAppSelector((s) => s.cart);
  const currency = useAppSelector((s) => s.ui.currency);
  const user = useAppSelector((s) => s.auth.user);
  const [step, setStep] = useState(0);
  const [summary, setSummary] = useState(null);
  const [zones, setZones] = useState([]);
  const [paymentConfig, setPaymentConfig] = useState({ stripeEnabled: false, mockEnabled: true });
  const [busy, setBusy] = useState(false);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.name?.split(' ')[0] || '', lastName: user?.name?.split(' ').slice(1).join(' ') || '',
      email: user?.email || '', phone: user?.phone || '', country: 'Morocco',
      paymentMethod: 'cod',
    },
  });
  const values = watch();

  useEffect(() => {
    cmsApi.shippingZones().then((r) => setZones(r.data)).catch(() => {});
    cmsApi.paymentConfig().then((r) => setPaymentConfig(r.data)).catch(() => {});
  }, []);

  const items = useMemo(() => cart.items.map((line) => ({ book: line.book._id, quantity: line.quantity })), [cart.items]);

  useEffect(() => {
    if (!items.length) return;
    orderApi.preview({ items, currency, couponCode: cart.coupon, shippingZone: values.shippingZone || undefined })
      .then((r) => setSummary(r.data)).catch(() => {});
  }, [items, currency, cart.coupon, values.shippingZone]);

  const next = async () => {
    const fields = [
      ['firstName', 'lastName', 'email', 'phone'],
      ['addressLine1', 'city', 'country'],
      ['paymentMethod'],
    ][step];
    if (await trigger(fields)) setStep(Math.min(3, step + 1));
  };

  const placeOrder = async () => {
    setBusy(true);
    const payload = {
      items, currency, couponCode: cart.coupon,
      shippingZone: values.shippingZone || undefined,
      paymentMethod: values.paymentMethod,
      cartId: cart.id,
      customer: { firstName: values.firstName, lastName: values.lastName, email: values.email, phone: values.phone },
      shippingAddress: {
        fullName: `${values.firstName} ${values.lastName}`, phone: values.phone,
        addressLine1: values.addressLine1, addressLine2: values.addressLine2,
        city: values.city, region: values.region, postalCode: values.postalCode, country: values.country,
      },
      notes: values.notes, language: i18n.language,
    };
    try {
      if (values.paymentMethod === 'stripe') {
        const res = await paymentsApi.stripeSession(payload);
        if (res.data?.url) { window.location.href = res.data.url; return; }
      }
      const res = await orderApi.create(payload);
      if (values.paymentMethod === 'mock') {
        try { await paymentsApi.mock(res.data._id); } catch { /* order still created */ }
      }
      await dispatch(clearCart());
      dispatch(pushToast(t('toast.orderPlaced')));
      navigate(`/order-success?order=${res.data.orderNumber}`, { replace: true });
    } catch (error) {
      dispatch(pushToast(error.response?.data?.error?.message || t('toast.error'), 'error'));
    } finally { setBusy(false); }
  };

  if (!cart.items.length) return <div className="container-premium py-16"><EmptyState title={t('cart.empty')} action={<Link to="/shop" className="btn-primary">{t('cart.startShopping')}</Link>} /></div>;

  return (
    <div className="container-premium py-8">
      <Helmet><title>{`${t('checkout.title')} — The Reading Room`}</title></Helmet>
      <Breadcrumbs items={[{ label: t('cart.title'), to: '/cart' }, { label: t('checkout.title') }]} />
      <h1 className="mt-6 font-serif text-4xl font-semibold">{t('checkout.title')}</h1>

      <div className="mt-7 flex items-center justify-between gap-1 overflow-x-auto pb-2">
        {STEPS.map((key, i) => (
          <div key={key} className="flex min-w-fit items-center gap-2">
            <button onClick={() => i < step && setStep(i)} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${i <= step ? 'bg-burgundy text-white' : 'bg-sand text-muted'}`}>
              {i < step ? <Check size={15} /> : i + 1}
            </button>
            <span className={`text-xs font-medium ${i === step ? 'text-burgundy' : 'text-muted'}`}>{t(`checkout.${key}`)}</span>
            {i < STEPS.length - 1 && <span className="mx-2 hidden h-px w-10 bg-line sm:block" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(placeOrder)} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="rounded-lg border border-line bg-white p-6">
          {step === 0 && (
            <div>
              <h2 className="font-serif text-2xl">{t('checkout.information')}</h2>
              {!user && <p className="mt-2 text-sm text-muted">{t('checkout.guestCheckout')} · <Link to="/login" className="text-burgundy underline">{t('checkout.haveAccount')}</Link></p>}
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input label={t('checkout.firstName')} {...register('firstName')} error={errors.firstName?.message} />
                <Input label={t('checkout.lastName')} {...register('lastName')} error={errors.lastName?.message} />
                <Input label={t('common.email')} type="email" {...register('email')} error={errors.email?.message} />
                <Input label={t('checkout.phone')} {...register('phone')} placeholder="+212 600 000 000" error={errors.phone?.message} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div>
              <h2 className="font-serif text-2xl">{t('checkout.shipping')}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Input label={t('checkout.addressLine1')} className="sm:col-span-2" {...register('addressLine1')} error={errors.addressLine1?.message} />
                <Input label="Address 2" className="sm:col-span-2" {...register('addressLine2')} />
                <Input label={t('checkout.city')} {...register('city')} error={errors.city?.message} />
                <Input label={t('checkout.region')} {...register('region')} />
                <Input label={t('checkout.postalCode')} {...register('postalCode')} />
                <Select label={t('checkout.country')} options={['Morocco', 'France', 'United States', 'United Kingdom']} {...register('country')} />
              </div>
              <div className="mt-6">
                <label className="label">{t('checkout.delivery')}</label>
                <div className="space-y-2">
                  {zones.map((zone) => (
                    <label key={zone._id} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-sm ${values.shippingZone === zone._id ? 'border-burgundy bg-burgundy/5' : 'border-line'}`}>
                      <span className="flex items-center gap-2">
                        <input type="radio" value={zone._id} {...register('shippingZone')} className="accent-burgundy" />
                        {zone.name?.en || zone.name?.fr || zone.name?.ar}
                        <span className="text-xs text-muted">({zone.estimatedDaysMin}–{zone.estimatedDaysMax} days)</span>
                      </span>
                      <span className="font-medium">{zone.price === 0 ? t('common.free') : formatMoney(zone.price, currency, i18n.language)}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Textarea label={t('checkout.notes')} className="mt-5" {...register('notes')} />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-serif text-2xl">{t('checkout.payment')}</h2>
              <div className="mt-6 space-y-3">
                <label className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 ${values.paymentMethod === 'cod' ? 'border-burgundy bg-burgundy/5' : 'border-line'}`}>
                  <input type="radio" value="cod" {...register('paymentMethod')} className="accent-burgundy" />
                  <Banknote className="text-gold" size={22} />
                  <span><span className="block text-sm font-medium">{t('checkout.cod')}</span><span className="text-xs text-muted">Pay when your order arrives</span></span>
                </label>
                {paymentConfig.stripeEnabled && (
                  <label className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 ${values.paymentMethod === 'stripe' ? 'border-burgundy bg-burgundy/5' : 'border-line'}`}>
                    <input type="radio" value="stripe" {...register('paymentMethod')} className="accent-burgundy" />
                    <CreditCard className="text-gold" size={22} />
                    <span><span className="block text-sm font-medium">{t('checkout.stripe')}</span><span className="text-xs text-muted">Secure card checkout</span></span>
                  </label>
                )}
                {paymentConfig.mockEnabled && (
                  <label className={`flex cursor-pointer items-center gap-4 rounded-lg border p-4 ${values.paymentMethod === 'mock' ? 'border-burgundy bg-burgundy/5' : 'border-line'}`}>
                    <input type="radio" value="mock" {...register('paymentMethod')} className="accent-burgundy" />
                    <FlaskConical className="text-gold" size={22} />
                    <span><span className="block text-sm font-medium">{t('checkout.mock')}</span><span className="text-xs text-muted">No real charge</span></span>
                  </label>
                )}
              </div>
              <p className="mt-5 flex items-center gap-2 text-xs text-muted"><Lock size={13} /> Your payment details are handled securely and never stored on our servers.</p>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="font-serif text-2xl">{t('checkout.review')}</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <ReviewBlock title={t('checkout.information')} lines={[`${values.firstName} ${values.lastName}`, values.email, values.phone]} onEdit={() => setStep(0)} />
                <ReviewBlock title={t('checkout.shipping')} lines={[values.addressLine1, `${values.city}, ${values.country}`, zones.find((z) => z._id === values.shippingZone)?.name?.en || 'Standard']} onEdit={() => setStep(1)} />
                <ReviewBlock title={t('checkout.payment')} lines={[t(`checkout.${values.paymentMethod}`)]} onEdit={() => setStep(2)} />
                <ReviewBlock title={t('cart.itemCount', { count: cart.itemCount })} lines={cart.items.map((l) => `${l.quantity}× ${localizedTitle(l.book, i18n.language)}`)} />
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between border-t border-line pt-5">
            <Button type="button" variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>{t('common.previous')}</Button>
            {step < 3
              ? <Button type="button" onClick={next}>{t('common.next')} <ArrowRight size={16} className="rtl:rotate-180" /></Button>
              : <Button type="submit" loading={busy} className="px-8">{t('checkout.placeOrder')}</Button>}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-white p-6">
          <h2 className="font-serif text-xl font-semibold">{t('checkout.summary')}</h2>
          <div className="mt-5 space-y-3">
            {cart.items.map((line) => (
              <div key={line.book._id} className="flex gap-3">
                <img src={line.book.coverImage} alt="" className="h-16 w-11 rounded object-cover" />
                <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{localizedTitle(line.book, i18n.language)}</p><p className="text-xs text-muted">×{line.quantity}</p></div>
                <span className="text-xs font-medium">{formatMoney((line.displayLineTotal || line.lineTotal), currency, i18n.language)}</span>
              </div>
            ))}
          </div>
          {summary && (
            <dl className="mt-5 space-y-2 border-t border-line pt-5 text-sm">
              <Row label={t('common.subtotal')} value={formatMoney(summary.displaySubtotal, currency, i18n.language)} />
              {summary.discount > 0 && <Row label={t('common.discount')} value={`− ${formatMoney(summary.displayDiscount, currency, i18n.language)}`} tone="green" />}
              <Row label={t('common.shipping')} value={summary.shipping ? formatMoney(summary.displayShipping, currency, i18n.language) : t('common.free')} />
              <Row label={t('common.tax')} value={formatMoney(summary.displayTax, currency, i18n.language)} />
              <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold"><dt>{t('common.total')}</dt><dd className="text-burgundy">{formatMoney(summary.displayTotal, currency, i18n.language)}</dd></div>
            </dl>
          )}
        </aside>
      </form>
    </div>
  );
}

function Row({ label, value, tone }) {
  return <div className="flex justify-between"><dt className="text-muted">{label}</dt><dd className={tone === 'green' ? 'text-emerald-700' : ''}>{value}</dd></div>;
}

function ReviewBlock({ title, lines, onEdit }) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="flex items-center justify-between"><h3 className="text-xs font-semibold uppercase tracking-wider text-muted">{title}</h3>{onEdit && <button onClick={onEdit} className="text-xs text-burgundy underline">Edit</button>}</div>
      <div className="mt-2 text-sm">{lines.map((l, i) => <p key={i} className="truncate">{l}</p>)}</div>
    </div>
  );
}

function localizedTitle(book, lang) {
  return book?.title?.[lang] || book?.title?.en || '';
}
