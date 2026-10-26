// AI Question Solver Client Service
export interface SolvedStep {
  stepNumber: number;
  title: string;
  goal?: string; // Bu adımda neyi buluyoruz?
  operationDetails?: string[]; // Yapılan işlemlerin açık hesaplama satırları
  explanation: string; // İşlemin nasıl yapıldığının detaylı açıklaması
  whyThisWay?: string; // Neden bu işlemi yaptık? (Mantık & Kural)
  mathOrDetail?: string; // Özet işlem satırı
}

export interface CoreFormula {
  name: string;
  formula: string;
  explanation: string;
}

export interface SimilarQuestion {
  question: string;
  hint: string;
  answer: string;
}

export interface QuestionAnalysis {
  questionType?: string; // Soru Türü (Örn: Çoktan Seçmeli LGS Problemi, Şekilli Geometri, Paragraf Analizi)
  givens: string[]; // Soruda verilen tüm değerler, öncüller (I, II, III), değişkenler ve birimler
  target: string; // Soru KÖKÜ ve bizden tam olarak ne istendiği (Örn: "Buna göre x + y toplamı kaçtır?")
  figureOrDataAnalysis?: string; // Varsa görseldeki şekil, grafik, koordinat düzlemi veya tablo incelemesi
  solvingStrategy: string; // İstenene doğrudan ulaşmak için izlenecek hedef odaklı strateji
}

export interface QuestionSolution {
  subject: string;
  topic: string;
  questionText: string;
  correctOption: string;
  studentSummary: string;
  questionAnalysis?: QuestionAnalysis; // Sorunun eksiksiz analizi ve istenen hedef tespiti
  targetCheck?: string; // Hedef Doğrulama: Soru kökündeki hedef ile bulunan sonucun teyidi
  coreFormula?: CoreFormula;
  steps: SolvedStep[];
  finalAnswer: string;
  keyTip: string;
  commonMistake: string;
  similarQuestion?: SimilarQuestion;
  audioSpeechText: string;
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  studentId?: string;
  imagePreview?: string;
  grade: string;
  subject: string;
  studentQuestion?: string;
  solution: QuestionSolution;
  starred?: boolean;
}

export interface SolveQuestionInput {
  image?: string; // base64 data url
  mimeType?: string;
  studentGrade?: string;
  subjectHint?: string;
  studentQuestion?: string;
  followUpContext?: QuestionSolution;
}

const STORAGE_KEY = 'scholar_pulse_solved_questions_v1';

export async function solveQuestionWithAi(input: SolveQuestionInput): Promise<QuestionSolution> {
  const response = await fetch('/api/solve-question', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(`Sunucu hatası: ${response.status}`);
  }

  const data = await response.json();
  if (data.solution) {
    return data.solution;
  }
  throw new Error('Geçersiz sunucu yanıtı.');
}

// History Management
export function getSavedQuestionHistory(studentId?: string): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: HistoryItem[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    if (studentId) {
      return parsed.filter(item => !item.studentId || item.studentId === studentId);
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load solved question history', e);
    return [];
  }
}

export function saveQuestionToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>): HistoryItem {
  const history = getSavedQuestionHistory();
  const newItem: HistoryItem = {
    ...item,
    id: `sol_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    starred: false
  };

  // Keep last 40 questions to prevent localStorage overflow
  const updated = [newItem, ...history].slice(0, 40);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    // If full, trim images or keep last 15
    const trimmed = updated.slice(0, 15);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  }
  return newItem;
}

export function deleteQuestionFromHistory(id: string): void {
  const history = getSavedQuestionHistory();
  const updated = history.filter(h => h.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function toggleStarQuestion(id: string): boolean {
  const history = getSavedQuestionHistory();
  let nextState = false;
  const updated = history.map(h => {
    if (h.id === id) {
      nextState = !h.starred;
      return { ...h, starred: nextState };
    }
    return h;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return nextState;
}

// Web Speech API Text-to-Speech
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function playAudioSpeech(
  text: string, 
  onStart?: () => void, 
  onEnd?: () => void, 
  onError?: (err: any) => void
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  try {
    window.speechSynthesis.cancel(); // Stop any currently playing audio

    // Clean text from symbols for smooth listening
    const cleanText = text
      .replace(/[*_#`~[\]]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'tr-TR';
    utterance.rate = 0.95; // Slightly slower, very natural and pedagogical for students
    utterance.pitch = 1.05; // Friendly and upbeat

    // Try to pick a natural Turkish voice if available
    const voices = window.speechSynthesis.getVoices();
    const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
    if (turkishVoice) {
      utterance.voice = turkishVoice;
    }

    utterance.onstart = () => {
      onStart?.();
    };
    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (e) => {
      currentUtterance = null;
      onError?.(e);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return true;
  } catch (e) {
    console.error('Speech synthesis error', e);
    onError?.(e);
    return false;
  }
}

export function stopAudioSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
}

export function isAudioSpeechPlaying(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false;
  return window.speechSynthesis.speaking;
}

// Sample Preset Questions so students can test with 1 click
export const SAMPLE_QUESTIONS = [
  {
    title: '8. Sınıf LGS Matematik (Üslü İfadeler)',
    subject: 'Matematik',
    grade: '8. Sınıf (LGS)',
    note: 'Hocam üsleri çarpacak mıyım toplayacak mıyım karıştırdım.',
    // Clean SVG Data URI representation of a question card
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23f8fafc"><rect width="600" height="400" rx="16" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="50" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="%230f172a">MATEMATİK - ÜSLÜ İFADELER</text><text x="40" y="100" font-family="Arial,sans-serif" font-size="16" fill="%23334155">Bir laboratuvardaki bakteri sayısı her 20 dakikada bir 2 katına çıkmaktadır.</text><text x="40" y="130" font-family="Arial,sans-serif" font-size="16" fill="%23334155">Başlangıçta kapta 2^4 adet bakteri olduğuna göre,</text><text x="40" y="160" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="%230284c7">2 saat sonra kapta toplam kaç bakteri bulunur?</text><text x="60" y="220" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">A) 2^8</text><text x="180" y="220" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">B) 2^9</text><text x="300" y="220" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="%2316a34a">C) 2^10</text><text x="420" y="220" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">D) 2^12</text><rect x="40" y="280" width="520" height="80" rx="12" fill="%23f1f5f9"/><text x="60" y="315" font-family="Arial,sans-serif" font-size="13" font-style="italic" fill="%2364748b">İpucu: 2 saat içinde kaç tane 20 dakika olduğunu bularak başla!</text><text x="60" y="340" font-family="Arial,sans-serif" font-size="13" font-style="italic" fill="%2364748b">Her 2 katına çıkma işlemi üsse +1 eklemek demektir.</text></svg>`
  },
  {
    title: 'Fen Bilimleri (Mevsimler ve İklim / Gölge Boyu)',
    subject: 'Fen Bilimleri',
    grade: '8. Sınıf (LGS)',
    note: 'Güneş ışınlarının geliş açısı ile gölge boyu ters orantılı mıydı?',
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23ffffff"><rect width="600" height="400" rx="16" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="50" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="%230f172a">FEN BİLİMLERİ - MEVSİMLER VE İKLİM</text><text x="40" y="100" font-family="Arial,sans-serif" font-size="16" fill="%23334155">Kuzey Yarım Küre'de bulunan bir şehirde özdeş bir cismin</text><text x="40" y="130" font-family="Arial,sans-serif" font-size="16" fill="%23334155">öğle vakti ölçülen gölge boyunun yıl içindeki değişimi inceleniyor.</text><text x="40" y="170" font-family="Arial,sans-serif" font-size="16" font-weight="bold" fill="%230284c7">Buna göre gölge boyunun EN KISA olduğu tarih hangisidir?</text><text x="60" y="230" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="%2316a34a">A) 21 Haziran</text><text x="200" y="230" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">B) 23 Eylül</text><text x="340" y="230" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">C) 21 Aralık</text><text x="460" y="230" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">D) 21 Mart</text><rect x="40" y="280" width="520" height="80" rx="12" fill="%23fef3c7"/><text x="60" y="325" font-family="Arial,sans-serif" font-size="13" font-weight="bold" fill="%2392400e">Güneş tepeye ne kadar dik gelirse gölge o kadar kısalır!</text></svg>`
  },
  {
    title: 'Türkçe (Fiilimsiler / İsim-Fiil vs Sıfat-Fiil)',
    subject: 'Türkçe',
    grade: '8. Sınıf',
    note: 'Kalıcı isimle fiilimsiyi nasıl ayırt edeceğim?',
    image: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400" fill="%23ffffff"><rect width="600" height="400" rx="16" fill="%23ffffff" stroke="%23cbd5e1" stroke-width="2"/><text x="40" y="50" font-family="Arial,sans-serif" font-size="20" font-weight="bold" fill="%230f172a">TÜRKÇE - FİİLİMSİLER</text><text x="40" y="100" font-family="Arial,sans-serif" font-size="16" fill="%23334155">"Annemin yaptığı lezzetli sarmayı afiyetle yedik." cümlesinde</text><text x="40" y="130" font-family="Arial,sans-serif" font-size="16" fill="%23334155">altı çizili "sarma" sözcüğü için hangisi doğrudur?</text><text x="60" y="190" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">A) İsim-fiildir çünkü -ma eki almıştır.</text><text x="60" y="225" font-family="Arial,sans-serif" font-size="15" font-weight="bold" fill="%2316a34a">B) Fiilimsi özelliğini kaybedip kalıcı isim olmuştur.</text><text x="60" y="260" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">C) Sıfat-fiildir çünkü ismi nitelemiştir.</text><text x="60" y="295" font-family="Arial,sans-serif" font-size="15" fill="%231e293b">D) Zarf-fiildir çünkü durumu belirtir.</text></svg>`
  }
];
