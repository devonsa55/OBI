import React, { createContext, useContext, useState, useEffect } from 'react';

const CameraContext = createContext();

export function CameraProvider({ children }) {
  const [camera, setCamera] = useState({
    x: 50,
    y: 50,
    z: 1,
    activeNodeId: null,
    level: 0
  });

  const [isDevMode, setIsDevMode] = useState(false);
  const [lastCoordinates, setLastCoordinates] = useState(null);

  // Focus on a specific node (system or specimen) and adjust camera coordinates + zoom
  const focusNode = (node, targetLevel) => {
    if (!node) return;
    
    // Support custom camera targets for level transitions (separating hotspot position from camera focal point)
    let targetX = node.cameraTarget?.x !== undefined 
      ? node.cameraTarget.x 
      : (node.coordinates?.x !== undefined ? node.coordinates.x : 50);
    let targetY = node.cameraTarget?.y !== undefined 
      ? node.cameraTarget.y 
      : (node.coordinates?.y !== undefined ? node.coordinates.y : 50);
    let targetZ = node.cameraTarget?.z !== undefined 
      ? node.cameraTarget.z 
      : (node.targetZoomScale !== undefined ? node.targetZoomScale : 3);

    setCamera({
      x: targetX,
      y: targetY,
      z: targetZ,
      activeNodeId: node.id,
      level: targetLevel
    });
  };

  // Move back one level in the spatial map hierarchy
  const handleBack = (activeSystem, activeSpecimen) => {
    if (camera.level === 2) {
      // Step back from specimen (Level 2) to active system (Level 1)
      let systemX = activeSystem?.cameraTarget?.x !== undefined 
        ? activeSystem.cameraTarget.x 
        : (activeSystem?.coordinates?.x !== undefined ? activeSystem.coordinates.x : 50);
      let systemY = activeSystem?.cameraTarget?.y !== undefined 
        ? activeSystem.cameraTarget.y 
        : (activeSystem?.coordinates?.y !== undefined ? activeSystem.coordinates.y : 50);
      let systemZ = activeSystem?.cameraTarget?.z !== undefined 
        ? activeSystem.cameraTarget.z 
        : (activeSystem?.targetZoomScale !== undefined ? activeSystem.targetZoomScale : 3);

      setCamera({
        x: systemX,
        y: systemY,
        z: systemZ,
        activeNodeId: activeSystem?.id || null,
        level: 1
      });
    } else if (camera.level === 1) {
      // Step back from system (Level 1) to map baseline (Level 0)
      resetCamera();
    }
  };

  // Reset camera focal center and zoom back to level 0 baseline
  const resetCamera = () => {
    setCamera({
      x: 50,
      y: 50,
      z: 1,
      activeNodeId: null,
      level: 0
    });
  };

  const toggleDevMode = () => {
    setIsDevMode(prev => !prev);
  };

  // Registers a coordinate click, logs it, HUD-notifies, and copies to clipboard
  const logClickCoordinate = (x, y) => {
    const coords = {
      x: parseFloat(x.toFixed(2)),
      y: parseFloat(y.toFixed(2))
    };
    setLastCoordinates(coords);
    
    // Copy exact coordinate format to clipboard for effortless copy-pasting
    const clipString = `"coordinates": { "x": ${coords.x}, "y": ${coords.y} }`;
    navigator.clipboard?.writeText(clipString)
      .then(() => {
        console.log(`[Dev Mode] Copied to clipboard: ${clipString}`);
      })
      .catch(err => {
        console.error(`[Dev Mode] Failed to write clipboard: `, err);
      });

    console.log(`[Dev Mode] Map click project details:\n%c${clipString}`, "color: #81cccc; font-weight: bold;");
  };

  return (
    <CameraContext.Provider value={{
      camera,
      setCamera,
      focusNode,
      handleBack,
      resetCamera,
      isDevMode,
      setIsDevMode,
      toggleDevMode,
      lastCoordinates,
      setLastCoordinates,
      logClickCoordinate
    }}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCamera() {
  const context = useContext(CameraContext);
  if (!context) {
    throw new Error('useCamera must be used within a CameraProvider');
  }
  return context;
}
