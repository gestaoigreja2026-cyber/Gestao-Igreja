import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface ThemeConfig {
    id: string;
    name: string;
    emoji: string;
    primaryHex: string;
    glowColor: string;
    hueShift: string; // Shift em graus para hue-rotate
}

export const themes: ThemeConfig[] = [
    { id: 'fe-radiante',       name: 'Fé Radiante',       emoji: '☀️', primaryHex: '#F97316', glowColor: 'rgba(249, 115, 22, 0.35)',  hueShift: '0deg'   },
    { id: 'luz-divina',        name: 'Luz Divina',        emoji: '✨', primaryHex: '#8B5CF6', glowColor: 'rgba(139, 92, 246, 0.35)', hueShift: '234deg' },
    { id: 'oceano-profundo',   name: 'Oceano Profundo',   emoji: '🌊', primaryHex: '#3B82F6', glowColor: 'rgba(59, 130, 246, 0.35)',  hueShift: '193deg' },
    { id: 'jardim-eden',       name: 'Jardim do Éden',    emoji: '🌿', primaryHex: '#10B981', glowColor: 'rgba(16, 185, 129, 0.35)', hueShift: '136deg' },
    { id: 'rosa-saron',        name: 'Rosa de Saron',     emoji: '🌹', primaryHex: '#F43F5E', glowColor: 'rgba(244, 63, 94, 0.35)',  hueShift: '326deg' },
    { id: 'noite-estrelada',   name: 'Noite Estrelada',   emoji: '🌌', primaryHex: '#1E3A8A', glowColor: 'rgba(30, 58, 138, 0.35)',  hueShift: '215deg' },
    { id: 'soberania-preto',   name: 'Soberania',         emoji: '🖤', primaryHex: '#111111', glowColor: 'rgba(0, 0, 0, 0.35)',     hueShift: '0deg'   },
    { id: 'esperanca-viva',    name: 'Esperança Viva',    emoji: '🍃', primaryHex: '#059669', glowColor: 'rgba(5, 150, 105, 0.35)', hueShift: '150deg' },
    { id: 'acai-profundo',     name: 'Açaí Profundo',     emoji: '🍇', primaryHex: '#4C1D95', glowColor: 'rgba(76, 29, 149, 0.35)', hueShift: '275deg' },
    { id: 'cidade-ouro',       name: 'Cidade de Ouro',    emoji: '👑', primaryHex: '#C4852A', glowColor: 'rgba(196, 133, 42, 0.35)', hueShift: '22deg'  },
    { id: 'ceu-azul',          name: 'Céu Azul',          emoji: '☁️', primaryHex: '#0EA5E9', glowColor: 'rgba(14, 165, 233, 0.35)', hueShift: '190deg' },
];

interface ThemeContextType {
    currentTheme: ThemeConfig;
    setTheme: (themeId: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [themeId, setThemeId] = useState<string>(() => {
        if (typeof window === 'undefined') return 'ceu-azul';
        return localStorage.getItem('church_theme_v2') || 'ceu-azul';
    });

    const currentTheme = themes.find(t => t.id === themeId) || themes[0];

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', themeId);
        document.body.setAttribute('data-theme', themeId);
        localStorage.setItem('church_theme_v2', themeId);
    }, [themeId]);

    const setTheme = (id: string) => {
        setThemeId(id);
    };

    return (
        <ThemeContext.Provider value={{ currentTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
}
