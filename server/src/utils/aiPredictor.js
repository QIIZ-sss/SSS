// AI Predictor logic for Solo AI Mode using DoodleNet (345 Classes CNN)
const tf = require('@tensorflow/tfjs');
const fs = require('fs');
const path = require('path');

// ==============================================================================
// Configuration & Decision Thresholds
// ==============================================================================
// ส่วนแบ่งในกลุ่ม 19 คำของเกม ต้องไม่ต่ำกว่า 50%
const MIN_GAME_SHARE = 0.50;

// ความน่าจะเป็นดิบจาก 345 หมวด ต้องไม่ต่ำกว่า 10% เพื่อกันวาดมั่วแล้วบังเอิญถูก
const MIN_RAW_PROB = 0.10;

// 19 Game Words mapped to DoodleNet 345 classes
const GAME_WORDS = [
  { word: 'Airplane', className: 'airplane' },
  { word: 'Apple', className: 'apple' },
  { word: 'Basketball', className: 'basketball' },
  { word: 'Bicycle', className: 'bicycle' },
  { word: 'Car', className: 'car' },
  { word: 'Cat', className: 'cat' },
  { word: 'Clock', className: 'clock' },
  { word: 'Computer', className: 'computer' },
  { word: 'Dragon', className: 'dragon' },
  { word: 'Eiffel Tower', className: 'The_Eiffel_Tower' },
  { word: 'Elephant', className: 'elephant' },
  { word: 'Guitar', className: 'guitar' },
  { word: 'Helicopter', className: 'helicopter' },
  { word: 'House', className: 'house' },
  { word: 'Pizza', className: 'pizza' },
  { word: 'Rainbow', className: 'rainbow' },
  { word: 'Submarine', className: 'submarine' },
  { word: 'Sun', className: 'sun' },
  { word: 'Tree', className: 'tree' }
];

class AIPredictor {
  constructor() {
    this.MIN_GAME_SHARE = MIN_GAME_SHARE;
    this.MIN_RAW_PROB = MIN_RAW_PROB;
    this.model = null;
    this.isLoaded = false;
    this.modelDir = path.join(__dirname, '../ai_model');
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
   * Predict user drawing from 784 normalized pixel values (0.0 to 1.0)
   * @param {string} targetWord Current target word
   * @param {Array<number>} pixels Array of 784 numbers
   */
  async predictUserDrawing(targetWord, pixels) {
    if (!pixels || !Array.isArray(pixels) || pixels.length !== 784) {
      return {
        guess: 'Waiting for strokes...',
        confidence: 0,
        rawConfidence: 0,
        globalGuess: 'None',
        globalConfidence: 0,
        isCorrect: false,
        topGuesses: []
      };
    }

    // Check if drawing has any stroke activity
    const activePixels = pixels.filter(p => p > 0.05).length;
    if (activePixels < 5) {
      return {
        guess: 'Waiting for strokes...',
        confidence: 0,
        rawConfidence: 0,
        globalGuess: 'Empty canvas',
        globalConfidence: 0,
        isCorrect: false,
        topGuesses: []
      };
    }

    if (!this.isLoaded || !this.model) {
      return this.heuristicFallback(targetWord, activePixels);
    }

    try {
      const probabilities = tf.tidy(() => {
        const tensor = tf.tensor4d(pixels, [1, 28, 28, 1], 'float32');
        const output = this.model.predict(tensor);
        return Array.from(output.dataSync());
      });

      // 1. Find global top prediction across all 345 categories
      let globalTopIndex = 0;
      let globalTopProb = 0;
      for (let i = 0; i < probabilities.length; i++) {
        if (probabilities[i] > globalTopProb) {
          globalTopProb = probabilities[i];
          globalTopIndex = i;
        }
      }
      const rawGlobalName = this.classNames[globalTopIndex] || 'unknown';
      const globalGuess = rawGlobalName.replace(/_/g, ' ');
      const globalConfidence = Math.round(globalTopProb * 100);

      // 2. Filter down to the 19 game words and calculate relative share
      const gameRankings = this.gameWordMappings.map(gw => {
        const rawProb = probabilities[gw.classIndex] || 0;
        return {
          word: gw.word,
          className: gw.className,
          rawProb: rawProb
        };
      });

      const sumGameProb = gameRankings.reduce((sum, item) => sum + item.rawProb, 0);

      gameRankings.forEach(item => {
        item.gameShare = sumGameProb > 0 ? (item.rawProb / sumGameProb) : 0;
      });

      // Sort by probability descending
      gameRankings.sort((a, b) => b.rawProb - a.rawProb);

      const topGame = gameRankings[0];
      const topWord = topGame.word;
      const topGameShare = topGame.gameShare;
      const topRawProb = topGame.rawProb;
      const confidence = Math.round(topGameShare * 100);
      const rawConfidence = Math.round(topRawProb * 100);

      // 3. Decision Logic:
      // - Target word must be rank 1 among game words
      // - Game share >= MIN_GAME_SHARE (50%)
      // - Raw prob among all 345 classes >= MIN_RAW_PROB (10%)
      const cleanTarget = (targetWord || '').toLowerCase().trim();
      const cleanTop = topWord.toLowerCase().trim();

      const isTargetTopOne = (cleanTop === cleanTarget) ||
        (cleanTarget.includes('eiffel') && cleanTop.includes('eiffel'));

      const isCorrect = isTargetTopOne &&
        (topGameShare >= this.MIN_GAME_SHARE) &&
        (topRawProb >= this.MIN_RAW_PROB);

      return {
        guess: topWord,
        confidence: confidence,
        rawConfidence: rawConfidence,
        globalGuess: globalGuess,
        globalConfidence: globalConfidence,
        isCorrect: isCorrect,
        topGuesses: gameRankings.slice(0, 5).map(r => ({
          label: r.word,
          confidence: Math.round(r.gameShare * 100),
          rawConfidence: Math.round(r.rawProb * 100)
        }))
      };
    } catch (err) {
      console.error('[AI] Prediction error:', err.message);
      return this.heuristicFallback(targetWord, activePixels);
    }
  }

  /**
   * Fallback if model is not yet loaded
   */
  heuristicFallback(targetWord, activePixels) {
    const confidence = Math.min(95, Math.floor(20 + activePixels * 0.4));
    const isCorrect = activePixels > 40 && Math.random() > 0.4;
    const wordList = this.gameWordMappings.map(g => g.word);
    const guess = isCorrect ? targetWord : (wordList[Math.floor(Math.random() * wordList.length)] || targetWord);

    return {
      guess: guess,
      confidence: confidence,
      rawConfidence: Math.round(confidence * 0.3),
      globalGuess: guess.toLowerCase(),
      globalConfidence: confidence,
      isCorrect: isCorrect && (guess.toLowerCase() === (targetWord || '').toLowerCase()),
      topGuesses: [{ label: guess, confidence: confidence, rawConfidence: Math.round(confidence * 0.3) }]
    };
  }

  getAIDrawingStrokes(word) {
    return this.presetDrawings[word] || [
      { type: 'circle', x: 250, y: 250, radius: 70, color: '#000000' },
      { type: 'line', x1: 200, y1: 200, x2: 300, y2: 300, color: '#000000' }
    ];
  }
}

module.exports = new AIPredictor();
