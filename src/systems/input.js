// ============================================
// Input System — Keyboard + Mobile
// ============================================

export const keys = {};

let onSpacePressed = null;

export function setSpaceCallback(callback) {
  onSpacePressed = callback;
}

export function initInput() {
  window.addEventListener("keydown", (e) => {
    keys[e.key.toLowerCase()] = true;

    // Handle space
    if ((e.code === "Space" || e.key === " ") && onSpacePressed) {
      e.preventDefault();
      onSpacePressed();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
    if (e.key.toLowerCase() === "e") keys["e"] = false;
    if (e.key.toLowerCase() === "f") keys["f"] = false;
  });
}

export function initMobileControls(canvas) {
  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    window.innerWidth < 768;

  if (isMobile) {
    document.getElementById("mobile-controls").classList.remove("hidden");
    const scale = Math.min(
      window.innerWidth / canvas.width,
      window.innerHeight / canvas.height,
    );
    document.getElementById("game-wrapper").style.transform = `scale(${scale})`;
    document.getElementById("game-wrapper").style.transformOrigin = "top left";
  }

  const joystickThumb = document.getElementById("joystick-thumb");
  const joystickBase = document.getElementById("joystick-base");
  let joystickActive = false;
  let joystickOrigin = { x: 0, y: 0 };

  joystickBase.addEventListener("touchstart", (e) => {
    joystickActive = true;
    joystickOrigin = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  });

  joystickBase.addEventListener(
    "touchmove",
    (e) => {
      if (!joystickActive) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - joystickOrigin.x;
      const dy = touch.clientY - joystickOrigin.y;
      const dist = Math.min(40, Math.sqrt(dx * dx + dy * dy));
      const angle = Math.atan2(dy, dx);
      joystickThumb.style.transform = `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px)`;
      keys["w"] = dy < -10;
      keys["s"] = dy > 10;
      keys["a"] = dx < -10;
      keys["d"] = dx > 10;
    },
    { passive: false },
  );

  joystickBase.addEventListener("touchend", () => {
    joystickActive = false;
    joystickThumb.style.transform = "translate(0px, 0px)";
    keys["w"] = false;
    keys["s"] = false;
    keys["a"] = false;
    keys["d"] = false;
  });

  document.getElementById("mobile-run").addEventListener("touchstart", () => {
    keys["shift"] = true;
  });
  document.getElementById("mobile-run").addEventListener("touchend", () => {
    keys["shift"] = false;
  });
  document
    .getElementById("mobile-candle")
    .addEventListener("touchstart", () => {
      keys["e"] = true;
    });
  document.getElementById("mobile-candle").addEventListener("touchend", () => {
    keys["e"] = false;
  });
  document.getElementById("mobile-rock").addEventListener("touchstart", () => {
    keys["f"] = true;
  });
  document.getElementById("mobile-rock").addEventListener("touchend", () => {
    keys["f"] = false;
  });
}
