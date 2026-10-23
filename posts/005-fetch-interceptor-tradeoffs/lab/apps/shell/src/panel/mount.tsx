import { createRoot } from "react-dom/client";
import { ControlPanel } from "./ControlPanel";

export const mountPanel = (el: HTMLElement) => createRoot(el).render(<ControlPanel />);
