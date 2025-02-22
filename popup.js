/**
 * Calendar class to parse ICS files.
 * It extracts the calendar title and events from the ICS file.
 */
class Calendar {
    constructor(file) {
        this.events = [];
        this.title = "";
        if (file) {
            this.loadICS(file);
        }
    }

    loadICS(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = e.target.result;
            this.parseICS(data);
        };
        reader.readAsText(file);
    }

    parseICS(data) {
        this.events = [];
        const lines = data.split(/\r?\n/);
        let currentEvent = null;
        lines.forEach(line => {
            const [key, value] = line.split(":", 2);
            if (key === "X-WR-CALNAME") {
                this.title = value;
            } else if (line === "BEGIN:VEVENT") {
                currentEvent = {};
            } else if (line === "END:VEVENT") {
                if (currentEvent) {
                    currentEvent.calendarTitle = this.title;
                    this.events.push(currentEvent);
                    currentEvent = null;
                }
            } else if (key === "DTSTART;VALUE=DATE") {
                if (currentEvent) currentEvent.start = value;
            } else if (key === "DTEND;VALUE=DATE") {
                if (currentEvent) currentEvent.end = value;
            } else if (key === "SUMMARY") {
                if (currentEvent) currentEvent.name = value;
            }
        });
    }

    getEvents() {
        return this.events;
    }

    getTitle() {
        return this.title;
    }
}

// Global array to store loaded calendars
let loadedCalendars = [];

/**
 * Restore settings when the popup is opened.
 */
document.addEventListener("DOMContentLoaded", () => {
    chrome.storage.sync.get(["loadedCalendars", "dayColors", "calendarColors"], (result) => {
        // Restore calendars
        loadedCalendars = (result.loadedCalendars || []).map(cal => {
            const calendar = new Calendar(""); // Create an empty instance
            calendar.title = cal.title;
            calendar.events = cal.events;
            return calendar;
        });

        displayCalendarSettings();

        // Restore day colors
        const dayColors = result.dayColors || {};
        document.querySelectorAll('input[type="checkbox"][name="days"]').forEach(checkbox => {
            const day = checkbox.value;
            if (dayColors[day]) {
                checkbox.checked = true;
                const colorInput = document.querySelector(`select[name="color-${day}"]`);
                colorInput.value = dayColors[day];
                colorInput.disabled = false;
            }
        });

        // Restore calendar colors
        const calendarColors = result.calendarColors || {};
        document.querySelectorAll('input[type="checkbox"][name="calendars"]').forEach(checkbox => {
            const calTitle = checkbox.value;
            if (calendarColors[calTitle]) {
                checkbox.checked = true;
                const colorInput = document.querySelector(`select[name="color-${calTitle}"]`);
                colorInput.value = calendarColors[calTitle];
            }
        });
    });
});

/**
 * Displays calendar settings by creating a checkbox and color input for each loaded calendar.
 */
function displayCalendarSettings() {
    const calendarSettingsDiv = document.getElementById("calendarSettings");
    calendarSettingsDiv.innerHTML = "";
    if (loadedCalendars.length === 0) {
        calendarSettingsDiv.innerHTML = "<p>No calendars loaded.</p>";
        return;
    }
    loadedCalendars.forEach((calendar, index) => {
        const div = document.createElement("div");
        div.className = "d-flex justify-content-between align-items-center alert alert-primary rounded-4";
        div.innerHTML = `
            <div class="form-check form-switch">
                <input class="form-check-input" type="checkbox" id="cal-${calendar.getTitle()}" name="calendars" value="${calendar.getTitle()}" checked>
                <label class="form-check-label ms-2" for="cal-${calendar.getTitle()}">${calendar.getTitle()}</label>
            </div>
            <select type="color" name="color-${calendar.getTitle()}" class="form-select form-select-sm w-auto pastel-colors">
                <optgroup label="🌑 Modo Oscuro">
                    <option value="rgba(128, 102, 161, 0.7)" style="background-color: rgba(128, 102, 161, 1); color: #fff;">Muted Violet</option>
                    <option value="rgba(108, 140, 140, 0.7)" style="background-color: rgba(108, 140, 140, 1); color: #fff;">Dusty Teal</option>
                    <option value="rgba(110, 130, 180, 0.7)" style="background-color: rgba(110, 130, 180, 1); color: #fff;">Slate Blue</option>
                    <option value="rgba(134, 144, 102, 0.7)" style="background-color: rgba(134, 144, 102, 1); color: #fff;">Soft Olive</option>
                    <option value="rgba(170, 112, 126, 0.7)" style="background-color: rgba(170, 112, 126, 1); color: #fff;">Muted Rose</option>
                </optgroup>
                <optgroup label="🌕 Modo Claro">
                    <option value="rgba(225, 206, 187, 0.7)" style="background-color: rgba(225, 206, 187, 1); color: #000;">Warm Sand</option>
                    <option value="rgba(192, 210, 230, 0.7)" style="background-color: rgba(192, 210, 230, 1); color: #000;">Pale Blue</option>
                    <option value="rgba(232, 185, 185, 0.7)" style="background-color: rgba(232, 185, 185, 1); color: #000;">Blush Coral</option>
                    <option value="rgba(244, 230, 190, 0.7)" style="background-color: rgba(244, 230, 190, 1); color: #000;">Soft Butter</option>
                    <option value="rgba(221, 204, 230, 0.7)" style="background-color: rgba(221, 204, 230, 1); color: #000;">Powder Lavender</option>
                </optgroup>
            </select>
            <button class="btn btn-danger btn-sm ms-2 remove-calendar" data-index="${index}">X</button>`;
        calendarSettingsDiv.appendChild(div);
    });

    // Añadir event listener a cada botón de eliminar
    document.querySelectorAll(".remove-calendar").forEach(button => {
        button.addEventListener("click", (event) => {
            const indexToRemove = parseInt(event.target.dataset.index, 10);
            removeCalendar(indexToRemove);
        });
    });
}

function removeCalendar(index) {
    if (index < 0 || index >= loadedCalendars.length) return;

    // Eliminar el calendario de la lista
    loadedCalendars.splice(index, 1);

    // Guardar los cambios en chrome.storage.sync
    const storedCalendars = loadedCalendars.map(cal => ({
        title: cal.getTitle(),
        events: cal.getEvents()
    }));

    chrome.storage.sync.set({ loadedCalendars: storedCalendars }, () => {
        console.log("Calendar removed successfully.");
        displayCalendarSettings(); // Volver a renderizar la lista sin el eliminado
    });
}

// Load calendar file when the button is clicked
document.getElementById("loadCalendarBtn").addEventListener("click", () => {
    const fileInput = document.getElementById("calendarFile");
    if (fileInput.files.length === 0) {
        alert("Please select a file.");
        return;
    }
    const file = fileInput.files[0];
    const calendar = new Calendar(file);
    
    setTimeout(() => {
        loadedCalendars.push(calendar);

        // Convert calendar objects to simple objects for storage
        const storedCalendars = loadedCalendars.map(cal => ({
            title: cal.getTitle(),
            events: cal.getEvents()
        }));

        chrome.storage.sync.set({ loadedCalendars: storedCalendars }, () => {
            displayCalendarSettings();
        });
    }, 500);
});

// Enable/disable color pickers for day settings when checkboxes change
document.querySelectorAll('input[type="checkbox"][name="days"]').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
        const day = e.target.value;
        const colorInput = document.querySelector(`select[name="color-${day}"]`);
        colorInput.disabled = !e.target.checked;
    });
});

// Save settings (both day and calendar colors) to chrome.storage
document.getElementById("settingsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    
    // Gather day color settings
    const dayColors = {};
    document.querySelectorAll('input[type="checkbox"][name="days"]').forEach(checkbox => {
        if (checkbox.checked) {
            const day = checkbox.value;
            const color = document.querySelector(`select[name="color-${day}"]`).value;
            dayColors[day] = color;
        }
    });
    
    // Gather calendar color settings
    const calendarColors = {};
    document.querySelectorAll('input[type="checkbox"][name="calendars"]').forEach(checkbox => {
        if (checkbox.checked) {
            const calTitle = checkbox.value;
            const color = document.querySelector(`select[name="color-${calTitle}"]`).value;
            calendarColors[calTitle] = color;
        }
    });
    
    // Gather all events from loaded calendars
    let calendarEvents = [];
    loadedCalendars.forEach(calendar => {
        calendarEvents = calendarEvents.concat(calendar.getEvents());
    });

    // Convert loaded calendars for storage
    const storedCalendars = loadedCalendars.map(cal => ({
        title: cal.getTitle(),
        events: cal.getEvents()
    }));

    // Save everything in chrome.storage
    chrome.storage.sync.set({ dayColors, calendarColors, calendarEvents, loadedCalendars: storedCalendars }, () => {
        // Reload the active tab to apply the new settings
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs.length > 0) {
                chrome.tabs.reload(tabs[0].id);
            }
        });

        // Close the popup after saving changes
        setTimeout(() => {
            window.close();
        }, 500); // Small delay to ensure changes are applied before closing
    });
});
