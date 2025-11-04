'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';

type TopoUniforms = {
  u_time: { value: number };
  u_speed: { value: number };
  u_scale: { value: number };
  u_amplitude: { value: number };
  u_density: { value: number };
  u_color: { value: THREE.Color };
  u_alpha: { value: number };
};

function TopoPlane() {
  const matRef = useRef<THREE.ShaderMaterial>(null!);

  const uniforms = useMemo<TopoUniforms>(
    () => ({
      u_time: { value: 0 },
      u_speed: { value: 0.25 },
      u_scale: { value: 1.4 },
      u_amplitude: { value: 0.14 },
      u_density: { value: 22.0 },
      u_color: { value: new THREE.Color('#5a5a5a') },
      u_alpha: { value: 0.28 },
      u_warpAmp: { value: 0.25 },
      u_morphAmp: { value: 0.08 },
    }),
    []
  );

  useFrame((_, delta) => {
    uniforms.u_time.value += delta * uniforms.u_speed.value;
  });

  return (
    <mesh rotation={[0, 0, 0]}>
      <planeGeometry args={[10, 10, 256, 256]} />
      <shaderMaterial
        ref={matRef}
        transparent
        depthWrite={false}
        uniforms={uniforms as any}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
            precision highp float;
            varying vec2 vUv;

            uniform float u_time;
            uniform float u_scale;
            uniform float u_amplitude;
            uniform float u_density;
            uniform float u_alpha;
            uniform float u_warpAmp;
            uniform float u_morphAmp;
            uniform vec3  u_color;

            #ifdef GL_OES_standard_derivatives
            #extension GL_OES_standard_derivatives : enable
            #endif

            /* --- Simplex noise 2D --- */
            vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
            vec2 mod289(vec2 x){return x - floor(x*(1.0/289.0))*289.0;}
            vec3 permute(vec3 x){return mod289(((x*34.0)+1.0)*x);}
            float snoise(vec2 v){
            const vec4 C=vec4(0.211324865405187,0.366025403784439,-0.577350269189626,0.024390243902439);
            vec2 i=floor(v+dot(v,C.yy));
            vec2 x0=v-i+dot(i,C.xx);
            vec2 i1 = (x0.x > x0.y) ? vec2(1.0,0.0) : vec2(0.0,1.0);
            vec4 x12=x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i=mod289(i);
            vec3 p=permute(permute(i.y+vec3(0.0,i1.y,1.0))+i.x+vec3(0.0,i1.x,1.0));
            vec3 m=max(0.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.0);
            m=m*m; m=m*m;
            vec3 x=2.0*fract(p*C.www)-1.0;
            vec3 h=abs(x)-0.5;
            vec3 ox=floor(x+0.5);
            vec3 a0=x-ox;
            m*=1.79284291400159-0.85373472095314*(a0*a0+h*h);
            vec3 g;
            g.x=a0.x*x0.x+h.x*x0.y;
            g.yz=a0.yz*x12.xz+h.yz*x12.yw;
            return 130.0*dot(m,g);
            }

            void main(){
            // Base UV escalada
            vec2 q = vUv * u_scale;

            // Domain warp SIN desplazamiento lineal: todo vectorizado
            vec2 warp = vec2(
                snoise(q*1.2 + vec2(0.0, 0.5) + vec2(u_time*0.18)),
                snoise(q*1.7 + vec2(0.7, 0.0) - vec2(u_time*0.21))
            );
            vec2 p = q + u_warpAmp * warp;

            // Altura (dos capas)
            float h = snoise(p)*0.6 + snoise(p*2.1 + vec2(7.3)) * 0.4;
            h *= u_amplitude;

            // Densidad “respira” (morph)
            float density = u_density * (1.0 + u_morphAmp * sin(u_time*0.4));

            // Isolíneas nítidas
            float iso  = h * density;
            float w    = fwidth(iso);
            float dist = abs(fract(iso) - 0.5) / w;
            float lineAlpha = 1.0 - smoothstep(0.0, 1.0, dist);

            float alpha = u_alpha * lineAlpha;
            if (alpha < 0.002) discard;

            gl_FragColor = vec4(u_color, alpha);
            }
        `}
      />
    </mesh>
  );
}

export default function BgTopo() {
  return (
    <div className="r3f-bg" aria-hidden>
      <Canvas gl={{ antialias: true, alpha: true }} dpr={[1, 1.75]} frameloop="always" orthographic>
        <OrthographicCamera makeDefault position={[0, 0, 5]} zoom={220} />
        <ambientLight intensity={0.0} />
        <TopoPlane />
      </Canvas>
    </div>
  );
}
