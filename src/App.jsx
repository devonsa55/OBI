import React, { useState, useEffect, useRef } from 'react';
import SpatialCanvas from './components/SpatialCanvas';
import SidebarDrawer from './components/SidebarDrawer';
import { CameraProvider, useCamera } from './context/CameraContext';
import obData from './data/coastalData.json';
import mangroveData from './data/mangroveData.json';
import { Compass, ChevronDown, Sliders, Volume2, VolumeX, Eye, EyeOff, Sparkles, ChevronRight, Tag, X, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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

const THEMES = [
  { id: "default", name: "Coastal Sage", primary: "bg-[#81cccc]", secondary: "bg-[#2f4f4f]", tooltip: "Default Seafoam & Slate" },
  { id: "archival", name: "Archival Draft", primary: "bg-[#b55138]", secondary: "bg-[#e5dac4]", tooltip: "1978 Environmental Assessment Ink & Parchment" }
];

const Equalizer = () => (
  <div className="flex items-end gap-[2.5px] h-3.5 w-4 shrink-0 overflow-hidden select-none mb-[2px]">
    {[...Array(4)].map((_, i) => (
      <motion.div
        key={i}
        className="w-[2.5px] bg-coastal-sage rounded-full"
        animate={{
          height: ["2px", "14px", "2px"]
        }}
        transition={{
          duration: 0.6 + i * 0.15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);

function Toggle({ label, checked, onChange, activeIcon, inactiveIcon, description }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 select-none pointer-events-auto">
      <div className="flex flex-col gap-0.5 max-w-[72%]">
        <span className="text-[13px] font-bold text-coastal-light/95 leading-snug flex items-center gap-1.5">
          {checked ? activeIcon : inactiveIcon}
          {label}
        </span>
        {description && (
          <span className="text-[10px] text-coastal-light/40 leading-normal font-sans font-light">
            {description}
          </span>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5.5 rounded-full p-0.5 transition-all duration-300 relative focus:outline-none cursor-pointer flex items-center ${
          checked ? 'bg-gradient-to-r from-coastal-teal to-coastal-sage shadow-md shadow-coastal-sage/20' : 'bg-coastal-forest/30 border border-coastal-teal/30'
        }`}
      >
        <motion.div
          layout
          className="w-4 h-4 rounded-full bg-white shadow-md"
          animate={{ x: checked ? 18 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
}

function AppContent() {
  const [selectedEcoKey, setSelectedEcoKey] = useState("ocean-beach");
  const activeEco = ECOSYSTEMS[selectedEcoKey];
  const activeData = activeEco.data;

  // 2D Spatial Camera Global Context Telemetry
  const { camera, focusNode, resetCamera, isDevMode, setIsDevMode } = useCamera();

  // Resolve current active plate details from global camera telemetry
  let activeSystem = null;
  let activeSpecimen = null;

  if (camera.level === 1) {
    activeSystem = activeData.level0.systems.find(sys => sys.id === camera.activeNodeId);
  } else if (camera.level === 2) {
    // Find specimen by searching all systems' children
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

  const [showHelper, setShowHelper] = useState(false);

  // Settings State
  const [showBeacons, setShowBeacons] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [motionBlur, setMotionBlur] = useState(true);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [theme, setTheme] = useState("archival");
  const [layoutMode, setLayoutMode] = useState("split"); // "immersive", "grid", or "split"
  const [squeezeMitigation, setSqueezeMitigation] = useState("auto-collapse");
  const [canvasIntegration, setCanvasIntegration] = useState("drafting-grid");
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [showSettingsOverlay, setShowSettingsOverlay] = useState(false);

  const savedCollapsedStatesRef = useRef(null);
  const settingsOverlayRef = useRef(null);

  // Derived flags
  const isImmersive = layoutMode === 'immersive';
  const isFloating = isImmersive || squeezeMitigation === 'immersive-overlay';

  // Squeeze Mitigation Option 1: Auto-Collapse detailed panel at Level 2
  useEffect(() => {
    if (squeezeMitigation === "auto-collapse") {
      if (camera.level === 2) {
        if (!savedCollapsedStatesRef.current) {
          savedCollapsedStatesRef.current = {
            left: isLeftCollapsed
          };
        }
        setIsLeftCollapsed(true);
      } else if (camera.level < 2) {
        if (savedCollapsedStatesRef.current) {
          setIsLeftCollapsed(savedCollapsedStatesRef.current.left);
          savedCollapsedStatesRef.current = null;
        }
      }
    }
  }, [camera.level, squeezeMitigation]);

  // Cleanly restore states if user disables Option 1 while zoomed in
  useEffect(() => {
    if (squeezeMitigation !== "auto-collapse" && savedCollapsedStatesRef.current) {
      setIsLeftCollapsed(savedCollapsedStatesRef.current.left);
      savedCollapsedStatesRef.current = null;
    }
  }, [squeezeMitigation]);

  // Close settings overlay on outside click
  useEffect(() => {
    if (!showSettingsOverlay) return;
    const handleClick = (e) => {
      if (settingsOverlayRef.current && !settingsOverlayRef.current.contains(e.target)) {
        setShowSettingsOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettingsOverlay]);

  const audioRef = useRef(null);

  // Theme Synchronization
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Cleanly open the left detailed panel when transitioning to Level 2
  useEffect(() => {
    if (camera.level === 2) {
      setIsLeftCollapsed(false);
    }
  }, [camera.level, camera.activeNodeId]);

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
    setIsLeftCollapsed(false);
    resetCamera();
  };

  // Switch active ecosystems safely and flush navigation
  const handleEcosystemChange = (key) => {
    setSelectedEcoKey(key);
    triggerReset();
  };

  // Timeline Breadcrumb Steps
  const getTimelineSteps = () => {
    return [
      {
        level: 0,
        type: 'ecosystem',
        title: activeData.name,
        subtitle: 'Region Baseline',
        status: currentLevel === 0 ? 'active' : 'completed',
        onClick: triggerReset
      },
      {
        level: 1,
        type: 'system',
        title: activeSystem ? activeSystem.title : 'System View',
        subtitle: activeSystem ? 'Active Sub-system' : 'Click a hotspot to explore',
        status: activeSystem
          ? (currentLevel > 1 ? 'completed' : 'active')
          : 'pending',
        onClick: activeSystem && currentLevel > 1 ? () => {
          setIsLeftCollapsed(false);
          focusNode(activeSystem, 1);
        } : null
      },
      {
        level: 2,
        type: 'specimen',
        title: activeSpecimen ? activeSpecimen.title : 'Specimen View',
        subtitle: activeSpecimen ? 'Science Literature Active' : 'Dive deeper inside system',
        status: activeSpecimen ? 'active' : 'pending',
        onClick: null
      }
    ];
  };

  // Shared settings panel body (reused in top-bar overlay)
  const renderSettingsBody = () => (
    <div className="flex flex-col gap-3.5">
      {/* Ecosystem Selector */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <span className="text-[11px] text-coastal-sage font-sans uppercase tracking-widest font-bold select-none">
          Active Ecosystem
        </span>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(ECOSYSTEMS).map(([key, eco]) => {
            const isActive = selectedEcoKey === key;
            return (
              <button
                key={key}
                onClick={() => handleEcosystemChange(key)}
                className={`relative group p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shadow-md text-center ${
                  isActive
                    ? 'border-coastal-sage/90 bg-coastal-teal/20 scale-[1.02] shadow-coastal-sage/10 font-bold text-coastal-light'
                    : 'border-coastal-teal/20 bg-coastal-forest/10 hover:border-coastal-teal/50 hover:bg-coastal-forest/20 font-normal text-coastal-light/65'
                }`}
              >
                <span className="text-[11.5px] leading-tight">{eco.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <span className="h-px bg-coastal-teal/15 w-full" />

      {/* Toggle Switches */}
      <div className="flex flex-col gap-2.5 pointer-events-auto">
        <Toggle 
          label="Hotspot Beacons"
          checked={showBeacons}
          onChange={setShowBeacons}
          activeIcon={<Eye className="w-3.5 h-3.5 text-coastal-sage animate-pulse" />}
          inactiveIcon={<EyeOff className="w-3.5 h-3.5 text-coastal-light/45" />}
          description="Visual wayfinding beacons & ripple animations"
        />
        
        <Toggle 
          label="Cinematic Transition Blur"
          checked={motionBlur}
          onChange={setMotionBlur}
          activeIcon={<Sparkles className="w-3.5 h-3.5 text-coastal-sage animate-pulse" />}
          inactiveIcon={<Sparkles className="w-3.5 h-3.5 text-coastal-light/45" />}
          description="Gaussian blur during plate portal transitions"
        />
        
        <Toggle 
          label="Ambient Soundtrack"
          checked={isAudioPlaying}
          onChange={setIsAudioPlaying}
          activeIcon={<Volume2 className="w-3.5 h-3.5 text-coastal-sage animate-bounce" />}
          inactiveIcon={<VolumeX className="w-3.5 h-3.5 text-coastal-light/45" />}
          description="Loopable nature soundscapes scaled for concentration"
        />

        {/* Application Layout Mode Selector */}
        <div className="flex flex-col gap-2 pointer-events-auto my-1 select-none">
          <span className="text-[11px] text-coastal-sage font-sans uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-coastal-sage" />
            Application Layout
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { id: 'immersive', label: 'Immersive', sub: 'Floating' },
              { id: 'grid', label: 'Dashboard', sub: 'Flex-Grid' },
              { id: 'split', label: 'Split Screen', sub: 'Classic' },
            ].map(({ id, label, sub }) => {
              const isActive = layoutMode === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setLayoutMode(id);
                    setIsLeftCollapsed(false);
                  }}
                  className={`relative group p-2 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 shadow-md text-center ${
                    isActive
                      ? 'border-coastal-sage/90 bg-coastal-teal/20 scale-[1.02] shadow-coastal-sage/10 font-bold text-coastal-light'
                      : 'border-coastal-teal/20 bg-coastal-forest/10 hover:border-coastal-teal/50 hover:bg-coastal-forest/20 font-normal text-coastal-light/65'
                  }`}
                >
                  <span className="text-[11.5px] leading-tight font-bold">{label}</span>
                  <span className="text-[8.5px] opacity-60 font-light">{sub}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[10px] text-coastal-light/40 leading-normal font-sans font-light mt-0.5">
            {layoutMode === 'immersive' && "Full-bleed map canvas with floating frosted-glass telemetry panel"}
            {layoutMode === 'grid' && "Map canvas locked into dedicated central column side-by-side with sidebar"}
            {layoutMode === 'split' && "Fixed top header bar, left full-height sidebar, and responsive right canvas"}
          </span>
        </div>

        <Toggle 
          label="Technical Annotations"
          checked={showAnnotations}
          onChange={setShowAnnotations}
          activeIcon={<Tag className="w-3.5 h-3.5 text-coastal-sage animate-pulse" />}
          inactiveIcon={<Tag className="w-3.5 h-3.5 text-coastal-light/45" />}
          description="SVG vector paths and scientific label overlays"
        />

        <Toggle 
          label="Developer Mode HUD"
          checked={isDevMode}
          onChange={setIsDevMode}
          activeIcon={<Compass className="w-3.5 h-3.5 text-coastal-sage animate-pulse" />}
          inactiveIcon={<Compass className="w-3.5 h-3.5 text-coastal-light/45" />}
          description="Draw grid overlay and capture exact normalized coordinate clicks"
        />
      </div>

      <span className="h-px bg-coastal-teal/15 w-full" />

      {/* Canvas Integration Mode Selector */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <span className="text-[11px] text-coastal-sage font-sans uppercase tracking-widest font-bold select-none flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-coastal-sage" />
          Canvas Integration Mode
        </span>
        <div className="flex flex-col gap-1.5">
          {[
            { id: 'drafting-grid', label: 'Drafting Table Grid', sub: 'Blueprint framing & margins' },
            { id: 'seamless-bleed', label: 'Seamless Bleed', sub: 'Infinite boundary blending' },
            { id: 'autofocus-pan', label: 'Autofocus Pan', sub: 'Cover fit + cursor autopan' },
          ].map(({ id, label, sub }) => {
            const isActive = canvasIntegration === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setCanvasIntegration(id);
                  if (id === 'autofocus-pan') {
                    setSqueezeMitigation('focal-width');
                  } else {
                    setSqueezeMitigation('none');
                  }
                }}
                className={`relative group p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-start justify-center gap-0.5 shadow-md ${
                  isActive
                    ? 'border-coastal-sage/90 bg-coastal-teal/20 scale-[1.02] shadow-coastal-sage/10 font-bold text-coastal-light'
                    : 'border-coastal-teal/20 bg-coastal-forest/10 hover:border-coastal-teal/50 hover:bg-coastal-forest/20 font-normal text-coastal-light/65'
                }`}
              >
                <span className="text-[11.5px] leading-tight font-bold">{label}</span>
                <span className="text-[9px] opacity-60 font-light">{sub}</span>
              </button>
            );
          })}
        </div>
        {/* Real-time mechanical description */}
        <div className="p-2.5 rounded-xl border border-coastal-teal/15 bg-coastal-dark/30 text-[10px] text-coastal-light/50 leading-normal font-sans font-light mt-1">
          {canvasIntegration === 'drafting-grid' && (
            <span>
              <strong>Drafting Table Grid:</strong> The fixed-aspect image is framed inside a cartographic double border sitting on an infinite, theme-coordinated scientific blueprint grid. Safe, fully readable margins on all devices.
            </span>
          )}
          {canvasIntegration === 'seamless-bleed' && (
            <span>
              <strong>Seamless Bleed:</strong> Uses color matching and a broad radial boundary vignette to blend the image's edges into the screen background. Gives the illusion of an infinite, borderless drawing.
            </span>
          )}
          {canvasIntegration === 'autofocus-pan' && (
            <span>
              <strong>Autofocus Pan:</strong> Scales the canvas to fill the screen, cropping overflow. Moving your mouse to the edges pans smoothly to reveal margins. Centering is automatically locked when examining details.
            </span>
          )}
        </div>
      </div>

      <span className="h-px bg-coastal-teal/15 w-full" />

      {/* Theme Selector */}
      <div className="flex flex-col gap-2 pointer-events-auto">
        <span className="text-[11px] text-coastal-sage font-sans uppercase tracking-widest font-bold select-none">
          Ecosystem Palette
        </span>
        <div className="grid grid-cols-2 gap-2">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`relative group p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 shadow-md ${
                  isActive 
                    ? 'border-coastal-sage/90 bg-coastal-teal/20 scale-[1.02] shadow-coastal-sage/10' 
                    : 'border-coastal-teal/20 bg-coastal-forest/10 hover:border-coastal-teal/50 hover:bg-coastal-forest/20'
                }`}
              >
                <div className="flex -space-x-1.5 shrink-0">
                  <div className={`w-3.5 h-3.5 rounded-full ${t.primary} border border-coastal-dark/30`} />
                  <div className={`w-3.5 h-3.5 rounded-full ${t.secondary} border border-coastal-dark/30`} />
                </div>
                <span className={`text-[12px] font-sans truncate ${isActive ? 'text-coastal-light font-bold' : 'text-coastal-light/65 font-normal'}`}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Horizontal timeline steps renderer
  const renderTimelineSteps = () => {
    const steps = getTimelineSteps();
    return (
      <div className="flex items-center gap-3 md:gap-6 lg:gap-8 justify-between flex-grow">
        {steps.map((step, idx) => {
          const isLast = idx === 2;
          const isCompleted = step.status === 'completed';
          const isActive = step.status === 'active';
          return (
            <div key={idx} className="flex items-center gap-3 md:gap-6 lg:gap-8 select-none flex-grow justify-between">
              <div className="flex items-center gap-2 md:gap-3">
                <div
                  onClick={step.onClick || undefined}
                  className={`w-4.5 h-4.5 md:w-5.5 md:h-5.5 rounded-full border flex items-center justify-center transition-all duration-300 shrink-0 ${
                    isCompleted
                      ? 'bg-gradient-to-br from-coastal-teal to-coastal-forest border-coastal-sage cursor-pointer hover:scale-110 active:scale-95 shadow-md shadow-coastal-teal/20'
                      : isActive
                        ? 'bg-coastal-dark border-coastal-sage border-2 shadow-lg shadow-coastal-sage/35 scale-105'
                        : 'bg-transparent border-dashed border-coastal-teal/30 cursor-not-allowed'
                  }`}
                >
                  {isCompleted ? (
                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 bg-white rounded-full" />
                  ) : isActive ? (
                    <motion.div
                      className="w-1 md:w-1.5 h-1 md:h-1.5 bg-coastal-sage rounded-full"
                      animate={{ scale: [0.8, 1.2, 0.8] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    />
                  ) : (
                    <span className="w-0.5 h-0.5 bg-coastal-teal/25 rounded-full" />
                  )}
                </div>
                <div className="flex flex-col justify-start">
                  {step.onClick ? (
                    <button
                      onClick={step.onClick}
                      className={`text-left font-sans text-[11px] md:text-[13px] font-bold transition-colors tracking-wide cursor-pointer leading-tight whitespace-nowrap ${
                        isCompleted ? 'text-coastal-light/95 hover:text-coastal-light' : isActive ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/40 cursor-default'
                      }`}
                    >
                      {step.title}
                    </button>
                  ) : (
                    <span className={`font-sans text-[11px] md:text-[13px] font-bold tracking-wide leading-tight whitespace-nowrap ${
                      isActive ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/40'
                    }`}>
                      {step.title}
                    </span>
                  )}
                  <span className={`hidden sm:block text-[9px] md:text-[10px] font-sans font-light leading-none mt-0.5 md:mt-1 ${
                    isActive ? 'text-coastal-light/80' : 'text-coastal-light/35'
                  }`}>
                    {step.subtitle}
                  </span>
                </div>
              </div>
              {!isLast && (
                <ChevronRight className={`w-3.5 h-3.5 md:w-4 h-4 shrink-0 transition-colors duration-300 ${
                  isCompleted ? 'text-coastal-teal' : 'text-coastal-teal/20'
                }`} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper to render shared header content inside both header styles
  const renderHeaderInner = (isSplitHeader = false) => (
    <>
      {/* Compact logo on the far left of top bar */}
      <div className="flex items-center gap-2.5 shrink-0 border-r border-coastal-teal/20 pr-4 mr-2 select-none">
        <div className="p-1.5 bg-gradient-to-br from-coastal-teal to-coastal-forest rounded-lg border border-coastal-sage/20">
          <Compass className="w-3.5 h-3.5 text-coastal-light" />
        </div>
        <span className="text-[14px] font-bold tracking-tight text-coastal-light font-display whitespace-nowrap">Coastal Canvas</span>
      </div>

      {/* Breadcrumb steps */}
      <div className="flex-grow">
        {renderTimelineSteps()}
      </div>

      {/* Settings gear icon on far right */}
      <div className="shrink-0 border-l border-coastal-teal/20 pl-4 ml-2 relative select-none">
        <button
          onClick={() => setShowSettingsOverlay(v => !v)}
          className={`flex items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
            showSettingsOverlay
              ? 'bg-coastal-teal/20 border-coastal-sage text-coastal-sage'
              : 'bg-coastal-forest/20 border-coastal-teal/25 hover:border-coastal-sage/50 text-coastal-light/60 hover:text-coastal-sage'
          }`}
          title="Control Settings"
        >
          {isAudioPlaying ? <Equalizer /> : <Sliders className="w-4 h-4" />}
        </button>
      </div>
    </>
  );

  const isSplit = layoutMode === 'split';

  const containerClasses = isSplit
    ? 'w-screen h-screen overflow-hidden bg-coastal-dark font-sans text-coastal-light relative select-none flex flex-col'
    : `w-screen h-screen overflow-hidden bg-coastal-dark font-sans text-coastal-light relative select-none ${!isFloating ? 'flex flex-row' : ''}`;

  return (
    <div className={containerClasses} data-theme={theme}>
      {isSplit ? (
        <>
          {/* ── Static Full-width Header Bar for Split Screen Mode ── */}
          <header className="relative bg-coastal-dark/85 backdrop-blur-2xl px-6 py-4 border-b border-coastal-teal/20 shadow-lg flex items-center select-none pointer-events-auto w-full justify-between gap-4 shrink-0 z-40">
            {renderHeaderInner(true)}
          </header>

          {/* ── Main Viewport Area Under Header ── */}
          <div className="flex flex-row flex-grow w-full overflow-hidden relative">
            <SidebarDrawer
              isOpen={!isImmersive || currentLevel === 2 || squeezeMitigation === 'immersive-overlay'}
              node={activeSpecimen}
              layoutMode={squeezeMitigation === 'immersive-overlay' ? 'immersive' : layoutMode}
              isLeftCollapsed={isLeftCollapsed}
              setIsLeftCollapsed={setIsLeftCollapsed}
              activeEcoKey={selectedEcoKey}
            />

            <div className="flex-grow h-full relative overflow-hidden bg-coastal-dark">
              <SpatialCanvas
                data={activeData}
                showBeacons={showBeacons}
                motionBlur={motionBlur}
                showAnnotations={showAnnotations}
                squeezeMitigation={squeezeMitigation}
                theme={theme}
                canvasIntegration={canvasIntegration}
              />

              {/* ── Left Detailed Panel Expand Badge ── */}
              <AnimatePresence>
                {isLeftCollapsed && (!isImmersive || currentLevel === 2 || squeezeMitigation === 'immersive-overlay') && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={() => setIsLeftCollapsed(false)}
                    className="absolute left-6 top-6 z-45 pointer-events-auto bg-coastal-dark/80 backdrop-blur-md p-3 rounded-xl border border-coastal-teal/35 hover:border-coastal-sage cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                    title={currentLevel === 2 ? "Expand Specimen Details" : "Expand Telemetry Panel"}
                  >
                    <Sparkles className="w-5 h-5 text-coastal-sage animate-pulse" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </>
      ) : (
        <>
          <SidebarDrawer
            isOpen={!isImmersive || currentLevel === 2 || squeezeMitigation === 'immersive-overlay'}
            node={activeSpecimen}
            layoutMode={squeezeMitigation === 'immersive-overlay' ? 'immersive' : layoutMode}
            isLeftCollapsed={isLeftCollapsed}
            setIsLeftCollapsed={setIsLeftCollapsed}
            activeEcoKey={selectedEcoKey}
          />

          <div className={!isFloating ? 'flex-grow h-full relative overflow-hidden' : 'absolute inset-0 w-full h-full'}>
            <SpatialCanvas
              data={activeData}
              showBeacons={showBeacons}
              motionBlur={motionBlur}
              showAnnotations={showAnnotations}
              squeezeMitigation={squeezeMitigation}
              theme={theme}
              canvasIntegration={canvasIntegration}
            />

            {/* ── Floating Top Bar ── */}
            <div className="absolute top-8 z-40 left-8 right-8">
              <div className="relative bg-coastal-dark/85 backdrop-blur-2xl px-4 py-2.5 md:px-8 md:py-3.5 rounded-2xl border border-coastal-teal/35 shadow-2xl flex items-center select-none pointer-events-auto w-full justify-between gap-4">
                {renderHeaderInner(false)}
              </div>
            </div>

            {/* ── Left Detailed Panel Expand Badge ── */}
            <AnimatePresence>
              {isLeftCollapsed && (!isImmersive || currentLevel === 2 || squeezeMitigation === 'immersive-overlay') && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={() => setIsLeftCollapsed(false)}
                  className="absolute left-6 top-6 z-45 pointer-events-auto bg-coastal-dark/80 backdrop-blur-md p-3 rounded-xl border border-coastal-teal/35 hover:border-coastal-sage cursor-pointer shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                  title={currentLevel === 2 ? "Expand Specimen Details" : "Expand Telemetry Panel"}
                >
                  <Sparkles className="w-5 h-5 text-coastal-sage animate-pulse" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* SETTINGS OVERLAY                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showSettingsOverlay && (
          <motion.div
            ref={settingsOverlayRef}
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="absolute top-24 right-8 z-50 w-80 bg-coastal-dark/95 backdrop-blur-2xl rounded-2xl border border-coastal-teal/35 shadow-2xl overflow-hidden pointer-events-auto"
          >
            {/* Overlay header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-coastal-teal/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-coastal-sage" />
                <span className="text-[12px] text-coastal-sage font-sans uppercase tracking-widest font-bold">
                  Control Settings
                </span>
              </div>
              <button
                onClick={() => setShowSettingsOverlay(false)}
                className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-coastal-forest/40 text-coastal-light/50 hover:text-coastal-light transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Overlay body */}
            <div className="px-5 pb-5 pt-3 overflow-y-auto max-h-[80vh] scrollbar-custom">
              {renderSettingsBody()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <p className="text-coastal-light font-sans text-[13px] font-semibold tracking-widest uppercase flex items-center gap-2.5 justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-coastal-sage animate-ping" />
                Click a hotspot to dive into the ecosystem
              </p>
              <button
                onClick={dismissHelper}
                className="px-3 py-1 text-[10px] font-sans font-bold uppercase tracking-wider text-coastal-sage hover:text-coastal-light border border-coastal-teal/30 hover:border-coastal-sage/60 bg-coastal-forest/20 hover:bg-coastal-forest/40 rounded-full transition-all cursor-pointer"
              >
                Dismiss
              </button>
            </div>
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
