import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    MercadoPago: any;
  }
}

interface MercadoPagoBrickProps {
  amount: number;
  email: string;
  publicKey?: string;
  paymentType?: 'credit_card' | 'debit_card' | 'pix' | 'ticket' | 'bank_transfer';
  onSuccess: (token: string | undefined, issuer_id?: string, payment_method_id?: string, card_holder_name?: string, identification?: any) => Promise<void> | void;
  onError: (error: any) => void;
  customization?: {
    paymentMethods?: {
        creditCard?: string | string[];
        debitCard?: string | string[];
        ticket?: string | string[];
        bankTransfer?: string | string[];
        maxInstallments?: number;
    };
    visual?: {
        style?: {
            theme?: 'default' | 'dark' | 'flat' | 'bootstrap';
            customVariables?: {
                textPrimaryColor?: string;
                textSecondaryColor?: string;
                inputBackgroundColor?: string;
                formBackgroundColor?: string;
                baseColor?: string;
                paymentOptionBackgroundColor?: string;
                successColor?: string;
                errorColor?: string;
                warningColor?: string;
                formPadding?: string;
            };
        };
        hidePaymentButton?: boolean;
    };
  };
}

export function MercadoPagoBrick({ amount, email, publicKey: propPublicKey, paymentType = 'credit_card', onSuccess, onError, customization }: MercadoPagoBrickProps) {
  const brickInitialized = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);

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
    
    // Check Amount Validity
    // FAILSAFE: If amount is 0, force 1.00 for testing/preventing UI block
    // REMOVED FALLBACK: Strict Mode for Production
    // const finalAmount = amount > 0 ? amount : 1.00;
    
    if (amount <= 0) {
        console.warn('Brick Init: Amount is 0 or invalid. Brick will NOT initialize.');
        setInitError('Erro: Valor do plano inválido.');
        return;
    }

    if (!email) {
        console.warn('Brick Init: Email is missing. Brick will NOT initialize.');
        setInitError('Erro: Email do usuário não encontrado.');
        return;
    }

    const finalAmount = amount;

    // Only init if container is empty to avoid duplication
    const container = document.getElementById('paymentBrick_container');
    if (container && container.innerHTML !== '') return;

    brickInitialized.current = true;

    try {
        // FIX: Robust Environment Variable Loading (Vite + Next.js compatible)
        // Checks specifically for VITE_MP_PUBLIC_KEY as primary, then legacy vars
        const envKey = import.meta.env.VITE_MP_PUBLIC_KEY || 
                       import.meta.env.VITE_MERCADO_PAGO_PUBLIC_KEY || 
                       // @ts-ignore - Process might not be defined in Vite
                       (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_MP_PUBLIC_KEY : undefined);

        // Sanitize: Check if it's the specific broken test key and block it if necessary,
        // OR allow it if the user insists, but we know this specific one is causing 404s in some contexts.
        // Actually, the error 404 on "new_theme" usually means the key is invalid or not allowed for that origin.
        
        let publicKey = propPublicKey || envKey;

        // DEBUG LOGGING
        console.log("MP Init Status:", publicKey ? "Key Found (" + publicKey.slice(0, 8) + "...)" : "Key Missing");
        console.log("Passing Price to Modal (Final):", finalAmount);

        if (!publicKey) {
             console.warn('⚠️ MP Key missing in Vercel Envs');
             setInitError('Pagamento indisponível no momento (Configuração ausente).');
             onError('Configuração de pagamento incompleta (Chave Pública ausente).');
             return;
        }

        const mp = new window.MercadoPago(publicKey, {
            locale: 'pt-BR'
        });

        const bricksBuilder = mp.bricks();

        const settings = {
            initialization: {
                amount: Number(finalAmount),
                paymentType,
                payer: {
                    email: email,
                    entityType: 'individual'
                },
            },
            customization: customization || {
                paymentMethods: {
                    creditCard: 'all',
                    debitCard: 'all',
                    ticket: 'all',
                    bankTransfer: 'all',
                    maxInstallments: 1
                },
                visual: {
                    style: {
                        theme: 'default' // Changed from 'dark' to 'default' to fix 404/400 errors
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
                    return new Promise<void>(async (resolve, reject) => {
                        console.log('Brick Submit:', formData);
                        // Allow submission if we have a token OR if it's a non-card method (Pix/Ticket)
                        // For Pix/Ticket, token is undefined, but payment_method_id is present.
                        if (formData.token || formData.payment_method_id) {
                            try {
                                await onSuccess(
                                    formData.token, 
                                    formData.issuer_id, 
                                    formData.payment_method_id,
                                    formData.card?.cardholder?.name,
                                    formData.payer?.identification
                                );
                                resolve();
                            } catch (e) {
                                console.error('Payment processing error:', e);
                                reject();
                            }
                        } else {
                            onError('Erro ao processar dados do pagamento');
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
        setInitError('Erro ao inicializar pagamento.');
        onError(err);
    }
  };

  if (initError) {
      return (
          <div className="w-full max-w-md mx-auto p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
              <p className="text-red-400 font-bold mb-2">Erro de Configuração</p>
              <p className="text-sm text-red-300">{initError}</p>
          </div>
      );
  }

  return (
    <div className="w-full max-w-md mx-auto">
        <div id="paymentBrick_container"></div>
    </div>
  );
}
