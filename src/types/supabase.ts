export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          email: string
          nome: string
          telefone: string | null
          tipo: 'cliente' | 'admin' | 'barbeiro' | 'dono'
          created_at: string
          is_vip?: boolean
        }
        Insert: {
          id?: string
          email: string
          nome: string
          telefone?: string | null
          tipo?: 'cliente' | 'admin' | 'barbeiro' | 'dono'
          created_at?: string
          is_vip?: boolean
        }
        Update: {
          id?: string
          email?: string
          nome?: string
          telefone?: string | null
          tipo?: 'cliente' | 'admin' | 'barbeiro' | 'dono'
          created_at?: string
          is_vip?: boolean
        }
      }
      servicos: {
        Row: {
          id: string
          nome: string
          descricao: string | null
          preco: number
          duracao_minutos: number
          categoria: string | null
          ativo: boolean
          created_at: string
          owner_id?: string | null
          commission_percent?: number
        }
        Insert: {
          id?: string
          nome: string
          descricao?: string | null
          preco: number
          duracao_minutos: number
          categoria?: string | null
          ativo?: boolean
          created_at?: string
          owner_id?: string | null
          commission_percent?: number
        }
        Update: {
          id?: string
          nome?: string
          descricao?: string | null
          preco?: number
          duracao_minutos?: number
          categoria?: string | null
          ativo?: boolean
          created_at?: string
          owner_id?: string | null
          commission_percent?: number
        }
      }
      barbeiros: {
        Row: {
          id: string
          nome: string
          especialidade: string | null
          foto_url: string | null
          bio: string | null
          ativo: boolean
          created_at: string
          telefone: string | null
          slug: string | null
          nome_barbearia: string | null
          cor_primaria: string | null
          cor_secundaria: string | null
          banner_url: string | null
          logo_url: string | null
        }
        Insert: {
          id?: string
          nome: string
          especialidade?: string | null
          foto_url?: string | null
          bio?: string | null
          ativo?: boolean
          created_at?: string
          telefone?: string | null
          slug?: string | null
          nome_barbearia?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          banner_url?: string | null
          logo_url?: string | null
        }
        Update: {
          id?: string
          nome?: string
          especialidade?: string | null
          foto_url?: string | null
          bio?: string | null
          ativo?: boolean
          created_at?: string
          telefone?: string | null
          slug?: string | null
          nome_barbearia?: string | null
          cor_primaria?: string | null
          cor_secundaria?: string | null
          banner_url?: string | null
          logo_url?: string | null
        }
      }
      agendamentos: {
        Row: {
          id: string
          usuario_id: string
          barbeiro_id: string
          data: string
          horario: string
          status: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
          preco_total: number
          observacoes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          usuario_id: string
          barbeiro_id: string
          data: string
          horario: string
          status?: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
          preco_total: number
          observacoes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          usuario_id?: string
          barbeiro_id?: string
          data?: string
          horario?: string
          status?: 'pendente' | 'confirmado' | 'cancelado' | 'concluido'
          preco_total?: number
          observacoes?: string | null
          created_at?: string
        }
      }
      agendamentos_servicos: {
        Row: {
          id: string
          agendamento_id: string
          servico_id: string
        }
        Insert: {
          id?: string
          agendamento_id: string
          servico_id: string
        }
        Update: {
          id?: string
          agendamento_id?: string
          servico_id?: string
        }
      }
    }
  }
}
