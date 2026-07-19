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

    if ((e.code === "Space" || e.key === " ") && onSpacePressed) {
      e.preventDefault();
      onSpacePressed();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
  });
}

export function initMobileControls(canvas) {
  // Mobile support is disabled for jam submission
  // TODO: Re-enable once mobile UI is fixed

  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    // Show a "desktop only" message
    document.getElementById("warning-content").innerHTML = `
      <h2>💻 DESKTOP ONLY</h2>
      <p>Shifting Shadows is designed for desktop with keyboard controls.</p>
      <p>Mobile support is coming in a future update.</p>
      <p>Please play on a computer with a keyboard.</p>
    `;
    // Hide the accept button since they can't play anyway
    document.getElementById("accept-warning-button").style.display = "none";
    return;
  }

  // Desktop — no mobile controls needed
}
