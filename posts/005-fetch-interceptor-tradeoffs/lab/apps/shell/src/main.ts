import "@shop-lab/ui/styles.css";
import { injectImportMap, parseLab } from "./variant";

// O import map precisa existir antes de qualquer import() de nome simples.
const lab = parseLab();
(globalThis as { __LAB__?: unknown }).__LAB__ = lab;
injectImportMap(lab);
await import("./root-config");
