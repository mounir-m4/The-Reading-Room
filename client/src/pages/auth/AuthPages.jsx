import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, CheckCircle } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { loginUser, registerUser, loginAdmin } from '../../store/authSlice.js';
import { authApi } from '../../services/index.js';
import { pushToast } from '../../store/toastSlice.js';
import { Button, Input, Select } from '../../components/common/UI.jsx';
import { LanguageSelector } from '../../components/common/Selectors.jsx';
import BrandLogo from '../../components/common/BrandLogo.jsx';

function AuthShell({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-ink p-12 text-white lg:flex">
        <Link to="/" className="inline-flex" aria-label="The Reading Room home"><BrandLogo tone="light" /></Link>
        <div>
          <BookOpen size={48} className="mb-8 text-gold" strokeWidth={1} />
          <h2 className="font-serif text-5xl leading-tight">Every great story begins with a single page.</h2>
          <p className="mt-5 max-w-md text-white/60">Discover curated books, save your favorites and track every order in one elegant place.</p>
        </div>
        <p className="text-xs text-white/40">© {new Date().getFullYear()} The Reading Room</p>
      </div>
      <div className="flex w-full flex-col bg-canvas lg:w-1/2">
        <div className="flex justify-end p-5"><LanguageSelector /></div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
          <h1 className="font-serif text-4xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const registerSchema = z.object({
  name: z.string().min(2), email: z.string().email(), password: z.string().min(8),
  language: z.enum(['en', 'fr', 'ar']).optional(), currency: z.enum(['MAD', 'EUR', 'USD', 'GBP']).optional(),
});

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });
  const status = useAppSelector((s) => s.auth.status);
  const error = useAppSelector((s) => s.auth.error);

  const submit = async (values) => {
    const res = await dispatch(loginUser(values));
    if (!res.error) { dispatch(pushToast(t('auth.loginTitle'))); navigate(params.get('redirect') || '/account'); }
  };

  return (
    <AuthShell title={t('auth.loginTitle')} subtitle={t('auth.loginSub')}>
      <Helmet><title>{`${t('common.login')} — The Reading Room`}</title></Helmet>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Input label={t('common.email')} type="email" {...register('email')} error={errors.email && t('validation.email')} />
        <Input label={t('auth.password')} type="password" {...register('password')} error={errors.password && t('validation.minLength')} />
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" className="accent-burgundy" /> {t('auth.remember')}</label>
          <Link to="/forgot-password" className="text-burgundy hover:underline">{t('auth.forgot')}</Link>
        </div>
        <Button type="submit" loading={isSubmitting || status === 'loading'} className="w-full py-3">{t('common.login')}</Button>
        <p className="text-center text-sm text-muted">{t('auth.noAccount')} <Link to="/register" className="font-medium text-burgundy hover:underline">{t('common.register')}</Link></p>
      </form>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { language: i18n.language, currency: 'MAD' },
  });
  const error = useAppSelector((s) => s.auth.error);

  const submit = async (values) => {
    const res = await dispatch(registerUser(values));
    if (!res.error) navigate('/account');
  };

  return (
    <AuthShell title={t('auth.registerTitle')} subtitle={t('auth.registerSub')}>
      <Helmet><title>{`${t('common.register')} — The Reading Room`}</title></Helmet>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Input label={t('auth.name')} {...register('name')} error={errors.name && t('validation.required')} />
        <Input label={t('common.email')} type="email" {...register('email')} error={errors.email && t('validation.email')} />
        <Input label={t('auth.password')} type="password" {...register('password')} error={errors.password && t('validation.minLength')} />
        <div className="grid grid-cols-2 gap-4">
          <Select label={t('common.language')} options={[{ value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }, { value: 'ar', label: 'العربية' }]} {...register('language')} />
          <Select label={t('common.currency')} options={['MAD', 'EUR', 'USD', 'GBP']} {...register('currency')} />
        </div>
        <Button type="submit" loading={isSubmitting} className="w-full py-3">{t('common.register')}</Button>
        <p className="text-center text-sm text-muted">{t('auth.hasAccount')} <Link to="/login" className="font-medium text-burgundy hover:underline">{t('common.login')}</Link></p>
      </form>
    </AuthShell>
  );
}

export function AdminLoginPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(loginSchema) });
  const error = useAppSelector((s) => s.auth.error);

  const submit = async (values) => {
    const res = await dispatch(loginAdmin(values));
    if (!res.error) navigate(params.get('redirect') || '/admin');
  };

  return (
    <AuthShell title={t('auth.adminLogin')} subtitle={t('auth.adminTitle')}>
      <Helmet><title>{`${t('auth.adminLogin')} — The Reading Room`}</title></Helmet>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <Input label={t('common.email')} type="email" {...register('email')} error={errors.email && t('validation.email')} />
        <Input label={t('auth.password')} type="password" {...register('password')} error={errors.password && t('validation.minLength')} />
        <Button type="submit" loading={isSubmitting} className="w-full py-3">{t('common.login')}</Button>
        <p className="rounded bg-sand p-3 text-center text-xs text-muted">{t('auth.demoHint')}</p>
        <Link to="/" className="block text-center text-sm text-muted hover:text-burgundy">← {t('nav.home')}</Link>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try { await authApi.forgot(email); setSent(true); } catch (error) { dispatch(pushToast(t('toast.error'), 'error')); }
  };
  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.resetSent')}>
      {sent ? <div className="rounded-lg bg-emerald-50 p-5 text-sm text-emerald-800"><CheckCircle className="mb-2" size={24} />{t('auth.resetSent')}</div> : (
        <form onSubmit={submit} className="space-y-4">
          <Input label={t('common.email')} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <Button type="submit" className="w-full">{t('auth.sendReset')}</Button>
          <Link to="/login" className="block text-center text-sm text-burgundy">← {t('common.login')}</Link>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    try {
      await authApi.reset({ token: params.get('token'), password });
      setDone(true);
      dispatch(pushToast(t('auth.verified')));
      setTimeout(() => navigate('/login'), 1500);
    } catch { dispatch(pushToast(t('toast.error'), 'error')); }
  };
  return (
    <AuthShell title={t('auth.resetTitle')} subtitle="">
      {done ? <p className="text-emerald-700">{t('auth.verified')}</p> : (
        <form onSubmit={submit} className="space-y-4">
          <Input label={t('auth.newPassword')} type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button type="submit" className="w-full">{t('common.submit')}</Button>
        </form>
      )}
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [params] = useSearchParams();
  const [state, setState] = useState('loading');
  useEffect(() => {
    authApi.verify(params.get('token') || '').then(() => setState('done')).catch(() => setState('error'));
  }, []);
  return (
    <AuthShell title={t('auth.verifyEmail')} subtitle="">
      {state === 'loading' && <p className="text-muted">{t('common.loading')}</p>}
      {state === 'done' && <p className="text-emerald-700">{t('auth.verified')}</p>}
      {state === 'error' && <p className="text-red-600">{t('common.error')}</p>}
    </AuthShell>
  );
}
