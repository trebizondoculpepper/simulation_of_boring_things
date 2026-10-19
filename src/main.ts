import './styles/main.css';
import { startFacilityWorld } from './rendering/facility-world';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');
const hud = document.querySelector<HTMLElement>('#room-name');
if (!canvas || !hud) throw new Error('The page is incomplete.');

try {
  startFacilityWorld(canvas, hud);
} catch (error) {
  const message = document.querySelector<HTMLParagraphElement>('#error');
  if (message) {
    message.hidden = false;
    message.textContent =
      'The game could not start. Please use a browser with WebGL 2 enabled.';
  }
  console.error(error);
}
