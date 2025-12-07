import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { sessionManager } from "./utils/sessionManager";
import "./styles/brutalism.css";

sessionManager.init();

window.addEventListener("sessionWarning", (e) => {
  const { timeRemaining } = e.detail;
  console.log(`Session akan berakhir dalam ${timeRemaining} menit`);
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);