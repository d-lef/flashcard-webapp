class SupabaseService {
    constructor() {
        this.supabaseUrl = 'https://ysflavogvcdftoguzutz.supabase.co';
        this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzZmxhdm9ndmNkZnRvZ3V6dXR6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2MzE0MzYsImV4cCI6MjA3MTIwNzQzNn0.U8k5SproF3mdBhbzc3KE9D2VIpBL3m6vx9i7BuFJ3QM';
        
        this.client = supabase.createClient(this.supabaseUrl, this.supabaseKey);
        this.syncQueue = [];
        this.isOnline = navigator.onLine;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        window.addEventListener('online', () => {
            try {
                this.isOnline = true;
                console.log('🌐 Network: Online event detected');

                // Add small delay to ensure any concurrent test mode changes are complete
                setTimeout(() => {
                    try {
                        // Double-check we're still online and not in test mode before processing
                        if (this.isOnline && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                            console.log('🌐 Network: Processing sync queue after online event');
                            this.processSyncQueue();
                        } else if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
                            console.log('🌐 Network: Online event ignored - test mode is active');
                        }
                    } catch (error) {
                        console.error('🚨 Network online handler delayed processing error:', error);
                    }
                }, 250); // Small delay to handle race conditions
            } catch (error) {
                console.error('🚨 CRITICAL: Network online event handler error:', error);
            }
        });

        window.addEventListener('offline', () => {
            try {
                this.isOnline = false;
                console.log('🌐 Network: Offline event detected');
            } catch (error) {
                console.error('🚨 CRITICAL: Network offline event handler error:', error);
            }
        });
    }

    async syncDecks() {
        // CRITICAL SAFETY: Never sync decks in test mode to prevent data contamination
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('🧪 BLOCKED: syncDecks() blocked in test mode - returning null to force localStorage fallback');
            return null;
        }

        try {
            console.log('Syncing decks from Supabase...');

            // First, test basic connection
            const { data: testData, error: testError } = await this.client
                .from('decks')
                .select('count', { count: 'exact', head: true });
            
            if (testError) {
                console.error('Supabase connection test failed:', testError);
                throw testError;
            }
            
            console.log('Supabase connection successful, deck count:', testData);
            
            const { data, error } = await this.client
                .from('decks')
                .select(`
                    id,
                    name,
                    created_at,
                    cards (
                        id,
                        front,
                        back,
                        ease,
                        interval,
                        reps,
                        lapses,
                        grade,
                        due_date,
                        last_reviewed,
                        created_at,
                        updated_at
                    )
                `);
            
            if (error) {
                console.error('Supabase select error:', error);
                throw error;
            }
            
            console.log('Raw Supabase data:', data);
            const transformedDecks = this.transformDecksFromSupabase(data);
            console.log('Transformed decks:', transformedDecks);
            
            return transformedDecks;
        } catch (error) {
            console.error('Failed to sync decks from Supabase:', error.message, error);
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
            console.error('Failed to save deck to Supabase:', error);
            this.addToSyncQueue(operation);
            return true; // Return true for UX, will sync later
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
            const { data, error: deckError } = await this.client
                .from('decks')
                .insert([deckData])
                .select();
            
            if (deckError) {
                console.error('Deck insert error:', deckError);
                throw deckError;
            }
            console.log('Deck inserted successfully:', data);
        } else {
            console.log('Updating existing deck:', deckData.id);
            const { data, error: deckError } = await this.client
                .from('decks')
                .update({
                    name: deckData.name
                })
                .eq('id', deckData.id)
                .select();
            
            if (deckError) {
                console.error('Deck update error:', deckError);
                throw deckError;
            }
            console.log('Deck updated successfully:', data);
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
                        // Check if card is truly new - only if it explicitly has isNew=true AND no database timestamps
                        const isNew = card.isNew === true && !card.created_at && !card.updated_at;
                        const result = await this.saveCard(card, deck.id, isNew);
                        
                        // If save was successful, mark card as no longer new/modified
                        if (result) {
                            if (card.isNew) {
                                card.isNew = false;
                                // Also add timestamp to prevent future confusion
                                if (!card.created_at) {
                                    card.created_at = new Date().toISOString();
                                }
                            }
                            card.isModified = false;
                            card.updated_at = new Date().toISOString();
                        }
                    } catch (error) {
                        console.error('Failed to save card:', card.id, error);
                        // Continue with other cards
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

        if (isNew) {
            // Double-check: verify card doesn't exist before inserting
            const { data: existing } = await this.client
                .from('cards')
                .select('id')
                .eq('id', cardData.id)
                .maybeSingle();
            
            if (existing) {
                console.log('Card already exists, updating instead of inserting:', cardData.id);
                const { data, error } = await this.client
                    .from('cards')
                    .update(cardData)
                    .eq('id', cardData.id)
                    .select();
                
                if (error) {
                    console.error('Card update error:', error);
                    throw error;
                }
                console.log('Card updated successfully:', data);
            } else {
                const { data, error } = await this.client
                    .from('cards')
                    .insert([cardData])
                    .select();
                
                if (error) {
                    console.error('Card insert error:', error);
                    throw error;
                }
                console.log('Card inserted successfully:', data);
            }
        } else {
            const { data, error } = await this.client
                .from('cards')
                .update(cardData)
                .eq('id', cardData.id)
                .select();
            
            if (error) {
                console.error('Card update error:', error);
                throw error;
            }
            console.log('Card updated successfully:', data);
        }

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
            const { error } = await this.client
                .from('decks')
                .delete()
                .eq('id', deckId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Failed to delete deck from Supabase:', error);
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
            const { error } = await this.client
                .from('cards')
                .delete()
                .eq('id', cardId);
            
            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Failed to delete card from Supabase:', error);
            this.addToSyncQueue(operation);
            return true;
        }
    }

    addToSyncQueue(operation) {
        // CRITICAL SAFETY: Never queue test operations - they must never reach real database
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('🧪 BLOCKED: Sync queue operation blocked in test mode:', operation.type);
            console.log('🧪 This operation will NOT be persisted or synced (this is intentional)');
            return;
        }

        this.syncQueue.push(operation);

        // Safely persist queue to localStorage
        try {
            localStorage.setItem('supabase_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('Failed to persist sync queue to localStorage:', error);
            // Continue without persistence - better than crashing
        }
    }

    async processSyncQueue() {
        if (!this.isOnline || this.syncQueue.length === 0) return;

        // CRITICAL SAFETY: Never process sync queue in test mode
        // This protects against: offline changes → test mode → online scenario
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('🧪 BLOCKED: Sync queue processing blocked in test mode - preserving queue for later');
            console.log(`🧪 Queue contains ${this.syncQueue.length} operations that will be processed when test mode is disabled`);
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
                this.addToSyncQueue(operation); // Re-queue on failure
            }
        }

        // Clear processed items from localStorage
        try {
            localStorage.setItem('supabase_sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('🚨 CRITICAL: Failed to clear processed sync queue items from localStorage:', error);
            console.error('🚨 Sync queue persistence may be inconsistent');
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
        // CRITICAL SAFETY: Never update review_stats in test mode
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('🧪 BLOCKED: Review stats update blocked in test mode');
            return true; // Return success to prevent error handling
        }

        console.log('Updating review stats for:', { date, isCorrect, allDueCompleted });

        // Always fetch current stats first to properly increment
        const { data: current, error: selectError } = await this.client
            .from('review_stats')
            .select('reviews, correct, lapses, all_due_completed')
            .eq('day', date)
            .single();

        if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows found
            console.error('Failed to get current stats:', selectError);
            throw selectError;
        }

        // Build stats with incremented values
        const newStats = {
            day: date
        };

        if (isCorrect !== null) {
            // Increment review counters
            newStats.reviews = (current?.reviews || 0) + 1;
            newStats.correct = (current?.correct || 0) + (isCorrect ? 1 : 0);
            newStats.lapses = (current?.lapses || 0) + (isCorrect ? 0 : 1);
        } else {
            // Preserve existing values when only updating all_due_completed
            newStats.reviews = current?.reviews || 0;
            newStats.correct = current?.correct || 0;
            newStats.lapses = current?.lapses || 0;
        }

        // Handle all_due_completed
        if (allDueCompleted !== null) {
            newStats.all_due_completed = allDueCompleted;
        } else if (current?.all_due_completed !== undefined) {
            newStats.all_due_completed = current.all_due_completed;
        }

        // Upsert the stats
        const { error: upsertError } = await this.client
            .from('review_stats')
            .upsert(newStats, {
                onConflict: 'day',
                ignoreDuplicates: false
            });

        if (upsertError) {
            console.error('Failed to upsert review stats:', upsertError);
            throw upsertError;
        }

        console.log('Review stats updated successfully:', newStats);
        return true;
    }

    async getReviewStats(startDate, endDate) {
        // CRITICAL SAFETY: Never return user review stats in test mode
        if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
            console.log('🧪 BLOCKED: getReviewStats() blocked in test mode - returning empty array');
            return [];
        }

        try {
            let query = this.client
                .from('review_stats')
                .select('day, reviews, correct, lapses, all_due_completed')
                .order('day', { ascending: false });

            if (startDate) {
                query = query.gte('day', startDate);
            }
            if (endDate) {
                query = query.lte('day', endDate);
            }

            const { data, error } = await query;

            if (error) {
                console.error('Failed to get review stats:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Failed to fetch review stats:', error);
            return [];
        }
    }

    // DANGEROUS FUNCTION REMOVED: clearAllData() was unused and could destroy all user data

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
            // Check if verbs already exist by trying to select one verb
            const { data: existing, error: countError } = await this.client
                .from('irregular_verbs')
                .select('infinitive')
                .limit(1);
            
            if (countError) throw countError;
            
            if (existing && existing.length > 0) {
                console.log('Irregular verbs already populated');
                return true;
            }

            console.log('Populating irregular verbs table...');
            
            // Read the irregular verbs JSON file data
            const irregularVerbs = [
                {"infinitive":"arise","simple_past":"arose","past_participle":"arisen","translation_ru":"возникать, появляться"},
                {"infinitive":"awake","simple_past":"awoke","past_participle":"awoken","translation_ru":"просыпаться, будить"},
                {"infinitive":"be","simple_past":"was/were","past_participle":"been","translation_ru":"быть"},
                {"infinitive":"bear","simple_past":"bore","past_participle":"borne","translation_ru":"нести, терпеть, рождать"},
                {"infinitive":"beat","simple_past":"beat","past_participle":"beaten","translation_ru":"бить, побеждать"},
                {"infinitive":"become","simple_past":"became","past_participle":"become","translation_ru":"становиться"},
                {"infinitive":"begin","simple_past":"began","past_participle":"begun","translation_ru":"начинать"},
                {"infinitive":"bend","simple_past":"bent","past_participle":"bent","translation_ru":"гнуть, сгибать"},
                {"infinitive":"bet","simple_past":"bet","past_participle":"bet","translation_ru":"держать пари, ставить"},
                {"infinitive":"bind","simple_past":"bound","past_participle":"bound","translation_ru":"связывать"},
                {"infinitive":"bid","simple_past":"bid","past_participle":"bid","translation_ru":"предлагать цену, велеть"},
                {"infinitive":"bite","simple_past":"bit","past_participle":"bitten","translation_ru":"кусать"},
                {"infinitive":"bleed","simple_past":"bled","past_participle":"bled","translation_ru":"кровоточить"},
                {"infinitive":"blow","simple_past":"blew","past_participle":"blown","translation_ru":"дуть, взрывать"},
                {"infinitive":"break","simple_past":"broke","past_participle":"broken","translation_ru":"ломать, разбивать"},
                {"infinitive":"bring","simple_past":"brought","past_participle":"brought","translation_ru":"приносить"},
                {"infinitive":"build","simple_past":"built","past_participle":"built","translation_ru":"строить"},
                {"infinitive":"buy","simple_past":"bought","past_participle":"bought","translation_ru":"покупать"},
                {"infinitive":"catch","simple_past":"caught","past_participle":"caught","translation_ru":"ловить, поймать"},
                {"infinitive":"choose","simple_past":"chose","past_participle":"chosen","translation_ru":"выбирать"},
                {"infinitive":"come","simple_past":"came","past_participle":"come","translation_ru":"приходить"},
                {"infinitive":"cut","simple_past":"cut","past_participle":"cut","translation_ru":"резать"},
                {"infinitive":"dig","simple_past":"dug","past_participle":"dug","translation_ru":"копать"},
                {"infinitive":"do","simple_past":"did","past_participle":"done","translation_ru":"делать"},
                {"infinitive":"draw","simple_past":"drew","past_participle":"drawn","translation_ru":"рисовать, тянуть"},
                {"infinitive":"drink","simple_past":"drank","past_participle":"drunk","translation_ru":"пить"},
                {"infinitive":"drive","simple_past":"drove","past_participle":"driven","translation_ru":"водить, гнать"},
                {"infinitive":"eat","simple_past":"ate","past_participle":"eaten","translation_ru":"есть, кушать"},
                {"infinitive":"fall","simple_past":"fell","past_participle":"fallen","translation_ru":"падать"},
                {"infinitive":"feed","simple_past":"fed","past_participle":"fed","translation_ru":"кормить"},
                {"infinitive":"feel","simple_past":"felt","past_participle":"felt","translation_ru":"чувствовать"},
                {"infinitive":"find","simple_past":"found","past_participle":"found","translation_ru":"находить"},
                {"infinitive":"flee","simple_past":"fled","past_participle":"fled","translation_ru":"бежать, спасаться"},
                {"infinitive":"fly","simple_past":"flew","past_participle":"flown","translation_ru":"летать"},
                {"infinitive":"forbid","simple_past":"forbade","past_participle":"forbidden","translation_ru":"запрещать"},
                {"infinitive":"forget","simple_past":"forgot","past_participle":"forgotten","translation_ru":"забывать"},
                {"infinitive":"forgive","simple_past":"forgave","past_participle":"forgiven","translation_ru":"прощать"},
                {"infinitive":"freeze","simple_past":"froze","past_participle":"frozen","translation_ru":"замерзать, замораживать"},
                {"infinitive":"get","simple_past":"got","past_participle":"gotten","translation_ru":"получать"},
                {"infinitive":"give","simple_past":"gave","past_participle":"given","translation_ru":"давать"},
                {"infinitive":"go","simple_past":"went","past_participle":"gone","translation_ru":"идти, ехать"},
                {"infinitive":"grow","simple_past":"grew","past_participle":"grown","translation_ru":"расти, выращивать"},
                {"infinitive":"have","simple_past":"had","past_participle":"had","translation_ru":"иметь"},
                {"infinitive":"hear","simple_past":"heard","past_participle":"heard","translation_ru":"слышать"},
                {"infinitive":"hide","simple_past":"hid","past_participle":"hidden","translation_ru":"прятать, скрывать"},
                {"infinitive":"hit","simple_past":"hit","past_participle":"hit","translation_ru":"ударять"},
                {"infinitive":"hold","simple_past":"held","past_participle":"held","translation_ru":"держать"},
                {"infinitive":"keep","simple_past":"kept","past_participle":"kept","translation_ru":"держать, хранить"},
                {"infinitive":"know","simple_past":"knew","past_participle":"known","translation_ru":"знать"},
                {"infinitive":"lead","simple_past":"led","past_participle":"led","translation_ru":"вести, руководить"},
                {"infinitive":"leave","simple_past":"left","past_participle":"left","translation_ru":"покидать, оставлять"},
                {"infinitive":"let","simple_past":"let","past_participle":"let","translation_ru":"позволять"},
                {"infinitive":"lose","simple_past":"lost","past_participle":"lost","translation_ru":"терять"},
                {"infinitive":"make","simple_past":"made","past_participle":"made","translation_ru":"делать, создавать"},
                {"infinitive":"mean","simple_past":"meant","past_participle":"meant","translation_ru":"значить, иметь в виду"},
                {"infinitive":"meet","simple_past":"met","past_participle":"met","translation_ru":"встречать"},
                {"infinitive":"pay","simple_past":"paid","past_participle":"paid","translation_ru":"платить"},
                {"infinitive":"put","simple_past":"put","past_participle":"put","translation_ru":"класть, ставить"},
                {"infinitive":"quit","simple_past":"quit","past_participle":"quit","translation_ru":"бросать, оставлять"},
                {"infinitive":"read","simple_past":"read","past_participle":"read","translation_ru":"читать"},
                {"infinitive":"ride","simple_past":"rode","past_participle":"ridden","translation_ru":"ехать верхом"},
                {"infinitive":"ring","simple_past":"rang","past_participle":"rung","translation_ru":"звонить"},
                {"infinitive":"rise","simple_past":"rose","past_participle":"risen","translation_ru":"подниматься, восставать"},
                {"infinitive":"run","simple_past":"ran","past_participle":"run","translation_ru":"бежать"},
                {"infinitive":"say","simple_past":"said","past_participle":"said","translation_ru":"сказать"},
                {"infinitive":"see","simple_past":"saw","past_participle":"seen","translation_ru":"видеть"},
                {"infinitive":"seek","simple_past":"sought","past_participle":"sought","translation_ru":"искать"},
                {"infinitive":"sell","simple_past":"sold","past_participle":"sold","translation_ru":"продавать"},
                {"infinitive":"send","simple_past":"sent","past_participle":"sent","translation_ru":"отправлять"},
                {"infinitive":"set","simple_past":"set","past_participle":"set","translation_ru":"ставить, устанавливать"},
                {"infinitive":"shake","simple_past":"shook","past_participle":"shaken","translation_ru":"трясти"},
                {"infinitive":"shed","simple_past":"shed","past_participle":"shed","translation_ru":"проливать, сбрасывать"},
                {"infinitive":"show","simple_past":"showed","past_participle":"shown","translation_ru":"показывать"},
                {"infinitive":"shut","simple_past":"shut","past_participle":"shut","translation_ru":"закрывать"},
                {"infinitive":"sing","simple_past":"sang","past_participle":"sung","translation_ru":"петь"},
                {"infinitive":"sink","simple_past":"sank","past_participle":"sunk","translation_ru":"тонуть, погружать"},
                {"infinitive":"sit","simple_past":"sat","past_participle":"sat","translation_ru":"сидеть"},
                {"infinitive":"sleep","simple_past":"slept","past_participle":"slept","translation_ru":"спать"},
                {"infinitive":"speak","simple_past":"spoke","past_participle":"spoken","translation_ru":"говорить"},
                {"infinitive":"speed","simple_past":"sped","past_participle":"sped","translation_ru":"ускорять, мчаться"},
                {"infinitive":"spend","simple_past":"spent","past_participle":"spent","translation_ru":"тратить"},
                {"infinitive":"spring","simple_past":"sprang","past_participle":"sprung","translation_ru":"прыгать, возникать"},
                {"infinitive":"stand","simple_past":"stood","past_participle":"stood","translation_ru":"стоять"},
                {"infinitive":"steal","simple_past":"stole","past_participle":"stolen","translation_ru":"воровать"},
                {"infinitive":"stick","simple_past":"stuck","past_participle":"stuck","translation_ru":"приклеивать, застревать"},
                {"infinitive":"strike","simple_past":"struck","past_participle":"struck","translation_ru":"ударять, бастовать"},
                {"infinitive":"strive","simple_past":"strove","past_participle":"striven","translation_ru":"стремиться"},
                {"infinitive":"swear","simple_past":"swore","past_participle":"sworn","translation_ru":"клясться, ругаться"},
                {"infinitive":"sweep","simple_past":"swept","past_participle":"swept","translation_ru":"подметать"},
                {"infinitive":"swim","simple_past":"swam","past_participle":"swum","translation_ru":"плавать"},
                {"infinitive":"swing","simple_past":"swung","past_participle":"swung","translation_ru":"качаться"},
                {"infinitive":"take","simple_past":"took","past_participle":"taken","translation_ru":"брать"},
                {"infinitive":"teach","simple_past":"taught","past_participle":"taught","translation_ru":"учить, преподавать"},
                {"infinitive":"tear","simple_past":"tore","past_participle":"torn","translation_ru":"рвать"},
                {"infinitive":"think","simple_past":"thought","past_participle":"thought","translation_ru":"думать"},
                {"infinitive":"throw","simple_past":"threw","past_participle":"thrown","translation_ru":"бросать"},
                {"infinitive":"tread","simple_past":"trod","past_participle":"trodden","translation_ru":"ступать"},
                {"infinitive":"understand","simple_past":"understood","past_participle":"understood","translation_ru":"понимать"},
                {"infinitive":"upset","simple_past":"upset","past_participle":"upset","translation_ru":"расстраивать"},
                {"infinitive":"wake","simple_past":"woke","past_participle":"woken","translation_ru":"будить, просыпаться"},
                {"infinitive":"wear","simple_past":"wore","past_participle":"worn","translation_ru":"носить (одежду)"},
                {"infinitive":"weave","simple_past":"wove","past_participle":"woven","translation_ru":"ткать, вплетать"},
                {"infinitive":"weep","simple_past":"wept","past_participle":"wept","translation_ru":"плакать"},
                {"infinitive":"win","simple_past":"won","past_participle":"won","translation_ru":"выигрывать"},
                {"infinitive":"wind","simple_past":"wound","past_participle":"wound","translation_ru":"заводить, извиваться"},
                {"infinitive":"wring","simple_past":"wrung","past_participle":"wrung","translation_ru":"выжимать"},
                {"infinitive":"write","simple_past":"wrote","past_participle":"written","translation_ru":"писать"},
                {"infinitive":"smite","simple_past":"smote","past_participle":"smitten","translation_ru":"разить, поражать"},
                {"infinitive":"shrive","simple_past":"shrove","past_participle":"shriven","translation_ru":"исповедовать"},
                {"infinitive":"gild","simple_past":"gilded/gilt","past_participle":"gilded/gilt","translation_ru":"позолачивать"},
                {"infinitive":"behold","simple_past":"beheld","past_participle":"beheld","translation_ru":"созерцать"}
            ];

            // Insert all verbs
            const { data, error } = await this.client
                .from('irregular_verbs')
                .insert(irregularVerbs);

            if (error) {
                // If it's a duplicate key error, that means verbs are already populated
                if (error.code === '23505') {
                    console.log('Irregular verbs already exist (duplicate key)');
                    return true;
                }
                console.error('Error populating irregular verbs:', error);
                throw error;
            }

            console.log('Successfully populated irregular verbs table with', irregularVerbs.length, 'verbs');
            return true;
        } catch (error) {
            // If it's a duplicate key error, that means verbs are already populated
            if (error.code === '23505') {
                console.log('Irregular verbs already exist (duplicate key)');
                return true;
            }
            console.error('Failed to populate irregular verbs:', error);
            return false;
        }
    }

    async searchIrregularVerbs(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 1) {
                return [];
            }

            const { data, error } = await this.client
                .from('irregular_verbs')
                .select('*')
                .ilike('infinitive', `${searchTerm}%`)
                .order('infinitive')
                .limit(10);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error searching irregular verbs:', error);
            return [];
        }
    }

    async getIrregularVerb(infinitive) {
        try {
            const { data, error } = await this.client
                .from('irregular_verbs')
                .select('*')
                .eq('infinitive', infinitive)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting irregular verb:', error);
            return null;
        }
    }

    // Phrasal verbs methods
    async populatePhrasalVerbs() {
        try {
            // Check if table already has data
            const { count } = await this.client
                .from('verbs_governance')
                .select('*', { count: 'exact', head: true });

            if (count > 0) {
                console.log('Phrasal verbs table already populated');
                return true;
            }

            // Sample phrasal verbs data - you should replace this with your actual data
            const phrasalVerbs = [
                {
                    infinitive: 'look',
                    particle: 'up',
                    preposition: null,
                    full_expression: 'look up',
                    translation: 'искать (в словаре, справочнике)',
                    type: 'phrasal'
                },
                {
                    infinitive: 'give',
                    particle: 'up',
                    preposition: null,
                    full_expression: 'give up',
                    translation: 'сдаваться, отказываться',
                    type: 'phrasal'
                },
                {
                    infinitive: 'put',
                    particle: 'on',
                    preposition: null,
                    full_expression: 'put on',
                    translation: 'надевать',
                    type: 'phrasal'
                },
                {
                    infinitive: 'take',
                    particle: 'off',
                    preposition: null,
                    full_expression: 'take off',
                    translation: 'снимать, взлетать',
                    type: 'phrasal'
                },
                {
                    infinitive: 'get',
                    particle: null,
                    preposition: 'along with',
                    full_expression: 'get along with',
                    translation: 'ладить с кем-то',
                    type: 'prepositional'
                }
                // Add more phrasal verbs here
            ];

            const { error } = await this.client
                .from('verbs_governance')
                .insert(phrasalVerbs);

            if (error) throw error;

            console.log(`Populated ${phrasalVerbs.length} phrasal verbs`);
            return true;
        } catch (error) {
            console.error('Error populating phrasal verbs:', error);
            return false;
        }
    }

    async searchPhrasalVerbs(searchTerm) {
        try {
            if (!searchTerm || searchTerm.length < 1) {
                return [];
            }

            const { data, error } = await this.client
                .from('verbs_governance')
                .select('*')
                .or(`infinitive.ilike.%${searchTerm}%,full_expression.ilike.%${searchTerm}%,translation.ilike.%${searchTerm}%`)
                .order('full_expression')
                .limit(10);

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error searching phrasal verbs:', error);
            return [];
        }
    }

    async getPhrasalVerbsCount() {
        try {
            const { count, error } = await this.client
                .from('verbs_governance')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Error getting phrasal verbs count:', error);
            return 0;
        }
    }

    async getPhrasalVerb(id) {
        try {
            const { data, error } = await this.client
                .from('verbs_governance')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error getting phrasal verb:', error);
            return null;
        }
    }
}

// Initialize Supabase service
window.supabaseService = new SupabaseService();
window.supabaseService.loadSyncQueue();