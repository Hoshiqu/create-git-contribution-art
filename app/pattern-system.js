/**
 * Унифицированная система паттернов
 */
import EventBus from './event-bus.js';

/**
 * Базовый класс для всех паттернов
 */
class Pattern {
    constructor(name, type, description) {
        this.name = name;
        this.type = type; // 'single' или 'repeating'
        this.description = description;
        this.params = {};
    }
    
    /**
     * Установка параметров паттерна
     * @param {Object} params - Параметры паттерна
     */
    setParams(params) {
        this.params = { ...this.params, ...params };
    }
    
    /**
     * Получение точек паттерна
     * @returns {Array} - Массив точек паттерна
     */
    getPoints() {
        throw new Error('Method getPoints() must be implemented by subclass');
    }
    
    /**
     * Создание превью паттерна
     * @param {HTMLElement} container - Контейнер для превью
     */
    createPreview(container) {
        throw new Error('Method createPreview() must be implemented by subclass');
    }
}

/**
 * Класс для одиночных паттернов (сердце, текст и т.д.)
 */
class SinglePattern extends Pattern {
    constructor(name, description, matrix) {
        super(name, 'single', description);
        this.matrix = matrix;
        this.params = {
            size: 1,
            intensity: 3,
            position: 'center'
        };
    }
    
    /**
     * Получение точек паттерна
     * @param {Object} grid - Сетка для размещения
     * @returns {Array} - Массив точек паттерна
     */
    getPoints(grid) {
        if (!grid || !grid.dates) return [];
        
        const gridWeeks = grid.grid.length;
        const patternHeight = this.matrix.length;
        const patternWidth = this.matrix[0] ? this.matrix[0].length : 0;
        
        const size = this.params.size;
        const scaledWidth = patternWidth * size;
        const scaledHeight = patternHeight * size;
        
        let startWeek;
        switch (this.params.position) {
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
        const patternPoints = [];
        
        for (let day = 0; day < patternHeight; day++) {
            for (let week = 0; week < patternWidth; week++) {
                if (this.matrix[day][week] > 0) {
                    for (let sy = 0; sy < size; sy++) {
                        for (let sx = 0; sx < size; sx++) {
                            const gridWeek = startWeek + week * size + sx;
                            const gridDay = startDay + day * size + sy;
                            
                            if (gridWeek >= 0 && gridWeek < gridWeeks && gridDay >= 0 && gridDay < 7) {
                                const date = grid.dates[gridWeek] && grid.dates[gridWeek][gridDay];
                                if (date && grid.shouldAllowEdit(date)) {
                                    patternPoints.push({
                                        week: gridWeek,
                                        day: gridDay,
                                        date: date,
                                        level: this.params.intensity
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
        
        return patternPoints;
    }
    
    /**
     * Создание превью паттерна
     * @param {HTMLElement} container - Контейнер для превью
     */
    createPreview(container) {
        const colors = [
            'var(--contribution-0)',
            'var(--contribution-1)',
            'var(--contribution-2)',
            'var(--contribution-3)',
            'var(--contribution-4)'
        ];
        
        const matrix = document.createElement('div');
        matrix.className = 'pattern-matrix';
        matrix.style.gridTemplateColumns = `repeat(${this.matrix[0].length}, 1fr)`;
        
        for (let day = 0; day < this.matrix.length; day++) {
            for (let week = 0; week < this.matrix[0].length; week++) {
                const cell = document.createElement('div');
                cell.className = 'pattern-cell';
                const level = this.matrix[day][week] ? this.params.intensity : 0;
                cell.style.backgroundColor = colors[level];
                matrix.appendChild(cell);
            }
        }
        
        container.innerHTML = '';
        container.appendChild(matrix);
    }
}

/**
 * Класс для повторяющихся паттернов (волна, полосы и т.д.)
 */
class RepeatingPattern extends Pattern {
    constructor(name, description, generator) {
        super(name, 'repeating', description);
        this.generator = generator;
        this.params = {
            frequency: 5,
            intensity: 3,
            direction: 'horizontal',
            repeat: 1
        };
    }
    
    /**
     * Получение точек паттерна
     * @param {Object} grid - Сетка для размещения
     * @returns {Array} - Массив точек паттерна
     */
    getPoints(grid) {
        if (!grid || !grid.dates) return [];
        
        const gridWeeks = grid.grid.length;
        const patternPoints = [];
        
        // Вызываем генератор с текущими параметрами
        return this.generator(grid, this.params);
    }
    
    /**
     * Создание превью паттерна
     * @param {HTMLElement} container - Контейнер для превью
     */
    createPreview(container) {
        const colors = [
            'var(--contribution-0)',
            'var(--contribution-1)',
            'var(--contribution-2)',
            'var(--contribution-3)',
            'var(--contribution-4)'
        ];
        
        const matrix = document.createElement('div');
        matrix.className = 'pattern-matrix';
        matrix.style.gridTemplateColumns = 'repeat(30, 1fr)';
        
        // Создаем упрощенное превью на основе направления и частоты
        for (let day = 0; day < 7; day++) {
            for (let week = 0; week < 30; week++) {
                const cell = document.createElement('div');
                cell.className = 'pattern-cell';
                
                let level = 0;
                
                switch (this.params.direction) {
                    case 'horizontal':
                        level = Math.floor(day / this.params.frequency) % 2 === 0 ? this.params.intensity : 0;
                        break;
                    case 'vertical':
                        level = Math.floor(week / this.params.frequency) % 2 === 0 ? this.params.intensity : 0;
                        break;
                    case 'diagonal':
                        level = Math.floor((week + day) / this.params.frequency) % 2 === 0 ? this.params.intensity : 0;
                        break;
                    default:
                        if (this.name === 'wave') {
                            const wave = Math.sin(week * this.params.frequency * 0.1) * 2 + 3;
                            level = Math.abs(day - wave) < 1.5 ? this.params.intensity : 0;
                        }
                }
                
                cell.style.backgroundColor = colors[level];
                matrix.appendChild(cell);
            }
        }
        
        container.innerHTML = '';
        container.appendChild(matrix);
    }
}

/**
 * Менеджер паттернов
 */
class PatternManager {
    constructor() {
        this.patterns = {};
        this.customPatterns = [];
    }
    
    /**
     * Инициализация менеджера паттернов
     */
    init() {
        // Загружаем сохраненные кастомные паттерны
        this.loadCustomPatterns();
        
        // Регистрируем предустановленные паттерны
        this.registerDefaultPatterns();
        
        // Подписываемся на события
        EventBus.subscribe('pattern:applied', (data) => {
            EventBus.publish('state:changed', null);
        });
    }
    
    /**
     * Регистрация паттерна
     * @param {Pattern} pattern - Паттерн для регистрации
     */
    registerPattern(pattern) {
        this.patterns[pattern.name] = pattern;
    }
    
    /**
     * Получение паттерна по имени
     * @param {string} name - Имя паттерна
     * @returns {Pattern} - Паттерн
     */
    getPattern(name) {
        return this.patterns[name];
    }
    
    /**
     * Применение паттерна к сетке
     * @param {string} name - Имя паттерна
     * @param {Object} grid - Сетка для применения
     * @param {Object} params - Параметры паттерна
     */
    applyPattern(name, grid, params = {}) {
        const pattern = this.getPattern(name);
        if (!pattern) return;
        
        // Обновляем параметры паттерна
        if (params) {
            pattern.setParams(params);
        }
        
        // Получаем точки паттерна
        const points = pattern.getPoints(grid);
        
        // Публикуем событие о применении паттерна
        EventBus.publish('pattern:applying', { name, points });
        
        // Возвращаем точки для применения
        return points;
    }
    
    /**
     * Регистрация предустановленных паттернов
     */
    registerDefaultPatterns() {
        // Сердце
        const heartMatrix = [
            [0, 1, 1, 0, 0, 0, 1, 1, 0],
            [1, 1, 1, 1, 0, 1, 1, 1, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 0, 1, 0, 0, 0, 0]
        ];
        
        this.registerPattern(new SinglePattern('heart', 'Romantic single object pattern', heartMatrix));
        
        // Волна
        const waveGenerator = (grid, params) => {
            const gridWeeks = grid.grid.length;
            const patternPoints = [];
            
            for (let r = 0; r < params.repeat; r++) {
                const verticalOffset = r * Math.floor(7 / params.repeat);
                
                for (let week = 0; week < gridWeeks; week++) {
                    const wave = Math.sin(week * params.frequency * 0.1) * 2 + 3;
                    const centerDay = Math.floor(wave) + verticalOffset;
                    
                    if (centerDay >= 0 && centerDay < 7) {
                        const date = grid.dates[week] && grid.dates[week][centerDay];
                        if (date && grid.shouldAllowEdit(date)) {
                            patternPoints.push({
                                week,
                                day: centerDay,
                                date,
                                level: params.intensity
                            });
                        }
                    }
                }
            }
            
            return patternPoints;
        };
        
        this.registerPattern(new RepeatingPattern('wave', 'Smooth repeating wave pattern', waveGenerator));
        
        // Полосы
        const stripesGenerator = (grid, params) => {
            const gridWeeks = grid.grid.length;
            const patternPoints = [];
            
            for (let week = 0; week < gridWeeks; week++) {
                for (let day = 0; day < 7; day++) {
                    let shouldAdd = false;
                    
                    switch (params.direction) {
                        case 'horizontal':
                            shouldAdd = Math.floor(day / params.frequency) % 2 === 0;
                            break;
                        case 'vertical':
                            shouldAdd = Math.floor(week / params.frequency) % 2 === 0;
                            break;
                        case 'diagonal':
                            shouldAdd = Math.floor((week + day) / params.frequency) % 2 === 0;
                            break;
                    }
                    
                    if (shouldAdd) {
                        const date = grid.dates[week] && grid.dates[week][day];
                        if (date && grid.shouldAllowEdit(date)) {
                            patternPoints.push({
                                week,
                                day,
                                date,
                                level: params.intensity
                            });
                        }
                    }
                }
            }
            
            return patternPoints;
        };
        
        this.registerPattern(new RepeatingPattern('stripes', 'Repeating stripe pattern', stripesGenerator));
        
        // Звезда
        const starMatrix = [
            [0, 0, 0, 0, 1, 0, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 0, 1, 0, 1, 0, 0],
            [0, 1, 0, 0, 0, 0, 0, 1, 0]
        ];
        
        this.registerPattern(new SinglePattern('star', 'Shining star pattern', starMatrix));
        
        // Диамант
        const diamondMatrix = [
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0]
        ];
        
        this.registerPattern(new SinglePattern('diamond', 'Elegant diamond shape', diamondMatrix));
        
        // Стрелка
        const arrowMatrix = [
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 1, 1, 1, 1, 1, 0, 0],
            [0, 1, 1, 1, 1, 1, 1, 1, 0],
            [1, 1, 1, 1, 1, 1, 1, 1, 1],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0],
            [0, 0, 0, 1, 1, 1, 0, 0, 0]
        ];
        
        this.registerPattern(new SinglePattern('arrow', 'Directional arrow pattern', arrowMatrix));
        
        // Шахматная доска
        const chessGenerator = (grid, params) => {
            const gridWeeks = grid.grid.length;
            const patternPoints = [];
            
            for (let week = 0; week < gridWeeks; week++) {
                for (let day = 0; day < 7; day++) {
                    if ((week + day) % 2 === 0) {
                        const date = grid.dates[week] && grid.dates[week][day];
                        if (date && grid.shouldAllowEdit(date)) {
                            patternPoints.push({
                                week,
                                day,
                                date,
                                level: params.intensity
                            });
                        }
                    }
                }
            }
            
            return patternPoints;
        };
        
        this.registerPattern(new RepeatingPattern('chess', 'Chess board pattern', chessGenerator));
    }
    
    /**
     * Сохранение кастомного паттерна
     * @param {string} name - Имя паттерна
     * @param {Array} matrix - Матрица паттерна
     * @param {Object} params - Параметры паттерна
     */
    saveCustomPattern(name, matrix, params = {}) {
        const customPattern = {
            name,
            matrix,
            params,
            type: 'single',
            created: new Date().toISOString()
        };
        
        this.customPatterns.push(customPattern);
        
        // Регистрируем паттерн для использования
        this.registerPattern(new SinglePattern(name, 'Custom pattern', matrix));
        
        // Сохраняем в localStorage
        this.saveCustomPatternsToStorage();
        
        // Публикуем событие о сохранении паттерна
        EventBus.publish('pattern:saved', customPattern);
        
        return customPattern;
    }
    
    /**
     * Загрузка кастомных паттернов
     */
    loadCustomPatterns() {
        try {
            const savedPatterns = localStorage.getItem('github-art-custom-patterns');
            if (savedPatterns) {
                this.customPatterns = JSON.parse(savedPatterns);
                
                // Регистрируем загруженные паттерны
                this.customPatterns.forEach(pattern => {
                    this.registerPattern(new SinglePattern(pattern.name, 'Custom pattern', pattern.matrix));
                });
                
                // Публикуем событие о загрузке паттернов
                EventBus.publish('patterns:loaded', this.customPatterns);
            }
        } catch (e) {
            console.error('Ошибка загрузки кастомных паттернов:', e);
        }
    }
    
    /**
     * Сохранение кастомных паттернов в localStorage
     */
    saveCustomPatternsToStorage() {
        try {
            localStorage.setItem('github-art-custom-patterns', JSON.stringify(this.customPatterns));
        } catch (e) {
            console.error('Ошибка сохранения кастомных паттернов:', e);
        }
    }
    
    /**
     * Удаление кастомного паттерна
     * @param {string} name - Имя паттерна
     */
    deleteCustomPattern(name) {
        this.customPatterns = this.customPatterns.filter(pattern => pattern.name !== name);
        delete this.patterns[name];
        
        // Сохраняем в localStorage
        this.saveCustomPatternsToStorage();
        
        // Публикуем событие об удалении паттерна
        EventBus.publish('pattern:deleted', name);
    }
    
    /**
     * Экспорт кастомных паттернов
     * @returns {string} - JSON строка с паттернами
     */
    exportCustomPatterns() {
        return JSON.stringify(this.customPatterns);
    }
    
    /**
     * Импорт кастомных паттернов
     * @param {string} json - JSON строка с паттернами
     */
    importCustomPatterns(json) {
        try {
            const patterns = JSON.parse(json);
            
            // Валидация
            if (!Array.isArray(patterns)) {
                throw new Error('Invalid patterns format');
            }
            
            // Добавляем новые паттерны
            patterns.forEach(pattern => {
                if (pattern.name && pattern.matrix) {
                    // Проверяем, не существует ли уже паттерн с таким именем
                    const existingIndex = this.customPatterns.findIndex(p => p.name === pattern.name);
                    if (existingIndex >= 0) {
                        // Обновляем существующий паттерн
                        this.customPatterns[existingIndex] = pattern;
                    } else {
                        // Добавляем новый паттерн
                        this.customPatterns.push(pattern);
                    }
                    
                    // Регистрируем паттерн
                    this.registerPattern(new SinglePattern(pattern.name, 'Custom pattern', pattern.matrix));
                }
            });
            
            // Сохраняем в localStorage
            this.saveCustomPatternsToStorage();
            
            // Публикуем событие об импорте паттернов
            EventBus.publish('patterns:imported', patterns);
            
            return patterns.length;
        } catch (e) {
            console.error('Ошибка импорта кастомных паттернов:', e);
            throw e;
        }
    }
}

// Экспортируем классы и синглтон менеджера
export { Pattern, SinglePattern, RepeatingPattern };
export default new PatternManager(); 