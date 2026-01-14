// Global variables
let currentBrush = 0;
let isDrawing = false;
let currentMode = 'last';
let layoutMode = 'single';
let multiMode = 'overlay';
let selectedYears = [];
let layersExpanded = false;
let currentLanguage = 'en';
let currentTheme = 'dark';
let selectedPattern = null;
let customPatterns = [];
let contributionsChart = null;

// Data storage for overlay mode
let overlayData = {};

// Система управления состоянием
const StateManager = {
    history: [],
    currentIndex: -1,
    maxHistorySize: 50,
    autoSaveInterval: null,

    // Сохраняет текущее состояние в историю
    saveState() {
        const state = {
            currentMode,
            layoutMode,
            multiMode,
            selectedYears: [...selectedYears],
            overlayData: JSON.parse(JSON.stringify(overlayData)),
            grid: contributionsChart ? JSON.parse(JSON.stringify(contributionsChart.grid)) : [],
            timestamp: new Date().getTime()
        };

        // Если мы делаем новое действие после отмены, удаляем все будущие состояния
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Добавляем новое состояние
        this.history.push(state);
        this.currentIndex++;

        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }

        // Автосохранение в localStorage
        this.saveToLocalStorage();

        // Обновляем UI кнопок
        this.updateUndoRedoButtons();
    },

    // Отменяет последнее действие
    undo() {
        if (this.currentIndex <= 0) return false;

        this.currentIndex--;
        this.restoreState(this.history[this.currentIndex]);
        this.updateUndoRedoButtons();
        return true;
    },

    // Повторяет отмененное действие
    redo() {
        if (this.currentIndex >= this.history.length - 1) return false;

        this.currentIndex++;
        this.restoreState(this.history[this.currentIndex]);
        this.updateUndoRedoButtons();
        return true;
    },

    // Восстанавливает состояние из истории
    restoreState(state) {
        currentMode = state.currentMode;
        layoutMode = state.layoutMode;
        multiMode = state.multiMode;
        selectedYears = [...state.selectedYears];
        overlayData = JSON.parse(JSON.stringify(state.overlayData));

        // Обновляем UI
        updateUIForMode();
        updateYearSelection();

        // Восстанавливаем grid
        if (contributionsChart && state.grid) {
            for (let week = 0; week < state.grid.length; week++) {
                for (let day = 0; day < 7; day++) {
                    if (state.grid[week] && state.grid[week][day] !== undefined) {
                        const level = state.grid[week][day];
                        const cell = document.querySelector(`[data-week="${week}"][data-day="${day}"]`);
                        if (cell) {
                            cell.dataset.level = level;
                            cell.style.background = ['var(--contribution-0)', 'var(--contribution-1)', 'var(--contribution-2)', 'var(--contribution-3)', 'var(--contribution-4)'][level];
                            contributionsChart.grid[week][day] = level;
                        }
                    }
                }
            }
        }

        // Обновляем отображение для overlay режима
        if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
            contributionsChart.displayOverlayYears();
        }

        updateContributions();
    },

    // Обновляет состояние кнопок Undo/Redo
    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) {
            undoBtn.disabled = this.currentIndex <= 0;
        }

        if (redoBtn) {
            redoBtn.disabled = this.currentIndex >= this.history.length - 1;
        }
    },

    // Сохраняет состояние в localStorage
    saveToLocalStorage() {
        if (!document.getElementById('auto-save').checked) return;

        const saveData = {
            currentMode,
            layoutMode,
            multiMode,
            selectedYears,
            overlayData,
            grid: contributionsChart ? contributionsChart.grid : [],
            customPatterns,
            currentTheme,
            currentLanguage,
            lastSaved: new Date().toISOString()
        };

        try {
            localStorage.setItem('github-art-state', JSON.stringify(saveData));
            console.log('Автосохранение выполнено:', new Date().toLocaleTimeString());
        } catch (e) {
            console.error('Ошибка автосохранения:', e);
        }
    },

    // Загружает состояние из localStorage
    loadFromLocalStorage() {
        try {
            const savedState = localStorage.getItem('github-art-state');
            if (!savedState) return false;

            const state = JSON.parse(savedState);

            // Валидация загруженного состояния
            if (!this.validateState(state)) {
                console.error('Ошибка валидации сохраненного состояния');
                return false;
            }

            // Применяем загруженные настройки
            currentMode = state.currentMode || 'last';
            layoutMode = state.layoutMode || 'single';
            multiMode = state.multiMode || 'overlay';
            selectedYears = state.selectedYears || [];
            overlayData = state.overlayData || {};
            customPatterns = state.customPatterns || [];

            if (state.currentTheme) {
                currentTheme = state.currentTheme;
                document.body.dataset.theme = currentTheme;
                document.querySelector('.theme-icon').textContent = currentTheme === 'dark' ? '🌙' : '☀️';
            }

            if (state.currentLanguage) {
                currentLanguage = state.currentLanguage;
                updateLanguage();
            }

            // Сохраняем загруженный grid для последующего применения после инициализации
            this.loadedGrid = state.grid;

            showNotification(translations[currentLanguage].project_loaded, 'success');
            return true;
        } catch (e) {
            console.error('Ошибка загрузки из localStorage:', e);
            return false;
        }
    },

    // Применяет загруженный grid к текущему chart
    applyLoadedGrid() {
        if (!this.loadedGrid || !contributionsChart) return;

        for (let week = 0; week < Math.min(this.loadedGrid.length, contributionsChart.grid.length); week++) {
            for (let day = 0; day < 7; day++) {
                if (this.loadedGrid[week] && this.loadedGrid[week][day] !== undefined) {
                    const level = this.loadedGrid[week][day];
                    const cell = document.querySelector(`[data-week="${week}"][data-day="${day}"]`);
                    if (cell) {
                        cell.dataset.level = level;
                        cell.style.background = ['var(--contribution-0)', 'var(--contribution-1)', 'var(--contribution-2)', 'var(--contribution-3)', 'var(--contribution-4)'][level];
                        contributionsChart.grid[week][day] = level;
                    }
                }
            }
        }

        // Обновляем отображение для overlay режима
        if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
            contributionsChart.displayOverlayYears();
        }

        updateContributions();
        this.loadedGrid = null; // Очищаем, чтобы не применять повторно
    },

    // Валидация загруженного состояния
    validateState(state) {
        // Базовая проверка структуры
        if (!state || typeof state !== 'object') return false;

        // Проверка обязательных полей
        const requiredFields = ['currentMode', 'layoutMode', 'multiMode', 'selectedYears', 'overlayData'];
        for (const field of requiredFields) {
            if (!(field in state)) return false;
        }

        // Проверка типов данных
        if (typeof state.currentMode !== 'string') return false;
        if (typeof state.layoutMode !== 'string') return false;
        if (typeof state.multiMode !== 'string') return false;
        if (!Array.isArray(state.selectedYears)) return false;
        if (typeof state.overlayData !== 'object') return false;

        // Проверка grid если он есть
        if (state.grid && !Array.isArray(state.grid)) return false;

        return true;
    },

    // Запускает автосохранение
    startAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            this.saveToLocalStorage();
        }, 30000); // Каждые 30 секунд
    },

    // Останавливает автосохранение
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }
};

// Translations
const translations = {
    en: {
        subtitle: "Create unique art on your GitHub profile",
        theme: "Theme",
        language: "Language",
        settings: "Settings",
        export: "Export",
        today: "Today:",
        how_it_works: "💡 How it works",
        description: "By default shows the last 365 days. When selecting a specific year, displays the full calendar year. Use Layout to overlay multiple years. Import your real GitHub data, draw custom patterns, or use predefined templates.",
        feature_import: "Import GitHub data",
        feature_patterns: "Pre-made patterns",
        feature_custom: "Custom drawing",
        feature_multiyear: "Multi-year support",
        feature_drag: "Drag & Drop patterns",
        feature_export: "Export to Git scripts",
        contributions: "contributions",
        in_last_year: "in the last year",
        single_year: "Single Year",
        multi_year: "Multi Year",
        last_year: "Last Year",
        overlay: "Overlay",
        continuation: "Continuation",
        layers: "Layers",
        less: "Less",
        more: "More",
        clear: "Clear",
        random: "Random",
        select_years: "Select years for overlay (Ctrl+click)",
        pattern_heart: "Heart",
        pattern_heart_desc: "Romantic single object pattern",
        pattern_wave: "Wave",
        pattern_wave_desc: "Smooth repeating wave pattern",
        pattern_stripes: "Stripes",
        pattern_stripes_desc: "Repeating stripe pattern",
        pattern_text: "Text",
        pattern_text_desc: "Custom text single object",
        pattern_custom: "Custom Pattern",
        pattern_custom_desc: "Create your own pattern",
        draw_your_own: "Draw your own",
        apply: "Apply",
        size: "Size",
        intensity: "Intensity",
        position: "Position",
        frequency: "Frequency",
        repeat: "Repeat",
        text: "Text",
        center: "Center",
        left: "Left",
        right: "Right",
        horizontal: "Horizontal",
        vertical: "Vertical",
        diagonal: "Diagonal",
        pattern_name: "Pattern Name",
        save_pattern: "Save Pattern",
        github_import: "GitHub Import",
        github_username: "GitHub username",
        github_token: "GitHub token (optional)",
        import_github: "Import from GitHub",
        general_settings: "General Settings",
        only_past_days: "Only past days",
        auto_save: "Auto-save progress",
        import_export: "Import & Export",
        import_json: "Import JSON",
        export_script: "⚙️ Shell Script",
        export_json: "📄 JSON Data",
        export_image: "🖼️ PNG Image",
        export_csv: "📊 CSV Data",
        collapse: "Collapse",
        layers: "Layers",
        undo: "Undo",
        redo: "Redo",
        project_saved: "Project saved",
        project_loaded: "Project loaded from local storage",
        auto_save_enabled: "Auto-save enabled",
        auto_save_disabled: "Auto-save disabled"
    },
    ru: {
        subtitle: "Создайте уникальный арт на вашем GitHub профиле",
        theme: "Тема",
        language: "Язык",
        settings: "Настройки",
        export: "Экспорт",
        today: "Сегодня:",
        how_it_works: "💡 Как это работает",
        description: "По умолчанию показывает последние 365 дней. При выборе конкретного года отображает полный календарный год. Используйте Layout для наслоения нескольких лет. Импортируйте реальные данные GitHub, рисуйте пользовательские паттерны или используйте готовые шаблоны.",
        feature_import: "Импорт данных GitHub",
        feature_patterns: "Готовые паттерны",
        feature_custom: "Пользовательское рисование",
        feature_multiyear: "Поддержка нескольких лет",
        feature_drag: "Перетаскивание паттернов",
        feature_export: "Экспорт в Git-скрипты",
        contributions: "вкладов",
        in_last_year: "за последний год",
        single_year: "Один год",
        multi_year: "Несколько лет",
        last_year: "Последний год",
        overlay: "Наложение",
        continuation: "Продолжение",
        layers: "Слои",
        less: "Меньше",
        more: "Больше",
        clear: "Очистить",
        random: "Случайно",
        select_years: "Выберите годы для наложения (Ctrl+клик)",
        pattern_heart: "Сердце",
        pattern_heart_desc: "Романтичный единичный объект",
        pattern_wave: "Волна",
        pattern_wave_desc: "Плавный повторяющийся паттерн",
        pattern_stripes: "Полосы",
        pattern_stripes_desc: "Повторяющийся паттерн полос",
        pattern_text: "Текст",
        pattern_text_desc: "Пользовательский текст",
        pattern_custom: "Пользовательский",
        pattern_custom_desc: "Создайте свой паттерн",
        draw_your_own: "Нарисуйте свой",
        apply: "Применить",
        size: "Размер",
        intensity: "Интенсивность",
        position: "Позиция",
        frequency: "Частота",
        repeat: "Повтор",
        text: "Текст",
        center: "По центру",
        left: "Слева",
        right: "Справа",
        horizontal: "Горизонтально",
        vertical: "Вертикально",
        diagonal: "Диагонально",
        pattern_name: "Название паттерна",
        save_pattern: "Сохранить паттерн",
        github_import: "Импорт GitHub",
        github_username: "Имя пользователя GitHub",
        github_token: "Токен GitHub (необязательно)",
        import_github: "Импорт из GitHub",
        general_settings: "Общие настройки",
        only_past_days: "Только прошедшие дни",
        auto_save: "Автосохранение",
        import_export: "Импорт и экспорт",
        import_json: "Импорт JSON",
        export_script: "⚙️ Shell-скрипт",
        export_json: "📄 JSON данные",
        export_image: "🖼️ PNG изображение",
        export_csv: "📊 CSV данные",
        collapse: "Свернуть",
        layers: "Слои",
        undo: "Отменить",
        redo: "Повторить",
        project_saved: "Проект сохранен",
        project_loaded: "Проект загружен из локального хранилища",
        auto_save_enabled: "Автосохранение включено",
        auto_save_disabled: "Автосохранение выключено"
    }
};

// Enhanced ContributionsChart class based on contributions_chart.html
class ContributionsChart {
    constructor(config) {
        this.block = config.block;
        this.colors = [
            "var(--contribution-0)",
            "var(--contribution-1)",
            "var(--contribution-2)",
            "var(--contribution-3)",
            "var(--contribution-4)"
        ];

        this.weekDayNames = ["", "Mon", "", "Wed", "", "Fri", ""];
        this.monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const year = config.startYear ?? new Date().getFullYear();
        const month = config.startMonth ?? 1;

        if (config.mode === 'last') {
            const today = new Date();
            this.endDate = new Date(today);
            this.startDate = new Date(today);
            this.startDate.setDate(today.getDate() - 364);

            // Align to start of week (Sunday)
            const dayOfWeek = this.startDate.getDay();
            this.startDate.setDate(this.startDate.getDate() - dayOfWeek);
        } else if (config.mode === 'multi') {
            // Multi-year mode
            this.setupMultiYear(config);
        } else {
            // Specific year
            this.startDate = new Date(year, 0, 1);
            this.endDate = new Date(year + 1, 0, 1);

            // Align to start of week for year view
            const dayOfWeek = this.startDate.getDay();
            this.startDate.setDate(this.startDate.getDate() - dayOfWeek);
        }

        this.grid = [];
        this.dates = [];
        this.isDrawing = false;
    }

    setupMultiYear(config) {
        if (multiMode === 'overlay') {
            const year = Math.min(...selectedYears);
            this.startDate = new Date(year, 0, 1);
            this.endDate = new Date(year + 1, 0, 1);
        } else {
            const sortedYears = [...selectedYears].sort((a, b) => a - b);
            this.startDate = new Date(sortedYears[0], 0, 1);
            this.endDate = new Date(sortedYears[sortedYears.length - 1] + 1, 0, 1);
        }

        const dayOfWeek = this.startDate.getDay();
        this.startDate.setDate(this.startDate.getDate() - dayOfWeek);
    }

    plot(contributions = []) {
        this.block.innerHTML = '';
        this.grid = [];
        this.dates = [];

        const date2count = Object.fromEntries(contributions.map(contribution => [contribution.date, contribution.count]));

        this.addWeekDays();

        let month = this.startDate.getMonth();
        let monthCell = null;
        let monthColumn = 0;
        let index = 0;
        let weekIndex = 0;

        // Initialize grid structure
        this.grid[0] = [];
        this.dates[0] = [];

        for (let date = new Date(this.startDate); date < this.endDate; date.setDate(date.getDate() + 1)) {
            const dayOfWeek = date.getDay();

            // Create new week if Sunday (except for first iteration)
            if (dayOfWeek === 0 && index > 0) {
                weekIndex++;
                this.grid[weekIndex] = [];
                this.dates[weekIndex] = [];
            }

            // Check if we need to add month label (first Sunday of month AND date is in target year)
            if (dayOfWeek === 0 && index > 0) {
                const currentMonth = date.getMonth();
                const currentYear = date.getFullYear();

                // Only show month if it's different AND we're in a valid year
                let shouldShowMonth = false;
                if (currentMonth !== month) {
                    if (layoutMode === 'multi' && selectedYears.length > 0) {
                        shouldShowMonth = selectedYears.includes(currentYear);
                    } else if (currentMode !== 'last') {
                        // Для конкретного года - показываем только месяцы этого года
                        const targetYear = parseInt(currentMode);
                        shouldShowMonth = currentYear === targetYear;
                    } else {
                        shouldShowMonth = true; // Last year mode
                    }
                }

                if (shouldShowMonth) {
                    if (monthCell) {
                        monthCell.style.gridColumnEnd = `span ${weekIndex - monthColumn}`;
                    }
                    monthColumn = weekIndex;
                    month = currentMonth;
                    monthCell = this.addCell("contribution-cell-month", this.monthNames[month]);
                }
            }

            // Add first month if not added yet
            if (index === 0) {
                const firstDateYear = date.getFullYear();
                let shouldShowFirstMonth = false;

                // Проверяем, нужно ли показывать первый месяц
                if (layoutMode === 'multi' && selectedYears.length > 0) {
                    shouldShowFirstMonth = selectedYears.includes(firstDateYear);
                } else if (currentMode !== 'last') {
                    // Для конкретного года - показываем первый месяц только если дата принадлежит целевому году
                    const targetYear = parseInt(currentMode);
                    shouldShowFirstMonth = firstDateYear === targetYear;
                } else {
                    shouldShowFirstMonth = true; // Last year mode
                }

                month = date.getMonth();
                monthColumn = 0;

                if (shouldShowFirstMonth) {
                    // Создаем ячейку месяца с названием
                    monthCell = this.addCell("contribution-cell-month", this.monthNames[month]);
                } else {
                    // Создаем пустую ячейку месяца для сохранения структуры grid
                    monthCell = this.addCell("contribution-cell-month", "");
                }
            }

            const count = date2count[this.formatDate(date)] ?? 0;
            const cell = this.addCell("contribution-cell-day", "");
            const cellDate = new Date(date);

            cell.style.background = this.getColor(count);
            cell.title = this.getTitle(cellDate, count);
            cell.dataset.week = weekIndex;
            cell.dataset.day = dayOfWeek;
            cell.dataset.level = count > 0 ? Math.min(4, Math.ceil(count / 3)) : 0;

            // Store in grid
            if (!this.grid[weekIndex]) this.grid[weekIndex] = [];
            if (!this.dates[weekIndex]) this.dates[weekIndex] = [];

            this.grid[weekIndex][dayOfWeek] = parseInt(cell.dataset.level);
            this.dates[weekIndex][dayOfWeek] = cellDate;

            // Add event listeners
            this.setupCellEvents(cell, weekIndex, dayOfWeek, cellDate);

            // Mark today and future dates
            const today = new Date();
            if (this.isSameDay(cellDate, today)) {
                cell.classList.add('today');
            }
            if (cellDate > today) {
                cell.classList.add('future');
            }

            // Handle multi-year visibility
            if (layoutMode === 'multi' && selectedYears.length > 0) {
                if (!selectedYears.includes(cellDate.getFullYear())) {
                    cell.style.opacity = '0.1';
                    cell.style.pointerEvents = 'none';
                }
            } else if (currentMode !== 'last') {
                // Handle single-year mode - disable cells from other years
                const targetYear = parseInt(currentMode);
                if (cellDate.getFullYear() !== targetYear) {
                    cell.style.opacity = '0.1';
                    cell.style.pointerEvents = 'none';
                }
            }

            index++;
        }

        // Close last month span
        if (monthCell) {
            monthCell.style.gridColumnEnd = `span ${weekIndex + 1 - monthColumn}`;
        }

        // Add year boundaries for multi-year continuation mode
        if (layoutMode === 'multi' && multiMode === 'continuation' && selectedYears.length > 1) {
            this.removeYearBoundaries(); // Сначала удаляем существующие границы
            this.addYearBoundaries();
        } else {
            this.removeYearBoundaries(); // Удаляем границы при других режимах
        }

        // Handle overlay mode
        if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
            this.displayOverlayYears();
        }

        return {
            grid: this.grid,
            dates: this.dates
        };
    }

    // Add this method to fix the misplaced code
    displayOverlayYears() {
        // Clear all cells first
        for (let w = 0; w < this.grid.length; w++) {
            for (let d = 0; d < 7; d++) {
                if (this.grid[w] && this.dates[w] && this.dates[w][d]) {
                    this.grid[w][d] = 0;
                }
            }
        }

        // Apply overlay data
        for (let w = 0; w < this.grid.length; w++) {
            for (let d = 0; d < 7; d++) {
                if (this.dates[w] && this.dates[w][d]) {
                    const date = this.dates[w][d];
                    const year = date.getFullYear();

                    if (selectedYears.includes(year)) {
                        const cell = document.querySelector(`[data-week="${w}"][data-day="${d}"]`);
                        if (cell) {
                            let maxLevel = 0;
                            selectedYears.forEach(y => {
                                const yearData = overlayData[y] || {};
                                const dateKey = date.toISOString().split('T')[0];
                                if (yearData[dateKey]) {
                                    maxLevel = Math.max(maxLevel, yearData[dateKey]);
                                }
                            });

                            cell.dataset.level = maxLevel;
                            cell.style.background = this.colors[maxLevel];

                            if (cell.classList.contains('today')) {
                                cell.classList.add('today');
                            }
                            if (cell.classList.contains('future')) {
                                cell.classList.add('future');
                            }
                            this.grid[w][d] = maxLevel;
                        }
                    }
                }
            }
        }
    }

    addWeekDays() {
        this.addCell("contribution-cell-weekday", "");
        for (const day of this.weekDayNames) {
            this.addCell("contribution-cell-weekday", day);
        }
    }

    addCell(className, content) {
        const cell = document.createElement("div");
        cell.classList.add("contribution-cell");
        cell.classList.add(className);
        cell.innerText = content;
        this.block.appendChild(cell);
        return cell;
    }

    getColor(count) {
        if (count == 0) return this.colors[0];
        return this.colors[Math.min(4, Math.ceil(count / 3))];
    }

    getTitle(date, count) {
        return `${date.toLocaleDateString()}: ${count} contributions`;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    isSameDay(date1, date2) {
        return date1.toDateString() === date2.toDateString();
    }

    setupCellEvents(cell, week, day, date) {
        cell.addEventListener('mousedown', (e) => {
            if (this.shouldAllowEdit(date)) {
                this.isDrawing = true;
                isDrawing = true;
                this.paintCell(week, day, cell);
                e.preventDefault();
            }
        });

        cell.addEventListener('mouseover', () => {
            if (this.isDrawing && this.shouldAllowEdit(date)) {
                this.paintCell(week, day, cell);
            }
        });

        cell.addEventListener('click', () => {
            if (this.shouldAllowEdit(date)) {
                this.paintCell(week, day, cell);
            }
        });
    }

    shouldAllowEdit(date) {
        const onlyPast = document.getElementById('only-past')?.checked;

        // Multi-year mode checks
        if (layoutMode === 'multi' && selectedYears.length > 0) {
            if (!selectedYears.includes(date.getFullYear())) {
                return false;
            }
        } else if (currentMode !== 'last') {
            // Specific year mode
            const targetYear = parseInt(currentMode);
            if (date.getFullYear() !== targetYear) {
                return false;
            }
        }

        if (!onlyPast) return true;

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return date <= today;
    }

    paintCell(week, day, cell) {
        if (cell.classList.contains('future') && document.getElementById('only-past')?.checked) {
            return;
        }

        // Handle overlay mode painting - distribute across selected years
        if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
            const date = this.dates[week][day];

            if (date && selectedYears.includes(date.getFullYear())) {
                // Random distribution across selected years for painting
                const randomYear = selectedYears[Math.floor(Math.random() * selectedYears.length)];

                if (!overlayData[randomYear]) {
                    overlayData[randomYear] = {};
                }

                const dateKey = date.toISOString().split('T')[0];
                overlayData[randomYear][dateKey] = currentBrush;

                this.displayOverlayYears();
            }
        } else if (layoutMode === 'multi' && multiMode === 'continuation') {
            // Continuation mode - direct painting but respect year boundaries
            const date = this.dates[week][day];
            if (date && selectedYears.includes(date.getFullYear())) {
                // Remove old level classes
                for (let i = 0; i <= 4; i++) {
                    cell.classList.remove(`level-${i}`);
                }

                // Set new level
                cell.dataset.level = currentBrush;
                cell.style.background = this.colors[currentBrush];

                // Preserve special classes
                if (cell.classList.contains('today')) {
                    cell.classList.add('today');
                }
                if (cell.classList.contains('future')) {
                    cell.classList.add('future');
                }

                // Update grid
                if (this.grid[week]) {
                    this.grid[week][day] = currentBrush;
                }
            }
        } else {
            // Normal single year painting
            // Remove old level classes
            for (let i = 0; i <= 4; i++) {
                cell.classList.remove(`level-${i}`);
            }

            // Set new level
            cell.dataset.level = currentBrush;
            cell.style.background = this.colors[currentBrush];

            // Preserve special classes
            if (cell.classList.contains('today')) {
                cell.classList.add('today');
            }
            if (cell.classList.contains('future')) {
                cell.classList.add('future');
            }

            // Update grid
            if (this.grid[week]) {
                this.grid[week][day] = currentBrush;
            }
        }

        updateContributions();
    }

    addYearBoundaries() {
        if (!selectedYears || selectedYears.length <= 1) return;

        // Очищаем старые границы и метки
        const scroll = document.querySelector('.contributions-scroll');
        if (scroll) {
            const oldLabels = scroll.querySelectorAll('.year-label');
            oldLabels.forEach(label => label.remove());

            const oldBoundaries = scroll.querySelectorAll('.gap-boundary-line');
            oldBoundaries.forEach(boundary => boundary.remove());
        }

        // Убираем старые границы со всех ячеек
        document.querySelectorAll('[data-week][data-day]').forEach(cell => {
            cell.style.borderTop = '';
            cell.style.borderRight = '';
            cell.style.borderBottom = '';
            cell.style.borderLeft = '';
            cell.classList.remove('year-boundary-cell');
        });

        // Применяем границы в gap'ах
        this.applyGapBoundaries();

        // Добавляем метки годов снизу
        this.addYearLabelsBottom();
    }

    // Новый метод для создания границ в gap'ах
    applyGapBoundaries() {
        if (!this.dates || !this.grid) return;

        const scroll = document.querySelector('.contributions-scroll');
        if (!scroll) return;

        const cellSize = 16;
        const gap = 3;
        const offsetX = 23; // Смещение для дней недели
        const offsetY = 36.5; // Смещение для месяцев

        // Создаем горизонтальные линии (между рядами)
        for (let week = 0; week < this.dates.length; week++) {
            for (let day = 0; day < 6; day++) { // До 6, так как проверяем day и day+1
                const currentDate = this.dates[week] && this.dates[week][day];
                const nextDate = this.dates[week] && this.dates[week][day + 1];

                if (!currentDate || !nextDate) continue;

                const currentYear = currentDate.getFullYear();
                const nextYear = nextDate.getFullYear();

                // Если годы разные и оба в выбранных
                if (currentYear !== nextYear &&
                    selectedYears.includes(currentYear) &&
                    selectedYears.includes(nextYear)) {

                    const lineX = offsetX + week * (cellSize + gap);
                    const lineY = offsetY + day * (cellSize + gap) + cellSize + gap / 2;

                    const line = document.createElement('div');
                    line.className = 'gap-boundary-line horizontal';
                    line.style.position = 'absolute';
                    line.style.left = `${lineX}px`;
                    line.style.top = `${lineY}px`;
                    line.style.width = `${cellSize}px`;
                    // Убираем фон и задаём пунктирную границу сверху
                    line.style.background = 'none';
                    line.style.height = '0'; // нулевая высота, т.к. линия — это граница
                    line.style.borderTop = '2px dashed var(--text-secondary)';
                    line.style.zIndex = '15';
                    line.style.pointerEvents = 'none';

                    scroll.appendChild(line);
                }
            }
        }

        // Создаем вертикальные линии (между колонками)
        for (let week = 0; week < this.dates.length - 1; week++) { // До length-1, так как проверяем week и week+1
            for (let day = 0; day < 7; day++) {
                const currentDate = this.dates[week] && this.dates[week][day];
                const nextDate = this.dates[week + 1] && this.dates[week + 1][day];

                if (!currentDate || !nextDate) continue;

                const currentYear = currentDate.getFullYear();
                const nextYear = nextDate.getFullYear();

                // Если годы разные и оба в выбранных
                if (currentYear !== nextYear &&
                    selectedYears.includes(currentYear) &&
                    selectedYears.includes(nextYear)) {

                    const lineX = offsetX + week * (cellSize + gap) + cellSize + gap / 2;
                    const lineY = offsetY + day * (cellSize + gap);

                    const line = document.createElement('div');
                    line.className = 'gap-boundary-line vertical';
                    line.style.position = 'absolute';
                    line.style.left = `${lineX}px`;
                    line.style.top = `${lineY}px`;
                    line.style.height = `${cellSize}px`;

                    // Убираем фон и превращаем элемент в пунктирную границу слева
                    line.style.background = 'none';
                    line.style.width = '0'; // нулевая ширина, сама линия — это граница
                    line.style.borderLeft = '2px dashed var(--text-secondary)';

                    line.style.zIndex = '15';
                    line.style.pointerEvents = 'none';

                    scroll.appendChild(line);
                }
            }
        }


    }

    // Метод для создания угловых соединений
    createCornerConnections() {
        const scroll = document.querySelector('.contributions-scroll');
        if (!scroll || !this.dates) return;

        const cellSize = 16;
        const gap = 3;
        const offsetX = 23;
        const offsetY = 36.5;

        // Проходим по всем возможным углам (пересечения 2x2 ячеек)
        for (let week = 0; week < this.dates.length - 1; week++) {
            for (let day = 0; day < 6; day++) {
                // Получаем 4 ячейки вокруг угла
                const topLeft = this.dates[week] && this.dates[week][day];
                const topRight = this.dates[week + 1] && this.dates[week + 1][day];
                const bottomLeft = this.dates[week] && this.dates[week][day + 1];
                const bottomRight = this.dates[week + 1] && this.dates[week + 1][day + 1];

                if (!topLeft || !topRight || !bottomLeft || !bottomRight) continue;

                const years = [
                    topLeft.getFullYear(),
                    topRight.getFullYear(),
                    bottomLeft.getFullYear(),
                    bottomRight.getFullYear()
                ];

                // Если есть разные годы в углу, создаем угловое соединение
                const uniqueYears = [...new Set(years)].filter(year => selectedYears.includes(year));

                if (uniqueYears.length > 1) {
                    const cornerX = offsetX + week * (cellSize + gap) + cellSize + gap / 2 - 1;
                    const cornerY = offsetY + day * (cellSize + gap) + cellSize + gap / 2 - 1;

                    const corner = document.createElement('div');
                    corner.className = 'gap-boundary-line corner';
                    corner.style.position = 'absolute';
                    corner.style.left = `${cornerX}px`;
                    corner.style.top = `${cornerY}px`;
                    corner.style.width = '4px';
                    corner.style.height = '4px';
                    corner.style.background = 'var(--text-secondary)';
                    corner.style.borderRadius = '1px';
                    corner.style.zIndex = '16';
                    corner.style.pointerEvents = 'none';

                    scroll.appendChild(corner);
                }
            }
        }
    }

    // Метод для добавления меток годов снизу
    addYearLabelsBottom() {
        const scroll = document.querySelector('.contributions-scroll');
        if (!scroll || !this.dates) return;

        const sortedYears = [...selectedYears].sort((a, b) => a - b);
        const addedLabels = new Set();

        // Ищем первое появление каждого года
        for (let week = 0; week < this.dates.length; week++) {
            for (let day = 0; day < 7; day++) {
                const date = this.dates[week] && this.dates[week][day];
                if (!date) continue;

                const year = date.getFullYear();

                // Если это первое появление года в сетке и это не первый год
                if (selectedYears.includes(year) && !addedLabels.has(year) && year !== sortedYears[0]) {
                    addedLabels.add(year);

                    // Создаем метку снизу
                    const cellSize = 16;
                    const gap = 3;
                    const offsetX = 14 + week * (cellSize + gap) + cellSize / 2;
                    const offsetY = 26.5 + 7 * cellSize + 6 * gap + 10; // Позиция снизу сетки

                    const label = document.createElement('div');
                    label.className = 'year-label';
                    label.textContent = year;
                    label.style.left = `${offsetX}px`;
                    label.style.top = `${offsetY}px`;
                    label.style.position = 'absolute';
                    label.style.transform = 'translateX(-50%)';
                    label.style.background = 'var(--bg-primary)';
                    label.style.padding = '0px 4px';
                    label.style.fontSize = '11px';
                    label.style.color = 'var(--text-secondary)';
                    label.style.fontWeight = '600';
                    label.style.pointerEvents = 'none';
                    label.style.whiteSpace = 'nowrap';
                    label.style.zIndex = '10';
                    label.style.border = '1px solid var(--border-primary)';
                    label.style.borderRadius = '3px';

                    scroll.appendChild(label);
                    break;
                }
            }
        }
    }

    removeYearBoundaries() {
        const boundaries = document.querySelectorAll('.gap-boundary-line, .year-label');
        boundaries.forEach(boundary => boundary.remove());
    }

}

// Theme and Language functions
function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.dataset.theme = currentTheme;
    document.querySelector('.theme-icon').textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('github-art-theme', currentTheme);
}

function toggleLanguage() {
    currentLanguage = currentLanguage === 'en' ? 'ru' : 'en';
    updateLanguage();
    localStorage.setItem('github-art-language', currentLanguage);
}

function updateLanguage() {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.dataset.i18n;
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.textContent = translations[currentLanguage][key];
        }
    });

    // Update placeholders
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
    placeholderElements.forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        if (translations[currentLanguage] && translations[currentLanguage][key]) {
            element.placeholder = translations[currentLanguage][key];
        }
    });
}

// Panel functions
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    panel.classList.toggle('open');

    // Close export panel if open
    document.getElementById('export-panel').classList.remove('open');
}

function toggleExport() {
    const panel = document.getElementById('export-panel');
    panel.classList.toggle('open');

    // Close settings panel if open
    document.getElementById('settings-panel').classList.remove('open');
}

// Dropdown functions
function toggleLayoutDropdown() {
    const options = document.getElementById('layout-options');
    options.classList.toggle('show');

    // Close other dropdowns
    document.getElementById('single-year-options').classList.remove('show');
    document.getElementById('multi-mode-options').classList.remove('show');
}

function toggleYearDropdown() {
    if (layoutMode === 'single') {
        const options = document.getElementById('single-year-options');
        options.classList.toggle('show');

        // Close other dropdowns
        document.getElementById('layout-options').classList.remove('show');
        document.getElementById('multi-mode-options').classList.remove('show');
    }
}

function toggleMultiModeDropdown() {
    if (layoutMode === 'multi') {
        const options = document.getElementById('multi-mode-options');
        options.classList.toggle('show');

        // Close other dropdowns
        document.getElementById('layout-options').classList.remove('show');
        document.getElementById('single-year-options').classList.remove('show');
    }
}

// Initialize grid
function initGrid() {
    const chartContainer = document.getElementById('contributions-chart');

    contributionsChart = new ContributionsChart({
        block: chartContainer,
        mode: layoutMode === 'multi' ? 'multi' : currentMode,
        startYear: currentMode !== 'last' ? parseInt(currentMode) : new Date().getFullYear()
    });

    contributionsChart.plot();
    updateContributions();
    initPatternPreviews();
    updateUIForMode();

    // Оборачиваем основной grid в layer-подобный контейнер
    wrapMainGridInLayer();
}

// Новая функция для обертывания основного грида в layer-подобный контейнер
function wrapMainGridInLayer() {
    const container = document.getElementById('layers-container');
    const originalScroll = container.querySelector('.contributions-scroll');

    if (!originalScroll || originalScroll.parentElement.classList.contains('main-layer')) {
        return; // Уже обернут или не найден
    }

    // Создаем обертку как у слоев
    const mainLayer = document.createElement('div');
    mainLayer.className = 'layer main-layer';
    mainLayer.style.position = 'relative'; // Относительное позиционирование для основного слоя
    mainLayer.style.width = '100%';
    mainLayer.style.background = 'transparent';
    mainLayer.style.border = 'none';
    mainLayer.style.padding = '20px';

    // Перемещаем оригинальный scroll внутрь обертки
    originalScroll.parentNode.insertBefore(mainLayer, originalScroll);
    mainLayer.appendChild(originalScroll);
}

// Pattern functions
function selectPattern(patternName) {
    document.querySelectorAll('.pattern-card').forEach(card => {
        card.classList.remove('active');
        card.querySelector('.pattern-settings').classList.remove('show');
    });

    const card = document.querySelector(`[onclick="selectPattern('${patternName}')"]`);
    if (card) {
        card.classList.add('active');
        const settings = card.querySelector('.pattern-settings');
        if (settings) {
            settings.classList.add('show');
        }
    }

    selectedPattern = patternName;
}

function applyPattern(patternName) {
    if (!contributionsChart || !contributionsChart.grid) return;

    clearGrid();

    switch (patternName) {
        case 'heart':
            applyHeartPattern();
            break;
        case 'wave':
            applyWavePattern();
            break;
        case 'stripes':
            applyStripesPattern();
            break;
        case 'text':
            applyTextPattern();
            break;
        case 'custom':
            applyCustomPattern();
            break;
    }

    updateContributions();

    // Сохраняем состояние после применения паттерна
    StateManager.saveState();
}

function applyHeartPattern() {
    const size = parseInt(document.getElementById('heart-size').value);
    const intensity = parseInt(document.getElementById('heart-intensity').value);
    const position = document.getElementById('heart-position').value;

    const heartBase = [
        [0, 1, 1, 0, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0]
    ];

    applyObjectPattern(heartBase, size, intensity, position);
}

function applyWavePattern() {
    const frequency = parseInt(document.getElementById('wave-frequency').value);
    const intensity = parseInt(document.getElementById('wave-intensity').value);
    const repeat = parseInt(document.getElementById('wave-repeat').value);

    applyRepeatingPattern('wave', {
        frequency,
        intensity,
        repeat
    });
}

function applyStripesPattern() {
    const frequency = parseInt(document.getElementById('stripes-frequency').value);
    const intensity = parseInt(document.getElementById('stripes-intensity').value);
    const repeat = parseInt(document.getElementById('stripes-repeat').value);

    applyRepeatingPattern('stripes', {
        frequency,
        intensity,
        repeat
    });
}

function applyTextPattern() {
    const text = document.getElementById('text-size').value.toUpperCase();
    const intensity = parseInt(document.getElementById('text-intensity').value);
    const position = document.getElementById('text-position').value;

    if (!text) return;

    const textMatrix = createTextMatrix(text);
    applyObjectPattern(textMatrix, 1, intensity, position);
}

function applyCustomPattern() {
    const intensity = parseInt(document.getElementById('custom-intensity').value);
    const position = document.getElementById('custom-position').value;

    const customMatrix = getCustomPatternMatrix();
    applyObjectPattern(customMatrix, 1, intensity, position);
}

// Применение паттерна с наложением (распределение по слоям)
function applyOverlayPattern(patternPoints, intensity) {
    // Очищаем данные для выбранных годов
    selectedYears.forEach(year => {
        overlayData[year] = {};
    });

    // Распределяем точки паттерна по выбранным годам
    // Для более равномерного распределения используем циклический подход
    patternPoints.forEach((point, index) => {
        const yearIndex = index % selectedYears.length;
        const targetYear = selectedYears[yearIndex];
        const dateKey = point.date.toISOString().split('T')[0];

        if (!overlayData[targetYear]) {
            overlayData[targetYear] = {};
        }

        overlayData[targetYear][dateKey] = intensity;
    });

    if (contributionsChart) {
        contributionsChart.displayOverlayYears();
    }
}

// Unified pattern application functions
function applyObjectPattern(matrix, size, intensity, position) {
    if (!contributionsChart || !contributionsChart.grid) return;

    const gridWeeks = contributionsChart.grid.length;
    const patternHeight = matrix.length;
    const patternWidth = matrix[0] ? matrix[0].length : 0;

    const scaledWidth = patternWidth * size;
    const scaledHeight = patternHeight * size;

    let startWeek;
    switch (position) {
        case 'left':
            startWeek = 5;
            break;
        case 'right':
            startWeek = gridWeeks - scaledWidth - 5;
            break;
        default: // center
            startWeek = Math.floor((gridWeeks - scaledWidth) / 2);
    }

    const startDay = Math.floor((7 - scaledHeight) / 2);

    // Collect all pattern points for overlay distribution
    const patternPoints = [];

    for (let day = 0; day < patternHeight; day++) {
        for (let week = 0; week < patternWidth; week++) {
            if (matrix[day][week] > 0) {
                for (let sy = 0; sy < size; sy++) {
                    for (let sx = 0; sx < size; sx++) {
                        const gridWeek = startWeek + week * size + sx;
                        const gridDay = startDay + day * size + sy;

                        if (gridWeek >= 0 && gridWeek < gridWeeks && gridDay >= 0 && gridDay < 7) {
                            const date = contributionsChart.dates[gridWeek] && contributionsChart.dates[gridWeek][gridDay];
                            if (date && contributionsChart.shouldAllowEdit(date)) {
                                patternPoints.push({
                                    week: gridWeek,
                                    day: gridDay,
                                    date: date
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    // Apply pattern based on mode
    if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
        applyOverlayPattern(patternPoints, intensity);
    } else {
        // Apply directly to grid
        patternPoints.forEach(point => {
            const cell = document.querySelector(`[data-week="${point.week}"][data-day="${point.day}"]`);
            if (cell) {
                const oldBrush = currentBrush;
                currentBrush = intensity;
                contributionsChart.paintCell(point.week, point.day, cell);
                currentBrush = oldBrush;
            }
        });
    }
}

function applyRepeatingPattern(type, params) {
    if (!contributionsChart || !contributionsChart.grid) return;

    const gridWeeks = contributionsChart.grid.length;
    const patternPoints = [];

    for (let r = 0; r < params.repeat; r++) {
        const verticalOffset = r * Math.floor(7 / params.repeat);

        for (let week = 0; week < gridWeeks; week++) {
            let targetDays = [];

            if (type === 'wave') {
                const wave = Math.sin(week * params.frequency * 0.1) * 2 + 3;
                const centerDay = Math.floor(wave) + verticalOffset;
                targetDays = [centerDay];
            } else if (type === 'stripes') {
                switch (params.repeat) {
                    case 1: // horizontal
                        for (let day = 0; day < 7; day++) {
                            if (Math.floor(day / params.frequency) % 2 === 0) {
                                targetDays.push(day);
                            }
                        }
                        break;
                    case 2: // vertical
                        if (Math.floor(week / params.frequency) % 2 === 0) {
                            targetDays = [0, 1, 2, 3, 4, 5, 6];
                        }
                        break;
                    case 3: // diagonal
                        for (let day = 0; day < 7; day++) {
                            if (Math.floor((week + day) / params.frequency) % 2 === 0) {
                                targetDays.push(day);
                            }
                        }
                        break;
                }
            }

            targetDays.forEach(day => {
                if (day >= 0 && day < 7) {
                    const date = contributionsChart.dates[week] && contributionsChart.dates[week][day];
                    if (date && contributionsChart.shouldAllowEdit(date)) {
                        patternPoints.push({
                            week: week,
                            day: day,
                            date: date
                        });
                    }
                }
            });
        }
    }

    // Apply pattern based on mode
    if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
        applyOverlayPattern(patternPoints, params.intensity);
    } else {
        // Apply directly to grid
        patternPoints.forEach(point => {
            const cell = document.querySelector(`[data-week="${point.week}"][data-day="${point.day}"]`);
            if (cell) {
                const oldBrush = currentBrush;
                currentBrush = params.intensity;
                contributionsChart.paintCell(point.week, point.day, cell);
                currentBrush = oldBrush;
            }
        });
    }
}

function createTextMatrix(text) {
    const font = {
        'A': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1]
        ],
        'B': [
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 0]
        ],
        'C': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        'D': [
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 0]
        ],
        'E': [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 1]
        ],
        'F': [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0]
        ],
        'G': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0],
            [1, 0, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        'H': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1]
        ],
        'I': [
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [1, 1, 1, 1, 1]
        ],
        'J': [
            [1, 1, 1, 1, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0],
            [1, 0, 0, 1, 0],
            [0, 1, 1, 0, 0]
        ],
        'K': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 1, 0],
            [1, 0, 1, 0, 0],
            [1, 1, 0, 0, 0],
            [1, 0, 1, 0, 0],
            [1, 0, 0, 1, 0],
            [1, 0, 0, 0, 1]
        ],
        'L': [
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 1]
        ],
        'M': [
            [1, 0, 0, 0, 1],
            [1, 1, 0, 1, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1]
        ],
        'N': [
            [1, 0, 0, 0, 1],
            [1, 1, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 1, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1]
        ],
        'O': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        'P': [
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 0, 0, 0, 0]
        ],
        'Q': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 0, 1, 0],
            [0, 1, 1, 0, 1]
        ],
        'R': [
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 1, 1, 1, 0],
            [1, 0, 1, 0, 0],
            [1, 0, 0, 1, 0],
            [1, 0, 0, 0, 1]
        ],
        'S': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0],
            [0, 1, 1, 1, 0],
            [0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        'T': [
            [1, 1, 1, 1, 1],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0]
        ],
        'U': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        'V': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0]
        ],
        'W': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 0, 1, 0, 1],
            [1, 1, 0, 1, 1],
            [1, 0, 0, 0, 1]
        ],
        'X': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1]
        ],
        'Y': [
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0]
        ],
        'Z': [
            [1, 1, 1, 1, 1],
            [0, 0, 0, 0, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 1]
        ],
        '0': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 1, 1],
            [1, 0, 1, 0, 1],
            [1, 1, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        '1': [
            [0, 0, 1, 0, 0],
            [0, 1, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 1, 1, 0]
        ],
        '2': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [0, 0, 0, 0, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0],
            [1, 1, 1, 1, 1]
        ],
        '3': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [0, 0, 0, 0, 1],
            [0, 0, 1, 1, 0],
            [0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        '4': [
            [0, 0, 0, 1, 0],
            [0, 0, 1, 1, 0],
            [0, 1, 0, 1, 0],
            [1, 0, 0, 1, 0],
            [1, 1, 1, 1, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 0, 1, 0]
        ],
        '5': [
            [1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
            [0, 0, 0, 0, 1],
            [0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        '6': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 0],
            [1, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        '7': [
            [1, 1, 1, 1, 1],
            [0, 0, 0, 0, 1],
            [0, 0, 0, 1, 0],
            [0, 0, 1, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 1, 0, 0, 0],
            [0, 1, 0, 0, 0]
        ],
        '8': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        '9': [
            [0, 1, 1, 1, 0],
            [1, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 1],
            [0, 0, 0, 0, 1],
            [1, 0, 0, 0, 1],
            [0, 1, 1, 1, 0]
        ],
        ' ': [
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0]
        ]
    };

    const charWidth = 5;
    const charHeight = 7;
    const spacing = 1;

    const totalWidth = (charWidth + spacing) * text.length - spacing;
    const matrix = [];

    // Initialize matrix
    for (let row = 0; row < charHeight; row++) {
        matrix[row] = [];
        for (let col = 0; col < totalWidth; col++) {
            matrix[row][col] = 0;
        }
    }

    // Fill matrix with text
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const charData = font[char] || font[' '];

        for (let y = 0; y < charHeight; y++) {
            for (let x = 0; x < charWidth; x++) {
                const matrixCol = i * (charWidth + spacing) + x;
                if (matrixCol < totalWidth && charData[y][x]) {
                    matrix[y][matrixCol] = 1;
                }
            }
        }
    }

    return matrix;
}

function getCustomPatternMatrix() {
    const cells = document.querySelectorAll('#custom-pattern-grid .pattern-grid-cell');
    const matrix = [];
    const rows = 7;
    const cols = 14;

    for (let row = 0; row < rows; row++) {
        matrix[row] = [];
        for (let col = 0; col < cols; col++) {
            const cellIndex = row * cols + col;
            const cell = cells[cellIndex];
            matrix[row][col] = cell ? parseInt(cell.dataset.level) || 0 : 0;
        }
    }

    return matrix;
}

// Initialize pattern previews
function initPatternPreviews() {
    initHeartPreview();
    initWavePreview();
    initStripesPreview();
    initTextPreview();
    initCustomPatternGrid();
}

function initHeartPreview() {
    const preview = document.getElementById('heart-preview');
    const heartPattern = [
        [0, 1, 1, 0, 0, 0, 1, 1, 0],
        [1, 1, 1, 1, 0, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1],
        [0, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 0, 1, 1, 1, 1, 1, 0, 0],
        [0, 0, 0, 1, 1, 1, 0, 0, 0],
        [0, 0, 0, 0, 1, 0, 0, 0, 0]
    ];

    preview.innerHTML = createPatternPreview(heartPattern, 9);
}

function initWavePreview() {
    const preview = document.getElementById('wave-preview');
    const wavePattern = [];
    for (let day = 0; day < 7; day++) {
        wavePattern[day] = [];
        for (let week = 0; week < 30; week++) {
            const wave = Math.sin(week * 0.3) * 2 + 3;
            wavePattern[day][week] = Math.abs(day - wave) < 1.5 ? 3 : 0;
        }
    }
    preview.innerHTML = createPatternPreview(wavePattern, 30);
}

function initStripesPreview() {
    const preview = document.getElementById('stripes-preview');
    const stripesPattern = [];
    for (let day = 0; day < 7; day++) {
        stripesPattern[day] = [];
        for (let week = 0; week < 30; week++) {
            stripesPattern[day][week] = Math.floor(week / 3) % 2 === 0 ? 2 : 0;
        }
    }
    preview.innerHTML = createPatternPreview(stripesPattern, 30);
}

function initTextPreview() {
    const preview = document.getElementById('text-preview');
    const textMatrix = createTextMatrix('HI');
    preview.innerHTML = createPatternPreview(textMatrix, textMatrix[0].length);
}

function createPatternPreview(pattern, cols) {
    const rows = pattern.length;
    const matrix = document.createElement('div');
    matrix.className = 'pattern-matrix';
    matrix.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    const colors = ['var(--contribution-0)', 'var(--contribution-1)', 'var(--contribution-2)', 'var(--contribution-3)', 'var(--contribution-4)'];

    for (let day = 0; day < rows; day++) {
        for (let week = 0; week < cols; week++) {
            const cell = document.createElement('div');
            cell.className = 'pattern-cell';
            const level = pattern[day] && pattern[day][week] ? pattern[day][week] : 0;
            cell.style.backgroundColor = colors[level];
            matrix.appendChild(cell);
        }
    }

    return matrix.outerHTML;
}

function initCustomPatternGrid() {
    const grid = document.getElementById('custom-pattern-grid');
    grid.innerHTML = '';

    const colors = ['var(--contribution-0)', 'var(--contribution-1)', 'var(--contribution-2)', 'var(--contribution-3)', 'var(--contribution-4)'];
    let customGridDrawing = false;
    let customCurrentLevel = 0;

    for (let i = 0; i < 98; i++) { // 7 rows × 14 columns
        const cell = document.createElement('div');
        cell.className = 'pattern-grid-cell';
        cell.dataset.level = '0';
        cell.style.backgroundColor = colors[0];

        // Add drawing functionality like main grid
        cell.addEventListener('mousedown', (e) => {
            customGridDrawing = true;
            customCurrentLevel = (parseInt(cell.dataset.level) + 1) % 5;
            cell.dataset.level = customCurrentLevel;
            cell.style.backgroundColor = colors[customCurrentLevel];
            updateCustomPreview();
            e.preventDefault();
        });

        cell.addEventListener('mouseover', () => {
            if (customGridDrawing) {
                cell.dataset.level = customCurrentLevel;
                cell.style.backgroundColor = colors[customCurrentLevel];
                updateCustomPreview();
            }
        });

        cell.addEventListener('click', () => {
            const newLevel = (parseInt(cell.dataset.level) + 1) % 5;
            cell.dataset.level = newLevel;
            cell.style.backgroundColor = colors[newLevel];
            updateCustomPreview();
        });

        grid.appendChild(cell);
    }

    // Global mouse up for drawing
    document.addEventListener('mouseup', () => {
        customGridDrawing = false;
    });
}

function updateCustomPreview() {
    const preview = document.getElementById('custom-preview');
    const matrix = getCustomPatternMatrix();
    preview.innerHTML = createPatternPreview(matrix, 14);
}

function saveCustomPattern() {
    const name = document.getElementById('custom-size').value || 'Custom Pattern';
    const matrix = getCustomPatternMatrix();

    const pattern = {
        name: name,
        matrix: matrix,
        created: new Date().toISOString()
    };

    customPatterns.push(pattern);
    localStorage.setItem('github-art-custom-patterns', JSON.stringify(customPatterns));

    showNotification(`Pattern "${name}" saved!`, 'success');
}

// Drag and Drop functionality - Fixed for positioning
function dragStart(event, patternType) {
    event.dataTransfer.setData('text/plain', patternType);
    event.target.classList.add('dragging');
}

function setupDragAndDrop() {
    const grid = document.getElementById('contributions-chart');

    grid.addEventListener('dragover', (e) => {
        e.preventDefault();
        grid.classList.add('drag-over');
    });

    grid.addEventListener('dragleave', (e) => {
        if (!grid.contains(e.relatedTarget)) {
            grid.classList.remove('drag-over');
        }
    });

    grid.addEventListener('drop', (e) => {
        e.preventDefault();
        grid.classList.remove('drag-over');

        const patternType = e.dataTransfer.getData('text/plain');
        if (patternType && contributionsChart) {
            // Calculate drop position
            const rect = grid.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Convert pixel coordinates to grid coordinates
            const cellSize = 16;
            const gap = 3;
            const weekIndex = Math.floor((x - 17) / (cellSize + gap)); // 17 is offset for days labels
            const dayIndex = Math.floor((y - 35) / (cellSize + gap)); // 35 is offset for month labels

            if (weekIndex >= 0 && weekIndex < contributionsChart.grid.length && dayIndex >= 0 && dayIndex < 7) {
                applyPatternAtPosition(patternType, weekIndex, dayIndex);
            }
        }
    });

    // Remove dragging class when drag ends
    document.querySelectorAll('.pattern-preview[draggable="true"]').forEach(preview => {
        preview.addEventListener('dragend', () => {
            preview.classList.remove('dragging');
        });
    });
}

function applyPatternAtPosition(patternType, startWeek, startDay) {
    let matrix, intensity;

    switch (patternType) {
        case 'heart':
            matrix = [
                [0, 1, 1, 0, 0, 0, 1, 1, 0],
                [1, 1, 1, 1, 0, 1, 1, 1, 1],
                [1, 1, 1, 1, 1, 1, 1, 1, 1],
                [0, 1, 1, 1, 1, 1, 1, 1, 0],
                [0, 0, 1, 1, 1, 1, 1, 0, 0],
                [0, 0, 0, 1, 1, 1, 0, 0, 0],
                [0, 0, 0, 0, 1, 0, 0, 0, 0]
            ];
            intensity = parseInt(document.getElementById('heart-intensity').value);
            break;
        case 'text':
            const text = document.getElementById('text-size').value.toUpperCase();
            matrix = createTextMatrix(text);
            intensity = parseInt(document.getElementById('text-intensity').value);
            break;
        case 'custom':
            matrix = getCustomPatternMatrix();
            intensity = parseInt(document.getElementById('custom-intensity').value);
            break;
        default:
            return;
    }

    // Apply pattern at specific position
    for (let day = 0; day < matrix.length; day++) {
        for (let week = 0; week < matrix[0].length; week++) {
            if (matrix[day][week] > 0) {
                const gridWeek = startWeek + week;
                const gridDay = startDay + day;

                if (gridWeek >= 0 && gridWeek < contributionsChart.grid.length && gridDay >= 0 && gridDay < 7) {
                    const date = contributionsChart.dates[gridWeek] && contributionsChart.dates[gridWeek][gridDay];
                    if (date && contributionsChart.shouldAllowEdit(date)) {
                        const cell = document.querySelector(`[data-week="${gridWeek}"][data-day="${gridDay}"]`);
                        if (cell) {
                            const oldBrush = currentBrush;
                            currentBrush = intensity;
                            contributionsChart.paintCell(gridWeek, gridDay, cell);
                            currentBrush = oldBrush;
                        }
                    }
                }
            }
        }
    }

    updateContributions();
}

// Layers functionality - Fixed to work like cards_test2.html
function toggleLayers() {
    if (layoutMode !== 'multi' || multiMode !== 'overlay' || selectedYears.length === 0) {
        return;
    }

    const container = document.getElementById('layers-container');
    const toggleBtn = document.querySelector('.layers-toggle');
    const toggleText = document.getElementById('layers-toggle-text');
    const mainLayer = container.querySelector('.main-layer');

    layersExpanded = !layersExpanded;

    if (layersExpanded) {
        // Сначала создаем слои
        createLayers();

        // Затем добавляем класс для анимации
        requestAnimationFrame(() => {
            container.classList.add('layers-expanded');
            toggleBtn.classList.add('active');
            toggleText.textContent = translations[currentLanguage].collapse || 'Collapse';

            // Плавно скрываем основной слой через CSS
            if (mainLayer) {
                mainLayer.style.pointerEvents = 'none';
            }
        });
    } else {
        // Сначала запускаем анимацию сворачивания
        container.classList.remove('layers-expanded');
        toggleBtn.classList.remove('active');
        toggleText.textContent = translations[currentLanguage].layers || 'Layers';

        // Плавно показываем основной слой через CSS
        if (mainLayer) {
            mainLayer.style.opacity = '1';
            mainLayer.style.pointerEvents = 'all';
        }

        // Удаляем слои после завершения анимации
        setTimeout(() => {
            removeLayers();
        }, 500); // Время должно совпадать с длительностью transition в CSS
    }
}

function createLayers() {
    const container = document.getElementById('layers-container');
    const mainLayer = container.querySelector('.main-layer');

    // Проверяем, существуют ли уже слои
    const existingLayers = container.querySelector('.layers-wrapper');
    if (existingLayers) {
        return; // Слои уже созданы
    }

    // Устанавливаем переменную для расчета высоты
    container.style.setProperty('--layer-count', selectedYears.length);
    // Добавляем класс для установки высоты
    container.classList.add('with-layers');

    // Скрываем основной слой
    if (mainLayer) {
        mainLayer.style.opacity = '0';
        mainLayer.style.pointerEvents = 'none';
        mainLayer.style.zIndex = '0';
    }

    // Сортируем годы по возрастанию
    const sortedYears = [...selectedYears].sort((a, b) => a - b);

    // Создаем контейнер для слоев
    const layersWrapper = document.createElement('div');
    layersWrapper.className = 'layers-wrapper';

    const fragment = document.createDocumentFragment();

    sortedYears.forEach((year, index) => {
        const layerDiv = document.createElement('div');
        layerDiv.className = 'layer';
        layerDiv.dataset.year = year;

        // Позиционируем первый слой в том же месте, что и основной грид
        if (index === 0) {
            layerDiv.style.position = 'absolute';
            layerDiv.style.top = '40px';
            layerDiv.style.left = '0';
        }

        // Calculate stats for this layer
        const yearData = overlayData[year] || {};
        const activeDays = Object.keys(yearData).filter(dateKey => yearData[dateKey] > 0).length;
        const totalCommits = Object.values(yearData).reduce((sum, level) => {
            return sum + (level > 0 ? [1, 3, 5, 7, 9][level] : 0);
        }, 0);

        layerDiv.innerHTML = `
            <div class="layer-header">${year}</div>
            <div class="layer-info">
                ${activeDays} days | ${totalCommits} commits
            </div>
            <div class="contributions-scroll">
                <div class="contributions-grid" id="layer-chart-${year}">
                </div>
            </div>
        `;

        fragment.appendChild(layerDiv);

        // Добавляем обработчик клика только на область вне грида
        layerDiv.addEventListener('click', (e) => {
            // Проверяем, что клик не был на гриде или его потомках
            if (!e.target.closest('.contributions-grid')) {
                layersWrapper.appendChild(layerDiv);
            }
        });
    });

    layersWrapper.appendChild(fragment);
    container.appendChild(layersWrapper);

    // Заполняем слои данными
    sortedYears.forEach(year => {
        const layerDiv = container.querySelector(`.layer[data-year="${year}"]`);
        if (layerDiv) {
            const yearData = overlayData[year] || {};
            fillLayerWithYearData(layerDiv, year, yearData);
        }
    });
}

function removeLayers() {
    const container = document.getElementById('layers-container');
    const mainLayer = container.querySelector('.main-layer');
    const layersWrapper = container.querySelector('.layers-wrapper');

    // Remove layers wrapper
    if (layersWrapper) {
        layersWrapper.remove();
    }

    // Remove height class
    container.classList.remove('with-layers');

    // Show main layer with animation
    if (mainLayer) {
        mainLayer.style.transition = 'opacity 0.3s ease';
        mainLayer.style.opacity = '1';
        mainLayer.style.pointerEvents = 'all';
    }
}

function fillLayerWithYearData(layerElement, year, yearData) {
    const chartContainer = layerElement.querySelector('.contributions-grid');

    const layerChart = new ContributionsChart({
        block: chartContainer,
        mode: 'multi', // Указываем режим 'multi' для правильной обработки
        startYear: year
    });

    // Convert yearData to contributions format
    const contributions = Object.keys(yearData).map(dateKey => ({
        date: dateKey,
        count: yearData[dateKey] * 3 // Convert level to count
    }));

    // Переопределяем setupMultiYear для этого конкретного слоя
    layerChart.setupMultiYear = function(config) {
        this.startDate = new Date(year, 0, 1);
        this.endDate = new Date(year + 1, 0, 1);

        const dayOfWeek = this.startDate.getDay();
        this.startDate.setDate(this.startDate.getDate() - dayOfWeek);
    };

    layerChart.plot(contributions);
}

// GitHub import with real API
function importFromGitHub() {
    const username = document.getElementById('github-username').value;
    const token = document.getElementById('github-token').value;

    if (!username) {
        showNotification('Please enter a GitHub username', 'error');
        return;
    }

    showNotification('Importing GitHub data...', 'info');

    fetchGitHubContributions(username, token)
        .then(contributions => {
            // Convert GitHub data to our format
            if (contributionsChart) {
                contributionsChart.plot(contributions);
                updateContributions();
            }

            showNotification('GitHub data imported successfully!', 'success');
        })
        .catch(error => {
            console.error('GitHub import failed:', error);
            showNotification('Failed to import GitHub data. Check username and token.', 'error');
        });
}

function fetchGitHubContributions(username, token) {
    const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-Art-Tool'
    };

    if (token) {
        headers['Authorization'] = `token ${token}`;
    }

    // For now, we'll use a simplified approach
    // In a real implementation, you'd use GitHub's GraphQL API
    return fetch(`https://api.github.com/users/${username}/events`, {
            headers: headers
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            return response.json();
        })
        .then(events => {
            // Process events into contributions
            const contributions = {};
            events.forEach(event => {
                if (event.type === 'PushEvent') {
                    const date = event.created_at.split('T')[0];
                    contributions[date] = (contributions[date] || 0) + event.payload.commits.length;
                }
            });

            return Object.keys(contributions).map(date => ({
                date: date,
                count: contributions[date]
            }));
        });
}

// Utility functions
function updateRangeValue(inputId, valueId) {
    const input = document.getElementById(inputId);
    const valueSpan = document.getElementById(valueId);
    if (valueSpan) {
        valueSpan.textContent = input.value;

        // Add color indicator for intensity sliders
        if (inputId.includes('intensity')) {
            updateIntensityColorIndicator(valueId, parseInt(input.value));
        }
    }
}

function updateIntensityColorIndicator(valueId, level) {
    const valueSpan = document.getElementById(valueId);
    if (!valueSpan) return;

    // Remove existing indicator
    const existingIndicator = valueSpan.querySelector('.range-color-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Add color indicator
    const indicator = document.createElement('div');
    indicator.className = 'range-color-indicator';
    const colors = ['var(--contribution-0)', 'var(--contribution-1)', 'var(--contribution-2)', 'var(--contribution-3)', 'var(--contribution-4)'];
    indicator.style.backgroundColor = colors[level];
    valueSpan.appendChild(indicator);
}

function clearGrid() {
    if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
        // Clear overlay data
        selectedYears.forEach(year => {
            overlayData[year] = {};
        });
        if (contributionsChart) {
            contributionsChart.displayOverlayYears();
        }
    } else {
        // Clear regular grid
        if (contributionsChart && contributionsChart.grid) {
            for (let week = 0; week < contributionsChart.grid.length; week++) {
                for (let day = 0; day < 7; day++) {
                    const cell = document.querySelector(`[data-week="${week}"][data-day="${day}"]`);
                    if (cell) {
                        cell.dataset.level = 0;
                        cell.style.background = 'var(--contribution-0)';
                        if (contributionsChart.grid[week]) {
                            contributionsChart.grid[week][day] = 0;
                        }
                    }
                }
            }
        }
    }
    updateContributions();

    // Сохраняем состояние после очистки
    StateManager.saveState();
}

function fillRandom() {
    const onlyPast = document.getElementById('only-past').checked;
    const today = new Date();

    if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
        // Random fill for overlay mode - distribute across years
        selectedYears.forEach(year => {
            overlayData[year] = {};
        });

        if (contributionsChart && contributionsChart.dates) {
            for (let week = 0; week < contributionsChart.dates.length; week++) {
                for (let day = 0; day < 7; day++) {
                    const date = contributionsChart.dates[week] && contributionsChart.dates[week][day];
                    if (date && (!onlyPast || date <= today) && selectedYears.includes(date.getFullYear())) {
                        if (Math.random() > 0.8) {
                            const level = Math.floor(Math.random() * 5);
                            if (level > 0) {
                                // Циклически распределяем по годам для более равномерного заполнения
                                const yearIndex = (week * 7 + day) % selectedYears.length;
                                const targetYear = selectedYears[yearIndex];
                                const dateKey = date.toISOString().split('T')[0];
                                if (!overlayData[targetYear]) {
                                    overlayData[targetYear] = {};
                                }
                                overlayData[targetYear][dateKey] = level;
                            }
                        }
                    }
                }
            }
        }

        if (contributionsChart) {
            contributionsChart.displayOverlayYears();
        }
    } else {
        // Regular random fill
        if (contributionsChart && contributionsChart.dates) {
            for (let week = 0; week < contributionsChart.dates.length; week++) {
                for (let day = 0; day < 7; day++) {
                    const date = contributionsChart.dates[week] && contributionsChart.dates[week][day];
                    if (date && (!onlyPast || date <= today)) {
                        if (Math.random() > 0.8) {
                            const level = Math.floor(Math.random() * 5);
                            const cell = document.querySelector(`[data-week="${week}"][data-day="${day}"]`);
                            if (cell) {
                                const oldBrush = currentBrush;
                                currentBrush = level;
                                contributionsChart.paintCell(week, day, cell);
                                currentBrush = oldBrush;
                            }
                        }
                    }
                }
            }
        }
    }
    updateContributions();

    // Сохраняем состояние после заполнения
    StateManager.saveState();
}

function updateContributions() {
    let totalCommits = 0;

    if (contributionsChart && contributionsChart.grid) {
        for (let week = 0; week < contributionsChart.grid.length; week++) {
            for (let day = 0; day < 7; day++) {
                const level = contributionsChart.grid[week] && contributionsChart.grid[week][day] ? contributionsChart.grid[week][day] : 0;
                if (level > 0) {
                    totalCommits += [1, 3, 5, 7, 9][level];
                }
            }
        }
    }

    document.getElementById('total-contributions').textContent = totalCommits;
}

function updateUIForMode() {
    const singleYearDropdown = document.getElementById('single-year-dropdown');
    const multiModeDropdown = document.getElementById('multi-mode-dropdown');
    const multiYearSelector = document.getElementById('multi-year-selector');
    const layersToggle = document.querySelector('.layers-toggle');

    if (layoutMode === 'single') {
        singleYearDropdown.style.display = 'block';
        multiModeDropdown.style.display = 'none';
        multiYearSelector.style.display = 'none';
        layersToggle.style.display = 'none';

        // Reset layers state
        layersExpanded = false;
        const container = document.getElementById('layers-container');
        container.classList.remove('layers-expanded');
    } else {
        singleYearDropdown.style.display = 'none';
        multiModeDropdown.style.display = 'block';
        multiYearSelector.style.display = 'block';

        if (multiMode === 'overlay' && selectedYears.length > 0) {
            layersToggle.style.display = 'block';
        } else {
            layersToggle.style.display = 'none';
        }

        // Set default years if none selected
        if (selectedYears.length === 0) {
            selectedYears = [2024, 2025];
            updateYearSelection();
        }
    }
}

function updateYearSelection() {
    document.querySelectorAll('.year-item').forEach(item => {
        const year = parseInt(item.dataset.year);
        if (selectedYears.includes(year)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

// Export functions
function exportScript() {
    let script = '#!/bin/bash\n';

    let yearText;
    if (layoutMode === 'multi' && selectedYears.length > 0) {
        yearText = `overlapping years ${selectedYears.join(', ')}`;
    } else if (currentMode === 'last') {
        yearText = 'last year';
    } else {
        yearText = currentMode;
    }

    script += `# GitHub Contribution Art Script for ${yearText}\n`;
    script += '# Created: ' + new Date().toLocaleString() + '\n\n';

    let commitCount = 0;

    if (layoutMode === 'multi' && multiMode === 'overlay' && selectedYears.length > 0) {
        // Create separate repositories for each year
        selectedYears.forEach(year => {
            script += `# Repository for ${year}\n`;
            script += `mkdir -p contribution-art-${year}\n`;
            script += `cd contribution-art-${year}\n`;
            script += 'git init\n';
            script += `echo "# GitHub Contribution Art ${year}" > README.md\n`;
            script += 'git add README.md\n';
            script += 'git commit -m "Initial commit"\n\n';

            const yearData = overlayData[year] || {};
            const yearCommits = [];

            Object.keys(yearData).forEach(dateKey => {
                const level = yearData[dateKey];
                if (level > 0) {
                    const date = new Date(dateKey);
                    if (date.getFullYear() === year) {
                        const commits = [1, 3, 5, 7, 9][level];
                        yearCommits.push({
                            date: date,
                            commits: commits,
                            level: level
                        });
                    }
                }
            });

            yearCommits.sort((a, b) => a.date - b.date);

            for (const commit of yearCommits) {
                const dateStr = commit.date.toISOString().split('T')[0];

                for (let i = 0; i < commit.commits; i++) {
                    commitCount++;
                    script += `echo "Art commit ${commitCount}" >> commits.txt\n`;
                    script += `git add commits.txt\n`;
                    script += `GIT_AUTHOR_DATE="${dateStr} 12:${String(i).padStart(2, '0')}:00" GIT_COMMITTER_DATE="${dateStr} 12:${String(i).padStart(2, '0')}:00" git commit -m "Art commit ${commitCount} - Level ${commit.level}"\n`;
                }
            }

            script += `\necho "✅ Created commits for ${year}: ${yearCommits.reduce((sum, c) => sum + c.commits, 0)}"\n`;
            script += 'echo "📝 Now add remote and push:"\n';
            script += `echo "git remote add origin https://github.com/YOUR_USERNAME/contribution-art-${year}.git"\n`;
            script += 'echo "git branch -M main"\n';
            script += 'echo "git push -u origin main"\n\n';
            script += 'cd ..\n\n';
        });
    } else {
        // Single repository
        script += 'mkdir -p contribution-art\n';
        script += 'cd contribution-art\n';
        script += 'git init\n';
        script += 'echo "# GitHub Contribution Art" > README.md\n';
        script += 'git add README.md\n';
        script += 'git commit -m "Initial commit"\n\n';

        const allCommits = [];
        if (contributionsChart && contributionsChart.grid && contributionsChart.dates) {
            for (let week = 0; week < contributionsChart.grid.length; week++) {
                for (let day = 0; day < 7; day++) {
                    const level = contributionsChart.grid[week][day] || 0;
                    if (level > 0 && contributionsChart.dates[week] && contributionsChart.dates[week][day]) {
                        const date = contributionsChart.dates[week][day];

                        if (layoutMode === 'multi' && selectedYears.length > 0) {
                            if (!selectedYears.includes(date.getFullYear())) {
                                continue;
                            }
                        }

                        const commits = [1, 3, 5, 7, 9][level];
                        allCommits.push({
                            date: date,
                            commits: commits,
                            level: level
                        });
                    }
                }
            }
        }

        allCommits.sort((a, b) => a.date - b.date);

        for (const commit of allCommits) {
            const dateStr = commit.date.toISOString().split('T')[0];

            for (let i = 0; i < commit.commits; i++) {
                commitCount++;
                script += `echo "Art commit ${commitCount}" >> commits.txt\n`;
                script += `git add commits.txt\n`;
                script += `GIT_AUTHOR_DATE="${dateStr} 12:${String(i).padStart(2, '0')}:00" GIT_COMMITTER_DATE="${dateStr} 12:${String(i).padStart(2, '0')}:00" git commit -m "Art commit ${commitCount} - Level ${commit.level}"\n`;
            }
        }

        script += `\necho "✅ Created commits: ${commitCount}"\n`;
        script += 'echo "📝 Now add remote and push:"\n';
        script += 'echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"\n';
        script += 'echo "git branch -M main"\n';
        script += 'echo "git push -u origin main"\n';
    }

    const blob = new Blob([script], {
        type: 'text/plain'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let filename;
    if (layoutMode === 'multi' && selectedYears.length > 0) {
        filename = `create-art-multi-${selectedYears.join('-')}.sh`;
    } else if (currentMode === 'last') {
        filename = 'create-art-last-year.sh';
    } else {
        filename = `create-art-${currentMode}.sh`;
    }

    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Shell script exported successfully!', 'success');
}

function exportJSON() {
    const data = {
        mode: currentMode,
        layoutMode: layoutMode,
        multiMode: multiMode,
        selectedYears: selectedYears,
        grid: contributionsChart ? contributionsChart.grid : [],
        dates: contributionsChart && contributionsChart.dates ? contributionsChart.dates.map(week => week.map(date => date.toISOString().split('T')[0])) : [],
        overlayData: overlayData,
        customPatterns: customPatterns,
        created: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let filename;
    if (layoutMode === 'multi' && selectedYears.length > 0) {
        filename = `github-art-multi-${selectedYears.join('-')}.json`;
    } else if (currentMode === 'last') {
        filename = 'github-art-last-year.json';
    } else {
        filename = `github-art-${currentMode}.json`;
    }

    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('JSON exported successfully!', 'success');
}

function saveImage() {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const cellSize = 16;
    const gap = 3;
    const padding = 80;

    if (!contributionsChart || !contributionsChart.grid) {
        showNotification('No data to export', 'error');
        return;
    }

    const weeksCount = contributionsChart.grid.length;
    canvas.width = weeksCount * (cellSize + gap) + padding * 2;
    canvas.height = 7 * (cellSize + gap) + padding * 2;

    // Background
    ctx.fillStyle = currentTheme === 'dark' ? '#0d1117' : '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Grid
    const colors = currentTheme === 'dark' ? ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'] : ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];

    for (let week = 0; week < weeksCount; week++) {
        for (let day = 0; day < 7; day++) {
            const level = contributionsChart.grid[week] && contributionsChart.grid[week][day] ? contributionsChart.grid[week][day] : 0;
            const x = padding + week * (cellSize + gap);
            const y = padding + day * (cellSize + gap);

            ctx.fillStyle = colors[level];
            ctx.fillRect(x, y, cellSize, cellSize);

            // Border
            ctx.strokeStyle = currentTheme === 'dark' ? '#30363d' : '#d0d7de';
            ctx.lineWidth = 1;
            ctx.strokeRect(x, y, cellSize, cellSize);
        }
    }

    // Title
    ctx.fillStyle = currentTheme === 'dark' ? '#c9d1d9' : '#24292f';
    ctx.font = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';

    let yearText;
    if (layoutMode === 'multi' && selectedYears.length > 0) {
        yearText = `Multi-Year ${selectedYears.join(', ')}`;
    } else if (currentMode === 'last') {
        yearText = 'Last Year';
    } else {
        yearText = currentMode;
    }

    ctx.fillText(`GitHub Contribution Graph Art - ${yearText}`, canvas.width / 2, 30);

    // Subtitle
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = currentTheme === 'dark' ? '#8b949e' : '#656d76';
    const totalCommits = document.getElementById('total-contributions').textContent;
    ctx.fillText(`${totalCommits} contributions`, canvas.width / 2, 55);

    // Download
    const link = document.createElement('a');

    let filename;
    if (layoutMode === 'multi' && selectedYears.length > 0) {
        filename = `github-art-multi-${selectedYears.join('-')}.png`;
    } else if (currentMode === 'last') {
        filename = 'github-art-last-year.png';
    } else {
        filename = `github-art-${currentMode}.png`;
    }

    link.download = filename;
    link.href = canvas.toDataURL();
    link.click();

    showNotification('PNG image exported successfully!', 'success');
}

function exportCSV() {
    if (!contributionsChart || !contributionsChart.grid || !contributionsChart.dates) {
        showNotification('No data to export', 'error');
        return;
    }

    let csv = 'Date,Level,Commits\n';

    for (let week = 0; week < contributionsChart.grid.length; week++) {
        for (let day = 0; day < 7; day++) {
            if (contributionsChart.dates[week] && contributionsChart.dates[week][day]) {
                const date = contributionsChart.dates[week][day];
                const level = contributionsChart.grid[week][day] || 0;
                const commits = level > 0 ? [1, 3, 5, 7, 9][level] : 0;

                csv += `${date.toISOString().split('T')[0]},${level},${commits}\n`;
            }
        }
    }

    const blob = new Blob([csv], {
        type: 'text/csv'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    let filename;
    if (layoutMode === 'multi' && selectedYears.length > 0) {
        filename = `github-art-multi-${selectedYears.join('-')}.csv`;
    } else if (currentMode === 'last') {
        filename = 'github-art-last-year.csv';
    } else {
        filename = `github-art-${currentMode}.csv`;
    }

    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('CSV exported successfully!', 'success');
}

function importJSON() {
    document.getElementById('json-import').click();
}

function handleJSONImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (data.grid && data.dates) {
                // Restore mode settings
                if (data.mode) currentMode = data.mode;
                if (data.layoutMode) layoutMode = data.layoutMode;
                if (data.multiMode) multiMode = data.multiMode;
                if (data.selectedYears) selectedYears = data.selectedYears;
                if (data.overlayData) overlayData = data.overlayData;
                if (data.customPatterns) customPatterns = data.customPatterns;

                // Update UI
                updateUIForMode();
                updateYearSelection();

                // Initialize grid with imported data
                initGrid();

                // Apply imported grid data
                if (contributionsChart && data.grid) {
                    for (let week = 0; week < Math.min(data.grid.length, contributionsChart.grid.length); week++) {
                        for (let day = 0; day < 7; day++) {
                            if (data.grid[week] && data.grid[week][day] !== undefined) {
                                const level = data.grid[week][day];
                                const cell = document.querySelector(`[data-week="${week}"][data-day="${day}"]`);
                                if (cell) {
                                    cell.dataset.level = level;
                                    cell.style.background = ['var(--contribution-0)', 'var(--contribution-1)', 'var(--contribution-2)', 'var(--contribution-3)', 'var(--contribution-4)'][level];
                                    contributionsChart.grid[week][day] = level;
                                }
                            }
                        }
                    }
                }

                updateContributions();
                showNotification('JSON imported successfully!', 'success');
            } else {
                showNotification('Invalid JSON format', 'error');
            }
        } catch (error) {
            console.error('JSON import error:', error);
            showNotification('Error reading JSON file', 'error');
        }
    };
    reader.readAsText(file);
}

// Notification function
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;

    // Добавляем соответствующий цвет фона
    switch (type) {
        case 'success':
            notification.style.background = 'var(--button-primary)';
            break;
        case 'error':
            notification.style.background = 'var(--text-danger)';
            break;
        case 'info':
        default:
            notification.style.background = 'var(--text-accent)';
            break;
    }

    document.body.appendChild(notification);

    // Добавляем класс show после небольшой задержки для анимации
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);

    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Event listeners setup
function setupEventListeners() {
    // Brush selector
    document.querySelectorAll('.brush-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.brush-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBrush = parseInt(btn.dataset.level);
        });
    });

    // Dropdown handlers
    setupDropdownHandlers();

    // Year selection for multi-year mode
    document.querySelectorAll('.year-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const year = parseInt(item.dataset.year);

            if (e.ctrlKey || e.metaKey) {
                // Ctrl+click: add/remove year
                if (selectedYears.includes(year)) {
                    selectedYears = selectedYears.filter(y => y !== year);
                } else {
                    selectedYears.push(year);
                }
            } else {
                // Normal click: select only this year
                selectedYears = [year];
            }

            updateYearSelection();
            updateUIForMode();
            initGrid();

            // Сохраняем состояние после изменения выбранных годов
            StateManager.saveState();
        });
    });

    // Global mouse events
    document.addEventListener('mouseup', () => {
        if (isDrawing) {
            // Сохраняем состояние только если было рисование
            StateManager.saveState();
        }

        isDrawing = false;
        if (contributionsChart) {
            contributionsChart.isDrawing = false;
        }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown-options').forEach(dropdown => {
                dropdown.classList.remove('show');
            });
        }

        // Close panels when clicking outside
        if (!e.target.closest('.settings-panel') && !e.target.closest('.settings-toggle')) {
            document.getElementById('settings-panel').classList.remove('open');
        }

        if (!e.target.closest('.export-panel') && !e.target.closest('.export-toggle')) {
            document.getElementById('export-panel').classList.remove('open');
        }
    });

    // Only past checkbox
    document.getElementById('only-past').addEventListener('change', () => {
        // Update future cell states
        if (contributionsChart && contributionsChart.dates) {
            const today = new Date();
            for (let week = 0; week < contributionsChart.dates.length; week++) {
                for (let day = 0; day < 7; day++) {
                    const date = contributionsChart.dates[week] && contributionsChart.dates[week][day];
                    const cell = document.querySelector(`[data-week="${week}"][data-day="${day}"]`);

                    if (cell && date) {
                        const isFuture = date > today;
                        if (isFuture) {
                            cell.classList.toggle('future', document.getElementById('only-past').checked);
                        }
                    }
                }
            }
        }
    });

    // Клавиатурные сокращения
    document.addEventListener('keydown', (e) => {
        // Ctrl+Z - Undo
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            StateManager.undo();
        }

        // Ctrl+Y - Redo
        if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            StateManager.redo();
        }

        // Ctrl+S - Save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            StateManager.saveToLocalStorage();
            showNotification(translations[currentLanguage].project_saved, 'success');
        }
    });

    // Auto-save checkbox
    document.getElementById('auto-save').addEventListener('change', (e) => {
        if (e.target.checked) {
            StateManager.startAutoSave();
            showNotification(translations[currentLanguage].auto_save_enabled, 'success');
        } else {
            StateManager.stopAutoSave();
            showNotification(translations[currentLanguage].auto_save_disabled, 'info');
        }
    });
}

function setupDropdownHandlers() {
    // Layout dropdown
    document.querySelectorAll('#layout-options .dropdown-option').forEach(option => {
        option.addEventListener('click', () => {
            layoutMode = option.dataset.layout;
            document.getElementById('selected-layout').textContent = option.textContent;
            document.querySelectorAll('#layout-options .dropdown-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            document.getElementById('layout-options').classList.remove('show');
            updateUIForMode();
            initGrid();
        });
    });

    // Year dropdown
    document.querySelectorAll('#single-year-options .dropdown-option').forEach(option => {
        option.addEventListener('click', () => {
            currentMode = option.dataset.year;
            document.getElementById('selected-year').textContent = option.textContent;
            document.querySelectorAll('#single-year-options .dropdown-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            document.getElementById('single-year-options').classList.remove('show');
            initGrid();
        });
    });

    // Multi-mode dropdown
    document.querySelectorAll('#multi-mode-options .dropdown-option').forEach(option => {
        option.addEventListener('click', () => {
            multiMode = option.dataset.mode;
            document.getElementById('selected-multi-mode').textContent = option.textContent;
            document.querySelectorAll('#multi-mode-options .dropdown-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            document.getElementById('multi-mode-options').classList.remove('show');
            updateUIForMode();
            initGrid();
        });
    });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('github-art-theme');
    const savedLanguage = localStorage.getItem('github-art-language');
    const savedCustomPatterns = localStorage.getItem('github-art-custom-patterns');

    if (savedTheme) {
        currentTheme = savedTheme;
        document.body.dataset.theme = currentTheme;
        document.querySelector('.theme-icon').textContent = currentTheme === 'dark' ? '🌙' : '☀️';
    }

    if (savedLanguage) {
        currentLanguage = savedLanguage;
        updateLanguage();
    }

    if (savedCustomPatterns) {
        try {
            customPatterns = JSON.parse(savedCustomPatterns);
        } catch (e) {
            console.error('Error loading custom patterns:', e);
        }
    }

    // Загружаем сохраненное состояние
    StateManager.loadFromLocalStorage();

    // Set current date
    document.getElementById('current-date').textContent = new Date().toLocaleDateString();

    // Initialize components
    setupEventListeners();
    setupDragAndDrop();
    initGrid();

    // Применяем загруженный grid после инициализации
    StateManager.applyLoadedGrid();

    // Запускаем автосохранение
    StateManager.startAutoSave();

    // Сохраняем начальное состояние в историю
    StateManager.saveState();

    // Initialize color indicators for intensity sliders
    ['heart-intensity', 'wave-intensity', 'stripes-intensity', 'text-intensity', 'custom-intensity'].forEach(id => {
        const input = document.getElementById(id);
        const valueId = id + '-value';
        if (input) {
            updateIntensityColorIndicator(valueId, parseInt(input.value));
        }
    });

    showNotification('GitHub Contribution Graph Art loaded!', 'success');
});