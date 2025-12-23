import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { GlassCard } from '../../components/GlassCard';
import { Ban, Clock, Search, MoreVertical, ShieldAlert, Plus, Store, User, Mail, Phone, Check, X, Edit, ExternalLink, Globe, Lock, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { addDays } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

export default function SuperAdminTenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State for Create
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newShop, setNewShop] = useState({
      name: '',
      slug: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      ownerPassword: ''
  });
  const [creating, setCreating] = useState(false);

  // Modal State for Link Owner
  const [isLinkOwnerModalOpen, setIsLinkOwnerModalOpen] = useState(false);
  const [shopToLink, setShopToLink] = useState<any>(null);
  const [newOwner, setNewOwner] = useState({
      name: '',
      email: '',
      password: '',
      phone: ''
  });
  const [linking, setLinking] = useState(false);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchTenants = async () => {
    try {
      const { data, error } = await supabase
        .from('establishments')
        .select(`
          *,
          owner:usuarios!owner_id (
            nome,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTenants(data || []);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const handleLinkOwner = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!shopToLink) return;
      setLinking(true);

      try {
          let userId = '';

          // 1. Check if user already exists
          const { data: existingUser } = await supabase
              .from('usuarios')
              .select('id, tipo')
              .eq('email', newOwner.email)
              .maybeSingle();

          if (existingUser) {
              userId = existingUser.id;
              toast('Usuário já existe. Atualizando permissões...', { icon: '🔄' });
              
              if (existingUser.tipo !== 'owner' && existingUser.tipo !== 'super_admin') {
                  await supabase.from('usuarios').update({ tipo: 'owner' }).eq('id', userId);
              }
          } else {
              // 2. Create New User
              const tempClient = createClient(
                  import.meta.env.VITE_SUPABASE_URL,
                  import.meta.env.VITE_SUPABASE_ANON_KEY,
                  {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                  }
              );

              const { data: authData, error: authError } = await tempClient.auth.signUp({
                  email: newOwner.email,
                  password: newOwner.password,
                  options: {
                      data: {
                          nome: newOwner.name,
                          tipo: 'owner',
                          telefone: newOwner.phone
                      }
                  }
              });

              if (authError) throw authError;
              if (!authData.user) throw new Error('Falha ao criar usuário Auth');
              
              userId = authData.user.id;

              // Ensure profile creation
              await supabase.from('usuarios').upsert({
                  id: userId,
                  email: newOwner.email,
                  nome: newOwner.name,
                  telefone: newOwner.phone,
                  tipo: 'owner'
              }, { onConflict: 'id' });
          }

          // 3. Link to Establishment
          const { error: linkError } = await supabase
              .from('establishments')
              .update({ 
                  owner_id: userId,
                  // Auto-activate trial if needed
                  subscription_status: 'active',
                  subscription_end_date: addDays(new Date(), 30).toISOString()
              })
              .eq('id', shopToLink.id);

          if (linkError) throw linkError;

          toast.success('Dono vinculado com sucesso!');
          setIsLinkOwnerModalOpen(false);
          setNewOwner({ name: '', email: '', password: '', phone: '' });
          setShopToLink(null);
          fetchTenants();

          // Send Welcome Email
          await supabase.functions.invoke('send-email', {
            body: {
                type: 'welcome_manual',
                email: newOwner.email,
                name: newOwner.name,
                password: newOwner.password || '(Senha existente)'
            }
          });

      } catch (error: any) {
          console.error('Link owner error:', error);
          toast.error(error.message || 'Erro ao vincular dono');
      } finally {
          setLinking(false);
      }
  };

  const openLinkModal = (shop: any) => {
      setShopToLink(shop);
      setIsLinkOwnerModalOpen(true);
  };

  const handleCreateShop = async (e: React.FormEvent) => {
      e.preventDefault();
      setCreating(true);

      try {
          let userId = '';

          // 1. Check if user already exists in DB (orphaned check)
          const { data: existingUser } = await supabase
              .from('usuarios')
              .select('id, tipo')
              .eq('email', newShop.ownerEmail)
              .maybeSingle();

          if (existingUser) {
              userId = existingUser.id;
              toast('Usuário já existe. Vinculando loja...', { icon: '🔗' });
              
              // Promote to owner if not already
              if (existingUser.tipo !== 'owner' && existingUser.tipo !== 'super_admin') {
                  await supabase.from('usuarios').update({ tipo: 'owner' }).eq('id', userId);
              }
          } else {
              // 2. Create User via Auth (using secondary client to avoid logging out admin)
              const tempClient = createClient(
                  import.meta.env.VITE_SUPABASE_URL,
                  import.meta.env.VITE_SUPABASE_ANON_KEY,
                  {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    }
                  }
              );

              const { data: authData, error: authError } = await tempClient.auth.signUp({
                  email: newShop.ownerEmail,
                  password: newShop.ownerPassword,
                  options: {
                      data: {
                          nome: newShop.ownerName,
                          tipo: 'owner',
                          telefone: newShop.ownerPhone
                      }
                  }
              });

              if (authError) throw authError;
              if (!authData.user) throw new Error('Falha ao criar usuário Auth');
              
              userId = authData.user.id;
              
              // Ensure profile is created (sometimes trigger is slow or fails)
              // We do a direct insert just in case, ignoring conflicts
              await supabase.from('usuarios').upsert({
                  id: userId,
                  email: newShop.ownerEmail,
                  nome: newShop.ownerName,
                  telefone: newShop.ownerPhone,
                  tipo: 'owner'
              }, { onConflict: 'id' });
          }

          // 3. Create Establishment
          const { error: shopError } = await supabase.from('establishments').insert({
              name: newShop.name,
              slug: newShop.slug || newShop.name.toLowerCase().replace(/\s+/g, '-'),
              owner_id: userId,
              phone: newShop.ownerPhone
          });

          if (shopError) throw shopError;

          toast.success('Barbearia e Dono criados com sucesso!');
          setIsModalOpen(false);
          setNewShop({ name: '', slug: '', ownerName: '', ownerEmail: '', ownerPhone: '', ownerPassword: '' });
          fetchTenants();
      } catch (error: any) {
          console.error('Create shop error:', error);
          toast.error(error.message || 'Erro ao criar barbearia');
      } finally {
          setCreating(false);
      }
  };

  const openEditModal = (shop: any) => {
      setEditingShop({
          id: shop.id,
          name: shop.name,
          slug: shop.slug,
          phone: shop.phone || ''
      });
      setIsEditModalOpen(true);
  };

  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetUser, setResetUser] = useState<{id: string, name: string} | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const openResetPasswordModal = (tenant: any) => {
      if (!tenant.owner_id) {
          toast.error('Esta barbearia não tem dono vinculado.');
          return;
      }
      setResetUser({
          id: tenant.owner_id,
          name: tenant.owner?.nome || 'Dono Desconhecido'
      });
      setIsResetPasswordModalOpen(true);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!resetUser) return;
      setResetting(true);

      try {
          const { data, error } = await supabase.functions.invoke('admin-reset-password', {
              body: {
                  userId: resetUser.id,
                  newPassword: newPassword
              }
          });

          if (error) {
            console.error('Invoke Error:', error);
            // Tenta extrair a mensagem de erro real do corpo da resposta, se disponível
            if (error.context && typeof error.context.json === 'function') {
                try {
                    const body = await error.context.json();
                    if (body.error) throw new Error(body.error);
                } catch (e) {
                    // Falha ao ler JSON, usa o erro original
                }
            }
            throw error;
          }

          toast.success('Senha alterada com sucesso!');
          setIsResetPasswordModalOpen(false);
          setNewPassword('');
          setResetUser(null);
      } catch (error: any) {
          console.error('Reset error:', error);
          toast.error('Erro ao resetar: ' + (error.message || 'Erro ao chamar RPC.'));
      } finally {
          setResetting(false);
      }
  };

  const handleUpdateShop = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingShop) return;
      setSavingEdit(true);

      try {
          const { error } = await supabase
              .from('establishments')
              .update({
                  name: editingShop.name,
                  slug: editingShop.slug,
                  phone: editingShop.phone
              })
              .eq('id', editingShop.id);

          if (error) throw error;

          toast.success('Barbearia atualizada!');
          setIsEditModalOpen(false);
          fetchTenants();
      } catch (error: any) {
          toast.error('Erro ao atualizar: ' + error.message);
      } finally {
          setSavingEdit(false);
      }
  };

  const handleSuspend = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended';
    const action = currentStatus === 'suspended' ? 'Reativar' : 'Suspender';
    
    if (!confirm(`Tem certeza que deseja ${action} esta barbearia?`)) return;

    try {
      const { error } = await supabase
        .from('establishments')
        .update({ subscription_status: newStatus })
        .eq('id', id);

      if (error) throw error;
      
      toast.success(`Barbearia ${newStatus === 'active' ? 'reativada' : 'suspensa'} com sucesso!`);
      fetchTenants();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const handleExtendTrial = async (id: string) => {
    if (!confirm('Adicionar 15 dias ao período de teste?')) return;

    try {
      // First get current date
      const { data: current } = await supabase
        .from('establishments')
        .select('subscription_end_date')
        .eq('id', id)
        .single();
      
      const baseDate = current?.subscription_end_date ? new Date(current.subscription_end_date) : new Date();
      const newDate = addDays(baseDate, 15);

      const { error } = await supabase
        .from('establishments')
        .update({ subscription_end_date: newDate.toISOString() })
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Período estendido com sucesso!');
      fetchTenants();
    } catch (error) {
      toast.error('Erro ao estender prazo');
    }
  };

  const filteredTenants = tenants.filter(t => 
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.owner?.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="p-8 text-white">Carregando Barbearias...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto pb-24">
      {/* Create Modal */}
      <AnimatePresence>
          {isModalOpen && (
              <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setIsModalOpen(false)} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                >
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg pointer-events-auto shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Nova Barbearia (Manual)</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleCreateShop} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nome da Barbearia</label>
                                <div className="relative">
                                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        required
                                        value={newShop.name}
                                        onChange={e => setNewShop({...newShop, name: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="Ex: Cortes do Zé"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                                <input 
                                    value={newShop.slug}
                                    onChange={e => setNewShop({...newShop, slug: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white focus:border-[#7C3AED] outline-none"
                                    placeholder="Ex: cortes-do-ze (Deixe vazio para gerar)"
                                />
                            </div>
                            <div className="pt-4 border-t border-white/10">
                                <p className="text-xs text-[#2DD4BF] mb-3 uppercase font-bold tracking-wider">Dados do Dono (Ghost)</p>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Nome do Dono</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input 
                                                required
                                                value={newShop.ownerName}
                                                onChange={e => setNewShop({...newShop, ownerName: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                                placeholder="Nome Completo"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input 
                                                type="email"
                                                required
                                                value={newShop.ownerEmail}
                                                onChange={e => setNewShop({...newShop, ownerEmail: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                                placeholder="email@exemplo.com"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                            <input 
                                                value={newShop.ownerPhone}
                                                onChange={e => setNewShop({...newShop, ownerPhone: e.target.value})}
                                                className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                                placeholder="(99) 99999-9999"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                                <button type="submit" disabled={creating} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold transition-colors flex items-center justify-center gap-2">
                                    {creating ? 'Criando...' : <><Check className="w-4 h-4" /> Criar Barbearia</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>

      {/* Link Owner Modal */}
      <AnimatePresence>
        {isLinkOwnerModalOpen && shopToLink && (
            <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setIsLinkOwnerModalOpen(false)} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                >
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-lg pointer-events-auto shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Vincular Dono a {shopToLink.name}</h2>
                            <button onClick={() => setIsLinkOwnerModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleLinkOwner} className="p-6 space-y-4">
                            <p className="text-sm text-gray-400 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-lg">
                                ⚠️ Se o email já existir, o usuário será promovido a 'owner' e vinculado a esta loja.
                            </p>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nome do Dono</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        required
                                        value={newOwner.name}
                                        onChange={e => setNewOwner({...newOwner, name: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="Nome Completo"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Email</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="email"
                                        required
                                        value={newOwner.email}
                                        onChange={e => setNewOwner({...newOwner, email: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="email@exemplo.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        value={newOwner.phone}
                                        onChange={e => setNewOwner({...newOwner, phone: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="(99) 99999-9999"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Senha Provisória</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="password"
                                        required={!newOwner.email} // Only required if new user logic implies it, but here we require it for simplicity
                                        value={newOwner.password}
                                        onChange={e => setNewOwner({...newOwner, password: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsLinkOwnerModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                                <button type="submit" disabled={linking} className="flex-1 py-3 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-bold transition-colors">
                                    {linking ? 'Vinculando...' : 'Vincular Dono'}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
          {isEditModalOpen && editingShop && (
              <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setIsEditModalOpen(false)} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                >
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md pointer-events-auto shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Editar Barbearia</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleUpdateShop} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                                <input 
                                    required
                                    value={editingShop.name}
                                    onChange={e => setEditingShop({...editingShop, name: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white focus:border-[#7C3AED] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Slug (URL)</label>
                                <input 
                                    required
                                    value={editingShop.slug}
                                    onChange={e => setEditingShop({...editingShop, slug: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white focus:border-[#7C3AED] outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Telefone da Barbearia</label>
                                <input 
                                    value={editingShop.phone}
                                    onChange={e => setEditingShop({...editingShop, phone: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-xl py-2 px-4 text-white focus:border-[#7C3AED] outline-none"
                                    placeholder="(99) 99999-9999"
                                />
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                                <button type="submit" disabled={savingEdit} className="flex-1 py-3 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-black font-bold transition-colors">
                                    {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
          {isResetPasswordModalOpen && resetUser && (
              <>
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50" onClick={() => setIsResetPasswordModalOpen(false)} />
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                >
                    <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-sm pointer-events-auto shadow-2xl">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Alterar Senha</h2>
                            <button onClick={() => setIsResetPasswordModalOpen(false)} className="text-gray-400 hover:text-white"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <p className="text-sm text-gray-400">Definindo nova senha para: <span className="text-white font-bold">{resetUser.name}</span></p>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Nova Senha</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input 
                                        type="password"
                                        required
                                        minLength={6}
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-white focus:border-[#7C3AED] outline-none"
                                        placeholder="Mínimo 6 caracteres"
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsResetPasswordModalOpen(false)} className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors">Cancelar</button>
                                <button type="submit" disabled={resetting} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold transition-colors">
                                    {resetting ? 'Alterando...' : 'Confirmar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </motion.div>
              </>
          )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Gerenciar Barbearias</h1>
        <div className="flex gap-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#7C3AED] outline-none w-64"
                />
            </div>
            <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#2DD4BF] text-black font-bold px-4 py-2 rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
                <Plus className="w-5 h-5" /> Nova Barbearia
            </button>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredTenants.map((tenant) => (
            <GlassCard key={tenant.id} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-white">{tenant.name}</h3>
                        <a 
                            href={`/${tenant.slug}`} 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-[#2DD4BF] transition-colors"
                            title="Ver Barbearia"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                            tenant.subscription_status === 'suspended' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                            {tenant.subscription_status || 'Active'}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30">
                            {tenant.subscription_plan || 'TRIAL'}
                        </span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                        Dono: <span className="text-white">{tenant.owner?.nome || 'N/A'}</span> ({tenant.owner?.email || 'Sem email'})
                    </p>
                    <p className="text-gray-500 text-xs mt-1 flex items-center gap-2">
                        <span>Expira em: {tenant.subscription_end_date ? new Date(tenant.subscription_end_date).toLocaleDateString() : 'Indefinido'}</span>
                        <span className="text-white/20">|</span>
                        <span className="text-gray-400">URL: /{tenant.slug}</span>
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {!tenant.owner_id && (
                        <button 
                            onClick={() => openLinkModal(tenant)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#7C3AED]/20 hover:bg-[#7C3AED]/30 text-[#7C3AED] border border-[#7C3AED]/50 transition-colors text-sm font-bold"
                            title="Vincular Dono"
                        >
                            <LinkIcon className="w-4 h-4" />
                            Vincular Dono
                        </button>
                    )}

                    <button 
                        onClick={() => openEditModal(tenant)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors text-sm"
                        title="Editar Informações"
                    >
                        <Edit className="w-4 h-4" />
                        Editar
                    </button>

                    <button 
                        onClick={() => openResetPasswordModal(tenant)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-yellow-400 transition-colors text-sm"
                        title="Resetar Senha"
                    >
                        <Lock className="w-4 h-4" />
                    </button>

                    <button 
                        onClick={() => handleExtendTrial(tenant.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 transition-colors text-sm"
                        title="Estender Trial (+15 dias)"
                    >
                        <Clock className="w-4 h-4" />
                        Estender
                    </button>
                    
                    <button 
                        onClick={() => handleSuspend(tenant.id, tenant.subscription_status)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-bold ${
                            tenant.subscription_status === 'suspended' 
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                    >
                        <Ban className="w-4 h-4" />
                        {tenant.subscription_status === 'suspended' ? 'Reativar' : 'Suspender'}
                    </button>
                </div>
            </GlassCard>
        ))}

        {filteredTenants.length === 0 && (
            <div className="text-center py-12 text-gray-500">
                Nenhuma barbearia encontrada.
            </div>
        )}
      </div>
    </div>
  );
}
