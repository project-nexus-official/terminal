/**
 * N.E.X.U.S. Terminal - Dynamic i18n System
 * Handles multi-language loading (German, Spanish, etc.),
 * persistence via localStorage/URL, and DOM translation.
 */

(function () {
    const DEFAULT_LANG = 'de';
    const SUPPORTED_LANGS = ['de', 'es'];
    let currentLang = DEFAULT_LANG;
    let translations = {};

    // Get current script element for path resolution
    const currentScript = document.currentScript || (function() {
        const scripts = document.getElementsByTagName('script');
        return scripts[scripts.length - 1];
    })();

    // Determine base path of the site dynamically from i18n.js location
    function getBasePath() {
        try {
            if (currentScript && currentScript.src) {
                const url = new URL(currentScript.src);
                return url.pathname.replace(/\/js\/[^\/]*$/, '');
            }
        } catch (e) {
            console.warn('[i18n] Could not parse script URL:', e);
        }
        return '';
    }

    // Determine initial language
    function getInitialLanguage() {
        const urlParams = new URLSearchParams(window.location.search);
        const urlLang = urlParams.get('lang');
        if (urlLang && SUPPORTED_LANGS.includes(urlLang)) {
            return urlLang;
        }

        const savedLang = localStorage.getItem('nexus_lang');
        if (savedLang && SUPPORTED_LANGS.includes(savedLang)) {
            return savedLang;
        }

        const browserLang = (navigator.language || navigator.userLanguage || '').substring(0, 2).toLowerCase();
        if (SUPPORTED_LANGS.includes(browserLang)) {
            return browserLang;
        }

        return DEFAULT_LANG;
    }

    // Get nested object property by string path
    function getNestedValue(obj, path) {
        return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : null), obj);
    }

    // Determine correct path to /lang/ directory
    function getLangPath(lang) {
        let basePath = getBasePath();
        // If file:// protocol or empty path, use relative path depending on nesting
        if (!basePath || basePath === '/' || window.location.protocol === 'file:') {
            // Check if we are in a subdirectory like eLearning/
            if (window.location.pathname.includes('/eLearning/')) {
                return `../lang/${lang}.json`;
            }
            return `lang/${lang}.json`;
        }
        return `${basePath}/lang/${lang}.json`;
    }

    // Load and apply translations
    async function loadLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;

        const path = getLangPath(lang);
        console.log(`[i18n] Loading language '${lang}' from path: ${path}`);

        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status} when fetching ${path}`);
            }
            translations = await response.json();
            currentLang = lang;
            localStorage.setItem('nexus_lang', lang);
            document.documentElement.lang = lang;

            applyTranslations();
            updateLanguageUI();
            console.log(`[i18n] Successfully switched to '${lang}'`);
        } catch (error) {
            console.error(`[i18n] Failed to load language '${lang}':`, error);
            if (lang !== DEFAULT_LANG && Object.keys(translations).length === 0) {
                console.log('[i18n] Falling back to default language:', DEFAULT_LANG);
                loadLanguage(DEFAULT_LANG);
            }
        }
    }

    // Apply translations to the DOM
    function applyTranslations() {
        // 1. Elements with data-i18n="key"
        document.querySelectorAll('[data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            const val = getNestedValue(translations, key);
            if (val !== null && val !== undefined) {
                if (/<[a-z][\s\S]*>/i.test(val)) {
                    el.innerHTML = val;
                } else {
                    el.textContent = val;
                }
            }
        });

        // 2. Element attributes with data-i18n-attr="attrName:key"
        document.querySelectorAll('[data-i18n-attr]').forEach((el) => {
            const attrRules = el.getAttribute('data-i18n-attr').split(',');
            attrRules.forEach((rule) => {
                const [attr, key] = rule.split(':').map((s) => s.trim());
                const val = getNestedValue(translations, key);
                if (attr && val !== null && val !== undefined) {
                    el.setAttribute(attr, val);
                }
            });
        });
        
        // Title is handled by data-i18n on the <title> tag now.
    }

    // Update Language Switcher UI elements
    function updateLanguageUI() {
        document.querySelectorAll('.lang-btn').forEach((btn) => {
            const btnLang = btn.getAttribute('data-lang');
            if (btnLang === currentLang) {
                btn.classList.add('active-lang');
            } else {
                btn.classList.remove('active-lang');
            }
        });
    }

    // Public method to switch language
    window.switchNexusLanguage = function (lang) {
        console.log(`[i18n] User requested language switch to: ${lang}`);
        loadLanguage(lang);
    };

    // Auto-init when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            loadLanguage(getInitialLanguage());
        });
    } else {
        loadLanguage(getInitialLanguage());
    }
})();
