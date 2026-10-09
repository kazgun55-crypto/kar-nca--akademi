import { GoogleGenAI, Type } from '@google/genai';
import { generateSmartAnalysis } from '../src/lib/aiAnalysisService';

// Initialize Gemini API client if API key is provided
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (initErr) {
    console.warn('Gemini client init skipped or failed:', initErr);
  }
}

// Vercel Serverless Function Handler for /api/analyze
export default async function handler(req: any, res: any) {
  // 1. CORS Headers for Cross-Origin or Multi-Domain Requests
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Respond immediately to OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Parse request body safely
  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body) {
    body = {};
  }

  const { studentName, grade, tasks, trialResults, detailedTrials, topicErrors, archivedPrograms } = body;

  // Compute baseline analysis with 100% reliability
  const smartStats = generateSmartAnalysis({
    studentName,
    grade,
    tasks,
    trialResults,
    detailedTrials,
    topicErrors,
    archivedPrograms
  });

  // If Gemini client is not initialized, return the calculation engine results directly
  if (!ai) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(smartStats);
  }

  try {
    const systemInstruction = `Sen uzman bir pedagojik yapay zeka eğitim koçusun.
KESİN VE TAVİZSİZ KURALLAR:
1. Yalnızca ve sadece sana sağlanan haftalık programdaki görevlerde ve deneme sınavlarındaki GERÇEK VE VERİLMİŞ konuları analiz et.
2. Sana verilmeyen, öğrenciye atanmamış hiçbir ders veya konu uydurma, tahmin çıkarma veya varsayımda bulunma. Veriler tamamen gerçekçi, net ve doğru olmalıdır.
3. YÜZDE SEKSEN BAŞARI KURALI: Başarı oranı %80'in altında kalan konular (%80 altı) tespit edilmeli ve telafi önerilmeli; başarı oranı %80 ve üzerinde olan konular ise başarılı kabul edilmelidir.
4. Yeni haftalık plan tavsiyelerinde (weeklyPlanRecommendations) yalnızca öğrencinin programında verilmiş olan gerçek konulardan tavsiye üret, asla harici konu ekleme.

Öğrencinin haftalık programındaki görevlerini, girdiği doğru/yanlış/boş sayılarını, başarı oranı %80'in altında kalan kritik konularını ve deneme sınavı sonuçlarını iki ayrı ana eksende analiz et:
1. HAFTALIK PROGRAM VE DOĞRU-YANLIŞ ANALİZİ: Öğrencinin haftalık ödev tamamlama oranı, girdiği doğru/yanlış sayıları ve başarı oranı %80'in altında olan konuların somut çalışma tavsiyeleri.
2. DENEME SINAVLARI ANALİZİ: Öğrencinin deneme netleri, net trendi, zaman yönetimi ve bir sonraki deneme için taktiksel önerileri.

Öğrenci Bilgileri:
Adı: ${studentName || "Öğrenci"}
Sınıfı/Türü: ${grade || "Belirtilmemiş"}

Yanıtını mutlaka JSON formatında döndür.`;

    const actualSubjectsList = Array.from(new Set([
      ...(Array.isArray(tasks) ? tasks.map((t: any) => (t?.subject || '').trim()).filter(Boolean) : []),
      ...Object.keys(smartStats.trialAnalysis?.branchAverages ? smartStats.trialAnalysis.branchAverages.reduce((acc: any, b: any) => ({ ...acc, [b.subject]: true }), {}) : {})
    ]));

    const formattedTasks = Array.isArray(tasks) && tasks.length > 0
      ? tasks.map((t: any, i: number) => `${i + 1}) [${t.subject || 'Ders'}] ${t.topic || t.title || 'Konu'}: ${t.completed ? 'Tamamlandı' : 'Bekliyor'}, Doğru: ${t.correct || 0}, Yanlış: ${t.incorrect || 0}, Boş: ${t.empty || 0}`).join('\n')
      : 'Haftalık programda henüz kayıtlı ödev bulunmuyor.';

    const formattedTrials = Array.isArray(trialResults) && trialResults.length > 0
      ? trialResults.map((tr: any, i: number) => `${i + 1}) ${tr.title || tr.name || 'Deneme'}: Net: ${tr.totalNet || tr.net || tr.score || 0} ${tr.date ? '(' + tr.date + ')' : ''}`).join('\n')
      : 'Henüz deneme sınavı kaydı bulunmuyor.';

    const userPrompt = `Aşağıdaki ELDEKİ VERİLERİ incele. Kesinlikle harici ders/konu uydurmadan, eldeki verileri temel alarak kendi pedagojik uzmanlık yorumlarını, deneme stratejilerini ve koçluk eklemelerini yap:

ÖĞRENCİ: ${studentName || 'Öğrenci'} (${grade || 'Belirtilmemiş'})

1. ELDEKİ HAFTALIK PROGRAM VERİLERİ:
- Toplam Görev: ${smartStats.weeklyPerformanceStats.totalTasksCount}, Tamamlanan: ${smartStats.weeklyPerformanceStats.completedTasksCount} (%${smartStats.weeklyPerformanceStats.completionRate} Tamamlama)
- Soru Verileri: Atanan: ${smartStats.weeklyPerformanceStats.assignedQuestions}, Çözülen: ${smartStats.weeklyPerformanceStats.solvedQuestions}, Doğru: ${smartStats.weeklyPerformanceStats.totalCorrect}, Yanlış: ${smartStats.weeklyPerformanceStats.totalIncorrect}, Boş: ${smartStats.weeklyPerformanceStats.totalEmpty}
- Doğruluk Oranı: %${smartStats.weeklyPerformanceStats.successRate}
Öğrencinin Programındaki Gerçek Ödevler:
${formattedTasks}

2. ELDEKİ DENEME SINAVLARI VERİLERİ:
- Deneme Sayısı: ${smartStats.trialAnalysis.trialCount}
- Son Deneme Neti: ${smartStats.trialAnalysis.latestTrialNet}, En Yüksek: ${smartStats.trialAnalysis.highestTrialNet}, Ortalama: ${smartStats.trialAnalysis.averageTrialNet}
- Trend: ${smartStats.trialAnalysis.trendLabel}
Öğrencinin Girdiği Gerçek Denemeler:
${formattedTrials}

3. %80 BAŞARI KURALI DEĞERLENDİRMESİ:
${smartStats.under80Topics.length > 0
  ? `Yüzde 80 Altında Kalan Kritik Konular:\n` + smartStats.under80Topics.map((u: any) => `- ${u.subject} / ${u.topic}: Doğruluk %${u.accuracy} (${u.incorrect} Yanlış)`).join('\n')
  : `Tüm konularda %80 başarı eşiği sağlanmıştır.`}

TALİMATLAR:
1. SADECE ELDEKİ BU VERİLERİ KULLAN: Öğrencinin listesinde olmayan ders veya konuları asla ekleme veya tahmin çıkarma.
2. PEDAGOJİK EKLEMELERİNİ YAP: Eldeki deneme ve program gidişatına göre öğrenciye ve velisine özel, sade, yapıcı çalışma tavsiyeleri ve deneme taktikleri ekle.
3. YENİ PLAN TAVSİYELERİ: Yalnızca öğrencinin eldeki ders ve konularından telafi veya pekiştirme öner.`;

    let responseText: string | null = null;
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

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
              required: ["summary", "errorAnalysis", "teacherPedagogyNotes", "weeklyPlanRecommendations"],
              properties: {
                summary: {
                  type: Type.STRING,
                  description: "Öğrencinin genel akademik durumunu özetleyen motive edici paragraf.",
                },
                trialReview: {
                  type: Type.STRING,
                  description: "Deneme sınavlarına özel derinlemesine yapay zeka değerlendirmesi ve strateji önerileri."
                },
                weeklyProgramReview: {
                  type: Type.STRING,
                  description: "Haftalık ödevler, çözülen soru sayıları ve doğruluk oranlarına özel yapay zeka analizi."
                },
                errorAnalysis: {
                  type: Type.STRING,
                  description: "Başarı oranı %80'in altında kalan konuların ve yapılan yanlışların analizi.",
                },
                teacherPedagogyNotes: {
                  type: Type.ARRAY,
                  description: "Öğretmenin dikkat etmesi gereken pedagojik öneriler.",
                  items: { type: Type.STRING }
                },
                weeklyPlanRecommendations: {
                  type: Type.ARRAY,
                  description: "Yeni haftalık programa eklenmesi önerilen somut telafi görevleri.",
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
                }
              }
            }
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} call bypassed, using robust fallback engine...`);
      }
    }

    if (responseText) {
      try {
        const cleanText = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
        const parsedAi = JSON.parse(cleanText);

        let sanitizedRecs = smartStats.weeklyPlanRecommendations;
        if (Array.isArray(parsedAi.weeklyPlanRecommendations) && parsedAi.weeklyPlanRecommendations.length > 0) {
          const validRecs = parsedAi.weeklyPlanRecommendations.filter((r: any) => {
            if (!r || !r.subject) return false;
            if (actualSubjectsList.length === 0) return true;
            return actualSubjectsList.some((s: string) => s.toLowerCase() === String(r.subject).toLowerCase());
          });
          if (validRecs.length > 0) {
            sanitizedRecs = validRecs;
          }
        }

        const mergedResponse = {
          ...smartStats,
          summary: parsedAi.summary || smartStats.summary,
          errorAnalysis: parsedAi.errorAnalysis || smartStats.errorAnalysis,
          teacherPedagogyNotes: (parsedAi.teacherPedagogyNotes && parsedAi.teacherPedagogyNotes.length > 0) ? parsedAi.teacherPedagogyNotes : smartStats.teacherPedagogyNotes,
          weeklyPlanRecommendations: sanitizedRecs,
          trialAnalysis: {
            ...smartStats.trialAnalysis,
            summary: parsedAi.trialReview || smartStats.trialAnalysis.summary
          },
          weeklyProgramAnalysis: {
            ...smartStats.weeklyProgramAnalysis,
            summary: parsedAi.weeklyProgramReview || smartStats.weeklyProgramAnalysis.summary
          }
        };

        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(mergedResponse);
      } catch (parseErr) {
        console.warn('JSON parse on Gemini response failed, returning smart stats directly:', parseErr);
        res.setHeader('Content-Type', 'application/json');
        return res.status(200).json(smartStats);
      }
    }

    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(smartStats);
  } catch (error: any) {
    console.error('Vercel handler top-level error:', error);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(smartStats);
  }
}
