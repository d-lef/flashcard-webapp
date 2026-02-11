class Statistics {
    constructor() {
        this.currentMonth = new Date().getMonth();
        this.currentYear = new Date().getFullYear();
        this.monthNames = {
            en: ['January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'],
            ru: ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
                 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
        };
        this.dayNames = {
            en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        };
    }

    async loadStats() {
        try {
            // Get current month's data
            const startDate = this.getLocalDateString(new Date(this.currentYear, this.currentMonth, 1));
            const endDate = this.getLocalDateString(new Date(this.currentYear, this.currentMonth + 1, 0));

            const reviewStats = await this.getMergedReviewStats(startDate, endDate);
            
            // Get today's stats
            const today = this.getLocalDateString();
            const todayStats = reviewStats.find(stat => stat.day === today) || 
                             { reviews: 0, correct: 0, lapses: 0 };
            
            // Calculate weekly stats
            const weekStats = this.calculateWeekStats(reviewStats);
            
            // Calculate streak
            const streak = await this.calculateStreak();
            
            // Get total cards from storage
            const decks = await storage.loadDecks();
            const totalCards = decks.reduce((sum, deck) => sum + deck.cards.length, 0);
            
            return {
                today: todayStats,
                week: weekStats,
                month: reviewStats,
                streak: streak,
                totalCards: totalCards
            };
        } catch (error) {
            console.error('Failed to load statistics:', error);
            return {
                today: { reviews: 0, correct: 0, lapses: 0 },
                week: { reviews: 0, accuracy: 0, days: 0 },
                month: [],
                streak: 0,
                totalCards: 0
            };
        }
    }

    // Helper function to get local date string (YYYY-MM-DD)
    getLocalDateString(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    calculateWeekStats(reviewStats) {
        const today = new Date();
        const startOfWeek = new Date(today);
        // Calculate Monday as start of week (Sunday=0 -> Monday start = -6, Monday=1 -> Monday start = 0)
        const dayOfWeek = today.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        startOfWeek.setDate(today.getDate() - daysFromMonday);
        
        let totalReviews = 0;
        let totalCorrect = 0;
        let studyDays = 0;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            const dateStr = this.getLocalDateString(date);
            
            const dayStat = reviewStats.find(stat => stat.day === dateStr);
            if (dayStat && dayStat.reviews > 0) {
                totalReviews += dayStat.reviews;
                totalCorrect += dayStat.correct;
                studyDays++;
            }
        }
        
        const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
        
        return {
            reviews: totalReviews,
            accuracy: accuracy,
            days: studyDays
        };
    }

    async calculateStreak() {
        try {
            // Get last 365 days of stats
            const today = new Date();
            const yearAgo = new Date(today);
            yearAgo.setDate(today.getDate() - 365);

            const startDate = this.getLocalDateString(yearAgo);
            const endDate = this.getLocalDateString(today);

            const reviewStats = await this.getMergedReviewStats(startDate, endDate);
            
            // Create a set of complete study days (where all due cards were studied)
            const completeStudyDays = new Set(
                reviewStats
                    .filter(stat => stat.all_due_completed === true)
                    .map(stat => stat.day)
            );
            
            // Calculate streak with grace period for today
            let streak = 0;
            const currentDate = new Date(today);
            const todayStr = this.getLocalDateString(currentDate);
            
            // Special handling for today - give users until end of day
            let startFromYesterday = false;
            if (completeStudyDays.has(todayStr)) {
                // Today is already completed, count it
                streak++;
                currentDate.setDate(currentDate.getDate() - 1);
            } else {
                // Today not completed yet - check if yesterday was completed
                const yesterday = new Date(currentDate);
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = this.getLocalDateString(yesterday);
                
                if (completeStudyDays.has(yesterdayStr)) {
                    // Yesterday was completed, so user still has today to maintain streak
                    // Start counting from yesterday's streak and give them today
                    startFromYesterday = true;
                    currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday
                } else {
                    // Yesterday wasn't completed either, streak is broken
                    return 0;
                }
            }
            
            // Count consecutive complete days going backward
            while (currentDate >= yearAgo) {
                const dateStr = this.getLocalDateString(currentDate);
                if (completeStudyDays.has(dateStr)) {
                    streak++;
                    currentDate.setDate(currentDate.getDate() - 1);
                } else {
                    break;
                }
            }
            
            return streak;
        } catch (error) {
            console.error('Failed to calculate streak:', error);
            return 0;
        }
    }

    updateDisplay(stats) {
        // Update quick stats - check if elements exist first
        const streakElement = document.getElementById('overview-streak-count');
        if (streakElement) {
            streakElement.textContent = stats.streak;
        }
        
        const reviewsTodayElement = document.getElementById('reviews-today');
        if (reviewsTodayElement) {
            reviewsTodayElement.textContent = stats.today.reviews;
        }
        
        const totalCardsElement = document.getElementById('total-cards');
        if (totalCardsElement) {
            totalCardsElement.textContent = stats.totalCards;
        }
        
        // Update today's accuracy
        const accuracyElement = document.getElementById('accuracy-today');
        if (accuracyElement) {
            if (stats.today.reviews > 0) {
                const accuracy = Math.round((stats.today.correct / stats.today.reviews) * 100);
                accuracyElement.textContent = accuracy;
            } else {
                accuracyElement.textContent = '--';
            }
        }
        
        // Update weekly stats
        const weekReviewsElement = document.getElementById('week-reviews');
        if (weekReviewsElement) {
            weekReviewsElement.textContent = stats.week.reviews;
        }
        
        const weekDaysElement = document.getElementById('week-days');
        if (weekDaysElement) {
            weekDaysElement.textContent = stats.week.days;
        }
        
        const weekAccuracyElement = document.getElementById('week-accuracy');
        if (weekAccuracyElement) {
            if (stats.week.reviews > 0) {
                weekAccuracyElement.textContent = stats.week.accuracy + '%';
            } else {
                weekAccuracyElement.textContent = '--';
            }
        }
        
        // Update calendar if it exists
        if (document.getElementById('study-calendar')) {
            this.renderCalendar(stats.month);
        }
    }

    renderCalendar(monthStats) {
        const calendar = document.getElementById('study-calendar');
        const monthTitle = document.getElementById('current-month');
        
        // Check if elements exist (they may not if stats view was removed)
        if (!calendar) {
            console.warn('Study calendar element not found, skipping calendar render');
            return;
        }
        
        // Update month title if it exists
        if (monthTitle) {
            const lang = window.i18n ? window.i18n.getCurrentLanguage() : 'en';
            const monthName = this.monthNames[lang][this.currentMonth];
            monthTitle.textContent = `${monthName} ${this.currentYear}`;
        }
        
        // Clear calendar
        calendar.innerHTML = '';
        
        this.renderCalendarToContainer(calendar, monthStats, false);
    }

    renderCalendarToContainer(container, monthStats, isCompact = false) {
        if (!container) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Create calendar grid
        const calendarGrid = document.createElement('div');
        calendarGrid.className = 'calendar-grid';
        container.appendChild(calendarGrid);
        
        // Add day headers
        const lang = window.i18n ? window.i18n.getCurrentLanguage() : 'en';
        const dayNames = this.dayNames[lang];
        dayNames.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day header';
            dayHeader.textContent = day;
            calendarGrid.appendChild(dayHeader);
        });
        
        // Get first day of month and number of days
        const firstDay = new Date(this.currentYear, this.currentMonth, 1);
        const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        // Convert Sunday=0 to Monday=0 (Sunday becomes 6, Monday becomes 0)
        const startDayOfWeek = (firstDay.getDay() + 6) % 7;
        
        // Add empty cells for days before month starts
        for (let i = 0; i < startDayOfWeek; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day other-month';
            calendarGrid.appendChild(emptyDay);
        }
        
        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = day;
            
            // Check if it's today
            const today = new Date();
            if (this.currentYear === today.getFullYear() && 
                this.currentMonth === today.getMonth() && 
                day === today.getDate()) {
                dayElement.classList.add('today');
            }
            
            // Get stats for this day
            const dateStr = this.getLocalDateString(new Date(this.currentYear, this.currentMonth, day));
            const dayStat = monthStats ? monthStats.find(stat => stat.day === dateStr) : null;
            
            // Debug logging
            if (dayStat) {
                console.log(`Calendar day ${dateStr}:`, dayStat);
            }
            
            // Only color days where ALL due cards were completed
            if (dayStat && dayStat.all_due_completed === true) {
                let appliedClass = '';
                
                // Apply intensity based on number of reviews for complete study days
                if (dayStat.reviews >= 50) {
                    dayElement.classList.add('high-study');
                    appliedClass = 'high-study';
                } else if (dayStat.reviews >= 20) {
                    dayElement.classList.add('medium-study');
                    appliedClass = 'medium-study';
                } else {
                    dayElement.classList.add('complete-study');
                    appliedClass = 'complete-study';
                }
                
                console.log(`Day ${dateStr} applied class: ${appliedClass} (reviews: ${dayStat.reviews}, all_due_completed: ${dayStat.all_due_completed})`);
                
                // Add tooltip with stats
                dayElement.title = `${dayStat.reviews} reviews, ${Math.round((dayStat.correct / dayStat.reviews) * 100)}% accuracy (All due completed)`;
            } else {
                // No color for incomplete study days or days with no study
                dayElement.classList.add('no-study');
                
                // Add tooltip for incomplete study days
                if (dayStat && dayStat.reviews > 0) {
                    dayElement.title = `${dayStat.reviews} reviews, ${Math.round((dayStat.correct / dayStat.reviews) * 100)}% accuracy (Incomplete - not all due cards studied)`;
                    console.log(`Day ${dateStr} - incomplete study (reviews: ${dayStat.reviews}, all_due_completed: ${dayStat.all_due_completed})`);
                }
            }
            
            calendarGrid.appendChild(dayElement);
        }
    }

    // New method for overview calendar
    async renderCalendarMonth(date, container, isCompact = false) {
        // Set internal date tracking to match the requested date
        this.currentYear = date.getFullYear();
        this.currentMonth = date.getMonth();

        // Get stats for the month
        const startDate = this.getLocalDateString(new Date(this.currentYear, this.currentMonth, 1));
        const endDate = this.getLocalDateString(new Date(this.currentYear, this.currentMonth + 1, 0));

        const monthStats = await this.getMergedReviewStats(startDate, endDate);

        // Render to the specified container
        this.renderCalendarToContainer(container, monthStats, isCompact);
    }

    async getMergedReviewStats(startDate, endDate) {
        let supabaseStats = [];
        try {
            if (window.supabaseService && !(window.testModeDetector && window.testModeDetector.isTestingMode())) {
                supabaseStats = await window.supabaseService.getReviewStats(startDate, endDate);
            }
        } catch (error) {
            console.log('Could not fetch stats from Supabase:', error);
        }

        const localStats = this.getLocalReviewStats(startDate, endDate);

        // If no Supabase data, use localStorage entirely
        if (supabaseStats.length === 0) {
            return localStats;
        }

        // Merge: use Supabase as base, overlay localStorage all_due_completed
        const localMap = {};
        localStats.forEach(stat => {
            localMap[stat.day] = stat;
        });

        const merged = supabaseStats.map(stat => {
            const localStat = localMap[stat.day];
            if (localStat && localStat.all_due_completed === true && stat.all_due_completed !== true) {
                return { ...stat, all_due_completed: true };
            }
            return stat;
        });

        // Add any localStorage-only days not present in Supabase
        const supabaseDays = new Set(supabaseStats.map(s => s.day));
        localStats.forEach(stat => {
            if (!supabaseDays.has(stat.day)) {
                merged.push(stat);
            }
        });

        return merged;
    }

    getLocalReviewStats(startDate, endDate) {
        try {
            // SAFETY: In test mode, return test review stats
            if (window.testModeDetector && window.testModeDetector.isTestingMode()) {
                if (window.testDataManager) {
                    const testStats = window.testDataManager.getReviewStats();
                    return testStats
                        .filter(stats => stats.date >= startDate && stats.date <= endDate)
                        .map(stats => ({
                            day: stats.date,
                            reviews: stats.cardsReviewed || 0,
                            correct: stats.correctAnswers || 0,
                            lapses: (stats.cardsReviewed || 0) - (stats.correctAnswers || 0),
                            all_due_completed: stats.allDueCompleted != null ? stats.allDueCompleted : null
                        }));
                }
                return [];
            }

            // Normal mode - use localStorage
            const key = 'flashcard_app_review_stats';
            let allStats = {};
            try {
                const data = localStorage.getItem(key);
                allStats = data ? JSON.parse(data) : {};
            } catch (error) {
                console.error('🚨 CRITICAL: Failed to load review stats from localStorage:', error);
                console.error('🚨 Using empty stats to prevent app crash');
                allStats = {};
            }

            const result = [];
            for (const [date, stats] of Object.entries(allStats)) {
                if (date >= startDate && date <= endDate) {
                    result.push({
                        day: date,
                        reviews: stats.reviews || 0,
                        correct: stats.correct || 0,
                        lapses: stats.lapses || 0,
                        all_due_completed: stats.all_due_completed != null ? stats.all_due_completed : null
                    });
                }
            }

            return result;
        } catch (error) {
            console.error('Failed to load local review stats:', error);
            return [];
        }
    }

    setupEventListeners() {
        // Calendar navigation - check if elements exist
        const prevBtn = document.getElementById('prev-month');
        const nextBtn = document.getElementById('next-month');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.currentMonth--;
                if (this.currentMonth < 0) {
                    this.currentMonth = 11;
                    this.currentYear--;
                }
                this.refresh();
            });
        }
        
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.currentMonth++;
                if (this.currentMonth > 11) {
                    this.currentMonth = 0;
                    this.currentYear++;
                }
                this.refresh();
            });
        }
    }

    async refresh() {
        const stats = await this.loadStats();
        this.updateDisplay(stats);
    }

    async initialize() {
        this.setupEventListeners();
        await this.refresh();
    }
}

// Initialize statistics
window.statistics = new Statistics();