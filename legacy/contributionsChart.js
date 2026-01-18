// Enhanced ContributionsChart class
class ContributionsChart {
    constructor(options = {}) {
        this.container = options.container || document.getElementById('contributions-grid');
        this.block = options.block || {
            width: 12,
            height: 12,
            spacing: 2
        };
        this.colors = options.colors || ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
        this.darkColors = options.darkColors || ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
        this.weekDayNames = options.weekDayNames || ['', 'Mon', '', 'Wed', '', 'Fri', ''];
        this.monthNames = options.monthNames || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        this.startDate = null;
        this.endDate = null;
        this.grid = [];
        this.mode = options.mode || 'last'; // 'last', 'year', 'multi'
        this.year = options.year || new Date().getFullYear();
        this.multiMode = options.multiMode || 'overlay'; // 'overlay', 'continuation'
        this.selectedYears = options.selectedYears || [];

        // Set up dates based on mode
        this.setupDates();
    }

    setupDates() {
        const now = new Date();

        if (this.mode === 'last') {
            // Last 365 days
            this.endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            this.startDate = new Date(this.endDate);
            this.startDate.setDate(this.startDate.getDate() - 364);
        } else if (this.mode === 'year') {
            // Specific year
            this.startDate = new Date(this.year, 0, 1);
            this.endDate = new Date(this.year, 11, 31);
        } else if (this.mode === 'multi') {
            this.setupMultiYear();
        }
    }

    setupMultiYear() {
        if (this.selectedYears.length === 0) {
            // Default to current year if no years selected
            this.selectedYears = [new Date().getFullYear()];
        }

        if (this.multiMode === 'overlay') {
            // For overlay, we use the first day of the earliest year to the last day of the latest year
            const years = [...this.selectedYears].sort();
            this.startDate = new Date(years[0], 0, 1);
            this.endDate = new Date(years[years.length - 1], 11, 31);
        } else if (this.multiMode === 'continuation') {
            // For continuation, we use the first day of the first year to the last day of the last year
            const years = [...this.selectedYears].sort();
            this.startDate = new Date(years[0], 0, 1);
            this.endDate = new Date(years[years.length - 1], 11, 31);
        }
    }

    plot() {
        if (!this.container) return;

        // Clear container
        this.container.innerHTML = '';

        // Calculate the number of weeks needed
        const totalDays = Math.floor((this.endDate - this.startDate) / (24 * 60 * 60 * 1000)) + 1;
        const totalWeeks = Math.ceil(totalDays / 7);

        // Create grid structure
        this.grid = Array(totalWeeks).fill().map(() => Array(7).fill(0));

        // Create container elements
        const gridWrapper = document.createElement('div');
        gridWrapper.className = 'contributions-grid-wrapper';

        // Add weekday labels
        const weekdayLabels = document.createElement('div');
        weekdayLabels.className = 'weekday-labels';

        this.weekDayNames.forEach(day => {
            const label = document.createElement('div');
            label.className = 'weekday-label';
            label.textContent = day;
            weekdayLabels.appendChild(label);
        });

        gridWrapper.appendChild(weekdayLabels);

        // Create the grid container
        const gridContainer = document.createElement('div');
        gridContainer.className = 'grid-container';

        // Add month labels at the top
        const monthLabelsContainer = document.createElement('div');
        monthLabelsContainer.className = 'month-labels';

        // Track the current month for labels
        let currentMonth = -1;
        let currentYear = -1;
        let monthLabelWidth = 0;

        // Create all cells
        for (let week = 0; week < totalWeeks; week++) {
            const weekEl = document.createElement('div');
            weekEl.className = 'week';

            for (let day = 0; day < 7; day++) {
                const date = new Date(this.startDate);
                date.setDate(date.getDate() + (week * 7) + day);

                // Check if the month has changed to add month label
                if (date.getMonth() !== currentMonth || date.getFullYear() !== currentYear) {
                    currentMonth = date.getMonth();
                    currentYear = date.getFullYear();

                    const monthLabel = document.createElement('div');
                    monthLabel.className = 'month-label';

                    // Add year to label for multi-year views
                    if (this.mode === 'multi' || (this.endDate.getFullYear() - this.startDate.getFullYear() > 0)) {
                        monthLabel.textContent = `${this.monthNames[currentMonth]} ${currentYear}`;
                    } else {
                        monthLabel.textContent = this.monthNames[currentMonth];
                    }

                    // Position month label
                    monthLabel.style.left = `${week * (this.block.width + this.block.spacing)}px`;
                    monthLabelsContainer.appendChild(monthLabel);

                    // Keep track of the rightmost label for container width
                    monthLabelWidth = week * (this.block.width + this.block.spacing);
                }

                // Only add the cell if it's within our date range
                if (date >= this.startDate && date <= this.endDate) {
                    this.addCell(weekEl, week, day, date);
                }
            }

            gridContainer.appendChild(weekEl);
        }

        // Set the width of the month labels container
        monthLabelsContainer.style.width = `${monthLabelWidth + 100}px`;

        gridWrapper.appendChild(monthLabelsContainer);
        gridWrapper.appendChild(gridContainer);
        this.container.appendChild(gridWrapper);

        // If we're in overlay mode, display the years
        if (this.mode === 'multi' && this.multiMode === 'overlay' && this.selectedYears.length > 0) {
            this.displayOverlayYears();
        }
    }

    addCell(weekEl, week, day, date) {
        const cell = document.createElement('div');
        cell.className = 'contribution-cell';
        cell.dataset.week = week;
        cell.dataset.day = day;
        cell.dataset.date = this.formatDate(date);
        cell.dataset.level = 0;

        // Style the cell
        cell.style.width = `${this.block.width}px`;
        cell.style.height = `${this.block.height}px`;

        // Don't allow editing future dates
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (date > now) {
            cell.classList.add('future-date');
            if (document.getElementById('only-past-days').checked) {
                cell.style.opacity = '0.5';
            }
        } else {
            // Add event listeners for editing
            cell.addEventListener('mousedown', this.handleCellMouseDown.bind(this));
            cell.addEventListener('mouseenter', this.handleCellMouseEnter.bind(this));
            cell.addEventListener('click', this.handleCellClick.bind(this));
        }

        // Set the color based on the contribution level
        const level = this.grid[week][day];
        const colors = document.body.dataset.theme === 'dark' ? this.darkColors : this.colors;
        cell.style.backgroundColor = colors[level];

        // Add tooltip with date and contribution count
        cell.title = `${date.toDateString()}: ${level} contributions`;

        weekEl.appendChild(cell);
    }

    displayOverlayYears() {
        // Clear existing overlay data
        const cells = this.container.querySelectorAll('.contribution-cell');
        cells.forEach(cell => {
            const week = parseInt(cell.dataset.week);
            const day = parseInt(cell.dataset.day);
            const date = new Date(cell.dataset.date);
            const month = date.getMonth();
            const dayOfMonth = date.getDate();

            // Check if this date exists in any of the selected years
            let maxLevel = 0;

            this.selectedYears.forEach(year => {
                const overlayDate = new Date(year, month, dayOfMonth);
                const key = this.formatDate(overlayDate);

                if (overlayData[key] !== undefined) {
                    maxLevel = Math.max(maxLevel, overlayData[key]);
                }
            });

            // Update cell with the maximum level from all years
            if (maxLevel > 0) {
                this.grid[week][day] = maxLevel;
                cell.dataset.level = maxLevel;

                const colors = document.body.dataset.theme === 'dark' ? this.darkColors : this.colors;
                cell.style.backgroundColor = colors[maxLevel];
            }
        });
    }

    getColorForLevel(level) {
        const colors = document.body.dataset.theme === 'dark' ? this.darkColors : this.colors;
        return colors[level] || colors[0];
    }

    formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    handleCellMouseDown(e) {
        const cell = e.target;
        const week = parseInt(cell.dataset.week);
        const day = parseInt(cell.dataset.day);
        const currentLevel = parseInt(cell.dataset.level);

        // Determine the new level (cycle through 0-4)
        const newLevel = (currentLevel + 1) % 5;

        // Update the cell
        this.updateCell(cell, week, day, newLevel);

        // Start dragging with this level
        this.isDragging = true;
        this.dragLevel = newLevel;

        // Save the date and level to overlayData
        const date = new Date(cell.dataset.date);
        const key = this.formatDate(date);
        overlayData[key] = newLevel;

        // Prevent default to avoid text selection while dragging
        e.preventDefault();

        // Save state after edit
        StateManager.saveState();
    }

    handleCellMouseEnter(e) {
        if (!this.isDragging) return;

        const cell = e.target;
        const week = parseInt(cell.dataset.week);
        const day = parseInt(cell.dataset.day);

        // Update the cell with the drag level
        this.updateCell(cell, week, day, this.dragLevel);

        // Save the date and level to overlayData
        const date = new Date(cell.dataset.date);
        const key = this.formatDate(date);
        overlayData[key] = this.dragLevel;
    }

    handleCellClick(e) {
        // This is handled by mousedown for single clicks
    }

    updateCell(cell, week, day, level) {
        this.grid[week][day] = level;
        cell.dataset.level = level;

        const colors = document.body.dataset.theme === 'dark' ? this.darkColors : this.colors;
        cell.style.backgroundColor = colors[level];

        // Update tooltip
        const date = new Date(cell.dataset.date);
        cell.title = `${date.toDateString()}: ${level} contributions`;

        // Update total contributions count
        updateContributions();
    }

    stopDragging() {
        this.isDragging = false;

        // Save state after drag operation is complete
        StateManager.saveState();
    }
}

// Add global mouse up handler to stop dragging
document.addEventListener('mouseup', () => {
    if (window.contributionsChart) {
        window.contributionsChart.stopDragging();
    }
});

export default ContributionsChart;