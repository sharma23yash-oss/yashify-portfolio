'use client';

/**
 * Scene 2: a quantitative data mesh. Five layers of nodes read left to right as
 * source tables, scripts, features, models and a valuation output, with small data
 * packets travelling along the links. It spreads over whatever box it is placed in,
 * so it works as a section background or as a card accent.
 *
 * Draw calls: one instanced mesh for the blocks, one for the orbs, one line geometry
 * for every link, and two instanced meshes for the packets and their halos.
 */

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BufferAttribute, BufferGeometry, Color, DynamicDrawUsage, InstancedMesh, Object3D } from 'three';
import SceneCanvas, { ParallaxRig, StudioLights } from './SceneCanvas';
import type { SceneProps } from './SceneFrame';
import { MESH, PALETTE, mulberry32, type MeshNode } from './data';

/* ---------------------------------- constants ---------------------------------- */

const CAMERA = { position: [0, 0, 16] as [number, number, number], fov: 30 };

const FILL_X = 0.86; // how much of the box the mesh spreads over
const FILL_Y = 0.88;
const DEPTH = 0.16; // depth spread, as a share of the box height
const PACKETS_FULL = 26;
const PACKETS_LITE = 12;
const PACKET_COLOR = new Color(PALETTE.emerald);
const PAPER = new Color(PALETTE.paper);

const BLOCKS = MESH.nodes.filter((node) => node.kind === 'block');
const ORBS = MESH.nodes.filter((node) => node.kind === 'orb');
const LINKS = MESH.edges;
const FIRST_LINKS = LINKS.filter(([from]) => MESH.nodes[from].layer === 0);
const OUTGOING = MESH.nodes.map((node) => LINKS.filter(([from]) => from === node.id));

const dummy = new Object3D();
const worldA = { x: 0, y: 0, z: 0 };
const worldB = { x: 0, y: 0, z: 0 };

type Frame = { halfW: number; halfH: number; depth: number; unit: number };

function frameFor(viewport: { width: number; height: number }): Frame {
  return {
    halfW: (viewport.width / 2) * FILL_X,
    halfH: (viewport.height / 2) * FILL_Y,
    depth: viewport.height * DEPTH,
    unit: Math.min(0.3, Math.max(0.09, Math.min(viewport.width, viewport.height) * 0.026)),
  };
}

function place(node: MeshNode, frame: Frame, out: { x: number; y: number; z: number }) {
  out.x = node.x * frame.halfW;
  out.y = -node.y * frame.halfH;
  out.z = node.z * frame.depth;
}

type Travel = {
  rand: () => number;
  link: Int32Array; // which link each packet is on
  progress: Float32Array; // 0 to 1 along that link
  speed: Float32Array; // links per second
};

function createTravel(count: number): Travel {
  const rand = mulberry32(2024);
  return {
    rand,
    link: Int32Array.from({ length: count }, () => Math.floor(rand() * LINKS.length)),
    progress: Float32Array.from({ length: count }, () => rand()),
    speed: Float32Array.from({ length: count }, () => 0.12 + rand() * 0.18),
  };
}

/* ----------------------------------- mesh ----------------------------------- */

function Network({ lite }: { lite: boolean }) {
  const blocks = useRef<InstancedMesh>(null);
  const orbs = useRef<InstancedMesh>(null);
  const packets = useRef<InstancedMesh>(null);
  const halos = useRef<InstancedMesh>(null);
  const packetCount = lite ? PACKETS_LITE : PACKETS_FULL;

  const links = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new BufferAttribute(new Float32Array(LINKS.length * 6), 3);
    positions.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    return geometry;
  }, []);

  // where each packet is on its link, and how fast it travels; a ref, because it changes every frame
  const travel = useRef<Travel | null>(null);
  useLayoutEffect(() => {
    travel.current = createTravel(packetCount);
  }, [packetCount]);

  // colours never change, so they are written once; far nodes are tinted towards the page colour
  useLayoutEffect(() => {
    const tint = new Color();
    const paint = (mesh: InstancedMesh | null, nodes: MeshNode[]) => {
      nodes.forEach((node, i) => {
        tint.set(node.color).lerp(PAPER, (1 - (node.z + 1) / 2) * 0.35);
        mesh?.setColorAt(i, tint);
      });
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    };
    paint(blocks.current, BLOCKS);
    paint(orbs.current, ORBS);
    for (let i = 0; i < packetCount; i += 1) {
      packets.current?.setColorAt(i, PACKET_COLOR);
      halos.current?.setColorAt(i, PACKET_COLOR);
    }
    [packets.current, halos.current].forEach((mesh) => {
      if (mesh?.instanceColor) mesh.instanceColor.needsUpdate = true;
    });
  }, [packetCount]);

  useFrame((state, delta) => {
    const blockMesh = blocks.current;
    const orbMesh = orbs.current;
    const packetMesh = packets.current;
    const haloMesh = halos.current;
    if (!blockMesh || !orbMesh || !packetMesh) return;

    const route = travel.current;
    if (!route) return;
    const frame = frameFor(state.viewport);
    const time = state.clock.elapsedTime;
    const dt = Math.min(delta, 0.05);

    // nodes breathe a little
    const settle = (mesh: InstancedMesh, nodes: MeshNode[]) => {
      nodes.forEach((node, i) => {
        place(node, frame, worldA);
        const size = node.size * frame.unit * (1 + Math.sin(time * 1.1 + node.phase) * 0.07);
        dummy.position.set(worldA.x, worldA.y, worldA.z);
        dummy.scale.setScalar(size);
        dummy.rotation.set(0, node.kind === 'block' ? time * 0.15 + node.phase : 0, 0);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    settle(blockMesh, BLOCKS);
    settle(orbMesh, ORBS);

    // links follow the nodes
    const positions = links.getAttribute('position') as BufferAttribute;
    LINKS.forEach(([from, to], i) => {
      place(MESH.nodes[from], frame, worldA);
      place(MESH.nodes[to], frame, worldB);
      positions.setXYZ(i * 2, worldA.x, worldA.y, worldA.z);
      positions.setXYZ(i * 2 + 1, worldB.x, worldB.y, worldB.z);
    });
    positions.needsUpdate = true;

    // packets ride a link, then continue along one of the next layer's links
    for (let p = 0; p < packetCount; p += 1) {
      route.progress[p] += route.speed[p] * dt;
      if (route.progress[p] >= 1) {
        const arrived = LINKS[route.link[p]][1];
        const options = OUTGOING[arrived].length ? OUTGOING[arrived] : FIRST_LINKS;
        const next = options[Math.floor(route.rand() * options.length)];
        route.link[p] = LINKS.indexOf(next);
        route.progress[p] = 0;
      }
      const [from, to] = LINKS[route.link[p]];
      place(MESH.nodes[from], frame, worldA);
      place(MESH.nodes[to], frame, worldB);
      const t = route.progress[p];
      dummy.position.set(
        worldA.x + (worldB.x - worldA.x) * t,
        worldA.y + (worldB.y - worldA.y) * t,
        worldA.z + (worldB.z - worldA.z) * t,
      );
      dummy.rotation.set(0, 0, 0);
      dummy.scale.setScalar(frame.unit * 0.3);
      dummy.updateMatrix();
      packetMesh.setMatrixAt(p, dummy.matrix);
      if (haloMesh) {
        dummy.scale.setScalar(frame.unit * 0.85);
        dummy.updateMatrix();
        haloMesh.setMatrixAt(p, dummy.matrix);
      }
    }
    packetMesh.instanceMatrix.needsUpdate = true;
    if (haloMesh) haloMesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group>
      <lineSegments geometry={links} frustumCulled={false}>
        <lineBasicMaterial color={PALETTE.cobalt} transparent opacity={0.34} />
      </lineSegments>

      <instancedMesh ref={blocks} args={[undefined, undefined, BLOCKS.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshPhysicalMaterial roughness={0.18} metalness={0.2} clearcoat={1} clearcoatRoughness={0.1} />
      </instancedMesh>
      <instancedMesh ref={orbs} args={[undefined, undefined, ORBS.length]} frustumCulled={false}>
        <sphereGeometry args={[0.6, 24, 16]} />
        <meshStandardMaterial roughness={0.22} metalness={0.5} />
      </instancedMesh>

      <instancedMesh ref={packets} args={[undefined, undefined, packetCount]} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>
      {!lite && (
        <instancedMesh ref={halos} args={[undefined, undefined, packetCount]} frustumCulled={false}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial transparent opacity={0.2} depthWrite={false} toneMapped={false} />
        </instancedMesh>
      )}
    </group>
  );
}

export default function DataMeshScene(props: SceneProps) {
  return (
    <SceneCanvas {...props} camera={CAMERA}>
      <StudioLights lite={props.lite} />
      <ParallaxRig strength={0.7}>
        <Network lite={props.lite} />
      </ParallaxRig>
    </SceneCanvas>
  );
}
