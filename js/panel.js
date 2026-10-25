/**
 * Resizable control panel.
 *
 * The panel sits below the viewer in normal flow, so shrinking it hands the
 * space back to the 3D view rather than uncovering it. Dragging the grip
 * resizes; tapping it collapses to the grip alone and back.
 */

const COLLAPSED_PX = 26;   // the grip itself
const TAP_SLOP_PX = 4;     // movement below this counts as a tap, not a drag
const MAX_FRACTION = 0.7;  // never swallow the whole viewport

export function createPanel({ panel, grip }) {
  let drag = null;

  /** Height the panel wants when nothing constrains it. */
  function naturalHeight() {
    const previous = panel.style.height;
    panel.style.height = 'auto';
    const height = panel.offsetHeight;
    panel.style.height = previous;
    return height;
  }

  function limits() {
    return { min: COLLAPSED_PX, max: Math.min(naturalHeight(), window.innerHeight * MAX_FRACTION) };
  }

  function setHeight(px) {
    const { min, max } = limits();
    const height = Math.max(min, Math.min(px, max));
    panel.style.height = `${height}px`;
    grip.setAttribute('aria-expanded', String(height > min + TAP_SLOP_PX));
    return height;
  }

  function collapsed() {
    return grip.getAttribute('aria-expanded') === 'false';
  }

  function toggle() {
    setHeight(collapsed() ? limits().max : COLLAPSED_PX);
  }

  function onPointerDown(event) {
    drag = { startY: event.clientY, startHeight: panel.offsetHeight, moved: 0 };
    try { grip.setPointerCapture(event.pointerId); } catch { /* not capturable */ }
  }

  function onPointerMove(event) {
    if (!drag) return;
    const delta = drag.startY - event.clientY; // up grows the panel
    drag.moved = Math.max(drag.moved, Math.abs(delta));
    setHeight(drag.startHeight + delta);
  }

  function onPointerUp(event) {
    if (!drag) return;
    const wasTap = drag.moved < TAP_SLOP_PX;
    drag = null;
    try { grip.releasePointerCapture(event.pointerId); } catch { /* never captured */ }
    if (wasTap) toggle();
  }

  grip.addEventListener('pointerdown', onPointerDown);
  grip.addEventListener('pointermove', onPointerMove);
  grip.addEventListener('pointerup', onPointerUp);
  grip.addEventListener('pointercancel', onPointerUp);
  // The grip is a button, so it already takes keyboard focus; make it act.
  grip.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggle();
    }
  });

  // Rotating the phone changes what "too tall" means.
  window.addEventListener('resize', () => {
    if (panel.style.height) setHeight(panel.offsetHeight);
  });

  return {
    /**
     * Called when the panel's contents change: an explicit height set earlier
     * would otherwise clip whatever was just added.
     */
    refit() {
      if (panel.style.height && !collapsed()) setHeight(limits().max);
    },
    get height() { return panel.offsetHeight; },
    get collapsed() { return collapsed(); },
  };
}
