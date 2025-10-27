const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, 'db.json');

class GeminiPromptManager {
    static getPromptTemplates() {
        return {
            default: `Berdasarkan nama file video: "{fileName}", buat konten YouTube Shorts yang menarik dengan format JSON berikut:
{
    "title": "judul yang catchy dan menarik (max 100 karakter)",
    "description": "deskripsi menarik yang menggambarkan konten video (max 500 karakter)",
    "hashtags": "beberapa hashtag relevan dipisah dengan koma"
}

Pastikan:
- Judul catchy dan mengundang klik
- Deskripsi informatif tapi singkat
- Hashtag maksimal 10, relevan dengan konten
- Gunakan bahasa Indonesia yang natural
- Sesuaikan dengan konten dari nama file

Jika nama file dalam bahasa Inggris, tetap gunakan bahasa Indonesia untuk output.`,

            detailed: `Berdasarkan nama file video: "{fileName}", buat konten YouTube yang sangat detail dan engaging dengan format JSON berikut:
{
    "title": "judul yang sangat menarik dan SEO-friendly (max 100 karakter)",
    "description": "deskripsi lengkap dan menarik yang menggambarkan konten video dengan detail (max 5000 karakter)",
    "hashtags": "10-15 hashtag yang sangat relevan dan trending, dipisah dengan koma"
}

Persyaratan khusus:
- Judul harus mengandung kata kunci utama dari nama file
- Deskripsi harus mencakup: pengantar menarik, deskripsi konten, call-to-action, dan kata kunci terkait
- Hashtag harus mencakup: kata kunci utama, kata kunci terkait, trending topics, dan brand hashtags
- Gunakan bahasa Indonesia yang profesional dan engaging
- Optimasi untuk algoritma YouTube dan SEO

Jika nama file dalam bahasa Inggris, tetap gunakan bahasa Indonesia untuk output.`,

            short_form: `Berdasarkan nama file video: "{fileName}", buat konten YouTube Shorts/ TikTok yang super catchy dengan format JSON berikut:
{
    "title": "judul pendek yang sangat menarik dan viral (max 60 karakter)",
    "description": "deskripsi super singkat tapi bikin penasaran (max 200 karakter)",
    "hashtags": "5-8 hashtag yang sedang trending untuk Shorts/TikTok, dipisah dengan koma"
}

Fokus pada:
- Judul harus sangat catchy dan memancing klik
- Deskripsi harus membuat orang langsung ingin nonton
- Hashtag harus yang lagi trending di platform Shorts/TikTok
- Gunakan bahasa Indonesia gaul yang kekinian
- Buat konten yang relatable dan shareable

Jika nama file dalam bahasa Inggris, tetap gunakan bahasa Indonesia untuk output.`,

            educational: `Berdasarkan nama file video: "{fileName}", buat konten edukasi yang informatif dengan format JSON berikut:
{
    "title": "judul edukatif yang jelas dan menarik (max 100 karakter)",
    "description": "penjelasan detail tentang konten edukasi (max 1000 karakter)",
    "hashtags": "hashtag edukasi dan pembelajaran yang relevan, dipisah dengan koma"
}

Buat konten yang:
- Judul harus langsung menjelaskan manfaat yang didapat pemirsa
- Deskripsi harus mencakup: apa yang akan dipelajari, siapa target audience, dan manfaat praktis
- Sertakan call-to-action untuk like, comment, dan subscribe
- Gunakan bahasa Indonesia yang mudah dipahami semua kalangan
- Tambahkan nilai edukasi yang tinggi

Jika nama file dalam bahasa Inggris, tetap gunakan bahasa Indonesia untuk output.`
        };
    }

    static getPrompt(template = 'default', fileName) {
        const templates = this.getPromptTemplates();
        return templates[template]?.replace('{fileName}', fileName) || templates.default.replace('{fileName}', fileName);
    }
}

class GeminiModelManager {
    static getAvailableModels() {
        return {
            'gemini-1.5-flash': {
                name: 'Gemini 1.5 Flash',
                description: 'Model cepat dan efisien untuk response singkat',
                maxTokens: 8192
            },
            'gemini-1.5-pro': {
                name: 'Gemini 1.5 Pro',
                description: 'Model powerful untuk konten yang lebih kompleks',
                maxTokens: 32768
            }
        };
    }

    static getModel(modelName = 'gemini-1.5-flash') {
        const models = this.getAvailableModels();
        return models[modelName] || models['gemini-1.5-flash'];
    }
}

// Export helper classes untuk digunakan di routes
class GeminiStore {
    async getAllApis() {
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            const db = JSON.parse(data);
            return db.geminiApis || [];
        } catch (error) {
            console.error('Error reading Gemini APIs:', error);
            return [];
        }
    }

    async addApi(apiKey) {
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            const db = JSON.parse(data);

            if (!db.geminiApis) {
                db.geminiApis = [];
            }

            const newApi = {
                id: Date.now(),
                apiKey: apiKey,
                createdAt: new Date().toISOString()
            };

            db.geminiApis.push(newApi);

            await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
            return newApi;
        } catch (error) {
            console.error('Error adding Gemini API:', error);
            throw error;
        }
    }

    async deleteApi(id) {
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            const db = JSON.parse(data);

            if (!db.geminiApis) {
                return false;
            }

            const initialLength = db.geminiApis.length;
            db.geminiApis = db.geminiApis.filter(api => api.id !== id);

            if (db.geminiApis.length < initialLength) {
                await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error deleting Gemini API:', error);
            throw error;
        }
    }

    async getApiById(id) {
        try {
            const apis = await this.getAllApis();
            return apis.find(api => api.id === id) || null;
        } catch (error) {
            console.error('Error getting Gemini API by ID:', error);
            return null;
        }
    }

    async getRandomApi() {
        try {
            const apis = await this.getAllApis();
            if (apis.length === 0) {
                return null;
            }
            const randomIndex = Math.floor(Math.random() * apis.length);
            return apis[randomIndex];
        } catch (error) {
            console.error('Error getting random Gemini API:', error);
            return null;
        }
    }

    async logApiUsage(apiId, userId, fileName, success, errorMessage = null, responseTime = null) {
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            const db = JSON.parse(data);

            if (!db.geminiUsage) {
                db.geminiUsage = [];
            }

            const usageLog = {
                id: Date.now(),
                apiId: apiId,
                userId: userId,
                fileName: fileName,
                success: success,
                errorMessage: errorMessage,
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };

            db.geminiUsage.push(usageLog);

            // Keep only last 1000 logs to prevent database from growing too large
            if (db.geminiUsage.length > 1000) {
                db.geminiUsage = db.geminiUsage.slice(-1000);
            }

            await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        } catch (error) {
            console.error('Error logging Gemini API usage:', error);
        }
    }

    async getUsageStats() {
        try {
            const data = await fs.readFile(DB_PATH, 'utf8');
            const db = JSON.parse(data);

            const usage = db.geminiUsage || [];
            const last24h = usage.filter(log => {
                const logTime = new Date(log.timestamp);
                const now = new Date();
                return (now - logTime) < (24 * 60 * 60 * 1000); // 24 jam
            });

            const totalRequests = usage.length;
            const successfulRequests = usage.filter(log => log.success).length;
            const failedRequests = totalRequests - successfulRequests;
            const successRate = totalRequests > 0 ? (successfulRequests / totalRequests * 100).toFixed(2) : 0;

            const recentRequests = last24h.length;
            const recentSuccessRate = recentRequests > 0 ?
                (last24h.filter(log => log.success).length / recentRequests * 100).toFixed(2) : 0;

            return {
                totalRequests,
                successfulRequests,
                failedRequests,
                successRate: `${successRate}%`,
                recentRequests,
                recentSuccessRate: `${recentSuccessRate}%`,
                averageResponseTime: this.calculateAverageResponseTime(usage)
            };
        } catch (error) {
            console.error('Error getting usage stats:', error);
            return null;
        }
    }

    calculateAverageResponseTime(usage) {
        const validTimes = usage.filter(log => log.responseTime).map(log => log.responseTime);
        if (validTimes.length === 0) return 0;
        return (validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length).toFixed(0);
    }
}

// Export helper classes untuk digunakan di routes
module.exports.GeminiPromptManager = GeminiPromptManager;
module.exports.GeminiModelManager = GeminiModelManager;

module.exports = new GeminiStore();