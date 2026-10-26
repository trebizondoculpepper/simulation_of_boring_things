/** The app supplies clipboard effects; shared controls own the shortcuts. */
export type CopyRequest =
  | { kind: 'reference'; reference: string | null }
  | { kind: 'position' }
  | { kind: 'screenshot' };

let handler: ((request: CopyRequest) => void) | undefined;

export function setCopyHandler(next: (request: CopyRequest) => void) {
  handler = next;
}

export function requestCopy(request: CopyRequest) {
  handler?.(request);
}

let noclipHandler: (() => void) | undefined;

/** The app supplies what turning noclip on and off does. */
export function setNoclipToggle(next: () => void) {
  noclipHandler = next;
}

export function requestNoclipToggle() {
  noclipHandler?.();
}
