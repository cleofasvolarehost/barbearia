export async function loadIugu(accountId: string) {
  if (!(window as any).Iugu) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://js.iugu.com/v2';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Falha ao carregar Iugu.js'));
      document.head.appendChild(s);
    });
  }
  (window as any).Iugu.setAccountID(accountId);
  (window as any).Iugu.setTestMode(false);
}

export async function createCardToken(card: { number: string; verification_value: string; first_name: string; last_name: string; month: string; year: string; }) {
  return new Promise<{ id: string }>((resolve, reject) => {
    (window as any).Iugu.createPaymentToken({
      credit_card: card,
    }, (response: any) => {
      if (response?.errors) return reject(new Error(JSON.stringify(response.errors)));
      if (!response?.id) return reject(new Error('Token não gerado'));
      resolve({ id: response.id });
    });
  });
}
