
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Plus, 
  FileText, 
  Play, 
  ChevronRight, 
  BarChart3, 
  BookOpen, 
  CheckCircle2,
  Trash2,
  ArrowLeft,
  Sparkles,
  Upload,
  BrainCircuit,
  Target,
  Trophy,
  Undo2,
  AlertTriangle,
  Info,
  Search,
  CheckCircle,
  Clock,
  Layers,
  ChevronLeft,
  X,
  HelpCircle,
  Flame,
  Wand2,
  Keyboard,
  History,
  TrendingUp,
  Settings2
} from 'lucide-react';
import { Button } from './components/Button';
import { Card } from './components/Card';
import { Document, CueCard, ReviewStat, Strictness, TextBlock } from './types';
import { MOCK_SCRIPTS, INITIAL_CUE_CARDS } from './constants';
import { evaluateResponse, suggestCueWords, cleanAndStructureScript } from './services/geminiService';
import { extractTextFromPdf, splitTextIntoBlocks } from './services/pdfService';

enum View {
  DASHBOARD = 'dashboard',
  LIBRARY = 'library',
  DOC_VIEWER = 'doc_viewer',
  QUIZ = 'quiz'
}

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // --- Core State ---
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [documents, setDocuments] = useState<Document[]>(() => {
    const saved = localStorage.getItem('cl_docs');
    return saved ? JSON.parse(saved) : MOCK_SCRIPTS;
  });
  const [cueCards, setCueCards] = useState<CueCard[]>(() => {
    const saved = localStorage.getItem('cl_cues');
    return saved ? JSON.parse(saved) : INITIAL_CUE_CARDS;
  });
  const [stats, setStats] = useState<ReviewStat[]>(() => {
    const saved = localStorage.getItem('cl_stats');
    return saved ? JSON.parse(saved) : [];
  });

  // --- UI State ---
  const [showTutorial, setShowTutorial] = useState(() => !localStorage.getItem('cl_tutorial_seen'));
  const [tutorialStep, setTutorialStep] = useState(0);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [quizCues, setQuizCues] = useState<CueCard[]>([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [feedback, setFeedback] = useState<{ score: number; text: string } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const [showHint, setShowHint] = useState(false);
  const [cueEditorBlock, setCueEditorBlock] = useState<TextBlock | null>(null);
  const [manualCueWord, setManualCueWord] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState<{ id: string, type: 'doc' | 'cue' } | null>(null);

  // --- Persistence ---
  useEffect(() => {
    localStorage.setItem('cl_docs', JSON.stringify(documents));
    localStorage.setItem('cl_cues', JSON.stringify(cueCards));
    localStorage.setItem('cl_stats', JSON.stringify(stats));
  }, [documents, cueCards, stats]);

  useEffect(() => {
    if (cueEditorBlock) fetchSuggestions();
  }, [cueEditorBlock]);

  const fetchSuggestions = async () => {
    if (!cueEditorBlock) return;
    setIsSuggesting(true);
    const suggestions = await suggestCueWords(cueEditorBlock.text);
    setAiSuggestions(suggestions);
    setIsSuggesting(false);
  };

  // --- Derived Stats ---
  const globalStats = useMemo(() => {
    const totalCues = cueCards.length;
    const masteredCues = stats.filter(s => s.streak >= 3).length;
    const averageScore = stats.length > 0 
      ? (stats.reduce((acc, curr) => acc + curr.lastScore, 0) / stats.length) * 100 
      : 0;
    
    // Calculate Streak
    const reviewDates = stats.map(s => new Date(s.lastReviewedAt).toDateString()).filter((v, i, a) => a.indexOf(v) === i);
    let currentStreak = 0;
    const today = new Date();
    let checkDate = new Date(today);
    while (true) {
      if (reviewDates.includes(checkDate.toDateString())) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (currentStreak === 0 && checkDate.toDateString() === today.toDateString()) {
           checkDate.setDate(checkDate.getDate() - 1);
           continue;
        }
        break;
      }
    }
    return { totalCues, masteredCues, averageScore, currentStreak };
  }, [cueCards, stats]);

  const recentDocument = useMemo(() => {
    if (documents.length === 0) return null;
    return [...documents].sort((a, b) => b.importedAt - a.importedAt)[0];
  }, [documents]);

  // --- Handlers ---
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setImportStatus('Extrahiere Text...');
    try {
      const rawText = await extractTextFromPdf(file);
      const documentId = Math.random().toString(36).substr(2, 9);
      setImportStatus('KI strukturiert Rollen...');
      const structuredLines = await cleanAndStructureScript(rawText);
      let finalBlocks: TextBlock[] = structuredLines && Array.isArray(structuredLines) 
        ? structuredLines.map((text, index) => ({ id: `b-${documentId}-${index}`, documentId, text, orderIndex: index }))
        : splitTextIntoBlocks(rawText, documentId);
      
      const newDoc: Document = { id: documentId, title: file.name.replace('.pdf', ''), content: rawText.substring(0, 1000), importedAt: Date.now(), language: 'de', blocks: finalBlocks };
      setDocuments(prev => [newDoc, ...prev]);
      setSelectedDocId(documentId);
      setCurrentView(View.DOC_VIEWER);
    } catch (error) {
      alert("Fehler beim Import.");
    } finally {
      setIsImporting(false);
    }
  };

  const startQuiz = (docId: string) => {
    const docCues = cueCards.filter(c => c.documentId === docId);
    if (docCues.length === 0) return;
    setQuizCues(docCues);
    setQuizIndex(0);
    setQuizFinished(false);
    setCurrentView(View.QUIZ);
    setUserInput('');
    setFeedback(null);
  };

  const handleEvaluate = async () => {
    const currentCue = quizCues[quizIndex];
    if (!currentCue || !userInput.trim()) return;
    setIsEvaluating(true);
    const result = await evaluateResponse(currentCue.expectedText, userInput, currentCue.strictness);
    setFeedback({ score: result.score, text: result.feedback });
    setStats(prev => {
      const idx = prev.findIndex(s => s.cueCardId === currentCue.id);
      const isCorrect = result.score >= 0.8;
      const newStat: ReviewStat = {
        cueCardId: currentCue.id,
        lastScore: result.score,
        streak: isCorrect ? (idx >= 0 ? prev[idx].streak + 1 : 1) : 0,
        lastReviewedAt: Date.now()
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = newStat;
        return next;
      }
      return [...prev, newStat];
    });
    setIsEvaluating(false);
  };

  const saveManualCue = () => {
    if (!cueEditorBlock || !manualCueWord.trim()) return;
    const existingIdx = cueCards.findIndex(c => c.textBlockId === cueEditorBlock.id);
    const newCue: CueCard = {
      id: existingIdx >= 0 ? cueCards[existingIdx].id : Math.random().toString(36).substr(2, 9),
      documentId: cueEditorBlock.documentId,
      textBlockId: cueEditorBlock.id,
      cueWord: manualCueWord.trim(),
      expectedText: cueEditorBlock.text,
      strictness: Strictness.MEDIUM,
      keywords: []
    };
    setCueCards(prev => existingIdx >= 0 ? prev.map((c, i) => i === existingIdx ? newCue : c) : [...prev, newCue]);
    setCueEditorBlock(null);
    setManualCueWord('');
    setAiSuggestions([]);
  };

  const confirmDelete = () => {
    if (!pendingDeletion) return;
    const { id, type } = pendingDeletion;
    if (type === 'doc') {
      const relatedCueIds = cueCards.filter(c => c.documentId === id).map(c => c.id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      setCueCards(prev => prev.filter(c => c.documentId !== id));
      setStats(prev => prev.filter(s => !relatedCueIds.includes(s.cueCardId)));
      if (selectedDocId === id) setSelectedDocId(null);
    } else {
      setCueCards(prev => prev.filter(c => c.id !== id));
      setStats(prev => prev.filter(s => s.cueCardId !== id));
    }
    setPendingDeletion(null);
  };

  // PROBERAUM: Fokus auf Fortschritt und aktive Übung
  const renderDashboard = () => {
    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <header className="flex justify-between items-start md:items-center">
          <div className="space-y-2">
            <h1 className="text-5xl font-bold tracking-tighter font-serif italic text-white">Proberaum</h1>
            <div className="flex items-center gap-3">
               <span className="text-indigo-400 font-bold text-sm uppercase tracking-widest">Produktion:</span>
               <span className="text-white font-serif italic text-xl drop-shadow-[0_0_10px_rgba(99,102,241,0.3)]">"Bis das der Tod uns Scheidet"</span>
            </div>
          </div>
          <div className="hidden md:flex gap-4">
             <Card className="px-6 py-3 bg-slate-800/20 border-rose-500/20 flex items-center gap-3">
                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                <span className="text-rose-500 font-black text-xl">{globalStats.currentStreak} Tage</span>
             </Card>
          </div>
        </header>

        {/* Action Hero */}
        {recentDocument ? (
          <section>
            <h2 className="text-xs uppercase tracking-[0.3em] font-black text-slate-500 mb-6 flex items-center gap-2">
              <History className="w-4 h-4" /> Zuletzt geübt
            </h2>
            <Card 
              className="p-10 bg-indigo-600 border-none shadow-2xl shadow-indigo-600/20 relative overflow-hidden group"
              onClick={() => startQuiz(recentDocument.id)}
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl group-hover:scale-125 transition-transform duration-700"></div>
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                <div className="space-y-4">
                  <h3 className="text-4xl font-serif italic text-white">{recentDocument.title}</h3>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2 text-indigo-100/70 text-sm font-bold">
                       <Target className="w-4 h-4" /> 
                       <span>{cueCards.filter(c => c.documentId === recentDocument.id).length} Cues</span>
                    </div>
                    <div className="flex items-center gap-2 text-indigo-100/70 text-sm font-bold">
                       <TrendingUp className="w-4 h-4" /> 
                       <span>{Math.round((stats.filter(s => {
                          const cue = cueCards.find(c => c.id === s.cueCardId);
                          return cue && cue.documentId === recentDocument.id && s.streak >= 3;
                       }).length / Math.max(1, cueCards.filter(c => c.documentId === recentDocument.id).length)) * 100)}% Gelernt</span>
                    </div>
                  </div>
                </div>
                <Button variant="secondary" size="lg" className="bg-white text-indigo-600 border-none hover:bg-indigo-50 h-16 rounded-2xl px-12 text-xl">
                  <Play className="w-6 h-6 mr-3 fill-indigo-600" /> Jetzt Proben
                </Button>
              </div>
            </Card>
          </section>
        ) : (
          <Card className="p-20 text-center border-dashed border-2 border-slate-800 bg-transparent">
             <p className="text-slate-500 text-xl font-serif italic mb-6">Noch keine Skripte im Proberaum.</p>
             <Button onClick={() => setCurrentView(View.LIBRARY)}>Zur Bibliothek gehen</Button>
          </Card>
        )}

        {/* Global Performance Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <Card className="p-8 bg-slate-900/50 border-slate-800">
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">Gesamtfortschritt</p>
              <div className="flex items-end gap-3">
                 <span className="text-5xl font-black text-white">{globalStats.masteredCues}</span>
                 <span className="text-slate-600 font-bold mb-1">/ {globalStats.totalCues} Cues</span>
              </div>
              <div className="w-full h-1.5 bg-slate-800 rounded-full mt-6 overflow-hidden">
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${(globalStats.masteredCues / Math.max(1, globalStats.totalCues)) * 100}%` }}></div>
              </div>
           </Card>
           <Card className="p-8 bg-slate-900/50 border-slate-800">
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">Genauigkeit</p>
              <span className="text-5xl font-black text-white">{Math.round(globalStats.averageScore)}%</span>
              <p className="text-xs text-slate-600 mt-4 font-bold flex items-center gap-1"><Sparkles className="w-3 h-3" /> KI-Feedback</p>
           </Card>
           <Card className="p-8 bg-slate-900/50 border-slate-800">
              <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest mb-4">Training Heute</p>
              <span className="text-5xl font-black text-white">{stats.filter(s => new Date(s.lastReviewedAt).toDateString() === new Date().toDateString()).length}</span>
              <p className="text-xs text-slate-600 mt-4 font-bold">Wiederholte Cues</p>
           </Card>
        </section>
      </div>
    );
  };

  // BIBLIOTHEK: Fokus auf Verwaltung, Archivierung und Setup
  const renderLibrary = () => {
    return (
      <div className="space-y-12 animate-in fade-in duration-700">
        <header className="flex justify-between items-end">
          <div className="space-y-1">
            <h1 className="text-5xl font-bold tracking-tighter font-serif italic text-white">Bibliothek</h1>
            <p className="text-slate-400 text-lg">Archiv deiner Rollen.</p>
          </div>
          <Button size="lg" onClick={() => fileInputRef.current?.click()} isLoading={isImporting} className="h-16 rounded-2xl px-8">
            <Plus className="w-5 h-5 mr-3" /> Importieren
          </Button>
        </header>

        <div className="flex flex-col md:flex-row gap-6 mb-8">
          <div className="flex-1 relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Bibliothek durchsuchen..." 
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-indigo-500 outline-none text-white transition-all shadow-inner" 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {documents.filter(d => d.title.toLowerCase().includes(searchTerm.toLowerCase())).map(doc => {
            const docCues = cueCards.filter(c => c.documentId === doc.id);
            const cueCount = docCues.length;
            const totalBlocks = doc.blocks.length;
            const mastered = stats.filter(s => {
              const cue = cueCards.find(c => c.id === s.cueCardId);
              return cue && cue.documentId === doc.id && s.streak >= 3;
            }).length;

            const prepPercent = totalBlocks > 0 ? Math.round((cueCount / totalBlocks) * 100) : 0;
            const masteryPercent = cueCount > 0 ? Math.round((mastered / cueCount) * 100) : 0;
            
            return (
              <Card 
                key={doc.id} 
                className="group bg-slate-900/40 border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col h-full"
              >
                <div className="p-8 flex-1">
                   <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={(e) => { e.stopPropagation(); setSelectedDocId(doc.id); setCurrentView(View.DOC_VIEWER); }} className="p-2 text-slate-600 hover:text-white transition-colors" title="Skript bearbeiten">
                           <Settings2 className="w-5 h-5" />
                        </button>
                      </div>
                   </div>
                   <h3 className="text-2xl font-bold text-white mb-2 line-clamp-1">{doc.title}</h3>
                   <div className="flex items-center gap-4 text-xs text-slate-500 font-bold mb-8">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(doc.importedAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> {totalBlocks} Blöcke</span>
                   </div>
                   
                   <div className="space-y-6 pt-6 border-t border-slate-800/50">
                      {/* Preparation Status - Renamed to Cue Anteil */}
                      <div className="space-y-2">
                         <div className="flex justify-between items-end text-[10px] uppercase font-black tracking-widest text-slate-500">
                            <span>Cue Anteil</span>
                            <span className="text-indigo-400">{prepPercent}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${prepPercent}%` }}></div>
                         </div>
                      </div>

                      {/* Mastery Status */}
                      <div className="space-y-2">
                         <div className="flex justify-between items-end text-[10px] uppercase font-black tracking-widest text-slate-500">
                            <span>Lernfortschritt</span>
                            <span className="text-emerald-500">{masteryPercent}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${masteryPercent}%` }}></div>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex gap-2">
                   <Button variant="secondary" className="flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-black" onClick={() => { setSelectedDocId(doc.id); setCurrentView(View.DOC_VIEWER); }}>
                      Editieren
                   </Button>
                   <Button className="flex-1 h-12 rounded-xl text-xs uppercase tracking-widest font-black" onClick={() => startQuiz(doc.id)} disabled={cueCount === 0}>
                      Proben
                   </Button>
                </div>
              </Card>
            );
          })}
        </section>
      </div>
    );
  };

  const renderDocViewer = () => {
    const doc = documents.find(d => d.id === selectedDocId);
    if (!doc) return null;
    const docCues = cueCards.filter(c => c.documentId === doc.id);

    return (
      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-slate-800/50 pb-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setCurrentView(View.LIBRARY)} className="p-3 hover:bg-slate-800 rounded-2xl transition-all group"><ArrowLeft className="w-8 h-8 text-slate-500 group-hover:text-white" /></button>
            <h2 className="text-4xl font-serif italic text-white tracking-tight">{doc.title}</h2>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" size="md" onClick={() => setPendingDeletion({ id: doc.id, type: 'doc' })} className="border-rose-900/30 text-rose-500 hover:bg-rose-500/10 rounded-2xl">Löschen</Button>
            <Button size="md" onClick={() => startQuiz(doc.id)} disabled={docCues.length === 0} className="rounded-2xl"><Play className="w-5 h-5 mr-2" /> Probe starten</Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3">
            <Card className="p-10 md:p-16 font-serif leading-relaxed text-2xl bg-slate-900/30 border-slate-800 shadow-inner rounded-[48px] min-h-[80vh]">
              {doc.blocks.map(block => {
                const cue = docCues.find(c => c.textBlockId === block.id);
                const isMastered = stats.find(s => s.cueCardId === cue?.id)?.streak >= 3;
                return (
                  <div key={block.id} className="mb-12 relative group">
                    <div className={`p-8 rounded-3xl transition-all duration-300 border-l-4 ${cue ? 'bg-indigo-500/5 border-indigo-600' : 'hover:bg-slate-800/20 border-transparent'}`}>
                      <p className="text-slate-200 whitespace-pre-wrap">{block.text}</p>
                      {cue && (
                        <div className="mt-6 flex items-center gap-4">
                          <span className="text-[10px] uppercase font-black text-indigo-400 bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">CUE: {cue.cueWord}</span>
                          {isMastered && <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 text-[10px] font-black uppercase"><CheckCircle className="w-3.5 h-3.5" /> Gelernt</div>}
                        </div>
                      )}
                    </div>
                    <div className="absolute -right-4 top-4 opacity-0 group-hover:opacity-100 transition-all flex gap-2 z-10 scale-90">
                       {!cue ? <Button size="sm" onClick={() => { setCueEditorBlock(block); setManualCueWord(''); }} className="rounded-xl"><Plus className="w-4 h-4 mr-2" /> Cue</Button> : (
                         <div className="flex gap-2 bg-slate-900 p-1.5 rounded-2xl border border-slate-700 shadow-2xl">
                            <Button size="sm" variant="secondary" onClick={() => { setCueEditorBlock(block); setManualCueWord(cue.cueWord); }} className="rounded-xl">Edit</Button>
                            <Button size="sm" variant="danger" onClick={() => setPendingDeletion({ id: cue.id, type: 'cue' })} className="rounded-xl"><Trash2 className="w-4 h-4" /></Button>
                         </div>
                       )}
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>
          <aside className="space-y-8">
            <div className="sticky top-10 space-y-8">
               <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input type="text" placeholder="Cues filtern..." className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-indigo-500 outline-none text-white transition-all shadow-inner" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
                {docCues.filter(c => c.cueWord.toLowerCase().includes(searchTerm.toLowerCase())).map(cue => {
                  const mastered = stats.find(s => s.cueCardId === cue.id)?.streak >= 3;
                  return (
                    <Card key={cue.id} className={`p-5 border-l-4 transition-all ${mastered ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-indigo-600 bg-slate-900/50'}`}>
                      <p className={`text-sm font-black uppercase tracking-tight ${mastered ? 'text-emerald-400' : 'text-indigo-400'}`}>{cue.cueWord}</p>
                      <p className="text-[11px] text-slate-500 mt-2 truncate italic opacity-60">"{cue.expectedText.substring(0, 45)}..."</p>
                    </Card>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  };

  const renderQuiz = () => {
    if (quizFinished) {
      return (
        <div className="max-w-2xl mx-auto text-center space-y-12 pt-20 animate-in zoom-in-95 duration-500">
          <div className="inline-block p-12 bg-indigo-600/10 rounded-full shadow-3xl shadow-indigo-600/20"><Trophy className="w-24 h-24 text-indigo-400" /></div>
          <div className="space-y-4"><h2 className="text-6xl font-serif italic text-white tracking-tight">Vorhang auf!</h2><p className="text-slate-400 text-2xl">Alle {quizCues.length} Cues dieser Szene durchgespielt.</p></div>
          <Button size="lg" onClick={() => setCurrentView(View.DASHBOARD)} className="w-full max-w-xs h-20 text-2xl rounded-3xl">Proberaum verlassen</Button>
        </div>
      );
    }
    const cue = quizCues[quizIndex];
    if (!cue) return null;
    const progress = ((quizIndex) / quizCues.length) * 100;

    return (
      <div className="max-w-4xl mx-auto space-y-12 pt-6">
        <div className="fixed top-0 left-0 w-full h-1 bg-slate-800 z-[1001]"><div className="h-full bg-indigo-500 transition-all duration-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${progress}%` }} /></div>
        <div className="flex justify-between items-center px-4">
          <Button variant="outline" size="sm" onClick={() => setCurrentView(View.DASHBOARD)} className="border-slate-800 text-slate-500 rounded-xl">Abbrechen</Button>
          <div className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-800 border border-slate-700 px-6 py-2 rounded-full">Cue {quizIndex + 1} / {quizCues.length}</div>
        </div>
        <Card className="p-20 text-center relative overflow-hidden bg-slate-900 border-indigo-500/10 shadow-3xl rounded-[64px]">
          <h2 className="text-[10px] uppercase tracking-[0.5em] text-indigo-400/50 font-black mb-12">Dein Stichwort</h2>
          <div className="flex flex-col items-center gap-8 mb-24">
            <p className="text-7xl md:text-8xl font-serif italic text-white tracking-tight leading-tight">"{cue.cueWord}"</p>
          </div>
          <div className="space-y-10 max-w-2xl mx-auto">
            <textarea autoFocus className="w-full bg-slate-800/30 border-2 border-slate-700/50 rounded-[32px] p-10 text-3xl font-serif italic text-white focus:border-indigo-600 outline-none transition-all min-h-[300px] shadow-inner placeholder:text-slate-700" placeholder="Deine Zeilen..." value={userInput} onChange={(e) => setUserInput(e.target.value)} disabled={!!feedback} />
            <div className="flex justify-center gap-6 text-[10px] text-slate-500 uppercase font-bold"><div className="flex items-center gap-2"><Keyboard className="w-3 h-3" /> <span>STRG + ENTER zum Prüfen</span></div></div>
            {!feedback ? (
              <div className="flex gap-6">
                <Button className="flex-1 h-20 rounded-3xl text-2xl font-bold shadow-2xl shadow-indigo-600/30" onClick={handleEvaluate} isLoading={isEvaluating} disabled={!userInput.trim()}>Prüfen</Button>
                <Button variant="outline" className={`h-20 w-20 rounded-3xl border-slate-700 ${showHint ? 'text-indigo-400 border-indigo-500/30' : 'text-slate-500'}`} onClick={() => setShowHint(!showHint)}><BrainCircuit className="w-8 h-8" /></Button>
              </div>
            ) : (
              <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                <Card className={`p-10 border-l-[12px] rounded-[32px] text-left shadow-3xl ${feedback.score >= 0.8 ? 'border-l-emerald-500 bg-emerald-500/5' : 'border-l-amber-500 bg-amber-500/5'}`}>
                   <p className="text-3xl font-black text-white mb-4">{feedback.score >= 0.8 ? 'Applaus!' : 'Fast perfekt...'}</p>
                   <p className="text-slate-400 text-xl leading-relaxed mb-10">{feedback.text}</p>
                   <div className="p-8 bg-slate-800/50 rounded-3xl border border-slate-700/30">
                      <p className="text-[10px] text-slate-500 mb-4 font-black uppercase tracking-widest">Originaltext:</p>
                      <p className="font-serif italic text-white text-2xl whitespace-pre-wrap leading-relaxed">
                        {showHint ? <span className="text-indigo-400">{cue.expectedText.slice(0, 5)}...</span> : cue.expectedText}
                      </p>
                   </div>
                </Card>
                <Button className="w-full h-20 rounded-3xl text-2xl font-bold" onClick={() => { if (quizIndex < quizCues.length - 1) { setQuizIndex(prev => prev + 1); setFeedback(null); setUserInput(''); setShowHint(false); } else { setQuizFinished(true); } }}>{quizIndex < quizCues.length - 1 ? 'Nächster Cue' : 'Probe abschließen'}</Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  };

  const renderTutorial = () => {
    const steps = [
      {
        title: "Willkommen auf der Bühne",
        text: "CueLine verwandelt deine Skripte in interaktive Lernpartner. Wir nutzen modernste KI, um dich auf deine Premiere vorzubereiten.",
        icon: Sparkles,
        color: "text-indigo-400"
      },
      {
        title: "Intelligenter Import",
        text: "Lade ein PDF hoch. Unsere KI entfernt Seitenzahlen und Ränder und extrahiert nur den reinen Dialog für dich.",
        icon: Upload,
        color: "text-amber-400"
      },
      {
        title: "Cues festlegen",
        text: "Wähle einen Textblock und lege dein Stichwort (Cue) fest. Die KI schlägt dir sogar passende Wörter vor!",
        icon: BrainCircuit,
        color: "text-indigo-400"
      },
      {
        title: "Meisterschaft",
        text: "Dein Proben-Streak zeigt dir, wie konsequent du bleibst. Tägliches Training baut das stärkste Muskelgedächtnis auf.",
        icon: Flame,
        color: "text-rose-400"
      }
    ];
    const currentStep = steps[tutorialStep];

    return (
      <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-500">
        <Card className="max-w-xl w-full p-12 border-indigo-500/30 rounded-[48px] shadow-3xl bg-slate-900 relative">
          <button onClick={() => { localStorage.setItem('cl_tutorial_seen', 'true'); setShowTutorial(false); }} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
          <div className="flex flex-col items-center text-center space-y-8">
            <div className={`p-8 rounded-3xl bg-slate-800 shadow-inner ${currentStep.color}`}><currentStep.icon className="w-16 h-16" /></div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-white tracking-tight">{currentStep.title}</h2>
              <p className="text-slate-400 text-lg leading-relaxed">{currentStep.text}</p>
            </div>
            <div className="flex gap-2">
              {steps.map((_, i) => <div key={i} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === tutorialStep ? 'bg-indigo-500 w-8' : 'bg-slate-700'}`} />)}
            </div>
            <div className="flex gap-4 w-full pt-4">
              {tutorialStep > 0 && <Button variant="secondary" className="flex-1 h-14" onClick={() => setTutorialStep(prev => prev - 1)}><ChevronLeft className="w-5 h-5 mr-2" /> Zurück</Button>}
              <Button className="flex-1 h-14" onClick={() => { if (tutorialStep < steps.length - 1) setTutorialStep(prev => prev + 1); else { localStorage.setItem('cl_tutorial_seen', 'true'); setShowTutorial(false); } }}>{tutorialStep < steps.length - 1 ? "Weiter" : "Loslegen"}</Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 flex selection:bg-indigo-500/40">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="application/pdf" className="hidden" />
      {showTutorial && renderTutorial()}

      {/* Overlays */}
      {pendingDeletion && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[500] flex items-center justify-center p-6 animate-in fade-in">
          <Card className="max-w-md w-full p-10 border-slate-800 shadow-3xl bg-slate-900 rounded-[32px]">
            <div className="flex items-center gap-6 mb-8"><div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertTriangle className="w-10 h-10" /></div><h2 className="text-3xl font-bold text-white">Löschen?</h2></div>
            <p className="text-slate-400 mb-12 text-lg leading-relaxed">Alle Lernfortschritte für dieses Element werden unwiderruflich gelöscht.</p>
            <div className="flex gap-4"><Button variant="danger" className="flex-1 font-bold h-14 rounded-2xl" onClick={confirmDelete}>Löschen</Button><Button variant="secondary" className="flex-1 font-bold h-14 rounded-2xl" onClick={() => setPendingDeletion(null)}>Abbrechen</Button></div>
          </Card>
        </div>
      )}

      {cueEditorBlock && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-3xl z-[400] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <Card className="max-w-2xl w-full p-12 border-indigo-500/30 rounded-[56px] shadow-3xl bg-slate-900">
            <div className="space-y-10">
              <div className="flex items-center gap-6"><div className="p-4 bg-indigo-500/20 rounded-3xl text-indigo-400"><BrainCircuit className="w-10 h-10" /></div><h2 className="text-4xl font-bold text-white tracking-tight">Cue definieren</h2></div>
              <div className="p-10 bg-slate-800/30 rounded-[32px] border border-slate-700/50 text-slate-300 text-2xl font-serif italic max-h-56 overflow-y-auto leading-relaxed shadow-inner">"{cueEditorBlock.text}"</div>
              <div className="space-y-6">
                <div className="flex justify-between items-end"><label className="text-[10px] uppercase font-black text-slate-500 tracking-[0.4em]">Dein Stichwort</label><div className="flex items-center gap-2 text-[10px] text-indigo-400 font-bold"><Wand2 className="w-3 h-3" /> KI-Vorschläge</div></div>
                <input autoFocus type="text" placeholder="Trigger-Wort..." className="w-full bg-slate-800 border-2 border-slate-700 rounded-2xl px-8 py-6 text-white focus:border-indigo-600 outline-none transition-all text-2xl" value={manualCueWord} onChange={(e) => setManualCueWord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveManualCue()} />
                <div className="flex flex-wrap gap-2 pt-2 min-h-[40px]">
                  {isSuggesting ? <div className="animate-pulse text-xs text-slate-600 font-bold">KI analysiert...</div> : aiSuggestions.map(s => <button key={s} onClick={() => setManualCueWord(s)} className="px-4 py-2 bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 text-slate-400 text-xs font-bold rounded-xl border border-slate-700 transition-all">{s}</button>)}
                </div>
              </div>
              <div className="flex gap-4 pt-4"><Button className="flex-1 h-20 rounded-3xl text-2xl" onClick={saveManualCue} disabled={!manualCueWord.trim()}>Speichern</Button><Button variant="secondary" className="h-20 px-12 rounded-3xl text-xl" onClick={() => { setCueEditorBlock(null); setAiSuggestions([]); }}>Abbrechen</Button></div>
            </div>
          </Card>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="fixed left-0 top-0 h-full w-24 md:w-80 bg-slate-900 border-r border-slate-800/50 flex flex-col z-[300] shadow-2xl">
        <div className="p-12 flex items-center gap-5">
          <div className="w-12 h-12 bg-indigo-600 rounded-[18px] flex items-center justify-center shadow-xl shadow-indigo-600/30"><Play className="w-6 h-6 text-white" fill="white" /></div>
          <span className="text-3xl font-black text-white hidden md:block tracking-tighter uppercase font-serif italic">CueLine</span>
        </div>
        <nav className="flex-1 px-8 space-y-4">
          {[
            { id: View.DASHBOARD, label: 'Proberaum', icon: BarChart3 },
            { id: View.LIBRARY, label: 'Bibliothek', icon: BookOpen },
          ].map((item) => (
            <button key={item.id} onClick={() => setCurrentView(item.id)} className={`w-full flex items-center gap-6 p-5 rounded-3xl transition-all ${currentView === item.id ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 translate-x-1' : 'text-slate-600 hover:bg-slate-800 hover:text-slate-300'}`}>
              <item.icon className="w-6 h-6" /><span className="font-black hidden md:block uppercase tracking-[0.2em] text-[10px]">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-8 mt-auto border-t border-slate-800/30">
          <button onClick={() => { setTutorialStep(0); setShowTutorial(true); }} className="w-full flex items-center gap-6 p-5 rounded-3xl text-slate-600 hover:bg-indigo-600/10 hover:text-indigo-400 transition-all group"><HelpCircle className="w-6 h-6 group-hover:rotate-12 transition-transform" /><span className="font-black hidden md:block uppercase tracking-[0.2em] text-[10px]">Tour / Hilfe</span></button>
        </div>
      </aside>

      <main className="flex-1 ml-24 md:ml-80 p-12 md:p-20 min-h-screen overflow-y-auto bg-[#0f172a] custom-scrollbar">
        {currentView === View.DASHBOARD && renderDashboard()}
        {currentView === View.LIBRARY && renderLibrary()}
        {currentView === View.DOC_VIEWER && renderDocViewer()}
        {currentView === View.QUIZ && renderQuiz()}
      </main>

      {/* AI Loader */}
      {isImporting && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[700] flex flex-col items-center justify-center space-y-12 animate-in fade-in">
           <div className="relative"><div className="w-32 h-32 border-4 border-indigo-600/20 rounded-full"></div><div className="w-32 h-32 border-t-4 border-indigo-600 rounded-full animate-spin absolute top-0 left-0 shadow-[0_0_20px_rgba(79,70,229,0.5)]"></div></div>
           <div className="text-center space-y-4"><h2 className="text-4xl font-bold text-white tracking-tight">{importStatus}</h2><p className="text-indigo-500 uppercase tracking-[0.4em] text-[10px] font-black animate-pulse">Neural Engine wird vorbereitet</p></div>
        </div>
      )}
    </div>
  );
};

export default App;
