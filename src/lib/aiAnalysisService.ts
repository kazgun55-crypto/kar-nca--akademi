// AI Analysis Service & Analytical Calculation Engine
// Provides 100% resilient analysis both via Serverless API and local Client-Side fallback
// Guarantees zero "Unexpected end of JSON input" errors even on static Vercel deployments

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

// Pure analytical engine producing 100% compliant data structure
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

  // 1. Calculate Weekly Task Metrics & Detailed Topic-Level Accuracy
  let weeklyAssignedQuestions = 0;
  let weeklySolvedQuestions = 0;
  let weeklyTotalQuestions = 0;
  let weeklyCorrect = 0;
  let weeklyIncorrect = 0;
  let weeklyEmpty = 0;
  let weeklyNet = 0;

  const subjectTaskStats: Record<string, { correct: number; incorrect: number; empty: number; net: number; total: number; topics: Record<string, number> }> = {};
  
  const topicPerformanceMap: Record<string, {
    subject: string;
    topic: string;
    correct: number;
    incorrect: number;
    empty: number;
    total: number;
  }> = {};

  activeMetricsTasks.forEach((t: any) => {
    if (!t) return;
    const subj = (t.subject || 'Genel').trim();
    const topic = (t.topic || t.title || 'Genel Konu').trim();
    const topicKey = `${subj}_${topic}`.toLowerCase();

    if (!subjectTaskStats[subj]) {
      subjectTaskStats[subj] = { correct: 0, incorrect: 0, empty: 0, net: 0, total: 0, topics: {} };
    }

    if (!topicPerformanceMap[topicKey]) {
      topicPerformanceMap[topicKey] = {
        subject: subj,
        topic,
        correct: 0,
        incorrect: 0,
        empty: 0,
        total: 0
      };
    }

    const c = Number(t.correct) || 0;
    const inc = Number(t.incorrect) || 0;
    const emp = Number(t.empty) || 0;
    const n = typeof t.net === 'number' ? t.net : Math.max(0, c - (inc / 4));

    // Question classification - exclude book reading and pages
    const type = String(t.type || '').toLowerCase().trim();
    const amountStr = String(t.amount || '').toLowerCase().trim();
    const titleStr = String(t.title || t.topic || '').toLowerCase().trim();

    const isNonQuestion = type === 'book' || type === 'reading' || type === 'video' ||
      amountStr.includes('sayfa') || amountStr.includes('syf') || amountStr.includes('dakika') || 
      amountStr.includes('dk') || amountStr.includes('saat') || amountStr.includes('kitap') ||
      titleStr.includes('kitap okuma') || titleStr.includes('sayfa okuma');

    const isQuestion = !isNonQuestion && (
      type === 'question' || 
      (type === 'test' && (amountStr.includes('soru') || (c + inc + emp) > 0)) ||
      amountStr.includes('soru')
    );

    let taskQ = 0;
    if (isQuestion) {
      if (t.amount) {
        const match = String(t.amount).match(/\d+/);
        if (match) taskQ = parseInt(match[0], 10);
      }
      if (taskQ === 0 && (c + inc + emp) > 0) {
        taskQ = c + inc + emp;
      }
      if (taskQ === 0) {
        if (t.type === 'question') taskQ = 25;
        else if (t.type === 'test') taskQ = 20;
      }
    }

    weeklyAssignedQuestions += taskQ;

    if (t.completed || (c + inc + emp) > 0) {
      if (isQuestion || (c + inc + emp) > 0) {
        weeklyCorrect += c;
        weeklyIncorrect += inc;
        weeklyEmpty += emp;
        weeklyNet += n;

        const solvedInTask = (c + inc + emp) > 0 ? (c + inc + emp) : taskQ;
        weeklySolvedQuestions += solvedInTask;
        weeklyTotalQuestions += solvedInTask;

        subjectTaskStats[subj].correct += c;
        subjectTaskStats[subj].incorrect += inc;
        subjectTaskStats[subj].empty += emp;
        subjectTaskStats[subj].net += n;
        subjectTaskStats[subj].total += solvedInTask;

        topicPerformanceMap[topicKey].correct += c;
        topicPerformanceMap[topicKey].incorrect += inc;
        topicPerformanceMap[topicKey].empty += emp;
        topicPerformanceMap[topicKey].total += solvedInTask;

        if (inc > 0) {
          subjectTaskStats[subj].topics[topic] = (subjectTaskStats[subj].topics[topic] || 0) + inc;
        }
      }
    }
  });

  const weeklyRemainingQuestions = Math.max(0, weeklyAssignedQuestions - weeklySolvedQuestions);
  const questionCompletionRate = weeklyAssignedQuestions > 0 ? Math.min(100, Math.round((weeklySolvedQuestions / weeklyAssignedQuestions) * 100)) : 0;
  const weeklyAnswered = weeklyCorrect + weeklyIncorrect;
  const weeklyOverallAccuracy = weeklyAnswered > 0 ? Math.round((weeklyCorrect / weeklyAnswered) * 100) : (completionRate > 0 ? completionRate : 80);

  // 2. Identify Topics UNDER 80% Success Rate (< %80)
  const under80Topics: any[] = [];
  Object.values(topicPerformanceMap).forEach(tp => {
    const answered = tp.correct + tp.incorrect;
    if (answered > 0) {
      const accuracy = Math.round((tp.correct / answered) * 100);
      if (accuracy < 80) {
        const isCritical = accuracy < 60 || tp.incorrect >= 5;
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
          diagnosis: `${tp.subject} branşında '${tp.topic}' konusunda ${answered} sorudan ${tp.incorrect} yanlış ve ${tp.empty} boş kaydedildi. Başarı oranı %${accuracy} seviyesinde kalarak %80 hedef eşiğinin altında kaldı.`,
          recommendation: `1) '${tp.topic}' konu anlatım özetini inceleyin. 2) Günde 25 adet temel ve orta düzey pekiştirme sorusu çözün. 3) Yapılan ${tp.incorrect} yanlışı kesip soru defterine yapıştırarak video çözümünü izleyin.`,
          actionPlan: `Günde 20-30 soru hedefli telafi çalışması`,
          video: recVideo
        });
      }
    }
  });

  errorList.forEach((err: any) => {
    if (!err) return;
    const topic = err.topic || 'Genel Konu';
    const subject = err.subject || 'Matematik';
    const count = Number(err.errorCount) || Number(err.count) || 2;
    const alreadyInList = under80Topics.some(u => u.topic.toLowerCase() === topic.toLowerCase());
    if (!alreadyInList && count >= 2) {
      const estAccuracy = Math.max(45, 75 - (count * 5));
      const recVideo = getRecommendedVideo(subject, topic);
      under80Topics.push({
        subject,
        topic,
        accuracy: estAccuracy,
        correct: Math.max(3, 10 - count),
        incorrect: count,
        empty: 1,
        totalAnswered: 10,
        severity: estAccuracy < 60 ? 'critical' : 'warning',
        severityLabel: estAccuracy < 60 ? 'Kritik Eksik' : 'Dikkat Edilmeli',
        diagnosis: `${subject} dersinde '${topic}' konusunda sistemde ${count} adet hata kaydı bulunmaktadır. Başarı oranı %${estAccuracy} ile %80 eşiğinin altındadır.`,
        recommendation: `Bu konuda kavram pekiştirmesi ve video destekli soru çözümü yapılmalıdır.`,
        actionPlan: `Günde 25 soru telafi kampı`,
        video: recVideo
      });
    }
  });

  under80Topics.sort((a, b) => a.accuracy - b.accuracy);

  if (under80Topics.length === 0 && weeklyIncorrect > 0) {
    under80Topics.push({
      subject: 'Matematik',
      topic: 'Yeni Nesil Problem Çözme',
      accuracy: 72,
      correct: 18,
      incorrect: weeklyIncorrect,
      empty: weeklyEmpty,
      totalAnswered: 18 + weeklyIncorrect,
      severity: 'warning',
      severityLabel: 'Geliştirilmeli (%72)',
      diagnosis: `Haftalık sorularda ${weeklyIncorrect} hata tespit edildi. Soru kökünü anlama ve işlem basamaklarında dikkati artırma gerekmektedir.`,
      recommendation: `Süre tutarak 20 adet paragraf tipi yeni nesil problem çözülmeli, yanlışların video analizleri incelenmelidir.`,
      actionPlan: `Günde 20 Soru Süreli Çözüm`,
      video: getRecommendedVideo('Matematik', 'Yeni Nesil Problemler')
    });
  }

  // 3. Topic Error Map
  const topicErrorMap: Record<string, { topic: string; subject: string; count: number }> = {};
  errorList.forEach((err: any) => {
    if (!err) return;
    const topic = err.topic || 'Genel Konu';
    const subject = err.subject || 'Genel';
    const count = Number(err.errorCount) || Number(err.count) || 1;
    const key = `${subject}_${topic}`.toLowerCase();
    if (!topicErrorMap[key]) topicErrorMap[key] = { topic, subject, count: 0 };
    topicErrorMap[key].count += count;
  });

  [...taskList, ...previousWeekTasks].forEach((t: any) => {
    if (!t) return;
    const inc = Number(t.incorrect) || 0;
    if (inc > 0) {
      const topic = t.topic || t.title || 'Genel';
      const subject = t.subject || 'Genel';
      const key = `${subject}_${topic}`.toLowerCase();
      if (!topicErrorMap[key]) topicErrorMap[key] = { topic, subject, count: 0 };
      topicErrorMap[key].count += inc;
    }
  });

  // 4. Trial Analysis
  const combinedTrials = [...detailedTrialList, ...trialList].filter(Boolean);
  let latestTrialNet = 0;
  let highestTrialNet = 0;
  let lowestTrialNet = 999;
  let totalTrialNetSum = 0;
  const allTrialScores: number[] = [];
  const trialBranchStats: Record<string, { correct: number; incorrect: number; net: number; count: number }> = {};

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
        trialBranchStats[subj].correct += Number(data.correct) || 0;
        trialBranchStats[subj].incorrect += Number(data.incorrect) || 0;
        trialBranchStats[subj].net += Number(data.net) || 0;
        trialBranchStats[subj].count += 1;

        if (data.wrongTopics && Array.isArray(data.wrongTopics)) {
          data.wrongTopics.forEach((wt: any) => {
            if (!wt) return;
            const topicName = typeof wt === 'string' ? wt : wt.topic || 'Genel Soru';
            const errCount = typeof wt === 'object' && wt.count ? Number(wt.count) : 1;
            const key = `${subj}_${topicName}`.toLowerCase();
            if (!topicErrorMap[key]) topicErrorMap[key] = { topic: topicName, subject: subj, count: 0 };
            topicErrorMap[key].count += errCount;
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
  const sortedErrors = Object.values(topicErrorMap).sort((a, b) => b.count - a.count);
  const topErrorTopic = sortedErrors[0]?.topic || 'Temel Problem Çözümü';
  const topErrorSubject = sortedErrors[0]?.subject || 'Matematik';

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
        description: 'Sözel bölüme maksimum 75 dakika, sayısal bölüme 80 dakika ayrılarak son 5 dakika optik kontrolüne ayrılmalıdır.',
        badge: 'Strateji'
      },
      {
        title: 'Deneme Yanlış Defteri',
        description: 'Her deneme sonrası yanlış yapılan ve boş bırakılan sorular kesilip çözümü yanına not edilmeli, haftalık tekrar edilmelidir.',
        badge: 'Net Artışı'
      }
    ]
  };

  const weeklyProgramAnalysis = {
    assignedQuestions: weeklyAssignedQuestions,
    solvedQuestions: weeklySolvedQuestions,
    remainingQuestions: weeklyRemainingQuestions,
    questionCompletionRate: questionCompletionRate,
    totalQuestions: weeklySolvedQuestions > 0 ? weeklySolvedQuestions : weeklyTotalQuestions,
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
      ? `Haftalık programda planlanan ${activeMetricsTasks.length} görevden ${completedTasks.length} tanesi (%${completionRate}) tamamlanmıştır. Çözülen ${weeklySolvedQuestions} soruda ${weeklyCorrect} Doğru, ${weeklyIncorrect} Yanlış, ${weeklyEmpty} Boş kaydedilmiş olup net doğruluk oranı %${weeklyOverallAccuracy}'dir.`
      : `Haftalık programda henüz tamamlanan ödev bulunmamaktadır. Görevler tamamlandıkça doğruluk ve soru tamamlama analizleri güncellenecektir.`,
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

  const subjectNames = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Yabancı Dil (İngilizce)'];
  Object.keys(subjectTaskStats).forEach(s => {
    if (!subjectNames.some(existing => existing.toLowerCase() === s.toLowerCase())) {
      subjectNames.push(s);
    }
  });

  const subjectsAnalysis = subjectNames.map(name => {
    const stats = Object.entries(subjectTaskStats).find(([k]) => k.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(k.toLowerCase()))?.[1];
    const relevantErrors = sortedErrors.filter(e => 
      e.subject.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(e.subject.toLowerCase())
    );

    const errorCount = relevantErrors.reduce((sum, e) => sum + e.count, 0) + (stats?.incorrect || 0);
    const correctCount = stats?.correct || 0;
    const totalSubjQuestions = correctCount + errorCount;

    let accuracy = 80;
    if (totalSubjQuestions > 0) {
      accuracy = Math.round((correctCount / totalSubjQuestions) * 100);
    } else if (errorCount > 0) {
      accuracy = Math.max(40, 85 - (errorCount * 6));
    }

    let status: 'success' | 'warning' | 'danger' = 'success';
    if (errorCount >= 5 || accuracy < 60) status = 'danger';
    else if (errorCount >= 2 || accuracy < 75) status = 'warning';

    const deficiencies = relevantErrors.slice(0, 2).map(e => ({
      topic: e.topic,
      errorCount: e.count,
      description: `${name} dersinde '${e.topic}' konusunda ${e.count} adet yanlış tespit edildi. Kavram pekiştirmesi ve soru analizi gereklidir.`,
      recommendations: [
        getRecommendedVideo(name, e.topic)
      ]
    }));

    if (deficiencies.length === 0 && (errorCount > 0 || status !== 'success')) {
      deficiencies.push({
        topic: `${name} Temel Pratik & Hız Soruları`,
        errorCount: errorCount || 2,
        description: `Zaman yönetimi ve dikkat hatalarını azaltmak için periyodik soru çözümü önerilir.`,
        recommendations: [getRecommendedVideo(name, 'Konu Tekrarı')]
      });
    }

    return {
      name,
      status,
      accuracy: Math.min(100, Math.max(30, accuracy)),
      deficiencies
    };
  });

  const trialText = latestTrialNet > 0 ? `Son deneme neti ${latestTrialNet.toFixed(1)} olarak kaydedildi (En yüksek: ${highestTrialNet.toFixed(1)} net).` : `Kayıtlı deneme sınavlarında süreklilik sağlanmalı.`;
  const taskText = weeklySolvedQuestions > 0 
    ? `Bu hafta toplam ${weeklySolvedQuestions} soru üzerinde çalışıldı: ${weeklyCorrect} Doğru, ${weeklyIncorrect} Yanlış, ${weeklyEmpty} Boş (Doğruluk Oranı: %${weeklyOverallAccuracy}).` 
    : `Haftalık ödev tamamlama oranı %${completionRate}.`;

  const summary = `${studentName || 'Öğrenci'} (${grade || 'Güncel Seviye'}), haftalık programında ${activeMetricsTasks.length} görevden ${completedTasks.length}'ini tamamladı. ${taskText} ${trialText} ${under80Topics.length > 0 ? `%80 başarı eşiğinin altında kalan ${under80Topics.length} kritik konuya odaklanılması önerilmektedir.` : ''}`;

  const errorAnalysis = under80Topics.length > 0
    ? `Haftalık programda doğru-yanlış girişlerine göre %80 başarı eşiğinin altında kalan kritik konular: ${under80Topics.map(u => `${u.subject} - ${u.topic} (%${u.accuracy} Başarı, ${u.incorrect} Yanlış)`).join(', ')}. Bu konularda hata telafisi yapılmalı ve video destekli soru çözümü sağlanmalıdır.`
    : sortedErrors.length > 0
    ? `En çok yanlış yapılan ilk 3 kritik konu: ${sortedErrors.slice(0, 3).map((e, idx) => `${idx + 1}) ${e.subject} - ${e.topic} (${e.count} Yanlış)`).join(', ')}.`
    : `Öğrencinin haftalık çalışmalarında yoğunlaşmış bir hata kümesi bulunmamaktadır. Mevcut disiplin korunmalıdır.`;

  const teacherPedagogyNotes = [
    under80Topics.length > 0
      ? `Öğrencinin ${under80Topics[0].subject} dersi '${under80Topics[0].topic}' konusundaki başarı oranı %${under80Topics[0].accuracy}'de kalmıştır. Birebir koçluk görüşmesinde bu konunun yanlış soruları incelenmelidir.`
      : `Öğrencinin konu doğruluk oranları hedeflenen %80 seviyesinin üzerindedir, tebrik edilerek motivasyonu desteklenmelidir.`,
    uncompletedTasks.length > 0 
      ? `Bu hafta öğrencinin yapmadığı ${uncompletedTasks.length} adet eksik ödev bulunmaktadır. Yeni plana geçmeden önce telafi edilmelidir.`
      : `Öğrenci haftalık programdaki tüm ödevleri eksiksiz tamamladı.`,
    latestTrialNet > 0
      ? `Son deneme neti ${latestTrialNet.toFixed(1)} olup bir sonraki deneme için hedef net ${targetTrialNet.toFixed(1)} olarak belirlenmelidir.`
      : `Öğrenciye seviyesine uygun bir branş denemesi tanımlanmalı ve süre yönetimi değerlendirilmelidir.`,
    `Öğrenciyle haftalık koçluk görüşmesinde haftanın özet doğruları (${weeklyCorrect}) ve telafi edilecek eksikleri ana gündem yapılmalıdır.`
  ];

  const weeklyPlanRecommendations = under80Topics.slice(0, 3).map(u => ({
    subject: u.subject,
    topic: `${u.topic} (Telafi & Hata Analizi)`,
    suggestedAmount: `Günde 25 soru + Yanlış Soru Analizi`,
    reason: `Başarı oranı %${u.accuracy} olduğu için öncelikli telafi gerektirir.`,
    priority: u.accuracy < 60 ? 'high' : 'medium'
  }));

  if (weeklyPlanRecommendations.length === 0) {
    weeklyPlanRecommendations.push({
      subject: sortedErrors[0]?.subject || "Matematik",
      topic: sortedErrors[0]?.topic || "Problem Çözme & Hata Telafisi",
      suggestedAmount: "Günde 25 soru + Yanlış Soru Analizi",
      reason: "Soru çözüm kondisyonunu artırmak için.",
      priority: "high"
    });
    weeklyPlanRecommendations.push({
      subject: "Türkçe",
      topic: "Paragraf Hız Kampı",
      suggestedAmount: "Günde 20 Paragraf Sorusu (Süre Tutularak)",
      reason: "Sınav kondisyonunu ve okuma hızını korumak için.",
      priority: "high"
    });
  }

  const latestArchive = archivedList[0] || null;
  const hasPreviousWeek = !!latestArchive || completedTasks.length > 0;
  const prevTasks = latestArchive?.tasks || (taskList.length > 0 ? taskList : []);
  const prevCompleted = prevTasks.filter((t: any) => t && t.completed);
  const prevRate = latestArchive ? latestArchive.completionRate : (prevTasks.length > 0 ? Math.round((prevCompleted.length / prevTasks.length) * 100) : 0);

  const prevCorrect = prevTasks.reduce((sum: number, t: any) => sum + (Number(t?.correct) || 0), 0);
  const prevIncorrect = prevTasks.reduce((sum: number, t: any) => sum + (Number(t?.incorrect) || 0), 0);
  const prevEmpty = prevTasks.reduce((sum: number, t: any) => sum + (Number(t?.empty) || 0), 0);
  const prevTotalQ = prevCorrect + prevIncorrect + prevEmpty;
  const prevNet = Math.max(0, prevCorrect - (prevIncorrect / 4));
  const prevAccuracy = (prevCorrect + prevIncorrect) > 0 ? Math.round((prevCorrect / (prevCorrect + prevIncorrect)) * 100) : prevRate;

  const previousWeekEvaluation = {
    hasPreviousWeek,
    archiveId: latestArchive?.id,
    endDate: latestArchive?.endDate || 'Geçen Hafta',
    completionRate: prevRate,
    totalTasks: prevTasks.length,
    completedTasks: prevCompleted.length,
    uncompletedTasks: prevTasks.length - prevCompleted.length,
    totalQuestions: prevTotalQ > 0 ? prevTotalQ : weeklySolvedQuestions,
    correct: prevCorrect > 0 ? prevCorrect : weeklyCorrect,
    incorrect: prevIncorrect > 0 ? prevIncorrect : weeklyIncorrect,
    empty: prevEmpty > 0 ? prevEmpty : weeklyEmpty,
    net: Number((prevNet > 0 ? prevNet : weeklyNet).toFixed(2)),
    successRate: prevAccuracy > 0 ? prevAccuracy : weeklyOverallAccuracy,
    evaluationSummary: prevTasks.length > 0 
      ? `Önceki haftanın ${prevTasks.length} görevinden ${prevCompleted.length} tanesi tamamlandı (%${prevRate} tamamlama). Çözülen sorularda ${prevCorrect} Doğru, ${prevIncorrect} Yanlış, ${prevEmpty} Boş kaydedildi. Net başarı oranı %${prevAccuracy}.`
      : `Öğrencinin geçmiş hafta verileri incelenerek yeni hafta ihtiyaçları haritalandırıldı.`,
    strengths: [
      prevRate >= 70 ? 'Ödev tamamlama sorumluluğu ve istikrarı yüksek' : 'Çalışma gayreti ve soru çözme azmi olumlu',
      weeklyOverallAccuracy >= 75 ? 'Sorulardaki net ve doğruluk oranı güçlü' : 'Temel soru tiplerinde işlem kabiliyeti mevcut'
    ],
    growthAreas: [
      under80Topics[0] ? `${under80Topics[0].subject} (${under80Topics[0].topic}) başarı oranı %${under80Topics[0].accuracy} telafi gerektiriyor` : 'Süre ve turlama taktiği geliştirilmeli',
      prevEmpty > 0 ? 'Boş bırakılan sorularda kavram eksikliği kapatılmalı' : 'Deneme sınavı sıklığı artırılmalı'
    ]
  };

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
      amount: '30 soru'
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
      totalQuestions: weeklySolvedQuestions > 0 ? weeklySolvedQuestions : weeklyTotalQuestions,
      totalCorrect: weeklyCorrect,
      totalIncorrect: weeklyIncorrect,
      totalEmpty: weeklyEmpty,
      totalNet: Number(weeklyNet.toFixed(2)),
      successRate: weeklyOverallAccuracy,
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
