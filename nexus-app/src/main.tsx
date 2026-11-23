import { createRoot } from "react-dom/client";
import { installLinkGuard } from "./lib/linkGuard";
import OpIntelApp from "./opintel/OpIntelApp";
import "./index.css";

installLinkGuard();
// OpIntelApp brings its own router (basename /opintel) and access gate.
createRoot(document.getElementById("root")!).render(<OpIntelApp />);
