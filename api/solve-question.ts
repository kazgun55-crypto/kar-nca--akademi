import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
try {
  dotenv.config();
} catch {
  // Ignore in environments where dotenv is unavailable
}

export function resolveGeminiApiKey(customKey?: string | null): string | null {
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

export function getGeminiClient(customKey?: string | null): GoogleGenAI | null {
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

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-gemini-api-key, x-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  } else if (!body) {
    body = {};
  }

  const { image, mimeType: clientMimeType, studentGrade, subjectHint, studentQuestion, followUpContext, apiKey: bodyApiKey } = body;
  const gradeLevel = studentGrade || "8. Sınıf (LGS)";
  const studentQuery = studentQuestion ? `Öğrencinin ek sorusu/takıldığı yer: "${studentQuestion}"` : "";

  const requestApiKey = 
    (req.headers && (req.headers['x-gemini-api-key'] || req.headers['x-api-key'])) || 
    bodyApiKey || 
    null;

  const ai = getGeminiClient(typeof requestApiKey === 'string' ? requestApiKey : null);

  if (!ai) {
    return res.status(503).json({
      success: false,
      apiKeyMissing: true,
      error: "Yapay zeka servisi başlatılamadı. Sunucu ortam değişkenlerinde GEMINI_API_KEY (veya GOOGLE_API_KEY) tanımlı değil. Lütfen ortam değişkenlerini kontrol ediniz."
    });
  }

  try {
    let base64Data = "";
    let mimeType = (clientMimeType || "image/jpeg").toLowerCase();
    let svgTextExtracted = "";

    if (image && typeof image === "string") {
      const trimmed = image.trim();
      if (trimmed.startsWith("data:")) {
        const commaIdx = trimmed.indexOf(",");
        if (commaIdx !== -1) {
          const header = trimmed.substring(5, commaIdx);
          const mimeMatch = header.match(/^([a-zA-Z0-9\/\-+.]+)/);
          if (mimeMatch) {
            mimeType = mimeMatch[1].toLowerCase();
          }
          const rawPayload = trimmed.substring(commaIdx + 1);
          if (mimeType.includes("svg") || rawPayload.includes("<svg")) {
            try {
              svgTextExtracted = decodeURIComponent(rawPayload);
            } catch {
              try {
                svgTextExtracted = Buffer.from(rawPayload, "base64").toString("utf-8");
              } catch {
                svgTextExtracted = rawPayload;
              }
            }
          } else {
            base64Data = rawPayload.replace(/[\r\n\s]/g, "");
          }
        }
      } else if (trimmed.includes("<svg")) {
        svgTextExtracted = trimmed;
      } else if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        try {
          const fetched = await fetch(trimmed);
          const arrayBuffer = await fetched.arrayBuffer();
          base64Data = Buffer.from(arrayBuffer).toString("base64");
          const contentType = fetched.headers.get("content-type");
          if (contentType) mimeType = contentType.split(";")[0].toLowerCase();
        } catch (fetchErr) {
          console.warn("Could not fetch remote question image in serverless:", fetchErr);
        }
      } else {
        base64Data = trimmed.replace(/[\r\n\s]/g, "");
      }
    }

    // Guard: In question-solving mode, an image or SVG is strictly required
    if (!followUpContext && !base64Data && !svgTextExtracted) {
      return res.status(400).json({
        success: false,
        error: "Yüklenen soru görseli sunucuya ulaştırılamadı veya boş geldi. Lütfen sorunun fotoğrafını tekrar yükleyiniz."
      });
    }

    if (mimeType === "image/jpg" || mimeType === "image/pjpeg") {
      mimeType = "image/jpeg";
    }

    const systemInstruction = `Sen Türkiye MEB (LGS, YKS/TYT/AYT, Ortaokul ve Lise) müfredatına tam hakim, öğrencinin gönderdiği soruyu harfi harfine doğru okuyan ve TAM OLARAK İSTENENİ çözen uzman bir 'Yapay Zeka Soru Çözücü' öğretmenisin.

KULLANICININ EN ÖNEMLİ VE TAVİZSİZ TALEBİ:
"Yapay zeka ona yüklenen soruyu doğru şekilde analiz etsin ve ne isteniyorsa ona göre çözsün! Yollanan soru neyse o çözülsün, asla alakasız veya başka bir soru uydurulmasın!"

BU HEDEFE ULAŞMAK İÇİN ŞU 3 ALTIN KURALA KESİNLİKLE UYACAKSIN:

1. GÖNDERİLEN SORUYU VE GÖRSELİ EKSİKSİZ DOĞRU ANALİZ ET (questionAnalysis):
   - Resimdeki sorunun tüm metnini, öncüllerini (I, II, III vb.), formüllerini, varsa şekil, geometri çizimi, grafik veya tablo verilerini harfi harfine doğru oku ve 'questionText' alanına aktar.
   - Soru hangi branştaysa (Matematik, Fen Bilimleri, Türkçe, Sosyal, Fizik, Kimya vb.) tam o dersin terimleriyle yaklaş.
   - 'givens' (Verilenler): Soruda öğrenciye sunulan tüm sayısal ve sözel verileri, birimleri ve kısıtları tek tek madde olarak listele.
   - 'target' (Soru KÖKÜ ve İstenen): Sorunun KÖKÜNÜ tam olarak tespit et! Soru bizden tam olarak neyi istiyor? (Örn: "x'i mi, x+y'yi mi?", "En az kaç mı en çok kaç mı?", "Hangisi yanlıştır mı, hangisi kesinlikle doğrudur mu?", "Çevre mi alan mı?"). Burayı çok net ve eksiksiz yaz.
   - 'figureOrDataAnalysis': Eğer soruda şekil, çizim veya grafik varsa, şeklin üzerindeki açıları, uzunlukları, eksenleri veya taralı alanları detaylıca açıkla.
   - 'solvingStrategy': İstenene doğrudan ulaşmak için izleyeceğimiz net çözüm yolunu belirt.

2. NE İSTENİYORSA TAM VE YALNIZCA ONA GÖRE ÇÖZ (HEDEFTEN ASLA SAPMA):
   - Asla sorulmamış ara bir değişkende durma! (Örn: x=5 bulundu diye cevabı 5 yapma; eğer soru '2x - 3 kaçtır?' diyorsa '2(5) - 3 = 7' işlemini mutlaka tamamla).
   - Olumsuz soru köklerinde ('değildir', 'ulaşılamaz', 'söylenemez') her şıkkı tek tek test ederek neden elendiğini göster.
   - Soru çoktan seçmeli ise doğru şıkkı (A, B, C, D, E) ve nedenini açıkla; açık uçlu ise nihai cevabı açıkça yaz.
   - 'targetCheck' alanında: "Bizden ne istenmişti? -> ... Yaptığımız işlemlerle ne bulduk? -> ... Hedef tam olarak sağlandı mı? -> Evet" doğrulamasını yap.

3. İŞLEMLERİ TÜM DETAYLARIYLA, HESAPLAMA SATIRLARIYLA VE ÖĞRENCİ DİLİYLE GÖSTER:
   - "İşlem yapıldı ve x bulundu" gibi yüzeysel anlatımlar KESİNLİKLE YASAKTIR.
   - Her adımda:
     a) "Bu Adımda Ne Buluyoruz?" (Adımın hedefi)
     b) "İşlem Satırları" (Hesaplamanın matematiksel açık hali: örn. '2 x 60 = 120', '120 ÷ 20 = 6')
     c) "İşlem Nasıl Yapıldı?" (Öğrencinin anlayacağı dille)
     d) "Neden Böyle Yaptık? / İşlem Mantığı" (Kural ve gerekçe)
   - Formül kartını (coreFormula) mutlaka doldur.

4. ÇOCUK/ÖĞRENCİ DİLİ VE SESLİ METİN (audioSpeechText):
   - Öğrencinin sınıf seviyesine (${gradeLevel}) tam uygun, sevecen, cesaretlendirici bir üslup kullan.
   - Sesli dinleme metninde işlemleri tane tane, samimi bir öğretmen gibi anlat.

Yanıtını mutlaka geçerli JSON formatında ve verilen şemaya uygun olarak üret.`;

    let userPrompt = followUpContext
      ? `Önceki Soru Çözümü: ${JSON.stringify(followUpContext)}\nÖğrencinin Sorusu: "${studentQuestion || 'İşlemleri biraz daha açıklar mısınız?'}"`
      : `DİKKAT: Eklediğim soru görselini (${mimeType}) çok dikkatli ve harfi harfine incele.
Görseldeki soruda yazan metni, sayısal değerleri, öncülleri, şekli, grafiği ve soru kökünü eksiksiz tespit et.
TAM OLARAK BU GÖRSELDEKİ SORUYU ÇÖZ. Asla varsayılan veya başka bir soru uydurma. Görseldeki soru neyi soruyorsa (örn: doğru cevap, x değeri, işlem sonucu) hedefi ona göre belirle ve tüm işlemleri ${gradeLevel} seviyesindeki bir öğrenci için adım adım göstererek çöz.
${studentQuery}
${subjectHint ? `Ders İpucu: ${subjectHint}` : ""}`;

    if (svgTextExtracted) {
      userPrompt += `\n\n[Görsel Soru Çizimi ve Metni (SVG Şeması)]:\n${svgTextExtracted}`;
    }

    const parts: any[] = [];
    if (base64Data) {
      parts.push({
        inlineData: { mimeType, data: base64Data }
      });
    }
    parts.push({ text: userPrompt });

    // Order models: gemini-3.1-flash-lite has optimal throughput, followed by flash-latest and 3.8-flash
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.8-flash"];
    let responseText: string | null = null;
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              required: [
                "subject", "topic", "questionText", "correctOption", "studentSummary",
                "questionAnalysis", "targetCheck", "coreFormula", "steps",
                "finalAnswer", "keyTip", "commonMistake", "audioSpeechText"
              ],
              properties: {
                subject: { type: Type.STRING },
                topic: { type: Type.STRING },
                questionText: { type: Type.STRING },
                correctOption: { type: Type.STRING },
                studentSummary: { type: Type.STRING },
                questionAnalysis: {
                  type: Type.OBJECT,
                  required: ["givens", "target", "solvingStrategy"],
                  properties: {
                    questionType: { type: Type.STRING },
                    givens: { type: Type.ARRAY, items: { type: Type.STRING } },
                    target: { type: Type.STRING },
                    figureOrDataAnalysis: { type: Type.STRING },
                    solvingStrategy: { type: Type.STRING }
                  }
                },
                targetCheck: { type: Type.STRING },
                coreFormula: {
                  type: Type.OBJECT,
                  required: ["name", "formula", "explanation"],
                  properties: {
                    name: { type: Type.STRING },
                    formula: { type: Type.STRING },
                    explanation: { type: Type.STRING }
                  }
                },
                steps: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    required: ["stepNumber", "title", "goal", "operationDetails", "explanation", "whyThisWay"],
                    properties: {
                      stepNumber: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      goal: { type: Type.STRING },
                      operationDetails: { type: Type.ARRAY, items: { type: Type.STRING } },
                      explanation: { type: Type.STRING },
                      whyThisWay: { type: Type.STRING },
                      mathOrDetail: { type: Type.STRING }
                    }
                  }
                },
                finalAnswer: { type: Type.STRING },
                keyTip: { type: Type.STRING },
                commonMistake: { type: Type.STRING },
                similarQuestion: {
                  type: Type.OBJECT,
                  properties: {
                    question: { type: Type.STRING },
                    hint: { type: Type.STRING },
                    answer: { type: Type.STRING }
                  }
                },
                audioSpeechText: { type: Type.STRING }
              }
            }
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Serverless Model ${modelName} failed:`, err?.message || err);
        await new Promise(r => setTimeout(r, 350));
      }
    }

    if (responseText) {
      const cleanText = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleanText);
      return res.status(200).json({ success: true, source: "gemini", solution: parsed });
    }

    console.error("Serverless all models failed:", lastError?.message || lastError);
    let detailMsg = lastError?.message || "Modeller yanıt veremedi";
    if (detailMsg.includes("Could not load the default credentials") || detailMsg.includes("API key not valid") || detailMsg.includes("credentials")) {
      detailMsg = "GEMINI_API_KEY anahtarı tanımlanmalı veya güncellenmelidir";
    }
    return res.status(503).json({
      success: false,
      error: `Yapay zeka modelleri görseldeki soruyu okurken geçici bir sorunla karşılaştı (${detailMsg}). Lütfen 'Tekrar Dene' butonuna tıklayınız. Asla varsayılan veya başka bir soru çözülmez.`
    });
  } catch (err: any) {
    console.error("Serverless solve-question fatal error:", err?.message || err);
    let errorString = "Soru çözülürken bir sunucu hatası oluştu. Lütfen tekrar deneyin.";
    if (err && typeof err.message === 'string' && err.message.trim() && err.message !== '[object Object]') {
      errorString = err.message.trim();
    } else if (typeof err === 'string' && err.trim() && err !== '[object Object]') {
      errorString = err.trim();
    }
    return res.status(500).json({
      success: false,
      error: errorString
    });
  }
}
