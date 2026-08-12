import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { analyzeAPI } from '../services/api';

const RISK_COLOR = (score) => {
  if (score >= 8.5) return '#ef4444';
  if (score >= 6.0) return '#f59e0b';
  if (score >= 3.0) return '#facc15';
  return '#10b981';
};

const RISK_LABEL = (level) => {
  switch (String(level || '').toUpperCase()) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH': return 'HIGH';
    case 'MEDIUM': return 'MEDIUM';
    case 'LOW': return 'LOW';
    default: return 'PENDING';
  }
};

function ResultCard({ data }) {
  if (!data) return null;
  const color = RISK_COLOR(data.risk_score);
  const level = RISK_LABEL(data.threat_level);
  const reasons = data.reasons || [];
  const urls = data.extracted_urls || [];

  return (
    <View style={styles.resultCard}>
      <View style={[styles.riskHeader, { borderColor: `${color}40`, backgroundColor: `${color}12` }]}>
        <View>
          <Text style={[styles.levelText, { color }]}>{level}</Text>
          <Text style={[styles.riskScore, { color }]}>{data.risk_score.toFixed(1)} <Text style={styles.riskDenom}>/ 10</Text></Text>
        </View>
        <View style={styles.detectBadge}>
          <Ionicons name={data.threat_detected ? 'warning' : 'checkmark-circle'} size={22} color={data.threat_detected ? color : '#10b981'} />
          <Text style={styles.detectText}>{data.threat_detected ? 'THREAT' : 'SAFE'}</Text>
        </View>
      </View>

      {data.classification_label && (
        <View style={styles.classRow}>
          <Text style={styles.classLabel}>Classification</Text>
          <Text style={styles.classValue}>{data.classification_label.toUpperCase()}</Text>
        </View>
      )}

      <View style={styles.scoresRow}>
        {[
          { k: 'NLP', v: data.nlp_score },
          { k: 'Behavior', v: data.behavior_score },
          { k: 'URL', v: data.url_score },
          { k: 'Reputation', v: data.reputation_score },
        ].map(({ k, v }) => (
          <View key={k} style={styles.scoreCell}>
            <Text style={styles.scoreVal}>{v != null ? v.toFixed(1) : '—'}</Text>
            <Text style={styles.scoreKey}>{k}</Text>
          </View>
        ))}
      </View>

      {reasons.length > 0 && (
        <View style={styles.reasonsBlock}>
          <Text style={styles.blockTitle}>Reasons</Text>
          {reasons.map((r, i) => (
            <Text key={i} style={styles.reasonItem}>• {r}</Text>
          ))}
        </View>
      )}
      {urls.length > 0 && (
        <View style={styles.reasonsBlock}>
          <Text style={styles.blockTitle}>Extracted URLs</Text>
          {urls.map((u, i) => (
            <Text key={i} style={styles.urlItem} numberOfLines={1}>{u}</Text>
          ))}
        </View>
      )}
      <Text style={styles.savedNote}>Saved to your dashboard as a threat record.</Text>
    </View>
  );
}

export default function AnalyzeScreen() {
  const [mode, setMode] = useState('sms');
  const [sender, setSender] = useState('');
  const [message, setMessage] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const mutation = useMutation({
    mutationFn: () => {
      if (mode === 'sms') {
        if (!message.trim()) throw new Error('Message is required');
        return analyzeAPI.sms({ sender: sender.trim() || 'unknown', message: message.trim() });
      }
      if (!body.trim()) throw new Error('Email body is required');
      return analyzeAPI.email({ sender: sender.trim() || 'unknown', subject: subject.trim() || '(no subject)', body: body.trim() });
    },
    onError: (e) => {
      const msg = e.response?.data?.detail || e.message || 'Analysis failed';
      Alert.alert('Analysis Failed', String(msg));
    },
  });

  const result = mutation.data?.data;

  return (
    <LinearGradient colors={['#020617', '#0f172a']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Real-time Analyzer</Text>
            <Text style={styles.subtitle}>Live threat scan against the SentinelX engine — no mocks</Text>
          </View>

          <View style={styles.tabs}>
            {[
              { id: 'sms', label: 'SMS', icon: 'chatbubble-ellipses-outline' },
              { id: 'email', label: 'Email', icon: 'mail-outline' },
            ].map(({ id, label, icon }) => (
              <TouchableOpacity
                key={id}
                style={[styles.tab, mode === id && styles.tabActive]}
                onPress={() => { setMode(id); mutation.reset(); }}
              >
                <Ionicons name={icon} size={16} color={mode === id ? '#3b82f6' : '#64748b'} />
                <Text style={[styles.tabText, mode === id && styles.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.form}>
            {mode === 'sms' ? (
              <>
                <Text style={styles.label}>Sender (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={sender}
                  onChangeText={setSender}
                  placeholder="+91 98XXX XXXXX"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                />
                <Text style={styles.label}>Message</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={message}
                  onChangeText={setMessage}
                  placeholder="Paste the real SMS you received here..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </>
            ) : (
              <>
                <Text style={styles.label}>From (optional)</Text>
                <TextInput
                  style={styles.input}
                  value={sender}
                  onChangeText={setSender}
                  placeholder="sender@example.com"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.label}>Subject</Text>
                <TextInput
                  style={styles.input}
                  value={subject}
                  onChangeText={setSubject}
                  placeholder="Email subject"
                  placeholderTextColor="#475569"
                />
                <Text style={styles.label}>Body</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={body}
                  onChangeText={setBody}
                  placeholder="Paste the real email content here..."
                  placeholderTextColor="#475569"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.analyzeBtn, mutation.isPending && styles.disabled]}
              onPress={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="scan-outline" size={20} color="#fff" />
                  <Text style={styles.analyzeText}>Scan Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <ResultCard data={result} />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 60 },
  header: { marginBottom: 24, marginTop: 8 },
  title: { color: '#f8fafc', fontSize: 26, fontWeight: '800', letterSpacing: 0.5 },
  subtitle: { color: '#64748b', fontSize: 13, marginTop: 4 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#0f172a',
    borderWidth: 1, borderColor: '#1e293b',
  },
  tabActive: { borderColor: '#3b82f6', backgroundColor: '#1e3a5f' },
  tabText: { color: '#64748b', fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: '#3b82f6' },
  form: { gap: 8 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 6 },
  input: {
    backgroundColor: '#0b1426', borderWidth: 1, borderColor: '#22304a',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#f1f5f9', fontSize: 14,
  },
  multiline: { minHeight: 110 },
  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#2563eb', borderRadius: 12, paddingVertical: 15, marginTop: 14,
  },
  disabled: { opacity: 0.6 },
  analyzeText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  resultCard: {
    marginTop: 24, backgroundColor: '#0b1426', borderWidth: 1, borderColor: '#22304a',
    borderRadius: 16, padding: 18,
  },
  riskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 12, padding: 14, borderWidth: 1 },
  levelText: { fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  riskScore: { fontSize: 32, fontWeight: '900' },
  riskDenom: { fontSize: 14, color: '#64748b', fontWeight: '700' },
  detectBadge: { alignItems: 'center' },
  detectText: { color: '#f8fafc', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, paddingHorizontal: 2 },
  classLabel: { color: '#64748b', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  classValue: { color: '#f8fafc', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  scoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 8 },
  scoreCell: { flex: 1, alignItems: 'center', backgroundColor: '#101c33', borderRadius: 10, paddingVertical: 10 },
  scoreVal: { color: '#f8fafc', fontSize: 17, fontWeight: '800' },
  scoreKey: { color: '#64748b', fontSize: 11, marginTop: 2, textTransform: 'uppercase' },
  reasonsBlock: { marginTop: 14 },
  blockTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 6 },
  reasonItem: { color: '#cbd5e1', fontSize: 13, marginBottom: 4, lineHeight: 19 },
  urlItem: { color: '#60a5fa', fontSize: 13, marginBottom: 4 },
  savedNote: { color: '#64748b', fontSize: 12, marginTop: 16, fontStyle: 'italic' },
});