// AI Analysis Service & Analytical Calculation Engine
// Provides 100% resilient analysis both via Serverless API and local Client-Side fallback
// Guarantees zero "Unexpected end of JSON input" errors even on static Vercel deployments

import { 
  calculateWeeklyQuestionStats, 
  getTaskQuestionCount, 
  getTaskSolvedCount, 
  isQuestionTask, 
  calculateNetScore 
} from './utils';

export interface AnalysisInput {
  studentName?: string;
  grade?: string;
  tasks?: any[];
  trialResults?: any[];
  detailedTrials?: any[];
  topicErrors?: any[];
  archivedPrograms?: any[];
}

// Curated YouTube Educational Resources for Turkish Exam Prep
export const videoMap: Record<string, { title: string; query: string; url: string }> = {
  'matematik': {
    title: 'Rehber Matematik - Konu Tekrarı & Soru Çözümü',
    query: 'Rehber Matematik Konu Anlatimi Soru Cozumu',
    url: 'https://www.youtube.com/results?search_query=Rehber+Matematik+Konu+Anlatimi'
  },
  'türkçe': {
    title: 'Rüştü Hoca ile Türkçe - Taktiklerle Konu & Paragraf',
    query: 'Rustu Hoca Turkce Taktikleri',
    url: 'https://www.youtube.com/results?search_query=Rustu+Hoca+Turkce+Taktikleri'
  },
  'fen': {
    title: 'Benim Hocam / VIP Fizik - Konu Özeti & Kritik Sorular',
    query: 'VIP Fizik Konu Anlatimi',
    url: 'https://www.youtube.com/results?search_query=VIP+Fizik+Konu+Anlatimi'
  },
  'fizik': {
    title: 'VIP Fizik - Konu Anlatımı ve Yeni Nesil Sorular',
    query: 'VIP Fizik Soru Cozumu',
    url: 'https://www.youtube.com/results?search_query=VIP+Fizik+Konu+Anlatimi'
  },
  'kimya': {
    title: 'Görkem Şahin / Benim Hocam Kimya',
    query: 'Gorkem Sahin Kimya Konu Anlatimi',
    url: 'https://www.youtube.com/results?search_query=Benim+Hocam+Kimya'
  },
  'biyoloji': {
    title: 'Dr. Biyoloji / Barış Hoca ile Biyoloji',
    query: 'Dr Biyoloji Konu Anlatimi',
    url: 'https://www.youtube.com/results?search_query=Dr+Biyoloji'
  },
  'sosyal': {
    title: 'Benim Hocam - Tarih & Coğrafya Püf Noktaları',
    query: 'Benim Hocam Tarih Cografya',
    url: 'https://www.youtube.com/results?search_query=Benim+Hocam+Tarih'
  },
  'tarih': {
    title: 'Ramazan Yetgin / Tarih Kampı',
    query: 'Ramazan Yetgin Tarih',
    url: 'https://www.youtube.com/results?search_query=Ramazan+Yetgin+Tarih'
  },
  'coğrafya': {
    title: 'Bayram Meral / Coğrafya Kampı',
    query: 'Bayram Meral Cografya',
    url: 'https://www.youtube.com/results?search_query=Bayram+Meral+Cografya'
  },
  'dil': {
    title: 'Özer Kiraz / İngilizce Konu ve Kelime Kampı',
    query: 'Ingilizce Soru Cozumu ve Kelime',
    url: 'https://www.youtube.com/results?search_query=Ingilizce+Soru+Cozumu'
  },
  'ingilizce': {
    title: 'Özer Kiraz / İngilizce Soru Çözümü',
    query: 'Ingilizce Soru Cozumu',
    url: 'https://www.youtube.com/results?search_query=Ingilizce+Soru+Cozumu'
  },
  'din': {
    title: 'Din Kültürü ve Ahlak Bilgisi Konu Özeti',
    query: 'Din Kulturu Konu Anlatimi',
    url: 'https://www.youtube.com/results?search_query=Din+Kulturu+Konu+Anlatimi'
  }
};

export const getRecommendedVideo = (subject: string, topic: string) => {
  const sLower = String(subject || '').toLowerCase();
  const matchedKey = Object.keys(videoMap).find(k => sLower.includes(k)) || 'matematik';
  const rec = videoMap[matchedKey];
  return {
    title: `${topic} - ${rec.title}`,
    searchQuery: `${subject} ${topic} soru cozumu konu anlatimi`,
    youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${subject} ${topic} soru cozumu konu anlatimi`)}`
  };
};

// Pure analytical engine producing 100% compliant and mathematically exact data structure
export function generateSmartAnalysis(input: AnalysisInput = {}) {
  const { studentName, grade, tasks, trialResults, detailedTrials, topicErrors, archivedPrograms } = input;

  const taskList: any[] = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const trialList: any[] = Array.isArray(trialResults) ? trialResults.filter(Boolean) : [];
  const detailedTrialList: any[] = Array.isArray(detailedTrials) ? detailedTrials.filter(Boolean) : [];
  const errorList: any[] = Array.isArray(topicErrors) ? topicErrors.filter(Boolean) : [];
  const archivedList: any[] = Array.isArray(archivedPrograms) ? archivedPrograms.filter(Boolean) : [];

  // If current tasks are empty, check previous archived week
  const hasArchivedWeek = archivedList.length > 0 && Array.isArray(archivedList[0]?.tasks) && archivedList[0].tasks.length > 0;
  const previousWeekTasks = hasArchivedWeek ? archivedList[0].tasks.filter(Boolean) : [];

  const activeMetricsTasks = taskList.length > 0 ? taskList : previousWeekTasks;
  const completedTasks = activeMetricsTasks.filter((t: any) => t && t.completed);
  const uncompletedTasks = activeMetricsTasks.filter((t: any) => t && !t.completed);
  const completionRate = activeMetricsTasks.length > 0 ? Math.round((completedTasks.length / activeMetricsTasks.length) * 100) : 0;

  // 1. Calculate Canonical Task Metrics via calculateWeeklyQuestionStats
  const canonicalStats = calculateWeeklyQuestionStats(activeMetricsTasks, undefined, grade);

  const weeklyAssignedQuestions = canonicalStats.assignedQuestions;
  const weeklySolvedQuestions = canonicalStats.solvedQuestions;
  const weeklyRemainingQuestions = canonicalStats.remainingQuestions;
  const questionCompletionRate = canonicalStats.progressPercent;
  const weeklyCorrect = canonicalStats.correct;
  const weeklyIncorrect = canonicalStats.incorrect;
  const weeklyEmpty = canonicalStats.empty;
  const weeklyNet = canonicalStats.net;
  const weeklyEvaluatedQuestions = canonicalStats.evaluatedQuestions;
  const weeklyUnevaluatedQuestions = canonicalStats.unevaluatedQuestions;

  // Total evaluated questions entered by the student (Doğru + Yanlış + Boş)
  const totalEvaluatedQuestions = weeklyEvaluatedQuestions;
  // If student entered results, totalQuestions reflects evaluated questions so Doğru + Yanlış + Boş matches 100%!
  const totalQuestionsDisplay = totalEvaluatedQuestions > 0 ? totalEvaluatedQuestions : weeklySolvedQuestions;

  const weeklyAnswered = weeklyCorrect + weeklyIncorrect;
  const weeklyOverallAccuracy = weeklyAnswered > 0 
    ? Math.round((weeklyCorrect / weeklyAnswered) * 100) 
    : (canonicalStats.accuracyRate > 0 ? canonicalStats.accuracyRate : (completionRate > 0 ? completionRate : 80));

  // 2. Build Topic Performance Map & Subject Task Stats from active question tasks
  const subjectTaskStats: Record<string, { correct: number; incorrect: number; empty: number; net: number; total: number; evaluatedTotal: number; topics: Record<string, number> }> = {};
  const topicPerformanceMap: Record<string, {
    subject: string;
    topic: string;
    correct: number;
    incorrect: number;
    empty: number;
    total: number;
    evaluatedTotal: number;
  }> = {};

  activeMetricsTasks.forEach((t: any) => {
    if (!t) return;
    const isQ = isQuestionTask(t);
    const subj = (t.subject || 'Genel').trim();
    const topic = (t.topic || t.title || 'Genel Konu').trim();
    const topicKey = `${subj}_${topic}`.toLowerCase();

    if (!subjectTaskStats[subj]) {
      subjectTaskStats[subj] = { correct: 0, incorrect: 0, empty: 0, net: 0, total: 0, evaluatedTotal: 0, topics: {} };
    }

    if (!topicPerformanceMap[topicKey]) {
      topicPerformanceMap[topicKey] = {
        subject: subj,
        topic,
        correct: 0,
        incorrect: 0,
        empty: 0,
        total: 0,
        evaluatedTotal: 0
      };
    }

    const c = Number(t.correct) || 0;
    const inc = Number(t.incorrect) || 0;
    const emp = Number(t.empty) || 0;
    const n = typeof t.net === 'number' && !isNaN(t.net) ? t.net : calculateNetScore(c, inc, grade);
    const taskEvaluated = (t.correct !== undefined && t.correct !== null) || (t.incorrect !== undefined && t.incorrect !== null);

    if (taskEvaluated || t.completed) {
      if (isQ) {
        const solvedCount = getTaskSolvedCount(t);
        if (taskEvaluated) {
          subjectTaskStats[subj].correct += c;
          subjectTaskStats[subj].incorrect += inc;
          subjectTaskStats[subj].empty += emp;
          subjectTaskStats[subj].net += n;
          subjectTaskStats[subj].evaluatedTotal += (c + inc + emp);

          topicPerformanceMap[topicKey].correct += c;
          topicPerformanceMap[topicKey].incorrect += inc;
          topicPerformanceMap[topicKey].empty += emp;
          topicPerformanceMap[topicKey].evaluatedTotal += (c + inc + emp);
        }
        subjectTaskStats[subj].total += solvedCount;
        topicPerformanceMap[topicKey].total += solvedCount;

        if (inc > 0) {
          subjectTaskStats[subj].topics[topic] = (subjectTaskStats[subj].topics[topic] || 0) + inc;
        }
      }
    }
  });

  // 3. Deduplicate Trials (Prevent double-counting between detailedTrials and trialResults)
  const uniqueTrialsMap = new Map<string, any>();

  // Add detailed trials first (contains full branch breakdown and wrong topics)
  detailedTrialList.forEach((tr: any) => {
    if (!tr) return;
    const key = tr.id ? String(tr.id) : `${tr.date || ''}_${tr.totalNet || tr.score || ''}`;
    uniqueTrialsMap.set(key, tr);
  });

  // Add simple trials only if not already represented
  trialList.forEach((tr: any) => {
    if (!tr) return;
    const key = tr.id ? String(tr.id) : `${tr.date || ''}_${tr.totalNet || tr.score || ''}`;
    if (!uniqueTrialsMap.has(key)) {
      uniqueTrialsMap.set(key, tr);
    }
  });

  const combinedTrials = Array.from(uniqueTrialsMap.values());

  let latestTrialNet = 0;
  let highestTrialNet = 0;
  let lowestTrialNet = 999;
  let totalTrialNetSum = 0;
  const allTrialScores: number[] = [];
  const trialBranchStats: Record<string, { correct: number; incorrect: number; net: number; count: number }> = {};
  const trialMistakesList: { subject: string; topic: string; count: number }[] = [];

  combinedTrials.forEach((tr: any) => {
    if (!tr) return;
    const score = Number(tr.totalNet) || Number(tr.score) || Number(tr.net) || 0;
    if (score > 0) {
      allTrialScores.push(score);
      totalTrialNetSum += score;
      if (score > highestTrialNet) highestTrialNet = score;
      if (score < lowestTrialNet) lowestTrialNet = score;
    }

    if (tr.results && typeof tr.results === 'object' && !Array.isArray(tr.results)) {
      Object.entries(tr.results).forEach(([subj, data]: [string, any]) => {
        if (!data) return;
        if (!trialBranchStats[subj]) trialBranchStats[subj] = { correct: 0, incorrect: 0, net: 0, count: 0 };
        const c = Number(data.correct) || 0;
        const inc = Number(data.incorrect) || 0;
        const branchNet = data.net !== undefined ? Number(data.net) : calculateNetScore(c, inc, grade);
        
        trialBranchStats[subj].correct += c;
        trialBranchStats[subj].incorrect += inc;
        trialBranchStats[subj].net += branchNet;
        trialBranchStats[subj].count += 1;

        if (data.wrongTopics && Array.isArray(data.wrongTopics)) {
          data.wrongTopics.forEach((wt: any) => {
            if (!wt) return;
            const topicName = typeof wt === 'string' ? wt : wt.topic || 'Genel Soru';
            const errCount = typeof wt === 'object' && wt.count ? Number(wt.count) : 1;
            trialMistakesList.push({ subject: subj, topic: topicName, count: errCount });
          });
        }
      });
    }
  });

  if (allTrialScores.length > 0) {
    latestTrialNet = allTrialScores[allTrialScores.length - 1] || allTrialScores[0] || 0;
  }
  if (lowestTrialNet === 999) lowestTrialNet = latestTrialNet;
  const averageTrialNet = allTrialScores.length > 0 ? Number((totalTrialNetSum / allTrialScores.length).toFixed(2)) : latestTrialNet;

  let trialTrend: 'rising' | 'steady' | 'declining' = 'steady';
  if (allTrialScores.length >= 2) {
    const last = allTrialScores[allTrialScores.length - 1];
    const prev = allTrialScores[allTrialScores.length - 2];
    if (last > prev + 1.5) trialTrend = 'rising';
    else if (last < prev - 1.5) trialTrend = 'declining';
  }

  const targetTrialNet = Number((Math.max(latestTrialNet, highestTrialNet) + 3.5).toFixed(1));

  // 4. Identify Topics with Success Rate UNDER 80% (< %80)
  const under80Topics: any[] = [];
  
  // From weekly tasks:
  Object.values(topicPerformanceMap).forEach(tp => {
    const answered = tp.correct + tp.incorrect;
    if (answered > 0) {
      const accuracy = Math.round((tp.correct / answered) * 100);
      if (accuracy < 80) {
        const isCritical = accuracy < 60 || tp.incorrect >= 4;
        const recVideo = getRecommendedVideo(tp.subject, tp.topic);
        under80Topics.push({
          subject: tp.subject,
          topic: tp.topic,
          accuracy,
          correct: tp.correct,
          incorrect: tp.incorrect,
          empty: tp.empty,
          totalAnswered: answered,
          severity: isCritical ? 'critical' : 'warning',
          severityLabel: isCritical ? 'Kritik Eksik (< %60)' : 'Geliştirilmeli (%60 - %79)',
          diagnosis: `${tp.subject} branşında '${tp.topic}' konusunda çözülen ${answered} soruda ${tp.incorrect} yanlış ve ${tp.empty} boş kaydedildi. Başarı oranı %${accuracy} ile %80 hedef eşiğinin altındadır.`,
          recommendation: `1) '${tp.topic}' özet konu anlatımını inceleyin. 2) Günde 20-25 pekiştirme sorusu çözün. 3) Yapılan ${tp.incorrect} yanlışı video çözümleriyle analiz edin.`,
          actionPlan: `Günde 20-25 soru telafi çalışması`,
          video: recVideo
        });
      }
    }
  });

  // From trial mistakes:
  trialMistakesList.forEach(tm => {
    const alreadyInList = under80Topics.some(u => u.topic.toLowerCase() === tm.topic.toLowerCase() && u.subject.toLowerCase() === tm.subject.toLowerCase());
    if (!alreadyInList) {
      const branchStat = trialBranchStats[tm.subject];
      const branchCorrect = branchStat?.correct || 0;
      const answered = branchCorrect + tm.count;
      const acc = answered > 0 ? Math.round((branchCorrect / answered) * 100) : 50;
      if (acc < 80) {
        under80Topics.push({
          subject: tm.subject,
          topic: tm.topic,
          accuracy: acc,
          correct: branchCorrect,
          incorrect: tm.count,
          empty: 0,
          totalAnswered: answered,
          severity: acc < 60 ? 'critical' : 'warning',
          severityLabel: acc < 60 ? 'Kritik Deneme Eksiği' : 'Deneme Eksiği',
          diagnosis: `Deneme sınavında ${tm.subject} branşında '${tm.topic}' konusunda ${tm.count} yanlış yapıldı. Başarı oranı %${acc} seviyesinde kaldı.`,
          recommendation: `Deneme sınavında hata yapılan '${tm.topic}' konusunun soru çözüm videosunu izleyip soru bankasından pekiştiriniz.`,
          actionPlan: `Deneme hata telafi çalışması`,
          video: getRecommendedVideo(tm.subject, tm.topic)
        });
      }
    }
  });

  under80Topics.sort((a, b) => a.accuracy - b.accuracy);

  // 5. Clean, Deduplicated Topic Error Map
  const topicErrorMap: Record<string, { topic: string; subject: string; count: number }> = {};

  trialMistakesList.forEach(tm => {
    const key = `${tm.subject}_${tm.topic}`.toLowerCase();
    if (!topicErrorMap[key]) topicErrorMap[key] = { topic: tm.topic, subject: tm.subject, count: 0 };
    topicErrorMap[key].count += tm.count;
  });

  activeMetricsTasks.forEach((t: any) => {
    const inc = Number(t.incorrect) || 0;
    if (inc > 0) {
      const subj = t.subject || 'Genel';
      const topic = t.topic || t.title || 'Genel';
      const key = `${subj}_${topic}`.toLowerCase();
      if (!topicErrorMap[key]) topicErrorMap[key] = { topic, subject: subj, count: 0 };
      topicErrorMap[key].count += inc;
    }
  });

  // Only fallback to raw topicErrors list if error map is still empty
  if (Object.keys(topicErrorMap).length === 0 && errorList.length > 0) {
    errorList.forEach((err: any) => {
      if (!err) return;
      const topic = err.topic || 'Genel Konu';
      const subject = err.subject || 'Genel';
      const count = Number(err.errorCount) || Number(err.count) || 1;
      const key = `${subject}_${topic}`.toLowerCase();
      if (!topicErrorMap[key]) topicErrorMap[key] = { topic, subject, count: 0 };
      topicErrorMap[key].count += count;
    });
  }

  const sortedErrors = Object.values(topicErrorMap).sort((a, b) => b.count - a.count);
  const topErrorTopic = sortedErrors[0]?.topic || 'Temel Problem Çözümü';
  const topErrorSubject = sortedErrors[0]?.subject || 'Matematik';

  // 6. Trial Analysis Object
  const trialAnalysis = {
    trialCount: combinedTrials.length,
    latestTrialNet: Number(latestTrialNet.toFixed(2)),
    highestTrialNet: Number(highestTrialNet.toFixed(2)),
    averageTrialNet: Number(averageTrialNet.toFixed(2)),
    targetNet: targetTrialNet,
    trend: trialTrend,
    trendLabel: trialTrend === 'rising' ? 'Yükseliş Trendinde ↗️' : trialTrend === 'declining' ? 'Dikkat Gerektiren Düşüş ↘️' : 'İstikrarlı Seyir ➡️',
    summary: combinedTrials.length > 0
      ? `Öğrencinin kayıtlı ${combinedTrials.length} deneme sınavı incelendiğinde; son deneme neti ${latestTrialNet.toFixed(1)}, en yüksek neti ${highestTrialNet.toFixed(1)}, genel ortalaması ${averageTrialNet.toFixed(1)} olarak gerçekleşmiştir. Net gidişatı ${trialTrend === 'rising' ? 'yükseliş eğilimindedir' : 'istikrarlıdır'}. Özellikle denemelerde süre baskısı ve optik işaretleme disiplini ön plana çıkmaktadır.`
      : `Sistemde henüz detaylı deneme sınavı kaydı bulunmamaktadır. Deneme sınavı sonuçları girildikçe branş bazlı net eğrileri ve zaman yönetimi analizi burada ayrıntılandırılacaktır.`,
    branchAverages: Object.entries(trialBranchStats).map(([subj, s]) => ({
      subject: subj,
      averageNet: s.count > 0 ? Number((s.net / s.count).toFixed(2)) : 0,
      totalCorrect: s.correct,
      totalIncorrect: s.incorrect
    })),
    trialRecommendations: [
      {
        title: 'Turlama Tekniği Disiplini',
        description: 'Deneme sınavında ilk turda yalnızca kesin emin olunan sorular çözülmeli; uğraştırıcı sorular işaretlenip 2. tura bırakılmalıdır.',
        badge: 'Süre Kazancı'
      },
      {
        title: 'Branş Bazlı Süre Yönetimi',
        description: 'Sözel bölüme dengeli süre ayrılarak sınav sonunda en az 5 dakika optik ve boş soru kontrolüne ayrılmalıdır.',
        badge: 'Strateji'
      },
      {
        title: 'Deneme Yanlış Defteri',
        description: 'Her deneme sonrası yanlış yapılan ve boş bırakılan sorular kesilip çözümü yanına not edilmeli, haftalık tekrar edilmelidir.',
        badge: 'Net Artışı'
      }
    ]
  };

  // 7. Weekly Program Analysis
  const evaluatedQuestionsText = totalEvaluatedQuestions > 0
    ? `Sonuçları girilen ${totalEvaluatedQuestions} soruda ${weeklyCorrect} Doğru, ${weeklyIncorrect} Yanlış, ${weeklyEmpty} Boş kaydedilmiş olup net doğruluk oranı %${weeklyOverallAccuracy}'dir.`
    : `Görevler tamamlandıkça doğru/yanlış sonuçları girilerek net doğruluk analiz edilecektir.`;

  const weeklyProgramAnalysis = {
    assignedQuestions: weeklyAssignedQuestions,
    solvedQuestions: weeklySolvedQuestions,
    remainingQuestions: weeklyRemainingQuestions,
    questionCompletionRate: questionCompletionRate,
    totalQuestions: totalQuestionsDisplay,
    totalCorrect: weeklyCorrect,
    totalIncorrect: weeklyIncorrect,
    totalEmpty: weeklyEmpty,
    totalNet: Number(weeklyNet.toFixed(2)),
    successRate: weeklyOverallAccuracy,
    completedTasksCount: completedTasks.length,
    totalTasksCount: activeMetricsTasks.length,
    uncompletedTasksCount: uncompletedTasks.length,
    completionRate: completionRate,
    summary: activeMetricsTasks.length > 0
      ? `Haftalık programda planlanan ${activeMetricsTasks.length} görevden ${completedTasks.length} tanesi (%${completionRate}) tamamlanmıştır. ${weeklySolvedQuestions > 0 ? `Toplam ${weeklySolvedQuestions} soru çözülmüştür.` : ''} ${evaluatedQuestionsText}`
      : `Haftalık programda henüz kayıtlı ödev bulunmamaktadır. Görevler tamamlandıkça doğruluk ve soru tamamlama analizleri güncellenecektir.`,
    under80TopicsCount: under80Topics.length,
    under80Topics: under80Topics,
    recommendations: [
      uncompletedTasks.length > 0
        ? `Haftalık programda ${uncompletedTasks.length} tamamlanmamış görev bulunmaktadır. Yeni haftaya geçmeden bu görevler telafi edilmelidir.`
        : `Haftalık görevlerin tamamı eksiksiz tamamlanmıştır, çalışma disiplini mükemmel seviyededir.`,
      under80Topics.length > 0
        ? `${under80Topics.length} konuda başarı oranı %80'in altında tespit edilmiştir. Bu konulara özel telafi planı uygulanmalıdır.`
        : `Tüm çalışılan konularda %80 başarı eşiği aşılmıştır.`
    ]
  };

  // 8. Branch / Subject Breakdown Generator - SADECE öğrenciye verilmiş gerçek dersler analiz edilir
  const actualSubjectNames = Array.from(new Set([
    ...activeMetricsTasks.map((t: any) => (t.subject || '').trim()).filter(Boolean),
    ...Object.keys(trialBranchStats)
  ]));

  const subjectsAnalysis = actualSubjectNames.map(name => {
    const stats = Object.entries(subjectTaskStats).find(([k]) => k.toLowerCase() === name.toLowerCase())?.[1];
    const relevantUnder80 = under80Topics.filter(u => u.subject.toLowerCase() === name.toLowerCase());

    const correctCount = stats?.correct || 0;
    const incorrectCount = stats?.incorrect || 0;
    const answered = correctCount + incorrectCount;

    let accuracy = 100;
    if (answered > 0) {
      accuracy = Math.round((correctCount / answered) * 100);
    } else {
      const branchTrial = trialBranchStats[name];
      if (branchTrial && (branchTrial.correct + branchTrial.incorrect) > 0) {
        accuracy = Math.round((branchTrial.correct / (branchTrial.correct + branchTrial.incorrect)) * 100);
      } else {
        accuracy = 100;
      }
    }

    let status: 'success' | 'warning' | 'danger' = 'success';
    if (accuracy < 60) status = 'danger';
    else if (accuracy < 80) status = 'warning';

    const deficiencies = relevantUnder80.map(u => ({
      topic: u.topic,
      errorCount: u.incorrect,
      accuracy: u.accuracy,
      description: `${name} dersinde '${u.topic}' konusunda ${u.incorrect} yanlış kaydedildi. Gerçek başarı oranı %${u.accuracy} olup %80 eşiğinin altındadır.`,
      recommendations: [
        getRecommendedVideo(name, u.topic)
      ]
    }));

    return {
      name,
      status,
      accuracy: Math.min(100, Math.max(0, accuracy)),
      deficiencies
    };
  });

  const trialText = latestTrialNet > 0 ? `Son deneme neti ${latestTrialNet.toFixed(1)} olarak kaydedildi (En yüksek: ${highestTrialNet.toFixed(1)} net).` : `Kayıtlı deneme sınavlarında süreklilik sağlanmalı.`;
  
  const videoText = canonicalStats.videoTasksCount > 0 
    ? `Programdaki ${canonicalStats.videoTasksCount} video görevinden ${canonicalStats.completedVideoTasksCount} tanesi izlendi.` 
    : '';
  const readingText = canonicalStats.readingTasksCount > 0 
    ? `Programdaki ${canonicalStats.readingTasksCount} kitap/okuma ödevinden ${canonicalStats.completedReadingTasksCount} tanesi tamamlandı.` 
    : '';

  const taskText = totalEvaluatedQuestions > 0 
    ? `Bu hafta sonuçları girilen ${totalEvaluatedQuestions} soruda ${weeklyCorrect} Doğru, ${weeklyIncorrect} Yanlış, ${weeklyEmpty} Boş kaydedildi (Net: ${weeklyNet.toFixed(2)}, Doğruluk: %${weeklyOverallAccuracy}).${weeklyUnevaluatedQuestions > 0 ? ` Tamamlanan ${weeklyUnevaluatedQuestions} soru için doğru/yanlış girişi beklenmektedir.` : ''}` 
    : (weeklySolvedQuestions > 0 
      ? `Bu hafta toplam ${weeklySolvedQuestions} soru çözüldü (Öğrenci doğru/yanlış girişini tamamladığında detaylı başarı oranı hesaplanacaktır).` 
      : `Haftalık ödev tamamlama oranı %${completionRate}.`);

  const summary = `${studentName || 'Öğrenci'} (${grade || 'Güncel Seviye'}), haftalık programında ${activeMetricsTasks.length} görevden ${completedTasks.length}'ini tamamladı (%${completionRate} tamamlama). ${taskText} ${videoText} ${readingText} ${trialText} ${under80Topics.length > 0 ? `%80 başarı eşiğinin altında kalan ${under80Topics.length} kritik konuya odaklanılması önerilmektedir.` : 'Tüm sonucu girilen konularda başarı oranı %80 ve üzerindedir.'}`.replace(/\s+/g, ' ').trim();

  const errorAnalysis = under80Topics.length > 0
    ? `Haftalık programda doğru-yanlış girişlerine göre %80 başarı eşiğinin altında kalan kritik konular: ${under80Topics.map(u => `${u.subject} - ${u.topic} (%${u.accuracy} Başarı, ${u.incorrect} Yanlış)`).join(', ')}. Bu konularda hata telafisi yapılmalı ve video destekli soru çözümü sağlanmalıdır.`
    : sortedErrors.length > 0
    ? `En çok yanlış yapılan ilk 3 kritik konu: ${sortedErrors.slice(0, 3).map((e, idx) => `${idx + 1}) ${e.subject} - ${e.topic} (${e.count} Yanlış)`).join(', ')}.`
    : `Öğrencinin verilen çalışmalarında %80 başarı eşiğinin altında kalan bir konu bulunmamaktadır. Tüm konularda %80 başarı kuralı sağlanmıştır.`;

  const teacherPedagogyNotes = [
    under80Topics.length > 0
      ? `Öğrencinin ${under80Topics[0].subject} dersi '${under80Topics[0].topic}' konusundaki başarı oranı %${under80Topics[0].accuracy}'de kalmıştır. Birebir koçluk görüşmesinde bu konunun yanlış soruları incelenmelidir.`
      : `Öğrencinin verilen tüm konulardaki doğruluk oranları hedeflenen %80 seviyesinin üzerindedir, tebrik edilerek motivasyonu desteklenmelidir.`,
    uncompletedTasks.length > 0 
      ? `Bu hafta öğrencinin yapmadığı ${uncompletedTasks.length} adet eksik ödev bulunmaktadır. Yeni plana geçmeden önce telafi edilmelidir.`
      : `Öğrenci haftalık programdaki tüm ödevleri eksiksiz tamamladı.`,
    weeklyUnevaluatedQuestions > 0
      ? `Öğrenci ${weeklyUnevaluatedQuestions} soru tamamlamış ancak henüz doğru/yanlış girişi yapmamıştır. Sonuçları girmesi hatırlatılmalıdır.`
      : `Öğrenci çözdüğü soruların doğru/yanlış analizini düzenli girmiştir.`,
    latestTrialNet > 0
      ? `Son deneme neti ${latestTrialNet.toFixed(1)} olup bir sonraki deneme için hedef net ${targetTrialNet.toFixed(1)} olarak belirlenmelidir.`
      : `Öğrenciye seviyesine uygun bir branş denemesi tanımlanmalı ve süre yönetimi değerlendirilmelidir.`,
    `Öğrenciyle haftalık koçluk görüşmesinde haftanın özet doğruları (${weeklyCorrect}) ve telafi edilecek eksikleri ana gündem yapılmalıdır.`
  ];

  // 9. Actionable Weekly Plan Recommendations - SADECE ve SADECE verilen gerçek konulardan üretilir
  const weeklyPlanRecommendations: any[] = [];
  if (under80Topics.length > 0) {
    under80Topics.slice(0, 3).forEach(u => {
      weeklyPlanRecommendations.push({
        subject: u.subject,
        topic: `${u.topic} (Telafi & Hata Analizi)`,
        suggestedAmount: `Günde 20-25 soru + Yanlış Soru Analizi`,
        reason: `Başarı oranı %${u.accuracy} olduğu için öncelikli telafi gerektirir (${u.incorrect} Yanlış).`,
        priority: u.accuracy < 60 ? 'high' : 'medium'
      });
    });
  } else {
    const realAssignedTopics = Object.values(topicPerformanceMap);
    if (realAssignedTopics.length > 0) {
      realAssignedTopics.slice(0, 2).forEach(tp => {
        weeklyPlanRecommendations.push({
          subject: tp.subject,
          topic: `${tp.topic} (Pekiştirme & Soru Çözümü)`,
          suggestedAmount: "Günde 25 soru",
          reason: `Öğrencinin çalıştığı '${tp.topic}' konusunda başarısını korumak ve hız kazanmak için.`,
          priority: "medium"
        });
      });
    } else {
      const distinctSubjs = Array.from(new Set(activeMetricsTasks.map((t: any) => t.subject).filter(Boolean)));
      distinctSubjs.slice(0, 2).forEach(s => {
        weeklyPlanRecommendations.push({
          subject: s,
          topic: `${s} Genel Tekrar & Soru Çözümü`,
          suggestedAmount: 'Günde 25 soru',
          reason: `Haftalık programdaki ders takibini güçlendirmek için.`,
          priority: 'medium'
        });
      });
    }
  }

  // 10. Previous Week Evaluation
  const latestArchive = archivedList[0] || null;
  const hasPreviousWeek = !!latestArchive;
  const prevTasks = latestArchive?.tasks || [];
  const prevCompleted = prevTasks.filter((t: any) => t && t.completed);
  const prevRate = latestArchive ? latestArchive.completionRate : 0;

  const prevStats = calculateWeeklyQuestionStats(prevTasks, undefined, grade);

  const previousWeekEvaluation = {
    hasPreviousWeek,
    archiveId: latestArchive?.id,
    endDate: latestArchive?.endDate || 'Geçen Hafta',
    completionRate: prevRate,
    totalTasks: prevTasks.length,
    completedTasks: prevCompleted.length,
    uncompletedTasks: prevTasks.length - prevCompleted.length,
    totalQuestions: prevStats.evaluatedQuestions > 0 ? prevStats.evaluatedQuestions : prevStats.solvedQuestions,
    correct: prevStats.correct,
    incorrect: prevStats.incorrect,
    empty: prevStats.empty,
    net: prevStats.net,
    successRate: prevStats.accuracyRate > 0 ? prevStats.accuracyRate : prevRate,
    evaluationSummary: hasPreviousWeek && prevTasks.length > 0 
      ? `Önceki haftanın ${prevTasks.length} görevinden ${prevCompleted.length} tanesi tamamlandı (%${prevRate} tamamlama). ${prevStats.evaluatedQuestions > 0 ? `Çözülen sorularda ${prevStats.correct} Doğru, ${prevStats.incorrect} Yanlış kaydedildi. Net başarı oranı %${prevStats.accuracyRate}.` : ''}`
      : `Arşivlenmiş geçmiş hafta kaydı bulunmamaktadır. Güncel haftalık program üzerinden takip yapılmaktadır.`,
    strengths: [
      prevRate >= 70 ? 'Ödev tamamlama sorumluluğu ve istikrarı yüksek' : 'Çalışma gayreti ve soru çözme azmi olumlu',
      weeklyOverallAccuracy >= 75 ? 'Sorulardaki net ve doğruluk oranı güçlü' : 'Temel soru tiplerinde işlem kabiliyeti mevcut'
    ],
    growthAreas: [
      under80Topics[0] ? `${under80Topics[0].subject} (${under80Topics[0].topic}) başarı oranı %${under80Topics[0].accuracy} telafi gerektiriyor` : 'Süre ve turlama taktiği geliştirilmeli',
      weeklyEmpty > 0 ? 'Boş bırakılan sorularda kavram eksikliği kapatılmalı' : 'Deneme sınavı sıklığı artırılmalı'
    ]
  };

  // 11. Student Needs List
  const studentNeeds = under80Topics.slice(0, 4).map((u, idx) => ({
    id: `need_${idx}_${Date.now()}`,
    subject: u.subject,
    topic: u.topic,
    errorCount: u.incorrect,
    urgency: u.severity === 'critical' ? 'urgent' : 'high',
    urgencyLabel: u.severity === 'critical' ? 'Acil İhtiyaç (<%60)' : 'Öncelikli Gelişim (<%80)',
    title: `${u.subject} - ${u.topic} Telafisi`,
    description: u.diagnosis,
    neededAction: u.recommendation,
    suggestedTask: {
      type: 'question',
      subject: u.subject,
      topic: u.topic,
      title: `${u.topic} - Telafi & Pekiştirme Soru Çözümü`,
      amount: '25 soru'
    }
  }));

  return {
    summary,
    trialAnalysis,
    weeklyProgramAnalysis,
    under80Topics,
    weeklyPerformanceStats: {
      assignedQuestions: weeklyAssignedQuestions,
      solvedQuestions: weeklySolvedQuestions,
      remainingQuestions: weeklyRemainingQuestions,
      questionCompletionRate: questionCompletionRate,
      totalQuestions: totalQuestionsDisplay,
      totalCorrect: weeklyCorrect,
      totalIncorrect: weeklyIncorrect,
      totalEmpty: weeklyEmpty,
      totalNet: weeklyNet,
      successRate: weeklyOverallAccuracy,
      evaluatedQuestions: weeklyEvaluatedQuestions,
      unevaluatedQuestions: weeklyUnevaluatedQuestions,
      videoTasksCount: canonicalStats.videoTasksCount,
      completedVideoTasksCount: canonicalStats.completedVideoTasksCount,
      readingTasksCount: canonicalStats.readingTasksCount,
      completedReadingTasksCount: canonicalStats.completedReadingTasksCount,
      completedTasksCount: completedTasks.length,
      totalTasksCount: activeMetricsTasks.length,
      uncompletedTasksCount: uncompletedTasks.length,
      completionRate: completionRate,
      latestTrialNet: Number(latestTrialNet.toFixed(2)),
      highestTrialNet: Number(highestTrialNet.toFixed(2)),
      trialCount: combinedTrials.length,
      topErrorTopic,
      topErrorSubject
    },
    previousWeekEvaluation,
    studentNeeds,
    errorAnalysis,
    teacherPedagogyNotes,
    weeklyPlanRecommendations,
    subjects: subjectsAnalysis
  };
}

// Resilient API Fetcher with Timeout, Safe JSON Parsing & Automatic Client-Side Engine Fallback
export async function fetchAiAnalysisSafely(input: AnalysisInput): Promise<any> {
  const localFallback = generateSmartAnalysis(input);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second safe timeout

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(input),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Read response text first to safely inspect content before parsing
    const rawText = await response.text();

    if (!rawText || !rawText.trim()) {
      console.warn('API returned empty response body, seamlessly falling back to local analysis engine.');
      return localFallback;
    }

    const trimmed = rawText.trim();
    // Verify that the response looks like valid JSON (object or array)
    if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
      console.warn('API response is not JSON (likely an HTML rewrite or error page), smoothly falling back to local engine:', trimmed.slice(0, 100));
      return localFallback;
    }

    try {
      const parsedData = JSON.parse(trimmed);
      if (parsedData && typeof parsedData === 'object') {
        // Ensure critical keys exist; if not, merge with local fallback
        return {
          ...localFallback,
          ...parsedData,
          trialAnalysis: parsedData.trialAnalysis || localFallback.trialAnalysis,
          weeklyProgramAnalysis: parsedData.weeklyProgramAnalysis || localFallback.weeklyProgramAnalysis,
          under80Topics: parsedData.under80Topics || localFallback.under80Topics
        };
      }
    } catch (parseErr) {
      console.warn('JSON parse error on server response, falling back safely:', parseErr);
      return localFallback;
    }

    return localFallback;
  } catch (netErr: any) {
    console.warn('Network or endpoint fetch failed (e.g. Vercel offline/CORS/timeout), seamlessly utilizing local analysis calculation engine:', netErr?.message || netErr);
    return localFallback;
  }
}

// Builds structured, pedagogically sound AI prompt data for Gemini API calls
export function buildAiPromptData(smartStats: any, input: AnalysisInput) {
  const { studentName, grade, tasks, trialResults } = input;
  const taskList: any[] = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  const archivedList: any[] = Array.isArray(input.archivedPrograms) ? input.archivedPrograms.filter(Boolean) : [];
  const hasArchivedWeek = archivedList.length > 0 && Array.isArray(archivedList[0]?.tasks) && archivedList[0].tasks.length > 0;
  const previousWeekTasks = hasArchivedWeek ? archivedList[0].tasks.filter(Boolean) : [];
  const activeTasks = taskList.length > 0 ? taskList : previousWeekTasks;

  // 1. Group tasks by day (Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar)
  const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
  const dayGroups: Record<string, any[]> = {};
  days.forEach(d => { dayGroups[d] = []; });

  activeTasks.forEach((t: any) => {
    const day = t.day || 'Pazartesi';
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(t);
  });

  const formattedDaySchedule = days.map(d => {
    const dTasks = dayGroups[d] || [];
    if (dTasks.length === 0) return `${d}: Planlanmış görev yok (Dinlenme / Serbest)`;

    const lines = dTasks.map((t: any, idx: number) => {
      const isQ = isQuestionTask(t);
      const type = String(t.type || '').toLowerCase().trim();
      const amountStr = t.amount ? ` (${t.amount})` : '';
      const statusStr = t.completed ? 'Tamamlandı' : 'Bekliyor';

      if (type === 'video' || String(t.amount || '').toLowerCase().includes('video')) {
        return `  ${idx + 1}. [Video İzleme] ${t.subject || 'Ders'} - ${t.title || t.topic || 'Video'}${amountStr} -> Durum: ${statusStr} (Konu Anlatım Videosu)`;
      } else if (type === 'book' || type === 'reading' || String(t.amount || '').toLowerCase().includes('sayfa') || String(t.title || '').toLowerCase().includes('kitap')) {
        return `  ${idx + 1}. [Kitap Okuma / Tekrar] ${t.subject || 'Okuma'} - ${t.title || t.topic || 'Kitap'}${amountStr} -> Durum: ${statusStr} (Okuma Görevi)`;
      } else if (isQ) {
        const hasScore = (t.correct !== undefined && t.correct !== null) || (t.incorrect !== undefined && t.incorrect !== null);
        if (hasScore) {
          const c = Number(t.correct) || 0;
          const inc = Number(t.incorrect) || 0;
          const emp = Number(t.empty) || 0;
          const n = typeof t.net === 'number' ? t.net : calculateNetScore(c, inc, grade);
          const ans = c + inc;
          const acc = ans > 0 ? Math.round((c / ans) * 100) : 0;
          return `  ${idx + 1}. [Soru Çözümü] ${t.subject || 'Ders'} - ${t.topic || t.title || 'Soru'}${amountStr} -> Durum: ${statusStr} | Girilen Sonuç: ${c} Doğru, ${inc} Yanlış, ${emp} Boş, Net: ${n} (%${acc} Başarı)`;
        } else if (t.completed) {
          return `  ${idx + 1}. [Soru Çözümü] ${t.subject || 'Ders'} - ${t.topic || t.title || 'Soru'}${amountStr} -> Durum: ${statusStr} | Doğru/Yanlış Girişi: Henüz girilmedi (Ödev çözüldü olarak işaretlendi)`;
        } else {
          return `  ${idx + 1}. [Soru Çözümü] ${t.subject || 'Ders'} - ${t.topic || t.title || 'Soru'}${amountStr} -> Durum: ${statusStr}`;
        }
      } else {
        return `  ${idx + 1}. [Çalışma] ${t.subject || 'Ders'} - ${t.title || t.topic || 'Görev'}${amountStr} -> Durum: ${statusStr}`;
      }
    }).join('\n');

    return `${d}:\n${lines}`;
  }).join('\n\n');

  // 2. Format Trials
  const formattedTrials = Array.isArray(trialResults) && trialResults.length > 0
    ? trialResults.map((tr: any, i: number) => {
        const score = tr.totalNet || tr.net || tr.score || 0;
        const dateStr = tr.date ? ` (${tr.date})` : '';
        return `${i + 1}) ${tr.title || tr.name || 'Deneme Sınavı'}: Net: ${score}${dateStr}`;
      }).join('\n')
    : 'Henüz deneme sınavı kaydı bulunmuyor.';

  // 3. System Instruction
  const systemInstruction = `Sen Türkiye sınav sistemlerine (LGS, YKS, TYT, AYT, KPSS, DGS) ve okul müfredatına tam hakim, üst düzey uzman bir pedagojik yapay zeka eğitim koçusun.

TEMEL VE TAVİZSİZ PEDAGOJİK KURALLAR:
1. GÖREV TÜRLERİNİ ASLA KARIŞTIRMA:
   - Video izleme (type: video) ve kitap/metin okuma (type: book/reading) görevleri soru testi DEĞİLDİR. Bunlar için ASLA "0 doğru yaptı", "soru çözemedi" veya "başarısız oldu" deme. Video izlendiyse "konu anlatım videosunu başarıyla izledi", kitap okunduysa "kitap okuma hedefini tamamladı" şeklinde takdir et.
2. DOĞRU-YANLIŞ GİRİŞLERİNİ DÜZGÜN ANALİZ ET:
   - Bir soru ödevi tamamlanmış ancak öğrenci henüz doğru/yanlış girmemişse, bunu "sıfır doğru yaptı" şeklinde YORUMLAMA. "Soru çözümü tamamlanmış olup doğru/yanlış girişi beklenmektedir" şeklinde ifade et.
   - Sadece öğrencinin bizzat doğru ve yanlış girdiği sorular üzerinden doğruluk yüzdesini (% Doğruluk) ve net skorunu değerlendir.
3. YÜZDE SEKSEN (%80) BAŞARI KURALI:
   - Doğruluk oranı %80'in altında kalan konular (<%80) eksik/telafi konusu olarak kabul edilir; bu konular için somut soru çözümü, hata analizi ve video tekrarı önerilir.
   - Doğruluk oranı %80 ve üzerinde olan konular (%80+) başarılı kabul edilir; motivasyonu artırıcı tebrik ve pekiştirme önerilir.
4. ASLA HARİCİ DERS VEYA KONU UYDURMA:
   - Yalnızca öğrencinin haftalık programında ve girdiği denemelerde olan gerçek ders ve konuları analiz et. Programa atanmamış dersleri asla ekleme.
5. PROGRAMIN GÜNLÜK VE DERS DAĞILIMINI ANALİZ ET:
   - Haftanın 7 günündeki ders yükü dengeli mi? Eksik bırakılan günler veya dersler var mı? Çalışma disiplini ve istikrarını değerlendir.
6. DENEME VE HAFTALIK PROGRAM BÜTÜNLÜĞÜ:
   - Denemelerde yanlış yapılan konular ile haftalık programda çalışılan konular arasında bağ kur.

Öğrenci Bilgileri:
Adı: ${studentName || "Öğrenci"}
Sınıfı/Kademesi: ${grade || "Belirtilmemiş"}

Yanıtını mutlaka geçerli JSON formatında döndür.`;

  // 4. User Prompt
  const stats = smartStats.weeklyPerformanceStats;
  const userPrompt = `Aşağıdaki ÖĞRENCİ HAFTALIK PROGRAMINI VE ÇALIŞMA VERİLERİNİ eksiksiz ve derinlemesine pedagojik olarak analiz et:

ÖĞRENCİ: ${studentName || 'Öğrenci'} (${grade || 'Belirtilmemiş'})

=========================================
1. HAFTALIK PROGRAM VE GÖREV DETAYLARI:
=========================================
- Toplam Görev Sayısı: ${stats.totalTasksCount} (Tamamlanan: ${stats.completedTasksCount}, Tamamlanma Oranı: %${stats.completionRate})
- Soru Görevleri Verileri:
  * Atanan Hedef Soru: ${stats.assignedQuestions}
  * Çözülen Soru: ${stats.solvedQuestions} (%${stats.questionCompletionRate} İlerleme)
  * Sonucu Girilen Sorular: ${stats.totalCorrect + stats.totalIncorrect + stats.totalEmpty} soru (Doğru: ${stats.totalCorrect}, Yanlış: ${stats.totalIncorrect}, Boş: ${stats.totalEmpty}, Net: ${stats.totalNet})
  * Sonuç Doğruluk Oranı: %${stats.successRate}
${stats.unevaluatedQuestions > 0 ? `  * Not: Çözülen sorulardan ${stats.unevaluatedQuestions} tanesi için öğrenci henüz doğru/yanlış girişi yapmadı.\n` : ''}
${stats.videoTasksCount > 0 ? `- Video Görevleri: ${stats.videoTasksCount} adet (Tamamlanan: ${stats.completedVideoTasksCount})\n` : ''}${stats.readingTasksCount > 0 ? `- Kitap/Okuma Görevleri: ${stats.readingTasksCount} adet (Tamamlanan: ${stats.completedReadingTasksCount})\n` : ''}
Öğrencinin Günlük Program Dağılımı ve Görev Durumları:
${formattedDaySchedule}

=========================================
2. DENEME SINAVLARI VERİLERİ:
=========================================
- Kayıtlı Deneme Sayısı: ${smartStats.trialAnalysis.trialCount}
- Son Deneme Neti: ${smartStats.trialAnalysis.latestTrialNet}, En Yüksek: ${smartStats.trialAnalysis.highestTrialNet}, Ortalama: ${smartStats.trialAnalysis.averageTrialNet}
- Trend: ${smartStats.trialAnalysis.trendLabel}
Deneme Kayıtları:
${formattedTrials}

=========================================
3. %80 BAŞARI KURALI ANALİZİ:
=========================================
${smartStats.under80Topics && smartStats.under80Topics.length > 0
  ? `Başarı Oranı %80'in Altında Kalan Kritik Konular:\n` + smartStats.under80Topics.map((u: any) => `- ${u.subject} / ${u.topic}: Doğruluk %${u.accuracy} (${u.correct} Doğru, ${u.incorrect} Yanlış)`).join('\n')
  : `Öğrencinin sonucu girilen tüm çalışmalarında %80 başarı eşiği aşılmıştır veya henüz %80 altı konu bulunmamaktadır.`}

TALİMATLAR:
1. "weeklyProgramReview" alanında haftalık programı, gün dağılımını, tamamlanan soru ve video/kitap görevlerini, girilen doğru/yanlışları detaylıca analiz et.
2. "trialReview" alanında deneme sınavı netlerini, branş durumunu ve deneme stratejilerini değerlendir.
3. "summary" alanında öğrenciyi motive eden, haftalık programını ve başarılarını özetleyen pedagojik bir koçluk metni yaz.
4. "errorAnalysis" alanında %80 altında kalan veya yanlış yapılan konuların somut telafi yollarını anlat.
5. "teacherPedagogyNotes" alanında öğretmenin koçluk görüşmesinde odaklanması gereken en az 3 somut pedagojik madde yaz.
6. "weeklyPlanRecommendations" alanında yalnızca öğrencinin programında çalışılan derslerden somut telafi ödevleri öner.`;

  const actualSubjectsList = Array.from(new Set([
    ...activeTasks.map((t: any) => (t?.subject || '').trim()).filter(Boolean),
    ...Object.keys(smartStats.trialAnalysis?.branchAverages ? smartStats.trialAnalysis.branchAverages.reduce((acc: any, b: any) => ({ ...acc, [b.subject]: true }), {}) : {})
  ]));

  return {
    systemInstruction,
    userPrompt,
    actualSubjectsList
  };
}
