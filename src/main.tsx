import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { initializeTheme, ThemeProvider } from "./components/theme-provider";
import "./index.css";

initializeTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);
