import React, { useState } from 'react';
import { Appointment } from '../../types/appointments';
import { appointmentsService } from '../../services/appointments';
import { format, parseISO } from 'date-fns';
import { X, Calendar, Clock, User, Scissors, Check, AlertTriangle } from 'lucide-react';

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

  const startTime = parseISO(appointment.starts_at);
  const endTime = parseISO(appointment.ends_at);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Detalhes do Agendamento</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          <div className="flex justify-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium
              ${appointment.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                appointment.status === 'cancelled' ? 'bg-red-100 text-red-800' : 
                appointment.status === 'completed' ? 'bg-gray-100 text-gray-800' : 
                'bg-blue-100 text-blue-800'}`}>
              {appointment.status === 'scheduled' ? 'Agendado' : 
               appointment.status === 'confirmed' ? 'Confirmado' : 
               appointment.status === 'cancelled' ? 'Cancelado' : 
               appointment.status === 'completed' ? 'Concluído' : appointment.status}
            </span>
          </div>

          {/* Info Grid */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {format(startTime, 'dd/MM/yyyy')}
                </p>
                <p className="text-sm text-gray-500">
                  {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {appointment.client?.full_name || appointment.client_name || 'Cliente sem nome'}
                </p>
                <p className="text-sm text-gray-500">
                  {appointment.client?.phone || appointment.client_phone || '-'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Scissors className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {appointment.service?.nome || appointment.service_name}
                </p>
                <p className="text-sm text-gray-500">
                  {appointment.barber?.nome || 'Barbeiro não identificado'}
                </p>
              </div>
            </div>

            {appointment.cancel_reason && (
               <div className="flex items-start gap-3 p-3 bg-red-50 rounded-md">
                 <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                 <div>
                   <p className="text-sm font-medium text-red-800">Motivo do Cancelamento</p>
                   <p className="text-sm text-red-600">{appointment.cancel_reason}</p>
                 </div>
               </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t pt-4">
            {showCancelInput ? (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Motivo do cancelamento</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm"
                  rows={3}
                  placeholder="Ex: Cliente desistiu..."
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setShowCancelInput(false)}
                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="px-3 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-md"
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
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Check className="w-4 h-4" /> Confirmar
                    </button>
                    <button
                      onClick={() => setShowCancelInput(true)}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50"
                    >
                      Cancelar
                    </button>
                  </>
                )}
                
                {appointment.status === 'confirmed' && (
                  <>
                    <button
                      onClick={() => handleStatusChange('completed')}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                      Concluir
                    </button>
                    <button
                      onClick={() => handleStatusChange('no_show')}
                      disabled={loading}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Não Compareceu
                    </button>
                  </>
                )}

                {(appointment.status === 'cancelled' || appointment.status === 'completed' || appointment.status === 'no_show') && (
                  <p className="col-span-2 text-center text-sm text-gray-500 italic">
                    Nenhuma ação disponível
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
