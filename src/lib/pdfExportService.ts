// PDF Export Service for AI Analysis Reports
// Formats and generates a professional, high-resolution A4 pedagogical report for students & teachers

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
  const weeklyRecs = Array.isArray(analysis.weeklyPlanRecommendations) ? analysis.weeklyPlanRecommendations : [];
  const subjects = Array.isArray(analysis.subjects) ? analysis.subjects : [];

  const assignedQ = stats.assignedQuestions || weekly.solvedQuestions || 0;
  const solvedQ = stats.solvedQuestions || weekly.solvedQuestions || 0;
  const correctQ = stats.totalCorrect ?? weekly.totalCorrect ?? 0;
  const incorrectQ = stats.totalIncorrect ?? weekly.totalIncorrect ?? 0;
  const emptyQ = stats.totalEmpty ?? weekly.totalEmpty ?? 0;
  const successRate = stats.successRate ?? weekly.successRate ?? 0;
  const latestTrialNet = stats.latestTrialNet ?? trial.latestTrialNet ?? 0;

  const htmlContent = `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Scholar Pulse - ${studentName} - Pedagojik AI Gelişim Raporu</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
      font-size: 10.5pt;
      line-height: 1.45;
    }
    .no-print-bar {
      background: #0f172a;
      color: #ffffff;
      padding: 12px 20px;
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
      padding: 8px 18px;
      font-size: 13px;
      font-weight: 700;
      border-radius: 8px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.15s;
    }
    .btn:hover {
      background: #1d4ed8;
    }
    .btn-secondary {
      background: #334155;
    }
    .btn-secondary:hover {
      background: #475569;
    }
    @media print {
      .no-print-bar {
        display: none !important;
      }
      body {
        background: #ffffff !important;
      }
    }
    .report-container {
      max-width: 820px;
      margin: 0 auto;
      padding: 20px 24px;
    }
    .header {
      border-bottom: 2px solid #2563eb;
      padding-bottom: 14px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo-title {
      font-size: 20pt;
      font-weight: 900;
      color: #1e3a8a;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .sub-title {
      font-size: 10pt;
      font-weight: 600;
      color: #64748b;
      margin: 3px 0 0 0;
    }
    .meta-box {
      text-align: right;
      font-size: 9pt;
      color: #475569;
    }
    .meta-box strong {
      color: #0f172a;
    }
    .student-badge-grid {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 16px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }
    .student-badge-item {
      display: flex;
      flex-direction: column;
    }
    .badge-label {
      font-size: 7.5pt;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .badge-value {
      font-weight: 800;
      color: #0f172a;
      font-size: 11pt;
    }
    .section {
      margin-bottom: 16px;
      page-break-inside: avoid;
    }
    .section-title {
      font-size: 11.5pt;
      font-weight: 800;
      color: #0f172a;
      margin: 0 0 8px 0;
      display: flex;
      align-items: center;
      gap: 6px;
      border-left: 4px solid #2563eb;
      padding-left: 8px;
    }
    .summary-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 12px 14px;
      font-size: 9.5pt;
      color: #14532d;
      line-height: 1.5;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 12px 14px;
    }
    .card-title {
      font-size: 10pt;
      font-weight: 800;
      margin: 0 0 6px 0;
      color: #1e293b;
    }
    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 3.5px 0;
      border-bottom: 1px dashed #f1f5f9;
      font-size: 9pt;
    }
    .stat-row:last-child {
      border-bottom: none;
    }
    .stat-label {
      color: #64748b;
    }
    .stat-val {
      font-weight: 700;
      color: #0f172a;
    }
    .danger-tag {
      color: #be123c;
      font-weight: 800;
    }
    .success-tag {
      color: #15803d;
      font-weight: 800;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
      font-size: 8.5pt;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      text-align: left;
    }
    th {
      background: #f1f5f9;
      font-weight: 800;
      color: #334155;
    }
    .weak-item {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      border-radius: 8px;
      padding: 9px 12px;
      margin-bottom: 7px;
      page-break-inside: avoid;
    }
    .weak-header {
      display: flex;
      justify-content: space-between;
      font-weight: 800;
      color: #9f1239;
      margin-bottom: 3px;
      font-size: 9.5pt;
    }
    .weak-desc {
      font-size: 8.5pt;
      color: #475569;
      margin: 0 0 3px 0;
    }
    .weak-rec {
      font-size: 8.5pt;
      font-weight: 700;
      color: #0369a1;
      background: #f0f9ff;
      border-radius: 6px;
      padding: 5px 8px;
    }
    .list-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 14px;
    }
    .list-box li {
      margin-bottom: 4px;
      font-size: 9pt;
      color: #334155;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #e2e8f0;
      padding-top: 10px;
      display: flex;
      justify-content: space-between;
      font-size: 8pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div>
      <strong>Scholar Pulse</strong> • Pedagojik AI Gelişim Raporu (${studentName})
    </div>
    <div style="display: flex; gap: 8px;">
      <button class="btn" onclick="window.print()">
        🖨️ PDF Olarak Kaydet / Yazdır
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
        <h1 class="logo-title">Scholar Pulse</h1>
        <p class="sub-title">Yapay Zeka Destekli Pedagojik Gelişim & Performans Raporu</p>
      </div>
      <div class="meta-box">
        <div><strong>Tarih:</strong> ${printDate}</div>
        <div><strong>Rapor Türü:</strong> Bireysel Gelişim Analizi</div>
        <div><strong>Durum:</strong> Onaylandı & Güncel</div>
      </div>
    </div>

    <!-- Student Info Bar -->
    <div class="student-badge-grid">
      <div class="student-badge-item">
        <span class="badge-label">Öğrenci Adı</span>
        <span class="badge-value">${studentName}</span>
      </div>
      <div class="student-badge-item">
        <span class="badge-label">Sınıf Seviyesi</span>
        <span class="badge-value">${grade}</span>
      </div>
      <div class="student-badge-item">
        <span class="badge-label">Haftalık Soru Başarısı</span>
        <span class="badge-value success-tag">%${successRate}</span>
      </div>
      <div class="student-badge-item">
        <span class="badge-label">Son Deneme Neti</span>
        <span class="badge-value">${latestTrialNet} Net</span>
      </div>
    </div>

    <!-- Performance Numbers Bar -->
    <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 16px; background: #f1f5f9; padding: 8px 12px; border-radius: 10px; font-size: 8.5pt;">
      <div><span style="color: #64748b;">Verilen Soru:</span> <strong>${assignedQ}</strong></div>
      <div><span style="color: #64748b;">Çözülen Soru:</span> <strong>${solvedQ}</strong></div>
      <div><span style="color: #15803d;">Doğru:</span> <strong>${correctQ}</strong></div>
      <div><span style="color: #be123c;">Yanlış:</span> <strong>${incorrectQ}</strong></div>
      <div><span style="color: #b45309;">Boş:</span> <strong>${emptyQ}</strong></div>
    </div>

    <!-- Executive Summary -->
    <div class="section">
      <h2 class="section-title">📊 Yönetici & Pedagoji Özeti</h2>
      <div class="summary-box">
        "${analysis.summary || 'Öğrencinin haftalık çalışma ve deneme verileri analiz edilerek gelişim hedefleri haritalandırılmıştır.'}"
      </div>
    </div>

    <!-- Trial & Weekly Highlights Side-by-Side -->
    <div class="section">
      <div class="grid-2">
        <!-- Deneme Sınavları -->
        <div class="card">
          <h3 class="card-title">🎯 Deneme Sınavları Özel Analizi</h3>
          <div class="stat-row">
            <span class="stat-label">Kayıtlı Deneme Sayısı:</span>
            <span class="stat-val">${trial.trialCount || 0} Adet</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Son Deneme Neti:</span>
            <span class="stat-val success-tag">${latestTrialNet} Net</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Hedef Net:</span>
            <span class="stat-val">${trial.targetNet || (Number(latestTrialNet) + 3).toFixed(1)} Net</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">En Yüksek Net:</span>
            <span class="stat-val">${trial.highestTrialNet || latestTrialNet} Net</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Genel Net Ortalaması:</span>
            <span class="stat-val">${trial.averageTrialNet || latestTrialNet} Net</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Net Trendi:</span>
            <span class="stat-val">${trial.trendLabel || 'İstikrarlı ➡️'}</span>
          </div>
          <p style="font-size: 8pt; color: #475569; margin: 8px 0 0 0; line-height: 1.4;">
            ${trial.summary || 'Deneme sınavı netleri takip edilmektedir.'}
          </p>
        </div>

        <!-- Haftalık Program -->
        <div class="card">
          <h3 class="card-title">📝 Haftalık Program & Soru Analizi</h3>
          <div class="stat-row">
            <span class="stat-label">Ödev Tamamlama Oranı:</span>
            <span class="stat-val success-tag">%${weekly.completionRate ?? stats.completionRate ?? 0}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Çözülen Soru Sayısı:</span>
            <span class="stat-val">${solvedQ} Soru</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Doğru / Yanlış / Boş:</span>
            <span class="stat-val">${correctQ} D / ${incorrectQ} Y / ${emptyQ} B</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Genel Soru Doğruluk Oranı:</span>
            <span class="stat-val ${successRate < 80 ? 'danger-tag' : 'success-tag'}">%${successRate}</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">Kritik Konu Sayısı (&lt;%80):</span>
            <span class="stat-val ${under80.length > 0 ? 'danger-tag' : 'success-tag'}">${under80.length} Konu</span>
          </div>
          <p style="font-size: 8pt; color: #475569; margin: 8px 0 0 0; line-height: 1.4;">
            ${weekly.summary || 'Haftalık program görevleri analiz edilmektedir.'}
          </p>
        </div>
      </div>
    </div>

    <!-- %80 Underperforming Critical Topics -->
    <div class="section">
      <h2 class="section-title">🚨 %80 Başarı Eşiğinin Altındaki Kritik Konular & Tavsiyeler</h2>
      ${under80.length === 0 ? `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; font-size: 9pt; color: #166534;">
          ✨ Tebrikler! Öğrencinin çalıştığı tüm konularda başarı oranı %80 hedef eşiğinin üzerindedir. Kritik bir eksik tespit edilmemiştir.
        </div>
      ` : under80.map((u: any) => `
        <div class="weak-item">
          <div class="weak-header">
            <span>${u.subject || 'Ders'} - ${u.topic || 'Konu'}</span>
            <span>%${u.accuracy ?? 0} Başarı (${u.correct ?? 0}D / ${u.incorrect ?? 0}Y / ${u.empty ?? 0}B)</span>
          </div>
          <p class="weak-desc">${u.diagnosis || 'Bu konuda soru çözümü ve tekrar önerilir.'}</p>
          <div class="weak-rec">
            💡 <strong>Tavsiye:</strong> ${u.recommendation || 'Konu tekrarı ve 25 pekiştirme sorusu çözünüz.'}
            ${u.video ? `<br/><span style="font-size: 8pt; color: #0369a1;">📺 Önerilen Video: ${u.video.title}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Subject Breakdown (if available) -->
    ${subjects.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📚 Ders Bazlı Yetkinlik & Doğruluk Oranları</h2>
      <table>
        <thead>
          <tr>
            <th>Ders</th>
            <th>Yetkinlik Oranı</th>
            <th>Durum</th>
            <th>Tespit Edilen Eksikler</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map((s: any) => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td><strong>%${s.accuracy}</strong></td>
            <td><span class="${s.status === 'danger' ? 'danger-tag' : 'success-tag'}">${s.status === 'danger' ? 'Kritik Dikkat' : s.status === 'warning' ? 'Orta Seviye' : 'İyi'}</span></td>
            <td>${(s.deficiencies && s.deficiencies.length > 0) ? s.deficiencies.map((d: any) => d.topic).join(', ') : 'Önemli eksik bulunamadı'}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Weekly Plan Recommendations -->
    ${weeklyRecs.length > 0 ? `
    <div class="section">
      <h2 class="section-title">📅 Yeni Haftalık Program İçin Telafi & Çalışma Hedefleri</h2>
      <table>
        <thead>
          <tr>
            <th>Ders</th>
            <th>Hedef Konu</th>
            <th>Önerilen Soru / Süre</th>
            <th>Gerekçe</th>
          </tr>
        </thead>
        <tbody>
          ${weeklyRecs.map((r: any) => `
          <tr>
            <td><strong>${r.subject}</strong></td>
            <td>${r.topic}</td>
            <td>${r.suggestedAmount}</td>
            <td>${r.reason}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}

    <!-- Teacher Pedagogy Notes -->
    ${pedagogyNotes.length > 0 ? `
    <div class="section">
      <h2 class="section-title">🎓 Öğretmen & Koçluk Pedagojik Notları</h2>
      <div class="list-box">
        <ul style="margin: 0; padding-left: 18px;">
          ${pedagogyNotes.map((note: string) => `<li>${note}</li>`).join('')}
        </ul>
      </div>
    </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <div>Scholar Pulse Akademik İzleme & Koçluk Sistemi</div>
      <div>Sayfa 1 / 1 • Bu rapor Yapay Zeka Eğitim Danışmanı tarafından otomatik derlenmiştir.</div>
    </div>
  </div>

  <script>
    // Automatically trigger print dialog
    window.addEventListener('DOMContentLoaded', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 350);
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
    }, 450);
  }
}
