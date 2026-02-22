'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePropertyConfig } from '@/contexts/PropertyConfigContext';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import {
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloudArrowUpIcon,
  Cog6ToothIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  LockClosedIcon,
  MagnifyingGlassIcon,
  ServerStackIcon,
  SparklesIcon,
  TableCellsIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type ModuleKey =
  | 'hub'
  | 'guestImport'
  | 'opera'
  | 'vendorImport'
  | 'appsheetImport'
  | 'transferImport'
  | 'tourImport'
  | 'guestCleanup'
  | 'vendorCleanup'
  | 'email'
  | 'configuration'
  | 'propertyConfig';

type Flash = { type: 'success' | 'error'; text: string };

interface DbStat {
  table: string;
  count: number;
}

interface SyncLog {
  id: string;
  synced_at: string;
  triggered_by: string;
  emails_found: number;
  xmls_processed: number;
  created_details: Array<Record<string, unknown>>;
  updated_details: Array<Record<string, unknown>>;
  errors: string[];
}

type TourStep = 'upload' | 'parsing' | 'paste' | 'review' | 'importing' | 'done';
type VendorNormStep = 'generate' | 'paste' | 'review' | 'executing' | 'done';
type GuestNormTab = 'duplicates' | 'orphans';

type DataCurationSettings = {
  pipeline: {
    requireGuestImportBeforeOpera: boolean;
    lockTransferWithoutGuests: boolean;
    lockGuestNormalizationWithoutData: boolean;
    vendorNormalizationMinVendors: number;
  };
  opera: {
    manualSyncEnabled: boolean;
    manualXmlUploadEnabled: boolean;
    autoSyncEnabled: boolean;
    logRetentionDays: number;
  };
  imports: {
    preserveLegacyIds: boolean;
    allowAutoCreateGuestsFromOpera: boolean;
    allowAutoCreateVendorsFromTransfers: boolean;
    defaultVendorType: string;
    defaultVendorColor: string;
  };
  safety: {
    enableDatabaseResetSection: boolean;
    enableClearAll: boolean;
    requireDoubleConfirmationForClearAll: boolean;
    allowSingleTableClear: boolean;
  };
  ux: {
    showSystemInfoSection: boolean;
    showMessagingChannelsSection: boolean;
    showLastRunOnOperaStep: boolean;
    showRecommendations: boolean;
  };
};

const DEFAULT_SETTINGS: DataCurationSettings = {
  pipeline: {
    requireGuestImportBeforeOpera: true,
    lockTransferWithoutGuests: true,
    lockGuestNormalizationWithoutData: true,
    vendorNormalizationMinVendors: 2,
  },
  opera: {
    manualSyncEnabled: true,
    manualXmlUploadEnabled: true,
    autoSyncEnabled: true,
    logRetentionDays: 30,
  },
  imports: {
    preserveLegacyIds: true,
    allowAutoCreateGuestsFromOpera: true,
    allowAutoCreateVendorsFromTransfers: true,
    defaultVendorType: 'other',
    defaultVendorColor: '#6B7280',
  },
  safety: {
    enableDatabaseResetSection: true,
    enableClearAll: true,
    requireDoubleConfirmationForClearAll: true,
    allowSingleTableClear: true,
  },
  ux: {
    showSystemInfoSection: true,
    showMessagingChannelsSection: true,
    showLastRunOnOperaStep: true,
    showRecommendations: true,
  },
};

const CLEAR_ORDER = [
  'messages',
  'conversations',
  'order_items',
  'orders',
  'romantic_dinners',
  'special_requests',
  'other_hotel_bookings',
  'tour_bookings',
  'tour_schedules',
  'transfers',
  'reservations',
  'guests',
  'vendors',
  'tour_products',
] as const;

const CHANNELS = ['Room Service', 'Guest Experience', 'Spa', 'Front Desk', 'Concierge'];

function cx(...items: Array<string | false | null | undefined>): string {
  return items.filter(Boolean).join(' ');
}

function MetricCard({
  label,
  value,
  tone = 'slate',
  icon,
}: {
  label: string;
  value: string | number;
  tone?: 'slate' | 'emerald' | 'sky' | 'amber' | 'rose';
  icon?: ReactNode;
}) {
  return (
    <div className="nayara-card px-3 py-2">
      <div className="flex items-center gap-2">
        {icon}
        <p className="nayara-label">{label}</p>
      </div>
      <p className="mt-1 text-xl font-bold leading-none" style={{ color: 'var(--charcoal)' }}>{value}</p>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl px-3 py-3" style={{ border: '1px solid var(--separator)', background: 'var(--surface)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{label}</p>
        {hint ? <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>{hint}</p> : null}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className="h-7 w-12 rounded-full relative transition-colors shrink-0"
        style={{ background: value ? 'var(--sage)' : 'var(--elevated)' }}
      >
        <span
          className={cx(
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-transform',
            value ? 'translate-x-6 left-0' : 'translate-x-1 left-0'
          )}
        />
      </button>
    </div>
  );
}

function SectionTitle({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 className="text-xl font-bold italic" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>{title}</h2>
        {subtitle ? <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

const PALETTES = [
  { key: 'botanical',  name: 'Botanical',  desc: 'Warm tan, cream & sage — the original', bg: '#C8BDA8', surface: '#F2EBE0', accent: '#AA8E67', sidebar: '#0E1A09' },
  { key: 'ocean',      name: 'Ocean',      desc: 'Steel blue & navy — logo inspired',     bg: '#c2d2dc', surface: '#dde8ef', accent: '#8fa8b8', sidebar: '#0d1e2b' },
  { key: 'midnight',   name: 'Midnight',   desc: 'Deep charcoal & champagne gold',        bg: '#2a2a2a', surface: '#333333', accent: '#c9a96e', sidebar: '#1a1a1a' },
  { key: 'desert',     name: 'Desert',     desc: 'Warm sand & terracotta',                bg: '#d4c4a8', surface: '#ede0c8', accent: '#c47c3a', sidebar: '#1a0e04' },
  { key: 'slate',      name: 'Slate',      desc: 'Cool gray & silver',                    bg: '#bec8cc', surface: '#d8e0e4', accent: '#7a9aaa', sidebar: '#0e1820' },
  { key: 'navy-reef',  name: 'Navy Reef',  desc: 'Deep navy + coral accents',             bg: '#1e2d3d', surface: '#283a4e', accent: '#e8926a', sidebar: '#0f1a26' },
  { key: 'arctic',     name: 'Arctic',     desc: 'Frost-white + ice-blue',                bg: '#e8eff4', surface: '#f4f8fb', accent: '#5a9ab5', sidebar: '#0c1820' },
  { key: 'dusk',       name: 'Dusk',       desc: 'Violet twilight + warm amber',          bg: '#2a2535', surface: '#352f42', accent: '#d4a65a', sidebar: '#1a1524' },
  { key: 'ember',      name: 'Ember',      desc: 'Warm charcoal + flame orange',          bg: '#2e2420', surface: '#3a302a', accent: '#e8844a', sidebar: '#1a120e' },
  { key: 'sage-mist',  name: 'Sage Mist',  desc: 'Soft green-gray + eucalyptus',          bg: '#d4ddd0', surface: '#e8efe4', accent: '#8aaa78', sidebar: '#0e1a0c' },
] as const;

type PaletteKey = typeof PALETTES[number]['key'];

const FONT_SETS = [
  { key: 'botanical', name: 'Botanical',  desc: 'Montserrat + Gelasio + Figtree — the original' },
  { key: 'modern',    name: 'Modern',     desc: 'Inter / system-ui across all elements' },
  { key: 'classic',   name: 'Classic',    desc: 'Playfair Display + Lora — editorial feel' },
  { key: 'minimal',   name: 'Minimal',    desc: 'DM Sans monofamily — clean & neutral' },
] as const;

type FontSetKey = typeof FONT_SETS[number]['key'];

export default function SettingsPage() {
  const [activeModule, setActiveModule] = useState<ModuleKey>('hub');
  // Saved = persisted in DB; preview = what's currently shown (may differ while browsing)
  const [savedPalette, setSavedPalette] = useState<PaletteKey>('botanical');
  const [savedFontSet, setSavedFontSet] = useState<FontSetKey>('botanical');
  const [previewPalette, setPreviewPalette] = useState<PaletteKey>('botanical');
  const [previewFontSet, setPreviewFontSet] = useState<FontSetKey>('botanical');
  const [paletteSaving, setPaletteSaving] = useState(false);
  const [fontSetSaving, setFontSetSaving] = useState(false);
  const { config: propertyConfig, refresh: refreshPropertyConfig } = usePropertyConfig();

  // Sync saved values from DB config
  useEffect(() => {
    const dbPalette = propertyConfig?.settings?.brand?.colors?.palette as PaletteKey | undefined;
    if (dbPalette) { setSavedPalette(dbPalette); setPreviewPalette(dbPalette); }
    const dbFont = (propertyConfig?.settings?.brand as Record<string, unknown>)?.fontSet as FontSetKey | undefined;
    if (dbFont) { setSavedFontSet(dbFont); setPreviewFontSet(dbFont); }
  }, [propertyConfig]);

  // Apply preview palette to DOM instantly
  useEffect(() => {
    if (previewPalette === 'botanical') {
      document.documentElement.removeAttribute('data-palette');
    } else {
      document.documentElement.setAttribute('data-palette', previewPalette);
    }
  }, [previewPalette]);

  // Apply preview fontSet to DOM instantly
  useEffect(() => {
    if (previewFontSet === 'botanical') {
      document.documentElement.removeAttribute('data-fontset');
    } else {
      document.documentElement.setAttribute('data-fontset', previewFontSet);
    }
  }, [previewFontSet]);

  // Revert to saved when leaving the page
  useEffect(() => {
    return () => {
      // On unmount, revert to saved values
      if (savedPalette === 'botanical') {
        document.documentElement.removeAttribute('data-palette');
      } else {
        document.documentElement.setAttribute('data-palette', savedPalette);
      }
      if (savedFontSet === 'botanical') {
        document.documentElement.removeAttribute('data-fontset');
      } else {
        document.documentElement.setAttribute('data-fontset', savedFontSet);
      }
    };
  }, [savedPalette, savedFontSet]);

  // Preview on click (no DB save)
  const handlePalettePreview = (paletteKey: PaletteKey) => {
    setPreviewPalette(paletteKey);
  };
  const handleFontSetPreview = (fontSetKey: FontSetKey) => {
    setPreviewFontSet(fontSetKey);
  };

  // Persist palette to DB
  const handlePaletteSave = async () => {
    const paletteKey = previewPalette;
    setPaletteSaving(true);
    try {
      const current = (propertyConfig?.settings ?? {}) as Record<string, unknown>;
      await fetch('/api/admin/property-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...current,
            brand: {
              ...(current.brand ?? {}),
              colors: {
                ...((current.brand as Record<string, unknown>)?.colors ?? {}),
                palette: paletteKey,
              },
            },
          },
        }),
      });
      await refreshPropertyConfig();
      setSavedPalette(paletteKey);
    } finally {
      setPaletteSaving(false);
    }
  };

  // Persist fontSet to DB
  const handleFontSetSave = async () => {
    const fontSetKey = previewFontSet;
    setFontSetSaving(true);
    try {
      const current = (propertyConfig?.settings ?? {}) as Record<string, unknown>;
      await fetch('/api/admin/property-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            ...current,
            brand: {
              ...(current.brand ?? {}),
              fontSet: fontSetKey,
            },
          },
        }),
      });
      await refreshPropertyConfig();
      setSavedFontSet(fontSetKey);
    } finally {
      setFontSetSaving(false);
    }
  };

  // Revert palette preview back to saved
  const handlePaletteRevert = () => { setPreviewPalette(savedPalette); };
  const handleFontSetRevert = () => { setPreviewFontSet(savedFontSet); };

  const activePalette = previewPalette;
  const activeFontSet = previewFontSet;
  const paletteChanged = previewPalette !== savedPalette;
  const fontSetChanged = previewFontSet !== savedFontSet;

  const [dbStats, setDbStats] = useState<DbStat[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);
  const [clearingAll, setClearingAll] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const [settings, setSettings] = useState<DataCurationSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<{ id: string; section: 'created' | 'updated' | 'errors' } | null>(null);
  const [operaImporting, setOperaImporting] = useState(false);
  const [operaImportStatus, setOperaImportStatus] = useState<string | null>(null);
  const operaFileRef = useRef<HTMLInputElement>(null);

  const [guestAnalyzing, setGuestAnalyzing] = useState(false);
  const [guestResults, setGuestResults] = useState<any | null>(null);
  const [guestImporting, setGuestImporting] = useState(false);
  const [guestMessage, setGuestMessage] = useState<Flash | null>(null);
  const [guestExpandedSkip, setGuestExpandedSkip] = useState(false);
  const guestFileRef = useRef<HTMLInputElement>(null);

  const [vendorAnalyzing, setVendorAnalyzing] = useState(false);
  const [vendorResults, setVendorResults] = useState<any | null>(null);
  const [vendorImporting, setVendorImporting] = useState(false);
  const [vendorMessage, setVendorMessage] = useState<Flash | null>(null);
  const [vendorExpandedSkip, setVendorExpandedSkip] = useState(false);
  const vendorFileRef = useRef<HTMLInputElement>(null);

  const [transferAnalyzing, setTransferAnalyzing] = useState(false);
  const [transferResults, setTransferResults] = useState<any | null>(null);
  const [transferImporting, setTransferImporting] = useState(false);
  const [transferMessage, setTransferMessage] = useState<Flash | null>(null);
  const [transferExpandedInvalid, setTransferExpandedInvalid] = useState(false);
  const [transferExpandedSkip, setTransferExpandedSkip] = useState(false);
  const [transferUserDates, setTransferUserDates] = useState<Record<number, string>>({});
  const transferFileRef = useRef<HTMLInputElement>(null);

  const [tourStep, setTourStep] = useState<TourStep>('upload');
  const [tourCsvFile, setTourCsvFile] = useState<File | null>(null);
  const [tourPrompt, setTourPrompt] = useState('');
  const [tourUniqueNames, setTourUniqueNames] = useState<any[]>([]);
  const [tourNameCountMap, setTourNameCountMap] = useState<Record<string, number>>({});
  const [tourProducts, setTourProducts] = useState<any[]>([]);
  const [tourVendors, setTourVendors] = useState<any[]>([]);
  const [tourTotalRows, setTourTotalRows] = useState(0);
  const [tourTotalNew, setTourTotalNew] = useState(0);
  const [tourTotalExisting, setTourTotalExisting] = useState(0);
  const [tourPastedResponse, setTourPastedResponse] = useState('');
  const [tourCopied, setTourCopied] = useState(false);
  const [tourGroups, setTourGroups] = useState<any[]>([]);
  const [tourDecisions, setTourDecisions] = useState<Record<number, any>>({});
  const [tourImportResult, setTourImportResult] = useState<any | null>(null);
  const [tourParseError, setTourParseError] = useState<string | null>(null);
  const [tourAiParseError, setTourAiParseError] = useState<string | null>(null);
  const tourFileRef = useRef<HTMLInputElement>(null);

  const [guestNormTab, setGuestNormTab] = useState<GuestNormTab>('duplicates');
  const [guestNormLoading, setGuestNormLoading] = useState(false);
  const [guestNormItems, setGuestNormItems] = useState<any[]>([]);
  const [guestNormMessage, setGuestNormMessage] = useState<Flash | null>(null);
  const [guestNormSelectedActions, setGuestNormSelectedActions] = useState<Record<string, 'merge' | 'delete' | null>>({});
  const [guestNormProcessing, setGuestNormProcessing] = useState(false);
  const [guestNormCurrentProcessingId, setGuestNormCurrentProcessingId] = useState<string | null>(null);
  const [guestNormSearchResults, setGuestNormSearchResults] = useState<any[]>([]);

  const [vendorNormStep, setVendorNormStep] = useState<VendorNormStep>('generate');
  const [vendorNormPrompt, setVendorNormPrompt] = useState('');
  const [vendorNormVendors, setVendorNormVendors] = useState<any[]>([]);
  const [vendorNormPastedResponse, setVendorNormPastedResponse] = useState('');
  const [vendorNormGroups, setVendorNormGroups] = useState<any[]>([]);
  const [vendorNormDecisions, setVendorNormDecisions] = useState<Record<number, any>>({});
  const [vendorNormLoadingPrompt, setVendorNormLoadingPrompt] = useState(false);
  const [vendorNormPromptError, setVendorNormPromptError] = useState<string | null>(null);
  const [vendorNormParseError, setVendorNormParseError] = useState<string | null>(null);
  const [vendorNormCopied, setVendorNormCopied] = useState(false);
  const [vendorNormExecuteResult, setVendorNormExecuteResult] = useState<any | null>(null);

  // Email module state
  const [emailAccounts, setEmailAccounts] = useState<any[]>([]);
  const [emailAccountsLoading, setEmailAccountsLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState<Flash | null>(null);
  const [emailShowGoogleSetup, setEmailShowGoogleSetup] = useState(false);
  const [emailConnecting, setEmailConnecting] = useState(false);
  const [emailNewAccount, setEmailNewAccount] = useState({ display_name: '', department: '', email_address: '' });
  const [emailShowAddForm, setEmailShowAddForm] = useState(false);
  const [emailSelectedAccount, setEmailSelectedAccount] = useState<any | null>(null);
  const [emailAliases, setEmailAliases] = useState<any[]>([]);
  const [emailAliasesLoading, setEmailAliasesLoading] = useState(false);
  const [emailNewAlias, setEmailNewAlias] = useState({ alias_address: '', display_name: '' });
  const [emailShowAddAlias, setEmailShowAddAlias] = useState(false);

  const activeSettings = settings ?? DEFAULT_SETTINGS;

  const getCount = useCallback(
    (table: string): number => dbStats.find((stat) => stat.table === table)?.count ?? 0,
    [dbStats]
  );

  const totalRecords = useMemo(
    () => dbStats.reduce((sum, stat) => sum + stat.count, 0),
    [dbStats]
  );

  const fetchDbStats = useCallback(async () => {
    setLoadingDb(true);
    try {
      const res = await fetch('/api/admin/db-manager');
      const data = await res.json();
      if (res.ok) setDbStats(data.stats ?? []);
    } finally {
      setLoadingDb(false);
    }
  }, []);

  const fetchSyncLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/opera-sync');
      const data = await res.json();
      if (res.ok) setSyncLogs(data.logs ?? []);
    } catch {
      // non-fatal
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const res = await fetch('/api/admin/data-curation-settings');
      const data = await res.json();
      if (res.ok) setSettings(data.settings ?? DEFAULT_SETTINGS);
      else setSettings(DEFAULT_SETTINGS);
    } catch {
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const refreshCountsAndLogs = useCallback(async () => {
    await Promise.all([fetchDbStats(), fetchSyncLogs()]);
  }, [fetchDbStats, fetchSyncLogs]);

  useEffect(() => {
    void Promise.all([fetchDbStats(), fetchSyncLogs(), fetchSettings()]);
  }, [fetchDbStats, fetchSyncLogs, fetchSettings]);

  const transferLocked = activeSettings.pipeline.lockTransferWithoutGuests && getCount('guests') === 0;
  const guestNormLocked =
    activeSettings.pipeline.lockGuestNormalizationWithoutData &&
    getCount('guests') === 0 &&
    getCount('reservations') === 0;
  const vendorNormLocked = getCount('vendors') < activeSettings.pipeline.vendorNormalizationMinVendors;

  const moduleMeta = useMemo(
    () => [
      { key: 'hub' as ModuleKey, label: 'Pipeline Hub', icon: SparklesIcon, note: 'Unified flow and runbook' },
      { key: 'guestImport' as ModuleKey, label: 'Guest Import', icon: UserPlusIcon, note: `${getCount('guests')} guests` },
      { key: 'opera' as ModuleKey, label: 'Opera Sync', icon: ArrowPathIcon, note: `${getCount('reservations')} reservations` },
      { key: 'vendorImport' as ModuleKey, label: 'Vendor Import', icon: UserGroupIcon, note: `${getCount('vendors')} vendors` },
      { key: 'appsheetImport' as ModuleKey, label: 'AppSheet Import', icon: CloudArrowUpIcon, note: 'Legacy table ingestion' },
      {
        key: 'transferImport' as ModuleKey,
        label: 'Transfer Import',
        icon: ArrowUpTrayIcon,
        note: transferLocked ? 'Locked: requires guests' : `${getCount('transfers')} transfers`,
        locked: transferLocked,
      },
      {
        key: 'tourImport' as ModuleKey,
        label: 'Tour Import',
        icon: TableCellsIcon,
        note: `${getCount('tour_bookings')} bookings / ${getCount('tour_products')} products`,
      },
      {
        key: 'guestCleanup' as ModuleKey,
        label: 'Guest Cleanup',
        icon: ExclamationTriangleIcon,
        note: guestNormLocked ? 'Locked: needs guests or reservations' : 'Merge duplicates and relink',
        locked: guestNormLocked,
      },
      {
        key: 'vendorCleanup' as ModuleKey,
        label: 'Vendor Cleanup',
        icon: ExclamationTriangleIcon,
        note: vendorNormLocked ? `Locked: need ${activeSettings.pipeline.vendorNormalizationMinVendors}+ vendors` : 'Deduplicate vendor records',
        locked: vendorNormLocked,
      },
      { key: 'email' as ModuleKey, label: 'Email', icon: EnvelopeIcon, note: 'Departmental email accounts' },
      { key: 'configuration' as ModuleKey, label: 'Center Settings', icon: Cog6ToothIcon, note: 'Global behavior switches' },
      { key: 'propertyConfig' as ModuleKey, label: 'Property Config', icon: Cog6ToothIcon, note: 'Hotel, rooms, brand' },
    ],
    [activeSettings.pipeline.vendorNormalizationMinVendors, getCount, guestNormLocked, transferLocked, vendorNormLocked]
  );

  const [propConfig, setPropConfig] = useState<any>(null);
  const [propConfigLoading, setPropConfigLoading] = useState(false);
  const [propConfigSaving, setPropConfigSaving] = useState(false);
  const [propConfigMsg, setPropConfigMsg] = useState<Flash | null>(null);

  const fetchPropConfig = useCallback(async () => {
    setPropConfigLoading(true);
    try {
      const res = await fetch('/api/admin/property-config');
      if (res.ok) {
        const d = await res.json();
        setPropConfig(d);
      }
    } catch { /* non-fatal */ }
    finally { setPropConfigLoading(false); }
  }, []);

  useEffect(() => {
    if (activeModule === 'propertyConfig' && !propConfig) {
      void fetchPropConfig();
    }
  }, [activeModule, propConfig, fetchPropConfig]);

  const saveSettings = useCallback(async () => {
    if (!settings) return;
    setSettingsSaving(true);
    setSettingsMessage(null);
    try {
      const res = await fetch('/api/admin/data-curation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok) {
        setSettings(data.settings ?? settings);
        setSettingsMessage('Settings saved.');
      } else {
        setSettingsMessage(data.error || 'Failed to save settings.');
      }
    } catch (err: unknown) {
      setSettingsMessage(err instanceof Error ? err.message : 'Failed to save settings.');
    } finally {
      setSettingsSaving(false);
    }
  }, [settings]);

  const handleClearTable = useCallback(
    async (table: string) => {
      if (!activeSettings.safety.allowSingleTableClear) return;
      if (!confirm(`Delete all rows from "${table}"?`)) return;
      const res = await fetch(`/api/admin/db-manager?table=${table}`, { method: 'DELETE' });
      if (res.ok) await fetchDbStats();
    },
    [activeSettings.safety.allowSingleTableClear, fetchDbStats]
  );

  const handleClearAll = useCallback(async () => {
    if (!activeSettings.safety.enableClearAll) return;
    if (!confirm('Clear all operational tables?')) return;
    if (activeSettings.safety.requireDoubleConfirmationForClearAll) {
      if (!confirm('Final confirmation. This action is irreversible. Continue?')) return;
    }
    setClearingAll(true);
    try {
      for (const table of CLEAR_ORDER) {
        await fetch(`/api/admin/db-manager?table=${table}`, { method: 'DELETE' });
      }
      await fetchDbStats();
    } finally {
      setClearingAll(false);
    }
  }, [activeSettings.safety.enableClearAll, activeSettings.safety.requireDoubleConfirmationForClearAll, fetchDbStats]);

  const handleManualSync = useCallback(async () => {
    if (!activeSettings.opera.manualSyncEnabled) return;
    setSyncing(true);
    setSyncStatus(null);
    try {
      const res = await fetch('/api/admin/opera-sync', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        const s = data.summary;
        setSyncStatus(
          `Sync complete: ${s.emails_found} email(s), ${s.xmls_processed} XML(s), ${s.reservations_created} created, ${s.reservations_updated} updated${s.errors.length ? `, ${s.errors.length} error(s)` : ''}.`
        );
        await refreshCountsAndLogs();
      } else {
        setSyncStatus(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      setSyncStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setSyncing(false);
    }
  }, [activeSettings.opera.manualSyncEnabled, refreshCountsAndLogs]);

  async function handleOperaImport(event: FormEvent) {
    event.preventDefault();
    if (!activeSettings.opera.manualXmlUploadEnabled) return;
    const file = operaFileRef.current?.files?.[0];
    if (!file) return;
    setOperaImporting(true);
    setOperaImportStatus(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/opera/import', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        const r = data.result;
        const errors = r.errors?.length ?? 0;
        setOperaImportStatus(
          `Import complete: ${r.total} rows, ${r.created} created, ${r.updated} updated, ${r.unchanged} unchanged${errors ? `, ${errors} error(s)` : ''}.`
        );
        await refreshCountsAndLogs();
      } else {
        setOperaImportStatus(`Error: ${data.error}`);
      }
    } catch (err: unknown) {
      setOperaImportStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setOperaImporting(false);
      if (operaFileRef.current) operaFileRef.current.value = '';
    }
  }

  async function handleGuestUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setGuestAnalyzing(true);
    setGuestResults(null);
    setGuestExpandedSkip(false);
    setGuestMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/import-analysis', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setGuestResults(data);
      else setGuestMessage({ type: 'error', text: data.error || 'Guest analysis failed.' });
    } catch (err: unknown) {
      setGuestMessage({ type: 'error', text: err instanceof Error ? err.message : 'Guest analysis failed.' });
    } finally {
      setGuestAnalyzing(false);
    }
  }

  function rescueGuestRow(index: number, profileType: 'guest' | 'staff' | 'visitor' | 'other') {
    setGuestResults((prev: any) => {
      if (!prev) return prev;
      const analysis = prev.analysis.map((row: any, idx: number) =>
        idx === index
          ? {
              ...row,
              action: 'CREATE',
              reason: `Rescued as ${profileType}`,
              inferredProfileType: profileType,
            }
          : row
      );
      return {
        ...prev,
        analysis,
        summary: {
          total: analysis.length,
          create: analysis.filter((row: any) => row.action === 'CREATE').length,
          update: analysis.filter((row: any) => row.action === 'UPDATE').length,
          conflict: analysis.filter((row: any) => row.action === 'CONFLICT').length,
          skip: analysis.filter((row: any) => row.action === 'SKIP').length,
        },
      };
    });
  }

  async function executeGuestImport() {
    if (!guestResults) return;
    const rows = guestResults.analysis.filter((row: any) => row.action === 'CREATE' || row.action === 'UPDATE');
    if (rows.length === 0) return;
    if (!confirm(`Import ${rows.length} guest rows?`)) return;
    setGuestImporting(true);
    try {
      const res = await fetch('/api/admin/import-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuestMessage({
          type: 'success',
          text: `Import complete: ${data.result.created} created, ${data.result.updated} updated.`,
        });
        setGuestResults(null);
        if (guestFileRef.current) guestFileRef.current.value = '';
        await fetchDbStats();
      } else {
        setGuestMessage({ type: 'error', text: data.error || 'Guest import failed.' });
      }
    } catch (err: unknown) {
      setGuestMessage({ type: 'error', text: err instanceof Error ? err.message : 'Guest import failed.' });
    } finally {
      setGuestImporting(false);
    }
  }

  async function handleVendorUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setVendorAnalyzing(true);
    setVendorResults(null);
    setVendorExpandedSkip(false);
    setVendorMessage(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/vendor-analysis', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setVendorResults(data);
      else setVendorMessage({ type: 'error', text: data.error || 'Vendor analysis failed.' });
    } catch (err: unknown) {
      setVendorMessage({ type: 'error', text: err instanceof Error ? err.message : 'Vendor analysis failed.' });
    } finally {
      setVendorAnalyzing(false);
    }
  }

  function setVendorRowAction(index: number, action: 'CREATE' | 'UPDATE' | 'CONFLICT' | 'SKIP', reason: string) {
    setVendorResults((prev: any) => {
      if (!prev) return prev;
      const analysis = prev.analysis.map((row: any, idx: number) => (idx === index ? { ...row, action, reason } : row));
      return {
        ...prev,
        analysis,
        summary: {
          total: analysis.length,
          create: analysis.filter((row: any) => row.action === 'CREATE').length,
          update: analysis.filter((row: any) => row.action === 'UPDATE').length,
          conflict: analysis.filter((row: any) => row.action === 'CONFLICT').length,
          skip: analysis.filter((row: any) => row.action === 'SKIP').length,
          withLegacyId: analysis.filter((row: any) => row.csv?.legacyId).length,
        },
      };
    });
  }

  async function executeVendorImport() {
    if (!vendorResults) return;
    const rows = vendorResults.analysis.filter((row: any) => row.action === 'CREATE' || row.action === 'UPDATE');
    if (rows.length === 0) return;
    if (!confirm(`Import ${rows.length} vendor rows?`)) return;
    setVendorImporting(true);
    try {
      const res = await fetch('/api/admin/vendor-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setVendorMessage({
          type: 'success',
          text: `Import complete: ${data.result.created} created, ${data.result.updated} updated.`,
        });
        setVendorResults(null);
        if (vendorFileRef.current) vendorFileRef.current.value = '';
        await fetchDbStats();
      } else {
        setVendorMessage({ type: 'error', text: data.error || 'Vendor import failed.' });
      }
    } catch (err: unknown) {
      setVendorMessage({ type: 'error', text: err instanceof Error ? err.message : 'Vendor import failed.' });
    } finally {
      setVendorImporting(false);
    }
  }

  async function handleTransferUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setTransferAnalyzing(true);
    setTransferResults(null);
    setTransferMessage(null);
    setTransferExpandedInvalid(false);
    setTransferExpandedSkip(false);
    setTransferUserDates({});
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/transfer-analysis', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setTransferResults(data);
      else setTransferMessage({ type: 'error', text: data.error || 'Transfer analysis failed.' });
    } catch (err: unknown) {
      setTransferMessage({ type: 'error', text: err instanceof Error ? err.message : 'Transfer analysis failed.' });
    } finally {
      setTransferAnalyzing(false);
    }
  }

  async function executeTransferImport() {
    if (!transferResults) return;
    const createRows = transferResults.analysis.filter((row: any) => row.action === 'CREATE');
    const updateRows = transferResults.analysis.filter((row: any) => row.action === 'UPDATE');
    const fixedInvalidRows = transferResults.analysis
      .map((row: any, index: number) => ({ row, index }))
      .filter(({ row, index }: any) => row.action === 'INVALID_DATE' && transferUserDates[index])
      .map(({ row, index }: any) => ({ ...row, userDate: transferUserDates[index] }));
    const rows = [...createRows, ...updateRows, ...fixedInvalidRows];
    if (rows.length === 0) return;
    if (!confirm(`Import ${rows.length} transfer rows?`)) return;
    setTransferImporting(true);
    try {
      const res = await fetch('/api/admin/transfer-execution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTransferMessage({
          type: 'success',
          text: `Import complete: ${data.result.created} created, ${data.result.updated} updated.`,
        });
        setTransferResults(null);
        if (transferFileRef.current) transferFileRef.current.value = '';
        setTransferUserDates({});
        await fetchDbStats();
      } else {
        setTransferMessage({ type: 'error', text: data.error || 'Transfer import failed.' });
      }
    } catch (err: unknown) {
      setTransferMessage({ type: 'error', text: err instanceof Error ? err.message : 'Transfer import failed.' });
    } finally {
      setTransferImporting(false);
    }
  }

  function buildTourCompositeKey(name: string, vendorLegacyId: string): string {
    const n = (name || '').trim();
    const v = (vendorLegacyId || '').trim();
    return `${n}|||${v || 'NO_VENDOR'}`;
  }

  function tourKeyLabel(entry: any): string {
    return entry.vendorLegacyId
      ? `${entry.name} [${entry.vendorLegacyId}${entry.vendorName ? `: ${entry.vendorName}` : ''}]`
      : `${entry.name} [NO_VENDOR]`;
  }

  async function handleTourParse() {
    const file = tourFileRef.current?.files?.[0];
    if (!file) return;
    setTourCsvFile(file);
    setTourStep('parsing');
    setTourParseError(null);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch('/api/admin/tour-normalization/parse', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) {
        setTourParseError(data.error || 'Tour parse failed.');
        setTourStep('upload');
        return;
      }
      setTourPrompt(data.prompt ?? '');
      setTourUniqueNames(data.uniqueNames ?? []);
      setTourNameCountMap(data.nameCountMap ?? {});
      setTourProducts(data.products ?? []);
      setTourVendors(data.vendors ?? []);
      setTourTotalRows(data.totalRows ?? 0);
      setTourTotalNew(data.totalNew ?? data.totalRows ?? 0);
      setTourTotalExisting(data.totalExisting ?? 0);
      setTourStep('paste');
    } catch (err: unknown) {
      setTourParseError(err instanceof Error ? err.message : 'Tour parse failed.');
      setTourStep('upload');
    }
  }

  async function copyTourPrompt() {
    await navigator.clipboard.writeText(tourPrompt);
    setTourCopied(true);
    setTimeout(() => setTourCopied(false), 2000);
  }

  function hydrateTourGroup(keys: string[], groupId: number, current?: any): any {
    const detailMap = new Map(tourUniqueNames.map((item: any) => [item.key, item]));
    const rowCount = keys.reduce((sum, key) => sum + (tourNameCountMap[key] ?? 0), 0);
    const existingCount = keys.reduce((sum, key) => sum + (detailMap.get(key)?.existingCount ?? 0), 0);
    return {
      groupId,
      csvKeys: keys,
      csvLabels: keys.map((key) => {
        const detail = detailMap.get(key);
        return detail ? tourKeyLabel(detail) : key;
      }),
      rowCount,
      newCount: rowCount - existingCount,
      existingCount,
      suggestedAction: current?.suggestedAction ?? 'skip',
      suggestedProductId: current?.suggestedProductId ?? '',
      suggestedNameEn: current?.suggestedNameEn ?? detailMap.get(keys[0] ?? '')?.name ?? '',
      suggestedNameEs: current?.suggestedNameEs ?? detailMap.get(keys[0] ?? '')?.name ?? '',
      suggestedVendorId: current?.suggestedVendorId ?? '',
    };
  }

  function moveTourKeyBetweenGroups(fromGroupId: number, key: string, target: string) {
    setTourGroups((prev) => {
      const sourceIndex = prev.findIndex((group: any) => group.groupId === fromGroupId);
      if (sourceIndex < 0) return prev;
      const next = [...prev];
      const sourceKeys = next[sourceIndex].csvKeys.filter((item: string) => item !== key);
      next[sourceIndex] = hydrateTourGroup(sourceKeys, fromGroupId, next[sourceIndex]);

      let newGroupId: number | null = null;
      if (target === 'new') {
        newGroupId = Math.max(0, ...next.map((group: any) => group.groupId)) + 1;
        next.push(hydrateTourGroup([key], newGroupId));
      } else {
        const targetId = Number(target);
        const targetIndex = next.findIndex((group: any) => group.groupId === targetId);
        if (targetIndex >= 0) {
          const merged = Array.from(new Set([...next[targetIndex].csvKeys, key]));
          next[targetIndex] = hydrateTourGroup(merged as string[], targetId, next[targetIndex]);
        }
      }

      const filtered = next.filter((group: any) => group.csvKeys.length > 0);
      if (newGroupId) {
        const keyMeta = tourUniqueNames.find((item: any) => item.key === key);
        setTourDecisions((prevDecisions) => ({
          ...prevDecisions,
          [newGroupId!]: {
            action: 'create',
            name_en: keyMeta?.name ?? '',
            name_es: keyMeta?.name ?? '',
            vendor_id: keyMeta?.vendorId ?? '',
          },
        }));
      }
      return filtered;
    });
  }

  function handleTourParseAiResponse() {
    setTourAiParseError(null);
    const text = tourPastedResponse.trim();
    if (!text) {
      setTourAiParseError('Paste AI response first.');
      return;
    }
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      setTourAiParseError('No JSON array found.');
      return;
    }

    let rawGroups: any[] = [];
    try {
      rawGroups = JSON.parse(jsonMatch[0]);
    } catch {
      setTourAiParseError('Invalid JSON response.');
      return;
    }

    const allKeys = new Set(tourUniqueNames.map((item: any) => item.key));
    const covered = new Set<string>();
    const keyByLabel = new Map(tourUniqueNames.map((item: any) => [tourKeyLabel(item), item.key]));
    const keysByName = new Map<string, string[]>();
    for (const item of tourUniqueNames) {
      const base = (item.name || '').toLowerCase().trim();
      if (!keysByName.has(base)) keysByName.set(base, []);
      keysByName.get(base)?.push(item.key);
    }
    const detailMap = new Map(tourUniqueNames.map((item: any) => [item.key, item]));

    function resolveTokenToKeys(token: string): string[] {
      const t = (token || '').trim();
      if (!t) return [];
      if (allKeys.has(t)) return [t];
      const direct = keyByLabel.get(t);
      if (direct) return [direct];
      const labelMatch = t.match(/^(.*)\s+\[([^\]]+)\]$/);
      if (labelMatch) {
        const namePart = labelMatch[1].trim();
        const vendorLegacy = labelMatch[2].trim().split(':')[0].trim();
        const key = buildTourCompositeKey(namePart, vendorLegacy === 'NO_VENDOR' ? '' : vendorLegacy);
        if (allKeys.has(key)) return [key];
      }
      return keysByName.get(t.toLowerCase().trim()) ?? [];
    }

    const parsed = rawGroups
      .map((group: any, index: number) => {
        const sourceTokens: string[] = (group.csvKeys?.length ? group.csvKeys : group.csvNames ?? []) as string[];
        const validKeys: string[] = Array.from(new Set(sourceTokens.flatMap((token: string) => resolveTokenToKeys(token))));
        validKeys.forEach((key) => covered.add(key));
        const rowCount = validKeys.reduce((sum, key) => sum + (tourNameCountMap[key] ?? 0), 0);
        const existingCount = validKeys.reduce((sum, key) => sum + (detailMap.get(key)?.existingCount ?? 0), 0);
        const vendorIds = Array.from(new Set(validKeys.map((key) => detailMap.get(key)?.vendorId).filter(Boolean)));
        return {
          groupId: group.groupId ?? index + 1,
          csvKeys: validKeys,
          csvLabels: validKeys.map((key) => {
            const detail = detailMap.get(key);
            return detail ? tourKeyLabel(detail) : key;
          }),
          rowCount,
          newCount: rowCount - existingCount,
          existingCount,
          suggestedAction: ['create', 'map', 'skip'].includes(group.action) ? group.action : 'skip',
          suggestedProductId: group.productId ?? '',
          suggestedNameEn: group.name_en ?? detailMap.get(validKeys[0] ?? '')?.name ?? '',
          suggestedNameEs: group.name_es ?? detailMap.get(validKeys[0] ?? '')?.name ?? '',
          suggestedVendorId: vendorIds.length === 1 ? vendorIds[0] : '',
        };
      })
      .filter((group: any) => group.csvKeys.length > 0);

    const uncovered = [...allKeys].filter((key) => !covered.has(key));
    if (uncovered.length > 0) {
      parsed.push(hydrateTourGroup(uncovered as string[], parsed.length + 1));
    }

    const decisions: Record<number, any> = {};
    parsed.forEach((group: any) => {
      decisions[group.groupId] = {
        action: group.suggestedAction,
        productId: group.suggestedProductId ?? '',
        name_en: group.suggestedNameEn ?? '',
        name_es: group.suggestedNameEs ?? '',
        vendor_id: group.suggestedVendorId ?? '',
      };
    });

    setTourGroups(parsed);
    setTourDecisions(decisions);
    setTourStep('review');
  }

  async function executeTourImport() {
    if (!tourCsvFile) return;
    setTourStep('importing');
    const groupsPayload = tourGroups.map((group: any) => {
      const decision = tourDecisions[group.groupId] ?? { action: 'skip' };
      return {
        groupId: group.groupId,
        csvKeys: group.csvKeys,
        action: decision.action,
        productId: decision.productId,
        name_en: decision.name_en,
        name_es: decision.name_es,
        vendor_id: decision.vendor_id || null,
      };
    });
    const fd = new FormData();
    fd.append('file', tourCsvFile);
    fd.append('groups', JSON.stringify(groupsPayload));
    try {
      const res = await fetch('/api/admin/tour-normalization/execute', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) setTourImportResult(data.result);
      else setTourImportResult({ created: 0, updated: 0, skipped: 0, errors: [data.error || 'Tour import failed.'] });
      await fetchDbStats();
    } catch (err: unknown) {
      setTourImportResult({
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [err instanceof Error ? err.message : 'Tour import failed.'],
      });
    } finally {
      setTourStep('done');
    }
  }

  function resetTourModule() {
    setTourStep('upload');
    setTourCsvFile(null);
    setTourPrompt('');
    setTourUniqueNames([]);
    setTourNameCountMap({});
    setTourProducts([]);
    setTourVendors([]);
    setTourTotalRows(0);
    setTourTotalNew(0);
    setTourTotalExisting(0);
    setTourPastedResponse('');
    setTourGroups([]);
    setTourDecisions({});
    setTourImportResult(null);
    setTourParseError(null);
    setTourAiParseError(null);
    if (tourFileRef.current) tourFileRef.current.value = '';
  }

  const loadGuestNormalization = useCallback(async () => {
    setGuestNormLoading(true);
    try {
      const res = await fetch(`/api/admin/guest-normalization?mode=${guestNormTab}`);
      const data = await res.json();
      const fetched = guestNormTab === 'duplicates' ? data.duplicates ?? [] : data.orphans ?? [];
      setGuestNormItems(fetched);
      if (guestNormTab === 'duplicates') {
        const autoActions: Record<string, 'merge' | 'delete' | null> = {};
        fetched.forEach((cluster: any) => {
          (cluster.members ?? []).forEach((member: any, index: number) => {
            if (index === 0) return;
            autoActions[member.id] = member.total_records > 0 ? 'merge' : 'delete';
          });
        });
        setGuestNormSelectedActions(autoActions);
      }
    } finally {
      setGuestNormLoading(false);
    }
  }, [guestNormTab]);

  useEffect(() => {
    if (activeModule === 'guestCleanup') void loadGuestNormalization();
  }, [activeModule, loadGuestNormalization]);

  function toggleGuestNormAction(guestId: string, action: 'merge' | 'delete') {
    setGuestNormSelectedActions((prev) => ({ ...prev, [guestId]: prev[guestId] === action ? null : action }));
  }

  async function processGuestNormSelection() {
    const actions = Object.entries(guestNormSelectedActions).filter(([, action]) => action !== null);
    if (actions.length === 0) return;
    if (!confirm(`Process ${actions.length} selected actions?`)) return;
    setGuestNormProcessing(true);
    let ok = 0;
    let fail = 0;
    for (const [guestId, action] of actions) {
      if (!action) continue;
      setGuestNormCurrentProcessingId(guestId);
      try {
        let primaryId: string | null = null;
        if (action === 'merge') {
          const cluster = guestNormItems.find((item: any) => (item.members ?? []).some((member: any) => member.id === guestId));
          primaryId = cluster?.members?.[0]?.id ?? null;
        }
        const res = await fetch('/api/admin/guest-normalization', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            guestId: action === 'delete' ? guestId : undefined,
            primaryId,
            secondaryId: action === 'merge' ? guestId : undefined,
          }),
        });
        if (res.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
      }
    }
    setGuestNormProcessing(false);
    setGuestNormCurrentProcessingId(null);
    setGuestNormSelectedActions({});
    setGuestNormMessage({ type: ok > 0 ? 'success' : 'error', text: `Processed: ${ok} success, ${fail} failed.` });
    await loadGuestNormalization();
    await fetchDbStats();
  }

  async function handleGuestNormLink(reservationId: string, guestId: string) {
    const res = await fetch('/api/admin/guest-normalization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'link', reservationId, primaryId: guestId }),
    });
    const data = await res.json();
    if (res.ok && data.success) {
      setGuestNormMessage({ type: 'success', text: 'Reservation linked.' });
      await loadGuestNormalization();
      await fetchDbStats();
    } else {
      setGuestNormMessage({ type: 'error', text: data.error || 'Failed to link reservation.' });
    }
  }

  async function searchGuests(query: string) {
    if (query.trim().length < 2) {
      setGuestNormSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/guests?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setGuestNormSearchResults(data.guests ?? []);
    } catch {
      setGuestNormSearchResults([]);
    }
  }

  async function generateVendorNormPrompt() {
    setVendorNormLoadingPrompt(true);
    setVendorNormPromptError(null);
    try {
      const res = await fetch('/api/admin/vendor-normalization/analyze');
      const data = await res.json();
      if (res.ok) {
        setVendorNormPrompt(data.prompt ?? '');
        setVendorNormVendors(data.vendors ?? []);
        setVendorNormStep('paste');
      } else {
        setVendorNormPromptError(data.error || 'Failed to generate prompt.');
      }
    } finally {
      setVendorNormLoadingPrompt(false);
    }
  }

  async function copyVendorNormPrompt() {
    await navigator.clipboard.writeText(vendorNormPrompt);
    setVendorNormCopied(true);
    setTimeout(() => setVendorNormCopied(false), 2000);
  }

  function parseVendorNormResponse() {
    setVendorNormParseError(null);
    const text = vendorNormPastedResponse.trim();
    if (!text) {
      setVendorNormParseError('Paste AI response first.');
      return;
    }
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      setVendorNormParseError('No JSON array found.');
      return;
    }
    let rawGroups: any[] = [];
    try {
      rawGroups = JSON.parse(jsonMatch[0]);
    } catch {
      setVendorNormParseError('Invalid JSON response.');
      return;
    }
    const vendorMap = new Map(vendorNormVendors.map((vendor: any) => [vendor.id, vendor]));
    const groups = rawGroups.map((group: any) => ({
      groupId: group.groupId,
      reason: group.reason,
      vendors: (group.vendors ?? []).map((item: any) => {
        const full = vendorMap.get(item.id) as any;
        return {
          id: item.id,
          name: full?.name ?? item.name,
          type: full?.type ?? 'other',
          email: full?.email ?? null,
          phone: full?.phone ?? null,
          is_active: full?.is_active ?? false,
          transfer_count: full?.transfer_count ?? 0,
          tour_product_count: full?.tour_product_count ?? 0,
          isSuggestedMaster: item.isSuggestedMaster,
        };
      }),
    }));
    const decisions: Record<number, any> = {};
    groups.forEach((group: any) => {
      const suggested = group.vendors.find((vendor: any) => vendor.isSuggestedMaster);
      decisions[group.groupId] = suggested ? { action: 'merge', masterId: suggested.id } : { action: 'skip' };
    });
    setVendorNormGroups(groups);
    setVendorNormDecisions(decisions);
    setVendorNormStep('review');
  }

  async function executeVendorNorm() {
    setVendorNormStep('executing');
    const merges = vendorNormGroups
      .filter((group: any) => vendorNormDecisions[group.groupId]?.action === 'merge')
      .map((group: any) => {
        const decision = vendorNormDecisions[group.groupId];
        return {
          masterId: decision.masterId,
          duplicateIds: group.vendors.filter((vendor: any) => vendor.id !== decision.masterId).map((vendor: any) => vendor.id),
        };
      })
      .filter((item: any) => item.duplicateIds.length > 0);
    try {
      const res = await fetch('/api/admin/vendor-normalization/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merges }),
      });
      const data = await res.json();
      if (res.ok) setVendorNormExecuteResult(data.result);
      else setVendorNormExecuteResult({ groupsProcessed: 0, vendorsDeactivated: 0, transfersUpdated: 0, tourProductsUpdated: 0, vendorUsersUpdated: 0, errors: [data.error || 'Normalization failed.'] });
      await fetchDbStats();
    } catch (err: unknown) {
      setVendorNormExecuteResult({ groupsProcessed: 0, vendorsDeactivated: 0, transfersUpdated: 0, tourProductsUpdated: 0, vendorUsersUpdated: 0, errors: [err instanceof Error ? err.message : 'Normalization failed.'] });
    } finally {
      setVendorNormStep('done');
    }
  }

  function resetVendorNorm() {
    setVendorNormStep('generate');
    setVendorNormPrompt('');
    setVendorNormVendors([]);
    setVendorNormPastedResponse('');
    setVendorNormGroups([]);
    setVendorNormDecisions({});
    setVendorNormPromptError(null);
    setVendorNormParseError(null);
    setVendorNormExecuteResult(null);
  }

  function renderSyncLog(log: SyncLog) {
    const created = Array.isArray(log.created_details) ? log.created_details : [];
    const updated = Array.isArray(log.updated_details) ? log.updated_details : [];
    const errors = Array.isArray(log.errors) ? log.errors : [];
    const isExpanded = expandedLog?.id === log.id;
    const section = isExpanded ? expandedLog?.section : null;

    const toggle = (next: 'created' | 'updated' | 'errors') => {
      if (isExpanded && section === next) setExpandedLog(null);
      else setExpandedLog({ id: log.id, section: next });
    };

    return (
      <div key={log.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <div className="px-3 py-2 text-xs bg-slate-50 flex items-center gap-2 flex-wrap">
          {errors.length > 0 ? <ExclamationTriangleIcon className="h-4 w-4 text-amber-500" /> : <CheckCircleIcon className="h-4 w-4 text-emerald-500" />}
          <span className="text-slate-500 font-mono">{new Date(log.synced_at).toLocaleString()}</span>
          <span className="uppercase text-slate-400">[{log.triggered_by}]</span>
          {log.triggered_by !== 'upload' ? <span className="text-slate-500">{log.emails_found} email(s), {log.xmls_processed} XML(s)</span> : null}
          <button type="button" onClick={() => toggle('created')} className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', section === 'created' ? 'bg-emerald-200 text-emerald-800' : 'bg-emerald-100 text-emerald-700')}>
            {created.length} new
          </button>
          <button type="button" onClick={() => toggle('updated')} className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', section === 'updated' ? 'bg-sky-200 text-sky-800' : 'bg-sky-100 text-sky-700')}>
            {updated.length} updated
          </button>
          {errors.length > 0 ? (
            <button type="button" onClick={() => toggle('errors')} className={cx('rounded-full px-2 py-0.5 text-[11px] font-semibold', section === 'errors' ? 'bg-rose-200 text-rose-800' : 'bg-rose-100 text-rose-700')}>
              {errors.length} errors
            </button>
          ) : null}
        </div>
        {isExpanded && section === 'created' ? (
          <div className="px-3 py-2 border-t border-slate-100 bg-emerald-50 text-xs text-emerald-800 max-h-44 overflow-y-auto space-y-1">
            {created.map((item: any, index: number) => (
              <p key={`${item.opera_resv_id ?? index}`}>{item.guest_name} ({item.arrival}{' -> '}{item.departure})</p>
            ))}
          </div>
        ) : null}
        {isExpanded && section === 'updated' ? (
          <div className="px-3 py-2 border-t border-slate-100 bg-sky-50 text-xs text-sky-800 max-h-44 overflow-y-auto space-y-1">
            {updated.map((item: any, index: number) => (
              <p key={`${item.opera_resv_id ?? index}`}>{item.guest_name} ({item.arrival}{' -> '}{item.departure})</p>
            ))}
          </div>
        ) : null}
        {isExpanded && section === 'errors' ? (
          <div className="px-3 py-2 border-t border-slate-100 bg-rose-50 text-xs text-rose-800 max-h-44 overflow-y-auto space-y-1">
            {errors.map((item, index) => (
              <p key={`${item}-${index}`} className="font-mono break-all">{item}</p>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  function renderHubModule() {
    const steps = [
      { step: 1, module: 'guestImport' as ModuleKey, title: 'Guest Import', desc: 'Import full profiles first.', source: 'Concierge - Huespedes.csv', count: `${getCount('guests')} guests` },
      { step: 2, module: 'opera' as ModuleKey, title: 'Opera PMS Sync', desc: 'Sync reservations from Opera.', source: 'Opera XML', count: `${getCount('reservations')} reservations`, warning: activeSettings.pipeline.requireGuestImportBeforeOpera && getCount('guests') === 0 ? 'Recommended: import guests first.' : '' },
      { step: 3, module: 'vendorImport' as ModuleKey, title: 'Vendor Import', desc: 'Build canonical vendor base.', source: 'Concierge - Vendedores.csv', count: `${getCount('vendors')} vendors` },
      { step: 4, module: 'appsheetImport' as ModuleKey, title: 'AppSheet Import', desc: 'Direct legacy table ingestion.', source: 'Various AppSheet CSVs', count: 'Multiple tables' },
      { step: 5, module: 'transferImport' as ModuleKey, title: 'Transfer Import', desc: 'Link vendors by legacy vendor ID.', source: 'Concierge - Traslados Llegadas y Salidas.csv', count: `${getCount('transfers')} transfers`, locked: transferLocked, lockReason: 'Requires guests first.' },
      { step: 6, module: 'tourImport' as ModuleKey, title: 'Tour Import', desc: 'Group and map tours by vendor context.', source: 'Concierge - Actividades.csv', count: `${getCount('tour_bookings')} bookings` },
      { step: 7, module: 'guestCleanup' as ModuleKey, title: 'Guest Normalization', desc: 'Merge duplicates and relink orphans.', source: 'N/A', count: `${getCount('guests')} guests`, locked: guestNormLocked, lockReason: 'Needs guests or reservations.' },
      { step: 8, module: 'vendorCleanup' as ModuleKey, title: 'Vendor Normalization', desc: 'Merge duplicate vendors.', source: 'N/A', count: `${getCount('vendors')} vendors`, locked: vendorNormLocked, lockReason: `Requires ${activeSettings.pipeline.vendorNormalizationMinVendors}+ vendors.` },
    ];

    return (
      <div className="space-y-5">
        <SectionTitle title="Data Curation Pipeline" subtitle="One command surface for the entire import and cleanup flow." />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <MetricCard label="Guests" value={getCount('guests')} tone="emerald" icon={<UserPlusIcon className="h-4 w-4" />} />
          <MetricCard label="Reservations" value={getCount('reservations')} tone="sky" icon={<TableCellsIcon className="h-4 w-4" />} />
          <MetricCard label="Vendors" value={getCount('vendors')} tone="amber" icon={<UserGroupIcon className="h-4 w-4" />} />
          <MetricCard label="Transfers + Tours" value={getCount('transfers') + getCount('tour_bookings')} tone="slate" icon={<SparklesIcon className="h-4 w-4" />} />
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.step} className={cx('rounded-2xl border bg-white px-4 py-4', step.locked ? 'border-slate-200 opacity-70' : 'border-slate-200')}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3">
                  <div className={cx('h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold', step.locked ? 'bg-slate-200 text-slate-500' : 'bg-slate-900 text-white')}>
                    {step.locked ? <LockClosedIcon className="h-4 w-4" /> : step.step}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                    <p className="text-[11px] text-slate-400 mt-1">Source: {step.source}</p>
                    {step.warning ? <p className="text-xs text-amber-700 mt-1">{step.warning}</p> : null}
                    {step.locked && step.lockReason ? <p className="text-xs text-rose-700 mt-1">{step.lockReason}</p> : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 text-slate-700 px-2.5 py-1 text-xs font-medium">{step.count}</span>
                  <button type="button" onClick={() => setActiveModule(step.module)} className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                    Open Module
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {activeSettings.safety.enableDatabaseResetSection ? (
          <div className="rounded-2xl border border-rose-200 overflow-hidden bg-white">
            <button type="button" onClick={() => setShowReset((v) => !v)} className="w-full px-4 py-3 bg-rose-50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <ServerStackIcon className="h-5 w-5" />
                <span className="text-sm font-semibold">Step 0 - Database Reset</span>
              </div>
              {showReset ? <ChevronDownIcon className="h-4 w-4 text-rose-500" /> : <ChevronRightIcon className="h-4 w-4 text-rose-500" />}
            </button>
            {showReset ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button type="button" onClick={() => void handleClearAll()} disabled={clearingAll || !activeSettings.safety.enableClearAll} className="rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-semibold hover:bg-rose-700 disabled:opacity-50">
                    {clearingAll ? 'Clearing...' : 'Clear All Tables'}
                  </button>
                  <button type="button" onClick={() => void fetchDbStats()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Refresh Counts
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {dbStats.map((stat) => (
                    <div key={stat.table} className="rounded-xl border border-rose-100 bg-rose-50/40 px-3 py-2">
                      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500">{stat.table}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-base font-semibold text-slate-900">{stat.count.toLocaleString()}</p>
                        {activeSettings.safety.allowSingleTableClear ? (
                          <button type="button" onClick={() => void handleClearTable(stat.table)} className="rounded-md p-1 text-rose-500 hover:bg-rose-100">
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {(activeSettings.ux.showSystemInfoSection || activeSettings.ux.showMessagingChannelsSection) ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
            {activeSettings.ux.showMessagingChannelsSection ? (
              <div>
                <p className="text-sm font-semibold text-slate-900">Messaging Channels</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CHANNELS.map((channel) => (
                    <span key={channel} className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 text-xs font-medium">{channel}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {activeSettings.ux.showSystemInfoSection ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium text-slate-800">Platform:</span> Nayara BDT Ordering and Concierge</p>
                <p><span className="font-medium text-slate-800">PMS:</span> Opera Cloud XML</p>
                <p><span className="font-medium text-slate-800">Database:</span> PostgreSQL</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  function renderGuestImportModule() {
    const rows = guestResults?.analysis ?? [];
    const skipRows = rows.filter((row: any) => row.action === 'SKIP');
    const activeRows = rows.filter((row: any) => row.action !== 'SKIP');

    return (
      <div className="space-y-4">
        <SectionTitle title="Guest Import" subtitle="Import complete guest profiles before syncing Opera reservations." />
        {!guestResults && !guestAnalyzing ? (
          <div onClick={() => guestFileRef.current?.click()} className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50 transition-colors">
            <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-800">Upload Guest CSV</p>
            <input ref={guestFileRef} type="file" accept=".csv" onChange={handleGuestUpload} className="hidden" />
          </div>
        ) : null}
        {guestAnalyzing ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <div className="h-10 w-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-slate-600 mt-2">Analyzing guest CSV...</p>
          </div>
        ) : null}
        {guestResults ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <MetricCard label="Total" value={guestResults.summary.total} tone="slate" />
              <MetricCard label="Create" value={guestResults.summary.create} tone="emerald" />
              <MetricCard label="Update" value={guestResults.summary.update} tone="sky" />
              <MetricCard label="Conflict" value={guestResults.summary.conflict} tone="rose" />
              <MetricCard label="Skip" value={guestResults.summary.skip} tone="amber" />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="max-h-[460px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase tracking-[0.12em]">
                    <tr>
                      <th className="text-left px-4 py-3">Guest</th>
                      <th className="text-left px-4 py-3">Match</th>
                      <th className="text-left px-4 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeRows.map((row: any, index: number) => (
                      <tr key={`${row.csv?.legacyId ?? 'g'}-${index}`} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{row.csv?.fullName || row.csv?.primaryName || '(blank)'}</p>
                          <p className="text-xs text-slate-500">{row.csv?.email || 'No email'}</p>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {row.match ? (
                            <div>
                              <p className="font-medium text-slate-800">{row.match.fullName}</p>
                              <p className="text-xs text-slate-500">{row.match.legacyId || row.match.id?.slice(0, 8)}</p>
                            </div>
                          ) : (
                            <span className="italic text-slate-400">No match</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold', row.action === 'CREATE' && 'bg-emerald-100 text-emerald-700', row.action === 'UPDATE' && 'bg-sky-100 text-sky-700', row.action === 'CONFLICT' && 'bg-rose-100 text-rose-700')}>
                            {row.action}
                          </span>
                          <p className="text-[11px] text-slate-500 mt-1">{row.reason}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {skipRows.length > 0 ? (
              <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                <button type="button" onClick={() => setGuestExpandedSkip((value) => !value)} className="w-full px-4 py-3 bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{skipRows.length} skipped rows</span>
                  {guestExpandedSkip ? <ChevronDownIcon className="h-4 w-4 text-slate-500" /> : <ChevronRightIcon className="h-4 w-4 text-slate-500" />}
                </button>
                {guestExpandedSkip ? (
                  <div className="divide-y divide-slate-100">
                    {skipRows.map((row: any, index: number) => (
                      <div key={`${row.csv?.legacyId ?? 's'}-${index}`} className="px-4 py-3 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{row.csv?.fullName || row.csv?.primaryName || '(blank)'}</p>
                          <p className="text-xs text-slate-500">{row.reason}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(['guest', 'staff', 'visitor', 'other'] as const).map((type) => (
                            <button key={type} type="button" onClick={() => rescueGuestRow(rows.indexOf(row), type)} className="rounded-md border border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:bg-slate-50">
                              {type}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 text-white px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-200">Ready: {guestResults.summary.create} create, {guestResults.summary.update} update</p>
              <button type="button" onClick={() => void executeGuestImport()} disabled={guestImporting || guestResults.summary.create + guestResults.summary.update === 0} className="rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold hover:bg-sky-400 disabled:opacity-50">
                {guestImporting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          </div>
        ) : null}
        {guestMessage ? (
          <div className={cx('rounded-xl border px-3 py-2 text-sm', guestMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>
            {guestMessage.text}
          </div>
        ) : null}
      </div>
    );
  }

  function renderOperaModule() {
    return (
      <div className="space-y-4">
        <SectionTitle title="Opera PMS Sync" subtitle="Manual sync, XML upload fallback, and detailed sync history." />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={() => void handleManualSync()} disabled={syncing || !activeSettings.opera.manualSyncEnabled} className="rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-semibold hover:bg-sky-700 disabled:opacity-50">
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button type="button" onClick={() => void fetchSyncLogs()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Refresh Logs
            </button>
            {activeSettings.ux.showLastRunOnOperaStep && syncLogs[0] ? <p className="text-xs text-slate-500">Last run: {new Date(syncLogs[0].synced_at).toLocaleString()}</p> : null}
          </div>
          {syncStatus ? <div className={cx('rounded-xl border px-3 py-2 text-sm', syncStatus.startsWith('Error') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{syncStatus}</div> : null}
          {activeSettings.opera.manualXmlUploadEnabled ? (
            <form onSubmit={handleOperaImport} className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex items-center gap-2 flex-wrap">
              <input ref={operaFileRef} type="file" accept=".xml" required className="text-sm text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-100" />
              <button type="submit" disabled={operaImporting} className="rounded-lg bg-slate-900 text-white px-3 py-2 text-xs font-semibold hover:bg-slate-800 disabled:opacity-50">
                {operaImporting ? 'Importing...' : 'Upload XML'}
              </button>
              {operaImportStatus ? <p className={cx('text-xs rounded-lg px-2 py-1 border', operaImportStatus.startsWith('Error') ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')}>{operaImportStatus}</p> : null}
            </form>
          ) : null}
          <div className="space-y-2">{syncLogs.length ? syncLogs.map((log) => renderSyncLog(log)) : <p className="text-sm text-slate-500">No sync logs yet.</p>}</div>
        </div>
      </div>
    );
  }

  function renderVendorImportModule() {
    return (
      <div className="space-y-4">
        <SectionTitle title="Vendor Import" subtitle="Preserve legacy vendor IDs and resolve conflicts before import." />
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {!vendorResults && !vendorAnalyzing ? (
            <div onClick={() => vendorFileRef.current?.click()} className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-10 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
              <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">Upload Vendor CSV</p>
              <input ref={vendorFileRef} type="file" accept=".csv" onChange={handleVendorUpload} className="hidden" />
            </div>
          ) : null}
          {vendorAnalyzing ? <p className="text-sm text-slate-500">Analyzing vendor CSV...</p> : null}
          {vendorResults ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <MetricCard label="Total" value={vendorResults.summary.total} tone="slate" />
                <MetricCard label="Create" value={vendorResults.summary.create} tone="emerald" />
                <MetricCard label="Update" value={vendorResults.summary.update} tone="sky" />
                <MetricCard label="Conflict" value={vendorResults.summary.conflict} tone="rose" />
                <MetricCard label="Skip" value={vendorResults.summary.skip} tone="amber" />
                <MetricCard label="Legacy IDs" value={vendorResults.summary.withLegacyId} tone="slate" />
              </div>
              <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.1em]">
                    <tr>
                      <th className="px-3 py-2 text-left">Vendor</th>
                      <th className="px-3 py-2 text-left">Match</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorResults.analysis.map((row: any, index: number) => (
                      <tr key={`${row.csv?.legacyId ?? 'v'}-${index}`}>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-slate-900">{row.csv?.name || '(blank)'}</p>
                          <p className="text-slate-500">{row.csv?.legacyId ? `legacy: ${row.csv.legacyId}` : 'no legacy id'}</p>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.match ? row.match.name : 'No match'}</td>
                        <td className="px-3 py-2">
                          <span className={cx('inline-flex rounded-full px-2 py-0.5 font-semibold', row.action === 'CREATE' && 'bg-emerald-100 text-emerald-700', row.action === 'UPDATE' && 'bg-sky-100 text-sky-700', row.action === 'CONFLICT' && 'bg-rose-100 text-rose-700', row.action === 'SKIP' && 'bg-slate-100 text-slate-600')}>{row.action}</span>
                          {row.action === 'CONFLICT' ? (
                            <div className="mt-1 flex gap-1">
                              <button type="button" onClick={() => setVendorRowAction(index, 'UPDATE', 'Conflict resolved manually')} className="rounded border border-sky-200 bg-sky-50 px-1.5 py-0.5 text-[10px] text-sky-700">UPDATE</button>
                              <button type="button" onClick={() => setVendorRowAction(index, 'CREATE', 'Conflict resolved manually')} className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">CREATE</button>
                              <button type="button" onClick={() => setVendorRowAction(index, 'SKIP', 'Skipped manually')} className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-600">SKIP</button>
                            </div>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button type="button" onClick={() => void executeVendorImport()} disabled={vendorImporting} className="rounded-lg bg-amber-500 text-white px-4 py-2 text-xs font-semibold hover:bg-amber-400 disabled:opacity-50">
                {vendorImporting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          ) : null}
          {vendorMessage ? <div className={cx('mt-3 rounded-xl border px-3 py-2 text-sm', vendorMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>{vendorMessage.text}</div> : null}
        </div>
      </div>
    );
  }

  function renderTransferModule() {
    const invalidRows = transferResults?.analysis?.filter((row: any) => row.action === 'INVALID_DATE') ?? [];
    const fixedInvalid = invalidRows.filter((_row: any, index: number) => transferUserDates[index]).length;
    const totalReady =
      (transferResults?.summary?.create ?? 0) +
      (transferResults?.summary?.update ?? 0) +
      fixedInvalid;

    return (
      <div className="space-y-4">
        <SectionTitle title="Transfer Import" subtitle="Import transfers and link vendors by legacy vendor ID." />
        {transferLocked ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">Transfer import is locked: import guests first.</div> : null}
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          {!transferResults && !transferAnalyzing ? (
            <div onClick={() => (!transferLocked ? transferFileRef.current?.click() : null)} className={cx('rounded-2xl border-2 border-dashed p-10 text-center transition-colors', transferLocked ? 'border-slate-300 bg-slate-100 opacity-70' : 'border-slate-300 bg-slate-50 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50')}>
              <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-slate-400" />
              <p className="mt-3 text-sm font-semibold text-slate-800">Upload Transfer CSV</p>
              <input ref={transferFileRef} type="file" accept=".csv" onChange={handleTransferUpload} className="hidden" />
            </div>
          ) : null}
          {transferAnalyzing ? <p className="text-sm text-slate-500">Analyzing transfer CSV...</p> : null}
          {transferResults ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <MetricCard label="Total" value={transferResults.summary.total} tone="slate" />
                <MetricCard label="Create" value={transferResults.summary.create} tone="emerald" />
                <MetricCard label="Update" value={transferResults.summary.update} tone="sky" />
                <MetricCard label="Invalid Date" value={transferResults.summary.invalidDate} tone="amber" />
                <MetricCard label="Skip" value={transferResults.summary.skip} tone="rose" />
              </div>
              <div className="max-h-[430px] overflow-auto rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.1em]">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Guest</th>
                      <th className="px-3 py-2 text-left">Vendor Link</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transferResults.analysis.map((row: any, index: number) => (
                      <tr key={`${row.csv?.legacyId ?? 't'}-${index}`}>
                        <td className="px-3 py-2 text-slate-600">{row.csv?.parsedDate || row.csv?.rawDate || '-'}</td>
                        <td className="px-3 py-2 text-slate-700">{row.guest?.fullName || row.csv?.guestName || 'Unknown guest'}</td>
                        <td className="px-3 py-2">
                          {row.vendor ? (
                            <div>
                              <p className="font-semibold text-emerald-700">{row.vendor.name}</p>
                              <p className="text-slate-500">legacy: {row.csv?.vendorLegacyId || 'none'}</p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-rose-600">Not linked</p>
                              <p className="text-slate-500">legacy: {row.csv?.vendorLegacyId || 'none'}</p>
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className={cx('inline-flex rounded-full px-2 py-0.5 font-semibold', row.action === 'CREATE' && 'bg-emerald-100 text-emerald-700', row.action === 'UPDATE' && 'bg-sky-100 text-sky-700', row.action === 'INVALID_DATE' && 'bg-amber-100 text-amber-700', row.action === 'SKIP' && 'bg-slate-100 text-slate-600')}>
                            {row.action}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {invalidRows.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50/60 overflow-hidden">
                  <button type="button" onClick={() => setTransferExpandedInvalid((value) => !value)} className="w-full px-3 py-2 text-left text-sm font-medium text-amber-700 flex items-center justify-between">
                    <span>{invalidRows.length} rows with invalid dates</span>
                    {transferExpandedInvalid ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </button>
                  {transferExpandedInvalid ? (
                    <div className="divide-y divide-amber-100">
                      {invalidRows.map((row: any, index: number) => (
                        <div key={`invalid-${index}`} className="px-3 py-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{row.csv?.guestName || 'Unknown guest'}</p>
                            <p className="text-xs text-amber-700">raw date: {row.csv?.rawDate || '(empty)'}</p>
                          </div>
                          <input type="date" value={transferUserDates[index] ?? ''} onChange={(event) => setTransferUserDates((prev) => ({ ...prev, [index]: event.target.value }))} className="rounded-md border border-amber-300 px-2 py-1 text-xs" />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <button type="button" onClick={() => void executeTransferImport()} disabled={transferImporting || totalReady === 0 || transferLocked} className="rounded-lg bg-indigo-500 text-white px-4 py-2 text-xs font-semibold hover:bg-indigo-400 disabled:opacity-50">
                {transferImporting ? 'Importing...' : 'Confirm Import'}
              </button>
            </div>
          ) : null}
          {transferMessage ? <div className={cx('mt-3 rounded-xl border px-3 py-2 text-sm', transferMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>{transferMessage.text}</div> : null}
        </div>
      </div>
    );
  }

  function renderTourModule() {
    const createCount = tourGroups.filter((group: any) => tourDecisions[group.groupId]?.action === 'create').length;
    const mapCount = tourGroups.filter((group: any) => tourDecisions[group.groupId]?.action === 'map').length;
    const skipCount = tourGroups.filter((group: any) => tourDecisions[group.groupId]?.action === 'skip').length;
    const importableRows = tourGroups.reduce((sum: number, group: any) => (tourDecisions[group.groupId]?.action !== 'skip' ? sum + group.rowCount : sum), 0);
    const importableNew = tourGroups.reduce((sum: number, group: any) => (tourDecisions[group.groupId]?.action !== 'skip' ? sum + group.newCount : sum), 0);
    const importableExisting = tourGroups.reduce((sum: number, group: any) => (tourDecisions[group.groupId]?.action !== 'skip' ? sum + group.existingCount : sum), 0);

    return (
      <div className="space-y-4">
        <SectionTitle title="Tour Bookings Import" subtitle="Group by tour and vendor, move records between groups, then import." />
        {(tourStep === 'upload' || tourStep === 'parsing') ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-3">
            <ArrowUpTrayIcon className="h-10 w-10 text-slate-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">Upload Tour CSV</p>
            <input ref={tourFileRef} type="file" accept=".csv" className="mx-auto text-sm text-slate-600" />
            {tourParseError ? <p className="text-xs text-rose-700">{tourParseError}</p> : null}
            <button type="button" onClick={() => void handleTourParse()} disabled={tourStep === 'parsing'} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {tourStep === 'parsing' ? 'Parsing...' : 'Parse and Build Prompt'}
            </button>
          </div>
        ) : null}
        {tourStep === 'paste' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
              {tourUniqueNames.length} groups across {tourTotalRows} rows ({tourTotalNew} new, {tourTotalExisting} existing)
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">1) Copy Prompt</p>
                <button type="button" onClick={() => void copyTourPrompt()} className={cx('rounded-lg px-3 py-1.5 text-xs font-semibold', tourCopied ? 'bg-emerald-500 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700')}>
                  {tourCopied ? 'Copied!' : 'Copy Prompt'}
                </button>
              </div>
              <textarea value={tourPrompt} readOnly rows={8} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-mono text-slate-700" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800">2) Paste AI JSON</p>
              <textarea value={tourPastedResponse} onChange={(event) => setTourPastedResponse(event.target.value)} rows={8} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono text-slate-700" placeholder="Paste JSON response here..." />
              {tourAiParseError ? <p className="text-xs text-rose-700">{tourAiParseError}</p> : null}
              <button type="button" onClick={handleTourParseAiResponse} disabled={!tourPastedResponse.trim()} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50">
                Parse and Review
              </button>
            </div>
          </div>
        ) : null}
        {tourStep === 'review' ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Groups" value={tourGroups.length} tone="slate" />
              <MetricCard label="Create" value={createCount} tone="emerald" />
              <MetricCard label="Map" value={mapCount} tone="sky" />
              <MetricCard label="Skip" value={skipCount} tone="amber" />
            </div>
            <div className="space-y-3">
              {tourGroups.map((group: any) => {
                const decision = tourDecisions[group.groupId] ?? { action: 'skip' };
                return (
                  <div key={group.groupId} className={cx('rounded-xl border-2 p-3 bg-white space-y-2', decision.action === 'create' && 'border-emerald-300', decision.action === 'map' && 'border-sky-300', decision.action === 'skip' && 'border-slate-200')}>
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="space-y-1">
                        {(group.csvKeys ?? []).map((key: string) => {
                          const detail = tourUniqueNames.find((item: any) => item.key === key);
                          const label = detail ? tourKeyLabel(detail) : key;
                          return (
                            <div key={key} className="flex items-center gap-2 flex-wrap">
                              <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-mono text-slate-700">{label}</span>
                              <select defaultValue="" onChange={(event) => { const target = event.target.value; if (!target) return; moveTourKeyBetweenGroups(group.groupId, key, target); event.target.value = ''; }} className="rounded-md border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-600">
                                <option value="">Move...</option>
                                {tourGroups.filter((other: any) => other.groupId !== group.groupId).map((other: any) => <option key={other.groupId} value={other.groupId}>Group {other.groupId}</option>)}
                                <option value="new">New group</option>
                              </select>
                            </div>
                          );
                        })}
                        <p className="text-xs text-slate-500">{group.rowCount} rows ({group.newCount} new, {group.existingCount} existing)</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {(['create', 'map', 'skip'] as const).map((action) => (
                          <button key={action} type="button" onClick={() => setTourDecisions((prev) => ({ ...prev, [group.groupId]: { ...prev[group.groupId], action } }))} className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase', decision.action === action && action === 'create' && 'bg-emerald-500 text-white', decision.action === action && action === 'map' && 'bg-sky-500 text-white', decision.action === action && action === 'skip' && 'bg-slate-500 text-white', decision.action !== action && 'bg-slate-100 text-slate-600 hover:bg-slate-200')}>
                            {action}
                          </button>
                        ))}
                      </div>
                    </div>
                    {decision.action === 'create' ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input value={decision.name_en ?? ''} onChange={(event) => setTourDecisions((prev) => ({ ...prev, [group.groupId]: { ...prev[group.groupId], name_en: event.target.value } }))} placeholder="English name" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <input value={decision.name_es ?? ''} onChange={(event) => setTourDecisions((prev) => ({ ...prev, [group.groupId]: { ...prev[group.groupId], name_es: event.target.value } }))} placeholder="Spanish name" className="rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
                        <select value={decision.vendor_id ?? ''} onChange={(event) => setTourDecisions((prev) => ({ ...prev, [group.groupId]: { ...prev[group.groupId], vendor_id: event.target.value } }))} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                          <option value="">No vendor</option>
                          {tourVendors.map((vendor: any) => <option key={vendor.id} value={vendor.id}>{vendor.name}</option>)}
                        </select>
                      </div>
                    ) : null}
                    {decision.action === 'map' ? (
                      <select value={decision.productId ?? ''} onChange={(event) => setTourDecisions((prev) => ({ ...prev, [group.groupId]: { ...prev[group.groupId], productId: event.target.value } }))} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                        <option value="">Select product</option>
                        {tourProducts.map((product: any) => <option key={product.id} value={product.id}>{product.name_en}{product.vendor_name ? ` - ${product.vendor_name}` : ''}</option>)}
                      </select>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900 text-white px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-sm text-slate-200">Importing {importableRows} rows ({importableNew} new{importableExisting ? ` + ${importableExisting} updates` : ''})</p>
              <button type="button" onClick={() => void executeTourImport()} disabled={importableRows === 0} className="rounded-lg bg-indigo-500 px-4 py-2 text-xs font-semibold hover:bg-indigo-400 disabled:opacity-50">
                Confirm Import
              </button>
            </div>
          </div>
        ) : null}
        {tourStep === 'importing' ? <p className="text-sm text-slate-500">Importing tours...</p> : null}
        {tourStep === 'done' && tourImportResult ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <MetricCard label="Created" value={tourImportResult.created} tone="emerald" />
            <MetricCard label="Updated" value={tourImportResult.updated} tone="sky" />
            <MetricCard label="Skipped" value={tourImportResult.skipped} tone="slate" />
            {tourImportResult.errors?.length ? <p className="text-xs text-rose-700">{tourImportResult.errors.length} errors found. Check logs.</p> : null}
            <button type="button" onClick={resetTourModule} className="rounded-lg bg-indigo-600 text-white px-4 py-2 text-xs font-semibold hover:bg-indigo-700">
              Import Another File
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderGuestCleanupModule() {
    return (
      <div className="space-y-4">
        <SectionTitle title="Guest Normalization" subtitle="Merge duplicate guests and relink orphaned reservations.">
          <button type="button" onClick={() => void loadGuestNormalization()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
            Refresh
          </button>
        </SectionTitle>
        {guestNormLocked ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">Guest normalization is locked: no guests and no reservations.</div> : null}
        {guestNormMessage ? <div className={cx('rounded-xl border px-3 py-2 text-sm', guestNormMessage.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700')}>{guestNormMessage.text}</div> : null}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 flex items-center">
            <button type="button" onClick={() => setGuestNormTab('duplicates')} className={cx('px-4 py-3 text-sm font-medium', guestNormTab === 'duplicates' ? 'text-sky-700 border-b-2 border-sky-600' : 'text-slate-500')}>Duplicates</button>
            <button type="button" onClick={() => setGuestNormTab('orphans')} className={cx('px-4 py-3 text-sm font-medium', guestNormTab === 'orphans' ? 'text-sky-700 border-b-2 border-sky-600' : 'text-slate-500')}>Unlinked Reservations</button>
          </div>
          {guestNormLoading ? <p className="p-4 text-sm text-slate-500">Loading...</p> : null}
          {!guestNormLoading && guestNormTab === 'duplicates' ? (
            <div className="p-3 space-y-3">
              {Object.values(guestNormSelectedActions).some((item) => item !== null) ? (
                <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-xs text-sky-700">{Object.values(guestNormSelectedActions).filter((item) => item !== null).length} actions selected</p>
                  <button type="button" onClick={() => void processGuestNormSelection()} disabled={guestNormProcessing} className="rounded-md bg-sky-600 text-white px-3 py-1 text-[11px] font-semibold disabled:opacity-50">
                    {guestNormProcessing ? 'Processing...' : 'Execute'}
                  </button>
                </div>
              ) : null}
              {guestNormItems.map((cluster: any, index: number) => (
                <div key={`dup-${index}`} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                  <p className="text-sm font-semibold text-slate-900">Group {index + 1}: {cluster.name}</p>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(cluster.members ?? []).map((member: any, memberIndex: number) => {
                      const selected = guestNormSelectedActions[member.id];
                      return (
                        <div key={member.id} className={cx('rounded-md border p-2 bg-white', memberIndex === 0 && 'border-sky-300', memberIndex !== 0 && selected === 'merge' && 'border-sky-400 bg-sky-50/40', memberIndex !== 0 && selected === 'delete' && 'border-rose-400 bg-rose-50/40', memberIndex !== 0 && !selected && 'border-slate-200')}>
                          <p className="text-xs uppercase text-slate-500">{memberIndex === 0 ? 'Master' : 'Secondary'}</p>
                          <p className="text-sm font-semibold text-slate-900">{member.full_name}</p>
                          <p className="text-[11px] text-slate-500">records: {member.total_records ?? 0}</p>
                          {memberIndex > 0 ? (
                            <div className="mt-1 flex gap-1">
                              <button type="button" onClick={() => toggleGuestNormAction(member.id, 'merge')} disabled={guestNormProcessing || guestNormCurrentProcessingId === member.id} className={cx('rounded border px-1.5 py-0.5 text-[10px] font-semibold', selected === 'merge' ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white border-sky-200 text-sky-700')}>Merge</button>
                              <button type="button" onClick={() => toggleGuestNormAction(member.id, 'delete')} disabled={guestNormProcessing || guestNormCurrentProcessingId === member.id} className={cx('rounded border px-1.5 py-0.5 text-[10px] font-semibold', selected === 'delete' ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-rose-200 text-rose-700')}>Delete</button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          {!guestNormLoading && guestNormTab === 'orphans' ? (
            <div className="p-3 space-y-2">
              {guestNormItems.map((orphan: any) => (
                <div key={orphan.id} className="rounded-lg border border-slate-200 bg-slate-50/40 p-3 space-y-2">
                  <p className="text-sm font-semibold text-slate-900">{orphan.opera_guest_name}</p>
                  <p className="text-xs text-slate-500">room {orphan.room} | resv {orphan.opera_resv_id}</p>
                  <div className="flex gap-1 flex-wrap">
                    {(orphan.suggestions ?? []).map((suggestion: any) => (
                      <button key={suggestion.id} type="button" onClick={() => void handleGuestNormLink(orphan.id, suggestion.id)} className="rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] text-sky-700">
                        Link {'->'} {suggestion.full_name}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-2 space-y-1">
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400 absolute left-2 top-2" />
                      <input onInput={(event) => { const value = (event.target as HTMLInputElement).value; void searchGuests(value); }} placeholder="Search guests..." className="w-full rounded-md border border-slate-300 pl-7 pr-2 py-1 text-xs" />
                    </div>
                    <div className="max-h-28 overflow-y-auto space-y-1">
                      {guestNormSearchResults.map((guest: any) => (
                        <button key={guest.id} type="button" onClick={() => void handleGuestNormLink(orphan.id, guest.id)} className="w-full text-left rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-700 hover:bg-sky-50">
                          {guest.full_name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderVendorCleanupModule() {
    const mergeCount = vendorNormGroups.filter((group: any) => vendorNormDecisions[group.groupId]?.action === 'merge').length;
    const stepIndex: Record<VendorNormStep, number> = { generate: 0, paste: 1, review: 2, executing: 2, done: 3 };

    return (
      <div className="space-y-4">
        <SectionTitle title="Vendor Normalization" subtitle="AI-assisted duplicate detection and safe merges." />
        <p className="text-sm text-slate-500">Step {stepIndex[vendorNormStep] + 1} of 4</p>
        {vendorNormStep === 'generate' ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-3">
            <InformationCircleIcon className="h-10 w-10 text-amber-500 mx-auto" />
            <p className="text-sm text-slate-700">Generate prompt, run in LLM, paste JSON response.</p>
            {vendorNormPromptError ? <p className="text-xs text-rose-700">{vendorNormPromptError}</p> : null}
            <button type="button" onClick={() => void generateVendorNormPrompt()} disabled={vendorNormLoadingPrompt} className="rounded-lg bg-amber-500 text-white px-4 py-2 text-sm font-semibold hover:bg-amber-600 disabled:opacity-50">
              {vendorNormLoadingPrompt ? 'Loading...' : 'Generate Prompt'}
            </button>
          </div>
        ) : null}
        {vendorNormStep === 'paste' ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-800">Prompt</p>
                <button type="button" onClick={() => void copyVendorNormPrompt()} className={cx('rounded-md px-2.5 py-1 text-xs font-semibold', vendorNormCopied ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white')}>
                  {vendorNormCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <textarea value={vendorNormPrompt} readOnly rows={8} className="w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-mono text-slate-700" />
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-sm font-semibold text-slate-800">AI JSON Response</p>
              <textarea value={vendorNormPastedResponse} onChange={(event) => setVendorNormPastedResponse(event.target.value)} rows={8} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs font-mono text-slate-700" />
              {vendorNormParseError ? <p className="text-xs text-rose-700">{vendorNormParseError}</p> : null}
              <button type="button" onClick={parseVendorNormResponse} disabled={!vendorNormPastedResponse.trim()} className="rounded-lg bg-amber-500 text-white px-4 py-2 text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
                Parse and Review
              </button>
            </div>
          </div>
        ) : null}
        {vendorNormStep === 'review' ? (
          <div className="space-y-3">
            <MetricCard label="Merge Groups" value={mergeCount} tone="amber" />
            {vendorNormGroups.map((group: any) => {
              const decision = vendorNormDecisions[group.groupId] ?? { action: 'skip' };
              const isMerge = decision.action === 'merge';
              return (
                <div key={group.groupId} className={cx('rounded-xl border-2 p-3 bg-white space-y-2', isMerge ? 'border-amber-300' : 'border-slate-200')}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Group {group.groupId}</p>
                      <p className="text-xs text-slate-500">{group.reason}</p>
                    </div>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => { const suggested = (group.vendors ?? []).find((vendor: any) => vendor.isSuggestedMaster); setVendorNormDecisions((prev) => ({ ...prev, [group.groupId]: { action: 'merge', masterId: suggested?.id ?? group.vendors?.[0]?.id } })); }} className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold', isMerge ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600')}>
                        Merge
                      </button>
                      <button type="button" onClick={() => setVendorNormDecisions((prev) => ({ ...prev, [group.groupId]: { action: 'skip' } }))} className={cx('rounded-full px-2.5 py-1 text-[11px] font-semibold', !isMerge ? 'bg-slate-500 text-white' : 'bg-slate-100 text-slate-600')}>
                        Skip
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(group.vendors ?? []).map((vendor: any) => {
                      const isMaster = isMerge && decision.masterId === vendor.id;
                      return (
                        <button key={vendor.id} type="button" disabled={!isMerge} onClick={() => { if (!isMerge) return; setVendorNormDecisions((prev) => ({ ...prev, [group.groupId]: { action: 'merge', masterId: vendor.id } })); }} className={cx('text-left rounded-md border-2 p-2 transition-all', isMaster ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-slate-50')}>
                          <p className="text-sm font-semibold text-slate-900">{vendor.name}</p>
                          <p className="text-xs text-slate-500">{vendor.transfer_count} transfers | {vendor.tour_product_count} tours</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <button type="button" onClick={() => void executeVendorNorm()} disabled={mergeCount === 0} className="rounded-lg bg-amber-500 text-white px-4 py-2 text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
              Execute Merge
            </button>
          </div>
        ) : null}
        {vendorNormStep === 'executing' ? <p className="text-sm text-slate-500">Merging vendors...</p> : null}
        {vendorNormStep === 'done' && vendorNormExecuteResult ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <MetricCard label="Groups Processed" value={vendorNormExecuteResult.groupsProcessed} tone="amber" />
            <MetricCard label="Vendors Deactivated" value={vendorNormExecuteResult.vendorsDeactivated} tone="rose" />
            <MetricCard label="Transfers Updated" value={vendorNormExecuteResult.transfersUpdated} tone="sky" />
            <MetricCard label="Tour Products Updated" value={vendorNormExecuteResult.tourProductsUpdated} tone="emerald" />
            {vendorNormExecuteResult.errors?.length ? <p className="text-xs text-rose-700">{vendorNormExecuteResult.errors.length} errors found.</p> : null}
            <button type="button" onClick={resetVendorNorm} className="rounded-lg bg-amber-500 text-white px-4 py-2 text-xs font-semibold hover:bg-amber-600">
              Run Again
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  function renderPropertyConfigModule() {
    if (propConfigLoading || !propConfig) {
      return <p className="text-sm text-slate-500">Loading property config...</p>;
    }
    const s = propConfig.settings;
    const rooms: any[] = s?.rooms?.categories ?? [];
    const diningLocs: string[] = s?.dining?.locations ?? [];
    const depts: string[] = s?.departments ?? [];

    const update = (patch: any) => setPropConfig((prev: any) => ({ ...prev, ...patch }));
    const updateSettings = (patch: any) => setPropConfig((prev: any) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

    const savePropConfig = async () => {
      setPropConfigSaving(true);
      setPropConfigMsg(null);
      try {
        const res = await fetch('/api/admin/property-config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(propConfig),
        });
        const data = await res.json();
        if (res.ok) {
          setPropConfigMsg({ type: 'success', text: 'Property config saved.' });
        } else {
          setPropConfigMsg({ type: 'error', text: data.error || 'Failed to save.' });
        }
      } catch (err: unknown) {
        setPropConfigMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
      } finally {
        setPropConfigSaving(false);
      }
    };

    return (
      <div className="space-y-4">
        <SectionTitle title="Property Configuration" subtitle="Hotel identity, rooms, brand, dining locations, and departments.">
          <button type="button" onClick={() => void savePropConfig()} disabled={propConfigSaving} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {propConfigSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </SectionTitle>

        {propConfigMsg && (
          <p className={`text-sm ${propConfigMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{propConfigMsg.text}</p>
        )}

        {/* Property Info */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Property Info</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Name', key: 'name' },
              { label: 'Code', key: 'code' },
              { label: 'Timezone', key: 'timezone' },
              { label: 'Currency', key: 'currency' },
              { label: 'Location Label', key: 'locationLabel' },
            ].map(({ label, key }) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="text-sm font-medium text-slate-800">{label}</label>
                <input
                  type="text"
                  value={propConfig[key] ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => update({ [key]: e.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            {[
              { label: 'Latitude', key: 'locationLat' },
              { label: 'Longitude', key: 'locationLon' },
            ].map(({ label, key }) => (
              <div key={key} className="rounded-lg border border-slate-200 bg-white p-3">
                <label className="text-sm font-medium text-slate-800">{label}</label>
                <input
                  type="number"
                  step="0.000001"
                  value={propConfig[key] ?? ''}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => update({ [key]: parseFloat(e.target.value) || 0 })}
                  className="mt-2 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Room Categories */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">
              Room Categories <span className="text-xs font-normal text-slate-500 ml-2">Total: {rooms.reduce((a: number, r: any) => a + (r.total || 0), 0)} units (totalUnits: {s?.rooms?.totalUnits ?? '—'})</span>
            </p>
            <button
              type="button"
              onClick={() => updateSettings({ rooms: { ...s.rooms, categories: [...rooms, { name: '', code: '', total: 0 }] } })}
              className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-50"
            >+ Add</button>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b">
              <th className="text-left pb-2">Name</th><th className="text-left pb-2">Code</th><th className="text-left pb-2">Units</th><th className="pb-2"></th>
            </tr></thead>
            <tbody>
              {rooms.map((cat: any, i: number) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="py-1.5 pr-2"><input type="text" value={cat.name} onChange={(e: ChangeEvent<HTMLInputElement>) => { const next = [...rooms]; next[i] = { ...next[i], name: e.target.value }; updateSettings({ rooms: { ...s.rooms, categories: next } }); }} className="w-full rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="py-1.5 pr-2"><input type="text" value={cat.code} onChange={(e: ChangeEvent<HTMLInputElement>) => { const next = [...rooms]; next[i] = { ...next[i], code: e.target.value }; updateSettings({ rooms: { ...s.rooms, categories: next } }); }} className="w-24 rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="py-1.5 pr-2"><input type="number" min={0} value={cat.total} onChange={(e: ChangeEvent<HTMLInputElement>) => { const next = [...rooms]; next[i] = { ...next[i], total: parseInt(e.target.value) || 0 }; updateSettings({ rooms: { ...s.rooms, categories: next } }); }} className="w-20 rounded border border-slate-200 px-2 py-1 text-sm" /></td>
                  <td className="py-1.5"><button type="button" onClick={() => { const next = rooms.filter((_: any, j: number) => j !== i); updateSettings({ rooms: { ...s.rooms, categories: next } }); }} className="text-red-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-200">
            <label className="text-sm font-medium text-slate-700">Total Units (villas)</label>
            <input
              type="number"
              min={0}
              value={s?.rooms?.totalUnits ?? 0}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateSettings({ rooms: { ...s.rooms, totalUnits: parseInt(e.target.value) || 0 } })}
              className="w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <span className="text-xs text-slate-400">Used for occupancy calculations on the dashboard</span>
          </div>
        </div>

        {/* Dining Locations */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Dining Locations</p>
            <button type="button" onClick={() => updateSettings({ dining: { locations: [...diningLocs, ''] } })} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-50">+ Add</button>
          </div>
          <div className="space-y-2">
            {diningLocs.map((loc: string, i: number) => (
              <div key={i} className="flex items-center gap-2">
                <input type="text" value={loc} onChange={(e: ChangeEvent<HTMLInputElement>) => { const next = [...diningLocs]; next[i] = e.target.value; updateSettings({ dining: { locations: next } }); }} className="flex-1 rounded border border-slate-200 px-2 py-1.5 text-sm" />
                <button type="button" onClick={() => updateSettings({ dining: { locations: diningLocs.filter((_: string, j: number) => j !== i) } })} className="text-red-400 hover:text-red-600"><TrashIcon className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Departments */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Departments</p>
            <button type="button" onClick={() => updateSettings({ departments: [...depts, ''] })} className="text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg px-2 py-1 hover:bg-slate-50">+ Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {depts.map((dept: string, i: number) => (
              <div key={i} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                <input type="text" value={dept} onChange={(e: ChangeEvent<HTMLInputElement>) => { const next = [...depts]; next[i] = e.target.value; updateSettings({ departments: next }); }} className="bg-transparent text-sm outline-none w-28" />
                <button type="button" onClick={() => updateSettings({ departments: depts.filter((_: string, j: number) => j !== i) })} className="text-red-400 hover:text-red-600"><XMarkIcon className="h-3 w-3" /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Brand — Color Palette */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div>
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Color Palette</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>Changes apply instantly across the entire staff portal</p>
            </div>
            {paletteSaving && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-dim)' }}>Saving…</span>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
            {PALETTES.map(p => {
              const isActive = activePalette === p.key;
              const isDark = ['#2a2a2a','#1e2d3d','#2a2535','#2e2420'].includes(p.bg);
              return (
                <button
                  key={p.key}
                  onClick={() => handlePalettePreview(p.key)}
                  style={{
                    border: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                    borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                    background: 'transparent', padding: 0, position: 'relative',
                    boxShadow: isActive ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
                    transform: isActive ? 'translateY(-2px)' : 'none', textAlign: 'left' as const,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                >
                  <div style={{ background: p.bg, height: 48, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: p.sidebar, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 5, gap: 3 }}>
                      <div style={{ width: 5, height: 2.5, borderRadius: 2, background: p.accent, opacity: 0.7 }} />
                      <div style={{ width: 5, height: 2.5, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                    </div>
                    <div style={{ marginLeft: 16, padding: '6px 6px 0' }}>
                      <div style={{ background: p.surface, borderRadius: 3, padding: '4px 5px' }}>
                        <div style={{ width: '60%', height: 3, borderRadius: 2, background: p.accent, marginBottom: 2 }} />
                        <div style={{ width: '80%', height: 2, borderRadius: 2, background: 'rgba(0,0,0,0.10)' }} />
                      </div>
                    </div>
                    {isActive && (
                      <div style={{ position: 'absolute', top: 3, right: 3, width: 16, height: 16, borderRadius: '50%', background: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</div>
                    )}
                  </div>
                  <div style={{ background: p.surface, padding: '6px 8px 8px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? '#f0ede8' : '#1a1a1a', marginBottom: 1 }}>{p.name}</div>
                    <div style={{ fontSize: 9, color: isDark ? 'rgba(240,237,232,0.5)' : 'rgba(26,26,26,0.45)', lineHeight: 1.3 }}>{p.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
          {paletteChanged && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => handlePaletteSave()}
                disabled={paletteSaving}
                style={{ fontSize: 11, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--gold)', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: paletteSaving ? 0.6 : 1 }}
              >
                {paletteSaving ? 'Saving…' : 'Save Palette'}
              </button>
              <button
                onClick={handlePaletteRevert}
                style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--separator)', cursor: 'pointer', background: 'transparent', color: 'var(--muted-dim)' }}
              >
                Revert
              </button>
              <span style={{ fontSize: 10, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Previewing — click Save to keep</span>
            </div>
          )}
        </div>

        {/* Brand — Font Set */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div>
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Font Set</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>Switch heading, body, and mono typefaces across the portal</p>
            </div>
            {fontSetSaving && (
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--muted-dim)' }}>Saving…</span>
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {FONT_SETS.map(f => {
              const isActive = activeFontSet === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => handleFontSetPreview(f.key)}
                  style={{
                    border: isActive ? '2px solid var(--gold)' : '2px solid var(--separator)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: isActive ? 'var(--surface)' : 'transparent',
                    padding: '12px 14px',
                    textAlign: 'left' as const,
                    boxShadow: isActive ? 'var(--card-shadow-hover)' : 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
                    transform: isActive ? 'translateY(-2px)' : 'none',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 3 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted-dim)', lineHeight: 1.3 }}>{f.desc}</div>
                  {isActive && (
                    <div style={{ marginTop: 6, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--gold)' }}>
                      {f.key === savedFontSet ? 'Active' : 'Previewing'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          {fontSetChanged && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <button
                onClick={() => handleFontSetSave()}
                disabled={fontSetSaving}
                style={{ fontSize: 11, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--gold)', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: fontSetSaving ? 0.6 : 1 }}
              >
                {fontSetSaving ? 'Saving…' : 'Save Font Set'}
              </button>
              <button
                onClick={handleFontSetRevert}
                style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--separator)', cursor: 'pointer', background: 'transparent', color: 'var(--muted-dim)' }}
              >
                Revert
              </button>
              <span style={{ fontSize: 10, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Previewing — click Save to keep</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderConfigurationModule() {
    if (settingsLoading || !settings) {
      return <p className="text-sm text-slate-500">Loading settings...</p>;
    }
    return (
      <div className="space-y-4">
                {/* ── Color Palette ── */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <img src="/brand_assets/nayara-logo-round.png" alt="" className="nayara-logo-breathe" style={{ width: 32, height: 32, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-gotham), Montserrat, sans-serif', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--charcoal)' }}>Color Palette</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-dim)', marginTop: 2 }}>Changes apply instantly across the entire staff portal</div>
                    </div>
                    {paletteSaving && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img src="/brand_assets/nayara-logo-round.png" alt="" className="nayara-logo-spin" style={{ width: 16, height: 16, opacity: 0.5 }} />
                        <span style={{ fontSize: 11, color: 'var(--muted-dim)' }}>Saving…</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
                    {PALETTES.map(p => {
                      const isActive = activePalette === p.key;
                      return (
                        <button
                          key={p.key}
                          onClick={() => handlePalettePreview(p.key)}
                          style={{
                            border: isActive ? '2px solid var(--gold)' : '2px solid transparent',
                            borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                            background: 'transparent', padding: 0, position: 'relative',
                            boxShadow: isActive ? 'var(--card-shadow-hover)' : 'var(--card-shadow)',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
                            transform: isActive ? 'translateY(-2px)' : 'none', textAlign: 'left' as const,
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                        >
                          <div style={{ background: p.bg, height: 72, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 16, background: p.sidebar, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6, gap: 4 }}>
                              <img src="/brand_assets/nayara-logo-round.png" alt="" style={{ width: 10, height: 10, opacity: 0.7 }} />
                              <div style={{ width: 6, height: 3, borderRadius: 2, background: p.accent, opacity: 0.7 }} />
                              <div style={{ width: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                              <div style={{ width: 6, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.2)' }} />
                            </div>
                            <div style={{ marginLeft: 18, padding: '8px 8px 0' }}>
                              <div style={{ background: p.surface, borderRadius: 4, padding: '5px 6px' }}>
                                <div style={{ width: '60%', height: 4, borderRadius: 2, background: p.accent, marginBottom: 3 }} />
                                <div style={{ width: '85%', height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.12)', marginBottom: 2 }} />
                                <div style={{ width: '70%', height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.08)' }} />
                              </div>
                            </div>
                            {isActive && (
                              <div style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: p.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src="/brand_assets/nayara-logo-round.png" alt="" style={{ width: 14, height: 14, filter: 'brightness(3)' }} />
                              </div>
                            )}
                          </div>
                          <div style={{ background: p.surface, padding: '8px 10px 10px' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: ['#2a2a2a','#1e2d3d','#2a2535','#2e2420'].includes(p.bg) ? '#f0ede8' : '#1a1a1a', letterSpacing: '0.04em', marginBottom: 2 }}>{p.name}</div>
                            <div style={{ fontSize: 10, color: ['#2a2a2a','#1e2d3d','#2a2535','#2e2420'].includes(p.bg) ? 'rgba(240,237,232,0.5)' : 'rgba(26,26,26,0.45)', lineHeight: 1.4 }}>{p.desc}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {paletteChanged && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <button onClick={() => handlePaletteSave()} disabled={paletteSaving}
                        style={{ fontSize: 11, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--gold)', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: paletteSaving ? 0.6 : 1 }}>
                        {paletteSaving ? 'Saving…' : 'Save Palette'}
                      </button>
                      <button onClick={handlePaletteRevert}
                        style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--separator)', cursor: 'pointer', background: 'transparent', color: 'var(--muted-dim)' }}>
                        Revert
                      </button>
                      <span style={{ fontSize: 10, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Previewing — click Save to keep</span>
                    </div>
                  )}
                </div>

                {/* ── Font Set ── */}
                <div style={{ marginBottom: 32 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--fs-heading)', letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--charcoal)' }}>Font Set</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-dim)', marginTop: 2 }}>Switch the heading, body, and mono typefaces across the portal</div>
                    </div>
                    {fontSetSaving && (
                      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img src="/brand_assets/nayara-logo-round.png" alt="" className="nayara-logo-spin" style={{ width: 16, height: 16, opacity: 0.5 }} />
                        <span style={{ fontSize: 11, color: 'var(--muted-dim)' }}>Saving…</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {FONT_SETS.map(f => {
                      const isActive = activeFontSet === f.key;
                      return (
                        <button
                          key={f.key}
                          onClick={() => handleFontSetPreview(f.key)}
                          style={{
                            border: isActive ? '2px solid var(--gold)' : '2px solid var(--separator)',
                            borderRadius: 12,
                            cursor: 'pointer',
                            background: isActive ? 'var(--surface)' : 'transparent',
                            padding: '14px 16px',
                            textAlign: 'left' as const,
                            boxShadow: isActive ? 'var(--card-shadow-hover)' : 'none',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease',
                            transform: isActive ? 'translateY(-2px)' : 'none',
                          }}
                          onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                          onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.transform = 'none'; }}
                        >
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--charcoal)', marginBottom: 4 }}>{f.name}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted-dim)', lineHeight: 1.4 }}>{f.desc}</div>
                          {isActive && (
                            <div style={{ marginTop: 8, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'var(--gold)' }}>
                              {f.key === savedFontSet ? 'Active' : 'Previewing'}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {fontSetChanged && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
                      <button onClick={() => handleFontSetSave()} disabled={fontSetSaving}
                        style={{ fontSize: 11, fontWeight: 700, padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--gold)', color: '#fff', letterSpacing: '0.06em', textTransform: 'uppercase', opacity: fontSetSaving ? 0.6 : 1 }}>
                        {fontSetSaving ? 'Saving…' : 'Save Font Set'}
                      </button>
                      <button onClick={handleFontSetRevert}
                        style={{ fontSize: 11, fontWeight: 600, padding: '6px 12px', borderRadius: 8, border: '1px solid var(--separator)', cursor: 'pointer', background: 'transparent', color: 'var(--muted-dim)' }}>
                        Revert
                      </button>
                      <span style={{ fontSize: 10, color: 'var(--muted-dim)', fontStyle: 'italic' }}>Previewing — click Save to keep</span>
                    </div>
                  )}
                </div>

        <SectionTitle title="Data Curation Configuration" subtitle="Control behavior for the entire center.">
          <button type="button" onClick={() => void saveSettings()} disabled={settingsSaving} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
            {settingsSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Pipeline</p>
            <ToggleRow label="Recommend guest import before Opera" value={settings.pipeline.requireGuestImportBeforeOpera} onChange={(next) => setSettings((prev) => (prev ? { ...prev, pipeline: { ...prev.pipeline, requireGuestImportBeforeOpera: next } } : prev))} />
            <ToggleRow label="Lock transfer import without guests" value={settings.pipeline.lockTransferWithoutGuests} onChange={(next) => setSettings((prev) => (prev ? { ...prev, pipeline: { ...prev.pipeline, lockTransferWithoutGuests: next } } : prev))} />
            <ToggleRow label="Lock guest normalization without data" value={settings.pipeline.lockGuestNormalizationWithoutData} onChange={(next) => setSettings((prev) => (prev ? { ...prev, pipeline: { ...prev.pipeline, lockGuestNormalizationWithoutData: next } } : prev))} />
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <label className="text-sm font-medium text-slate-800">Vendor normalization minimum vendors</label>
              <input type="number" min={1} value={settings.pipeline.vendorNormalizationMinVendors} onChange={(event) => setSettings((prev) => (prev ? { ...prev, pipeline: { ...prev.pipeline, vendorNormalizationMinVendors: Math.max(1, Number(event.target.value) || 1) } } : prev))} className="mt-2 w-24 rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em]">Opera and Safety</p>
            <ToggleRow label="Enable manual sync button" value={settings.opera.manualSyncEnabled} onChange={(next) => setSettings((prev) => (prev ? { ...prev, opera: { ...prev.opera, manualSyncEnabled: next } } : prev))} />
            <ToggleRow label="Enable XML upload" value={settings.opera.manualXmlUploadEnabled} onChange={(next) => setSettings((prev) => (prev ? { ...prev, opera: { ...prev.opera, manualXmlUploadEnabled: next } } : prev))} />
            <ToggleRow label="Enable clear-all action" value={settings.safety.enableClearAll} onChange={(next) => setSettings((prev) => (prev ? { ...prev, safety: { ...prev.safety, enableClearAll: next } } : prev))} />
            <ToggleRow label="Allow single-table clear" value={settings.safety.allowSingleTableClear} onChange={(next) => setSettings((prev) => (prev ? { ...prev, safety: { ...prev.safety, allowSingleTableClear: next } } : prev))} />
            <ToggleRow label="Show recommendations" value={settings.ux.showRecommendations} onChange={(next) => setSettings((prev) => (prev ? { ...prev, ux: { ...prev.ux, showRecommendations: next } } : prev))} />
          </div>
        </div>
        {settingsMessage ? <p className="text-sm text-slate-600">{settingsMessage}</p> : null}
      </div>
    );
  }

  // ── Email Module helpers ──

  const fetchEmailAccounts = useCallback(async () => {
    setEmailAccountsLoading(true);
    try {
      const res = await fetch('/api/email/accounts');
      const data = await res.json();
      if (res.ok) setEmailAccounts(data.accounts ?? []);
    } catch { /* non-fatal */ }
    finally { setEmailAccountsLoading(false); }
  }, []);

  const fetchEmailAliases = useCallback(async (accountId: number) => {
    setEmailAliasesLoading(true);
    try {
      const res = await fetch(`/api/email/accounts/${accountId}/aliases`);
      const data = await res.json();
      if (res.ok) setEmailAliases(data.aliases ?? []);
    } catch { /* non-fatal */ }
    finally { setEmailAliasesLoading(false); }
  }, []);

  const handleCreateEmailAccount = useCallback(async () => {
    if (!emailNewAccount.display_name.trim()) return;
    setEmailConnecting(true);
    setEmailMessage(null);
    try {
      const res = await fetch('/api/email/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailNewAccount),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailMessage({ type: 'success', text: 'Account created. Now connect it with Google.' });
        setEmailNewAccount({ display_name: '', department: '', email_address: '' });
        setEmailShowAddForm(false);
        await fetchEmailAccounts();
      } else {
        setEmailMessage({ type: 'error', text: data.error || 'Failed to create account.' });
      }
    } catch (err: unknown) {
      setEmailMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setEmailConnecting(false);
    }
  }, [emailNewAccount, fetchEmailAccounts]);

  const handleConnectGoogle = useCallback(async (accountId: number) => {
    setEmailConnecting(true);
    setEmailMessage(null);
    try {
      const res = await fetch('/api/email/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });
      const data = await res.json();
      if (res.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setEmailMessage({ type: 'error', text: data.error || 'Failed to start authorization.' });
      }
    } catch (err: unknown) {
      setEmailMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    } finally {
      setEmailConnecting(false);
    }
  }, []);

  const handleDeleteEmailAccount = useCallback(async (accountId: number) => {
    if (!confirm('Disconnect and delete this email account? All synced emails for this account will be removed.')) return;
    try {
      const res = await fetch(`/api/email/accounts/${accountId}`, { method: 'DELETE' });
      if (res.ok) {
        setEmailMessage({ type: 'success', text: 'Account disconnected.' });
        if (emailSelectedAccount?.id === accountId) setEmailSelectedAccount(null);
        await fetchEmailAccounts();
      } else {
        const data = await res.json();
        setEmailMessage({ type: 'error', text: data.error || 'Failed to delete account.' });
      }
    } catch (err: unknown) {
      setEmailMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    }
  }, [emailSelectedAccount, fetchEmailAccounts]);

  const handleCreateAlias = useCallback(async () => {
    if (!emailSelectedAccount || !emailNewAlias.alias_address.trim()) return;
    try {
      const res = await fetch(`/api/email/accounts/${emailSelectedAccount.id}/aliases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailNewAlias),
      });
      const data = await res.json();
      if (res.ok) {
        setEmailNewAlias({ alias_address: '', display_name: '' });
        setEmailShowAddAlias(false);
        await fetchEmailAliases(emailSelectedAccount.id);
      } else {
        setEmailMessage({ type: 'error', text: data.error || 'Failed to create alias.' });
      }
    } catch (err: unknown) {
      setEmailMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed' });
    }
  }, [emailSelectedAccount, emailNewAlias, fetchEmailAliases]);

  const handleDeleteAlias = useCallback(async (aliasId: number) => {
    if (!emailSelectedAccount) return;
    if (!confirm('Delete this alias mapping?')) return;
    try {
      const res = await fetch(`/api/email/aliases/${aliasId}`, { method: 'DELETE' });
      if (res.ok) await fetchEmailAliases(emailSelectedAccount.id);
    } catch { /* non-fatal */ }
  }, [emailSelectedAccount, fetchEmailAliases]);

  // Load email accounts when tab is opened
  useEffect(() => {
    if (activeModule === 'email') void fetchEmailAccounts();
  }, [activeModule, fetchEmailAccounts]);

  // Load aliases when a specific account is selected
  useEffect(() => {
    if (emailSelectedAccount) void fetchEmailAliases(emailSelectedAccount.id);
  }, [emailSelectedAccount, fetchEmailAliases]);

  // Check for OAuth callback messages in URL
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const successMsg = params.get('emailSuccess');
    const errorMsg = params.get('emailError');
    if (successMsg) {
      setEmailMessage({ type: 'success', text: successMsg });
      setActiveModule('email');
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorMsg) {
      setEmailMessage({ type: 'error', text: errorMsg });
      setActiveModule('email');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  function renderEmailModule() {
    const statusColors: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-700 border-emerald-300',
      disconnected: 'bg-slate-100 text-slate-600 border-slate-300',
      error: 'bg-rose-100 text-rose-700 border-rose-300',
      paused: 'bg-amber-100 text-amber-700 border-amber-300',
    };

    return (
      <div className="space-y-5">
        <SectionTitle title="Email Accounts" subtitle="Connect departmental Google Workspace accounts to manage email within NBDT.">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEmailShowGoogleSetup(true)}
              className="rounded-lg border border-sky-300 bg-sky-50 text-sky-700 px-3 py-2 text-sm font-medium hover:bg-sky-100 flex items-center gap-2"
            >
              <InformationCircleIcon className="h-4 w-4" />
              Google Setup Guide
            </button>
            <button
              type="button"
              onClick={() => { setEmailShowAddForm(true); setEmailMessage(null); }}
              className="rounded-lg bg-slate-900 text-white px-3 py-2 text-sm font-semibold hover:bg-slate-800 flex items-center gap-2"
            >
              <EnvelopeIcon className="h-4 w-4" />
              + Connect Account
            </button>
          </div>
        </SectionTitle>

        {/* Flash message */}
        {emailMessage ? (
          <div className={cx(
            'rounded-lg border px-4 py-3 text-sm flex items-center justify-between',
            emailMessage.type === 'success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800'
          )}>
            <span>{emailMessage.text}</span>
            <button type="button" onClick={() => setEmailMessage(null)} className="ml-2 text-current opacity-60 hover:opacity-100"><XMarkIcon className="h-4 w-4" /></button>
          </div>
        ) : null}

        {/* Google Setup Instructions Modal */}
        {emailShowGoogleSetup ? (
          <div className="rounded-2xl border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Google Workspace Setup Instructions</h3>
                <p className="text-sm text-slate-500 mt-1">Follow these steps to prepare your Google Cloud project for email integration.</p>
              </div>
              <button type="button" onClick={() => setEmailShowGoogleSetup(false)} className="rounded-lg border border-slate-300 bg-white p-1.5 hover:bg-slate-50"><XMarkIcon className="h-4 w-4 text-slate-600" /></button>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">1</span>
                  Create a Google Cloud Project
                </h4>
                <ol className="mt-2 ml-8 text-sm text-slate-600 list-decimal space-y-1">
                  <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 underline hover:text-sky-800">Google Cloud Console</a></li>
                  <li>Create a new project (or select existing) — e.g., <code className="bg-slate-100 px-1 rounded text-xs">nbdt-email</code></li>
                </ol>
              </div>

              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">2</span>
                  Enable Required APIs
                </h4>
                <ol className="mt-2 ml-8 text-sm text-slate-600 list-decimal space-y-1">
                  <li>In the Cloud Console, go to <strong>APIs &amp; Services &gt; Library</strong></li>
                  <li>Search for and enable <strong>Gmail API</strong></li>
                  <li>Search for and enable <strong>Google Cloud Pub/Sub API</strong> (for real-time notifications)</li>
                </ol>
              </div>

              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">3</span>
                  Create OAuth 2.0 Credentials
                </h4>
                <ol className="mt-2 ml-8 text-sm text-slate-600 list-decimal space-y-1">
                  <li>Go to <strong>APIs &amp; Services &gt; Credentials</strong></li>
                  <li>Click <strong>+ Create Credentials &gt; OAuth client ID</strong></li>
                  <li>Application type: <strong>Web application</strong></li>
                  <li>Add Authorized redirect URI: <code className="bg-slate-100 px-1 rounded text-xs break-all">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/email/oauth/callback</code></li>
                  <li>Copy the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
                </ol>
              </div>

              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">4</span>
                  Configure OAuth Consent Screen
                </h4>
                <ol className="mt-2 ml-8 text-sm text-slate-600 list-decimal space-y-1">
                  <li>Go to <strong>APIs &amp; Services &gt; OAuth consent screen</strong></li>
                  <li>User type: <strong>Internal</strong> (if all accounts are in your Workspace)</li>
                  <li>Add scopes: <code className="bg-slate-100 px-1 rounded text-xs">gmail.modify</code> and <code className="bg-slate-100 px-1 rounded text-xs">gmail.send</code></li>
                </ol>
              </div>

              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">5</span>
                  Set Up Pub/Sub (for real-time push)
                </h4>
                <ol className="mt-2 ml-8 text-sm text-slate-600 list-decimal space-y-1">
                  <li>In Cloud Console, go to <strong>Pub/Sub &gt; Topics</strong></li>
                  <li>Create topic: <code className="bg-slate-100 px-1 rounded text-xs">gmail-notifications</code></li>
                  <li>Go to topic Permissions, add principal: <code className="bg-slate-100 px-1 rounded text-xs">gmail-api-push@system.gserviceaccount.com</code></li>
                  <li>Assign role: <strong>Pub/Sub Publisher</strong></li>
                  <li>Create a <strong>Push subscription</strong> with endpoint: <code className="bg-slate-100 px-1 rounded text-xs break-all">{typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/email/webhook</code></li>
                </ol>
              </div>

              <div className="rounded-xl border border-sky-200 bg-white p-4">
                <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-sky-700 text-xs font-bold">6</span>
                  Add Environment Variables
                </h4>
                <div className="mt-2 ml-8 text-sm text-slate-600 space-y-1">
                  <p>Set these in your Railway (or hosting) environment:</p>
                  <pre className="bg-slate-900 text-green-400 rounded-lg p-3 mt-2 text-xs overflow-x-auto">{`GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
GOOGLE_REDIRECT_URI=${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/email/oauth/callback
EMAIL_ENCRYPTION_KEY=<32-byte-hex-key>
PUBSUB_TOPIC=projects/your-project/topics/gmail-notifications`}</pre>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <h4 className="font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircleIcon className="h-5 w-5" />
                  Ready to Connect
                </h4>
                <p className="mt-1 text-sm text-emerald-700">Once the above steps are complete and environment variables are set, click <strong>&quot;+ Connect Account&quot;</strong> above to link a departmental Gmail account.</p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Add Account Form */}
        {emailShowAddForm ? (
          <div className="rounded-xl border border-slate-300 bg-white p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">New Email Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Display Name *</label>
                <input type="text" placeholder="e.g. Cocina" value={emailNewAccount.display_name} onChange={(e) => setEmailNewAccount(prev => ({ ...prev, display_name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Department</label>
                <input type="text" placeholder="e.g. Kitchen" value={emailNewAccount.department} onChange={(e) => setEmailNewAccount(prev => ({ ...prev, department: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-1">Email Address</label>
                <input type="email" placeholder="e.g. cocina@hotel.com" value={emailNewAccount.email_address} onChange={(e) => setEmailNewAccount(prev => ({ ...prev, email_address: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleCreateEmailAccount} disabled={emailConnecting || !emailNewAccount.display_name.trim()} className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800 disabled:opacity-50">
                {emailConnecting ? 'Creating...' : 'Create Account'}
              </button>
              <button type="button" onClick={() => setEmailShowAddForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        ) : null}

        {/* Account List */}
        {emailAccountsLoading ? (
          <p className="text-sm text-slate-500">Loading email accounts...</p>
        ) : emailAccounts.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-3">
            <EnvelopeIcon className="h-12 w-12 mx-auto text-slate-300" />
            <p className="text-slate-500 text-sm">No email accounts connected yet.</p>
            <p className="text-slate-400 text-xs">Click &quot;Google Setup Guide&quot; above to get started, then connect your first account.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {emailAccounts.map((account: any) => (
              <div key={account.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-slate-100 p-2">
                      <EnvelopeIcon className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{account.email_address?.includes('pending-') ? account.display_name : account.email_address}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-500">{account.display_name}</span>
                        {account.department ? <span className="text-xs text-slate-400">| {account.department}</span> : null}
                        <span className={cx('text-[10px] font-medium px-2 py-0.5 rounded-full border', statusColors[account.sync_status] || statusColors.disconnected)}>
                          {account.sync_status}
                        </span>
                      </div>
                      {account.sync_error ? <p className="text-xs text-rose-600 mt-1">{account.sync_error}</p> : null}
                      {account.last_sync_at ? <p className="text-xs text-slate-400 mt-1">Last sync: {new Date(account.last_sync_at).toLocaleString()}</p> : null}
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{account.alias_count ?? 0} aliases</span>
                        <span>{account.thread_count ?? 0} threads</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {account.sync_status === 'disconnected' || account.sync_status === 'error' ? (
                      <button type="button" onClick={() => handleConnectGoogle(account.id)} disabled={emailConnecting} className="rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50">
                        {account.sync_status === 'error' ? 'Re-authorize' : 'Connect Google'}
                      </button>
                    ) : null}
                    <button type="button" onClick={() => { setEmailSelectedAccount(emailSelectedAccount?.id === account.id ? null : account); }} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50">
                      {emailSelectedAccount?.id === account.id ? 'Close' : 'Manage Aliases'}
                    </button>
                    <button type="button" onClick={() => handleDeleteEmailAccount(account.id)} className="rounded-lg border border-rose-200 text-rose-600 p-1.5 hover:bg-rose-50">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Alias Management Panel */}
                {emailSelectedAccount?.id === account.id ? (
                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-800">Aliases for {account.display_name}</h4>
                      <button type="button" onClick={() => setEmailShowAddAlias(!emailShowAddAlias)} className="text-xs text-sky-600 hover:text-sky-800 font-medium">
                        {emailShowAddAlias ? 'Cancel' : '+ Add Alias'}
                      </button>
                    </div>

                    {emailShowAddAlias ? (
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-slate-600 block mb-1">Alias Address</label>
                          <input type="email" placeholder="chef-juan@hotel.com" value={emailNewAlias.alias_address} onChange={(e) => setEmailNewAlias(prev => ({ ...prev, alias_address: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-medium text-slate-600 block mb-1">Display Name</label>
                          <input type="text" placeholder="Chef Juan" value={emailNewAlias.display_name} onChange={(e) => setEmailNewAlias(prev => ({ ...prev, display_name: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none" />
                        </div>
                        <button type="button" onClick={handleCreateAlias} disabled={!emailNewAlias.alias_address.trim()} className="rounded-lg bg-slate-900 text-white px-3 py-1.5 text-sm font-medium hover:bg-slate-800 disabled:opacity-50">Add</button>
                      </div>
                    ) : null}

                    {emailAliasesLoading ? (
                      <p className="text-xs text-slate-500">Loading aliases...</p>
                    ) : emailAliases.length === 0 ? (
                      <p className="text-xs text-slate-400">No aliases configured. Add aliases to route emails to individual staff members.</p>
                    ) : (
                      <div className="overflow-hidden rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50">
                            <tr>
                              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Alias Address</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Display Name</th>
                              <th className="text-left px-3 py-2 text-xs font-medium text-slate-500">Assigned To</th>
                              <th className="px-3 py-2 text-xs font-medium text-slate-500 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {emailAliases.map((alias: any) => (
                              <tr key={alias.id} className="hover:bg-slate-50">
                                <td className="px-3 py-2 text-slate-800 font-mono text-xs">{alias.alias_address}</td>
                                <td className="px-3 py-2 text-slate-600">{alias.display_name || '—'}</td>
                                <td className="px-3 py-2 text-slate-600">{alias.assigned_user_name || <span className="text-slate-400 italic">Unassigned</span>}</td>
                                <td className="px-3 py-2">
                                  <button type="button" onClick={() => handleDeleteAlias(alias.id)} className="text-rose-400 hover:text-rose-600"><TrashIcon className="h-3.5 w-3.5" /></button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <InformationCircleIcon className="h-4 w-4 text-amber-500 flex-shrink-0" />
                      <p className="text-xs text-slate-500">Remember to also create these aliases in your <a href="https://admin.google.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 underline hover:text-sky-800">Google Workspace Admin Console</a>.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  function renderActiveModule() {
    if (loadingDb && activeModule === 'hub') {
      return <p className="text-sm text-slate-500">Loading pipeline stats...</p>;
    }
    switch (activeModule) {
      case 'hub':
        return renderHubModule();
      case 'guestImport':
        return renderGuestImportModule();
      case 'opera':
        return renderOperaModule();
      case 'vendorImport':
        return renderVendorImportModule();
      case 'appsheetImport':
        return (
          <div className="space-y-4">
            <SectionTitle title="AppSheet Legacy Import" subtitle="Directly ingest CSV exports from legacy AppSheet tables." />
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center space-y-4">
              <CloudArrowUpIcon className="h-12 w-12 mx-auto text-slate-400" />
              <p className="text-slate-600 max-w-md mx-auto">Use the specialized AppSheet Import tool to migrate data from your legacy spreadsheets with column mapping and validation.</p>
              <button 
                type="button" 
                onClick={() => window.location.href = `/${window.location.pathname.split('/')[1]}/staff/appsheet-import`}
                className="rounded-lg bg-slate-900 text-white px-6 py-2.5 text-sm font-semibold hover:bg-slate-800"
              >
                Open AppSheet Importer
              </button>
            </div>
          </div>
        );
      case 'transferImport':
        return renderTransferModule();
      case 'tourImport':
        return renderTourModule();
      case 'guestCleanup':
        return renderGuestCleanupModule();
      case 'vendorCleanup':
        return renderVendorCleanupModule();
      case 'email':
        return renderEmailModule();
      case 'configuration':
        return renderConfigurationModule();
      case 'propertyConfig':
        return renderPropertyConfigModule();
      default:
        return null;
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="nayara-card p-6 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="nayara-label">Operations Console</p>
              <h1 className="text-3xl font-bold italic mt-1" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>Data Curation Center</h1>
              <p className="text-sm mt-2 max-w-3xl" style={{ color: 'var(--muted-dim)' }}>Single-page command center for imports, sync, normalization, and safety tools.</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => { setActiveModule('configuration'); setSettingsMessage(null); }} className="nayara-btn nayara-btn-secondary flex items-center gap-2">
                <Cog6ToothIcon className="h-4 w-4" />
                Settings
              </button>
              <button type="button" onClick={() => void refreshCountsAndLogs()} className="nayara-btn nayara-btn-primary flex items-center gap-2">
                <ArrowPathIcon className="h-4 w-4" />
                Refresh
              </button>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 md:grid-cols-5 gap-2">
            <MetricCard label="Guests" value={getCount('guests')} tone="emerald" />
            <MetricCard label="Reservations" value={getCount('reservations')} tone="sky" />
            <MetricCard label="Vendors" value={getCount('vendors')} tone="amber" />
            <MetricCard label="Transfers" value={getCount('transfers')} tone="slate" />
            <MetricCard label="Total Rows" value={totalRecords.toLocaleString()} tone="rose" />
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-5">
          <aside className="xl:sticky xl:top-4 xl:self-start space-y-2">
            {moduleMeta.map((module) => {
              const Icon = module.icon;
              const active = activeModule === module.key;
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => setActiveModule(module.key)}
                  className="w-full text-left rounded-xl px-3 py-3 transition-colors"
                  style={active
                    ? { background: 'var(--sidebar-bg)', color: '#fff', border: '1px solid var(--sidebar-bg)' }
                    : { background: 'var(--surface)', color: 'var(--charcoal)', border: '1px solid var(--separator)' }
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div
                        className="rounded-lg p-1.5"
                        style={{ background: active ? 'rgba(255,255,255,0.15)' : 'var(--elevated)' }}
                      >
                        <Icon className="h-4 w-4" style={{ color: active ? '#fff' : 'var(--muted-dim)' }} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{module.label}</p>
                        <p className="text-[11px] mt-0.5" style={{ opacity: 0.7 }}>{module.note}</p>
                      </div>
                    </div>
                    {module.locked ? <LockClosedIcon className="h-4 w-4" style={{ color: active ? 'rgba(255,255,255,0.8)' : 'var(--terra)' }} /> : null}
                  </div>
                </button>
              );
            })}
          </aside>
          <section className="nayara-card p-5">{renderActiveModule()}</section>
        </div>
      </div>
    </div>
  );
}
