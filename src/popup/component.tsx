import React, { FunctionComponent } from "react";

import { Hello } from "@src/components/hello";
import { GlobalStyle, ExtensionContainer } from "@src/styles/styles";
import { browser } from "webextension-polyfill-ts";

export const Popup: FunctionComponent = () => {
  // Sends the `popupMounted` event
  React.useEffect(() => {
    browser.runtime.sendMessage({ popupMounted: true });
  }, []);

  return (
    <ExtensionContainer>
      <Hello />
      <GlobalStyle />
    </ExtensionContainer>
  );
};
