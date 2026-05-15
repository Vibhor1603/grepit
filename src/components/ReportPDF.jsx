"use client";
import { Document, Page, Text, View, StyleSheet, Svg, Circle, Rect, pdf } from '@react-pdf/renderer';

const c = {
  bg: '#1a1a1e', card: '#222226', border: '#2a2a30',
  ink: '#eaeaec', ink2: '#b0b0b8', ink3: '#787884',
  accent: '#E0FC10', green: '#22c55e', yellow: '#eab308', red: '#ef4444',
};

const s = StyleSheet.create({
  page: { backgroundColor: c.bg, padding: 30, fontFamily: 'Helvetica' },
  // Banner
  banner: { backgroundColor: c.card, borderRadius: 6, padding: 16, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerLogo: { fontSize: 16, fontWeight: 'bold', color: c.ink },
  bannerAccent: { color: c.accent },
  bannerRight: { alignItems: 'flex-end' },
  bannerTitle: { fontSize: 10, color: c.ink2 },
  bannerDate: { fontSize: 8, color: c.ink3, marginTop: 2 },
  // Score row
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 16 },
  scoreText: { flex: 1 },
  repoName: { fontSize: 14, color: c.ink, fontWeight: 'bold', marginBottom: 4 },
  summary: { fontSize: 9, color: c.ink2, lineHeight: 1.6 },
  // Stats
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: c.card, borderRadius: 4, padding: 8, alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: 'bold', color: c.ink },
  statLabel: { fontSize: 7, color: c.ink3, marginTop: 2, textTransform: 'uppercase' },
  // Issues
  sectionTitle: { fontSize: 12, color: c.ink, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
  issueCard: { backgroundColor: c.card, borderRadius: 4, padding: 10, marginBottom: 6 },
  issueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  issueName: { fontSize: 10, color: c.ink, fontWeight: 'bold' },
  issueCount: { fontSize: 8, color: c.ink3 },
  issueDesc: { fontSize: 8, color: c.ink2, marginBottom: 4 },
  fileItem: { fontSize: 7, color: c.ink2, fontFamily: 'Courier', paddingVertical: 1.5, paddingLeft: 6 },
  dot: { width: 5, height: 5, borderRadius: 3, marginRight: 5 },
  // Footer
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  certified: { fontSize: 8, color: c.accent, fontWeight: 'bold' },
  footerSub: { fontSize: 6, color: c.ink3 },
});

function ScoreCircle({ score }) {
  const color = score >= 75 ? c.green : score >= 50 ? c.yellow : c.red;
  const circumference = 2 * Math.PI * 28;
  const filled = (score / 100) * circumference;
  return (
    <View style={{ width: 70, height: 70 }}>
      <Svg viewBox="0 0 80 80" style={{ width: 70, height: 70 }}>
        <Circle cx="40" cy="40" r="28" fill="none" stroke={c.border} strokeWidth="5" />
        <Circle cx="40" cy="40" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={`${filled} ${circumference}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
      </Svg>
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color }}>{score}%</Text>
      </View>
    </View>
  );
}

function ReportDocument({ report }) {
  const grouped = {};
  (report.issues || []).forEach(i => { const k = i.title || 'Other'; if (!grouped[k]) grouped[k] = []; grouped[k].push(i); });

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Banner */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <Text style={s.bannerLogo}>vi<Text style={s.bannerAccent}>b</Text>o</Text>
            <Text style={{ fontSize: 9, color: c.ink3 }}>|</Text>
            <Text style={{ fontSize: 9, color: c.ink2 }}>Security Report</Text>
          </View>
          <View style={s.bannerRight}>
            <Text style={s.bannerDate}>{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          </View>
        </View>

        {/* Score + Summary row */}
        <View style={s.scoreRow}>
          <ScoreCircle score={report.score} />
          <View style={s.scoreText}>
            <Text style={s.repoName}>{report.repoName}</Text>
            <Text style={s.summary}>
              Analysis covering {report.totalFiles} files across {Object.keys(report.languages || {}).length} languages. {report.highCount > 0 ? `${report.highCount} high-severity issues require attention.` : 'No critical issues.'} {report.testing?.hasTests ? `${report.testing.testFileCount} test files.` : 'No tests detected.'}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {[
            { v: report.totalFiles, l: 'Files' },
            { v: report.highCount, l: 'High', color: report.highCount > 0 ? c.red : c.ink },
            { v: report.mediumCount, l: 'Medium' },
            { v: report.lowCount, l: 'Low' },
            { v: report.testing?.testFileCount || 0, l: 'Tests' },
          ].map((st, i) => (
            <View key={i} style={s.statBox}>
              <Text style={{ ...s.statVal, color: st.color || c.ink }}>{st.v}</Text>
              <Text style={s.statLabel}>{st.l}</Text>
            </View>
          ))}
        </View>

        {/* Issues — ALL files shown */}
        {Object.keys(grouped).length > 0 && <Text style={s.sectionTitle}>Issues</Text>}
        {Object.entries(grouped).map(([cat, items]) => (
          <View key={cat} style={s.issueCard} wrap={false}>
            <View style={s.issueHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ ...s.dot, backgroundColor: items[0]?.severity === 'high' ? c.red : items[0]?.severity === 'medium' ? c.yellow : c.ink3 }} />
                <Text style={s.issueName}>{cat}</Text>
              </View>
              <Text style={s.issueCount}>{items.length} found</Text>
            </View>
            {items[0]?.description && <Text style={s.issueDesc}>{items[0].description}</Text>}
            {items.filter(i => i.file).map((item, j) => (
              <Text key={j} style={s.fileItem}>{item.file}</Text>
            ))}
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerSub}>Generated by Vibo</Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={s.certified}>✓ VIBO CERTIFIED</Text>
            <Text style={s.footerSub}>Automated security analysis</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export async function generateReport(report) {
  const blob = await pdf(<ReportDocument report={report} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.repoName}-security-report.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
