import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  UploadCloud, 
  Camera, 
  Image as ImageIcon, 
  Volume2, 
  VolumeX, 
  CheckCircle2, 
  AlertTriangle, 
  Lightbulb, 
  RefreshCw, 
  Star, 
  Trash2, 
  Copy, 
  Share2, 
  HelpCircle, 
  ArrowRight, 
  Check, 
  X, 
  MessageSquare, 
  Send, 
  BookOpen, 
  History, 
  ZoomIn, 
  ChevronDown, 
  ChevronUp,
  Brain,
  GraduationCap,
  RotateCw,
  Target,
  Compass,
  ListChecks,
  CheckCheck,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  solveQuestionWithAi, 
  QuestionSolution, 
  HistoryItem, 
  getSavedQuestionHistory, 
  saveQuestionToHistory, 
  deleteQuestionFromHistory, 
  toggleStarQuestion, 
  playAudioSpeech, 
  stopAudioSpeech, 
  isAudioSpeechPlaying,
  SAMPLE_QUESTIONS 
} from '../lib/questionSolverService';
import { extractErrorMessage } from '../lib/utils';

const GRADE_OPTIONS = [
  '5. Sınıf',
  '6. Sınıf',
  '7. Sınıf',
  '8. Sınıf (LGS)',
  '9. Sınıf',
  '10. Sınıf',
  '11. Sınıf',
  '12. Sınıf (YKS / TYT / AYT)',
  'Mezun (YKS)',
  'KPSS / DGS'
];

const SUBJECT_OPTIONS = [
  'Otomatik Tespit',
  'Matematik',
  'Fen Bilimleri',
  'Türkçe',
  'Fizik',
  'Kimya',
  'Biyoloji',
  'Geometri',
  'T.C. İnkılap Tarihi',
  'Tarih',
  'Coğrafya',
  'Felsefe',
  'İngilizce',
  'Din Kültürü'
];

export function QuestionSolver() {
  const currentStudentId = localStorage.getItem('currentUserId') || undefined;
  const currentStudentName = localStorage.getItem('currentUserName') || 'Öğrenci';
  
  // Selected Grade & Subject
  const [selectedGrade, setSelectedGrade] = useState<string>('8. Sınıf (LGS)');
  const [selectedSubject, setSelectedSubject] = useState<string>('Otomatik Tespit');
  const [studentNote, setStudentNote] = useState<string>('');

  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [imageRotation, setImageRotation] = useState<number>(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);

  // Camera Capture Modal State
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Solving & Results State
  const [isSolving, setIsSolving] = useState<boolean>(false);
  const [solvingStage, setSolvingStage] = useState<string>('Görsel taranıyor...');
  const [solution, setSolution] = useState<QuestionSolution | null>(null);
  const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);
  const [isStarred, setIsStarred] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Audio Speech State
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Follow-up Q&A
  const [followUpQuestion, setFollowUpQuestion] = useState<string>('');
  const [isAskingFollowUp, setIsAskingFollowUp] = useState<boolean>(false);
  const [followUpHistory, setFollowUpHistory] = useState<Array<{ question: string; answer: string }>>([]);

  // Practice Question Reveal State
  const [showPracticeAnswer, setShowPracticeAnswer] = useState<boolean>(false);

  // History Tab & Sidebar
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState<boolean>(false);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load history on mount
  useEffect(() => {
    const list = getSavedQuestionHistory(currentStudentId);
    setHistoryItems(list);

    // Auto-detect student grade from localStorage if exists
    try {
      const studentData = localStorage.getItem('currentStudent');
      if (studentData) {
        const parsed = JSON.parse(studentData);
        if (parsed.grade) {
          const matched = GRADE_OPTIONS.find(g => g.toLowerCase().includes(parsed.grade.toLowerCase()));
          if (matched) setSelectedGrade(matched);
        }
      }
    } catch {
      // ignore
    }

    // Global Paste Listener (Ctrl+V or Cmd+V to paste screenshot)
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
              const reader = new FileReader();
              reader.onload = (event) => {
                if (event.target?.result) {
                  setSelectedImage(event.target.result as string);
                  setImageMimeType(blob.type);
                  setImageRotation(0);
                }
              };
              reader.readAsDataURL(blob);
              e.preventDefault();
              break;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
      stopAudioSpeech();
      stopCamera();
    };
  }, [currentStudentId]);

  // Handle Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Lütfen geçerli bir resim dosyası seçin (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSelectedImage(e.target.result as string);
        setImageMimeType(file.type);
        setImageRotation(0);
        setErrorMessage(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera Management
  const startCamera = async (facing: 'environment' | 'user') => {
    stopCamera();
    setIsCameraOpen(true);
    setCameraFacing(facing);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error('Camera access error', err);
      setErrorMessage('Kamera erişimine izin verilmedi veya kamera bulunamadı.');
      setIsCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setSelectedImage(dataUrl);
      setImageMimeType('image/jpeg');
      setImageRotation(0);
      stopCamera();
    }
  };

  // Optimize, compress & apply physical rotation to image before sending to AI
  const optimizeImageForAi = async (
    sourceUrlOrData: string,
    rotationDegrees: number = 0
  ): Promise<{ dataUrl: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        try {
          const isRotated90or270 = Math.abs(rotationDegrees % 180) === 90;
          const origWidth = img.naturalWidth || img.width || 800;
          const origHeight = img.naturalHeight || img.height || 600;

          // Target max dimension 1600px for optimal speed & sharp OCR
          const MAX_DIM = 1600;
          let scale = 1;
          if (Math.max(origWidth, origHeight) > MAX_DIM) {
            scale = MAX_DIM / Math.max(origWidth, origHeight);
          }

          const scaledW = Math.round(origWidth * scale);
          const scaledH = Math.round(origHeight * scale);

          const canvas = document.createElement('canvas');
          canvas.width = isRotated90or270 ? scaledH : scaledW;
          canvas.height = isRotated90or270 ? scaledW : scaledH;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ dataUrl: sourceUrlOrData, mimeType: 'image/jpeg' });
            return;
          }

          // Pure white background for maximum contrast (handles PNG transparency)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Apply physical rotation onto pixel data
          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotationDegrees * Math.PI) / 180);
          ctx.drawImage(img, -scaledW / 2, -scaledH / 2, scaledW, scaledH);
          ctx.restore();

          const jpegUrl = canvas.toDataURL('image/jpeg', 0.88);
          resolve({ dataUrl: jpegUrl, mimeType: 'image/jpeg' });
        } catch (err) {
          console.warn('Canvas optimization fallback:', err);
          resolve({ dataUrl: sourceUrlOrData, mimeType: 'image/jpeg' });
        }
      };

      img.onerror = () => {
        resolve({ dataUrl: sourceUrlOrData, mimeType: 'image/jpeg' });
      };

      img.src = sourceUrlOrData;
    });
  };

  // Solve Question Handler
  const handleSolveQuestion = async (customImage?: string) => {
    const targetImage = customImage || selectedImage;
    if (!targetImage) {
      setErrorMessage('Lütfen önce çözülmesini istediğin sorunun fotoğrafını yükle veya çek.');
      return;
    }

    setIsSolving(true);
    setErrorMessage(null);
    setSolution(null);
    stopAudioSpeech();
    setIsPlayingAudio(false);
    setShowPracticeAnswer(false);
    setFollowUpHistory([]);

    // Staged animated progress messages
    setSolvingStage('Görsel yapay zeka tarafından taranıyor...');
    const t1 = setTimeout(() => setSolvingStage('Soru metni ve kazanım analiz ediliyor...'), 1200);
    const t2 = setTimeout(() => setSolvingStage('Öğrenci seviyesine uygun, sade adımlar oluşturuluyor...'), 2600);
    const t3 = setTimeout(() => setSolvingStage('Altın püf noktaları ve sesli anlatım hazırlanıyor...'), 4000);

    try {
      // Optimize & apply physical rotation before sending to AI
      let preparedImage = targetImage;
      let preparedMime = imageMimeType;

      try {
        const optimized = await optimizeImageForAi(targetImage, imageRotation);
        preparedImage = optimized.dataUrl;
        preparedMime = optimized.mimeType;
      } catch {
        // Fallback to original
      }

      const result = await solveQuestionWithAi({
        image: preparedImage,
        mimeType: preparedMime,
        studentGrade: selectedGrade,
        subjectHint: selectedSubject === 'Otomatik Tespit' ? undefined : selectedSubject,
        studentQuestion: studentNote.trim() || undefined
      });

      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);

      setSolution(result);

      // Auto save to history
      const saved = saveQuestionToHistory({
        studentId: currentStudentId,
        imagePreview: targetImage,
        grade: selectedGrade,
        subject: result.subject || selectedSubject,
        studentQuestion: studentNote.trim() || undefined,
        solution: result
      });
      setCurrentHistoryId(saved.id);
      setIsStarred(false);
      setHistoryItems(getSavedQuestionHistory(currentStudentId));

      // Scroll smoothly to solution
      setTimeout(() => {
        const el = document.getElementById('solution-view-card');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 200);
    } catch (err: any) {
      console.error('Solve error', err);
      const safeMessage = extractErrorMessage(err, 'Soru çözülürken bir hata oluştu. Lütfen tekrar deneyin.');
      setErrorMessage(safeMessage);
    } finally {
      setIsSolving(false);
    }
  };

  // Follow-up Question Handler
  const handleAskFollowUp = async () => {
    if (!followUpQuestion.trim() || !solution) return;
    setIsAskingFollowUp(true);

    try {
      const followUpPrompt = `Soru Bağlamı: ${solution.questionText}. 
Öğrencinin Anlamadığı Yer: "${followUpQuestion}". 
Lütfen ${selectedGrade} seviyesindeki bir çocuğun en kolay anlayacağı, son derece sıcak ve samimi dille bu soruyu açıkla.`;

      const result = await solveQuestionWithAi({
        studentGrade: selectedGrade,
        subjectHint: solution.subject,
        studentQuestion: followUpQuestion,
        followUpContext: solution
      });

      setFollowUpHistory(prev => [
        ...prev, 
        { 
          question: followUpQuestion, 
          answer: result.studentSummary || result.finalAnswer || result.steps?.[0]?.explanation || 'Bu adımda sorunun mantığını sadeleştirdik.' 
        }
      ]);
      setFollowUpQuestion('');
    } catch (err: any) {
      console.error('Follow-up error', err);
      const safeMessage = extractErrorMessage(err, 'Sorunuz yanıtlanırken bir hata oluştu. Lütfen tekrar deneyin.');
      setFollowUpHistory(prev => [
        ...prev,
        {
          question: followUpQuestion,
          answer: safeMessage
        }
      ]);
    } finally {
      setIsAskingFollowUp(false);
    }
  };

  // Toggle Audio Speech
  const handleToggleAudio = () => {
    if (isPlayingAudio) {
      stopAudioSpeech();
      setIsPlayingAudio(false);
    } else if (solution) {
      const speechText = solution.audioSpeechText || 
        `${solution.studentSummary}. ${solution.steps.map(s => `${s.title}: ${s.explanation}`).join('. ')}. ${solution.keyTip}`;
      
      const success = playAudioSpeech(
        speechText,
        () => setIsPlayingAudio(true),
        () => setIsPlayingAudio(false),
        () => setIsPlayingAudio(false)
      );
      if (!success) {
        setErrorMessage('Tarayıcınız sesli dinleme özelliğini desteklemiyor.');
      }
    }
  };

  // Star / Favorite Question
  const handleToggleStar = () => {
    if (currentHistoryId) {
      const next = toggleStarQuestion(currentHistoryId);
      setIsStarred(next);
      setHistoryItems(getSavedQuestionHistory(currentStudentId));
    }
  };

  // Copy Solution to Clipboard
  const handleCopySolution = () => {
    if (!solution) return;
    const text = `📚 ${solution.subject} - ${solution.topic}
🎯 Doğru Cevap: ${solution.correctOption}

💡 Soru Özeti:
${solution.studentSummary}

📝 Adım Adım Çözüm:
${solution.steps.map(s => `${s.title}\n${s.explanation}${s.mathOrDetail ? `\n> ${s.mathOrDetail}` : ''}`).join('\n\n')}

✨ Sonuç: ${solution.finalAnswer}
🔑 Altın Püf Noktası: ${solution.keyTip}
⚠️ Dikkat Edilecek Tuzak: ${solution.commonMistake}

Köksal Akademi AI Soru Çözücü ile çözüldü.`;

    navigator.clipboard.writeText(text);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2500);
  };

  // Load Preset Sample Question
  const handleLoadSample = (sample: typeof SAMPLE_QUESTIONS[0]) => {
    setSelectedGrade(sample.grade);
    setSelectedSubject(sample.subject);
    setSelectedImage(sample.image);
    setImageMimeType('image/svg+xml');
    setStudentNote(sample.note);
    setImageRotation(0);
    handleSolveQuestion(sample.image);
  };

  // Open Past Question from History
  const handleOpenHistoryItem = (item: HistoryItem) => {
    setSelectedGrade(item.grade);
    setSelectedSubject(item.subject);
    setSelectedImage(item.imagePreview || null);
    setStudentNote(item.studentQuestion || '');
    setSolution(item.solution);
    setCurrentHistoryId(item.id);
    setIsStarred(!!item.starred);
    setIsHistoryDrawerOpen(false);
    stopAudioSpeech();
    setIsPlayingAudio(false);
    setShowPracticeAnswer(false);
    setFollowUpHistory([]);

    setTimeout(() => {
      const el = document.getElementById('solution-view-card');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-950 via-primary to-secondary p-6 sm:p-10 text-white shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-amber-300 text-xs font-black tracking-wide border border-white/20">
              <Sparkles className="w-3.5 h-3.5" />
              <span>YENİ BÖLÜM: YAPAY ZEKA SORU ÇÖZÜCÜ</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight font-manrope leading-tight">
              Yapamadığın Soruları Yükle, <br className="hidden sm:inline" />
              <span className="text-amber-300">Senin Diline Uygun</span> Şekilde Çözelim!
            </h1>
            <p className="text-sm sm:text-base text-white/80 font-medium leading-relaxed">
              Sorunun fotoğrafını çek veya yükle. Yapay zeka öğretmenimiz karmaşık terimlere boğmadan, adım adım, püf noktalarıyla ve <strong className="text-white">sesli anlatımla</strong> sorunu çözsün!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(true)}
              className="px-4 py-3 bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur-md border border-white/20 rounded-2xl text-xs sm:text-sm font-bold text-white transition-all flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <History className="w-4 h-4 text-amber-300" />
              <span>Çözülen Soru Geçmişim</span>
              {historyItems.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-400 text-indigo-950">
                  {historyItems.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Upload & Setup Card */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-6">
        
        {/* Grade & Subject Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-on-surface-variant mb-1.5 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-primary" /> Sınıf / Seviye
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
            >
              {GRADE_OPTIONS.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-on-surface-variant mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-secondary" /> Ders Branşı (İsteğe Bağlı)
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all cursor-pointer"
            >
              {SUBJECT_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div>
          <label className="block text-xs font-extrabold uppercase tracking-wider text-on-surface-variant mb-2 flex items-center gap-1.5">
            <ImageIcon className="w-4 h-4 text-emerald-600" /> Soru Görseli (Fotoğrafı Yükle, Çek veya Yapıştır)
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelected(e.target.files[0]);
              }
            }}
          />

          {!selectedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-4 ${
                isDragging 
                  ? 'border-primary bg-primary/5 scale-[1.01]' 
                  : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low/50 bg-surface-container-lowest'
              }`}
            >
              <div className="w-16 h-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                <UploadCloud className="w-8 h-8" />
              </div>
              
              <div className="space-y-1.5 max-w-md">
                <p className="text-base font-extrabold text-on-surface">
                  Sorunun fotoğrafını buraya sürükleyin veya <span className="text-primary underline">tıklayıp seçin</span>
                </p>
                <p className="text-xs text-on-surface-variant font-medium">
                  PNG, JPG, WEBP desteklenir. Ayrıca ekran görüntüsü alıp doğrudan <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high border text-[11px] font-bold">Ctrl+V</kbd> ile yapıştırabilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary/90 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <UploadCloud className="w-4 h-4" /> Dosya Seç
                </button>
                <button
                  type="button"
                  onClick={() => startCamera('environment')}
                  className="px-4 py-2.5 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary/90 transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <Camera className="w-4 h-4" /> Kameradan Çek
                </button>
              </div>
            </div>
          ) : (
            /* Image Preview Card */
            <div className="relative rounded-3xl border border-outline-variant/20 bg-surface-container-low p-4 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-outline-variant/10 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-on-surface">Soru Görseli Hazır</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setImageRotation((prev) => (prev + 90) % 360)}
                    className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-colors cursor-pointer"
                    title="Görseli Döndür"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsZoomModalOpen(true)}
                    className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-bold transition-colors cursor-pointer"
                    title="Büyük Gör"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setSolution(null);
                    }}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-colors cursor-pointer"
                    title="Görseli Kaldır"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview Image with rotation */}
              <div className="flex justify-center items-center max-h-[360px] overflow-hidden rounded-2xl bg-black/5 p-2">
                <img
                  src={selectedImage}
                  alt="Yüklenen Soru"
                  style={{ transform: `rotate(${imageRotation}deg)` }}
                  className="max-h-[340px] w-auto object-contain rounded-xl transition-transform"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-on-surface-variant font-medium pt-1">
                <span>Başka bir soru yüklemek için 'Kaldır' butonunu kullanabilirsiniz.</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary font-bold hover:underline cursor-pointer"
                >
                  Farklı Resim Seç
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student Special Note / Question */}
        <div className="space-y-2">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-on-surface-variant mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" /> Soruyla İlgili Öğretmene Özel Notun veya Sorun Var mı? (İsteğe Bağlı)
            </span>
            <span className="text-[11px] font-bold text-primary">Hedef Odaklı Çözüm</span>
          </label>
          <input
            type="text"
            value={studentNote}
            onChange={(e) => setStudentNote(e.target.value)}
            placeholder="Örn: 'Soru kökünde tam olarak ne istendiğini anlayamadım', 'İşlemleri satır satır göster'..."
            className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
          />
          {/* Quick Focus Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-bold text-on-surface-variant flex items-center gap-1">
              <Target className="w-3 h-3 text-primary" /> Hızlı İstek:
            </span>
            {[
              "🎯 Soruda ne istendiğini açıkla",
              "🔢 İşlemleri satır satır göster",
              "📋 Şıkları tek tek analiz et",
              "📐 Şekil/grafiği detaylı incele",
              "⚠️ Neden bu kuralı seçtik?"
            ].map((chip, chipIdx) => (
              <button
                key={chipIdx}
                type="button"
                onClick={() => setStudentNote((prev) => prev ? `${prev} - ${chip}` : chip)}
                className="px-2.5 py-1 rounded-lg bg-surface-container-high hover:bg-primary/10 hover:text-primary hover:border-primary/30 border border-outline-variant/15 text-[11px] font-semibold text-on-surface-variant transition-all cursor-pointer"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Sample Questions Bar */}
        <div className="p-4 rounded-2xl bg-surface-container-low/70 border border-outline-variant/10 space-y-2.5">
          <p className="text-xs font-black text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600" /> Örnek Sorularla Tek Tıkla Dene:
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleLoadSample(sample)}
                className="px-3 py-1.5 bg-white hover:bg-primary/10 hover:border-primary/40 border border-outline-variant/20 text-on-surface rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>{sample.title}</span>
                <ArrowRight className="w-3 h-3 text-primary" />
              </button>
            ))}
          </div>
        </div>

        {/* Error message with Retry & Demo Fallback Buttons */}
        {errorMessage && (
          <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 text-xs sm:text-sm font-semibold flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div className="space-y-0.5">
                <span className="font-bold text-rose-900 block sm:inline">
                  {extractErrorMessage(errorMessage, 'Soru çözülürken bir hata oluştu. Lütfen tekrar deneyin.')}
                </span>
                {(errorMessage.includes('GEMINI_API_KEY') || errorMessage.includes('API') || errorMessage.includes('anahtar')) && (
                  <p className="text-[11px] text-rose-700 font-medium">
                    İpucu: Sistemin nasıl çalıştığını görmek için aşağıdaki örnek çözümü doğrudan açabilirsiniz.
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
              <button
                type="button"
                onClick={() => handleLoadSample(SAMPLE_QUESTIONS[0])}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-rose-100/60 border border-rose-200 text-rose-800 font-bold transition-colors flex items-center justify-center gap-1.5 text-xs cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Örnek Çözümü Aç</span>
              </button>
              <button
                type="button"
                onClick={() => handleSolveQuestion()}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 text-xs cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tekrar Dene</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Action Button */}
        <div className="pt-2">
          <button
            type="button"
            disabled={!selectedImage || isSolving}
            onClick={() => handleSolveQuestion()}
            className={`w-full py-4 px-6 rounded-2xl text-base font-black tracking-wide text-white transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer ${
              !selectedImage || isSolving
                ? 'bg-primary/50 cursor-not-allowed opacity-75'
                : 'bg-primary hover:bg-primary/95 active:scale-[0.99] hover:shadow-lg'
            }`}
          >
            {isSolving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{solvingStage}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-300" />
                <span>Soruyu Yapay Zeka ile Çöz</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Solution Results Section */}
      {solution && (
        <div id="solution-view-card" className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Demo / API Key Notice Banner if applicable */}
          {(solution.isDemoFallback || solution.apiKeyMissing) && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-500/10 border border-amber-500/25 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start sm:items-center gap-3">
                <div className="p-2 bg-amber-500/20 rounded-xl text-amber-700 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-sm font-black text-amber-900">
                    Örnek Pedagojik Çözüm Modu
                  </h4>
                  <p className="text-xs text-amber-800/90 font-medium">
                    {solution.noticeMessage || 'Yapay Zeka API anahtarı sisteme tanımlanana kadar pedagojik örnek soru analizi ve çözüm adımları gösterilmektedir.'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-black px-3 py-1 bg-amber-200/80 rounded-full text-amber-900 shrink-0 border border-amber-300/50">
                Demo Modu
              </span>
            </div>
          )}

          {/* Solution Top Action Bar */}
          <div className="bg-surface-container-lowest rounded-3xl p-5 border border-outline-variant/10 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-primary/10 text-primary rounded-xl text-xs font-black uppercase tracking-wider">
                {solution.subject || 'Ders'}
              </span>
              <span className="px-3 py-1 bg-secondary/10 text-secondary rounded-xl text-xs font-black">
                {solution.topic || 'Kazanım'}
              </span>
              <span className="px-3 py-1 bg-surface-container-high text-on-surface-variant rounded-xl text-xs font-bold">
                {selectedGrade}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Text to Speech Button */}
              <button
                type="button"
                onClick={handleToggleAudio}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-xs ${
                  isPlayingAudio
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/40'
                }`}
                title="Çözümü Türkçe sesli olarak dinle"
              >
                {isPlayingAudio ? (
                  <>
                    <VolumeX className="w-4 h-4" />
                    <span>Durdur</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 text-amber-700" />
                    <span>🔊 Sesli Çözümü Dinle</span>
                  </>
                )}
              </button>

              {/* Star Button */}
              <button
                type="button"
                onClick={handleToggleStar}
                className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isStarred
                    ? 'bg-amber-400 text-white border-amber-400'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface border-outline-variant/10'
                }`}
                title="Soruyu favorilere kaydet"
              >
                <Star className={`w-4 h-4 ${isStarred ? 'fill-white' : ''}`} />
              </button>

              {/* Copy Solution Button */}
              <button
                type="button"
                onClick={handleCopySolution}
                className="p-2 rounded-xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/10 text-xs font-bold transition-all cursor-pointer"
                title="Çözümü Kopyala"
              >
                {copiedSuccess ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Correct Option Highlight Banner */}
          <div className="rounded-[2.5rem] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white p-6 sm:p-8 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-100 bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                Sorunun Nihai Sonucu
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-manrope">
                Doğru Cevap: <span className="underline decoration-amber-300 decoration-wavy">{solution.correctOption}</span>
              </h2>
              <p className="text-xs sm:text-sm text-emerald-50 font-medium">
                {solution.finalAnswer}
              </p>
            </div>
            
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-2xl text-white shrink-0 shadow-inner">
              {solution.correctOption.length <= 2 ? solution.correctOption : '✓'}
            </div>
          </div>

          {/* 🎯 Soru Analizi & Hedef Tespiti (Ne İsteniyorsa Ona Göre Çözüm) */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-outline-variant/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-700 flex items-center justify-center font-black shadow-xs">
                  <Target className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-black text-on-surface font-manrope">
                      Soru Analizi & İstenen Hedef Tespiti
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-black uppercase tracking-wider">
                      Doğru Analiz
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Yapay zeka soruyu eksiksiz okudu, verilenleri çıkardı ve bizden tam olarak ne isteniyorsa ona odaklandı.
                  </p>
                </div>
              </div>
              {solution.questionAnalysis?.questionType && (
                <span className="px-3 py-1 bg-surface-container-high rounded-full text-xs font-bold text-on-surface">
                  🏷️ {solution.questionAnalysis.questionType}
                </span>
              )}
            </div>

            {/* Target Highlight Box (Bizden Ne İsteniyor?) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-sky-50 to-emerald-50 border border-indigo-200/70 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 text-indigo-900">
                <Target className="w-5 h-5 text-indigo-600 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider">
                  Bizden Tam Olarak Ne İsteniyor? (Soru Kökü & Hedef):
                </span>
              </div>
              <p className="text-sm sm:text-base font-extrabold text-indigo-950 leading-snug">
                {solution.questionAnalysis?.target || solution.studentSummary}
              </p>
              <p className="text-[11px] text-indigo-800/80 font-medium">
                💡 Yapay zeka ara işlemlerde kalmadan, çözüm adımlarını doğrudan bu istenen sonuca ulaşmak üzere kurguladı.
              </p>
            </div>

            {/* Verilen Bilgiler & Kısıtlar Listesi */}
            {solution.questionAnalysis?.givens && solution.questionAnalysis.givens.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-on-surface-variant">
                  <ListChecks className="w-4 h-4 text-emerald-600" />
                  <span>Soruda Verilen Bilgiler (Verilenler):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {solution.questionAnalysis.givens.map((given, gIdx) => (
                    <div 
                      key={gIdx}
                      className="p-3 rounded-xl bg-surface-container-low/70 border border-outline-variant/10 text-xs font-semibold text-on-surface flex items-start gap-2"
                    >
                      <CheckCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{given}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Görsel / Şekil / Grafik Analizi */}
            {solution.questionAnalysis?.figureOrDataAnalysis && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/60 space-y-1.5 text-xs text-amber-950">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <FileSearch className="w-4 h-4 text-amber-700" />
                  <span>Şekil, Tablo veya Grafik Analizi:</span>
                </div>
                <p className="font-medium leading-relaxed">
                  {solution.questionAnalysis.figureOrDataAnalysis}
                </p>
              </div>
            )}

            {/* Hedefe Yönelik Çözüm Stratejisi */}
            {solution.questionAnalysis?.solvingStrategy && (
              <div className="p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/15 space-y-1.5 text-xs text-on-surface">
                <div className="flex items-center gap-1.5 font-bold text-secondary">
                  <Compass className="w-4 h-4 text-secondary" />
                  <span>Hedefe Ulaşma Stratejisi (İzlenen Yol):</span>
                </div>
                <p className="font-medium text-on-surface-variant leading-relaxed">
                  {solution.questionAnalysis.solvingStrategy}
                </p>
              </div>
            )}

            {/* Soru Metni & Özeti */}
            <div className="pt-1 border-t border-outline-variant/10">
              <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant mb-1">
                <Brain className="w-4 h-4 text-primary" />
                <span>Öğrenci Diliyle Sorunun Kısa Özeti:</span>
              </div>
              <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed bg-surface-container-low/40 p-3 rounded-xl border border-outline-variant/5">
                {solution.studentSummary}
              </p>
            </div>
          </div>

          {/* Temel Kural & Formül Kartı (Eğer Varsa) */}
          {solution.coreFormula && (
            <div className="bg-gradient-to-br from-indigo-500/10 via-primary/5 to-transparent rounded-3xl p-6 sm:p-7 border border-primary/20 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center font-black shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-primary">Soruda Kullanılan Temel Kural / Formül</span>
                  <h4 className="font-black text-base text-on-surface">{solution.coreFormula.name}</h4>
                </div>
              </div>

              {solution.coreFormula.formula && (
                <div className="p-3.5 rounded-2xl bg-white border border-primary/20 font-mono text-sm sm:text-base font-extrabold text-primary tracking-wide shadow-2xs">
                  📐 Formül: {solution.coreFormula.formula}
                </div>
              )}

              <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed">
                💡 <strong>Kuralın Anlamı:</strong> {solution.coreFormula.explanation}
              </p>
            </div>
          )}

          {/* Adım Adım Detaylı İşlem ve Çözüm Basamakları */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center font-black">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-on-surface font-manrope">
                    İşlemlerin Nasıl Yapıldığını Gösteren Detaylı Adımlar
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium">
                    Her adımda neyi bulduğumuzu, sayıları nasıl hesapladığımızı ve neden o işlemi yaptığımızı incele.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-surface-container-high rounded-full text-on-surface-variant shrink-0">
                Toplam {solution.steps.length} Adım
              </span>
            </div>

            <div className="space-y-6">
              {solution.steps.map((step, idx) => (
                <div 
                  key={idx}
                  className="rounded-3xl p-5 sm:p-6 bg-surface-container-low/60 border border-outline-variant/15 space-y-4 hover:border-primary/40 transition-colors shadow-2xs"
                >
                  {/* Step Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-primary text-white text-xs font-black flex items-center justify-center shrink-0 shadow-xs">
                        {step.stepNumber || idx + 1}
                      </span>
                      <h4 className="font-black text-sm sm:text-base text-on-surface">
                        {step.title}
                      </h4>
                    </div>
                    {step.goal && (
                      <span className="self-start sm:self-auto px-3 py-1 bg-primary/10 text-primary rounded-full text-[11px] font-bold border border-primary/20">
                        🎯 Hedef: {step.goal}
                      </span>
                    )}
                  </div>

                  {/* 🔢 İşlemlerin Açık Hesaplanışı (Operation Details) */}
                  {step.operationDetails && step.operationDetails.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                        <span>🔢</span> Yapılan İşlemler & Hesaplama Satırları:
                      </p>
                      <div className="p-3.5 rounded-2xl bg-white border border-outline-variant/20 space-y-1.5 shadow-2xs">
                        {step.operationDetails.map((op, opIdx) => (
                          <div key={opIdx} className="flex items-start gap-2 text-xs sm:text-sm font-mono font-bold text-indigo-950">
                            <span className="text-primary font-black">➔</span>
                            <span>{op}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 🗣️ İşlem Nasıl Yapıldı? (Öğrencinin Diliyle Anlatım) */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-black uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
                      <span>🗣️</span> İşlem Nasıl Yapıldı? (Öğretmen Anlatımı):
                    </p>
                    <p className="text-xs sm:text-sm text-on-surface-variant font-medium leading-relaxed bg-white/60 p-3.5 rounded-2xl border border-outline-variant/10">
                      {step.explanation}
                    </p>
                  </div>

                  {/* 💡 Neden Böyle Yaptık? (İşlem Mantığı & Kural) */}
                  {step.whyThisWay && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/40 text-xs text-amber-950 space-y-1">
                      <p className="font-bold flex items-center gap-1.5 text-amber-900">
                        <span>💡</span> Neden Böyle Yaptık? (İşlemin Mantığı):
                      </p>
                      <p className="text-[11px] sm:text-xs leading-relaxed font-medium">
                        {step.whyThisWay}
                      </p>
                    </div>
                  )}

                  {/* Özet İşlem Satırı */}
                  {step.mathOrDetail && (
                    <div className="p-2.5 rounded-xl bg-surface-container-highest/50 border border-outline-variant/15 font-mono text-xs text-primary font-bold flex items-center justify-between">
                      <span className="text-on-surface-variant font-sans text-[11px]">Adım Sonucu:</span>
                      <span>{step.mathOrDetail}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 🎯 Hedef Doğrulama Kontrolü (Bizden İstenen Tam Olarak Sağlandı mı?) */}
          <div className="rounded-3xl p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent border border-emerald-500/30 shadow-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5 text-emerald-900">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Hedef Odaklı Çözüm Sağlaması</span>
                  <h4 className="font-black text-base text-emerald-950">İstenen Hedef Kontrolü</h4>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-700" />
                Hedefe Tam Olarak Ulaşıldı
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-white/80 border border-emerald-500/20 text-xs sm:text-sm font-medium text-emerald-950 leading-relaxed shadow-2xs space-y-1.5">
              <p className="font-bold text-emerald-900 flex items-center gap-1.5">
                <span>🎯</span> Soru Kökü ile Bulunan Sonucun Eşleşmesi:
              </p>
              <p>
                {solution.targetCheck || `Soruda tam olarak "${solution.questionAnalysis?.target || 'istenen değer'}" sorulmuştu. Tüm işlemler bu soru köküne sadık kalınarak tamamlandı ve ${solution.correctOption} seçeneği doğrulanarak hedefe ulaşıldı.`}
              </p>
            </div>
          </div>

          {/* Altın Püf Noktası & En Çok Düşülen Tuzak (Grid) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Altın Püf Noktası */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent rounded-3xl p-6 border border-amber-300/40 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 text-amber-900">
                <div className="w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black">
                  <Lightbulb className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base">Öğretmeninden Altın Püf Noktası</h4>
              </div>
              <p className="text-xs sm:text-sm text-amber-950/90 font-medium leading-relaxed">
                {solution.keyTip}
              </p>
            </div>

            {/* En Çok Düşülen Tuzak */}
            <div className="bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent rounded-3xl p-6 border border-rose-300/40 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 text-rose-900">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-black">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <h4 className="font-black text-base">En Çok Düşülen Tuzak / Çeldirici</h4>
              </div>
              <p className="text-xs sm:text-sm text-rose-950/90 font-medium leading-relaxed">
                {solution.commonMistake}
              </p>
            </div>
          </div>

          {/* Pekiştirme Alıştırma Sorusu ("Şimdi Sıra Sende!") */}
          {solution.similarQuestion && (
            <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-700 flex items-center justify-center font-black">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-base text-on-surface">Şimdi Sıra Sende! (Benzer Pekiştirme Sorusu)</h4>
                    <p className="text-xs text-on-surface-variant font-medium">Bu soruyu anladın mı? Benzer bir soruyla kendini hemen test et!</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPracticeAnswer(prev => !prev)}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300/40 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {showPracticeAnswer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  <span>{showPracticeAnswer ? 'Cevabı Gizle' : 'Cevabı Göster'}</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/10 space-y-2">
                <p className="text-sm font-bold text-on-surface">
                  {solution.similarQuestion.question}
                </p>
                {solution.similarQuestion.hint && (
                  <p className="text-xs text-amber-700 font-semibold italic">
                    💡 İpucu: {solution.similarQuestion.hint}
                  </p>
                )}
              </div>

              {showPracticeAnswer && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs sm:text-sm font-medium animate-in fade-in">
                  <strong className="block mb-1 text-emerald-900 font-bold">🎯 Çözüm & Doğru Cevap:</strong>
                  {solution.similarQuestion.answer}
                </div>
              )}
            </div>
          )}

          {/* Anlamadığın Yeri Sor (Interactive Follow-up Q&A) */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 sm:p-8 border border-outline-variant/10 shadow-sm space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-black text-base text-on-surface">Hala Aklına Takılan Bir Yer mi Var?</h4>
                <p className="text-xs text-on-surface-variant font-medium">Bu soru hakkında merak ettiğin veya anlamadığın adımı yapay zeka öğretmenine sorabilirsin.</p>
              </div>
            </div>

            {/* Previous Follow-up Dialogues */}
            {followUpHistory.length > 0 && (
              <div className="space-y-3 pt-2">
                {followUpHistory.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="p-3 rounded-2xl bg-primary/5 text-primary text-xs font-bold self-end border border-primary/10">
                      <strong>Sen:</strong> {item.question}
                    </div>
                    <div className="p-3.5 rounded-2xl bg-surface-container-low text-on-surface text-xs sm:text-sm font-medium border border-outline-variant/10 leading-relaxed">
                      <strong className="text-primary font-bold">Öğretmen:</strong> {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <input
                type="text"
                value={followUpQuestion}
                onChange={(e) => setFollowUpQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAskFollowUp();
                }}
                placeholder="Örn: 2. adımda 4'e neden böldük? Başka formül var mı?"
                className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-2xl px-4 py-3 text-xs sm:text-sm font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
              <button
                type="button"
                disabled={!followUpQuestion.trim() || isAskingFollowUp}
                onClick={handleAskFollowUp}
                className="px-5 py-3 bg-primary text-white rounded-2xl text-xs sm:text-sm font-bold hover:bg-primary/95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
              >
                {isAskingFollowUp ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span className="hidden sm:inline">Sor</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Solved Questions History Drawer / Modal */}
      <AnimatePresence>
        {isHistoryDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative z-10 w-full max-w-md bg-surface-container-lowest h-full shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-outline-variant/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  <h3 className="font-black text-base text-on-surface">Çözülen Soru Geçmişim</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsHistoryDrawerOpen(false)}
                  className="p-2 rounded-xl hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {historyItems.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <BookOpen className="w-12 h-12 text-on-surface-variant/30 mx-auto" />
                    <p className="text-sm font-bold text-on-surface-variant">Henüz kayıtlı çözülmüş soru yok.</p>
                    <p className="text-xs text-on-surface-variant/70">Çözdüğün sorular burada listelenir ve istediğin zaman tekrar inceleyebilirsin.</p>
                  </div>
                ) : (
                  historyItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleOpenHistoryItem(item)}
                      className="p-3.5 rounded-2xl bg-surface-container-low hover:bg-surface-container-high border border-outline-variant/10 transition-all cursor-pointer space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            {item.solution.subject || item.subject}
                          </span>
                          <h5 className="font-bold text-xs sm:text-sm text-on-surface mt-1 line-clamp-1">
                            {item.solution.topic || 'Soru Çözümü'}
                          </h5>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.starred && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQuestionFromHistory(item.id);
                              setHistoryItems(getSavedQuestionHistory(currentStudentId));
                            }}
                            className="p-1 rounded-lg hover:bg-rose-100 text-rose-500 opacity-60 hover:opacity-100 transition-opacity"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-on-surface-variant line-clamp-2">
                        {item.solution.studentSummary}
                      </p>

                      <div className="flex items-center justify-between text-[10px] font-bold text-on-surface-variant/80 pt-1">
                        <span>Cevap: {item.solution.correctOption}</span>
                        <span>{new Date(item.timestamp).toLocaleDateString('tr-TR')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Camera Capture Modal */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-lg bg-surface-container-lowest rounded-[2rem] overflow-hidden shadow-2xl space-y-4 p-4">
              <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10">
                <h4 className="font-black text-sm text-on-surface flex items-center gap-2">
                  <Camera className="w-4 h-4 text-primary" /> Soruyu Çerçeveye Hizala
                </h4>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="p-1.5 rounded-xl hover:bg-surface-container-high text-on-surface-variant cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Viewfinder Overlay */}
                <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-2xl pointer-events-none flex items-center justify-center">
                  <span className="text-[11px] font-bold text-white/80 bg-black/40 px-2 py-1 rounded-md backdrop-blur-xs">
                    Soruyu ve şıkları bu alana yerleştir
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => startCamera(cameraFacing === 'environment' ? 'user' : 'environment')}
                  className="px-3 py-2 bg-surface-container-high text-on-surface rounded-xl text-xs font-bold hover:bg-surface-container-highest cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Kamerayı Değiştir
                </button>

                <button
                  type="button"
                  onClick={capturePhoto}
                  className="px-6 py-3 bg-primary text-white rounded-2xl text-sm font-black hover:bg-primary/95 shadow-md flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" /> Çek
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Image Zoom Modal */}
      <AnimatePresence>
        {isZoomModalOpen && selectedImage && (
          <div 
            onClick={() => setIsZoomModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm cursor-zoom-out"
          >
            <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => setIsZoomModalOpen(false)}
                className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedImage}
                alt="Büyük Görünüm"
                style={{ transform: `rotate(${imageRotation}deg)` }}
                className="max-h-[85vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
