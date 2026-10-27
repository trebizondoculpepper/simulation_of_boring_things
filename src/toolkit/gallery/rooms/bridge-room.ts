import { startBridgeRoom } from './control-room-prototype';

/**
 * The bridge, the game's control room (mission 095): dev46's room off the
 * main corridor, with its working consoles.
 */
export const startTheBridge = (canvas: HTMLCanvasElement) =>
  startBridgeRoom(canvas);
