import React, { useState, useEffect } from 'react';
import { useEstablishment } from '../../contexts/EstablishmentContext';
import { appointmentsService } from '../../services/appointments';
import { Appointment, AppointmentFilters, AppointmentStatus } from '../../types/appointments';
import { AppointmentsTable } from '../../components/appointments/AppointmentsTable';
import { CreateAppointmentModal } from '../../components/appointments/CreateAppointmentModal';
import { AppointmentModal } from '../../components/appointments/AppointmentModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Filter, Calendar as CalendarIcon, List as ListIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from 'date-fns';

export default function AdminAppointmentsPage() {
  const { establishment } = useEstablishment();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Details Modal
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Filters & Pagination
  const [filters, setFilters] = useState<AppointmentFilters>({
    barbershop_id: establishment?.id,
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

  const [dateFilterMode, setDateFilterMode] = useState<'today' | 'tomorrow' | 'week' | 'all'>('today');

  useEffect(() => {
    if (establishment?.id) {
      fetchAppointments();
    }
  }, [establishment?.id, filters]);

  useEffect(() => {
    if (!establishment?.id) return;
    setFilters(prev => (
      prev.barbershop_id === establishment.id
        ? prev
        : { ...prev, barbershop_id: establishment.id, page: 1 }
    ));
  }, [establishment?.id]);

  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, count } = await appointmentsService.listAppointments({
        ...filters,
        barbershop_id: establishment?.id
      });
      setAppointments(data);
      if (count !== null) setTotalCount(count);
    } catch (error: any) {
      console.error('Error fetching appointments:', error);
      setError(error.message || 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleDateFilterChange = (mode: 'today' | 'tomorrow' | 'week' | 'all') => {
    setDateFilterMode(mode);
    const now = new Date();
    let start, end;

    if (mode === 'all') {
        setFilters(prev => ({
            ...prev,
            dateRange: undefined, // Remove date filter
            page: 1
        }));
        return;
    }

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

    if (start && end) {
        setFilters(prev => ({
        ...prev,
        dateRange: { start: start.toISOString(), end: end.toISOString() },
        page: 1 // reset page
        }));
    }
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

  if (!establishment) return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">Carregando estabelecimento...</div>;

  const totalPages = Math.ceil(totalCount / (filters.limit || 10));

  return (
    <div className="min-h-screen bg-[#121212] text-white p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white uppercase tracking-tight border-l-4 border-[#7C3AED] pl-4">Agendamentos</h1>
            <p className="text-gray-400 mt-1 ml-5">Gerencie todos os agendamentos da barbearia</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-white/5 rounded-lg p-1 border border-white/10">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <ListIcon className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`p-2 rounded-md transition-all ${viewMode === 'calendar' ? 'bg-[#7C3AED] text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <CalendarIcon className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#7C3AED] text-white rounded-xl hover:bg-[#6D28D9] transition-all font-bold shadow-lg shadow-[#7C3AED]/20"
            >
              <Plus className="h-5 w-5" />
              Novo Agendamento
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[#1E1E1E] p-4 rounded-2xl border border-white/5 shadow-xl mb-8 flex flex-col md:flex-row gap-4 items-center">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
             <button
              onClick={() => handleDateFilterChange('all')}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${dateFilterMode === 'all' ? 'bg-[#7C3AED] text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => handleDateFilterChange('today')}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${dateFilterMode === 'today' ? 'bg-[#7C3AED] text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              Hoje
            </button>
            <button
              onClick={() => handleDateFilterChange('tomorrow')}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${dateFilterMode === 'tomorrow' ? 'bg-[#7C3AED] text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              Amanhã
            </button>
            <button
              onClick={() => handleDateFilterChange('week')}
              className={`px-4 py-2 text-sm font-bold rounded-xl whitespace-nowrap transition-all ${dateFilterMode === 'week' ? 'bg-[#7C3AED] text-white shadow-lg' : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'}`}
            >
              Semana
            </button>
          </div>

          <div className="h-8 w-px bg-white/10 hidden md:block"></div>

          <div className="flex flex-col sm:flex-row items-center gap-4 flex-1 w-full">
          <div className="w-full sm:w-48">
            <Select
              value={filters.status || 'all'}
              onValueChange={handleStatusFilterChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="confirmed">Confirmado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="no_show">Não Compareceu</SelectItem>
              </SelectContent>
            </Select>
          </div>

            <div className="relative flex-1 w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
              </div>
              <input
                type="text"
                placeholder="Buscar cliente por nome ou telefone..."
                onChange={handleSearchChange}
                className="block w-full pl-10 rounded-xl bg-black/20 border border-white/10 text-white placeholder-gray-500 shadow-sm focus:border-[#7C3AED] focus:ring-[#7C3AED] sm:text-sm py-2.5"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400">
            <p className="font-bold">Erro ao carregar agendamentos:</p>
            <p>{error}</p>
            <button 
              onClick={fetchAppointments}
              className="mt-2 text-sm underline hover:text-red-300"
            >
              Tentar novamente
            </button>
          </div>
        )}

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
              <div className="flex items-center justify-between mt-6 border-t border-white/10 pt-6">
                <p className="text-sm text-gray-400">
                  Mostrando <span className="font-bold text-white">{(filters.page! - 1) * (filters.limit || 10) + 1}</span> a <span className="font-bold text-white">{Math.min(filters.page! * (filters.limit || 10), totalCount)}</span> de <span className="font-bold text-white">{totalCount}</span> resultados
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(filters.page! - 1)}
                    disabled={filters.page === 1}
                    className="px-4 py-2 rounded-xl border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handlePageChange(filters.page! + 1)}
                    disabled={filters.page === totalPages}
                    className="px-4 py-2 rounded-xl border border-white/10 text-sm font-bold text-gray-300 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-[#1E1E1E] p-12 rounded-2xl border border-white/5 text-center text-gray-500">
            <CalendarIcon className="mx-auto h-16 w-16 text-[#7C3AED]/20 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Visão de Calendário</h3>
            <p className="text-sm text-gray-400">Esta visualização estará disponível em breve.</p>
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
    </div>
  );
}
