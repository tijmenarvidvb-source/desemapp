import React, { useState, useEffect } from 'react';
import { Play, Clock, ChevronRight, ChevronLeft, FileText, Timer, RotateCcw, Settings, Calculator, Camera, Image as ImageIcon, Calendar, Wand2, Archive, Save, Thermometer, Trash2, Hourglass, LayoutDashboard, BookOpen, Plus, X, AlertTriangle, StopCircle, Undo, ArrowRight, ArrowLeft, CheckCircle2, StickyNote, Tag } from 'lucide-react';

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

// Bereken verstreken minuten voor berekeningen
const getMinutesDiff = (start, end) => {
  if (!start || !end) return 0;
  return Math.floor((new Date(end) - new Date(start)) / (1000 * 60));
};

const calculateBulkTime = (logs, currentTime = new Date()) => {
  // Zoek de log 'Mixen Compleet', ongeacht waar hij staat
  const startLog = logs.find(l => l.action === 'Mixen Compleet');
  if (!startLog) return null;

  const endLog = logs.find(l => l.action === 'In Koelkast' || l.action === 'Oven In');
  // Als er een eindlog is, gebruik die tijd. Anders huidige tijd.
  const endTime = endLog ? new Date(endLog.time) : currentTime;
  
  return {
    text: getDuration(startLog.time, endTime),
    minutes: getMinutesDiff(startLog.time, endTime),
    startTime: startLog.time,
    isFinished: !!endLog
  };
};

// --- SLIMME SCHATTING LOGICA ---
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

// Acties die geen timer nodig hebben (momentopnames)
const INSTANT_ACTIONS = ['Starter Gevoed', 'In Koelkast', 'Oven In', 'Sessie Gestart'];

// Voorgedefinieerde tags voor notities
const TAGS = [
  "Plakkerig", "Rijst snel", "Rijst traag", "Slap deeg", 
  "Sterk deeg", "Goede windowpane", "Geen windowpane", 
  "Temperatuur piek", "Luchtig", "Compact"
];

// --- STANDAARD RECEPTEN ---
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
  // Sorteer van NIEUW naar OUD (b - a) zodat de laatste actie vooraan staat
  const actions = logs.filter(l => l.type === 'action').sort((a,b) => new Date(b.time) - new Date(a.time));
  
  if (actions.length === 0) return null;

  return (
    // pt-1 toegevoegd om te voorkomen dat de focus-ring wordt afgesneden aan de bovenkant
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
            </div>
            {/* Pijl naar links (<--) om aan te geven dat de vorige stap rechts staat (chronologisch van rechts naar links) */}
            {!isOldest && <ArrowLeft className="w-3 h-3 text-stone-300" />}
          </div>
        );
      })}
    </div>
  );
};

const ActionButton = ({ label, icon, onClick, subtext, activeTimer, onStopTimer }) => {
  const isRunning = activeTimer?.action === label;
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
    if (isRunning) {
      onStopTimer(); 
    } else {
      onClick();
    }
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

  return (
    <div className="bg-stone-800 text-white p-4 rounded-xl shadow-lg mb-6 border border-stone-700">
      <div className="flex items-center justify-between mb-2">
        <div>
           <div className="text-[10px] text-stone-400 uppercase tracking-wide mb-1">Huidige Fase</div>
           <div className="font-bold text-xl flex items-center gap-2 text-amber-500">
             {lastAction.action}
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
        {/* NOTE KNOP */}
        <button 
          onClick={() => onAddNote(lastAction)}
          className="py-2 px-3 bg-stone-700 hover:bg-stone-600 rounded-lg text-xs font-bold text-stone-300 flex items-center justify-center gap-2 transition-colors border border-stone-600"
        >
          <StickyNote className="w-3 h-3" /> Notitie / Tags
        </button>

        {/* UNDO KNOP */}
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
  const [currentNoteAction, setCurrentNoteAction] = useState(null); 
  
  const [pendingAction, setPendingAction] = useState(null);
  const [history, setHistory] = useState([]);
  const [session, setSession] = useState(null);
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const [showPresetModal, setShowPresetModal] = useState(false);
  
  const [config, setConfig] = useState({
    targetWeight: 1000, hydration: 68, inoculation: 20, salt: 2,
    wholeWheatPerc: 10, speltPerc: 0, wheatPerc: 90, 
    starterType: 'stiff', starterBuffer: 12 
  });

  // Initial Load
  useEffect(() => {
    const savedHistory = localStorage.getItem('desem_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const activeSession = localStorage.getItem('desem_active_session');
    if (activeSession) {
      const parsed = JSON.parse(activeSession);
      if (parsed.status === 'active') {
        setSession(parsed);
        setView('tracker');
      }
    }

    const savedConfig = localStorage.getItem('desem_default_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));

    const savedPresets = localStorage.getItem('desem_presets');
    if (savedPresets) {
      setPresets(JSON.parse(savedPresets));
    }
  }, []);

  // Auto-Save Active Session
  useEffect(() => {
    if (session && session.status === 'active') {
      localStorage.setItem('desem_active_session', JSON.stringify(session));
    } else if (session && session.status === 'finished') {
      localStorage.removeItem('desem_active_session');
    }
  }, [session]);

  const saveToHistory = (completedSession) => {
    const filteredHistory = history.filter(h => h.id !== completedSession.id);
    const newHistory = [completedSession, ...filteredHistory];
    setHistory(newHistory);
    localStorage.setItem('desem_history', JSON.stringify(newHistory));
  };

  const deleteFromHistory = (id, e) => {
    if (e) e.stopPropagation();
    if (window.confirm("Weet je zeker dat je dit brood wilt verwijderen?")) {
      const newHistory = history.filter(item => item.id !== id);
      setHistory(newHistory);
      localStorage.setItem('desem_history', JSON.stringify(newHistory));
      if (view === 'report' && session?.id === id) setView('history');
    }
  };
  
  const handleResumeSession = () => {
    if (!session) return;
    
    // BEVEILIGING WEGGEHAALD: Direct uitvoeren
    // FILTER: Haal expliciet de Bakken Klaar actie weg
    const activeLogs = session.logs.filter(l => l.action !== 'Bakken Klaar');
    
    // MAAK NIEUW OBJECT: Reset status en eindtijd
    const resumedSession = {
        ...session,
        logs: activeLogs,
        status: 'active',
        endTime: null 
    };
    
    // UPDATE STATE
    setSession(resumedSession);
    // FORCEER UPDATE IN STORAGE (voor zekerheid)
    localStorage.setItem('desem_active_session', JSON.stringify(resumedSession));
    
    // WISSEL VIEW
    setView('tracker');
  };

  const loadPreset = (presetConfig) => {
    setConfig({ ...config, ...presetConfig });
  };

  const saveCurrentAsPreset = (name) => {
    const newPreset = { name, config: { ...config } };
    const newPresets = [...presets, newPreset];
    setPresets(newPresets);
    localStorage.setItem('desem_presets', JSON.stringify(newPresets));
    setShowPresetModal(false);
  };

  const deletePreset = (e, index) => {
    e.stopPropagation();
    if(confirm("Recept verwijderen?")) {
      const newPresets = presets.filter((_, i) => i !== index);
      setPresets(newPresets);
      localStorage.setItem('desem_presets', JSON.stringify(newPresets));
    }
  };

  const [customStartTime, setCustomStartTime] = useState(toDateTimeLocal(new Date()));
  const [ambientTemp, setAmbientTemp] = useState(21);

  // --- REKEN LOGICA ---
  const calculateRecipe = () => {
    let starterHydration = config.starterType === 'liquid' ? 100 : 50; 
    let feedRatio = config.starterType === 'liquid' 
      ? { old: 1, flour: 5, water: 5, totalParts: 11 }
      : { old: 1, flour: 5, water: 2.5, totalParts: 8.5 }; 

    const totalPerc = 1 + (config.hydration / 100) + (config.salt / 100);
    const totalFlour = config.targetWeight / totalPerc;
    const totalWater = totalFlour * (config.hydration / 100);
    const totalSalt = totalFlour * (config.salt / 100);
    const totalDesem = totalFlour * (config.inoculation / 100);

    const starterFlourRatio = 1 / (1 + (starterHydration / 100)); 
    const flourInDesem = totalDesem * starterFlourRatio;
    const waterInDesem = totalDesem - flourInDesem;

    const desemToMake = totalDesem * (1 + (config.starterBuffer / 100));
    const starterUnit = desemToMake / feedRatio.totalParts;

    const neededWholeWheat = totalFlour * (config.wholeWheatPerc / 100);
    const neededSpelt = totalFlour * (config.speltPerc / 100);
    const neededWheat = totalFlour * (config.wheatPerc / 100);

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

  const recipe = calculateRecipe();

  // Timer State
  const [activeTimer, setActiveTimer] = useState(null); 
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeTimer) {
      const check = setInterval(() => {
         // Logic in ActionButton
      }, 1000);
      return () => clearInterval(check);
    }
  }, [activeTimer]);

  const handleStartSession = () => {
    const start = new Date(customStartTime).toISOString();
    // NIEUW: Log direct ook 'Starter Gevoed' omdat de knop nu gecombineerd is
    const starterLog = { action: 'Starter Gevoed', time: start, type: 'action' };
    const systemLog = { action: 'Sessie Gestart', time: start, type: 'system' };
    
    const newSession = {
      id: Date.now(),
      name: `Desem ${new Date(start).toLocaleDateString()}`,
      startTime: start,
      temperature: ambientTemp,
      logs: [starterLog, systemLog], // Direct beide logs erin
      photos: [],
      configSnapshot: config,
      status: 'active'
    };
    setSession(newSession);
    setView('tracker');
  };

  const handleFinishSession = () => {
    const endLog = { action: 'Bakken Klaar', time: new Date().toISOString(), type: 'system' };
    const completedSession = {
       ...session, 
       logs: [endLog, ...session.logs],
       endTime: new Date().toISOString(),
       status: 'finished',
       configSnapshot: config
    };
    saveToHistory(completedSession);
    setSession(completedSession);
    setView('report'); 
    setActiveTimer(null);
  };

  const logAction = (actionName, setTimerMinutes = 0, customTime = null) => {
    if (activeTimer && !customTime) {
       setPendingAction({ actionName, setTimerMinutes });
       setShowGuardModal(true);
       return;
    }

    const time = customTime ? new Date(customTime).toISOString() : new Date().toISOString();
    const newLog = { action: actionName, time: time, type: 'action', notes: [] };
    
    setSession(prev => ({ 
      ...prev, 
      logs: [...prev.logs, newLog].sort((a,b) => new Date(b.time) - new Date(a.time))
    }));

    if (setTimerMinutes > 0 && !customTime) {
      const target = new Date();
      target.setMinutes(target.getMinutes() + setTimerMinutes);
      setActiveTimer({ targetTime: target, label: `Wachten na ${actionName}`, action: actionName });
    } else if (setTimerMinutes === 0 && !customTime) {
        setActiveTimer(null); 
    }
    setShowManualLog(false);
  };

  const confirmPhaseChange = () => {
    if (pendingAction) {
       setActiveTimer(null);
       const { actionName, setTimerMinutes } = pendingAction;
       const time = new Date().toISOString();
       const newLog = { action: actionName, time: time, type: 'action', notes: [] };
       
       setSession(prev => ({ 
          ...prev, 
          logs: [...prev.logs, newLog].sort((a,b) => new Date(b.time) - new Date(a.time))
       }));

       if (setTimerMinutes > 0) {
          const target = new Date();
          target.setMinutes(target.getMinutes() + setTimerMinutes);
          setActiveTimer({ targetTime: target, label: `Wachten na ${actionName}`, action: actionName });
       } else {
          setActiveTimer(null);
       }
       setPendingAction(null);
       setShowGuardModal(false);
    }
  };

  const handleUndo = () => {
    // 1. Maak een kopie van de logs array
    const logsCopy = [...session.logs];

    // 2. Omdat we in logAction sorteren (nieuwste eerst: b.time - a.time), 
    // staat de nieuwste actie meestal vooraan. 
    // We zoeken de EERSTE log die type 'action' is.
    
    // Noot: In de render functie sorteren we voor de zekerheid. 
    // Laten we hier ook even sorteren op de kopie om 100% zeker te zijn dat index 0 de nieuwste is.
    logsCopy.sort((a, b) => new Date(b.time) - new Date(a.time));

    const indexToRemove = logsCopy.findIndex(l => l.type === 'action');

    if (indexToRemove !== -1) {
       // Verwijder die ene specifieke log
       const logToRemove = logsCopy[indexToRemove];
       
       // Als we een timer hebben lopen voor deze actie, stop die dan
       if (activeTimer && activeTimer.action === logToRemove.action) {
          setActiveTimer(null);
       }

       logsCopy.splice(indexToRemove, 1);
       
       // Update sessie met de nieuwe (kortere) lijst
       setSession(prev => ({ ...prev, logs: logsCopy }));
    }
  };

  // NOTITIE FUNCTIES
  const openNoteModal = (actionLog) => {
    setCurrentNoteAction(actionLog);
    setShowNoteModal(true);
  };

  const saveNote = (noteText) => {
    if (!currentNoteAction) return;
    
    // Update de log in de sessie
    const updatedLogs = session.logs.map(l => {
        if (l.time === currentNoteAction.time && l.action === currentNoteAction.action) {
            const currentNotes = l.notes || [];
            return { ...l, notes: [...currentNotes, noteText] };
        }
        return l;
    });

    setSession(prev => ({ ...prev, logs: updatedLogs }));
    if(session.status === 'finished') {
       // update history if needed, but notes are usually added during active
    }
  };


  const stopTimerOnly = () => {
    setActiveTimer(null);
    setShowTimerModal(false);
  };

  const deleteLastActionAndTimer = () => {
    if (!activeTimer) return;
    const newLogs = [...session.logs];
    const indexToRemove = newLogs.findIndex(l => l.action === activeTimer.action);
    if (indexToRemove !== -1) {
        newLogs.splice(indexToRemove, 1);
    }
    setSession(prev => ({ ...prev, logs: newLogs }));
    setActiveTimer(null);
    setShowTimerModal(false);
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedSession = { ...session, photos: [...session.photos, reader.result] };
        setSession(updatedSession);
        if (session.status === 'finished') {
           saveToHistory(updatedSession);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateRemainder = (current, others) => Math.max(0, 100 - others);

  // --- VIEWS ---

  const renderSetup = () => {
    const totalPerc = config.wheatPerc + config.wholeWheatPerc + config.speltPerc;
    const [startDate, startTime] = customStartTime.split('T');

    return (
      <div className="pb-32 space-y-6 p-4 max-w-md mx-auto">
        <div className="mb-2">
          <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2 pl-1">Opgeslagen Recepten</h3>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
            {presets.map((preset, idx) => (
              <button 
                key={idx}
                onClick={() => loadPreset(preset.config)}
                className="flex-shrink-0 bg-white border border-stone-200 rounded-lg p-3 min-w-[120px] text-left shadow-sm hover:border-amber-400 focus:ring-2 focus:ring-amber-500 relative group snap-start"
              >
                <div className="font-bold text-stone-700 text-sm truncate pr-4">{preset.name}</div>
                <div className="text-[10px] text-stone-400 mt-1">
                  {preset.config.targetWeight}g • {preset.config.hydration}% hydro
                </div>
                <div onClick={(e) => deletePreset(e, idx)} className="absolute top-1 right-1 text-stone-300 hover:text-red-400 p-1">
                  <X className="w-3 h-3" />
                </div>
              </button>
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
              <h3 className="font-bold text-lg mb-4">Recept Opslaan</h3>
              <input id="presetNameInput" type="text" placeholder="Bijv. Zondags Brood" className="w-full p-3 border border-stone-300 rounded-lg mb-4" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setShowPresetModal(false)} className="flex-1 py-2 text-stone-500 font-bold bg-stone-100 rounded-lg">Annuleren</button>
                <button onClick={() => { const name = document.getElementById('presetNameInput').value; if(name) saveCurrentAsPreset(name); }} className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg">Opslaan</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-stone-200 p-1 shadow-sm flex mb-6">
           <button onClick={() => setConfig({...config, starterType: 'stiff'})} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${config.starterType === 'stiff' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}>Stiff (1:5:2,5)</button>
           <button onClick={() => setConfig({...config, starterType: 'liquid'})} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-colors ${config.starterType === 'liquid' ? 'bg-amber-100 text-amber-800' : 'text-stone-500'}`}>Liquid (1:5:5)</button>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm relative">
           <button onClick={() => setShowPresetModal(true)} className="absolute top-4 right-4 text-stone-400 hover:text-amber-600" title="Sla op als recept"><Save className="w-5 h-5" /></button>
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

        <div className="bg-stone-100 rounded-xl border border-stone-200 p-4 shadow-sm">
           <h3 className="font-bold text-stone-600 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> Startcondities</h3>
           <div className="space-y-3">
             <div>
               <label className="text-xs text-stone-500 block mb-1">Starttijd</label>
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

        <div className="bg-stone-800 text-stone-200 rounded-xl border border-stone-700 p-4 shadow-sm space-y-3">
             <div className="flex justify-between items-center pb-2 border-b border-stone-700"><h3 className="font-bold text-amber-500">Stap 1: Starter</h3><span className="text-white font-bold">{Math.round(recipe.desemToMake)}g</span></div>
             <div className="text-xs text-stone-400">Meng {Math.round(recipe.feedOldStarter)}g oud + {Math.round(recipe.feedFlour)}g bloem + {Math.round(recipe.feedWater)}g water</div>
             <div className="flex justify-between items-center pt-2 pb-2 border-b border-stone-700"><h3 className="font-bold text-amber-500">Stap 2: Deeg</h3><span className="text-white font-bold">{Math.round(config.targetWeight)}g</span></div>
             <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-stone-400">Desem</span><span>{Math.round(recipe.totalDesem)}g</span></div>
                <div className="flex justify-between"><span className="text-stone-400">Water</span><span>{Math.round(recipe.doughWater)}g</span></div>
                {recipe.doughWheat > 0 && <div className="flex justify-between"><span className="text-stone-400">Tarwebloem</span><span>{Math.round(recipe.doughWheat)}g</span></div>}
                {recipe.doughWholeWheat > 0 && <div className="flex justify-between"><span className="text-stone-400">Volkoren</span><span>{Math.round(recipe.doughWholeWheat)}g</span></div>}
                {recipe.doughSpelt > 0 && <div className="flex justify-between"><span className="text-stone-400">Spelt/Rogge</span><span>{Math.round(recipe.doughSpelt)}g</span></div>}
                <div className="flex justify-between"><span className="text-stone-400">Zout</span><span>{Math.round(recipe.totalSalt)}g</span></div>
             </div>
        </div>

        <button onClick={handleStartSession} disabled={totalPerc !== 100} className={`w-full font-bold text-lg py-4 rounded-xl shadow-lg flex items-center justify-center gap-2 ${totalPerc !== 100 ? 'bg-stone-300 text-stone-500 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-700'}`}>
           {totalPerc !== 100 ? 'Check Percentages!' : <><Play className="w-6 h-6 fill-current" /> Meng Starter & Start Sessie</>}
        </button>
      </div>
    );
  };

  const renderTracker = () => {
    if (!session || session.status !== 'active') return (
      <div className="p-8 text-center text-stone-400 mt-20">
        <LayoutDashboard className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>Geen actieve sessie.</p>
        <button onClick={() => setView('setup')} className="mt-4 text-amber-600 font-bold underline">Start een brood</button>
      </div>
    );

    const bulkData = calculateBulkTime(session.logs);
    const estimatedMinutes = estimateBulkRiseDuration(session.temperature, session.configSnapshot?.inoculation, history);
    const progressPerc = bulkData ? Math.min(100, (bulkData.minutes / estimatedMinutes) * 100) : 0;
    
    // Bereken resterende tijd voor de nieuwe knop
    const remainingMinutes = bulkData ? Math.max(0, estimatedMinutes - bulkData.minutes) : 0;

    return (
      <div className="pb-32 p-4 max-w-md mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-4">
           <div className="flex justify-between items-start mb-4">
             <div>
               <h2 className="font-bold text-lg text-stone-800">{session.name}</h2>
               <div className="flex gap-3 text-xs text-stone-500">
                 <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {formatTime(session.startTime)}</span>
                 {session.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3"/> {session.temperature}°C</span>}
               </div>
             </div>
           </div>
           
           {/* NIEUWE TIMELINE (met timestamps) */}
           <PhaseTimeline logs={session.logs} />

           {/* NIEUWE PHASE TRACKER (Lopend) + UNDO + NOTES */}
           <PhaseTracker 
             logs={session.logs} 
             activeTimer={activeTimer} 
             onUndo={handleUndo} 
             onAddNote={openNoteModal}
           />

           {/* SLIMME INDICATOR */}
           <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
              <div className="flex justify-between items-center mb-2">
                 <span className="text-xs font-bold text-stone-500 uppercase flex items-center gap-1"><Hourglass className="w-3 h-3"/> Totale Bulkrijs</span>
                 <span className="text-xs font-mono font-bold text-stone-700">{bulkData ? bulkData.text : "0u 00m"} / ~{Math.floor(estimatedMinutes/60)}u {estimatedMinutes%60}m</span>
              </div>
              <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                 <div className="h-full bg-amber-500 transition-all duration-1000" style={{ width: `${progressPerc}%` }}></div>
              </div>
              <div className="mt-1 text-[10px] text-stone-400 text-right">
                {history.length < 3 ? "Schatting o.b.v. theorie" : "Schatting o.b.v. jouw historie"}
              </div>
           </div>
        </div>

        {/* GUARD MODAL (BEVEILIGING) */}
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
                      <CheckCircle2 className="w-4 h-4"/>
                      Afronden & Doorgaan
                   </button>
                   <button onClick={() => { setShowGuardModal(false); setPendingAction(null); }} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-600 p-3 rounded-lg text-sm font-bold transition-colors">
                      Annuleren
                   </button>
                </div>
             </div>
          </div>
        )}

        {/* NOTE MODAL (NIEUW) */}
        {showNoteModal && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-2xl space-y-4">
                 <div className="flex justify-between items-center">
                   <h3 className="font-bold text-lg text-stone-800">Notitie toevoegen</h3>
                   <button onClick={() => setShowNoteModal(false)}><X className="w-5 h-5 text-stone-400"/></button>
                 </div>
                 <div className="flex flex-wrap gap-2">
                    {TAGS.map(tag => (
                      <button 
                        key={tag} 
                        onClick={() => saveNote(tag)}
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
                      onKeyDown={(e) => {
                         if(e.key === 'Enter') {
                            saveNote(e.target.value);
                            e.target.value = '';
                         }
                      }}
                   />
                   <div className="text-[10px] text-stone-400 mt-1 pl-1">Druk op Enter om op te slaan</div>
                 </div>

                 {/* Huidige notities voor deze actie */}
                 {currentNoteAction?.notes && currentNoteAction.notes.length > 0 && (
                   <div className="bg-amber-50 rounded-lg p-3 space-y-1 max-h-32 overflow-y-auto">
                      {session.logs.find(l => l.time === currentNoteAction.time)?.notes?.map((n, i) => (
                         <div key={i} className="flex items-center gap-2 text-xs text-amber-800 font-medium">
                            <Tag className="w-3 h-3 opacity-50"/> {n}
                         </div>
                      ))}
                   </div>
                 )}
                 <button onClick={() => setShowNoteModal(false)} className="w-full bg-stone-800 text-white font-bold py-3 rounded-lg">Klaar</button>
             </div>
          </div>
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
                <button onClick={() => setShowTimerModal(false)} className="w-full py-2 text-stone-400 text-sm font-bold mt-2">
                   Annuleren
                </button>
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
            {/* Starter Gevoed is nu hier verwijderd */}
            <ActionButton label="Autolyse Start" icon={<div className="w-6 h-6 rounded-full border-4 border-current opacity-50"></div>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="60 min rust" onClick={() => logAction("Autolyse Start", 60)} />
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
            <ActionButton label="Stretch & Fold" icon={<ChevronRight className="rotate-[-45deg]"/>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="30 min rust" onClick={() => logAction("Stretch & Fold", 30)} />
            <ActionButton label="Coil Fold" icon={<span className="font-serif text-2xl font-bold">S</span>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="30 min rust" onClick={() => logAction("Coil Fold", 30)} />
            <ActionButton label="Preshape" icon={<div className="w-6 h-6 rounded-full border-2 border-dashed border-current"></div>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="20 min rust" onClick={() => logAction("Preshape", 20)} />
            <ActionButton label="Final Shape" icon={<div className="w-6 h-6 rounded-full border-2 border-current bg-stone-100"></div>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} onClick={() => logAction("Final Shape")} />
            
            {/* NIEUWE KNOP */}
            <ActionButton 
              label="Rest Bulkrijs" 
              icon={<Hourglass />} 
              activeTimer={activeTimer} 
              onStopTimer={() => setShowTimerModal(true)} 
              subtext={`Timer: ${remainingMinutes}m`} 
              onClick={() => logAction("Rest Bulkrijs", remainingMinutes)} 
            />
          </div>
        </div>

        <div><SectionHeader title="Afronden" />
           <div className="grid grid-cols-2 gap-3">
            <ActionButton label="In Koelkast" icon={<span>❄️</span>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} onClick={() => logAction("In Koelkast")} />
            <ActionButton label="Oven In" icon={<span>🔥</span>} activeTimer={activeTimer} onStopTimer={() => setShowTimerModal(true)} subtext="45 min bakken" onClick={() => logAction("Oven In", 45)} />
           </div>
        </div>

        <button onClick={() => setShowManualLog(true)} className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 font-bold hover:bg-stone-50 flex items-center justify-center gap-2 mt-4"><Clock className="w-4 h-4"/> Vergeten actie?</button>
        <button onClick={handleFinishSession} className="w-full bg-stone-800 text-white font-bold py-3 rounded-xl shadow-md mt-6">Klaar met bakken & Opslaan</button>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="pb-32 p-4 max-w-md mx-auto space-y-4">
      {history.length === 0 ? <div className="text-center py-12 text-stone-400"><Archive className="w-16 h-16 mx-auto mb-4 opacity-50" /><p>Nog geen geschiedenis.</p></div> 
      : history.map((item) => (
          <div key={item.id} onClick={() => { setSession(item); setView('report'); }} className="bg-white p-4 rounded-xl shadow-sm border border-stone-200 cursor-pointer active:scale-[0.98] transition-all relative group">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-stone-800">{item.name || 'Naamloos Brood'}</h3>
                <div className="text-xs text-stone-500 flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(item.startTime).toLocaleDateString()}</span>
                  {item.temperature && <span className="flex items-center gap-1"><Thermometer className="w-3 h-3" /> {item.temperature}°C</span>}
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

  const renderReport = () => {
    const finalBulk = calculateBulkTime(session.logs, session.endTime);
    return (
      <div className="pb-32 p-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-4">
            <button onClick={() => setView('history')} className="flex items-center gap-2 text-stone-500 font-bold"><ChevronLeft className="w-5 h-5"/> Terug</button>
            <button onClick={handleResumeSession} className="flex items-center gap-1 text-xs font-bold bg-amber-100 text-amber-700 px-3 py-2 rounded-full hover:bg-amber-200 transition-colors">
               <Undo className="w-3 h-3"/> Hervat Sessie
            </button>
        </div>
        
        <div className="mb-8">
           <h2 className="text-xl font-bold text-stone-800 mb-4 flex items-center gap-2"><ImageIcon className="w-5 h-5 text-amber-600" /> Resultaat</h2>
           <div className="grid grid-cols-2 gap-4 mb-4">
             {session.photos && session.photos.map((img, idx) => <img key={idx} src={img} className="w-full h-40 object-cover rounded-lg shadow-sm" />)}
           </div>
           <label className="block w-full cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} /><div className="w-full bg-stone-100 text-stone-600 font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-stone-200 transition-colors"><Camera className="w-5 h-5" /> Foto Toevoegen</div></label>
        </div>
        <div className="mb-8 bg-amber-50 rounded-lg p-6 border border-amber-100">
           <h2 className="text-xl font-bold text-amber-800 mb-2">Receptuur ({session.configSnapshot?.targetWeight}g)</h2>
           <div className="text-sm text-amber-700 flex flex-wrap gap-4">
             <span>Hydro: <b>{session.configSnapshot?.hydration}%</b></span>
             <span>Desem: <b>{session.configSnapshot?.inoculation}%</b></span>
             {session.temperature && <span>Temp: <b>{session.temperature}°C</b></span>}
           </div>
           {finalBulk && <div className="mt-4 pt-4 border-t border-amber-200 flex justify-between font-bold text-amber-900"><span>Totale Bulkrijs:</span><span className="font-mono text-lg">{finalBulk.text}</span></div>}
        </div>
        <div className="border rounded-lg overflow-hidden border-stone-200">
          <table className="w-full text-left text-sm">
             <thead className="bg-stone-100 text-stone-600 font-semibold border-b"><tr><th className="p-3">Tijd</th><th className="p-3">Actie</th><th className="p-3 text-right">Duur</th></tr></thead>
             <tbody className="divide-y divide-stone-100">{[...session.logs].sort((a,b)=>new Date(a.time)-new Date(b.time)).map((log,i,arr)=>(
                 <tr key={i}>
                    <td className="p-3 font-mono text-stone-500 align-top">{formatTime(log.time)}</td>
                    <td className="p-3 align-top">
                        <div className="font-medium text-stone-700">{log.action}</div>
                        {log.notes && log.notes.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {log.notes.map((n, idx) => (
                                    <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                        {n}
                                    </span>
                                ))}
                            </div>
                        )}
                    </td>
                    <td className="p-3 text-right text-amber-600 align-top">{i>0?getDuration(arr[i-1].time,log.time):'-'}</td>
                 </tr>
             ))}</tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800">
      <header className="bg-white p-4 shadow-sm border-b border-stone-200 sticky top-0 z-30">
        <h1 className="text-xl font-bold text-amber-700 flex items-center gap-2 justify-center">
           {view === 'setup' && <><Calculator className="w-6 h-6"/> Desem Setup</>}
           {view === 'tracker' && <><LayoutDashboard className="w-6 h-6"/> Active Tracker</>}
           {(view === 'history' || view === 'report') && <><BookOpen className="w-6 h-6"/> Mijn Logboek</>}
        </h1>
      </header>
      
      <main>
        {view === 'setup' && renderSetup()}
        {view === 'tracker' && renderTracker()}
        {view === 'history' && renderHistory()}
        {view === 'report' && renderReport()}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 p-2 pb-safe flex justify-around z-40 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
         <NavButton icon={<Calculator className="w-6 h-6"/>} label="Recept" active={view === 'setup'} onClick={() => setView('setup')} />
         <NavButton icon={<LayoutDashboard className="w-6 h-6"/>} label="Tracker" active={view === 'tracker'} onClick={() => setView('tracker')} />
         <NavButton icon={<Archive className="w-6 h-6"/>} label="Logboek" active={view === 'history' || view === 'report'} onClick={() => setView('history')} />
      </div>
    </div>
  );
}

function ManualLogger({ onClose, onLog }) {
  const [action, setAction] = useState('Stretch & Fold');
  const [time, setTime] = useState(toDateTimeLocal(new Date()));
  return (
    <div className="space-y-4">
      <div><label className="block text-sm font-bold text-stone-600 mb-1">Actie</label><select className="w-full p-2 border rounded-lg" value={action} onChange={e=>setAction(e.target.value)}><option>Starter Gevoed</option><option>Autolyse Start</option><option>Mixen Compleet</option><option>Lamineren</option><option>Stretch & Fold</option><option>Coil Fold</option><option>Preshape</option><option>Final Shape</option><option>In Koelkast</option><option>Oven In</option></select></div>
      <div><label className="block text-sm font-bold text-stone-600 mb-1">Tijd</label><input type="datetime-local" value={time} onChange={e=>setTime(e.target.value)} className="w-full p-2 border rounded-lg" /></div>
      <div className="flex gap-2 pt-2"><button onClick={onClose} className="flex-1 py-2 text-stone-500 font-bold bg-stone-100 rounded-lg">Annuleren</button><button onClick={()=>onLog(action,0,time)} className="flex-1 py-2 bg-amber-600 text-white font-bold rounded-lg">Toevoegen</button></div>
    </div>
  );
}