/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, extend, useFrame } from '@react-three/fiber';
import { useTexture, Environment, Lightformer } from '@react-three/drei';
import { BallCollider, CuboidCollider, Physics, RigidBody, useRopeJoint, useSphericalJoint } from '@react-three/rapier';
import { MeshLineGeometry, MeshLineMaterial } from 'meshline';

import lanyard from '../../assets/lanyard/lanyard.png';

import * as THREE from 'three';
import './Lanyard.css';

extend({ MeshLineGeometry, MeshLineMaterial });

function LanyardCanvas({ bandOffsets = [0], cardImages = [], position, gravity, fov, transparent }) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Canvas
      camera={{ position: position, fov: fov }}
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ alpha: transparent }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(0x000000), transparent ? 0 : 1)}
    >
      <ambientLight intensity={Math.PI} />
      <Physics gravity={gravity} timeStep={isMobile ? 1 / 30 : 1 / 60}>
        {bandOffsets.map((offset, index) => (
          <Band
            key={index}
            isMobile={isMobile}
            offsetX={offset}
            cardImage={cardImages[index]}
          />
        ))}
      </Physics>
      <Environment blur={0.75}>
        <Lightformer intensity={2} color="white" position={[0, -1, 5]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[-1, -1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={3} color="white" position={[1, 1, 1]} rotation={[0, 0, Math.PI / 3]} scale={[100, 0.1, 1]} />
        <Lightformer intensity={10} color="white" position={[-10, 0, 14]} rotation={[0, Math.PI / 2, Math.PI / 3]} scale={[100, 10, 1]} />
      </Environment>
    </Canvas>
  );
}

export default function Lanyard({ cardImage, position = [0, 0, 30], gravity = [0, -40, 0], fov = 20, transparent = true }) {
  return (
    <div className="lanyard-wrapper">
      <LanyardCanvas
        bandOffsets={[0]}
        cardImages={[cardImage]}
        position={position}
        gravity={gravity}
        fov={fov}
        transparent={transparent}
      />
    </div>
  );
}

export function LanyardTriplet({ cardImages = [], position = [0, 0, 17], gravity = [0, -40, 0], fov = 30, transparent = true }) {
  return (
    <div className="lanyard-wrapper">
      <LanyardCanvas
        bandOffsets={[-6, 0, 6]}
        cardImages={cardImages}
        position={position}
        gravity={gravity}
        fov={fov}
        transparent={transparent}
      />
    </div>
  );
}

function Band({ maxSpeed = 50, minSpeed = 0, isMobile = false, offsetX = 0, cardImage }) {
  const band = useRef();
  const fixed = useRef();
  const j1 = useRef();
  const j2 = useRef();
  const j3 = useRef();
  const card = useRef();
  const vec = new THREE.Vector3();
  const ang = new THREE.Vector3();
  const rot = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const segmentProps = { type: 'dynamic', canSleep: true, colliders: false, angularDamping: 4, linearDamping: 4 };
  const texture = useTexture(lanyard);
  const cardTexture = useTexture(cardImage);
  const cardSize = { width: 1.0, height: 1.4 };
  const cardRadius = 0.1;
  const [curve] = useState(() => new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]));
  const [dragged, drag] = useState(false);
  const [hovered, hover] = useState(false);

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], 1]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], 1]);
  useSphericalJoint(j3, card, [[0, 0, 0], [0, 0.8, 0]]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = dragged ? 'grabbing' : 'grab';
      return () => void (document.body.style.cursor = 'auto');
    }
  }, [hovered, dragged]);

  const cardShape = useMemo(() => {
    const halfW = cardSize.width / 2;
    const halfH = cardSize.height / 2;
    const radius = Math.min(cardRadius, halfW, halfH);
    const shape = new THREE.Shape();

    shape.moveTo(-halfW + radius, -halfH);
    shape.lineTo(halfW - radius, -halfH);
    shape.absarc(halfW - radius, -halfH + radius, radius, -Math.PI / 2, 0, false);
    shape.lineTo(halfW, halfH - radius);
    shape.absarc(halfW - radius, halfH - radius, radius, 0, Math.PI / 2, false);
    shape.lineTo(-halfW + radius, halfH);
    shape.absarc(-halfW + radius, halfH - radius, radius, Math.PI / 2, Math.PI, false);
    shape.lineTo(-halfW, -halfH + radius);
    shape.absarc(-halfW + radius, -halfH + radius, radius, Math.PI, (3 * Math.PI) / 2, false);

    return shape;
  }, [cardRadius, cardSize.height, cardSize.width]);

  const cardGeometry = useMemo(() => {
    const geometry = new THREE.ShapeGeometry(cardShape);
    geometry.computeBoundingBox();

    const bbox = geometry.boundingBox;
    const size = new THREE.Vector2(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y
    );

    const uv = [];
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      uv.push((x - bbox.min.x) / size.x, (y - bbox.min.y) / size.y);
    }

    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    return geometry;
  }, [cardShape]);

  useEffect(() => {
    if (!cardTexture?.image) return;
    const imageAspect = cardTexture.image.width / cardTexture.image.height;
    const cardAspect = cardSize.width / cardSize.height;

    let repeatX = 1;
    let repeatY = 1;

    if (imageAspect > cardAspect) {
      repeatY = cardAspect / imageAspect;
    } else {
      repeatX = imageAspect / cardAspect;
    }

    cardTexture.wrapS = THREE.ClampToEdgeWrapping;
    cardTexture.wrapT = THREE.ClampToEdgeWrapping;
    cardTexture.rotation = 0;
    cardTexture.repeat.set(repeatX, repeatY);
    cardTexture.offset.set((1 - repeatX) / 2, (1 - repeatY) / 2);

    cardTexture.needsUpdate = true;
  }, [cardTexture, cardSize.height, cardSize.width]);

  useFrame((state, delta) => {
    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera);
      dir.copy(vec).sub(state.camera.position).normalize();
      vec.add(dir.multiplyScalar(state.camera.position.length()));
      [card, j1, j2, j3, fixed].forEach(ref => ref.current?.wakeUp());
      card.current?.setNextKinematicTranslation({ x: vec.x - dragged.x, y: vec.y - dragged.y, z: vec.z - dragged.z });
    }
    if (fixed.current) {
      [j1, j2].forEach(ref => {
        if (!ref.current.lerped) ref.current.lerped = new THREE.Vector3().copy(ref.current.translation());
        const clampedDistance = Math.max(0.1, Math.min(1, ref.current.lerped.distanceTo(ref.current.translation())));
        ref.current.lerped.lerp(
          ref.current.translation(),
          delta * (minSpeed + clampedDistance * (maxSpeed - minSpeed))
        );
      });
      curve.points[0].copy(j3.current.translation());
      curve.points[1].copy(j2.current.lerped);
      curve.points[2].copy(j1.current.lerped);
      curve.points[3].copy(fixed.current.translation());
      band.current.geometry.setPoints(curve.getPoints(isMobile ? 16 : 32));
      ang.copy(card.current.angvel());
      rot.copy(card.current.rotation());
      card.current.setAngvel({ x: ang.x, y: ang.y - rot.y * 0.25, z: ang.z });
    }
  });

  curve.curveType = 'chordal';
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

  return (
    <>
      <group position={[offsetX, 4, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[2, 0, 0]} ref={card} {...segmentProps} type={dragged ? 'kinematicPosition' : 'dynamic'}>
          <CuboidCollider args={[0.75, 0.95, 0.01]} />
          <group
            scale={[2.2, 2.1, 2.1]}
            position={[0, -0.7, -0.05]}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
            onPointerUp={e => (e.target.releasePointerCapture(e.pointerId), drag(false))}
            onPointerDown={e => (
              e.target.setPointerCapture(e.pointerId),
              drag(new THREE.Vector3().copy(e.point).sub(vec.copy(card.current.translation())))
            )}
          >
            <mesh geometry={cardGeometry}>
              <meshPhysicalMaterial
                map={cardTexture}
                map-anisotropy={16}
                clearcoat={isMobile ? 0 : 1}
                clearcoatRoughness={0.15}
                roughness={0.9}
                metalness={0.2}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </RigidBody>
      </group>
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="white"
          depthTest={false}
          resolution={isMobile ? [1000, 2000] : [1000, 1000]}
          useMap
          map={texture}
          repeat={[-4, 1]}
          lineWidth={1}
        />
      </mesh>
    </>
  );
}
