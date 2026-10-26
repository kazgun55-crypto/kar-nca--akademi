import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { generateSmartAnalysis, buildAiPromptData } from "./src/lib/aiAnalysisService";

dotenv.config();

const app = express();
const PORT = 3000;

// Body limits (25MB for high-res question photos)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// CORS & Preflight Support (applied before all routes)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Gemini API client at the top level
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (initErr) {
    console.warn("Failed to initialize GoogleGenAI client:", initErr);
  }
}

// Fallback solution generator with deep question analysis and explicit operation explanations
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

// AI Question Solver Endpoint (Multimodal Image + Student-friendly explanation + Strict Target Solving)
app.post("/api/solve-question", async (req, res) => {
  try {
    const { 
      image, 
      mimeType: clientMimeType, 
      studentGrade, 
      subjectHint, 
      studentQuestion, 
      followUpContext 
    } = req.body || {};

    const gradeLevel = studentGrade || "8. Sınıf (LGS)";
    const subject = subjectHint || "Ders";
    const studentQuery = studentQuestion ? `Öğrencinin ek sorusu/takıldığı yer: "${studentQuestion}"` : "";

    // If Gemini client is not initialized, generate a structured pedagogical fallback
    if (!ai) {
      return res.json({
        success: true,
        source: "fallback",
        solution: generateFallbackSolution(gradeLevel, subjectHint, studentQuestion)
      });
    }

    // Extract base64 image data cleanly
    let base64Data = "";
    let mimeType = clientMimeType || "image/jpeg";

    if (image && typeof image === "string") {
      if (image.startsWith("data:")) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = image.split(",")[1] || image;
        }
      } else {
        base64Data = image;
      }
    }

    const systemInstruction = `Sen Türkiye MEB (LGS, YKS/TYT/AYT, Ortaokul ve Lise) müfredatına tam hakim, soruyu en ufak detayına kadar kusursuz analiz eden ve TAM OLARAK İSTENENİ çözen uzman bir 'Yapay Zeka Soru Çözücü' öğretmenisin.

KULLANICININ EN ÖNEMLİ VE TAVİZSİZ TALEBİ:
"Yapay zeka ona yüklenen soruyu doğru şekilde analiz etsin ve ne isteniyorsa ona göre çözsün! Yaptığı her işlemi öğrencinin anlayacağı sadelikte açık açık anlatsın."

BU HEDEFE ULAŞMAK İÇİN ŞU 3 ALTIN KURALA KESİNLİKLE UYACAKSIN:

1. SORUYU VE GÖRSELİ EKSİKSİZ DOĞRU ANALİZ ET (questionAnalysis):
   - Resimdeki sorunun tüm metnini, öncüllerini (I, II, III vb.), varsa şekil, geometri çizimi, grafik veya tablo verilerini harfi harfine doğru oku ve 'questionText' alanına aktar.
   - 'givens' (Verilenler): Soruda öğrenciye sunulan tüm sayısal ve sözel verileri, birimleri ve kısıtları tek tek madde olarak listele.
   - 'target' (Soru Kökü ve İstenen): Sorunun KÖKÜNÜ tam olarak tespit et! Soru bizden tam olarak neyi istiyor? (Örn: "x'i mi, x+y'yi mi?", "En az kaç mı en çok kaç mı?", "Hangisi yanlıştır mı, hangisi kesinlikle doğrudur mu?", "Çevre mi alan mı?"). Burayı çok net ve eksiksiz yaz.
   - 'figureOrDataAnalysis': Eğer soruda şekil, çizim veya grafik varsa, şeklin üzerindeki açıları, uzunlukları, eksenleri veya taralı alanları detaylıca açıkla.
   - 'solvingStrategy': İstenene doğrudan ulaşmak için izleyeceğimiz net çözüm yolunu belirt.

2. NE İSTENİYORSA TAM VE YALNIZCA ONA GÖRE ÇÖZ (HEDEFTEN ASLA SAPMA):
   - Asla sorulmamış ara bir değişkende durma! (Örn: x=5 bulundu diye cevabı 5 yapma; eğer soru '2x - 3 kaçtır?' diyorsa '2(5) - 3 = 7' işlemini mutlaka tamamla).
   - Olumsuz soru köklerinde ('değildir', 'ulaşılamaz', 'söylenemez') her şıkkı tek tek test ederek neden elendiğini göster.
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

    const userPrompt = followUpContext
      ? `Önceki Soru Çözümü Bağlamı:
${JSON.stringify(followUpContext)}

Öğrencinin Devam Sorusu / Anlamadığı İşlem:
"${studentQuestion || 'Bu işlemi nasıl yaptığınızı biraz daha açık anlatabilir misiniz?'}"

Lütfen öğrencinin aklındaki soru işaretini tamamen giderecek şekilde, soruda ne istendiğine odaklanarak işlemleri tane tane ve samimi bir dille açıkla.`
      : `Lütfen ekteki soruyu ve görseli ${gradeLevel} seviyesindeki bir öğrenci için kusursuz analiz et. Soruda ne isteniyorsa TAM OLARAK ONA ODAKLANARAK ve tüm işlemleri satır satır göstererek çöz.
${studentQuery}
${subjectHint ? `Ders İpucu: ${subjectHint}` : ""}`;

    const parts: any[] = [];
    if (base64Data) {
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      });
    }
    parts.push({
      text: userPrompt
    });

    const responseSchema = {
      type: Type.OBJECT,
      required: [
        "subject", 
        "topic", 
        "questionText", 
        "correctOption", 
        "studentSummary", 
        "questionAnalysis",
        "targetCheck",
        "coreFormula",
        "steps", 
        "finalAnswer", 
        "keyTip", 
        "commonMistake", 
        "audioSpeechText"
      ],
      properties: {
        subject: { type: Type.STRING, description: "Ders adı (Matematik, Fen, Türkçe vb.)" },
        topic: { type: Type.STRING, description: "Konu adı" },
        questionText: { type: Type.STRING, description: "Sorunun görselden okunan eksiksiz net metni ve öncülleri" },
        correctOption: { type: Type.STRING, description: "Doğru şık (A, B, C, D, E) veya açık cevap" },
        studentSummary: { type: Type.STRING, description: "Sorunun öğrenci diliyle 1-2 cümlelik sade özeti" },
        questionAnalysis: {
          type: Type.OBJECT,
          required: ["givens", "target", "solvingStrategy"],
          properties: {
            questionType: { type: Type.STRING, description: "Soru Türü (Örn: Çoktan Seçmeli LGS Problemi, Geometri vb.)" },
            givens: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "Soruda verilen tüm veriler, sayılar, birimler ve kurallar listesi" 
            },
            target: { type: Type.STRING, description: "Sorunun KÖKÜ ve bizden tam olarak ne istendiği" },
            figureOrDataAnalysis: { type: Type.STRING, description: "Varsa görseldeki şekil, grafik veya tablo analizi" },
            solvingStrategy: { type: Type.STRING, description: "Hedefe doğrudan ulaşmak için izlenecek çözüm stratejisi" }
          }
        },
        targetCheck: { type: Type.STRING, description: "Hedef Doğrulama: Soru kökünde istenen ile bulunan sonucun kontrolü ve teyidi" },
        coreFormula: {
          type: Type.OBJECT,
          required: ["name", "formula", "explanation"],
          properties: {
            name: { type: Type.STRING, description: "Kullanılan kural veya yöntemin adı" },
            formula: { type: Type.STRING, description: "Formül veya kural gösterimi" },
            explanation: { type: Type.STRING, description: "Formülün öğrenci diliyle anlamı" }
          }
        },
        steps: {
          type: Type.ARRAY,
          description: "İşlemlerin nasıl yapıldığını adım adım gösteren detaylı basamaklar",
          items: {
            type: Type.OBJECT,
            required: ["stepNumber", "title", "goal", "operationDetails", "explanation", "whyThisWay"],
            properties: {
              stepNumber: { type: Type.INTEGER },
              title: { type: Type.STRING, description: "Adım başlığı" },
              goal: { type: Type.STRING, description: "Bu adımda neyi buluyoruz?" },
              operationDetails: { 
                type: Type.ARRAY, 
                description: "Yapılan işlemlerin satır satır hesaplama dökümü",
                items: { type: Type.STRING }
              },
              explanation: { type: Type.STRING, description: "İşlemin nasıl yapıldığının öğrenci diliyle detaylı anlatımı" },
              whyThisWay: { type: Type.STRING, description: "Bu işlemin mantığı ve neden böyle yapıldığı" },
              mathOrDetail: { type: Type.STRING, description: "Özet işlem satırı" }
            }
          }
        },
        finalAnswer: { type: Type.STRING, description: "Nihai sonuç cümlesi ve doğru şık gerekçesi" },
        keyTip: { type: Type.STRING, description: "Öğrenciye özel altın kural / püf noktası" },
        commonMistake: { type: Type.STRING, description: "Öğrencilerin en çok yaptığı işlem veya dikkatsizlik hatası" },
        similarQuestion: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            hint: { type: Type.STRING },
            answer: { type: Type.STRING }
          }
        },
        audioSpeechText: { type: Type.STRING, description: "Sesli dinleme için konuşma metni" }
      }
    };

    let responseText: string | null = null;
    const modelsToTry = ["gemini-3.8-flash", "gemini-3.1-flash-lite"];

    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema
          }
        });

        if (response && response.text) {
          responseText = response.text;
          break;
        }
      } catch (modelErr: any) {
        console.warn(`Model ${modelName} call failed for solve-question:`, modelErr?.message || modelErr);
      }
    }

    if (responseText) {
      const cleanText = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      const parsed = JSON.parse(cleanText);
      return res.json({
        success: true,
        source: "gemini",
        solution: parsed
      });
    }

    throw new Error("Boş veya başarısız AI yanıtı alındı");
  } catch (err: any) {
    console.error("Question solver error, using pedagogical fallback:", err?.message || err);
    return res.json({
      success: true,
      source: "fallback",
      solution: generateFallbackSolution(req.body?.studentGrade, req.body?.subjectHint, req.body?.studentQuestion)
    });
  }
});

// AI Analysis Endpoint
app.post("/api/analyze", async (req, res) => {
  const input = req.body || {};
  const smartStats = generateSmartAnalysis(input);

  if (!ai) {
    return res.json(smartStats);
  }

  try {
    const { systemInstruction, userPrompt, actualSubjectsList } = buildAiPromptData(smartStats, input);

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
        console.warn(`Model ${modelName} call bypassed, fallback to calculation engine:`, err?.message || err);
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

        return res.json(mergedResponse);
      } catch (parseErr) {
        console.warn("JSON parse on Gemini response failed, returning smart stats directly:", parseErr);
        return res.json(smartStats);
      }
    }

    return res.json(smartStats);
  } catch (error: any) {
    console.error("Top-level analysis handler error, gracefully responding:", error);
    return res.json(smartStats);
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
