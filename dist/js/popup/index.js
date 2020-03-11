"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
var React = __importStar(require("react"));
var ReactDOM = __importStar(require("react-dom"));
var webextension_polyfill_ts_1 = require("webextension-polyfill-ts");
var component_1 = require("./component");
webextension_polyfill_ts_1.browser.tabs.query({ active: true, currentWindow: true }).then(function () {
    ReactDOM.render(React.createElement(component_1.Popup, null), document.getElementById("popup"));
});
//# sourceMappingURL=index.js.map