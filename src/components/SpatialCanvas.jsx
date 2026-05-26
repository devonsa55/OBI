import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCamera } from '../context/CameraContext';


const transitionConfig = {
  type: 'spring',
  stiffness: 90,
  damping: 18,
  mass: 0.9,
};

export default function SpatialCanvas({ 
  data, 
  showBeacons, 
  motionBlur, 
  showAnnotations, 
  theme, 
  canvasIntegration,
  onUpdateCoordinates,
  onResetCoordinates,
  hasOverrides
}) {
  const { camera, setCamera, focusNode, resetCamera, isDevMode, logClickCoordinate, lastCoordinates } = useCamera();
  const [copiedFullJson, setCopiedFullJson] = useState(false);
  const viewportRef = useRef(null);
  const containerRef = useRef(null);
  
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [sheetOffset, setSheetOffset] = useState({ x: 0, y: 0 });
  const [targetRatio, setTargetRatio] = useState(4 / 3); // Strict 4:3 aspect ratio

  // Aspect ratio is strictly locked to 4:3 by layout guidelines
  useEffect(() => {
    setTargetRatio(4 / 3);
  }, [data?.level0?.plateImage]);

  // Track active zoom direction (down vs up) for seamless 3D spatial alignment
  const prevLevelRef = useRef(camera.level);
  const [direction, setDirection] = useState('down');

  useEffect(() => {
    if (camera.level > prevLevelRef.current) {
      setDirection('down');
    } else if (camera.level < prevLevelRef.current) {
      setDirection('up');
    }
    prevLevelRef.current = camera.level;
  }, [camera.level]);

  // Reset sheet offset when changing levels or integration styles to prevent jumpiness
  useEffect(() => {
    setSheetOffset({ x: 0, y: 0 });
  }, [camera.level, canvasIntegration]);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
        
        let finalW, finalH;

        if (canvasIntegration === 'full-bleed') {
          // Fit-contain within container bounds to ensure zero image cropping while keeping full-bleed colors
          if (width / height > targetRatio) {
            // Container is wider than the map plate ratio -> lock height
            finalH = height;
            finalW = height * targetRatio;
          } else {
            // Container is taller than the map plate ratio -> lock width
            finalW = width;
            finalH = width / targetRatio;
          }
        } else {
          // Lock scale at minimum of 960px width (Tactile Blueprint Desk responsive mode)
          const maxW = Math.max(960, width * 0.9);
          const maxH = Math.max(960 / targetRatio, height * 0.9);
          
          finalW = maxW;
          finalH = maxW / targetRatio;
          
          if (finalH > maxH && height * 0.9 >= 960 / targetRatio) {
            finalH = maxH;
            finalW = maxH * targetRatio;
          }
        }
        
        setDimensions({ width: finalW, height: finalH });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [canvasIntegration, targetRatio]);

  // Tactile Desk operates at a baseline min-zoom of 1
  const autoMinZoom = 1;

  // Resolve current active plate details
  let activeSystem = null;
  let activeSpecimen = null;

  if (camera.level === 1) {
    activeSystem = data.level0.systems.find(sys => sys.id === camera.activeNodeId);
  } else if (camera.level === 2) {
    for (const sys of data.level0.systems) {
      const spec = sys.children?.find(child => child.id === camera.activeNodeId);
      if (spec) {
        activeSpecimen = spec;
        activeSystem = sys;
        break;
      }
    }
  }

  // Resolve active backdrop image for ambient blurred backing
  let activeBackdropImage = data.level0.plateImage;
  if (camera.level === 1 && activeSystem?.plateImage) {
    activeBackdropImage = activeSystem.plateImage;
  } else if (camera.level === 2 && activeSpecimen?.bgImage) {
    activeBackdropImage = activeSpecimen.bgImage;
  }

  const activeSystemHasPlate = activeSystem?.plateImage ? true : false;
  const activeSpecimenHasPlate = activeSpecimen?.bgImage ? true : false;

  let l0Opacity = 1;
  if (camera.level === 1) {
    l0Opacity = activeSystemHasPlate ? 0.15 : 1;
  } else if (camera.level === 2) {
    l0Opacity = activeSpecimenHasPlate ? 0.15 : (activeSystemHasPlate ? 0.15 : 1);
  }

  let l0Scale = 1;
  if (camera.level === 1 && activeSystemHasPlate) {
    l0Scale = 2.5;
  } else if (camera.level === 2 && activeSystemHasPlate) {
    l0Scale = 6.25;
  }

  const l0Origin = (camera.level === 2 && activeSpecimen)
    ? `${activeSpecimen.coordinates?.x || 50}% ${activeSpecimen.coordinates?.y || 50}%`
    : (activeSystem
        ? `${activeSystem.coordinates?.x || 50}% ${activeSystem.coordinates?.y || 50}%`
        : "50% 50%");

  // Determine hotspots based on level
  let hotspots = [];
  if (camera.level === 0) {
    hotspots = data.level0.systems;
  } else if (camera.level === 1 && activeSystem) {
    hotspots = activeSystem.children || [];
  }

  // Resolve annotations based on level
  let activeAnnotations = [];
  if (camera.level === 0) {
    activeAnnotations = (data.level0.annotations || []).map(ann => ({ ...ann, level: 0 }));
  } else if (camera.level === 1 && activeSystem) {
    activeAnnotations = (activeSystem.annotations || []).map(ann => ({ ...ann, level: 1 }));
  } else if (camera.level === 2 && activeSpecimen) {
    activeAnnotations = (activeSpecimen.annotations || []).map(ann => ({ ...ann, level: 2 }));
  }

  // Multiply by autoMinZoom scale multiplier to offset centering position
  const effectiveZoom = camera.z * autoMinZoom;
  const translateX = 50 - camera.x * effectiveZoom;
  const translateY = 50 - camera.y * effectiveZoom;

  // Handles developer mode coordinate logging clicks
  const handleViewportClick = (e) => {
    if (!isDevMode || !viewportRef.current || dragStartRef.current.hasMoved) return;

    const rect = viewportRef.current.getBoundingClientRect();
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;

    const canvasX = (pctX - (50 - camera.x * effectiveZoom)) / effectiveZoom;
    const canvasY = (pctY - (50 - camera.y * effectiveZoom)) / effectiveZoom;

    logClickCoordinate(canvasX, canvasY);
  };

  // Premium 2D click-and-drag and touch-swipe panning math
  const dragStartRef = useRef({
    startX: 0,
    startY: 0,
    startCameraX: 50,
    startCameraY: 50,
    startSheetX: 0,
    startSheetY: 0,
    hasMoved: false
  });

  const startDrag = (clientX, clientY) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      startCameraX: camera.x,
      startCameraY: camera.y,
      startSheetX: sheetOffset.x,
      startSheetY: sheetOffset.y,
      hasMoved: false
    };
  };

  const moveDrag = (clientX, clientY) => {
    if (!viewportRef.current) return;
    
    const deltaX = clientX - dragStartRef.current.startX;
    const deltaY = clientY - dragStartRef.current.startY;
    
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      dragStartRef.current.hasMoved = true;
    }

    if (camera.level === 0 && canvasIntegration !== 'full-bleed') {
      // Tactile Desk: Drag the entire physical blueprint frame relative to the desk boundaries
      const overflowX = Math.max(0, (dimensions.width - containerSize.width) / 2);
      const overflowY = Math.max(0, (dimensions.height - containerSize.height) / 2);
      
      const newX = Math.max(-overflowX, Math.min(overflowX, dragStartRef.current.startSheetX + deltaX));
      const newY = Math.max(-overflowY, Math.min(overflowY, dragStartRef.current.startSheetY + deltaY));
      
      setSheetOffset({ x: newX, y: newY });
    } else {
      // Option B / Zoomed in / Full Bleed Level 0: Pan map canvas smoothly inside the visible viewport borders
      const deltaX_pct = (deltaX / viewportRef.current.clientWidth) * 100;
      const deltaY_pct = (deltaY / viewportRef.current.clientHeight) * 100;
      
      setCamera(prev => ({
        ...prev,
        x: Math.max(0, Math.min(100, dragStartRef.current.startCameraX - deltaX_pct / effectiveZoom)),
        y: Math.max(0, Math.min(100, dragStartRef.current.startCameraY - deltaY_pct / effectiveZoom))
      }));
    }
  };

  const endDrag = () => {
    setIsDragging(false);
  };

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    startDrag(e.clientX, e.clientY);

    const handleMouseMoveDrag = (me) => {
      moveDrag(me.clientX, me.clientY);
    };

    const handleMouseUpDrag = () => {
      endDrag();
      window.removeEventListener('mousemove', handleMouseMoveDrag);
      window.removeEventListener('mouseup', handleMouseUpDrag);
    };

    window.addEventListener('mousemove', handleMouseMoveDrag);
    window.addEventListener('mouseup', handleMouseUpDrag);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length !== 1) return;
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    endDrag();
  };

  // Dynamic container styling and background grids
  const containerStyle = {};
  if (canvasIntegration === "drafting-grid") {
    const gridColor = theme === "archival" 
      ? "rgba(76, 108, 140, 0.12)" 
      : "rgba(129, 204, 204, 0.15)";
    containerStyle.backgroundImage = `
      linear-gradient(${gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
    `;
    containerStyle.backgroundSize = "32px 32px";
    containerStyle.backgroundPosition = "center center";
  }

  // Viewport styling
  let viewportClasses = "relative overflow-hidden pointer-events-auto z-10 m-auto transition-all duration-300 ";
  if (isDevMode) {
    viewportClasses += "cursor-crosshair border border-dashed border-coastal-sage/50 shadow-coastal-sage/10 ";
  }

  if (canvasIntegration === 'full-bleed') {
    viewportClasses += "w-full h-full bg-coastal-dark border-0 rounded-none shadow-none";
  } else if (canvasIntegration === 'ambient-float') {
    viewportClasses += "rounded-2xl border border-white/10 shadow-2xl bg-coastal-dark/95 backdrop-blur-md";
  } else {
    viewportClasses += "rounded-2xl border-[6px] border-double border-coastal-teal/35 shadow-2xl bg-coastal-dark";
  }

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`absolute inset-0 w-full h-full bg-coastal-dark flex items-center justify-center select-none overflow-hidden transition-all duration-500 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
      style={containerStyle}
    >
      {/* ── Ambient Blurred Backdrop ── */}
      <div className="absolute inset-0 w-full h-full overflow-hidden select-none pointer-events-none z-0">
        <AnimatePresence mode="wait">
          {activeBackdropImage && (
            <motion.div
              key={`ambient-${activeBackdropImage}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.35 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute inset-0 w-full h-full bg-cover bg-center"
              style={{
                backgroundImage: `url(${activeBackdropImage})`,
                filter: 'blur(40px)',
                transform: 'scale(1.2)',
              }}
            />
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-coastal-dark/30 pointer-events-none" />
      </div>

      {/* ── Canvas Aspect-Ratio Frame Viewport Sheet ── */}
      <div
        ref={viewportRef}
        onClick={handleViewportClick}
        className={viewportClasses}
        style={{
          width: dimensions.width ? `${dimensions.width}px` : '90%',
          height: dimensions.height ? `${dimensions.height}px` : 'auto',
          aspectRatio: `${targetRatio}`,
          transform: canvasIntegration === 'full-bleed' ? 'none' : `translate(${sheetOffset.x}px, ${sheetOffset.y}px)`
        }}
      >

        {/* ── 2D Spatial Transforming Canvas ── */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          style={{
            transformOrigin: '0% 0%',
            willChange: 'transform',
          }}
          animate={{
            x: `${translateX}%`,
            y: `${translateY}%`,
            scale: effectiveZoom,
            filter: motionBlur && camera.z !== 1 ? ['blur(2px)', 'blur(0px)'] : 'blur(0px)',
          }}
          transition={transitionConfig}
        >
          {/* LAYER 1 (BOTTOM): Background plates */}
          <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
            {data.level0.plateImage && (
              <motion.div
                className="absolute inset-0 bg-[length:100%_100%] bg-no-repeat bg-center"
                style={{ backgroundImage: `url(${data.level0.plateImage})` }}
                animate={{ 
                  opacity: l0Opacity,
                  scale: l0Scale,
                  transformOrigin: l0Origin
                }}
                transition={transitionConfig}
              />
            )}

            {data.level0.systems.map((sys) => {
              if (!sys.plateImage) return null;
              const isActive = camera.level === 1 && camera.activeNodeId === sys.id;
              const isChildActive = camera.level === 2 && activeSystem?.id === sys.id;
              
              const opacityVal = isActive ? 1.0 : (isChildActive ? 0.3 : 0.0);
              const scaleVal = isActive ? 1.0 : (isChildActive ? 4.0 : 0.4);
              const originVal = (isChildActive && activeSpecimen)
                ? `${activeSpecimen.coordinates?.x || 50}% ${activeSpecimen.coordinates?.y || 50}%`
                : `${sys.coordinates?.x || 50}% ${sys.coordinates?.y || 50}%`;

              return (
                <motion.div
                  key={sys.id}
                  className="absolute inset-0 bg-[length:100%_100%] bg-no-repeat bg-center"
                  style={{ backgroundImage: `url(${sys.plateImage})` }}
                  animate={{ 
                    opacity: opacityVal,
                    scale: scaleVal,
                    transformOrigin: originVal
                  }}
                  transition={transitionConfig}
                />
              );
            })}

            {data.level0.systems.flatMap((sys) => sys.children || []).map((spec) => {
              if (!spec.bgImage) return null;
              const isActive = camera.level === 2 && camera.activeNodeId === spec.id;
              
              const opacityVal = isActive ? 1.0 : 0.0;
              const scaleVal = isActive ? 1.0 : 0.25;
              const originVal = `${spec.coordinates?.x || 50}% ${spec.coordinates?.y || 50}%`;

              return (
                <motion.div
                  key={spec.id}
                  className="absolute inset-0 bg-[length:100%_100%] bg-no-repeat bg-center"
                  style={{ backgroundImage: `url(${spec.bgImage})` }}
                  animate={{ 
                    opacity: opacityVal,
                    scale: scaleVal,
                    transformOrigin: originVal
                  }}
                  transition={transitionConfig}
                />
              );
            })}
          </div>

          <div className="absolute inset-0 bg-gradient-to-b from-coastal-dark/15 via-transparent to-coastal-dark/25 pointer-events-none z-5" />

          {/* LAYER 2 (MIDDLE): SVG flow arrows */}
          {showAnnotations && (
            <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full pointer-events-none text-coastal-sage stroke-coastal-sage fill-none"
              >
                <defs>
                  <marker
                    id="arrowhead-spatial"
                    markerWidth="8"
                    markerHeight="6"
                    refX="6"
                    refY="3"
                    orient="auto"
                    markerUnits="userSpaceOnUse"
                  >
                    <polygon points="0 0, 8 3, 0 6" className="fill-coastal-sage text-coastal-sage" />
                  </marker>
                </defs>

                {activeAnnotations
                  .filter(ann => ann.type === 'arrow')
                  .map((ann) => (
                    <motion.path
                      key={ann.id}
                      d={`M ${ann.startX} ${ann.startY} L ${ann.endX} ${ann.endY}`}
                      strokeWidth="0.5"
                      markerEnd="url(#arrowhead-spatial)"
                      strokeDasharray="1.5,1.5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 0.85 }}
                      transition={{ duration: 1.2, ease: 'easeInOut', delay: 0.3 }}
                    />
                  ))}
              </svg>
            </div>
          )}

          {/* LAYER 3 (TOP): HTML Overlay Hotspots & Labels */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
            <AnimatePresence>
              {hotspots.map((node) => {
                const nextLevel = camera.level + 1;
                return (
                  <HotspotBeacon
                    key={node.id}
                    node={node}
                    level={camera.level}
                    onClick={() => {
                      if (dragStartRef.current.hasMoved) return;
                      focusNode(node, nextLevel);
                    }}
                    showBeacons={showBeacons}
                    direction={direction}
                    isDevMode={isDevMode}
                    onDrag={(newX, newY) => onUpdateCoordinates && onUpdateCoordinates(node.id, newX, newY)}
                  />
                );
              })}
            </AnimatePresence>
   
            <AnimatePresence>
              {showAnnotations && activeAnnotations
                .filter(ann => ann.type === 'text')
                .map((ann) => {
                  const annInitialScale = direction === 'down' ? (ann.level === 2 ? 0.25 : 0.4) : 3.5;
                  const annExitScale = direction === 'down' ? 3.5 : (ann.level === 2 ? 0.25 : 0.4);
                  return (
                    <motion.div
                      key={ann.id}
                      initial={{ opacity: 0, scale: annInitialScale }}
                      animate={{ opacity: 0.85, scale: 1 }}
                      exit={{ opacity: 0, scale: annExitScale }}
                      transition={transitionConfig}
                      className="absolute font-sans font-medium uppercase tracking-widest text-[12px] text-coastal-light/75 border-b border-dashed border-coastal-teal/30 px-1.5 py-0.5 select-none pointer-events-auto"
                      style={{
                        left: `${ann.x}%`,
                        top: `${ann.y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {ann.label}
                    </motion.div>
                  );
                })}
            </AnimatePresence>
   
            <AnimatePresence>
              {showAnnotations && activeAnnotations
                .filter(ann => ann.type === 'arrow')
                .map((ann) => {
                  const midX = (ann.startX + ann.endX) / 2;
                  const midY = (ann.startY + ann.endY) / 2;
                  const annInitialScale = direction === 'down' ? (ann.level === 2 ? 0.25 : 0.4) : 3.5;
                  const annExitScale = direction === 'down' ? 3.5 : (ann.level === 2 ? 0.25 : 0.4);
                  return (
                    <motion.div
                      key={`${ann.id}-label`}
                      initial={{ opacity: 0, scale: annInitialScale }}
                      animate={{ opacity: 0.85, scale: 1 }}
                      exit={{ opacity: 0, scale: annExitScale }}
                      transition={transitionConfig}
                      className="absolute font-sans font-bold uppercase tracking-wider text-[11px] text-coastal-sage bg-coastal-dark/90 px-2.5 py-0.5 rounded-full border border-coastal-teal/20 shadow-md whitespace-nowrap select-none pointer-events-auto"
                      style={{
                        left: `${midX}%`,
                        top: `${midY}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      {ann.label}
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>

          {/* Dev Mode gridlines */}
          {isDevMode && (
            <div className="absolute inset-0 w-full h-full border border-coastal-sage/35 pointer-events-none z-30 opacity-45">
              {[...Array(9)].map((_, i) => (
                <div
                  key={`h-${i}`}
                  className="absolute left-0 right-0 h-px bg-coastal-sage/20 border-dashed"
                  style={{ top: `${(i + 1) * 10}%` }}
                />
              ))}
              {[...Array(9)].map((_, i) => (
                <div
                  key={`v-${i}`}
                  className="absolute top-0 bottom-0 w-px bg-coastal-sage/20 border-dashed"
                  style={{ left: `${(i + 1) * 10}%` }}
                />
              ))}
              <div className="absolute left-1/2 top-1/2 w-4 h-px bg-coastal-sage -translate-x-1/2 -translate-y-1/2" />
              <div className="absolute left-1/2 top-1/2 h-4 w-px bg-coastal-sage -translate-x-1/2 -translate-y-1/2" />
            </div>
          )}
        </motion.div>
      </div>

      {/* Dev coords & override layout manager overlay */}
      <AnimatePresence>
        {isDevMode && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="absolute bottom-6 right-6 bg-coastal-dark/95 backdrop-blur-md px-6 py-5 rounded-2xl border border-coastal-sage/40 shadow-2xl flex flex-col gap-4 z-[9999] pointer-events-auto font-sans w-[350px]"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-coastal-sage font-extrabold flex items-center gap-1.5 select-none">
                  <span className="w-2 h-2 rounded-full bg-coastal-sage animate-ping" />
                  Ecosystem Developer Panel
                </span>
                {hasOverrides && (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold select-none animate-pulse">
                    Overrides Active
                  </span>
                )}
              </div>
              <p className="text-[12.5px] text-coastal-light/65 leading-normal select-none">
                Drag any beacon on the canvas to visually adjust its position. Click the canvas to log standard XY coordinates.
              </p>
            </div>

            <div className="h-px bg-coastal-teal/15 w-full" />

            {/* Display last captured coordinates */}
            {lastCoordinates && (
              <div className="flex flex-col gap-1.5 bg-coastal-dark/60 p-3 rounded-xl border border-coastal-teal/15">
                <span className="text-[9px] uppercase tracking-widest text-coastal-light/45 font-bold select-none">
                  Last Copied Coordinates
                </span>
                <span className="text-xs text-coastal-light font-mono select-all break-all">
                  "coordinates": &#123; "x": {lastCoordinates.x.toFixed(1)}, "y": {lastCoordinates.y.toFixed(1)} &#125;
                </span>
              </div>
            )}

            {/* Development Action buttons */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  const jsonString = JSON.stringify(data, null, 2);
                  navigator.clipboard?.writeText(jsonString)
                    .then(() => {
                      setCopiedFullJson(true);
                      setTimeout(() => setCopiedFullJson(false), 2000);
                    })
                    .catch(err => console.error("Failed to copy full JSON:", err));
                }}
                className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center border ${
                  copiedFullJson
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-coastal-teal/20 to-coastal-sage/20 border-coastal-teal/30 hover:border-coastal-sage text-coastal-light'
                }`}
              >
                {copiedFullJson ? '✓ Copied Full JSON!' : 'Copy Full data.json'}
              </button>

              {hasOverrides && (
                <button
                  onClick={() => {
                    if (confirm("Reset all visual beacon coordinates to defaults? This will clear your browser overrides.")) {
                      onResetCoordinates && onResetCoordinates();
                    }
                  }}
                  className="w-full py-2 px-4 rounded-xl text-xs font-semibold uppercase tracking-wider text-coastal-light/50 border border-coastal-teal/10 hover:text-coastal-light hover:border-coastal-teal/30 transition-all cursor-pointer bg-transparent"
                >
                  Reset to defaults
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function HotspotBeacon({ node, level, onClick, showBeacons, direction, isDevMode, onDrag }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ hasDragged: false });

  const initialScale = direction === 'down' ? 0.4 : 3.5;
  const exitScale = direction === 'down' ? 3.5 : 0.4;

  const handlePointerDown = (e) => {
    if (!isDevMode) return;
    
    e.stopPropagation();
    e.preventDefault();
    
    const beaconEl = e.currentTarget;
    const parentEl = beaconEl.parentElement;
    if (!parentEl) return;
    
    const parentRect = parentEl.getBoundingClientRect();
    setIsDragging(true);
    dragRef.current.hasDragged = false;
    
    const handlePointerMove = (moveEvent) => {
      dragRef.current.hasDragged = true;
      const pctX = ((moveEvent.clientX - parentRect.left) / parentRect.width) * 100;
      const pctY = ((moveEvent.clientY - parentRect.top) / parentRect.height) * 100;
      
      const newX = parseFloat(Math.max(0, Math.min(100, pctX)).toFixed(2));
      const newY = parseFloat(Math.max(0, Math.min(100, pctY)).toFixed(2));
      
      onDrag && onDrag(newX, newY);
    };
    
    const handlePointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: exitScale }}
      transition={transitionConfig}
      className={`absolute flex flex-col items-center justify-center group z-20 pointer-events-auto select-none ${
        isDevMode ? 'cursor-move' : 'cursor-pointer'
      }`}
      style={{
        left: `${node.coordinates?.x}%`,
        top: `${node.coordinates?.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onPointerDown={handlePointerDown}
      onClick={(e) => {
        e.stopPropagation();
        if (dragRef.current.hasDragged) {
          dragRef.current.hasDragged = false; // Reset
          return;
        }
        onClick();
      }}
    >
      <div className="relative flex items-center justify-center">
        {showBeacons && (
          <motion.div
            className={`absolute rounded-full border border-current pointer-events-none ${
              level === 0 ? 'text-coastal-sage' : 'text-coastal-light'
            }`}
            animate={{
              scale: [1, 2.1],
              opacity: [0.45, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            style={{ width: 44, height: 44 }}
          />
        )}

        {showBeacons && (
          <motion.div
            className={`absolute rounded-full border border-current pointer-events-none ${
              level === 0 ? 'text-coastal-sage' : 'text-coastal-light'
            }`}
            animate={{
              scale: isHovered ? [1, 1.6, 1] : [1, 1.3, 1],
              opacity: isHovered ? [0.35, 0.7, 0.35] : [0.15, 0.4, 0.15],
            }}
            transition={{
              duration: isHovered ? 1.2 : 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{ width: 44, height: 44 }}
          />
        )}

        <div
          className={`w-8 h-8 rounded-full border-2 shadow-xl flex items-center justify-center transition-all duration-300 ${
            isHovered || isDragging
              ? 'scale-115 border-coastal-light shadow-coastal-sage/30 shadow-2xl'
              : 'border-coastal-light/80 shadow-md'
          } ${
            level === 0
              ? 'bg-gradient-to-br from-coastal-teal to-coastal-forest'
              : 'bg-gradient-to-br from-coastal-sage to-coastal-teal'
          } ${isDragging ? 'ring-4 ring-coastal-sage/35 animate-pulse' : ''}`}
        >
          <motion.div
            className="w-2.5 h-2.5 bg-white rounded-full"
            animate={isHovered || isDragging ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 6, scale: 0.9, x: '-50%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 mb-3.5 px-4.5 py-2 bg-coastal-dark/95 backdrop-blur-md text-coastal-light text-[14px] font-bold rounded-full whitespace-nowrap border border-coastal-sage/60 shadow-2xl font-sans flex items-center gap-1.5 pointer-events-none z-50"
          >
            {node.title}
            <span className="text-[10px] text-coastal-sage">→</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
