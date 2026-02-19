import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';

const SETTINGS_KEY = 'default';

const DEFAULT_SETTINGS = {
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

async function ensureTable() {
  await query(
    `CREATE TABLE IF NOT EXISTS data_curation_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`
  );
}

function mergeWithDefaults(input: any) {
  return {
    pipeline: {
      ...DEFAULT_SETTINGS.pipeline,
      ...(input?.pipeline || {}),
    },
    opera: {
      ...DEFAULT_SETTINGS.opera,
      ...(input?.opera || {}),
    },
    imports: {
      ...DEFAULT_SETTINGS.imports,
      ...(input?.imports || {}),
    },
    safety: {
      ...DEFAULT_SETTINGS.safety,
      ...(input?.safety || {}),
    },
    ux: {
      ...DEFAULT_SETTINGS.ux,
      ...(input?.ux || {}),
    },
  };
}

function isAuthorized(request: NextRequest): boolean {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    const user = verifyToken(token);
    return ['admin', 'manager'].includes(user.role);
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await ensureTable();

    const row = await queryOne<{ value: any }>(
      `SELECT value FROM data_curation_settings WHERE key = $1`,
      [SETTINGS_KEY]
    );

    const settings = mergeWithDefaults(row?.value);
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settings = mergeWithDefaults(body?.settings);

    await ensureTable();
    await query(
      `INSERT INTO data_curation_settings (key, value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (key)
       DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [SETTINGS_KEY, JSON.stringify(settings)]
    );

    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
