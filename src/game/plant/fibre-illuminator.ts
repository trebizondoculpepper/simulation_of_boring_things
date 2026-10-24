/** The Jacuzzi's remote fibre illuminator. Saved with the world. */
export interface FibreIlluminatorState {
  on: boolean;
  brightness: number;
  twinkleSpeed: number;
  rainbow: boolean;
}

export const newFibreIlluminator = (): FibreIlluminatorState => ({
  on: true,
  brightness: 0.8,
  twinkleSpeed: 5,
  rainbow: false,
});

export type FibreIlluminatorAction =
  | { control: 'on'; value: boolean }
  | { control: 'rainbow'; value: boolean }
  | { control: 'brightness'; value: number }
  | { control: 'twinkleSpeed'; value: number };

export function setFibreIlluminator(
  state: FibreIlluminatorState,
  action: FibreIlluminatorAction,
): FibreIlluminatorState {
  if (action.control === 'brightness')
    return { ...state, brightness: Math.min(1, Math.max(0, action.value)) };
  if (action.control === 'twinkleSpeed')
    return {
      ...state,
      twinkleSpeed: Math.min(10, Math.max(0, Math.round(action.value))),
    };
  if (action.control === 'on') return { ...state, on: action.value };
  return { ...state, rainbow: action.value };
}
