// 3D Viewport using Three.js and React Three Fiber

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import type { MeshData } from '@meshnative/core';

function MeshVisualization({ mesh }: { mesh: MeshData }) {
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();

    // Set positions
    geo.setAttribute('position', new THREE.BufferAttribute(mesh.vertexPositions, 3));

    // Set normals
    geo.setAttribute('normal', new THREE.BufferAttribute(mesh.vertexNormals, 3));

    // Set indices
    const indices = new Uint32Array(mesh.faces.firstHalfEdge.length * 3);
    for (let f = 0; f < mesh.faces.firstHalfEdge.length; f++) {
      const he = mesh.faces.firstHalfEdge[f];
      indices[f * 3] = mesh.halfEdges.origin[he];
      indices[f * 3 + 1] = mesh.halfEdges.origin[mesh.halfEdges.next[he]];
      indices[f * 3 + 2] = mesh.halfEdges.origin[mesh.halfEdges.next[mesh.halfEdges.next[he]]];
    }
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    geo.computeBoundingSphere();
    return geo;
  }, [mesh]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color="#8899aa"
        roughness={0.5}
        metalness={0.3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GridHelper() {
  return (
    <Grid
      args={[100, 100]}
      cellSize={1}
      cellThickness={0.5}
      cellColor="#444"
      sectionSize={5}
      sectionThickness={1}
      sectionColor="#666"
      fadeDistance={50}
      fadeStrength={1}
      followCamera={false}
      infiniteGrid={true}
    />
  );
}

function AxesHelper() {
  return (
    <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
      <GizmoViewport
        axisColors={['#ff4060', '#40ff60', '#4060ff']}
        labelColor="white"
      />
    </GizmoHelper>
  );
}

export function Viewport() {
  const mesh = useAppStore(state => state.currentMesh);

  return (
    <div style={{ width: '100%', height: '100%', background: '#1a1a2e' }}>
      <Canvas
        camera={{ position: [15, 15, 15], fov: 50 }}
        gl={{ antialias: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <color attach="background" args={['#1a1a2e']} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 10, 10]} intensity={0.8} />
        <directionalLight position={[-5, 5, -5]} intensity={0.3} />

        {/* Grid */}
        <GridHelper />

        {/* Mesh */}
        {mesh && <MeshVisualization mesh={mesh} />}

        {/* Controls */}
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.1}
          minDistance={1}
          maxDistance={200}
        />

        {/* Gizmo */}
        <AxesHelper />
      </Canvas>
    </div>
  );
}
