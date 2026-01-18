// State Manager for handling application state
const StateManager = {
    history: [],
    currentIndex: -1,
    maxHistorySize: 50,
    autoSaveInterval: null,

    // Save current state to history
    saveState() {
        // Capture the current state
        const state = {
            currentMode: currentMode,
            layoutMode: layoutMode,
            multiMode: multiMode,
            selectedYears: [...selectedYears],
            overlayData: JSON.parse(JSON.stringify(overlayData)),
            data: JSON.parse(JSON.stringify(data)),
            timestamp: new Date().getTime()
        };

        // If we're not at the end of history, truncate the future states
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }

        // Add the new state to history
        this.history.push(state);
        this.currentIndex = this.history.length - 1;

        // Keep history size manageable
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
            this.currentIndex--;
        }

        // Update UI buttons
        this.updateUndoRedoButtons();

        // Save to localStorage if auto-save is enabled
        if (document.getElementById('auto-save').checked) {
            this.saveToLocalStorage();
            showNotification(translations[currentLanguage].project_saved);
        }
    },

    // Undo the last action
    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.restoreState(this.history[this.currentIndex]);
            this.updateUndoRedoButtons();
        }
    },

    // Redo the last undone action
    redo() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            this.restoreState(this.history[this.currentIndex]);
            this.updateUndoRedoButtons();
        }
    },

    // Restore a saved state
    restoreState(state) {
        if (!state) return;

        // Restore mode settings
        currentMode = state.currentMode;
        layoutMode = state.layoutMode;
        multiMode = state.multiMode;
        selectedYears = [...state.selectedYears];

        // Update UI to reflect mode
        document.getElementById('mode-selector').value = currentMode;
        document.getElementById('layout-mode').value = layoutMode;
        document.getElementById('multi-mode').value = multiMode;

        // Restore data
        overlayData = JSON.parse(JSON.stringify(state.overlayData));
        data = JSON.parse(JSON.stringify(state.data));

        // Redraw the grid
        updateModeUI();
        contributionsChart.plot();
    },

    // Update the undo/redo buttons based on history state
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

    // Save state to localStorage
    saveToLocalStorage() {
        try {
            const saveData = {
                currentState: this.history[this.currentIndex],
                savedPatterns: savedPatterns,
                version: '1.0'
            };

            localStorage.setItem('github-art-state', JSON.stringify(saveData));
            return true;
        } catch (e) {
            console.error('Failed to save state to localStorage:', e);
            return false;
        }
    },

    // Load state from localStorage
    loadFromLocalStorage() {
        try {
            const savedData = localStorage.getItem('github-art-state');
            if (!savedData) return false;

            const parsedData = JSON.parse(savedData);

            // Validate the loaded state
            if (!parsedData.currentState || !parsedData.version) {
                return false;
            }

            // Restore saved patterns if available
            if (parsedData.savedPatterns) {
                savedPatterns = parsedData.savedPatterns;
                updateSavedPatternsList();
            }

            // Reset history and add the loaded state
            this.history = [parsedData.currentState];
            this.currentIndex = 0;

            // Restore the state
            this.restoreState(parsedData.currentState);
            this.updateUndoRedoButtons();

            showNotification(translations[currentLanguage].project_loaded);
            return true;
        } catch (e) {
            console.error('Failed to load state from localStorage:', e);
            return false;
        }
    },

    // Start auto-saving at regular intervals
    startAutoSave(intervalMs = 60000) {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
        }

        this.autoSaveInterval = setInterval(() => {
            if (document.getElementById('auto-save').checked) {
                this.saveToLocalStorage();
            }
        }, intervalMs);

        showNotification(translations[currentLanguage].auto_save_enabled);
    },

    // Stop auto-saving
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
            showNotification(translations[currentLanguage].auto_save_disabled);
        }
    }
};

// Initialize with an empty state
StateManager.saveState();

export default StateManager;