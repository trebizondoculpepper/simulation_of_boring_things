/** The app supplies clipboard effects; shared controls own the shortcuts. */
export type CopyRequest =
  | { kind: 'reference'; reference: string | null }
  | { kind: 'position' };

let handler: ((request: CopyRequest) => void) | undefined;

export function setCopyHandler(next: (request: CopyRequest) => void) {
  handler = next;
}

export function requestCopy(request: CopyRequest) {
  handler?.(request);
}
