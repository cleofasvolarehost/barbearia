import React from 'react';
import { Appointment } from '../../types/appointments';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Calendar, Clock, User, Scissors, Check, X, AlertCircle } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger 
} from '@radix-ui/react-dropdown-menu'; // Assuming installed or I'll use standard UI if not confident on imports
// Actually, I'll use standard HTML/Tailwind for dropdowns if I don't see the component file
// But package.json has @radix-ui/react-dropdown-menu.
// Usually these are wrapped in src/components/ui/dropdown-menu.tsx.
// Let's check if src/components/ui exists.

export interface AppointmentsTableProps {
  appointments: Appointment[];
  loading: boolean;
  onEdit: (appointment: Appointment) => void;
  onCancel: (appointment: Appointment) => void;
  onView: (appointment: Appointment) => void;
}

const statusColors = {
  scheduled: 'bg-blue-100 text-blue-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-gray-100 text-gray-800',
  no_show: 'bg-yellow-100 text-yellow-800',
};

const statusLabels = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Concluído',
  no_show: 'Não Compareceu',
};

export function AppointmentsTable({ appointments, loading, onEdit, onCancel, onView }: AppointmentsTableProps) {
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando agendamentos...</div>;
  }

  if (appointments.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 bg-white rounded-lg border border-gray-200">
        <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Nenhum agendamento encontrado</h3>
        <p className="mt-1 text-sm text-gray-500">Tente ajustar os filtros ou crie um novo agendamento.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Horário
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Cliente
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Serviço
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Barbeiro
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {appointments.map((appointment) => {
             const clientName = appointment.client?.full_name || appointment.client_name || 'Cliente sem nome';
             const clientPhone = appointment.client?.phone || appointment.client_phone || '-';
             const serviceName = appointment.service?.nome || appointment.service_name || 'Serviço removido';
             const barberName = appointment.barber?.nome || 'Barbeiro removido';
             const startTime = parseISO(appointment.starts_at);
             const endTime = parseISO(appointment.ends_at);

            return (
              <tr key={appointment.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onView(appointment)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Clock className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm font-medium text-gray-900">
                      {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {format(startTime, 'dd/MM/yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                      {appointment.client?.avatar_url ? (
                        <img src={appointment.client.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{clientName}</div>
                      <div className="text-sm text-gray-500">{clientPhone}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Scissors className="flex-shrink-0 h-4 w-4 text-gray-400 mr-2" />
                    <div className="text-sm text-gray-900">{serviceName}</div>
                  </div>
                  {appointment.service?.preco && (
                    <div className="text-xs text-gray-500 mt-1">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.service.preco)}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{barberName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[appointment.status] || 'bg-gray-100 text-gray-800'}`}>
                    {statusLabels[appointment.status] || appointment.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => onView(appointment)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Ver
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
