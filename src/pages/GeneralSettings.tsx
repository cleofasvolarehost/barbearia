import { useState } from 'react';
import { GeneralInfoSettings } from '../components/settings/GeneralInfoSettings';
import { BrandingSettings } from '../components/settings/BrandingSettings';
import { Building2, Palette } from 'lucide-react';

export default function GeneralSettings() {
  const [activeTab, setActiveTab] = useState<'info' | 'branding'>('info');

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <h1 className="text-3xl font-bold text-white mb-8">Minha Barbearia</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('info')}
          className={`
            px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
            ${activeTab === 'info' 
              ? 'bg-[#7C3AED] text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'}
          `}
        >
          <Building2 className="w-4 h-4" />
          Dados Gerais
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`
            px-6 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-all
            ${activeTab === 'branding' 
              ? 'bg-[#7C3AED] text-white shadow-lg' 
              : 'text-gray-400 hover:text-white hover:bg-white/5'}
          `}
        >
          <Palette className="w-4 h-4" />
          Personalização
        </button>
      </div>

      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === 'info' && <GeneralInfoSettings />}
        {activeTab === 'branding' && <BrandingSettings />}
      </div>
    </div>
  );
}
