import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/GlassCard';
import { Search, MoreVertical, Trash2, Lock, Ban, Edit, Plus, Building2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function SuperAdminUsers() {
    const [users, setUsers] = useState<any[]>([]);
    const [establishments, setEstablishments] = useState<any[]>([]);
    const [barbers, setBarbers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstablishment, setFilterEstablishment] = useState('all');
    
    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState<string | null>(null); // userId
    const [showEditModal, setShowEditModal] = useState<any | null>(null); // user object
    const [showActionSheet, setShowActionSheet] = useState<any | null>(null); // user object for action sheet

    // Form States
    const [newUser, setNewUser] = useState({ nome: '', email: '', password: '', telefone: '', tipo: 'client', establishment_id: '' });
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Users
            const { data: usersData, error: uError } = await supabase
                .from('usuarios')
                .select('*')
                .order('created_at', { ascending: false });
            if (uError) throw uError;

            // 2. Fetch Establishments
            const { data: estData, error: eError } = await supabase
                .from('establishments')
                .select('id, name, owner_id');
            if (eError) throw eError;

            // 3. Fetch Barbers
            const { data: barbData, error: bError } = await supabase
                .from('barbeiros')
                .select('user_id, establishment_id');
            if (bError) throw bError;

            setUsers(usersData || []);
            setEstablishments(estData || []);
            setBarbers(barbData || []);

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    const getUserEstablishment = (user: any) => {
        // 1. Direct link (New method)
        if (user.establishment_id) {
            const est = establishments.find(e => e.id === user.establishment_id);
            return est ? est.name : 'ID Desconhecido';
        }

        // 2. Legacy/Role-based fallback
        if (user.tipo === 'owner') {
            const est = establishments.find(e => e.owner_id === user.id);
            return est ? est.name : 'Sem Loja';
        }
        if (user.tipo === 'barber') {
            const barb = barbers.find(b => b.user_id === user.id);
            if (barb) {
                const est = establishments.find(e => e.id === barb.establishment_id);
                return est ? est.name : 'Loja Desconhecida';
            }
            return 'Não Vinculado';
        }
        return 'SaaS / Cliente';
    };

    // Actions via Edge Function
    const callAdminAction = async (action: string, userId: string | null, payload: any = {}) => {
        const toastId = toast.loading('Processando...');
        try {
            const { data, error } = await supabase.functions.invoke('admin-user-actions', {
                body: { action, userId, payload }
            });

            if (error) throw error;
            
            toast.success(data.message || 'Sucesso!', { id: toastId });
            fetchData(); // Refresh data
            return data;
        } catch (error: any) {
            console.error('Action error:', error);
            toast.error('Erro: ' + (error.message || 'Falha na ação'), { id: toastId });
            throw error;
        }
    };

    const handleDelete = async (userId: string) => {
        if (!window.confirm('Tem certeza que deseja DELETAR este usuário? Essa ação não pode ser desfeita.')) return;
        await callAdminAction('delete', userId);
    };

    const handleSuspend = async (userId: string, isSuspended: boolean) => {
        const shouldBan = window.confirm(`Deseja ${isSuspended ? 'ATIVAR' : 'SUSPENDER'} este usuário?`);
        if (!shouldBan) return;
        
        await callAdminAction('suspend', userId, { banned: !isSuspended });
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await callAdminAction('create_user', null, newUser);
            setShowCreateModal(false);
            setNewUser({ nome: '', email: '', password: '', telefone: '', tipo: 'client', establishment_id: '' });
        } catch (err) {
            // Error handled in callAdminAction
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showPasswordModal) return;
        try {
            await callAdminAction('update_password', showPasswordModal, { password: newPassword });
            setShowPasswordModal(null);
            setNewPassword('');
        } catch (err) {}
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showEditModal) return;
        try {
            await callAdminAction('update_profile', showEditModal.id, { 
                data: { 
                    nome: showEditModal.nome, 
                    telefone: showEditModal.telefone,
                    tipo: showEditModal.tipo,
                    establishment_id: showEditModal.establishment_id || null
                } 
            });
            setShowEditModal(null);
        } catch (err) {}
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                              (user.email?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        
        const matchesEst = filterEstablishment === 'all' || 
                           user.establishment_id === filterEstablishment ||
                           // Fallback logic
                           (user.tipo === 'owner' && establishments.find(e => e.owner_id === user.id)?.id === filterEstablishment) ||
                           (user.tipo === 'barber' && barbers.find(b => b.user_id === user.id)?.establishment_id === filterEstablishment);

        return matchesSearch && matchesEst;
    });

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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-white">Gerenciamento de Usuários (Master)</h1>
                <button 
                    onClick={() => setShowCreateModal(true)}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold transition-colors"
                >
                    <Plus className="w-5 h-5" /> Novo Usuário
                </button>
            </div>

            <div className="mb-6 flex gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nome ou email..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-[#7C3AED] outline-none"
                    />
                </div>
                <div className="relative w-64">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <select 
                        value={filterEstablishment}
                        onChange={e => setFilterEstablishment(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-[#7C3AED] outline-none appearance-none cursor-pointer"
                    >
                        <option value="all" className="bg-[#1e1e1e]">Todas as Barbearias</option>
                        {establishments.map(est => (
                            <option key={est.id} value={est.id} className="bg-[#1e1e1e]">
                                {est.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <GlassCard className="overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="text-left p-4 text-gray-400 font-medium">Usuário</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Email</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Função</th>
                                <th className="text-left p-4 text-gray-400 font-medium">Estabelecimento</th>
                                <th className="text-right p-4 text-gray-400 font-medium">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {loading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Carregando...</td></tr>
                            ) : filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold shrink-0">
                                                {user.nome?.substring(0,2).toUpperCase() || '??'}
                                            </div>
                                            <div>
                                                <div className="text-white font-medium">{user.nome || 'Sem Nome'}</div>
                                                <div className="text-xs text-gray-500 font-mono">{user.id.substring(0,8)}...</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-gray-300">{user.email}</td>
                                    <td className="p-4">
                                        <select 
                                            value={user.tipo || 'client'} 
                                            onChange={async (e) => {
                                                const newRole = e.target.value;
                                                if (!window.confirm(`Mudar função de ${user.nome} para ${newRole}?`)) return;
                                                try {
                                                    await callAdminAction('update_profile', user.id, { 
                                                        data: { tipo: newRole } 
                                                    });
                                                    // fetchData() is called inside callAdminAction
                                                } catch (err) {
                                                    // Error handled in callAdminAction
                                                }
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border appearance-none cursor-pointer outline-none ${getRoleBadgeColor(user.tipo || 'client')} [&>option]:text-black`}
                                        >
                                            <option value="client">Cliente</option>
                                            <option value="barber">Barbeiro</option>
                                            <option value="owner">Dono</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-4 text-gray-300">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-gray-500" />
                                            {getUserEstablishment(user)}
                                        </div>
                                    </td>
                                    <td className="p-4 text-right relative">
                                        <div className="flex items-center justify-end gap-2">
                                            <button 
                                                onClick={() => setShowPasswordModal(user.id)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-yellow-400 transition-colors"
                                                title="Mudar Senha"
                                            >
                                                <Lock className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                                title="Deletar Usuário"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                            
                                            <button 
                                                onClick={() => setShowActionSheet(user)}
                                                className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </GlassCard>

            {/* Action Sheet Modal */}
            {showActionSheet && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowActionSheet(null)}>
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-sm p-4 space-y-2" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 p-3 border-b border-white/10 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold shrink-0">
                                {showActionSheet.nome?.substring(0,2).toUpperCase() || '??'}
                            </div>
                            <div>
                                <div className="text-white font-medium">{showActionSheet.nome || 'Sem Nome'}</div>
                                <div className="text-xs text-gray-500">{showActionSheet.email}</div>
                            </div>
                        </div>

                        <button 
                            onClick={() => {
                                setShowEditModal(showActionSheet);
                                setShowActionSheet(null);
                            }} 
                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 text-white transition-colors"
                        >
                            <Edit className="w-5 h-5 text-blue-400" /> 
                            <span className="font-medium">Editar Dados</span>
                        </button>

                        <button 
                            onClick={() => {
                                handleSuspend(showActionSheet.id, showActionSheet.banned);
                                setShowActionSheet(null);
                            }} 
                            className="w-full text-left px-4 py-3 bg-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3 text-white transition-colors"
                        >
                            <Ban className={`w-5 h-5 ${showActionSheet.banned ? 'text-green-400' : 'text-orange-400'}`} /> 
                            <span className="font-medium">{showActionSheet.banned ? 'Reativar Usuário' : 'Suspender Usuário'}</span>
                        </button>
                        
                         <button 
                            onClick={() => setShowActionSheet(null)} 
                            className="w-full text-center px-4 py-3 mt-2 text-gray-500 hover:text-white transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Criar Novo Usuário</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Nome Completo</label>
                                <input required type="text" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Email</label>
                                <input required type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Senha Inicial</label>
                                <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Função</label>
                                <select value={newUser.tipo} onChange={e => setNewUser({...newUser, tipo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]">
                                    <option value="client">Cliente</option>
                                    <option value="barber">Barbeiro</option>
                                    <option value="owner">Dono (Owner)</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Vincular a Barbearia (Opcional)</label>
                                <select value={newUser.establishment_id} onChange={e => setNewUser({...newUser, establishment_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]">
                                    <option value="">Nenhuma / SaaS</option>
                                    {establishments.map(est => (
                                        <option key={est.id} value={est.id}>{est.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-[#7C3AED] text-white font-bold hover:opacity-90">Criar Usuário</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Alterar Senha</h2>
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Nova Senha</label>
                                <input required type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]" placeholder="Digite a nova senha..." />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowPasswordModal(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-yellow-600 text-white font-bold hover:opacity-90">Atualizar Senha</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-white/10 rounded-2xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-6">Editar Usuário</h2>
                        <form onSubmit={handleUpdateProfile} className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-400">Nome Completo</label>
                                <input required type="text" value={showEditModal.nome} onChange={e => setShowEditModal({...showEditModal, nome: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Telefone</label>
                                <input type="text" value={showEditModal.telefone || ''} onChange={e => setShowEditModal({...showEditModal, telefone: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]" />
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Função</label>
                                <select value={showEditModal.tipo} onChange={e => setShowEditModal({...showEditModal, tipo: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]">
                                    <option value="client">Cliente</option>
                                    <option value="barber">Barbeiro</option>
                                    <option value="owner">Dono (Owner)</option>
                                    <option value="super_admin">Super Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-gray-400">Vincular a Barbearia</label>
                                <select value={showEditModal.establishment_id || ''} onChange={e => setShowEditModal({...showEditModal, establishment_id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#7C3AED]">
                                    <option value="">Nenhuma / SaaS</option>
                                    {establishments.map(est => (
                                        <option key={est.id} value={est.id}>{est.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowEditModal(null)} className="flex-1 py-3 rounded-xl bg-white/5 text-white hover:bg-white/10">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:opacity-90">Salvar Alterações</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
