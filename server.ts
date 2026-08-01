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
  try {
    if (!ai) {
      return res.status(400).json({
        error: "GEMINI_API_KEY is not configured on the server. Please add it to your environment variables.",
      });
    }

    const { studentName, grade, tasks, trialResults } = req.body;

    const systemInstruction = `Sen bir yapay zeka eğitim koçusun. 
Öğrencinin çözdüğü görevler, testler ve deneme sınavı sonuçlarına dayanarak her bir branş (Matematik, Türkçe, Fizik, vb.) için konu eksiklerini tespit etmeli, bu eksikliklerin neden kaynaklandığını açıklamalı ve öğrencinin bu eksikleri kapatması için popüler Türk eğitim kanallarından (Rehber Matematik, Şenol Hoca, Benim Hocam, VIP Fizik, Rüştü Hoca vb.) gerçekçi video/arama önerileri sunmalısın.

Öğrenci Bilgileri:
Adı: ${studentName || "Öğrenci"}
Sınıfı/Türü: ${grade || "Belirtilmemiş"}

Sana gönderilen görevler ve deneme performanslarını titizlikle analiz et. Eğer veri az ise genel bir durum tahmini yap ve eksik kalabilecek temel konuları listele.
Yanıtını mutlaka belirtilen JSON formatında vermelisin.`;

    const userPrompt = `Aşağıdaki öğrenci verilerini analiz et ve branş bazlı konu eksikleri ile video önerilerini çıkar:
Görevler/Ödevler: ${JSON.stringify(tasks || [])}
Deneme Sınav Geçmişi: ${JSON.stringify(trialResults || [])}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["summary", "subjects"],
          properties: {
            summary: {
              type: Type.STRING,
              description: "Öğrencinin genel akademik durumunu özetleyen, motivasyon verici ve yönlendirici 2-3 cümlelik bir paragraf.",
            },
            subjects: {
              type: Type.ARRAY,
              description: "Öğrencinin branş bazlı analiz sonuçları.",
              items: {
                type: Type.OBJECT,
                required: ["name", "status", "accuracy", "deficiencies"],
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "Branş adı (Örn: Matematik, Fizik, Türkçe, Fen ve Teknoloji vb.)",
                  },
                  status: {
                    type: Type.STRING,
                    description: "Branşın başarı seviyesi durum etiketi. Sadece 'success' (başarılı/sorunsuz), 'warning' (dikkat etmeli/orta) veya 'danger' (geliştirilmesi gereken eksiklik var) değerlerinden biri olmalı.",
                  },
                  accuracy: {
                    type: Type.INTEGER,
                    description: "Branşın tahmini başarı yüzdesi (0-100 arası tamsayı). Çözülen görevlerdeki doğru/yanlış oranlarına göre hesapla.",
                  },
                  deficiencies: {
                    type: Type.ARRAY,
                    description: "Bu branşta tespit edilen konu bazlı eksiklikler.",
                    items: {
                      type: Type.OBJECT,
                      required: ["topic", "errorCount", "description", "recommendations"],
                      properties: {
                        topic: {
                          type: Type.STRING,
                          description: "Eksik olduğu tespit edilen spesifik konu başlığı (Örn: Türev, Paragrafta Anlam, Basınç vb.)",
                        },
                        errorCount: {
                          type: Type.INTEGER,
                          description: "Bu konuyla ilgili yanlış/boş sayısı veya önem derecesini belirten puan.",
                        },
                        description: {
                          type: Type.STRING,
                          description: "Bu konudaki eksiğin detaylı açıklaması ve öğrencinin neye odaklanması gerektiği.",
                        },
                        recommendations: {
                          type: Type.ARRAY,
                          description: "Bu konuyu çalışması için video ve arama önerileri.",
                          items: {
                            type: Type.OBJECT,
                            required: ["title", "searchQuery", "youtubeUrl"],
                            properties: {
                              title: {
                                type: Type.STRING,
                                description: "Önerilen video başlığı veya ders anlatım serisi adı (Örn: 'Türev Sıfırdan Al - Rehber Matematik')",
                              },
                              searchQuery: {
                                type: Type.STRING,
                                description: "YouTube'da konuyu aratırken kullanabileceği en verimli arama kelimeleri (Örn: 'Rehber Matematik Turev')",
                              },
                              youtubeUrl: {
                                type: Type.STRING,
                                description: "Doğrudan bu arama sorgusunu içeren YouTube arama sayfası linki (Örn: 'https://www.youtube.com/results?search_query=Rehber+Matematik+Turev')",
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const resultText = response.text || "{}";
    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: error.message || "Yapay Zeka analizi sırasında bir hata oluştu." });
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
