import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { Building2, Users, DollarSign, Activity, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeShops: 0,
    totalUsers: 0,
    totalRevenue: 0,
    recentShops: [] as any[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // 1. Total Active Shops
      const { count: shopsCount, error: shopsError } = await supabase
        .from('establishments')
        .select('*', { count: 'exact', head: true }); // Head only for count

      // 2. Total Users
      const { count: usersCount, error: usersError } = await supabase
        .from('usuarios')
        .select('*', { count: 'exact', head: true });

      // 3. Total Revenue (Sum of saas_payments)
      const { data: revenueData, error: revenueError } = await supabase
        .from('saas_payments')
        .select('amount')
        .eq('status', 'paid');
      
      const totalRevenue = revenueData?.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0) || 0;

      // 4. Recent Shops
      const { data: recentShops, error: recentError } = await supabase
        .from('establishments')
        .select('id, name, created_at, subscription_status')
        .order('created_at', { ascending: false })
        .limit(5);

      if (shopsError || usersError || revenueError || recentError) {
          console.error('Stats error', { shopsError, usersError, revenueError, recentError });
      }

      setStats({
        activeShops: shopsCount || 0,
        totalUsers: usersCount || 0,
        totalRevenue,
        recentShops: recentShops || []
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    { 
        label: 'Barbearias Ativas', 
        value: stats.activeShops, 
        icon: Building2, 
        color: '#7C3AED',
        link: '/super-admin/tenants'
    },
    { 
        label: 'Total de Usuários', 
        value: stats.totalUsers, 
        icon: Users, 
        color: '#2DD4BF',
        link: '/super-admin/users'
    },
    { 
        label: 'MRR (Receita Mensal)', 
        value: `R$ ${stats.totalRevenue.toFixed(2)}`, 
        icon: DollarSign, 
        color: '#10B981',
        link: '/super-admin/subscriptions'
    },
    { 
        label: 'Taxa de Conversão', 
        value: '12%', 
        icon: TrendingUp, 
        color: '#F59E0B',
        link: null // No specific link yet
    },
  ];

  if (loading) return <div className="p-8 text-white">Carregando Dashboard...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <h1 className="text-3xl font-bold text-white mb-8">Visão Geral (God Mode)</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map((kpi, index) => {
            const Icon = kpi.icon;
            return (
                <GlassCard 
                    key={index} 
                    className={`p-6 flex items-center justify-between ${kpi.link ? 'cursor-pointer hover:border-white/30 transition-all' : ''}`}
                    onClick={() => kpi.link && navigate(kpi.link)}
                >
                    <div>
                        <p className="text-gray-400 text-sm mb-1">{kpi.label}</p>
                        <h3 className="text-2xl font-bold text-white">{kpi.value}</h3>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white/5" style={{ color: kpi.color }}>
                        <Icon className="w-6 h-6" />
                    </div>
                </GlassCard>
            );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity */}
        <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#7C3AED]" />
                    Atividade Recente
                </h3>
            </div>
            <div className="space-y-4">
                {stats.recentShops.length === 0 ? (
                    <p className="text-gray-500">Nenhuma atividade recente.</p>
                ) : (
                    stats.recentShops.map(shop => (
                        <div key={shop.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                            <div>
                                <p className="font-bold text-white">{shop.name}</p>
                                <p className="text-xs text-gray-400">Criado em {new Date(shop.created_at).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                shop.subscription_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                                {shop.subscription_status}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </GlassCard>

        {/* Quick Actions or Charts (Placeholder) */}
        <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
            <h3 className="text-xl font-bold text-white mb-4">Ações Rápidas</h3>
            <p className="text-gray-400 mb-6">Ferramentas de sistema em breve.</p>
            <button className="px-6 py-2 bg-[#7C3AED] rounded-full text-white font-bold hover:bg-[#6D28D9] transition-colors">
                Gerar Relatório
            </button>
        </GlassCard>
      </div>
    </div>
  );
}
