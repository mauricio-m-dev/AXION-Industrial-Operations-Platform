import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../i18n/translations';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o menu ao clicar fora e detecta direção de abertura
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      
      // Detecta se deve abrir para cima ou para baixo
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        setOpenUp(spaceBelow < 200); // Se houver menos de 200px de espaço abaixo, abre para cima
      }
    }
    
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const languages = [
    { code: 'pt-BR', label: 'PT-BR', flag: '🇧🇷' },
    { code: 'en-US', label: 'English', flag: '🇺🇸' },
    { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  ];

  const currentLang = languages.find(l => l.code === language) || languages[0];

  return (
    <div className="relative w-full sm:w-auto" ref={containerRef}>
      {/* Botão Principal */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full sm:w-[140px] h-[clamp(2.75rem,8vw,3rem)] sm:h-9 px-4 flex items-center justify-between gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm sm:rounded-sm shadow-sm hover:border-red-500 transition-all active:scale-[0.98] z-[200]"
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <Globe className="w-4 h-4 text-zinc-500 shrink-0" />
          <span className="text-[clamp(0.85rem,2vw,0.9rem)] sm:text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {currentLang.flag} {currentLang.label}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? -10 : 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? -10 : 10, scale: 0.95 }}
            className={`absolute ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 w-full sm:w-[180px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-sm sm:rounded-sm shadow-2xl z-[500] overflow-hidden`}
          >
            <div className="p-1.5 flex flex-col gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as Language);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full p-3 sm:p-2.5 rounded-sm sm:rounded-sm transition-colors ${
                    language === lang.code
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl sm:text-lg">{lang.flag}</span>
                    <span className="text-[clamp(0.85rem,2vw,0.9rem)] sm:text-xs font-bold">{lang.label}</span>
                  </div>
                  {language === lang.code && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
