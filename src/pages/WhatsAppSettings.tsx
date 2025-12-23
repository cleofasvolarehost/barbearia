import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, MessageSquare, Save, Smartphone, CheckCircle2, Key, ShieldCheck, Wand2 } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { useEstablishment } from '../contexts/EstablishmentContext';
import { sendWhatsApp } from '../lib/wordnet';
import { generateAIResponse } from '../lib/openai';

export default function WhatsAppSettings() {
  const { user } = useAuth();
  const { establishment, refreshEstablishment, loading: establishmentLoading } = useEstablishment();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Wordnet Config State
  const [config, setConfig] = useState({
    instance_id: '',
    api_token: '',
    is_active: false
  });

  const [templates, setTemplates] = useState({
    reminder: 'Olá {nome}, seu agendamento é amanhã às {horario}. Confirmado?',
    rescue: 'Oi {nome}, sumiu! Ganhe 10% OFF voltando essa semana.',
    birthday: 'Parabéns {nome}! 🎂 Tem presente esperando por você aqui.',
  });

  // Fetch Settings
  useEffect(() => {
    if (establishment) {
        setConfig({
            instance_id: establishment.wordnet_instance_id || '',
            api_token: establishment.wordnet_token || '',
            is_active: !!establishment.wordnet_instance_id
        });

        if (establishment.whatsapp_templates) {
            // Merge defaults with saved to ensure all keys exist
            setTemplates(prev => ({ ...prev, ...establishment.whatsapp_templates }));
        }
        setLoading(false);
    }
  }, [establishment]);

  const [generating, setGenerating] = useState<string | null>(null);

  const handleGenerateTemplate = async (type: 'reminder' | 'rescue' | 'birthday') => {
    setGenerating(type);
    const prompts = {
      reminder: "Crie uma mensagem curta e amigável de lembrete de agendamento para barbearia. Use {nome} e {horario}. Inclua emojis. Não use aspas.",
      rescue: "Crie uma mensagem curta de 'saudades' para cliente que não vem há tempo na barbearia. Ofereça desconto. Use {nome}. Inclua emojis. Não use aspas.",
      birthday: "Crie uma mensagem curta de feliz aniversário para cliente da barbearia. Use {nome}. Inclua emojis. Não use aspas."
    };

    try {
      const response = await generateAIResponse(prompts[type]);
      if (response) {
        // Clean up quotes if AI adds them
        const cleanResponse = response.replace(/^["']|["']$/g, '');
        setTemplates(prev => ({ ...prev, [type]: cleanResponse }));
        toast.success('Template gerado com IA!');
      } else {
        toast.error('Erro ao gerar com IA. Verifique a API Key.');
      }
    } catch (error) {
      toast.error('Erro ao conectar com IA.');
    } finally {
      setGenerating(null);
    }
  };

  const handleSave = async () => {
    if (!establishment) return;
    setSaving(true);

    try {
        const { error } = await supabase
            .from('establishments')
            .update({ 
                wordnet_instance_id: config.instance_id,
                wordnet_token: config.api_token,
                whatsapp_templates: templates
            })
            .eq('id', establishment.id);

        if (error) throw error;
        toast.success('Configurações salvas!');
        
        await refreshEstablishment();
        
        // Test Message (Optional)
        if (config.instance_id && config.api_token) {
            setConfig(prev => ({ ...prev, is_active: true }));
        }

    } catch (error) {
        toast.error('Erro ao salvar');
        console.error(error);
    } finally {
        setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!config.instance_id || !config.api_token) {
        toast.error('Preencha as credenciais primeiro');
        return;
    }

    let phoneToTest = establishment?.phone?.replace(/\D/g, '');
    
    // Fallback if no phone on establishment or user wants to specify
    const userInputPhone = window.prompt("Digite o número para teste (com DDD):", phoneToTest || '55');
    
    if (!userInputPhone) return;
    
    phoneToTest = userInputPhone.replace(/\D/g, '');
    if (phoneToTest.length < 10) {
        toast.error('Número inválido');
        return;
    }

    const loadingToast = toast.loading('Enviando mensagem de teste...');
    
    try {
        const success = await sendWhatsApp({
            to: phoneToTest,
            message: 'Teste de Conexão CyberSalon: Integração Operacional! 🚀',
            instanceId: config.instance_id,
            token: config.api_token
        });

        toast.dismiss(loadingToast);
        
        if (success) {
            toast.success('Mensagem enviada com sucesso! API Conectada.');
        } else {
            toast.error('Falha no envio. Verifique Instance ID e Token.');
        }
    } catch (err) {
        toast.dismiss(loadingToast);
        toast.error('Erro de conexão.');
    }
  };

  if (establishmentLoading || (loading && establishment)) return <div className="p-8 text-white text-center">Carregando configurações...</div>;

  if (!establishment) return (
      <div className="p-8 text-white flex flex-col items-center justify-center h-full">
          <p className="mb-4">Nenhuma barbearia configurada.</p>
          <a href="/admin/setup" className="px-4 py-2 bg-[#7C3AED] rounded-lg text-white font-bold">
              Configurar Agora
          </a>
      </div>
  );

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 pb-24 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <MessageSquare className="w-8 h-8 text-[#25D366]" />
          Integração WhatsApp (API)
        </h1>
        <p className="text-white/60">Conecte sua instância Wordnet/Hipersend para automação.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* API Credentials */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Key className="w-5 h-5 text-[#2DD4BF]" />
            Credenciais da API
          </h2>
          
          <div className="space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Instance ID (u)</label>
                <input
                    type="text"
                    value={config.instance_id}
                    onChange={(e) => setConfig({...config, instance_id: e.target.value})}
                    placeholder="Ex: i-123456789"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-[#25D366] outline-none font-mono"
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">API Token (p)</label>
                <div className="relative">
                    <input
                        type="password"
                        value={config.api_token}
                        onChange={(e) => setConfig({...config, api_token: e.target.value})}
                        placeholder="••••••••••••••••"
                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-[#25D366] outline-none font-mono"
                    />
                    <ShieldCheck className="absolute right-3 top-3 w-5 h-5 text-gray-500" />
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    onClick={handleTestConnection}
                    className="flex-1 py-3 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all"
                >
                    Testar Conexão
                </button>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-black font-bold transition-all flex items-center justify-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Salvando...' : 'Salvar Config'}
                </button>
            </div>
          </div>
        </GlassCard>

        {/* Message Templates */}
        <GlassCard className="p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#7C3AED]" />
            Modelos de Mensagem
          </h2>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-400 uppercase">Lembrete de Agendamento</label>
                <button 
                  onClick={() => handleGenerateTemplate('reminder')}
                  disabled={!!generating}
                  className="text-xs flex items-center gap-1 text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  {generating === 'reminder' ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>
              <textarea
                value={templates.reminder}
                onChange={(e) => setTemplates({...templates, reminder: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#25D366] outline-none h-24 resize-none"
              />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-400 uppercase">Resgate de Clientes (Sumidos)</label>
                <button 
                  onClick={() => handleGenerateTemplate('rescue')}
                  disabled={!!generating}
                  className="text-xs flex items-center gap-1 text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  {generating === 'rescue' ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>
              <textarea
                value={templates.rescue}
                onChange={(e) => setTemplates({...templates, rescue: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#25D366] outline-none h-24 resize-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-gray-400 uppercase">Aniversariante</label>
                <button 
                  onClick={() => handleGenerateTemplate('birthday')}
                  disabled={!!generating}
                  className="text-xs flex items-center gap-1 text-[#7C3AED] hover:text-[#6D28D9] disabled:opacity-50 transition-colors"
                >
                  <Wand2 className="w-3 h-3" />
                  {generating === 'birthday' ? 'Gerando...' : 'Gerar com IA'}
                </button>
              </div>
              <textarea
                value={templates.birthday}
                onChange={(e) => setTemplates({...templates, birthday: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-[#25D366] outline-none h-24 resize-none"
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
