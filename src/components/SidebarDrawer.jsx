import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, BookOpen, MessageSquare, Send, Sparkles, ChevronRight, ChevronLeft, Activity, Thermometer, Wind, Droplet, Compass, Sliders, Eye, EyeOff, Tag, Volume2, VolumeX, X } from 'lucide-react';
import { useCamera } from '../context/CameraContext';
import { highlightGlossaryTerms } from './GlossaryTerm';
import obData from '../data/coastalData.json';
import mangroveData from '../data/mangroveData.json';

const ECOSYSTEMS = {
  "ocean-beach": { name: "Ocean Beach, SF" },
  "florida-mangroves": { name: "Florida Mangroves" }
};



const ECOSYSTEM_TELEMETRY = {
  "ocean-beach": {
    name: "Ocean Beach, SF",
    health: 92,
    healthStatus: "Optimal Baseline Status",
    metrics: [
      { id: "temp", label: "Water Temp", value: "54°F", desc: "Upwelling Phase", icon: Thermometer },
      { id: "tide", label: "Tide Level", value: "+4.8 ft", desc: "High Flood Tide", icon: Activity },
      { id: "wind", label: "Wind Velocity", value: "NW 14 kts", desc: "Onshore Gusts", icon: Wind },
      { id: "humidity", label: "Humidity", value: "86%", desc: "Fog Accumulation", icon: Droplet }
    ],
    surveys: [
      { name: "Sediment Transport Audit", progress: 74, status: "Active" },
      { name: "Summer Fog Moisture Capture", progress: 90, status: "Active" },
      { name: "Dune Vegetation Restoration", progress: 45, status: "Ongoing" }
    ]
  },
  "florida-mangroves": {
    name: "Florida Mangroves",
    health: 96,
    healthStatus: "Pristine Baseline Status",
    metrics: [
      { id: "temp", label: "Water Temp", value: "78°F", desc: "Estuary Warmth", icon: Thermometer },
      { id: "tide", label: "Tide Level", value: "+1.2 ft", desc: "Low Ebb Tide", icon: Activity },
      { id: "wind", label: "Wind Velocity", value: "E 6 kts", desc: "Gentle Breeze", icon: Wind },
      { id: "humidity", label: "Humidity", value: "92%", desc: "Saturated Canopy", icon: Droplet }
    ],
    surveys: [
      { name: "Prop Root Recruitment Audit", progress: 85, status: "Active" },
      { name: "Pelican Canopy Nesting Survey", progress: 100, status: "Completed" },
      { name: "Bioturbation Crab Density Census", progress: 60, status: "Active" }
    ]
  }
};

const Equalizer = () => (
  <div className="flex items-end gap-[2px] h-3.5 w-3.5 shrink-0 overflow-hidden select-none mb-[1px]">
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="w-[2px] bg-coastal-sage rounded-full"
        animate={{
          height: ["2px", "12px", "2px"]
        }}
        transition={{
          duration: 0.5 + i * 0.15,
          repeat: Infinity,
          repeatType: "reverse",
          ease: "easeInOut"
        }}
      />
    ))}
  </div>
);



export default function SidebarDrawer({ 
  isOpen, 
  node, 
  isCollapsed = false, 
  setIsCollapsed,
  activeEcoKey = 'ocean-beach',
  level = 0,
  handleEcosystemChange,
  showBeacons,
  setShowBeacons,
  motionBlur,
  setMotionBlur,
  showAnnotations,
  setShowAnnotations,
  isAudioPlaying,
  setIsAudioPlaying,
  theme,
  setTheme,
  showSettings,
  setShowSettings,
  layoutMode = 'split-desk',
  glossary = []
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const { camera, focusNode, resetCamera, isDevMode, setIsDevMode } = useCamera();
  
  const [theaterLevel0Tab, setTheaterLevel0Tab] = useState("registry");
  const [theaterLevel1Tab, setTheaterLevel1Tab] = useState("overview");

  const telemetryData = ECOSYSTEM_TELEMETRY[activeEcoKey] || ECOSYSTEM_TELEMETRY["ocean-beach"];

  useEffect(() => {
    if (node && node.drawerContent) {
      setActiveTab("overview");
      setChatHistory([
        {
          sender: "scholar",
          text: `Hello! I am the Coastal Institute's AI Research Scholar. Ask me anything about the scientific literature on "${node.drawerContent.title}" or click the suggestion chips below to explore active field findings.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setInputValue("");
      setIsTyping(false);
    }
  }, [node?.id]);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  // Find active parent system for Level 2 breadcrumbs
  let activeSystem = null;
  if (level === 2 && node) {
    const currentData = telemetryData.name.includes("Mangrove") ? mangroveData : obData;
    for (const sys of currentData.level0.systems) {
      if (sys.children?.some(child => child.id === node.id)) {
        activeSystem = sys;
        break;
      }
    }
  } else if (level === 1 && node) {
    activeSystem = node;
  }

  const handleJumpToLevel0 = () => {
    resetCamera();
  };

  const handleJumpToLevel1 = () => {
    if (activeSystem) {
      focusNode(activeSystem, 1);
    }
  };

  const generateAIResponse = (questionText) => {
    const text = questionText.toLowerCase();
    const nodeId = node.id;

    const matchedFaq = node.drawerContent.faq?.find(
      f => f.question.toLowerCase() === text || f.chip.toLowerCase() === text
    );
    if (matchedFaq) {
      return matchedFaq.answer;
    }

    if (nodeId === 'spec-fog') {
      if (text.includes('climate') || text.includes('warm') || text.includes('future') || text.includes('karl')) {
        return "Based on research in Oecologia (2018), summer fog hours have declined by approximately 33% over the last century. Rising global temperatures alter the temperature gradient between inland valleys and the ocean, threatening to thin out this summer moisture supply.";
      }
      if (text.includes('leaf') || text.includes('leaves') || text.includes('hair') || text.includes('foliar') || text.includes('absorb')) {
        return "Many dune plants, such as yellow sand-verbena (Abronia latifolia), exhibit foliar water uptake. Condensation traps on specialized leaf hairs (trichomes) and is absorbed directly through the leaf tissue, allowing them to bypass dry sand roots.";
      }
      if (text.includes('water') || text.includes('how much') || text.includes('amount') || text.includes('volume')) {
        return "Summer fog represents up to 25% to 35% of the total annual water input for native dune flora. In Northern California's dry season, fog condensation acts as the single primary hydrologic buffer.";
      }
    }

    if (nodeId === 'spec-swells') {
      if (text.includes('danger') || text.includes('rip') || text.includes('swim') || text.includes('current')) {
        return "Ocean Beach waves are incredibly dangerous. Deep storm swells jacking up over the offshore Golden Gate sandbar generate severe undertows and rip currents exceeding 5 knots (2.5 m/s), routinely sweeping away sediment and posing severe safety hazards.";
      }
      if (text.includes('bar') || text.includes('sandbar') || text.includes('canyon') || text.includes('refract')) {
        return "The Golden Gate Bar is a huge offshore sand accumulation formed by bay tidal outflows. It bends swell wave energy via refraction, focusing wave heights up to 2x at specific beach locations.";
      }
      if (text.includes('migration') || text.includes('sand') || text.includes('movement') || text.includes('winter')) {
        return "Heavy winter storms pull sand away from dry dunes and deposit it offshore onto the sandbars. Gentle summer waves reverse this process, slowly pushing the sand back to rebuild the dry beach face.";
      }
    }

    if (nodeId === 'spec-dune-veg') {
      if (text.includes('plant') || text.includes('native') || text.includes('root') || text.includes('sagewort')) {
        return "Key native species include Beach Sagewort, Yellow Sand-Verbena, and Dune Lupine. Research in 2020 proved their extensive taproots (extending up to 3 meters deep) increase dune shear strength by 45%, preventing blowouts.";
      }
      if (text.includes('history') || text.includes('original') || text.includes('stretch') || text.includes('waste')) {
        return "Historically, the SF peninsula was covered by the 'Great Sand Waste'—shifting dunes that migrated eastward at 1.5 to 3 meters per year. These were stabilized in the late 19th century by sowing European beach grass.";
      }
      if (text.includes('damage') || text.includes('walk') || text.includes('human') || text.includes('trample')) {
        return "Unregulated foot traffic crushes native dune vegetation. This kills the plants, leading to root decay. Without roots to anchor the sand, high winds quickly blow it away, resulting in large erosive blowouts.";
      }
    }

    if (nodeId === 'spec-bull-kelp') {
      if (text.includes('grow') || text.includes('fast') || text.includes('rate') || text.includes('inch')) {
        return "Bull kelp is one of the fastest-growing organisms on Earth. During peak spring growth, a single stipe can elongate by 10 to 12 inches (25–30 cm) per day, reaching its full 60-foot height within a single growing season.";
      }
      if (text.includes('pneumatocyst') || text.includes('float') || text.includes('bulb') || text.includes('gas')) {
        return "The bulb atop each kelp stipe is called a pneumatocyst. It is filled with carbon monoxide produced by the kelp itself, acting as a natural buoy to keep the photosynthetic blade-leaves near the sunlit water surface.";
      }
      if (text.includes('decline') || text.includes('disappear') || text.includes('urchin') || text.includes('heat') || text.includes('climate')) {
        return "Between 2013 and 2019, a marine heat wave ('The Blob') warmed waters and reduced nutrients. Simultaneously, sea star wasting disease wiped out the sunflower sea star—the main urchin predator. Without predators, urchin populations exploded and grazed kelp forests down to bare rock, causing over a 90% decline in canopy cover.";
      }
    }

    if (nodeId === 'spec-dredging') {
      if (text.includes('beneficial') || text.includes('reuse') || text.includes('recycle')) {
        return "Beneficial reuse refers to using sand dredged from shipping channels for coastal nourishment rather than disposal in deep water. This keeps sand within the local beach system to naturally offset erosion.";
      }
      if (text.includes('erosion') || text.includes('seawall') || text.includes('highway') || text.includes('road')) {
        return "South Ocean Beach undergoes severe erosion from sea-level rise and winter storms. The presence of the Great Highway seawall blocks natural dune migration, trapping the beach in a losing sediment squeeze.";
      }
      if (text.includes('stay') || text.includes('shoaling') || text.includes('drift') || text.includes('tracer')) {
        return "Placing sand offshore creates artificial mounds. Wave action slowly pushes this sand onshore via shoaling. However, sediment tracers indicate that strong winter waves still disperse 40% of this sand south towards Fort Funston.";
      }
    }

    if (nodeId === 'spec-snapper') {
      if (text.includes('roots') || text.includes('nursery') || text.includes('prop') || text.includes('habitat')) {
        return "Red mangrove prop roots create an intricate physical barrier. Studies show prop root densities above 40 per square meter reduce juvenile snapper mortality by up to 80% by excluding predators over 20cm.";
      }
      if (text.includes('eat') || text.includes('food') || text.includes('diet') || text.includes('shrimp')) {
        return "Juvenile fish feed heavily on amphipods, small shrimp, and worms. These organisms survive on leaf detritus trapped in the roots, establishing a nutrient-rich nursery food web.";
      }
    }

    if (nodeId === 'spec-pelican') {
      if (text.includes('nest') || text.includes('roost') || text.includes('canopy') || text.includes('tree')) {
        return "Pelicans nest in the high canopies of black and red mangroves (4-6 meters up). This isolates nests from tidal flooding and ground predators like raccoons, yielding 30% higher fledgling survival.";
      }
      if (text.includes('dive') || text.includes('hunt') || text.includes('physics') || text.includes('fish')) {
        return "Pelicans dive-bomb fish from 60 feet. They possess special air sacs under their skin that inflate right before impact to absorb the kinetic force, acting like organic cushions.";
      }
    }

    if (nodeId === 'spec-crab') {
      if (text.includes('smell') || text.includes('sulfur') || text.includes('mud') || text.includes('gas')) {
        return "The rotten-egg smell is hydrogen sulfide gas, generated by anaerobic bacteria in the tightly packed, waterlogged, and oxygen-deprived (anoxic) muddy estuary sediment.";
      }
      if (text.includes('burrow') || text.includes('oxygen') || text.includes('aeration') || text.includes('root')) {
        return "Fiddler crab burrows act like ventilation ducts. By bioturbating the soil, they increase surface area by 150%, driving dissolved oxygen deep into the mud to sustain mangrove root growth.";
      }
    }

    if (nodeId === 'spec-tides') {
      if (text.includes('salt') || text.includes('filter') || text.includes('secrete') || text.includes('leaf')) {
        return "Red mangroves use high negative pressure (up to 40 atm) in their roots to filter out 90% of salt. Black mangroves absorb salt but excrete it through salt glands, forming crystals on their leaves.";
      }
      if (text.includes('estuary') || text.includes('carbon') || text.includes('cycle') || text.includes('flush')) {
        return "Daily tides flush leaf detritus and export up to 150g of organic carbon per square meter annually. This organic carbon drifts offshore, serving as a primary nutrient source for coral reefs.";
      }
    }

    return `That is a fascinating research question! While I don't have that specific field measurement in my local index, active studies by the Coastal Research Group focus heavily on these dynamics. Try one of the suggestion chips or check our 'Research & Lit' tab for related peer-reviewed papers.`;
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    const userMsg = {
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      const responseText = generateAIResponse(text);
      const scholarMsg = {
        sender: "scholar",
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatHistory(prev => [...prev, scholarMsg]);
      setIsTyping(false);
    }, 750);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'research', label: 'Research', icon: BookOpen },
    { id: 'chat', label: 'AI Chat', icon: MessageSquare }
  ];

  const hasSpecimen = level === 2 && node && node.drawerContent;
  const hasSystem = level === 1 && node;

  const renderInnerContent = () => (
    <div className="flex flex-col flex-grow w-full relative justify-start gap-4">
      
      {/* Mobile Close Button Overlay */}
      <button
        onClick={() => setIsCollapsed(true)}
        className="md:hidden absolute top-0 right-0 z-50 p-2.5 rounded-full bg-coastal-forest/30 border border-coastal-teal/20 text-coastal-light hover:bg-coastal-forest/50 transition-all animate-fade-in"
        title="Close Panel"
      >
        <X className="w-5 h-5" />
      </button>

      <AnimatePresence mode="wait">
        {hasSpecimen ? (
          // ── LEVEL 2: DETAIL STUDY ACTIVE (SCIENTIFIC RESEARCH VIEW) ──
          <motion.div 
            key={`detail-study-${node.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col flex-grow w-full overflow-hidden justify-start gap-4"
          >
            {/* Scientific Tag & Header Title */}
            <div className="mt-1 shrink-0 pr-8 md:pr-0">
              <span className="text-coastal-sage font-sans uppercase tracking-widest text-[13.5px] font-bold flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-coastal-sage animate-pulse" />
                Coastal Science & Education
              </span>
              <h2 className="text-3xl font-bold font-sans tracking-tight leading-tight mt-1.5 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-coastal-light via-coastal-sage to-coastal-light">
                {node.drawerContent.title}
              </h2>
              <div className="w-20 h-2 bg-coastal-teal rounded-full"></div>
            </div>

            {/* Tab Menu Switcher */}
            <div className="flex justify-between border-b border-coastal-teal/20 pb-2 font-sans text-[14.5px] font-bold uppercase tracking-wider relative shrink-0">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 pb-1.5 px-2 relative cursor-pointer transition-colors ${
                      isActive ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/50 hover:text-coastal-light'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTabIndicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-coastal-sage"
                        transition={{ type: 'spring', damping: 22, stiffness: 160 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Contents Frame */}
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex-grow flex flex-col overflow-y-auto pr-1 gap-4.5 scrollbar-custom max-h-[380px]"
                >
                  <div className="bg-coastal-teal/15 border border-coastal-teal/30 p-5 rounded-xl flex items-start space-x-4 shadow shrink-0">
                    <Info className="w-6 h-6 text-coastal-sage shrink-0 mt-0.5" />
                    <p className="text-coastal-light font-sans font-semibold leading-relaxed text-[16px]">
                      {highlightGlossaryTerms(node.drawerContent.tldr, glossary)}
                    </p>
                  </div>

                  <div className="text-coastal-light/95 leading-relaxed font-sans font-light text-[18px] space-y-4">
                    <p>{highlightGlossaryTerms(node.drawerContent.body, glossary)}</p>
                  </div>

                  <div className="pt-4 border-t border-coastal-teal/20 shrink-0">
                    <div className="flex items-center space-x-2.5 text-coastal-sage mb-2.5">
                      <Sparkles className="w-5 h-5" />
                      <h3 className="font-extrabold tracking-wider font-sans uppercase text-[13.5px]">Did you know?</h3>
                    </div>
                    <p className="text-coastal-light/95 italic font-sans leading-relaxed text-[16px] bg-coastal-forest/20 p-4.5 rounded-xl border border-coastal-forest/30 shadow-sm">
                      "{highlightGlossaryTerms(node.drawerContent.didYouKnow, glossary)}"
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'research' && (
                <motion.div
                  key="research"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex-grow overflow-y-auto pr-1 gap-4.5 scrollbar-custom max-h-[380px] flex flex-col"
                >
                  {node.drawerContent.researchPapers && node.drawerContent.researchPapers.map((paper, idx) => (
                    <div 
                       key={idx}
                       className="bg-coastal-forest/10 border border-coastal-teal/20 p-5 rounded-xl shadow flex flex-col gap-3.5 hover:border-coastal-sage/40 transition-all duration-300 relative group overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-coastal-sage/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      <div className="flex items-center justify-between gap-3.5 shrink-0">
                        <span className="text-[12.5px] text-coastal-sage font-mono uppercase tracking-widest font-bold bg-coastal-teal/15 px-2.5 py-0.5 rounded">
                          {paper.journal}
                        </span>
                        <span className="text-[11px] text-coastal-light/35 font-mono">
                          DOI: {paper.doi}
                        </span>
                      </div>
                      
                      <h4 className="text-[16.5px] font-bold text-coastal-light font-sans leading-snug">
                        {paper.title}
                      </h4>
                      
                      <p className="text-[13.5px] text-coastal-light/45 font-sans italic leading-none">
                        {paper.authors}
                      </p>
                      
                      <div className="h-px bg-coastal-teal/10 w-full my-1.5" />
                      
                      <div>
                        <span className="text-[12.5px] uppercase tracking-widest text-coastal-sage font-extrabold font-sans block mb-1">
                          Core Discovery
                        </span>
                        <p className="text-[16px] text-coastal-light/80 font-sans font-light leading-relaxed">
                          {paper.findings}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="flex-grow flex flex-col overflow-hidden gap-4"
                >
                  <div className="flex-grow overflow-y-auto space-y-4 pr-1 max-h-[260px] scrollbar-custom">
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className={`px-4.5 py-3 rounded-xl text-[16px] font-sans font-light leading-relaxed border shadow ${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-coastal-teal to-coastal-sage text-coastal-dark border-coastal-sage/35 rounded-tr-none font-medium' 
                            : 'bg-coastal-forest/30 text-coastal-light border-coastal-teal/15 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[11.5px] text-coastal-light/35 mt-1 font-mono">{msg.timestamp}</span>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="mr-auto items-start max-w-[85%] flex flex-col">
                        <div className="px-4.5 py-2.5 rounded-xl rounded-tl-none bg-coastal-forest/30 text-coastal-light/70 border border-coastal-teal/15 flex items-center gap-1.5 shadow">
                          <span className="w-2 h-2 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[11.5px] text-coastal-light/35 mt-1 font-mono">AI Scholar is searching archive...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {node.drawerContent.faq && (
                    <div className="flex gap-2.5 overflow-x-auto pb-2.5 shrink-0 scrollbar-none select-none">
                      {node.drawerContent.faq.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.question)}
                          disabled={isTyping}
                          className="px-4 py-2 bg-coastal-forest/20 border border-coastal-teal/20 hover:border-coastal-sage/60 hover:bg-coastal-forest/40 text-coastal-sage text-[13.5px] font-sans font-bold rounded-full whitespace-nowrap transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {item.chip}
                        </button>
                      ))}
                    </div>
                  )}

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="flex items-center gap-2.5 border border-coastal-teal/25 bg-coastal-dark/85 rounded-xl p-2 shrink-0 shadow-inner animate-fade-in"
                  >
                    <input 
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isTyping}
                      placeholder="Ask a scientific research question..." 
                      className="flex-grow bg-transparent border-0 outline-none text-[15.5px] font-sans pl-3 pr-2 py-1.5 text-coastal-light placeholder-coastal-light/40 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isTyping}
                      className="p-2.5 rounded-lg bg-gradient-to-br from-coastal-teal to-coastal-forest border border-coastal-sage/20 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all shadow disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : hasSystem ? (
          // ── LEVEL 1: SUB-SYSTEM SELECTED OVERVIEW ──
          <motion.div
            key={`system-${node.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col flex-grow w-full justify-start gap-4.5 animate-fade-in"
          >
            <div className="flex flex-col justify-start gap-4">
              <div className="mt-1 shrink-0 pr-8 md:pr-0">
                <span className="text-coastal-sage font-sans uppercase tracking-widest text-[14.5px] font-bold flex items-center gap-2">
                  <Compass className="w-4.5 h-4.5 text-coastal-sage animate-spin-slow" />
                  Active Subsystem Zone
                </span>
                <h2 className="text-4xl font-bold font-sans tracking-tight leading-tight mt-1.5 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-coastal-light via-coastal-sage to-coastal-light">
                  {node.title}
                </h2>
                <div className="w-20 h-2 bg-coastal-teal rounded-full"></div>
              </div>

              {/* Major Description Panel - BUMPED SIZING */}
              <div className="border border-coastal-teal/20 bg-coastal-dark/10 p-5 rounded-xl shadow-md shrink-0 text-coastal-light/95 leading-relaxed font-sans font-medium text-[18px]">
                {highlightGlossaryTerms(node.description || "Explore the complex relationships, dynamic sediment currents, and highly specialized organisms adapted to this unique ecosystem zone.", glossary)}
              </div>

              {/* Clickable Detail Studies Catalog - BUMPED SIZING */}
              {node.children && node.children.length > 0 && (
                <div className="flex-grow flex flex-col justify-start gap-2.5 max-h-[250px] overflow-y-auto scrollbar-custom pr-1">
                  <span className="text-[14px] text-coastal-sage font-sans uppercase tracking-widest font-extrabold block mb-1">
                    Subsystem Detail Studies
                  </span>
                  <div className="space-y-3">
                    {node.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => focusNode(child, 2)}
                        className="w-full text-left bg-coastal-forest/15 hover:bg-coastal-forest/25 border border-coastal-teal/20 hover:border-coastal-sage/50 p-4.5 rounded-xl flex items-center justify-between shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                      >
                        <div className="flex flex-col gap-0.5 max-w-[85%]">
                          <span className="text-[18px] font-bold text-coastal-light group-hover:text-coastal-sage transition-colors leading-tight">
                            {child.title}
                          </span>
                          <span className="text-[14px] text-coastal-light/45 font-light leading-normal line-clamp-1">
                            {child.drawerContent?.tldr || "Examine detail study field research data"}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-coastal-teal group-hover:text-coastal-sage transition-all shrink-0 translate-x-0 group-hover:translate-x-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-coastal-dark/80 border border-coastal-teal/30 p-4.5 rounded-xl flex items-start space-x-4 shadow shrink-0 mt-3 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-coastal-teal/5 to-transparent pointer-events-none" />
              <Sparkles className="w-6 h-6 text-coastal-sage shrink-0 mt-0.5 animate-pulse" />
              <div className="flex flex-col justify-start">
                <span className="text-[13.5px] text-coastal-light font-sans font-bold uppercase tracking-wider leading-none">
                  Deep Zoom Enabled
                </span>
                <p className="text-[15.5px] text-coastal-light/75 font-sans leading-relaxed mt-1 font-light">
                  Click any detail study card above or a hotspot beacon on the canvas to open localized scientific research papers and AI Scholar chat.
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          // ── LEVEL 0: REGIONAL OVERVIEW (TELEMETRY DASHBOARD VIEW) ──
          <motion.div 
            key={`telemetry-${activeEcoKey}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col flex-grow w-full justify-start gap-4.5 animate-fade-in"
          >
            {/* Ecosystem Telemetry dashboard card */}
            <div className="border border-coastal-teal/20 bg-coastal-forest/10 p-5 rounded-xl flex flex-col gap-4 shadow select-none">
              
              {/* Telemetry Title Header - BUMPED SIZING */}
              <div className="flex items-center justify-between border-b border-coastal-teal/15 pb-3">
                <span className="text-coastal-sage font-sans uppercase tracking-widest text-[14.5px] font-extrabold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-coastal-sage animate-pulse" />
                  Sensor network telemetry
                </span>
                <span className="text-[12px] text-coastal-light/35 font-mono">
                  Station active
                </span>
              </div>

              {/* Health Score Panel - BUMPED SIZING */}
              <div className="flex items-center gap-5 py-1">
                <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-coastal-sage/35 flex items-center justify-center shrink-0">
                  <motion.div 
                    className="absolute inset-0.5 rounded-full border border-coastal-sage/60"
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                  />
                  <span className="text-[18px] font-sans font-black text-coastal-light leading-none">
                    {telemetryData.health}%
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[12.5px] text-coastal-light/40 font-mono uppercase tracking-wide">
                    System Health Index
                  </span>
                  <span className="text-[16px] text-coastal-light font-sans font-bold leading-tight">
                    {telemetryData.healthStatus}
                  </span>
                </div>
              </div>

              {/* Metrics Grid - BUMPED SIZING */}
              <div className="grid grid-cols-2 gap-3.5 mt-1">
                {telemetryData.metrics.map((m) => {
                  const Icon = m.icon;
                  return (
                    <div 
                      key={m.id}
                      className="bg-coastal-dark/30 border border-coastal-teal/10 p-3.5 rounded-lg flex flex-col justify-between hover:border-coastal-sage/30 transition-colors"
                    >
                      <div className="flex items-center justify-between shrink-0">
                        <span className="text-[12px] text-coastal-light/40 font-sans uppercase font-bold tracking-wide truncate">
                          {m.label}
                        </span>
                        <Icon className="w-4.5 h-4.5 text-coastal-sage" />
                      </div>
                      <div className="mt-2">
                        <span className="text-[18px] font-sans font-extrabold text-coastal-light leading-none">
                          {m.value}
                        </span>
                        <span className="text-[12px] text-coastal-sage/75 font-sans font-light leading-none block mt-0.5">
                          {m.desc}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Active Surveys Progress Panel Card - BUMPED SIZING */}
            <div className="border border-coastal-teal/15 bg-coastal-dark/25 p-5 rounded-xl flex flex-col gap-3.5 shadow-inner">
              <span className="text-[14.5px] text-coastal-sage font-sans uppercase tracking-widest font-extrabold block mb-1">
                Active Field Surveys
              </span>
              <div className="space-y-3 max-h-[160px] overflow-y-auto scrollbar-custom pr-0.5">
                {telemetryData.surveys.map((survey, index) => (
                  <div 
                    key={index}
                    className="bg-coastal-dark/30 border border-coastal-teal/10 p-3.5 rounded-lg flex flex-col gap-2 shadow-sm"
                  >
                    <div className="flex justify-between items-center gap-2.5">
                      <span className="text-[15.5px] text-coastal-light font-sans font-bold truncate leading-tight">
                        {survey.name}
                      </span>
                      <span className={`text-[12.5px] font-mono px-2 py-0.5 rounded leading-none shrink-0 ${
                        survey.progress === 100 
                          ? 'bg-coastal-teal/20 text-coastal-light font-bold'
                          : 'bg-coastal-forest/20 text-coastal-sage font-bold'
                      }`}>
                        {survey.progress}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-coastal-dark/70 rounded-full overflow-hidden border border-coastal-teal/5">
                      <motion.div 
                        className={`h-full rounded-full ${
                          survey.progress === 100 
                            ? 'bg-gradient-to-r from-coastal-teal to-coastal-light'
                            : 'bg-gradient-to-r from-coastal-forest via-coastal-teal to-coastal-sage'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${survey.progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderTheaterContent = () => {
    const isLevel0 = level === 0;
    const isLevel1 = level === 1;
    const isLevel2 = level === 2;

    if (isLevel2 && node && node.drawerContent) {
      // ── LEVEL 2 (THEATER MODE): WIDESCREEN DETAIL STUDY ──
      return (
        <div className="flex flex-col w-full gap-5 animate-fade-in">
          {/* Header Title */}
          <div className="flex flex-col gap-4 border-b border-coastal-teal/15 pb-4 shrink-0">
            <div className="flex flex-col">
              <span className="text-coastal-sage font-sans uppercase tracking-widest text-[13px] font-bold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-coastal-sage animate-pulse" />
                Coastal Science Detail Study
              </span>
              <h2 className="text-3xl font-extrabold font-sans tracking-tight leading-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-coastal-light via-coastal-sage to-coastal-light">
                {node.drawerContent.title}
              </h2>
            </div>
            
            {/* Tab switch button bar */}
            <div className="flex bg-coastal-dark/30 p-1 border border-coastal-teal/15 rounded-xl font-sans text-[13px] font-bold uppercase tracking-wider shrink-0 gap-1.5 self-start select-none">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all relative ${
                      isActive ? 'bg-coastal-teal/20 text-coastal-sage font-extrabold border border-coastal-teal/30 shadow-sm' : 'text-coastal-light/50 hover:text-coastal-light border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab contents wrapper */}
          <div className="w-full relative min-h-[220px]">
            <AnimatePresence mode="wait">
              {activeTab === 'overview' && (
                <motion.div
                  key="theater-overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col w-full max-w-[960px] font-sans pb-4"
                >
                  {/* Core Hypothesis - Styled as an elegant editorial left-border blockquote */}
                  <div className="border-l-3 border-coastal-sage pl-5 py-0.5 flex flex-col gap-1.5 mb-6">
                    <span className="text-[12.5px] uppercase tracking-widest text-coastal-sage font-black leading-none">Core Hypothesis</span>
                    <p className="text-coastal-light font-semibold leading-relaxed text-[17px]">
                      {highlightGlossaryTerms(node.drawerContent.tldr, glossary)}
                    </p>
                  </div>

                  {/* Body description - sitting flatly on the background */}
                  <p className="text-coastal-light/90 leading-relaxed font-light text-[17.5px] mb-6 pr-4">
                    {highlightGlossaryTerms(node.drawerContent.body, glossary)}
                  </p>
                  
                  {/* Factoid - styled cleanly without full box borders */}
                  <div className="flex items-center gap-3 text-coastal-sage/90 text-[14.5px] pr-4 select-none">
                    <Sparkles className="w-5 h-5 text-coastal-sage shrink-0 animate-pulse" />
                    <p className="italic leading-relaxed">
                      <strong>Did you know?</strong> "{highlightGlossaryTerms(node.drawerContent.didYouKnow, glossary)}"
                    </p>
                  </div>
                </motion.div>
              )}

              {activeTab === 'research' && (
                <motion.div
                  key="theater-research"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col divide-y divide-coastal-teal/10 w-full max-w-[960px] font-sans pb-4"
                >
                  {node.drawerContent.researchPapers && node.drawerContent.researchPapers.map((paper, idx) => (
                    <div 
                      key={idx}
                      className="py-5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-start gap-4 md:gap-8 hover:bg-coastal-forest/5 px-2 rounded-lg transition-colors group"
                    >
                      {/* Left Meta info */}
                      <div className="flex flex-col gap-1.5 shrink-0 md:w-44 select-none">
                        <span className="text-[10.5px] text-coastal-sage font-mono uppercase tracking-wider font-extrabold bg-coastal-teal/10 px-2 py-0.5 rounded border border-coastal-teal/10 w-fit">
                          {paper.journal}
                        </span>
                        <span className="text-[10.5px] text-coastal-light/35 font-mono">
                          DOI: {paper.doi}
                        </span>
                      </div>
                      
                      {/* Right Content info */}
                      <div className="flex-grow flex flex-col gap-2">
                        <h4 className="text-[17px] font-bold text-coastal-light leading-snug group-hover:text-coastal-sage transition-colors">
                          {paper.title}
                        </h4>
                        <p className="text-[13.5px] text-coastal-light/45 italic leading-none">
                          {paper.authors}
                        </p>
                        <p className="text-[14.5px] text-coastal-light/80 leading-relaxed font-light mt-1">
                          <strong className="text-coastal-sage font-bold font-sans uppercase text-[11px] tracking-wide mr-1.5">Finding:</strong>
                          {paper.findings}
                        </p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'chat' && (
                <motion.div
                  key="theater-chat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full items-start font-sans pb-4"
                >
                  {/* Left panel: Quick Chips */}
                  <div className="lg:col-span-1 flex flex-col gap-3">
                    <span className="text-[11.5px] text-coastal-sage font-sans uppercase tracking-widest font-black flex items-center gap-1.5 leading-none select-none">
                      <MessageSquare className="w-4 h-4" />
                      Suggested Queries
                    </span>
                    <p className="text-[12.5px] text-coastal-light/45 leading-normal mb-1 font-light">
                      Click a chip to ask the Scholar about key variables.
                    </p>
                    {node.drawerContent.faq && (
                      <div className="flex flex-wrap lg:flex-col gap-2 select-none">
                        {node.drawerContent.faq.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(item.question)}
                            disabled={isTyping}
                            className="text-left px-3.5 py-2.5 bg-coastal-forest/15 hover:bg-coastal-forest/25 text-coastal-sage text-[13px] font-bold rounded-lg transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none hover:scale-[1.01] active:scale-[0.99] w-fit lg:w-full"
                          >
                            {item.chip}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right panel: Active Chat Log & Input */}
                  <div className="lg:col-span-3 flex flex-col gap-4">
                    <div className="h-[230px] overflow-y-auto space-y-4 pr-1 scrollbar-custom">
                      {chatHistory.map((msg, idx) => (
                        <div 
                          key={idx} 
                          className={`flex flex-col max-w-[85%] ${
                            msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                          }`}
                        >
                          <div className={`px-4 py-2.5 rounded-xl text-[14.5px] leading-relaxed border shadow ${
                            msg.sender === 'user' 
                              ? 'bg-gradient-to-r from-coastal-teal to-coastal-sage text-coastal-dark border-coastal-sage/35 rounded-tr-none font-medium' 
                              : 'bg-coastal-forest/10 text-coastal-light border-coastal-teal/10 rounded-tl-none font-light'
                          }`}>
                            {msg.text}
                          </div>
                          <span className="text-[10px] text-coastal-light/35 mt-1 font-mono">{msg.timestamp}</span>
                        </div>
                      ))}
                      
                      {isTyping && (
                        <div className="mr-auto items-start max-w-[85%] flex flex-col">
                          <div className="px-4 py-2.5 rounded-xl rounded-tl-none bg-coastal-forest/10 text-coastal-light/70 border border-coastal-teal/10 flex items-center gap-1.5 shadow">
                            <span className="w-2 h-2 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="text-[10.5px] text-coastal-light/35 mt-1 font-mono">Scholar is searching archives...</span>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(inputValue);
                      }}
                      className="flex items-center gap-2.5 border border-coastal-teal/20 bg-coastal-dark/50 rounded-xl p-1.5 shrink-0 shadow-inner"
                    >
                      <input 
                        type="text" 
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        disabled={isTyping}
                        placeholder="Ask a scientific research question about this detail study..." 
                        className="flex-grow bg-transparent border-0 outline-none text-[15px] pl-3 pr-2 py-1 text-coastal-light placeholder-coastal-light/45 disabled:opacity-50"
                      />
                      <button
                        type="submit"
                        disabled={!inputValue.trim() || isTyping}
                        className="p-2 rounded-lg bg-gradient-to-br from-coastal-teal to-coastal-forest border border-coastal-sage/20 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all shadow disabled:opacity-50 disabled:pointer-events-none"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    } else if (isLevel1 && node) {
      // ── LEVEL 1 (THEATER MODE): SUB-SYSTEM SELECTED OVERVIEW ──
      return (
        <div className="flex flex-col w-full gap-5 animate-fade-in">
          {/* Header Title */}
          <div className="flex flex-col gap-4 border-b border-coastal-teal/15 pb-4 shrink-0">
            <div className="flex flex-col">
              <span className="text-coastal-sage font-sans uppercase tracking-widest text-[13px] font-bold flex items-center gap-2">
                <Compass className="w-4 h-4 text-coastal-sage animate-spin-slow" />
                Active Subsystem Zone
              </span>
              <h2 className="text-3xl font-extrabold font-sans tracking-tight leading-tight mt-1 text-transparent bg-clip-text bg-gradient-to-r from-coastal-light via-coastal-sage to-coastal-light">
                {node.title}
              </h2>
            </div>
            
            {/* Subtabs bar */}
            <div className="flex bg-coastal-dark/30 p-1 border border-coastal-teal/15 rounded-xl font-sans text-[13px] font-bold uppercase tracking-wider shrink-0 gap-1.5 self-start select-none">
              <button
                onClick={() => setTheaterLevel1Tab("overview")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all relative ${
                  theaterLevel1Tab === "overview" ? 'bg-coastal-teal/20 text-coastal-sage font-extrabold border border-coastal-teal/30 shadow-sm' : 'text-coastal-light/50 hover:text-coastal-light border border-transparent'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Zone Overview</span>
              </button>
              <button
                onClick={() => setTheaterLevel1Tab("catalog")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-all relative ${
                  theaterLevel1Tab === "catalog" ? 'bg-coastal-teal/20 text-coastal-sage font-extrabold border border-coastal-teal/30 shadow-sm' : 'text-coastal-light/50 hover:text-coastal-light border border-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Detail Studies ({node.children?.length || 0})</span>
              </button>
            </div>
          </div>

          <div className="w-full relative min-h-[220px]">
            <AnimatePresence mode="wait">
              {theaterLevel1Tab === 'overview' && (
                <motion.div
                  key="theater-sys-overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start font-sans pb-4"
                >
                  <div className="lg:col-span-2 text-coastal-light/95 leading-relaxed font-light text-[17.5px] max-w-[850px] pr-4">
                    {highlightGlossaryTerms(node.description || "Explore the complex relationships, dynamic sediment currents, and highly specialized organisms adapted to this unique ecosystem zone.", glossary)}
                  </div>

                  <div className="lg:col-span-1 border-l-2 border-coastal-sage pl-5 py-0.5 flex flex-col gap-1.5 select-none pr-4">
                    <span className="text-[12px] text-coastal-sage font-black uppercase tracking-wider leading-none">
                      Deep Zoom Enabled
                    </span>
                    <p className="text-[14.5px] text-coastal-light/75 leading-relaxed font-light">
                      Dive deeper into localized ecological features by choosing the **Detail Studies** tab or clicking on the hotspot beacons in the visual map above.
                    </p>
                  </div>
                </motion.div>
              )}

              {theaterLevel1Tab === 'catalog' && (
                <motion.div
                  key="theater-sys-catalog"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full font-sans pb-4"
                >
                  {node.children && node.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => focusNode(child, 2)}
                      className="w-full text-left bg-coastal-forest/15 hover:bg-coastal-forest/25 p-4.5 rounded-xl flex items-center justify-between shadow-sm hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer group"
                    >
                      <div className="flex flex-col gap-1 max-w-[85%]">
                        <span className="text-[16px] font-bold text-coastal-light group-hover:text-coastal-sage transition-colors leading-tight">
                          {child.title}
                        </span>
                        <span className="text-[13px] text-coastal-light/45 font-light leading-normal line-clamp-1">
                          {child.drawerContent?.tldr || "Examine detail study field research data"}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-coastal-teal group-hover:text-coastal-sage transition-all shrink-0 translate-x-0 group-hover:translate-x-1" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    } else {
      // ── LEVEL 0 (THEATER MODE): REGIONAL OVERVIEW (TELEMETRY DASHBOARD VIEW) ──
      return (
        <div className="flex flex-col w-full gap-5 animate-fade-in">
          {/* Subtab menu */}
          <div className="flex border-b border-coastal-teal/20 pb-2.5 font-sans text-[13.5px] font-bold uppercase tracking-wider gap-6 select-none shrink-0">
            <button
              onClick={() => setTheaterLevel0Tab("registry")}
              className={`flex items-center gap-2 pb-2 px-2 relative transition-colors ${
                theaterLevel0Tab === "registry" ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/50 hover:text-coastal-light'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Ecosystem Registry</span>
              {theaterLevel0Tab === "registry" && (
                <motion.div
                  layoutId="theaterL0TabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-coastal-sage"
                  transition={{ type: 'spring', damping: 22, stiffness: 160 }}
                />
              )}
            </button>
            <button
              onClick={() => setTheaterLevel0Tab("telemetry")}
              className={`flex items-center gap-2 pb-2 px-2 relative transition-colors ${
                theaterLevel0Tab === "telemetry" ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/50 hover:text-coastal-light'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Sensor Telemetry</span>
              {theaterLevel0Tab === "telemetry" && (
                <motion.div
                  layoutId="theaterL0TabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-coastal-sage"
                  transition={{ type: 'spring', damping: 22, stiffness: 160 }}
                />
              )}
            </button>
            <button
              onClick={() => setTheaterLevel0Tab("surveys")}
              className={`flex items-center gap-2 pb-2 px-2 relative transition-colors ${
                theaterLevel0Tab === "surveys" ? 'text-coastal-sage font-extrabold' : 'text-coastal-light/50 hover:text-coastal-light'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Active Surveys</span>
              {theaterLevel0Tab === "surveys" && (
                <motion.div
                  layoutId="theaterL0TabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-coastal-sage"
                  transition={{ type: 'spring', damping: 22, stiffness: 160 }}
                />
              )}
            </button>
          </div>

          <div className="w-full relative min-h-[220px]">
            <AnimatePresence mode="wait">
              {theaterLevel0Tab === "registry" && (
                <motion.div
                  key="theater-registry"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full items-start font-sans pb-4"
                >
                  <div className="lg:col-span-2 flex flex-col gap-2">
                    <h3 className="text-[17px] font-bold text-coastal-sage uppercase tracking-wider font-sans select-none">
                      {activeEcoKey === "ocean-beach" ? "Ocean Beach Coastal Ecosystem" : "Florida Mangroves Estuary System"}
                    </h3>
                    <p className="text-coastal-light/90 leading-relaxed font-sans font-light text-[17px] max-w-[850px] pr-4">
                      {activeEcoKey === "ocean-beach" 
                        ? "Located on the western boundary of San Francisco, Ocean Beach is an intense, high-energy beach environment shaped by major offshore ocean swells. Wave energy is bent by the Golden Gate Bar sandbar refraction, creating a highly dynamic coastline. This ecosystem registry tracks sediment budget changes, dune vegetation growth, and moisture harvesting from dense summer coastal fog."
                        : "Mangroves are crucial biological engines along Florida's coastline, stabilizing shorelines against tidal flows, storm sweeps, and waves. Red mangroves filter massive amounts of salt from seawater through high-pressure root cells, while black mangroves excrete salt crystals on their leaves. Fiddler crabs bioturbate the soil to drive dissolved oxygen deep into waterlogged anoxic mud."
                      }
                    </p>
                  </div>

                  <div className="lg:col-span-1 border-l-2 border-coastal-sage pl-5 py-0.5 flex flex-col gap-1.5 select-none pr-4">
                    <span className="text-[12px] uppercase tracking-widest text-coastal-sage font-black leading-none flex items-center gap-1.5">
                      <Compass className="w-4.5 h-4.5" />
                      Wayfinding Guidelines
                    </span>
                    <p className="text-[14px] text-coastal-light/75 leading-relaxed font-light">
                      To explore, scroll up to the visual map canvas, locate the flashing green Hotspot Beacons, and click to deep-zoom into subsystem zones or localized field studies.
                    </p>
                  </div>
                </motion.div>
              )}

              {theaterLevel0Tab === "telemetry" && (
                <motion.div
                  key="theater-telemetry"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 lg:grid-cols-4 gap-6 w-full items-center font-sans pb-4"
                >
                  <div className="lg:col-span-1 flex items-center gap-5 justify-center lg:justify-start pr-4 select-none">
                    <div className="relative w-16 h-16 rounded-full border border-dashed border-coastal-sage/35 flex items-center justify-center shrink-0">
                      <motion.div 
                        className="absolute inset-0.5 rounded-full border border-coastal-sage/60"
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                      />
                      <span className="text-[18px] font-sans font-black text-coastal-light leading-none">
                        {telemetryData.health}%
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[11px] text-coastal-light/40 font-mono uppercase tracking-wide leading-none">
                        Health Index
                      </span>
                      <span className="text-[16px] text-coastal-light font-sans font-bold leading-tight mt-1">
                        {telemetryData.healthStatus}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-6 w-full pr-4">
                    {telemetryData.metrics.map((m) => {
                      const Icon = m.icon;
                      return (
                        <div 
                          key={m.id}
                          className="flex flex-col hover:scale-[1.01] transition-all"
                        >
                          <div className="flex items-center justify-between shrink-0 select-none">
                            <span className="text-[11.5px] text-coastal-light/40 font-sans uppercase font-bold tracking-wide truncate">
                              {m.label}
                            </span>
                            <Icon className="w-4 h-4 text-coastal-sage" />
                          </div>
                          <div className="mt-2.5">
                            <span className="text-[18px] font-sans font-extrabold text-coastal-light leading-none">
                              {m.value}
                            </span>
                            <span className="text-[11.5px] text-coastal-sage/75 font-sans font-light leading-none block mt-1">
                              {m.desc}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {theaterLevel0Tab === "surveys" && (
                <motion.div
                  key="theater-surveys"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 w-full font-sans pb-4"
                >
                  {telemetryData.surveys.map((survey, index) => (
                    <div 
                      key={index}
                      className="bg-coastal-forest/15 hover:bg-coastal-forest/25 p-5 rounded-xl flex flex-col gap-3 shadow-sm hover:scale-[1.01] transition-all duration-300"
                    >
                      <div className="flex justify-between items-center gap-2.5 shrink-0 select-none">
                        <span className="text-[15.5px] text-coastal-light font-sans font-bold truncate leading-tight">
                          {survey.name}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          survey.status === "Active" 
                            ? "bg-coastal-sage/15 text-coastal-sage border-coastal-sage/20 animate-pulse" 
                            : "bg-coastal-light/10 text-coastal-light/50 border-coastal-light/10"
                        }`}>
                          {survey.status}
                        </span>
                      </div>
                      <p className="text-[13.5px] text-coastal-light/75 leading-relaxed font-light">
                        {survey.desc}
                      </p>
                      <div className="flex justify-between items-center text-[10.5px] font-mono text-coastal-light/35 border-t border-coastal-teal/5 pt-2.5 mt-1 select-none">
                        <span>Lead: {survey.leader}</span>
                        <span>{survey.date}</span>
                      </div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      );
    }
  };

  const isTheater = layoutMode === "theater-mode";

  const motionVariants = isTheater 
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.3 }
      }
    : {
        initial: { x: '120%', opacity: 0 },
        animate: {
          x: isCollapsed ? '120%' : 0,
          opacity: isCollapsed ? 0 : 1,
        },
        exit: { x: '120%', opacity: 0 },
        transition: { type: 'spring', damping: 25, stiffness: 180 }
      };

  const containerClasses = isTheater
    ? "w-full border-t border-coastal-teal/20 bg-coastal-dark/95 p-8 flex flex-col gap-6 select-none shrink-0 relative"
    : "z-50 md:z-30 flex flex-col shrink-0 absolute md:static top-0 right-0 bottom-0 h-full w-full md:w-[460px] border-l border-coastal-teal/20 bg-coastal-dark/95 p-5.5 overflow-y-auto overflow-x-hidden gap-4.5 shadow-2xl select-none scrollbar-custom";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          {...motionVariants}
          className={containerClasses}
        >
          {isTheater ? (
            <div className="max-w-[1300px] mx-auto w-full px-6 md:px-12 lg:px-20 flex flex-col gap-6">
              {renderTheaterContent()}
            </div>
          ) : (
            <>
              {/* Symmetrical Collapse Toggle (Desktop) */}
              <button
                onClick={() => setIsCollapsed(true)}
                className="hidden md:flex absolute left-4 top-6 w-7 h-7 rounded-full bg-coastal-teal/90 hover:bg-coastal-teal border border-coastal-sage text-white items-center justify-center cursor-pointer shadow transition-all duration-200 z-50 hover:scale-105 active:scale-95"
                title="Collapse Control Panel"
              >
                <ChevronRight className="w-4.5 h-4.5 text-white" />
              </button>

              {/* ── LOWER SECTION WORKSPACE: TELEMETRY OR STUDY DETAILS ── */}
              <div className="flex-grow flex flex-col justify-start overflow-hidden mt-1">
                {renderInnerContent()}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
