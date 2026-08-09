import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Initialize Gemini client lazily or when endpoint is invoked
  const getGenAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not configured.');
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Route for AI Question Generation
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const { topic, mapelName, className, count = 5 } = req.body;

      if (!topic) {
        return res.status(400).json({ error: 'Topik/Materi pembelajaran wajib diisi.' });
      }

      const ai = getGenAI();

      const prompt = `Buatkan ${count} soal pilihan ganda (5 opsi: A, B, C, D, E) untuk tingkat Madrasah Aliyah / SMA.
Mata Pelajaran: ${mapelName || 'Umum'}
Kelas/Tingkat: ${className || 'Aliyah'}
Topik/Materi: ${topic}

Persyaratan:
1. Setiap soal harus memiliki pertanyaan yang jelas, bernilai edukatif, dan sesuai kurikulum madrasah/SMA.
2. Setiap soal HARUS memiliki 5 opsi pilihan jawaban (A, B, C, D, E).
3. Tentukan 1 kunci jawaban yang benar (A, B, C, D, atau E).
4. Berikan bobot nilai (default 20 untuk setiap soal).
5. Bahasa Indonesia yang baku dan baik.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.6-flash',
        contents: prompt,
        config: {
          systemInstruction:
            'Anda adalah pembuat soal ujian profesional untuk madrasah aliyah/SMA. Buatkan soal pilihan ganda berkualitas tinggi beserta opsi A-E dan kunci jawaban yang tepat.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            description: 'Daftar soal pilihan ganda yang dihasilkan',
            items: {
              type: Type.OBJECT,
              properties: {
                pertanyaan: {
                  type: Type.STRING,
                  description: 'Teks pertanyaan atau soal',
                },
                opsi: {
                  type: Type.ARRAY,
                  description: 'Daftar 5 pilihan jawaban (A, B, C, D, E)',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      key: {
                        type: Type.STRING,
                        description: 'Huruf opsi: A, B, C, D, atau E',
                      },
                      text: {
                        type: Type.STRING,
                        description: 'Teks isi pilihan jawaban',
                      },
                    },
                    required: ['key', 'text'],
                  },
                },
                kunciJawaban: {
                  type: Type.STRING,
                  description: 'Huruf kunci jawaban benar: A, B, C, D, atau E',
                },
                bobot: {
                  type: Type.NUMBER,
                  description: 'Bobot skor nilai',
                },
              },
              required: ['pertanyaan', 'opsi', 'kunciJawaban'],
            },
          },
        },
      });

      const responseText = response.text || '[]';
      const questions = JSON.parse(responseText);

      return res.json({ success: true, questions });
    } catch (err: any) {
      console.error('Gemini Generation Error:', err);
      return res.status(500).json({
        error: err.message || 'Gagal menghasilkan soal otomatis menggunakan Gemini AI.',
      });
    }
  });

  // Vite Middleware in Dev
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
