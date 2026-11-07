import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// Three.js needs a GL backend in headless Chrome.
Config.setChromiumOpenGlRenderer("angle");
