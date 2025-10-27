const { GoogleGenerativeAI } = require('@google/generative-ai');
const geminiStore = require('../geminiStore');

class GeminiRateLimiter {
    constructor() {
        this.requests = new Map(); // Map untuk menyimpan timestamp requests per user
        this.maxRequests = 10; // Max 10 requests per menit per user
        this.timeWindow = 60 * 1000; // 1 menit dalam milliseconds
    }

    canMakeRequest(userId) {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];

        // Hapus requests yang sudah di luar time window
        const validRequests = userRequests.filter(time => now - time < this.timeWindow);

        if (validRequests.length >= this.maxRequests) {
            return false;
        }

        // Tambahkan request baru
        validRequests.push(now);
        this.requests.set(userId, validRequests);

        return true;
    }

    getRemainingTime(userId) {
        const now = Date.now();
        const userRequests = this.requests.get(userId) || [];

        if (userRequests.length < this.maxRequests) {
            return 0;
        }

        const oldestRequest = Math.min(...userRequests);
        return Math.ceil((this.timeWindow - (now - oldestRequest)) / 1000);
    }
}

const rateLimiter = new GeminiRateLimiter();

class GeminiService {
    async generateContent(fileName, userId = null, options = {}) {
        const startTime = Date.now();
        let apiData = null;
        let success = false;
        let errorMessage = null;

        try {
            // Rate limiting check
            if (userId && !rateLimiter.canMakeRequest(userId)) {
                const remainingTime = rateLimiter.getRemainingTime(userId);
                errorMessage = `Rate limit exceeded. Coba lagi dalam ${remainingTime} detik.`;
                throw new Error(errorMessage);
            }

            apiData = await geminiStore.getRandomApi();
            if (!apiData) {
                errorMessage = 'Tidak ada API Gemini yang tersedia. Silakan tambahkan API key di panel admin.';
                throw new Error(errorMessage);
            }

            const genAI = new GoogleGenerativeAI(apiData.apiKey);

            // Get model configuration
            const modelName = options.model || 'models/gemini-2.0-flash-exp';
            const availableModels = {
                'models/gemini-2.0-flash-exp': { name: 'Gemini 2.0 Flash Experimental', description: 'Model terbaru dan paling canggih untuk berbagai tugas', maxTokens: 32768 },
                'models/gemini-2.0-flash': { name: 'Gemini 2.0 Flash', description: 'Model stabil dan cepat untuk berbagai tugas', maxTokens: 32768 },
                'models/gemini-pro': { name: 'Gemini Pro Latest', description: 'Model stabil dan andal untuk berbagai tugas', maxTokens: 32768 },
                'models/gemini-flash-latest': { name: 'Gemini Flash Latest', description: 'Model cepat dan efisien untuk response singkat', maxTokens: 8192 },
                'models/gemini-1.5-flash': { name: 'Gemini 1.5 Flash', description: 'Model lama yang masih didukung untuk kompatibilitas', maxTokens: 8192 },
                'models/gemini-1.5-pro': { name: 'Gemini 1.5 Pro', description: 'Model powerful untuk konten yang lebih kompleks', maxTokens: 32768 }
            };
            const modelInfo = availableModels[modelName] || availableModels['models/gemini-2.0-flash-exp'];

            // Handle legacy model names for backward compatibility
            let actualModelName = modelName;
            if (modelName === 'gemini-flash-latest') actualModelName = 'models/gemini-flash-latest';
            if (modelName === 'gemini-pro') actualModelName = 'models/gemini-pro';
            if (modelName === 'gemini-1.5-flash') actualModelName = 'models/gemini-1.5-flash';
            if (modelName === 'gemini-1.5-pro') actualModelName = 'models/gemini-1.5-pro';
            if (modelName === 'models/gemini-2.0-flash-exp') actualModelName = 'models/gemini-2.0-flash-exp';

            // Get language and prompt template
            const language = options.language || 'indonesia';
            const promptTemplates = {
                indonesia: `Berdasarkan nama file video: "${fileName}", buat konten YouTube Shorts yang menarik.

INSTRUKSI: Jawab HANYA dengan format JSON yang valid, tanpa teks tambahan atau penjelasan. Pastikan JSON dapat di-parse langsung.

Format JSON:
{
   "title": "judul yang catchy dan menarik (max 100 karakter)",
   "description": "deskripsi menarik yang menggambarkan konten video (max 500 karakter)",
   "hashtags": "beberapa hashtag relevan dipisah dengan koma"
}

Contoh output yang benar:
{"title":"Tutorial Make Up Natural","description":"Panduan lengkap make up natural untuk pemula","hashtags":"makeup,tutorial,beauty,natural"}

Pastikan:
- Judul catchy dan mengundang klik
- Deskripsi informatif tapi singkat
- Hashtag maksimal 10, relevan dengan konten
- Gunakan bahasa Indonesia yang natural dan komunikatif
- Sesuaikan dengan konten dari nama file
- Output HANYA JSON, tidak ada teks lain`,

                english: `Based on the video file name: "${fileName}", create engaging YouTube Shorts content.

INSTRUCTIONS: Respond ONLY with valid JSON format, no additional text or explanations. Ensure the JSON can be parsed directly.

JSON Format:
{
   "title": "catchy and attractive title (max 100 characters)",
   "description": "interesting description that describes the video content (max 500 characters)",
   "hashtags": "some relevant hashtags separated by commas"
}

Correct output example:
{"title":"Natural Makeup Tutorial","description":"Complete guide to natural makeup for beginners","hashtags":"makeup,tutorial,beauty,natural"}

Make sure:
- Title is catchy and click-worthy
- Description is informative but concise
- Maximum 10 relevant hashtags
- Use natural English language
- Adapt to the content from the file name
- Output ONLY JSON, no other text`,

                sunda: `Dumasar nami file video: "${fileName}", jieun konten YouTube Shorts anu narik.

INTRUKSI: Jawab HANYA jeung format JSON anu valid, tanpa téks tambahan atanapi penjelasan. Pastikeun JSON tiasa di-parse langsung.

Format JSON:
{
   "title": "judul anu catchy jeung narik (max 100 karakter)",
   "description": "deskripsi narik anu ngagambarkeun eusi video (max 500 karakter)",
   "hashtags": "sababaraha hashtag relevan dipisah koma"
}

Conto output anu bener:
{"title":"Tutorial Make Up Natural","description":"Panduan lengkap make up natural keur pamula","hashtags":"makeup,tutorial,beauty,natural"}

Pastikeun:
- Judul catchy jeung ngundang klik
- Deskripsi informatif tapi singket
- Hashtag maksimal 10, relevan jeung konten
- Paké basa Sunda anu natural
- Sesuaikeun jeung konten tina nami file
- Output HANYA JSON, euweuh téks séjén`
            };
            const prompt = promptTemplates[language] || promptTemplates.indonesia;

            const model = genAI.getGenerativeModel({ model: actualModelName });

            // Retry logic dengan exponential backoff
            let lastError;
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();

                    console.log('Raw Gemini response:', text); // Debug log

                    // Parse JSON response dengan validasi lebih baik
                    let content;
                    try {
                        // Coba parse langsung dulu
                        content = JSON.parse(text);
                        console.log('Direct parse successful:', content);
                    } catch (parseError) {
                        console.log('Direct parse failed, trying regex extraction...');
                        console.log('Raw response text:', text);
                        // Jika gagal, coba ekstrak JSON dari teks dengan regex yang lebih robust
                        // Handle markdown code blocks first
                        let cleanText = text;
                        if (text.includes('```json')) {
                            const jsonBlockMatch = text.match(/```json\s*\n?(\{[\s\S]*?\})\s*\n?```/);
                            if (jsonBlockMatch) {
                                cleanText = jsonBlockMatch[1];
                                console.log('Extracted from json code block:', cleanText);
                            }
                        } else if (text.includes('```')) {
                            const codeBlockMatch = text.match(/```\s*\n?(\{[\s\S]*?\})\s*\n?```/);
                            if (codeBlockMatch) {
                                cleanText = codeBlockMatch[1];
                                console.log('Extracted from code block:', cleanText);
                            }
                        }

                        try {
                            content = JSON.parse(cleanText);
                            console.log('Successfully extracted and parsed JSON:', content);
                        } catch (regexError) {
                            console.log('Regex extraction also failed:', regexError);
                            // Fallback to original regex
                            const jsonMatch = cleanText.match(/\{[\s\S]*?\}(?=\s*$|[\r\n]|```)/);
                            if (!jsonMatch) {
                                console.log('No JSON found in response. Full text:', text);
                                throw new Error('Respons tidak valid dari Gemini API - tidak ada format JSON yang benar');
                            }
                            content = JSON.parse(jsonMatch[0]);
                            console.log('Successfully extracted JSON with fallback regex:', content);
                        }
                    }

                    // Validasi hasil
                    if (!content.title && !content.description && !content.hashtags) {
                        throw new Error('Respons kosong dari Gemini API');
                    }

                    success = true;
                    const responseTime = Date.now() - startTime;

                    // Log successful usage
                    if (userId) {
                        await geminiStore.logApiUsage(apiData.id, userId, fileName, success, null, responseTime);
                    }

                    return {
                        title: content.title || fileName,
                        description: content.description || `Video menarik: ${fileName}`,
                        tags: content.hashtags || 'viral,shorts,fyp',
                        generated: true,
                        model: modelName,
                        modelInfo: modelInfo
                    };

                } catch (error) {
                    lastError = error;
                    console.warn(`Gemini API attempt ${attempt} failed:`, error.message);
                    console.warn('Full error:', error);

                    if (attempt < 3) {
                        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff max 5s
                        await new Promise(resolve => setTimeout(resolve, delay));
                    }
                }
            }

            throw lastError;

        } catch (error) {
            console.error('Error generating content with Gemini:', error);
            errorMessage = error.message;

            // Log error untuk monitoring
            if (userId) {
                console.log(`[GEMINI_ERROR] User ${userId}: ${error.message}`);
            }

            // Fallback jika API gagal
            return {
                title: fileName,
                description: `Video menarik: ${fileName}. Konten ini menggunakan judul default karena AI tidak tersedia sementara.`,
                tags: 'viral,shorts,fyp',
                generated: false,
                error: error.message
            };
        } finally {
            // Log usage even if failed (untuk tracking rate limiting)
            if (!success && userId && apiData) {
                const responseTime = Date.now() - startTime;
                await geminiStore.logApiUsage(apiData.id, userId, fileName, success, errorMessage, responseTime);
            }
        }
    }

    async validateApiKey(apiKey) {
        try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: 'models/gemini-2.0-flash-exp' });

            // Simple validation prompt to avoid rate limits
            const result = await model.generateContent('Respond with exactly: VALID');
            const response = await result.response;
            const text = response.text();

            return text.toLowerCase().includes('valid');
        } catch (error) {
            console.error('Error validating Gemini API key:', error);
            return false;
        }
    }
}

module.exports = new GeminiService();