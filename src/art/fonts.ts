// Channel fonts (Google Fonts via @remotion/google-fonts, fetched at render time).
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const m = loadMontserrat("normal", { weights: ["800", "900"], subsets: ["latin"] });
const j = loadMono("normal", { weights: ["700"], subsets: ["latin"] });

export const UI_FONT = `${m.fontFamily}, 'Arial Black', Arial, sans-serif`; // captions, labels, cards
export const MONO_FONT = `${j.fontFamily}, Menlo, monospace`; // system labels: "DEC · 16:18"
