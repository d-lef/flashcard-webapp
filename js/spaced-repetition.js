class SpacedRepetition {
    constructor() {
        this.maxInterval = 36500; // ~100 years max
    }

    // Helper function to get local date string (YYYY-MM-DD)
    // Fixes timezone bug: toISOString() returns UTC date which differs from local date near midnight
    getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Proper SM-2 Algorithm implementation
    calculateNextReview(card, difficulty) {
        const now = new Date();
        let interval = card.interval || 1;
        let ease = card.ease || card.easeFactor || 2.5;
        let reps = card.reps || card.repetitions || 0;
        let lapses = card.lapses || 0;
        let grade;

        // Map difficulty to SM-2 grades (0-5)
        switch (difficulty) {
            case 'again':
                grade = 0;
                break;
            case 'hard':
                grade = 2;
                break;
            case 'good':
                grade = 3;
                break;
            case 'easy':
                grade = 5;
                break;
            default:
                grade = 3;
        }

        // SM-2 Algorithm
        if (grade < 3) {
            // Failed review - reset repetitions and increase lapses
            reps = 0;
            lapses += 1;
            interval = 1;
        } else {
            // Successful review
            reps += 1;
            
            if (reps === 1) {
                interval = 1;
            } else if (reps === 2) {
                interval = 6;
            } else {
                interval = Math.round(interval * ease);
            }
        }

        // Update ease factor based on grade
        ease = ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02));
        ease = Math.max(1.3, Math.min(5.0, ease));

        // Cap maximum interval
        interval = Math.min(interval, this.maxInterval);

        // Calculate next review date
        const nextReview = new Date(now);
        nextReview.setDate(nextReview.getDate() + interval);

        return {
            interval,
            ease,
            reps,
            lapses,
            grade,
            dueDate: this.getLocalDateString(nextReview), // Date only (local timezone)
            lastReviewed: this.getLocalDateString(now), // Date only (local timezone)
            nextReview: nextReview.toISOString(),
            // Legacy compatibility
            easeFactor: ease,
            repetitions: reps
        };
    }

    getCardsForStudy(deck, limit = 20) {
        const today = this.getLocalDateString();
        const studyCards = [];

        for (const card of deck.cards) {
            const dueDate = card.dueDate || card.due_date || card.nextReview;
            const reps = card.reps || card.repetitions || 0;
            const lapses = card.lapses || 0;

            // Truly new card: never studied (reps === 0 AND lapses === 0)
            if (reps === 0 && lapses === 0) {
                studyCards.push({...card, isNew: true});
            } else if (dueDate) {
                // Card has been studied before - check if due
                const cardDueDate = dueDate.split('T')[0];
                if (cardDueDate <= today) {
                    studyCards.push({...card, isDue: true});
                }
            }
        }

        studyCards.sort((a, b) => {
            if (a.isNew && !b.isNew) return -1;
            if (!a.isNew && b.isNew) return 1;
            if (a.isDue && !b.isDue) return -1;
            if (!a.isDue && b.isDue) return 1;
            
            const aDue = a.dueDate || a.due_date || a.nextReview;
            const bDue = b.dueDate || b.due_date || b.nextReview;
            
            if (aDue && bDue) {
                return new Date(aDue) - new Date(bDue);
            }
            return 0;
        });

        return studyCards.slice(0, limit);
    }

    getCardsDueToday(deck) {
        const today = this.getLocalDateString();
        const dueCards = [];

        for (const card of deck.cards) {
            const dueDate = card.dueDate || card.due_date || card.nextReview;
            const reps = card.reps || card.repetitions || 0;
            const lapses = card.lapses || 0;

            // Card has been studied before (either has reps > 0 OR lapses > 0)
            if (dueDate && (reps > 0 || lapses > 0)) {
                const cardDueDate = dueDate.split('T')[0];
                if (cardDueDate === today) {
                    dueCards.push({...card, isDue: true});
                }
            }
        }

        return dueCards;
    }

    getOverdueCards(deck) {
        const today = this.getLocalDateString();
        const overdueCards = [];

        for (const card of deck.cards) {
            const dueDate = card.dueDate || card.due_date || card.nextReview;
            const reps = card.reps || card.repetitions || 0;
            const lapses = card.lapses || 0;

            // Card has been studied before (either has reps > 0 OR lapses > 0)
            if (dueDate && (reps > 0 || lapses > 0)) {
                const cardDueDate = dueDate.split('T')[0];
                if (cardDueDate < today) {
                    overdueCards.push({...card, isOverdue: true});
                }
            }
        }

        return overdueCards;
    }

    getNewCards(deck) {
        const newCards = [];

        for (const card of deck.cards) {
            // A card is truly new only if it has never been studied
            // Cards with lapses > 0 have been studied before (and failed), so they're not new
            const reps = card.reps || card.repetitions || 0;
            const lapses = card.lapses || 0;

            if (reps === 0 && lapses === 0) {
                newCards.push({...card, isNew: true});
            }
        }

        return newCards;
    }

    getDueCount(deck) {
        const today = this.getLocalDateString();
        let dueCount = 0;

        for (const card of deck.cards) {
            const dueDate = card.dueDate || card.due_date || card.nextReview;
            const reps = card.reps || card.repetitions || 0;
            const lapses = card.lapses || 0;

            // Truly new card: never studied
            if (reps === 0 && lapses === 0) {
                dueCount++;
            } else if (dueDate) {
                // Card has been studied - check if due
                const cardDueDate = dueDate.split('T')[0];
                if (cardDueDate <= today) {
                    dueCount++;
                }
            }
        }

        return dueCount;
    }

    updateCardAfterReview(card, difficulty) {
        const reviewData = this.calculateNextReview(card, difficulty);
        
        return {
            ...card,
            ...reviewData,
            reviewCount: (card.reviewCount || 0) + 1,
            isModified: true
        };
    }
}

window.spacedRepetition = new SpacedRepetition();