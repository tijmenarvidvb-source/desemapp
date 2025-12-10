import React, { useState, useEffect } from 'react';
import { Play, Clock, ChevronRight, ChevronLeft, FileText, Timer, RotateCcw, Settings, Calculator, Camera, Image as ImageIcon, Calendar, Wand2, Archive, Save, Thermometer, Trash2, Hourglass, LayoutDashboard, BookOpen, Plus, X, AlertTriangle, StopCircle, Undo, ArrowRight, ArrowLeft, CheckCircle2, StickyNote, Tag, Printer, FileSpreadsheet, Edit3, Snowflake, Sun, ChevronDown, ChevronUp, BarChart3, ClipboardList, ThumbsUp } from 'lucide-react';

// --- HULP FUNCTIES ---

const formatTime = (isoString) => {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const toDateTimeLocal = (date) => {
  if (!date) return '';
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const getDuration = (start, end) => {
  if (!start || !end) return '-';
  const diff = new Date(end) - new Date(start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours}u ${minutes}m`;
  return `${minutes}m`;
};

const getMinutesDiff = (start, end) => {
  if (!start || !end) return 0;
  return Math.floor((new Date(end) - new Date(start)) / (1000 * 60));
};

const calculateBulkTime = (logs, currentTime = new Date()) => {
  const startLog = logs.find(l => l.action === 'Mixen Compleet');
  if (!startLog) return null;

  const endLog = logs.find(l => ['Preshape', 'Final Shape', 'Cold Proof Start', 'Room Proof Start'].includes(l.action));
  const endTime = endLog ? new Date(endLog.time) : currentTime;
  
  return {
    text: getDuration(startLog.time, endTime),
    minutes: getMinutesDiff(startLog.time, endTime),
    startTime: startLog.time,
    isFinished: !!endLog
  };
};

const getLogCount = (logs, actionName) => logs.filter(l => l.action.includes(actionName)).length;

const getDurationBetween = (logs, startAction, endAction) => {
    const start = logs.find(l => l.action === startAction);
    const end = logs.find(l => l.action === endAction && new Date(l.time) > new Date(start?.time));
    if (!start || !end) return 0;
    return getMinutesDiff(start.time, end.time);
};

const estimateBulkRiseDuration = (temp, inoculation, history) => {
  let theoreticalMinutes = 420;
  theoreticalMinutes = theoreticalMinutes * (20 / (inoculation || 20));
  const tempDiff = (temp || 21) - 21;
  theoreticalMinutes = theoreticalMinutes * Math.pow(0.92, tempDiff);

  const validBakes = history.filter(h => {
    const bulk = calculateBulkTime(h.logs, h.endTime);
    return bulk && bulk.isFinished && bulk.minutes > 60; 
  });

  if (validBakes.length >= 3) {
    const avgHistoricalMinutes = validBakes.reduce((acc, curr) => {
      const bulk = calculateBulkTime(curr.logs, curr.endTime);
      return acc + bulk.minutes;
    }, 0) / validBakes.length;
    return Math.round((theoreticalMinutes * 0.3) + (avgHistoricalMinutes * 0.7));
  }
  return Math.round(theoreticalMinutes);
};

const generateSessionCSV = (session) => {
    if (!session) return;
    const config = session.configSnapshot || {};
    const analysis = session.analysis || {};
    
    let csv = `Recept,${session.name}\nDatum,${new Date(session.startTime).toLocaleDateString()}\n`;
    csv += `Eindcijfer,${analysis.rating || '-'}\n\n`;

    csv += `Tijd,Actie,Notities\n`;
    session.logs.forEach(log => {
        csv += `${new Date(log.time).toLocaleTimeString()},${log.action},"${(log.notes || []).join('; ')}"\n`;
    });
    
    csv += `\n--- Evaluatie ---\n`;
    csv += `Starter Rijstijd,${getDurationBetween(session.logs, 'Starter Gevoed', 'Mixen Compleet')}m\n`;
    csv += `Starter Toename,${analysis.starterRise || '-'}\n`;
    csv += `Bulkrijs Duur,${calculateBulkTime(session.logs, session.endTime)?.minutes || 0}m\n`;
    csv += `Bulk Toename,${analysis.bulkRise || '-'}\n`;
    csv += `Deeg Gevoel,${analysis.doughResult || '-'}\n`;
    csv += `Ovenspring,${analysis.ovenSpring || '-'}\n`;
    csv += `Oor,${analysis.ear || '-'}\n`;
    csv += `Crumb,${analysis.crumb || '-'}\n`;
    csv += `Korst,${analysis.crust || '-'}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `desem_sessie_${session.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const generateStatsCSV = (history) => {
    const headers = [
        'Datum', 'Hydratatie (%)', 'Inoculatie (%)', 'Temp (°C)', 
        'Starter Leeftijd (min)', 'Autolyse (min)', 'Stretch & Folds', 'Coil Folds', 
        'Bulkrijs (min)', 'Cold Proof (min)', 'Room Proof (min)', 
        'Beoordeling (1-10)', 
        'Starter Toename', 'Bulk Toename', 'Deeg Gevoel', 'Ovenspring', 'Oor', 'Crumb', 'Korst'
    ];

    const rows = history.map(h => {
        const logs = h.logs;
        const config = h.configSnapshot || {};
        const analysis = h.analysis || {};
        const bulk = calculateBulkTime(logs, h.endTime);
        
        return [
            new Date(h.startTime).toLocaleDateString(),
            config.hydration || '',
            config.inoculation || '',
            h.temperature || '',
            getDurationBetween(logs, 'Starter Gevoed', 'Mixen Compleet'),
            getDurationBetween(logs, 'Autolyse Start', 'Mixen Compleet'),
            getLogCount(logs, 'Stretch & Fold'),
            getLogCount(logs, 'Coil Fold'),
            bulk ? bulk.minutes : 0,
            getDurationBetween(logs, 'Cold Proof Start', 'Oven In'),
            getDurationBetween(logs, 'Room Proof Start', 'Oven In'),
            analysis.rating || '',
            analysis.starterRise || '',
            analysis.bulkRise || '',
            analysis.doughResult || '',
            analysis.ovenSpring || '',
            analysis.ear || '',
            analysis.crumb || '',
            analysis.crust || ''
        ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `desem_analyse_totaal.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const INSTANT_ACTIONS = ['Starter Gevoed', 'In Koelkast', 'Oven In', 'Sessie Gestart', 'Cold Proof Start'];

const TAGS = [
  "Plakkerig", "Rijst snel", "Rijst traag", "Slap deeg", 
  "Sterk deeg", "Goede windowpane", "Geen windowpane", 
  "Temperatuur piek", "Luchtig", "Compact"
];

const DEFAULT_PRESETS = [
  {
    name: "Wit (1 brood)",
    config: { targetWeight: 850, hydration: 68, inoculation: 20, salt: 2, wheatPerc: 90, wholeWheatPerc: 10, speltPerc: 0, starterType: 'stiff', starterBuffer: 12 }
  },
  {
    name: "Wit (2 broden)",
    config: { targetWeight: 1700, hydration: 68, inoculation: 20, salt: 2, wheatPerc: 90, wholeWheatPerc: 10, speltPerc: 0, starterType: 'stiff', starterBuffer: 12 }
  },
  {
    name: "Licht Volkoren",
    config: { targetWeight: 900, hydration: 72, inoculation: 20, salt: 2, wheatPerc: 70, wholeWheatPerc: 30, speltPerc: 0, starterType: 'stiff', starterBuffer: 12 }
  }
];

// --- COMPONENTEN ---

const PhaseTimeline = ({ logs }) => {
  const actions = logs.filter(l => l.type === 'action').sort((a,b) => new Date(b.time) - new Date(a.time));
  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 mb-2 px-1 scrollbar-hide snap-x">
      {actions.map((log, index) => {
        const isLatest = index === 0;
        const isOldest = index === actions.length - 1;
        
        return (
          <div key={index} className="flex items-center gap-2 flex-shrink-0 snap-start">
            <div className={`
              px-3 py-1 rounded-lg text-xs font-bold flex flex-col items-center justify-center shadow-sm border transition-all min-w-[80px]
              ${isLatest 
                ? 'bg-amber-100 text-amber-800 border-amber-200 ring-2 ring-amber-500 ring-offset-1' 
                : 'bg-white text-stone-400 border-stone-200'}
            `}>
              <span className="flex items-center gap-1 mb-0.5">
                  {isLatest ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                  {log.action}
              </span>
              <span className={`text-[9px] font-mono ${isLatest ? 'text-amber-600' : 'text-stone-300'}`}>
                {formatTime(log.time)}
              </span>
              {log.notes && log.notes.length > 0 && (
                <div className="text-[8px] text-amber-500 font-extrabold flex items-center gap-0.5 mt-0.5">
                    <StickyNote className="w-2.5 h-2.5"/> {log.notes.length}
                </div>
              )}
            </div>
            {!isOldest && <ArrowLeft className="w-3 h-3 text-stone-300" />}
          </div>
        );
      })}
    </div>
  );
};

const ActionButton = ({ label, icon, onClick, subtext, activeTimer, onStopTimer }) => {
  const isRunning = activeTimer?.action === label || (label === 'Stretch & Fold' && activeTimer?.action?.startsWith('Stretch & Fold'));
  const [timeLeft, setTimeLeft] = useState('');
  const [isOvertime, setIsOvertime] = useState(false);
  
  useEffect(() => {
    if (!isRunning || !activeTimer) return;
    const tick = () => {
      const now = new Date();
      const diff = activeTimer.targetTime - now;
      if (diff <= 0) {
        setIsOvertime(true);
        const overDiff = Math.abs(diff);
        const m = Math.floor((overDiff / 1000 / 60));
        const s = Math.floor((overDiff / 1000) % 60);
        setTimeLeft(`+ ${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setIsOvertime(false);
        const m = Math.floor((diff / 1000 / 60));
        const s = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isRunning, activeTimer]);

  const handleClick = () => {
    if (isRunning) { onStopTimer(); } else { onClick(); }
  };

  return (
    <button 
      onClick={handleClick}
      className={`border-2 p-3 rounded-xl flex flex-col items-center justify-center gap-1 shadow-sm transition-all h-28 w-full relative overflow-hidden
        ${isRunning 
          ? isOvertime 
            ? 'bg-red-50 border-red-500 text-red-700 shadow-inner' 
            : 'bg-amber-600 border-amber-700 text-white shadow-inner scale-[0.98]' 
          : 'bg-white border-stone-200 text-stone-700 hover:border-amber-200 active:scale-95'}`}
    >
      {isRunning ? (
        <>
          <div className={`animate-pulse mb-1 ${isOvertime ? 'text-red-600' : 'text-white'}`}><Timer className="w-8 h-8 mx-auto" /></div>
          <span className="font-mono text-2xl font-bold tracking-wider">{timeLeft}</span>
          <span className={`text-xs font-medium mt-1 ${isOvertime ? 'text-red-500' : 'text-amber-100'}`}>
               {isOvertime ? "Over Tijd!" : label}
          </span>
        </>
      ) : (
        <>
          <div className="text-2xl text-stone-400">{icon}</div>
          <span className="font-bold text-center text-sm leading-tight z-10">{label}</span>
          {subtext && <span className="text-[10px] text-center z-10 text-stone-400">{subtext}</span>}
        </>
      )}
    </button>
  );
};

const SectionHeader = ({ title }) => (
  <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-6 mb-3 pl-1">{title}</h3>
);

const InputRow = ({ label, value, onChange, unit, step = 1, min = 0, max = 100, onAutoFix }) => (
  <div className="py-3 border-b border-stone-100 last:border-0">
    <div className="flex justify-between items-center mb-2">
      <div className="flex items-center gap-2">
        <label className="text-stone-600 font-medium text-sm select-none" onDoubleClick={onAutoFix}>{label}</label>
        {onAutoFix && (
          <button onClick={onAutoFix} className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full hover:bg-amber-200 transition-colors font-bold uppercase tracking-wider">
            <Wand2 className="w-3 h-3" /> Rest
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input 
          type="number" inputMode="decimal" step={step} min={min} max={max} value={value}
          onChange={(e) => { const val = parseFloat(e.target.value); onChange(isNaN(val) ? 0 : val); }}
          className="w-20 text-right font-bold text-stone-800 bg-stone-50 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <span className="text-stone-400 text-sm w-4">{unit}</span>
      </div>
    </div>
    <input 
      type="range" min={min} max={max} step={step} value={value} 
      onChange={(e) => onChange(parseFloat(e.target.value))}
      onDoubleClick={onAutoFix}
      className="w-full accent-amber-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
    />
  </div>
);

const NavButton = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-3 gap-1 transition-colors
      ${active ? 'text-amber-600' : 'text-stone-400 hover:text-stone-600'}`}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
  </button>
);

const PhaseTracker = ({ logs, activeTimer, onUndo, onAddNote }) => {
  const [elapsed, setElapsed] = useState('');
  const lastAction = logs.filter(l => l.type === 'action').sort((a,b) => new Date(b.time) - new Date(a.time))[0];
  const isInstant = lastAction && INSTANT_ACTIONS.includes(lastAction.action);

  useEffect(() => {
    if (!lastAction || isInstant) return;
    const tick = () => {
      const start = new Date(lastAction.time);
      const now = new Date();
      const diff = now - start;
      const m = Math.floor(diff / 1000 / 60);
      const s = Math.floor((diff / 1000) % 60);
      setElapsed(`${m}m ${s}s`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [lastAction, isInstant]);

  if (!lastAction) return null;
  const notesCount = lastAction.notes ? lastAction.notes.length : 0;
  
  // FIX: Als laatste actie Coil Fold is, toon "Bulkrijs" als fase naam
  const displayPhase = lastAction.action.includes('Coil Fold') ? 'Bulkrijs' : lastAction.action;

  return (
    <div className="bg-stone-800 text-white p-4 rounded-xl shadow-lg mb-6 border border-stone-700">
      <div className="flex items-center justify-between mb-2">
        <div>
           <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">Huidige Fase</div>
           <div className="font-bold text-xl flex items-center gap-2 text-amber-500">
             {displayPhase}
           </div>
        </div>
        <div className="text-right">
           <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">
             {isInstant ? "Tijdstip" : "Al bezig"}
           </div>
           <div className="font-mono text-2xl font-bold">
             {isInstant ? formatTime(lastAction.time) : elapsed}
           </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button 
          onClick={() => onAddNote(lastAction)}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors border border-stone-600 ${notesCount > 0 ? 'bg-amber-700 hover:bg-amber-600 text-white' : 'bg-stone-700 hover:bg-stone-600 text-stone-300'}`}
        >
          <StickyNote className="w-3 h-3" /> Notitie ({notesCount})
        </button>
        <button 
          onClick={onUndo}
          className="py-2 px-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-xs font-bold text-stone-300 flex items-center justify-center gap-2 transition-colors border border-stone-600"
        >
          <Undo className="w-3 h-3" /> Herstel
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [view, setView] = useState('setup'); 
  const [showManualLog, setShowManualLog] = useState(false);
  const [showTimerModal, setShowTimerModal] = useState(false); 
  const [showGuardModal, setShowGuardModal] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false); 
  const [showProofingModal, setShowProofingModal] = useState(false); 
  const [showSurveyModal, setShowSurveyModal] = useState(false); 
  
  const [currentNoteAction, setCurrentNoteAction] = useState(null); 
  const [pendingAction, setPendingAction] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  const [activeSession, setActiveSession] = useState(null); 
  const [viewingSession, setViewingSession] = useState(null); 

  const [editingPresetIndex, setEditingPresetIndex] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // FIX: Laad naam uit localStorage zodat deze niet reset bij refresh
  const [activeRecipeName, setActiveRecipeName] = useState(() => {
     return localStorage.getItem('desem_active_recipe_name') || "Mijn Desem";
  });

  const [config, setConfig] = useState(() => {
    const savedConfig = localStorage.getItem('desem_default_config');
    return savedConfig ? JSON.parse(savedConfig) : {
        targetWeight: 1000, hydration: 68, inoculation: 20, salt: 2,
        wholeWheatPerc: 10, speltPerc: 0, wheatPerc: 90, 
        starterType: 'stiff', starterBuffer: 12 
    };
  });

  const [customStartTime, setCustomStartTime] = useState(toDateTimeLocal(new Date()));
  const [ambientTemp, setAmbientTemp] = useState(21);

  // Initial Load
  useEffect(() => {
    const savedHistory = localStorage.getItem('desem_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedActiveSession = localStorage.getItem('desem_active_session');
    if (savedActiveSession) {
      const parsed = JSON.parse(savedActiveSession);
      if (parsed.status === 'active') {
        setActiveSession(parsed);
        setView('tracker');
        setAmbientTemp(parsed.temperature || 21);
        setCustomStartTime(toDateTimeLocal(new Date(parsed.startTime)));
      }
    }

    const savedPresets = localStorage.getItem('desem_presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  // Auto-Save Active Session
  useEffect(() => {
    if (activeSession && activeSession.status === 'active') {
      localStorage.setItem('desem_active_session', JSON.stringify(activeSession));
    } else {
      localStorage.removeItem('desem_active_session');
    }
  }, [activeSession]);

  // Save config & Active Name
  useEffect(() => {
    localStorage.setItem('desem_default_config', JSON.stringify(config));
    localStorage.setItem('desem_active_recipe_name', activeRecipeName);
  }, [config, activeRecipeName]);

  // Handlers
  const handleNavClick = (targetView) => {
    // FIX: Waarschuwing verwijderd. Je kunt nu vrij wisselen.
    setView(targetView);
  };

  const saveToHistory = (completedSession) => {
    const filteredHistory = history.filter(h => h.id !== completedSession.id);
    const newHistory = [completedSession, ...filteredHistory];
    setHistory(newHistory);
    localStorage.setItem('desem_history', JSON.stringify(newHistory));
  };

  const deleteFromHistory = (id, e) => {
    if (e) e.stopPropagation();
    if (confirm("Weet je zeker dat je dit brood wilt verwijderen?")) {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      localStorage.setItem('desem_history', JSON.stringify(newHistory));
      if (view === 'report' && viewingSession?.id === id) setView('history');
    }
  };
  
  const handleResumeSession = () => {
    if (!viewingSession) return;
    const activeLogs = viewingSession.logs.filter(l => l.action !== 'Bakken Klaar');
    const resumedSession = {
        ...viewingSession,
        logs: activeLogs,
        status: 'active',
        endTime: null,
        configSnapshot: viewingSession.configSnapshot || config 
    };
    setActiveSession(resumedSession); 
    setView('tracker');
  };

  // RECEPTEN LOGICA
  const loadPreset = (presetConfig, presetName, index, isEdit = false) => {
    setConfig({ ...config, ...presetConfig });
    setActiveRecipeName(presetName); 
    if(isEdit) {
       setEditingPresetIndex(index);
       setShowConfig(true); 
    } else {
       setEditingPresetIndex(null);
       setShowConfig(false); 
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleConfig = () => {
      setShowConfig(!showConfig);
      if(showConfig) setEditingPresetIndex(null);
  };

  const saveCurrentAsPreset = (nameOverride) => {
    const name = nameOverride || activeRecipeName;
    const newPreset = { name, config: { ...config } };
    let newPresets = [];

    if (editingPresetIndex !== null) {
        const realIndex = presets.length - 1 - editingPresetIndex;
        newPresets = [...presets];
        newPresets[realIndex] = newPreset; 
        setEditingPresetIndex(null); 
    } else {
        const otherPresets = presets.filter(p => p.name !== name);
        newPresets = [...otherPresets, newPreset]; 
    }

    setPresets(newPresets);
    localStorage.setItem('desem_presets', JSON.stringify(newPresets));
    setShowPresetModal(false);
    setShowConfig(false); 
  };

  const deletePreset = (e, index) => {
    e.stopPropagation();
    if(confirm("Recept verwijderen?")) {
      const reversed = [...presets].reverse();
      const presetToDelete = reversed[index];
      const newPresets = presets.filter(p => p !== presetToDelete);
      setPresets(newPresets);
      localStorage.setItem('desem_presets', JSON.stringify(newPresets));
      if(editingPresetIndex === index) setEditingPresetIndex(null);
    }
  };

  const handleResetStartTime = () => {
    setCustomStartTime(toDateTimeLocal(new Date()));
  };

  const calculateRecipe = (c) => {
    const currentConfig = c || config;
    let starterHydration = currentConfig.starterType === 'liquid' ? 100 : 50; 
    let feedRatio = currentConfig.starterType === 'liquid' 
      ? { old: 1, flour: 5, water: 5, totalParts: 11 }
      : { old: 1, flour: 5, water: 2.5, totalParts: 8.5 }; 

    const totalPerc = 1 + (currentConfig.hydration / 100) + (currentConfig.salt / 100);
    const totalFlour = currentConfig.targetWeight / totalPerc;
    const totalWater = totalFlour * (currentConfig.hydration / 100);
    const totalSalt = totalFlour * (currentConfig.salt / 100);
    const totalDesem = totalFlour * (currentConfig.inoculation / 100);
    const starterFlourRatio = 1 / (1 + (starterHydration / 100)); 
    const flourInDesem = totalDesem * starterFlourRatio;
    const waterInDesem = totalDesem - flourInDesem;
    const desemToMake = totalDesem * (1 + (currentConfig.starterBuffer / 100));
    const starterUnit = desemToMake / feedRatio.totalParts;
    const neededWholeWheat = totalFlour * (currentConfig.wholeWheatPerc / 100);
    const neededSpelt = totalFlour * (currentConfig.speltPerc / 100);
    const neededWheat = totalFlour * (currentConfig.wheatPerc / 100);
    let remainingFlourToSubtract = flourInDesem;
    const doughWheat = Math.max(0, neededWheat - remainingFlourToSubtract);
    remainingFlourToSubtract = Math.max(0, remainingFlourToSubtract - neededWheat);
    const doughWholeWheat = Math.max(0, neededWholeWheat - remainingFlourToSubtract);
    remainingFlourToSubtract = Math.max(0, remainingFlourToSubtract - neededWholeWheat);
    const doughSpelt = Math.max(0, neededSpelt - remainingFlourToSubtract);
    const doughWater = Math.max(0, totalWater - waterInDesem);

    return {
      totalFlour, totalWater, totalSalt, totalDesem,
      doughWheat, doughWholeWheat, doughSpelt, doughWater,
      feedOldStarter: starterUnit * feedRatio.old,
      feedFlour: starterUnit * feedRatio.flour,
      feedWater: starterUnit * feedRatio.water,
      desemToMake,
      desemRest: desemToMake - totalDesem
    };
  };

  const recipe = calculateRecipe(config);
  
  const [activeTimer, setActiveTimer] = useState(null); 
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (activeTimer) {
      const check = setInterval(() => {
        if (new Date() >= activeTimer.targetTime) {
          setActiveTimer(null); 
          if("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        }
      }, 1000);
      return () => clearInterval(check);
    }
  }, [activeTimer]);

  const handleStartSession = () => {
    const start = new Date(customStartTime).toISOString();
    const starterLog = { action: 'Starter Gevoed', time: start, type: 'action', notes: [] };
    const systemLog = { action: 'Sessie Gestart', time: start, type: 'system' };
    
    const dateStr = new Date(start).toLocaleDateString([], {day: 'numeric', month: 'short'});
    const sessionName = `${activeRecipeName} • ${dateStr}`;

    const newSession = {
      id: Date.now(),
      name: sessionName,
      startTime: start,
      temperature: ambientTemp,
      logs: [starterLog, systemLog],
      photos: [],
      configSnapshot: { ...config },
      status: 'active'
    };
    setActiveSession(newSession);
    setView('tracker');
  };

  // FINISH FLOW
  const triggerFinishSession = () => {
      setShowSurveyModal(true);
  };

  const handleSurveyComplete = (surveyData) => {
    const finalConfig = { ...config };
    const endLog = { action: 'Bakken Klaar', time: new Date().toISOString(), type: 'system' };
    
    const completedSession = {
       ...activeSession, 
       logs: [endLog, ...activeSession.logs],
       endTime: new Date().toISOString(),
       status: 'finished',
       configSnapshot: finalConfig,
       analysis: surveyData 
    };
    
    saveToHistory(completedSession);
    setActiveSession(null); 
    setViewingSession(completedSession); 
    setShowSurveyModal(false);
    setView('report'); 
    setActiveTimer(null);
  };
  
  const logAction = (actionName, setTimerMinutes = 0, customTime = null, force = false) => {
    if (activeTimer && !force) {
        const isBulkResting = activeTimer.action === "Rest Bulkrijs";
        const isInstantAction = setTimerMinutes === 0 || INSTANT_ACTIONS.includes(actionName);

        if (new Date() >= activeTimer.targetTime) {
             setActiveTimer(null); 
        } 
        else if (isBulkResting && isInstantAction) {
             // OK
        }
        else if (!customTime && !INSTANT_ACTIONS.includes(actionName)) {
             setPendingAction({ actionName, setTimerMinutes });
             setShowGuardModal(true);
             return;
        }
    }

    const time = customTime ? new Date(customTime).toISOString() : new Date().toISOString();
    
    let finalActionName = actionName;
    if (actionName.includes("Stretch & Fold")) {
        const sfCount = activeSession.logs.filter(l => l.action.includes("Stretch & Fold")).length + 1;
        finalActionName = `Stretch & Fold #${sfCount}`;
    }
    
    const newLog = { action: finalActionName, time: time, type: 'action', notes: [] };
    
    setActiveSession(prev => ({ 
      ...prev, 
      logs: [...prev.logs, newLog].sort((a,b) => new Date(b.time) - new Date(a.time))
    }));

    if(actionName === "Final Shape") {
        setShowProofingModal(true);
        setActiveTimer(null); 
    }
    else if (setTimerMinutes > 0 && !customTime) {
      const target = new Date();
      target.setMinutes(target.getMinutes() + setTimerMinutes);
      setActiveTimer({ targetTime: target, label: `Wachten na ${finalActionName}`, action: finalActionName });
    } else if (force) {
        setActiveTimer(null);
    }
    
    setShowManualLog(false);
  };

  const confirmPhaseChange = () => {
    if (pendingAction) {
        setActiveTimer(null);
        const { actionName, setTimerMinutes } = pendingAction;
        logAction(actionName, setTimerMinutes, null, true); 
        setPendingAction(null);
        setShowGuardModal(false);
    }
  };

  const handleUndo = () => {
    if (!confirm("Weet je zeker dat je de laatst gelogde actie wilt verwijderen?")) return;

    if (!activeSession || !activeSession.logs || activeSession.logs.length === 0) return;
    
    const logsCopy = [...activeSession.logs];
    logsCopy.sort((a, b) => new Date(b.time) - new Date(a.time));

    const indexToRemove = logsCopy.findIndex(l => l.type === 'action');

    if (indexToRemove !== -1) {
        const logToRemove = logsCopy[indexToRemove];
        
        if (activeTimer && (activeTimer.action === logToRemove.action || activeTimer.action.startsWith(logToRemove.action))) {
            setActiveTimer(null);
        }

        const updatedLogs = activeSession.logs.filter(l => !(l.time === logToRemove.time && l.action === logToRemove.action));
        setActiveSession(prev => ({ ...prev, logs: updatedLogs }));
    }
  };

  // NOTITIE FUNCTIES
  const openNoteModal = (actionLog) => {
    const targetLog = activeSession.logs.find(l => l.time === actionLog.time && l.action === actionLog.action);
    if (targetLog) {
        setCurrentNoteAction(targetLog);
        setShowNoteModal(true);
    }
  };

  const saveNote = (noteText) => {
    if (!currentNoteAction) return;
    const text = noteText.trim();
    if (!text) return; 

    const updatedLogs = activeSession.logs.map(l => {
        if (l.time === currentNoteAction.time && l.action === currentNoteAction.action) {
             const currentNotes = l.notes || []; 
             if (currentNotes.includes(text)) return l; 
             const newLogs = { ...l, notes: [...currentNotes, text] };
             setCurrentNoteAction(newLogs); 
             return newLogs;
        }
        return l;
    });

    setActiveSession(prev => ({ ...prev, logs: updatedLogs }));
  };
  
  const deleteNote = (noteToDelete) => {
    if (!currentNoteAction) return;
    const updatedLogs = activeSession.logs.map(l => {
        if (l.time === currentNoteAction.time && l.action === currentNoteAction.action) {
            const newNotes = (l.notes || []).filter(n => n !== noteToDelete);
            const newLog = { ...l, notes: newNotes };
            setCurrentNoteAction(newLog);
            return newLog;
        }
        return l;
    });
    setActiveSession(prev => ({ ...prev, logs: updatedLogs }));
  };

  const stopTimerOnly = () => {
    setActiveTimer(null);
    setShowTimerModal(false);
  };

  const deleteLastActionAndTimer = () => {
    if (!activeTimer || !activeSession) return;
    const logsCopy = [...activeSession.logs];
    const indexToRemove = logsCopy.findIndex(l => l.type === 'action' && (l.action === activeTimer.action || activeTimer.action.startsWith(l.action)));

    if (indexToRemove !== -1) {
        logsCopy.splice(indexToRemove, 1);
        setActiveSession(prev => ({ ...prev, logs: logsCopy }));
    }
    setActiveTimer(null);
    setShowTimerModal(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (view === 'tracker' && activeSession) {
             setActiveSession({...activeSession, photos: [...activeSession.photos, reader.result]});
        } 
        else if (view === 'report' && viewingSession) {
             const updated = {...viewingSession, photos: [...viewingSession.photos, reader.result]};
             setViewingSession(updated);
             saveToHistory(updated);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExportCSV = () => {
      generateSessionCSV(viewingSession);
  };

  const calculateRemainder = (current, others) => Math.max(0, 100 - others);

  // --- VIEWS ---

  const renderSetup = () => {
    const totalPerc = config.wheatPerc + config.wholeWheatPerc + config.speltPerc;
    const [startDate, startTime] = customStartTime.split('T');

    return (
      <div className="pb-32 space-y-6 p-4 max-w-md mx-auto">
        {/* PRESETS LIJST */}
        <div className="mb-2">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 pl-1">Opgeslagen Recepten</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {[...presets].reverse().map((preset, idx) => ( 
              <div key={idx} className={`relative group snap-start flex-shrink-0 transition-transform ${editingPresetIndex === idx ? 'scale-[0.98]' : ''}`}>
                  <button 
                    onClick={() => loadPreset(preset.config, preset.name, idx, false)} 
                    // FIX: Actieve recept krijgt nu duidelijke oranje border en achtergrond
                    className={`
                       rounded-lg p-3 pr-20 relative z-0 min-w-[140px] text-left shadow-sm focus:ring-2 focus:ring-amber-500 transition-all border
                       ${activeRecipeName === preset.name ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-white border-stone-200 hover:border-amber-400'}
                    `}
                  >
                    <div className={`font-bold text-sm truncate ${activeRecipeName === preset.name ? 'text-amber-900' : 'text-stone-700'}`}>{preset.name}</div>
                    <div className={`text-[10px] mt-1 ${activeRecipeName === preset.name ? 'text-amber-700' : 'text-stone-400'}`}>
                      {preset.config.targetWeight}g • {preset.config.hydration}% hydro
                    </div>
                  </button>
                  <div className="absolute top-1 right-1 flex gap-2 z-20">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadPreset(preset.config, preset.name, idx, true); }} 
                        className="text-stone-400 hover:text-amber-500 p-2 bg-white border border-stone-200 shadow-md rounded-full transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); deletePreset(e, idx); }} 
                        className="text-stone-400 hover:text-red-500 p-2 bg-white border border-stone-200 shadow-md rounded-full transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                  </div>
              </div>
            ))}
            <button 
              onClick={() => setShowPresetModal(true)}
              className="flex-shrink-0 bg-stone-100 border border-dashed border-stone-300 rounded-lg p-3 min-w-[40px] flex items-center justify-center text-stone-400 hover:bg-stone-200 hover:text-stone-600"
              title="Huidig recept opslaan"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showPresetModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-lg mb-4">
                  {editingPresetIndex !== null ? 'Wijzigingen Opslaan' : 'Recept Opslaan'}
              </h3>
              {editingPresetIndex === null && (
                  <input id="presetNameInput" type="text" defaultValue={activeRecipeName} placeholder="Bijv. Zondags Brood" className="w-full p-3 border border-stone-300 rounded-lg mb-4" autoFocus />
              )}
              <div className="flex gap-2">
                <button onClick={() => setShowPresetModal(false)} className="flex-1 py-2 text-stone-500 font-bold bg-stone-100 rounded-lg">Annuleren</button>
                <button onClick={() => { 
                    const nameInput = document.getElementById('presetNameInput');
                    const name = nameInput ? nameInput.value : activeRecipeName;
                    saveCurrentAsPreset(name); 
                }} className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg">
                    Opslaan
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STARTCONDITIES */}
        <div className="bg-stone-100 rounded-xl border border-stone-200 p-4 shadow-sm">
           <h3 className="font-bold text-stone-600 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> Startcondities</h3>
           <div className="space-y-3">
             <div>
               <div className="flex justify-between items-end mb-1">
                 <label className="text-xs text-stone-500 block">Starttijd</label>
                 <button onClick={handleResetStartTime} className="text-[10px] text-amber-600 font-bold flex items-center gap-1 hover:text-amber-700">
                    <RotateCcw className="w-3 h-3"/> Nu
                 </button>
               </div>
               <div className="flex gap-2">
                 <input type="date" value={startDate || ''} onChange={(e) => setCustomStartTime(`${e.target.value}T${startTime}`)} className="flex-1 p-2 rounded-lg border border-stone-300 bg-white font-mono" />
                 <input type="time" value={startTime || ''} onChange={(e) => setCustomStartTime(`${startDate}T${e.target.value}`)} className="w-24 p-2 rounded-lg border border-stone-300 bg-white font-mono" />
               </div>
             </div>
             <div>
               <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-stone-500 flex items-center gap-1"><Thermometer className="w-3 h-3"/> Omgevingstemperatuur (°C)</label>
                  <div className="flex items-center gap-2">
                     <input type="number" value={ambientTemp} onChange={(e) => setAmbientTemp(parseFloat(e.target.value))} step="0.1" min="10" max="40" className="w-20 p-1 text-right text-sm rounded-lg border border-stone-300 bg-white font-mono" />
                  </div>
               </div>
               <input type="range" min="10" max="40" step="0.1" value={ambientTemp} onChange={(e) => setAmbientTemp(parseFloat(e.target.value))} className="w-full accent-amber-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer" />
             </div>
           </div>
        </div>

        <CollapsibleRecipe recipe={recipe} config={config} isSetup={true} />

        <button onClick={toggleConfig} className="w-full flex items-center justify-center gap-2 text-stone-400 font-bold text-xs uppercase tracking-wide py-2 hover:text-stone-600">
            {showConfig ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
            {showConfig ? "Verberg Instellingen" : "Recept aanpassen"}
        </button>

        {showConfig && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                 <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                    <h3 className="font-bold text-amber-700 mb-2 flex items-center gap-2"><Edit3 className="w-4 h-4"/> Recept Naam</h3>
                    <input 
                        type="text" 
                        value={activeRecipeName} 
                        onChange={(e) => setActiveRecipeName(e.target.value)} 
                        className="w-full p-2 border border-stone-300 rounded-lg font-bold text-stone-800"
                    />
                 </div>

                <div className="bg-white rounded-xl border border-stone-200 p-1 shadow-sm flex">
                   <button onClick={() => setConfig({...config, starterType: 'stiff'})} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${config.starterType === 'stiff' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}>Stiff (1:5:2,5)</button>
                   <button onClick={() => setConfig({...config, starterType: 'liquid'})} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${config.starterType === 'liquid' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}>Liquid (1:5:5)</button>
                </div>

                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm relative">
                   {editingPresetIndex !== null ? (
                       <div className="absolute top-4 right-4 flex gap-2">
                           <button onClick={() => saveCurrentAsPreset()} className="text-xs font-bold text-white bg-amber-600 px-3 py-1 rounded shadow-sm">Wijzigingen Opslaan</button>
                       </div>
                   ) : (
                       <button onClick={() => setShowPresetModal(true)} className="absolute top-4 right-4 text-stone-400 hover:text-amber-600" title="Sla op als nieuw recept"><Save className="w-5 h-5" /></button>
                   )}
                   <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2"><Settings className="w-4 h-4"/> Doelstellingen</h3>
                   <InputRow label="Eindgewicht" value={config.targetWeight} onChange={v => setConfig({...config, targetWeight: v})} unit="g" step={50} max={3000} min={500} />
                   <InputRow label="Hydratatie" value={config.hydration} onChange={v => setConfig({...config, hydration: v})} unit="%" min={50} max={100} />
                   <InputRow label="Desem %" value={config.inoculation} onChange={v => setConfig({...config, inoculation: v})} unit="%" min={1} max={50} />
                   <InputRow label="Zout %" value={config.salt} onChange={v => setConfig({...config, salt: v})} unit="%" step={0.1} max={5} />
                </div>
                <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
                   <h3 className="font-bold text-amber-700 mb-3 flex items-center gap-2">Meel Mix</h3>
                   <InputRow label="Tarwebloem" value={config.wheatPerc} onChange={v => setConfig({...config, wheatPerc: v})} unit="%" onAutoFix={() => setConfig({...config, wheatPerc: calculateRemainder(config.wheatPerc, config.wholeWheatPerc + config.speltPerc)})} />
                   <InputRow label="Volkoren" value={config.wholeWheatPerc} onChange={v => setConfig({...config, wholeWheatPerc: v})} unit="%" onAutoFix={() => setConfig({...config, wholeWheatPerc: calculateRemainder(config.wholeWheatPerc, config.wheatPerc + config.speltPerc)})} />
                   <InputRow label="Spelt/Rogge" value={config.speltPerc} onChange={v => setConfig({...config, speltPerc: v})} unit="%" onAutoFix={() => setConfig({...config, speltPerc: calculateRemainder(config.speltPerc, config.wheatPerc + config.wholeWheatPerc)})} />
                   <div className={`text-xs text-right mt-2 font-bold ${totalPerc !== 100 ? 'text-red-500' : 'text-green-600'}`}>Totaal: {Math.round(totalPerc)}%</div>
                </div>
            </div>
        )}

        <div>
            {/* FIX: Duidelijke indicatie welk recept je gaat starten */}
            <div className="text-center mb-2 text-xs text-stone-400 uppercase tracking-wide">
                 Je gaat maken: <span className="font-bold text-amber-700">{activeRecipeName}</span>
            </div>
            <button onClick={handleStartSession} disabled={totalPerc !== 100} className={`w-full font-bold text-lg py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 ${totalPerc !== 100 ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
               {totalPerc !== 100 ? 'Check Percentages!' : <><Play className="w-6 h-6 fill-current" /> Meng Starter & Start Sessie</>}
            </button>
        </div>
      </div>
    );
  };

  const renderTracker = () => {
    if (!activeSession || activeSession.status !== 'active') return (
      <div className="p-8 text-center text-stone-400 mt-20">
        <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Geen actieve sessie.</p>
        <button onClick={() => setView('setup')} className="mt-4 text-amber-600 font-bold underline">Start een brood</button>
      </div>
    );

    const bulkData = calculateBulkTime(activeSession.logs);
    const estimatedMinutes = estimateBulkRiseDuration(activeSession.temperature, activeSession.configSnapshot?.inoculation, history);
    const progressPerc = bulkData ? Math.min(100, (bulkData.minutes / estimatedMinutes) * 100) : 0;
    const remainingMinutesTotal = bulkData ? Math.max(0, estimatedMinutes - bulkData.minutes) : estimatedMinutes;
    const remainingHours = Math.floor(remainingMinutesTotal / 60);
    const remainingMinutes = remainingMinutesTotal % 60;
    const remainingTimeText = `${remainingHours}u ${remainingMinutes}m`;
    
    // Check of bulkrijs klaar is om balk te verbergen
    const isBulkFinished = bulkData && bulkData.isFinished;

    return (
      <div className="pb-32 p-4 max-w-md mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
           <div className="flex justify-between items-start mb-4">
             <div>
               <h2 className="font-bold text-lg text-stone-800">{activeSession.name}</h2>
               <div className="flex gap-3 text-xs text-stone-500">
                 <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatTime(activeSession.startTime)}</span>
                 {activeSession.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3"/> {activeSession.temperature}°C</span>}
               </div>
             </div>
             <button onClick={() => setView('setup')} className="text-xs font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-full hover:bg-stone-200 transition-colors">
                Recept aanpassen
             </button>
           </div>
           
           <PhaseTimeline logs={activeSession.logs} />

           <PhaseTracker 
             logs={activeSession.logs} 
             activeTimer={activeTimer} 
             onUndo={handleUndo} 
             onAddNote={openNoteModal}
           />

           {/* FIX: Alleen tonen als bulk nog NIET klaar is */}
           {!isBulkFinished && (
               <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                  <div className="flex justify-between items-center mb-2">
                     <span className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1"><Hourglass className="w-3 h-3"/> Totale Bulkrijs</span>
                     <span className="text-xs font-mono font-bold text-stone-700">{bulkData ? bulkData.text : "0u 00m"} / ~{Math.floor(estimatedMinutes/60)}u {estimatedMinutes%60}m</span>
                  </div>
                  <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden mb-1">
                     <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${progressPerc}%` }}></div>
                  </div>
                  <div className="text-xs font-bold text-stone-700 flex justify-between">
                    <span>Nog te gaan:</span>
                    <span className="font-mono text-lg text-amber-600">{remainingTimeText}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-stone-400 text-right">
                    {history.length < 3 ? "Schatting o.b.v. theorie" : "Schatting o.b.v. jouw historie"}
                  </div>
               </div>
           )}
           
           <CollapsibleRecipe recipe={recipe} config={activeSession.configSnapshot || config} />

        </div>

        {/* MODALS */}
        {showProofingModal && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                    <div className="text-center">
                        <div className="bg-amber-100 p-3 rounded-full mb-3 inline-block">
                            <Clock className="w-8 h-8 text-amber-600"/> 
                        </div>
                        <h3 className="font-bold text-lg text-stone-800">Deeg gevormd!</h3>
                        <p className="text-sm text-stone-500 mt-1">Hoe ga je rijzen?</p>
                    </div>
                    <button onClick={() => { logAction("Cold Proof Start", 0, null, true); setShowProofingModal(false); }} className="w-full bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4 hover:bg-blue-100 transition-colors">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Snowflake className="w-6 h-6"/></div>
                        <div className="text-left"><div className="font-bold text-blue-900">Koelkast (Cold Proof)</div><div className="text-xs text-blue-600">Lange rijs, geen timer</div></div>
                    </button>
                    <button onClick={() => { logAction("Room Proof Start", 120, null, true); setShowProofingModal(false); }} className="w-full bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-4 hover:bg-orange-100 transition-colors">
                         <div className="bg-orange-100 p-2 rounded-full text-orange-600"><Sun className="w-6 h-6"/></div>
                         <div className="text-left"><div className="font-bold text-orange-900">Kamertemperatuur</div><div className="text-xs text-orange-600">Zet timer (standaard 2u)</div></div>
                    </button>
                    <button onClick={() => setShowProofingModal(false)} className="w-full text-stone-400 text-sm font-bold py-2">Annuleren</button>
                </div>
            </div>
        )}

        {showSurveyModal && (
            <SurveyModal onClose={() => setShowSurveyModal(false)} onComplete={handleSurveyComplete} />
        )}

        {showGuardModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl w-full max-w-xs p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-200">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-amber-100 p-3 rounded-full mb-3">
                       <AlertTriangle className="w-8 h-8 text-amber-600"/> 
                    </div>
                    <h3 className="font-bold text-lg text-stone-800">Fase nog bezig!</h3>
                    <p className="text-sm text-stone-500 mt-2">
                       Je probeert <strong>{pendingAction?.actionName}</strong> te starten, maar <strong>{activeTimer?.action}</strong> loopt nog.
                    </p>
                </div>
                <div className="space-y-2 pt-2">
                    <button onClick={confirmPhaseChange} className="w-full bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 shadow-md transition-colors">
                      <CheckCircle2 className="w-4 h-4"/> Afronden & Doorgaan
                    </button>
                    <button onClick={() => { setShowGuardModal(false); setPendingAction(null); }} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 p-3 rounded-lg text-sm font-bold transition-colors">Annuleren</button>
                </div>
             </div>
          </div>
        )}

        {showNoteModal && (
          <NoteModal 
             currentNoteAction={currentNoteAction}
             sessionLogs={activeSession.logs}
             onClose={() => setShowNoteModal(false)}
             onSave={saveNote}
             onDelete={deleteNote}
             tags={TAGS}
          />
        )}

        {showTimerModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl w-full max-w-xs p-5 shadow-2xl space-y-3">
                <h3 className="font-bold text-lg text-stone-800 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Timer Opties</h3>
                <p className="text-sm text-stone-500">Wat wil je doen met deze actie?</p>
                <button onClick={stopTimerOnly} className="w-full bg-stone-100 p-3 rounded-lg text-left text-sm font-bold text-stone-700 flex items-center gap-3 hover:bg-stone-200">
                   <StopCircle className="w-4 h-4 text-stone-500"/> Alleen Timer Stoppen
                </button>
                <button onClick={deleteLastActionAndTimer} className="w-full bg-red-50 p-3 rounded-lg text-left text-sm font-bold text-red-700 flex items-center gap-3 hover:bg-red-100">
                   <Trash2 className="w-4 h-4 text-red-500"/> Actie & Timer Verwijderen
                </button>
                <button onClick={() => setShowTimerModal(false)} className="w-full py-2 text-stone-400 text-sm font-bold mt-2">Annuleren</button>
             </div>
          </div>
        )}

        {showManualLog && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl">
              <h3 className="font-bold text-lg mb-4">Vergeten actie toevoegen</h3>
              <ManualLogger onClose={() => setShowManualLog(false)} onLog={logAction} />
            </div>
          </div>
        )}

        <div><SectionHeader title="Voorbereiding" />
          <div className="grid grid-cols-2 gap-3">
            <ActionButton 
                label="Autolyse Start" 
                icon={<div className="w-6 h-6 rounded-full border-4 border-current opacity-50"></div>} 
                activeTimer={activeTimer} 
                onStopTimer={() => setShowTimerModal(true)} 
                subtext="60 min rust" 
                onClick={() => logAction("Autolyse Start", 60)} 
            />
          </div>
        </div>

        <div><SectionHeader title="Het Deeg" />
          <div className="grid grid-cols-2 gap-3">
            <ActionButton label="Mixen Compleet" icon={<div className="w-6 h-6 rounded-full bg-current"></div>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="Start Bulkrijs" onClick={() => logAction("Mixen Compleet", 30)} />
            <ActionButton label="Lamineren" icon={<FileText />} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="30 min rust" onClick={() => logAction("Lamineren", 30)} />
          </div>
        </div>

        <div><SectionHeader title="Bulkrijs & Vormen" />
          <div className="grid grid-cols-2 gap-3">
            <ActionButton 
                label="Stretch & Fold" 
                icon={<ChevronRight className="rotate-[-45deg]"/>} 
                activeTimer={activeTimer} 
                onStopTimer={() => logAction("Stretch & Fold", 30)} 
                subtext="30 min rust" 
                onClick={() => logAction("Stretch & Fold", 30)} 
            />
            <ActionButton 
                label="Coil Fold" 
                icon={<span className="font-serif text-2xl font-bold">S</span>} 
                activeTimer={activeTimer} 
                onStopTimer={() => logAction("Coil Fold", 0)} 
                subtext="Momentopname" 
                onClick={() => logAction("Coil Fold", 0)} 
            />
             <ActionButton 
              label="Rest Bulkrijs" 
              icon={<Hourglass />} 
              activeTimer={activeTimer} 
              onStopTimer={() => setShowTimerModal(true)} 
              subtext={`Nog ${remainingMinutesTotal}m (schatting)`} 
              onClick={() => logAction("Rest Bulkrijs", remainingMinutesTotal)} 
            />
          </div>
          
          <div className="w-full border-t border-stone-200 my-4"></div>

          <div className="grid grid-cols-2 gap-3">
            <ActionButton label="Preshape" icon={<div className="w-6 h-6 rounded-full border-2 border-dashed border-current"></div>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="20 min rust" onClick={() => logAction("Preshape", 20)} />
            <ActionButton label="Final Shape" icon={<div className="w-6 h-6 rounded-full border-2 border-current bg-stone-100"></div>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} onClick={() => logAction("Final Shape")} />
          </div>
        </div>

        <div><SectionHeader title="Afronden" />
           <div className="grid grid-cols-1 gap-3">
             <ActionButton label="Oven In" icon={<span>🔥</span>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="45 min bakken" onClick={() => logAction("Oven In", 45)} />
           </div>
        </div>

        <button onClick={() => setShowManualLog(true)} className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 font-bold hover:bg-stone-50 flex items-center justify-center gap-2 mt-4"><Clock className="w-4 h-4"/> Vergeten actie?</button>
        <button onClick={triggerFinishSession} className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl shadow-md mt-6">Klaar met bakken & Opslaan</button>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="pb-32 p-4 max-w-md mx-auto space-y-4">
      {history.length === 0 ? <div className="text-center py-12 text-stone-400"><Archive className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>Nog geen geschiedenis.</p></div> 
      : history.map((item) => (
          <div key={item.id} onClick={() => { setViewingSession(item); setView('report'); }} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 cursor-pointer active:scale-[0.98] transition-all relative group">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-stone-800">{item.name || 'Naamloos Brood'}</h3>
                <div className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.startTime).toLocaleDateString()}</span>
                  {item.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {item.temperature}°C</span>}
                  {item.analysis && item.analysis.rating && <span className="flex items-center gap-1 font-bold text-amber-600"><ThumbsUp className="w-3 h-3"/> {item.analysis.rating}/10</span>}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                 {item.photos && item.photos.length > 0 && <div className="w-10 h-10 rounded bg-stone-100 overflow-hidden"><img src={item.photos[0]} className="w-full h-full object-cover"/></div>}
                 <button onClick={(e) => deleteFromHistory(item.id, e)} className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-full z-10">
                   <Trash2 className="w-5 h-5" />
                 </button>
              </div>
            </div>
          </div>
      ))}
    </div>
  );

  const renderStats = () => {
    // Statistische Helper Functie voor kleurcodering
    const getColorClass = (val, avg, inverse = false) => {
        if (!val || !avg) return '';
        const numVal = parseFloat(val);
        const diff = (numVal - avg) / avg; 
        if (Math.abs(diff) < 0.1) return 'bg-white text-stone-600'; 
        
        if (inverse) {
             if (diff > 0.1) return 'bg-green-100 text-green-700 font-bold';
             if (diff < -0.1) return 'bg-red-50 text-red-700';
        } else {
             if (diff > 0.1) return 'bg-orange-50 text-orange-700';
             if (diff < -0.1) return 'bg-blue-50 text-blue-700';
        }
        return '';
    };

    // Bereken gemiddelden
    const totals = history.reduce((acc, h) => {
        const logs = h.logs;
        const config = h.configSnapshot || {}; 
        acc.hydration += (config.hydration || 0);
        acc.inoculation += (config.inoculation || 0);
        acc.stretch += getLogCount(logs, 'Stretch & Fold');
        acc.coil += getLogCount(logs, 'Coil Fold');
        acc.autolyse += getDurationBetween(logs, 'Autolyse Start', 'Mixen Compleet');
        acc.starterAge += getDurationBetween(logs, 'Starter Gevoed', 'Mixen Compleet');
        acc.bulk += (calculateBulkTime(logs, h.endTime)?.minutes || 0);
        acc.cold += getDurationBetween(logs, 'Cold Proof Start', 'Oven In');
        acc.room += getDurationBetween(logs, 'Room Proof Start', 'Oven In');
        acc.temp += (h.temperature || 0);
        acc.rating += (parseInt(h.analysis?.rating || 0));
        acc.count++;
        return acc;
    }, { hydration:0, inoculation:0, stretch:0, coil:0, autolyse:0, starterAge:0, bulk:0, cold:0, room:0, temp:0, rating:0, count:0 });

    const avgs = totals.count > 0 ? {
        hydration: totals.hydration / totals.count,
        inoculation: totals.inoculation / totals.count,
        stretch: totals.stretch / totals.count,
        coil: totals.coil / totals.count,
        autolyse: totals.autolyse / totals.count,
        starterAge: totals.starterAge / totals.count,
        bulk: totals.bulk / totals.count,
        cold: totals.cold / totals.count,
        room: totals.room / totals.count,
        temp: totals.temp / totals.count,
        rating: totals.rating / totals.count
    } : null;

    return (
        // FIX: max-w-full en overflow settings verbeterd voor mobiel
        <div className="pb-32 p-4 mx-auto w-full max-w-[100vw] overflow-hidden">
             <div className="flex justify-between items-center mb-4 sticky left-0">
                <h2 className="text-xl font-bold text-stone-800 flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-600" /> Analyse</h2>
                <button onClick={() => generateStatsCSV(history)} className="flex items-center gap-1 text-xs font-bold bg-green-100 text-green-700 px-3 py-2 rounded-full hover:bg-green-200 transition-colors">
                    <FileSpreadsheet className="w-3 h-3"/> Download CSV
                 </button>
             </div>
             
             <div className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-x-auto">
                <table className="w-full text-xs text-left whitespace-nowrap">
                    <thead className="bg-stone-100 text-stone-600 font-bold border-b">
                        <tr>
                            <th className="p-3 sticky left-0 bg-stone-100 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Datum</th>
                            {/* INPUT VELDEN: HYDRO, INOC, TEMP */}
                            <th className="p-3">Hydro (%)</th>
                            <th className="p-3">Inoc (%)</th>
                            <th className="p-3">Temp</th>
                            {/* PROCES VELDEN: START, AUTO, S&F, COIL, BULK, COLD, ROOM */}
                            <th className="p-3">Start (m)</th>
                            <th className="p-3">Auto (m)</th>
                            <th className="p-3">S&F</th>
                            <th className="p-3">Coil</th>
                            <th className="p-3">Bulk (m)</th>
                            <th className="p-3">Cold (m)</th>
                            <th className="p-3">Room (m)</th>
                            {/* RESULTAAT VELDEN */}
                            <th className="p-3 text-right">Score</th>
                            {/* ANALYSE VELDEN */}
                            <th className="p-3">Start Toename</th>
                            <th className="p-3">Bulk Toename</th>
                            <th className="p-3">Deeg Gevoel</th>
                            <th className="p-3">Ovenspring</th>
                            <th className="p-3">Oor</th>
                            <th className="p-3">Crumb</th>
                            <th className="p-3">Korst</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                        {history.map(h => {
                            const logs = h.logs;
                            const config = h.configSnapshot || {};
                            const bulk = calculateBulkTime(logs, h.endTime)?.minutes || 0;
                            const sf = getLogCount(logs, 'Stretch & Fold');
                            const coil = getLogCount(logs, 'Coil Fold');
                            const auto = getDurationBetween(logs, 'Autolyse Start', 'Mixen Compleet');
                            const starterAge = getDurationBetween(logs, 'Starter Gevoed', 'Mixen Compleet');
                            const cold = getDurationBetween(logs, 'Cold Proof Start', 'Oven In');
                            const room = getDurationBetween(logs, 'Room Proof Start', 'Oven In');
                            const rating = h.analysis?.rating || 0;
                            const analysis = h.analysis || {};

                            return (
                                <tr key={h.id}>
                                    <td className="p-3 font-bold text-stone-700 sticky left-0 bg-white shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">{new Date(h.startTime).toLocaleDateString([],{day:'numeric', month:'numeric'})}</td>
                                    {/* INPUT VELDEN */}
                                    <td className={`p-3 ${getColorClass(config.hydration, avgs?.hydration)}`}>{config.hydration}%</td>
                                    <td className={`p-3 ${getColorClass(config.inoculation, avgs?.inoculation)}`}>{config.inoculation}%</td>
                                    <td className={`p-3 ${getColorClass(h.temperature, avgs?.temp)}`}>{h.temperature}°</td>
                                    {/* PROCES VELDEN */}
                                    <td className={`p-3 ${getColorClass(starterAge, avgs?.starterAge)}`}>{starterAge}</td>
                                    <td className={`p-3 ${getColorClass(auto, avgs?.autolyse)}`}>{auto}</td>
                                    <td className={`p-3 ${getColorClass(sf, avgs?.stretch)}`}>{sf}</td>
                                    <td className={`p-3 ${getColorClass(coil, avgs?.coil)}`}>{coil}</td>
                                    <td className={`p-3 ${getColorClass(bulk, avgs?.bulk)}`}>{bulk}</td>
                                    <td className={`p-3 ${getColorClass(cold, avgs?.cold)}`}>{cold}</td>
                                    <td className={`p-3 ${getColorClass(room, avgs?.room)}`}>{room}</td>
                                    {/* RESULTAAT VELDEN */}
                                    <td className={`p-3 text-right font-bold ${getColorClass(rating, avgs?.rating, true)}`}>{rating || '-'}</td>
                                    {/* ANALYSE VELDEN */}
                                    <td className="p-3 text-stone-600">{analysis.starterRise || '-'}</td>
                                    <td className="p-3 text-stone-600">{analysis.bulkRise || '-'}</td>
                                    <td className="p-3 text-stone-600">{analysis.doughResult || '-'}</td>
                                    <td className="p-3 text-stone-600">{analysis.ovenSpring || '-'}</td>
                                    <td className="p-3 text-stone-600">{analysis.ear || '-'}</td>
                                    <td className="p-3 text-stone-600">{analysis.crumb || '-'}</td>
                                    <td className="p-3 text-stone-600">{analysis.crust || '-'}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
             </div>
             <div className="mt-4 text-[10px] text-stone-400 text-center">
                 Kleuren geven afwijking t.o.v. gemiddelde aan (Oranje/Rood = Hoger dan Gemiddeld/Slechter, Blauw = Lager dan Gemiddeld, Groen = Goede Score)
             </div>
        </div>
    );
  };

  const renderReport = () => {
    if (!viewingSession) return null; // Safety check
    
    const reportConfig = viewingSession.configSnapshot || {};
    const reportRecipe = calculateRecipe(reportConfig);
    const finalBulk = calculateBulkTime(viewingSession.logs, viewingSession.endTime);
    const sortedLogs = [...viewingSession.logs].filter(l => l.type !== 'system' && l.type !== 'note').sort((a,b) => new Date(a.time)-new Date(b.time));
    const analysis = viewingSession.analysis || {};

    return (
      <div className="pb-32 p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4 print:hidden">
             <button onClick={() => setView('history')} className="flex items-center gap-2 text-stone-500 font-bold"><ChevronLeft className="w-5 h-5"/> Terug</button>
             <div className="flex gap-2">
                 <button onClick={handleResumeSession} className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-2 rounded-full hover:bg-amber-200 transition-colors">
                    <Undo className="w-3 h-3"/> Hervat Sessie
                 </button>
                 <button onClick={() => window.print()} className="flex items-center gap-1 text-xs font-bold bg-stone-100 text-stone-700 px-3 py-2 rounded-full hover:bg-stone-200 transition-colors">
                    <Printer className="w-3 h-3"/> PDF Export
                 </button>
                 <button onClick={handleExportCSV} className="flex items-center gap-1 text-xs font-bold bg-stone-100 text-stone-700 px-3 py-2 rounded-full hover:bg-stone-200 transition-colors">
                    <FileSpreadsheet className="w-3 h-3"/> CSV Export
                 </button>
             </div>
        </div>
        
        {/* EVALUATIE BLOK */}
        {analysis.rating && (
            <div className="mb-6 bg-green-50 rounded-xl p-4 border border-green-100">
                <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3"><ClipboardList className="w-4 h-4"/> Evaluatie: {analysis.rating}/10</h3>
                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                     <div className="text-stone-500">Starter: <span className="font-bold text-stone-700">{analysis.starterRise}</span></div>
                     <div className="text-stone-500">Bulk: <span className="font-bold text-stone-700">{analysis.bulkRise}</span></div>
                     <div className="text-stone-500">Deeg: <span className="font-bold text-stone-700">{analysis.doughResult}</span></div>
                     <div className="text-stone-500">Ovenspring: <span className="font-bold text-stone-700">{analysis.ovenSpring}</span></div>
                     <div className="text-stone-500">Korst: <span className="font-bold text-stone-700">{analysis.crust}</span></div>
                     <div className="text-stone-500">Crumb: <span className="font-bold text-stone-700">{analysis.crumb}</span></div>
                </div>
            </div>
        )}

        <div className="mb-8 print:mb-4">
           <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2 print:text-lg"><ImageIcon className="w-5 h-5 text-amber-600" /> Resultaat</h2>
           <div className="grid grid-cols-2 gap-4 mb-4">
             {viewingSession.photos && viewingSession.photos.map((img, idx) => <img key={idx} src={img} className="w-full h-40 object-cover rounded-lg shadow-sm print:h-24 print:object-contain print:shadow-none" />)}
           </div>
           <label className="block w-full cursor-pointer print:hidden"><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /><div className="w-full bg-stone-100 text-stone-600 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors"><Camera className="w-5 h-5" /> Foto Toevoegen</div></label>
        </div>
        
        <div className="mb-8 bg-amber-50 rounded-lg p-6 border border-amber-100 print:bg-white print:border-none print:p-0 print:mb-4">
           <h2 className="text-xl font-bold text-amber-800 mb-2 print:text-base print:text-stone-800">Receptuur ({reportConfig.targetWeight}g)</h2>
           <div className="text-sm text-amber-700 flex flex-wrap gap-4 print:text-stone-600">
             <span>Hydro: <b>{reportConfig.hydration}%</b></span>
             <span>Desem: <b>{reportConfig.inoculation}%</b></span>
             {viewingSession.temperature && <span>Temp: <b>{viewingSession.temperature}°C</b></span>}
             <div className="mt-4 pt-4 border-t border-amber-200 w-full flex justify-between font-bold text-amber-900 print:border-stone-200 print:text-stone-800">
                 <span>Totale Bulkrijs:</span>
                 <span className="font-mono text-lg">{finalBulk ? finalBulk.text : 'N.v.t.'}</span>
             </div>
             <div className="pt-2 w-full">
                 <h4 className="text-xs font-bold uppercase text-stone-600">Meel Mix</h4>
                 <div className="text-xs text-stone-500">Tarwebloem: {reportConfig.wheatPerc}%, Volkoren: {reportConfig.wholeWheatPerc}%, Spelt: {reportConfig.speltPerc}%</div>
             </div>
           </div>
        </div>
        <div className="border rounded-lg overflow-hidden border-stone-200 print:border-none">
          <table className="w-full text-left text-sm">
             <thead className="bg-stone-100 text-stone-600 font-semibold border-b print:bg-stone-50"><tr><th className="p-3 print:p-1">Tijd</th><th className="p-3 print:p-1">Actie</th><th className="p-3 text-right print:p-1">Duur</th></tr></thead>
             <tbody className="divide-y divide-stone-100">{sortedLogs.map((log,i,arr)=>(
                 <tr key={i}>
                     <td className="p-3 font-mono text-stone-500 align-top print:p-1">{formatTime(log.time)}</td>
                     <td className="p-3 align-top print:p-1">
                         <div className="font-medium text-stone-700">{log.action}</div>
                         {log.notes && log.notes.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1 print:block">
                                  {log.notes.map((n, idx) => (
                                      <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100 print:bg-white print:text-stone-500 print:border-none print:px-0 print:py-0 print:mr-2">
                                          {n}
                                      </span>
                                  ))}
                              </div>
                         )}
                     </td>
                     <td className="p-3 text-right text-amber-600 align-top print:p-1">{i>0?getDuration(arr[i-1].time,log.time):'-'}</td>
                 </tr>
             ))}</tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      <header className="bg-white p-4 shadow-sm border-b border-stone-200 sticky top-0 z-30 print:hidden">
        <h1 className="text-xl font-bold text-amber-700 flex items-center gap-2 justify-center">
           {view === 'setup' && <><Calculator className="w-6 h-6"/> Desem Setup</>}
           {view === 'tracker' && <><LayoutDashboard className="w-6 h-6"/> Active Tracker</>}
           {(view === 'history' || view === 'report') && <><BookOpen className="w-6 h-6"/> Mijn Logboek</>}
           {view === 'stats' && <><BarChart3 className="w-6 h-6"/> Analyse</>}
        </h1>
      </header>
      
      <main>
        {view === 'setup' && renderSetup()}
        {view === 'tracker' && renderTracker()}
        {view === 'history' && renderHistory()}
        {view === 'report' && renderReport()}
        {view === 'stats' && renderStats()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 pb-safe flex justify-around z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] print:hidden">
         <NavButton icon={<Calculator className="w-6 h-6"/>} label="Recept" active={view === 'setup'} onClick={() => handleNavClick('setup')} />
         
         {/* TRACKer KNOP MET INDICATOR */}
         <div className="relative">
             <NavButton icon={<LayoutDashboard className="w-6 h-6"/>} label="Tracker" active={view === 'tracker'} onClick={() => handleNavClick('tracker')} />
             {activeSession && <div className="absolute top-2 right-4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>}
         </div>

         <NavButton icon={<Archive className="w-6 h-6"/>} label="Logboek" active={view === 'history' || view === 'report'} onClick={() => handleNavClick('history')} />
         <NavButton icon={<BarChart3 className="w-6 h-6"/>} label="Analyse" active={view === 'stats'} onClick={() => handleNavClick('stats')} />
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function SurveyModal({ onClose, onComplete }) {
    const [step, setStep] = useState(1);
    const [data, setData] = useState({
        starterRise: '',
        bulkRise: '',
        doughResult: '',
        ovenSpring: '',
        crumb: '',
        crust: '',
        ear: '',
        rating: 5
    });

    const update = (field, value) => setData(prev => ({...prev, [field]: value}));

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h3 className="font-bold text-lg text-stone-800">Evaluatie</h3>
                    <span className="text-xs font-bold text-stone-400">Stap {step}/3</span>
                </div>

                {step === 1 && (
                    <div className="space-y-4">
                        <div className="text-sm font-bold text-amber-600 uppercase tracking-wide">Fase 1: Pre-Bake Observaties</div>
                        
                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Starter Toename</label>
                            <div className="flex gap-2 flex-wrap">
                                {['25%', '50%', '75%', '100%', 'Verdubbeld+'].map(opt => (
                                    <button key={opt} onClick={() => update('starterRise', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.starterRise === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Bulkrijs Toename</label>
                            <div className="flex gap-2 flex-wrap">
                                {['25%', '50%', '75%', '100%'].map(opt => (
                                    <button key={opt} onClick={() => update('bulkRise', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.bulkRise === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Deeg Gevoel</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Plakkerig', 'Sterk', 'Slap', 'Perfect', 'Droog'].map(opt => (
                                    <button key={opt} onClick={() => update('doughResult', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.doughResult === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>
                        <button onClick={() => setStep(2)} className="w-full bg-stone-800 text-white font-bold py-3 rounded-lg mt-4">Volgende</button>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-4">
                        <div className="text-sm font-bold text-amber-600 uppercase tracking-wide">Fase 2: Bakresultaat</div>
                        
                         <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Ovenspring</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Plat', 'Matig', 'Goed', 'Explosief'].map(opt => (
                                    <button key={opt} onClick={() => update('ovenSpring', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.ovenSpring === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Oor</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Geen', 'Klein', 'Mooi', 'Groot'].map(opt => (
                                    <button key={opt} onClick={() => update('ear', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.ear === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                         <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Korst</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Zacht', 'Krokant', 'Taai', 'Dik', 'Dun'].map(opt => (
                                    <button key={opt} onClick={() => update('crust', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.crust === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-stone-700 mb-2">Crumb (Kruim)</label>
                            <div className="flex gap-2 flex-wrap">
                                {['Dicht', 'Open', 'Onregelmatig', 'Perfect'].map(opt => (
                                    <button key={opt} onClick={() => update('crumb', opt)} className={`px-3 py-2 rounded-lg text-xs font-bold border ${data.crumb === opt ? 'bg-amber-600 text-white border-amber-600' : 'bg-stone-50 text-stone-600 border-stone-200'}`}>{opt}</button>
                                ))}
                            </div>
                        </div>

                        <button onClick={() => setStep(3)} className="w-full bg-stone-800 text-white font-bold py-3 rounded-lg mt-4">Volgende</button>
                    </div>
                )}

                 {step === 3 && (
                    <div className="space-y-6 text-center">
                        <div className="text-sm font-bold text-amber-600 uppercase tracking-wide">Fase 3: Eindoordeel</div>
                        
                        <div>
                            <label className="block text-lg font-bold text-stone-800 mb-4">Welk cijfer geef je dit brood?</label>
                            <div className="text-4xl font-black text-amber-600 mb-4">{data.rating}</div>
                            <input 
                                type="range" min="1" max="10" step="1" 
                                value={data.rating} 
                                onChange={(e) => update('rating', e.target.value)}
                                className="w-full accent-amber-600 h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-stone-400 mt-2">
                                <span>Mislukt (1)</span>
                                <span>Perfect (10)</span>
                            </div>
                        </div>

                        <button onClick={() => onComplete(data)} className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg mt-4 flex items-center justify-center gap-2">
                            <Save className="w-5 h-5"/> Opslaan & Afronden
                        </button>
                    </div>
                )}
             </div>
        </div>
    );
}

function ManualLogger({ onClose, onLog }) {
  const [action, setAction] = useState('Stretch & Fold');
  const [time, setTime] = useState(toDateTimeLocal(new Date()));
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-bold text-stone-600 mb-1">Actie</label><select className="w-full p-2 border rounded-lg" value={action} onChange={e=>setAction(e.target.value)}><option>Starter Gevoed</option><option>Autolyse Start</option><option>Mixen Compleet</option><option>Lamineren</option><option>Stretch & Fold</option><option>Coil Fold</option><option>Preshape</option><option>Final Shape</option><option>In Koelkast</option><option>Oven In</option><option>Cold Proof Start</option><option>Room Proof Start</option></select></div>
      <div><label className="block text-sm font-bold text-stone-600 mb-1">Tijd</label><input type="datetime-local" value={time} onChange={e=>setTime(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
      <div className="flex gap-2 pt-2"><button onClick={onClose} className="flex-1 py-2 text-stone-500 font-bold bg-stone-100 rounded-lg">Annuleren</button><button onClick={()=>onLog(action,0,time)} className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg">Toevoegen</button></div>
    </div>
  );
}

function CollapsibleRecipe({ recipe, config, isSetup }) {
    const [isOpen, setIsOpen] = useState(isSetup); 
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-stone-200 ${isSetup ? 'mt-0' : ''}`}>
            {!isSetup && (
                <button 
                    onClick={() => setIsOpen(!isOpen)} 
                    className="w-full flex justify-between items-center p-4 text-stone-800 hover:bg-stone-50 rounded-xl"
                >
                    <span className="font-bold text-lg flex items-center gap-2"><Calculator className="w-5 h-5 text-amber-600" /> Meetwaarden</span>
                    <ChevronRight className={`w-5 h-5 text-stone-500 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                </button>
            )}
            {(isOpen || isSetup) && (
                <div className={`p-4 ${!isSetup ? 'pt-0 border-t border-stone-100' : ''}`}>
                    <div className="bg-stone-800 text-stone-200 rounded-lg p-4 shadow-sm space-y-2">
                        <div className="flex justify-between items-center pb-2 border-b border-stone-700">
                            <h3 className="font-bold text-amber-500">Stap 1: Starter</h3>
                            <span className="text-white font-bold">{Math.round(recipe.desemToMake)}g</span>
                        </div>
                        <div className="text-xs text-stone-400">
                           Meng {Math.round(recipe.feedOldStarter)}g oud + {Math.round(recipe.feedFlour)}g bloem + {Math.round(recipe.feedWater)}g water
                        </div>
                        <div className="flex justify-between items-center pt-2 pb-2 border-b border-stone-700">
                            <h3 className="font-bold text-amber-500">Stap 2: Deeg</h3>
                            <span className="text-white font-bold">{Math.round(config.targetWeight)}g</span>
                        </div>
                        <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-stone-400">Desem</span><span>{Math.round(recipe.totalDesem)}g</span></div>
                            <div className="flex justify-between"><span className="text-stone-400">Water</span><span>{Math.round(recipe.doughWater)}g</span></div>
                            {recipe.doughWheat > 0 && <div className="flex justify-between"><span className="text-stone-400">Tarwebloem</span><span>{Math.round(recipe.doughWheat)}g</span></div>}
                            {recipe.doughWholeWheat > 0 && <div className="flex justify-between"><span className="text-stone-400">Volkoren</span><span>{Math.round(recipe.doughWholeWheat)}g</span></div>}
                            {recipe.doughSpelt > 0 && <div className="flex justify-between"><span className="text-stone-400">Spelt/Rogge</span><span>{Math.round(recipe.doughSpelt)}g</span></div>}
                            <div className="flex justify-between"><span className="text-stone-400">Zout</span><span>{config.salt.toFixed(1)}% ({recipe.totalSalt.toFixed(1)}g)</span></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function NoteModal({ currentNoteAction, sessionLogs, onClose, onSave, onDelete, tags }) {
    const logData = sessionLogs.find(l => l.time === currentNoteAction.time && l.action === currentNoteAction.action) || currentNoteAction;
    const [tempNote, setTempNote] = useState('');

    const handleSave = () => {
        onSave(tempNote);
        setTempNote('');
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-center">
                   <h3 className="font-bold text-lg text-stone-800">Notitie voor: {logData.action}</h3>
                   <button onClick={onClose}><X className="w-5 h-5 text-stone-400"/></button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                   {tags.map(tag => (
                     <button 
                       key={tag} 
                       onClick={() => onSave(tag)}
                       className="px-2 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-bold hover:bg-amber-100 hover:text-amber-700 transition-colors"
                     >
                       {tag}
                     </button>
                   ))}
                </div>
                
                <div className="relative">
                   <input 
                     type="text" 
                     placeholder="Typ een opmerking..." 
                     className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-sm"
                     value={tempNote}
                     onChange={(e) => setTempNote(e.target.value)}
                     onKeyDown={(e) => {
                         if(e.key === 'Enter') {
                           handleSave();
                         }
                     }}
                   />
                   <div className="text-[10px] text-stone-400 mt-1 pl-1">Druk op Enter of klik op een tag om op te slaan</div>
                </div>

                {logData.notes && logData.notes.length > 0 && (
                   <div className="bg-amber-50 rounded-lg p-3 space-y-2 max-h-32 overflow-y-auto">
                        <div className="text-xs font-bold text-amber-900 flex items-center gap-1 mb-1 border-b border-amber-200 pb-1">
                            <StickyNote className="w-3 h-3"/> Opgeslagen Notities
                        </div>
                        {logData.notes.map((n, i) => (
                           <div key={i} className="flex items-center justify-between text-xs text-amber-800 font-medium">
                               <span className="flex items-center gap-1"><Tag className="w-3 h-3 opacity-50"/> {n}</span>
                               <button onClick={() => onDelete(n)} className="text-red-500 hover:text-red-700 p-1">
                                   <X className="w-3 h-3"/>
                               </button>
                           </div>
                        ))}
                   </div>
                )}
                <button onClick={onClose} className="w-full bg-stone-800 text-white font-bold py-3 rounded-lg">Klaar</button>
             </div>
        </div>
    );
}