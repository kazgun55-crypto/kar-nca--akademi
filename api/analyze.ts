import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import { generateSmartAnalysis, buildAiPromptData } from '../src/lib/aiAnalysisService';

try {
  dotenv.config();
} catch {}

function resolveGeminiApiKey(customKey?: string | null): string | null {
  if (customKey && typeof customKey === 'string') {
    const cleanCustom = customKey.trim();
    if (cleanCustom.length > 5 && !cleanCustom.startsWith('YOUR_') && !cleanCustom.includes('placeholder')) {
      return cleanCustom;
    }
  }

  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ];

  for (const candidate of envCandidates) {
    if (candidate && typeof candidate === 'string') {
      const clean = candidate.trim();
      if (clean.length > 5 && !clean.startsWith('YOUR_') && !clean.includes('placeholder')) {
        return clean;
      }
    }
  }
  return null;
}

function getGeminiClient(customKey?: string | null): GoogleGenAI | null {
  const resolvedKey = resolveGeminiApiKey(customKey);
  if (!resolvedKey) {
    // CRITICAL: Never instantiate unkeyed GoogleGenAI client in serverless/production.
    // Doing so triggers "Could not load the default credentials" error because Google ADC is not configured.
    return null;
  }

  try {
    return new GoogleGenAI({
      apiKey: resolvedKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch (initErr) {
    console.warn('Gemini client init with key failed in serverless:', initErr);
    return null;
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

  // Compute baseline analysis with 100% reliability
  const smartStats = generateSmartAnalysis(body);

  const requestApiKey = 
    (req.headers && (req.headers['x-gemini-api-key'] || req.headers['x-api-key'])) || 
    body?.apiKey || 
    null;

  const ai = getGeminiClient(typeof requestApiKey === 'string' ? requestApiKey : null);

  // If Gemini client is not initialized, return the calculation engine results directly
  if (!ai) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(smartStats);
  }

  try {
    const { systemInstruction, userPrompt, actualSubjectsList } = buildAiPromptData(smartStats, body);

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
                  description: "Öğrencinin haftalık programını, tamamlanan ödev ve derslerini pedagojik ve motive edici şekilde özetleyen metin.",
                },
                trialReview: {
                  type: Type.STRING,
                  description: "Deneme sınavlarına özel derinlemesine yapay zeka değerlendirmesi ve strateji önerileri."
                },
                weeklyProgramReview: {
                  type: Type.STRING,
                  description: "Haftalık ödevler, soru sayıları, video/kitap görevleri ve doğruluk oranlarına özel yapay zeka analizi."
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
        console.warn(`Model ${modelName} call bypassed, using robust fallback engine:`, err?.message || err);
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
