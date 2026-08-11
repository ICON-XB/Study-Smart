// REGISTER SERVICE WORKER FOR OFFLINE PWA CAPABILITIES
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registered successfully.', reg.scope))
      .catch(err => console.log('Service Worker registration failed: ', err));
  });
}

// ==========================================
// SAFE SANITIZE HELPER
// Wraps SecurityManager.sanitizeText() — works even before security init.
// Use for every user-supplied string inserted into innerHTML.
// ==========================================
function san(str) {
  if (typeof SecurityManager !== 'undefined' && SecurityManager.sanitizeText) {
    return SecurityManager.sanitizeText(String(str ?? ''));
  }
  // Fallback: manual HTML entity encoding
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ==========================================
const STORE_KEYS = {
  MODULES: 'studysmart_modules',
  FLASHCARDS: 'studysmart_flashcards',
  SESSIONS: 'studysmart_sessions',
  STREAK: 'studysmart_streak',
  SETTINGS: 'studysmart_settings',
  SCHEDULE: 'studysmart_schedule'
};

let appState = {
  modules: [],
  flashcards: [],
  sessions: [],
  streak: { count: 0, lastStudyDate: '' },
  settings: {
    weekdayHours: 3,
    weekendHours: 5,
    startDate: '',
    prioritizeBy: 'exam-proximity'
  },
  schedule: []
};

// ==========================================
// ONBOARDING MOCK DATA
// ==========================================
const MOCK_MODULES = [
  {
    id: 'm-1',
    code: 'CS102',
    name: 'Data Structures & Algorithms',
    examDate: '2026-06-12',
    difficulty: 'hard',
    color: '#8b5cf6',
    topics: [
      { id: 't-1-1', name: 'Big O Notation & Complexity', state: 'mastered' },
      { id: 't-1-2', name: 'Arrays & Linked Lists', state: 'mastered' },
      { id: 't-1-3', name: 'Stacks, Queues & Hash Tables', state: 'reviewing' },
      { id: 't-1-4', name: 'Binary Trees & BST Search', state: 'not-started' },
      { id: 't-1-5', name: 'Sorting & Searching Algorithms', state: 'not-started' },
      { id: 't-1-6', name: 'Graph Traversals (BFS & DFS)', state: 'not-started' }
    ]
  },
  {
    id: 'm-2',
    code: 'MTH202',
    name: 'Linear Algebra',
    examDate: '2026-06-18',
    difficulty: 'medium',
    color: '#3b82f6',
    topics: [
      { id: 't-2-1', name: 'Matrices & System of Equations', state: 'mastered' },
      { id: 't-2-2', name: 'Determinants & Cramer Rule', state: 'reviewing' },
      { id: 't-2-3', name: 'Vector Spaces & Subspaces', state: 'not-started' },
      { id: 't-2-4', name: 'Eigenvalues & Eigenvectors', state: 'not-started' },
      { id: 't-2-5', name: 'Linear Transformations', state: 'not-started' }
    ]
  },
  {
    id: 'm-3',
    code: 'PSY101',
    name: 'Introduction to Psychology',
    examDate: '2026-06-25',
    difficulty: 'easy',
    color: '#10b981',
    topics: [
      { id: 't-3-1', name: 'History & Research Methods', state: 'mastered' },
      { id: 't-3-2', name: 'Biological Bases of Behavior', state: 'reviewing' },
      { id: 't-3-3', name: 'Sensation & Perception', state: 'not-started' },
      { id: 't-3-4', name: 'Memory & Cognitive Learning', state: 'not-started' }
    ]
  }
];

const MOCK_FLASHCARDS = [
  { id: 'c-1', moduleId: 'm-1', front: 'What is the worst-case time complexity of inserting into a Binary Search Tree (BST)?', back: 'O(n) - This occurs when the tree becomes unbalanced (skewed) and behaves like a linked list.', box: 1, nextReviewDate: '2026-05-27' },
  { id: 'c-2', moduleId: 'm-1', front: 'Describe the main difference between Stack and Queue data structures.', back: 'Stack is LIFO (Last In First Out) where elements are added/removed from the top. Queue is FIFO (First In First Out) where elements are added at the rear and removed from the front.', box: 2, nextReviewDate: '2026-05-27' },
  { id: 'c-3', moduleId: 'm-2', front: 'What conditions make a set of vectors a Vector Space?', back: 'It must be closed under vector addition and scalar multiplication, and satisfy 8 axioms (associativity, commutativity, identity, invertibility, etc.).', box: 1, nextReviewDate: '2026-05-27' },
  { id: 'c-4', moduleId: 'm-3', front: 'Who is known as the father of modern psychoanalysis?', back: 'Sigmund Freud. He developed theories of the unconscious mind and the id, ego, and superego.', box: 3, nextReviewDate: '2026-05-29' }
];

// Load application state
async function loadState() {
  try {
    appState.modules = await SecureStore.load(STORE_KEYS.MODULES) || [];
    appState.flashcards = await SecureStore.load(STORE_KEYS.FLASHCARDS) || [];
    appState.sessions = await SecureStore.load(STORE_KEYS.SESSIONS) || [];
    appState.streak = await SecureStore.load(STORE_KEYS.STREAK) || { count: 0, lastStudyDate: '' };
    appState.settings = await SecureStore.load(STORE_KEYS.SETTINGS) || {
      weekdayHours: 3,
      weekendHours: 5,
      startDate: new Date().toISOString().split('T')[0],
      prioritizeBy: 'exam-proximity'
    };
    appState.schedule = await SecureStore.load(STORE_KEYS.SCHEDULE) || [];
    
    // Seed mock data if completely empty
    if (appState.modules.length === 0) {
      appState.modules = MOCK_MODULES;
      appState.flashcards = MOCK_FLASHCARDS;
      await saveState();
    }
  } catch (e) {
    console.error('Error loading state from SecureStore:', e);
  }
}

async function saveState() {
  await SecureStore.save(STORE_KEYS.MODULES, appState.modules);
  await SecureStore.save(STORE_KEYS.FLASHCARDS, appState.flashcards);
  await SecureStore.save(STORE_KEYS.SESSIONS, appState.sessions);
  await SecureStore.save(STORE_KEYS.STREAK, appState.streak);
  await SecureStore.save(STORE_KEYS.SETTINGS, appState.settings);
  await SecureStore.save(STORE_KEYS.SCHEDULE, appState.schedule);
}

// ==========================================
// DYNAMIC AUDIO SYNTHESIS MODULE (OFFLINE)
// ==========================================
let audioCtx = null;
let ambientNodes = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// Alarm sounds
function playAlarm(type) {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    if (type === 'digital') {
      // High pitched double beep
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.setValueAtTime(0.15, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
      
      osc.start(now);
      osc.stop(now + 0.5);
      
      setTimeout(() => {
        playAlarm('digital-single');
      }, 300);
    } else if (type === 'digital-single') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
      gainNode.gain.setValueAtTime(0.15, now + 0.15);
      gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'chime') {
      // Overlapping sine waves for a relaxing chime
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5);
      
      const osc2 = audioCtx.createOscillator();
      const gainNode2 = audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now); // A5
      gainNode2.gain.setValueAtTime(0.1, now);
      gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
      
      osc2.connect(gainNode2);
      gainNode2.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 2.0);
      osc2.start(now);
      osc2.stop(now + 2.0);
    } else if (type === 'bell') {
      // Deep resonant bell
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      gainNode.gain.setValueAtTime(0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
      
      const oscPartials = [440, 660, 880];
      oscPartials.forEach((freq, idx) => {
        const pOsc = audioCtx.createOscillator();
        const pGain = audioCtx.createGain();
        pOsc.type = 'sine';
        pOsc.frequency.setValueAtTime(freq, now);
        pGain.gain.setValueAtTime(0.08 / (idx + 1), now);
        pGain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        pOsc.connect(pGain);
        pGain.connect(audioCtx.destination);
        pOsc.start(now);
        pOsc.stop(now + 2.5);
      });
      
      osc.start(now);
      osc.stop(now + 3.0);
    }
  } catch (e) {
    console.error('Audio synthesis failed:', e);
  }
}

// Ambient sounds generator
function stopAmbient() {
  if (ambientNodes) {
    ambientNodes.forEach(node => {
      try { node.stop(); } catch(e) {}
    });
    ambientNodes = null;
  }
}

function playAmbient(type) {
  stopAmbient();
  if (type === 'silent') return;
  
  try {
    initAudio();
    ambientNodes = [];
    
    const bufferSize = 2 * audioCtx.sampleRate;
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    
    // Fill the buffer with white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    
    const whiteNoise = audioCtx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;
    
    if (type === 'white') {
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
      filter.Q.setValueAtTime(1, audioCtx.currentTime);
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.015, audioCtx.currentTime);
      
      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      whiteNoise.start();
      ambientNodes.push(whiteNoise);
    } else if (type === 'rain') {
      // Lowpass filtered noise with volume modulation to simulate drops
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, audioCtx.currentTime);
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.03, audioCtx.currentTime);
      
      // Auto volume oscillation
      const osc = audioCtx.createOscillator();
      osc.frequency.value = 0.25; // 0.25Hz cycle
      
      const oscGain = audioCtx.createGain();
      oscGain.gain.value = 0.015;
      
      osc.connect(oscGain);
      oscGain.connect(gainNode.gain);
      
      whiteNoise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      whiteNoise.start();
      osc.start();
      ambientNodes.push(whiteNoise);
      ambientNodes.push(osc);
    } else if (type === 'lofi') {
      // Soft synthetic chord loop
      const chord = [130.81, 164.81, 196.00, 246.94]; // C3 Major 7 chord
      chord.forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        // Tremolo
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 3 + idx;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.005;
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        
        gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        lfo.start();
        ambientNodes.push(osc);
        ambientNodes.push(lfo);
      });
    }
  } catch (e) {
    console.error('Ambient audio setup failed:', e);
  }
}

// ==========================================
// SMART CURRICULUM SYLLABUS PARSER
// ==========================================
function parseSyllabus(text) {
  const lines = text.split('\n');
  const modules = [];
  
  // High-performance patterns
  // Pattern 1: [Module Code, Name, Semester/Term, Description]
  // Pattern example: "CS-101 Introduction to Computers (Sem 1)"
  const codeRegex = /\b([A-Z]{2,4})[- ]?(\d{3,4})([A-Z]{0,2})?\b/i;
  
  lines.forEach((line) => {
    line = line.trim();
    if (!line || line.length < 6) return;
    
    // strip HTML tags
    const cleanLine = line.replace(/<\/?[^>]+(>|$)/g, "");
    const match = cleanLine.match(codeRegex);
    
    if (match) {
      const code = match[0].toUpperCase();
      let rawTitle = cleanLine.replace(match[0], "").trim();
      
      // Clean up common separators at start of title
      rawTitle = rawTitle.replace(/^[ :\-|()*,]+/g, "").trim();
      
      // Look for Semester/Term keywords
      let semester = 1;
      const semMatch = rawTitle.match(/\b(sem|semester|term|year|block)\s*(\d)\b/i);
      if (semMatch) {
        semester = parseInt(semMatch[2]);
        rawTitle = rawTitle.replace(semMatch[0], "").trim();
      }
      
      // Clean trailing parentheses or tags
      rawTitle = rawTitle.replace(/^[ :\-|()*,]+/g, "").replace(/[ :\-|()*,]+$/g, "").trim();
      
      // If code & title looks valid
      if (rawTitle.length > 2) {
        const defaultTopics = [
          "1. Intro & Fundamentals",
          "2. Theoretical Foundation",
          "3. Midterm Review & Problem Set",
          "4. Practical Lab / Case Studies",
          "5. Final Review & Practice Exams"
        ];
        
        // Prevent duplicate codes in the same parsed results
        if (!modules.some(m => m.code === code)) {
          modules.push({
            code,
            name: rawTitle,
            semester,
            difficulty: 'medium',
            topics: defaultTopics
          });
        }
      }
    } else {
      // Fallback: If line contains terms resembling standard college classes
      const keywordRegex = /\b(Calculus|Algebra|Physics|Chemistry|Biology|Accounting|Economics|Philosophy|History|Psychology|Law|Sociology|Computing|Systems|Mechanics)\s?([I|V|\d]{1,3})?\b/i;
      const classMatch = cleanLine.match(keywordRegex);
      if (classMatch && cleanLine.length < 50 && !cleanLine.match(/\b(syllabus|handbook|university|degree|curriculum|program|faculty)\b/i)) {
        const generatedCode = classMatch[1].substring(0,3).toUpperCase() + Math.floor(100 + Math.random()*900);
        const name = cleanLine.replace(/^[ :\-|()*,]+/g, "").replace(/[ :\-|()*,]+$/g, "").trim();
        const defaultTopics = [
          "1. Key Foundations & Core Readings",
          "2. Theoretical Models & Calculations",
          "3. Intermediate Practice Work",
          "4. Core Themes & Arguments Review",
          "5. Exam Review & Sample Assessment"
        ];
        modules.push({
          code: generatedCode,
          name,
          semester: 1,
          difficulty: 'medium',
          topics: defaultTopics
        });
      }
    }
  });
  
  return modules;
}

// Preloaded Curriculum templates — Namibian & Top African Universities
const CURRICULUM_TEMPLATES = {

  // ===================== NAMIBIA — NUST =====================
  nust_it: [
    { code: 'ITA101', name: 'Introduction to Information Technology', semester: 1, difficulty: 'easy', topics: ['History & Evolution of IT', 'Hardware Components & Architecture', 'Software Types & OS Concepts', 'Introduction to Networks', 'Cyber Safety & Ethics'] },
    { code: 'PRG101', name: 'Programming Fundamentals', semester: 1, difficulty: 'medium', topics: ['Variables, Data Types & Operators', 'Selection & Looping Structures', 'Functions & Recursion', 'Arrays & String Manipulation', 'Basic File I/O'] },
    { code: 'MTH121', name: 'Mathematics for Engineers I', semester: 1, difficulty: 'hard', topics: ['Algebra & Trigonometry Review', 'Functions & Limits', 'Differential Calculus', 'Integral Calculus', 'Series & Sequences'] },
    { code: 'NET201', name: 'Computer Networks & Communications', semester: 2, difficulty: 'medium', topics: ['OSI & TCP/IP Reference Models', 'IP Addressing & Subnetting', 'Routing & Switching Concepts', 'Wireless & Network Security', 'Network Troubleshooting Tools'] },
    { code: 'DSA202', name: 'Data Structures & Algorithms', semester: 2, difficulty: 'hard', topics: ['Arrays, Stacks & Queues', 'Linked Lists & Trees', 'Hashing & Hash Tables', 'Sorting Algorithms', 'Graph Algorithms & Pathfinding'] },
    { code: 'DBM301', name: 'Database Management Systems', semester: 3, difficulty: 'medium', topics: ['Relational Model & ER Diagrams', 'SQL DDL & DML Commands', 'Normalization (1NF-3NF)', 'Transactions & ACID Properties', 'NoSQL Introduction'] },
    { code: 'SWE302', name: 'Software Engineering Principles', semester: 3, difficulty: 'medium', topics: ['SDLC Models (Waterfall, Agile)', 'Requirements Engineering', 'System Design & UML Diagrams', 'Software Testing Strategies', 'Project Management Basics'] }
  ],
  nust_eng: [
    { code: 'ENG111', name: 'Engineering Mathematics I', semester: 1, difficulty: 'hard', topics: ['Complex Numbers & Vectors', 'Matrices & Linear Systems', 'Differential Calculus', 'Integral Calculus Techniques', 'Laplace Transforms'] },
    { code: 'PHY101', name: 'Engineering Physics', semester: 1, difficulty: 'medium', topics: ['Mechanics & Kinematics', 'Thermodynamics & Heat Transfer', 'Waves & Optics', 'Electricity & Magnetism', 'Modern Physics Principles'] },
    { code: 'EEL201', name: 'Electrical Circuits I', semester: 2, difficulty: 'hard', topics: ["Ohm's Law & Kirchhoff's Laws", 'DC Circuit Analysis', 'Capacitors & Inductors', 'AC Circuit Steady State', 'Power & Energy in Circuits'] },
    { code: 'MEC201', name: 'Mechanics of Materials', semester: 2, difficulty: 'hard', topics: ['Stress & Strain Concepts', 'Axial Load & Torsion', 'Bending of Beams', 'Deflection of Beams', 'Buckling & Stability'] },
    { code: 'THD301', name: 'Thermodynamics II', semester: 3, difficulty: 'hard', topics: ['Laws of Thermodynamics', 'Power Cycles (Rankine, Brayton)', 'Refrigeration Cycles', 'Combustion Analysis', 'Heat Exchanger Design'] }
  ],
  nust_biz: [
    { code: 'BMG101', name: 'Principles of Management', semester: 1, difficulty: 'easy', topics: ['Management Functions & Roles', 'Planning & Decision Making', 'Organisational Design', 'Leadership Theories', 'Control & Performance'] },
    { code: 'ACC101', name: 'Financial Accounting I', semester: 1, difficulty: 'medium', topics: ['Accounting Equation & Concepts', 'Double-Entry Bookkeeping', 'Trial Balance & Adjustments', 'Income Statement Preparation', 'Balance Sheet Analysis'] },
    { code: 'MKT201', name: 'Marketing Management', semester: 2, difficulty: 'easy', topics: ['The Marketing Mix (4 Ps)', 'Consumer Behaviour & Segmentation', 'Market Research Methods', 'Branding & Positioning Strategies', 'Digital & Social Media Marketing'] },
    { code: 'FIN301', name: 'Corporate Finance', semester: 3, difficulty: 'hard', topics: ['Time Value of Money', 'Capital Budgeting Techniques', 'Cost of Capital & WACC', 'Capital Structure Decisions', 'Dividend Policy Analysis'] },
    { code: 'HRM302', name: 'Human Resource Management', semester: 3, difficulty: 'easy', topics: ['HR Planning & Job Analysis', 'Recruitment & Selection', 'Training & Development', 'Performance Appraisal Systems', 'Labour Law & Employee Relations'] }
  ],

  // ===================== NAMIBIA — UNAM =====================
  unam_science: [
    { code: 'BIO1511', name: 'Biology I', semester: 1, difficulty: 'medium', topics: ['Cell Structure & Organelles', 'Biomolecules (Proteins, Lipids, DNA)', 'Photosynthesis & Cellular Respiration', 'Genetics & Heredity', 'Evolution & Natural Selection'] },
    { code: 'CHM1511', name: 'Chemistry I', semester: 1, difficulty: 'medium', topics: ['Atomic Theory & Periodic Trends', 'Chemical Bonding & Polarity', 'Stoichiometry & Reactions', 'States of Matter & Gas Laws', 'Acids, Bases & Equilibrium'] },
    { code: 'PHY1511', name: 'Physics I', semester: 1, difficulty: 'hard', topics: ["Kinematics & Newton's Laws", 'Work, Energy & Momentum', 'Rotational Motion & Torque', 'Waves, Sound & Light', 'Basic Electrostatics'] },
    { code: 'MAT1511', name: 'Calculus & Analysis I', semester: 1, difficulty: 'hard', topics: ['Limits & Continuity', 'Differentiation Rules & Applications', 'Integration Techniques', 'Sequences & Series', 'Multivariable Calculus Intro'] },
    { code: 'BIO2511', name: 'Microbiology', semester: 2, difficulty: 'medium', topics: ['Bacterial Cell Structure', 'Microbial Growth & Metabolism', 'Virology & Epidemiology', 'Antimicrobials & Resistance', 'Immunology Basics'] }
  ],
  unam_law: [
    { code: 'LWN1501', name: 'Introduction to Law', semester: 1, difficulty: 'easy', topics: ['Nature & Sources of Law', 'The Namibian Legal System', 'Court Structure & Jurisdiction', 'Statutory Interpretation', 'Common Law vs Customary Law'] },
    { code: 'LWN2501', name: 'Constitutional Law of Namibia', semester: 2, difficulty: 'medium', topics: ['History of the Namibian Constitution', 'Chapter 3: Fundamental Rights & Freedoms', 'Separation of Powers', 'Role of the Judiciary', 'Constitutional Court Litigation'] },
    { code: 'LWN2502', name: 'Law of Delict', semester: 2, difficulty: 'medium', topics: ['Elements of Delictual Liability', 'Wrongfulness & Negligence', 'Causation Standards', 'Pure Economic Loss', 'Defences & Remedies'] },
    { code: 'LWN3501', name: 'Criminal Law & Procedure', semester: 3, difficulty: 'hard', topics: ['Actus Reus & Mens Rea', 'Specific Intent Offences', 'Defences (Necessity, Provocation)', 'Criminal Procedure Act', 'Sentencing Principles'] },
    { code: 'LWN3502', name: 'Law of Contract', semester: 3, difficulty: 'medium', topics: ['Formation Requirements', 'Offer, Acceptance & Consensus', 'Breach Types & Remedies', 'Void vs Voidable Agreements', 'Specific Performance & Damages'] }
  ],
  unam_econ: [
    { code: 'ECO1501', name: 'Introduction to Economics', semester: 1, difficulty: 'easy', topics: ['Microeconomics vs Macroeconomics', 'Supply, Demand & Market Equilibrium', 'Elasticity Concepts', 'Consumer Theory & Utility', 'Producer Theory & Costs'] },
    { code: 'ECO2501', name: 'Intermediate Microeconomics', semester: 2, difficulty: 'medium', topics: ['Indifference Curves & Budget Constraints', 'Production Functions & Isoquants', 'Market Structures (Perfect, Monopoly, Oligopoly)', 'Game Theory Basics', 'General Equilibrium Analysis'] },
    { code: 'ECO2502', name: 'Intermediate Macroeconomics', semester: 2, difficulty: 'medium', topics: ['National Income Accounting', 'IS-LM Model', 'Aggregate Demand & Supply', 'Inflation & Unemployment (Phillips Curve)', 'Open Economy Macroeconomics'] },
    { code: 'ECO3501', name: 'Development Economics', semester: 3, difficulty: 'medium', topics: ['Poverty, Inequality & Measurement', 'Growth Theories & Models', 'Structural Transformation in Africa', 'Foreign Aid & FDI Debates', "Namibia's Development Challenges"] },
    { code: 'STA2501', name: 'Economic Statistics & Econometrics', semester: 2, difficulty: 'hard', topics: ['Descriptive Statistics & Probability', 'Sampling & Hypothesis Testing', 'Simple Linear Regression', 'Multiple Regression Analysis', 'Time Series & Forecasting'] }
  ],

  // ===================== NAMIBIA — IUM =====================
  ium_business: [
    { code: 'IUM101', name: 'Business Communication', semester: 1, difficulty: 'easy', topics: ['Effective Written Communication', 'Oral Presentation Techniques', 'Report Writing Standards', 'Intercultural Communication', 'Digital Business Communication'] },
    { code: 'IUM102', name: 'Introduction to Business', semester: 1, difficulty: 'easy', topics: ['Forms & Types of Business', 'The Business Environment', 'Entrepreneurship Principles', 'Ethical Business Conduct', 'SME Development in Namibia'] },
    { code: 'IUM201', name: 'Principles of Accounting', semester: 1, difficulty: 'medium', topics: ['Accounting Concepts & Assumptions', 'Double-Entry System', 'Journals, Ledgers & Trial Balance', 'Depreciation & Inventory', 'Financial Statements Preparation'] },
    { code: 'IUM202', name: 'Business Law', semester: 2, difficulty: 'medium', topics: ['Nature of Business Law', 'Law of Contract Essentials', 'Company Law & Corporate Governance', 'Employment Legislation', 'Intellectual Property Basics'] },
    { code: 'IUM301', name: 'Strategic Management', semester: 3, difficulty: 'hard', topics: ["Environmental Scanning (PESTLE & SWOT)", "Competitive Strategy (Porter's 5 Forces)", 'Generic Business Strategies', 'Strategy Implementation & Change', 'Performance Monitoring & Balanced Scorecard'] },
    { code: 'IUM302', name: 'Entrepreneurship & Innovation', semester: 3, difficulty: 'medium', topics: ['The Entrepreneurial Mindset', 'Business Plan Development', 'Funding & Venture Capital', 'Innovation & Disruptive Technology', 'Startup Ecosystem in Africa'] }
  ],
  ium_ict: [
    { code: 'ICT101', name: 'Introduction to Computing', semester: 1, difficulty: 'easy', topics: ['Computer Hardware & Software', 'Operating Systems Overview', 'Internet & Cloud Services', 'Information Systems in Business', 'Cybersecurity Awareness'] },
    { code: 'ICT201', name: 'Networking Fundamentals', semester: 2, difficulty: 'medium', topics: ['Network Types & Topologies', 'OSI Model & Protocols', 'IP Addressing & Subnetting', 'Routing Protocols', 'Network Security Essentials'] },
    { code: 'ICT202', name: 'Web Development Fundamentals', semester: 2, difficulty: 'medium', topics: ['HTML5 Structure & Semantics', 'CSS3 Layout & Styling', 'JavaScript Basics', 'Responsive Web Design', 'Introduction to Frameworks'] },
    { code: 'ICT301', name: 'Systems Analysis & Design', semester: 3, difficulty: 'medium', topics: ['SDLC Phases & Methodologies', 'Requirements Gathering Techniques', 'Use Case & DFD Modelling', 'System Design & Prototyping', 'Implementation & Testing Plans'] }
  ],

  // ===================== TOP AFRICAN UNIVERSITIES =====================

  // UCT — University of Cape Town (#1 in Africa)
  uct_popular: [
    { code: 'SCI1001', name: 'Quantitative Methods for Science', semester: 1, difficulty: 'hard', topics: ['Statistical Distributions', 'Hypothesis Testing', 'Linear Regression', 'Data Visualisation', 'Experimental Design'] },
    { code: 'ECO2001', name: 'Economics of Development & Policy', semester: 2, difficulty: 'medium', topics: ['Poverty Traps & Growth', 'Trade Policy & Globalisation', 'Public Finance & Taxation', 'African Economic Integration', 'Sustainable Development Goals'] },
    { code: 'LAW2001', name: 'Human Rights & Constitutional Law', semester: 2, difficulty: 'medium', topics: ['African Human Rights System', 'Bill of Rights Application', 'Socioeconomic Rights Litigation', 'Equality & Anti-Discrimination Law', 'International Human Rights Instruments'] },
    { code: 'MGT2001', name: 'Organisational Behaviour', semester: 2, difficulty: 'easy', topics: ['Individual Behaviour & Attitudes', 'Motivation Theories', 'Team Dynamics & Conflict', 'Leadership Styles', 'Organisational Culture & Change'] },
    { code: 'COM2001', name: 'Computer Science: Algorithms', semester: 2, difficulty: 'hard', topics: ['Algorithm Design Paradigms', 'Divide & Conquer', 'Greedy Algorithms', 'Dynamic Programming', 'NP-Completeness & Complexity'] },
    { code: 'ENV3001', name: 'Environmental & Climate Studies', semester: 3, difficulty: 'medium', topics: ['Climate Systems & Change', 'Biodiversity & Ecosystems', 'Environmental Policy & Law', 'Sustainable Energy Transitions', "Africa's Climate Vulnerability"] }
  ],

  // WITS — University of the Witwatersrand, South Africa
  wits_popular: [
    { code: 'MED1001', name: 'Human Anatomy & Physiology', semester: 1, difficulty: 'hard', topics: ['Skeletal & Muscular Systems', 'Cardiovascular & Respiratory Systems', 'Digestive & Renal Systems', 'Nervous System & Brain', 'Endocrine & Reproductive Systems'] },
    { code: 'MIN2001', name: 'Mining & Geology Fundamentals', semester: 2, difficulty: 'medium', topics: ['Geological Structures & Mineralogy', 'Ore Deposit Classification', 'Mining Methods & Safety', 'Environmental Impact Assessment', 'Mine Economics & Feasibility'] },
    { code: 'PHI2001', name: 'Philosophy & Critical Thinking', semester: 2, difficulty: 'easy', topics: ['Logic & Argumentation', 'Epistemology Basics', 'Ethics & Moral Philosophy', 'Political Philosophy', 'African Philosophy Traditions'] },
    { code: 'FIN2001', name: 'Financial Mathematics', semester: 2, difficulty: 'hard', topics: ['Time Value of Money', 'Interest Rate Calculations', 'Annuities & Perpetuities', 'Bond Pricing & Duration', 'Risk & Portfolio Theory'] },
    { code: 'SOC2001', name: 'Society, Power & Identity', semester: 2, difficulty: 'easy', topics: ['Social Class & Stratification', 'Race, Ethnicity & Post-Colonialism', 'Gender & Feminist Theory', 'Urbanisation & Migration', 'Social Research Methods'] }
  ],

  // University of Nairobi — Kenya (Top East African University)
  nairobi_popular: [
    { code: 'AGR2001', name: 'Agricultural Economics', semester: 2, difficulty: 'medium', topics: ['Farm Resource Management', 'Agricultural Markets & Prices', 'Food Security & Policy', 'Value Chain Analysis', 'Climate & Food Systems in Africa'] },
    { code: 'PHL2001', name: 'Public Health & Epidemiology', semester: 2, difficulty: 'medium', topics: ['Disease Burden & Measurement', 'Epidemiological Study Designs', 'Infectious Disease Control', 'Health Systems in Africa', 'Global Health Frameworks'] },
    { code: 'CVL2001', name: 'Civil Engineering Fundamentals', semester: 2, difficulty: 'hard', topics: ['Structural Analysis & Loads', 'Concrete & Steel Design', 'Geotechnical Engineering', 'Water Resources & Hydraulics', 'Road & Transport Engineering'] },
    { code: 'CYB3001', name: 'Cybersecurity & Digital Forensics', semester: 3, difficulty: 'hard', topics: ['Network Attacks & Defences', 'Cryptography Concepts', 'Digital Forensics Methodology', 'Ethical Hacking & Penetration Testing', 'Cyber Law & Compliance'] },
    { code: 'BNK3001', name: 'Banking & Financial Services', semester: 3, difficulty: 'medium', topics: ['Bank Operations & Functions', 'Credit Analysis & Risk', 'Microfinance & Mobile Banking', 'Regulatory Frameworks (Basel III)', 'FinTech & Digital Finance in Africa'] }
  ],

  // Makerere University — Uganda
  makerere_popular: [
    { code: 'SOC1001', name: 'Introduction to Social Sciences', semester: 1, difficulty: 'easy', topics: ['Sociology Foundations', 'Political Science Concepts', 'Anthropology & Culture', 'Social Research Methods', 'African Social Challenges'] },
    { code: 'TRL3001', name: 'International Trade & Investment Law', semester: 3, difficulty: 'hard', topics: ['WTO Agreements & Dispute Settlement', 'Regional Trade Blocs (AfCFTA, EAC)', 'Foreign Investment Treaties', 'Trade Remedies & Sanctions', 'Intellectual Property in Trade'] },
    { code: 'TRP3001', name: 'Tropical Medicine & Infectious Diseases', semester: 3, difficulty: 'hard', topics: ['Malaria: Pathology & Treatment', 'HIV/AIDS Management', 'Tuberculosis & Co-Infections', 'Neglected Tropical Diseases', 'Vaccine Development Principles'] },
    { code: 'FSC3001', name: 'Food Security & Rural Development', semester: 3, difficulty: 'medium', topics: ['Smallholder Farming Systems', 'Crop Science & Agronomy', 'Soil Health & Fertilization', 'Post-Harvest Management', 'Rural Extension Services'] },
    { code: 'EDU2001', name: 'Education Policy & Curriculum Studies', semester: 2, difficulty: 'easy', topics: ['History of Education in Africa', 'Curriculum Design Principles', 'Assessment & Pedagogy', 'Education Policy Frameworks', 'Inclusive Education Practices'] }
  ],

  // Cairo University — Egypt (Largest African University)
  cairo_popular: [
    { code: 'PTR3001', name: 'Petroleum & Energy Engineering', semester: 3, difficulty: 'hard', topics: ['Reservoir Engineering Fundamentals', 'Drilling Operations & Safety', 'Natural Gas Processing', 'Refinery Operations', 'Renewable Energy Alternatives'] },
    { code: 'ARC2001', name: 'Architectural Design & History', semester: 2, difficulty: 'medium', topics: ['Ancient & Islamic Architecture', 'Architectural Drawing Standards', 'Building Materials & Methods', 'Urban Planning Principles', 'Sustainable Architecture'] },
    { code: 'PHA2001', name: 'Pharmacology & Clinical Therapy', semester: 2, difficulty: 'hard', topics: ['Drug Absorption & Metabolism', 'Autonomic Nervous System Drugs', 'Cardiovascular Pharmacology', 'Antimicrobial Agents', 'Drug Interactions & Toxicology'] },
    { code: 'MCM1001', name: 'Mass Communication & Journalism', semester: 1, difficulty: 'easy', topics: ['Media Theories & Effects', 'News Writing & Reporting', 'Broadcast & Digital Media', 'Media Ethics & Law', 'Social Media Journalism'] },
    { code: 'POL3001', name: 'African & Middle Eastern Political Economy', semester: 3, difficulty: 'medium', topics: ['Oil Economies & Resource Curse', 'Arab Spring & Democratic Transitions', 'African Union & Regional Blocs', 'Geopolitics of Trade Routes', 'Foreign Aid & Debt Sustainability'] }
  ],

  // UNISA — University of South Africa (Largest Open Distance Learning)
  unisa_popular: [
    { code: 'PBL1501', name: 'Problem-Based & Independent Learning', semester: 1, difficulty: 'easy', topics: ['Academic Writing Standards', 'Critical Reading & Analysis', 'Research Methods Overview', 'Referencing & Plagiarism Prevention', 'Distance Learning Study Strategies'] },
    { code: 'COS1511', name: 'Introduction to Programming (C++)', semester: 1, difficulty: 'medium', topics: ['C++ Syntax & Data Types', 'Decision & Loop Structures', 'Functions & Parameters', 'Pointers & Memory', 'Structs & File Handling'] },
    { code: 'PYC2601', name: 'Psychology: Individual in Society', semester: 2, difficulty: 'easy', topics: ['Socialization & Identity', 'Social Cognition & Perception', 'Attitudes & Persuasion', 'Interpersonal Relationships', 'Culture & Psychological Health'] },
    { code: 'MAC3701', name: 'Management Accounting', semester: 3, difficulty: 'hard', topics: ['Cost Classification & Costing Methods', 'Budget Planning & Control', 'Standard Costing & Variance Analysis', 'CVP Analysis', 'Activity-Based Costing'] },
    { code: 'INF3708', name: 'Systems Analysis & Design', semester: 3, difficulty: 'medium', topics: ['SDLC & Agile Methodologies', 'Requirements Elicitation', 'UML Modelling (Use Case, Class, ER)', 'System Prototyping & Testing', 'Software Project Management'] }
  ]
};

// ==========================================
// SMART STUDY SCHEDULER ALGORITHM
// ==========================================
function generateSmartSchedule() {
  const { weekdayHours, weekendHours, startDate, prioritizeBy } = appState.settings;
  const startDay = new Date(startDate);
  
  // 1. Gather all active modules and their uncompleted topics
  let activeModules = appState.modules.filter(m => {
    // skip modules with no exam date or past exam dates
    if (!m.examDate) return false;
    const examTime = new Date(m.examDate + 'T23:59:59');
    return examTime >= startDay;
  });
  
  if (activeModules.length === 0) {
    return { success: false, reason: "No modules with upcoming exam dates found." };
  }
  
  // Gather topic tasks
  let topicsList = [];
  activeModules.forEach(module => {
    module.topics.forEach(topic => {
      if (topic.state !== 'mastered') {
        const examDate = new Date(module.examDate);
        topicsList.push({
          moduleId: module.id,
          moduleCode: module.code,
          moduleColor: module.color,
          topicId: topic.id,
          topicName: topic.name,
          difficulty: module.difficulty,
          examDate: examDate
        });
      }
    });
  });
  
  if (topicsList.length === 0) {
    return { success: false, reason: "All topics are already marked as Mastered! Add more topics to plan." };
  }
  
  // 2. Assign Priority Score to each topic
  topicsList.forEach(item => {
    const daysUntilExam = Math.max(1, Math.round((item.examDate - startDay) / (1000 * 60 * 60 * 24)));
    
    // Urgency factor: inverse of days remaining
    let urgencyFactor = 100 / (daysUntilExam + 0.1);
    
    // Difficulty factor
    let diffFactor = 1.0;
    if (item.difficulty === 'hard') diffFactor = 2.5;
    else if (item.difficulty === 'medium') diffFactor = 1.5;
    else if (item.difficulty === 'easy') diffFactor = 0.8;
    
    // Score based on strategy bias
    if (prioritizeBy === 'exam-proximity') {
      item.priorityScore = urgencyFactor * 1.5 + diffFactor;
    } else if (prioritizeBy === 'difficulty-first') {
      item.priorityScore = diffFactor * 10 + urgencyFactor;
    } else {
      // Balanced
      item.priorityScore = Math.random(); // random/even
    }
  });
  
  // Sort descending by priority score
  topicsList.sort((a, b) => b.priorityScore - a.priorityScore);
  
  // 3. Distribute topics into study sessions day-by-day
  const generatedSchedule = [];
  let currentDay = new Date(startDay);
  
  // Limit schedule loop to max 90 days to avoid infinite cycles
  let daysLoopGuard = 0;
  const maxDays = 90;
  
  // Keep track of module hours scheduled per day to prevent burnout
  const dailyModuleTracker = {};
  
  while (topicsList.length > 0 && daysLoopGuard < maxDays) {
    const dateStr = currentDay.toISOString().split('T')[0];
    const isWeekend = currentDay.getDay() === 0 || currentDay.getDay() === 6;
    const hoursBudget = isWeekend ? parseInt(weekendHours) : parseInt(weekdayHours);
    
    // Track module items scheduled today
    dailyModuleTracker[dateStr] = {};
    
    let hoursFilled = 0;
    
    // Find topics that can be scheduled today
    for (let i = 0; i < topicsList.length; i++) {
      if (hoursFilled >= hoursBudget) break;
      
      const topicItem = topicsList[i];
      
      // Safety Check: Is the exam date before or equal to this study date?
      // A student cannot study for an exam AFTER the exam has occurred.
      if (topicItem.examDate <= currentDay) {
        // If the exam is today or in the past relative to schedule builder date
        // We will mark it as overflow/skipped and remove it from scheduling to prevent infinite blocks
        continue;
      }
      
      // Prevent burnout: limit study of a single module to 2 hours max per day
      const moduleTodayCount = dailyModuleTracker[dateStr][topicItem.moduleId] || 0;
      if (moduleTodayCount >= 2 && topicsList.length > 1) {
        // Look for another module to mix in
        let alternateIndex = -1;
        for (let j = i + 1; j < topicsList.length; j++) {
          if (topicsList[j].moduleId !== topicItem.moduleId && topicsList[j].examDate > currentDay) {
            alternateIndex = j;
            break;
          }
        }
        
        if (alternateIndex !== -1) {
          // Schedule alternate module topic instead
          const altTopic = topicsList.splice(alternateIndex, 1)[0];
          generatedSchedule.push({
            date: dateStr,
            moduleId: altTopic.moduleId,
            moduleCode: altTopic.moduleCode,
            moduleColor: altTopic.moduleColor,
            topicId: altTopic.topicId,
            topicName: altTopic.topicName,
            completed: false
          });
          
          dailyModuleTracker[dateStr][altTopic.moduleId] = (dailyModuleTracker[dateStr][altTopic.moduleId] || 0) + 1;
          hoursFilled++;
          i--; // compensate index shift
          continue;
        }
      }
      
      // Schedule current topic
      topicsList.splice(i, 1); // remove from list
      generatedSchedule.push({
        date: dateStr,
        moduleId: topicItem.moduleId,
        moduleCode: topicItem.moduleCode,
        moduleColor: topicItem.moduleColor,
        topicId: topicItem.topicId,
        topicName: topicItem.topicName,
        completed: false
      });
      
      dailyModuleTracker[dateStr][topicItem.moduleId] = (dailyModuleTracker[dateStr][topicItem.moduleId] || 0) + 1;
      hoursFilled++;
      i--; // adjust index because of splice
    }
    
    // Go to next day
    currentDay.setDate(currentDay.getDate() + 1);
    daysLoopGuard++;
  }
  
  // Any leftover topics are marked as overflow alerts
  const warnings = [];
  if (topicsList.length > 0) {
    topicsList.forEach(leftover => {
      warnings.push(`${leftover.moduleCode}: ${leftover.topicName} could not fit before exam date.`);
    });
  }
  
  appState.schedule = generatedSchedule;
  saveState();
  
  return { success: true, warnings };
}

// ==========================================
// LEITNER BOX ENGINE
// ==========================================
const LEITNER_INTERVALS = {
  1: 1,  // Box 1: daily
  2: 2,  // Box 2: every 2 days
  3: 4,  // Box 3: every 4 days
  4: 7,  // Box 4: every 7 days
  5: 15  // Box 5: every 15 days
};

function getDueFlashcards(moduleId = '') {
  const today = new Date().toISOString().split('T')[0];
  return appState.flashcards.filter(c => {
    const isModuleMatch = !moduleId || c.moduleId === moduleId;
    const isDue = c.nextReviewDate <= today;
    return isModuleMatch && isDue;
  });
}

function rateFlashcard(cardId, isSuccess) {
  const card = appState.flashcards.find(c => c.id === cardId);
  if (!card) return;
  
  const today = new Date();
  
  if (isSuccess) {
    // Move up
    card.box = Math.min(5, card.box + 1);
  } else {
    // Fall back to Box 1
    card.box = 1;
  }
  
  const daysToAdd = LEITNER_INTERVALS[card.box];
  today.setDate(today.getDate() + daysToAdd);
  card.nextReviewDate = today.toISOString().split('T')[0];
  
  saveState();
  
  // Increment streak if study happens
  updateStreak();
}

function updateStreak() {
  const todayStr = new Date().toISOString().split('T')[0];
  const lastDate = appState.streak.lastStudyDate;
  
  if (lastDate === todayStr) return; // already counted today
  
  if (lastDate) {
    const lastDay = new Date(lastDate);
    const today = new Date(todayStr);
    const diff = Math.round((today - lastDay) / (1000 * 60 * 60 * 24));
    
    if (diff === 1) {
      appState.streak.count += 1;
    } else if (diff > 1) {
      appState.streak.count = 1; // reset streak
    }
  } else {
    appState.streak.count = 1;
  }
  
  appState.streak.lastStudyDate = todayStr;
  saveState();
  document.getElementById('streak-counter').textContent = appState.streak.count;
}

// ==========================================
// VIEW CONTROLLER & UI RENDERING
// ==========================================
const UI = {
  // Sidebar Tabs
  tabs: document.querySelectorAll('.nav-item'),
  panes: document.querySelectorAll('.tab-pane'),
  mobileToggle: document.getElementById('mobile-toggle'),
  sidebar: document.getElementById('app-sidebar'),
  
  // Modals
  moduleModal: document.getElementById('module-modal'),
  flashcardModal: document.getElementById('flashcard-modal'),
  detailsModal: document.getElementById('details-modal'),
  searchHelperModal: document.getElementById('search-helper-modal'),
  pwaIosModal: document.getElementById('pwa-ios-modal'),
  
  // Global Profile elements
  dateDisplay: document.getElementById('date-display'),
  streakCounter: document.getElementById('streak-counter'),
  
  // Dashboard Pane
  dashReadiness: document.getElementById('dash-readiness'),
  dashReadinessProgress: document.getElementById('dash-readiness-progress'),
  dashStudyTime: document.getElementById('dash-study-time'),
  dashStudyBudgetDesc: document.getElementById('dash-study-budget-desc'),
  dashTimeProgress: document.getElementById('dash-time-progress'),
  dashNextExam: document.getElementById('dash-next-exam'),
  dashNextExamCountdown: document.getElementById('dash-next-exam-countdown'),
  dashAgendaList: document.getElementById('dash-agenda-list'),
  dashStartReview: document.getElementById('dash-start-review'),
  
  // Module Hub Pane
  modulesGrid: document.getElementById('modules-grid'),
  moduleForm: document.getElementById('module-form'),
  
  // Syllabus Importer Pane
  importTemplate: document.getElementById('import-template'),
  importRawText: document.getElementById('import-raw-text'),
  parseBtn: document.getElementById('parse-curriculum-btn'),
  parserResultsCard: document.getElementById('parser-results-card'),
  parsedCountBadge: document.getElementById('parsed-count-badge'),
  parsedModulesList: document.getElementById('parsed-modules-list'),
  parserCommitBtn: document.getElementById('parser-commit-btn'),
  parserCancelBtn: document.getElementById('parser-cancel-btn'),
  
  // Scheduler Pane
  generateSchedBtn: document.getElementById('generate-schedule-btn'),
  sessionsContainer: document.getElementById('schedule-sessions-container'),
  
  // Flashcards Pane
  deckSelect: document.getElementById('flashcard-deck-select'),
  deckSelectModal: document.getElementById('card-deck-select-modal'),
  deckBox1: document.getElementById('deck-box-1-count'),
  deckBox2: document.getElementById('deck-box-2-count'),
  deckBox3: document.getElementById('deck-box-3-count'),
  deckBox4: document.getElementById('deck-box-4-count'),
  deckBox5: document.getElementById('deck-box-5-count'),
  startRecallBtn: document.getElementById('start-recall-session-btn'),
  flashcardStudyEmpty: document.getElementById('flashcard-study-empty'),
  flashcardSessionView: document.getElementById('flashcard-session-view'),
  
  // Pomodoro Pane
  pomoModuleSelect: document.getElementById('pomo-module-select'),
  pomoTopicSelect: document.getElementById('pomo-topic-select'),
  timerClock: document.getElementById('timer-clock-display'),
  timerState: document.getElementById('timer-state-display'),
  timerToggleBtn: document.getElementById('timer-toggle-btn'),
  timerResetBtn: document.getElementById('timer-reset-btn'),
  timerSkipBtn: document.getElementById('timer-skip-btn'),
  timerProgressRing: document.getElementById('timer-progress-ring'),
  pomoTotalCount: document.getElementById('pomo-total-today'),
  pomoTotalMinutes: document.getElementById('pomo-mins-today'),
  
  // Jarvis UI
  jarvisInput: document.getElementById('jarvis-input'),
  jarvisSendBtn: document.getElementById('jarvis-send-btn'),
  jarvisChatHistory: document.getElementById('jarvis-chat-history'),
  jarvisStatusBadge: document.getElementById('jarvis-status-badge'),
  geminiApiKey: document.getElementById('gemini-api-key'),
  saveGeminiKeyBtn: document.getElementById('save-gemini-key-btn')
};

// State trackers for UI sessions
let activeRecallSession = {
  active: false,
  cards: [],
  currentIndex: 0
};

let pomodoroTimer = {
  intervalId: null,
  duration: 1500, // 25 min default
  timeLeft: 1500,
  isRunning: false,
  mode: 'focus', // focus, short, long
  audioMuted: false
};

// ==========================================
// APP INITIALIZATION (Triggered by security.js)
// ==========================================
window.onAppUnlocked = async () => {
  await loadState();
  setupEventListeners();
  renderDate();
  renderDashboard();
  renderModules();
  renderSchedule();
  renderFlashcardStats();
  initPomodoroSelects();
  
  // Check online status
  updateOnlineStatus();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
};

function renderDate() {
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  UI.dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
  UI.streakCounter.textContent = appState.streak.count;
}

function updateOnlineStatus() {
  const badge = document.getElementById('offline-badge');
  if (navigator.onLine) {
    badge.style.display = 'none';
  } else {
    badge.style.display = 'inline-flex';
  }
}

// Tab Switching Routing
function switchTab(tabId) {
  UI.tabs.forEach(t => t.classList.remove('active'));
  UI.panes.forEach(p => p.classList.remove('active'));
  
  const activeNav = document.getElementById(`nav-${tabId}`);
  const activePane = document.getElementById(`tab-${tabId}`);
  
  if (activeNav) activeNav.classList.add('active');
  if (activePane) activePane.classList.add('active');
  
  // Specific tab render updates
  if (tabId === 'dashboard') renderDashboard();
  if (tabId === 'modules') renderModules();
  if (tabId === 'schedule') renderSchedule();
  if (tabId === 'flashcards') {
    renderFlashcardStats();
    resetActiveRecallSession();
  }
  
  // Mobile sidebar close on click
  UI.sidebar.classList.remove('active');
}

// ==========================================
// RENDER MODULES HUB
// ==========================================
function renderModules() {
  UI.modulesGrid.innerHTML = '';
  
  if (appState.modules.length === 0) {
    UI.modulesGrid.innerHTML = `
      <div class="empty-state cols-span-3">
        <h3>No Modules Found</h3>
        <p>You haven't added any courses yet. Get started by typing or importing them using the Curriculum Importer!</p>
      </div>
    `;
    return;
  }
  
  appState.modules.forEach(module => {
    const card = document.createElement('div');
    card.className = `glass-card module-card`;
    card.style.borderTop = `5px solid ${module.color}`;
    card.addEventListener('click', () => openModuleDetails(module.id));
    
    // Topic calculation
    const totalTopics = module.topics.length;
    const masteredTopics = module.topics.filter(t => t.state === 'mastered').length;
    const progressPercent = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;
    
    // Countdown days
    let countdownHtml = "No exam date set";
    if (module.examDate) {
      const examTime = new Date(module.examDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0,0,0,0);
      const diffTime = examTime - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        countdownHtml = `<span class="days-left-glow urgent">Exam Today!</span>`;
      } else if (diffDays < 0) {
        countdownHtml = `<span class="text-muted">Passed (${Math.abs(diffDays)}d ago)</span>`;
      } else {
        const severity = diffDays <= 7 ? 'urgent' : diffDays <= 21 ? 'normal' : 'safe';
        countdownHtml = `<span class="days-left-glow ${severity}">${diffDays} Days Left</span>`;
      }
    }
    
    card.innerHTML = `
      <div class="module-card-header">
        <span class="module-card-code" style="color:${san(module.color)}; background:rgba(${hexToRgb(module.color)}, 0.12);">${san(module.code)}</span>
        <span class="badge ${module.difficulty === 'hard' ? 'badge-warn' : 'badge-success'}">${san(module.difficulty)}</span>
      </div>
      <h3 class="module-card-title">${san(module.name)}</h3>
      
      <div class="module-card-info-row">
        <span>Mastery Progress</span>
        <span>${san(masteredTopics)}/${san(totalTopics)} Topics</span>
      </div>
      
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width: ${progressPercent}%; background-color:${san(module.color)};"></div>
      </div>
      
      <div class="module-card-footer">
        <span>${countdownHtml}</span>
        <button class="btn btn-secondary btn-sm" style="border-color:${san(module.color)}">Edit</button>
      </div>
    `;
    
    UI.modulesGrid.appendChild(card);
  });
}

function hexToRgb(hex) {
  // Simple hex converter
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
    : '139, 92, 246';
}

// ==========================================
// RENDER DASHBOARD
// ==========================================
function renderDashboard() {
  // 1. Overall Readiness
  let totalTopics = 0;
  let masteredTopics = 0;
  
  appState.modules.forEach(m => {
    m.topics.forEach(t => {
      totalTopics++;
      if (t.state === 'mastered') masteredTopics++;
    });
  });
  
  const avgReadiness = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;
  UI.dashReadiness.textContent = `${avgReadiness}%`;
  UI.dashReadinessProgress.style.width = `${avgReadiness}%`;
  
  // 2. Study Time Today
  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = appState.sessions.filter(s => s.date === todayStr);
  const totalMins = todaySessions.reduce((sum, s) => sum + s.minutes, 0);
  UI.dashStudyTime.textContent = `${totalMins}m`;
  
  // Study budget
  const isWeekend = new Date().getDay() === 0 || new Date().getDay() === 6;
  const targetHrs = isWeekend ? appState.settings.weekendHours : appState.settings.weekdayHours;
  const targetMins = targetHrs * 60;
  const remainMins = Math.max(0, targetMins - totalMins);
  UI.dashStudyBudgetDesc.textContent = remainMins > 0 ? `Remaining budget: ${remainMins} min` : `Daily study goal achieved!`;
  
  const budgetPercent = Math.min(100, Math.round((totalMins / targetMins) * 100));
  UI.dashTimeProgress.style.width = `${budgetPercent}%`;
  
  // 3. Next Exam Countdown
  let nextExamModule = null;
  let minDiff = Infinity;
  const now = new Date();
  now.setHours(0,0,0,0);
  
  appState.modules.forEach(m => {
    if (m.examDate) {
      const examTime = new Date(m.examDate + 'T00:00:00');
      const diff = examTime - now;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        nextExamModule = m;
      }
    }
  });
  
  if (nextExamModule) {
    const daysLeft = Math.ceil(minDiff / (1000 * 60 * 60 * 24));
    UI.dashNextExam.textContent = nextExamModule.code;
    UI.dashNextExamCountdown.textContent = daysLeft === 0 ? "Exam is TODAY!" : `${daysLeft} days until exam`;
  } else {
    UI.dashNextExam.textContent = "None Set";
    UI.dashNextExamCountdown.textContent = "Set dates in Modules Tab";
  }
  
  // 4. Today's Study Agenda Preview
  UI.dashAgendaList.innerHTML = '';
  const todaySchedule = appState.schedule.filter(s => s.date === todayStr);
  
  if (todaySchedule.length === 0) {
    UI.dashAgendaList.innerHTML = `
      <div class="empty-state border-none">
        <p>No study tasks scheduled for today.</p>
        <button class="btn btn-secondary btn-sm" id="dash-replan-btn">Re-generate Schedule</button>
      </div>
    `;
    const replan = document.getElementById('dash-replan-btn');
    if (replan) {
      replan.addEventListener('click', () => switchTab('schedule'));
    }
  } else {
    todaySchedule.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = `agenda-item ${item.completed ? 'completed' : ''}`;
      row.innerHTML = `
        <div class="agenda-item-left">
          <div class="agenda-color-dot" style="background:${item.moduleColor || '#8b5cf6'}"></div>
          <div class="agenda-item-text">
            <span class="agenda-topic-name">${san(item.topicName)}</span>
            <span class="agenda-module-code">${san(item.moduleCode)}</span>
          </div>
        </div>
        <div class="agenda-checkbox-container" data-index="${san(index)}">
          <button class="agenda-checkbox" aria-label="Mark Complete">
            ${item.completed ? '✓' : ''}
          </button>
        </div>
      `;
      
      // Complete agenda item handler
      const checkbox = row.querySelector('.agenda-checkbox-container');
      checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleAgendaItemCompleted(todayStr, index);
      });
      
      UI.dashAgendaList.appendChild(row);
    });
  }
  
  // 5. Leitner Status
  const boxes = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  appState.flashcards.forEach(c => {
    boxes[c.box] = (boxes[c.box] || 0) + 1;
  });
  
  document.getElementById('leitner-box-1-count').textContent = boxes[1];
  document.getElementById('leitner-box-2-count').textContent = boxes[2];
  document.getElementById('leitner-box-3-count').textContent = boxes[3];
  document.getElementById('leitner-box-4-count').textContent = boxes[4];
  document.getElementById('leitner-box-5-count').textContent = boxes[5];
  
  // Review hint
  const dueCardsCount = getDueFlashcards().length;
  const hintText = document.getElementById('box-review-hint');
  
  if (dueCardsCount > 0) {
    hintText.innerHTML = `⚡ You have <strong class="purple-text">${dueCardsCount}</strong> card(s) due for recall review.`;
    UI.dashStartReview.removeAttribute('disabled');
  } else {
    hintText.textContent = "Great job! All cards are temporarily memorized.";
    UI.dashStartReview.setAttribute('disabled', 'true');
  }
}

function toggleAgendaItemCompleted(dateStr, index) {
  const targetDaySessions = appState.schedule.filter(s => s.date === dateStr);
  if (!targetDaySessions[index]) return;
  
  const isCompleted = !targetDaySessions[index].completed;
  targetDaySessions[index].completed = isCompleted;
  
  // Sync to topic checklist status
  const moduleId = targetDaySessions[index].moduleId;
  const topicId = targetDaySessions[index].topicId;
  const module = appState.modules.find(m => m.id === moduleId);
  
  if (module) {
    const topic = module.topics.find(t => t.id === topicId);
    if (topic) {
      topic.state = isCompleted ? 'mastered' : 'reviewing';
    }
  }
  
  // If completed, register a focus log session of 30 minutes dynamically as a reward
  if (isCompleted) {
    appState.sessions.push({
      date: dateStr,
      minutes: 30, // assume a standard 30 min session per topic
      moduleId: moduleId,
      topicId: topicId
    });
    updateStreak();
  } else {
    // remove matching study session
    const matchIdx = appState.sessions.findIndex(s => s.date === dateStr && s.moduleId === moduleId && s.topicId === topicId);
    if (matchIdx !== -1) appState.sessions.splice(matchIdx, 1);
  }
  
  saveState();
  renderDashboard();
  renderModules();
}

// ==========================================
// RENDER SCHEDULE ROADMAP
// ==========================================
function renderSchedule() {
  UI.sessionsContainer.innerHTML = '';
  document.getElementById('sched-hours-weekday').value = appState.settings.weekdayHours;
  document.getElementById('sched-hours-weekend').value = appState.settings.weekendHours;
  document.getElementById('sched-start-date').value = appState.settings.startDate;
  document.getElementById('sched-prioritize-by').value = appState.settings.prioritizeBy;
  
  if (appState.schedule.length === 0) {
    UI.sessionsContainer.innerHTML = `
      <div class="empty-state">
        <h3>Calendar Empty</h3>
        <p>Click "Generate Smart Schedule" on the left panel to map out your study sequence.</p>
      </div>
    `;
    return;
  }
  
  // Group schedule items by date
  const groups = {};
  appState.schedule.forEach(item => {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  });
  
  // Sort dates
  const sortedDates = Object.keys(groups).sort();
  
  sortedDates.forEach(dateStr => {
    const dayGroup = document.createElement('div');
    dayGroup.className = 'calendar-day-group';
    
    const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric'
    });
    
    dayGroup.innerHTML = `<div class="calendar-date-header">${formattedDate}</div>`;
    
    groups[dateStr].forEach((item, index) => {
      // Find relative index in global schedule list for toggling
      const globalIdx = appState.schedule.findIndex(s => s.date === item.date && s.topicId === item.topicId);
      
      const sess = document.createElement('div');
      sess.className = `calendar-session-item ${item.completed ? 'completed' : ''}`;
      sess.innerHTML = `
        <div class="calendar-session-left">
          <div class="agenda-color-dot" style="background:${item.moduleColor || '#8b5cf6'}"></div>
          <div class="calendar-session-info">
            <span class="calendar-session-title">${item.topicName}</span>
            <div class="calendar-session-meta">
              <span style="color:${item.moduleColor}">${item.moduleCode}</span>
              <span>• 1 Hour block</span>
            </div>
          </div>
        </div>
        <button class="calendar-session-check" aria-label="Mark Complete">
          ${item.completed ? '✓' : ''}
        </button>
      `;
      
      sess.querySelector('.calendar-session-check').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleScheduleSession(globalIdx);
      });
      
      dayGroup.appendChild(sess);
    });
    
    UI.sessionsContainer.appendChild(dayGroup);
  });
}

function toggleScheduleSession(globalIndex) {
  if (globalIndex === -1 || !appState.schedule[globalIndex]) return;
  const item = appState.schedule[globalIndex];
  
  item.completed = !item.completed;
  
  // Sync to module topic checklist state
  const module = appState.modules.find(m => m.id === item.moduleId);
  if (module) {
    const topic = module.topics.find(t => t.id === item.topicId);
    if (topic) {
      topic.state = item.completed ? 'mastered' : 'reviewing';
    }
  }
  
  // Track study session log
  const todayStr = new Date().toISOString().split('T')[0];
  if (item.completed) {
    appState.sessions.push({
      date: todayStr,
      minutes: 60, // standard scheduled session
      moduleId: item.moduleId,
      topicId: item.topicId
    });
    updateStreak();
  } else {
    const matchIdx = appState.sessions.findIndex(s => s.moduleId === item.moduleId && s.topicId === item.topicId);
    if (matchIdx !== -1) appState.sessions.splice(matchIdx, 1);
  }
  
  saveState();
  renderSchedule();
  renderDashboard();
}

// ==========================================
// RENDER FLASHCARDS SYSTEM
// ==========================================
function renderFlashcardStats() {
  // Populate dropdown lists
  UI.deckSelect.innerHTML = '<option value="">-- All Active Decks --</option>';
  UI.deckSelectModal.innerHTML = '';
  
  appState.modules.forEach(m => {
    const opt = `<option value="${m.id}">${m.code} - ${m.name}</option>`;
    UI.deckSelect.innerHTML += opt;
    UI.deckSelectModal.innerHTML += opt;
  });
  
  updateFlashcardBoxCounts();
}

function updateFlashcardBoxCounts() {
  const selectedDeckId = UI.deckSelect.value;
  const cards = selectedDeckId ? appState.flashcards.filter(c => c.moduleId === selectedDeckId) : appState.flashcards;
  
  const boxes = { 1:0, 2:0, 3:0, 4:0, 5:0 };
  cards.forEach(c => {
    boxes[c.box] = (boxes[c.box] || 0) + 1;
  });
  
  UI.deckBox1.textContent = `${boxes[1]} cards`;
  UI.deckBox2.textContent = `${boxes[2]} cards`;
  UI.deckBox3.textContent = `${boxes[3]} cards`;
  UI.deckBox4.textContent = `${boxes[4]} cards`;
  UI.deckBox5.textContent = `${boxes[5]} cards`;
  
  // Button text update
  const dueCards = getDueFlashcards(selectedDeckId);
  UI.startRecallBtn.textContent = `Review Deck (${dueCards.length} Due)`;
  
  if (dueCards.length > 0) {
    UI.startRecallBtn.removeAttribute('disabled');
  } else {
    UI.startRecallBtn.setAttribute('disabled', 'true');
  }
}

function resetActiveRecallSession() {
  activeRecallSession.active = false;
  activeRecallSession.cards = [];
  activeRecallSession.currentIndex = 0;
  
  UI.flashcardStudyEmpty.style.display = 'flex';
  UI.flashcardSessionView.style.display = 'none';
}

function startFlashcardReview() {
  const selectedDeckId = UI.deckSelect.value;
  const dueCards = getDueFlashcards(selectedDeckId);
  
  if (dueCards.length === 0) return;
  
  // Shuffle cards
  activeRecallSession.cards = dueCards.sort(() => Math.random() - 0.5);
  activeRecallSession.active = true;
  activeRecallSession.currentIndex = 0;
  
  UI.flashcardStudyEmpty.style.display = 'none';
  UI.flashcardSessionView.style.display = 'block';
  
  showCurrentFlashcard();
}

function showCurrentFlashcard() {
  const total = activeRecallSession.cards.length;
  const currentIdx = activeRecallSession.currentIndex;
  const card = activeRecallSession.cards[currentIdx];
  
  document.getElementById('card-session-counter').textContent = `Card ${currentIdx + 1} of ${total}`;
  const pct = ((currentIdx) / total) * 100;
  document.getElementById('card-session-progress-bar').style.width = `${pct}%`;
  
  // Unflip card
  document.getElementById('interactive-flashcard').classList.remove('flipped');
  document.getElementById('card-rating-controls').style.display = 'none';
  
  // Set contents
  document.getElementById('card-current-box-tag').textContent = `Box ${card.box}`;
  document.getElementById('card-current-box-tag-back').textContent = `Box ${card.box}`;
  document.getElementById('card-front-content').textContent = card.front;
  document.getElementById('card-back-content').textContent = card.back;
  
  // color theme box tag based on Box
  const tagFront = document.getElementById('card-current-box-tag');
  const tagBack = document.getElementById('card-current-box-tag-back');
  tagFront.className = `card-box-tag box-${card.box}-bg`;
  tagBack.className = `card-box-tag box-${card.box}-bg`;
}

function flipFlashcard() {
  const cardElement = document.getElementById('interactive-flashcard');
  cardElement.classList.toggle('flipped');
  
  const ratingControls = document.getElementById('card-rating-controls');
  if (cardElement.classList.contains('flipped')) {
    ratingControls.style.display = 'flex';
  } else {
    ratingControls.style.display = 'none';
  }
}

function submitRecallRating(isSuccess) {
  const card = activeRecallSession.cards[activeRecallSession.currentIndex];
  rateFlashcard(card.id, isSuccess);
  
  activeRecallSession.currentIndex++;
  
  if (activeRecallSession.currentIndex >= activeRecallSession.cards.length) {
    // Session complete
    alert('Active Recall session complete! Great work.');
    resetActiveRecallSession();
    renderFlashcardStats();
    renderDashboard();
  } else {
    showCurrentFlashcard();
  }
}

// ==========================================
// FOCUS ROOM (POMODORO TIMER)
// ==========================================
function initPomodoroSelects() {
  UI.pomoModuleSelect.innerHTML = '<option value="">-- General Study --</option>';
  appState.modules.forEach(m => {
    UI.pomoModuleSelect.innerHTML += `<option value="${m.id}">${m.code}</option>`;
  });
  
  // Render total logs
  const todayStr = new Date().toISOString().split('T')[0];
  const sessions = appState.sessions.filter(s => s.date === todayStr);
  UI.pomoTotalCount.textContent = sessions.length;
  
  const mins = sessions.reduce((sum, s) => sum + s.minutes, 0);
  UI.pomoTotalMinutes.textContent = `${mins}m`;
}

function handlePomoModuleChange() {
  const mId = UI.pomoModuleSelect.value;
  UI.pomoTopicSelect.innerHTML = '<option value="">-- General Module Review --</option>';
  
  if (!mId) {
    UI.pomoTopicSelect.setAttribute('disabled', 'true');
    return;
  }
  
  const module = appState.modules.find(m => m.id === mId);
  if (module && module.topics.length > 0) {
    module.topics.forEach(t => {
      UI.pomoTopicSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
    });
    UI.pomoTopicSelect.removeAttribute('disabled');
  } else {
    UI.pomoTopicSelect.setAttribute('disabled', 'true');
  }
}

function setPomoMode(mode) {
  stopPomodoro();
  pomodoroTimer.mode = mode;
  
  document.querySelectorAll('.timer-mode-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.dataset.mode === mode) btn.classList.add('active');
  });
  
  let mins = 25;
  let stateLabel = 'Focus Time';
  
  if (mode === 'short') {
    mins = 5;
    stateLabel = 'Short Break';
  } else if (mode === 'long') {
    mins = 15;
    stateLabel = 'Long Break';
  }
  
  pomodoroTimer.duration = mins * 60;
  pomodoroTimer.timeLeft = mins * 60;
  
  UI.timerClock.textContent = `${mins.toString().padStart(2, '0')}:00`;
  UI.timerState.textContent = stateLabel;
  updateTimerProgress();
}

function updateTimerProgress() {
  const elapsed = pomodoroTimer.duration - pomodoroTimer.timeLeft;
  const fraction = elapsed / pomodoroTimer.duration;
  
  // Progress stroke SVG calculations
  const circumference = 565.48; // 2 * pi * r (r=90)
  const offset = circumference * (1 - fraction);
  UI.timerProgressRing.style.strokeDashoffset = offset;
}

function togglePomodoro() {
  if (pomodoroTimer.isRunning) {
    pausePomodoro();
  } else {
    startPomodoro();
  }
}

function startPomodoro() {
  initAudio();
  pomodoroTimer.isRunning = true;
  document.getElementById('timer-toggle-icon').outerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" stroke="currentColor" stroke-width="2" id="timer-toggle-icon"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>`;
  
  // Play ambient sound
  const ambientType = document.getElementById('pomo-ambient').value;
  playAmbient(ambientType);
  
  pomodoroTimer.intervalId = setInterval(() => {
    pomodoroTimer.timeLeft--;
    
    // Update clock UI
    const m = Math.floor(pomodoroTimer.timeLeft / 60);
    const s = pomodoroTimer.timeLeft % 60;
    UI.timerClock.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    
    updateTimerProgress();
    
    if (pomodoroTimer.timeLeft <= 0) {
      handlePomoCycleComplete();
    }
  }, 1000);
}

function pausePomodoro() {
  pomodoroTimer.isRunning = false;
  document.getElementById('timer-toggle-icon').outerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor" stroke="currentColor" stroke-width="2" id="timer-toggle-icon"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
  
  clearInterval(pomodoroTimer.intervalId);
  stopAmbient();
}

function stopPomodoro() {
  pausePomodoro();
  pomodoroTimer.timeLeft = pomodoroTimer.duration;
  
  const m = Math.floor(pomodoroTimer.timeLeft / 60);
  UI.timerClock.textContent = `${m.toString().padStart(2, '0')}:00`;
  updateTimerProgress();
}

function handlePomoCycleComplete() {
  pausePomodoro();
  stopAmbient();
  
  // Ring alarm audio synthesized
  const alarmType = document.getElementById('pomo-sound').value;
  playAlarm(alarmType);
  
  // Save log if focus session completed
  if (pomodoroTimer.mode === 'focus') {
    const minsCompleted = Math.round(pomodoroTimer.duration / 60);
    const mId = UI.pomoModuleSelect.value;
    const tId = UI.pomoTopicSelect.value;
    
    appState.sessions.push({
      date: new Date().toISOString().split('T')[0],
      minutes: minsCompleted,
      moduleId: mId || null,
      topicId: tId || null
    });
    
    updateStreak();
    saveState();
    initPomodoroSelects();
    
    alert("Focus session complete! Take a break.");
    setPomoMode('short');
  } else {
    alert("Break ended! Ready to focus?");
    setPomoMode('focus');
  }
}

// ==========================================
// SYLLABUS DYNAMIC PREVIEW IMPORTER
// ==========================================
let parsedImporterModules = [];

function handleCurriculumParse() {
  const text = UI.importRawText.value.trim();
  if (!text) {
    alert("Please paste syllabus text or load a template.");
    return;
  }
  
  parsedImporterModules = parseSyllabus(text);
  renderParsedImporterPreview();
}

function loadTemplateCurriculum() {
  const val = UI.importTemplate.value;
  if (!val || !CURRICULUM_TEMPLATES[val]) return;
  
  parsedImporterModules = JSON.parse(JSON.stringify(CURRICULUM_TEMPLATES[val])); // deep copy
  renderParsedImporterPreview();
}

function renderParsedImporterPreview() {
  UI.parsedModulesList.innerHTML = '';
  
  if (parsedImporterModules.length === 0) {
    UI.parserResultsCard.style.display = 'none';
    alert("Could not identify any courses. Try adjusting the formatting or verify course codes exist.");
    return;
  }
  
  UI.parsedCountBadge.textContent = `${parsedImporterModules.length} Modules Found`;
  UI.parserResultsCard.style.display = 'block';
  
  parsedImporterModules.forEach((m, idx) => {
    const item = document.createElement('div');
    item.className = 'parsed-module-item';
    item.innerHTML = `
      <div class="parsed-module-left">
        <input type="checkbox" class="parsed-checkbox" checked data-index="${san(idx)}">
        <span class="parsed-code">${san(m.code)}</span>
      </div>
      <div class="parsed-details">
        <span class="parsed-title">${san(m.name)}</span>
        <span class="parsed-meta">Semester ${san(m.semester)} &bull; ${san(m.topics.length)} topics automatically parsed</span>
      </div>
      <div class="parsed-actions-cell">
        <select class="parsed-select-diff" data-index="${san(idx)}">
          <option value="easy" ${m.difficulty === 'easy' ? 'selected' : ''}>Easy</option>
          <option value="medium" ${m.difficulty === 'medium' ? 'selected' : ''}>Medium</option>
          <option value="hard" ${m.difficulty === 'hard' ? 'selected' : ''}>Hard</option>
        </select>
      </div>
    `;
    UI.parsedModulesList.appendChild(item);
  });
}

function commitParsedModules() {
  const checkboxes = UI.parsedModulesList.querySelectorAll('.parsed-checkbox');
  const diffSelectors = UI.parsedModulesList.querySelectorAll('.parsed-select-diff');
  let addedCount = 0;
  
  checkboxes.forEach((cb, idx) => {
    if (cb.checked) {
      const pMod = parsedImporterModules[idx];
      const diff = diffSelectors[idx].value;
      
      // Map modules structure
      const newModule = {
        id: 'mod_' + Math.random().toString(36).substr(2, 9),
        code: pMod.code,
        name: pMod.name,
        difficulty: diff,
        color: getRandomColor(),
        examDate: '', // filled by user later
        topics: pMod.topics.map(tName => ({
          id: 'top_' + Math.random().toString(36).substr(2, 9),
          name: tName,
          state: 'not-started'
        }))
      };
      
      // Avoid duplicate codes
      if (!appState.modules.some(m => m.code.toUpperCase() === newModule.code.toUpperCase())) {
        appState.modules.push(newModule);
        addedCount++;
      }
    }
  });
  
  if (addedCount > 0) {
    saveState();
    alert(`Successfully imported ${addedCount} modules into your Modules Hub!`);
    switchTab('modules');
    
    // Clear Importer fields
    UI.importRawText.value = '';
    UI.importTemplate.value = '';
    UI.parserResultsCard.style.display = 'none';
  } else {
    alert("No new modules were imported (they may already exist).");
  }
}

function getRandomColor() {
  const colors = ['#8b5cf6', '#3b82f6', '#10b981', '#ec4899', '#f59e0b', '#ef4444'];
  return colors[Math.floor(Math.random() * colors.length)];
}

// ==========================================
// COURSE DETAILS DRAWER & CRUD
// ==========================================
function openModuleDetails(moduleId) {
  const m = appState.modules.find(module => module.id === moduleId);
  if (!m) return;
  
  document.getElementById('details-module-code').textContent = m.code;
  document.getElementById('details-module-title').textContent = m.name;
  
  // Color code border accent
  document.getElementById('details-header').style.borderLeftColor = m.color;
  
  document.getElementById('details-difficulty').textContent = m.difficulty;
  
  // Exam dates
  const dateField = document.getElementById('details-exam-date');
  const countField = document.getElementById('details-countdown');
  
  if (m.examDate) {
    dateField.textContent = new Date(m.examDate + 'T00:00:00').toLocaleDateString();
    
    const examTime = new Date(m.examDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0,0,0,0);
    const diff = Math.ceil((examTime - today) / (1000 * 60 * 60 * 24));
    
    if (diff === 0) {
      countField.textContent = "TODAY";
      countField.className = "text-lg font-bold mt-1 text-danger";
    } else if (diff < 0) {
      countField.textContent = "PASSED";
      countField.className = "text-lg font-bold mt-1 text-muted";
    } else {
      countField.textContent = `${diff} Days`;
      countField.className = diff <= 7 ? "text-lg font-bold mt-1 text-danger" : "text-lg font-bold mt-1 text-warn";
    }
  } else {
    dateField.innerHTML = `<button class="btn btn-secondary btn-sm" id="details-set-date-btn">Set Date</button>`;
    countField.textContent = '-';
    
    // Add date setter click
    document.getElementById('details-set-date-btn').addEventListener('click', () => {
      openEditModuleModal(m);
    });
  }
  
  // Render topics checklist
  renderDetailsTopicsList(m);
  
  // Study session triggers
  document.getElementById('details-pomo-shortcut').onclick = () => {
    UI.detailsModal.classList.remove('active');
    switchTab('pomodoro');
    UI.pomoModuleSelect.value = m.id;
    handlePomoModuleChange();
  };
  
  document.getElementById('details-cards-shortcut').onclick = () => {
    UI.detailsModal.classList.remove('active');
    switchTab('flashcards');
    UI.deckSelect.value = m.id;
    updateFlashcardBoxCounts();
  };
  
  document.getElementById('details-delete-module-btn').onclick = () => {
    if (confirm(`Are you absolutely sure you want to delete ${m.code}? This deletes all topics, flashcards, and calendar events.`)) {
      appState.modules = appState.modules.filter(mod => mod.id !== m.id);
      appState.flashcards = appState.flashcards.filter(c => c.moduleId !== m.id);
      appState.schedule = appState.schedule.filter(s => s.moduleId !== m.id);
      saveState();
      UI.detailsModal.classList.remove('active');
      renderModules();
      renderDashboard();
    }
  };
  
  document.getElementById('details-add-topic-btn').onclick = () => {
    const topicField = document.getElementById('details-new-topic-name');
    const name = topicField.value.trim();
    if (name) {
      m.topics.push({
        id: 'top_' + Math.random().toString(36).substr(2, 9),
        name: name,
        state: 'not-started'
      });
      saveState();
      topicField.value = '';
      renderDetailsTopicsList(m);
      renderModules();
    }
  };
  
  // Open details
  UI.detailsModal.classList.add('active');
}

function renderDetailsTopicsList(module) {
  const container = document.getElementById('details-topics-list');
  container.innerHTML = '';
  
  if (module.topics.length === 0) {
    container.innerHTML = `<p class="text-sm text-muted">No topics added yet.</p>`;
    return;
  }
  
  module.topics.forEach((topic) => {
    const row = document.createElement('div');
    row.className = 'details-topic-row';
    row.innerHTML = `
      <div class="details-topic-row-left">
        <span style="font-weight: 500; font-size:0.85rem;">${san(topic.name)}</span>
      </div>
      <div class="parsed-actions-cell">
        <select class="topic-select-state" data-topic-id="${san(topic.id)}">
          <option value="not-started" ${topic.state === 'not-started' ? 'selected' : ''}>Not Started</option>
          <option value="reviewing" ${topic.state === 'reviewing' ? 'selected' : ''}>Reviewing</option>
          <option value="mastered" ${topic.state === 'mastered' ? 'selected' : ''}>Mastered</option>
        </select>
        <button class="topic-delete-btn" data-topic-id="${san(topic.id)}">&times;</button>
      </div>
    `;
    
    // Change topic state
    row.querySelector('.topic-select-state').addEventListener('change', (e) => {
      topic.state = e.target.value;
      saveState();
      renderModules();
      renderDashboard();
    });
    
    // Delete topic
    row.querySelector('.topic-delete-btn').addEventListener('click', () => {
      module.topics = module.topics.filter(t => t.id !== topic.id);
      saveState();
      renderDetailsTopicsList(module);
      renderModules();
      renderDashboard();
    });
    
    container.appendChild(row);
  });
}

function openEditModuleModal(module) {
  UI.detailsModal.classList.remove('active');
  document.getElementById('module-modal-title').textContent = "Edit Study Module";
  document.getElementById('module-edit-id').value = module.id;
  document.getElementById('module-code').value = module.code;
  document.getElementById('module-name').value = module.name;
  document.getElementById('module-exam-date').value = module.examDate || '';
  document.getElementById('module-difficulty').value = module.difficulty;
  
  // Check radio matching color
  const radio = document.querySelector(`input[name="module-color"][value="${module.color}"]`);
  if (radio) radio.checked = true;
  
  // Hide topics checklist input during edit to avoid overwriting checklist state
  document.getElementById('module-topics').closest('.form-group').style.display = 'none';
  
  UI.moduleModal.classList.add('active');
}

// ==========================================
// EVENT LISTENERS & ROUTINES
// ==========================================
function setupEventListeners() {
  // Mobile menu toggle
  UI.mobileToggle.addEventListener('click', () => {
    UI.sidebar.classList.toggle('active');
  });
  
  // Sidebar tabs routing
  UI.tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab(tab.dataset.tab);
    });
  });
  
  // Close Modals handler
  document.querySelectorAll('.modal-close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    });
  });
  
  // Close modal when clicking dark backdrop overlay
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });
  
  // Add Module Modal trigger
  document.getElementById('add-module-modal-btn').addEventListener('click', () => {
    // FREEMIUM GATE: Limit free users to 5 modules
    if (!appState.isPremium && appState.modules.length >= 5) {
      document.getElementById('premium-modal').classList.add('active');
      return;
    }
    document.getElementById('module-modal-title').textContent = "Add Study Module";
    document.getElementById('module-edit-id').value = '';
    UI.moduleForm.reset();
    document.getElementById('module-topics').closest('.form-group').style.display = 'flex';
    UI.moduleModal.classList.add('active');
  });

  // Premium Upgrade / Google Sign In Stubs
  const premiumBtn = document.getElementById('premium-upgrade-btn');
  if (premiumBtn) {
    premiumBtn.addEventListener('click', () => {
      document.getElementById('premium-modal').classList.add('active');
    });
  }

  const googleSignIn = document.getElementById('google-signin-stub');
  if (googleSignIn) {
    googleSignIn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Google Sign-In integration would open here. (Placeholder for GitHub push)');
    });
  }

  const verifyLicense = document.getElementById('verify-license-btn');
  if (verifyLicense) {
    verifyLicense.addEventListener('click', async () => {
      const key = document.getElementById('license-key-input').value.trim();
      if (key === 'PREMIUM-TEST') {
        appState.isPremium = true;
        await saveState();
        alert('Premium unlocked! Thank you for your support.');
        document.getElementById('premium-modal').classList.remove('active');
      } else {
        alert('Invalid license key.');
      }
    });
  }
  
  // Jarvis AI Assistant Handlers
  if (UI.jarvisSendBtn) {
    UI.jarvisSendBtn.addEventListener('click', handleJarvisChat);
    UI.jarvisInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleJarvisChat();
      }
    });
  }

  if (UI.saveGeminiKeyBtn) {
    UI.saveGeminiKeyBtn.addEventListener('click', async () => {
      const key = UI.geminiApiKey.value.trim();
      if (key) {
        appState.settings.geminiKey = key;
        await saveState();
        UI.geminiApiKey.value = '';
        UI.geminiApiKey.placeholder = 'Key saved securely';
        UI.jarvisStatusBadge.textContent = 'API Key Active';
      }
    });
  }
  
  // Module Form Save (Create/Update)
  UI.moduleForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const editId = document.getElementById('module-edit-id').value;
    const code = document.getElementById('module-code').value.trim().toUpperCase();
    const name = document.getElementById('module-name').value.trim();
    const examDate = document.getElementById('module-exam-date').value;
    const difficulty = document.getElementById('module-difficulty').value;
    const color = document.querySelector('input[name="module-color"]:checked').value;
    
    if (editId) {
      // Update
      const mod = appState.modules.find(m => m.id === editId);
      if (mod) {
        mod.code = code;
        mod.name = name;
        mod.examDate = examDate;
        mod.difficulty = difficulty;
        mod.color = color;
      }
    } else {
      // Create new
      const rawTopicsText = document.getElementById('module-topics').value.trim();
      const topicLines = rawTopicsText ? rawTopicsText.split('\n') : [];
      const topics = topicLines.map(tName => ({
        id: 'top_' + Math.random().toString(36).substr(2, 9),
        name: tName.trim(),
        state: 'not-started'
      })).filter(t => t.name.length > 0);
      
      // Fallback topic if blank
      if (topics.length === 0) {
        topics.push({ id: 'top_def', name: '1. Review Syllabus Materials', state: 'not-started' });
      }
      
      appState.modules.push({
        id: 'mod_' + Math.random().toString(36).substr(2, 9),
        code,
        name,
        examDate,
        difficulty,
        color,
        topics
      });
    }
    
    saveState();
    UI.moduleModal.classList.remove('active');
    renderModules();
    renderDashboard();
    initPomodoroSelects();
  });
  
  // Syllabus Importer Trigger
  UI.parseBtn.addEventListener('click', handleCurriculumParse);
  UI.importTemplate.addEventListener('change', loadTemplateCurriculum);
  UI.parserCancelBtn.addEventListener('click', () => {
    UI.parserResultsCard.style.display = 'none';
  });
  UI.parserCommitBtn.addEventListener('click', commitParsedModules);
  
  // Search helper trigger
  document.getElementById('search-curriculum-helper-btn').addEventListener('click', () => {
    UI.searchHelperModal.classList.add('active');
  });
  
  document.getElementById('execute-helper-search-btn').addEventListener('click', () => {
    const uni = document.getElementById('helper-uni').value.trim();
    const course = document.getElementById('helper-course').value.trim();
    
    if (!uni || !course) {
      alert("Please fill in university and course terms.");
      return;
    }
    
    // Generate targeted query string
    const query = encodeURIComponent(`${uni} ${course} syllabus curriculum modules`);
    const searchUrl = `https://html.duckduckgo.com/html/?q=${query}`;
    
    // Close modal and open search url in secondary window context safely
    UI.searchHelperModal.classList.remove('active');
    window.open(searchUrl, '_blank');
  });
  
  // Scheduler Actions
  UI.generateSchedBtn.addEventListener('click', () => {
    appState.settings.weekdayHours = parseInt(document.getElementById('sched-hours-weekday').value);
    appState.settings.weekendHours = parseInt(document.getElementById('sched-hours-weekend').value);
    appState.settings.startDate = document.getElementById('sched-start-date').value || new Date().toISOString().split('T')[0];
    appState.settings.prioritizeBy = document.getElementById('sched-prioritize-by').value;
    
    const result = generateSmartSchedule();
    
    if (result.success) {
      renderSchedule();
      renderDashboard();
      
      if (result.warnings && result.warnings.length > 0) {
        alert("Schedule Generated with Warnings:\n" + result.warnings.join('\n') + "\nSome topics overflow the exam dates! We recommend adjusting your daily hour budget.");
      } else {
        alert("Smart schedule successfully generated!");
      }
    } else {
      alert("Scheduling Failed: " + result.reason);
    }
  });
  
  // Flashcard Deck Actions
  UI.deckSelect.addEventListener('change', updateFlashcardBoxCounts);
  UI.startRecallBtn.addEventListener('click', startFlashcardReview);
  document.getElementById('dash-start-review').addEventListener('click', () => {
    switchTab('flashcards');
    startFlashcardReview();
  });
  
  document.getElementById('quit-recall-btn').addEventListener('click', resetActiveRecallSession);
  document.getElementById('interactive-flashcard').addEventListener('click', flipFlashcard);
  
  document.getElementById('rate-fail-btn').addEventListener('click', () => submitRecallRating(false));
  document.getElementById('rate-success-btn').addEventListener('click', () => submitRecallRating(true));
  
  // Add Flashcard Modal Trigger
  document.getElementById('add-flashcard-modal-btn').addEventListener('click', () => {
    // FREEMIUM GATE: Limit free users to 60 flashcards
    if (!appState.isPremium && appState.flashcards.length >= 60) {
      document.getElementById('premium-modal').classList.add('active');
      return;
    }
    if (appState.modules.length === 0) {
      alert("Add a study module first before creating flashcards.");
      return;
    }
    UI.deckSelectModal.innerHTML = '';
    appState.modules.forEach(m => {
      UI.deckSelectModal.innerHTML += `<option value="${m.id}">${m.code} - ${m.name}</option>`;
    });
    UI.flashcardModal.classList.add('active');
  });
  
  document.getElementById('flashcard-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const moduleId = document.getElementById('card-deck-select-modal').value;
    const front = document.getElementById('card-front').value.trim();
    const back = document.getElementById('card-back').value.trim();
    
    appState.flashcards.push({
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      moduleId,
      front,
      back,
      box: 1,
      nextReviewDate: new Date().toISOString().split('T')[0]
    });
    
    saveState();
    UI.flashcardModal.classList.remove('active');
    document.getElementById('flashcard-form').reset();
    renderFlashcardStats();
    renderDashboard();
  });
  
  // Pomodoro Timer controls
  document.querySelectorAll('.timer-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPomoMode(btn.dataset.mode);
    });
  });
  
  UI.timerToggleBtn.addEventListener('click', togglePomodoro);
  UI.timerResetBtn.addEventListener('click', stopPomodoro);
  UI.timerSkipBtn.addEventListener('click', handlePomoCycleComplete);
  
  UI.pomoModuleSelect.addEventListener('change', handlePomoModuleChange);
  
  // Backup Restore JSON actions
  document.getElementById('export-data-btn').addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `studysmart-backup-${new Date().toISOString().split('T')[0]}.json`);
    dlAnchorElem.click();
  });
  
  document.getElementById('import-data-btn').addEventListener('click', () => {
    document.getElementById('backup-file-input').click();
  });
  
  document.getElementById('backup-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
      try {
        const importedData = JSON.parse(evt.target.result);
        
        // Basic validation
        if (importedData.modules && importedData.flashcards) {
          appState = importedData;
          saveState();
          alert("Backup successfully restored! App will reload.");
          window.location.reload();
        } else {
          alert("Invalid backup file structure.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
  });
  
  // PWA Prompt Installation Setup
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.onclick = () => {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
          }
          deferredPrompt = null;
        });
      };
    }
  });
  
  // iOS Safari detection for manual PWA install prompt button
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };
  const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator.standalone);
  
  if (isIos() && !isInStandaloneMode()) {
    const installBtn = document.getElementById('install-pwa-btn');
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
      installBtn.onclick = () => {
        UI.pwaIosModal.classList.add('active');
      };
    }
  }
}

// ==========================================
// JARVIS AI LOGIC
// ==========================================
async function handleJarvisChat() {
  const text = UI.jarvisInput.value.trim();
  if (!text) return;
  
  UI.jarvisInput.value = '';
  
  // Add User Message
  appendJarvisMessage(text, 'user');
  
  // Add Loading State
  UI.jarvisStatusBadge.textContent = 'Thinking...';
  
  try {
    const key = appState.settings?.geminiKey;
    if (!key) {
      setTimeout(() => {
        appendJarvisMessage('Please save your Gemini API key on the left to enable Cloud AI features. For now, I can only provide basic offline study tips.', 'assistant');
        UI.jarvisStatusBadge.textContent = 'Offline Mode';
      }, 500);
      return;
    }
    
    // Stub for actual Gemini API call (to be replaced by the owner after github push)
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `You are Jarvis, a helpful AI study assistant. Answer concisely. User says: ${text}` }] }]
      })
    });
    
    if (!response.ok) throw new Error('API Error');
    
    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";
    
    appendJarvisMessage(reply, 'assistant');
    UI.jarvisStatusBadge.textContent = 'Ready';
  } catch (err) {
    console.error(err);
    appendJarvisMessage('Error contacting AI. Please check your API key and connection.', 'assistant');
    UI.jarvisStatusBadge.textContent = 'Error';
  }
}

function appendJarvisMessage(text, role) {
  const div = document.createElement('div');
  div.className = `chat-message ${role}`;
  div.style.padding = '10px 15px';
  div.style.borderRadius = '12px';
  div.style.marginBottom = '10px';
  div.style.maxWidth = '80%';
  
  if (role === 'user') {
    div.style.alignSelf = 'flex-end';
    div.style.background = '#3b82f6';
    div.style.color = '#fff';
    div.style.marginLeft = 'auto'; // force right align
  } else {
    div.style.alignSelf = 'flex-start';
    div.style.background = 'rgba(139, 92, 246, 0.1)';
  }
  
  div.textContent = text;
  UI.jarvisChatHistory.appendChild(div);
  UI.jarvisChatHistory.scrollTop = UI.jarvisChatHistory.scrollHeight;
}

window.fillJarvisPrompt = function(promptText) {
  UI.jarvisInput.value = promptText;
  UI.jarvisInput.focus();
}
