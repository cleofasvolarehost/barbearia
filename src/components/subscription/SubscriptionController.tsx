import { useEstablishment } from '../../contexts/EstablishmentContext';
import { NewPurchaseModal } from '../modals/NewPurchaseModal';
import { SubscriptionManagerModal } from '../modals/SubscriptionManagerModal';
import { PaymentRetryModal } from '../modals/PaymentRetryModal';

interface SubscriptionControllerProps {
  isOpen: boolean;
  onClose: () => void;
  plans: any[];
  onSuccess: () => void;
  initialTab?: string;
}

export function SubscriptionController({ isOpen, onClose, plans, onSuccess, initialTab }: SubscriptionControllerProps) {
  const { establishment } = useEstablishment();

  // Logic 1: Determine Status
  // Map establishment status to our logical states
  // 'active', 'trial' -> ACTIVE CUSTOMER
  // 'suspended' -> PAST DUE
  // 'cancelled', undefined, null -> NEW CUSTOMER
  
  const status = establishment?.subscription_status || 'none';

  // SCENARIO A: NEW CUSTOMER (Status: 'none' or 'canceled')
  if (!status || status === 'none' || status === 'cancelled') {
    return (
      <NewPurchaseModal 
        isOpen={isOpen}
        onClose={onClose}
        plans={plans}
        onSuccess={onSuccess}
      />
    );
  }

  // SCENARIO C: PAST DUE (Status: 'suspended' / 'past_due')
  // Assuming 'suspended' maps to 'past_due' logic in this context
  if (status === 'suspended') {
    return (
      <PaymentRetryModal
        isOpen={isOpen}
        onClose={onClose}
        onSuccess={onSuccess}
        plans={plans}
      />
    );
  }

  // SCENARIO B: ACTIVE CUSTOMER (Status: 'active' or 'trialing')
  // Default fallback for active/trial
  return (
    <SubscriptionManagerModal
      isOpen={isOpen}
      onClose={onClose}
      plans={plans}
      onSuccess={onSuccess}
      initialTab={initialTab}
    />
  );
}
