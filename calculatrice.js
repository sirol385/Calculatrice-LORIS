function isVercel() {
    return window.location.hostname.includes('vercel.app');
}
function updateHomeButton() {
    const homeButton = document.querySelector('.back-button');
    if (homeButton && isVercel()) {
        homeButton.href = 'https://accueil-loris.vercel.app';
    }
}
const display = document.getElementById("display");
const buttons = document.querySelectorAll(".basic button, .scientific button");
const clearBtn = document.getElementById("clear");
const clearAllBtn = document.getElementById("clear-all");
const toggleModeBtn = document.getElementById("toggle-mode");
const scientificSection = document.querySelector(".scientific");
let isScientific = false;
buttons.forEach(btn => {
  btn.addEventListener("click", () => {
    const value = btn.textContent;
    if (value === "=") {
      try {
        display.value = eval(display.value.replace("^", "**"));
      } catch {
        display.value = "Erreur";
      }
    } else if (value === "C") {
      display.value = "";
    } else if (value === "√") {
      display.value = Math.sqrt(parseFloat(display.value) || 0);
    } else if (value === "x²") {
      display.value = Math.pow(parseFloat(display.value) || 0, 2);
    } else if (value === "sin") {
      display.value = Math.sin(toRadians(display.value)).toFixed(5);
    } else if (value === "cos") {
      display.value = Math.cos(toRadians(display.value)).toFixed(5);
    } else if (value === "tan") {
      display.value = Math.tan(toRadians(display.value)).toFixed(5);
    } else if (value === "ln") {
      display.value = Math.log(parseFloat(display.value) || 1).toFixed(5);
    } else if (value === "log") {
      display.value = Math.log10(parseFloat(display.value) || 1).toFixed(5);
    } else if (value === "π") {
      display.value += Math.PI.toFixed(5);
    } else {
      if (display.value === "Erreur") display.value = "";
      display.value += value;
    }
  });
});
function toRadians(deg) {
  return (deg * Math.PI) / 180;
}
toggleModeBtn.addEventListener("click", () => {
  isScientific = !isScientific;
  scientificSection.classList.toggle("hidden");
  toggleModeBtn.textContent = isScientific
    ? "🔢 Mode basique"
    : "🔬 Mode scientifique";
});
if (clearAllBtn) {
  clearAllBtn.addEventListener('click', () => {
    display.value = '';
  });
}
document.addEventListener('DOMContentLoaded', updateHomeButton);