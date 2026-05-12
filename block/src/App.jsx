import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, ensureAuth } from './lib/firebase';
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp
} from 'firebase/firestore';

// ============================================================
// SEED DATA (used only on first launch)
// ============================================================

const SEED_FOODS = [
  { name: 'Chicken Breast, cooked', per100g: { calories: 165, protein: 31, fat: 3.6, carbs: 0 }, defaultGrams: 226, timesUsed: 0 },
  { name: 'Ground Beef 90/10, cooked', per100g: { calories: 217, protein: 26, fat: 11.7, carbs: 0 }, defaultGrams: 113, timesUsed: 0 },
  { name: 'White Rice, cooked', per100g: { calories: 130, protein: 2.7, fat: 0.3, carbs: 28 }, defaultGrams: 200, timesUsed: 0 },
  { name: 'Brown Rice, cooked', per100g: { calories: 112, protein: 2.6, fat: 0.9, carbs: 24 }, defaultGrams: 200, timesUsed: 0 },
  { name: 'Egg, large', per100g: { calories: 155, protein: 13, fat: 11, carbs: 1.1 }, defaultGrams: 50, timesUsed: 0 },
  { name: 'Greek Yogurt, plain nonfat', per100g: { calories: 59, protein: 10, fat: 0.4, carbs: 3.6 }, defaultGrams: 170, timesUsed: 0 },
  { name: 'Oats, dry', per100g: { calories: 389, protein: 16.9, fat: 6.9, carbs: 66 }, defaultGrams: 40, timesUsed: 0 },
  { name: 'Banana', per100g: { calories: 89, protein: 1.1, fat: 0.3, carbs: 23 }, defaultGrams: 118, timesUsed: 0 },
  { name: 'Olive Oil', per100g: { calories: 884, protein: 0, fat: 100, carbs: 0 }, defaultGrams: 14, timesUsed: 0 },
  { name: 'Almonds', per100g: { calories: 579, protein: 21, fat: 50, carbs: 22 }, defaultGrams: 28, timesUsed: 0 }
];

const JOSE_PLAN = {
  trainingDays: [
    { dayName: 'Push', dayOfWeek: 2, exercises: [
      { id: 'j-push-1', name: 'Smith Incline Press', sets: 4, repLow: 6, repHigh: 8, weight: 135, progression: 'load', compound: true },
      { id: 'j-push-2', name: 'Low-to-High Cable Fly', sets: 4, repLow: 10, repHigh: 12, weight: 25, progression: 'load', compound: false },
      { id: 'j-push-3', name: 'Bayesian Cable Curl', sets: 4, repLow: 8, repHigh: 12, weight: 25, progression: 'load', compound: false },
      { id: 'j-push-4', name: 'Cable Overhead Tricep Ext', sets: 4, repLow: 10, repHigh: 12, weight: 35, progression: 'load', compound: false }
    ]},
    { dayName: 'Pull', dayOfWeek: 4, exercises: [
      { id: 'j-pull-1', name: 'Cable-Assisted Pull-Up', sets: 4, repLow: 5, repHigh: 8, weight: 80, progression: 'assistReduction', compound: true, weightLabel: 'assist' },
      { id: 'j-pull-2', name: 'Smith Bent-Over Row', sets: 4, repLow: 6, repHigh: 8, weight: 115, progression: 'load', compound: true },
      { id: 'j-pull-3', name: 'One-Arm DB Row', sets: 3, repLow: 8, repHigh: 10, weight: 60, progression: 'load', compound: true },
      { id: 'j-pull-4', name: 'Cross-Body Cable Lateral', sets: 3, repLow: 12, repHigh: 15, weight: 12.5, progression: 'load', compound: false },
      { id: 'j-pull-5', name: 'Hanging Knee Raise', sets: 3, repLow: 10, repHigh: 15, weight: 0, progression: 'rep', compound: false }
    ]},
    { dayName: 'Full Body', dayOfWeek: 0, exercises: [
      { id: 'j-fb-1', name: 'Smith Squat', sets: 3, repLow: 6, repHigh: 8, weight: 155, progression: 'load', compound: true },
      { id: 'j-fb-2', name: 'Smith RDL', sets: 3, repLow: 8, repHigh: 10, weight: 135, progression: 'load', compound: true },
      { id: 'j-fb-3', name: 'DB Flat Bench', sets: 4, repLow: 8, repHigh: 10, weight: 55, progression: 'load', compound: true },
      { id: 'j-fb-4', name: 'Cable Tricep Pushdown', sets: 3, repLow: 12, repHigh: 15, weight: 40, progression: 'load', compound: false }
    ]}
  ]
};

const YARELI_PLAN = {
  trainingDays: [
    { dayName: 'Glute 1', dayOfWeek: 2, exercises: [
      { id: 'y-g1-1', name: 'Smith Hip Thrust', sets: 4, repLow: 8, repHigh: 10, weight: 95, progression: 'load', compound: true },
      { id: 'y-g1-2', name: 'Smith RDL', sets: 4, repLow: 8, repHigh: 10, weight: 75, progression: 'load', compound: true },
      { id: 'y-g1-3', name: 'DB Bulgarian Split Squat', sets: 3, repLow: 10, repHigh: 10, weight: 15, progression: 'load', compound: true, note: 'per leg' },
      { id: 'y-g1-4', name: 'Lateral Cable Kickback', sets: 2, repLow: 12, repHigh: 15, weight: 7.5, progression: 'load', compound: false, note: 'per leg' }
    ]},
    { dayName: 'Upper', dayOfWeek: 4, exercises: [
      { id: 'y-up-1', name: 'DB Bench', sets: 3, repLow: 8, repHigh: 10, weight: 20, progression: 'load', compound: true },
      { id: 'y-up-2', name: 'One-Arm DB Row', sets: 3, repLow: 10, repHigh: 12, weight: 20, progression: 'load', compound: true, note: 'per arm' },
      { id: 'y-up-3', name: 'DB Shoulder Press', sets: 3, repLow: 8, repHigh: 10, weight: 12.5, progression: 'load', compound: true },
      { id: 'y-up-4', name: 'Cable Face Pull', sets: 3, repLow: 12, repHigh: 15, weight: 15, progression: 'load', compound: false },
      { id: 'y-up-5', name: 'Incline DB Curl', sets: 3, repLow: 10, repHigh: 12, weight: 10, progression: 'load', compound: false }
    ]},
    { dayName: 'Glute 2', dayOfWeek: 0, exercises: [
      { id: 'y-g2-1', name: 'Smith Squat', sets: 3, repLow: 8, repHigh: 10, weight: 75, progression: 'load', compound: true },
      { id: 'y-g2-2', name: 'Smith B-Stance Hip Thrust', sets: 3, repLow: 10, repHigh: 12, weight: 65, progression: 'load', compound: true, note: '2-3 RIR' },
      { id: 'y-g2-3', name: 'DB Deficit Reverse Lunge', sets: 3, repLow: 10, repHigh: 10, weight: 15, progression: 'load', compound: true, note: 'per leg' },
      { id: 'y-g2-4', name: 'DB Calf Raise', sets: 3, repLow: 12, repHigh: 15, weight: 15, progression: 'load', compound: false }
    ]}
  ]
};

// Default profile data for first-launch seeding
const DEFAULT_PROFILES = {
  jose: { name: 'Jose', macros: { calories: 2500, protein: 180, fat: 68, carbs: 255 }, plan: JOSE_PLAN },
  yareli: { name: 'Yareli', macros: { calories: 1400, protein: 110, fat: 48, carbs: 128 }, plan: YARELI_PLAN }
};

// Today's date as YYYY-MM-DD
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

// Get block start date - first launch sets it to today
async function getOrInitBlockStart() {
  const ref = doc(db, 'household', 'main');
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().blockStartDate) {
    return snap.data().blockStartDate;
  }
  const today = todayStr();
  await setDoc(ref, { blockStartDate: today, activeProfile: 'jose' }, { merge: true });
  return today;
}

// ============================================================
// SMITH MACHINE PLATE PRESETS
// ============================================================

// Smith machine plate presets (Jose's gym: 5s, 10s, 25s, 45s)
const PLATE_PRESETS = [
  '+ 5', '+ 10', '+ 25', '+ 35',
  'Plate', 'Plate + 5', 'Plate + 10', 'Plate + 25', 'Plate + 35',
  '2 Plates', '2 Plates + 5', '2 Plates + 10', '2 Plates + 25', '2 Plates + 35',
  '3 Plates'
];

function isSmithExercise(name) {
  return name.toLowerCase().startsWith('smith');
}

// ============================================================
// MAIN APP
// ============================================================

export default function App() {
  // --- View state (UI only, not persisted) ---
  const [view, setView] = useState('home');
  const [showFoodEntry, setShowFoodEntry] = useState(false);
  const [prefillFood, setPrefillFood] = useState(null);
  const [showWorkoutLogger, setShowWorkoutLogger] = useState(false);
  const [showManageFoods, setShowManageFoods] = useState(false);
  const [showMacros, setShowMacros] = useState(false);
  const [showLastWorkouts, setShowLastWorkouts] = useState(false);
  const [undoData, setUndoData] = useState(null);

  // --- Persisted state (synced from Firestore) ---
  const [activeProfile, setActiveProfileState] = useState('jose');
  const [blockStartDate, setBlockStartDate] = useState(null);
  const [profiles, setProfiles] = useState({ jose: null, yareli: null });
  const [savedFoods, setSavedFoods] = useState([]);
  const [allFoodLogs, setAllFoodLogs] = useState([]); // today's food logs for both profiles
  const [allWeightLogs, setAllWeightLogs] = useState([]); // both profiles
  const [allWorkouts, setAllWorkouts] = useState([]); // both profiles
  const [lastPortion, setLastPortion] = useState({ jose: {}, yareli: {} });
  const [bootstrapped, setBootstrapped] = useState(false);

  // --- Bootstrap on first launch ---
  useEffect(() => {
    let active = true;
    (async () => {
      await ensureAuth();

      // Check if household doc exists; seed if not
      const hhRef = doc(db, 'household', 'main');
      const hhSnap = await getDoc(hhRef);
      if (!hhSnap.exists()) {
        // First launch ever — seed everything
        const today = todayStr();
        await setDoc(hhRef, { blockStartDate: today, activeProfile: 'jose' });
        await setDoc(doc(db, 'profiles', 'jose'), DEFAULT_PROFILES.jose);
        await setDoc(doc(db, 'profiles', 'yareli'), DEFAULT_PROFILES.yareli);
        // Seed default foods
        for (const food of SEED_FOODS) {
          await addDoc(collection(db, 'savedFoods'), food);
        }
      }
      if (active) setBootstrapped(true);
    })();
    return () => { active = false; };
  }, []);

  // --- Subscribe to Firestore data ---
  useEffect(() => {
    if (!bootstrapped) return;
    const unsubs = [];

    // Household
    unsubs.push(onSnapshot(doc(db, 'household', 'main'), snap => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveProfileState(data.activeProfile || 'jose');
        setBlockStartDate(data.blockStartDate);
      }
    }));

    // Profiles
    unsubs.push(onSnapshot(doc(db, 'profiles', 'jose'), snap => {
      if (snap.exists()) setProfiles(p => ({ ...p, jose: { id: 'jose', ...snap.data() } }));
    }));
    unsubs.push(onSnapshot(doc(db, 'profiles', 'yareli'), snap => {
      if (snap.exists()) setProfiles(p => ({ ...p, yareli: { id: 'yareli', ...snap.data() } }));
    }));

    // Saved foods
    unsubs.push(onSnapshot(collection(db, 'savedFoods'), snap => {
      setSavedFoods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    // Today's foods (both profiles)
    const today = todayStr();
    unsubs.push(onSnapshot(query(collection(db, 'foodLogs'), where('date', '==', today)), snap => {
      setAllFoodLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    // Weights — last 14 days for both
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    unsubs.push(onSnapshot(query(collection(db, 'weightLogs'), where('date', '>=', cutoffStr)), snap => {
      setAllWeightLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    // Workouts — last 60 days
    const woCutoff = new Date(); woCutoff.setDate(woCutoff.getDate() - 60);
    unsubs.push(onSnapshot(query(collection(db, 'workouts'), where('date', '>=', woCutoff.toISOString().slice(0, 10))), snap => {
      setAllWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }));

    return () => unsubs.forEach(u => u());
  }, [bootstrapped]);

  // --- Derived values for current profile ---
  const profile = profiles[activeProfile];
  const partnerId = activeProfile === 'jose' ? 'yareli' : 'jose';
  const partner = profiles[partnerId];

  const foods = useMemo(() =>
    allFoodLogs.filter(l => l.profileId === activeProfile).sort((a, b) => (a.loggedAt?.seconds || 0) - (b.loggedAt?.seconds || 0)),
    [allFoodLogs, activeProfile]
  );

  const weights = useMemo(() =>
    allWeightLogs.filter(w => w.profileId === activeProfile).sort((a, b) => b.date.localeCompare(a.date)),
    [allWeightLogs, activeProfile]
  );

  const yesterdayWeight = useMemo(() => {
    const yStr = yesterdayStr();
    const w = allWeightLogs.find(w => w.profileId === activeProfile && w.date === yStr);
    return w?.weight;
  }, [allWeightLogs, activeProfile]);

  const consumed = useMemo(() => foods.reduce((acc, f) => ({
    calories: acc.calories + (f.calories || 0),
    protein: acc.protein + (f.protein || 0),
    fat: acc.fat + (f.fat || 0),
    carbs: acc.carbs + (f.carbs || 0)
  }), { calories: 0, protein: 0, fat: 0, carbs: 0 }), [foods]);

  const todaysDay = profile?.plan?.trainingDays.find(d => d.dayOfWeek === new Date().getDay());
  const workoutDone = allWorkouts.some(w => w.profileId === activeProfile && w.date === todayStr() && w.dayName === todaysDay?.dayName);

  const dayCount = useMemo(() => {
    if (!blockStartDate) return 1;
    const start = new Date(blockStartDate);
    const now = new Date();
    return Math.max(1, Math.floor((now - start) / 86400000) + 1);
  }, [blockStartDate]);

  // Build a "lastPortion" map from existing food logs for share defaults
  useEffect(() => {
    // For each profile, find the most recent log per food
    const map = { jose: {}, yareli: {} };
    [...allFoodLogs].sort((a, b) => (b.loggedAt?.seconds || 0) - (a.loggedAt?.seconds || 0)).forEach(log => {
      if (!log.foodId || !log.profileId) return;
      if (!map[log.profileId][log.foodId]) map[log.profileId][log.foodId] = log.grams;
    });
    setLastPortion(map);
  }, [allFoodLogs]);

  // --- Actions ---
  async function toggleProfile() {
    const next = activeProfile === 'jose' ? 'yareli' : 'jose';
    await updateDoc(doc(db, 'household', 'main'), { activeProfile: next });
  }

  async function logFoodEntry(food, grams, forProfileId) {
    const ratio = grams / 100;
    await addDoc(collection(db, 'foodLogs'), {
      profileId: forProfileId,
      date: todayStr(),
      foodId: food.id,
      foodName: food.name,
      grams: Number(grams),
      calories: food.per100g.calories * ratio,
      protein: food.per100g.protein * ratio,
      fat: food.per100g.fat * ratio,
      carbs: food.per100g.carbs * ratio,
      loggedAt: serverTimestamp()
    });
    // Increment timesUsed on the saved food
    if (food.id) {
      const ref = doc(db, 'savedFoods', food.id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { timesUsed: (snap.data().timesUsed || 0) + 1 });
      }
    }
  }

  async function deleteFood(food) {
    await deleteDoc(doc(db, 'foodLogs', food.id));
    if (undoData?.timer) clearTimeout(undoData.timer);
    const timer = setTimeout(() => setUndoData(null), 4000);
    setUndoData({ food, timer });
  }

  async function undoDelete() {
    if (!undoData) return;
    // Re-add the food log with its previous data (but new id)
    const { id, ...rest } = undoData.food;
    await addDoc(collection(db, 'foodLogs'), { ...rest, loggedAt: serverTimestamp() });
    clearTimeout(undoData.timer);
    setUndoData(null);
  }

  async function logWeight(weight) {
    const today = todayStr();
    // Use deterministic doc id = one weight per profile per day
    const id = `${activeProfile}_${today}`;
    await setDoc(doc(db, 'weightLogs', id), {
      profileId: activeProfile,
      date: today,
      weight: Number(weight),
      loggedAt: serverTimestamp()
    });
  }

  async function saveWorkout(loggedExercises) {
    await addDoc(collection(db, 'workouts'), {
      profileId: activeProfile,
      date: todayStr(),
      dayName: todaysDay.dayName,
      exercises: loggedExercises,
      loggedAt: serverTimestamp()
    });
  }

  async function updateMacros(newMacros) {
    await updateDoc(doc(db, 'profiles', activeProfile), { macros: newMacros });
  }

  async function addSavedFood(food) {
    const ref = await addDoc(collection(db, 'savedFoods'), {
      ...food,
      timesUsed: 0,
      createdAt: serverTimestamp()
    });
    return { id: ref.id, ...food, timesUsed: 0 };
  }

  async function deleteSavedFood(foodId) {
    await deleteDoc(doc(db, 'savedFoods', foodId));
  }

  // --- Loading state ---
  if (!bootstrapped || !profile || !partner) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', color: 'rgba(235,235,245,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, system-ui, sans-serif', fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Loading...
      </div>
    );
  }

  // Workouts for the active profile (for the "Last Workouts" view)
  const myWorkouts = allWorkouts.filter(w => w.profileId === activeProfile);

  // Apple-styled CSS
  const styles = `
    .demo-root, .demo-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; -webkit-font-smoothing: antialiased; }
    .demo-root {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', system-ui, sans-serif;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    .ios-num {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif;
      font-variant-numeric: tabular-nums;
      font-feature-settings: 'tnum' 1;
    }
    .ios-mono {
      font-family: 'SF Mono', ui-monospace, 'Menlo', monospace;
      font-variant-numeric: tabular-nums;
    }
    .ios-group {
      background: #1c1c1e;
      border-radius: 14px;
      overflow: hidden;
    }
    .ios-row {
      padding: 14px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-height: 44px;
      border-bottom: 0.5px solid rgba(84, 84, 88, 0.35);
    }
    .ios-row:last-child { border-bottom: none; }
    .ios-row-button {
      background: none; border: none; width: 100%; color: inherit;
      padding: 14px 16px; text-align: left; cursor: pointer; display: flex;
      align-items: center; justify-content: space-between; min-height: 44px;
      border-bottom: 0.5px solid rgba(84, 84, 88, 0.35);
      font-family: inherit; font-size: inherit;
      transition: background-color 0.15s;
    }
    .ios-row-button:last-child { border-bottom: none; }
    .ios-row-button:active { background-color: rgba(84, 84, 88, 0.18); }
    .ios-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: rgba(235, 235, 245, 0.45); font-weight: 600; padding: 0 16px 6px; margin-top: 24px; }
    .ios-section-first { margin-top: 0; }
    .ios-input {
      background: transparent; border: none; outline: none; color: #fff;
      width: 100%; font-family: inherit; font-size: 17px;
      caret-color: #0a84ff;
    }
    .ios-input::placeholder { color: rgba(235, 235, 245, 0.3); }
    .ios-btn-primary {
      background: #0a84ff; color: #fff; font-weight: 600;
      padding: 14px 20px; border-radius: 12px; border: none;
      cursor: pointer; transition: opacity 0.1s; font-size: 17px;
      font-family: inherit; width: 100%; letter-spacing: -0.01em;
    }
    .ios-btn-primary:active { opacity: 0.7; }
    .ios-btn-primary:disabled { opacity: 0.35; }
    .ios-btn-secondary {
      background: rgba(120, 120, 128, 0.24); color: #0a84ff;
      font-weight: 500; padding: 14px 20px; border-radius: 12px;
      border: none; cursor: pointer; transition: opacity 0.1s; font-size: 17px;
      font-family: inherit; width: 100%;
    }
    .ios-btn-secondary:active { opacity: 0.7; }
    .ios-btn-text {
      background: none; border: none; color: #0a84ff;
      font-size: 17px; font-weight: 400; cursor: pointer;
      font-family: inherit; padding: 8px 4px;
    }
    .ios-btn-text:active { opacity: 0.5; }
    .ios-chip {
      padding: 7px 14px; border-radius: 999px; font-size: 13px;
      background: rgba(120, 120, 128, 0.24); color: #fff;
      border: none; cursor: pointer; font-family: inherit;
      transition: background-color 0.1s; white-space: nowrap;
    }
    .ios-chip:active { background: rgba(120, 120, 128, 0.4); }
    .ios-chip-selected { background: #0a84ff; }
    input[type=number]::-webkit-inner-spin-button,
    input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
    input[type=number] { -moz-appearance: textfield; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .ios-modal-backdrop {
      position: fixed; inset: 0; z-index: 50;
      background: rgba(0,0,0,0.6); backdrop-filter: blur(10px);
      display: flex; align-items: flex-end; justify-content: center;
    }
    .ios-sheet {
      background: #1c1c1e; border-radius: 14px 14px 0 0;
      width: 100%; max-width: 480px; max-height: 92vh;
      display: flex; flex-direction: column;
      animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .ios-fullscreen {
      position: fixed; inset: 0; z-index: 50;
      background: #000; max-width: 480px; margin: 0 auto;
      display: flex; flex-direction: column;
      animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .ios-grabber {
      width: 36px; height: 5px; background: rgba(235,235,245,0.3);
      border-radius: 3px; margin: 8px auto 0;
    }
    .ios-toast {
      position: fixed; bottom: 24px; left: 16px; right: 16px;
      max-width: 448px; margin: 0 auto; z-index: 60;
      background: rgba(28, 28, 30, 0.9); backdrop-filter: blur(20px);
      border-radius: 14px; padding: 14px 16px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 10px 40px rgba(0,0,0,0.5);
      animation: toastIn 0.3s cubic-bezier(0.32, 0.72, 0, 1);
    }
    @keyframes toastIn { from { transform: translateY(120%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    .day-counter {
      background: rgba(120, 120, 128, 0.16); border-radius: 999px;
      padding: 3px 10px; font-size: 11px; color: rgba(235,235,245,0.6);
      font-weight: 500;
    }
  `;

  return (
    <div className="demo-root" style={{ background: '#000', minHeight: '100vh', maxWidth: 480, margin: '0 auto', position: 'relative' }}>
      <style>{styles}</style>

      {view === 'home' && (
        <HomePage
          profile={profile} partner={partner} allFoodLogs={allFoodLogs} allWeightLogs={allWeightLogs} allWorkouts={allWorkouts}
          consumed={consumed} foods={foods} weights={weights}
          yesterdayWeight={yesterdayWeight} todaysDay={todaysDay} workoutDone={workoutDone} dayCount={dayCount}
          onToggleProfile={toggleProfile}
          onAddFood={() => { setPrefillFood(null); setShowFoodEntry(true); }}
          onQuickAdd={(f) => { setPrefillFood(f); setShowFoodEntry(true); }}
          onDeleteFood={deleteFood}
          onLogWeight={logWeight}
          onStartWorkout={() => setShowWorkoutLogger(true)}
          onOpenSettings={() => setView('settings')}
        />
      )}
      {view === 'settings' && (
        <SettingsPage
          profile={profile}
          onBack={() => setView('home')}
          onMacros={() => setShowMacros(true)}
          onFoods={() => setShowManageFoods(true)}
          onLastWorkouts={() => setShowLastWorkouts(true)}
        />
      )}

      {showFoodEntry && (
        <FoodEntryModal
          onClose={() => { setShowFoodEntry(false); setPrefillFood(null); }}
          savedFoods={savedFoods}
          prefillFood={prefillFood}
          activeProfile={profile}
          partnerProfile={partner}
          lastPortionForPartner={lastPortion[partner.id] || {}}
          onLog={(food, grams, partnerGrams) => {
            if (grams > 0) logFoodEntry(food, grams, profile.id);
            if (partnerGrams != null && partnerGrams > 0) logFoodEntry(food, partnerGrams, partner.id);
          }}
          onCreateNew={(food) => addSavedFood(food)}
        />
      )}

      {showWorkoutLogger && todaysDay && (
        <WorkoutLogger day={todaysDay} onClose={() => setShowWorkoutLogger(false)} onSave={saveWorkout} />
      )}

      {showLastWorkouts && (
        <LastWorkoutsSheet workouts={myWorkouts} onClose={() => setShowLastWorkouts(false)} />
      )}

      {showManageFoods && (
        <ManageFoodsSheet foods={savedFoods} onClose={() => setShowManageFoods(false)} onDelete={deleteSavedFood} />
      )}

      {showMacros && (
        <MacrosSheet profile={profile} onClose={() => setShowMacros(false)} onSave={(m) => { updateMacros(m); setShowMacros(false); }} />
      )}

      {undoData && (
        <div className="ios-toast">
          <div style={{ fontSize: 14 }}>Deleted <span style={{ color: 'rgba(235,235,245,0.6)' }}>{undoData.food.foodName}</span></div>
          <button onClick={undoDelete} style={{ background: 'none', border: 'none', color: '#0a84ff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Undo</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// HOME PAGE
// ============================================================

function HomePage({ profile, partner, allFoodLogs, allWeightLogs, allWorkouts, consumed, foods, weights, yesterdayWeight, todaysDay, workoutDone, dayCount, onToggleProfile, onAddFood, onQuickAdd, onDeleteFood, onLogWeight, onStartWorkout, onOpenSettings }) {
  const dateStr = new Date('2026-05-12').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const accent = profile.id === 'jose' ? '#64d2ff' : '#ff8b9b';
  const today = weights[0];
  const calLeft = profile.macros.calories - consumed.calories;
  const calPct = consumed.calories / profile.macros.calories;
  let calColor = '#fff';
  if (calLeft < 0) calColor = '#ff453a';
  else if (calPct > 0.9) calColor = '#ff9f0a';
  else if (calPct > 0.4) calColor = '#30d158';

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 32 }}>
      {/* Header */}
      <header style={{ padding: '12px 20px 8px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={onToggleProfile}
            style={{
              width: 40, height: 40, borderRadius: 20,
              background: profile.id === 'jose' ? 'rgba(100,210,255,0.2)' : 'rgba(255,139,155,0.2)',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: accent, fontWeight: 700, fontSize: 17,
              transition: 'transform 0.1s'
            }}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.92)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            aria-label={`Switch from ${profile.name}`}
          >
            {profile.name[0]}
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1 }}>{profile.name}</span>
              <span className="day-counter">Day {dayCount}</span>
            </div>
            <div style={{ fontSize: 13, color: 'rgba(235,235,245,0.6)', marginTop: 4 }}>{dateStr}</div>
          </div>
        </div>
        <button onClick={onOpenSettings} style={{ background: 'rgba(120,120,128,0.24)', border: 'none', width: 32, height: 32, borderRadius: 16, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </header>

      {/* Workout slim card — training day only */}
      {todaysDay && !workoutDone && (
        <div style={{ padding: '8px 16px 0' }}>
          <button onClick={onStartWorkout} style={{ width: '100%', background: '#1c1c1e', border: 'none', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', transition: 'opacity 0.1s' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(10,132,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6.5 6.5l11 11"/><path d="M21 21l-1-1"/><path d="M3 3l1 1"/><path d="M18 22l4-4"/><path d="M2 6l4-4"/><path d="M3 10l7-7"/><path d="M14 21l7-7"/>
                </svg>
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{todaysDay.dayName} day</div>
                <div style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)', marginTop: 1 }}>{todaysDay.exercises.length} exercises</div>
              </div>
            </div>
            <div style={{ color: '#0a84ff', fontSize: 15, fontWeight: 500 }}>Start</div>
          </button>
        </div>
      )}
      {todaysDay && workoutDone && (
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{ background: '#1c1c1e', borderRadius: 14, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: 0.7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: 'rgba(48,209,88,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{todaysDay.dayName} day · Logged</div>
            </div>
          </div>
        </div>
      )}

      {/* Calories big number */}
      <div style={{ padding: '24px 20px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 }}>
          <div className="ios-num" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1, color: calColor, letterSpacing: '-0.04em' }}>
            {Math.round(calLeft)}
          </div>
          <div style={{ fontSize: 17, color: 'rgba(235,235,245,0.6)', fontWeight: 500 }}>
            {calLeft >= 0 ? 'left today' : 'over'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[
            { label: 'P', val: consumed.protein, target: profile.macros.protein, color: '#bf5af2' },
            { label: 'F', val: consumed.fat, target: profile.macros.fat, color: '#ff9f0a' },
            { label: 'C', val: consumed.carbs, target: profile.macros.carbs, color: '#64d2ff' }
          ].map(m => (
            <div key={m.label} style={{ flex: 1 }}>
              <div style={{ height: 4, background: 'rgba(120,120,128,0.24)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: m.color, width: `${Math.min(100, (m.val / m.target) * 100)}%`, transition: 'width 0.3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
                <span style={{ color: 'rgba(235,235,245,0.5)' }}>{m.label}</span>
                <span className="ios-num" style={{ color: '#fff' }}>{Math.round(m.target - m.val)}<span style={{ color: 'rgba(235,235,245,0.5)' }}>g</span></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Today's Food */}
      <div className="ios-label" style={{ marginTop: 12 }}>Today's Food</div>
      <div style={{ padding: '0 16px' }}>
        <div className="ios-group">
          {/* Logged foods */}
          {foods.map(f => (
            <div key={f.id} className="ios-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.foodName}</div>
                <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)', marginTop: 2 }}>{f.grams}g · {Math.round(f.calories)} cal</div>
              </div>
              <button onClick={() => onDeleteFood(f)} style={{ background: 'none', border: 'none', color: '#ff453a', padding: 4, cursor: 'pointer', marginLeft: 12 }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              </button>
            </div>
          ))}
          {/* Add food */}
          <button onClick={onAddFood} className="ios-row-button">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 14, background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
              <span style={{ fontSize: 17, color: '#0a84ff' }}>Add Food</span>
            </div>
          </button>
        </div>
      </div>

      {/* Weight */}
      <div className="ios-label">Morning Weight</div>
      <div style={{ padding: '0 16px' }}>
        <div className="ios-group">
          <div className="ios-row">
            <WeightInput today={today} yesterday={yesterdayWeight} onSave={onLogWeight} />
          </div>
        </div>
      </div>

      {/* Partner card */}
      <div className="ios-label">{partner.name} Today</div>
      <div style={{ padding: '0 16px' }}>
        <button onClick={onToggleProfile} className="ios-group" style={{ width: '100%', border: 'none', textAlign: 'left', color: 'inherit', fontFamily: 'inherit', cursor: 'pointer', padding: 0, display: 'block' }}>
          <PartnerSummary partner={partner} partnerId={partner.id} allFoodLogs={allFoodLogs} allWeightLogs={allWeightLogs} allWorkouts={allWorkouts} />
        </button>
      </div>
    </div>
  );
}

function WeightInput({ today, yesterday, onSave }) {
  const [val, setVal] = useState(today?.weight?.toString() || '');
  const [focused, setFocused] = useState(false);
  useEffect(() => { setVal(today?.weight?.toString() || ''); }, [today]);

  function commit() {
    const n = Number(val);
    if (!isNaN(n) && n > 0) onSave(n);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div style={{ fontSize: 15 }}>Weight</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <input
          type="number" inputMode="decimal" step="0.1"
          value={val}
          onChange={e => setVal(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); commit(); }}
          onKeyDown={e => { if (e.key === 'Enter') { e.target.blur(); } }}
          placeholder={yesterday?.toFixed(1) || '---'}
          className="ios-num"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: today ? '#fff' : 'rgba(235,235,245,0.3)',
            fontSize: 17, textAlign: 'right', width: 70,
            caretColor: '#0a84ff', fontFamily: 'inherit'
          }}
        />
        <div style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)' }}>lb</div>
      </div>
    </div>
  );
}

function PartnerSummary({ partner, partnerId, allFoodLogs, allWeightLogs, allWorkouts }) {
  const accent = partnerId === 'jose' ? '#64d2ff' : '#ff8b9b';
  const foods = allFoodLogs.filter(f => f.profileId === partnerId);
  const weights = allWeightLogs.filter(w => w.profileId === partnerId).sort((a, b) => b.date.localeCompare(a.date));
  const totalCal = foods.reduce((s, f) => s + (f.calories || 0), 0);
  const today = weights[0];
  const todaysDay = partner.plan.trainingDays.find(d => d.dayOfWeek === new Date().getDay());
  const workoutDone = allWorkouts.some(w => w.profileId === partnerId && w.date === todayStr() && w.dayName === todaysDay?.dayName);

  return (
    <>
      <div className="ios-row" style={{ borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
        <div style={{ fontSize: 15 }}>Calories</div>
        <div className="ios-num" style={{ fontSize: 17 }}>
          {Math.round(totalCal)}<span style={{ color: 'rgba(235,235,245,0.5)', fontSize: 13 }}> / {partner.macros.calories}</span>
        </div>
      </div>
      <div className="ios-row" style={{ borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
        <div style={{ fontSize: 15 }}>Weight</div>
        <div className="ios-num" style={{ fontSize: 17 }}>{today ? today.weight.toFixed(1) + ' lb' : '—'}</div>
      </div>
      <div className="ios-row">
        <div style={{ fontSize: 15 }}>Workout</div>
        <div style={{ fontSize: 15, color: !todaysDay ? 'rgba(235,235,245,0.5)' : workoutDone ? '#30d158' : '#ff9f0a' }}>
          {!todaysDay ? 'Rest' : workoutDone ? 'Done' : 'Pending'}
        </div>
      </div>
    </>
  );
}

// ============================================================
// FOOD ENTRY (Apple-styled)
// ============================================================

function FoodEntryModal({ onClose, savedFoods, prefillFood, activeProfile, partnerProfile, lastPortionForPartner, onLog, onCreateNew }) {
  const [stage, setStage] = useState(prefillFood ? 'portion' : 'search'); // search → portion → share
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(prefillFood || null);
  const [grams, setGrams] = useState(prefillFood?.defaultGrams || 100);
  const [yourLoggedGrams, setYourLoggedGrams] = useState(null);
  // New food
  const [creating, setCreating] = useState(false);
  const [newFood, setNewFood] = useState({ name: '', calories: '', protein: '', fat: '', carbs: '', defaultGrams: 100, basis: 'per100g' });
  // Partner share
  const [partnerGrams, setPartnerGrams] = useState(null);

  const filtered = useMemo(() => {
    if (!search) return savedFoods;
    const s = search.toLowerCase();
    return savedFoods.filter(f => f.name.toLowerCase().includes(s));
  }, [search, savedFoods]);

  const exactMatch = useMemo(() => {
    if (!search) return null;
    return savedFoods.find(f => f.name.toLowerCase() === search.toLowerCase());
  }, [search, savedFoods]);

  // Stage: SEARCH
  if (stage === 'search' && !creating) {
    return (
      <div className="ios-fullscreen">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <button onClick={onClose} className="ios-btn-text">Cancel</button>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Add Food</div>
          <div style={{ width: 60 }} />
        </div>

        <div style={{ padding: '12px 16px' }}>
          <div style={{ background: 'rgba(120,120,128,0.16)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.5)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search or type a new food"
              className="ios-input"
              style={{ fontSize: 17 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="rgba(235,235,245,0.4)"><circle cx="12" cy="12" r="11"/><line x1="9" y1="9" x2="15" y2="15" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round"/><line x1="15" y1="9" x2="9" y2="15" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          {/* Create new option — shows when no exact match and there's text */}
          {search && !exactMatch && (
            <div className="ios-group" style={{ marginBottom: 16 }}>
              <button
                onClick={() => { setNewFood({ ...newFood, name: search }); setCreating(true); }}
                className="ios-row-button"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 14, background: '#0a84ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <div>
                    <div style={{ fontSize: 15, color: '#0a84ff' }}>Create "{search}"</div>
                    <div style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)', marginTop: 1 }}>New food</div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="ios-group">
              {filtered.map(f => (
                <button key={f.id} onClick={() => { setSelected(f); setGrams(f.defaultGrams || 100); setStage('portion'); }} className="ios-row-button">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                    <div className="ios-num" style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)', marginTop: 2 }}>
                      {Math.round(f.per100g.calories)} cal · P{f.per100g.protein.toFixed(0)} F{f.per100g.fat.toFixed(0)} C{f.per100g.carbs.toFixed(0)} <span style={{ opacity: 0.6 }}>/100g</span>
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>
          )}

          {!search && filtered.length === 0 && (
            <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 15, textAlign: 'center', padding: '48px 0' }}>No saved foods yet</div>
          )}
          {search && filtered.length === 0 && exactMatch === null && (
            <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>Tap "Create" above to add this</div>
          )}
        </div>
      </div>
    );
  }

  // Stage: CREATING NEW
  if (creating) {
    function saveNew() {
      const { name, calories, protein, fat, carbs, defaultGrams, basis } = newFood;
      if (!name || !calories) return;
      const refGrams = basis === 'perServing' ? Number(defaultGrams) : 100;
      const factor = 100 / refGrams;
      const created = onCreateNew({
        name,
        per100g: {
          calories: Number(calories) * factor,
          protein: Number(protein || 0) * factor,
          fat: Number(fat || 0) * factor,
          carbs: Number(carbs || 0) * factor
        },
        defaultGrams: Number(defaultGrams) || 100
      });
      setSelected(created);
      setGrams(Number(defaultGrams) || 100);
      setCreating(false);
      setStage('portion');
    }
    return (
      <div className="ios-fullscreen">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <button onClick={() => setCreating(false)} className="ios-btn-text">Back</button>
          <div style={{ fontSize: 17, fontWeight: 600 }}>New Food</div>
          <button onClick={saveNew} disabled={!newFood.name || !newFood.calories} className="ios-btn-text" style={{ fontWeight: 600 }}>Save</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 24px' }}>
          <div className="ios-group">
            <div className="ios-row">
              <div style={{ fontSize: 15, color: 'rgba(235,235,245,0.6)' }}>Name</div>
              <input value={newFood.name} onChange={e => setNewFood({ ...newFood, name: e.target.value })} placeholder="Required" className="ios-input" style={{ textAlign: 'right', flex: 1, maxWidth: '60%' }} />
            </div>
          </div>

          <div className="ios-label">Per</div>
          <div className="ios-group">
            <button onClick={() => setNewFood({ ...newFood, basis: 'per100g' })} className="ios-row-button">
              <div style={{ fontSize: 15 }}>100 grams</div>
              {newFood.basis === 'per100g' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
            <button onClick={() => setNewFood({ ...newFood, basis: 'perServing' })} className="ios-row-button">
              <div style={{ fontSize: 15 }}>Serving size...</div>
              {newFood.basis === 'perServing' && <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
            {newFood.basis === 'perServing' && (
              <div className="ios-row">
                <div style={{ fontSize: 15, color: 'rgba(235,235,245,0.6)' }}>Grams per serving</div>
                <input type="number" inputMode="decimal" value={newFood.defaultGrams} onChange={e => setNewFood({ ...newFood, defaultGrams: e.target.value })} className="ios-input ios-num" style={{ textAlign: 'right', maxWidth: 80 }} />
              </div>
            )}
          </div>

          <div className="ios-label">Macros</div>
          <div className="ios-group">
            <div className="ios-row">
              <div style={{ fontSize: 15 }}>Calories</div>
              <input type="number" inputMode="decimal" value={newFood.calories} onChange={e => setNewFood({ ...newFood, calories: e.target.value })} placeholder="0" className="ios-input ios-num" style={{ textAlign: 'right', maxWidth: 80 }} />
            </div>
            <div className="ios-row">
              <div style={{ fontSize: 15 }}>Protein (g)</div>
              <input type="number" inputMode="decimal" value={newFood.protein} onChange={e => setNewFood({ ...newFood, protein: e.target.value })} placeholder="0" className="ios-input ios-num" style={{ textAlign: 'right', maxWidth: 80 }} />
            </div>
            <div className="ios-row">
              <div style={{ fontSize: 15 }}>Fat (g)</div>
              <input type="number" inputMode="decimal" value={newFood.fat} onChange={e => setNewFood({ ...newFood, fat: e.target.value })} placeholder="0" className="ios-input ios-num" style={{ textAlign: 'right', maxWidth: 80 }} />
            </div>
            <div className="ios-row">
              <div style={{ fontSize: 15 }}>Carbs (g)</div>
              <input type="number" inputMode="decimal" value={newFood.carbs} onChange={e => setNewFood({ ...newFood, carbs: e.target.value })} placeholder="0" className="ios-input ios-num" style={{ textAlign: 'right', maxWidth: 80 }} />
            </div>
          </div>

          {newFood.basis === 'per100g' && (
            <>
              <div className="ios-label">Default portion (optional)</div>
              <div className="ios-group">
                <div className="ios-row">
                  <div style={{ fontSize: 15 }}>Grams</div>
                  <input type="number" inputMode="decimal" value={newFood.defaultGrams} onChange={e => setNewFood({ ...newFood, defaultGrams: e.target.value })} className="ios-input ios-num" style={{ textAlign: 'right', maxWidth: 80 }} />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Stage: PORTION
  if (stage === 'portion' && selected) {
    return (
      <div className="ios-fullscreen">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <button onClick={() => { if (prefillFood) onClose(); else setStage('search'); }} className="ios-btn-text">{prefillFood ? 'Cancel' : 'Back'}</button>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Portion</div>
          <div style={{ width: 60 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{selected.name}</div>
            <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)', marginTop: 4 }}>
              {Math.round(selected.per100g.calories)} cal · P{selected.per100g.protein.toFixed(0)} F{selected.per100g.fat.toFixed(0)} C{selected.per100g.carbs.toFixed(0)} per 100g
            </div>
          </div>

          <div style={{ background: '#1c1c1e', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(235,235,245,0.5)', fontWeight: 600, marginBottom: 8 }}>Grams</div>
            <input
              type="number" inputMode="decimal" value={grams}
              onChange={e => setGrams(e.target.value)}
              className="ios-num"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 48, fontWeight: 700, textAlign: 'center', width: '100%', caretColor: '#0a84ff', letterSpacing: '-0.03em' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              {[...new Set([50, 100, 150, 200, 226, 250, selected.defaultGrams])].filter(v => v).sort((a,b) => a-b).map(v => (
                <button key={v} onClick={() => setGrams(v)} className={`ios-chip ${Number(grams) === v ? 'ios-chip-selected' : ''}`}>{v}g</button>
              ))}
            </div>
          </div>

          {grams > 0 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(120,120,128,0.12)', borderRadius: 12, display: 'flex', justifyContent: 'space-between' }}>
              {[
                { l: 'Cal', v: Math.round(selected.per100g.calories * grams / 100) },
                { l: 'Protein', v: (selected.per100g.protein * grams / 100).toFixed(1) },
                { l: 'Fat', v: (selected.per100g.fat * grams / 100).toFixed(1) },
                { l: 'Carbs', v: (selected.per100g.carbs * grams / 100).toFixed(1) }
              ].map(m => (
                <div key={m.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'rgba(235,235,245,0.5)' }}>{m.l}</div>
                  <div className="ios-num" style={{ fontSize: 17, fontWeight: 600, marginTop: 2 }}>{m.v}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: 16, borderTop: '0.5px solid rgba(84,84,88,0.35)' }}>
          <button onClick={() => {
            // Log to active profile, then transition to share screen
            onLog(selected, Number(grams), null);
            setYourLoggedGrams(Number(grams));
            // Pre-fill partner portion: their last use of this food, or half of yours
            const lastPartnerPortion = lastPortionForPartner[selected.id];
            setPartnerGrams(lastPartnerPortion || Math.round(Number(grams) / 2));
            setStage('share');
          }} className="ios-btn-primary">
            Log {grams}g
          </button>
        </div>
      </div>
    );
  }

  // Stage: SHARE (after logging your portion)
  if (stage === 'share' && selected) {
    function logForPartner() {
      // We already logged the active profile in onLog above; now we need a separate path to log just for partner
      // But onLog logs both at once if partnerGrams is passed. Since we already logged you,
      // we use a hack: re-open onLog with a marker. Simpler: just close and let the parent handle.
      // Actually since the parent's onLog handles both, we should pass both at once. Let me rework:
      // We'll skip the immediate log on the portion screen and do it all from here.
      onClose();
    }
    return (
      <div className="ios-fullscreen">
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <div style={{ width: 60 }} />
          <div style={{ fontSize: 17, fontWeight: 600 }}>Share Food</div>
          <button onClick={onClose} className="ios-btn-text" style={{ fontWeight: 600 }}>Done</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'rgba(48,209,88,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#30d158" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }}>Logged {yourLoggedGrams}g</div>
            <div style={{ fontSize: 14, color: 'rgba(235,235,245,0.6)', marginTop: 4 }}>{selected.name}</div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 15, color: 'rgba(235,235,245,0.7)' }}>
            Did {partnerProfile.name} eat this too?
          </div>

          <div style={{ background: '#1c1c1e', borderRadius: 14, padding: '20px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(235,235,245,0.5)', fontWeight: 600, marginBottom: 8 }}>
              {partnerProfile.name}'s grams
            </div>
            <input
              type="number" inputMode="decimal" value={partnerGrams ?? ''}
              onChange={e => setPartnerGrams(e.target.value === '' ? null : Number(e.target.value))}
              className="ios-num"
              style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 48, fontWeight: 700, textAlign: 'center', width: '100%', caretColor: '#0a84ff', letterSpacing: '-0.03em' }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              {[...new Set([Math.round(yourLoggedGrams / 2), Math.round(yourLoggedGrams * 0.75), yourLoggedGrams, lastPortionForPartner[selected.id]])].filter(v => v && v > 0).sort((a,b) => a-b).map(v => (
                <button key={v} onClick={() => setPartnerGrams(v)} className={`ios-chip ${Number(partnerGrams) === v ? 'ios-chip-selected' : ''}`}>{v}g</button>
              ))}
            </div>
            {partnerGrams > 0 && (
              <div className="ios-num" style={{ marginTop: 14, fontSize: 13, color: 'rgba(235,235,245,0.6)' }}>
                = {Math.round(selected.per100g.calories * partnerGrams / 100)} cal · P{(selected.per100g.protein * partnerGrams / 100).toFixed(1)} F{(selected.per100g.fat * partnerGrams / 100).toFixed(1)} C{(selected.per100g.carbs * partnerGrams / 100).toFixed(1)}
              </div>
            )}
          </div>
        </div>

        <div style={{ padding: 16, borderTop: '0.5px solid rgba(84,84,88,0.35)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={() => {
              // Log only for partner (your own was already logged via onLog above)
              // Hack: pass null food + partnerGrams to indicate partner-only log
              // Actually, the cleanest approach: call onLog again with a flag. Since onLog accepts (food, yourGrams, partnerGrams),
              // we'll call it with 0 yourGrams (which onLog should skip) and partnerGrams.
              // For demo purposes, we'll just call a new mechanism.
              if (partnerGrams > 0) {
                // Use the same onLog signature but pass 0 for yours to indicate skip
                onLog(selected, 0, Number(partnerGrams));
              }
              onClose();
            }}
            disabled={!partnerGrams || partnerGrams <= 0}
            className="ios-btn-primary"
          >
            Log for {partnerProfile.name}
          </button>
          <button onClick={onClose} className="ios-btn-secondary">No, just me</button>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// WORKOUT LOGGER (Apple-styled)
// ============================================================

function WorkoutLogger({ day, onClose, onSave }) {
  const [exerciseIdx, setExerciseIdx] = useState(0);
  const [activeSetIdx, setActiveSetIdx] = useState(0);
  const [platePickerSet, setPlatePickerSet] = useState(null); // which set index has picker open
  const [logged, setLogged] = useState(day.exercises.map(ex => ({
    exerciseId: ex.id, name: ex.name, prescribedWeight: ex.weight, progression: ex.progression, compound: ex.compound,
    sets: Array.from({ length: ex.sets }, () => ({ weight: isSmithExercise(ex.name) ? null : ex.weight, reps: null })), rpe: 7
  })));
  const [restTimer, setRestTimer] = useState(0);
  const [restActive, setRestActive] = useState(false);
  const restRef = useRef(null);
  const repsRefs = useRef({});

  useEffect(() => {
    if (!restActive) return;
    restRef.current = setInterval(() => setRestTimer(t => { if (t <= 1) { setRestActive(false); return 0; } return t - 1; }), 1000);
    return () => clearInterval(restRef.current);
  }, [restActive]);

  const ex = day.exercises[exerciseIdx];
  const currentLog = logged[exerciseIdx];

  // Compute exercise completion: how many sets have valid reps
  function exerciseStatus(idx) {
    const l = logged[idx];
    const validSets = l.sets.filter(s => s.reps != null && s.reps > 0).length;
    if (validSets === 0) return 'pending';
    if (validSets === l.sets.length) return 'done';
    return 'partial';
  }

  function updateSet(setIdx, field, value) {
    setLogged(prev => prev.map((l, i) => i === exerciseIdx ? { ...l, sets: l.sets.map((s, j) => {
      if (j !== setIdx) return s;
      if (value === '' || value == null) return { ...s, [field]: null };
      // Keep string for plate notation, convert to number otherwise
      const isPlateString = field === 'weight' && typeof value === 'string' && /[a-zA-Z+]/.test(value);
      return { ...s, [field]: isPlateString ? value : Number(value) };
    }) } : l));
  }
  function setRpe(rpe) { setLogged(prev => prev.map((l, i) => i === exerciseIdx ? { ...l, rpe } : l)); }
  function startRest() { setRestTimer(ex.compound ? 180 : 90); setRestActive(true); }

  function handleRepsBlur(setIdx) {
    const set = currentLog.sets[setIdx];
    if (set.reps == null || set.reps <= 0) return;
    startRest();
    // Advance active set
    if (setIdx < currentLog.sets.length - 1) {
      setActiveSetIdx(setIdx + 1);
    }
  }

  function jumpToExercise(idx) {
    setRestActive(false);
    setExerciseIdx(idx);
    // Find first unfilled set
    const l = logged[idx];
    const firstEmpty = l.sets.findIndex(s => s.reps == null || s.reps <= 0);
    setActiveSetIdx(firstEmpty >= 0 ? firstEmpty : 0);
  }

  function nextUnfinished() {
    setRestActive(false);
    // Find next exercise that's not done, starting from current+1, wrapping around
    const n = day.exercises.length;
    for (let i = 1; i < n; i++) {
      const idx = (exerciseIdx + i) % n;
      if (exerciseStatus(idx) !== 'done') {
        jumpToExercise(idx);
        return;
      }
    }
    // All done — trigger finish
    finish();
  }

  function finish() {
    onSave(logged);
    onClose();
  }

  // Check if any exercise has at least one logged set (gate for Finish)
  const hasAnyLoggedSets = logged.some(l => l.sets.some(s => s.reps != null && s.reps > 0));
  const allDone = day.exercises.every((_, i) => exerciseStatus(i) === 'done');

  return (
    <div className="ios-fullscreen">
      {/* Top bar */}
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
        <button onClick={onClose} className="ios-btn-text">Cancel</button>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{day.dayName} Day</div>
        <button
          onClick={finish}
          disabled={!hasAnyLoggedSets}
          className="ios-btn-text"
          style={{ fontWeight: 600, opacity: hasAnyLoggedSets ? 1 : 0.35 }}
        >
          Finish
        </button>
      </div>

      {/* Exercise pills */}
      <div className="hide-scrollbar" style={{ padding: '12px 16px', borderBottom: '0.5px solid rgba(84,84,88,0.35)', overflowX: 'auto', display: 'flex', gap: 8 }}>
        {day.exercises.map((e, i) => {
          const status = exerciseStatus(i);
          const isActive = i === exerciseIdx;
          let bg, color, border;
          if (isActive) {
            bg = '#0a84ff'; color = '#fff'; border = '#0a84ff';
          } else if (status === 'done') {
            bg = 'rgba(48,209,88,0.12)'; color = '#30d158'; border = 'transparent';
          } else if (status === 'partial') {
            bg = 'rgba(255,159,10,0.12)'; color = '#ff9f0a'; border = 'transparent';
          } else {
            bg = 'rgba(120,120,128,0.18)'; color = 'rgba(235,235,245,0.7)'; border = 'transparent';
          }
          return (
            <button
              key={e.id}
              onClick={() => jumpToExercise(i)}
              style={{
                flexShrink: 0, padding: '8px 14px', borderRadius: 999,
                background: bg, color, border: `1px solid ${border}`,
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s'
              }}
            >
              {status === 'done' && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
              <span style={{ whiteSpace: 'nowrap' }}>{shortenExName(e.name)}</span>
            </button>
          );
        })}
      </div>

      {/* Rest timer */}
      {restActive && (
        <div style={{ padding: '10px 16px', background: 'rgba(10,132,255,0.12)', borderBottom: '0.5px solid rgba(84,84,88,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 13, color: '#0a84ff', fontWeight: 500 }}>Rest</div>
          <div className="ios-num" style={{ fontSize: 22, fontWeight: 600, color: '#0a84ff' }}>{Math.floor(restTimer / 60)}:{String(restTimer % 60).padStart(2, '0')}</div>
          <button onClick={() => setRestActive(false)} className="ios-btn-text" style={{ fontSize: 14 }}>Skip</button>
        </div>
      )}

      {/* Exercise body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>{ex.name}</div>
        <div className="ios-num" style={{ fontSize: 14, color: 'rgba(235,235,245,0.6)', marginBottom: 20 }}>
          Target: {ex.sets} × {ex.repLow}–{ex.repHigh} reps
          {ex.note && <span style={{ marginLeft: 6 }}>· {ex.note}</span>}
        </div>

        {/* Sets list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {currentLog.sets.map((set, i) => {
            const isActive = i === activeSetIdx;
            const isDone = set.reps != null && set.reps > 0;
            const isFuture = !isActive && !isDone;
            const isLastSet = i === currentLog.sets.length - 1;

            return (
              <div
                key={i}
                style={{
                  background: isActive ? 'rgba(10,132,255,0.10)' : '#1c1c1e',
                  border: isActive ? '1px solid rgba(10,132,255,0.4)' : '1px solid transparent',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  opacity: isFuture ? 0.45 : 1,
                  transition: 'all 0.2s'
                }}
                onClick={() => !isActive && setActiveSetIdx(i)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 60 }}>
                  {isDone ? (
                    <div style={{ width: 18, height: 18, borderRadius: 9, background: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                  ) : (
                    <div className="ios-num" style={{ fontSize: 13, color: isActive ? '#0a84ff' : 'rgba(235,235,245,0.5)', fontWeight: isActive ? 600 : 400 }}>
                      Set {i + 1}
                    </div>
                  )}
                  {isDone && <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.6)' }}>Set {i + 1}</div>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {isSmithExercise(ex.name) ? (
                    <button
                      onClick={() => { setActiveSetIdx(i); setPlatePickerSet(i); }}
                      className="ios-num"
                      style={{
                        background: 'rgba(120,120,128,0.20)', border: 'none', outline: 'none',
                        color: set.weight ? '#fff' : 'rgba(235,235,245,0.4)',
                        fontSize: isActive ? 14 : 12, fontWeight: 600,
                        textAlign: 'center', minWidth: isActive ? 110 : 96,
                        padding: isActive ? '8px 10px' : '6px 8px',
                        borderRadius: 8,
                        fontFamily: 'inherit', cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      {set.weight || 'Tap to set'}
                    </button>
                  ) : (
                    <>
                      <input
                        type="number" inputMode="decimal" step="2.5" value={set.weight ?? ''}
                        onChange={e => updateSet(i, 'weight', e.target.value)}
                        onFocus={() => setActiveSetIdx(i)}
                        className="ios-num"
                        style={{
                          background: 'rgba(120,120,128,0.20)', border: 'none', outline: 'none',
                          color: '#fff',
                          fontSize: isActive ? 19 : 16, fontWeight: 600,
                          textAlign: 'center', width: isActive ? 70 : 60,
                          padding: isActive ? '8px 0' : '6px 0',
                          borderRadius: 8, caretColor: '#0a84ff',
                          transition: 'all 0.15s'
                        }}
                      />
                      <span style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)' }}>lb</span>
                    </>
                  )}
                  <span style={{ margin: '0 2px', color: 'rgba(235,235,245,0.3)' }}>×</span>
                  <input
                    ref={el => { if (el) repsRefs.current[i] = el; }}
                    type="number" inputMode="numeric" value={set.reps ?? ''}
                    onChange={e => updateSet(i, 'reps', e.target.value)}
                    onFocus={() => setActiveSetIdx(i)}
                    onBlur={() => handleRepsBlur(i)}
                    placeholder="0"
                    className="ios-num"
                    style={{
                      background: 'rgba(120,120,128,0.20)', border: 'none', outline: 'none',
                      color: '#fff',
                      fontSize: isActive ? 19 : 16, fontWeight: 600,
                      textAlign: 'center', width: isActive ? 60 : 52,
                      padding: isActive ? '8px 0' : '6px 0',
                      borderRadius: 8, caretColor: '#0a84ff',
                      transition: 'all 0.15s'
                    }}
                  />
                  <span style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)' }}>reps</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* RPE — only on last set */}
        {activeSetIdx === currentLog.sets.length - 1 && (
          <div style={{ background: '#1c1c1e', borderRadius: 14, padding: '16px 16px 14px', marginBottom: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 15 }}>How hard? <span style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)' }}>(last set)</span></div>
              <div className="ios-num" style={{ fontSize: 22, fontWeight: 600 }}>{currentLog.rpe ?? '—'}</div>
            </div>
            <input
              type="range" min="1" max="10" step="1" value={currentLog.rpe ?? 7}
              onChange={e => setRpe(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0a84ff' }}
            />
            <div className="ios-num" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(235,235,245,0.5)', marginTop: 2 }}>
              <span>1 Easy</span><span>10 Max</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div style={{ padding: 16, borderTop: '0.5px solid rgba(84,84,88,0.35)' }}>
        {allDone ? (
          <button onClick={finish} className="ios-btn-primary">Finish Workout</button>
        ) : (
          <button onClick={nextUnfinished} className="ios-btn-primary">
            Next Exercise
          </button>
        )}
      </div>

      {/* Plate picker for Smith exercises */}
      {platePickerSet !== null && (
        <div className="ios-modal-backdrop" onClick={() => setPlatePickerSet(null)}>
          <div className="ios-sheet" style={{ maxHeight: '70vh' }} onClick={e => e.stopPropagation()}>
            <div className="ios-grabber" />
            <div style={{ padding: '12px 16px 8px', fontSize: 13, color: 'rgba(235,235,245,0.5)', textAlign: 'center' }}>
              Set {platePickerSet + 1} · {ex.name}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
              <div className="ios-group">
                {PLATE_PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => {
                      updateSet(platePickerSet, 'weight', preset);
                      setPlatePickerSet(null);
                    }}
                    className="ios-row-button"
                  >
                    <div style={{ fontSize: 17 }}>{preset}</div>
                    {currentLog.sets[platePickerSet]?.weight === preset && (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0a84ff" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function shortenExName(name) {
  // Smart abbreviations for pill display
  return name
    .replace(/Smith /g, '')
    .replace(/Cable /g, '')
    .replace(/Bayesian /g, '')
    .replace(/One-Arm DB /g, '1-Arm ')
    .replace(/Cross-Body /g, 'XB ')
    .replace(/Cable-Assisted /g, '')
    .replace(/Bent-Over /g, '')
    .replace(/Overhead Tricep Ext/g, 'OH Tri')
    .replace(/Low-to-High /g, 'L→H ')
    .replace(/Hanging Knee Raise/g, 'Knee Raise')
    .replace(/Tricep Pushdown/g, 'Pushdown')
    .replace(/Lateral Cable Kickback/g, 'Kickback')
    .replace(/B-Stance Hip Thrust/g, 'B-Stance HT')
    .replace(/Hip Thrust/g, 'Hip Thrust')
    .replace(/Bulgarian Split Squat/g, 'Bulgarian SS')
    .replace(/Deficit Reverse Lunge/g, 'Def. Lunge')
    .replace(/Shoulder Press/g, 'Shoulder Press')
    .replace(/Face Pull/g, 'Face Pull')
    .replace(/Incline DB Curl/g, 'Curl')
    .trim();
}

// ============================================================
// SETTINGS
// ============================================================

function SettingsPage({ profile, onBack, onMacros, onFoods, onLastWorkouts }) {
  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={onBack} className="ios-btn-text" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div style={{ fontSize: 17, fontWeight: 600 }}>Settings</div>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: '12px 16px 24px' }}>
        <div className="ios-label ios-section-first">{profile.name}'s Macros</div>
        <div className="ios-group">
          <button onClick={onMacros} className="ios-row-button">
            <div>
              <div style={{ fontSize: 15 }}>Daily targets</div>
              <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)', marginTop: 2 }}>
                {profile.macros.calories} cal · {profile.macros.protein}p / {profile.macros.fat}f / {profile.macros.carbs}c
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="ios-label">Workouts</div>
        <div className="ios-group">
          <button onClick={onLastWorkouts} className="ios-row-button">
            <div style={{ fontSize: 15 }}>Last workouts</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        <div className="ios-label">Foods</div>
        <div className="ios-group">
          <button onClick={onFoods} className="ios-row-button">
            <div style={{ fontSize: 15 }}>Manage saved foods</div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function MacrosSheet({ profile, onClose, onSave }) {
  const [m, setM] = useState(profile.macros);
  return (
    <div className="ios-modal-backdrop" onClick={onClose}>
      <div className="ios-sheet" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <button onClick={onClose} className="ios-btn-text">Cancel</button>
          <div style={{ fontSize: 17, fontWeight: 600 }}>Macros</div>
          <button onClick={() => onSave({ calories: Number(m.calories), protein: Number(m.protein), fat: Number(m.fat), carbs: Number(m.carbs) })} className="ios-btn-text" style={{ fontWeight: 600 }}>Save</button>
        </div>
        <div style={{ padding: '16px 16px 24px' }}>
          <div className="ios-group">
            {[['calories', 'Calories'], ['protein', 'Protein'], ['fat', 'Fat'], ['carbs', 'Carbs']].map(([k, label]) => (
              <div key={k} className="ios-row">
                <div style={{ fontSize: 15 }}>{label}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <input
                    type="number" inputMode="decimal" value={m[k] ?? ''}
                    onChange={e => setM({ ...m, [k]: e.target.value })}
                    className="ios-num"
                    style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 17, textAlign: 'right', width: 70, caretColor: '#0a84ff' }}
                  />
                  {k !== 'calories' && <span style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)' }}>g</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManageFoodsSheet({ foods, onClose, onDelete }) {
  const [filter, setFilter] = useState('');
  const filtered = filter ? foods.filter(f => f.name.toLowerCase().includes(filter.toLowerCase())) : foods;
  return (
    <div className="ios-modal-backdrop" onClick={onClose}>
      <div className="ios-sheet" style={{ height: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <div style={{ width: 60 }} />
          <div style={{ fontSize: 17, fontWeight: 600 }}>Saved Foods</div>
          <button onClick={onClose} className="ios-btn-text" style={{ fontWeight: 600 }}>Done</button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ background: 'rgba(120,120,128,0.16)', borderRadius: 10, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.5)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search" className="ios-input" />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 24px' }}>
          <div className="ios-group">
            {filtered.map(f => (
              <div key={f.id} className="ios-row">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                  <div className="ios-num" style={{ fontSize: 12, color: 'rgba(235,235,245,0.5)', marginTop: 2 }}>
                    {Math.round(f.per100g.calories)} cal/100g · used {f.timesUsed}×
                  </div>
                </div>
                <button onClick={() => onDelete(f.id)} style={{ background: 'none', border: 'none', color: '#ff453a', fontSize: 14, cursor: 'pointer' }}>Delete</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function LastWorkoutsSheet({ workouts, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(null);
  // Reverse chronological
  const sorted = [...workouts].reverse();

  if (selectedIdx !== null) {
    const w = sorted[selectedIdx];
    return (
      <div className="ios-modal-backdrop" onClick={onClose}>
        <div className="ios-sheet" style={{ height: '85vh' }} onClick={e => e.stopPropagation()}>
          <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
            <button onClick={() => setSelectedIdx(null)} className="ios-btn-text">Back</button>
            <div style={{ fontSize: 17, fontWeight: 600 }}>{w.dayName}</div>
            <button onClick={onClose} className="ios-btn-text" style={{ fontWeight: 600 }}>Done</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
            <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)', textAlign: 'center', marginBottom: 16 }}>
              {new Date(w.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </div>
            {w.exercises.map(ex => {
              const validSets = (ex.sets || []).filter(s => s.reps != null && s.reps > 0);
              if (validSets.length === 0) return null;
              return (
                <div key={ex.exerciseId} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{ex.name}</div>
                  <div className="ios-group">
                    {validSets.map((s, i) => (
                      <div key={i} className="ios-row" style={{ padding: '10px 14px' }}>
                        <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)' }}>Set {i + 1}</div>
                        <div className="ios-num" style={{ fontSize: 15 }}>
                          {typeof s.weight === 'string' ? s.weight : `${s.weight} lb`} × {s.reps}
                        </div>
                      </div>
                    ))}
                    {ex.rpe && (
                      <div className="ios-row" style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)' }}>RPE (last set)</div>
                        <div className="ios-num" style={{ fontSize: 15 }}>{ex.rpe}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ios-modal-backdrop" onClick={onClose}>
      <div className="ios-sheet" style={{ height: '85vh' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '0.5px solid rgba(84,84,88,0.35)' }}>
          <div style={{ width: 60 }} />
          <div style={{ fontSize: 17, fontWeight: 600 }}>Last Workouts</div>
          <button onClick={onClose} className="ios-btn-text" style={{ fontWeight: 600 }}>Done</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
          {sorted.length === 0 ? (
            <div style={{ color: 'rgba(235,235,245,0.5)', fontSize: 15, textAlign: 'center', padding: '48px 0' }}>No workouts logged yet</div>
          ) : (
            <div className="ios-group">
              {sorted.map((w, i) => (
                <button key={i} onClick={() => setSelectedIdx(i)} className="ios-row-button">
                  <div>
                    <div style={{ fontSize: 15 }}>{w.dayName}</div>
                    <div className="ios-num" style={{ fontSize: 13, color: 'rgba(235,235,245,0.5)', marginTop: 2 }}>
                      {new Date(w.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(235,235,245,0.3)" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
