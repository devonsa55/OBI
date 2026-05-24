import React, { useState, useEffect, useRef } from 'react';
import SpatialCanvas from './components/SpatialCanvas';
import SidebarDrawer from './components/SidebarDrawer';
import { CameraProvider, useCamera } from './context/CameraContext';
import obData from './data/coastalData.json';
import mangroveData from './data/mangroveData.json';
import { Compass, Sparkles, Sliders, X, Eye, EyeOff, Volume2, VolumeX, Tag, Tv, Home, Locate, ZoomIn, ZoomOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const THEMES = [
  { id: "default", name: "Sage Dark", primary: "bg-[#81cccc]", secondary: "bg-[#2f4f4f]" },
  { id: "light", name: "Sage Light", primary: "bg-[#529999]", secondary: "bg-[#eff5f5]" },
  { id: "archival", name: "Archival Draft", primary: "bg-[#b55138]", secondary: "bg-[#e5dac4]" },
  { id: "wireframe", name: "Wireframe Draft", primary: "bg-[#ffffff] border border-neutral-400", secondary: "bg-[#000000]" }
];

function Toggle({ label, checked, onChange, activeIcon, inactiveIcon, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5 select-none pointer-events-auto">
      <div className="flex flex-col gap-0.5 max-w-[72%]">
        <span className="text-[15.5px] font-bold text-coastal-light/95 leading-none flex items-center gap-2">
          {checked ? activeIcon : inactiveIcon}
          {label}
        </span>
        {description && (
          <span className="text-[12.5px] text-coastal-light/40 leading-normal font-sans font-light">
            {description}
          </span>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-300 relative focus:outline-none cursor-pointer flex items-center shrink-0 ${
          checked ? 'bg-gradient-to-r from-coastal-teal to-coastal-sage shadow shadow-coastal-sage/20' : 'bg-coastal-forest/30 border border-coastal-teal/30'
        }`}
      >
        <motion.div
          layout
          className="w-5 h-5 rounded-full bg-white shadow"
          animate={{ x: 20 * checked }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

// Mapping of available ecosystems
const ECOSYSTEMS = {
  "ocean-beach": {
    name: "Ocean Beach, SF",
    data: obData
  },
  "florida-mangroves": {
    name: "Florida Mangroves",
    data: mangroveData
  }
};

const ECOSYSTEM_SOUNDS = {
  "ocean-beach": "https://www.soundjay.com/nature/sounds/ocean-wave-1.mp3",
  "florida-mangroves": "https://www.soundjay.com/nature/sounds/cricket-chirping-1.mp3"
};

function AppContent() {
  const [selectedEcoKey, setSelectedEcoKey] = useState("ocean-beach");
  
  // Manage ecosystem data in state, initializing from localStorage overrides if present, otherwise default files
  const [ecosystemsData, setEcosystemsData] = useState(() => {
    try {
      const saved = localStorage.getItem('obi-ecosystem-data-overrides');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn("Failed to load local storage overrides:", e);
    }
    return {
      "ocean-beach": obData,
      "florida-mangroves": mangroveData
    };
  });

  const activeData = ecosystemsData[selectedEcoKey];
  const activeEco = ECOSYSTEMS[selectedEcoKey];

  const handleUpdateCoordinates = (nodeId, x, y) => {
    setEcosystemsData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const currentEcoData = updated[selectedEcoKey];
      
      let found = false;
      
      // Search in Level 0 annotations
      if (currentEcoData.level0.annotations) {
        const ann = currentEcoData.level0.annotations.find(a => a.id === nodeId);
        if (ann) {
          ann.x = x;
          ann.y = y;
          found = true;
        }
      }
      
      // Search in Level 0 systems
      if (!found && currentEcoData.level0.systems) {
        for (const sys of currentEcoData.level0.systems) {
          if (sys.id === nodeId) {
            sys.coordinates = { x, y };
            found = true;
            break;
          }
          
          // Search in system children
          if (sys.children) {
            const child = sys.children.find(c => c.id === nodeId);
            if (child) {
              child.coordinates = { x, y };
              found = true;
              break;
            }
          }
        }
      }
      
      // Save overrides to local storage for persistence
      try {
        localStorage.setItem('obi-ecosystem-data-overrides', JSON.stringify(updated));
      } catch (e) {
        console.error("Failed to save local storage overrides:", e);
      }
      
      return updated;
    });
  };

  const handleResetCoordinates = () => {
    try {
      localStorage.removeItem('obi-ecosystem-data-overrides');
    } catch (e) {}
    setEcosystemsData({
      "ocean-beach": obData,
      "florida-mangroves": mangroveData
    });
  };

  // 2D Spatial Camera Global Context Telemetry
  const { camera, setCamera, focusNode, resetCamera, isDevMode, setIsDevMode } = useCamera();

  // Resolve current active plate details from global camera telemetry
  let activeSystem = null;
  let activeSpecimen = null;

  if (camera.level === 1) {
    activeSystem = activeData.level0.systems.find(sys => sys.id === camera.activeNodeId);
  } else if (camera.level === 2) {
    for (const sys of activeData.level0.systems) {
      const spec = sys.children?.find(child => child.id === camera.activeNodeId);
      if (spec) {
        activeSpecimen = spec;
        activeSystem = sys;
        break;
      }
    }
  }

  const currentLevel = camera.level;
  const activeNode = currentLevel === 2 ? activeSpecimen : (currentLevel === 1 ? activeSystem : null);

  const [showHelper, setShowHelper] = useState(false);

  // Settings State Managed Locally & Orchestrated inside Unified Drawer
  const [showBeacons, setShowBeacons] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [motionBlur, setMotionBlur] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [theme, setTheme] = useState("light");
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [layoutMode, setLayoutMode] = useState("theater-mode");
  const [canvasIntegration, setCanvasIntegration] = useState("full-bleed");

  const audioRef = useRef(null);

  // Auto-expand sidebar when user clicks a system or specimen hotspot
  useEffect(() => {
    if (currentLevel > 0) {
      setIsCollapsed(false);
    }
  }, [currentLevel, camera.activeNodeId]);

  // Theme Synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Onboarding Helper
  useEffect(() => {
    const hasVisited = localStorage.getItem('has-visited-coastal-canvas');
    if (!hasVisited) {
      setShowHelper(true);
    }
  }, []);

  const dismissHelper = () => {
    localStorage.setItem('has-visited-coastal-canvas', 'true');
    setShowHelper(false);
  };

  // Auto-dismiss helper when user navigates into a plate
  useEffect(() => {
    if (currentLevel > 0 && showHelper) {
      dismissHelper();
    }
  }, [currentLevel, showHelper]);

  // Ambient Soundtrack Management
  useEffect(() => {
    const currentTrack = ECOSYSTEM_SOUNDS[selectedEcoKey];
    
    if (!audioRef.current) {
      audioRef.current = new Audio(currentTrack);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.25;
    } else {
      if (audioRef.current.src !== currentTrack) {
        const wasPlaying = isAudioPlaying;
        if (wasPlaying) {
          audioRef.current.pause();
        }
        audioRef.current.src = currentTrack;
        audioRef.current.load();
        if (wasPlaying) {
          audioRef.current.play().catch(err => console.log("Soundtrack change error:", err));
        }
      }
    }

    if (isAudioPlaying) {
      audioRef.current.play().catch(err => {
        console.log("Audio playback blocked by autoplay settings:", err);
        setIsAudioPlaying(false);
      });
    } else {
      audioRef.current.pause();
    }
  }, [isAudioPlaying, selectedEcoKey]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const triggerReset = () => {
    setIsCollapsed(false);
    resetCamera();
  };

  const handleEcosystemChange = (key) => {
    setSelectedEcoKey(key);
    triggerReset();
  };

  const isTheater = layoutMode === "theater-mode";

  return (
    <div className="w-screen h-screen bg-coastal-dark font-sans text-coastal-light relative select-none flex flex-col overflow-hidden" data-theme={theme}>
      
      {/* ══ Unified Top Chrome: App Header + Wayfinding HUD row ══
           Both rows live ABOVE the workspace — canvas always starts below. */}
      <div className="w-full bg-coastal-dark/95 pointer-events-auto select-none font-sans shrink-0 z-45 border-b border-coastal-teal/20">

        {/* Row 1: Branding + Settings */}
        <div className="max-w-[1300px] mx-auto w-full px-6 md:px-12 lg:px-20 flex items-center justify-between py-4">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-coastal-teal to-coastal-forest rounded border border-coastal-sage/20">
              <Compass className="w-5 h-5 text-coastal-light animate-spin-slow" />
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-extrabold tracking-tight text-coastal-light uppercase leading-none">
                Coastal Canvas
              </span>
              <span className="text-[12px] text-coastal-sage uppercase tracking-wider font-semibold mt-1">
                Ecosystem Research Deck
              </span>
            </div>
          </div>

          {/* Right: Settings button */}
          <button
            onClick={() => setShowSettings(v => !v)}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
              showSettings
                ? 'bg-coastal-teal/25 border-coastal-sage text-coastal-sage'
                : 'bg-coastal-forest/20 border-coastal-teal/20 text-coastal-light/60 hover:text-coastal-sage hover:border-coastal-sage/40 hover:scale-[1.01] active:scale-[0.99]'
            }`}
            title="Canvas Settings"
          >
            {isAudioPlaying ? (
              <div className="flex items-end gap-[2px] h-3.5 w-3.5 shrink-0 overflow-hidden select-none mb-[1px]">
                {[...Array(3)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-[2px] bg-coastal-sage rounded-full"
                    animate={{ height: ["2px", "12px", "2px"] }}
                    transition={{ duration: 0.5 + i * 0.15, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  />
                ))}
              </div>
            ) : <Sliders className="w-5 h-5" />}
            <span className="text-[14px] font-sans font-bold uppercase tracking-wider pr-1">Settings</span>
          </button>
        </div>

        {/* Row 2: HUD Controls + Breadcrumb trail — no border-top, seamlessly continues */}
        <div className="border-t border-coastal-teal/10">
          <div className="max-w-[1300px] mx-auto w-full px-3 sm:px-6 md:px-12 lg:px-20 flex items-center gap-3 py-2">

            {/* Camera HUD pill */}
            <div className="flex flex-row bg-coastal-teal/10 rounded-xl border border-coastal-teal/20 p-0.5 shrink-0 items-center gap-0">
              <button
                onClick={() => { resetCamera(); }}
                className="p-1.5 rounded-lg text-coastal-light/70 hover:text-coastal-sage hover:bg-coastal-forest/20 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                title="Home – Level 0 baseline"
              >
                <Home className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-coastal-teal/20 shrink-0" />
              <button
                onClick={() => {
                  if (camera.level === 0) resetCamera();
                  else if (camera.level === 1 && activeSystem) focusNode(activeSystem, 1);
                  else if (camera.level === 2 && activeSpecimen) focusNode(activeSpecimen, 2);
                }}
                className="p-1.5 rounded-lg text-coastal-light/70 hover:text-coastal-sage hover:bg-coastal-forest/20 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                title="Recenter current level"
              >
                <Locate className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-coastal-teal/20 shrink-0" />
              <button
                onClick={() => setCamera(prev => ({ ...prev, z: Math.max(1, prev.z - 0.5) }))}
                className="p-1.5 rounded-lg text-coastal-light/70 hover:text-coastal-sage hover:bg-coastal-forest/20 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="w-px h-4 bg-coastal-teal/20 shrink-0" />
              <button
                onClick={() => setCamera(prev => ({ ...prev, z: Math.min(8, prev.z + 0.5) }))}
                className="p-1.5 rounded-lg text-coastal-light/70 hover:text-coastal-sage hover:bg-coastal-forest/20 transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                title="Zoom in"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Breadcrumb trail — min-w-0 + truncate ensures responsive truncation */}
            <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
              {/* Level 0 */}
              <button
                onClick={() => triggerReset()}
                className={`text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 min-w-0 hover:text-coastal-sage leading-none shrink ${
                  camera.level === 0 ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/55 font-semibold'
                }`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${camera.level === 0 ? 'bg-coastal-sage' : 'bg-coastal-teal/60'}`} />
                <span className="truncate">{activeEco.name}</span>
              </button>

              {/* Level 1 */}
              {camera.level >= 1 && activeSystem && (
                <>
                  <span className="text-[11px] text-coastal-teal/35 font-mono shrink-0">/</span>
                  <button
                    onClick={() => focusNode(activeSystem, 1)}
                    className={`text-[13px] font-bold transition-all cursor-pointer flex items-center gap-1.5 min-w-0 hover:text-coastal-sage leading-none shrink ${
                      camera.level === 1 ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/55 font-semibold'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${camera.level === 1 ? 'bg-coastal-sage' : 'bg-coastal-teal/60'}`} />
                    <span className="truncate">{activeSystem.title}</span>
                  </button>
                </>
              )}

              {/* Level 2 */}
              {camera.level === 2 && activeSpecimen && (
                <>
                  <span className="text-[11px] text-coastal-teal/35 font-mono shrink-0">/</span>
                  <div className="text-[13px] font-extrabold text-coastal-sage flex items-center gap-1.5 min-w-0 leading-none shrink">
                    <span className="w-2 h-2 rounded-full bg-coastal-sage shrink-0" />
                    <span className="truncate">{activeSpecimen.title}</span>
                  </div>
                </>
              )}
            </div>

            {/* Depth indicator */}
            <span className="text-[10px] text-coastal-light/30 font-mono shrink-0 uppercase tracking-wider hidden md:inline">
              L{camera.level}
            </span>
          </div>
        </div>

      </div>

      {/* ── Sub-Header Workspace Container ── */}
      <div className={`w-full flex-grow relative flex ${
        isTheater ? 'flex-col overflow-y-auto scrollbar-custom' : 'flex-row overflow-hidden'
      }`}>
        
        {/* ── Main Canvas Column ── */}
        <div className={`relative bg-coastal-dark flex flex-col justify-start shrink-0 ${
          isTheater ? 'w-full' : 'flex-grow h-full overflow-hidden'
        }`}>
          


          {/* ── Spatial Canvas Sheet Container ── */}
          <div className={`w-full relative overflow-hidden ${
            isTheater 
              ? 'h-[50vh] min-h-[535px] max-h-[580px] border-b border-coastal-teal/20' 
              : 'flex-grow'
          }`}>
            <SpatialCanvas
              data={activeData}
              showBeacons={showBeacons}
              motionBlur={motionBlur}
              showAnnotations={showAnnotations}
              theme={theme}
              canvasIntegration={canvasIntegration}
              onUpdateCoordinates={handleUpdateCoordinates}
              onResetCoordinates={handleResetCoordinates}
              hasOverrides={localStorage.getItem('obi-ecosystem-data-overrides') !== null}
            />
          </div>

          {/* ── Floating Science Panel Expand Badge ── */}
          {!isTheater && (
            <AnimatePresence>
              {isCollapsed && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setIsCollapsed(false)}
                  className="absolute right-6 top-6 z-45 pointer-events-auto bg-coastal-dark/80 backdrop-blur-md p-3 rounded-xl border border-coastal-teal/35 hover:border-coastal-sage cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center animate-bounce-subtle"
                  title="Expand Science Panel"
                >
                  <Sparkles className="w-5 h-5 text-coastal-sage" />
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* ── Dynamic control deck right sidebar or inline stacked details ── */}
        <SidebarDrawer
          isOpen={isTheater ? true : !isCollapsed}
          node={activeNode}
          isCollapsed={isTheater ? false : isCollapsed}
          setIsCollapsed={setIsCollapsed}
          activeEcoKey={selectedEcoKey}
          level={currentLevel}
          handleEcosystemChange={handleEcosystemChange}
          showBeacons={showBeacons}
          setShowBeacons={setShowBeacons}
          motionBlur={motionBlur}
          setMotionBlur={setMotionBlur}
          showAnnotations={showAnnotations}
          setShowAnnotations={setShowAnnotations}
          isAudioPlaying={isAudioPlaying}
          setIsAudioPlaying={setIsAudioPlaying}
          theme={theme}
          setTheme={setTheme}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          layoutMode={layoutMode}
        />
      </div>

      {/* ── Interactive Helper Onboarding Tooltip ─────────────── */}
      <AnimatePresence>
        {currentLevel === 0 && showHelper && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-28 left-1/2 -translate-x-1/2 text-center pointer-events-none z-40"
          >
            <div className="pointer-events-auto bg-coastal-dark/85 backdrop-blur-2xl px-6 py-3 rounded-full border border-coastal-teal/35 shadow-2xl flex items-center gap-4">
              <p className="text-coastal-light font-sans text-[15px] font-semibold tracking-widest uppercase flex items-center gap-2.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-coastal-sage animate-ping" />
                Click a hotspot to dive into the ecosystem
              </p>
              <button
                onClick={dismissHelper}
                className="px-3 py-1.5 text-[12.5px] font-sans font-bold uppercase tracking-wider text-coastal-sage hover:text-coastal-light border border-coastal-teal/30 hover:border-coastal-sage/60 bg-coastal-forest/20 hover:bg-coastal-forest/40 rounded-full transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Settings Modal Overlay ── */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-[480px] bg-coastal-dark border border-coastal-teal/30 p-6 rounded-2xl shadow-2xl flex flex-col gap-5 pointer-events-auto relative"
            >
              {/* Header with Close Button */}
              <div className="flex items-center justify-between border-b border-coastal-teal/15 pb-3">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-5 h-5 text-coastal-sage" />
                  <h3 className="text-[18px] font-extrabold uppercase text-coastal-light tracking-wide">
                    Tactile Drafting Settings
                  </h3>
                </div>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1.5 rounded-full hover:bg-coastal-forest/30 border border-transparent hover:border-coastal-teal/20 text-coastal-light/60 hover:text-coastal-light transition-all cursor-pointer flex items-center justify-center"
                  title="Close Settings"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toggles List */}
              <div className="flex flex-col gap-1.5">
                <Toggle 
                  label="Theater Screen Layout"
                  checked={layoutMode === "theater-mode"}
                  onChange={(checked) => setLayoutMode(checked ? "theater-mode" : "split-desk")}
                  activeIcon={<Tv className="w-5 h-5 text-coastal-sage" />}
                  inactiveIcon={<Tv className="w-5 h-5 text-coastal-light/45" />}
                  description="Horizontal stack (YouTube theater style)"
                />
                <Toggle 
                  label="Hotspot Beacons"
                  checked={showBeacons}
                  onChange={setShowBeacons}
                  activeIcon={<Eye className="w-5 h-5 text-coastal-sage" />}
                  inactiveIcon={<EyeOff className="w-5 h-5 text-coastal-light/45" />}
                  description="Flashing map hotspots & ripple pulses"
                />
                <Toggle 
                  label="Transition Motion Blur"
                  checked={motionBlur}
                  onChange={setMotionBlur}
                  activeIcon={<Sparkles className="w-5 h-5 text-coastal-sage" />}
                  inactiveIcon={<Sparkles className="w-5 h-5 text-coastal-light/45" />}
                  description="Cinematic Gaussian transitions"
                />
                <Toggle 
                  label="Nature Soundtrack"
                  checked={isAudioPlaying}
                  onChange={setIsAudioPlaying}
                  activeIcon={<Volume2 className="w-5 h-5 text-coastal-sage" />}
                  inactiveIcon={<VolumeX className="w-5 h-5 text-coastal-light/45" />}
                  description="Loopable ecosystem soundscapes"
                />
                <Toggle 
                  label="Technical Annotations"
                  checked={showAnnotations}
                  onChange={setShowAnnotations}
                  activeIcon={<Tag className="w-5 h-5 text-coastal-sage" />}
                  inactiveIcon={<Tag className="w-5 h-5 text-coastal-light/45" />}
                  description="Vector currents & flow annotations"
                />
                <Toggle 
                  label="Developer HUD"
                  checked={isDevMode}
                  onChange={setIsDevMode}
                  activeIcon={<Compass className="w-5 h-5 text-coastal-sage" />}
                  inactiveIcon={<Compass className="w-5 h-5 text-coastal-light/45" />}
                  description="Capture precise click coordinates"
                />
              </div>

              <span className="h-px bg-coastal-teal/10 w-full" />

              {/* Ecosystem Baseline Switcher */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12.5px] text-coastal-sage font-sans uppercase tracking-widest font-bold">
                  Ecosystem Baseline Region
                </span>
                <div className="grid grid-cols-2 gap-2.5 p-1 bg-coastal-dark/20 border border-coastal-teal/15 rounded-xl">
                  {Object.entries(ECOSYSTEMS).map(([key, eco]) => {
                    const isActive = selectedEcoKey === key;
                    return (
                      <button
                        key={key}
                        onClick={() => handleEcosystemChange(key)}
                        className={`py-2 text-[14px] font-sans rounded-lg transition-all cursor-pointer shadow-sm text-center font-bold ${
                          isActive
                            ? 'bg-[#dee8e8] text-[#161616] border border-coastal-teal/30 scale-[1.01]'
                            : 'text-coastal-light/50 hover:text-coastal-light hover:bg-coastal-forest/10 font-normal'
                        }`}
                      >
                        {eco.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className="h-px bg-coastal-teal/10 w-full" />

              {/* Canvas Integration Mode Selector */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12.5px] text-coastal-sage font-sans uppercase tracking-widest font-bold">
                  Canvas Integration Style
                </span>
                <div className="grid grid-cols-3 gap-2.5 p-1 bg-coastal-dark/20 border border-coastal-teal/15 rounded-xl">
                  {[
                    { id: "ambient-float", name: "Ambient Float" },
                    { id: "full-bleed", name: "Full Bleed" },
                    { id: "drafting-grid", name: "Draft Grid" }
                  ].map((mode) => {
                    const isActive = canvasIntegration === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setCanvasIntegration(mode.id)}
                        className={`py-2 text-[12px] font-sans rounded-lg transition-all cursor-pointer shadow-sm text-center font-bold ${
                          isActive
                            ? 'bg-[#dee8e8] text-[#161616] border border-coastal-teal/30 scale-[1.01]'
                            : 'text-coastal-light/50 hover:text-coastal-light hover:bg-coastal-forest/10 font-normal'
                        }`}
                      >
                        {mode.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <span className="h-px bg-coastal-teal/10 w-full" />

              {/* Palette Selection Grid */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[12.5px] text-coastal-sage font-sans uppercase tracking-widest font-bold">
                  Draft Sheet Palette
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {THEMES.map((t) => {
                    const isActive = theme === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`relative group p-2.5 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 shadow ${
                          isActive 
                            ? 'border-coastal-sage bg-coastal-teal/20 font-bold text-coastal-light scale-[1.01]' 
                            : 'border-coastal-teal/20 bg-coastal-forest/10 hover:border-coastal-teal/50 hover:bg-coastal-forest/20 text-coastal-light/65 font-normal'
                        }`}
                      >
                        <div className="flex -space-x-1 shrink-0">
                          <div className={`w-4.5 h-4.5 rounded-full ${t.primary} border border-coastal-dark/35`} />
                          <div className={`w-4.5 h-4.5 rounded-full ${t.secondary} border border-coastal-dark/35`} />
                        </div>
                        <span className="text-[14.5px] font-sans truncate ml-1">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function App() {
  return (
    <CameraProvider>
      <AppContent />
    </CameraProvider>
  );
}

export default App;
