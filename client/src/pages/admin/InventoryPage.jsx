import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, AlertTriangle, PackageX, TrendingUp, History, Plus } from 'lucide-react';
import { adminApi, catalogApi } from '../../services/index.js';
import { PageHeader, Toolbar, DataTable, IconButton, StatCard } from '../../components/admin/AdminUI.jsx';
import { Button, Input, Textarea, Select, Modal, Badge } from '../../components/common/UI.jsx';
import {
  localizedText, formatDate, statusTone, useAdminList, useAdminMutation, useAdminCan, idOptions,
} from './adminUtils.js';

const PER_PAGE = 10;
const MOVEMENT_TYPES = ['purchase', 'sale', 'return', 'adjustment', 'damage', 'set'];

const MOVEMENT_TONES = {
  purchase: 'green',
  sale: 'burgundy',
  return: 'gold',
  adjustment: 'amber',
  damage: 'red',
  set: 'gray',
};

function makeMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasPrev: page > 1,
    hasNext: page < totalPages,
  };
}

function quantityLabel(movement) {
  const q = Number(movement.quantity || 0);
  if (movement.type === 'sale' || movement.type === 'damage') return `-${Math.abs(q)}`;
  if (movement.type === 'purchase' || movement.type === 'return') return `+${Math.abs(q)}`;
  return String(q);
}

const emptyAdjust = () => ({ book: '', quantity: '', type: 'adjustment', reason: '' });

export default function InventoryPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const mutate = useAdminMutation();
  const can = useAdminCan();

  const [tab, setTab] = useState('stock');

  // --- Inventory / stock list -------------------------------------------------
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [lowOnly, setLowOnly] = useState(false);

  const stockParams = useMemo(() => ({
    page,
    limit: PER_PAGE,
    q: search || undefined,
  }), [page, search]);
  const stockLoader = useCallback(() => adminApi.inventory(stockParams), [stockParams]);
  const {
    rows: items, meta: stockMeta, loading: stockLoading, reload: reloadStock,
  } = useAdminList(stockLoader, [stockParams]);

  const lowList = useAdminList(() => adminApi.lowStock(), []);

  const lowRows = lowList.rows || [];
  const lowMeta = useMemo(() => makeMeta(lowRows.length, page, PER_PAGE), [lowRows.length, page]);
  const displayRows = lowOnly ? lowRows.slice((page - 1) * PER_PAGE, page * PER_PAGE) : items;
  const displayMeta = lowOnly ? lowMeta : stockMeta;
  const displayLoading = lowOnly ? lowList.loading : stockLoading;

  // --- Movement history -------------------------------------------------------
  const [mSearch, setMSearch] = useState('');
  const [mBook, setMBook] = useState('');
  const [mType, setMType] = useState('');
  const [mPage, setMPage] = useState(1);

  const movementParams = useMemo(() => ({
    page: mPage,
    limit: PER_PAGE,
    book: mBook || undefined,
    search: mSearch || undefined,
    type: mType || undefined,
  }), [mPage, mBook, mSearch, mType]);
  const movementLoader = useCallback(() => adminApi.movements(movementParams), [movementParams]);
  const {
    rows: movements, meta: movementMeta, loading: movementLoading, reload: reloadMovements,
  } = useAdminList(movementLoader, [movementParams]);

  // --- Book options for the adjust dialog ------------------------------------
  const bookOptionsList = useAdminList(() => catalogApi.books({ limit: 100 }), []);
  const bookOptions = useMemo(
    () => idOptions(bookOptionsList.rows, 'title', lang),
    [bookOptionsList.rows, lang],
  );

  // --- Adjust stock dialog ----------------------------------------------------
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjust, setAdjust] = useState(emptyAdjust());
  const [adjustLoading, setAdjustLoading] = useState(false);

  const openAdjust = (row) => {
    setAdjust({
      ...emptyAdjust(),
      book: row ? (row._id || idOf(row.book) || '') : '',
      type: row ? 'adjustment' : 'set',
    });
    setAdjustOpen(true);
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    setAdjustLoading(true);
    try {
      await mutate(adminApi.adjustStock({
        book: adjust.book,
        quantity: Number(adjust.quantity),
        type: adjust.type,
        reason: adjust.reason,
      }), t('toast.saved'));
      setAdjustOpen(false);
      setAdjust(emptyAdjust());
      reloadStock();
      lowList.reload();
      reloadMovements();
      bookOptionsList.reload();
    } catch {
      // toast handled by useAdminMutation
    } finally {
      setAdjustLoading(false);
    }
  };

  const showMovementsFor = (row) => {
    setMBook(row._id || '');
    setMSearch(row.slug || localizedText(row.title, lang) || '');
    setMType('');
    setMPage(1);
    setTab('movements');
  };

  const refreshAll = () => {
    reloadStock();
    lowList.reload();
    reloadMovements();
  };

  const stockColumns = [
    {
      key: 'title',
      title: t('common.name'),
      render: (row) => (
        <div className="flex items-center gap-3">
          {row.coverImage && <img src={row.coverImage} alt="" className="h-12 w-9 rounded border border-line object-cover" />}
          <div className="max-w-xs">
            <p className="font-medium text-ink">{localizedText(row.title, lang)}</p>
            <p className="truncate text-xs text-muted">{row.slug || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      title: t('admin.stock'),
      render: (row) => {
        const stock = Number(row.stock || 0);
        const threshold = Number(row.lowStockThreshold || 5);
        const tone = stock <= 0 ? 'red' : stock <= threshold ? 'amber' : 'green';
        return <Badge tone={tone}>{stock}</Badge>;
      },
    },
    {
      key: 'threshold',
      title: t('admin.lowStockThreshold'),
      render: (row) => row.lowStockThreshold ?? '—',
    },
    {
      key: 'sold',
      title: 'Sold',
      render: (row) => row.soldCount ?? 0,
    },
  ];

  const movementColumns = [
    {
      key: 'book',
      title: t('admin.books'),
      render: (row) => (
        <div>
          <p className="font-medium text-ink">{localizedText(row.book && row.book.title, lang)}</p>
          <p className="text-xs text-muted">{(row.book && row.book.slug) || '—'}</p>
        </div>
      ),
    },
    {
      key: 'type',
      title: t('admin.type'),
      render: (row) => <Badge tone={MOVEMENT_TONES[row.type] || statusTone('active')}>{row.type || '—'}</Badge>,
    },
    {
      key: 'quantity',
      title: t('admin.quantity'),
      render: (row) => <span className="font-medium">{quantityLabel(row)}</span>,
    },
    {
      key: 'stock',
      title: 'Stock change',
      render: (row) => `${row.previousStock ?? '—'} → ${row.newStock ?? '—'}`,
    },
    {
      key: 'reason',
      title: t('admin.reason'),
      render: (row) => row.reason || '—',
    },
    {
      key: 'performedBy',
      title: 'Performed by',
      render: (row) => (row.performedBy && (row.performedBy.name || row.performedBy.email)) || '—',
    },
    {
      key: 'createdAt',
      title: t('common.date'),
      render: (row) => formatDate(row.createdAt, lang, true),
    },
  ];

  return (
    <div>
      <PageHeader title={t('admin.inventory')} subtitle={t('admin.management')} />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('admin.totalBooks')} value={stockMeta ? stockMeta.total : items.length} icon={Package} />
        <StatCard label={t('admin.lowStock')} value={lowRows.length} icon={AlertTriangle} tone="gold" />
        <StatCard label={t('admin.outOfStock')} value={lowRows.filter((r) => Number(r.stock || 0) <= 0).length} icon={PackageX} tone="red" />
        <StatCard
          label="Units sold"
          value={items.reduce((sum, r) => sum + (Number(r.soldCount) || 0), 0)}
          icon={TrendingUp}
          tone="green"
          hint="On this page"
        />
      </div>

      <div className="mb-4 flex flex-wrap gap-1 rounded-lg border border-line bg-white p-1">
        <button
          onClick={() => setTab('stock')}
          className={`rounded px-4 py-2 text-sm font-medium ${tab === 'stock' ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand'}`}
        >
          {t('admin.inventory')}
        </button>
        <button
          onClick={() => setTab('movements')}
          className={`rounded px-4 py-2 text-sm font-medium ${tab === 'movements' ? 'bg-burgundy text-white' : 'text-muted hover:bg-sand'}`}
        >
          <History size={15} className="me-1 inline" />{t('admin.movementHistory')}
        </button>
      </div>

      {tab === 'stock' ? (
        <>
          <Toolbar
            search={search}
            onSearch={(v) => { setSearch(v); setPage(1); }}
            onRefresh={refreshAll}
            onAdd={() => openAdjust(null)}
            addLabel={t('admin.adjustStock')}
          >
            <Select
              value={lowOnly ? 'low' : ''}
              onChange={(e) => { setLowOnly(e.target.value === 'low'); setPage(1); }}
              options={[
                { value: '', label: t('common.all') },
                { value: 'low', label: t('admin.lowStock') },
              ]}
              className="w-auto"
            />
          </Toolbar>

          <DataTable
            columns={stockColumns}
            rows={displayRows}
            loading={displayLoading}
            meta={displayMeta}
            onPage={setPage}
            empty={t('admin.noItems')}
            actions={(row) => (
              <>
                {can('inventory.manage') && <IconButton title={t('admin.adjustStock')} tone="primary" onClick={() => openAdjust(row)}><Plus size={16} /></IconButton>}
                <IconButton title={t('admin.movementHistory')} onClick={() => showMovementsFor(row)}><History size={16} /></IconButton>
              </>
            )}
          />
        </>
      ) : (
        <>
          <Toolbar search={mSearch} onSearch={(v) => { setMBook(''); setMSearch(v); setMPage(1); }} onRefresh={reloadMovements}>
            <Select
              value={mType}
              onChange={(e) => { setMType(e.target.value); setMPage(1); }}
              options={[
                { value: '', label: t('common.all') },
                ...MOVEMENT_TYPES.map((type) => ({ value: type, label: type })),
              ]}
              className="w-auto"
            />
          </Toolbar>

          <DataTable
            columns={movementColumns}
            rows={movements}
            loading={movementLoading}
            meta={movementMeta}
            onPage={setMPage}
            empty={t('admin.noItems')}
          />
        </>
      )}

      <Modal open={adjustOpen} onClose={() => setAdjustOpen(false)} title={t('admin.adjustStock')}>
        <form onSubmit={submitAdjust}>
          <div className="grid grid-cols-1 gap-4">
            <Select
              label={t('admin.books')}
              value={adjust.book}
              onChange={(e) => setAdjust((a) => ({ ...a, book: e.target.value }))}
              options={[{ value: '', label: t('validation.select') }, ...bookOptions]}
            />
            <Select
              label={t('admin.type')}
              value={adjust.type}
              onChange={(e) => setAdjust((a) => ({ ...a, type: e.target.value }))}
              options={MOVEMENT_TYPES.map((type) => ({ value: type, label: type }))}
            />
            <Input
              label={adjust.type === 'set' ? 'New stock level' : t('admin.quantity')}
              type="number"
              step="1"
              value={adjust.quantity}
              onChange={(e) => setAdjust((a) => ({ ...a, quantity: e.target.value }))}
              placeholder={adjust.type === 'set' ? '0' : '1'}
            />
            <p className="-mt-2 text-xs text-muted">
              {adjust.type === 'set'
                ? 'Sets the absolute stock level for this book.'
                : 'Positive values add stock; negative values remove it.'}
            </p>
            <Textarea
              label={t('admin.reason')}
              rows={3}
              value={adjust.reason}
              onChange={(e) => setAdjust((a) => ({ ...a, reason: e.target.value }))}
              placeholder="e.g. Stocktake correction"
            />
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
            <Button type="button" variant="ghost" onClick={() => setAdjustOpen(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={adjustLoading}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
