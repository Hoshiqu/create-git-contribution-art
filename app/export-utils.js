/**
 * Утилиты для экспорта изображений
 */
import EventBus from './event-bus.js';

/**
 * Класс для экспорта графика контрибуций в различные форматы изображений
 */
class ExportUtils {
    constructor() {
        this.supportedFormats = ['png', 'jpeg', 'svg'];
    }
    
    /**
     * Инициализация утилит экспорта
     */
    init() {
        // Подписываемся на события
        EventBus.subscribe('export:start', (data) => this.handleExport(data));
    }
    
    /**
     * Обработка запроса на экспорт
     * @param {Object} data - Данные для экспорта
     */
    handleExport(data) {
        const { format, chart, options } = data;
        
        if (!this.supportedFormats.includes(format)) {
            EventBus.publish('notification:show', {
                message: `Формат ${format} не поддерживается`,
                type: 'error'
            });
            return;
        }
        
        try {
            switch (format) {
                case 'png':
                case 'jpeg':
                    this.exportAsRaster(chart, format, options);
                    break;
                case 'svg':
                    this.exportAsSVG(chart, options);
                    break;
            }
            
            EventBus.publish('export:complete', { format });
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            EventBus.publish('notification:show', {
                message: 'Ошибка при экспорте изображения',
                type: 'error'
            });
            EventBus.publish('export:error', { error });
        }
    }
    
    /**
     * Экспорт графика как растрового изображения (PNG или JPEG)
     * @param {Object} chart - Объект графика
     * @param {string} format - Формат изображения (png или jpeg)
     * @param {Object} options - Дополнительные опции
     */
    exportAsRaster(chart, format, options = {}) {
        const { scale = 2, quality = 0.95, includeMetadata = true } = options;
        
        // Создаем canvas для рендеринга
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Получаем размеры графика
        const chartElement = chart.element;
        const chartRect = chartElement.getBoundingClientRect();
        
        // Устанавливаем размеры canvas с учетом масштаба
        canvas.width = chartRect.width * scale;
        canvas.height = chartRect.height * scale;
        
        // Настраиваем масштаб
        ctx.scale(scale, scale);
        
        // Заливаем фон
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-color');
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рендерим график
        this.renderChartToCanvas(chart, ctx);
        
        // Добавляем метаданные, если требуется
        if (includeMetadata) {
            this.addMetadataToCanvas(ctx, chart, chartRect.width);
        }
        
        // Конвертируем canvas в изображение
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataURL = canvas.toDataURL(mimeType, quality);
        
        // Создаем имя файла
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('T')[0];
        const filename = `github-contribution-art-${timestamp}.${format}`;
        
        // Скачиваем изображение
        this.downloadDataURL(dataURL, filename);
    }
    
    /**
     * Экспорт графика как SVG
     * @param {Object} chart - Объект графика
     * @param {Object} options - Дополнительные опции
     */
    exportAsSVG(chart, options = {}) {
        const { includeMetadata = true } = options;
        
        // Получаем размеры графика
        const chartElement = chart.element;
        const chartRect = chartElement.getBoundingClientRect();
        
        // Создаем SVG документ
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', chartRect.width);
        svg.setAttribute('height', chartRect.height);
        svg.setAttribute('viewBox', `0 0 ${chartRect.width} ${chartRect.height}`);
        svg.setAttribute('xmlns', svgNS);
        
        // Добавляем стили
        const style = document.createElementNS(svgNS, 'style');
        style.textContent = this.getChartStyles();
        svg.appendChild(style);
        
        // Добавляем фон
        const background = document.createElementNS(svgNS, 'rect');
        background.setAttribute('width', '100%');
        background.setAttribute('height', '100%');
        background.setAttribute('fill', getComputedStyle(document.body).getPropertyValue('--bg-color'));
        svg.appendChild(background);
        
        // Рендерим график в SVG
        this.renderChartToSVG(chart, svg);
        
        // Добавляем метаданные, если требуется
        if (includeMetadata) {
            this.addMetadataToSVG(svg, chart, chartRect.width);
        }
        
        // Конвертируем SVG в строку
        const serializer = new XMLSerializer();
        let svgString = serializer.serializeToString(svg);
        
        // Добавляем декларацию XML
        svgString = '<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n' + svgString;
        
        // Конвертируем в Data URL
        const dataURL = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
        
        // Создаем имя файла
        const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('T')[0];
        const filename = `github-contribution-art-${timestamp}.svg`;
        
        // Скачиваем SVG
        this.downloadDataURL(dataURL, filename);
    }
    
    /**
     * Рендеринг графика на canvas
     * @param {Object} chart - Объект графика
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     */
    renderChartToCanvas(chart, ctx) {
        // Получаем данные графика
        const grid = chart.grid;
        const cellSize = chart.cellSize;
        const cellSpacing = chart.cellSpacing;
        
        // Получаем цвета контрибуций
        const colors = [];
        for (let i = 0; i <= 4; i++) {
            colors.push(getComputedStyle(document.body).getPropertyValue(`--contribution-${i}`));
        }
        
        // Рисуем месяцы
        const months = chart.months;
        ctx.font = '10px Arial';
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color');
        ctx.textAlign = 'center';
        
        months.forEach(month => {
            ctx.fillText(
                month.name,
                month.x * (cellSize + cellSpacing) + (cellSize / 2),
                15
            );
        });
        
        // Рисуем дни недели
        const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
        ctx.textAlign = 'right';
        
        for (let i = 0; i < 7; i++) {
            if (days[i]) {
                ctx.fillText(
                    days[i],
                    25,
                    i * (cellSize + cellSpacing) + 30 + (cellSize / 2)
                );
            }
        }
        
        // Рисуем ячейки
        for (let week = 0; week < grid.length; week++) {
            for (let day = 0; day < 7; day++) {
                const level = grid[week][day] || 0;
                const x = week * (cellSize + cellSpacing) + 30;
                const y = day * (cellSize + cellSpacing) + 25;
                
                ctx.fillStyle = colors[level];
                ctx.fillRect(x, y, cellSize, cellSize);
                
                // Добавляем обводку
                ctx.strokeStyle = getComputedStyle(document.body).getPropertyValue('--border-color');
                ctx.lineWidth = 0.5;
                ctx.strokeRect(x, y, cellSize, cellSize);
            }
        }
    }
    
    /**
     * Рендеринг графика в SVG
     * @param {Object} chart - Объект графика
     * @param {SVGElement} svg - SVG элемент
     */
    renderChartToSVG(chart, svg) {
        const svgNS = 'http://www.w3.org/2000/svg';
        
        // Получаем данные графика
        const grid = chart.grid;
        const cellSize = chart.cellSize;
        const cellSpacing = chart.cellSpacing;
        
        // Получаем цвета контрибуций
        const colors = [];
        for (let i = 0; i <= 4; i++) {
            colors.push(getComputedStyle(document.body).getPropertyValue(`--contribution-${i}`));
        }
        
        // Создаем группу для месяцев
        const monthsGroup = document.createElementNS(svgNS, 'g');
        monthsGroup.setAttribute('class', 'months');
        
        // Добавляем месяцы
        const months = chart.months;
        months.forEach(month => {
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', month.x * (cellSize + cellSpacing) + (cellSize / 2));
            text.setAttribute('y', 15);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('font-size', '10px');
            text.setAttribute('fill', getComputedStyle(document.body).getPropertyValue('--text-color'));
            text.textContent = month.name;
            monthsGroup.appendChild(text);
        });
        
        svg.appendChild(monthsGroup);
        
        // Создаем группу для дней недели
        const daysGroup = document.createElementNS(svgNS, 'g');
        daysGroup.setAttribute('class', 'days');
        
        // Добавляем дни недели
        const days = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
        for (let i = 0; i < 7; i++) {
            if (days[i]) {
                const text = document.createElementNS(svgNS, 'text');
                text.setAttribute('x', 25);
                text.setAttribute('y', i * (cellSize + cellSpacing) + 30 + (cellSize / 2));
                text.setAttribute('text-anchor', 'end');
                text.setAttribute('font-size', '10px');
                text.setAttribute('fill', getComputedStyle(document.body).getPropertyValue('--text-color'));
                text.textContent = days[i];
                daysGroup.appendChild(text);
            }
        }
        
        svg.appendChild(daysGroup);
        
        // Создаем группу для ячеек
        const cellsGroup = document.createElementNS(svgNS, 'g');
        cellsGroup.setAttribute('class', 'cells');
        
        // Добавляем ячейки
        for (let week = 0; week < grid.length; week++) {
            for (let day = 0; day < 7; day++) {
                const level = grid[week][day] || 0;
                const x = week * (cellSize + cellSpacing) + 30;
                const y = day * (cellSize + cellSpacing) + 25;
                
                const rect = document.createElementNS(svgNS, 'rect');
                rect.setAttribute('x', x);
                rect.setAttribute('y', y);
                rect.setAttribute('width', cellSize);
                rect.setAttribute('height', cellSize);
                rect.setAttribute('fill', colors[level]);
                rect.setAttribute('stroke', getComputedStyle(document.body).getPropertyValue('--border-color'));
                rect.setAttribute('stroke-width', '0.5');
                
                cellsGroup.appendChild(rect);
            }
        }
        
        svg.appendChild(cellsGroup);
    }
    
    /**
     * Добавление метаданных на canvas
     * @param {CanvasRenderingContext2D} ctx - Контекст canvas
     * @param {Object} chart - Объект графика
     * @param {number} width - Ширина графика
     */
    addMetadataToCanvas(ctx, chart, width) {
        const footerY = chart.element.getBoundingClientRect().height - 15;
        
        ctx.font = '10px Arial';
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-color-secondary');
        ctx.textAlign = 'center';
        
        const text = 'Created with GitHub Contribution Graph Art Designer';
        ctx.fillText(text, width / 2, footerY);
    }
    
    /**
     * Добавление метаданных в SVG
     * @param {SVGElement} svg - SVG элемент
     * @param {Object} chart - Объект графика
     * @param {number} width - Ширина графика
     */
    addMetadataToSVG(svg, chart, width) {
        const svgNS = 'http://www.w3.org/2000/svg';
        const footerY = chart.element.getBoundingClientRect().height - 15;
        
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', width / 2);
        text.setAttribute('y', footerY);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '10px');
        text.setAttribute('fill', getComputedStyle(document.body).getPropertyValue('--text-color-secondary'));
        text.textContent = 'Created with GitHub Contribution Graph Art Designer';
        
        svg.appendChild(text);
    }
    
    /**
     * Получение стилей для SVG
     * @returns {string} - CSS стили
     */
    getChartStyles() {
        return `
            text {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                font-size: 10px;
            }
            .months text {
                text-anchor: middle;
            }
            .days text {
                text-anchor: end;
            }
        `;
    }
    
    /**
     * Скачивание Data URL как файла
     * @param {string} dataURL - Data URL
     * @param {string} filename - Имя файла
     */
    downloadDataURL(dataURL, filename) {
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Экспортируем синглтон
export default new ExportUtils(); 