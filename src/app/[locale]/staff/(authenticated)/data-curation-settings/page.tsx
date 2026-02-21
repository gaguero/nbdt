'use client';

import { useEffect, useState } from 'react';
import { DataCurationNav } from '@/components/staff/DataCurationNav';

type Settings = {
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

function Toggle({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg" style={{ border: '1px solid var(--separator)' }}>
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--charcoal)' }}>{label}</p>
        {hint ? <p className="text-xs mt-0.5" style={{ color: 'var(--muted-dim)' }}>{hint}</p> : null}
      </div>
      <button
        onClick={() => onChange(!value)}
        className="w-12 h-7 rounded-full relative"
        style={{
          background: value ? 'var(--gold)' : 'var(--separator)',
          transition: 'background 0.2s ease',
          flexShrink: 0,
        }}
        type="button"
      >
        <span
          className="absolute top-1 w-5 h-5 rounded-full bg-white"
          style={{
            transform: value ? 'translateX(24px)' : 'translateX(4px)',
            left: 0,
            transition: 'transform 0.2s ease',
          }}
        />
      </button>
    </div>
  );
}

export default function DataCurationSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/data-curation-settings');
        const data = await res.json();
        if (res.ok) setSettings(data.settings);
        else setMessage(data.error || 'Failed to load settings');
      } catch (err: any) {
        setMessage(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const update = <K extends keyof Settings>(section: K, patch: Partial<Settings[K]>) => {
    setSettings((prev) => (prev ? { ...prev, [section]: { ...prev[section], ...patch } } : prev));
  };

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/data-curation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Failed to save settings');
        return;
      }
      setSettings(data.settings);
      setMessage('Settings saved successfully.');
    } catch (err: any) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <DataCurationNav />
        <p className="text-sm" style={{ color: 'var(--muted-dim)' }}>Loading Data Curation settings...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <DataCurationNav />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif", color: 'var(--charcoal)' }}>Data Curation Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-dim)' }}>
            Central configuration for imports, sync behavior, safety controls, and UI behavior.
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="nayara-btn nayara-btn-primary disabled:opacity-50"
          type="button"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <section className="nayara-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--charcoal)' }}>Pipeline Rules</h2>
        <Toggle
          label="Require guest import before Opera sync recommendation"
          value={settings.pipeline.requireGuestImportBeforeOpera}
          onChange={(v) => update('pipeline', { requireGuestImportBeforeOpera: v })}
        />
        <Toggle
          label="Lock transfer step when guests are missing"
          value={settings.pipeline.lockTransferWithoutGuests}
          onChange={(v) => update('pipeline', { lockTransferWithoutGuests: v })}
        />
        <Toggle
          label="Lock guest normalization when both guests and reservations are empty"
          value={settings.pipeline.lockGuestNormalizationWithoutData}
          onChange={(v) => update('pipeline', { lockGuestNormalizationWithoutData: v })}
        />
        <div className="p-3 rounded-lg" style={{ border: '1px solid var(--separator)' }}>
          <label className="nayara-label">Minimum vendors for vendor-normalization unlock</label>
          <input
            type="number"
            min={1}
            value={settings.pipeline.vendorNormalizationMinVendors}
            onChange={(e) => update('pipeline', { vendorNormalizationMinVendors: Math.max(1, Number(e.target.value) || 1) })}
            className="nayara-input mt-2 w-28"
          />
        </div>
      </section>

      <section className="nayara-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--charcoal)' }}>Opera Sync</h2>
        <Toggle
          label="Enable manual Opera sync trigger"
          value={settings.opera.manualSyncEnabled}
          onChange={(v) => update('opera', { manualSyncEnabled: v })}
        />
        <Toggle
          label="Enable manual XML upload"
          value={settings.opera.manualXmlUploadEnabled}
          onChange={(v) => update('opera', { manualXmlUploadEnabled: v })}
        />
        <Toggle
          label="Enable automated Opera sync"
          value={settings.opera.autoSyncEnabled}
          onChange={(v) => update('opera', { autoSyncEnabled: v })}
        />
        <div className="p-3 rounded-lg" style={{ border: '1px solid var(--separator)' }}>
          <label className="nayara-label">Sync log retention (days)</label>
          <input
            type="number"
            min={1}
            value={settings.opera.logRetentionDays}
            onChange={(e) => update('opera', { logRetentionDays: Math.max(1, Number(e.target.value) || 1) })}
            className="nayara-input mt-2 w-28"
          />
        </div>
      </section>

      <section className="nayara-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--charcoal)' }}>Import Defaults</h2>
        <Toggle
          label="Preserve legacy IDs during imports"
          value={settings.imports.preserveLegacyIds}
          onChange={(v) => update('imports', { preserveLegacyIds: v })}
        />
        <Toggle
          label="Allow auto-create guests from Opera data when missing"
          value={settings.imports.allowAutoCreateGuestsFromOpera}
          onChange={(v) => update('imports', { allowAutoCreateGuestsFromOpera: v })}
        />
        <Toggle
          label="Allow auto-create vendors from transfer/tour imports"
          value={settings.imports.allowAutoCreateVendorsFromTransfers}
          onChange={(v) => update('imports', { allowAutoCreateVendorsFromTransfers: v })}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-lg" style={{ border: '1px solid var(--separator)' }}>
            <label className="nayara-label">Default vendor type</label>
            <select
              value={settings.imports.defaultVendorType}
              onChange={(e) => update('imports', { defaultVendorType: e.target.value })}
              className="nayara-input mt-2 w-full"
            >
              <option value="transfer">transfer</option>
              <option value="tour">tour</option>
              <option value="spa">spa</option>
              <option value="restaurant">restaurant</option>
              <option value="other">other</option>
            </select>
          </div>
          <div className="p-3 rounded-lg" style={{ border: '1px solid var(--separator)' }}>
            <label className="nayara-label">Default vendor color</label>
            <input
              value={settings.imports.defaultVendorColor}
              onChange={(e) => update('imports', { defaultVendorColor: e.target.value })}
              className="nayara-input mt-2 w-full font-mono"
            />
          </div>
        </div>
      </section>

      <section className="nayara-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--charcoal)' }}>Safety</h2>
        <Toggle
          label="Show database reset section"
          value={settings.safety.enableDatabaseResetSection}
          onChange={(v) => update('safety', { enableDatabaseResetSection: v })}
        />
        <Toggle
          label="Allow clear-all operation"
          value={settings.safety.enableClearAll}
          onChange={(v) => update('safety', { enableClearAll: v })}
        />
        <Toggle
          label="Require double confirmation for clear-all"
          value={settings.safety.requireDoubleConfirmationForClearAll}
          onChange={(v) => update('safety', { requireDoubleConfirmationForClearAll: v })}
        />
        <Toggle
          label="Allow clearing individual tables"
          value={settings.safety.allowSingleTableClear}
          onChange={(v) => update('safety', { allowSingleTableClear: v })}
        />
      </section>

      <section className="nayara-card p-4 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--charcoal)' }}>UI Behavior</h2>
        <Toggle
          label="Show system info section"
          value={settings.ux.showSystemInfoSection}
          onChange={(v) => update('ux', { showSystemInfoSection: v })}
        />
        <Toggle
          label="Show messaging channels section"
          value={settings.ux.showMessagingChannelsSection}
          onChange={(v) => update('ux', { showMessagingChannelsSection: v })}
        />
        <Toggle
          label="Show last-run indicator on Opera step"
          value={settings.ux.showLastRunOnOperaStep}
          onChange={(v) => update('ux', { showLastRunOnOperaStep: v })}
        />
        <Toggle
          label="Show dependency recommendations"
          value={settings.ux.showRecommendations}
          onChange={(v) => update('ux', { showRecommendations: v })}
        />
      </section>

      {message ? (
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{message}</p>
      ) : null}
    </div>
  );
}
