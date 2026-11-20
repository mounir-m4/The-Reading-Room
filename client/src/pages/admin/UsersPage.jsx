import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Shield, Trash2 } from 'lucide-react';
import { PageHeader, StatCard, Toolbar, DataTable, IconButton } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Select, Toggle, Checkbox, Modal, ConfirmDialog, Badge } from '../../components/common/UI.jsx';
import { adminApi } from '../../services/index.js';
import { LANGUAGES, formatDate, statusTone, useAdminList, useAdminMutation, idOf } from './adminUtils.js';

const PERMISSION_GROUPS = [
  { module: 'Books', permissions: ['books.view', 'books.create', 'books.edit', 'books.delete'] },
  { module: 'Categories', permissions: ['categories.view', 'categories.manage'] },
  { module: 'Authors', permissions: ['authors.view', 'authors.manage'] },
  { module: 'Orders', permissions: ['orders.view', 'orders.manage', 'orders.refund'] },
  { module: 'Customers', permissions: ['customers.view', 'customers.manage'] },
  { module: 'Inventory', permissions: ['inventory.view', 'inventory.manage'] },
  { module: 'Reviews & coupons', permissions: ['reviews.manage', 'coupons.manage'] },
  { module: 'Website & operations', permissions: ['cms.manage', 'shipping.manage', 'payments.manage'] },
  { module: 'System', permissions: ['settings.manage', 'users.manage'] },
  { module: 'Analytics', permissions: ['analytics.view', 'reports.export'] },
];

const EMPTY_ADMIN = { name: '', email: '', password: '', role: '', language: 'en', isActive: true };

const isSuperAdmin = (role) => {
  const name = String(role?.name || '').toLowerCase();
  const slug = String(role?.slug || '').toLowerCase();
  return name === 'super admin' || slug === 'super-admin';
};

export default function UsersPage() {
  const { t, i18n } = useTranslation();
  const mutate = useAdminMutation();
  const [tab, setTab] = useState('admins');

  const loadAdmins = useCallback(() => adminApi.admins(), []);
  const loadRoles = useCallback(() => adminApi.roles(), []);
  const {
    rows: admins, reload: reloadAdmins, loading: loadingAdmins,
  } = useAdminList(loadAdmins, []);
  const { rows: roles, reload: reloadRoles, loading: loadingRoles } = useAdminList(loadRoles, []);

  const [search, setSearch] = useState('');

  const roleById = useMemo(() => {
    const map = {};
    (roles || []).forEach((role) => { map[idOf(role)] = role; });
    return map;
  }, [roles]);

  const roleLabel = (value) => {
    if (!value) return '—';
    if (typeof value === 'object' && value.name) return value.name;
    return roleById[idOf(value)]?.name || '—';
  };

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins || [];
    return (admins || []).filter((admin) => [admin.name, admin.email, roleLabel(admin.role)]
      .some((value) => String(value || '').toLowerCase().includes(q)));
  }, [admins, search, roleById]);

  // ----- Admin create / edit -----
  const [adminOpen, setAdminOpen] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState(null);
  const [adminDraft, setAdminDraft] = useState(EMPTY_ADMIN);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [deletingAdmin, setDeletingAdmin] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const openAdmin = (row) => {
    setEditingAdminId(row ? idOf(row) : null);
    setAdminDraft(row ? {
      name: row.name || '',
      email: row.email || '',
      password: '',
      role: idOf(row.role),
      language: row.language || 'en',
      isActive: row.isActive !== false,
    } : { ...EMPTY_ADMIN });
    setAdminOpen(true);
  };

  const submitAdmin = async (event) => {
    event.preventDefault();
    if (!adminDraft.name.trim() || !adminDraft.email.trim()) return;
    if (!editingAdminId && !adminDraft.password) return;

    const payload = {
      name: adminDraft.name.trim(),
      email: adminDraft.email.trim(),
      role: adminDraft.role,
      language: adminDraft.language,
      isActive: Boolean(adminDraft.isActive),
    };
    if (adminDraft.password) payload.password = adminDraft.password;

    setSavingAdmin(true);
    try {
      await mutate(adminApi.saveAdmin(payload, editingAdminId), t('toast.saved'));
      setAdminOpen(false);
      reloadAdmins();
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setSavingAdmin(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingAdmin) return;
    setDeleting(true);
    try {
      await mutate(adminApi.deleteAdmin(idOf(deletingAdmin)), t('toast.deleted'));
      setDeletingAdmin(null);
      reloadAdmins();
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setDeleting(false);
    }
  };

  // ----- Roles / permission matrix -----
  const [roleOpen, setRoleOpen] = useState(false);
  const [activeRole, setActiveRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [savingRole, setSavingRole] = useState(false);
  const readOnlyRole = isSuperAdmin(activeRole);

  const openRole = (role) => {
    setActiveRole(role);
    setRolePermissions(Array.isArray(role?.permissions) ? [...role.permissions] : []);
    setRoleOpen(true);
  };

  const togglePermission = (permission) => {
    setRolePermissions((current) => (
      current.includes(permission)
        ? current.filter((item) => item !== permission)
        : [...current, permission]
    ));
  };

  const submitRole = async () => {
    if (readOnlyRole || !activeRole) return;
    setSavingRole(true);
    try {
      await mutate(adminApi.updateRole(idOf(activeRole), rolePermissions), t('toast.saved'));
      setRoleOpen(false);
      reloadRoles();
    } catch {
      // Toast is handled by useAdminMutation.
    } finally {
      setSavingRole(false);
    }
  };

  const adminColumns = [
    { key: 'name', title: 'Name', render: (row) => <span className="font-medium text-ink">{row.name || '—'}</span> },
    { key: 'email', title: 'Email', render: (row) => row.email || '—' },
    { key: 'role', title: 'Role', render: (row) => roleLabel(row.role) },
    { key: 'language', title: 'Language', render: (row) => (row.language || 'en').toUpperCase() },
    {
      key: 'isActive', title: 'Status',
      render: (row) => (
        <Badge tone={statusTone(row.isActive ? 'active' : 'inactive')}>
          {row.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      ),
    },
    { key: 'lastLoginAt', title: 'Last login', render: (row) => formatDate(row.lastLoginAt, i18n.language, true) },
  ];

  const roleColumns = [
    { key: 'name', title: 'Role', render: (row) => <span className="font-medium text-ink">{row.name || '—'}</span> },
    { key: 'slug', title: 'Slug', render: (row) => <span className="font-mono text-xs">{row.slug || '—'}</span> },
    { key: 'description', title: 'Description', render: (row) => row.description || '—' },
    {
      key: 'permissions', title: 'Permissions',
      render: (row) => <Badge tone="gray">{(row.permissions || []).length}</Badge>,
    },
    {
      key: 'system', title: 'Type',
      render: (row) => (isSuperAdmin(row)
        ? <Badge tone="gold">Read only</Badge>
        : <Badge tone="gray">Editable</Badge>),
    },
  ];

  const activeCount = (admins || []).filter((admin) => admin.isActive).length;

  return (
    <div>
      <PageHeader
        title={t('admin.users')}
        subtitle="Manage administrators and their permissions"
        actions={tab === 'admins' && (
          <Button onClick={() => openAdmin(null)}><Shield size={16} /> {t('admin.newAdmin')}</Button>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Administrators" value={(admins || []).length} icon={Shield} />
        <StatCard label={t('common.active')} value={activeCount} icon={Shield} tone="green" />
        <StatCard label="Roles" value={(roles || []).length} icon={Shield} tone="gold" />
        <StatCard label="Permissions" value={PERMISSION_GROUPS.reduce((sum, group) => sum + group.permissions.length, 0)} icon={Shield} tone="blue" />
      </div>

      <div className="mb-4 flex w-fit gap-1 rounded-lg border border-line bg-white p-1">
        <button
          type="button"
          onClick={() => setTab('admins')}
          className={`rounded px-4 py-2 text-sm font-medium ${tab === 'admins' ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand'}`}
        >
          {t('admin.admins')}
        </button>
        <button
          type="button"
          onClick={() => setTab('roles')}
          className={`rounded px-4 py-2 text-sm font-medium ${tab === 'roles' ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand'}`}
        >
          {t('admin.roles')}
        </button>
      </div>

      {tab === 'admins' ? (
        <>
          <Toolbar search={search} onSearch={setSearch} onRefresh={reloadAdmins} />
          <DataTable
            columns={adminColumns}
            rows={filteredAdmins}
            loading={loadingAdmins}
            empty={t('admin.noItems')}
            actions={(row) => (
              <>
                <IconButton title={t('common.edit')} onClick={() => openAdmin(row)}><Pencil size={16} /></IconButton>
                <IconButton title={t('common.delete')} tone="danger" onClick={() => setDeletingAdmin(row)}><Trash2 size={16} /></IconButton>
              </>
            )}
          />
        </>
      ) : (
        <DataTable
          columns={roleColumns}
          rows={roles || []}
          loading={loadingRoles}
          empty={t('admin.noItems')}
          actions={(row) => (
            <IconButton title={t('admin.roles')} tone="primary" onClick={() => openRole(row)}><Pencil size={16} /></IconButton>
          )}
        />
      )}

      {/* Admin form */}
      <Modal open={adminOpen} onClose={() => setAdminOpen(false)} title={editingAdminId ? t('common.edit') : t('admin.newAdmin')}>
        <form onSubmit={submitAdmin} className="space-y-4">
          <Input
            label="Name"
            value={adminDraft.name}
            onChange={(e) => setAdminDraft({ ...adminDraft, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={adminDraft.email}
            onChange={(e) => setAdminDraft({ ...adminDraft, email: e.target.value })}
            required
          />
          <Input
            label={editingAdminId ? 'New password (leave blank to keep)' : 'Password'}
            type="password"
            value={adminDraft.password}
            onChange={(e) => setAdminDraft({ ...adminDraft, password: e.target.value })}
            required={!editingAdminId}
            minLength={8}
          />
          <Select
            label="Role"
            value={adminDraft.role}
            onChange={(e) => setAdminDraft({ ...adminDraft, role: e.target.value })}
            options={(roles || []).map((role) => ({ value: idOf(role), label: role.name || role.slug || '—' }))}
            required
          />
          <Select
            label="Language"
            value={adminDraft.language}
            onChange={(e) => setAdminDraft({ ...adminDraft, language: e.target.value })}
            options={LANGUAGES.map((lang) => ({ value: lang, label: lang.toUpperCase() }))}
          />
          <Toggle
            label={t('common.active')}
            checked={Boolean(adminDraft.isActive)}
            onChange={(checked) => setAdminDraft({ ...adminDraft, isActive: checked })}
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => setAdminOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={savingAdmin}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Role permission matrix */}
      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title={`${t('admin.roles')}: ${activeRole?.name || ''}`}
        wide
      >
        {readOnlyRole && (
          <p className="mb-4 rounded-lg bg-sand/60 p-3 text-xs text-muted">
            Super Admin permissions are read-only.
          </p>
        )}
        <div className="space-y-5">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.module} className="rounded-lg border border-line p-4">
              <h4 className="text-sm font-semibold text-ink">{group.module}</h4>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.permissions.map((permission) => (
                  <Checkbox
                    key={permission}
                    label={permission}
                    checked={rolePermissions.includes(permission)}
                    disabled={readOnlyRole}
                    onChange={() => togglePermission(permission)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setRoleOpen(false)}>{t('common.cancel')}</Button>
          {!readOnlyRole && (
            <Button onClick={submitRole} loading={savingRole}>{t('common.save')}</Button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingAdmin)}
        onClose={() => setDeletingAdmin(null)}
        onConfirm={confirmDelete}
        title={t('common.delete')}
        message={`Delete administrator ${deletingAdmin?.name || ''}?`}
        loading={deleting}
      />
    </div>
  );
}
