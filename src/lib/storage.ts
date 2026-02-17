/* eslint-disable @typescript-eslint/no-explicit-any */
const Q_KEY = 'garsan_quotes_v1';
const T_KEY = 'garsan_techs_v1';
const S_KEY = 'garsan_settings_v1';

export function saveQuoteLocal(quote: any) {
  const all = getAllQuotesLocal();
  all.unshift({ ...quote, id: Date.now().toString() });
  try {
    localStorage.setItem(Q_KEY, JSON.stringify(all));
  } catch (err) {
    // localStorage quota exceeded — fall back to storing metadata only (strip image binaries)
    console.warn('localStorage quota exceeded while saving quote — stripping image binaries and saving metadata only', err);
    const sanitized = all.map((q: any) => ({
      ...q,
      photos: (q.photos || []).map((p: any) => ({ id: p.id, category: p.category })),
    }));
    try {
      localStorage.setItem(Q_KEY, JSON.stringify(sanitized));
    } catch (err2) {
      console.error('Failed to save quotes after sanitizing images', err2);
      // last-resort: save only current quote without photos
      const fallback = [{ ...quote, id: Date.now().toString(), photos: [] }];
      try { localStorage.setItem(Q_KEY, JSON.stringify(fallback)); } catch (err3) { console.error('Final save failed', err3); }
    }
  }
}

export function getAllQuotesLocal() {
  try {
    const raw = localStorage.getItem(Q_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function clearAllQuotesLocal() {
  localStorage.removeItem(Q_KEY);
}

export function getTechsLocal() {
  const raw = localStorage.getItem(T_KEY);
  if (raw) return JSON.parse(raw);
  // default techs provided by client requirements
  const defaults = [
    { name: 'Daniel', pin: '0916' },
    { name: 'Eduardo', pin: '1031' },
    { name: 'Jose', pin: '3110' },
  ];
  localStorage.setItem(T_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveTechsLocal(techs: any[]) {
  localStorage.setItem(T_KEY, JSON.stringify(techs));
}

export function getSettingsLocal() {
  const raw = localStorage.getItem(S_KEY);
  if (raw) return JSON.parse(raw);
  const defaults = {
    masterPin: '3110',
    company: {
      name: 'GarSan Plumbing Services LLC',
      address: '—',
      phone: '—',
      logoUrl: '/logo.jpeg',
    },
    loadShedLadder: null,
    generatorPricing: null,
  };
  localStorage.setItem(S_KEY, JSON.stringify(defaults));
  return defaults;
}

export function saveSettingsLocal(settings: any) {
  localStorage.setItem(S_KEY, JSON.stringify(settings));
}
