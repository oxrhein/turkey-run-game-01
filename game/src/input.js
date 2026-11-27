// Keyboard and mouse input, read once per frame by the game loop.
// Arrow keys / W S switch lanes, Space / ArrowUp jumps, Shift dashes,
// ArrowDown hides in a haystack, Enter confirms, P or Escape pauses, M mutes.
// Mouse: click a lane to run there, click the turkey to jump, click buttons.
export const ACTION_UP = 'up';
export const ACTION_DOWN = 'down';
export const ACTION_JUMP = 'jump';
export const ACTION_DASH = 'dash';
export const ACTION_HIDE = 'hide';
export const ACTION_CONFIRM = 'confirm';
export const ACTION_PAUSE = 'pause';
export const ACTION_MUTE = 'mute';

const KEY_ACTIONS = {
  ArrowUp: ACTION_UP,
  KeyW: ACTION_UP,
  ArrowDown: ACTION_DOWN,
  KeyS: ACTION_DOWN,
  Space: ACTION_JUMP,
  ArrowRight: ACTION_DASH,
  ShiftLeft: ACTION_DASH,
  ShiftRight: ACTION_DASH,
  Enter: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyM: ACTION_MUTE,
  KeyH: ACTION_HIDE,
};

export function createInput(canvas) {
  const pressed = new Set();
  const queue = [];
  let mouse = { x: 0, y: 0, clicked: false };

  function onKeyDown(event) {
    const action = KEY_ACTIONS[event.code];
    if (!action) return;
    event.preventDefault();
    if (!event.repeat) queue.push(action);
    pressed.add(action);
  }

  function onKeyUp(event) {
    const action = KEY_ACTIONS[event.code];
    if (action) pressed.delete(action);
  }

  function onPointer(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
      clicked: true,
    };
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointerdown', onPointer);

  return {
    /** Actions pressed since the last frame, in order. Clears after reading. */
    drain() {
      const actions = queue.splice(0, queue.length);
      if (mouse.clicked) {
        mouse.clicked = false;
        actions.push({ mouse: { x: mouse.x, y: mouse.y } });
      }
      return actions;
    },
    /** True while the action's key is held down. */
    held(action) {
      return pressed.has(action);
    },
    /** The last pointer position in logical canvas coordinates. */
    pointer() {
      return { x: mouse.x, y: mouse.y };
    },
  };
}
