import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, BookOpen, MessageSquare, Send, Sparkles, ChevronLeft, Activity, Thermometer, Wind, Droplet, Compass } from 'lucide-react';

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

export default function SidebarDrawer({ 
  isOpen, 
  node, 
  layoutMode = 'immersive', 
  isLeftCollapsed = false, 
  setIsLeftCollapsed,
  activeEcoKey = 'ocean-beach',
  isInline = false
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [chatHistory, setChatHistory] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const telemetryData = ECOSYSTEM_TELEMETRY[activeEcoKey] || ECOSYSTEM_TELEMETRY["ocean-beach"];

  // Reset tab and populate custom welcoming chat logs when node changes
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

  // Autoscroll chat window to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping]);

  // Context-aware dynamic simulated research parser
  const generateAIResponse = (questionText) => {
    const text = questionText.toLowerCase();
    const nodeId = node.id;

    // 1. Search pre-defined FAQs first for exact/partial matches
    const matchedFaq = node.drawerContent.faq?.find(
      f => f.question.toLowerCase() === text || f.chip.toLowerCase() === text
    );
    if (matchedFaq) {
      return matchedFaq.answer;
    }

    // 2. Keyword matching parser based on Specimen node topics
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

    // Mangrove specimen nodes
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

    // Dynamic intelligent fallback responses
    return `That is a fascinating research question! While I don't have that specific field measurement in my local index, active studies by the Coastal Research Group focus heavily on these dynamics. Try one of the suggestion chips or check our 'Research & Lit' tab for related peer-reviewed papers.`;
  };

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    // Add user message to history
    const userMsg = {
      sender: "user",
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Mock search delay for premium feel
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

  const isImmersive = layoutMode === 'immersive';
  const hasSpecimen = node && node.drawerContent;

  const renderInnerContent = () => (
    <div className="flex flex-col h-full w-full relative min-h-[520px]">
      


      <AnimatePresence mode="wait">
        {hasSpecimen ? (
          // ── SPECIMEN ACTIVE (SCIENTIFIC RESEARCH VIEW) ──
          <motion.div 
            key={`specimen-${node.id}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col h-full w-full overflow-hidden"
          >
            {/* Scientific Tag & Header Title */}
            <div className="mt-2 mb-4 shrink-0">
              <span className="text-coastal-sage font-sans uppercase tracking-widest text-[10px] font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-coastal-sage" />
                Coastal Science & Education
              </span>
              <h2 className="text-2xl font-bold font-sans tracking-tight leading-snug mt-1 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-coastal-light via-coastal-sage to-coastal-light">
                {node.drawerContent.title}
              </h2>
              <div className="w-16 h-1 bg-coastal-teal rounded-full"></div>
            </div>

            {/* Sliding Tab Menu Switcher */}
            <div className="flex justify-between border-b border-coastal-teal/20 mb-5 font-sans text-[11px] font-semibold uppercase tracking-wider relative shrink-0">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 pb-2.5 px-1 relative cursor-pointer transition-colors ${
                      isActive ? 'text-coastal-sage font-bold' : 'text-coastal-light/50 hover:text-coastal-light'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
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
                  className="flex-grow flex flex-col overflow-y-auto pr-1 space-y-6"
                >
                  <div className="bg-coastal-teal/15 border border-coastal-teal/30 p-5 rounded-2xl flex items-start space-x-4 shadow-lg shrink-0">
                    <Info className="w-5 h-5 text-coastal-sage shrink-0 mt-0.5" />
                    <p className="text-coastal-light font-sans font-medium leading-relaxed text-[13px]">
                      {node.drawerContent.tldr}
                    </p>
                  </div>

                  <div className="text-coastal-light/90 leading-relaxed font-sans font-light text-[15px] space-y-4">
                    <p>{node.drawerContent.body}</p>
                  </div>

                  <div className="mt-auto pt-6 border-t border-coastal-teal/20 shrink-0">
                    <div className="flex items-center space-x-2 text-coastal-sage mb-2.5">
                      <Sparkles className="w-4 h-4" />
                      <h3 className="font-semibold tracking-wider font-sans uppercase text-xs">Did you know?</h3>
                    </div>
                    <p className="text-coastal-light/95 italic font-sans leading-relaxed text-[13px] bg-coastal-forest/20 p-4 rounded-xl border border-coastal-forest/30">
                      "{node.drawerContent.didYouKnow}"
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
                  className="flex-grow overflow-y-auto pr-1 space-y-4"
                >
                  {node.drawerContent.researchPapers && node.drawerContent.researchPapers.map((paper, idx) => (
                    <div 
                      key={idx}
                      className="bg-coastal-forest/10 border border-coastal-teal/20 p-5 rounded-2xl shadow-lg flex flex-col gap-3.5 hover:border-coastal-sage/40 transition-all duration-300 relative group overflow-hidden"
                    >
                      {/* Accent glow on card hover */}
                      <div className="absolute inset-0 bg-gradient-to-br from-coastal-sage/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

                      <div className="flex items-center justify-between gap-3 shrink-0">
                        <span className="text-[10px] text-coastal-sage font-mono uppercase tracking-widest font-semibold bg-coastal-teal/15 px-2 py-0.5 rounded">
                          {paper.journal}
                        </span>
                        <span className="text-[9px] text-coastal-light/35 font-mono">
                          DOI: {paper.doi}
                        </span>
                      </div>
                      
                      <h4 className="text-sm font-semibold text-coastal-light font-sans leading-tight">
                        {paper.title}
                      </h4>
                      
                      <p className="text-[11px] text-coastal-light/45 font-sans italic">
                        {paper.authors}
                      </p>
                      
                      <div className="h-px bg-coastal-teal/10 w-full my-0.5" />
                      
                      <div>
                        <span className="text-[10px] uppercase tracking-widest text-coastal-sage font-bold font-sans block mb-1">
                          Core Discovery
                        </span>
                        <p className="text-[13px] text-coastal-light/80 font-sans font-light leading-relaxed">
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
                  className="flex-grow flex flex-col min-h-[380px] overflow-hidden"
                >
                  {/* Chat Message Logs Area */}
                  <div className="flex-grow overflow-y-auto space-y-4 pr-1 mb-4 max-h-[320px] scrollbar-thin scrollbar-thumb-coastal-teal/20 scrollbar-track-transparent">
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${
                          msg.sender === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div className={`px-4 py-3 rounded-2xl text-[13px] font-sans font-light leading-relaxed border shadow-md ${
                          msg.sender === 'user' 
                            ? 'bg-gradient-to-r from-coastal-teal to-coastal-sage text-coastal-dark border-coastal-sage/35 rounded-tr-none font-medium' 
                            : 'bg-coastal-forest/30 text-coastal-light border-coastal-teal/15 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-coastal-light/35 mt-1.5 font-mono">{msg.timestamp}</span>
                      </div>
                    ))}
                    
                    {/* Animated Typing Indicator */}
                    {isTyping && (
                      <div className="mr-auto items-start max-w-[85%] flex flex-col">
                        <div className="px-4 py-3 rounded-2xl rounded-tl-none bg-coastal-forest/30 text-coastal-light/70 border border-coastal-teal/15 flex items-center gap-1.5 shadow-md">
                          <span className="w-1.5 h-1.5 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-1.5 h-1.5 bg-coastal-sage rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <span className="text-[9px] text-coastal-light/35 mt-1.5 font-mono">AI Scholar is searching archive...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Dynamic Sliding Suggestion Chips */}
                  {node.drawerContent.faq && (
                    <div className="flex gap-2 overflow-x-auto pb-3 shrink-0 scrollbar-none select-none">
                      {node.drawerContent.faq.map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.question)}
                          disabled={isTyping}
                          className="px-3.5 py-1.5 bg-coastal-forest/20 border border-coastal-teal/20 hover:border-coastal-sage/60 hover:bg-coastal-forest/40 text-coastal-sage text-xs font-sans font-medium rounded-full whitespace-nowrap transition-all duration-300 shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {item.chip}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Text Input Footer Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage(inputValue);
                    }}
                    className="flex items-center gap-2 border border-coastal-teal/25 bg-coastal-dark/85 rounded-xl p-1.5 shrink-0 shadow-inner"
                  >
                    <input 
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      disabled={isTyping}
                      placeholder="Ask a scientific research question..." 
                      className="flex-grow bg-transparent border-0 outline-none text-[13px] font-sans pl-3 pr-2 py-1.5 text-coastal-light placeholder-coastal-light/40 disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!inputValue.trim() || isTyping}
                      className="p-2 rounded-lg bg-gradient-to-br from-coastal-teal to-coastal-forest border border-coastal-sage/20 text-white cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          // ── ECOSYSTEM PERSISTENT OVERVIEW (TELEMETRY DASHBOARD VIEW) ──
          <motion.div 
            key={`telemetry-${activeEcoKey}`}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col h-full w-full justify-between"
          >
            {/* Header Title & Flashing Dot */}
            <div className="mt-2 mb-3 shrink-0">
              <span className="text-coastal-sage font-sans uppercase tracking-widest text-[10px] font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-coastal-sage animate-ping" />
                Live Field Station Telemetry
              </span>
              <h2 className="text-2xl font-bold font-sans tracking-tight leading-snug mt-1 mb-2 text-transparent bg-clip-text bg-gradient-to-r from-coastal-light via-coastal-sage to-coastal-light">
                {telemetryData.name}
              </h2>
              <div className="w-20 h-1 bg-coastal-teal rounded-full"></div>
            </div>

            {/* Scientific Health Card */}
            <div className="bg-coastal-teal/10 border border-coastal-teal/25 px-5 py-4 rounded-2xl shadow-lg flex items-center gap-4 shrink-0 mb-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-coastal-sage/5 to-transparent pointer-events-none" />
              
              {/* Ring score */}
              <div className="relative w-14 h-14 rounded-full border-2 border-dashed border-coastal-sage/30 flex items-center justify-center shrink-0">
                <motion.div 
                  className="absolute inset-1 rounded-full border border-coastal-sage/60"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 15, ease: 'linear' }}
                />
                <span className="text-md font-sans font-bold text-coastal-light leading-none">
                  {telemetryData.health}%
                </span>
              </div>

              <div className="flex flex-col justify-start">
                <span className="text-[9px] text-coastal-sage font-mono uppercase tracking-wider font-semibold">
                  System Health Index
                </span>
                <span className="text-[12px] text-coastal-light font-sans font-semibold leading-tight mt-0.5">
                  {telemetryData.healthStatus}
                </span>
                <span className="text-[9px] text-coastal-light/40 font-light mt-0.5">
                  Continuous sensor telemetry normal
                </span>
              </div>
            </div>

            {/* Telemetry Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-3 shrink-0 mb-4">
              {telemetryData.metrics.map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div 
                    key={m.id}
                    className="bg-coastal-forest/10 border border-coastal-teal/15 p-3 rounded-xl flex flex-col justify-between shadow hover:border-coastal-sage/35 transition-all duration-300 relative group overflow-hidden"
                  >
                    <div className="flex items-center justify-between shrink-0">
                      <span className="text-[9px] text-coastal-light/45 font-sans font-medium uppercase tracking-wide truncate pr-1">
                        {m.label}
                      </span>
                      <Icon className="w-3.5 h-3.5 text-coastal-sage shrink-0" />
                    </div>
                    <div className="mt-2.5">
                      <span className="text-md font-sans font-bold text-coastal-light block tracking-tight leading-none">
                        {m.value}
                      </span>
                      <span className="text-[9px] text-coastal-sage/75 font-sans font-light leading-none block mt-1">
                        {m.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Active Surveys Progress Checklist */}
            <div className="flex-grow flex flex-col justify-start overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-coastal-teal/10">
              <span className="text-[10px] text-coastal-sage font-sans uppercase tracking-widest font-bold block mb-3">
                Active Field Surveys
              </span>
              <div className="space-y-3">
                {telemetryData.surveys.map((survey, index) => (
                  <div 
                    key={index}
                    className="bg-coastal-dark/30 border border-coastal-teal/10 p-3 rounded-xl flex flex-col gap-1.5 shadow-sm"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-[12px] text-coastal-light font-sans font-medium truncate pr-1 leading-snug">
                        {survey.name}
                      </span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded leading-none shrink-0 ${
                        survey.progress === 100 
                          ? 'bg-coastal-teal/20 text-coastal-light border border-coastal-teal/30'
                          : 'bg-coastal-forest/20 text-coastal-sage border border-coastal-sage/20'
                      }`}>
                        {survey.progress}%
                      </span>
                    </div>
                    {/* Sleek dynamic progress bar */}
                    <div className="h-1.5 w-full bg-coastal-dark/70 rounded-full overflow-hidden border border-coastal-teal/5">
                      <motion.div 
                        className={`h-full rounded-full ${
                          survey.progress === 100 
                            ? 'bg-gradient-to-r from-coastal-teal to-coastal-light'
                            : 'bg-gradient-to-r from-coastal-forest via-coastal-teal to-coastal-sage'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${survey.progress}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: index * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dynamic Action Call Card */}
            <div className="bg-coastal-dark/80 border border-coastal-teal/30 p-4 rounded-2xl flex items-start space-x-3.5 shadow-lg shrink-0 mt-4 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-coastal-teal/5 to-transparent pointer-events-none" />
              <Compass className="w-5 h-5 text-coastal-sage shrink-0 mt-0.5 animate-pulse" />
              <div className="flex flex-col justify-start">
                <span className="text-[10px] text-coastal-light font-sans font-bold uppercase tracking-wider leading-none">
                  Field Station Active
                </span>
                <p className="text-[11px] text-coastal-light/70 font-sans leading-relaxed mt-1 font-light">
                  Click any wayfinding hotspot beacon on the central map to analyze localized species data and interface with the AI Research Scholar.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isInline) {
    return renderInnerContent();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '-120%', opacity: 0 }}
          animate={{
            x: isImmersive ? (isLeftCollapsed ? -420 : 0) : 0,
            width: !isImmersive ? (isLeftCollapsed ? 0 : 384) : 384,
            opacity: isLeftCollapsed && !isImmersive ? 0 : 1,
          }}
          exit={{ x: '-120%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 180 }}
          className={`z-40 flex flex-col shrink-0 relative ${
            isImmersive 
              ? 'absolute top-8 left-8 bottom-8 w-96 max-w-[calc(100vw-4rem)] pointer-events-none' 
              : 'h-full border-r border-coastal-teal/20 bg-coastal-dark/95 p-6 overflow-y-auto overflow-x-hidden gap-5 w-96 pointer-events-auto shadow-2xl'
          } ${!isImmersive && isLeftCollapsed ? 'overflow-hidden border-r-0 p-0' : ''}`}
        >
          {/* Symmetrical Collapse Button */}
          {!isLeftCollapsed && (
            <button
              onClick={() => setIsLeftCollapsed(true)}
              className={`w-6 h-6 rounded-full bg-coastal-teal/90 hover:bg-coastal-teal border border-coastal-sage text-white flex items-center justify-center cursor-pointer shadow-md pointer-events-auto transition-all duration-200 z-50 hover:scale-105 active:scale-95 ${
                isImmersive 
                  ? 'absolute -right-3 top-1/2 -translate-y-1/2' 
                  : 'absolute right-4 top-5'
              }`}
              title="Collapse Panel"
            >
              <ChevronLeft className="w-3.5 h-3.5 text-white" />
            </button>
          )}

          <div className={
            isImmersive 
              ? "pointer-events-auto bg-coastal-dark/65 backdrop-blur-xl p-6 rounded-2xl border border-coastal-teal/20 shadow-2xl flex flex-col h-full relative overflow-hidden" 
              : "flex flex-col h-full w-full relative"
          }>
            {renderInnerContent()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
