
import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandConfig, ThemeColors, WLBranding } from '../types';
import { supabase } from '../services/supabase';

const DEFAULT_COLORS: ThemeColors = {
    primary: '#ff007f',
    secondary: '#0a0a0c',
    accent: '#f43f5e',
    background: '#050505',
    surface: 'rgba(18, 18, 20, 0.7)',
    textMain: '#ffffff',
    textSecondary: '#a1a1aa',
    border: 'rgba(255, 255, 255, 0.08)'
};

const DEFAULT_CONFIG: BrandConfig = {
    siteName: 'Video Platform',
    logoUrl: '',
    faviconUrl: '',
    colors: DEFAULT_COLORS,
    fontFamily: '"Comfortaa", cursive',
    footerText: '© 2025 All Rights Reserved'
};

interface BrandingContextType {
    config: BrandConfig;
    updateConfig: (newConfig: Partial<BrandConfig>) => void;
    isLoading: boolean;
    isWhiteLabel: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export const useBranding = () => {
    const context = useContext(BrandingContext);
    if (!context) throw new Error('useBranding must be used within BrandingProvider');
    return context;
};

export const BrandingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<BrandConfig>(DEFAULT_CONFIG);
    const [isLoading, setIsLoading] = useState(true);
    const [isWhiteLabel, setIsWhiteLabel] = useState(false);

    useEffect(() => {
        const loadConfig = async () => {
            const local = localStorage.getItem('wl_config');
            if (local) {
                try {
                    const parsed = JSON.parse(local);
                    if (parsed.branding) {
                        updateConfigFromWL(parsed.branding);
                    }
                    setIsWhiteLabel(true);
                } catch(e) {}
            }

            // Attempt to fetch from DB if connected
            try {
                const { data, error } = await supabase.from('wl_branding').select('*').limit(1).maybeSingle();
                if (data) {
                    const wl = data as WLBranding;
                    updateConfigFromWL({
                        brand_name: wl.brand_name,
                        primary_color: wl.primary_color,
                        footer_text: wl.footer_text,
                        logo_url: wl.logo_url
                    });
                    setIsWhiteLabel(true);
                }
            } catch (e) {
                // Ignore if table doesn't exist yet (pre-install)
            } finally {
                setIsLoading(false);
            }
        };
        loadConfig();
    }, []);

    const updateConfigFromWL = (data: any) => {
        setConfig(prev => ({
            ...prev,
            siteName: data.brand_name || prev.siteName,
            footerText: data.footer_text || prev.footerText,
            logoUrl: data.logo_url || prev.logoUrl,
            colors: {
                ...prev.colors,
                primary: data.primary_color || prev.colors.primary,
                accent: data.primary_color || prev.colors.accent,
            }
        }));
    };

    // Apply CSS Variables
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--pink-electric', config.colors.primary);
        root.style.setProperty('--pink-hot', config.colors.accent);
        root.style.setProperty('--bg-primary', config.colors.background);
        root.style.setProperty('--bg-secondary', config.colors.secondary);
        root.style.setProperty('--surface', config.colors.surface);
        root.style.setProperty('--text-main', config.colors.textMain);
        root.style.setProperty('--text-secondary', config.colors.textSecondary);
        root.style.setProperty('--glass-border', config.colors.border);
        root.style.setProperty('--global-font', config.fontFamily);
        
        document.title = config.siteName;
    }, [config]);

    const updateConfig = (newConfig: Partial<BrandConfig>) => {
        setConfig(prev => {
            const next = { ...prev, ...newConfig };
            // Update local storage simulation
            const current = localStorage.getItem('wl_config');
            if (current) {
                const parsed = JSON.parse(current);
                parsed.branding = { 
                    brand_name: next.siteName, 
                    primary_color: next.colors.primary, 
                    footer_text: next.footerText 
                };
                localStorage.setItem('wl_config', JSON.stringify(parsed));
            }
            return next;
        });
    };

    return (
        <BrandingContext.Provider value={{ config, updateConfig, isLoading, isWhiteLabel }}>
            {children}
        </BrandingContext.Provider>
    );
};
