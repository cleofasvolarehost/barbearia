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
  brickMode?: 'payment' | 'cardPayment';
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

export function MercadoPagoBrick({ amount, email, publicKey: propPublicKey, paymentType = 'credit_card', brickMode = 'cardPayment', onSuccess, onError, customization }: MercadoPagoBrickProps) {
  const brickInitialized = useRef(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      try {
        // Unmount brick to avoid duplicates when switching tabs
        // @ts-ignore
        if ((window as any).paymentBrickController?.unmount) {
          // @ts-ignore
          (window as any).paymentBrickController.unmount();
        }
      } catch {}
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

        // Normalize: remove leading/trailing whitespace
        if (typeof publicKey === 'string') {
            publicKey = publicKey.trim();
        }

        // If internal whitespace exists, attempt safe cleanup
        if (typeof publicKey === 'string' && /\s/.test(publicKey)) {
            const cleaned = publicKey.replace(/\s+/g, '');
            // Accept cleaned only if it matches expected pattern
            if (/^(TEST|APP_USR)-[A-Za-z0-9-]+$/.test(cleaned)) {
                publicKey = cleaned;
            } else {
                setInitError('Sua chave pública do Mercado Pago contém espaços inválidos. Verifique em Configurações de Pagamento.');
                onError('MercadoPago.js: public_key inválida por conter espaços');
                return;
            }
        }

        // DEBUG LOGGING
        console.log("MP Init Status:", publicKey ? "Key Found (" + publicKey.slice(0, 8) + "...)" : "Key Missing");
        console.log("Passing Price to Modal (Final):", finalAmount);
        console.log("Selected PaymentType:", paymentType);

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

        const defaultCustomization: NonNullable<MercadoPagoBrickProps['customization']> = {
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
        };

        const resolvedCustomization = {
            ...defaultCustomization,
            ...customization,
            paymentMethods: {
                ...defaultCustomization.paymentMethods,
                ...(customization?.paymentMethods ?? {})
            },
            visual: {
                ...defaultCustomization.visual,
                ...(customization?.visual ?? {}),
                style: {
                    ...defaultCustomization.visual.style,
                    ...(customization?.visual?.style ?? {}),
                    customVariables: {
                        ...(defaultCustomization.visual.style.customVariables ?? {}),
                        ...(customization?.visual?.style?.customVariables ?? {})
                    }
                }
            }
        };

        const settings = {
            initialization: {
                amount: Number(finalAmount),
                // Some SDKs require paymentType only for 'payment' Brick mode.
                ...(brickMode === 'payment' ? { paymentType } : {}),
                payer: {
                    email: email,
                    entityType: 'individual'
                },
            },
            customization: resolvedCustomization,
            callbacks: {
                onReady: () => {
                    console.log('Brick Ready');
                    setLoading(false);
                },
                onSubmit: (args: any) => {
                    // CardPayment Brick passes formData directly; Payment Brick wraps in { formData }
                    const fd = args?.formData ?? args;
                    return new Promise<void>(async (resolve, reject) => {
                        console.log('Brick Submit:', fd);
                        if (fd?.token || fd?.payment_method_id) {
                            try {
                                await onSuccess(
                                    fd.token, 
                                    fd.issuer_id, 
                                    fd.payment_method_id,
                                    fd.card?.cardholder?.name,
                                    fd.payer?.identification
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

        // @ts-ignore
        (window as any).paymentBrickController = await bricksBuilder.create(brickMode, 'paymentBrick_container', settings);
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
        {loading && (
          <div className="mb-4 p-4 rounded-2xl bg-white/5 border border-white/10 animate-pulse">
            <div className="h-4 bg-white/10 rounded mb-3"></div>
            <div className="h-10 bg-white/10 rounded mb-3"></div>
            <div className="flex gap-3">
              <div className="h-10 flex-1 bg-white/10 rounded"></div>
              <div className="h-10 flex-1 bg-white/10 rounded"></div>
            </div>
            <div className="h-10 bg-white/10 rounded mt-3"></div>
          </div>
        )}
        <div id="paymentBrick_container" style={{ minHeight: 380 }}></div>
    </div>
  );
}
