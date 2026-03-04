// Translation service for English → Russian suggestions
const translationService = {
    // LibreTranslate server
    apiUrl: 'https://translate.mono-ai.uk/translate',

    // Initialize translation button on card form
    init() {
        this.setupCardFormTranslation();
    },

    setupCardFormTranslation() {
        const backInput = document.getElementById('card-form-back-input');
        if (!backInput) return;

        // Prevent duplicate initialization
        if (backInput.dataset.translationInit === 'true') return;
        backInput.dataset.translationInit = 'true';

        // Create translate button if it doesn't exist
        let translateBtn = document.getElementById('translate-btn');
        if (!translateBtn) {
            translateBtn = document.createElement('button');
            translateBtn.id = 'translate-btn';
            translateBtn.type = 'button';
            translateBtn.className = 'translate-btn';
            translateBtn.innerHTML = '<span class="translate-icon">→</span> Translate';
            backInput.parentNode.appendChild(translateBtn);
        }

        // Create suggestions container if it doesn't exist
        let container = document.getElementById('translation-suggestions');
        if (!container) {
            container = document.createElement('div');
            container.id = 'translation-suggestions';
            container.className = 'translation-suggestions';
            backInput.parentNode.appendChild(container);
        }

        // Translate on button tap
        translateBtn.addEventListener('click', () => {
            const word = backInput.value.trim();
            if (word.length >= 1) {
                this.fetchTranslation(word, container, translateBtn);
            }
        });
    },

    async fetchTranslation(text, container, button) {
        try {
            // Show loading state on button
            const originalText = button.innerHTML;
            button.innerHTML = '<span class="translate-icon spin">↻</span> ...';
            button.disabled = true;

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

            // Restore button
            button.innerHTML = originalText;
            button.disabled = false;

            if (!translation) {
                container.innerHTML = '';
                container.style.display = 'none';
                return;
            }

            this.renderSuggestions([translation], container);

        } catch (error) {
            // Restore button and fail silently
            button.innerHTML = '<span class="translate-icon">→</span> Translate';
            button.disabled = false;
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
                    if (navigator.vibrate) {
                        navigator.vibrate(10);
                    }
                }
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
