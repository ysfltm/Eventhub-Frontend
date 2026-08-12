/**
 * EventHub Translation Service — LibreTranslate Edition
 *
 * Provider:   LibreTranslate (self-hosted or public instance)
 * Endpoint:   POST {VITE_TRANSLATOR_API_URL}/translate
 * Fallback:   Returns original source text gracefully on any error
 * Caching:    In-memory Map + localStorage (keyed by lang pair + text)
 * Debouncing: Micro-task batching queue to avoid request flooding
 */

// ─── Cache Setup ─────────────────────────────────────────────────────────────
const CACHE_KEY = 'eventhub_translation_cache_v2';
const inMemoryCache = new Map();

/** Safe localStorage wrapper (browser-only, never throws) */
const safeLS = {
  get: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage)
        return window.localStorage.getItem(key);
    } catch { /* ignore */ }
    return null;
  },
  set: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage)
        window.localStorage.setItem(key, value);
    } catch { /* ignore */ }
  },
};

// Hydrate in-memory cache from localStorage on module load
try {
  const stored = safeLS.get(CACHE_KEY);
  if (stored) {
    const parsed = JSON.parse(stored);
    Object.keys(parsed).forEach((k) => inMemoryCache.set(k, parsed[k]));
  }
} catch { /* ignore corrupt cache */ }

const flushCacheToStorage = () => {
  try {
    const obj = {};
    inMemoryCache.forEach((v, k) => { obj[k] = v; });
    safeLS.set(CACHE_KEY, JSON.stringify(obj));
  } catch { /* ignore */ }
};

const cacheKey = (text, targetLang, sourceLang) =>
  `${sourceLang}:${targetLang}:${text.trim()}`;

/** Read a cached translation synchronously (returns null if missing) */
export const getCachedTranslation = (text, targetLang, sourceLang = 'en') => {
  if (!text || targetLang === sourceLang) return text || null;
  return inMemoryCache.get(cacheKey(text, targetLang, sourceLang)) || null;
};

/** Write a translation into both caches */
export const setCachedTranslation = (text, targetLang, translation, sourceLang = 'en') => {
  if (!text || !translation) return;
  inMemoryCache.set(cacheKey(text, targetLang, sourceLang), translation);
  flushCacheToStorage();
};

// ─── LibreTranslate Config ────────────────────────────────────────────────────

/** Ordered list of LibreTranslate endpoints to try (primary first, then fallbacks) */
const getFallbackEndpoints = () => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  const primary = (env.VITE_TRANSLATOR_API_URL || '').replace(/\/$/, '');
  const defaults = [
    'https://translate.argosopentech.com',
    'https://translate.terraprint.co',
    'https://lt.vern.cc',
    'https://libretranslate.de',
  ];
  return primary ? [primary, ...defaults.filter(u => u !== primary)] : defaults;
};

const getApiKey = () => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};
  return env.VITE_TRANSLATOR_API_KEY || '';
};

// ─── Debounce / Micro-Batch Queue ─────────────────────────────────────────────
/**
 * Pending batch map: key = `${sourceLang}:${targetLang}`
 * value = Array of { text, resolve, reject }
 */
const pendingBatches = new Map();
const BATCH_DELAY_MS = 40; // ms to wait before flushing a batch

const scheduleBatchFlush = (batchKey) => {
  // Use a microtask / timeout to collect synchronous calls into one request
  setTimeout(() => flushBatch(batchKey), BATCH_DELAY_MS);
};

const flushBatch = async (batchKey) => {
  const items = pendingBatches.get(batchKey);
  if (!items || items.length === 0) return;
  pendingBatches.delete(batchKey); // clear before async so new calls start fresh batch

  const [sourceLang, targetLang] = batchKey.split(':');
  const texts = items.map((i) => i.text);

  try {
    const translations = await callLibreTranslateBatch(texts, targetLang, sourceLang);
    items.forEach((item, idx) => {
      const result = translations[idx] || item.text;
      setCachedTranslation(item.text, targetLang, result, sourceLang);
      item.resolve(result);
    });
  } catch (err) {
    // On error, resolve each item with its original text (non-blocking fallback)
    console.warn('[TranslationService] Batch request failed, using fallback:', err.message);
    items.forEach((item) => item.resolve(item.text));
  }
};

/** Enqueue a text into the micro-batch for its language pair */
const enqueueBatch = (text, targetLang, sourceLang) => {
  return new Promise((resolve, reject) => {
    const batchKey = `${sourceLang}:${targetLang}`;
    if (!pendingBatches.has(batchKey)) {
      pendingBatches.set(batchKey, []);
      scheduleBatchFlush(batchKey);
    }
    pendingBatches.get(batchKey).push({ text, resolve, reject });
  });
};

// ─── LibreTranslate API Calls ─────────────────────────────────────────────────

/**
 * Calls LibreTranslate for a single text. Returns translated string or throws.
 * Prefixed with _ — kept as a utility reference but batching handles all live calls.
 */
const _callLibreTranslate = async (text, targetLang, sourceLang = 'auto') => {
  const apiUrl = getApiUrl();
  const apiKey = getApiKey();

  const body = { q: text, source: sourceLang === 'en' ? 'en' : 'auto', target: targetLang, format: 'text' };
  if (apiKey) body.api_key = apiKey;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8-second timeout

  try {
    const res = await fetch(`${apiUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`LibreTranslate HTTP ${res.status}`);
    const data = await res.json();
    return data.translatedText || null;
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
};

/**
 * Tries each LibreTranslate endpoint in order until one succeeds for a single text.
 * Returns translated string or null.
 */
const tryEndpoints = async (text, targetLang, sourceLang = 'en') => {
  const endpoints = getFallbackEndpoints();
  const apiKey = getApiKey();
  const body = { q: text, source: sourceLang === 'en' ? 'en' : 'auto', target: targetLang, format: 'text' };
  if (apiKey) body.api_key = apiKey;

  for (const url of endpoints) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(`${url}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const data = await res.json();
      if (data?.translatedText) return data.translatedText;
    } catch { /* try next endpoint */ }
  }
  return null;
};

/**
 * Calls LibreTranslate for multiple texts in parallel using the fallback endpoint chain.
 */
const callLibreTranslateBatch = async (texts, targetLang, sourceLang = 'en') => {
  const results = await Promise.all(
    texts.map((text) => tryEndpoints(text, targetLang, sourceLang))
  );
  return results.map((r, i) => r || texts[i]);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Translate a single text string asynchronously.
 * - Instant return for English or same-language pairs
 * - Synchronous cache hit if already translated
 * - Enqueued in micro-batch otherwise (debounced 40ms)
 * - Falls back to original text on any error
 */
export const translateText = async (text, targetLang, sourceLang = 'en') => {
  if (!text || typeof text !== 'string') return text || '';
  const trimmed = text.trim();
  if (!trimmed || targetLang === sourceLang || targetLang === 'en') return text;

  // 1. Cache hit — instant return
  const cached = getCachedTranslation(trimmed, targetLang, sourceLang);
  if (cached) return cached;

  try {
    // 2. Enqueue in debounced micro-batch
    const result = await enqueueBatch(trimmed, targetLang, sourceLang);
    return result || text;
  } catch {
    // 3. Graceful fallback — never breaks UI
    return text;
  }
};

/**
 * Translate an array of strings (batched automatically).
 * Returns original texts as fallback for any failed items.
 */
export const translateBatch = async (textsArray, targetLang, sourceLang = 'en') => {
  if (!Array.isArray(textsArray) || textsArray.length === 0) return [];
  if (targetLang === sourceLang || targetLang === 'en') return textsArray;

  // Filter to only uncached items to minimise network calls
  const results = textsArray.map((txt) => getCachedTranslation(txt, targetLang, sourceLang));
  const uncachedIndices = results.reduce((acc, r, i) => { if (!r) acc.push(i); return acc; }, []);

  if (uncachedIndices.length === 0) return results;

  // Translate only the uncached strings
  const uncachedTexts = uncachedIndices.map((i) => textsArray[i]);
  try {
    const translations = await callLibreTranslateBatch(uncachedTexts, targetLang, sourceLang);
    uncachedIndices.forEach((originalIdx, batchIdx) => {
      const translated = translations[batchIdx] || textsArray[originalIdx];
      results[originalIdx] = translated;
      setCachedTranslation(textsArray[originalIdx], targetLang, translated, sourceLang);
    });
  } catch {
    // Fallback: fill remaining nulls with original text
    uncachedIndices.forEach((i) => { results[i] = textsArray[i]; });
  }

  return results.map((r, i) => r || textsArray[i]);
};
