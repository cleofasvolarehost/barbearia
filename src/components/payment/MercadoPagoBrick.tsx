import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface MercadoPagoBrickProps {
  amount: number;
  email: string;
  publicKey?: string;
  onSuccess: (token: string, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => void;
  onError: (error: any) => void;
}

export function MercadoPagoBrick({ amount, email, publicKey: propPublicKey, onSuccess, onError }: MercadoPagoBrickProps) {
  const brickInitialized = useRef(false);

  useEffect(() => {
    // Prevent double init
    if (brickInitialized.current) return;

    // Check if script already exists
    if (document.getElementById('mp-sdk')) {
        initializeBrick();
        return;
    }

    const script = document.createElement('script');
    script.id = 'mp-sdk';
    script.src = 'https://sdk.mercadopago.com/js/v2';
    script.onload = () => {
      initializeBrick();
    };
    document.body.appendChild(script);

    return () => {
      // Typically we don't remove the SDK as other components might use it
      // but we mark initialized as false if we unmount? No, SDK stays.
    };
  }, []);

  const initializeBrick = async () => {
    if (!window.MercadoPago) return;
    
    // Only init if container is empty to avoid duplication
    const container = document.getElementById('paymentBrick_container');
    if (container && container.innerHTML !== '') return;

    brickInitialized.current = true;

    try {
        // First try to get from props or context if dynamic (SaaS), otherwise fallback to env (Platform)
        let publicKey = propPublicKey || import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY;
        
        // Debugging logs
        console.log('MP Public Key:', publicKey ? 'Found' : 'Missing');

        if (!publicKey) {
             console.error('Mercado Pago Public Key is missing. Please set VITE_MERCADO_PAGO_PUBLIC_KEY in .env');
             onError('Configuração de pagamento incompleta (Chave Pública ausente).');
             return;
        }

        const mp = new window.MercadoPago(publicKey, {
            locale: 'pt-BR'
        });

        const bricksBuilder = mp.bricks();

        const settings = {
            initialization: {
                amount: amount,
                payer: {
                    email: email,
                },
            },
            customization: {
                paymentMethods: {
                    creditCard: 'all', // Recurrence usually implies Credit Card
                    // debitCard: 'all', // Optional
                    // ticket: 'all',
                    // bankTransfer: 'all',
                    maxInstallments: 1
                },
                visual: {
                    style: {
                        theme: 'dark' // Matches our dark UI
                    }
                }
            },
            callbacks: {
                onReady: () => {
                    console.log('Brick Ready');
                },
                onSubmit: ({ selectedPaymentMethod, formData }: any) => {
                    // Extract data needed for subscription
                    // formData contains token, issuer_id, payment_method_id, etc.
                    return new Promise<void>((resolve, reject) => {
                        console.log('Brick Submit:', formData);
                        if (formData.token) {
                            onSuccess(
                                formData.token, 
                                formData.issuer_id, 
                                formData.payment_method_id,
                                formData.card?.cardholder?.name,
                                formData.payer?.identification
                            );
                            resolve();
                        } else {
                            onError('Erro ao gerar token do cartão');
                            reject();
                        }
                    });
                },
                onError: (error: any) => {
                    console.error('Brick Error:', error);
                    onError(error);
                },
            },
        };

        await bricksBuilder.create('payment', 'paymentBrick_container', settings);
    } catch (err) {
        console.error('Brick Init Error:', err);
        onError(err);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
        <div id="paymentBrick_container"></div>
    </div>
  );
}
