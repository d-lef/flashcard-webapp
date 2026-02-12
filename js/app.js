class FlashcardApp {
    constructor() {
        this.currentDeck = null;
        this.currentStudyCards = [];
        this.currentCardIndex = 0;
        this.isCardFlipped = false;
        this.studySession = null;
        this.editingCard = null;
        this.editingDeck = null;
        this.studyMode = 'flip'; // 'flip', 'type', or 'combined'
        this.currentAnswer = '';
        this.combinedPairs = []; // array of {card, mode, completed} objects
        this.combinedCardStates = new Map(); // tracks completion per card
        this.selectedCardType = 'flip_type'; // Default card type
        this.cardFormOrigin = 'deck'; // Track where card form was accessed from: 'deck' or 'card-type'

        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.loadInitialView();
        this.updateStats();
        
        // Initialize translations
        if (window.i18n) {
            window.i18n.updatePageTranslations();
        }
        
        // Initialize notification system
        this.initializeNotifications();
        
        // Populate irregular verbs table (one-time setup)
        this.initializeIrregularVerbs();
        
        // Populate phrasal verbs table (one-time setup)
        this.initializePhrasalVerbs();
    }

    setupEventListeners() {
        document.getElementById('overview-tab').addEventListener('click', () => this.showView('overview'));
        document.getElementById('decks-tab').addEventListener('click', () => this.showView('decks'));
        document.getElementById('settings-tab').addEventListener('click', () => this.showView('settings'));
        
        // Calendar navigation removed - showing current month only
        
        document.getElementById('new-deck-btn').addEventListener('click', () => this.showNewDeckModal());
        document.getElementById('new-card-btn').addEventListener('click', () => this.showNewCardForm());
        document.getElementById('new-supercard-btn').addEventListener('click', () => this.showCardTypeSelection());
        
        // Add event listeners for tappable insight cards
        this.setupInsightCardListeners();
        
        document.getElementById('create-deck').addEventListener('click', () => this.createDeck());
        document.getElementById('cancel-deck').addEventListener('click', () => this.hideNewDeckModal());
        document.getElementById('save-card').addEventListener('click', () => this.saveCard());
        document.getElementById('cancel-card').addEventListener('click', () => this.hideNewCardModal());
        document.getElementById('close-stats').addEventListener('click', () => this.hideCardStatsModal());
        
        document.getElementById('flip-card').addEventListener('click', () => this.flipCard());
        
        // Add click handler to the flashcard itself for tapping to flip
        document.getElementById('flashcard').addEventListener('click', (e) => {
            console.log('Flashcard clicked, studyMode:', this.studyMode, 'isCardFlipped:', this.isCardFlipped);
            
            // Only flip if we're in flip mode (or flip phase of combined) and card isn't flipped yet
            // Also prevent flipping when clicking on difficulty buttons
            const isFlipMode = this.studyMode === 'flip' || 
                              (this.studyMode === 'combined' && this.getCurrentCombinedMode() === 'flip');
            
            if (isFlipMode && !this.isCardFlipped && !e.target.closest('.difficulty-buttons')) {
                console.log('Flipping card via tap');
                this.flipCard();
            }
        });
        document.getElementById('again-btn').addEventListener('click', () => this.answerCard('again'));
        document.getElementById('hard-btn').addEventListener('click', () => this.answerCard('hard'));
        document.getElementById('good-btn').addEventListener('click', () => this.answerCard('good'));
        document.getElementById('easy-btn').addEventListener('click', () => this.answerCard('easy'));
        
        // Back to decks button removed - users can use navigation tabs
        document.getElementById('study-deck-btn').addEventListener('click', () => this.showStudyModeSelection());
        
        // Typing mode event listeners - handled dynamically in renderTypingInterface
        document.getElementById('typing-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                console.log('Enter key pressed, button text:', document.getElementById('check-answer')?.textContent);
                // Only check if button still says "Check Answer"
                const checkBtn = document.getElementById('check-answer');
                if (checkBtn && checkBtn.textContent.trim() === window.i18n.translate('study.check_answer')) {
                    console.log('Triggering check answer via Enter');
                    this.checkTypedAnswer();
                } else if (checkBtn && checkBtn.textContent.trim() === window.i18n.translate('actions.continue')) {
                    console.log('Triggering continue via Enter');
                    checkBtn.click();
                }
            }
        });
        
        // Typing mode difficulty buttons were removed - now using inline feedback with continue button

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideNewDeckModal();
                this.hideNewCardModal();
                this.hideCardStatsModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (this.getCurrentView() === 'study') {
                // Don't trigger shortcuts if user is typing in an input field
                const isTyping = document.activeElement.tagName === 'INPUT' || 
                                document.activeElement.tagName === 'TEXTAREA';
                
                if (e.code === 'Space' && !isTyping) {
                    e.preventDefault();
                    // Only allow spacebar flip in flip mode or flip phase of combined mode
                    if (this.studyMode === 'flip' || 
                        (this.studyMode === 'combined' && this.getCurrentCombinedMode() === 'flip')) {
                        if (!this.isCardFlipped) {
                            this.flipCard();
                        }
                    }
                } else if (this.isCardFlipped && !isTyping) {
                    switch (e.key) {
                        case '1': this.answerCard('again'); break;
                        case '2': this.answerCard('hard'); break;
                        case '3': this.answerCard('good'); break;
                        case '4': this.answerCard('easy'); break;
                    }
                }
            }
        });

        // Card creation flow event listeners
        document.getElementById('back-to-deck-from-card-type').addEventListener('click', () => this.showView('deck'));
        document.getElementById('back-to-card-type').addEventListener('click', () => this.goBackFromCardForm());
        document.getElementById('save-new-card').addEventListener('click', () => this.saveNewCard());
        
        // Edit card flow event listeners
        document.getElementById('back-to-deck-from-edit').addEventListener('click', () => this.showView('deck'));
        document.getElementById('save-edited-card').addEventListener('click', () => this.saveEditedCard());
        document.getElementById('delete-card').addEventListener('click', () => this.deleteCurrentCard());
        
        // Card type selection event listeners (will be added dynamically in renderCardTypeSelection)
        
        // Irregular verbs event listeners
        this.setupIrregularVerbsEventListeners();
        
        // Phrasal verbs event listeners
        this.setupPhrasalVerbsEventListeners();
        
        // Notification settings event listeners
        this.setupNotificationEventListeners();
    }

    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(`${viewName}-view`).classList.add('active');
        const tabBtn = document.getElementById(`${viewName}-tab`);
        if (tabBtn) tabBtn.classList.add('active');
        
        // Manage scrolling behavior for mobile
        this.manageScrolling(viewName);
        
        switch (viewName) {
            case 'overview':
                this.renderOverview();
                break;
            case 'decks':
                this.renderDecks();
                break;
            case 'settings':
                // Settings view is static, no rendering needed
                break;
            case 'study':
                this.renderStudyCard();
                break;
            case 'deck':
                this.renderDeckView();
                break;
            case 'card-type':
                this.renderCardTypeSelection();
                break;
            case 'card-form':
                this.renderCardForm();
                break;
            case 'edit-card':
                this.renderEditCard();
                break;
            case 'irregular-verbs':
                this.renderIrregularVerbsView();
                break;
            case 'irregular-verb-preview':
                // Preview is handled by selectVerb method
                break;
            case 'phrasal-verbs':
                this.renderPhrasalVerbsView();
                break;
            case 'phrasal-verb-preview':
                // Preview is handled by selectPhrasalVerb method
                break;
        }
    }

    manageScrolling(viewName) {
        // Only apply scroll management on mobile devices
        if (window.innerWidth <= 768) {
            setTimeout(() => {
                const activeView = document.getElementById(`${viewName}-view`);
                const viewContent = activeView.querySelector('.overview-container, .decks-grid, .settings-container') || activeView;
                
                // Check if content height exceeds available viewport height
                const headerHeight = document.querySelector('header').offsetHeight;
                const availableHeight = window.innerHeight - headerHeight - 40; // 40px for padding
                const contentHeight = viewContent.scrollHeight;
                
                // Only prevent body scrolling if content fits in the available space
                if (contentHeight <= availableHeight && (viewName === 'overview' || viewName === 'settings' || viewName === 'decks')) {
                    document.body.classList.add('no-scroll');
                } else {
                    document.body.classList.remove('no-scroll');
                }
            }, 100); // Small delay to ensure content is rendered
        } else {
            document.body.classList.remove('no-scroll');
        }
    }

    getCurrentView() {
        return document.querySelector('.view.active').id.replace('-view', '');
    }

    loadInitialView() {
        this.showView('overview');
    }

    async renderOverview() {
        const decks = await storage.loadDecks();
        
        // Calculate insights for each panel separately
        let dueCount = 0;        // Cards due today (not including new)
        let overdueCount = 0;    // Cards overdue
        let newCardsCount = 0;   // New cards (never studied)
        let futureCardsCount = 0; // Cards scheduled for future dates
        let totalCards = 0;
        const today = this.getLocalDateString();
        
        decks.forEach(deck => {
            totalCards += deck.cards.length;
            deck.cards.forEach(card => {
                const cardDueDate = card.dueDate || card.due_date || card.nextReview;
                
                // Separate new cards from due cards
                if (!cardDueDate || (card.reps || card.repetitions || 0) === 0) {
                    newCardsCount++; // New cards count separately
                } else {
                    const cardDueDateOnly = cardDueDate.split('T')[0]; // Handle both date and datetime
                    if (cardDueDateOnly === today) {
                        dueCount++; // Due today
                    } else if (cardDueDateOnly < today) {
                        overdueCount++; // Overdue
                    } else if (cardDueDateOnly > today) {
                        futureCardsCount++; // Scheduled for future
                    }
                }
            });
        });
        
        // Calculate all cards that can be studied (due + overdue + new)
        const allCardsCount = dueCount + overdueCount + newCardsCount;
        
        // Get today's review stats
        let reviewedToday = 0;
        try {
            // SAFETY: Don't access database in test mode
            if (window.supabaseService && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                const stats = await window.supabaseService.getReviewStats(today, today);
                reviewedToday = stats.length > 0 ? stats[0].reviews : 0;
            }
        } catch (error) {
            console.log('Could not fetch review stats:', error);
        }
        
        // Get streak from statistics
        let streak = 0;
        if (window.statistics) {
            try {
                streak = await window.statistics.calculateStreak();
            } catch (error) {
                console.log('Could not calculate streak:', error);
            }
        }
        
        // Update insight cards
        document.getElementById('all-cards-count').textContent = allCardsCount;
        document.getElementById('due-cards-count').textContent = dueCount;
        document.getElementById('overdue-cards-count').textContent = overdueCount;
        document.getElementById('new-cards-count').textContent = newCardsCount;
        document.getElementById('future-cards-count').textContent = futureCardsCount;
        document.getElementById('overview-streak-count').textContent = streak;
        
        // Render compact study calendar
        if (window.statistics) {
            await this.renderOverviewCalendar();
        }
    }

    async renderOverviewCalendar() {
        // Always show current month only
        const currentDate = new Date();
        
        // Update month title
        const monthElement = document.getElementById('overview-current-month');
        if (monthElement) {
            monthElement.textContent = currentDate.toLocaleDateString('en-US', { 
                month: 'long', 
                year: 'numeric' 
            });
        }
        
        // Render calendar using the same logic as statistics module
        const calendarContainer = document.getElementById('overview-study-calendar');
        
        if (window.statistics && calendarContainer) {
            if (typeof window.statistics.renderCalendarMonth === 'function') {
                await window.statistics.renderCalendarMonth(currentDate, calendarContainer, true);
            }
        }
    }

    async renderDecks() {
        const decks = await storage.loadDecks();
        const decksList = document.getElementById('decks-list');
        
        if (decks.length === 0) {
            decksList.innerHTML = `<div class="empty-state"><p>${window.i18n.translate('decks.empty_state')}</p></div>`;
            return;
        }
        
        decksList.innerHTML = decks.map(deck => {
            return `
                <div class="deck-card" data-deck-id="${deck.id}">
                    <div class="deck-actions">
                        <button class="deck-edit-btn" data-deck-id="${deck.id}" title="Edit deck">✏️</button>
                        <button class="deck-delete-btn" data-deck-id="${deck.id}" title="Delete deck">🗑️</button>
                    </div>
                    <div class="deck-content">
                        <h3>${this.escapeHtml(deck.name)}</h3>
                        <div class="card-count">${deck.cards.length === 1 ? window.i18n.translate('decks.card_count_one') : window.i18n.translate('decks.card_count').replace('{0}', deck.cards.length)}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add click handler for opening decks (but not when clicking action buttons)
        document.querySelectorAll('.deck-card .deck-content').forEach(content => {
            content.addEventListener('click', async (e) => {
                const deckId = e.target.closest('.deck-card').dataset.deckId;
                await this.openDeck(deckId);
            });
        });
        
        // Add handlers for deck management buttons
        document.querySelectorAll('.deck-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const deckId = e.target.dataset.deckId;
                this.editDeck(deckId);
            });
        });
        
        document.querySelectorAll('.deck-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const deckId = e.target.dataset.deckId;
                await this.deleteDeck(deckId);
            });
        });
    }

    async openDeck(deckId) {
        const decks = await storage.loadDecks();
        this.currentDeck = decks.find(d => d.id === deckId);
        if (this.currentDeck) {
            this.showView('deck');
        }
    }

    renderDeckView() {
        if (!this.currentDeck) return;
        
        document.getElementById('deck-title').textContent = this.currentDeck.name;
        
        const cardsList = document.getElementById('cards-list');
        if (this.currentDeck.cards.length === 0) {
            cardsList.innerHTML = `<div class="empty-state"><p>${window.i18n.translate('cards.empty_state')}</p></div>`;
            return;
        }
        
        cardsList.innerHTML = this.currentDeck.cards.map(card => `
            <div class="card-item">
                <div class="card-item-content" data-card-id="${card.id}">
                    <div class="card-item-front">${this.escapeHtml(card.back)}</div>
                    <div class="card-item-back">${this.escapeHtml(card.front)}</div>
                </div>
                <div class="card-actions">
                    <button class="card-edit-btn" data-card-id="${card.id}" title="Edit card">✏️</button>
                    <button class="card-delete-btn" data-card-id="${card.id}" title="Delete card">🗑️</button>
                </div>
            </div>
        `).join('');
        
        // Add click handler for card content to show statistics
        document.querySelectorAll('.card-item-content').forEach(content => {
            content.addEventListener('click', (e) => {
                const cardId = e.target.closest('.card-item-content').dataset.cardId;
                this.showCardStats(cardId);
            });
        });
        
        // Add event listeners for card management buttons
        document.querySelectorAll('.card-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cardId = e.target.dataset.cardId;
                this.editCard(cardId);
            });
        });
        
        document.querySelectorAll('.card-delete-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const cardId = e.target.dataset.cardId;
                await this.deleteCard(cardId);
            });
        });
    }

    showStudyModeSelection() {
        if (!this.currentDeck) return;

        // For deck study, include ALL cards regardless of schedule
        if (this.currentDeck.cards.length === 0) {
            alert(window.i18n.translate('alerts.no_cards_in_deck'));
            return;
        }

        // Clear any previous study-all session so startStudySessionWithMode
        // takes the single-deck branch instead of reusing stale study-all state
        this.studySession = null;

        // Directly start combined mode instead of showing mode selection
        this.startStudySessionWithMode('combined');
    }
    
    startStudySessionWithMode(mode = 'flip') {
        this.studyMode = mode;
        
        if (this.studySession && this.studySession.isStudyAll) {
            // Study all mode - cards already set
            this.currentCardIndex = 0;
            this.isCardFlipped = false;
        } else {
            // Single deck mode - study ALL cards in deck regardless of schedule
            if (!this.currentDeck) return;
            
            // Use all cards from the deck, not just due cards
            this.currentStudyCards = [...this.currentDeck.cards];
            
            if (this.currentStudyCards.length === 0) {
                alert(window.i18n.translate('alerts.no_cards_in_deck'));
                return;
            }
            
            this.currentCardIndex = 0;
            this.isCardFlipped = false;
            this.studySession = {
                startTime: new Date(),
                cardsStudied: 0
            };
        }
        
        // Initialize combined mode pairs
        if (mode === 'combined') {
            this.initializeCombinedPairs();
        }
        
        this.showView('study');
    }

    renderStudyCard() {
        if (this.studyMode === 'combined') {
            this.renderCombinedPairInterface();
            return;
        }
        
        if (!this.currentStudyCards.length) return;
        
        const card = this.currentStudyCards[this.currentCardIndex];
        const progress = ((this.currentCardIndex + 1) / this.currentStudyCards.length) * 100;
        
        document.getElementById('progress-fill').style.width = `${progress}%`;
        
        // Show appropriate interface based on study mode
        if (this.studyMode === 'type') {
            this.renderTypingInterface(card);
        } else {
            this.renderFlipInterface(card);
        }
    }
    
    getCurrentCombinedMode() {
        if (this.studyMode !== 'combined' || this.currentCardIndex >= this.combinedPairs.length) {
            return null;
        }
        return this.combinedPairs[this.currentCardIndex].mode;
    }
    
    transitionToInterface(newType, callback) {
        // Get current visible interface
        const flashcard = document.getElementById('flashcard');
        const typingInterface = document.getElementById('typing-interface');
        
        let currentInterface = null;
        if (flashcard.style.display !== 'none') {
            currentInterface = flashcard;
        } else if (typingInterface.style.display !== 'none') {
            currentInterface = typingInterface;
        }
        
        if (currentInterface) {
            // Add exit animation
            currentInterface.classList.add('transitioning-out');
            setTimeout(() => {
                currentInterface.classList.remove('transitioning-out');
                callback();
            }, 300);
        } else {
            // No current interface, just show new one
            callback();
        }
    }
    
    renderFlipInterface(card) {
        // Add transition animation
        this.transitionToInterface('flip', () => {
            document.getElementById('flashcard').style.display = 'block';
            document.getElementById('typing-interface').style.display = 'none';
            document.querySelector('.study-actions').style.display = 'none'; // Hide flip button area
            
            // Always hide combined progress (we removed the step-by-step progress)
            document.getElementById('combined-progress').style.display = 'none';
            
            document.getElementById('card-front').textContent = card.front;
            document.getElementById('card-back').textContent = card.back;
            
            document.getElementById('flashcard').classList.remove('flipped');
            document.getElementById('flip-card').style.display = 'none'; // Hide flip button
            document.querySelector('.difficulty-buttons').style.display = 'none';
            
            this.isCardFlipped = false;
            
            // Apply entrance animation
            const flashcard = document.getElementById('flashcard');
            flashcard.classList.add('transitioning-in');
            setTimeout(() => flashcard.classList.remove('transitioning-in'), 300);
        });
    }
    
    renderTypingInterface(card) {
        // Add transition animation  
        this.transitionToInterface('typing', () => {
            document.getElementById('flashcard').style.display = 'none';
            document.getElementById('typing-interface').style.display = 'block';
            document.querySelector('.study-actions').style.display = 'none';
            
            // Always hide combined progress (we removed the step-by-step progress)
            document.getElementById('combined-progress').style.display = 'none';
            
            document.getElementById('typing-front').textContent = card.front;
            document.getElementById('typing-input').value = '';
            document.getElementById('inline-result').style.display = 'none';
            document.getElementById('typing-input').focus();
            
            // Reset check answer button
            const checkBtn = document.getElementById('check-answer');
            checkBtn.textContent = window.i18n.translate('study.check_answer');
            // Clear all event handlers
            checkBtn.onclick = null;
            checkBtn.onmousedown = null;
            checkBtn.ontouchstart = null;
            // Remove all event listeners by cloning
            const newBtn = checkBtn.cloneNode(true);
            checkBtn.parentNode.replaceChild(newBtn, checkBtn);
            // Add single clean event listener
            document.getElementById('check-answer').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Check answer button clicked');
                this.checkTypedAnswer();
            });
            
            // Set up "I don't remember" button
            const dontRememberBtn = document.getElementById('dont-remember');
            // Clear all event handlers
            dontRememberBtn.onclick = null;
            dontRememberBtn.onmousedown = null;
            dontRememberBtn.ontouchstart = null;
            // Remove all event listeners by cloning
            const newDontRememberBtn = dontRememberBtn.cloneNode(true);
            dontRememberBtn.parentNode.replaceChild(newDontRememberBtn, dontRememberBtn);
            // Add single clean event listener
            document.getElementById('dont-remember').addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Dont remember button clicked');
                this.handleDontRemember();
            });
            
            this.currentAnswer = card.back;
            
            // Apply entrance animation
            const typingInterface = document.getElementById('typing-interface');
            typingInterface.classList.add('transitioning-in');
            setTimeout(() => typingInterface.classList.remove('transitioning-in'), 300);
        });
    }
    
    initializeCombinedPairs() {
        this.combinedPairs = [];
        this.combinedCardStates = new Map();
        
        // Create ONE pair per card with mode selection based on card type
        this.currentStudyCards.forEach(card => {
            let selectedMode;
            
            const cardType = card.card_type || 'flip_type'; // Default to flip_type for existing cards
            
            if (cardType === 'flip') {
                // Flip-only cards always use flip mode
                selectedMode = 'flip';
            } else {
                // flip_type cards randomly choose between flip and type
                selectedMode = Math.random() < 0.5 ? 'type' : 'flip';
            }
            this.combinedPairs.push({ 
                card: card, 
                mode: selectedMode, 
                completed: false,
                needsReshuffle: false
            });
            
            // Track completion state for each card
            this.combinedCardStates.set(card.id, {
                currentMode: selectedMode,
                completed: false,
                failed: false
            });
        });
        
        // Shuffle the pairs
        this.shuffleArray(this.combinedPairs);
        
        console.log('Combined pairs created:', this.combinedPairs.length, 'cards with modes based on card types');
    }
    
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
    
    renderCombinedPairInterface() {
        if (this.currentCardIndex >= this.combinedPairs.length) {
            this.finishStudySession();
            return;
        }
        
        const currentPair = this.combinedPairs[this.currentCardIndex];
        const card = currentPair.card;
        const mode = currentPair.mode;
        
        // Hide combined progress indicator (no longer needed)
        document.getElementById('combined-progress').style.display = 'none';
        
        // Update progress bar
        const completedPairs = this.combinedPairs.filter(p => p.completed).length;
        const totalPairs = this.combinedPairs.length;
        const progress = totalPairs > 0 ? (completedPairs / totalPairs) * 100 : 0;
        
        document.getElementById('progress-fill').style.width = `${progress}%`;
        
        if (mode === 'type') {
            this.renderTypingInterface(card);
        } else {
            this.renderFlipInterface(card);
        }
    }

    flipCard() {
        document.getElementById('flashcard').classList.add('flipped');
        document.getElementById('flip-card').style.display = 'none';
        document.querySelector('.difficulty-buttons').style.display = 'grid';
        this.isCardFlipped = true;
    }

    async answerCard(difficulty) {
        if (!this.isCardFlipped && this.studyMode !== 'type' && this.getCurrentCombinedMode() !== 'type') return;
        
        if (this.studyMode === 'combined') {
            await this.handleCombinedAnswer(difficulty);
        } else {
            await this.handleRegularAnswer(difficulty);
        }
    }
    
    async handleCombinedAnswer(difficulty) {
        const currentPair = this.combinedPairs[this.currentCardIndex];
        const card = currentPair.card;
        const mode = currentPair.mode;
        const cardState = this.combinedCardStates.get(card.id);
        
        // Check if this is a failure (Again or typing failure)
        const isFailed = difficulty === 'again' || 
                        (mode === 'type' && (difficulty === 'hard' || difficulty === 'again'));
        
        if (isFailed) {
            // Mark as failed and reshuffle back into the deck
            cardState.failed = true;
            currentPair.needsReshuffle = true;
            
            // Create a new pair for this card and add it back to the deck
            const newRandomMode = Math.random() < 0.5 ? 'type' : 'flip';
            const newPair = {
                card: card,
                mode: newRandomMode,
                completed: false,
                needsReshuffle: false
            };
            
            // Insert the new pair at a random position in the remaining cards
            const remainingCards = this.combinedPairs.length - this.currentCardIndex - 1;
            const insertPosition = this.currentCardIndex + 1 + Math.floor(Math.random() * Math.max(1, remainingCards));
            this.combinedPairs.splice(insertPosition, 0, newPair);
            
            // Update card state for the new attempt
            cardState.currentMode = newRandomMode;
            cardState.failed = false;
            
            console.log(`Card "${card.front}" failed, reshuffled as ${newRandomMode} mode at position ${insertPosition}`);
        } else {
            // Success - mark as completed and update with spaced repetition
            currentPair.completed = true;
            cardState.completed = true;
            
            const updatedCard = spacedRepetition.updateCardAfterReview(card, difficulty);
            await this.updateCardInStorage(updatedCard);
            
            // Track review stats
            await this.trackReviewStat(difficulty, updatedCard.id);
            
            this.studySession.cardsStudied++;
            
            console.log(`Card "${card.front}" completed successfully in ${mode} mode`);
        }
        
        this.moveToNextPair();
    }
    
    async handleRegularAnswer(difficulty) {
        const card = this.currentStudyCards[this.currentCardIndex];
        const updatedCard = spacedRepetition.updateCardAfterReview(card, difficulty);
        await this.updateCardInStorage(updatedCard);
        
        // Track review stats
        await this.trackReviewStat(difficulty, updatedCard.id);
        
        this.studySession.cardsStudied++;
        this.currentCardIndex++;

        if (this.currentCardIndex >= this.currentStudyCards.length) {
            this.finishStudySession();
        } else {
            // Reset interfaces for next card
            if (this.studyMode === 'type') {
                document.querySelector('.typing-input-area').style.display = 'flex';
                document.getElementById('inline-result').style.display = 'none';
            }
            this.renderStudyCard();
        }
    }
    
    // Helper function to get local date string (YYYY-MM-DD)
    getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    async trackReviewStat(difficulty, cardId) {
        try {
            const today = this.getLocalDateString(); // YYYY-MM-DD format
            const isCorrect = difficulty === 'good' || difficulty === 'easy';
            
            // Initialize daily reviewed cards tracker if needed
            if (!this.reviewedCardsToday) {
                this.reviewedCardsToday = new Set();
            }
            
            // Reset tracker if it's a new day
            if (this.lastReviewDate !== today) {
                this.reviewedCardsToday.clear();
                this.lastReviewDate = today;
            }
            
            // Check if this is the first time reviewing this card today
            const isFirstReviewToday = !this.reviewedCardsToday.has(cardId);
            this.reviewedCardsToday.add(cardId);
            
            // Only check all_due_completed for "Study All Cards" sessions (scheduled reviews)
            // Individual deck study shouldn't affect calendar coloring or streaks
            // Don't check completion during session - only at the end
            const isScheduledStudy = this.studySession && this.studySession.isStudyAll;
            const allDueCompleted = null; // Will be set properly at session end
            
            // SAFETY: Don't update database in test mode
            if (window.supabaseService && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                await window.supabaseService.updateReviewStats(today, isCorrect, allDueCompleted, isFirstReviewToday);
            }
            
            // Also store locally as fallback for calendar display
            this.storeLocalReviewStat(today, isCorrect, allDueCompleted);
        } catch (error) {
            console.error('Failed to track review stat:', error);
            // Still store locally for calendar display
            const today = this.getLocalDateString();
            const isCorrect = difficulty === 'good' || difficulty === 'easy';
            this.storeLocalReviewStat(today, isCorrect);
        }
    }

    storeLocalReviewStat(date, isCorrect, allDueCompleted = null) {
        try {
            // SAFETY: In test mode, use test data manager instead of localStorage
            if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
                if (window.testDataManager) {
                    const stats = window.testDataManager.getReviewStats();
                    const dateStr = date; // Keep the original date format (YYYY-MM-DD)

                    // Find or create entry for this date
                    let dayStats = stats.find(s => s.date === dateStr);
                    if (!dayStats) {
                        dayStats = { date: dateStr, cardsReviewed: 0, correctAnswers: 0, allDueCompleted: null };
                        stats.push(dayStats);
                    }

                    // Update test stats
                    if (isCorrect !== null) {
                        dayStats.cardsReviewed++;
                        if (isCorrect) {
                            dayStats.correctAnswers++;
                        }
                    }

                    // Update all_due_completed if provided
                    if (allDueCompleted !== null) {
                        dayStats.allDueCompleted = allDueCompleted;
                        console.log(`🧪 Test review stats: allDueCompleted set to ${allDueCompleted} for ${dateStr}`);
                    }

                    // Update the test data manager with modified stats
                    window.testDataManager.updateReviewStats(stats);

                    console.log('🧪 Test review stats updated');
                }
                return;
            }

            // Normal mode - use localStorage
            const key = 'flashcard_app_review_stats';
            let stats = {};
            try {
                const data = localStorage.getItem(key);
                stats = data ? JSON.parse(data) : {};
            } catch (error) {
                console.error('🚨 CRITICAL: Failed to load review stats from localStorage:', error);
                console.error('🚨 Using empty stats to prevent app crash');
                stats = {};
            }

            if (!stats[date]) {
                stats[date] = { reviews: 0, correct: 0, lapses: 0 };
            }

            // Only increment counters if isCorrect is not null (meaning this is an actual review)
            if (isCorrect !== null) {
                stats[date].reviews++;
                if (isCorrect) {
                    stats[date].correct++;
                } else {
                    stats[date].lapses++;
                }
            }

            // Update all_due_completed if provided
            if (allDueCompleted !== null) {
                stats[date].all_due_completed = allDueCompleted;
            }

            localStorage.setItem(key, JSON.stringify(stats));
        } catch (error) {
            console.error('Failed to store local review stat:', error);
        }
    }

    async updateCardInStorage(updatedCard) {
        if (this.studySession.isStudyAll) {
            // Find the deck that contains this card and update it
            const decks = await storage.loadDecks();
            const targetDeck = decks.find(deck => 
                deck.cards.some(c => c.id === updatedCard.id)
            );
            if (targetDeck) {
                const cardIndex = targetDeck.cards.findIndex(c => c.id === updatedCard.id);
                if (cardIndex >= 0) {
                    targetDeck.cards[cardIndex] = updatedCard;
                    await storage.saveDeck(targetDeck);
                }
            }
        } else {
            // Single deck study
            const deckIndex = this.currentDeck.cards.findIndex(c => c.id === updatedCard.id);
            if (deckIndex >= 0) {
                this.currentDeck.cards[deckIndex] = updatedCard;
                await storage.saveDeck(this.currentDeck);
            }
        }
    }
    
    moveToNextPair() {
        this.currentCardIndex++;

        if (this.currentCardIndex >= this.combinedPairs.length) {
            this.finishStudySession();
        } else {
            // Reset typing interface
            document.querySelector('.typing-input-area').style.display = 'flex';
            document.getElementById('inline-result').style.display = 'none';
            this.renderStudyCard();
        }
    }

    
    checkTypedAnswer() {
        console.log('checkTypedAnswer called');
        const userAnswer = document.getElementById('typing-input').value.trim();
        const correctAnswer = this.currentAnswer;
        
        console.log('User answer:', userAnswer, 'Correct answer:', correctAnswer);
        
        if (!userAnswer) {
            alert(window.i18n.translate('alerts.type_answer_first'));
            return;
        }
        
        const result = this.compareAnswers(userAnswer, correctAnswer);
        console.log('Comparison result:', result);
        
        // Automatically assign difficulty based on typing accuracy
        let difficulty;
        if (result === 'correct') {
            difficulty = 'good';
        } else if (result === 'partial') {
            difficulty = 'hard';
        } else {
            difficulty = 'again';
        }
        
        console.log('Assigned difficulty:', difficulty);
        
        // Show brief feedback before automatically proceeding
        this.showTypingFeedback(result, userAnswer, correctAnswer, difficulty);
    }
    
    handleDontRemember() {
        console.log('handleDontRemember called');
        const correctAnswer = this.currentAnswer;
        
        // Show the correct answer immediately with "again" difficulty
        this.showTypingFeedback('dont-remember', '', correctAnswer, 'again');
    }
    
    compareAnswers(userAnswer, correctAnswer) {
        const user = userAnswer.toLowerCase().trim();
        const correct = correctAnswer.toLowerCase().trim();
        
        // Exact match
        if (user === correct) {
            return 'correct';
        }
        
        // Calculate character-level similarity using Levenshtein distance
        const similarity = this.calculateCharacterSimilarity(user, correct);
        
        // 90%+ similarity = correct (good)
        if (similarity >= 0.9) {
            return 'correct';
        } 
        // 70%+ similarity = partial (hard) - allowing for minor typos/missing letters
        else if (similarity >= 0.7) {
            return 'partial';
        } 
        // Below 70% = incorrect (again)
        else {
            return 'incorrect';
        }
    }
    
    calculateCharacterSimilarity(str1, str2) {
        // Calculate similarity using Levenshtein distance
        const distance = this.levenshteinDistance(str1, str2);
        const maxLength = Math.max(str1.length, str2.length);
        
        if (maxLength === 0) return 1; // Both empty strings
        
        return 1 - (distance / maxLength);
    }
    
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        // Create matrix
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        // Fill matrix
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    showTypingFeedback(result, userAnswer, correctAnswer, difficulty) {
        console.log('showTypingFeedback called with:', { result, userAnswer, correctAnswer, difficulty });
        
        // Hide the typing input area
        document.querySelector('.typing-input-area').style.display = 'none';
        
        // Show inline feedback in the typing interface
        const inlineResult = document.getElementById('inline-result');
        const inlineStatus = document.getElementById('inline-status');
        const inlineCorrectAnswer = document.getElementById('inline-correct-answer');
        const inlineUserAnswer = document.getElementById('inline-user-answer');
        const continueContainer = document.getElementById('continue-button-container');
        const checkBtn = document.getElementById('check-answer');
        
        console.log('Elements found:', { 
            inlineResult: !!inlineResult, 
            inlineStatus: !!inlineStatus, 
            inlineCorrectAnswer: !!inlineCorrectAnswer, 
            checkBtn: !!checkBtn 
        });
        
        if (!inlineResult || !inlineStatus || !inlineCorrectAnswer || !inlineUserAnswer || !continueContainer) {
            console.error('Missing required elements for inline feedback');
            return;
        }
        
        // Always show the user's answer
        inlineUserAnswer.textContent = userAnswer || '(no answer)';
        inlineUserAnswer.style.display = 'block';
        
        // Set feedback text and color
        if (result === 'correct') {
            inlineStatus.textContent = '✅ Correct!';
            inlineStatus.style.color = '#2ed573';
            inlineCorrectAnswer.style.display = 'none';
        } else if (result === 'dont-remember') {
            inlineStatus.textContent = '💭 That\'s okay, here\'s the answer:';
            inlineStatus.style.color = '#ffa502';
            // Hide user answer since they didn't provide one
            inlineUserAnswer.style.display = 'none';
            // Show correct answer inline
            inlineCorrectAnswer.textContent = correctAnswer;
            inlineCorrectAnswer.style.display = 'block';
        } else {
            if (result === 'partial') {
                inlineStatus.textContent = '⚠️ Close! (Minor mistakes)';
                inlineStatus.style.color = '#ffa502';
            } else {
                inlineStatus.textContent = '❌ Incorrect';
                inlineStatus.style.color = '#ff3838';
            }
            // Show correct answer inline
            inlineCorrectAnswer.textContent = correctAnswer;
            inlineCorrectAnswer.style.display = 'block';
        }
        
        // Show the inline result and continue button
        inlineResult.style.display = 'block';
        continueContainer.style.display = 'block';
        console.log('Inline result should now be visible');
        
        // Add continue button click handler
        const continueBtn = document.getElementById('continue-typing');
        // Remove any existing listeners
        const newContinueBtn = continueBtn.cloneNode(true);
        continueBtn.parentNode.replaceChild(newContinueBtn, continueBtn);
        
        document.getElementById('continue-typing').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Continue button clicked by user');
            
            // Hide inline result and show typing input again for next card
            inlineResult.style.display = 'none';
            continueContainer.style.display = 'none';
            inlineUserAnswer.style.display = 'none';
            document.querySelector('.typing-input-area').style.display = 'flex';
            
            // Automatically answer with calculated difficulty
            if (this.studyMode === 'combined') {
                this.handleCombinedAnswer(difficulty);
            } else {
                this.answerCard(difficulty);
            }
        });
        
        console.log('showTypingFeedback completed successfully');
    }
    
    
    
    async finishStudySession() {
        if (this.studySession && this.studySession.isStudyAll) {
            // Check if all due cards have been completed at session end
            const allDueCompleted = await this.checkAllDueCompleted();
            const today = this.getLocalDateString();
            
            // Update the final all_due_completed status in review stats
            // SAFETY: Don't update database in test mode
            if (window.supabaseService && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                await window.supabaseService.updateReviewStats(today, null, allDueCompleted, false);
            }
            this.storeLocalReviewStat(today, null, allDueCompleted);
            
            // Update basic study stats (streak is calculated by statistics.js from review data)
            const stats = storage.loadStats();
            const todayDateString = this.getLocalDateString();
            const lastStudyDate = stats.lastStudyDate ? this.getLocalDateString(new Date(stats.lastStudyDate)) : null;

            console.log(`📊 Study session completed. AllDueCompleted: ${allDueCompleted}`);
            
            storage.updateStats({
                cardsStudiedToday: (lastStudyDate === todayDateString ? stats.cardsStudiedToday : 0) + this.studySession.cardsStudied,
                lastStudyDate: new Date().toISOString()
            });
            
            // Check if all study session cards are completed (for confetti)
            const allStudySessionCardsCompleted = await this.checkAllStudySessionCardsCompleted();

            // Celebrate with confetti if all study session cards completed
            console.log(`🎉 Study session completed! allStudySessionCardsCompleted: ${allStudySessionCardsCompleted}, allDueCompleted: ${allDueCompleted}`);
            if (allStudySessionCardsCompleted) {
                console.log('🎊 Triggering confetti celebration - all study session cards completed!');
                this.celebrateWithConfetti();
            } else {
                console.log('❌ No confetti - not all study session cards completed');
            }
            
            // Get current streak from statistics system
            let currentStreak = 0;
            if (window.statistics) {
                try {
                    currentStreak = await window.statistics.calculateStreak();
                } catch (error) {
                    console.log('Could not get current streak:', error);
                }
            }

            alert(`${window.i18n.translate('alerts.study_complete')}\n\n${window.i18n.translate('alerts.cards_studied')}: ${this.studySession.cardsStudied}\n${window.i18n.translate('alerts.current_streak')}: ${currentStreak} ${window.i18n.translate('alerts.days')}\n${window.i18n.translate('alerts.all_due_completed')}: ${allDueCompleted ? window.i18n.translate('alerts.all_due_completed_yes') : window.i18n.translate('alerts.all_due_completed_no')}`);

            // Return to overview screen for "Study All Cards" sessions
            this.showView('overview');
        } else {
            // Individual deck study - no streak update, just show completion message
            alert(`${window.i18n.translate('alerts.deck_complete')}\n\n${window.i18n.translate('alerts.cards_reviewed')}: ${this.studySession.cardsStudied}`);

            // Return to decks screen for individual deck study
            this.showView('decks');
        }
    }

    showNewDeckModal() {
        document.getElementById('new-deck-modal').classList.add('active');
        document.getElementById('deck-name-input').focus();
    }

    hideNewDeckModal() {
        document.getElementById('new-deck-modal').classList.remove('active');
        document.getElementById('deck-name-input').value = '';
        this.editingDeck = null;
        
        // Reset modal labels to default
        document.querySelector('#new-deck-modal h3').textContent = window.i18n.translate('modal.create_deck');
        document.getElementById('create-deck').textContent = window.i18n.translate('actions.create');
    }

    async createDeck() {
        const name = document.getElementById('deck-name-input').value.trim();
        if (!name) {
            alert(window.i18n.translate('alerts.enter_deck_name'));
            return;
        }
        
        if (this.editingDeck) {
            // Edit existing deck
            this.editingDeck.name = name;
            this.editingDeck.updatedAt = new Date().toISOString();
            
            if (await storage.saveDeck(this.editingDeck)) {
                this.hideNewDeckModal();
                this.renderDecks();
            } else {
                alert(window.i18n.translate('alerts.failed_update_deck'));
            }
        } else {
            // Create new deck
            const newDeck = {
                id: storage.generateUUID(),
                name,
                cards: [],
                createdAt: new Date().toISOString()
            };
            
            if (await storage.saveDeck(newDeck)) {
                this.hideNewDeckModal();
                this.renderDecks();
            } else {
                alert(window.i18n.translate('alerts.failed_create_deck'));
            }
        }
    }

    showNewCardModal() {
        if (!this.currentDeck) return;
        this.editingCard = null;
        document.getElementById('card-modal-title').textContent = 'Create New Card';
        document.getElementById('save-card').textContent = 'Create';
        document.getElementById('card-front-input').value = '';
        document.getElementById('card-back-input').value = '';
        document.getElementById('new-card-modal').classList.add('active');
        document.getElementById('card-back-input').focus();
    }

    hideNewCardModal() {
        document.getElementById('new-card-modal').classList.remove('active');
        document.getElementById('card-front-input').value = '';
        document.getElementById('card-back-input').value = '';
        this.editingCard = null;
    }

    showCardTypeSelection() {
        if (!this.currentDeck) return;
        // Set default selection to irregular_verbs (first available option)
        this.selectedCardType = 'irregular_verbs';
        this.showView('card-type');
    }

    showNewCardForm() {
        if (!this.currentDeck) return;
        // Set default card type to flip_type for new cards
        this.selectedCardType = 'flip_type';
        this.cardFormOrigin = 'deck';
        this.showView('card-form');
    }

    goBackFromCardForm() {
        if (this.cardFormOrigin === 'deck') {
            this.showView('deck');
        } else {
            this.showCardTypeSelection();
        }
    }

    renderCardTypeSelection() {
        // Update selection state
        document.querySelectorAll('.card-type-tile').forEach(tile => {
            tile.classList.remove('selected');
            if (tile.dataset.type === this.selectedCardType) {
                tile.classList.add('selected');
            }
        });
        
        // Add event listeners to tiles (re-add in case of dynamic content)
        document.querySelectorAll('.card-type-tile:not(.disabled)').forEach(tile => {
            tile.addEventListener('click', () => this.selectCardType(tile.dataset.type));
            tile.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectCardType(tile.dataset.type);
                }
            });
        });
    }

    selectCardType(cardType) {
        this.selectedCardType = cardType;
        
        if (cardType === 'irregular_verbs') {
            this.showView('irregular-verbs');
        } else if (cardType === 'phrasal_verbs') {
            this.showView('phrasal-verbs');
        } else {
            this.cardFormOrigin = 'card-type';
            this.showView('card-form');
        }
    }

    renderCardForm() {
        // Clear form fields
        document.getElementById('card-form-front-input').value = '';
        document.getElementById('card-form-back-input').value = '';
        
        // Focus on back input (which should be filled first)
        document.getElementById('card-form-back-input').focus();
    }

    async saveNewCard() {
        try {
            console.log('saveNewCard: Starting card creation');
            const front = document.getElementById('card-form-front-input').value.trim();
            const back = document.getElementById('card-form-back-input').value.trim();
            
            console.log('saveNewCard: Front/Back values:', { front, back });
            
            if (!front || !back) {
                alert(window.i18n.translate('alerts.fill_both_sides'));
                return;
            }

            console.log('saveNewCard: About to create newCard object');
            console.log('saveNewCard: this.selectedCardType =', this.selectedCardType);
            console.log('saveNewCard: this.currentDeck =', this.currentDeck);
            console.log('saveNewCard: storage =', storage);

            const newCard = {
                id: storage.generateUUID(),
                front: front,
                back: back,
                ease: 2.5,
                interval: 1,
                reps: 0,
                lapses: 0,
                dueDate: null, // Will be set after first review
                lastReviewed: null,
                createdAt: new Date().toISOString(),
                card_type: this.selectedCardType, // Add the card type
                isNew: true // Mark as new for Supabase sync
            };
            
            console.log('saveNewCard: Created newCard:', newCard);

            console.log('saveNewCard: About to push to currentDeck.cards');
            this.currentDeck.cards.push(newCard);
            console.log('saveNewCard: Pushed to deck, total cards now:', this.currentDeck.cards.length);
            
            console.log('saveNewCard: About to call storage.saveDeck');
            await storage.saveDeck(this.currentDeck);
            console.log('saveNewCard: storage.saveDeck completed');
            
            // Go back to deck view
            console.log('saveNewCard: About to show deck view');
            this.showView('deck');
            this.renderDeckView();
            console.log('saveNewCard: Completed successfully');
        } catch (error) {
            console.error('saveNewCard: Error occurred:', error);
            console.error('saveNewCard: Error stack:', error.stack);
        }
    }

    showCardStats(cardId) {
        const card = this.currentDeck.cards.find(c => c.id === cardId);
        if (!card) return;

        // Populate statistics
        document.getElementById('stats-repetitions').textContent = card.reps || card.repetitions || 0;
        document.getElementById('stats-lapses').textContent = card.lapses || 0;

        // Format due date
        const dueDate = card.dueDate || card.due_date;
        if (dueDate) {
            const formattedDate = new Date(dueDate).toLocaleDateString();
            document.getElementById('stats-due-date').textContent = formattedDate;
        } else {
            document.getElementById('stats-due-date').textContent = window.i18n.translate('card_stats.not_scheduled');
        }

        // Show modal
        document.getElementById('card-stats-modal').classList.add('active');
    }

    hideCardStatsModal() {
        document.getElementById('card-stats-modal').classList.remove('active');
    }

    editCard(cardId) {
        const card = this.currentDeck.cards.find(c => c.id === cardId);
        if (!card) return;
        
        this.editingCard = card;
        this.showView('edit-card');
    }

    renderEditCard() {
        if (!this.editingCard) return;

        // Set form values
        document.getElementById('edit-card-front-input').value = this.editingCard.front;
        document.getElementById('edit-card-back-input').value = this.editingCard.back;

        // Set card type toggle (checkbox: unchecked = flip, checked = flip_type)
        const cardType = this.editingCard.card_type || 'flip_type';
        const toggle = document.getElementById('edit-card-type-toggle');
        toggle.checked = cardType === 'flip_type';

        // Update visual feedback
        this.updateToggleLabels(cardType === 'flip_type');

        // Clean up previous listeners by replacing elements with clones
        const oldToggle = toggle;
        const newToggle = oldToggle.cloneNode(true);
        oldToggle.parentNode.replaceChild(newToggle, oldToggle);
        newToggle.checked = cardType === 'flip_type';
        newToggle.addEventListener('change', () => {
            this.updateToggleLabels(newToggle.checked);
        });

        const oldFlipLabel = document.getElementById('flip-label');
        const newFlipLabel = oldFlipLabel.cloneNode(true);
        oldFlipLabel.parentNode.replaceChild(newFlipLabel, oldFlipLabel);
        newFlipLabel.addEventListener('click', () => {
            newToggle.checked = false;
            this.updateToggleLabels(false);
        });

        const oldFlipTypeLabel = document.getElementById('flip-type-label');
        const newFlipTypeLabel = oldFlipTypeLabel.cloneNode(true);
        oldFlipTypeLabel.parentNode.replaceChild(newFlipTypeLabel, oldFlipTypeLabel);
        newFlipTypeLabel.addEventListener('click', () => {
            newToggle.checked = true;
            this.updateToggleLabels(true);
        });

        // Focus on back input (which should be filled first)
        document.getElementById('edit-card-back-input').focus();
    }

    updateToggleLabels(isFlipType) {
        const flipLabel = document.getElementById('flip-label');
        const flipTypeLabel = document.getElementById('flip-type-label');
        
        if (isFlipType) {
            flipLabel.classList.remove('active');
            flipTypeLabel.classList.add('active');
        } else {
            flipLabel.classList.add('active');
            flipTypeLabel.classList.remove('active');
        }
    }

    async saveEditedCard() {
        const front = document.getElementById('edit-card-front-input').value.trim();
        const back = document.getElementById('edit-card-back-input').value.trim();
        
        if (!front || !back) {
            alert(window.i18n.translate('alerts.fill_both_sides'));
            return;
        }

        // Get selected card type from toggle (unchecked = flip, checked = flip_type)
        const selectedType = document.getElementById('edit-card-type-toggle').checked ? 'flip_type' : 'flip';

        // Update the card
        this.editingCard.front = front;
        this.editingCard.back = back;
        this.editingCard.card_type = selectedType;
        this.editingCard.updatedAt = new Date().toISOString();
        this.editingCard.isModified = true;
        
        await storage.saveDeck(this.currentDeck);
        
        // Go back to deck view
        this.showView('deck');
        this.renderDeckView();
        this.editingCard = null;
    }

    async deleteCurrentCard() {
        if (!this.editingCard || !this.currentDeck) return;

        if (!confirm(window.i18n.translate('alerts.confirm_delete_card'))) return;

        try {
            // Delete from Supabase first
            if (window.supabaseService && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                await window.supabaseService.deleteCard(this.editingCard.id);
            }

            // Remove card from deck locally
            this.currentDeck.cards = this.currentDeck.cards.filter(c => c.id !== this.editingCard.id);

            await storage.saveDeck(this.currentDeck);

            // Go back to deck view
            this.showView('deck');
            this.renderDeckView();
            this.editingCard = null;
        } catch (error) {
            alert(window.i18n.translate('alerts.failed_delete_card'));
            console.error('Delete card error:', error);
        }
    }

    async saveCard() {
        const front = document.getElementById('card-front-input').value.trim();
        const back = document.getElementById('card-back-input').value.trim();
        const saveButton = document.getElementById('save-card');
        
        if (!front || !back) {
            alert(window.i18n.translate('alerts.fill_both_sides_card'));
            return;
        }
        
        // Prevent double-clicking
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        try {
            if (this.editingCard) {
                // Edit existing card
                this.editingCard.front = front;
                this.editingCard.back = back;
                this.editingCard.updatedAt = new Date().toISOString();
                this.editingCard.isModified = true;
            } else {
                // Create new card
                const newCard = {
                    id: storage.generateUUID(),
                    front,
                    back,
                    createdAt: new Date().toISOString(),
                    // SM-2 defaults
                    ease: 2.5,
                    interval: 1,
                    reps: 0,
                    lapses: 0,
                    due_date: null, // Will be set after first review
                    reviewCount: 0,
                    isNew: true
                };
                console.log('Creating new card:', newCard);
                this.currentDeck.cards.push(newCard);
            }
            
            if (await storage.saveDeck(this.currentDeck)) {
                this.hideNewCardModal();
                this.renderDeckView();
            } else {
                alert(window.i18n.translate('alerts.failed_save_card'));
            }
        } catch (error) {
            console.error('Error saving card:', error);
            alert(window.i18n.translate('alerts.failed_save_card'));
        } finally {
            // Re-enable the save button
            saveButton.disabled = false;
            saveButton.textContent = this.editingCard ? 'Update' : 'Create';
        }
    }

    async startStudyAllSession() {
        const decks = await storage.loadDecks();
        const allCards = [];
        
        // Collect all cards from all decks
        decks.forEach(deck => {
            deck.cards.forEach(card => {
                allCards.push({...card, deckName: deck.name});
            });
        });
        
        if (allCards.length === 0) {
            alert(window.i18n.translate('alerts.no_cards_available'));
            return;
        }
        
        // Use spaced repetition to get cards to study
        const tempDeck = {cards: allCards};
        this.currentStudyCards = spacedRepetition.getCardsForStudy(tempDeck, 50);
        
        if (this.currentStudyCards.length === 0) {
            alert(window.i18n.translate('alerts.no_cards_due'));
            return;
        }
        
        // For study all, directly start combined mode
        this.currentDeck = null; // Mark as study all mode
        this.studySession = {
            startTime: new Date(),
            cardsStudied: 0,
            isStudyAll: true
        };
        
        this.startStudySessionWithMode('combined');
    }

    setupInsightCardListeners() {
        // Add click listeners to all tappable insight cards
        const tappableCards = document.querySelectorAll('.insight-card.tappable');
        tappableCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const studyType = card.getAttribute('data-study-type');
                this.startStudyByType(studyType);
            });
        });
    }

    async startStudyByType(studyType) {
        const decks = await storage.loadDecks();
        const allCards = [];
        
        // Collect all cards from all decks
        decks.forEach(deck => {
            deck.cards.forEach(card => {
                allCards.push({...card, deckName: deck.name});
            });
        });
        
        if (allCards.length === 0) {
            alert(window.i18n.translate('alerts.no_cards_available'));
            return;
        }
        
        let studyCards = [];
        const tempDeck = {cards: allCards};
        
        switch (studyType) {
            case 'all':
                // All cards that can be studied today (due + overdue + new)
                studyCards = spacedRepetition.getCardsForStudy(tempDeck, 50);
                break;
            case 'due':
                // Only cards due today
                studyCards = spacedRepetition.getCardsDueToday(tempDeck);
                break;
            case 'overdue':
                // Only overdue cards
                studyCards = spacedRepetition.getOverdueCards(tempDeck);
                break;
            case 'new':
                // Only new cards
                studyCards = spacedRepetition.getNewCards(tempDeck);
                break;
            default:
                return;
        }
        
        if (studyCards.length === 0) {
            alert(window.i18n.translate('alerts.no_cards_due'));
            return;
        }
        
        this.currentStudyCards = studyCards;
        this.currentDeck = null; // Mark as study all mode
        this.studySession = {
            startTime: new Date(),
            cardsStudied: 0,
            isStudyAll: true
        };
        
        this.startStudySessionWithMode('combined');
    }

    async updateStats() {
        if (window.statistics) {
            await window.statistics.refresh();
        }
    }

    async editDeck(deckId) {
        const decks = await storage.loadDecks();
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;
        
        this.editingDeck = deck;
        document.getElementById('deck-name-input').value = deck.name;
        document.getElementById('new-deck-modal').classList.add('active');
        document.getElementById('deck-name-input').focus();
        
        // Update modal for editing
        document.querySelector('#new-deck-modal h3').textContent = window.i18n.translate('modal.edit_deck');
        document.getElementById('create-deck').textContent = window.i18n.translate('actions.save');
    }

    async deleteDeck(deckId) {
        const decks = await storage.loadDecks();
        const deck = decks.find(d => d.id === deckId);
        if (!deck) return;

        const cardCount = deck.cards.length;
        const message = cardCount > 0
            ? window.i18n.translate('alerts.confirm_delete_deck_with_cards').replace('{0}', deck.name).replace('{1}', cardCount)
            : window.i18n.translate('alerts.confirm_delete_deck').replace('{0}', deck.name);

        if (confirm(message)) {
            try {
                await storage.deleteDeck(deckId);
                this.renderDecks();
                // If we're currently viewing this deck, go back to overview
                if (this.getCurrentView() === 'deck' && this.currentDeck?.id === deckId) {
                    this.showView('overview');
                }
            } catch (error) {
                alert(window.i18n.translate('alerts.failed_delete_deck'));
                console.error('Delete deck error:', error);
            }
        }
    }

    async deleteCard(cardId) {
        const card = this.currentDeck.cards.find(c => c.id === cardId);
        if (!card) return;

        if (confirm(window.i18n.translate('alerts.confirm_delete_card_detail').replace('{0}', card.front).replace('{1}', card.back))) {
            try {
                // Delete card from Supabase first
                // SAFETY: Don't delete from database in test mode
                if (window.supabaseService && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                    await window.supabaseService.deleteCard(cardId);
                }
                
                // Then remove card from current deck locally
                this.currentDeck.cards = this.currentDeck.cards.filter(c => c.id !== cardId);

                // Save the updated deck to storage (works in both test mode and normal mode)
                await window.storage.saveDeck(this.currentDeck);

                this.renderDeckView();
            } catch (error) {
                alert(window.i18n.translate('alerts.failed_delete_card'));
                console.error('Delete card error:', error);
            }
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Confetti celebration function
    celebrateWithConfetti() {
        console.log('🎊 celebrateWithConfetti() called');
        if (typeof confetti !== 'undefined') {
            console.log('✅ Confetti library is loaded - starting celebration');
            // Burst from center
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            // Additional burst after a short delay
            setTimeout(() => {
                confetti({
                    particleCount: 50,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 }
                });
                confetti({
                    particleCount: 50,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 }
                });
            }, 300);
        } else {
            console.error('❌ Confetti library not loaded - cannot display celebration');
        }
    }


    async initializeIrregularVerbs() {
        try {
            // Check if irregular verbs are already populated
            const existingVerbs = await storage.searchIrregularVerbs('a'); // Search for verbs starting with 'a'
            if (existingVerbs.length === 0) {
                console.log('Populating irregular verbs table...');
                const result = await storage.populateIrregularVerbs();
                if (result) {
                    console.log('Irregular verbs table populated successfully');
                } else {
                    console.log('Irregular verbs already exist or failed to populate');
                }
            } else {
                console.log('Irregular verbs already populated');
            }
        } catch (error) {
            console.error('Failed to initialize irregular verbs:', error);
        }
    }

    setupIrregularVerbsEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('irregular-verb-search');
        const suggestionsContainer = document.getElementById('verb-suggestions');
        let currentVerbs = [];
        let selectedIndex = -1;

        if (searchInput && suggestionsContainer) {
            // Search input handler with debouncing
            let searchTimeout;
            searchInput.addEventListener('input', async (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length === 0) {
                    suggestionsContainer.style.display = 'none';
                    currentVerbs = [];
                    selectedIndex = -1;
                    return;
                }

                searchTimeout = setTimeout(async () => {
                    try {
                        const verbs = await storage.searchIrregularVerbs(query);
                        currentVerbs = verbs;
                        selectedIndex = -1;
                        this.renderVerbSuggestions(verbs, suggestionsContainer);
                    } catch (error) {
                        console.error('Error searching irregular verbs:', error);
                        suggestionsContainer.style.display = 'none';
                    }
                }, 300);
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => {
                if (currentVerbs.length === 0) return;

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        selectedIndex = Math.min(selectedIndex + 1, currentVerbs.length - 1);
                        this.updateSuggestionSelection(suggestionsContainer, selectedIndex);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        selectedIndex = Math.max(selectedIndex - 1, -1);
                        this.updateSuggestionSelection(suggestionsContainer, selectedIndex);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (selectedIndex >= 0) {
                            this.selectVerb(currentVerbs[selectedIndex]);
                        }
                        break;
                    case 'Escape':
                        suggestionsContainer.style.display = 'none';
                        selectedIndex = -1;
                        break;
                }
            });

            // Click outside to hide suggestions
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                    suggestionsContainer.style.display = 'none';
                    selectedIndex = -1;
                }
            });
        }

        // Navigation buttons
        const backToCardTypeBtn = document.getElementById('back-to-card-type-from-irregular');
        if (backToCardTypeBtn) {
            backToCardTypeBtn.addEventListener('click', () => {
                this.showView('card-type');
            });
        }

        const backToSearchBtn = document.getElementById('back-to-irregular-search');
        if (backToSearchBtn) {
            backToSearchBtn.addEventListener('click', () => {
                this.showView('irregular-verbs');
            });
        }

        // Save cards button
        const saveCardsBtn = document.getElementById('save-irregular-verb-cards');
        if (saveCardsBtn) {
            saveCardsBtn.addEventListener('click', () => {
                this.saveIrregularVerbCards();
            });
        }
    }

    setupPhrasalVerbsEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('phrasal-verb-search');
        const suggestionsContainer = document.getElementById('phrasal-suggestions');
        let currentVerbs = [];
        let selectedIndex = -1;

        if (searchInput && suggestionsContainer) {
            // Search input handler with debouncing
            let searchTimeout;
            searchInput.addEventListener('input', async (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                
                if (query.length === 0) {
                    suggestionsContainer.style.display = 'none';
                    currentVerbs = [];
                    selectedIndex = -1;
                    return;
                }

                searchTimeout = setTimeout(async () => {
                    try {
                        const verbs = await storage.searchPhrasalVerbs(query);
                        currentVerbs = verbs;
                        selectedIndex = -1;
                        this.renderPhrasalVerbSuggestions(verbs, suggestionsContainer);
                    } catch (error) {
                        console.error('Error searching phrasal verbs:', error);
                        suggestionsContainer.style.display = 'none';
                    }
                }, 300);
            });

            // Keyboard navigation
            searchInput.addEventListener('keydown', (e) => {
                if (currentVerbs.length === 0) return;

                switch (e.key) {
                    case 'ArrowDown':
                        e.preventDefault();
                        selectedIndex = Math.min(selectedIndex + 1, currentVerbs.length - 1);
                        this.updateSuggestionSelection(suggestionsContainer, selectedIndex);
                        break;
                    case 'ArrowUp':
                        e.preventDefault();
                        selectedIndex = Math.max(selectedIndex - 1, -1);
                        this.updateSuggestionSelection(suggestionsContainer, selectedIndex);
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (selectedIndex >= 0) {
                            this.selectPhrasalVerb(currentVerbs[selectedIndex]);
                        }
                        break;
                    case 'Escape':
                        suggestionsContainer.style.display = 'none';
                        selectedIndex = -1;
                        break;
                }
            });

            // Click outside to hide suggestions
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                    suggestionsContainer.style.display = 'none';
                    selectedIndex = -1;
                }
            });
        }

        // Navigation buttons
        const backToCardTypeBtn = document.getElementById('back-to-card-type-from-phrasal');
        if (backToCardTypeBtn) {
            backToCardTypeBtn.addEventListener('click', () => {
                this.showView('card-type');
            });
        }

        const backToSearchBtn = document.getElementById('back-to-phrasal-search');
        if (backToSearchBtn) {
            backToSearchBtn.addEventListener('click', () => {
                this.showView('phrasal-verbs');
            });
        }

        // Save card button
        const saveCardBtn = document.getElementById('save-phrasal-verb-card');
        if (saveCardBtn) {
            saveCardBtn.addEventListener('click', () => {
                this.savePhrasalVerbCard();
            });
        }
    }

    renderVerbSuggestions(verbs, container) {
        if (verbs.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        verbs.forEach((verb, index) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'verb-suggestion';
            suggestion.innerHTML = `
                <strong>${verb.infinitive}</strong> - ${verb.simple_past} - ${verb.past_participle}
                <br><small style="color: var(--text-secondary); margin-top: 2px;">${verb.translation_ru}</small>
            `;
            suggestion.addEventListener('click', () => {
                this.selectVerb(verb);
            });
            container.appendChild(suggestion);
        });

        container.style.display = 'block';
    }

    updateSuggestionSelection(container, selectedIndex) {
        const suggestions = container.querySelectorAll('.verb-suggestion');
        suggestions.forEach((suggestion, index) => {
            suggestion.classList.toggle('selected', index === selectedIndex);
        });
    }

    selectVerb(verb) {
        this.selectedVerb = verb;
        this.showVerbPreview(verb);
        this.showView('irregular-verb-preview');
        
        // Hide suggestions
        const suggestionsContainer = document.getElementById('verb-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    showVerbPreview(verb) {
        console.log('Showing verb preview for:', verb);
        
        const infinitiveEl = document.getElementById('preview-infinitive');
        const pastSimpleEl = document.getElementById('preview-past-simple');
        const pastParticipleEl = document.getElementById('preview-past-participle');
        const translationEl = document.getElementById('preview-translation');
        
        console.log('Elements found:', {
            infinitive: !!infinitiveEl,
            pastSimple: !!pastSimpleEl,
            pastParticiple: !!pastParticipleEl,
            translation: !!translationEl
        });
        
        if (infinitiveEl) infinitiveEl.textContent = verb.infinitive;
        if (pastSimpleEl) pastSimpleEl.textContent = verb.simple_past;
        if (pastParticipleEl) pastParticipleEl.textContent = verb.past_participle;
        if (translationEl) translationEl.textContent = verb.translation_ru;
        
        // Log the back button position
        const backBtn = document.getElementById('back-to-irregular-search');
        if (backBtn) {
            const rect = backBtn.getBoundingClientRect();
            console.log('Back button position:', { top: rect.top, left: rect.left, bottom: rect.bottom });
        }
        
        // Log first verb form position
        const firstVerbForm = document.querySelector('.verb-form:first-child');
        if (firstVerbForm) {
            const rect = firstVerbForm.getBoundingClientRect();
            console.log('First verb form position:', { top: rect.top, left: rect.left });
        }
    }

    async saveIrregularVerbCards() {
        if (!this.selectedVerb || !this.currentDeck) {
            alert(window.i18n.translate('alerts.no_deck_selected'));
            return;
        }

        try {
            const verb = this.selectedVerb;
            
            // Generate 3 cards from the irregular verb (Russian -> English)
            const cards = [
                {
                    id: storage.generateUUID(),
                    front: `${verb.translation_ru} (infinitive)`,
                    back: `to ${verb.infinitive.toLowerCase()}`,
                    createdAt: new Date().toISOString(),
                    ease: 2.5,
                    interval: 1,
                    reps: 0,
                    lapses: 0,
                    due_date: null, // Will be set after first review
                    reviewCount: 0,
                    isNew: true
                },
                {
                    id: storage.generateUUID(),
                    front: `${verb.translation_ru} (past simple)`,
                    back: verb.simple_past.toLowerCase(),
                    createdAt: new Date().toISOString(),
                    ease: 2.5,
                    interval: 1,
                    reps: 0,
                    lapses: 0,
                    due_date: null, // Will be set after first review
                    reviewCount: 0,
                    isNew: true
                },
                {
                    id: storage.generateUUID(),
                    front: `${verb.translation_ru} (past participle)`,
                    back: verb.past_participle.toLowerCase(),
                    createdAt: new Date().toISOString(),
                    ease: 2.5,
                    interval: 1,
                    reps: 0,
                    lapses: 0,
                    due_date: null, // Will be set after first review
                    reviewCount: 0,
                    isNew: true
                }
            ];

            // Add cards to current deck
            this.currentDeck.cards.push(...cards);
            await storage.saveDeck(this.currentDeck);

            // Refresh decks
            this.renderDeckView();
            this.renderOverview();

            // Navigate back to deck view
            this.showView('deck');
        } catch (error) {
            console.error('Error saving irregular verb cards:', error);
            alert(window.i18n.translate('alerts.failed_save_cards'));
        }
    }

    renderIrregularVerbsView() {
        // Clear the search input
        const searchInput = document.getElementById('irregular-verb-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        // Hide suggestions
        const suggestionsContainer = document.getElementById('verb-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    // Check if all due cards (due today + overdue) have been completed
    async checkAllDueCompleted() {
        try {
            const decks = await storage.loadDecks();
            const today = this.getLocalDateString();

            // Count all due cards (due today + overdue)
            let totalDueCards = 0;
            let completedDueCards = 0;

            decks.forEach(deck => {
                deck.cards.forEach(card => {
                    const cardDueDate = card.dueDate || card.due_date || card.nextReview;

                    // Skip new cards (never studied) — only due/overdue count
                    if (!cardDueDate || (card.reps || card.repetitions || 0) === 0) {
                        return;
                    }

                    if (cardDueDate.split('T')[0] <= today) {
                        totalDueCards++;

                        // Check if card was reviewed today (has lastReviewed date = today)
                        const lastReviewed = card.lastReviewed || card.last_reviewed;
                        if (lastReviewed) {
                            const reviewedDate = lastReviewed.split('T')[0];
                            if (reviewedDate === today) {
                                completedDueCards++;
                            }
                        }
                    }
                });
            });

            // All due cards completed if:
            // 1. There are no due cards (0 total = all completed by definition), OR
            // 2. There are due cards and all of them are completed
            const allCompleted = totalDueCards === 0 || completedDueCards >= totalDueCards;
            console.log(`Due cards check: ${completedDueCards}/${totalDueCards} completed, all due completed: ${allCompleted}`);

            return allCompleted;
        } catch (error) {
            console.error('Failed to check due cards completion:', error);
            return false;
        }
    }

    // Check if all cards in the current study session are completed
    async checkAllStudySessionCardsCompleted() {
        try {
            if (!this.studySession || !this.studySession.isStudyAll) {
                console.log('No "Study All Cards" session active');
                return false;
            }

            const today = this.getLocalDateString();

            // Get all cards from all decks (same logic as startStudyAllSession)
            const decks = await storage.loadDecks();
            const allCards = [];

            decks.forEach(deck => {
                deck.cards.forEach(card => {
                    allCards.push({...card, deckName: deck.name});
                });
            });

            if (allCards.length === 0) {
                console.log('🎊 All study session cards completed - no cards exist!');
                return true;
            }

            // Use spaced repetition to get cards that would be studied (same logic as startStudyAllSession)
            const tempDeck = {cards: allCards};
            const studyCards = spacedRepetition.getCardsForStudy(tempDeck, 50);

            if (studyCards.length === 0) {
                console.log('🎊 All study session cards completed - no cards left to study!');
                return true;
            }

            // Count how many were completed today
            let completedToday = 0;
            studyCards.forEach(card => {
                const lastReviewed = card.lastReviewed || card.last_reviewed;
                if (lastReviewed) {
                    const reviewedDate = lastReviewed.split('T')[0];
                    if (reviewedDate === today) {
                        completedToday++;
                    }
                }
            });

            const allCompleted = completedToday >= studyCards.length;
            console.log(`Study session cards check: ${completedToday}/${studyCards.length} completed, all study session cards completed: ${allCompleted}`);

            return allCompleted;
        } catch (error) {
            console.error('Failed to check study session cards completion:', error);
            return false;
        }
    }

    // Notification System Methods
    async initializeNotifications() {
        if (typeof NotificationManager !== 'undefined' && window.i18n) {
            this.notificationManager = new NotificationManager(window.i18n);
            await this.loadNotificationSettings();
            console.log('Notification system initialized');
        } else {
            console.log('Notification system not available');
        }
    }

    setupNotificationEventListeners() {
        // Enable/disable notifications toggle
        const notificationsToggle = document.getElementById('notifications-toggle');
        if (notificationsToggle) {
            notificationsToggle.addEventListener('change', async () => {
                const enabled = notificationsToggle.checked;
                await this.updateNotificationSettings({ enabled });
            });
        }

        // Reminder time change
        const reminderTimeInput = document.getElementById('reminder-time');
        if (reminderTimeInput) {
            reminderTimeInput.addEventListener('change', async () => {
                const time = reminderTimeInput.value;
                await this.updateNotificationSettings({ dailyReminderTime: time });
            });
        }

        // Streak reminders toggle
        const streakRemindersToggle = document.getElementById('streak-reminders-toggle');
        if (streakRemindersToggle) {
            streakRemindersToggle.addEventListener('change', async () => {
                const streakReminders = streakRemindersToggle.checked;
                await this.updateNotificationSettings({ streakReminders });
            });
        }

        // Listen for service worker messages (notification clicks)
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
                    this.handleNotificationClick(event.data);
                }
            });
        }
    }

    async loadNotificationSettings() {
        if (!this.notificationManager) return;

        const settings = this.notificationManager.loadSettings();
        
        // Update UI elements
        const notificationsToggle = document.getElementById('notifications-toggle');
        const reminderTimeInput = document.getElementById('reminder-time');
        const streakRemindersToggle = document.getElementById('streak-reminders-toggle');
        const reminderTimeRow = document.getElementById('reminder-time-row');
        const notificationStatus = document.getElementById('notification-status');

        if (notificationsToggle) {
            notificationsToggle.checked = settings.enabled;
        }
        
        if (reminderTimeInput) {
            reminderTimeInput.value = settings.dailyReminderTime;
        }
        
        if (streakRemindersToggle) {
            streakRemindersToggle.checked = settings.streakReminders;
        }

        // Update UI state
        if (reminderTimeRow) {
            reminderTimeRow.classList.toggle('enabled', settings.enabled);
        }

        // Update permission status
        this.updateNotificationStatus();

        // Initialize with current settings
        if (settings.enabled) {
            await this.notificationManager.initialize(settings);
        }
    }

    async updateNotificationSettings(changes) {
        if (!this.notificationManager) return;

        const currentSettings = this.notificationManager.loadSettings();
        const newSettings = { ...currentSettings, ...changes };

        // Save settings
        this.notificationManager.saveSettings(newSettings);

        // Update UI state
        const reminderTimeRow = document.getElementById('reminder-time-row');
        if (reminderTimeRow) {
            reminderTimeRow.classList.toggle('enabled', newSettings.enabled);
        }

        // Re-initialize notification system with new settings
        if (newSettings.enabled) {
            const hasPermission = await this.notificationManager.requestPermission();
            if (hasPermission) {
                await this.notificationManager.initialize(newSettings);
            } else {
                // Permission denied, disable notifications
                newSettings.enabled = false;
                this.notificationManager.saveSettings(newSettings);
                const notificationsToggle = document.getElementById('notifications-toggle');
                if (notificationsToggle) {
                    notificationsToggle.checked = false;
                }
            }
        } else {
            // Disabled, clear all reminders
            this.notificationManager.clearAllReminders();
        }

        // Update status display
        this.updateNotificationStatus();
    }

    updateNotificationStatus() {
        if (!this.notificationManager) return;

        const statusElement = document.getElementById('notification-status');
        if (!statusElement) return;

        const permissionStatus = this.notificationManager.getPermissionStatus();
        const settings = this.notificationManager.loadSettings();

        // Clear previous classes
        statusElement.className = 'notification-status';
        
        let statusKey;
        let statusClass;

        if (permissionStatus === 'unsupported') {
            statusKey = 'settings.notification_unsupported';
            statusClass = 'unsupported';
        } else if (permissionStatus === 'denied') {
            statusKey = 'settings.notification_permission_denied';
            statusClass = 'permission-denied';
        } else if (permissionStatus === 'granted' && settings.enabled) {
            statusKey = 'settings.notification_permission_granted';
            statusClass = 'permission-granted';
        } else {
            statusKey = 'settings.notification_permission_needed';
            statusClass = 'permission-needed';
        }

        statusElement.classList.add(statusClass);
        statusElement.setAttribute('data-i18n', statusKey);
        
        // Update text immediately if i18n is available
        if (window.i18n) {
            const text = window.i18n.translate(statusKey);
            statusElement.textContent = text;
        }
    }

    handleNotificationClick(data) {
        console.log('Handling notification click:', data);
        
        // Navigate to appropriate view based on notification
        switch (data.notificationType) {
            case 'dailyReminder':
            case 'streakRisk':
            case 'lastChance':
                this.showView('overview');
                break;
            default:
                // Default to overview
                this.showView('overview');
        }
    }

    renderPhrasalVerbsView() {
        // Clear the search input
        const searchInput = document.getElementById('phrasal-verb-search');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }

        // Hide suggestions
        const suggestionsContainer = document.getElementById('phrasal-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    renderPhrasalVerbSuggestions(verbs, container) {
        if (verbs.length === 0) {
            container.style.display = 'none';
            return;
        }

        container.innerHTML = '';
        verbs.forEach((verb, index) => {
            const suggestion = document.createElement('div');
            suggestion.className = 'verb-suggestion';
            suggestion.innerHTML = `
                <strong>${verb.full_expression}</strong>
                <br><small style="color: var(--text-secondary); margin-top: 2px;">${verb.translation}</small>
            `;
            suggestion.addEventListener('click', () => {
                this.selectPhrasalVerb(verb);
            });
            container.appendChild(suggestion);
        });

        container.style.display = 'block';
    }

    selectPhrasalVerb(verb) {
        this.selectedPhrasalVerb = verb;
        this.showPhrasalVerbPreview(verb);
        this.showView('phrasal-verb-preview');
        
        // Hide suggestions
        const suggestionsContainer = document.getElementById('phrasal-suggestions');
        if (suggestionsContainer) {
            suggestionsContainer.style.display = 'none';
        }
    }

    showPhrasalVerbPreview(verb) {
        console.log('Showing phrasal verb preview for:', verb);
        
        const infinitiveEl = document.getElementById('phrasal-preview-infinitive');
        const fullExpressionEl = document.getElementById('phrasal-preview-full-expression');
        const translationEl = document.getElementById('phrasal-preview-translation');
        const typeEl = document.getElementById('phrasal-preview-type');
        
        console.log('Elements found:', {
            infinitive: !!infinitiveEl,
            fullExpression: !!fullExpressionEl,
            translation: !!translationEl,
            type: !!typeEl
        });
        
        if (infinitiveEl) infinitiveEl.textContent = verb.infinitive;
        if (fullExpressionEl) fullExpressionEl.textContent = verb.full_expression;
        if (translationEl) translationEl.textContent = verb.translation;
        if (typeEl) typeEl.textContent = verb.type;
        
        // Log the back button position
        const backBtn = document.getElementById('back-to-phrasal-search');
        if (backBtn) {
            const rect = backBtn.getBoundingClientRect();
            console.log('Back button position:', { top: rect.top, left: rect.left, bottom: rect.bottom });
        }
        
        // Log first verb form position
        const firstVerbForm = document.querySelector('.verb-form:first-child');
        if (firstVerbForm) {
            const rect = firstVerbForm.getBoundingClientRect();
            console.log('First verb form position:', { top: rect.top, left: rect.left });
        }
    }

    async savePhrasalVerbCard() {
        try {
            if (!this.selectedPhrasalVerb || !this.currentDeck) {
                console.error('Missing selected phrasal verb or current deck');
                return;
            }

            const verb = this.selectedPhrasalVerb;
            
            // Generate 1 card from the phrasal verb (Russian -> English)
            const card = {
                id: storage.generateUUID(),
                front: verb.translation,
                back: `to ${verb.full_expression}`,
                createdAt: new Date().toISOString(),
                ease: 2.5,
                interval: 1,
                reps: 0,
                lapses: 0,
                due_date: new Date().toISOString().split('T')[0],
                reviewCount: 0,
                isNew: true
            };

            // Add card to current deck
            this.currentDeck.cards.push(card);
            await storage.saveDeck(this.currentDeck);

            // Refresh decks
            this.renderDeckView();
            this.renderOverview();

            // Navigate back to deck view
            this.showView('deck');
        } catch (error) {
            console.error('Error saving phrasal verb card:', error);
            alert(window.i18n.translate('alerts.failed_save_card'));
        }
    }

    async initializePhrasalVerbs() {
        try {
            // Check if phrasal verbs are already populated
            const existingVerbs = await storage.getPhrasalVerbsCount();
            if (existingVerbs === 0) {
                console.log('Populating phrasal verbs table...');
                await storage.populatePhrasalVerbs();
            } else {
                console.log(`Phrasal verbs already populated: ${existingVerbs} verbs`);
            }
        } catch (error) {
            console.error('Failed to initialize phrasal verbs:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    window.app = new FlashcardApp();
    
    // Initialize statistics after a short delay to ensure everything is loaded
    setTimeout(async () => {
        if (window.statistics) {
            await window.statistics.initialize();
        }
    }, 1000);
});