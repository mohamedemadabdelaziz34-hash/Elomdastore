
/**
 * ELOMDA — Spline-style 3D Hero (V3)
 * 1. Large gold rings above/around brand name.
 * 2. Small floating element for sub-heading.
 * 3. Mouse-driven interactivity.
 */

(function () {
  'use strict';

  function loadScript(src, onload) {
    const s = document.createElement('script');
    s.src = src;
    s.onload = onload;
    document.head.appendChild(s);
  }

  function init() {
    const container = document.getElementById('refractive-canvas-container');
    if (!container) return;

    const THREE = window.THREE;

    const W = container.clientWidth;
    const H = container.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 100);
    camera.position.z = 8;

    const bgTarget = new THREE.WebGLRenderTarget(W, H);

    // ─── Large Luxury Gold Rings ────────────────────────────────────────────────
    const ringGroup = new THREE.Group();
    const ringMat = new THREE.MeshStandardMaterial({
        color: 0xD4AF37,
        metalness: 1.0,
        roughness: 0.1,
        emissive: 0xD4AF37,
        emissiveIntensity: 0.15
    });

    for(let i=0; i<4; i++) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(2 + i * 0.4, 0.012, 16, 128),
            ringMat
        );
        ring.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
        ring.rotation.y = (Math.random() - 0.5) * 0.5;
        ringGroup.add(ring);
    }
    scene.add(ringGroup);

    // ─── Small Floating Element (Near Sub-heading) ──────────────────────────────
    const smallElementMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 1.0,
        roughness: 0,
        envMapIntensity: 2
    });
    const smallElement = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.15),
        smallElementMat
    );
    smallElement.position.set(2.5, -1.8, 0); // Positioned near where "أناقة بلا حدود" would be
    scene.add(smallElement);

    // Lights
    const p1 = new THREE.PointLight(0xffffff, 1.5);
    p1.position.set(5, 5, 5);
    scene.add(p1);
    const p2 = new THREE.PointLight(0xD4AF37, 1);
    p2.position.set(-5, -5, 2);
    scene.add(p2);
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));

    // ─── Text Mask ──────────────────────────────────────────────────────────────
    const createTextTex = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2048; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.font = `900 ${canvas.height * 0.65}px 'Playfair Display', serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.letterSpacing = "25px";
      ctx.fillText('ELOMDA', canvas.width / 2, canvas.height / 2);
      return new THREE.CanvasTexture(canvas);
    };

    const glassMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: bgTarget.texture },
        uMask: { value: createTextTex() },
        uResolution: { value: new THREE.Vector2(W, H) },
        uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform sampler2D uMask;
        uniform float uTime;
        uniform vec2 uResolution;
        uniform vec2 uMouse;
        varying vec2 vUv;
        void main() {
          float mask = texture2D(uMask, vUv).r;
          if (mask < 0.01) discard;
          vec2 screenUV = gl_FragCoord.xy / uResolution;
          vec2 refractUV = screenUV + (uMouse - 0.5) * 0.04 + vec2(sin(vUv.x*12.0+uTime)*0.008, cos(vUv.y*10.0+uTime)*0.008);
          float r = texture2D(uTexture, refractUV + 0.004).r;
          float g = texture2D(uTexture, refractUV).g;
          float b = texture2D(uTexture, refractUV - 0.004).b;
          vec3 color = vec3(r, g, b);
          color += vec3(0.83, 0.69, 0.22) * pow(mask, 12.0) * 0.5; // Gold edge
          float shine = smoothstep(0.48, 0.5, sin(vUv.x * 2.5 - uTime * 2.0) * 0.5 + 0.5);
          color += vec3(1.0) * shine * 0.4 * mask;
          gl_FragColor = vec4(color, mask * 0.95);
        }
      `,
    });
    const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(10, 3), glassMat);
    scene.add(textPlane);

    // ─── Interaction ─────────────────────────────────────────────────────────────
    let tx = 0.5, ty = 0.5, cx = 0.5, cy = 0.5;
    container.addEventListener('mousemove', (e) => {
      const r = container.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width;
      ty = 1.0 - (e.clientY - r.top) / r.height;
    });

    function animate() {
      requestAnimationFrame(animate);
      const t = performance.now() * 0.001;
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;

      glassMat.uniforms.uTime.value = t;
      glassMat.uniforms.uMouse.value.set(cx, cy);

      // Slow elegant ring rotation
      ringGroup.children.forEach((r, i) => {
        r.rotation.z += 0.002 * (i + 1);
        r.rotation.x = Math.PI / 2 + Math.sin(t * 0.3 + i) * 0.1;
      });

      // Small element animation
      smallElement.rotation.y += 0.02;
      smallElement.rotation.x += 0.01;
      smallElement.position.y = -1.8 + Math.sin(t * 1.5) * 0.05;
      smallElement.position.x = 2.8 + (cx - 0.5) * 0.5;

      // Text tilt
      textPlane.rotation.y = (cx - 0.5) * 0.25;
      textPlane.rotation.x = -(cy - 0.5) * 0.15;

      // Render Pipeline
      textPlane.visible = false;
      smallElement.visible = true;
      ringGroup.visible = true;
      renderer.setRenderTarget(bgTarget);
      renderer.setClearColor(0x040814, 1);
      renderer.render(scene, camera);
      
      renderer.setRenderTarget(null);
      renderer.setClearColor(0x000000, 0);
      textPlane.visible = true;
      renderer.render(scene, camera);
    }

    const resize = () => {
        const w = container.clientWidth, h = container.clientHeight;
        renderer.setSize(w, h);
        bgTarget.setSize(w, h);
        camera.aspect = w / h; camera.updateProjectionMatrix();
        glassMat.uniforms.uResolution.value.set(w, h);
    };
    window.addEventListener('resize', resize);
    animate();
  }

  if (window.THREE) init();
  else loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', init);
})();
