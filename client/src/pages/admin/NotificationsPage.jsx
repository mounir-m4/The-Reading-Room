import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Bell, CheckCheck, CheckCircle2, Info, XCircle } from 'lucide-react';
import { PageHeader, StatCard, Toolbar } from '../../components/admin/AdminUI.jsx';
import { Button, Select, Badge, EmptyState } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { formatDate, useAdminList, useAdminMutation, idOf } from './adminUtils.js';

const SEVERITY = {
  info: { icon: Info, tone: 'burgundy' },
  success: { icon: CheckCircle2, tone: 'green' },
  warning: { icon: AlertTriangle, tone: 'amber' },
  error: { icon: XCircle, tone: 'red' },
};

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const mutate = useAdminMutation();
  const { rows, loading, reload } = useAdminList(() => adminApi.notifications(), []);

  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [markingId, setMarkingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = (rows || []).filter((item) => !item.isRead).length;

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (rows || []).filter((item) => {
      const matchesSeverity = !severity || item.severity === severity;
      const matchesSearch = !q || `${item.title || ''} ${item.message || ''}`.toLowerCase().includes(q);
      return matchesSeverity && matchesSearch;
    });
  }, [rows, search, severity]);

  const markOne = async (item) => {
    setMarkingId(idOf(item._id));
    try {
      await mutate(adminApi.markRead(idOf(item._id)), t('admin.markRead'));
      reload();
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setMarkingId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await mutate(adminApi.markAllRead(), t('admin.allRead'));
      reload();
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setMarkingAll(false);
    }
  };

  const itemClass = (isRead) => `rounded-xl border bg-white p-4 ${isRead ? 'border-line' : 'border-burgundy/30 shadow-soft'}`;

  return (
    <div>
      <PageHeader
        title={t('admin.notifications')}
        subtitle="Store alerts and system messages"
        actions={(
          <Button variant="secondary" onClick={markAll} disabled={!unreadCount || loading} loading={markingAll}>
            <CheckCheck size={16} /> {t('admin.allRead')}
          </Button>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={(rows || []).length} icon={Bell} />
        <StatCard label="Unread" value={unreadCount} icon={Bell} tone="gold" />
        <StatCard label="Read" value={(rows || []).length - unreadCount} icon={CheckCheck} tone="green" />
      </div>

      <Toolbar search={search} onSearch={setSearch} onRefresh={reload}>
        <Select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          options={[
            { value: '', label: 'All severities' },
            { value: 'info', label: 'Info' },
            { value: 'success', label: 'Success' },
            { value: 'warning', label: 'Warning' },
            { value: 'error', label: 'Error' },
          ]}
          className="min-w-[160px]"
        />
      </Toolbar>

      {!loading && visibleRows.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={t('admin.noNotifications')}
          subtitle={(rows || []).length ? 'No notifications match your filters.' : undefined}
        />
      ) : (
        <div className="space-y-3">
          {visibleRows.map((item) => {
            const config = SEVERITY[item.severity] || SEVERITY.info;
            const Icon = config.icon;
            const id = idOf(item._id);
            return (
              <div key={id || item.title} className={itemClass(item.isRead)}>
                <div className="flex flex-wrap items-start gap-3">
                  <span className="rounded-lg bg-sand/70 p-2 text-burgundy"><Icon size={18} /></span>
                  <div className="min-w-[200px] flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-ink">{item.title || 'Notification'}</h3>
                      <Badge tone={config.tone}>{item.severity || 'info'}</Badge>
                      {!item.isRead && <span className="h-2 w-2 rounded-full bg-gold" title="Unread" />}
                    </div>
                    <p className="mt-1 text-sm text-muted">{item.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted">
                      <span>{formatDate(item.createdAt, i18n.language, true)}</span>
                      {item.link && (
                        <Link to={item.link} className="text-burgundy hover:underline">
                          {t('common.view')}
                        </Link>
                      )}
                    </div>
                  </div>
                  {!item.isRead && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => markOne(item)}
                      loading={markingId === id}
                    >
                      {t('admin.markRead')}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
