/**
 * Wordnet (Hipersend) WhatsApp API Integration
 */

interface SendWhatsAppOptions {
  to: string;
  message: string;
  instanceId?: string;
  token?: string;
}

export async function sendWhatsApp({ to, message, instanceId, token }: SendWhatsAppOptions): Promise<boolean> {
  try {
    // 1. Clean Phone Number (Remove non-digits)
    let cleanPhone = to.replace(/\D/g, '');
    
    // Ensure it starts with 55 (Brazil) if it seems like a complete local number
    // Assumption: numbers with 10-11 digits are likely missing DDI 55
    if (cleanPhone.length >= 10 && cleanPhone.length <= 11) {
      cleanPhone = `55${cleanPhone}`;
    }

    // 2. Resolve Credentials (Params > Env Vars)
    const u = instanceId || import.meta.env.VITE_WORDNET_INSTANCE_ID;
    const p = token || import.meta.env.VITE_WORDNET_API_TOKEN;
    const apiUrl = import.meta.env.VITE_WORDNET_API_URL || 'https://myhs.app';

    if (!u || !p) {
      console.warn('Wordnet: Missing credentials (instanceId or token)');
      return false;
    }

    // 3. Make the API Call
    console.log(`Wordnet: Sending to ${cleanPhone}...`);
    
    const response = await fetch(`${apiUrl}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        u, // Instance ID
        p, // Access Token
        to: cleanPhone,
        msg: message,
      }),
    });

    const data = await response.json();

    // 4. Handle Response
    if (response.ok && !data.error) {
      console.log('Wordnet: Success', data);
      return true;
    } else {
      console.error('Wordnet: API Error', data);
      return false;
    }

  } catch (error) {
    console.error('Wordnet: Network/System Error', error);
    return false;
  }
}
