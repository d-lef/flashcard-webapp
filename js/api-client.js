class SupabaseService {
    constructor() {
        this.syncQueue = [];
        this.isOnline = navigator.onLine;

        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            try {
                this.isOnline = true;
                console.log('Network: Online event detected');

                setTimeout(() => {
                    try {
                        if (this.isOnline && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                            console.log('Network: Processing sync queue after online event');
                            this.processSyncQueue();
                        } else if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
                            console.log('Network: Online event ignored - test mode is active');
                        }
                    } catch (error) {
                        console.error('Network online handler delayed processing error:', error);
                    }
                }, 250);
            } catch (error) {
                console.error('CRITICAL: Network online event handler error:', error);
            }
        });

        window.addEventListener('offline', () => {
            try {
                this.isOnline = false;
                console.log('Network: Offline event detected');
            } catch (error) {
                console.error('CRITICAL: Network offline event handler error:', error);
            }
        });
    }

    async syncDecks() {
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('BLOCKED: syncDecks() blocked in test mode - returning null to force localStorage fallback');
            return null;
        }

        try {
            console.log('Syncing decks from API...');
            const resp = await fetch('/api/decks');
            if (!resp.ok) throw new Error(`GET /api/decks failed: ${resp.status}`);
            const data = await resp.json();
            console.log('Raw API data:', data);
            const transformedDecks = this.transformDecksFromSupabase(data);
            console.log('Transformed decks:', transformedDecks);
            return transformedDecks;
        } catch (error) {
            console.error('Failed to sync decks:', error.message, error);
            return null;
        }
    }

    transformDecksFromSupabase(supabaseDecks) {
        return supabaseDecks.map(deck => ({
            id: deck.id,
            name: deck.name,
            createdAt: deck.created_at,
            cards: deck.cards.map(card => ({
                id: card.id,
                front: card.front,
                back: card.back,
                ease: card.ease,
                interval: card.interval,
                reps: card.reps,
                lapses: card.lapses,
                grade: card.grade,
                dueDate: card.due_date,
                lastReviewed: card.last_reviewed,
                createdAt: card.created_at,
                updatedAt: card.updated_at,
                // Legacy fields for compatibility
                easeFactor: card.ease,
                repetitions: card.reps,
                nextReview: card.due_date ? new Date(card.due_date).toISOString() : null,
                reviewCount: card.reps || 0
            }))
        }));
    }

    async saveDeck(deck, isNew = false) {
        const operation = {
            type: 'saveDeck',
            data: { deck, isNew },
            timestamp: Date.now()
        };

        if (!this.isOnline) {
            this.addToSyncQueue(operation);
            return true;
        }

        try {
            return await this.executeSaveDeck(deck, isNew);
        } catch (error) {
            console.error('Failed to save deck:', error);
            this.addToSyncQueue(operation);
            return true;
        }
    }

    async executeSaveDeck(deck, isNew) {
        console.log('Executing save deck:', { deck, isNew });

        const deckData = {
            id: deck.id,
            name: deck.name,
            created_at: deck.createdAt || new Date().toISOString()
        };

        if (isNew) {
            console.log('Inserting new deck:', deckData);
            const resp = await fetch('/api/decks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deckData)
            });
            if (!resp.ok) throw new Error(`POST /api/decks failed: ${resp.status}`);
            console.log('Deck inserted successfully');
        } else {
            console.log('Updating existing deck:', deckData.id);
            const resp = await fetch(`/api/decks/${deckData.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deckData)
            });
            if (!resp.ok) throw new Error(`PUT /api/decks/${deckData.id} failed: ${resp.status}`);
            console.log('Deck updated successfully');
        }

        // Handle cards - only save new or modified cards
        if (deck.cards && deck.cards.length > 0) {
            const cardsToSave = deck.cards.filter(card =>
                card.isNew === true || card.isModified === true
            );

            if (cardsToSave.length > 0) {
                console.log('Processing', cardsToSave.length, 'new/modified cards out of', deck.cards.length, 'total cards');

                for (const card of cardsToSave) {
                    try {
                        const cardIsNew = card.isNew === true && !card.created_at && !card.updated_at;
                        const result = await this.saveCard(card, deck.id, cardIsNew);

                        if (result) {
                            if (card.isNew) {
                                card.isNew = false;
                                if (!card.created_at) {
                                    card.created_at = new Date().toISOString();
                                }
                            }
                            card.isModified = false;
                            card.updated_at = new Date().toISOString();
                        }
                    } catch (error) {
                        console.error('Failed to save card:', card.id, error);
                    }
                }
            } else {
                console.log('No new or modified cards to save');
            }
        }

        return true;
    }

    async saveCard(card, deckId, isNew = false) {
        console.log('Saving card:', { cardId: card.id, deckId, isNew });

        const cardData = {
            id: card.id,
            deck_id: deckId,
            front: card.front,
            back: card.back,
            ease: parseFloat(card.ease || card.easeFactor || 2.5),
            interval: parseInt(card.interval || 1),
            reps: parseInt(card.reps || card.repetitions || 0),
            lapses: parseInt(card.lapses || 0),
            grade: card.grade ? parseInt(card.grade) : null,
            due_date: card.dueDate || card.due_date || (card.nextReview ? new Date(card.nextReview).toISOString().split('T')[0] : null),
            last_reviewed: card.lastReviewed || card.last_reviewed || null,
            created_at: card.createdAt || card.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('Card data prepared:', cardData);

        // Always use POST (INSERT OR REPLACE) — simple and idempotent
        const resp = await fetch('/api/cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cardData)
        });
        if (!resp.ok) throw new Error(`POST /api/cards failed: ${resp.status}`);
        console.log('Card saved successfully');

        return true;
    }

    async deleteDeck(deckId) {
        const operation = {
            type: 'deleteDeck',
            data: { deckId },
            timestamp: Date.now()
        };

        if (!this.isOnline) {
            this.addToSyncQueue(operation);
            return true;
        }

        try {
            const resp = await fetch(`/api/decks/${deckId}`, { method: 'DELETE' });
            if (!resp.ok) throw new Error(`DELETE /api/decks/${deckId} failed: ${resp.status}`);
            return true;
        } catch (error) {
            console.error('Failed to delete deck:', error);
            this.addToSyncQueue(operation);
            return true;
        }
    }

    async deleteCard(cardId) {
        const operation = {
            type: 'deleteCard',
            data: { cardId },
            timestamp: Date.now()
        };

        if (!this.isOnline) {
            this.addToSyncQueue(operation);
            return true;
        }

        try {
            const resp = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
            if (!resp.ok) throw new Error(`DELETE /api/cards/${cardId} failed: ${resp.status}`);
            return true;
        } catch (error) {
            console.error('Failed to delete card:', error);
            this.addToSyncQueue(operation);
            return true;
        }
    }

    addToSyncQueue(operation) {
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('BLOCKED: Sync queue operation blocked in test mode:', operation.type);
            return;
        }

        this.syncQueue.push(operation);

        try {
            localStorage.setItem('supabase_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Failed to persist sync queue to localStorage:', error);
        }
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('BLOCKED: Sync queue processing blocked in test mode - preserving queue for later');
            return;
        }

        console.log(`Processing sync queue with ${this.syncQueue.length} operations...`);
        const queue = [...this.syncQueue];
        this.syncQueue = [];

        for (const operation of queue) {
            try {
                switch (operation.type) {
                    case 'saveDeck':
                        await this.executeSaveDeck(operation.data.deck, operation.data.isNew);
                        break;
                    case 'deleteDeck':
                        await this.deleteDeck(operation.data.deckId);
                        break;
                    case 'deleteCard':
                        await this.deleteCard(operation.data.cardId);
                        break;
                    case 'updateReviewStats':
                        await this.executeUpdateReviewStats(operation.data.date, operation.data.isCorrect, operation.data.allDueCompleted, operation.data.isFirstReviewToday);
                        break;
                }
            } catch (error) {
                console.error('Failed to process sync operation:', error);
                this.addToSyncQueue(operation);
            }
        }

        try {
            localStorage.setItem('supabase_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Failed to clear processed sync queue items from localStorage:', error);
        }
    }

    loadSyncQueue() {
        try {
            const queue = localStorage.getItem('supabase_sync_queue');
            if (queue) {
                this.syncQueue = JSON.parse(queue);
            }
        } catch (error) {
            console.error('Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    async updateReviewStats(date, isCorrect, allDueCompleted = null, isFirstReviewToday = true) {
        const operation = {
            type: 'updateReviewStats',
            data: { date, isCorrect, allDueCompleted, isFirstReviewToday },
            timestamp: Date.now()
        };

        if (!this.isOnline) {
            this.addToSyncQueue(operation);
            return true;
        }

        try {
            return await this.executeUpdateReviewStats(date, isCorrect, allDueCompleted, isFirstReviewToday);
        } catch (error) {
            console.error('Failed to update review stats:', error);
            this.addToSyncQueue(operation);
            return true;
        }
    }

    async executeUpdateReviewStats(date, isCorrect, allDueCompleted = null, isFirstReviewToday = true) {
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('BLOCKED: Review stats update blocked in test mode');
            return true;
        }

        console.log('Updating review stats for:', { date, isCorrect, allDueCompleted });

        const payload = {
            day: date,
            increment: true
        };

        if (isCorrect !== null) {
            payload.reviews = 1;
            payload.correct = isCorrect ? 1 : 0;
            payload.lapses = isCorrect ? 0 : 1;
        }

        if (allDueCompleted !== null) {
            payload.all_due_completed = allDueCompleted;
        }

        const resp = await fetch('/api/review-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!resp.ok) throw new Error(`POST /api/review-stats failed: ${resp.status}`);

        console.log('Review stats updated successfully');
        return true;
    }

    async getReviewStats(startDate, endDate) {
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('BLOCKED: getReviewStats() blocked in test mode - returning empty array');
            return [];
        }

        try {
            const params = new URLSearchParams();
            if (startDate) params.set('start', startDate);
            if (endDate) params.set('end', endDate);
            const qs = params.toString();
            const url = '/api/review-stats' + (qs ? '?' + qs : '');
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`GET ${url} failed: ${resp.status}`);
            return await resp.json();
        } catch (error) {
            console.error('Failed to fetch review stats:', error);
            return [];
        }
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // Irregular Verbs Methods
    async populateIrregularVerbs() {
        try {
            const resp = await fetch('/api/irregular-verbs/populate', { method: 'POST' });
            if (!resp.ok) throw new Error(`POST /api/irregular-verbs/populate failed: ${resp.status}`);
            console.log('Irregular verbs populated');
            return true;
        } catch (error) {
            console.error('Failed to populate irregular verbs:', error);
            return false;
        }
    }

    async searchIrregularVerbs(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 1) return [];
            const resp = await fetch(`/api/irregular-verbs/search?q=${encodeURIComponent(searchTerm)}`);
            if (!resp.ok) throw new Error(`search irregular verbs failed: ${resp.status}`);
            return await resp.json();
        } catch (error) {
            console.error('Error searching irregular verbs:', error);
            return [];
        }
    }

    async getIrregularVerb(infinitive) {
        try {
            const resp = await fetch(`/api/irregular-verbs/${encodeURIComponent(infinitive)}`);
            if (!resp.ok) throw new Error(`get irregular verb failed: ${resp.status}`);
            return await resp.json();
        } catch (error) {
            console.error('Error getting irregular verb:', error);
            return null;
        }
    }

    // Phrasal verbs methods
    async populatePhrasalVerbs() {
        try {
            const resp = await fetch('/api/phrasal-verbs/populate', { method: 'POST' });
            if (!resp.ok) throw new Error(`POST /api/phrasal-verbs/populate failed: ${resp.status}`);
            console.log('Phrasal verbs populated');
            return true;
        } catch (error) {
            console.error('Error populating phrasal verbs:', error);
            return false;
        }
    }

    async searchPhrasalVerbs(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 1) return [];
            const resp = await fetch(`/api/phrasal-verbs/search?q=${encodeURIComponent(searchTerm)}`);
            if (!resp.ok) throw new Error(`search phrasal verbs failed: ${resp.status}`);
            return await resp.json();
        } catch (error) {
            console.error('Error searching phrasal verbs:', error);
            return [];
        }
    }

    async getPhrasalVerbsCount() {
        try {
            const resp = await fetch('/api/phrasal-verbs/count');
            if (!resp.ok) throw new Error(`get phrasal verbs count failed: ${resp.status}`);
            const data = await resp.json();
            return data.count || 0;
        } catch (error) {
            console.error('Error getting phrasal verbs count:', error);
            return 0;
        }
    }

    async getPhrasalVerb(id) {
        try {
            const resp = await fetch(`/api/phrasal-verbs/${encodeURIComponent(id)}`);
            if (!resp.ok) throw new Error(`get phrasal verb failed: ${resp.status}`);
            return await resp.json();
        } catch (error) {
            console.error('Error getting phrasal verb:', error);
            return null;
        }
    }
}

// Initialize service
window.supabaseService = new SupabaseService();
window.supabaseService.loadSyncQueue();
