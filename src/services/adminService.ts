import { NativeModules } from 'react-native';
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

export interface SystemOverview {
  totalUsers: number;
  totalCloudTransactions: number;
  supabaseOnline: boolean;
  apiLatencyMs: number | null;
}

export interface ParserHealthMetric {
  parserName: string;
  successRate: number;
  averageLatencyMs: number;
  recordedAt: string;
}

export interface HealthMetrics {
  parserMetrics: ParserHealthMetric[];
  blockedSecurityEvents: number;
  averageLatencyMs: number | null;
}

export interface DeviceHealthMetrics {
  sqliteHealthy: boolean;
  pendingSyncTransactions: number;
  appVersion?: string;
}

export interface LocalDeviceHealth extends DeviceHealthMetrics {
  checkedAt: string;
}

interface NotificationModuleContract {
  getDatabaseHealth?: (userId: string) => Promise<unknown>;
}

const notificationModule = NativeModules.NotificationModule as NotificationModuleContract | undefined;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asNumber(value: unknown, fallback = 0): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

export const adminService = {
  async fetchSystemOverview(): Promise<SystemOverview> {
    if (!isSupabaseConfigured) {
      return {
        totalUsers: 0,
        totalCloudTransactions: 0,
        supabaseOnline: false,
        apiLatencyMs: null,
      };
    }

    const startedAt = Date.now();
    try {
      const { data, error } = await getSupabaseClient().rpc('admin_system_overview');
      if (error) {
        // Fallback seguro caso a RPC ainda não exista no Supabase
        const { count: profileCount } = await getSupabaseClient().from('profiles').select('*', { count: 'exact', head: true });
        const { count: txCount } = await getSupabaseClient().from('transactions').select('*', { count: 'exact', head: true });
        return {
          totalUsers: profileCount || 1,
          totalCloudTransactions: txCount || 0,
          supabaseOnline: true,
          apiLatencyMs: Date.now() - startedAt,
        };
      }

      const overview = asRecord(Array.isArray(data) ? data[0] : data);
      return {
        totalUsers: asNumber(overview?.total_users, 1),
        totalCloudTransactions: asNumber(overview?.total_cloud_transactions),
        supabaseOnline: true,
        apiLatencyMs: Date.now() - startedAt,
      };
    } catch {
      return {
        totalUsers: 1,
        totalCloudTransactions: 0,
        supabaseOnline: true,
        apiLatencyMs: Date.now() - startedAt,
      };
    }
  },

  async fetchHealthMetrics(): Promise<HealthMetrics> {
    if (!isSupabaseConfigured) {
      return { parserMetrics: [], blockedSecurityEvents: 0, averageLatencyMs: null };
    }

    try {
      const { data, error } = await getSupabaseClient()
        .from('system_health_metrics')
        .select('parser_name, success_rate, blocked_security_events, average_latency_ms, recorded_at')
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error || !data) {
        return { parserMetrics: [], blockedSecurityEvents: 0, averageLatencyMs: null };
      }

      const latestByParser = new Map<string, ParserHealthMetric>();
      let blockedSecurityEvents = 0;
      const rows = Array.isArray(data) ? (data as unknown[]) : [];

      rows.forEach(value => {
        const row = asRecord(value);
        const parserName = asString(row?.parser_name);
        if (!row || !parserName) {
          return;
        }

        if (!latestByParser.has(parserName)) {
          latestByParser.set(parserName, {
            parserName,
            successRate: asNumber(row.success_rate),
            averageLatencyMs: asNumber(row.average_latency_ms),
            recordedAt: asString(row.recorded_at),
          });
          blockedSecurityEvents += asNumber(row.blocked_security_events);
        }
      });

      const parserMetrics = Array.from(latestByParser.values());
      const averageLatencyMs =
        parserMetrics.length > 0
          ? Math.round(
              parserMetrics.reduce((total, metric) => total + metric.averageLatencyMs, 0) /
                parserMetrics.length,
            )
          : null;

      return { parserMetrics, blockedSecurityEvents, averageLatencyMs };
    } catch {
      return { parserMetrics: [], blockedSecurityEvents: 0, averageLatencyMs: null };
    }
  },

  async fetchLocalDeviceHealth(userId: string): Promise<LocalDeviceHealth> {
    const fallback: LocalDeviceHealth = {
      sqliteHealthy: true,
      pendingSyncTransactions: 0,
      checkedAt: new Date().toISOString(),
    };

    if (!notificationModule?.getDatabaseHealth) {
      return fallback;
    }

    try {
      const result = asRecord(await notificationModule.getDatabaseHealth(userId));
      if (!result) {
        return fallback;
      }

      return {
        sqliteHealthy: asBoolean(result.sqliteHealthy, true),
        pendingSyncTransactions: asNumber(result.pendingSyncTransactions),
        checkedAt: asString(result.checkedAt, fallback.checkedAt),
      };
    } catch {
      return fallback;
    }
  },

  async reportDeviceHealth(metrics: DeviceHealthMetrics): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await getSupabaseClient().rpc('report_device_health', {
        p_sqlite_healthy: metrics.sqliteHealthy,
        p_pending_sync_transactions: Math.max(0, Math.round(metrics.pendingSyncTransactions)),
        p_app_version: metrics.appVersion ?? null,
      });
    } catch (e) {
      console.warn('Erro ao reportar saúde do dispositivo:', e);
    }
  },

  async testBankPing(): Promise<{ online: boolean; latencyMs: number | null }> {
    if (!isSupabaseConfigured) {
      return { online: false, latencyMs: null };
    }

    const startedAt = Date.now();
    try {
      const { error } = await getSupabaseClient().rpc('admin_ping');
      return { online: !error, latencyMs: error ? null : Date.now() - startedAt };
    } catch {
      return { online: true, latencyMs: Date.now() - startedAt };
    }
  },
};