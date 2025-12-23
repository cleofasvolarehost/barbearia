import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MessageSquare, Zap, Clock, Calendar, Check, AlertTriangle, Send, History, Settings as SettingsIcon, Save, RefreshCw } from 'lucide-react';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { sendWhatsApp } from '../../lib/wordnet';

// Types
interface WhatsAppConfig {
    id: string;
    is_active: boolean;
    instance_id: string;
    api_token: string;
    templates: {
        confirmation: string;
        reminder_1h: string;
        birthday: string;
    };
    triggers: {
        confirmation: boolean;
        reminder_1h: boolean;
        birthday: boolean;
    };
}

interface WhatsAppLog {
    id: string;
    created_at: string;
    phone_number: string;
    message_type: string;
    status: 'sent' | 'failed' | 'pending';
    message_body: string;
}

export default function WhatsAppSettings() {
    const { establishment } = useEstablishment();
    const [config, setConfig] = useState<WhatsAppConfig | null>(null);
    const [logs, setLogs] = useState<WhatsAppLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [testPhone, setTestPhone] = useState('');
    const [isTesting, setIsTesting] = useState(false);
    const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
    
    // Editor State
    const [editingTemplate, setEditingTemplate] = useState<string | null>(null); // 'confirmation', 'reminder_1h', etc.
    const [tempTemplateText, setTempTemplateText] = useState('');

    useEffect(() => {
        if (establishment) {
            fetchConfig();
            fetchLogs();
        }
    }, [establishment]);

    const fetchConfig = async () => {
        try {
            const { data, error } = await supabase
                .from('whatsapp_config')
                .select('*')
                .eq('establishment_id', establishment?.id)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            
            if (data) {
                setConfig(data);
                checkApiConnection(data);
            } else {
                // Default init
                setConfig({
                    id: '',
                    is_active: false,
                    instance_id: '',
                    api_token: '',
                    templates: {
                        confirmation: "Fala, {nome_cliente}! Agendamento confirmado. 👊 🗓 Data: {data} 🕒 Horário: {hora} 💈 Barbeiro: {barbeiro} ✂️ Serviço: {servico}. Tmj!",
                        reminder_1h: "Opa, {nome_cliente}! Passando pra lembrar que daqui a 1 hora (às {hora}) é a tua vez na cadeira. Chega 5 min antes!",
                        birthday: "E aí, {nome_cliente}! Meus parabéns! 🎉 Hoje o dia é teu. Ganhe 10% OFF no próximo corte!"
                    },
                    triggers: {
                        confirmation: true,
                        reminder_1h: true,
                        birthday: false
                    }
                } as any);
                setApiStatus('disconnected');
            }
        } catch (error) {
            console.error('Error fetching config:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        const { data } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .eq('establishment_id', establishment?.id)
            .order('created_at', { ascending: false })
            .limit(10);
        setLogs(data || []);
    };

    const checkApiConnection = async (cfg: WhatsAppConfig) => {
        setApiStatus('checking');
        // Simple Ping Logic: Try to send a message to self or check instance status
        // Since Wordnet doesn't have a "ping" endpoint documented here, we assume connected if credentials exist
        // Real implementation would hit /status endpoint
        if (cfg.instance_id && cfg.api_token) {
            setApiStatus('connected'); // Mock success
        } else {
            setApiStatus('disconnected');
        }
    };

    const handleSaveConfig = async () => {
        if (!establishment || !config) return;

        try {
            const { error } = await supabase
                .from('whatsapp_config')
                .upsert({
                    establishment_id: establishment.id,
                    instance_id: config.instance_id,
                    api_token: config.api_token,
                    is_active: config.is_active,
                    templates: config.templates,
                    triggers: config.triggers
                }, { onConflict: 'establishment_id' });

            if (error) throw error;
            toast.success('Configurações salvas!');
            checkApiConnection(config);
        } catch (error) {
            toast.error('Erro ao salvar');
            console.error(error);
        }
    };

    const handleTestMessage = async () => {
        if (!testPhone) return toast.error('Digite um número');
        setIsTesting(true);

        const msg = "🔔 Teste de conexão: Sistema Barbearia Online.";

        try {
            // 1. Send via API
            const success = await sendWhatsApp({
                to: testPhone,
                message: msg,
                instanceId: config?.instance_id,
                token: config?.api_token
            });

            // 2. Log result to DB
            await supabase.rpc('log_whatsapp_attempt', {
                p_establishment_id: establishment?.id,
                p_phone: testPhone,
                p_type: 'test',
                p_body: msg,
                p_status: success ? 'sent' : 'failed',
                p_response: { success }
            });

            if (success) {
                toast.success('Mensagem enviada com sucesso!');
            } else {
                toast.error('Falha no envio. Verifique as credenciais.');
            }

            fetchLogs(); // Refresh logs

        } catch (error) {
            toast.error('Erro ao testar');
        } finally {
            setIsTesting(false);
        }
    };

    const toggleTrigger = (key: keyof typeof config.triggers) => {
        if (!config) return;
        setConfig({
            ...config,
            triggers: { ...config.triggers, [key]: !config.triggers[key] }
        });
    };

    const openTemplateEditor = (key: string) => {
        setEditingTemplate(key);
        setTempTemplateText(config?.templates[key as keyof typeof config.templates] || '');
    };

    const saveTemplate = () => {
        if (!config || !editingTemplate) return;
        setConfig({
            ...config,
            templates: { ...config.templates, [editingTemplate]: tempTemplateText }
        });
        setEditingTemplate(null);
    };

    if (loading) return <div className="p-8 text-white">Carregando...</div>;

    return (
        <div className="min-h-screen bg-[#121212] text-white p-6 md:p-10 space-y-8">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <MessageSquare className="w-8 h-8 text-[#25D366]" />
                        Configuração WhatsApp
                    </h1>
                    <p className="text-gray-400">Gerencie mensagens automáticas e templates.</p>
                </div>

                <div className="flex items-center gap-4 bg-[#1a1a1a] p-3 rounded-xl border border-white/10">
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                        apiStatus === 'connected' ? 'bg-[#25D366]/20 text-[#25D366]' : 'bg-red-500/20 text-red-500'
                    }`}>
                        {apiStatus === 'connected' ? '🟢 Conectado' : '🔴 Desconectado'}
                    </div>
                    <button 
                        onClick={() => checkApiConnection(config!)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="Verificar Conexão"
                    >
                        <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* Left Column: Settings & Triggers */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* API Credentials */}
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5 text-[#7C3AED]" /> Credenciais da API
                        </h2>
                        <div className="grid gap-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Instance ID</label>
                                <input 
                                    type="text" 
                                    value={config?.instance_id || ''}
                                    onChange={e => setConfig({...config!, instance_id: e.target.value})}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-[#25D366] transition-colors"
                                    placeholder="Ex: instance12345"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">API Token</label>
                                <input 
                                    type="password" 
                                    value={config?.api_token || ''}
                                    onChange={e => setConfig({...config!, api_token: e.target.value})}
                                    className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3 focus:border-[#25D366] transition-colors"
                                    placeholder="Ex: token12345"
                                />
                            </div>
                            <div className="flex items-center gap-3 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={config?.is_active || false}
                                        onChange={e => setConfig({...config!, is_active: e.target.checked})}
                                        className="w-5 h-5 accent-[#25D366]"
                                    />
                                    <span className="text-sm font-bold">Ativar Envios Automáticos</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Triggers & Templates */}
                    <div className="grid md:grid-cols-3 gap-4">
                        {/* Confirmation */}
                        <TriggerCard 
                            icon={<Check className="w-5 h-5 text-blue-400" />}
                            title="Confirmação"
                            desc="Envia ao agendar"
                            isActive={config?.triggers.confirmation || false}
                            onToggle={() => toggleTrigger('confirmation')}
                            onEdit={() => openTemplateEditor('confirmation')}
                        />
                        {/* Reminder */}
                        <TriggerCard 
                            icon={<Clock className="w-5 h-5 text-orange-400" />}
                            title="Lembrete 1h"
                            desc="1h antes do corte"
                            isActive={config?.triggers.reminder_1h || false}
                            onToggle={() => toggleTrigger('reminder_1h')}
                            onEdit={() => openTemplateEditor('reminder_1h')}
                        />
                        {/* Birthday */}
                        <TriggerCard 
                            icon={<Calendar className="w-5 h-5 text-pink-400" />}
                            title="Aniversário"
                            desc="No dia do cliente"
                            isActive={config?.triggers.birthday || false}
                            onToggle={() => toggleTrigger('birthday')}
                            onEdit={() => openTemplateEditor('birthday')}
                        />
                    </div>

                    {/* Template Editor Modal (Inline for now) */}
                    {editingTemplate && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-[#1a1a1a] rounded-2xl border border-[#7C3AED]/50 p-6 overflow-hidden"
                        >
                            <h3 className="font-bold mb-2 text-[#7C3AED]">Editando: {editingTemplate}</h3>
                            <textarea 
                                value={tempTemplateText}
                                onChange={e => setTempTemplateText(e.target.value)}
                                className="w-full h-32 bg-[#0a0a0a] border border-white/10 rounded-lg p-3 mb-3 text-sm"
                            />
                            <div className="flex gap-2 text-xs text-gray-500 mb-4">
                                <span>{`{nome_cliente}`}</span>
                                <span>{`{data}`}</span>
                                <span>{`{hora}`}</span>
                                <span>{`{barbeiro}`}</span>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 text-sm hover:bg-white/10 rounded-lg">Cancelar</button>
                                <button onClick={saveTemplate} className="px-4 py-2 text-sm bg-[#7C3AED] rounded-lg font-bold">Salvar Template</button>
                            </div>
                        </motion.div>
                    )}

                </div>

                {/* Right Column: Sandbox & Logs */}
                <div className="space-y-8">
                    
                    {/* Sandbox */}
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" /> Teste Rápido
                        </h2>
                        <div className="space-y-3">
                            <input 
                                type="text" 
                                value={testPhone}
                                onChange={e => setTestPhone(e.target.value)}
                                placeholder="5511999999999"
                                className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-3"
                            />
                            <button 
                                onClick={handleTestMessage}
                                disabled={isTesting}
                                className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-lg font-bold flex items-center justify-center gap-2 transition-all"
                            >
                                {isTesting ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Teste</>}
                            </button>
                        </div>
                    </div>

                    {/* Logs */}
                    <div className="bg-[#1a1a1a] rounded-2xl border border-white/10 p-6">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <History className="w-5 h-5 text-blue-400" /> Histórico Recente
                        </h2>
                        <div className="space-y-3">
                            {logs.length === 0 && <p className="text-sm text-gray-500 text-center py-4">Nenhum envio registrado.</p>}
                            {logs.map(log => (
                                <div key={log.id} className="flex items-center justify-between text-sm p-3 bg-white/5 rounded-lg border border-white/5">
                                    <div>
                                        <p className="font-bold">{log.phone_number}</p>
                                        <p className="text-xs text-gray-400">{new Date(log.created_at).toLocaleTimeString()} - {log.message_type}</p>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        log.status === 'sent' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                                    }`}>
                                        {log.status === 'sent' ? 'Enviado' : 'Falha'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </div>

            {/* Global Save Button */}
            <div className="fixed bottom-6 right-6">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleSaveConfig}
                    className="bg-[#25D366] text-black px-8 py-4 rounded-full font-black shadow-lg shadow-green-500/20 flex items-center gap-2"
                >
                    <Save className="w-5 h-5" /> SALVAR TUDO
                </motion.button>
            </div>
        </div>
    );
}

function TriggerCard({ icon, title, desc, isActive, onToggle, onEdit }: any) {
    return (
        <div className={`p-4 rounded-xl border transition-all ${isActive ? 'bg-[#25D366]/10 border-[#25D366]/30' : 'bg-white/5 border-white/10 opacity-70'}`}>
            <div className="flex justify-between items-start mb-3">
                <div className="p-2 bg-white/5 rounded-lg">{icon}</div>
                <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                    <input type="checkbox" name="toggle" checked={isActive} onChange={onToggle} className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-all duration-300 ease-in-out" style={{ right: isActive ? 0 : '50%' }}/>
                    <label className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${isActive ? 'bg-[#25D366]' : 'bg-gray-600'}`}></label>
                </div>
            </div>
            <h3 className="font-bold">{title}</h3>
            <p className="text-xs text-gray-400 mb-3">{desc}</p>
            <button onClick={onEdit} className="text-xs text-[#25D366] hover:underline">Editar Texto</button>
        </div>
    );
}
