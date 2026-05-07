import { LocalGame } from "./LocalGame.js";
import { OnlineGame } from "./OnlineGame.js";
import { cameraSettings } from "./render/Camera.js";

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

// ---- Settings overlay ----
const settingsBtn = document.createElement("div");
settingsBtn.id = "settings-btn";
settingsBtn.textContent = "⚙";
Object.assign(settingsBtn.style, {
  position: "fixed", top: "12px", right: "12px", zIndex: "200",
  width: "36px", height: "36px", lineHeight: "36px", textAlign: "center",
  fontSize: "22px", cursor: "pointer",
  background: "rgba(0,0,0,0.55)", color: "#fff",
  borderRadius: "8px", userSelect: "none",
});
document.body.appendChild(settingsBtn);

const settingsPanel = document.createElement("div");
settingsPanel.id = "settings-panel";
Object.assign(settingsPanel.style, {
  position: "fixed", top: "56px", right: "12px", zIndex: "200",
  background: "rgba(20,20,20,0.92)", color: "#eee",
  borderRadius: "10px", padding: "16px 20px",
  display: "none", flexDirection: "column", gap: "10px",
  minWidth: "200px", boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
  fontFamily: "sans-serif", fontSize: "14px",
});

const speedLabel = document.createElement("div");
speedLabel.textContent = "Scroll Speed";
speedLabel.style.fontWeight = "bold";

const speedRow = document.createElement("div");
Object.assign(speedRow.style, { display: "flex", alignItems: "center", gap: "10px" });

const speedSlider = document.createElement("input");
speedSlider.type = "range";
speedSlider.min = "1000";
speedSlider.max = "30000";
speedSlider.step = "1000";
speedSlider.value = String(cameraSettings.panSpeed);
speedSlider.style.flex = "1";

const speedDisplay = document.createElement("span");
speedDisplay.textContent = String(cameraSettings.panSpeed);
speedDisplay.style.minWidth = "40px";

speedSlider.addEventListener("input", () => {
  cameraSettings.panSpeed = +speedSlider.value;
  speedDisplay.textContent = speedSlider.value;
});

speedRow.appendChild(speedSlider);
speedRow.appendChild(speedDisplay);
settingsPanel.appendChild(speedLabel);
settingsPanel.appendChild(speedRow);

// Gold cheat toggle
const cheatRow = document.createElement("div");
Object.assign(cheatRow.style, { display: "flex", alignItems: "center", gap: "8px" });
const cheatCheck = document.createElement("input");
cheatCheck.type = "checkbox";
cheatCheck.id = "cheat-gold-toggle";
const cheatLabel = document.createElement("label");
cheatLabel.htmlFor = "cheat-gold-toggle";
cheatLabel.textContent = "Gold Cheat (G key)";
cheatRow.appendChild(cheatCheck);
cheatRow.appendChild(cheatLabel);
settingsPanel.appendChild(cheatRow);

document.body.appendChild(settingsPanel);

// G key: fire cheat gold when toggle is on
window.addEventListener("keydown", (e) => {
  if (e.key === "g" || e.key === "G") {
    if (cheatCheck.checked) {
      (window as unknown as Record<string, unknown>).__cheatGold?.();
    }
  }
});

settingsBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  settingsPanel.style.display = settingsPanel.style.display === "none" ? "flex" : "none";
});

document.addEventListener("mousedown", (e) => {
  if (!settingsPanel.contains(e.target as Node) && e.target !== settingsBtn) {
    settingsPanel.style.display = "none";
  }
});

// ---- Spawn key HUD ----
const hudEntries = [
  { key: "Z", label: "Rock",     color: "#e74c3c", shape: "circle"   },
  { key: "X", label: "Paper",    color: "#3498db", shape: "square"   },
  { key: "C", label: "Scissors", color: "#2ecc71", shape: "triangle" },
];

const hud = document.createElement("div");
Object.assign(hud.style, {
  position: "fixed", bottom: "16px", left: "50%", transform: "translateX(-50%)",
  display: "flex", gap: "28px", zIndex: "100",
  fontFamily: "sans-serif", userSelect: "none",
  pointerEvents: "none",
});

for (const { key, label, color, shape } of hudEntries) {
  const entry = document.createElement("div");
  Object.assign(entry.style, {
    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
  });

  const keyBadge = document.createElement("div");
  keyBadge.textContent = `[${key}]`;
  Object.assign(keyBadge.style, {
    fontSize: "12px", color: "#ccc", letterSpacing: "1px",
  });

  const icon = document.createElement("div");
  Object.assign(icon.style, {
    width: "20px", height: "20px", background: color,
  });
  if (shape === "circle") {
    icon.style.borderRadius = "50%";
  } else if (shape === "triangle") {
    icon.style.width = "0";
    icon.style.height = "0";
    icon.style.background = "none";
    icon.style.borderLeft = "10px solid transparent";
    icon.style.borderRight = "10px solid transparent";
    icon.style.borderBottom = `20px solid ${color}`;
  }

  const nameLabel = document.createElement("div");
  nameLabel.textContent = label;
  Object.assign(nameLabel.style, {
    fontSize: "11px", color: "#bbb",
  });

  entry.appendChild(keyBadge);
  entry.appendChild(icon);
  entry.appendChild(nameLabel);
  hud.appendChild(entry);
}

document.body.appendChild(hud);
