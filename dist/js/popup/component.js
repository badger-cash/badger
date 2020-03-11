"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = __importDefault(require("react"));
var hello_1 = require("@src/components/hello");
var styles_1 = require("@src/styles/styles");
var webextension_polyfill_ts_1 = require("webextension-polyfill-ts");
exports.Popup = function () {
    // Sends the `popupMounted` event
    react_1.default.useEffect(function () {
        webextension_polyfill_ts_1.browser.runtime.sendMessage({ popupMounted: true });
    }, []);
    return (react_1.default.createElement(styles_1.ExtensionContainer, null,
        react_1.default.createElement(hello_1.Hello, null),
        react_1.default.createElement(styles_1.GlobalStyle, null)));
};
//# sourceMappingURL=component.js.map