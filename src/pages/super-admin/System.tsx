import { GlassCard } from '../../components/GlassCard';
import { ShieldCheck, Server, AlertTriangle, FileText, Activity } from 'lucide-react';

export default function SuperAdminSystem() {
  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-2">
        <Server className="w-8 h-8 text-[#2DD4BF]" />
        Logs do Sistema & Auditoria
      </h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <GlassCard className="p-6">
            <h3 className="text-gray-400 text-sm uppercase font-bold mb-2">Status do Servidor</h3>
            <div className="flex items-center gap-2 text-green-500 font-bold text-xl">
                <Activity className="w-5 h-5" /> Operacional
            </div>
            <p className="text-xs text-gray-500 mt-1">Uptime: 99.9%</p>
        </GlassCard>

        <GlassCard className="p-6">
            <h3 className="text-gray-400 text-sm uppercase font-bold mb-2">Logs de Erro (24h)</h3>
            <div className="flex items-center gap-2 text-white font-bold text-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-500" /> 0 Incidentes
            </div>
            <p className="text-xs text-gray-500 mt-1">Tudo limpo.</p>
        </GlassCard>

        <GlassCard className="p-6">
            <h3 className="text-gray-400 text-sm uppercase font-bold mb-2">Versão</h3>
            <div className="flex items-center gap-2 text-purple-400 font-bold text-xl">
                <ShieldCheck className="w-5 h-5" /> v1.0.2
            </div>
            <p className="text-xs text-gray-500 mt-1">Atualizado hoje.</p>
        </GlassCard>
      </div>

      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-400" />
                Logs de Acesso Recentes
            </h2>
            <div className="flex gap-2">
                 <button className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-white transition-colors">Exportar CSV</button>
            </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-white/5">
            <table className="w-full text-left text-sm text-gray-400">
                <thead className="bg-white/5 text-gray-200 uppercase text-xs font-bold">
                    <tr>
                        <th className="px-4 py-3">Timestamp</th>
                        <th className="px-4 py-3">Usuário</th>
                        <th className="px-4 py-3">Ação</th>
                        <th className="px-4 py-3">IP</th>
                        <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {/* Mock Data for now until we have a logs table */}
                    <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date().toISOString()}</td>
                        <td className="px-4 py-3 text-white">Super Admin</td>
                        <td className="px-4 py-3">Acessou Dashboard</td>
                        <td className="px-4 py-3 font-mono text-xs">192.168.1.1</td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold text-xs">SUCESSO</td>
                    </tr>
                     <tr className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">{new Date(Date.now() - 1000 * 60 * 5).toISOString()}</td>
                        <td className="px-4 py-3 text-white">Sistema</td>
                        <td className="px-4 py-3">Cron Job: Verificar Pagamentos</td>
                        <td className="px-4 py-3 font-mono text-xs">::1</td>
                        <td className="px-4 py-3 text-right text-green-400 font-bold text-xs">SUCESSO</td>
                    </tr>
                </tbody>
            </table>
            
            <div className="p-4 border-t border-white/5 text-center text-xs text-gray-600">
                Mostrando 2 de 2 registros (Paginação em breve)
            </div>
        </div>
      </GlassCard>
    </div>
  );
}
