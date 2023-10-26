class Warning {
    /**
     * @param {string} warnType
     * @param {string} file
     * @param {string} message
     */
    constructor(warnType, file, message) {
        this.warnType = warnType;
        this.file = file;
        this.message = message;
    }
}

/**
 * Sets the list of warnings that should be displayed.
 *
 * @param {[Warning]} warnings Warnings to display
 */
function setWarnings(warnings) {
    displayWarnings(warnings.sort(compareWarnings));

    const noWarningsElement = document.getElementById("no-warnings-msg");
    const warningsContainer = document.getElementById("warnings-container");
    if (warnings && warnings.length > 0) {
        noWarningsElement.classList.add("hide");
        warningsContainer.classList.remove("hide");
    }
    else {
        warningsContainer.classList.add("hide");
        noWarningsElement.classList.remove("hide");
    }
}

function showWarningsView() {
    document.getElementById("warnings-view").classList.remove("hide");
}

function hideWarningsView() {
    document.getElementById("warnings-view").classList.add("hide");
}

function displayWarnings(warnings) {
    const warningsTableBody = document.getElementById("warnings-tbody");

    const children = Array.from(warningsTableBody.childNodes);
    for (const child of children) {
        if (child.id !== "warnings-tbody-header") {
            warningsTableBody.removeChild(child);
        }
    }

    warnings = warnings || [];
    for (const warning of warnings) {
        const rowElement = document.createElement("tr");

        const typeCell = document.createElement("td");
        typeCell.innerText = warning.warnType;
        rowElement.appendChild(typeCell);

        const fileCell = document.createElement("td");
        fileCell.innerText = warning.file;
        rowElement.appendChild(fileCell);

        const messageCell = document.createElement("td");
        messageCell.innerText = warning.message;
        rowElement.appendChild(messageCell);

        warningsTableBody.appendChild(rowElement);
    }
}

/**
 * @param {Warning} warning1
 * @param {Warning} warning2
 */
function compareWarnings(warning1, warning2) {
    return warning1.warnType.localeCompare(warning2.warnType)
        || warning1.file.localeCompare(warning2.file)
        || warning1.message.localeCompare(warning2.message);
}

export {
    Warning,
    setWarnings,
    showWarningsView,
    hideWarningsView
};
