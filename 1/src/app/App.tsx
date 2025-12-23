import { useEffect } from 'react';
import { OnePageCheckout } from './components/OnePageCheckout';

export default function App() {
  // Force dark mode
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Simulate logged in state
  const isLoggedIn = false; // Change to true to test pre-filled form

  const prefilledData = {
    name: 'João Silva',
    email: 'joao@example.com',
    phone: '(11) 98765-4321',
  };

  return <OnePageCheckout isLoggedIn={isLoggedIn} prefilledData={isLoggedIn ? prefilledData : undefined} />;
}
