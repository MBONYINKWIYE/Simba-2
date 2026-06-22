import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { DollarSign, Receipt, ShoppingBag, TrendingUp } from 'lucide-react';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { formatCurrency } from '@/lib/utils';
import type { AnalyticsDayData, AnalyticsProductData, AnalyticsStatusData } from '@/types';

function SummaryCard({ label, value, hint, icon: Icon }: { label: string; value: number | string; hint?: string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-xl font-bold">{value}</p>
          {hint ? <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-300">
          <Icon size={18} />
        </div>
      </div>
    </div>
  );
}

function PeriodCard({ label, revenue, orders }: { label: string; revenue: number; orders: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-lg font-bold">{formatCurrency(revenue)}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{orders} orders</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/60">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function RevenueLineChart({ data }: { data: AnalyticsDayData[] }) {
  const { i18n } = useTranslation();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{i18n.t('analyticsNoData')}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 10 }}
          tickFormatter={(value: any) => {
            const d = new Date(value);
            return d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });
          }}
          stroke="rgb(148 163 184 / 0.5)"
        />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(value: any) => `${(Number(value) / 1000).toFixed(0)}k`} stroke="rgb(148 163 184 / 0.5)" />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid rgb(226 232 240)' }}
          labelFormatter={(value: any) => {
            const d = new Date(value);
            return d.toLocaleDateString(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' });
          }}
          formatter={(value: any) => [formatCurrency(Number(value)), i18n.t('analyticsRevenue')]}
        />
        <Line type="monotone" dataKey="revenue" stroke="rgb(22 163 74)" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function StatusPieChart({ data }: { data: AnalyticsStatusData[] }) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('analyticsNoData')}</p>;
  }

  const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#f97316'];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={220} className="max-w-[220px]">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80} innerRadius={50} paddingAngle={3}>
            {data.map((_entry, index) => (
              <Cell key={_entry.status} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid rgb(226 232 240)' }}
            formatter={(value: any, name: any) => [value, name.replace(/_/g, ' ')]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2">
        {data.map((entry, index) => (
          <div key={entry.status} className="flex items-center gap-2 text-xs">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
            <span className="capitalize text-slate-600 dark:text-slate-400">{entry.status.replace(/_/g, ' ')}</span>
            <span className="font-semibold">{entry.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopProductsBarChart({ data }: { data: AnalyticsProductData[] }) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('analyticsNoData')}</p>;
  }

  const chartData = useMemo(() => [...data].reverse(), [data]);

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(148 163 184 / 0.2)" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(value: any) => `${(Number(value) / 1000).toFixed(0)}k`} stroke="rgb(148 163 184 / 0.5)" />
        <YAxis dataKey="productName" type="category" tick={{ fontSize: 10 }} width={140} stroke="rgb(148 163 184 / 0.5)" tickFormatter={(value: any) => value.length > 18 ? `${value.slice(0, 18)}...` : value} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid rgb(226 232 240)' }}
          formatter={(value: any) => [formatCurrency(Number(value)), t('analyticsRevenue')]}
        />
        <Bar dataKey="revenue" fill="rgb(59 130 246)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function PaymentBreakdown({ data }: { data: { paymentMethod: string; count: number; revenue: number }[] }) {
  const { t } = useTranslation();

  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('analyticsNoData')}</p>;
  }

  const totalCount = data.reduce((sum, entry) => sum + entry.count, 0);

  return (
    <div className="space-y-3">
      {data.map((entry) => (
        <div key={entry.paymentMethod}>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium capitalize">{entry.paymentMethod.replace(/_/g, ' ')}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {entry.count} ({totalCount > 0 ? Math.round((entry.count / totalCount) * 100) : 0}%)
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${totalCount > 0 ? (entry.count / totalCount) * 100 : 0}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{formatCurrency(entry.revenue)}</p>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPanel({ shopId, isSuperAdmin }: { shopId: string | null; isSuperAdmin: boolean }) {
  const { t } = useTranslation();
  const analyticsQuery = useAdminAnalytics(shopId, isSuperAdmin);
  const data = analyticsQuery.data;

  if (analyticsQuery.isLoading) {
    return (
      <section className="glass-panel p-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading')}</p>
      </section>
    );
  }

  if (analyticsQuery.isError) {
    return (
      <section className="glass-panel p-4">
        <p className="text-sm text-rose-600 dark:text-rose-300">
          {analyticsQuery.error instanceof Error ? analyticsQuery.error.message : t('failedToLoadOrders')}
        </p>
      </section>
    );
  }

  if (!data) {
    return (
      <section className="glass-panel p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp size={40} className="text-slate-300 dark:text-slate-600" />
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">{t('analyticsNoData')}</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label={t('analyticsRevenue')} value={formatCurrency(data.totalRevenue)} hint={`${data.paidOrders} ${t('analyticsPaidOrders')}`} icon={DollarSign} />
        <SummaryCard label={t('analyticsTotalOrders')} value={data.totalOrders} icon={Receipt} />
        <SummaryCard label={t('analyticsAvgOrderValue')} value={formatCurrency(data.avgOrderValue)} icon={ShoppingBag} />
        <SummaryCard label={t('analyticsPaidRevenue')} value={formatCurrency(data.paidRevenue)} hint={`${data.paidOrders} ${t('analyticsPaidOrders')}`} icon={TrendingUp} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <PeriodCard label={t('analyticsToday')} revenue={data.today.revenue} orders={data.today.orders} />
        <PeriodCard label={t('analyticsThisWeek')} revenue={data.thisWeek.revenue} orders={data.thisWeek.orders} />
        <PeriodCard label={t('analyticsThisMonth')} revenue={data.thisMonth.revenue} orders={data.thisMonth.orders} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('analyticsRevenueTrend')}>
          <RevenueLineChart data={data.revenueByDay} />
        </ChartCard>
        <ChartCard title={t('analyticsOrdersByStatus')}>
          <StatusPieChart data={data.ordersByStatus} />
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard title={t('analyticsTopProducts')}>
          <TopProductsBarChart data={data.topProducts} />
        </ChartCard>
        <ChartCard title={t('analyticsPaymentBreakdown')}>
          <PaymentBreakdown data={data.revenueByPayment} />
        </ChartCard>
      </div>
    </section>
  );
}
