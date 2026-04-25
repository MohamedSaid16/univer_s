import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';

export default function DashboardCharts({ data }) {
  const { t } = useTranslation();
  const barChartWrapRef = useRef(null);
  const pieChartWrapRef = useRef(null);
  const [barChartReady, setBarChartReady] = useState(false);
  const [pieChartReady, setPieChartReady] = useState(false);

  useEffect(() => {
    const observers = [];

    const watchContainer = (ref, setReady) => {
      const node = ref.current;
      if (!node) return;

      const updateReady = () => {
        const rect = node.getBoundingClientRect();
        setReady(rect.width > 0 && rect.height > 0);
      };

      updateReady();

      const observer = new ResizeObserver(() => {
        updateReady();
      });

      observer.observe(node);
      observers.push(observer);
    };

    watchContainer(barChartWrapRef, setBarChartReady);
    watchContainer(pieChartWrapRef, setPieChartReady);

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  const moduleTypesCount = data?.enseignements?.reduce((acc, curr) => {
    const rawType = curr.type?.toUpperCase();
    const type = rawType === 'COURS' || rawType === 'TD' || rawType === 'TP' ? rawType : 'OTHER';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {}) || {};

  const moduleChartData = Object.keys(moduleTypesCount).map(key => ({
    name: key === 'OTHER' ? t('other', { defaultValue: 'Other' }) : key,
    value: moduleTypesCount[key]
  }));

  const pfeStatusCount = data?.pfeSujets?.reduce((acc, curr) => {
    const status = curr.status || 'propose';
    const translatedStatus = t(`tables.status.${status}`);
    acc[translatedStatus] = (acc[translatedStatus] || 0) + 1;
    return acc;
  }, {}) || {};

  const pfeChartData = Object.keys(pfeStatusCount).map(key => ({
    name: key,
    value: pfeStatusCount[key]
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      
      {/* Bar Chart for Modules */}
      <div className="bg-surface p-6 rounded-lg shadow-card border border-edge">
        <h3 className="text-lg font-semibold text-ink mb-6">
          {t('charts.moduleDistribution')}
        </h3>
        <div ref={barChartWrapRef} className="w-full min-w-0 min-h-[240px]">
          {barChartReady ? (
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <BarChart 
                data={moduleChartData} 
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-edge)" className="dark:stroke-edge" />
                <XAxis dataKey="name" tick={{fill: 'var(--color-ink-muted)'}} axisLine={{stroke: 'var(--color-edge-subtle)'}} />
                <YAxis allowDecimals={false} tick={{fill: 'var(--color-ink-muted)'}} axisLine={{stroke: 'var(--color-edge-subtle)'}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  cursor={{fill: 'var(--color-surface-200)', className: 'dark:fill-surface-300'}}
                />
                <Bar dataKey="value" fill="var(--color-brand)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Pie Chart for PFE Stats */}
      <div className="bg-surface p-6 rounded-lg shadow-card border border-edge">
        <h3 className="text-lg font-semibold text-ink mb-6">
          {t('charts.pfeStatus')}
        </h3>
        <div ref={pieChartWrapRef} className="w-full min-w-0 min-h-[240px]">
          {pieChartReady ? (
            <ResponsiveContainer width="100%" height={240} minWidth={0}>
              <PieChart>
                <Pie
                  data={pfeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pfeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

    </div>
  );
}

