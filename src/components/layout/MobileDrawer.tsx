import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, ChevronRight, LogOut } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: { id: string; icon: any; label: string; roles?: string[] }[];
  role: string | null;
  onLogout: () => void;
  userEmail?: string;
}

export function MobileDrawer({ isOpen, onClose, items, role, onLogout, userEmail }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-[#1a1a1a] border-r border-white/10 z-[70] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">Menu</h2>
                <p className="text-white/40 text-xs">{userEmail}</p>
              </div>
              <button onClick={onClose} className="p-2 text-white/60 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to={item.id}
                    onClick={onClose}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 active:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-[#7C3AED]/10 text-[#7C3AED]">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-white font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/20" />
                  </Link>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              <button 
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-500/10 text-red-400 font-bold hover:bg-red-500/20 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                Sair
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
