import {
  Color,
  HalfFloatType,
  NoBlending,
  NormalBlending,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
} from 'three';
import type { Camera, Object3D, Scene, WebGLRenderer } from 'three';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';
import { CopyShader } from 'three/addons/shaders/CopyShader.js';

/** The layer the halls two or more away are drawn on, in their own pass. */
export const FAR_HALL_LAYER = 3;
/** The layer a neighbour copied into this scene is drawn on, in its own eased pass. */
export const NEAR_COPY_LAYER = 4;

/** Put `obj` and everything under it on the far halls' layer, or back on the default one. */
export function setFarLayer(
  obj: Object3D,
  far: boolean,
  layer = FAR_HALL_LAYER,
) {
  obj.traverse((o) => {
    if (far) o.layers.set(layer);
    else o.layers.set(0);
  });
}

/**
 * The halls two or more away, drawn first at a fixed quarter of the full
 * resolution into their own target, with their own depth, and laid down
 * as the picture's back layer (the owner, 2026-10-30): they never take
 * the resolution of the hall they are seen through. Everything nearer is
 * drawn over them by the scene's own pass (which must not clear colour);
 * the far halls are always behind it, so no depth test is needed.
 */
export class FarHallPass extends Pass {
  private target = new WebGLRenderTarget(1, 1, { type: HalfFloatType });
  private quad: FullScreenQuad;
  private copy: ShaderMaterial;
  private size = new Vector2();
  private clearColour = new Color();
  /** The share of full resolution the renderer now draws at (a hall seen through an archway draws less). */
  shareNow = 1;
  /** The share of full resolution this pass draws at. */
  scale = 0.25;

  constructor(
    private scene: Scene,
    private camera: Camera,
    private layer = FAR_HALL_LAYER,
  ) {
    super();
    this.needsSwap = false;
    this.copy = new ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, opacity: { value: 1 } },
      vertexShader: CopyShader.vertexShader,
      fragmentShader: CopyShader.fragmentShader,
      blending: layer === FAR_HALL_LAYER ? NoBlending : NormalBlending,
      premultipliedAlpha: false,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.quad = new FullScreenQuad(this.copy);
    // The lights shine on the far layer too.
    scene.traverse((o) => {
      if ((o as { isLight?: boolean }).isLight) o.layers.enable(layer);
    });
  }

  render(
    renderer: WebGLRenderer,
    _write: WebGLRenderTarget,
    read: WebGLRenderTarget,
  ) {
    renderer.getDrawingBufferSize(this.size);
    const w = Math.max(
      1,
      Math.round((this.size.x * this.scale) / this.shareNow),
    );
    const h = Math.max(
      1,
      Math.round((this.size.y * this.scale) / this.shareNow),
    );
    if (this.target.width !== w || this.target.height !== h)
      this.target.setSize(w, h);
    const mask = this.camera.layers.mask;
    this.camera.layers.set(this.layer);
    const background = this.scene.background;
    this.scene.background = null;
    renderer.getClearColor(this.clearColour);
    const alpha = renderer.getClearAlpha();
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear();
    renderer.render(this.scene, this.camera);
    this.camera.layers.mask = mask;
    this.scene.background = background;
    renderer.setClearColor(this.clearColour, alpha);
    this.copy.uniforms.tDiffuse.value = this.target.texture;
    renderer.setRenderTarget(this.renderToScreen ? null : read);
    this.quad.render(renderer);
  }

  dispose() {
    this.target.dispose();
    this.copy.dispose();
    this.quad.dispose();
  }
}
