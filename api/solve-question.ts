import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
try {
  dotenv.config();
} catch {
  // Ignore in environments where dotenv is unavailable
}

export function resolveGeminiApiKey(): string | null {
  const envCandidates = [
    process.env.GEMINI_API_KEY,
    process.env.API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.VITE_GEMINI_API_KEY,
    process.env.VITE_API_KEY,
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

export function getGeminiClient(): GoogleGenAI | null {
  const resolvedKey = resolveGeminiApiKey();
  if (resolvedKey) {
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
    }
  }

  // Also try lazy default instantiation (in case internal SDK picks it from ambient environment)
  try {
    return new GoogleGenAI({
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  } catch {
    return null;
  }
}

function generateFallbackSolution(gradeLevel?: string, subjectHint?: string, studentQuestion?: string) {
  const subj = subjectHint || "Matematik";
  return {
    subject: subj,
    topic: "Üslü İfadeler ve Problem Çözümü",
    questionText: "Bir laboratuvardaki bakteri sayısı her 20 dakikada bir 2 katına çıkmaktadır. Başlangıçta 2^4 adet bakteri olduğuna göre 2 saat sonra toplam bakteri sayısı kaçtır?",
    correctOption: "C",
    studentSummary: "Bu soruda bakterilerin her 20 dakikada bir iki katına çıkışını hesaplayıp, 2 saatin sonunda ortamdaki toplam bakteri sayısını üslü sayılar kuralıyla buluyoruz.",
    questionAnalysis: {
      questionType: "Yeni Nesil Katlanarak Artış (Üslü Sayı Problemi)",
      givens: [
        "Bakteri sayısı her 20 dakikada bir 2 katına (2^1 kat) çıkmaktadır.",
        "Kaptaki başlangıç bakteri sayısı: 2^4 adettir.",
        "Gözlemlenen toplam süre: 2 saat."
      ],
      target: "2 saat sonra kapta toplam kaç bakteri bulunur? (Nihai bakteri miktarının üslü biçimi)",
      figureOrDataAnalysis: "Soruda süreler farklı birimlerle verilmiştir (biri dakika, diğeri saat). İşlem yapabilmek için öncelikle 2 saatin dakikaya çevrilmesi zorunludur.",
      solvingStrategy: "1) 2 saati dakikaya dönüştür ➔ 2) 20 dakikalık periyot sayısını bul ➔ 3) Katlanma katsayısını 2 tabanında üs olarak yaz ➔ 4) Başlangıçtaki 2^4 ile çarp ve üsleri toplayarak hedefe ulaş."
    },
    targetCheck: "Bizden 2 saat sonraki toplam bakteri miktarı istenmişti. 6 kez katlanma sonucu 2^4 x 2^6 = 2^10 olarak hesaplandı ve doğrudan C şıkkı ile hedefe tam olarak ulaşıldı.",
    coreFormula: {
      name: "Üslü Sayılarda Çarpma ve Katlanma Kuralı",
      formula: "a^m · a^n = a^(m+n) ve 2 katına çıkma = 2^1 ile çarpma",
      explanation: "Tabanları aynı olan üslü ifadeler çarpılırken taban aynen yazılır, üsler toplanır. Her ikiye katlanma işlemi mevcut sayıyı 2 ile çarpmak demektir."
    },
    steps: [
      {
        stepNumber: 1,
        title: "1. Adım: Süreyi Dakikaya Çevirip Periyot Sayısını Bulma",
        goal: "2 saat içinde bakterinin kaç kez 2 katına çıkacağını (periyot sayısını) bulmak",
        operationDetails: [
          "1 saat = 60 dakikadır.",
          "2 saat = 2 x 60 = 120 dakika eder.",
          "Bakteriler her 20 dakikada bir katlandığı için: 120 ÷ 20 = 6 kez katlanma gerçekleşir."
        ],
        explanation: "Soruda artış süresi dakika olarak (20 dakika), toplam süre ise saat olarak (2 saat) verilmiş. Farklı birimleri işlem yapamayacağımız için önce 2 saati dakikaya çevirdik (120 dk). Ardından 120'yi 20'ye bölerek bakterilerin toplam 6 kez 2 katına çıkacağını bulduk.",
        whyThisWay: "Neden bölme yaptık? Çünkü 120 dakikanın içinde kaç tane 20 dakika olduğunu öğrenmek istiyoruz. Çıkan 6 sayısı, bakterilerin tam 6 kere ikiye katlanacağını gösterir.",
        mathOrDetail: "120 dk ÷ 20 dk = 6 periyot (katlanma sayısı)"
      },
      {
        stepNumber: 2,
        title: "2. Adım: Katlanma Miktarını Üslü Sayı Olarak Yazma",
        goal: "6 kez 2 katına çıkmanın matematiksel ifadesini belirlemek",
        operationDetails: [
          "1. kez katlanınca: x 2",
          "2. kez katlanınca: x 2 x 2",
          "... 6. kez katlanınca: 2 x 2 x 2 x 2 x 2 x 2 = 2^6 katına çıkar."
        ],
        explanation: "Bir sayı her seferinde 2 katına çıkıyorsa ve bu olay 6 defa tekrarlanıyorsa, başlangıçtaki sayıyı 6 tane 2 ile çarpmış oluruz. Yan yana 6 tane 2'nin çarpımı ise üslü sayılar kuralına göre 2^6 demektir.",
        whyThisWay: "Neden 2 ile 6'yı çarpmadık da üs yaptık? Çünkü her adımda var olan miktar tekrar ikiye katlanıyor. Bu katlanarak büyümedir (geometrik artış), yani üslü ifadedir.",
        mathOrDetail: "6 defa katlanma = 2^6 katı"
      },
      {
        stepNumber: 3,
        title: "3. Adım: Başlangıç Sayısıyla Çarpıp Sonucu Bulma",
        goal: "Başlangıçtaki 2^4 bakteri ile 2^6 katlanmayı çarpıp nihai sonucu bulmak",
        operationDetails: [
          "Başlangıçtaki bakteri: 2^4",
          "Artış katsayısı: 2^6",
          "Toplam Bakteri = 2^4 x 2^6 = 2^(4 + 6) = 2^10"
        ],
        explanation: "Başlangıçta elimizde 2^4 adet bakteri vardı. Bu sayı 2^6 katına çıktı. Tabanlarımız aynı (ikisi de 2) olduğu için tabanı aynen koruduk, üsleri topladık: 4 + 6 = 10. Sonuç 2^10 olarak bulundu!",
        whyThisWay: "Neden üsleri topladık? Üslü sayılarda çarpma kuralı şudur: Tabanlar aynıysa üsler toplanır. 4 tane 2'nin yanına 6 tane daha 2 çarpanı gelince toplam 10 tane 2 çarpılmış olur.",
        mathOrDetail: "2^4 · 2^6 = 2^(4+6) = 2^10"
      },
      {
        stepNumber: 4,
        title: "4. Adım: Şıkları İnceleyip Doğru Cevabı İşaretleme",
        goal: "Bulduğumuz 2^10 sonucunu şıklarda teyit etmek",
        operationDetails: [
          "A) 2^8 (Yanlış - 4+4 yapılmış)",
          "B) 2^9 (Yanlış)",
          "C) 2^10 (DOĞRU CEVAP - Bizim bulduğumuz sonuçla birebir aynı)",
          "D) 2^12 (Yanlış - üsler çarpılmış: 4x6=24 veya 6x2=12 tuzağı)"
        ],
        explanation: "Bulduğumuz sonuç olan 2^10 doğrudan C seçeneğinde yer almaktadır. D şıkkındaki 2^12 ise üsleri toplamak yerine çarpan öğrencileri yanıltmak için konulmuş bir tuzaktır.",
        whyThisWay: "Şık eleme kontrolü yaparak işlemimizin doğruluğundan %100 emin olduk.",
        mathOrDetail: "Cevap: C Şıkkı (2^10)"
      }
    ],
    finalAnswer: "Sorunun doğru cevabı C seçeneğidir (2^10). İşlemleri birim çevirme, periyot hesabı ve üslü sayılarda çarpma adımlarıyla eksiksiz tamamladık.",
    keyTip: "Soruda birimlere çok dikkat et! Biri 'saat', diğeri 'dakika' ise sakın direkt işlem yapma, önce ikisini de aynı birime çevir. Ayrıca üslü sayılarda çarpma yaparken üsleri asla çarpma, sadece topla!",
    commonMistake: "Öğrencilerin en çok düştüğü tuzak: 4 ile 6'yı toplayıp 2^10 bulmak yerine, üsleri birbiriyle çarpıp 2^24 veya 2^12 şıkkına atlamaktır. Tabanlar aynıyken üsler toplanır!",
    similarQuestion: {
      question: "Bir kaptaki amip sayısı her 15 dakikada bir 2 katına çıkıyor. Başlangıçta 2^3 amip varken 1 saat sonra kapta kaç amip olur?",
      hint: "1 saat = 60 dakikadır. 60'ı 15'e bölerek kaç kez katlanacağını bul!",
      answer: "60 ÷ 15 = 4 kez katlanır (2^4 kat). Başlangıç 2^3 x 2^4 = 2^(3+4) = 2^7 amip olur."
    },
    audioSpeechText: "Merhaba sevgili öğrencim! Bu harika soruyu senin için adım adım ve tüm işlemleri açık açık çözüyorum. İlk olarak soruda bize verilenleri analiz ettik: Bakteriler 20 dakikada bir ikiye katlanıyor, başlangıçta 2 üzeri 4 bakteri var ve bizden 2 saat sonraki miktar isteniyor. 2 saatin 120 dakika olduğunu bulup 20'ye böldük ve 6 kez ikiye katlanacağını hesapladık. Bu da 2 üzeri 6 kat artış demektir. Başlangıçtaki 2 üzeri 4 ile 2 üzeri 6'yı çarptığımızda üsleri topladık ve 2 üzeri 10 sonucuna ulaştık. Doğru seçenek C şıkkıdır!"
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
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

  const { image, mimeType: clientMimeType, studentGrade, subjectHint, studentQuestion, followUpContext } = body;
  const gradeLevel = studentGrade || "8. Sınıf (LGS)";
  const studentQuery = studentQuestion ? `Öğrencinin ek sorusu/takıldığı yer: "${studentQuestion}"` : "";

  const ai = getGeminiClient();

  if (!ai) {
    const fallback = generateFallbackSolution(gradeLevel, subjectHint, studentQuestion);
    return res.status(200).json({
      success: true,
      source: "fallback_demo",
      apiKeyMissing: true,
      notice: "Yapay zeka API anahtarı (GEMINI_API_KEY) sisteme henüz tanımlanmamış. Kesintisiz deneyim için pedagojik örnek soru analizi ve çözüm adımları gösterilmektedir. Canlı yapay zeka tespiti için lütfen sunucu ortamına GEMINI_API_KEY değişkenini ekleyin.",
      solution: fallback
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
      } else {
        base64Data = trimmed.replace(/[\r\n\s]/g, "");
      }
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
      : `Lütfen ekteki soruyu ve görseli ${gradeLevel} seviyesindeki bir öğrenci için kusursuz analiz et. Görseldeki soru neyi soruyorsa TAM OLARAK O SORUYU ve tüm işlemleri satır satır göstererek çöz. ${studentQuery}`;

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

    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-flash-latest"];
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
    const fallback = generateFallbackSolution(gradeLevel, subjectHint, studentQuestion);
    return res.status(200).json({
      success: true,
      source: "fallback_demo",
      notice: "Yapay zeka modelleri yoğunluk nedeniyle yanıt veremediğinden pedagojik örnek soru çözümü gösterilmektedir. Lütfen kısa süre sonra tekrar deneyiniz.",
      solution: fallback
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
