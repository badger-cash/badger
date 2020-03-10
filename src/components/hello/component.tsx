import React, { FunctionComponent } from "react";
import styled from "styled-components";

export const Hello: FunctionComponent = () => {
  return (
    <Red>
      <h1 className="">Example Header text</h1>
    </Red>
  );
};

export const Red = styled.div`
  color: red;
`;
