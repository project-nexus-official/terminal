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

    // Get nested object property by string path (e.g., "hero.title")
    function getNestedValue(obj, path) {
        return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : null), obj);
    }

    // Determine correct path to /lang/ directory regardless of subfolder depth
    function getLangPath(lang) {
        // If hosted on GitHub Pages or local web server, root-relative path works best
        const origin = window.location.origin;
        if (origin && origin !== 'null' && origin !== 'file://') {
            return `/lang/${lang}.json`;
        }
        // Fallback relative path calculation based on depth
        const depth = (window.location.pathname.match(/\//g) || []).length;
        const prefix = depth > 1 ? '../'.repeat(depth - 1) : './';
        return `${prefix}lang/${lang}.json`;
    }

    // Load and apply translations
    async function loadLanguage(lang) {
        if (!SUPPORTED_LANGS.includes(lang)) lang = DEFAULT_LANG;

        try {
            const path = getLangPath(lang);
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load ${path}: ${response.status}`);
            }
            translations = await response.json();
            currentLang = lang;
            localStorage.setItem('nexus_lang', lang);
            document.documentElement.lang = lang;

            applyTranslations();
            updateLanguageUI();
        } catch (error) {
            console.error('[i18n] Error loading translation:', error);
            // Fallback to German if loading failed
            if (lang !== DEFAULT_LANG) {
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
            if (val !== null) {
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
                if (attr && val !== null) {
                    el.setAttribute(attr, val);
                }
            });
        });

        // 3. Document Title
        const metaTitleVal = getNestedValue(translations, 'meta.title');
        if (metaTitleVal) {
            document.title = metaTitleVal;
        }
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
        if (lang !== currentLang) {
            loadLanguage(lang);
        }
    };

    // Auto-init when DOM is ready
    document.addEventListener('DOMContentLoaded', () => {
        const initialLang = getInitialLanguage();
        loadLanguage(initialLang);
    });
})();
