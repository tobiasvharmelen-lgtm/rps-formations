import { LocalGame } from "./LocalGame.js";
import { OnlineGame } from "./OnlineGame.js";

const menu = document.getElementById("menu")!;
const btnPractice = document.getElementById("btn-practice")!;
const btnOnline = document.getElementById("btn-online")!;

btnPractice.addEventListener("click", async () => {
  menu.style.display = "none";
  const game = new LocalGame();
  await game.init();
  game.start();
});

btnOnline.addEventListener("click", async () => {
  menu.style.display = "none";
  const game = new OnlineGame();
  await game.init();
  game.start();
});
