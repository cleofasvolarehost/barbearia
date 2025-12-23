import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { Search } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SuperAdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('usuarios')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            setUsers(data || []);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Erro ao carregar usuários');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ tipo: newRole })
                .eq('id', userId);

            if (error) throw error;
            
            setUsers(users.map(u => u.id === userId ? { ...u, tipo: newRole } : u));
            toast.success('Função atualizada com sucesso!');
        } catch (error: any) {
            console.error('Error updating role:', error);
            toast.error('Erro ao atualizar função: ' + error.message);
        }
    };

    const filteredUsers = users.filter(user => 
        (user.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const getRoleBadgeColor = (role: string) => {
        switch(role) {
            case 'super_admin': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
            case 'owner': return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
            case 'barber': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
        }
    };

    return (
        <div className="p-6 pb-24 max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Gerenciamento de Usuários (Master)</h1>

            <div className="mb-6 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-[#7C3AED] outline-none"
                />
            </div>

            <GlassCard className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-medium">Usuário</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Função (Role)</th>
                                <th className="text-left p-4 text-gray-400 font-medium">ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading ? (
                                <tr><td colSpan={4} className="p-8 text-center text-gray-400">Carregando...</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold shrink-0">
                                                {user.nome?.substring(0,2).toUpperCase() || '??'}
                                            </div>
                                            <span className="text-white font-medium">{user.nome || 'Sem Nome'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-300">{user.email}</td>
                                    <td className="p-4">
                                        <select 
                                            value={user.tipo || 'client'}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className={`
                                                px-3 py-1 rounded-full text-xs font-bold border outline-none cursor-pointer appearance-none
                                                ${getRoleBadgeColor(user.tipo || 'client')}
                                            `}
                                        >
                                            <option value="super_admin" className="bg-[#121212] text-yellow-500">Super Admin</option>
                                            <option value="owner" className="bg-[#121212] text-purple-500">Dono (Owner)</option>
                                            <option value="barber" className="bg-[#121212] text-blue-500">Barbeiro</option>
                                            <option value="client" className="bg-[#121212] text-gray-400">Cliente</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-gray-400 text-sm font-mono opacity-50">
                                        {user.id}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}
