// AI Predictor logic for Solo AI Mode using DoodleNet (345 Classes CNN)
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

const { SOLO_AI } = require('../../../shared/contract');

// Decision thresholds and the game-word → DoodleNet class mapping come from the shared contract (single source of truth)
const GAME_WORDS = Object.entries(SOLO_AI.GAME_WORDS).map(([word, className]) => ({ word, className }));

// Result shape (see shared/contract.js, SOLO_AI_PREDICTION_RESULT)
function emptyResult(targetWord, ready) {
  return { targetWord, ready, guess: null, confidence: 0, isConfident: false, top3: [], modelSees: null, isCorrect: false };
}

class AIPredictor {
  constructor() {
    this.MIN_GAME_SHARE = SOLO_AI.MIN_GAME_SHARE;
    this.MIN_RAW_PROB = SOLO_AI.MIN_RAW_PROB;
    this.model = null;
    this.isLoaded = false;
    this.modelDir = path.join(__dirname, '..', SOLO_AI.MODEL_DIR);
    this.classNames = [];
    this.gameWordMappings = [];

    // Backward compatibility for AI drawer mode
    this.presetDrawings = {
      'Apple': [
        { type: 'circle', x: 250, y: 250, radius: 80, color: '#fe0000' },
        { type: 'line', x1: 250, y1: 170, x2: 260, y2: 130, color: '#8b4513' },
        { type: 'path', points: [{x: 260, y: 145}, {x: 290, y: 135}, {x: 275, y: 155}], color: '#00b050' }
      ],
      'Sun': [
        { type: 'circle', x: 250, y: 250, radius: 60, color: '#ffde00' },
        { type: 'line', x1: 250, y1: 160, x2: 250, y2: 120, color: '#ff7900' },
        { type: 'line', x1: 250, y1: 340, x2: 250, y2: 380, color: '#ff7900' },
        { type: 'line', x1: 160, y1: 250, x2: 120, y2: 250, color: '#ff7900' },
        { type: 'line', x1: 340, y1: 250, x2: 380, y2: 250, color: '#ff7900' }
      ],
      'House': [
        { type: 'rect', x: 170, y: 220, width: 160, height: 140, color: '#8b4513' },
        { type: 'polygon', points: [{x: 150, y: 220}, {x: 250, y: 130}, {x: 350, y: 220}], color: '#fe0000' },
        { type: 'rect', x: 225, y: 280, width: 50, height: 80, color: '#002060' }
      ]
    };

    this.initModel();
  }

  /**
   * Load DoodleNet model and 345 class names
   */
  async initModel() {
    try {
      const modelJsonPath = path.join(this.modelDir, 'model.json');
      const binPath = path.join(this.modelDir, 'group1-shard1of1.bin');
      const classNamesPath = path.join(this.modelDir, 'class_names.txt');

      if (!fs.existsSync(modelJsonPath) || !fs.existsSync(binPath) || !fs.existsSync(classNamesPath)) {
        console.warn('[AI] ไม่พบไฟล์โมเดล DoodleNet ครบทั้ง 3 ไฟล์ใน server/src/ai_model/');
        return;
      }

      // Load 345 class names
      this.classNames = fs.readFileSync(classNamesPath, 'utf8')
        .split(/\r?\n/)
        .map(s => s.trim())
        .filter(Boolean);

      // Map the 19 game words to indices in the 345 class array
      this.gameWordMappings = GAME_WORDS.map(gw => {
        const target = gw.className.toLowerCase();
        const idx = this.classNames.findIndex(c => c.toLowerCase() === target);
        return {
          word: gw.word,
          className: gw.className,
          classIndex: idx
        };
      }).filter(gw => gw.classIndex !== -1);

      // Load model via pure JS Memory IO Handler
      const modelJson = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));
      const binData = fs.readFileSync(binPath);
      const arrayBuffer = binData.buffer.slice(binData.byteOffset, binData.byteOffset + binData.byteLength);

      this.model = await tf.loadLayersModel(tf.io.fromMemory({
        modelTopology: modelJson.modelTopology,
        weightSpecs: modelJson.weightsManifest[0].weights,
        weightData: arrayBuffer
      }));

      // Warm up model
      tf.tidy(() => {
        const dummy = tf.zeros([1, 28, 28, 1]);
        this.model.predict(dummy);
      });

      this.isLoaded = true;
      console.log(`[AI] โหลด DoodleNet สำเร็จ: ${this.classNames.length} หมวด, ใช้ในเกม ${this.gameWordMappings.length} คำ`);
    } catch (err) {
      console.error('[AI] ล้มเหลวในการโหลด DoodleNet:', err.message);
      this.isLoaded = false;
    }
  }

  /**
   * Predict user drawing from 784 normalized pixel values (0.0 to 1.0).
   * Never guesses randomly: if the model is not ready (or prediction fails) the result has ready=false and isCorrect=false.
   * @param {string} targetWord Current target word (server's room.currentWord)
   * @param {Array<number>} pixels Array of SOLO_AI.PIXEL_COUNT numbers
   */
  async predictUserDrawing(targetWord, pixels) {
    if (!this.isLoaded || !this.model) {
      return emptyResult(targetWord, false);
    }
    if (!pixels || !Array.isArray(pixels) || pixels.length !== SOLO_AI.PIXEL_COUNT) {
      return emptyResult(targetWord, true);
    }

    // Nothing drawn yet
    const activePixels = pixels.filter(p => p > 0.05).length;
    if (activePixels < SOLO_AI.MIN_INK) {
      return emptyResult(targetWord, true);
    }

    try {
      const size = SOLO_AI.IMAGE_SIZE;
      const probabilities = tf.tidy(() => {
        const tensor = tf.tensor4d(pixels, [1, size, size, 1], 'float32');
        const output = this.model.predict(tensor);
        return Array.from(output.dataSync());
      });

      // Top prediction across all 345 categories (what the model "sees")
      let globalTopIndex = 0;
      let globalTopProb = 0;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > globalTopProb) {
          globalTopProb = probabilities[i];
          globalTopIndex = i;
        }
      }
      const rawGlobalName = this.classNames[globalTopIndex] || 'unknown';

      // Rank only the game words and compute each word's share among them
      const gameRankings = this.gameWordMappings.map(gw => ({ word: gw.word, rawProb: probabilities[gw.classIndex] || 0 }));
      const sumGameProb = gameRankings.reduce((sum, item) => sum + item.rawProb, 0);
      gameRankings.forEach(item => { item.gameShare = sumGameProb > 0 ? (item.rawProb / sumGameProb) : 0; });
      gameRankings.sort((a, b) => b.rawProb - a.rawProb);

      const top = gameRankings[0];
      // A9: below MIN_RAW_PROB the model is not confident about any game word
      const isConfident = top.rawProb >= this.MIN_RAW_PROB;
      const isCorrect = isConfident && top.word === targetWord && top.gameShare >= this.MIN_GAME_SHARE;

      return {
        targetWord,
        ready: true,
        guess: top.word,
        confidence: Math.round(top.gameShare * 100),
        isConfident,
        top3: gameRankings.slice(0, 3).map(r => ({ label: r.word, confidence: Math.round(r.gameShare * 100) })),
        modelSees: { label: rawGlobalName.replace(/_/g, ' '), confidence: Math.round(globalTopProb * 100) },
        isCorrect
      };
    } catch (err) {
      console.error('[AI] Prediction error:', err.message);
      return emptyResult(targetWord, false);
    }
  }

  getAIDrawingStrokes(word) {
    return this.presetDrawings[word] || [
      { type: 'circle', x: 250, y: 250, radius: 70, color: '#000000' },
      { type: 'line', x1: 200, y1: 200, x2: 300, y2: 300, color: '#000000' }
    ];
  }
}

module.exports = new AIPredictor();
