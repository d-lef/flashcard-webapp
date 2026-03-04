// Translation service for English → Russian suggestions
const translationService = {
    // LibreTranslate server
    apiUrl: 'https://translate.mono-ai.uk/translate',

    // Debounce timer
    debounceTimer: null,

    // Initialize translation suggestions on card form inputs
    init() {
        this.setupCardFormTranslation();
    },

    setupCardFormTranslation() {
        const backInput = document.getElementById('card-form-back-input');
        if (!backInput) return;

        // Prevent duplicate initialization
        if (backInput.dataset.translationInit === 'true') return;
        backInput.dataset.translationInit = 'true';

        // Create suggestions container if it doesn't exist
        let container = document.getElementById('translation-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.id = 'translation-suggestions';
            container.className = 'translation-suggestions';
            backInput.parentNode.appendChild(container);
        }

        // Listen for input changes (debounced)
        backInput.addEventListener('input', (e) => {
            this.handleInput(e.target.value, container);
        });

        // Also fetch on blur (when user taps away from keyboard)
        backInput.addEventListener('blur', (e) => {
            const word = e.target.value.trim();
            if (word.length >= 2) {
                clearTimeout(this.debounceTimer);
                this.fetchTranslation(word, container);
            }
        });
    },

    handleInput(value, container) {
        clearTimeout(this.debounceTimer);
        const word = value.trim();

        if (word.length < 2) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        // Longer debounce for mobile typing (700ms)
        this.debounceTimer = setTimeout(() => {
            this.fetchTranslation(word, container);
        }, 700);
    },

    async fetchTranslation(text, container) {
        try {
            container.innerHTML = '<div class="translation-loading">Translating...</div>';
            container.style.display = 'block';

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    q: text,
                    source: 'en',
                    target: 'ru'
                })
            });

            if (!response.ok) {
                throw new Error('Translation failed');
            }

            const data = await response.json();
            const translation = data.translatedText;

            if (!translation) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }

            this.renderSuggestions([translation], container);

        } catch (error) {
            // Fail silently - user can type translation manually
            console.error('Translation error:', error);
            container.innerHTML = '';
            container.style.display = 'none';
        }
    },

    renderSuggestions(translations, container) {
        if (!translations || translations.length === 0) {
            container.innerHTML = '';
            container.style.display = 'none';
            return;
        }

        container.innerHTML = translations.map(t =>
            `<button type="button" class="translation-chip">${this.escapeHtml(t)}</button>`
        ).join('');
        container.style.display = 'flex';

        // Add tap handlers
        container.querySelectorAll('.translation-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const frontInput = document.getElementById('card-form-front-input');
                if (frontInput) {
                    frontInput.value = chip.textContent;
                    // Haptic feedback if available
                    if (navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                }
                // Clear suggestions after selection
                container.innerHTML = '';
                container.style.display = 'none';
            });
        });
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Expose to window for access from app.js
window.translationService = translationService;
