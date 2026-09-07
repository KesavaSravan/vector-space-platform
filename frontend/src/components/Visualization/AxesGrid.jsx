import React from "react";
import * as THREE from "three";
import { tokens } from "../../theme";

export default function AxesGrid() {
  return (
    <group>
      {/* Horizontal floor grid helper */}
      <gridHelper
        args={[30, 30, tokens.border, "#161A24"]}
        position={[0, -6, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Axis Helper representation */}
      {/* Red = X, Green = Y, Blue = Z */}
      <primitive
        object={new THREE.AxesHelper(6)}
        position={[0, -6, 0]}
      />
    </group>
  );
}
