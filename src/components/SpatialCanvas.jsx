import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCamera } from '../context/CameraContext';
import { Layers } from 'lucide-react';

const transitionConfig = {
  type: 'spring',
  stiffness: 90,
  damping: 18,
  mass: 0.9,
};

export default function SpatialCanvas({ data, showBeacons, motionBlur, showAnnotations, squeezeMitigation, theme, canvasIntegration }) {
  const { camera, focusNode, isDevMode, logClickCoordinate, lastCoordinates } = useCamera();
  const viewportRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [containerHeight, setContainerHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ scrollTop: 0, startY: 0 });

  // Track active zoom direction (down vs up) for seamless 3D spatial alignment
  const prevLevelRef = useRef(camera.level);
  const [direction, setDirection] = useState('down');
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (camera.level > prevLevelRef.current) {
      setDirection('down');
    } else if (camera.level < prevLevelRef.current) {
      setDirection('up');
    }
    prevLevelRef.current = camera.level;
  }, [camera.level]);

  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
  }, [canvasIntegration]);

  const handleMouseMove = (e) => {
    if (canvasIntegration !== "autofocus-pan" || !containerRef.current || camera.level > 0) {
      if (panOffset.x !== 0 || panOffset.y !== 0) {
        setPanOffset({ x: 0, y: 0 });
      }
      return;
    }
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 to 1
    const y = (e.clientY - rect.top) / rect.height; // 0 to 1
    
    // Autopanning threshold (outer 15%)
    const threshold = 0.15;
    let targetX = 0;
    let targetY = 0;
    
    // Horizontal panning
    if (x < threshold) {
      const factor = (threshold - x) / threshold; // 0 to 1
      targetX = factor * 15; // up to +15% translation offset
    } else if (x > 1 - threshold) {
      const factor = (x - (1 - threshold)) / threshold; // 0 to 1
      targetX = -factor * 15; // up to -15% translation offset
    }
    
    // Vertical panning
    if (y < threshold) {
      const factor = (threshold - y) / threshold; // 0 to 1
      targetY = factor * 15; // up to +15% translation offset
    } else if (y > 1 - threshold) {
      const factor = (y - (1 - threshold)) / threshold; // 0 to 1
      targetY = -factor * 15; // up to -15% translation offset
    }
    
    setPanOffset({ x: targetX, y: targetY });
  };

  const handleMouseLeave = () => {
    if (canvasIntegration === "autofocus-pan") {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerHeight(height);
        
        const targetRatio = 1024 / 571;
        let finalW, finalH;

        if (canvasIntegration === "autofocus-pan" || squeezeMitigation === "focal-width") {
          // True Cover-Fit: Scale canvas to completely cover the container, cropping overflow
          const containerRatio = width / height;
          if (containerRatio > targetRatio) {
            // Container is wider -> fit to width
            finalW = width;
            finalH = width / targetRatio;
          } else {
            // Container is taller -> fit to height
            finalH = height;
            finalW = height * targetRatio;
          }
        } else {
          // Standard contain fit
          const maxW = width * 0.9;
          const maxH = height * 0.9;
          finalW = maxW;
          finalH = maxW / targetRatio;
          
          if (finalH > maxH) {
            finalH = maxH;
            finalW = maxH * targetRatio;
          }
        }
        
        setDimensions({ width: finalW, height: finalH });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [squeezeMitigation, canvasIntegration]);

  // Resolve current active plate details
  let activeSystem = null;
  let activeSpecimen = null;

  if (camera.level === 1) {
    activeSystem = data.level0.systems.find(sys => sys.id === camera.activeNodeId);
  } else if (camera.level === 2) {
    // Find specimen by searching all systems' children
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
    l0Scale = 6.25; // Compounding scale (2.5 * 2.5) to keep double-zoom perfectly aligned
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

  // Resolve annotations based on level, tagging each with its native level for robust exit animation scaling
  let activeAnnotations = [];
  if (camera.level === 0) {
    activeAnnotations = (data.level0.annotations || []).map(ann => ({ ...ann, level: 0 }));
  } else if (camera.level === 1 && activeSystem) {
    activeAnnotations = (activeSystem.annotations || []).map(ann => ({ ...ann, level: 1 }));
  } else if (camera.level === 2 && activeSpecimen) {
    activeAnnotations = (activeSpecimen.annotations || []).map(ann => ({ ...ann, level: 2 }));
  }

  // Forward transform coordinates (focal point centering math)
  const translateX = 50 - camera.x * camera.z;
  const translateY = 50 - camera.y * camera.z;

  // Handles developer mode coordinate logging clicks
  const handleViewportClick = (e) => {
    if (!isDevMode || !viewportRef.current) return;

    const rect = viewportRef.current.getBoundingClientRect();
    // Screen percentage relative to the viewport
    const pctX = ((e.clientX - rect.left) / rect.width) * 100;
    const pctY = ((e.clientY - rect.top) / rect.height) * 100;

    // Inverse transform math to resolve exact normalized canvas coordinates
    const canvasX = (pctX - (50 - camera.x * camera.z)) / camera.z;
    const canvasY = (pctY - (50 - camera.y * camera.z)) / camera.z;

    logClickCoordinate(canvasX, canvasY);
  };

  const handleMouseDown = (e) => {
    if (canvasIntegration === 'autofocus-pan' || squeezeMitigation !== 'focal-width') return;
    if (e.target.closest('.pointer-events-auto') && !e.target.closest('.drag-trigger')) return;
    
    setIsDragging(true);
    dragStartRef.current = {
      scrollTop: containerRef.current.scrollTop,
      startY: e.clientY
    };

    const handleMouseMoveDrag = (me) => {
      const deltaY = me.clientY - dragStartRef.current.startY;
      containerRef.current.scrollTop = dragStartRef.current.scrollTop - deltaY;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMouseMoveDrag);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMoveDrag);
    window.addEventListener('mouseup', handleMouseUp);
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
  let viewportClasses = "relative overflow-hidden pointer-events-auto z-10 m-auto transition-all duration-500 ";
  if (isDevMode) {
    viewportClasses += "cursor-crosshair border border-dashed border-coastal-sage/50 shadow-coastal-sage/10 ";
  }

  if (canvasIntegration === "drafting-grid") {
    viewportClasses += "rounded-2xl border-[6px] border-double border-coastal-teal/35 shadow-2xl bg-coastal-dark";
  } else if (canvasIntegration === "seamless-bleed") {
    viewportClasses += "rounded-xl border border-coastal-teal/10 shadow-lg bg-coastal-dark";
  } else if (canvasIntegration === "autofocus-pan") {
    viewportClasses += "border-none rounded-none shadow-none bg-coastal-dark";
  } else {
    viewportClasses += "rounded-2xl shadow-2xl border border-coastal-teal/20 bg-coastal-dark";
  }

  const animX = canvasIntegration === "autofocus-pan" ? `${translateX + panOffset.x}%` : `${translateX}%`;
  const animY = canvasIntegration === "autofocus-pan" ? `${translateY + panOffset.y}%` : `${translateY}%`;

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`absolute inset-0 w-full h-full bg-coastal-dark flex items-center justify-center select-none scrollbar-custom transition-all duration-500 ${
        canvasIntegration !== 'autofocus-pan' && squeezeMitigation === 'focal-width'
          ? 'overflow-y-auto py-8 ' + (isDragging ? 'cursor-grabbing' : 'cursor-grab')
          : 'overflow-hidden'
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
                transform: 'scale(1.2)', // Prevents the screen border from showing transparent edges due to blur
              }}
            />
          )}
        </AnimatePresence>
        {/* Subtle dark vignette to blend the backdrop and prevent it from distracting the user */}
        <div className="absolute inset-0 bg-coastal-dark/30 pointer-events-none" />
      </div>

      {/* ── Canvas Aspect-Ratio Frame Wrapper ── */}
      <div
        ref={viewportRef}
        onClick={handleViewportClick}
        className={viewportClasses}
        style={{
          width: dimensions.width ? `${dimensions.width}px` : '90%',
          height: dimensions.height ? `${dimensions.height}px` : 'auto',
          aspectRatio: '1024 / 571',
          marginTop: (canvasIntegration !== 'autofocus-pan' && squeezeMitigation === 'focal-width' && dimensions.height > containerHeight) ? '2rem' : 'auto',
          marginBottom: (canvasIntegration !== 'autofocus-pan' && squeezeMitigation === 'focal-width' && dimensions.height > containerHeight) ? '2rem' : 'auto',
        }}
      >
        {/* Seamless bleed inner vignette to blend boundaries */}
        {canvasIntegration === "seamless-bleed" && (
          <div 
            className="absolute inset-0 pointer-events-none z-5 transition-all duration-500" 
            style={{
              boxShadow: "inset 0 0 80px 40px var(--color-coastal-dark)"
            }}
          />
        )}

      {/* ── 2D Spatial Transforming Canvas ── */}
      <motion.div
        className="absolute inset-0 w-full h-full"
        style={{
          transformOrigin: '0% 0%',
          willChange: 'transform',
        }}
        animate={{
          x: animX,
          y: animY,
          scale: camera.z,
          filter: motionBlur && camera.z !== 1 ? ['blur(2px)', 'blur(0px)'] : 'blur(0px)',
        }}
        transition={transitionConfig}
      >
        {/* ── LAYER 1 (BOTTOM): Raster Plate Backgrounds with Cross-fades ── */}
        <div className="absolute inset-0 w-full h-full select-none pointer-events-none">
          {/* Level 0 Baseline Map */}
          {data.level0.plateImage && (
            <motion.div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${data.level0.plateImage})` }}
              animate={{ 
                opacity: l0Opacity,
                scale: l0Scale,
                transformOrigin: l0Origin
              }}
              transition={transitionConfig}
            />
          )}

          {/* Level 1 Subsystem Plates */}
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
                className="absolute inset-0 bg-cover bg-center"
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

          {/* Level 2 Specimen Plates */}
          {data.level0.systems.flatMap((sys) => sys.children || []).map((spec) => {
            if (!spec.bgImage) return null;
            const isActive = camera.level === 2 && camera.activeNodeId === spec.id;
            
            const opacityVal = isActive ? 1.0 : 0.0;
            const scaleVal = isActive ? 1.0 : 0.25;
            const originVal = `${spec.coordinates?.x || 50}% ${spec.coordinates?.y || 50}%`;

            return (
              <motion.div
                key={spec.id}
                className="absolute inset-0 bg-cover bg-center"
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

        {/* Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-coastal-dark/15 via-transparent to-coastal-dark/25 pointer-events-none" />

        {/* ── LAYER 2 (MIDDLE): SVG Dynamic Vector Path Overlay ── */}
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

              {/* Render Dotted Self-Drawing Flow Arrows */}
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

        {/* ── LAYER 3 (TOP): HTML UI Layer (Hotspots, Badges, Labels) ── */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Active Hotspots */}
          <AnimatePresence>
            {hotspots.map((node) => {
              const nextLevel = camera.level + 1;
              return (
                <HotspotBeacon
                  key={node.id}
                  node={node}
                  level={camera.level}
                  onClick={() => focusNode(node, nextLevel)}
                  showBeacons={showBeacons}
                  direction={direction}
                />
              );
            })}
          </AnimatePresence>
 
          {/* HTML Text Labels */}
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
                    className="absolute font-sans font-medium uppercase tracking-widest text-[9px] text-coastal-light/75 border-b border-dashed border-coastal-teal/30 px-1 py-0.5 select-none pointer-events-auto"
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
 
          {/* HTML Midpoint Arrow Labels */}
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
                    className="absolute font-sans font-bold uppercase tracking-wider text-[8px] text-coastal-sage bg-coastal-dark/90 px-2 py-0.5 rounded-full border border-coastal-teal/20 shadow-md whitespace-nowrap select-none pointer-events-auto"
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

        {/* ── Optional Dev Mode Grid overlay ── */}
        {isDevMode && (
          <div className="absolute inset-0 w-full h-full border border-coastal-sage/35 pointer-events-none z-30 opacity-45">
            {/* Horizontal Gridlines */}
            {[...Array(9)].map((_, i) => (
              <div
                key={`h-${i}`}
                className="absolute left-0 right-0 h-px bg-coastal-sage/20 border-dashed"
                style={{ top: `${(i + 1) * 10}%` }}
              />
            ))}
            {/* Vertical Gridlines */}
            {[...Array(9)].map((_, i) => (
              <div
                key={`v-${i}`}
                className="absolute top-0 bottom-0 w-px bg-coastal-sage/20 border-dashed"
                style={{ left: `${(i + 1) * 10}%` }}
              />
            ))}
            {/* Centered crosshair */}
            <div className="absolute left-1/2 top-1/2 w-4 h-px bg-coastal-sage -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute left-1/2 top-1/2 h-4 w-px bg-coastal-sage -translate-x-1/2 -translate-y-1/2" />
          </div>
        )}
      </motion.div>
      </div>

      {/* Dev HUD Badge - float centered over parent viewport */}
      <AnimatePresence>
        {isDevMode && lastCoordinates && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-coastal-dark/95 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-coastal-sage/50 shadow-2xl flex items-center gap-4 z-[9999] pointer-events-auto font-sans"
          >
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-coastal-sage font-bold select-none">
                Captured Coordinates
              </span>
              <span className="text-xs text-coastal-light font-mono select-all">
                "coordinates": &#123; "x": {lastCoordinates.x.toFixed(1)}, "y": {lastCoordinates.y.toFixed(1)} &#125;
              </span>
            </div>
            <div className="h-6 w-px bg-coastal-teal/20" />
            <span className="text-[10px] text-coastal-teal font-medium uppercase tracking-wider select-none animate-pulse bg-coastal-teal/15 px-2.5 py-1 rounded-lg border border-coastal-teal/30">
              Copied!
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
/* ──────────────────────────────────────────────────────────────────
   HotspotBeacon – projected hotspot button
   ────────────────────────────────────────────────────────────────── */
function HotspotBeacon({ node, level, onClick, showBeacons, direction }) {
  const [isHovered, setIsHovered] = useState(false);

  const initialScale = direction === 'down' ? 0.4 : 3.5;
  const exitScale = direction === 'down' ? 3.5 : 0.4;

  return (
    <motion.div
      initial={{ opacity: 0, scale: initialScale }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: exitScale }}
      transition={transitionConfig}
      className="absolute flex flex-col items-center justify-center cursor-pointer group z-20 pointer-events-auto"
      style={{
        left: `${node.coordinates?.x}%`,
        top: `${node.coordinates?.y}%`,
        transform: 'translate(-50%, -50%)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="relative flex items-center justify-center">
        {/* Continuous outer expanding ripple */}
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

        {/* Breathing pulse ring */}
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

        {/* Core interactive dot */}
        <div
          className={`w-8 h-8 rounded-full border-2 shadow-xl flex items-center justify-center transition-all duration-300 ${
            isHovered
              ? 'scale-115 border-coastal-light shadow-coastal-sage/30 shadow-2xl'
              : 'border-coastal-light/80 shadow-md'
          } ${
            level === 0
              ? 'bg-gradient-to-br from-coastal-teal to-coastal-forest'
              : 'bg-gradient-to-br from-coastal-sage to-coastal-teal'
          }`}
        >
          <motion.div
            className="w-2.5 h-2.5 bg-white rounded-full"
            animate={isHovered ? { scale: [1, 1.4, 1] } : { scale: 1 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          />
        </div>
      </div>

      {/* Floating tooltip pill */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 6, scale: 0.9, x: '-50%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute bottom-full left-1/2 mb-3.5 px-4 py-1.5 bg-coastal-dark/95 backdrop-blur-md text-coastal-light text-xs font-semibold rounded-full whitespace-nowrap border border-coastal-sage/60 shadow-2xl font-sans flex items-center gap-1.5 pointer-events-none z-50"
          >
            {node.title}
            <span className="text-[10px] text-coastal-sage">→</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
