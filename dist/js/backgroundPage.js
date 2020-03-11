"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var webextension_polyfill_ts_1 = require("webextension-polyfill-ts");
// Listen for messages sent from other parts of the extension
webextension_polyfill_ts_1.browser.runtime.onMessage.addListener(function (request) {
    // Log statement if request.popupMounted is true
    // NOTE: this request is sent in `popup/component.tsx`
    if (request.popupMounted) {
        console.log("backgroundPage notified that Popup.tsx has mounted.");
    }
});
//# sourceMappingURL=backgroundPage.js.map