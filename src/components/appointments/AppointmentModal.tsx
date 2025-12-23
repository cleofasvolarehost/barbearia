import React, { useState } from 'react';
import { Appointment } from '../../types/appointments';
import { appointmentsService } from '../../services/appointments';
import { format, parseISO } from 'date-fns';
import { X, Calendar, Clock, User, Scissors, Check, AlertTriangle, Trash2 } from 'lucide-react';

interface AppointmentModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function AppointmentModal({ appointment, isOpen, onClose, onUpdate }: AppointmentModalProps) {
  const [loading, setLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelInput, setShowCancelInput] = useState(false);

  if (!isOpen || !appointment) return null;

  const handleStatusChange = async (status: string) => {
    setLoading(true);
    try {
      await appointmentsService.updateAppointment(appointment.id, { status: status as any });
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar status');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor, informe o motivo do cancelamento.');
      return;
    }
    setLoading(true);
    try {
      await appointmentsService.cancelAppointment(appointment.id, cancelReason);
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao cancelar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja EXCLUIR este agendamento permanentemente?')) return;
    setLoading(true);
    try {
      await appointmentsService.deleteAppointment(appointment.id);
      onUpdate();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Erro ao excluir agendamento');
    } finally {
      setLoading(false);
    }
  };

  const startTime = parseISO(appointment.starts_at);
  const endTime = parseISO(appointment.ends_at);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#1E1E1E] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-white/10 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-bold text-white">Detalhes do Agendamento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border
              ${appointment.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                appointment.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                appointment.status === 'completed' ? 'bg-gray-500/10 text-gray-400 border-gray-500/20' : 
                'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
              {appointment.status === 'scheduled' ? 'Agendado' : 
               appointment.status === 'confirmed' ? 'Confirmado' : 
               appointment.status === 'cancelled' ? 'Cancelado' : 
               appointment.status === 'completed' ? 'Concluído' : appointment.status}
            </span>
          </div>

          {/* Info Grid */}
          <div className="space-y-4 bg-black/20 p-4 rounded-xl border border-white/5">
            <div className="flex items-start gap-4">
              <Clock className="w-5 h-5 text-[#7C3AED] mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">
                  {format(startTime, 'dd/MM/yyyy')}
                </p>
                <p className="text-sm text-gray-400">
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <User className="w-5 h-5 text-[#7C3AED] mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">
                  {appointment.client?.full_name || appointment.client_name || 'Cliente sem nome'}
                </p>
                <p className="text-sm text-gray-400">
                  {appointment.client?.phone || appointment.client_phone || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Scissors className="w-5 h-5 text-[#7C3AED] mt-0.5" />
              <div>
                <p className="text-sm font-bold text-white">
                  {appointment.service?.nome || appointment.service_name}
                </p>
                <p className="text-sm text-gray-400">
                  {appointment.barber?.nome || 'Barbeiro não identificado'}
                </p>
              </div>
            </div>

            {appointment.cancel_reason && (
               <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg mt-2">
                 <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                 <div>
                   <p className="text-sm font-bold text-red-400">Motivo do Cancelamento</p>
                   <p className="text-sm text-red-300/80">{appointment.cancel_reason}</p>
                 </div>
               </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2">
            {showCancelInput ? (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
                <label className="block text-sm font-medium text-gray-300">Motivo do cancelamento</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-xl bg-black/20 border border-white/10 text-white shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-3 placeholder-gray-600"
                  rows={3}
                  placeholder="Ex: Cliente desistiu..."
                  autoFocus
                />
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setShowCancelInput(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-lg shadow-red-600/20"
                  >
                    Confirmar Cancelamento
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {appointment.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('confirmed')}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#10B981] text-white rounded-xl hover:bg-[#059669] font-bold transition-all shadow-lg shadow-[#10B981]/20"
                    >
                      <Check className="w-5 h-5" /> Confirmar
                    </button>
                    <button
                      onClick={() => setShowCancelInput(true)}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/10 font-bold transition-all"
                    >
                      <X className="w-5 h-5" /> Cancelar
                    </button>
                  </>
                )}
                
                {appointment.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('completed')}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] font-bold transition-all shadow-lg shadow-[#7C3AED]/20"
                    >
                      <Check className="w-5 h-5" /> Concluir
                    </button>
                    <button
                      onClick={() => handleStatusChange('no_show')}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 text-gray-300 rounded-xl hover:bg-white/10 font-bold transition-all"
                    >
                      Não Compareceu
                    </button>
                  </>
                )}

                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 font-bold transition-all mt-2"
                >
                  <Trash2 className="w-5 h-5" /> Excluir Permanentemente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
