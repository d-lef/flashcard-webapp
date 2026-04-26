class I18n {
    constructor() {
        this.currentLanguage = 'ru';
        this.translations = {
            en: {
                // App
                'app.title': 'Flashcards',
                
                // Navigation
                'nav.overview': 'Overview',
                'nav.decks': 'Decks',
                'nav.stats': 'Stats',
                'nav.settings': 'Settings',
                
                // Overview
                'overview.title': 'Study Overview',
                'overview.all_cards_to_study': 'All cards to study',
                'overview.start_studying': 'Start studying',
                'overview.cards_due_today': 'Cards due today',
                'overview.study_due': 'Study due cards',
                'overview.overdue_cards': 'Overdue cards',
                'overview.study_overdue': 'Study overdue',
                'overview.new_cards': 'New cards',
                'overview.study_new': 'Study new cards',
                'overview.due_today': 'Ready to Study',
                'overview.reviewed_today': 'Studied Today',
                'overview.overdue': 'Overdue Cards',
                'overview.study_streak': 'Study Streak',
                'overview.future_cards': 'Cards scheduled for future',
                'overview.recent_activity': 'Recent Activity',
                'overview.study_calendar': 'Study Calendar',

                // Search
                'search.placeholder': 'Search cards...',
                'search.no_results': 'No cards found',
                'search.more_results': '+{count} more cards in this deck',

                // Settings
                'settings.title': 'Settings',
                'settings.appearance': 'Appearance',
                'settings.theme': 'Theme',
                'settings.light': 'Light',
                'settings.dark': 'Dark',
                'settings.language': 'Language',
                'settings.testing': 'Testing',
                'settings.testing_mode': 'Test Mode',
                'settings.testing_description': 'Demo mode with sample data. Your real data stays safe and untouched.',
                'settings.on': 'ON',
                'settings.off': 'OFF',
                'settings.notifications': 'Notifications',
                'settings.enable_notifications': 'Enable Daily Reminders',
                'settings.reminder_time': 'Reminder Time',
                'settings.streak_reminders': 'Streak Risk Alerts',
                'settings.notification_permission_needed': 'Permission needed for notifications',
                'settings.notification_permission_granted': 'Notifications enabled',
                'settings.notification_permission_denied': 'Notifications blocked by browser',
                'settings.spaced_repetition': 'How Spaced Repetition Works',
                'settings.sm2_adaptive': '🧠 Adaptive Learning',
                'settings.sm2_adaptive_desc': 'Cards you find difficult appear more frequently, while easy cards appear less often.',
                'settings.sm2_intervals': '⏰ Smart Intervals',
                'settings.sm2_intervals_desc': 'Review intervals increase exponentially: 1 day → 6 days → weeks → months.',
                'settings.sm2_grades': '⭐ Four Grades',
                'settings.sm2_grades_desc': '<strong>Again</strong> (restart), <strong>Hard</strong> (shorter interval), <strong>Good</strong> (normal), <strong>Easy</strong> (longer interval).',
                'settings.sm2_retention': '💡 Long-term Memory',
                'settings.sm2_retention_desc': 'Reviews happen just before you\'re likely to forget, maximizing retention with minimal effort.',
                // Actions
                'actions.study_all': 'Study All Cards',
                'actions.new_deck': 'New Deck',
                'actions.new_card': 'New Card',
                'actions.new_supercard': 'New Supercard',
                'actions.back': 'Back',
                'actions.study': 'Study',
                'actions.cancel': 'Cancel',
                'actions.create': 'Create',
                'actions.select': 'Select',
                'actions.save': 'Save',
                'actions.close': 'Close',
                'actions.delete': 'Delete',
                'actions.continue': 'Continue',
                
                // Card Types
                'card_type.select_type': 'Select Card Type',
                'card_type.flip': 'Flip Cards',
                'card_type.flip_description': 'Traditional flashcard study with front/back card flipping',
                'card_type.flip_type': 'Flip + Type',
                'card_type.flip_type_description': 'Active recall by typing answers plus card review',
                'card_type.irregular_verbs': 'Irregular Verbs',
                'card_type.irregular_verbs_description': 'Specialized templates for verb conjugation practice',
                'card_type.phrasal_verbs': 'Multi-word Verbs',
                'card_type.phrasal_verbs_description': 'Phrasal and prepositional verb expressions',
                'card_type.card_behavior': 'Card Behavior',
                'card_type.flip_only': 'Flip Only',
                'card_type.flip_and_type': 'Flip + Type',
                
                // Stats
                'stats.title': 'Study Statistics',
                'stats.streak': 'Study Streak',
                'stats.reviews_today': 'Reviews Today',
                'stats.accuracy_today': 'Today\'s Accuracy',
                'stats.total_cards': 'Total Cards',
                'stats.days': 'days',
                'stats.cards': 'cards',
                'stats.reviews': 'reviews',
                'stats.no_study': 'No study',
                'stats.light_study': 'Light study',
                'stats.medium_study': 'Medium study',
                'stats.intensive_study': 'Intensive study',
                'stats.this_week': 'This Week',
                'stats.total_reviews': 'Total Reviews',
                'stats.avg_accuracy': 'Average Accuracy',
                'stats.study_days': 'Study Days',
                
                // Study Mode
                'study_mode.title': 'Choose Study Mode',
                'study_mode.flip_title': 'Flip Cards Only',
                'study_mode.flip_desc': 'Traditional flashcard mode. See the front, flip to reveal answer, rate difficulty.',
                'study_mode.start_flip': 'Start Flip Mode',
                'study_mode.type_title': 'Type Answer Only',
                'study_mode.type_desc': 'Type your answer and check if it\'s correct. More challenging and active recall.',
                'study_mode.start_type': 'Start Type Mode',
                'study_mode.combined_title': 'Combined Mode',
                'study_mode.rigorous': 'Rigorous study:',
                'study_mode.combined_desc': 'Each card requires BOTH typing and flipping to pass. Best for retention!',
                'study_mode.start_combined': 'Start Combined Mode',
                
                // Study
                'study.type_answer': 'Type Answer',
                'study.review_card': 'Review Card',
                'study.flip_card': 'Flip Card',
                'study.check_answer': 'Check Answer',
                'study.dont_remember': 'I don\'t remember',
                'study.your_answer': 'Your answer:',
                'study.correct_answer': 'Correct answer:',
                'study.type_placeholder': 'Type your answer...',
                
                // Difficulty
                'difficulty.again': 'Again',
                'difficulty.hard': 'Hard',
                'difficulty.good': 'Good',
                'difficulty.easy': 'Easy',
                
                // Modals
                'modal.create_deck': 'Create New Deck',
                'modal.edit_deck': 'Edit Deck',
                'modal.deck_name': 'Deck name',
                'modal.create_card': 'Create New Card',
                'modal.edit_card': 'Edit Card',
                'modal.front': 'Front (hint):',
                'modal.back': 'Back (to study):',
                'modal.front_placeholder': 'Enter front side text',
                'modal.back_placeholder': 'Enter back side text',
                
                // Irregular Verbs
                'irregular_verbs.preview': 'Verb Preview',
                'irregular_verbs.infinitive': 'Infinitive',
                'irregular_verbs.past_simple': 'Past Simple',
                'irregular_verbs.past_participle': 'Past Participle',
                'irregular_verbs.translation': 'Translation',
                'irregular_verbs.create_cards': 'Create 3 Cards',
                'irregular_verbs.search_placeholder': 'Type infinitive (e.g., \'go\', \'take\')...',
                
                // Phrasal Verbs
                'phrasal_verbs.preview': 'Phrasal Verb Preview',
                'phrasal_verbs.infinitive': 'Infinitive',
                'phrasal_verbs.full_expression': 'Full Expression',
                'phrasal_verbs.translation': 'Translation',
                'phrasal_verbs.type': 'Type',
                'phrasal_verbs.create_card': 'Create Card',
                'phrasal_verbs.search_placeholder': 'Type verb or expression (e.g., \'look up\', \'give in\')...',
                
                // Card Statistics Modal
                'card_stats.title': 'Card Statistics',
                'card_stats.successful_reviews': 'Successful Reviews So Far',
                'card_stats.failed_reviews': 'Failed Reviews So Far',
                'card_stats.next_due_date': 'Next Due Date',
                'card_stats.not_scheduled': 'Not scheduled',
                'card_stats.close': 'Close',
                
                // Alert Messages
                'alerts.no_cards_in_deck': 'No cards in this deck to study!',
                'alerts.type_answer_first': 'Please type an answer first!',
                'alerts.study_complete': 'Study session complete!',
                'alerts.deck_complete': 'Deck study complete!',
                'alerts.cards_studied': 'Cards studied',
                'alerts.cards_reviewed': 'Cards reviewed',
                'alerts.current_streak': 'Current streak',
                'alerts.days': 'days',
                'alerts.all_due_completed_yes': 'Yes',
                'alerts.all_due_completed_no': 'No',
                'alerts.all_due_completed': 'All due cards completed',
                'alerts.enter_deck_name': 'Please enter a deck name',
                'alerts.failed_update_deck': 'Failed to update deck',
                'alerts.failed_create_deck': 'Failed to create deck',
                'alerts.fill_both_sides': 'Please fill in both front and back of the card',
                'alerts.fill_both_sides_card': 'Please fill in both sides of the card',
                'alerts.failed_save_card': 'Failed to save card',
                'alerts.no_cards_available': 'No cards available to study!',
                'alerts.no_cards_due': 'No cards to study right now!',
                'alerts.failed_delete_deck': 'Failed to delete deck. Please try again.',
                'alerts.failed_delete_card': 'Failed to delete card. Please try again.',
                'alerts.no_deck_selected': 'No deck selected. Please select a deck first.',
                'alerts.failed_save_cards': 'Failed to save cards. Please try again.',
                'alerts.confirm_delete_card': 'Are you sure you want to delete this card?',
                'alerts.confirm_delete_card_detail': 'Are you sure you want to delete this card?\n\nFront: "{0}"\nBack: "{1}"\n\nThis action cannot be undone.',
                'alerts.confirm_delete_deck': 'Are you sure you want to delete "{0}"?\n\nThis action cannot be undone.',
                'alerts.confirm_delete_deck_with_cards': 'Are you sure you want to delete "{0}"?\n\nThis will permanently delete the deck and all {1} cards inside it. This action cannot be undone.',

                // Dynamic UI strings
                'decks.empty_state': 'No decks yet. Create your first deck!',
                'decks.card_count': '{0} cards',
                'decks.card_count_one': '1 card',
                'cards.empty_state': 'No cards in this deck. Add your first card!'
            },
            
            ru: {
                // App
                'app.title': 'Карточки',
                
                // Navigation
                'nav.overview': 'Обзор',
                'nav.decks': 'Колоды',
                'nav.stats': 'Статистика',
                'nav.settings': 'Настройки',
                
                // Overview
                'overview.title': 'Обзор изучения',
                'overview.all_cards_to_study': 'Все карточки для изучения',
                'overview.start_studying': 'Начать изучение',
                'overview.cards_due_today': 'Карточки на сегодня',
                'overview.study_due': 'Изучить на сегодня',
                'overview.overdue_cards': 'Просроченные карточки',
                'overview.study_overdue': 'Изучить просроченные',
                'overview.new_cards': 'Новые карточки',
                'overview.study_new': 'Изучить новые',
                'overview.due_today': 'Готово к изучению',
                'overview.reviewed_today': 'Изучено сегодня',
                'overview.overdue': 'Просрочено',
                'overview.study_streak': 'Дни подряд',
                'overview.future_cards': 'Будущие карточки',
                'overview.recent_activity': 'Последняя активность',
                'overview.study_calendar': 'Календарь изучения',

                // Search
                'search.placeholder': 'Поиск карточек...',
                'search.no_results': 'Карточки не найдены',
                'search.more_results': '+{count} карточек в этой колоде',

                // Settings
                'settings.title': 'Настройки',
                'settings.appearance': 'Внешний вид',
                'settings.theme': 'Тема',
                'settings.light': 'Светлая',
                'settings.dark': 'Тёмная',
                'settings.language': 'Язык',
                'settings.testing': 'Тестирование',
                'settings.testing_mode': 'Тестовый режим',
                'settings.testing_description': 'Демо-режим с образцами данных. Ваши реальные данные остаются в безопасности.',
                'settings.on': 'ВКЛ',
                'settings.off': 'ВЫКЛ',
                'settings.notifications': 'Уведомления',
                'settings.enable_notifications': 'Ежедневные напоминания',
                'settings.reminder_time': 'Время напоминания',
                'settings.streak_reminders': 'Уведомления о серии',
                'settings.notification_permission_needed': 'Нужно разрешение для уведомлений',
                'settings.notification_permission_granted': 'Уведомления включены',
                'settings.notification_permission_denied': 'Уведомления заблокированы браузером',
                'settings.spaced_repetition': 'Как работает интервальное повторение',
                'settings.sm2_adaptive': '🧠 Адаптивное обучение',
                'settings.sm2_adaptive_desc': 'Сложные карточки появляются чаще, а лёгкие — реже.',
                'settings.sm2_intervals': '⏰ Умные интервалы',
                'settings.sm2_intervals_desc': 'Интервалы повторения растут экспоненциально: 1 день → 6 дней → недели → месяцы.',
                'settings.sm2_grades': '⭐ Четыре оценки',
                'settings.sm2_grades_desc': '<strong>Снова</strong> (сначала), <strong>Сложно</strong> (короче интервал), <strong>Хорошо</strong> (обычно), <strong>Легко</strong> (длиннее интервал).',
                'settings.sm2_retention': '💡 Долговременная память',
                'settings.sm2_retention_desc': 'Повторения происходят как раз перед тем, как вы забудете, максимизируя запоминание при минимальных усилиях.',
                // Actions
                'actions.study_all': 'Изучить все карточки',
                'actions.new_deck': 'Новая колода',
                'actions.new_card': 'Новая карточка',
                'actions.new_supercard': 'Новая суперкарточка',
                'actions.back': 'Назад',
                'actions.study': 'Изучать',
                'actions.cancel': 'Отмена',
                'actions.create': 'Создать',
                'actions.select': 'Выбрать',
                'actions.save': 'Сохранить',
                'actions.close': 'Закрыть',
                'actions.delete': 'Удалить',
                'actions.continue': 'Продолжить',
                
                // Card Types
                'card_type.select_type': 'Выберите тип карточки',
                'card_type.flip': 'Карточки с переворотом',
                'card_type.flip_description': 'Традиционное изучение карточек с переворотом лицевой и обратной стороны',
                'card_type.flip_type': 'Переворот + Печать',
                'card_type.flip_type_description': 'Активное воспроизведение через набор ответов плюс просмотр карточки',
                'card_type.irregular_verbs': 'Неправильные глаголы',
                'card_type.irregular_verbs_description': 'Специальные шаблоны для изучения спряжения глаголов',
                'card_type.phrasal_verbs': 'Многословные глаголы',
                'card_type.phrasal_verbs_description': 'Фразовые и предложные глаголы',
                'card_type.card_behavior': 'Поведение карточки',
                'card_type.flip_only': 'Только переворот',
                'card_type.flip_and_type': 'Переворот + Печать',
                
                // Stats
                'stats.title': 'Статистика изучения',
                'stats.streak': 'Дни подряд',
                'stats.reviews_today': 'Повторений сегодня',
                'stats.accuracy_today': 'Точность сегодня',
                'stats.total_cards': 'Всего карточек',
                'stats.days': 'дней',
                'stats.cards': 'карточек',
                'stats.reviews': 'повторений',
                'stats.no_study': 'Не изучали',
                'stats.light_study': 'Лёгкое изучение',
                'stats.medium_study': 'Среднее изучение',
                'stats.intensive_study': 'Интенсивное изучение',
                'stats.this_week': 'На этой неделе',
                'stats.total_reviews': 'Всего повторений',
                'stats.avg_accuracy': 'Средняя точность',
                'stats.study_days': 'Дней изучения',
                
                // Study Mode
                'study_mode.title': 'Выберите режим изучения',
                'study_mode.flip_title': 'Только переворот',
                'study_mode.flip_desc': 'Традиционный режим карточек. Посмотрите на лицевую сторону, переверните для ответа, оцените сложность.',
                'study_mode.start_flip': 'Начать режим переворота',
                'study_mode.type_title': 'Только набор текста',
                'study_mode.type_desc': 'Напечатайте ваш ответ и проверьте, правильно ли это. Более сложный и активный способ запоминания.',
                'study_mode.start_type': 'Начать режим набора',
                'study_mode.combined_title': 'Комбинированный режим',
                'study_mode.rigorous': 'Тщательное изучение:',
                'study_mode.combined_desc': 'Каждая карточка требует И набора текста И переворота для прохождения. Лучше для запоминания!',
                'study_mode.start_combined': 'Начать комбинированный режим',
                
                // Study
                'study.type_answer': 'Набрать ответ',
                'study.review_card': 'Просмотр карточки',
                'study.flip_card': 'Перевернуть карточку',
                'study.check_answer': 'Проверить ответ',
                'study.dont_remember': 'Не помню',
                'study.your_answer': 'Ваш ответ:',
                'study.correct_answer': 'Правильный ответ:',
                'study.type_placeholder': 'Напечатайте ваш ответ...',
                
                // Difficulty
                'difficulty.again': 'Снова',
                'difficulty.hard': 'Сложно',
                'difficulty.good': 'Хорошо',
                'difficulty.easy': 'Легко',
                
                // Modals
                'modal.create_deck': 'Создать новую колоду',
                'modal.edit_deck': 'Редактировать колоду',
                'modal.deck_name': 'Название колоды',
                'modal.create_card': 'Создать новую карточку',
                'modal.edit_card': 'Редактировать карточку',
                'modal.front': 'Лицевая сторона (подсказка):',
                'modal.back': 'Обратная сторона (изучать):',
                'modal.front_placeholder': 'Введите текст лицевой стороны',
                'modal.back_placeholder': 'Введите текст обратной стороны',
                
                // Irregular Verbs
                'irregular_verbs.preview': 'Предварительный просмотр глагола',
                'irregular_verbs.infinitive': 'Инфинитив',
                'irregular_verbs.past_simple': 'Прошедшее время',
                'irregular_verbs.past_participle': 'Причастие прошедшего времени',
                'irregular_verbs.translation': 'Перевод',
                'irregular_verbs.create_cards': 'Создать 3 карточки',
                'irregular_verbs.search_placeholder': 'Введите инфинитив (например, \'go\', \'take\')...',
                
                // Phrasal Verbs
                'phrasal_verbs.preview': 'Предварительный просмотр фразового глагола',
                'phrasal_verbs.infinitive': 'Инфинитив',
                'phrasal_verbs.full_expression': 'Полное выражение',
                'phrasal_verbs.translation': 'Перевод',
                'phrasal_verbs.type': 'Тип',
                'phrasal_verbs.create_card': 'Создать карточку',
                'phrasal_verbs.search_placeholder': 'Введите глагол или выражение (например, \'look up\', \'give in\')...',
                
                // Card Statistics Modal
                'card_stats.title': 'Статистика карточки',
                'card_stats.successful_reviews': 'Успешных повторений',
                'card_stats.failed_reviews': 'Неудачных повторений',
                'card_stats.next_due_date': 'Следующий срок повторения',
                'card_stats.not_scheduled': 'Не запланировано',
                'card_stats.close': 'Закрыть',
                
                // Alert Messages
                'alerts.no_cards_in_deck': 'В этой колоде нет карточек для изучения!',
                'alerts.type_answer_first': 'Сначала введите ответ!',
                'alerts.study_complete': 'Изучение завершено!',
                'alerts.deck_complete': 'Изучение колоды завершено!',
                'alerts.cards_studied': 'Карточек изучено',
                'alerts.cards_reviewed': 'Карточек повторено',
                'alerts.current_streak': 'Текущая серия',
                'alerts.days': 'дней',
                'alerts.all_due_completed_yes': 'Да',
                'alerts.all_due_completed_no': 'Нет',
                'alerts.all_due_completed': 'Все срочные карточки изучены',
                'alerts.enter_deck_name': 'Введите название колоды',
                'alerts.failed_update_deck': 'Не удалось обновить колоду',
                'alerts.failed_create_deck': 'Не удалось создать колоду',
                'alerts.fill_both_sides': 'Заполните обе стороны карточки',
                'alerts.fill_both_sides_card': 'Заполните обе стороны карточки',
                'alerts.failed_save_card': 'Не удалось сохранить карточку',
                'alerts.no_cards_available': 'Нет карточек для изучения!',
                'alerts.no_cards_due': 'Сейчас нет карточек для изучения!',
                'alerts.failed_delete_deck': 'Не удалось удалить колоду. Попробуйте еще раз.',
                'alerts.failed_delete_card': 'Не удалось удалить карточку. Попробуйте еще раз.',
                'alerts.no_deck_selected': 'Колода не выбрана. Сначала выберите колоду.',
                'alerts.failed_save_cards': 'Не удалось сохранить карточки. Попробуйте еще раз.',
                'alerts.confirm_delete_card': 'Вы уверены, что хотите удалить эту карточку?',
                'alerts.confirm_delete_card_detail': 'Вы уверены, что хотите удалить эту карточку?\n\nЛицевая: "{0}"\nОбратная: "{1}"\n\nЭто действие нельзя отменить.',
                'alerts.confirm_delete_deck': 'Вы уверены, что хотите удалить "{0}"?\n\nЭто действие нельзя отменить.',
                'alerts.confirm_delete_deck_with_cards': 'Вы уверены, что хотите удалить "{0}"?\n\nЭто навсегда удалит колоду и все {1} карточек в ней. Это действие нельзя отменить.',

                // Dynamic UI strings
                'decks.empty_state': 'Пока нет колод. Создайте свою первую колоду!',
                'decks.card_count': '{0} карточек',
                'decks.card_count_one': '1 карточка',
                'cards.empty_state': 'В этой колоде нет карточек. Добавьте первую карточку!'
            }
        };
        
        this.loadLanguagePreference();
    }
    
    loadLanguagePreference() {
        try {
            const saved = localStorage.getItem('flashcard_language');
            if (saved && this.translations[saved]) {
                this.currentLanguage = saved;
            }
        } catch (error) {
            console.error('🚨 CRITICAL: Failed to load language preference from localStorage:', error);
            console.error('🚨 Using default language to prevent app crash');
        }
    }

    saveLanguagePreference() {
        try {
            localStorage.setItem('flashcard_language', this.currentLanguage);
        } catch (error) {
            console.error('🚨 CRITICAL: Failed to save language preference to localStorage:', error);
            console.error('🚨 Language preference will not persist across sessions');
        }
    }
    
    setLanguage(lang) {
        if (this.translations[lang]) {
            this.currentLanguage = lang;
            this.saveLanguagePreference();
            this.updatePageTranslations();
        }
    }
    
    translate(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
    
    updatePageTranslations() {
        // Update all elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            // Check if translation contains HTML (has < and > characters)
            if (translation.includes('<') && translation.includes('>')) {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        });
        
        // Update placeholders
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.translate(key);
            element.placeholder = translation;
        });
    }
    
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

// Initialize i18n
window.i18n = new I18n();