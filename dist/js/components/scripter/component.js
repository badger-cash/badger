"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var webextension_polyfill_ts_1 = require("webextension-polyfill-ts");
/**
 * Executes a string of Javascript on the current tab
 * @param code The string of code to execute on the current tab
 */
function executeScript(code) {
    // Query for the active tab in the current window
    webextension_polyfill_ts_1.browser.tabs
        .query({ active: true, currentWindow: true })
        .then(function (tabs) {
        // Pulls current tab from browser.tabs.query response
        var currentTab = tabs[0];
        // Short circuits function execution is current tab isn't found
        if (!currentTab) {
            return;
        }
        // Executes the script in the current tab
        webextension_polyfill_ts_1.browser.tabs
            .executeScript(currentTab.id, {
            code: code
        })
            .then(function () {
            console.log("Done Scrolling");
        });
    });
}
exports.Scripter = function () {
    return (react_1.default.createElement("div", { className: "row" },
        react_1.default.createElement("button", { className: "", onClick: function () { return executeScript("window.scroll(0,9999999)"); } }, "Script")));
};
//# sourceMappingURL=component.js.map