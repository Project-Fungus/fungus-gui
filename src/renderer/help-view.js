function showHelpView() {
    document.getElementById("help-view").classList.remove("hide");
}

function hideHelpView() {
    document.getElementById("help-view").classList.add("hide");
}

export { showHelpView, hideHelpView };
