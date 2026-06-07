
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // This render call mounts the React app into the root HTML element.
  createRoot(document.getElementById("root")!).render(<App />);
  
