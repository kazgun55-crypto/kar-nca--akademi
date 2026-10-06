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
Öğrencinin haftalık programındaki görevlerini, girdiği doğru/yanlış/boş sayılarını, başarı oranı %80'in altında kalan kritik konularını ve deneme sınavı sonuçlarını iki ayrı ana eksende analiz et:
1. HAFTALIK PROGRAM VE DOĞRU-YANLIŞ ANALİZİ: Öğrencinin haftalık ödev tamamlama oranı, girdiği doğru/yanlış sayıları ve başarı oranı %80'in altında olan konuların hata teşhisi ile somut çalışma tavsiyeleri.
2. DENEME SINAVLARI ANALİZİ: Öğrencinin deneme netleri, net trendi, zaman yönetimi ve bir sonraki deneme için taktiksel önerileri.

Öğrenci Bilgileri:
Adı: ${studentName || "Öğrenci"}
Sınıfı/Türü: ${grade || "Belirtilmemiş"}

Yanıtını mutlaka JSON formatında döndür.`;

    const userPrompt = `Aşağıdaki verileri incele ve deneme sınavları ile haftalık program doğru-yanlışlarını ayrı ayrı derinlemesine analiz et:
Haftalık Program Görevleri (Doğru, Yanlış, Boş, Tamamlanma): ${JSON.stringify(tasks || [])}
Tespit Edilen %80 Altı Konular: ${JSON.stringify(smartStats.under80Topics || [])}
Deneme Sınav Geçmişi: ${JSON.stringify(trialResults || [])}
Detaylı Deneme Netleri & Yanlışlar: ${JSON.stringify(detailedTrials || [])}
Konu Hataları: ${JSON.stringify(topicErrors || [])}`;

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

        const mergedResponse = {
          ...smartStats,
          summary: parsedAi.summary || smartStats.summary,
          errorAnalysis: parsedAi.errorAnalysis || smartStats.errorAnalysis,
          teacherPedagogyNotes: (parsedAi.teacherPedagogyNotes && parsedAi.teacherPedagogyNotes.length > 0) ? parsedAi.teacherPedagogyNotes : smartStats.teacherPedagogyNotes,
          weeklyPlanRecommendations: (parsedAi.weeklyPlanRecommendations && parsedAi.weeklyPlanRecommendations.length > 0) ? parsedAi.weeklyPlanRecommendations : smartStats.weeklyPlanRecommendations,
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
