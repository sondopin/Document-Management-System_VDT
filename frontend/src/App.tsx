import React from "react";
import createRoutes from "./routes";

const App: React.FC = () => {
  const routes = createRoutes();
  return <div>{routes}</div>;
};

export default App;
