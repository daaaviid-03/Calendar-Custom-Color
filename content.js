/**
 * Content script for Google Calendar customization.
 * This script applies custom background colors to calendar day cells based on
 * user settings for day of the week and uploaded calendar events.
 */

window.addEventListener('load', () => {
    console.log('Google Calendar loaded. Applying custom colors...');
    applyCustomColors();

    // Observer to watch for dynamic changes in the calendar DOM
    const observer = new MutationObserver(() => {
        console.log('DOM changes detected. Reapplying custom colors...');
        applyCustomColors();
    });
    const calendarContainer = document.querySelector('div[role="main"]');
    if (calendarContainer) {
        observer.observe(calendarContainer, { childList: true, subtree: true });
        console.log('Observing calendar for changes.');
    } else {
        console.log('Main calendar container not found.');
    }
});

/**
 * Applies custom colors to day cells.
 * It retrieves dayColors, calendarColors, and calendarEvents from storage and
 * applies a background color to cells based on the day of week or matching calendar event.
 */
function applyCustomColors() {
    chrome.storage.sync.get(['dayColors', 'calendarColors', 'calendarEvents'], (result) => {
        const dayColors = result.dayColors || {};
        const calendarColors = result.calendarColors || {};
        const calendarEvents = result.calendarEvents || [];

        // Select day cells (div, h2, or td elements with date info)
        const dayCells = document.querySelectorAll('div[data-datekey], h2[data-datekey], td[data-date]');
        dayCells.forEach(cell => {
            let dateStr = '';
            if (cell.hasAttribute('data-datekey')) {
                const dateKey = parseInt(cell.getAttribute('data-datekey'), 10);
                dateStr = keyToDate(dateKey);
            } else if (cell.hasAttribute('data-date')) {
                dateStr = cell.getAttribute('data-date');
            }
            if (!dateStr) return;

            // Get day of week name from the date string
            const dayName = getWeekDayName(dateStr);
            // Start with dayColors setting if available
            let appliedColor = dayColors[dayName] || null;

            // Override with calendar color if an event exists on this date
            for (let event of calendarEvents) {
                const eventDate = formatICSDate(event.start);
                if (eventDate === dateStr && calendarColors[event.calendarTitle]) {
                    appliedColor = calendarColors[event.calendarTitle];
                    break; // Use the first matching event's color
                }
            }

            // Apply or remove the background color
            if (appliedColor) {
                if (!cell.dataset.customColored) {
                    cell.dataset.customColored = 'true';
                    cell.style.backgroundColor = appliedColor;
                    cell.style.opacity = detectDarkMode() ? '0.7' : '0.9';
                }
            } else if (cell.dataset.customColored) {
                cell.style.backgroundColor = '';
                cell.style.opacity = '';
                delete cell.dataset.customColored;
            }
        });
        console.log('Custom colors applied.');
    });
}

/**
 * Converts a data-datekey number to a date string ("YYYY-M-D").
 * @param {number} dataDateKey 
 * @returns {string} Date string in the format "YYYY-M-D".
 */
function keyToDate(dataDateKey) {
    const yearOffset = (dataDateKey >> 9) & 0xFF;
    const month = (dataDateKey >> 5) & 0x0F;
    const day = dataDateKey & 0x1F;
    const year = 1970 + yearOffset;
    return `${year}-${month}-${day}`;
}

/**
 * Returns the weekday name from a date string.
 * @param {string} dateStr - Date string ("YYYY-M-D" or "YYYY-MM-DD").
 * @returns {string} Weekday name (e.g., Monday).
 */
function getWeekDayName(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Detects if dark mode is active.
 * @returns {boolean} True if dark mode is active.
 */
function detectDarkMode() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Formats an ICS date (YYYYMMDD) to "YYYY-M-D" format.
 * @param {string} icsDate - Date string from ICS file.
 * @returns {string} Formatted date string.
 */
function formatICSDate(icsDate) {
    if (!icsDate || icsDate.length < 8) return '';
    const year = parseInt(icsDate.substring(0, 4), 10);
    const month = parseInt(icsDate.substring(4, 6), 10);
    const day = parseInt(icsDate.substring(6, 8), 10);
    return `${year}-${month}-${day}`;
}
