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

export {
    translations,
    toggleTheme,
    toggleLanguage,
    updateLanguage
};