import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface BlockTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  barbers: any[];
  currentUser: any;
}

export function BlockTimeModal({ isOpen, onClose, onSuccess, barbers, currentUser }: BlockTimeModalProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'custom_slot' | 'full_day'>('custom_slot');
  const [selectedBarber, setSelectedBarber] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [reason, setReason] = useState('');

  // Auto-select barber if only one (or if user is barber)
  useEffect(() => {
    if (barbers.length === 1) {
      setSelectedBarber(barbers[0].id);
    }
  }, [barbers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBarber || !date) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      // Calculate timestamps
      let startTimestamp, endTimestamp;

      if (type === 'full_day') {
        startTimestamp = `${date}T00:00:00`;
        endTimestamp = `${date}T23:59:59`;
      } else {
        if (!startTime || !endTime) {
            toast.error('Defina o horário de início e fim');
            setLoading(false);
            return;
        }
        startTimestamp = `${date}T${startTime}:00`;
        endTimestamp = `${date}T${endTime}:00`;

        if (startTimestamp >= endTimestamp) {
            toast.error('O horário final deve ser maior que o inicial');
            setLoading(false);
            return;
        }
      }

      // Check for conflicts (Warning)
      const { count } = await supabase
        .from('agendamentos')
        .select('*', { count: 'exact', head: true })
        .eq('barbeiro_id', selectedBarber)
        .eq('data', date)
        .neq('status', 'cancelado')
        .gte('horario', type === 'full_day' ? '00:00' : startTime)
        .lte('horario', type === 'full_day' ? '23:59' : endTime);

      if (count && count > 0) {
        const confirm = window.confirm(`Existem ${count} agendamentos neste período. Deseja bloquear mesmo assim? (Isso não cancela os agendamentos automaticamente)`);
        if (!confirm) {
            setLoading(false);
            return;
        }
      }

      // Get establishment_id
      const { data: barberData } = await supabase
        .from('barbeiros')
        .select('establishment_id')
        .eq('id', selectedBarber)
        .single();

      if (!barberData) throw new Error('Barbeiro não encontrado');

      // Create Override
      const { error } = await supabase.from('schedule_overrides').insert({
        barber_id: selectedBarber,
        establishment_id: barberData.establishment_id,
        start_time: startTimestamp,
        end_time: endTimestamp,
        reason: reason || (type === 'full_day' ? 'Dia Bloqueado' : 'Horário Bloqueado'),
        type
      });

      if (error) throw error;

      toast.success('Bloqueio realizado com sucesso!');
      onSuccess();
      onClose();
      
      // Reset form
      setReason('');
      setStartTime('');
      setEndTime('');
    } catch (error: any) {
      console.error(error);
      toast.error('Erro ao bloquear horário: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full rounded-2xl bg-[#1A1A1A] p-6 shadow-xl border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Bloquear Horário
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Barber Selection */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Profissional</label>
              <select
                value={selectedBarber}
                onChange={e => setSelectedBarber(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
              >
                <option value="">Selecione...</option>
                {barbers.map(b => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                ))}
              </select>
            </div>

            {/* Type Selection */}
            <div className="flex gap-4 p-1 bg-white/5 rounded-xl">
                <button
                    type="button"
                    onClick={() => setType('custom_slot')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === 'custom_slot' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Horário Específico
                </button>
                <button
                    type="button"
                    onClick={() => setType('full_day')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${type === 'full_day' ? 'bg-orange-500 text-white' : 'text-gray-400 hover:text-white'}`}
                >
                    Dia Inteiro
                </button>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:border-orange-500 outline-none"
                  required
                />
              </div>
            </div>

            {/* Time Range */}
            {type === 'custom_slot' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Início</label>
                        <input 
                            type="time"
                            value={startTime}
                            onChange={e => setStartTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">Fim</label>
                        <input 
                            type="time"
                            value={endTime}
                            onChange={e => setEndTime(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
                        />
                    </div>
                </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">Motivo (Opcional)</label>
              <input 
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Ex: Médico, Almoço, Folga"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              {loading ? 'Salvando...' : 'Confirmar Bloqueio'}
            </button>

          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
