import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface SubscriptionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscription: any;
  onUpdate: () => void;
}

export function SubscriptionEditModal({ isOpen, onClose, subscription, onUpdate }: SubscriptionEditModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    status: '',
    plan: '',
    endDate: ''
  });

  useEffect(() => {
    if (subscription) {
      setFormData({
        status: subscription.subscription_status || 'active',
        plan: subscription.subscription_plan || 'trial',
        endDate: subscription.subscription_end_date ? new Date(subscription.subscription_end_date).toISOString().split('T')[0] : ''
      });
    }
  }, [subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscription) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('establishments')
        .update({
          subscription_status: formData.status,
          subscription_plan: formData.plan,
          subscription_end_date: formData.endDate ? new Date(formData.endDate).toISOString() : null
        })
        .eq('id', subscription.id);

      if (error) throw error;

      toast.success('Assinatura atualizada com sucesso!');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Erro ao atualizar assinatura');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1E1E1E] rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#7C3AED]" />
            Editar Assinatura
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Info Banner */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg mb-4">
            <p className="text-sm text-blue-400">
              Editando: <span className="font-bold text-white">{subscription?.name}</span>
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7C3AED] focus:outline-none transition-colors"
            >
              <option value="active">Ativa (Active)</option>
              <option value="trialing">Trial (Trialing)</option>
              <option value="past_due">Atrasada (Past Due)</option>
              <option value="canceled">Cancelada (Canceled)</option>
              <option value="suspended">Suspensa (Suspended)</option>
            </select>
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Plano</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7C3AED] focus:outline-none transition-colors"
            >
              <option value="Basic">Basic</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
              <option value="trial">Trial</option>
            </select>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Renova em / Expira em</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full bg-[#2A2A2A] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-[#7C3AED] focus:outline-none transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-medium text-gray-300 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl font-bold bg-[#7C3AED] text-white hover:bg-[#6D28D9] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Salvando...' : (
                <>
                  <Save className="w-4 h-4" />
                  Salvar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
