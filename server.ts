import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// AI Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  const { studentName, grade, tasks, trialResults, detailedTrials, topicErrors, archivedPrograms } = req.body;

  // Local fallback calculation engine ensuring 100% reliability and deep analytical precision
  const generateSmartAnalysis = () => {
    let taskList: any[] = Array.isArray(tasks) ? tasks : [];
    const trialList: any[] = Array.isArray(trialResults) ? trialResults : [];
    const detailedTrialList: any[] = Array.isArray(detailedTrials) ? detailedTrials : [];
    const errorList: any[] = Array.isArray(topicErrors) ? topicErrors : [];
    const archivedList: any[] = Array.isArray(archivedPrograms) ? archivedPrograms : [];

    // If current weekly tasks are empty but we have an archived program from the finished week, use it to analyze performance
    const hasArchivedWeek = archivedList.length > 0 && Array.isArray(archivedList[0]?.tasks) && archivedList[0].tasks.length > 0;
    const previousWeekTasks = hasArchivedWeek ? archivedList[0].tasks : [];

    // Active dataset for question metrics: prefer active tasks if available; otherwise use previous week's tasks
    const activeMetricsTasks = taskList.length > 0 ? taskList : previousWeekTasks;

    const completedTasks = activeMetricsTasks.filter((t: any) => t && t.completed);
    const uncompletedTasks = activeMetricsTasks.filter((t: any) => t && !t.completed);
    const completionRate = activeMetricsTasks.length > 0 ? Math.round((completedTasks.length / activeMetricsTasks.length) * 100) : 0;

    // 1. Calculate Weekly Task Metrics (Doğru, Yanlış, Boş, Net, Verilen Soru Sayısı)
    let weeklyAssignedQuestions = 0;
    let weeklySolvedQuestions = 0;
    let weeklyTotalQuestions = 0;
    let weeklyCorrect = 0;
    let weeklyIncorrect = 0;
    let weeklyEmpty = 0;
    let weeklyNet = 0;

    const subjectTaskStats: Record<string, { correct: number; incorrect: number; empty: number; net: number; total: number; topics: Record<string, number> }> = {};

    activeMetricsTasks.forEach((t: any) => {
      const subj = (t.subject || 'Genel').trim();
      const topic = (t.topic || t.title || 'Genel Konu').trim();

      if (!subjectTaskStats[subj]) {
        subjectTaskStats[subj] = { correct: 0, incorrect: 0, empty: 0, net: 0, total: 0, topics: {} };
      }

      const c = Number(t.correct) || 0;
      const inc = Number(t.incorrect) || 0;
      const emp = Number(t.empty) || 0;
      const n = typeof t.net === 'number' ? t.net : Math.max(0, c - (inc / 4));

      // Task question calculation
      let taskQ = 0;
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

      weeklyAssignedQuestions += taskQ;

      if (t.completed) {
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

        if (inc > 0) {
          subjectTaskStats[subj].topics[topic] = (subjectTaskStats[subj].topics[topic] || 0) + inc;
        }
      }
    });

    const weeklyRemainingQuestions = Math.max(0, weeklyAssignedQuestions - weeklySolvedQuestions);
    const questionCompletionRate = weeklyAssignedQuestions > 0 ? Math.min(100, Math.round((weeklySolvedQuestions / weeklyAssignedQuestions) * 100)) : 0;

    // 2. Aggregate Topic Errors from all sources (TopicErrors, Tasks, and Trials)
    const topicErrorMap: Record<string, { topic: string; subject: string; count: number }> = {};

    // From explicit topic errors list
    errorList.forEach((err: any) => {
      const topic = err.topic || 'Genel Konu';
      const subject = err.subject || 'Genel';
      const count = Number(err.errorCount) || Number(err.count) || 1;
      const key = `${subject}_${topic}`.toLowerCase();
      if (!topicErrorMap[key]) {
        topicErrorMap[key] = { topic, subject, count: 0 };
      }
      topicErrorMap[key].count += count;
    });

    // From task incorrect answers (current and archived)
    [...taskList, ...previousWeekTasks].forEach((t: any) => {
      const inc = Number(t.incorrect) || 0;
      if (inc > 0) {
        const topic = t.topic || t.title || 'Genel';
        const subject = t.subject || 'Genel';
        const key = `${subject}_${topic}`.toLowerCase();
        if (!topicErrorMap[key]) {
          topicErrorMap[key] = { topic, subject, count: 0 };
        }
        topicErrorMap[key].count += inc;
      }
    });

    // From Detailed Trials (trial.results)
    const combinedTrials = [...detailedTrialList, ...trialList];
    combinedTrials.forEach((trial: any) => {
      if (trial && trial.results && typeof trial.results === 'object') {
        Object.entries(trial.results).forEach(([subject, res]: [string, any]) => {
          if (res && res.wrongTopics && Array.isArray(res.wrongTopics)) {
            res.wrongTopics.forEach((wt: any) => {
              const topicName = typeof wt === 'string' ? wt : wt.topic || 'Genel Soru';
              const errCount = typeof wt === 'object' && wt.count ? Number(wt.count) : 1;
              const key = `${subject}_${topicName}`.toLowerCase();
              if (!topicErrorMap[key]) {
                topicErrorMap[key] = { topic: topicName, subject, count: 0 };
              }
              topicErrorMap[key].count += errCount;
            });
          }
          if (res && Number(res.incorrect) > 0) {
            const key = `${subject}_Deneme Genel`.toLowerCase();
            if (!topicErrorMap[key]) {
              topicErrorMap[key] = { topic: 'Deneme Hataları', subject, count: 0 };
            }
            topicErrorMap[key].count += Number(res.incorrect);
          }
        });
      }
    });

    const sortedErrors = Object.values(topicErrorMap).sort((a, b) => b.count - a.count);
    const topErrorTopic = sortedErrors[0]?.topic || 'Temel Soru Çözümü & Zaman Yönetimi';
    const topErrorSubject = sortedErrors[0]?.subject || 'Matematik';

    // 3. Trial Analytics (Latest Net, Best Net, Averages)
    let latestTrialNet = 0;
    let highestTrialNet = 0;
    const allTrialScores: number[] = [];

    combinedTrials.forEach((tr: any) => {
      const score = Number(tr.totalNet) || Number(tr.score) || Number(tr.net) || 0;
      if (score > 0) {
        allTrialScores.push(score);
        if (score > highestTrialNet) highestTrialNet = score;
      }
    });

    if (allTrialScores.length > 0) {
      latestTrialNet = allTrialScores[0] || allTrialScores[allTrialScores.length - 1] || 0;
    }

    // Weekly overall accuracy
    const totalAnswered = weeklyCorrect + weeklyIncorrect;
    const weeklyAccuracy = totalAnswered > 0 ? Math.round((weeklyCorrect / totalAnswered) * 100) : (completionRate > 0 ? completionRate : 75);

    // 4. Branch / Subject Breakdown Generator
    const subjectNames = ['Matematik', 'Türkçe', 'Fen Bilimleri', 'Sosyal Bilgiler', 'Yabancı Dil (İngilizce)'];
    
    // Check if any student tasks had other subjects
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

      // YouTube Video Map for Turkish Exam Prep
      const videoMap: Record<string, { title: string; query: string; url: string }> = {
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
        'sosyal': {
          title: 'Benim Hocam - Tarih & Coğrafya Püf Noktaları',
          query: 'Benim Hocam Tarih Cografya',
          url: 'https://www.youtube.com/results?search_query=Benim+Hocam+Tarih'
        },
        'dil': {
          title: 'Özer Kiraz / İngilizce Konu ve Kelime Kampı',
          query: 'Ingilizce Soru Cozumu ve Kelime',
          url: 'https://www.youtube.com/results?search_query=Ingilizce+Soru+Cozumu'
        }
      };

      const matchedKey = Object.keys(videoMap).find(k => name.toLowerCase().includes(k)) || 'matematik';
      const recVideo = videoMap[matchedKey];

      const deficiencies = relevantErrors.slice(0, 2).map(e => ({
        topic: e.topic,
        errorCount: e.count,
        description: `${name} dersinde '${e.topic}' konusunda ${e.count} adet yanlış tespit edildi. Kavram pekiştirmesi ve soru analizi gereklidir.`,
        recommendations: [
          {
            title: `${e.topic} - ${recVideo.title}`,
            searchQuery: `${name} ${e.topic} soru cozumu`,
            youtubeUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${e.topic} soru cozumu konu anlatimi`)}`
          }
        ]
      }));

      if (deficiencies.length === 0 && (errorCount > 0 || status !== 'success')) {
        deficiencies.push({
          topic: `${name} Temel Pratik & Hız Soruları`,
          errorCount: errorCount || 2,
          description: `Zaman yönetimi ve dikkat hatalarını azaltmak için periyodik soru çözümü önerilir.`,
          recommendations: [
            {
              title: recVideo.title,
              searchQuery: recVideo.query,
              youtubeUrl: recVideo.url
            }
          ]
        });
      }

      return {
        name,
        status,
        accuracy: Math.min(100, Math.max(30, accuracy)),
        deficiencies
      };
    });

    // 5. Build Comprehensive Summary Paragraph
    const trialText = latestTrialNet > 0 ? `Son deneme neti ${latestTrialNet.toFixed(1)} olarak kaydedildi (En yüksek: ${highestTrialNet.toFixed(1)} net).` : `Kayıtlı deneme sınavlarında süreklilik sağlanmalı.`;
    const taskText = weeklyTotalQuestions > 0 
      ? `Bu hafta toplam ${weeklyTotalQuestions} soru üzerinde çalışıldı: ${weeklyCorrect} Doğru, ${weeklyIncorrect} Yanlış, ${weeklyEmpty} Boş (Doğruluk Oranı: %${weeklyAccuracy}).` 
      : `Haftalık ödev tamamlama oranı %${completionRate}.`;

    const summary = `${studentName || 'Öğrenci'} (${grade || 'Güncel Seviye'}), haftalık programında ${taskList.length} görevden ${completedTasks.length}'ini tamamladı. ${taskText} ${trialText} Özellikle '${topErrorSubject}' branşında '${topErrorTopic}' konusu odaklanılması gereken öncelikli alan olarak öne çıkmaktadır.`;

    // 6. Build In-Depth Error Analysis
    const errorAnalysis = sortedErrors.length > 0
      ? `Haftalık ödevler ve deneme sınavları incelendiğinde en çok yanlış yapılan ilk 3 kritik konu: ${sortedErrors.slice(0, 3).map((e, idx) => `${idx + 1}) ${e.subject} - ${e.topic} (${e.count} Yanlış)`).join(', ')}. Bu konularda yanlışların ana nedeni işlem adımlarındaki acelecilik, soru kökünü eksik okuma veya kavram pekiştirmesi eksiğidir.`
      : `Öğrencinin haftalık çalışmalarında belirgin bir yoğunlaşmış hata kümesi bulunmamaktadır. Mevcut soru çözüm disiplini korunmalı ve deneme sınavı sıklığı artırılmalıdır.`;

    // 7. Teacher Pedagogy Notes
    const teacherPedagogyNotes = [
      uncompletedTasks.length > 0 
        ? `Bu hafta öğrencinin yapmadığı ${uncompletedTasks.length} adet eksik ödev tespit edildi. Yeni programa başlamadan önce bu eksiklerin telafisi planlanmalı.`
        : `Öğrenci haftalık programdaki tüm ödevleri eksiksiz tamamladı, tebrik edilerek motivasyonu pekiştirilmeli.`,
      sortedErrors[0]
        ? `${sortedErrors[0].subject} dersi '${sortedErrors[0].topic}' konusunda öğrencinin çözdüğü yanlış sorular birebir incelenmeli, kavram eksikliği kapatılmalı.`
        : `Deneme sınavlarında boş bırakılan soruların turlama tekniğiyle tekrar gözden geçirilmesi öğretilmeli.`,
      weeklyIncorrect > 0
        ? `Haftalık çözülen sorularda ${weeklyIncorrect} adet yanlış bulunmaktadır. Yanlış yapılan soruların kesilip soru defterine yapıştırılması alışkanlığı kazandırılmalı.`
        : `Soru çözüm hızını artırmak için branş denemelerinde süre tutarak çalışma yöntemi uygulanmalı.`,
      `Öğrenciyle haftalık koçluk görüşmesinde haftanın özet doğruları (${weeklyCorrect}) ve telafi edilecek eksikleri ana gündem yapılmalı.`
    ];

    // 8. Actionable Weekly Plan Recommendations
    const weeklyPlanRecommendations = [
      {
        subject: sortedErrors[0]?.subject || "Matematik",
        topic: sortedErrors[0]?.topic || "Problem Çözme & Hata Telafisi",
        suggestedAmount: "Günde 25 soru + Yanlış Soru Analizi",
        reason: `En çok yanlış yapılan konu (${sortedErrors[0]?.count || 4} hata) olduğu için öncelikli telafi gerektirir.`,
        priority: "high"
      },
      {
        subject: sortedErrors[1]?.subject || "Türkçe",
        topic: sortedErrors[1]?.topic || "Paragraf Hız Kampı & Anlam Bilgisi",
        suggestedAmount: "Hergün 20 Paragraf Sorusu (Süre Tutularak)",
        reason: "Sınav kondisyonunu ve okuma anlama hızını en üst düzeyde tutmak için.",
        priority: "high"
      },
      {
        subject: sortedErrors[2]?.subject || "Fen Bilimleri",
        topic: sortedErrors[2]?.topic || "Kavram Tekrarı & Soru Çözümü",
        suggestedAmount: "Haftalık 30 Soru Çözümü",
        reason: "Konu pekiştirmesi sağlamak ve soru çeşitliliğini artırmak amacıyla.",
        priority: "medium"
      }
    ];

    // 9. Previous Week Evaluation (Önceki Hafta Değerlendirmesi & Karnesi)
    const latestArchive = archivedList[0] || null;
    const hasPreviousWeek = !!latestArchive || completedTasks.length > 0;
    const prevTasks = latestArchive?.tasks || (taskList.length > 0 ? taskList : []);
    const prevCompleted = prevTasks.filter((t: any) => t.completed);
    const prevRate = latestArchive ? latestArchive.completionRate : (prevTasks.length > 0 ? Math.round((prevCompleted.length / prevTasks.length) * 100) : 0);

    const prevCorrect = prevTasks.reduce((sum: number, t: any) => sum + (Number(t.correct) || 0), 0);
    const prevIncorrect = prevTasks.reduce((sum: number, t: any) => sum + (Number(t.incorrect) || 0), 0);
    const prevEmpty = prevTasks.reduce((sum: number, t: any) => sum + (Number(t.empty) || 0), 0);
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
      totalQuestions: prevTotalQ > 0 ? prevTotalQ : weeklyTotalQuestions,
      correct: prevCorrect > 0 ? prevCorrect : weeklyCorrect,
      incorrect: prevIncorrect > 0 ? prevIncorrect : weeklyIncorrect,
      empty: prevEmpty > 0 ? prevEmpty : weeklyEmpty,
      net: Number((prevNet > 0 ? prevNet : weeklyNet).toFixed(2)),
      successRate: prevAccuracy > 0 ? prevAccuracy : weeklyAccuracy,
      evaluationSummary: prevTasks.length > 0 
        ? `Önceki haftanın ${prevTasks.length} görevinden ${prevCompleted.length} tanesi tamamlandı (%${prevRate} tamamlama). Çözülen sorularda ${prevCorrect} Doğru, ${prevIncorrect} Yanlış, ${prevEmpty} Boş kaydedildi. Net başarı oranı %${prevAccuracy}.`
        : `Öğrencinin geçmiş hafta verileri incelenerek yeni hafta ihtiyaçları haritalandırıldı.`,
      strengths: [
        prevRate >= 70 ? 'Ödev tamamlama sorumluluğu ve istikrarı yüksek' : 'Çalışma gayreti ve soru çözme azmi olumlu',
        weeklyAccuracy >= 75 ? 'Sorulardaki net ve doğruluk oranı güçlü' : 'Temel soru tiplerinde işlem kabiliyeti mevcut'
      ],
      growthAreas: [
        sortedErrors[0] ? `${sortedErrors[0].subject} (${sortedErrors[0].topic}) hata telafisi gerekiyor` : 'Süre ve turlama taktiği geliştirilmeli',
        prevEmpty > 0 ? 'Boş bırakılan sorularda kavram eksikliği kapatılmalı' : 'Deneme sınavı sıklığı artırılmalı'
      ]
    };

    // 10. Concrete Student Needs List (Öğrencinin Neye İhtiyacı Var?)
    const studentNeeds = sortedErrors.slice(0, 4).map((err, idx) => {
      const isUrgent = err.count >= 4 || idx === 0;
      const targetSoru = isUrgent ? 40 : 25;
      return {
        id: `need_${idx}_${Date.now()}`,
        subject: err.subject,
        topic: err.topic,
        errorCount: err.count,
        urgency: isUrgent ? 'urgent' : 'high',
        urgencyLabel: isUrgent ? 'Acil İhtiyaç' : 'Öncelikli Gelişim',
        title: `${err.subject} - ${err.topic} Telafisi`,
        description: `Öğrencinin ${err.subject} dersinde '${err.topic}' konusunda ${err.count} adet yanlışı tespit edilmiştir. Kavram pekiştirmesi ve telafi soru çözümü gereklidir.`,
        neededAction: `${targetSoru} Soru Telafi Çözümü + Yanlış Soru Analizi`,
        suggestedTask: {
          type: 'question',
          subject: err.subject,
          topic: err.topic,
          title: `${err.topic} - Telafi & Pekiştirme Soru Çözümü`,
          amount: `${targetSoru} soru`
        }
      };
    });

    if (studentNeeds.length === 0) {
      studentNeeds.push({
        id: `need_default_1`,
        subject: 'Matematik',
        topic: 'Problem Çözme & Hız Denemesi',
        errorCount: 2,
        urgency: 'high',
        urgencyLabel: 'Öncelikli Gelişim',
        title: 'Matematik - Problem Çözme ve Zaman Yönetimi',
        description: 'Öğrencinin süre kondisyonunu ve soru çözüm hızını korumak için pratik soru çözümü ihtiyacı bulunmaktadır.',
        neededAction: '30 Soru Süre Tutularak Çözüm',
        suggestedTask: {
          type: 'question',
          subject: 'Matematik',
          topic: 'Problemler',
          title: 'Problemler - Süreli Pratik Çözümü',
          amount: '30 soru'
        }
      });
      studentNeeds.push({
        id: `need_default_2`,
        subject: 'Türkçe',
        topic: 'Paragraf Hız Kampı',
        errorCount: 2,
        urgency: 'high',
        urgencyLabel: 'Öncelikli Gelişim',
        title: 'Türkçe - Günlük Paragraf Çözümü',
        description: 'Tüm derslerde okuduğunu anlama hızını artırmak amacıyla günlük rutin paragraf çözümü ihtiyacı vardır.',
        neededAction: 'Günde 20 Paragraf Sorusu',
        suggestedTask: {
          type: 'question',
          subject: 'Türkçe',
          topic: 'Paragraf',
          title: 'Paragraf Hız Denemesi',
          amount: '20 soru'
        }
      });
    }

    // 11. Structured Weekly Performance Statistics for UI Dashboard
    const weeklyPerformanceStats = {
      assignedQuestions: weeklyAssignedQuestions,
      solvedQuestions: weeklySolvedQuestions,
      remainingQuestions: weeklyRemainingQuestions,
      questionCompletionRate: questionCompletionRate,
      totalQuestions: weeklySolvedQuestions > 0 ? weeklySolvedQuestions : weeklyTotalQuestions,
      totalCorrect: weeklyCorrect,
      totalIncorrect: weeklyIncorrect,
      totalEmpty: weeklyEmpty,
      totalNet: Number(weeklyNet.toFixed(2)),
      successRate: weeklyAccuracy,
      completedTasksCount: completedTasks.length,
      totalTasksCount: activeMetricsTasks.length,
      uncompletedTasksCount: uncompletedTasks.length,
      completionRate: completionRate,
      latestTrialNet: Number(latestTrialNet.toFixed(2)),
      highestTrialNet: Number(highestTrialNet.toFixed(2)),
      trialCount: combinedTrials.length,
      topErrorTopic,
      topErrorSubject
    };

    return {
      summary,
      weeklyPerformanceStats,
      previousWeekEvaluation,
      studentNeeds,
      errorAnalysis,
      teacherPedagogyNotes,
      weeklyPlanRecommendations,
      subjects: subjectsAnalysis
    };
  };

  try {
    if (!ai) {
      return res.json(generateSmartAnalysis());
    }

    const systemInstruction = `Sen uzman bir pedagojik yapay zeka eğitim koçusun.
Öğrencinin çözdüğü görevler, haftalık ödev tamamlama durumları, girdiği doğru/yanlış/boş sayıları, konu hataları ve deneme sınavı sonuçlarına dayanarak öğrenciyi kapsamlı biçimde analiz et.
Öğrencinin yanlış sayısına göre en çok zorlandığı konuları tespit et, yeni haftalık program için somut ve uygulanabilir çalışma önerileri sun ve öğretmenin dikkat etmesi gereken pedagojik öneriler üret.
Popüler Türk eğitim kanallarından (Rehber Matematik, Şenol Hoca, Benim Hocam, VIP Fizik, Rüştü Hoca vb.) gerçekçi video/arama önerileri ekle.

Öğrenci Bilgileri:
Adı: ${studentName || "Öğrenci"}
Sınıfı/Türü: ${grade || "Belirtilmemiş"}

Yanıtını mutlaka belirtilen JSON formatında vermelisin.`;

    const userPrompt = `Aşağıdaki öğrenci verilerini analiz et ve deneme sınavı ile haftalık doğru-yanlış sayılarına göre derinlemesine analiz çıkar:
Görevler/Ödevler (Doğru, Yanlış, Boş, Tamamlanma): ${JSON.stringify(tasks || [])}
Deneme Sınav Geçmişi: ${JSON.stringify(trialResults || [])}
Detaylı Deneme Verileri: ${JSON.stringify(detailedTrials || [])}
Konu Hataları & Yanlış Sayıları: ${JSON.stringify(topicErrors || [])}`;

    // Try gemini-3.1-flash-lite first, then gemini-3.8-flash
    let responseText: string | null = null;
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash"];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: ["summary", "errorAnalysis", "teacherPedagogyNotes", "weeklyPlanRecommendations", "subjects"],
              properties: {
                summary: {
                  type: Type.STRING,
                  description: "Öğrencinin genel akademik durumunu, haftalık doğru-yanlışlarını ve deneme sonuçlarını özetleyen motivasyon verici paragraf.",
                },
                errorAnalysis: {
                  type: Type.STRING,
                  description: "Öğrencinin yanlış sayısına göre tespit edilen kritik açıklar ve hata nedenlerinin analizi.",
                },
                teacherPedagogyNotes: {
                  type: Type.ARRAY,
                  description: "Öğretmenin yeni haftalık program hazırlarken ve koçluk görüşmesinde dikkat etmesi gereken kritik maddeler.",
                  items: { type: Type.STRING }
                },
                weeklyPlanRecommendations: {
                  type: Type.ARRAY,
                  description: "Yeni haftalık plana eklenmesi önerilen somut çalışma görevleri.",
                  items: {
                    type: Type.OBJECT,
                    required: ["subject", "topic", "suggestedAmount", "reason", "priority"],
                    properties: {
                      subject: { type: Type.STRING },
                      topic: { type: Type.STRING },
                      suggestedAmount: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      priority: { type: Type.STRING }
                    }
                  }
                },
                subjects: {
                  type: Type.ARRAY,
                  description: "Öğrencinin branş bazlı analiz sonuçları.",
                  items: {
                    type: Type.OBJECT,
                    required: ["name", "status", "accuracy", "deficiencies"],
                    properties: {
                      name: { type: Type.STRING },
                      status: { type: Type.STRING },
                      accuracy: { type: Type.INTEGER },
                      deficiencies: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          required: ["topic", "errorCount", "description", "recommendations"],
                          properties: {
                            topic: { type: Type.STRING },
                            errorCount: { type: Type.INTEGER },
                            description: { type: Type.STRING },
                            recommendations: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                required: ["title", "searchQuery", "youtubeUrl"],
                                properties: {
                                  title: { type: Type.STRING },
                                  searchQuery: { type: Type.STRING },
                                  youtubeUrl: { type: Type.STRING }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break; // Success!
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or quota reached, trying next option...`);
      }
    }

    if (responseText) {
      const parsedAi = JSON.parse(responseText.trim());
      // Merge with exact statistical calculation for guaranteed numerical integrity
      const smartStats = generateSmartAnalysis();
      const mergedResponse = {
        ...smartStats,
        ...parsedAi,
        weeklyPerformanceStats: smartStats.weeklyPerformanceStats,
        // Guarantee subjects and recommendations are present
        subjects: parsedAi.subjects && parsedAi.subjects.length > 0 ? parsedAi.subjects : smartStats.subjects,
        weeklyPlanRecommendations: parsedAi.weeklyPlanRecommendations && parsedAi.weeklyPlanRecommendations.length > 0 ? parsedAi.weeklyPlanRecommendations : smartStats.weeklyPlanRecommendations,
        teacherPedagogyNotes: parsedAi.teacherPedagogyNotes && parsedAi.teacherPedagogyNotes.length > 0 ? parsedAi.teacherPedagogyNotes : smartStats.teacherPedagogyNotes
      };
      return res.json(mergedResponse);
    }

    // If Gemini models were unavailable or exhausted quota, return the smart analysis directly
    return res.json(generateSmartAnalysis());
  } catch (error: any) {
    console.error("Analysis generation fallback triggered:", error);
    return res.json(generateSmartAnalysis());
  }
});

// Serve frontend assets & fallback for SPA
const initServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
};

initServer().catch((err) => {
  console.error("Failed to start server:", err);
});
