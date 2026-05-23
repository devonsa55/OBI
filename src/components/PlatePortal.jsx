import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ──────────────────────────────────────────────────────────────────
   Plate transition variants
   
   "down" = drilling deeper (L0→L1→L2):
     • Exiting plate  : scale 1 → 4, opacity 1 → 0   (zooms INTO hotspot)
     • Entering plate : scale 0.5 → 1, opacity 0 → 1  (emerges from portal)
   
   "up" = backing out (L2→L1→L0):
     • Exiting plate  : scale 1 → 0.5, opacity 1 → 0  (shrinks back)
     • Entering plate : scale 4 → 1, opacity 0 → 1    (zooms OUT from portal)
   ────────────────────────────────────────────────────────────────── */
const plateVariants = {
  initial: (custom) => ({
    scale: custom.direction === 'down' ? 0.5 : 4,
    opacity: 0,
    filter: custom.blur ? 'blur(6px)' : 'blur(0px)',
  }),
  animate: {
    scale: 1,
    opacity: 1,
    filter: 'blur(0px)',
    transition: {
      duration: 0.8,
      ease: [0.76, 0, 0.24, 1],
    },
  },
  exit: (custom) => ({
    scale: custom.direction === 'down' ? 4 : 0.5,
    opacity: 0,
    filter: custom.blur ? 'blur(6px)' : 'blur(0px)',
    zIndex: 2, // Exiting plate renders on top
    transition: {
      duration: 0.8,
      ease: [0.76, 0, 0.24, 1],
    },
  }),
};

/* ──────────────────────────────────────────────────────────────────
   PlatePortal – the core multi-plate rendering engine
   ────────────────────────────────────────────────────────────────── */
export default function PlatePortal({
  data,
  currentLevel,
  activeSystem,
  activeSpecimen,
  transitionDirection,
  zoomOrigin,
  onTransition,
  showBeacons,
  motionBlur,
}) {
  // Resolve which plate to render based on the active level
  let plateKey, plateImage, hotspots, level;

  if (currentLevel === 0) {
    plateKey = 'level-0';
    plateImage = data.level0.plateImage;
    hotspots = data.level0.systems;
    level = 0;
  } else if (currentLevel === 1 && activeSystem) {
    plateKey = `level-1-${activeSystem.id}`;
    plateImage = activeSystem.plateImage;
    hotspots = activeSystem.children || [];
    level = 1;
  } else if (currentLevel === 2 && activeSpecimen) {
    plateKey = `level-2-${activeSpecimen.id}`;
    plateImage = activeSpecimen.bgImage;
    hotspots = [];
    level = 2;
  }

  const customData = { direction: transitionDirection, blur: motionBlur };

  return (
    <div
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{
        '--portal-origin-x': `${zoomOrigin.x}%`,
        '--portal-origin-y': `${zoomOrigin.y}%`,
      }}
    >
      <AnimatePresence custom={customData}>
        <motion.div
          key={plateKey}
          custom={customData}
          variants={plateVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="absolute inset-0 w-full h-full plate-container"
          style={{
            transformOrigin: 'var(--portal-origin-x) var(--portal-origin-y)',
            willChange: 'transform, opacity, filter',
          }}
        >
          {/* ── Plate background image ────────────────────────────── */}
          {plateImage && (
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${plateImage})`,
                backgroundSize: '100% 100%',
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
              }}
            />
          )}

          {/* ── Gradient fallback when no plate image ─────────────── */}
          {!plateImage && (
            <div className="absolute inset-0 bg-gradient-to-br from-coastal-forest via-coastal-via to-coastal-dark">
              <div className="absolute inset-0 opacity-15 pointer-events-none">
                <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] rounded-full border-2 border-dashed border-coastal-sage" />
                <div className="absolute top-[20%] left-[60%] w-[600px] h-[600px] rounded-full border border-coastal-teal/50" />
                <div className="absolute top-[70%] left-[20%] w-[300px] h-[300px] rounded-full border border-coastal-light/30" />
              </div>
            </div>
          )}

          {/* ── Contrast scrim for legible hotspot labels ──────── */}
          {plateImage && (
            <div className="absolute inset-0 bg-gradient-to-b from-coastal-dark/20 via-transparent to-coastal-dark/35 pointer-events-none" />
          )}
          {/* ── Hotspot markers ────────────────────────────────── */}
          <AnimatePresence>
            {hotspots.map((node) => (
              <Hotspot
                key={node.id}
                node={node}
                level={level}
                onClick={() => onTransition(node, level + 1)}
                showBeacons={showBeacons}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────
   Hotspot – clickable portal entry point on each plate
   (Visual design preserved from the original ZoomCanvas)
   ────────────────────────────────────────────────────────────────── */
function Hotspot({ node, level, onClick, showBeacons }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.6 }}
      transition={{ duration: 0.4, ease: 'easeOut', delay: 0.6 }}
      className="absolute flex flex-col items-center justify-center cursor-pointer group z-10"
      style={{
        left: `${node.coordinates.x}%`,
        top: `${node.coordinates.y}%`,
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
