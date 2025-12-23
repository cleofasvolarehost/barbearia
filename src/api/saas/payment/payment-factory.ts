import { supabase } from '../../../lib/supabase';
import { PaymentGateway, PaymentRequest, PaymentResponse } from './types';
import { MercadoPagoService } from './adapters/mercado-pago';
import { AsaasService } from './adapters/asaas';
import { EfiService } from './adapters/efi';

export class PaymentFactory {
  static async create(): Promise<PaymentGateway> {
    // 1. Fetch active gateway from DB
    const { data: activeGateway } = await supabase
      .from('saas_settings')
      .select('*')
      .eq('setting_key', 'active_gateway')
      .single();

    const provider = activeGateway?.setting_value || 'mercadopago'; // Default

    // 2. Fetch credentials for that provider
    let credentials = null;
    
    if (provider === 'mercadopago') {
      const { data } = await supabase.from('saas_settings').select('setting_value').eq('setting_key', 'mp_access_token').single();
      credentials = data?.setting_value;
      if (!credentials) throw new Error('Mercado Pago Credentials missing');
      return new MercadoPagoService(credentials);
    } 
    
    else if (provider === 'asaas') {
      const { data } = await supabase.from('saas_settings').select('setting_value').eq('setting_key', 'asaas_api_key').single();
      credentials = data?.setting_value;
      if (!credentials) throw new Error('Asaas Credentials missing');
      return new AsaasService(credentials);
    }

    else if (provider === 'efi') {
        // Efi might need client_id and client_secret, typically stored as JSON or separate keys
        // For simplicity assuming single key or handle logic inside adapter
        const { data } = await supabase.from('saas_settings').select('setting_value').eq('setting_key', 'efi_credentials').single();
        credentials = data?.setting_value;
        return new EfiService(credentials || '');
    }

    throw new Error(`Unsupported Gateway: ${provider}`);
  }
}
