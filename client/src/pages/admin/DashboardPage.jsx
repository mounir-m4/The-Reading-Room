import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { DollarSign, ShoppingCart, Users, BookOpen, Clock, CheckCircle, AlertTriangle, PackageX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../../services/index.js';
import { PageHeader, StatCard } from '../../components/admin/AdminUI.jsx';
import { formatMoney } from '../../utils/currency.js';
import { localize } from '../../utils/localized.js';

const PERIODS = [
  ['today', 'admin.today'], ['7d', 'admin.last7'], ['30d', 'admin.last30'],
  ['90d', 'admin.last90'], ['year', 'admin.year'],
];
const COLORS = ['#783D45', '#B89B64', '#242424', '#9B5861', '#D6C39A', '#777777'];

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    adminApi.dashboard({ period }).then((r) => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [period]);

  const s = data?.stats || {};
  return (
    <div>
      <PageHeader
        title={t('admin.dashboard')}
        subtitle={t('admin.overview')}
        actions={
          <div className="flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
            {PERIODS.map(([value, key]) => (
              <button key={value} onClick={() => setPeriod(value)} className={`rounded px-3 py-1.5 text-xs font-medium ${period === value ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand'}`}>{t(key)}</button>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.totalRevenue')} value={formatMoney(s.revenue || 0, 'MAD', i18n.language)} icon={DollarSign} loading={loading} />
        <StatCard label={t('admin.totalOrders')} value={s.orders} icon={ShoppingCart} tone="gold" />
        <StatCard label={t('admin.totalCustomers')} value={s.customers} icon={Users} tone="blue" />
        <StatCard label={t('admin.totalBooks')} value={s.books} icon={BookOpen} tone="green" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.pendingOrders')} value={s.pendingOrders} icon={Clock} tone="gold" />
        <StatCard label={t('admin.completedOrders')} value={s.completedOrders} icon={CheckCircle} tone="green" />
        <StatCard label={t('admin.lowStock')} value={s.lowStock} icon={AlertTriangle} tone="red" />
        <StatCard label={t('admin.outOfStock')} value={s.outOfStock} icon={PackageX} tone="red" />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="rounded-xl border border-line bg-white p-5 lg:col-span-2">
          <h2 className="mb-5 font-serif text-lg font-semibold">{t('admin.revenueOverTime')}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.revenueOverTime || []}>
                <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#783D45" stopOpacity={0.28} /><stop offset="100%" stopColor="#783D45" stopOpacity={0} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E2D9" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#777' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#777' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 100)}`} />
                <Tooltip formatter={(v) => formatMoney(v, 'MAD', i18n.language)} />
                <Area type="monotone" dataKey="revenue" stroke="#783D45" strokeWidth={2.5} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-5 font-serif text-lg font-semibold">{t('admin.ordersByStatus')}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.ordersByStatus || []} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {(data?.ordersByStatus || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend iconSize={9} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-5 font-serif text-lg font-semibold">{t('admin.topBooks')}</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(data?.topBooks || []).map((b) => ({ name: localize(b.title, i18n.language)?.slice(0, 16), qty: b.qty }))} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E6E2D9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#777' }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: '#777' }} />
                <Tooltip />
                <Bar dataKey="qty" fill="#783D45" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-line bg-white p-5">
          <h2 className="mb-5 font-serif text-lg font-semibold">{t('admin.topCategories')}</h2>
          {data?.topCategories?.length ? (
            <div className="space-y-4">
              {data.topCategories.map((c, i) => (
                <div key={i}>
                  <div className="mb-1 flex justify-between text-xs"><span>{c._id || '—'}</span><span className="text-muted">{formatMoney(c.revenue, 'MAD', i18n.language)}</span></div>
                  <div className="h-2 rounded-full bg-sand"><div className="h-2 rounded-full bg-gold" style={{ width: `${Math.min(100, (c.revenue / (data.topCategories[0]?.revenue || 1)) * 100)}%` }} /></div>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-muted">{t('admin.noItems')}</p>}
          <div className="mt-8 border-t border-line pt-4">
            <h3 className="mb-3 text-sm font-semibold">{t('admin.payments')}</h3>
            <div className="space-y-2">{(data?.payments || []).map((p, index) => (
              <div key={p.name || index} className="flex justify-between text-xs"><span className="capitalize">{p.name || '—'}</span><span>{p.count} · {formatMoney(p.revenue, 'MAD', i18n.language)}</span></div>
            ))}</div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/admin/orders" className="btn-secondary text-sm">{t('admin.orders')}</Link>
        <Link to="/admin/inventory" className="btn-secondary text-sm">{t('admin.inventory')}</Link>
        <Link to="/admin/reports" className="btn-secondary text-sm">{t('admin.reports')}</Link>
      </div>
    </div>
  );
}
