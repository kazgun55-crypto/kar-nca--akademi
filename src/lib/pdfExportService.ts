// PDF Export Service for Student Development & Parent Reports
// Generates a clean, simple, and professional A4 pedagogical report for parents and teachers

export function exportAiAnalysisToPdf(analysis: any, studentName: string = 'Öğrenci', grade: string = 'Belirtilmemiş') {
  if (!analysis) {
    console.warn('exportAiAnalysisToPdf: Boş analiz verisi.');
    return;
  }

  const printDate = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const stats = analysis.weeklyPerformanceStats || {};
  const trial = analysis.trialAnalysis || {};
  const weekly = analysis.weeklyProgramAnalysis || {};
  const under80 = Array.isArray(analysis.under80Topics) ? analysis.under80Topics : [];
  const pedagogyNotes = Array.isArray(analysis.teacherPedagogyNotes) ? analysis.teacherPedagogyNotes : [];
  const subjects = Array.isArray(analysis.subjects) ? analysis.subjects : [];

  const assignedQ = stats.assignedQuestions || weekly.assignedQuestions || 0;
  const solvedQ = stats.solvedQuestions || weekly.solvedQuestions || 0;
  const correctQ = stats.totalCorrect ?? weekly.totalCorrect ?? 0;
  const incorrectQ = stats.totalIncorrect ?? weekly.totalIncorrect ?? 0;
  const emptyQ = stats.totalEmpty ?? weekly.totalEmpty ?? 0;
  const successRate = stats.successRate ?? weekly.successRate ?? 0;
  const completionRate = stats.completionRate ?? weekly.completionRate ?? 0;
  const latestTrialNet = stats.latestTrialNet ?? trial.latestTrialNet ?? 0;
  const highestTrialNet = stats.highestTrialNet ?? trial.highestTrialNet ?? latestTrialNet;
  const avgTrialNet = trial.averageTrialNet ?? latestTrialNet;
  const trialCount = stats.trialCount ?? trial.trialCount ?? 0;

  const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Öğrenci Gelişim & Veli Bilgilendirme Raporu - ${studentName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.4;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 10px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 9999;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    .btn {
      background: #2563eb;
      color: #ffffff;
      border: none;
      padding: 7px 16px;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn:hover { background: #1d4ed8; }
    .btn-secondary { background: #334155; }
    .btn-secondary:hover { background: #475569; }
    @media print {
      .no-print-bar { display: none !important; }
      body { background: #ffffff !important; }
    }
    .report-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 14px 18px;
    }
    .header {
      border-bottom: 2px solid #0284c7;
      padding-bottom: 10px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .logo-title {
      font-size: 16pt;
      font-weight: 900;
      color: #0369a1;
      margin: 0;
      letter-spacing: -0.3px;
    }
    .sub-title {
      font-size: 9.5pt;
      font-weight: 600;
      color: #475569;
      margin: 2px 0 0 0;
    }
    .meta-box {
      text-align: right;
      font-size: 8.5pt;
      color: #64748b;
    }
    .meta-box strong { color: #0f172a; }

    /* 4 Essential Summary Cards */
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }
    .summary-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px;
      text-align: center;
    }
    .summary-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.3px;
      margin-bottom: 2px;
    }
    .summary-val {
      font-size: 12pt;
      font-weight: 900;
      color: #0f172a;
    }
    .val-primary { color: #0284c7; }
    .val-success { color: #16a34a; }
    .val-warning { color: #ea580c; }

    /* Clean Section Blocks */
    .section {
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 6px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 3px solid #0284c7;
      padding-left: 7px;
    }
    .summary-text-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 9pt;
      line-height: 1.45;
      color: #14532d;
    }

    /* 2 Columns Layout for Program & Trials */
    .two-col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .box-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
    }
    .box-card h4 {
      margin: 0 0 6px 0;
      font-size: 9pt;
      font-weight: 800;
      color: #334155;
    }
    .stat-line {
      display: flex;
      justify-content: space-between;
      font-size: 8.5pt;
      padding: 3px 0;
      border-bottom: 1px dashed #f1f5f9;
    }
    .stat-line:last-child { border-bottom: none; }
    .stat-line span:first-child { color: #64748b; }
    .stat-line span:last-child { font-weight: 700; color: #0f172a; }

    /* Critical & Deficiency Box */
    .rule80-box {
      border-radius: 8px;
      padding: 9px 12px;
      font-size: 8.5pt;
      line-height: 1.4;
    }
    .rule80-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #15803d;
    }
    .rule80-alert {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      color: #9a3412;
    }
    .topic-badge {
      display: inline-block;
      background: #fee2e2;
      color: #991b1b;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      margin: 2px 4px 2px 0;
      font-size: 8pt;
    }

    /* Pedagogical / Teacher Notes */
    .notes-list {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 8px 12px 8px 24px;
      margin: 0;
      font-size: 8.5pt;
      color: #334155;
      line-height: 1.45;
    }
    .notes-list li { margin-bottom: 3px; }

    /* Signature Footer */
    .sig-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px dashed #cbd5e1;
      font-size: 8pt;
    }
    .sig-line {
      border-bottom: 1px solid #94a3b8;
      width: 75%;
      margin: 22px 0 4px 0;
    }
    .footer-note {
      text-align: center;
      font-size: 7.5pt;
      color: #94a3b8;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Scholar Pulse</strong> • Öğrenci Gelişim & Veli Bilgilendirme Raporu (${studentName})
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">
        🖨️ PDF İndir / Yazdır
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        Kapat
      </button>
    </div>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="logo-title">Scholar Pulse Danışmanlık</h1>
        <p class="sub-title">Öğrenci Gelişim & Veli Bilgilendirme Raporu</p>
      </div>
      <div class="meta-box">
        <div><strong>Öğrenci:</strong> ${studentName} (${grade})</div>
        <div><strong>Tarih:</strong> ${printDate}</div>
        <div><strong>Format:</strong> Resmi Veli Paylaşım Özeti</div>
      </div>
    </div>

    <!-- 4 Essential Metrics -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-label">Program Tamamlama</div>
        <div class="summary-val val-primary">%${completionRate}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Soru Doğruluğu</div>
        <div class="summary-val ${successRate >= 80 ? 'val-success' : 'val-warning'}">%${successRate}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">Son Deneme Neti</div>
        <div class="summary-val">${latestTrialNet > 0 ? `${latestTrialNet} Net` : 'Kayıt Bekleniyor'}</div>
      </div>
      <div class="summary-card">
        <div class="summary-label">%80 Eşik Durumu</div>
        <div class="summary-val ${under80.length === 0 ? 'val-success' : 'val-warning'}">
          ${under80.length === 0 ? 'Hedefe Uygun ✨' : `${under80.length} Odak Alanı`}
        </div>
      </div>
    </div>

    <!-- 1. Veli Genel Değerlendirme Özeti -->
    <div class="section">
      <h3 class="section-title">📋 Genel Akademik Değerlendirme & Veli Özeti</h3>
      <div class="summary-text-box">
        ${analysis.summary || 'Öğrencinin haftalık çalışma programı ve deneme sınavları verileri doğrultusunda akademik gelişimi yakından takip edilmektedir.'}
      </div>
    </div>

    <!-- 2. Haftalık Çalışma Programı & Deneme Sınavları -->
    <div class="section">
      <div class="two-col">
        <!-- Haftalık Program -->
        <div class="box-card">
          <h4>📝 Haftalık Program & Soru Çözümü</h4>
          <div class="stat-line">
            <span>Atanan Soru Hedefi:</span>
            <span>${assignedQ} Soru</span>
          </div>
          <div class="stat-line">
            <span>Çözülen Soru Sayısı:</span>
            <span>${solvedQ} Soru</span>
          </div>
          <div class="stat-line">
            <span>Doğru / Yanlış / Boş:</span>
            <span>${correctQ} D / ${incorrectQ} Y / ${emptyQ} B</span>
          </div>
          <div class="stat-line">
            <span>Genel Soru Başarısı:</span>
            <span style="color: ${successRate >= 80 ? '#16a34a' : '#ea580c'}; font-weight: 800;">%${successRate}</span>
          </div>
          <p style="margin: 6px 0 0 0; font-size: 8pt; color: #64748b; line-height: 1.35;">
            ${weekly.summary || 'Öğrencinin ödev tamamlama ve soru çözme istikrarı düzenli olarak değerlendirilmektedir.'}
          </p>
        </div>

        <!-- Deneme Sınavları -->
        <div class="box-card">
          <h4>🎯 Deneme Sınavı Performansı</h4>
          <div class="stat-line">
            <span>Kayıtlı Deneme Sayısı:</span>
            <span>${trialCount} Adet</span>
          </div>
          <div class="stat-line">
            <span>Son Deneme Neti:</span>
            <span style="font-weight: 800; color: #0284c7;">${latestTrialNet > 0 ? `${latestTrialNet} Net` : '-'}</span>
          </div>
          <div class="stat-line">
            <span>En Yüksek Net:</span>
            <span>${highestTrialNet > 0 ? `${highestTrialNet} Net` : '-'}</span>
          </div>
          <div class="stat-line">
            <span>Genel Ortalama:</span>
            <span>${avgTrialNet > 0 ? `${avgTrialNet} Net` : '-'}</span>
          </div>
          <p style="margin: 6px 0 0 0; font-size: 8pt; color: #64748b; line-height: 1.35;">
            ${trial.summary || 'Deneme sınavı netleri ve zaman yönetimi takip edilmektedir.'}
          </p>
        </div>
      </div>
    </div>

    <!-- 3. %80 Başarı Kuralına Göre Odaklanılacak Konular -->
    <div class="section">
      <h3 class="section-title">⚖️ %80 Başarı Kuralına Göre Konu Analizi</h3>
      ${under80.length === 0 ? `
        <div class="rule80-box rule80-success">
          ✨ <strong>Tebrikler:</strong> Öğrencinin çalıştığı tüm ders ve konularda başarı oranı hedeflenen %80 eşiğini aşmıştır. Şu an için acil telafi gerektiren bir konu bulunmamaktadır.
        </div>
      ` : `
        <div class="rule80-box rule80-alert">
          <p style="margin: 0 0 5px 0;"><strong>⚠️ Desteklenmesi Gereken Konular (%80 Altı):</strong> Aşağıdaki konularda başarı oranı %80 eşiğinin altında kalmıştır. Telafi soru çözümleri planlanmıştır:</p>
          <div>
            ${under80.map((u: any) => `
              <span class="topic-badge">${u.subject} - ${u.topic} (%${u.accuracy ?? 0} Başarı, ${u.incorrect ?? 0} Yanlış)</span>
            `).join('')}
          </div>
          <p style="margin: 5px 0 0 0; font-size: 8pt; color: #7c2d12;">
            ${analysis.errorAnalysis || 'Bu konuların yanlış soru videoları izlenmeli ve ek soru bankasından pekiştirme yapılmalıdır.'}
          </p>
        </div>
      `}
    </div>

    <!-- 4. Çalışılan Ders Dağılımı (Sadece Verilen Dersler Varsa) -->
    ${subjects.length > 0 ? `
    <div class="section">
      <h3 class="section-title">📚 Çalışılan Dersler Yetkinlik Özeti</h3>
      <div style="display: grid; grid-template-columns: repeat(${Math.min(subjects.length, 4)}, 1fr); gap: 6px;">
        ${subjects.map((s: any) => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 8px; text-align: center;">
            <div style="font-size: 7.5pt; font-weight: 700; color: #64748b;">${s.name}</div>
            <div style="font-size: 10pt; font-weight: 900; color: ${s.accuracy >= 80 ? '#16a34a' : '#ea580c'};">%${s.accuracy}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ` : ''}

    <!-- 5. Danışman & Veli Rehberlik Notları -->
    ${pedagogyNotes.length > 0 ? `
    <div class="section">
      <h3 class="section-title">💡 Danışman Öğretmen & Aile Rehberlik Notları</h3>
      <ul class="notes-list">
        ${pedagogyNotes.slice(0, 3).map((note: string) => `<li>${note}</li>`).join('')}
      </ul>
    </div>
    ` : ''}

    <!-- İmza Alanı -->
    <div class="sig-grid">
      <div>
        <span style="font-weight: 700; color: #334155;">Danışman / Rehber Öğretmen:</span>
        <div class="sig-line"></div>
        <span style="color: #94a3b8;">İmza & Tarih</span>
      </div>
      <div>
        <span style="font-weight: 700; color: #334155;">Öğrenci Velisi İnceleme Onayı:</span>
        <div class="sig-line"></div>
        <span style="color: #94a3b8;">Veli İmzası & Tarih</span>
      </div>
    </div>

    <div class="footer-note">
      Scholar Pulse Akademik Takip ve Koçluk Sistemi • Veli Bilgilendirme Raporu
    </div>
  </div>

  <script>
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;

  // Try opening printable window
  let printWindow: Window | null = null;
  try {
    printWindow = window.open('', '_blank');
  } catch (e) {
    printWindow = null;
  }

  if (printWindow && !printWindow.closed) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    return;
  }

  // Fallback: Invisible iframe printing if popup blocked
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn('Iframe print fallback triggered:', err);
      }
      setTimeout(() => {
        try {
          document.body.removeChild(iframe);
        } catch {}
      }, 5000);
    }, 400);
  }
}
