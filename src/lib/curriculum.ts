export interface Subject {
  name: string;
  topics: string[];
}

// 8. Sınıf LGS Müfredatı
export const SUBJECTS_8: Subject[] = [
  { 
    name: 'Matematik', 
    topics: [
      'Çarpanlar ve Katlar', 
      'Üslü İfadeler', 
      'Kareköklü İfadeler', 
      'Veri Analizi', 
      'Basit Olayların Olma Olasılığı', 
      'Cebirsel İfadeler ve Özdeşlikler', 
      'Doğrusal Denklemler', 
      'Eşitsizlikler', 
      'Üçgenler', 
      'Eşlik ve Benzerlik', 
      'Dönüşüm Geometrisi', 
      'Geometrik Cisimler'
    ] 
  },
  { 
    name: 'Türkçe', 
    topics: [
      'Fiilimsiler (Eylemsiler)', 
      'Sözcükte Anlam', 
      'Cümlede Anlam', 
      'Paragrafta Anlam ve Yapı', 
      'Yazım Kuralları', 
      'Noktalama İşaretleri', 
      'Cümlenin Ögeleri', 
      'Fiilde Çatı', 
      'Cümle Türleri', 
      'Anlatım Bozuklukları', 
      'Metin Türleri ve Söz Sanatları', 
      'Sözel Mantık ve Muhakeme'
    ] 
  },
  { 
    name: 'Fen ve Teknoloji', 
    topics: [
      'Mevsimler ve İklim', 
      'DNA ve Genetik Kod', 
      'Basınç (Katı, Sıvı, Gaz)', 
      'Madde ve Endüstri (Periyodik Sistem, Fiziksel-Kimyasal Değişim)', 
      'Basit Makineler', 
      'Enerji Dönüşümleri ve Çevre Bilimi', 
      'Elektrik Yükleri ve Elektrik Enerjisi'
    ] 
  },
  { 
    name: 'İnkılap Tarihi ve Atatürkçülük', 
    topics: [
      'Bir Kahraman Doğuyor (Selanik\'ten Liderliğe)', 
      'Milli Uyanış: Bağımsızlık Yolunda Atılan Adımlar', 
      'Milli Bir Destan: Ya İstiklal Ya Ölüm!', 
      'Atatürkçülük ve Çağdaşlaşan Türkiye', 
      'Demokratikleşme Çabaları', 
      'Atatürk Dönemi Türk Dış Politikası', 
      'Atatürk\'ün Ölümü ve Sonrası'
    ] 
  },
  { 
    name: 'Din Kültürü ve Ahlak Bilgisi', 
    topics: [
      'Kader İnancı (Kaza ve Kader Kavramları)', 
      'Zekat ve Sadaka İbadeti', 
      'Din ve Hayat (Temel Hakların Korunması)', 
      'Hz. Muhammed\'in Doğruluğu ve Güvenilirliği', 
      'Kur\'an-ı Kerim ve Özellikleri (Ayet ve Sureler)'
    ] 
  },
  { 
    name: 'İngilizce', 
    topics: [
      'Unit 1: Friendship', 
      'Unit 2: Teen Life', 
      'Unit 3: In the Kitchen', 
      'Unit 4: On the Phone', 
      'Unit 5: The Internet', 
      'Unit 6: Adventures', 
      'Unit 7: Tourism', 
      'Unit 8: Chores', 
      'Unit 9: Science', 
      'Unit 10: Natural Forces'
    ] 
  }
];

// 9. Sınıf - MEB Türkiye Yüzyılı Maarif Modeli Müfredatı
export const SUBJECTS_9_MAARIF: Subject[] = [
  { 
    name: 'Matematik (Maarif Modeli)', 
    topics: [
      'Kümeler ve Mantık İlkeleri', 
      'Sayı Kümeleri, İşlem Yeteneği ve Gerçek Sayılar', 
      'Bölünebilme Kuralları ve Asal Çarpanlar (OBEB-OKEK)', 
      'Birinci Dereceden Denklem ve Eşitsizlikler', 
      'Mutlak Değerli Denklem ve Eşitsizlikler', 
      'Fonksiyon Kavramı, Değişim ve Tanım Kümeleri', 
      'Üçgenlerin Temel Elemanları ve Açı Özellikleri', 
      'Üçgende Eşlik ve Benzerlik Teoremleri', 
      'Dik Üçgen ve Temel Trigonometrik Oranlar', 
      'Üçgenin Alanı ve Geometrik Uygulamalar', 
      'Veriden Olasılığa: İstatistik ve Veri Grafikleri'
    ] 
  },
  { 
    name: 'Türk Dili ve Edebiyatı (Maarif Modeli)', 
    topics: [
      'Edebiyata Giriş, Dil ve İletişim Becerileri', 
      'Olay Çevresinde Oluşan Metinler: Hikâye (Öykü)', 
      'Coşku ve Heyecanı Dile Getiren Metinler: Şiir Bilgisi ve Nazım Şekilleri', 
      'Masal ve Fabl Türü İncelemeleri', 
      'Roman Türü, Yapı Unsurları ve Çatışma', 
      'Tiyatro Sanatı ve Metin Çözümlemesi', 
      'Kişisel Hayatı Konu Alan Metinler: Biyografi ve Otobiyografi', 
      'Mektup ve Güncel Elektronik Posta (E-posta)', 
      'Günlük (Günce) ve Blog Türleri', 
      'Yazım Kuralları, Noktalama ve Kelimede Anlam', 
      'Sözcük Türleri (İsim, Sıfat, Zamir, Zarf, Edat, Bağlaç, Ünlem)'
    ] 
  },
  { 
    name: 'Fizik (Maarif Modeli)', 
    topics: [
      'Fizik Bilimine Giriş ve Bilimsel Araştırma Merkezleri', 
      'Madde ve Özellikleri (Özkütle, Dayanıklılık, Yüzey Gerilimi)', 
      'Bir Boyutta Sabit Hızlı Hareket ve Grafikleri', 
      'Kuvvet Kavramı ve Newton\'un Hareket Yasaları', 
      'Sürtünme Kuvveti ve Yaşamsal Etkileri', 
      'İş, Güç ve Mekanik Enerji Dönüşümleri', 
      'Verim ve Enerji Kaynakları', 
      'Isı, Sıcaklık ve Termal Denge', 
      'Hal Değişimi, Isıl İletim ve Genleşme', 
      'Elektrostatik: Elektrik Yükleri ve Coulomb Yasası'
    ] 
  },
  { 
    name: 'Kimya (Maarif Modeli)', 
    topics: [
      'Simyadan Kimyaya ve Kimya Disiplinleri', 
      'Kimya Laboratuvarında Güvenlik ve Temel Maddeler', 
      'Atom Modellerinin Tarihsel Gelişimi', 
      'Atomun Yapısı ve Periyodik Sistem Yerleşimi', 
      'Periyodik Özelliklerin Değişimi', 
      'Kimyasal Türler ve Etkileşimlerin Sınıflandırılması', 
      'Güçlü Etkileşimler: İyonik, Kovalent ve Metalik Bağ', 
      'Zayıf Etkileşimler: Van der Waals ve Hidrojen Bağı', 
      'Maddenin Fiziksel Halleri (Gazlar, Sıvılar ve Katılar)', 
      'Çevre Kimyası, Atmosfer Kirliliği ve Su Tasarrufu'
    ] 
  },
  { 
    name: 'Biyoloji (Maarif Modeli)', 
    topics: [
      'Yaşam Bilimi Biyoloji ve Bilimsel Düşünce', 
      'Canlıların Ortak Özellikleri', 
      'İnorganik Bileşikler (Su, Mineraller, Asit, Baz, Tuzlar)', 
      'Organik Bileşikler (Karbonhidrat, Yağ, Protein, Vitaminler)', 
      'Enzimlerin Yapısı ve Çalışmasına Etki Eden Faktörler', 
      'Nükleik Asitler (DNA, RNA) ve ATP Yapısı', 
      'Hücre Teorisi ve Mikroskopik İncelemeler', 
      'Hücre Zarı ve Madde Geçişleri (Difüzyon, Osmoz, Aktif Taşıma)', 
      'Sitoplazma ve Organellerin Görevleri', 
      'Canlılar Âlemi ve Biyolojik Sınıflandırma İlkeleri'
    ] 
  },
  { 
    name: 'Tarih (Maarif Modeli)', 
    topics: [
      'Tarih Biliminin Yöntemi ve Zaman Algısı', 
      'İnsanlığın İlk Dönemleri ve Medeniyet Havzaları', 
      'Orta Çağ’da Dünya ve Hukuk Sistemleri', 
      'İlk ve Orta Çağlarda Türk Dünyası (Kültür ve Ordu)', 
      'İslam Medeniyetinin Doğuşu ve Dört Halife Dönemi', 
      'Türklerin İslamiyet’i Kabulü ve İlk Müslüman Türk Devletleri', 
      'Büyük Selçuklu Devleti ve Nizamiye Medreseleri'
    ] 
  },
  { 
    name: 'Coğrafya (Maarif Modeli)', 
    topics: [
      'Doğa, İnsan ve Mekânsal Çevre', 
      'Coğrafi Koordinat Sistemi ve Yerel Saat Hesaplamaları', 
      'Harita Okuryazarlığı, İzohipsler ve Ölçekler', 
      'Dünya\'nın Şekli ve Hareketlerinin Sonuçları', 
      'Atmosfer, Sıcaklık Dağılışı ve Basınç Kuşakları', 
      'Rüzgârlar, Nemlilik ve Yağış Tipleri', 
      'Büyük İklim Tipleri ve Türkiye\'nin İklim Özellikleri', 
      'Türkiye\'de ve Dünyada Yerleşmelerin Tarihsel Gelişimi'
    ] 
  },
  { 
    name: 'Din Kültürü ve Ahlak Bilgisi', 
    topics: [
      'Bilgi ve İnanç / Akıl ve Vahiy İlişkisi', 
      'İslam ve Tevhid İnancı', 
      'İslam ve İbadet / Namaz, Oruç ve Hac Hikmeti', 
      'Kur\'an\'da Gençlik Modelleri ve Hz. Muhammed\'in Gençlere Verdiği Değer', 
      'Gönül Coğrafyamız ve Manevi Mirasımız'
    ] 
  },
  { 
    name: 'İngilizce', 
    topics: [
      'Theme 1: Studying Abroad', 
      'Theme 2: My Environment', 
      'Theme 3: Movies and Cinema', 
      'Theme 4: Human in Nature', 
      'Theme 5: Inspirational People', 
      'Theme 6: Bridging Cultures', 
      'Theme 7: World Heritage', 
      'Theme 8: Emergency and Health', 
      'Theme 9: Invitations and Celebrations', 
      'Theme 10: Television and Social Media'
    ] 
  }
];

// 10. Sınıf - MEB Türkiye Yüzyılı Maarif Modeli Müfredatı
export const SUBJECTS_10_MAARIF: Subject[] = [
  { 
    name: 'Matematik (Maarif Modeli)', 
    topics: [
      'Sayma İlkeleri, Faktöriyel ve Toplama/Çarpma Kuralı', 
      'Permütasyon (Sıralama) ve Tekrarlı Permütasyon', 
      'Kombinasyon (Grup Seçimi) ve Geometrik Uygulamaları', 
      'Binom Açılımı ve Katsayılar', 
      'Olasılık Kavramı ve Koşullu Olasılık Giriş', 
      'Fonksiyon Kavramı, Grafikler ve Birebir-Örtenlik', 
      'Bileşke Fonksiyon ve Ters Fonksiyon İşlemleri', 
      'Polinomlar: Tanım, Derece ve Katsayılar Toplamı', 
      'Polinomlarda Bölme ve Kalan Bulma Teoremi', 
      'Çarpanlara Ayırma Yöntemleri ve Özdeşlikler', 
      'İkinci Dereceden Bir Bilinmeyenli Denklemler ve Kökler', 
      'Çokgenler, Dörtgenlerin Temel Özellikleri ve Alan', 
      'Özel Dörtgenler: Yamuk, Paralelkenar, Eşkenar Dörtgen, Dikdörtgen, Kare, Deltoid', 
      'Katı Cisimler: Prizmalar, Piramitler ve Alan-Hacim Hesaplamaları'
    ] 
  },
  { 
    name: 'Türk Dili ve Edebiyatı (Maarif Modeli)', 
    topics: [
      'Türk Edebiyatının Tarihî Dönemleri ve Ana Kolları', 
      'Dede Korkut Hikâyeleri, Halk Hikâyeleri ve Cenkname', 
      'Mesnevi Türü ve Klasik Divan Edebiyatı Anlatıları', 
      'İslamiyet Öncesi ve İslami Dönem Türk Şiiri (Koşma, Gazel, İlahi, Nefes)', 
      'Destanlar (Doğal ve Yapay Destanlar) ve Efsaneler', 
      'Tanzimat, Servetifünun ve Millî Edebiyat Dönemlerinde Roman', 
      'Geleneksel Türk Tiyatrosu (Karagöz, Orta Oyunu, Meddah) ve Modern Tiyatro', 
      'Öğretici Metinler: Hatıra (Anı) Türü ve Temsilcileri', 
      'Gezi Yazısı (Seyahatname) ve Mekân Tasviri', 
      'Cümle Bilgisi: Cümlenin Ögeleri ve Cümle Türleri (Anlamına, Yüklemine, Yapısına Göre)', 
      'Yazım Kuralları, Noktalama ve Anlatım Bozuklukları'
    ] 
  },
  { 
    name: 'Fizik (Maarif Modeli)', 
    topics: [
      'Elektrik Akımı, Potansiyel Farkı ve Ohm Kanunu', 
      'Dirençlerin Seri ve Paralel Bağlanması, Eşdeğer Direnç', 
      'Üreteçlerin Bağlanması, Elektrik Enerjisi ve Elektriksel Güç', 
      'Mıknatıslar, Manyetik Alan Çizgileri ve Akımın Manyetik Etkisi', 
      'Basınç: Katı, Sıvı ve Gaz Basıncı (Torricelli, Pascal İlkesi)', 
      'Akışkanlar Mekaniği ve Arşimet Kaldırma Kuvveti', 
      'Dalgaların Temel Değişkenleri: Genlik, Frekans, Dalga Boyu, Hız', 
      'Yay Dalgaları: Atmanın Yansıması ve İletimi', 
      'Su Dalgaları: Doğrusal ve Dairesel Dalgaların Yansıması, Kırılma ve Stroboskop', 
      'Ses Dalgaları, Rezonans, Deprem Dalgaları ve Güvenlik', 
      'Optik: Aydınlanma Şiddeti, Işık Akısı ve Gölge Oluşumu', 
      'Düzlem Aynalar ve Küresel Aynalarda (Çukur ve Tümsek) Görüntü', 
      'Işığın Kırılması, Snell Yasası, Tam Yansıma ve Mercekler', 
      'Prizmalar, Işığın Renklerine Ayrılması ve Renk Teorisi'
    ] 
  },
  { 
    name: 'Kimya (Maarif Modeli)', 
    topics: [
      'Kimyanın Temel Kanunları (Kütlenin Korunumu, Sabit Oranlar, Katlı Oranlar)', 
      'Mol Kavramı, Avogadro Sayısı ve Bağıl Atom Kütlesi', 
      'Kimyasal Tepkimeler ve Denkleştirme', 
      'Kimyasal Hesaplamalar ve Sınırlayıcı Bileşen Problemleri', 
      'Karışımların Sınıflandırılması: Homojen ve Heterojen Karışımlar', 
      'Çözünme Süreci, Derişim Birimleri (Kütlece %, Hacimce %, ppm)', 
      'Koligatif Özellikler (Kaynama Noktası Yükselmesi, Donma Noktası Düşmesi)', 
      'Karışımların Ayrılma Yöntemleri (Süzme, Diyaliz, Damıtma, Ayrımsal Damıtma)', 
      'Asitler, Bazlar ve Genel Özellikleri, pH-pOH Skalası', 
      'Asit-Baz Tepkimeleri ve Nötralleşme', 
      'Tuzlar, Oluşumları ve Endüstrideki Kullanım Alanları', 
      'Hayatımızda Kimya: Temizlik Maddeleri, Polimerler, Kozmetikler ve İlaçlar'
    ] 
  },
  { 
    name: 'Biyoloji (Maarif Modeli)', 
    topics: [
      'Hücre Bölünmelerinin Gerekliliği ve Hücre Döngüsü', 
      'Mitoz Bölünme Evreleri ve Sitokinez', 
      'Eşeysiz Üreme Çeşitleri (Bölünme, Tomurcuklanma, Rejenerasyon, Vejetatif)', 
      'Mayoz Bölünme Evreleri ve Krossing-Over', 
      'Eşeyli Üreme ve Genetik Çeşitlilik', 
      'Kalıtımın Temel İlkeleri ve Gregor Mendel Genetiği', 
      'Monohibrit, Dihibrit Çaprazlamalar ve Eş Baskınlık', 
      'Kan Grupları ve Rh Faktörü Kalıtımı', 
      'Eşeye Bağlı Kalıtım (Hemofili, Renk Körlüğü) ve Soyağaçları', 
      'Ekosistemin Canlı ve Cansız Bileşenleri', 
      'Besin Zinciri, Besin Ağı ve Trofik Düzeylerde Enerji Akışı', 
      'Madde Döngüleri (Karbon, Azot, Su Döngüsü)', 
      'Güncel Çevre Sorunları, Karbon Ayak İzi ve Sürdürülebilirlik'
    ] 
  },
  { 
    name: 'Felsefe (Maarif Modeli)', 
    topics: [
      'Felsefenin Anlamı, Doğuşu ve Felsefi Düşüncenin Nitelikleri', 
      'Felsefe ile Düşünme: Akıl Yürütme ve Argümantasyon', 
      'Görüş ve Argümanı Sorgulama, Dil-Düşünce İlişkisi', 
      'Varlık Felsefesi (Ontoloji): Varlığın Mahiyeti ve Problemleri', 
      'Bilgi Felsefesi (Epistemoloji): Bilginin Kaynağı, Doğruluk ve Sınırları', 
      'Ahlak Felsefesi (Etik): Ahlaki Eylemin Amacı, İrade ve Özgürlük', 
      'Din Felsefesi: Tanrı\'nın Varlığına Yönelik Yaklaşımlar', 
      'Siyaset Felsefesi: Devletin Doğuşu, Meşruiyet ve Ütopyalar', 
      'Sanat Felsefesi (Estetik): Sanat ve Güzellik Kuramları', 
      'Felsefi Okuma ve Özgün Metin Yazma Becerileri'
    ] 
  },
  { 
    name: 'Tarih (Maarif Modeli)', 
    topics: [
      'Yerleşme ve Devletleşme Sürecinde Selçuklu Türkiyesi', 
      'Anadolu\'nun Türkleşmesi ve Anadolu Türk Beylikleri', 
      'Beylikten Devlete Osmanlı Siyaseti (1300-1453)', 
      'Balkan Fetihleri ve İskân Siyaseti', 
      'Devletleşme Sürecinde Askerî Teşkilat (Tımarlı Sipahiler, Yeniçeri Ocağı)', 
      'Beylikten Devlete Osmanlı Medeniyeti, İlmiye ve Kalemiye Sınıfları', 
      'Dünya Gücü Osmanlı Devleti (1453-1595) ve İstanbul\'un Fethi', 
      'Sultan ve Merkez Teşkilatı: Divan-ı Hümayun ve Saray Yapısı', 
      'Klasik Çağda Osmanlı Toplum Düzeni ve Millet Sistemi'
    ] 
  },
  { 
    name: 'Coğrafya (Maarif Modeli)', 
    topics: [
      'Dünya\'nın Tektonik Yapısı ve Jeolojik Zamanlar', 
      'İç Kuvvetler: Orojenez, Epirojenez, Volkanizma ve Depremler', 
      'Kayaç Türleri ve Yeryüzü Şekilleriyle İlişkisi', 
      'Dış Kuvvetler: Akarsular, Karstik Şekiller, Rüzgârlar, Buzullar ve Kıyı Şekilleri', 
      'Türkiye\'nin Yer Şekilleri ve Dağ-Ova-Plato Özellikleri', 
      'Yeryüzündeki Su Varlığı: Okyanuslar, Göller, Akarsular ve Yeraltı Suları', 
      'Toprak Tipleri, Dağılışı ve Türkiye\'de Toprak Varlığı', 
      'Bitki Toplulukları (Orman, Çalı, Ot Formasyonları)', 
      'Nüfusun Gelişimi, Sayımları ve Nüfus Piramitleri Analizi', 
      'Türkiye\'de Nüfusun Dağılışı ve Göç Hareketleri'
    ] 
  },
  { 
    name: 'Din Kültürü ve Ahlak Bilgisi', 
    topics: [
      'Allah İnsan İlişkisi: Dua, İbadet ve Tevbe', 
      'Hz. Muhammed ve Genç Sahabeler', 
      'Din ve Hayat: İslam Düşüncesinde Haklar ve Sorumluluklar', 
      'İslam Düşüncesinde İtikadi, Siyasi ve Fıkhi Yorumlar', 
      'Dinî ve Millî Değerlerimizi Korumanın Önemi'
    ] 
  },
  { 
    name: 'İngilizce', 
    topics: [
      'Theme 1: School Life and Routines', 
      'Theme 2: Plans and Intentions', 
      'Theme 3: Legend or Real?', 
      'Theme 4: Traditions and Folklore', 
      'Theme 5: Travel and Tourism', 
      'Theme 6: Helpful Tips and Advice', 
      'Theme 7: Food and Festivals', 
      'Theme 8: The Digital Era', 
      'Theme 9: Modern Heroes and Heroines', 
      'Theme 10: Shopping and Consumerism'
    ] 
  }
];

// 11. ve 12. Sınıf / Mezun - YKS (TYT / AYT) Müfredatı
export const SUBJECTS_11_12: Subject[] = [
  { 
    name: 'Matematik', 
    topics: [
      'Temel Kavramlar & Sayı Kümeleri', 
      'Bölme, Bölünebilme Kuralları ve EBOB-EKOK', 
      'Rasyonel ve Ondalık Sayılar', 
      'Basit Eşitsizlikler', 
      'Mutlak Değer ve Özellikleri', 
      'Üslü Sayılar ve İşlemler', 
      'Köklü Sayılar ve Eşlenik', 
      'Çarpanlara Ayırma ve Özdeşlikler', 
      'Oran - Orantı Bağıntıları', 
      'Sayı ve Kesir Problemleri', 
      'Yaş Problemleri', 
      'İşçi ve Emek Problemleri', 
      'Yüzde, Kâr - Zarar Problemleri', 
      'Karışım Problemleri', 
      'Hız - Hareket Problemleri', 
      'Grafik ve Tablo Okuma Problemleri', 
      'Mantık ve Önermeler', 
      'Kümeler ve Kartezyen Çarpım', 
      'Fonksiyonlar (Tanım, Değer, Bileşke, Ters)', 
      'Polinomlar ve Bölme Teoremi', 
      'İkinci Dereceden Denklemler', 
      'Karmaşık Sayılar', 
      'Parabol (İkinci Dereceden Fonksiyon Grafikleri)', 
      'İkinci Dereceden Eşitsizlikler ve Sistemleri', 
      'Permütasyon, Kombinasyon ve Binom Açılımı', 
      'Olasılık (Basit ve Koşullu Olasılık)', 
      'Trigonometri - 1 (Birim Çember, Bölgeler, İndirgeme)', 
      'Trigonometri - 2 (Toplam-Fark, Yarım Açı, Denklemler)', 
      'Logaritma ve Üstel Fonksiyonlar', 
      'Diziler (Aritmetik ve Geometrik Dizi)', 
      'Limit ve Süreklilik', 
      'Türev Alma Kuralları ve Geometrik Yorum', 
      'Türev Uygulamaları (Artan-Azalanlık, Ekstremum, Maks-Min)', 
      'Belirsiz İntegral ve Değişken Değiştirme', 
      'Belirli İntegral ve Riemann Toplamı', 
      'İntegral ile Alan Hesabı'
    ] 
  },
  { 
    name: 'Geometri', 
    topics: [
      'Doğruda ve Üçgende Açılar', 
      'Özel Üçgenler (30-60-90, 45-45-90, İkizkenar, Eşkenar)', 
      'Dik Üçgen ve Trigonometrik Bağıntılar', 
      'Üçgende Açıortay ve Kenarortay Bağıntıları', 
      'Üçgende Eşlik ve Benzerlik Teoremleri', 
      'Üçgende Alan ve Açı-Kenar Bağıntıları', 
      'Çokgenler ve Düzgün Çokgenler', 
      'Dörtgenlerin Temel Özellikleri ve Alan', 
      'Yamuk (İkizkenar ve Dik Yamuk)', 
      'Paralelkenar ve Eşkenar Dörtgen', 
      'Dikdörtgen ve Kare', 
      'Deltoid', 
      'Çemberde Açılar ve Özellikleri', 
      'Çemberde Uzunluk ve Kiriş Bağıntıları', 
      'Dairede Çevre ve Alan', 
      'Katı Cisimler (Prizmalar, Küp, Silindir)', 
      'Katı Cisimler (Piramitler, Koni, Küre)', 
      'Noktanın ve Doğrunun Analitik İncelenmesi', 
      'Dönüşüm Geometrisi (Öteleme, Dönme, Yansıma)', 
      'Çemberin Analitik İncelenmesi'
    ] 
  },
  { 
    name: 'Türkçe', 
    topics: [
      'Sözcükte Anlam ve Söz Öbekleri', 
      'Cümlede Anlam ve İlişkiler', 
      'Paragrafta Anlam, Ana Düşünce ve Konu', 
      'Paragrafta Yapı, Akış ve Bölme', 
      'Paragrafta Yardımcı Düşünceler', 
      'Paragraf Taktikleri ve Anlatım Biçimleri', 
      'Ses Bilgisi (Ünlü ve Ünsüz Olayları)', 
      'Yazım (İmla) Kuralları', 
      'Noktalama İşaretleri', 
      'Sözcükte Yapı ve Ekler', 
      'Sözcük Türleri: İsim (Ad) ve Tamlamalar', 
      'Sözcük Türleri: Sıfat (Ön Ad) ve Zamir (Adıl)', 
      'Sözcük Türleri: Zarf (Belirteç)', 
      'Sözcük Türleri: Edat, Bağlaç ve Ünlem', 
      'Fiiller (Eylemler), Kip, Kişi ve Ek Fiil', 
      'Fiilde Çatı (Öznesine ve Nesnesine Göre)', 
      'Fiilimsiler (İsim-Fiil, Sıfat-Fiil, Zarf-Fiil)', 
      'Cümlenin Ögeleri', 
      'Cümle Türleri (Yapı, Anlam ve Yüklemine Göre)', 
      'Anlatım Bozuklukları'
    ] 
  },
  { 
    name: 'Türkçe & Edebiyat', 
    topics: [
      'Sözcükte Anlam ve Cümlede Anlam', 
      'Paragrafta Anlam, Yapı ve Taktikler', 
      'Ses Bilgisi, Yazım ve Noktalama Kuralları', 
      'Sözcükte Yapı ve Sözcük Türleri', 
      'Cümlenin Ögeleri ve Cümle Türleri', 
      'Şiir Bilgisi (Ahenk, Nazım Şekilleri, Kafiye-Redif)', 
      'Edebi Sanatlar (Teşbih, İstiare, Teşhis, Tenasüp vb.)', 
      'İslamiyet Öncesi ve Geçiş Dönemi Türk Edebiyatı', 
      'Halk Edebiyatı (Anonim, Âşık, Dinî-Tasavvufi)', 
      'Divan Edebiyatı Şiiri, Nazım Şekilleri ve Temsilcileri', 
      'Divan Nesri ve Eserleri', 
      'Edebi Akımlar (Klasisizm, Romantizm, Realizm vb.)', 
      'Tanzimat Dönemi Türk Edebiyatı (1. ve 2. Dönem)', 
      'Servetifünun ve Fecriati Edebiyatı', 
      'Millî Edebiyat Dönemi Roman, Hikâye ve Şiiri', 
      'Cumhuriyet Dönemi Şiir Toplulukları (Garip, İkinci Yeni, Toplumcu)', 
      'Cumhuriyet Dönemi Roman ve Hikâyesi (Toplumcu, Bireyci, Millî)', 
      'Cumhuriyet Dönemi Tiyatrosu ve Öğretici Metinler'
    ] 
  },
  { 
    name: 'Edebiyat', 
    topics: [
      'Giriş: Edebiyatın Tanımı ve Güzel Sanatlar', 
      'Şiir Bilgisi: Nazım Birimi, Ölçü, Kafiye, Redif', 
      'Edebi Sanatlar (Mecazlar, Anlam ve Söz Sanatları)', 
      'İslamiyet Öncesi Türk Edebiyatı (Destanlar, Koşuk, Sagu)', 
      'Geçiş Dönemi Eserleri (Kutadgu Bilig, DLT, Atabetü\'l-Hakayık)', 
      'Dede Korkut Hikâyeleri ve Halk Anlatıları', 
      'Halk Edebiyatı: Anonim, Âşık ve Tasavvuf Şiiri', 
      'Divan Edebiyatı: Nazım Şekilleri ve Türleri', 
      'Divan Edebiyatı Şairleri (Fuzulî, Bakî, Nedim, Şeyh Galip vd.)', 
      'Batı Edebiyatı Akımları', 
      'Tanzimat Edebiyatı: Roman, Şiir, Tiyatro', 
      'Servetifünun ve Fecriati Dönemi', 
      'Millî Edebiyat Akımı ve Genç Kalemler', 
      'Cumhuriyet Dönemi Türk Şiiri (Saf Şiir, Yedi Meşaleciler, Garip, II. Yeni)', 
      'Cumhuriyet Dönemi Roman ve Hikâyesi', 
      'Cumhuriyet Dönemi Tiyatro ve Öğretici Metinleri'
    ] 
  },
  { 
    name: 'Fizik', 
    topics: [
      'Fizik Bilimine Giriş ve Vektörler', 
      'Madde ve Özellikleri (Özkütle, Adezyon-Kohezyon, Yüzey Gerilimi)', 
      'Sıvıların Kaldırma Kuvveti', 
      'Basınç (Katı, Sıvı ve Gaz Basıncı, Akışkanlar)', 
      'Isı, Sıcaklık, Isıl Denge ve Genleşme', 
      'Doğrusal Hareket (Sabit Hızlı ve İvmeli Hareket)', 
      'Newton\'un Hareket Yasaları ve Sürtünme Kuvveti', 
      'İş, Güç, Enerji ve Mekanik Enerji Korunumu', 
      'Elektrostatik ve Coulomb Yasası', 
      'Elektrik Akımı, Devreler, Eşdeğer Direnç ve Ohm Yasası', 
      'Elektriksel Güç ve Enerji', 
      'Mıknatıslar ve Manyetik Alan', 
      'Optik: Aydınlanma, Gölge, Aynalar, Kırılma ve Mercekler', 
      'Dalgalar (Yay, Su, Ses ve Deprem Dalgaları)', 
      'İki Boyutta Hareket (Atışlar)', 
      'İtme ve Çizgisel Momentum Korunumu', 
      'Tork, Denge ve Kütle Merkezi', 
      'Basit Makineler', 
      'Elektriksel Potansiyel, Potansiyel Enerji ve Sığaçlar', 
      'Manyetizma ve Elektromanyetik İndüksiyon', 
      'Alternatif Akım ve Transformatörler', 
      'Düzgün Çembersel Hareket ve Açısal Momentum', 
      'Kütle Çekim ve Kepler Yasaları', 
      'Basit Harmonik Hareket', 
      'Dalga Mekaniği (Girişim, Kırınım, Doppler Olayı)', 
      'Atom Fiziği, Modeller ve Radyoaktivite', 
      'Özel Görelilik ve Kuantum Fiziğine Giriş', 
      'Fotoelektrik Olayı ve Compton Saçılması', 
      'Modern Fiziğin Teknolojideki Uygulamaları'
    ] 
  },
  { 
    name: 'Kimya', 
    topics: [
      'Kimya Bilimi ve Laboratuvarda Güvenlik', 
      'Atom Modelleri, Atom Yapısı ve Periyodik Sistem', 
      'Kimyasal Türler Arası Güçlü ve Zayıf Etkileşimler', 
      'Maddenin Halleri: Katılar, Sıvılar, Gazlar', 
      'Doğa ve Kimya / Çevre Kimyası', 
      'Kimyanın Temel Kanunları ve Mol Kavramı', 
      'Kimyasal Tepkimeler ve Hesaplamalar', 
      'Karışımlar, Derişim Birimleri ve Koligatif Özellikler', 
      'Ayırma ve Saflaştırma Teknikleri', 
      'Asitler, Bazlar, Tuzlar ve pH Kavramı', 
      'Hayatımızda Kimya', 
      'Modern Atom Teorisi ve Kuantum Sayıları', 
      'Gazlar (İdeal Gaz Yasası, Kinetik Teori, Gaz Karışımları)', 
      'Sıvı Çözeltiler, Molarite ve Çözünürlük Dengesi', 
      'Kimyasal Tepkimelerde Enerji ve Hess Yasası', 
      'Kimyasal Tepkimelerde Hız ve Çarpışma Teorisi', 
      'Kimyasal Denge ve Le Chatelier İlkesi', 
      'Sulu Çözelti Dengeleri (Asit-Baz, Titrasyon, Kçç)', 
      'Kimya ve Elektrik (Redoks, Aktiflik, Galvanik Piller, Elektroliz)', 
      'Karbon Kimyasına Giriş, Hibritleşme ve Molekül Geometrisi', 
      'Organik Bileşikler: Alkanlar, Alkenler, Alkinler, Aromatikler', 
      'Fonksiyonel Gruplar: Alkoller ve Eterler', 
      'Karbonil Bileşikleri: Aldehitler ve Ketonlar', 
      'Karboksilik Asitler ve Esterler', 
      'Enerji Kaynakları ve Sürdürülebilirlik'
    ] 
  },
  { 
    name: 'Biyoloji', 
    topics: [
      'Canlıların Ortak Özellikleri ve Temel Bileşenler', 
      'İnorganik ve Organik Bileşikler, Enzimler, ATP', 
      'Hücre Yapısı, Organeller ve Hücre Zarından Madde Geçişleri', 
      'Canlılar Dünyası ve Biyolojik Sınıflandırma', 
      'Hücre Bölünmeleri (Mitoz ve Mayoz Bölünme)', 
      'Kalıtım İlkeleri, Çaprazlamalar ve Soyağaçları', 
      'Ekosistem Ekolojisi ve Güncel Çevre Sorunları', 
      'İnsan Fizyolojisi: Sinir Sistemi ve Endokrin Sistem', 
      'Duyu Organları', 
      'Destek ve Hareket Sistemi (Kemik, Kıkırdak, Kas)', 
      'Sindirim Sistemi', 
      'Dolaşım ve Bağışıklık Sistemi', 
      'Solunum Sistemi', 
      'Boşaltım (Üriner) Sistemi', 
      'Üreme Sistemi ve Embriyonik Gelişim', 
      'Komünite ve Popülasyon Ekolojisi', 
      'Nükleik Asitler, DNA Replikasyonu ve Protein Sentezi', 
      'Biyoteknoloji ve Gen Mühendisliği', 
      'Canlılarda Enerji Dönüşümleri (Fotosentez, Kemosentez, Solunum)', 
      'Bitki Biyolojisi (Dokular, Organlar, Taşıma, Büyüme ve Üreme)', 
      'Canlılar ve Çevre (Adaptasyon ve Evrimsel Bakış)'
    ] 
  },
  { 
    name: 'Tarih', 
    topics: [
      'Tarih ve Zaman, Tarih Yazıcılığı', 
      'İnsanlığın İlk Dönemleri ve Medeniyet Havzaları', 
      'Orta Çağ’da Dünya ve Hukuk Sistemleri', 
      'İlk ve Orta Çağlarda Türk Dünyası (Kültür, Teşkilat, Ordu)', 
      'İslam Medeniyetinin Doğuşu ve Dört Halife Dönemi', 
      'İlk Müslüman Türk Devletleri (Karahanlılar, Gazneliler, Selçuklular)', 
      'Türkiye Tarihi: Anadolu Selçukluları ve Beylikler', 
      'Beylikten Devlete Osmanlı Siyaseti (1300-1453)', 
      'Devletleşme Sürecinde Osmanlı Askerî ve Sosyal Teşkilatı', 
      'Dünya Gücü Osmanlı Devleti (1453-1595) ve İstanbul\'un Fethi', 
      'Osmanlı Merkez ve Taşra Teşkilatı, Divan-ı Hümayun', 
      'Değişen Dünya Dengeleri Karşısında Osmanlı (1595-1774)', 
      'Uluslararası İlişkilerde Denge Stratejisi (1774-1914)', 
      'Tanzimat, Islahat ve Meşrutiyet Dönemleri', 
      '20. Yüzyıl Başlarında Osmanlı (Trablusgarp, Balkan Savaşları)', 
      'I. Dünya Savaşı ve Mondros Ateşkes Antlaşması', 
      'Millî Mücadele Hazırlık Dönemi (Genelgeler ve Kongreler)', 
      'I. TBMM Dönemi, Sevr ve İsyanlar', 
      'Millî Mücadele Muharebeler Dönemi ve Antlaşmalar', 
      'Atatürkçülük ve Türk İnkılabı', 
      'Atatürk Dönemi Türk Dış Politikası (1923-1938)', 
      'İki Savaş Arası Dönem, II. Dünya Savaşı ve Sonrası', 
      'Soğuk Savaş, Yumuşama ve Küreselleşen Dünya'
    ] 
  },
  { 
    name: 'Coğrafya', 
    topics: [
      'Doğa ve İnsan Etkileşimi', 
      'Coğrafi Konum, Paralel-Meridyen ve Yerel Saat Hesaplamaları', 
      'Harita Bilgisi, Ölçekler ve İzohipsler', 
      'Dünya\'nın Şekli ve Hareketleri', 
      'Atmosfer, Sıcaklık ve Basınç Kuşakları', 
      'Rüzgârlar, Nemlilik ve Yağış Tipleri', 
      'Büyük İklim Tipleri ve Türkiye\'nin İklimi', 
      'İç Kuvvetler (Orojenez, Epirojenez, Volkanizma, Depremler)', 
      'Dış Kuvvetler (Akarsular, Karstik, Rüzgârlar, Buzullar, Dalgalar)', 
      'Türkiye\'nin Yer Şekilleri (Dağ, Ova, Plato)', 
      'Su Kaynakları (Okyanuslar, Göller, Akarsular ve Türkiye Suları)', 
      'Toprak Tipleri ve Bitki Toplulukları', 
      'Nüfusun Gelişimi, Dağılışı ve Nüfus Piramitleri', 
      'Göç Hareketleri ve Yerleşme Coğrafyası', 
      'Ekonomik Faaliyetler ve Doğal Afetler', 
      'Biyoçeşitlilik, Biyomlar ve Ekosistemler (AYT)', 
      'Şehirlerin Fonksiyonları ve Etki Alanları (AYT)', 
      'Türkiye\'de Tarım, Hayvancılık, Madenler ve Enerji (AYT)', 
      'Türkiye\'de Sanayi, Ulaşım, Ticaret ve Turizm (AYT)', 
      'Bölgesel Kalkınma Projeleri (GAP, DOKAP, DAP, KOP)', 
      'Küresel ve Bölgesel Örgütler (BM, NATO, AB vb.)', 
      'Çevre Sorunları ve Küresel İklim Değişimi'
    ] 
  },
  { 
    name: 'Felsefe Grubu & Din', 
    topics: [
      'Felsefenin Anlamı, Doğuşu ve Düşünme Becerileri', 
      'Varlık Felsefesi (Ontoloji)', 
      'Bilgi Felsefesi (Epistemoloji)', 
      'Ahlak Felsefesi (Etik)', 
      'Din Felsefesi ve Tanrı Kanıtlamaları', 
      'Siyaset ve Sanat Felsefesi (Estetik)', 
      'İlk Çağ, Orta Çağ ve Aydınlanma Felsefesi', 
      '20. Yüzyıl Çağdaş Felsefesi', 
      'AYT Psikoloji: Ekoller, Gelişim, Öğrenme ve Bellek', 
      'AYT Sosyoloji: Toplumsal Yapı, Kurumlar ve Değişme', 
      'AYT Mantık: Klasik Mantık, Önermeler ve Kıyas', 
      'İnanç Esasları ve İslam’da Bilgi Kaynakları', 
      'İbadetler (Namaz, Oruç, Zekat, Hac)', 
      'Hz. Muhammed\'in Hayatı ve Örnekliği', 
      'İslam Düşüncesinde Mezhepler ve Yorumlar', 
      'Yaşayan Dünya Dinleri'
    ] 
  },
  { 
    name: 'İngilizce (YDT)', 
    topics: [
      'Academic Vocabulary & Collocations', 
      'Phrasal Verbs & Idioms', 
      'Tenses & Time Clauses', 
      'Modals & Semi-Modals', 
      'Passive Voice & Causatives', 
      'Conditionals & Wish Clauses', 
      'Relative Clauses (Adjective Clauses)', 
      'Noun Clauses & Reported Speech', 
      'Conjunctions & Prepositional Phrases', 
      'Gerunds & Infinitives', 
      'Sentence Completion Techniques', 
      'Cloze Test Mastery', 
      'Reading Comprehension & In-depth Passage Analysis', 
      'Dialogue Completion & Restatement', 
      'Finding the Irrelevant Sentence'
    ] 
  }
];

export function getSubjectsForGrade(grade: string = ''): Subject[] {
  const g = grade.toLowerCase();
  if (g.includes('8')) {
    return SUBJECTS_8;
  }
  if (g.includes('9')) {
    return SUBJECTS_9_MAARIF;
  }
  if (g.includes('10')) {
    return SUBJECTS_10_MAARIF;
  }
  // 11, 12 or others default to High School YKS curriculum
  return SUBJECTS_11_12;
}

export function getGradeCategory(grade: string = ''): '8' | '9' | '10' | 'yks' {
  const g = grade.toLowerCase();
  if (g.includes('8')) return '8';
  if (g.includes('9')) return '9';
  if (g.includes('10')) return '10';
  return 'yks';
}

// Exam Countdown Calculations
export function calculateLgsCountdown(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let examYear = now.getFullYear();
  let examDate = new Date(examYear, 5, 7); // ~June 7
  if (today > examDate) {
    examDate = new Date(examYear + 1, 5, 7);
  }
  const diff = examDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculateYksCountdown(): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let examYear = now.getFullYear();
  let examDate = new Date(examYear, 5, 20); // ~June 20
  if (today > examDate) {
    examDate = new Date(examYear + 1, 5, 20);
  }
  const diff = examDate.getTime() - today.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function calculateMaarifExamCountdown(): { days: number; title: string; subtitle: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const year = now.getFullYear();

  // MEB Maarif Modeli Ortak Yazılı Sınav Tarihleri:
  // 1. Dönem 1. Ortak: ~4 Kasım (Nov 4)
  // 1. Dönem 2. Ortak: ~30 Aralık (Dec 30)
  // 2. Dönem 1. Ortak: ~28 Mart (Mar 28)
  // 2. Dönem 2. Ortak: ~28 Mayıs (May 28)
  const milestones = [
    { name: '1. Dönem 1. Ortak Yazılı Sınavı', date: new Date(year, 10, 4) },
    { name: '1. Dönem 2. Ortak Yazılı Sınavı', date: new Date(year, 11, 30) },
    { name: '2. Dönem 1. Ortak Yazılı Sınavı', date: new Date(year, 2, 28) },
    { name: '2. Dönem 2. Ortak Yazılı Sınavı', date: new Date(year, 4, 28) },
    { name: '1. Dönem 1. Ortak Yazılı Sınavı', date: new Date(year + 1, 10, 4) },
  ];

  const nextMilestone = milestones.find(m => m.date >= today) || milestones[milestones.length - 1];
  const diff = nextMilestone.date.getTime() - today.getTime();
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

  return {
    days,
    title: 'MEB Ortak Sınav Sayacı',
    subtitle: `Maarif Modeli ${nextMilestone.name}`
  };
}

export interface GradeExamCountdown {
  days: number;
  label: string;
  shortLabel: string;
  subtitle: string;
  category: 'lgs' | 'yks' | 'maarif_9' | 'maarif_10' | 'ortaokul';
  examType: 'LGS' | 'YKS' | 'MAARIF' | 'ORTAOKUL';
  themeColor: 'primary' | 'secondary' | 'amber' | 'emerald';
}

export function getExamCountdownForGrade(grade: string): GradeExamCountdown {
  const g = (grade || '').toLowerCase().trim();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentYear = now.getFullYear();

  // 1) 8. Sınıf / LGS Hazırlık (Sadece 8. sınıf LGS sayacı görür!)
  if (g.includes('8') || g.includes('lgs')) {
    let examDate = new Date(currentYear, 5, 6); // 6 Haziran LGS
    if (today > examDate) examDate = new Date(currentYear + 1, 5, 6);
    const days = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      days,
      label: 'LGS Sınav Sayacı',
      shortLabel: 'LGS',
      subtitle: 'Hedef: 8. Sınıf LGS Sınavı (6 Haziran)',
      category: 'lgs',
      examType: 'LGS',
      themeColor: 'primary'
    };
  }

  // 2) 10. Sınıf Maarif Modeli (LGS ASLA gösterilmez, 10. sınıf MEB Ortak Sınav Sayacı)
  if (g.includes('10')) {
    const maarif = calculateMaarifExamCountdown();
    return {
      days: maarif.days,
      label: '10. Sınıf Maarif Modeli Ortak Sınav Sayacı',
      shortLabel: '10. Sınıf Maarif',
      subtitle: `Hedef: 10. Sınıf ${maarif.subtitle}`,
      category: 'maarif_10',
      examType: 'MAARIF',
      themeColor: 'amber'
    };
  }

  // 3) 9. Sınıf Maarif Modeli (9. sınıf MEB Ortak Sınav Sayacı)
  if (g.includes('9')) {
    const maarif = calculateMaarifExamCountdown();
    return {
      days: maarif.days,
      label: '9. Sınıf Maarif Modeli Ortak Sınav Sayacı',
      shortLabel: '9. Sınıf Maarif',
      subtitle: `Hedef: 9. Sınıf ${maarif.subtitle}`,
      category: 'maarif_9',
      examType: 'MAARIF',
      themeColor: 'amber'
    };
  }

  // 4) 11. Sınıf, 12. Sınıf, Mezun / YKS
  if (g.includes('11') || g.includes('12') || g.includes('yks') || g.includes('mezun')) {
    let examDate = new Date(currentYear, 5, 19); // 19 Haziran YKS
    if (today > examDate) examDate = new Date(currentYear + 1, 5, 19);
    const days = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
    const is11 = g.includes('11');
    return {
      days,
      label: is11 ? '11. Sınıf YKS / TYT Hazırlık Sayacı' : 'YKS (TYT-AYT) Sınav Sayacı',
      shortLabel: is11 ? '11. Sınıf YKS' : 'YKS',
      subtitle: is11 ? 'Hedef: YKS 2027 Temel Yeterlilik Testi' : 'Hedef: Yükseköğretim Kurumları Sınavı (19 Haziran)',
      category: 'yks',
      examType: 'YKS',
      themeColor: 'secondary'
    };
  }

  // 5) 5, 6, 7. Sınıflar (Ortaokul MEB Ortak Yazılı Sınavı)
  if (g.includes('5') || g.includes('6') || g.includes('7')) {
    const maarif = calculateMaarifExamCountdown();
    const gradeNum = g.includes('5') ? '5' : g.includes('6') ? '6' : '7';
    return {
      days: maarif.days,
      label: `${gradeNum}. Sınıf MEB Ortak Sınav Sayacı`,
      shortLabel: `${gradeNum}. Sınıf MEB`,
      subtitle: `Hedef: ${gradeNum}. Sınıf Dönem Ortak Yazılı Sınavları`,
      category: 'ortaokul',
      examType: 'ORTAOKUL',
      themeColor: 'primary'
    };
  }

  // Genel / Tanımsız Sınıf Durumu
  let examDate = new Date(currentYear, 5, 19);
  if (today > examDate) examDate = new Date(currentYear + 1, 5, 19);
  const days = Math.max(0, Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
  return {
    days,
    label: 'Akademik Sınav Sayacı',
    shortLabel: 'Sınav',
    subtitle: 'Hedef: Akademik Başarı Sınavı',
    category: 'yks',
    examType: 'YKS',
    themeColor: 'primary'
  };
}
