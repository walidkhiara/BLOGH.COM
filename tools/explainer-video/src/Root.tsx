import "@fontsource/archivo/800.css";
import "@fontsource/archivo/900.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import { Composition, continueRender, delayRender } from "remotion";
import { IzavenExplainer } from "./Composition";

const handle = delayRender("fonts");
Promise.all(
  ["800 20px Archivo", "900 20px Archivo", "400 20px Inter", "600 20px Inter", "700 20px Inter", "800 20px Inter"].map((f) => document.fonts.load(f)),
).then(() => continueRender(handle));

export const RemotionRoot: React.FC = () => (
  <Composition id="IzavenExplainer" component={IzavenExplainer} durationInFrames={1200} fps={30} width={1920} height={1080} />
);
