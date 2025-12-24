declare global {
  interface Window {
    Iugu: {
      setAccountID: (id: string) => void;
      setTestMode: (test: boolean) => void;
      createPaymentToken: (params: {
        account_id: string;
        method: 'credit_card';
        test?: boolean;
        data: {
          number: string;
          verification_value: string;
          first_name: string;
          last_name?: string;
          month: string | number;
          year: string | number;
        };
      }) => Promise<{ id: string; [key: string]: any }>;
    };
  }

  var Iugu: Window['Iugu'];
}

export {};
