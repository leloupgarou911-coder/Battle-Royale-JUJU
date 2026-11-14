import "./style.css";
import { Game } from "./game/Game";

const container = document.querySelector<HTMLDivElement>("#game-container");
const startButton = document.querySelector<HTMLButtonElement>("#start-button");
const intro = document.querySelector<HTMLElement>("#intro");
const controlsHelp = document.querySelector<HTMLElement>("#controls-help");
const loading = document.querySelector<HTMLElement>("#loading");
const coordinates = document.querySelector<HTMLElement>("#coordinates");

if (!container || !startButton || !intro || !controlsHelp || !loading || !coordinates) {
  throw new Error("Impossible d'initialiser l'interface du jeu.");
}

const game = new Game(container, (x, z) => {
  coordinates.textContent = `X ${Math.round(x)} · Z ${Math.round(z)}`;
});

loading.hidden = true;

startButton.addEventListener("click", () => {
  intro.classList.add("is-hidden");
  controlsHelp.classList.add("is-visible");
  game.start();
});

window.addEventListener("beforeunload", () => game.dispose());