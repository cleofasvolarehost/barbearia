import React from 'react';
import { Appointment } from '../../types/appointments';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, User, Scissors, Calendar } from 'lucide-react';

export interface AppointmentsTableProps {
  appointments: Appointment[];
  loading: boolean;
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onView: (appointment: Appointment) => void;
}

const statusColors = {
  scheduled: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  confirmed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  no_show: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

const statusLabels = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não Compareceu',
};

export function AppointmentsTable({ appointments, loading, onView }: AppointmentsTableProps) {
  if (loading) {
    return (
        <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#7C3AED]"></div>
        </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="p-12 text-center text-gray-500 bg-[#1E1E1E] rounded-2xl border border-white/5 shadow-xl">
        <Calendar className="mx-auto h-16 w-16 text-gray-600 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">Nenhum agendamento encontrado</h3>
        <p className="text-sm text-gray-400">Tente ajustar os filtros ou crie um novo agendamento.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#1E1E1E] shadow-xl">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-white/[0.02]">
            <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Horário
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Cliente
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Serviço
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Barbeiro
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                Status
                </th>
                <th scope="col" className="relative px-6 py-4">
                <span className="sr-only">Ações</span>
                </th>
            </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
            {appointments.map((appointment) => {
                const clientName = appointment.client?.full_name || appointment.client_name || 'Cliente sem nome';
                const clientPhone = appointment.client?.phone || appointment.client_phone || '-';
                const serviceName = appointment.service?.nome || appointment.service_name || 'Serviço removido';
                const barberName = appointment.barber?.nome || 'Barbeiro removido';
                const startTime = parseISO(appointment.starts_at);
                const endTime = parseISO(appointment.ends_at);

                return (
                <tr 
                    key={appointment.id} 
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer group" 
                    onClick={() => onView(appointment)}
                >
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <Clock className="flex-shrink-0 h-4 w-4 text-[#7C3AED] mr-3" />
                        <div>
                            <div className="text-sm font-bold text-white">
                            {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                            {format(startTime, 'dd/MM/yyyy')}
                            </div>
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#2DD4BF] p-[1px] mr-3">
                            <div className="h-full w-full rounded-full bg-[#121212] flex items-center justify-center overflow-hidden">
                                {appointment.client?.avatar_url ? (
                                    <img src={appointment.client.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <User className="h-4 w-4 text-gray-400" />
                                )}
                            </div>
                        </div>
                        <div>
                        <div className="text-sm font-bold text-white">{clientName}</div>
                        <div className="text-xs text-gray-500">{clientPhone}</div>
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                        <Scissors className="flex-shrink-0 h-4 w-4 text-gray-500 mr-2 group-hover:text-[#2DD4BF] transition-colors" />
                        <div>
                            <div className="text-sm text-gray-300 font-medium">{serviceName}</div>
                            {appointment.service?.preco && (
                            <div className="text-xs text-[#2DD4BF] font-bold mt-0.5">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.service.preco)}
                            </div>
                            )}
                        </div>
                    </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-300">{barberName}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full border ${statusColors[appointment.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                        {statusLabels[appointment.status] || appointment.status}
                    </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => onView(appointment)}
                        className="text-[#7C3AED] hover:text-white font-bold transition-colors"
                    >
                        Editar
                    </button>
                    </td>
                </tr>
                );
            })}
            </tbody>
        </table>
      </div>
    </div>
  );
}
