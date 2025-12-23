import React, { useState, useEffect } from 'react';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { appointmentsService } from '../../services/appointments';
import { Appointment, AppointmentFilters, AppointmentStatus } from '../../types/appointments';
import { AppointmentsTable } from '../../components/appointments/AppointmentsTable';
import { CreateAppointmentModal } from '../../components/appointments/CreateAppointmentModal';
import { AppointmentModal } from '../../components/appointments/AppointmentModal';
import { Plus, Filter, Calendar as CalendarIcon, List as ListIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from 'date-fns';

export default function AdminAppointmentsPage() {
  const { establishment } = useEstablishment();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Details Modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Filters & Pagination
  const [filters, setFilters] = useState<AppointmentFilters>({
    dateRange: { 
      start: startOfDay(new Date()).toISOString(), 
      end: endOfDay(new Date()).toISOString() 
    },
    status: undefined,
    search: '',
    page: 1,
    limit: 10
  });
  const [totalCount, setTotalCount] = useState(0);

  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'tomorrow' | 'week'>('today');

  useEffect(() => {
    if (establishment?.id) {
      fetchAppointments();
    }
  }, [establishment?.id, filters]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const { data, count } = await appointmentsService.listAppointments(filters);
      setAppointments(data);
      if (count !== null) setTotalCount(count);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (mode: 'today' | 'tomorrow' | 'week') => {
    setDateFilterMode(mode);
    const now = new Date();
    let start, end;

    switch (mode) {
      case 'today':
        start = startOfDay(now);
        end = endOfDay(now);
        break;
      case 'tomorrow':
        start = startOfDay(addDays(now, 1));
        end = endOfDay(addDays(now, 1));
        break;
      case 'week':
        start = startOfWeek(now);
        end = endOfWeek(now);
        break;
    }

    setFilters(prev => ({
      ...prev,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
      page: 1 // reset page
    }));
  };

  const handleStatusFilterChange = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : (status as AppointmentStatus),
      page: 1
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleViewAppointment = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsModalOpen(true);
  };

  if (!establishment) return <div className="p-8">Carregando estabelecimento...</div>;

  const totalPages = Math.ceil(totalCount / (filters.limit || 10));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agendamentos</h1>
          <p className="text-gray-500">Gerencie a agenda da sua barbearia</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <ListIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Novo Agendamento
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <button
            onClick={() => handleDateFilterChange('today')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${dateFilterMode === 'today' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Hoje
          </button>
          <button
            onClick={() => handleDateFilterChange('tomorrow')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${dateFilterMode === 'tomorrow' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Amanhã
          </button>
          <button
            onClick={() => handleDateFilterChange('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${dateFilterMode === 'week' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Esta Semana
          </button>
        </div>

        <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

        <div className="flex items-center gap-4 flex-1 w-full">
          <select
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="block w-full md:w-40 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="all">Todos Status</option>
            <option value="scheduled">Agendado</option>
            <option value="confirmed">Confirmado</option>
            <option value="completed">Concluído</option>
            <option value="cancelled">Cancelado</option>
            <option value="no_show">Não Compareceu</option>
          </select>

          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar cliente..."
              onChange={handleSearchChange}
              className="block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'list' ? (
        <>
          <AppointmentsTable
            appointments={appointments}
            loading={loading}
            onEdit={handleViewAppointment}
            onCancel={handleViewAppointment}
            onView={handleViewAppointment}
          />
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 border-t pt-4">
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{(filters.page! - 1) * (filters.limit || 10) + 1}</span> a <span className="font-medium">{Math.min(filters.page! * (filters.limit || 10), totalCount)}</span> de <span className="font-medium">{totalCount}</span> resultados
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(filters.page! - 1)}
                  disabled={filters.page === 1}
                  className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handlePageChange(filters.page! + 1)}
                  disabled={filters.page === totalPages}
                  className="px-3 py-1 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500">
          <CalendarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Visão de Calendário</h3>
          <p className="mt-1 text-sm text-gray-500">Em breve...</p>
        </div>
      )}

      {/* Modals */}
      <CreateAppointmentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchAppointments}
        barbershopId={establishment.id}
      />
      
      <AppointmentModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        appointment={selectedAppointment}
        onUpdate={fetchAppointments}
      />
    </div>
  );
}
