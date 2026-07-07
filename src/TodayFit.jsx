import React, { useState, useMemo, useEffect, useRef } from "react";
import { Dumbbell, Ruler, Weight, CalendarDays, ChevronDown, ChevronUp, ShieldAlert, Sparkles, ArrowRight, ArrowLeft, CheckCircle2, Circle, Timer, RotateCcw, Flame, Trophy, Wind } from "lucide-react";

const HISTORY_KEY = "todayfit-history";

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

function computeStreak(history) {
  if (!history.length) return 0;
  const days = new Set(history.map((h) => h.date));
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/* ------------------------------------------------------------------ */
/*  FONTS                                                              */
/* ------------------------------------------------------------------ */
function useGoogleFonts() {
  useEffect(() => {
    const id = "todayfit-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(link);
  }, []);
}

/* ------------------------------------------------------------------ */
/*  EXERCISE DATA (original instructions/cues written for this app)   */
/* ------------------------------------------------------------------ */
const EXERCISES = [
  // CHEST
  { id: "c1", name: "Push-up", category: "chest", equipment: "bodyweight", target: "Chest", secondary: "Triceps, Shoulders", anim: "pushup", sets: 3, reps: 12, cues: ["Hands under shoulders, body one straight line", "Lower chest to floor, elbows ~45°", "Push back up without sagging hips"] },
  { id: "c2", name: "Incline Push-up", category: "chest", equipment: "bodyweight", target: "Chest", secondary: "Triceps", anim: "pushup", sets: 3, reps: 15, cues: ["Hands on a sturdy raised surface", "Easier angle, same straight-body form", "Great warm-up before flat push-ups"] },
  { id: "c3", name: "Dumbbell Floor Press", category: "chest", equipment: "dumbbell", target: "Chest", secondary: "Triceps, Shoulders", anim: "press", sets: 3, reps: 10, cues: ["Lie on back, knees bent", "Press dumbbells straight up over chest", "Lower slowly until elbows tap the floor"] },
  { id: "c4", name: "Dumbbell Fly", category: "chest", equipment: "dumbbell", target: "Chest", secondary: "Shoulders", anim: "raise", sets: 3, reps: 12, cues: ["Slight bend in elbows throughout", "Open arms wide like hugging a barrel", "Squeeze chest to bring weights back together"] },
  { id: "c5", name: "Band Chest Press", category: "chest", equipment: "band", target: "Chest", secondary: "Triceps", anim: "press", sets: 3, reps: 14, cues: ["Anchor band behind you at chest height", "Press forward, exhale on the push", "Control the return, don't let it snap back"] },

  // BACK
  { id: "b1", name: "Bodyweight Row (table)", category: "back", equipment: "bodyweight", target: "Lats", secondary: "Biceps, Rear delts", anim: "row", sets: 3, reps: 12, cues: ["Grip sturdy edge, body straight underneath", "Pull chest toward your hands", "Squeeze shoulder blades together at the top"] },
  { id: "b2", name: "Dumbbell Bent-over Row", category: "back", equipment: "dumbbell", target: "Lats", secondary: "Biceps, Rear delts", anim: "row", sets: 3, reps: 10, cues: ["Hinge at hips, flat back", "Pull dumbbells to your ribs", "Lower with control, no jerking"] },
  { id: "b3", name: "Superman Extension", category: "back", equipment: "bodyweight", target: "Lower back", secondary: "Glutes", anim: "extension", sets: 3, reps: 12, cues: ["Lie face down, arms extended forward", "Lift chest and legs a few inches together", "Hold briefly, lower with control"] },
  { id: "b4", name: "Band Seated Row", category: "back", equipment: "band", target: "Mid back", secondary: "Biceps", anim: "row", sets: 3, reps: 14, cues: ["Sit tall, band around feet", "Pull elbows straight back", "Pinch shoulder blades, chest stays proud"] },
  { id: "b5", name: "Reverse Fly (band or light dumbbell)", category: "back", equipment: "dumbbell", target: "Rear delts", secondary: "Mid back", anim: "raise", sets: 3, reps: 12, cues: ["Hinge forward slightly, soft knees", "Sweep arms out and back", "Lead with the elbows, not the hands"] },

  // UPPER LEGS
  { id: "l1", name: "Bodyweight Squat", category: "upperLegs", equipment: "bodyweight", target: "Quads", secondary: "Glutes, Hamstrings", anim: "squat", sets: 3, reps: 15, cues: ["Feet shoulder-width, chest up", "Sit hips back and down like a chair", "Drive through heels to stand"] },
  { id: "l2", name: "Goblet Squat", category: "upperLegs", equipment: "dumbbell", target: "Quads", secondary: "Glutes", anim: "squat", sets: 3, reps: 12, cues: ["Hold weight close to chest", "Elbows brush inside of knees at the bottom", "Keep the weight in your heels"] },
  { id: "l3", name: "Walking Lunge", category: "upperLegs", equipment: "bodyweight", target: "Quads", secondary: "Glutes", anim: "lunge", sets: 3, reps: 10, cues: ["Step forward, lower back knee toward floor", "Front knee stays over the ankle", "Push off to step into the next lunge"] },
  { id: "l4", name: "Glute Bridge", category: "upperLegs", equipment: "bodyweight", target: "Glutes", secondary: "Hamstrings", anim: "bridge", sets: 3, reps: 15, cues: ["Lie back, knees bent, feet flat", "Squeeze glutes to lift hips up", "Pause at top, lower slowly"] },
  { id: "l5", name: "Wall Sit", category: "upperLegs", equipment: "bodyweight", target: "Quads", secondary: "Glutes", anim: "wallsit", sets: 3, reps: 30, holdSeconds: true, cues: ["Back flat against a wall, knees at 90°", "Weight through the heels", "Breathe steadily through the hold"] },

  // LOWER LEGS
  { id: "ll1", name: "Standing Calf Raise", category: "lowerLegs", equipment: "bodyweight", target: "Calves", secondary: "", anim: "calfraise", sets: 3, reps: 20, cues: ["Feet hip-width, rise onto your toes", "Pause and squeeze at the top", "Lower heels slowly, don't bounce"] },
  { id: "ll2", name: "Dumbbell Calf Raise", category: "lowerLegs", equipment: "dumbbell", target: "Calves", secondary: "", anim: "calfraise", sets: 3, reps: 15, cues: ["Hold dumbbells at your sides", "Rise fully onto the balls of your feet", "Control the descent fully"] },
  { id: "ll3", name: "Ankle Hops", category: "lowerLegs", equipment: "bodyweight", target: "Calves", secondary: "Cardio", anim: "jump", sets: 3, reps: 20, cues: ["Small, quick hops off the ground", "Land softly on the balls of your feet", "Keep knees soft, stay light"] },

  // SHOULDERS
  { id: "s1", name: "Dumbbell Shoulder Press", category: "shoulders", equipment: "dumbbell", target: "Deltoids", secondary: "Triceps", anim: "press", sets: 3, reps: 10, cues: ["Start weights at shoulder height", "Press straight overhead, don't arch back", "Lower with control to start position"] },
  { id: "s2", name: "Lateral Raise", category: "shoulders", equipment: "dumbbell", target: "Deltoids", secondary: "Traps", anim: "raise", sets: 3, reps: 12, cues: ["Slight bend in elbows", "Raise arms out to shoulder height", "Lead with elbows, lower slowly"] },
  { id: "s3", name: "Front Raise", category: "shoulders", equipment: "dumbbell", target: "Front delts", secondary: "", anim: "raise", sets: 3, reps: 12, cues: ["Arms in front, palms facing down", "Raise to shoulder height, no swinging", "Lower under control"] },
  { id: "s4", name: "Band Pull-Apart", category: "shoulders", equipment: "band", target: "Rear delts", secondary: "Upper back", anim: "row", sets: 3, reps: 15, cues: ["Hold band at chest height, arms straight", "Pull the band apart until it touches your chest", "Return slowly, keep tension throughout"] },
  { id: "s5", name: "Pike Push-up", category: "shoulders", equipment: "bodyweight", target: "Deltoids", secondary: "Triceps", anim: "pushup", sets: 3, reps: 8, cues: ["Hips high, forming an inverted V", "Lower head toward the floor", "Press back up through the shoulders"] },

  // UPPER ARMS
  { id: "a1", name: "Dumbbell Bicep Curl", category: "upperArms", equipment: "dumbbell", target: "Biceps", secondary: "Forearms", anim: "curl", sets: 3, reps: 12, cues: ["Elbows pinned to your sides", "Curl up, squeeze at the top", "Lower slowly, no swinging"] },
  { id: "a2", name: "Band Bicep Curl", category: "upperArms", equipment: "band", target: "Biceps", secondary: "Forearms", anim: "curl", sets: 3, reps: 15, cues: ["Stand on the band, feet hip-width", "Curl hands up toward shoulders", "Control the band on the way down"] },
  { id: "a3", name: "Chair Tricep Dip", category: "upperArms", equipment: "bodyweight", target: "Triceps", secondary: "Chest", anim: "dip", sets: 3, reps: 12, cues: ["Hands on chair edge, legs extended", "Lower until elbows hit ~90°", "Press back up through the palms"] },
  { id: "a4", name: "Overhead Tricep Extension", category: "upperArms", equipment: "dumbbell", target: "Triceps", secondary: "", anim: "overhead", sets: 3, reps: 12, cues: ["Weight held overhead with both hands", "Lower behind your head, elbows tucked", "Extend back up without flaring elbows"] },

  // LOWER ARMS
  { id: "la1", name: "Dumbbell Wrist Curl", category: "lowerArms", equipment: "dumbbell", target: "Forearms", secondary: "", anim: "wristcurl", sets: 3, reps: 15, cues: ["Forearms resting on your thighs", "Curl the weight up using just the wrist", "Lower slowly for full stretch"] },
  { id: "la2", name: "Farmer's Carry", category: "lowerArms", equipment: "dumbbell", target: "Forearms", secondary: "Core, Traps", anim: "carry", sets: 3, reps: 30, holdSeconds: true, cues: ["Stand tall, weight in each hand", "Walk with short, controlled steps", "Keep shoulders back, grip firm"] },

  // WAIST / CORE
  { id: "w1", name: "Crunch", category: "waist", equipment: "bodyweight", target: "Abs", secondary: "", anim: "situp", sets: 3, reps: 15, cues: ["Knees bent, hands lightly behind head", "Curl shoulder blades just off the floor", "Lower slowly, keep neck relaxed"] },
  { id: "w2", name: "Full Sit-up", category: "waist", equipment: "bodyweight", target: "Abs", secondary: "Hip flexors", anim: "situp", sets: 3, reps: 12, cues: ["Knees bent, feet anchored if possible", "Curl all the way up to your knees", "Lower with control, don't slam down"] },
  { id: "w3", name: "Russian Twist", category: "waist", equipment: "bodyweight", target: "Obliques", secondary: "", anim: "twist", sets: 3, reps: 20, cues: ["Lean back slightly, feet lifted or grounded", "Rotate torso side to side", "Move slowly, control beats speed"] },
  { id: "w4", name: "Plank", category: "waist", equipment: "bodyweight", target: "Core", secondary: "Shoulders", anim: "plank", sets: 3, reps: 30, holdSeconds: true, cues: ["Forearms and toes on the floor", "One straight line from head to heels", "Brace your abs, breathe steadily"] },
  { id: "w5", name: "Bicycle Crunch", category: "waist", equipment: "bodyweight", target: "Obliques", secondary: "Abs", anim: "twist", sets: 3, reps: 20, cues: ["Elbow toward opposite knee, alternating", "Extend the other leg out low", "Keep the motion slow and controlled"] },
  { id: "w6", name: "Leg Raise", category: "waist", equipment: "bodyweight", target: "Lower abs", secondary: "Hip flexors", anim: "legraise", sets: 3, reps: 12, cues: ["Lie flat, legs straight, low back pressed down", "Lift legs to vertical without swinging", "Lower slowly, stop before the floor"] },

  // CARDIO
  { id: "cr1", name: "Jumping Jacks", category: "cardio", equipment: "bodyweight", target: "Full body", secondary: "Cardio", anim: "jump", sets: 3, reps: 30, cues: ["Jump feet apart while raising arms overhead", "Jump back to start, stay light on your feet", "Keep a steady rhythm"] },
  { id: "cr2", name: "High Knees", category: "cardio", equipment: "bodyweight", target: "Legs", secondary: "Cardio", anim: "jump", sets: 3, reps: 30, cues: ["Drive knees up toward chest quickly", "Pump arms in rhythm with legs", "Stay on the balls of your feet"] },
  { id: "cr3", name: "Mountain Climbers", category: "cardio", equipment: "bodyweight", target: "Core", secondary: "Cardio, Shoulders", anim: "climber", sets: 3, reps: 24, cues: ["Start in a plank position", "Drive knees toward chest, alternating quickly", "Keep hips low and steady"] },

  // NECK
  { id: "n1", name: "Neck Tilt Stretch", category: "neck", equipment: "bodyweight", target: "Neck", secondary: "", anim: "stretch", sets: 2, reps: 20, holdSeconds: true, cues: ["Tilt ear gently toward shoulder", "Hold, feel a light stretch, no pain", "Repeat slowly on the other side"] },
  { id: "n2", name: "Neck Rotation", category: "neck", equipment: "bodyweight", target: "Neck", secondary: "", anim: "stretch", sets: 2, reps: 20, holdSeconds: true, cues: ["Slowly turn your head to one side", "Hold briefly, keep shoulders relaxed", "Return to center and repeat other side"] },
];

/* ------------------------------------------------------------------ */
/*  WORKOUT CATEGORIES                                                 */
/* ------------------------------------------------------------------ */
const CATEGORIES = [
  { id: "chest", label: "Chest", tone: "Push strength and size" },
  { id: "back", label: "Back", tone: "Pull strength and posture" },
  { id: "shoulders", label: "Shoulders", tone: "Broader, more defined delts" },
  { id: "upperArms", label: "Biceps & Triceps", tone: "Upper-arm strength and size" },
  { id: "lowerArms", label: "Forearms", tone: "Grip and forearm strength" },
  { id: "upperLegs", label: "Upper Legs", tone: "Quads, glutes, hamstrings" },
  { id: "lowerLegs", label: "Lower Legs", tone: "Calves and ankle stability" },
  { id: "waist", label: "Core", tone: "Abs and obliques" },
  { id: "cardio", label: "Cardio", tone: "Heart rate and endurance" },
  { id: "neck", label: "Neck", tone: "Mobility and light recovery" },
];

const EQUIPMENT_OPTIONS = [
  { id: "bodyweight", label: "Bodyweight only" },
  { id: "dumbbell", label: "Dumbbells" },
  { id: "band", label: "Resistance band" },
];

/* ------------------------------------------------------------------ */
/*  BMI helpers                                                        */
/* ------------------------------------------------------------------ */
function bmiInfo(weightKg, heightCm) {
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  let label = "Healthy range";
  if (bmi < 18.5) label = "Below typical range";
  else if (bmi >= 25 && bmi < 30) label = "Above typical range";
  else if (bmi >= 30) label = "Well above typical range";
  return { bmi: Math.round(bmi * 10) / 10, label };
}

const WARMUP_IDS = ["cr1", "cr2"];
const COOLDOWN_IDS = ["n1", "n2"];

function getWarmUp() {
  return EXERCISES.filter((e) => WARMUP_IDS.includes(e.id)).map((ex) => ({ ...ex, reps: 20 }));
}

function getCoolDown() {
  return EXERCISES.filter((e) => COOLDOWN_IDS.includes(e.id));
}

function buildCategoryPlan({ age, weightKg, heightCm, equipment, categoryId }) {
  const meta = CATEGORIES.find((c) => c.id === categoryId);
  const { bmi } = bmiInfo(weightKg, heightCm);

  let pool = EXERCISES.filter(
    (e) => e.category === categoryId && equipment.includes(e.equipment)
  );
  if (pool.length < 3) {
    // fall back to any equipment for this category so the list never feels empty
    pool = EXERCISES.filter((e) => e.category === categoryId);
  }

  const picks = pool.map((ex) => {
    let reps = ex.reps;
    let note = null;
    if (age >= 55) {
      reps = ex.holdSeconds ? reps : Math.max(8, Math.round(reps * 0.8));
      note = "Lower-impact pace — prioritize clean form over speed.";
    }
    if (bmi >= 28 && !ex.holdSeconds) {
      reps = Math.round(reps * 1.15);
    }
    return { ...ex, reps, note };
  });

  return { meta, picks, bmi };
}

/* ------------------------------------------------------------------ */
/*  STICK FIGURE ANIMATION                                             */
/* ------------------------------------------------------------------ */
function StickFigure({ anim }) {
  // shared visual language: navy stroke, coral accent joint dots
  const stroke = "var(--ink)";
  const accent = "var(--accent)";
  const common = { fill: "none", stroke, strokeWidth: 5, strokeLinecap: "round", strokeLinejoin: "round" };

  const Head = ({ cx = 100, cy = 34 }) => <circle cx={cx} cy={cy} r={13} fill="var(--surface)" stroke={stroke} strokeWidth={5} />;

  switch (anim) {
    case "squat":
      return (
        <svg viewBox="0 0 200 180" className="fig">
          <g className="fig-squat">
            <Head cx="100" cy="30" />
            <path d="M100 43 L100 95" {...common} />
            <path className="fig-squat-legs" d="M100 95 L78 140 L78 165 M100 95 L122 140 L122 165" {...common} />
            <path d="M100 55 L74 80 M100 55 L126 80" {...common} />
          </g>
        </svg>
      );
    case "lunge":
      return (
        <svg viewBox="0 0 200 180" className="fig">
          <g className="fig-lunge">
            <Head cx="100" cy="28" />
            <path d="M100 41 L96 90" {...common} />
            <path className="fig-lunge-front" d="M96 90 L120 118 L112 160" {...common} />
            <path className="fig-lunge-back" d="M96 90 L70 105 L82 160" {...common} />
            <path d="M98 52 L74 70 M98 52 L124 70" {...common} />
          </g>
        </svg>
      );
    case "pushup":
    case "dip":
      return (
        <svg viewBox="0 0 220 140" className="fig">
          <g className="fig-pushup">
            <circle cx="34" cy="70" r="12" fill="var(--surface)" stroke={stroke} strokeWidth={5} />
            <path d="M46 72 L160 72" {...common} />
            <path d="M160 72 L182 100 M160 72 L150 100" {...common} />
            <path className="fig-pushup-arm" d="M60 76 L60 112 M110 76 L110 112" {...common} />
          </g>
        </svg>
      );
    case "plank":
      return (
        <svg viewBox="0 0 220 140" className="fig">
          <g className="fig-plank">
            <circle cx="34" cy="68" r="12" fill="var(--surface)" stroke={stroke} strokeWidth={5} />
            <path d="M46 70 L160 70" {...common} />
            <path d="M160 70 L182 100 M160 70 L150 100" {...common} />
            <path d="M60 74 L60 108 M110 74 L110 108" {...common} />
          </g>
        </svg>
      );
    case "climber":
      return (
        <svg viewBox="0 0 220 140" className="fig">
          <g className="fig-plank">
            <circle cx="34" cy="68" r="12" fill="var(--surface)" stroke={stroke} strokeWidth={5} />
            <path d="M46 70 L160 70" {...common} />
            <path d="M60 74 L60 108" {...common} />
            <path className="fig-climber-leg" d="M160 70 L182 100 M160 70 L150 100" {...common} />
          </g>
        </svg>
      );
    case "situp":
    case "legraise":
      return (
        <svg viewBox="0 0 220 140" className="fig">
          <g className="fig-situp-base">
            <path d="M40 118 L100 118 L118 100" {...common} strokeDasharray="0" />
            <path d="M118 100 L150 118" {...common} />
            <path d="M150 118 L160 140" {...common} />
          </g>
          <g className="fig-situp-move">
            <circle cx="40" cy="105" r="12" fill="var(--surface)" stroke={stroke} strokeWidth={5} />
            <path d="M52 108 L96 118" {...common} />
          </g>
        </svg>
      );
    case "bridge":
      return (
        <svg viewBox="0 0 220 140" className="fig">
          <circle cx="34" cy="110" r="12" fill="var(--surface)" stroke={stroke} strokeWidth={5} />
          <path d="M46 112 L100 112" {...common} />
          <g className="fig-bridge">
            <path d="M100 112 L128 96 L150 112" {...common} />
            <path d="M150 112 L152 138" {...common} />
          </g>
        </svg>
      );
    case "wallsit":
      return (
        <svg viewBox="0 0 200 180" className="fig">
          <Head cx="70" cy="40" />
          <path d="M70 53 L70 100" {...common} />
          <path d="M70 100 L110 100 L110 145" {...common} />
          <path d="M70 100 L110 145" {...common} opacity="0" />
          <path className="fig-wallsit-wobble" d="M110 100 L110 145" {...common} />
          <line x1="130" y1="20" x2="130" y2="160" stroke="var(--line)" strokeWidth="8" />
        </svg>
      );
    case "calfraise":
      return (
        <svg viewBox="0 0 160 160" className="fig">
          <Head cx="80" cy="30" />
          <path d="M80 43 L80 100" {...common} />
          <path d="M60 55 L100 55" {...common} />
          <g className="fig-calf">
            <path d="M80 100 L64 130 L64 142 M80 100 L96 130 L96 142" {...common} />
          </g>
        </svg>
      );
    case "press":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <Head cx="100" cy="70" />
          <path d="M100 83 L100 130" {...common} />
          <path d="M84 150 L100 130 L116 150" {...common} />
          <g className="fig-press-arm">
            <path d="M100 95 L70 95 M100 95 L130 95" {...common} />
          </g>
        </svg>
      );
    case "raise":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <Head cx="100" cy="60" />
          <path d="M100 73 L100 128" {...common} />
          <path d="M84 150 L100 128 L116 150" {...common} />
          <g className="fig-raise-arm">
            <path d="M100 85 L64 100 M100 85 L136 100" {...common} />
          </g>
        </svg>
      );
    case "curl":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <Head cx="100" cy="34" />
          <path d="M100 47 L100 100" {...common} />
          <path d="M84 120 L100 100 L116 120" {...common} />
          <path d="M100 60 L70 78" {...common} />
          <g className="fig-curl-forearm" style={{ transformOrigin: "70px 78px" }}>
            <path d="M70 78 L78 55" {...common} />
            <circle cx="78" cy="55" r="6" fill={accent} />
          </g>
          <path d="M100 60 L130 78" {...common} />
        </svg>
      );
    case "overhead":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <Head cx="100" cy="40" />
          <path d="M100 53 L100 108" {...common} />
          <path d="M84 128 L100 108 L116 128" {...common} />
          <g className="fig-overhead-arm" style={{ transformOrigin: "100px 60px" }}>
            <path d="M100 60 L78 30 M100 60 L122 30" {...common} />
            <circle cx="100" cy="24" r="7" fill={accent} />
          </g>
        </svg>
      );
    case "row":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <Head cx="80" cy="46" />
          <path d="M80 59 L120 100" {...common} />
          <path d="M120 100 L104 140 M120 100 L136 140" {...common} />
          <g className="fig-row-arm">
            <path d="M92 70 L150 60" {...common} />
            <circle cx="150" cy="60" r="6" fill={accent} />
          </g>
        </svg>
      );
    case "twist":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <path d="M60 130 L140 130" stroke="var(--line)" strokeWidth="8" />
          <circle cx="100" cy="110" r="10" fill="var(--surface)" stroke={stroke} strokeWidth={5} />
          <path d="M100 120 L100 128" {...common} />
          <g className="fig-twist-arms" style={{ transformOrigin: "100px 105px" }}>
            <Head cx="100" cy="75" />
            <path d="M100 88 L100 122" {...common} />
            <path d="M100 95 L66 105 M100 95 L134 105" {...common} />
          </g>
        </svg>
      );
    case "wristcurl":
      return (
        <svg viewBox="0 0 200 120" className="fig">
          <path d="M40 80 L110 80" {...common} />
          <g className="fig-wrist" style={{ transformOrigin: "110px 80px" }}>
            <path d="M110 80 L140 80" {...common} />
            <circle cx="140" cy="80" r="7" fill={accent} />
          </g>
        </svg>
      );
    case "carry":
      return (
        <svg viewBox="0 0 200 160" className="fig">
          <Head cx="100" cy="34" />
          <path d="M100 47 L100 105" {...common} />
          <g className="fig-carry-legs">
            <path d="M100 105 L82 145 M100 105 L118 145" {...common} />
          </g>
          <path d="M100 60 L74 100" {...common} />
          <circle cx="74" cy="100" r="7" fill={accent} />
          <path d="M100 60 L126 100" {...common} />
          <circle cx="126" cy="100" r="7" fill={accent} />
        </svg>
      );
    case "extension":
      return (
        <svg viewBox="0 0 220 120" className="fig">
          <path d="M40 90 L170 90" {...common} />
          <g className="fig-ext">
            <path d="M40 90 L20 78" {...common} />
            <path d="M170 90 L190 78" {...common} />
          </g>
        </svg>
      );
    case "stretch":
    default:
      return (
        <svg viewBox="0 0 160 180" className="fig">
          <path d="M80 100 L80 160" {...common} />
          <path d="M62 140 L80 160 L98 140" {...common} />
          <g className="fig-stretch-neck" style={{ transformOrigin: "80px 90px" }}>
            <Head cx="80" cy="70" />
            <path d="M80 83 L80 100" {...common} />
          </g>
        </svg>
      );
  }
}

/* ------------------------------------------------------------------ */
/*  REST TIMER                                                         */
/* ------------------------------------------------------------------ */
function RestTimer() {
  const [seconds, setSeconds] = useState(60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current);
            setRunning(false);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running]);

  const adjust = (delta) => {
    setRunning(false);
    setSeconds((s) => Math.max(15, Math.min(240, s + delta)));
  };

  const reset = () => {
    setRunning(false);
    setSeconds(60);
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="rest-timer">
      <div className="rest-timer-left">
        <Timer size={15} />
        <span className="rest-timer-clock">{mm}:{ss}</span>
      </div>
      <div className="rest-timer-actions">
        <button type="button" className="rest-btn" onClick={() => adjust(-15)}>-15s</button>
        <button type="button" className="rest-btn rest-btn-primary" onClick={() => setRunning((r) => !r)}>
          {running ? "Pause" : seconds === 0 ? "Restart" : "Rest"}
        </button>
        <button type="button" className="rest-btn" onClick={() => adjust(15)}>+15s</button>
        <button type="button" className="rest-btn rest-btn-icon" onClick={reset} aria-label="Reset timer">
          <RotateCcw size={13} />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  EXERCISE CARD                                                      */
/* ------------------------------------------------------------------ */
function ExerciseCard({ ex, index, done, onToggleDone }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className={"ex-card" + (done ? " ex-card-done" : "")}>
      <div className="ex-head">
        <button
          type="button"
          className="ex-check"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone();
          }}
          aria-label={done ? "Mark not done" : "Mark done"}
        >
          {done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
        </button>
        <button className="ex-head-main" onClick={() => setOpen((o) => !o)}>
          <div className="ex-num">{String(index + 1).padStart(2, "0")}</div>
          <div className="ex-title">
            <div className="ex-name">{ex.name}</div>
            <div className="ex-tags">
              <span className="tag tag-target">{ex.target}</span>
              <span className="tag">{ex.equipment === "bodyweight" ? "Bodyweight" : ex.equipment === "dumbbell" ? "Dumbbell" : "Band"}</span>
            </div>
          </div>
          <div className="ex-scoreboard">
            <span className="scoreboard-num">{ex.sets}</span>
            <span className="scoreboard-x">×</span>
            <span className="scoreboard-num">{ex.reps}{ex.holdSeconds ? "s" : ""}</span>
          </div>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>
      {open && (
        <div className="ex-body">
          <div className="ex-demo">
            <StickFigure anim={ex.anim} />
          </div>
          <div className="ex-cues">
            {ex.note && <div className="ex-note">{ex.note}</div>}
            <ul>
              {ex.cues.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <RestTimer />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MAIN APP                                                           */
/* ------------------------------------------------------------------ */
export default function TodayFit() {
  useGoogleFonts();

  const [stage, setStage] = useState("form"); // form | category | plan
  const [age, setAge] = useState(30);
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(70);
  const [equipment, setEquipment] = useState(["bodyweight"]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [completed, setCompleted] = useState({});
  const [history, setHistory] = useState([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const toggleEquip = (id) => {
    setEquipment((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleDone = (id) => {
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const activeEquipment = equipment.length ? equipment : ["bodyweight"];

  const categoryCounts = useMemo(() => {
    const counts = {};
    CATEGORIES.forEach((c) => {
      const matched = EXERCISES.filter((e) => e.category === c.id && activeEquipment.includes(e.equipment));
      counts[c.id] = matched.length >= 1 ? matched.length : EXERCISES.filter((e) => e.category === c.id).length;
    });
    return counts;
  }, [equipment]);

  const plan = useMemo(() => {
    if (stage !== "plan" || !selectedCategory) return null;
    return buildCategoryPlan({
      age: Number(age),
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      equipment: activeEquipment,
      categoryId: selectedCategory,
    });
  }, [stage, selectedCategory, age, weightKg, heightCm, equipment]);

  const stepIndex = stage === "form" ? 0 : stage === "category" ? 1 : 2;
  const warmUp = useMemo(() => getWarmUp(), []);
  const coolDown = useMemo(() => getCoolDown(), []);
  const doneCount = plan ? plan.picks.filter((ex) => completed[ex.id]).length : 0;
  const streak = useMemo(() => computeStreak(history), [history]);

  const finishWorkout = () => {
    if (!plan) return;
    const today = new Date().toISOString().slice(0, 10);
    const entry = { date: today, category: plan.meta.label, completed: doneCount, total: plan.picks.length };
    const next = [entry, ...history.filter((h) => !(h.date === today && h.category === plan.meta.label))].slice(0, 30);
    setHistory(next);
    saveHistory(next);
    setStage("done");
  };

  return (
    <div className="tf-root">
      <style>{`
        .tf-root {
          --bg: #EEF1EE;
          --surface: #FFFFFF;
          --ink: #10182B;
          --ink-soft: #56606F;
          --accent: #FF4B2B;
          --accent-2: #00A896;
          --line: #D7DCDA;
          background: var(--bg);
          color: var(--ink);
          font-family: 'IBM Plex Sans', sans-serif;
          min-height: 100%;
          padding: 28px 20px 60px;
          box-sizing: border-box;
        }
        .tf-root * { box-sizing: border-box; }
        .tf-wrap { max-width: 760px; margin: 0 auto; }

        .tf-brand { display:flex; align-items:center; gap:10px; margin-bottom: 18px; }
        .tf-brand .dot { width:10px; height:10px; border-radius:2px; background: var(--accent); }
        .tf-brand-name { font-family:'IBM Plex Mono'; font-size:13px; letter-spacing:0.18em; text-transform:uppercase; color: var(--ink-soft); }

        .tf-steps { display:flex; align-items:center; gap:8px; margin-bottom:24px; }
        .tf-step { display:flex; align-items:center; gap:8px; font-family:'IBM Plex Mono'; font-size:12px; color: var(--ink-soft); }
        .tf-step-dot { width:22px; height:22px; border-radius:50%; border:1.5px solid var(--line); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; background:var(--surface); transition: all .2s ease; }
        .tf-step.active .tf-step-dot { background: var(--ink); border-color: var(--ink); color:#fff; }
        .tf-step.done .tf-step-dot { background: var(--accent-2); border-color: var(--accent-2); color:#fff; }
        .tf-step.active .tf-step-label { color: var(--ink); font-weight:600; }
        .tf-step-line { width:28px; height:1.5px; background: var(--line); }

        .tf-hero { font-family:'Archivo Black'; font-size: clamp(30px, 7vw, 48px); line-height:1.02; text-transform:uppercase; margin: 6px 0 4px; }
        .tf-hero span { color: var(--accent); }
        .tf-sub { color: var(--ink-soft); font-size:15px; margin-bottom: 26px; max-width: 50ch; line-height:1.5; }

        .tf-card { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 2px rgba(16,24,43,0.04); }

        .tf-field { margin-bottom: 20px; }
        .tf-field label { display:flex; align-items:center; gap:8px; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; color: var(--ink-soft); margin-bottom:10px; }
        .tf-row { display:flex; align-items:center; gap:14px; }
        .tf-row input[type=range] { flex:1; accent-color: var(--accent); height: 4px; }
        .tf-val { font-family:'IBM Plex Mono'; font-weight:600; min-width: 68px; text-align:right; font-size:15px; }

        .tf-chip-group { display:flex; flex-wrap:wrap; gap:8px; }
        .tf-chip { border:1.5px solid var(--line); background:var(--surface); color:var(--ink); padding:9px 14px; border-radius:999px; font-size:13.5px; cursor:pointer; font-weight:500; transition: all .15s ease; }
        .tf-chip:hover { border-color: var(--ink); }
        .tf-chip.active { background: var(--ink); border-color: var(--ink); color: #fff; }

        .tf-submit { width:100%; background: var(--ink); color:#fff; border:none; padding:16px; border-radius:12px; font-weight:700; font-size:15px; letter-spacing:0.02em; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition: transform .1s ease, background .15s ease; }
        .tf-submit:hover { background:#000; }
        .tf-submit:active { transform: scale(0.99); }

        .tf-summary { display:flex; gap:18px; flex-wrap:wrap; margin-bottom:22px; }
        .tf-summary-item { font-family:'IBM Plex Mono'; font-size:12.5px; color: var(--ink-soft); background: var(--surface); border:1px solid var(--line); border-radius:999px; padding:6px 14px; }
        .tf-summary-item b { color: var(--ink); font-weight:600; }

        .cat-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:12px; }
        .cat-card { position:relative; background: var(--surface); border:1px solid var(--line); border-radius:14px; padding:18px 16px; text-align:left; cursor:pointer; overflow:hidden; transition: transform .15s ease, box-shadow .15s ease, border-color .15s ease; }
        .cat-card::before { content:""; position:absolute; left:0; top:0; bottom:0; width:4px; background: var(--accent); }
        .cat-card:nth-child(even)::before { background: var(--accent-2); }
        .cat-card:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(16,24,43,0.08); border-color: rgba(16,24,43,0.16); }
        .cat-card-label { font-weight:700; font-size:16px; margin-bottom:4px; padding-left:6px; }
        .cat-card-tone { font-size:12.5px; color: var(--ink-soft); padding-left:6px; margin-bottom:14px; line-height:1.4; }
        .cat-card-foot { display:flex; align-items:center; justify-content:space-between; padding-left:6px; }
        .cat-card-count { font-family:'IBM Plex Mono'; font-size:11.5px; color: var(--ink-soft); }
        .cat-card-arrow { color: var(--ink-soft); transition: transform .15s ease, color .15s ease; }
        .cat-card:hover .cat-card-arrow { transform: translateX(3px); color: var(--ink); }

        .tf-board { background: var(--ink); color:#fff; border-radius:16px; padding:24px 26px; margin-bottom:16px; position:relative; overflow:hidden; }
        .tf-board::after { content:""; position:absolute; inset:0; background: radial-gradient(circle at 90% -10%, rgba(255,75,43,0.35), transparent 55%); pointer-events:none; }
        .tf-board-day { font-family:'IBM Plex Mono'; font-size:12.5px; letter-spacing:0.16em; text-transform:uppercase; opacity:0.65; margin-bottom:6px; }
        .tf-board-title { font-family:'Archivo Black'; font-size: clamp(26px, 6vw, 36px); text-transform:uppercase; line-height:1; margin-bottom: 6px; }
        .tf-board-tone { color: rgba(255,255,255,0.7); font-size:14px; }

        .tf-stats-row { display:flex; gap:12px; margin-top:18px; flex-wrap:wrap; }
        .tf-stat { background: rgba(255,255,255,0.08); border-radius:10px; padding:12px 14px; flex:1; min-width:120px; }
        .tf-stat-label { font-size:11px; text-transform:uppercase; letter-spacing:0.1em; opacity:0.6; margin-bottom:4px; }
        .tf-stat-value { font-family:'IBM Plex Mono'; font-size: 20px; font-weight:600; }

        .tf-list-head { display:flex; align-items:center; justify-content:space-between; margin: 24px 0 10px; }
        .tf-list-head h3 { font-family:'Archivo Black'; text-transform:uppercase; font-size:18px; margin:0; }

        .ex-card { background: var(--surface); border:1px solid var(--line); border-radius:14px; margin-bottom:12px; overflow:hidden; transition: box-shadow .15s ease; }
        .ex-card:hover { box-shadow: 0 4px 14px rgba(16,24,43,0.06); }
        .ex-head { width:100%; display:flex; align-items:center; gap:14px; padding:16px 18px; background:none; border:none; cursor:pointer; text-align:left; }
        .ex-num { font-family:'IBM Plex Mono'; color: var(--accent); font-weight:600; font-size:14px; }
        .ex-title { flex:1; min-width:0; }
        .ex-name { font-weight:700; font-size:15.5px; margin-bottom:4px; }
        .ex-tags { display:flex; gap:6px; flex-wrap:wrap; }
        .tag { font-size:11px; background: var(--bg); border:1px solid var(--line); padding:3px 9px; border-radius:999px; color: var(--ink-soft); }
        .tag-target { background: rgba(0,168,150,0.1); color: var(--accent-2); border-color: rgba(0,168,150,0.3); font-weight:600; }
        .ex-scoreboard { font-family:'IBM Plex Mono'; display:flex; align-items:center; gap:4px; background: var(--ink); color:#fff; padding:6px 10px; border-radius:8px; font-size:14px; font-weight:600; }
        .ex-scoreboard .scoreboard-x { opacity:0.5; }

        .ex-body { padding: 4px 18px 20px; display:flex; gap:20px; align-items:flex-start; flex-wrap:wrap; border-top:1px solid var(--line); }
        .ex-demo { flex: 0 0 180px; background: var(--bg); border-radius:12px; padding:12px; display:flex; align-items:center; justify-content:center; }
        .fig { width:100%; height:130px; }
        .ex-cues { flex:1; min-width:200px; padding-top:14px; }
        .ex-note { font-size:12.5px; color: var(--accent); font-weight:600; margin-bottom:8px; }
        .ex-cues ul { margin:0; padding-left:18px; }
        .ex-cues li { font-size:13.5px; color: var(--ink-soft); margin-bottom:6px; line-height:1.4; }

        .tf-back { background:none; border:none; color: var(--ink-soft); font-size:13px; cursor:pointer; margin-bottom:16px; display:flex; align-items:center; gap:6px; padding:0; font-weight:500; }
        .tf-back:hover { color: var(--ink); }

        .ex-head { padding: 0; }
        .ex-check { flex-shrink:0; background:none; border:none; cursor:pointer; color: var(--line); padding: 16px 0 16px 18px; display:flex; align-items:center; }
        .ex-check:hover { color: var(--ink-soft); }
        .ex-card-done .ex-check { color: var(--accent-2); }
        .ex-head-main { flex:1; min-width:0; display:flex; align-items:center; gap:14px; padding:16px 18px 16px 10px; background:none; border:none; cursor:pointer; text-align:left; }
        .ex-card-done .ex-name { text-decoration: line-through; color: var(--ink-soft); }

        .rest-timer { margin-top:14px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background: var(--bg); border:1px solid var(--line); border-radius:10px; padding:10px 12px; }
        .rest-timer-left { display:flex; align-items:center; gap:6px; font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color: var(--ink); }
        .rest-timer-actions { display:flex; align-items:center; gap:6px; }
        .rest-btn { font-family:'IBM Plex Mono'; font-size:11.5px; font-weight:600; border:1px solid var(--line); background: var(--surface); color: var(--ink-soft); border-radius:7px; padding:6px 9px; cursor:pointer; }
        .rest-btn:hover { border-color: var(--ink); color: var(--ink); }
        .rest-btn-primary { background: var(--ink); border-color: var(--ink); color:#fff; min-width:56px; }
        .rest-btn-primary:hover { background:#000; color:#fff; }
        .rest-btn-icon { display:flex; align-items:center; justify-content:center; padding:6px 8px; }

        .split-card { background: var(--surface); border:1px solid var(--line); border-radius:16px; padding:20px 22px; margin-top:22px; }
        .split-card-head { display:flex; align-items:center; gap:8px; font-weight:700; font-size:14px; margin-bottom:14px; color: var(--ink); }
        .split-card-head svg { color: var(--accent); }
        .split-row { display:grid; grid-template-columns: repeat(7, 1fr); gap:6px; }
        .split-day { text-align:center; background: var(--bg); border-radius:8px; padding:8px 4px; }
        .split-day-name { font-family:'IBM Plex Mono'; font-size:10.5px; font-weight:700; color: var(--ink-soft); margin-bottom:4px; }
        .split-day-focus { font-size:10.5px; color: var(--ink); line-height:1.25; font-weight:500; }

        .tf-finish { margin-top:10px; background: var(--accent-2); }
        .tf-finish:hover { background: #00877a; }

        .done-hero { text-align:center; padding: 10px 0 6px; }
        .done-hero svg { color: var(--accent); }
        .done-hero .tf-hero { text-align:center; }
        .done-hero .tf-sub { margin-left:auto; margin-right:auto; text-align:center; }

        .history-title { font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:0.06em; color: var(--ink-soft); margin-bottom:12px; }
        .history-row { display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-top:1px solid var(--line); font-size:13px; }
        .history-row:first-child { border-top:none; }
        .history-date { font-family:'IBM Plex Mono'; color: var(--ink-soft); font-size:12px; }
        .history-cat { font-weight:600; }
        .history-count { font-family:'IBM Plex Mono'; color: var(--accent-2); font-weight:600; }

        @media (max-width: 480px) {
          .split-row { grid-template-columns: repeat(4, 1fr); }
          .split-day:last-child { grid-column: span 1; }
        }

        .tf-disclaimer { display:flex; gap:10px; background: rgba(255,75,43,0.06); border:1px solid rgba(255,75,43,0.25); border-radius:12px; padding:14px 16px; font-size:12.5px; color: var(--ink-soft); margin-top: 20px; }
        .tf-disclaimer svg { flex-shrink:0; color: var(--accent); margin-top:1px; }

        @media (max-width: 480px) {
          .ex-demo { flex: 0 0 100%; }
          .cat-grid { grid-template-columns: 1fr; }
        }

        /* --- animations --- */
        @keyframes squatMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(22px); } }
        .fig-squat { animation: squatMove 1.6s ease-in-out infinite; transform-box: fill-box; }

        @keyframes lungeFront { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(4px) rotate(4deg); } }
        @keyframes lungeBack { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-2px) rotate(-4deg); } }
        .fig-lunge-front { animation: lungeFront 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 96px 90px; }
        .fig-lunge-back { animation: lungeBack 1.6s ease-in-out infinite; transform-box: fill-box; transform-origin: 96px 90px; }

        @keyframes pushupMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(14px) rotate(-2deg); } }
        .fig-pushup { animation: pushupMove 1.4s ease-in-out infinite; transform-box: fill-box; }

        @keyframes plankShake { 0%,100% { transform: translateY(0); } 50% { transform: translateY(1.5px); } }
        .fig-plank { animation: plankShake 2.2s ease-in-out infinite; transform-box: fill-box; }

        @keyframes climberLeg { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-26px); } }
        .fig-climber-leg { animation: climberLeg 0.9s ease-in-out infinite; transform-box: fill-box; transform-origin: 160px 70px; }

        @keyframes situpMove { 0%,100% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(55px,-14px) rotate(-18deg); } }
        .fig-situp-move { animation: situpMove 1.7s ease-in-out infinite; transform-box: fill-box; }

        @keyframes bridgeMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
        .fig-bridge { animation: bridgeMove 1.6s ease-in-out infinite; transform-box: fill-box; }

        @keyframes wallsitWobble { 0%,100% { transform: translateY(0); } 50% { transform: translateY(1px); } }
        .fig-wallsit-wobble { animation: wallsitWobble 2.4s ease-in-out infinite; transform-box: fill-box; }

        @keyframes calfMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .fig-calf { animation: calfMove 1.2s ease-in-out infinite; transform-box: fill-box; }

        @keyframes pressMove { 0%,100% { transform: translateY(0) scaleY(1); } 50% { transform: translateY(-32px) scaleY(1.05); } }
        .fig-press-arm { animation: pressMove 1.5s ease-in-out infinite; transform-box: fill-box; }

        @keyframes raiseMove { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-35deg); } }
        .fig-raise-arm { animation: raiseMove 1.5s ease-in-out infinite; transform-box: fill-box; transform-origin: 100px 85px; }

        @keyframes curlMove { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(85deg); } }
        .fig-curl-forearm { animation: curlMove 1.4s ease-in-out infinite; }

        @keyframes overheadMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(18px); } }
        .fig-overhead-arm { animation: overheadMove 1.4s ease-in-out infinite; transform-box: fill-box; }

        @keyframes rowMove { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-36px); } }
        .fig-row-arm { animation: rowMove 1.3s ease-in-out infinite; transform-box: fill-box; }

        @keyframes twistMove { 0%,100% { transform: rotate(-22deg); } 50% { transform: rotate(22deg); } }
        .fig-twist-arms { animation: twistMove 1.4s ease-in-out infinite; transform-box: fill-box; }

        @keyframes wristMove { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(-24deg); } }
        .fig-wrist { animation: wristMove 1.2s ease-in-out infinite; transform-box: fill-box; }

        @keyframes carryMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .fig-carry-legs { animation: carryMove 0.7s ease-in-out infinite; transform-box: fill-box; }

        @keyframes extMove { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
        .fig-ext { animation: extMove 1.6s ease-in-out infinite; transform-box: fill-box; }

        @keyframes stretchMove { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(14deg); } }
        .fig-stretch-neck { animation: stretchMove 2.6s ease-in-out infinite; transform-box: fill-box; }

        @media (prefers-reduced-motion: reduce) {
          .fig-squat, .fig-lunge-front, .fig-lunge-back, .fig-pushup, .fig-plank, .fig-climber-leg,
          .fig-situp-move, .fig-bridge, .fig-wallsit-wobble, .fig-calf, .fig-press-arm, .fig-raise-arm,
          .fig-curl-forearm, .fig-overhead-arm, .fig-row-arm, .fig-twist-arms, .fig-wrist, .fig-carry-legs,
          .fig-ext, .fig-stretch-neck { animation: none !important; }
        }
      `}</style>

      <div className="tf-wrap">
        <div className="tf-brand">
          <div className="dot" />
          <div className="tf-brand-name">TodayFit — your daily training plan</div>
        </div>

        <div className="tf-steps">
          <div className={"tf-step" + (stepIndex === 0 ? " active" : stepIndex > 0 ? " done" : "")}>
            <div className="tf-step-dot">1</div>
            <span className="tf-step-label">Details</span>
          </div>
          <div className="tf-step-line" />
          <div className={"tf-step" + (stepIndex === 1 ? " active" : stepIndex > 1 ? " done" : "")}>
            <div className="tf-step-dot">2</div>
            <span className="tf-step-label">Workout</span>
          </div>
          <div className="tf-step-line" />
          <div className={"tf-step" + (stepIndex === 2 ? " active" : "")}>
            <div className="tf-step-dot">3</div>
            <span className="tf-step-label">Plan</span>
          </div>
        </div>

        {stage === "form" && (
          <>
            <h1 className="tf-hero">Tell us about<br /><span>yourself</span></h1>
            <p className="tf-sub">Your age, height, and weight let us fine-tune reps and pacing. Next, you'll pick exactly which workout you want to do.</p>

            <div className="tf-card">
              <div className="tf-field">
                <label><CalendarDays size={14} /> Age</label>
                <div className="tf-row">
                  <input type="range" min="12" max="85" value={age} onChange={(e) => setAge(e.target.value)} />
                  <span className="tf-val">{age} yrs</span>
                </div>
              </div>

              <div className="tf-field">
                <label><Ruler size={14} /> Height (cm)</label>
                <div className="tf-row">
                  <input type="range" min="120" max="210" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
                  <span className="tf-val">{heightCm} cm</span>
                </div>
              </div>

              <div className="tf-field">
                <label><Weight size={14} /> Weight (kg)</label>
                <div className="tf-row">
                  <input type="range" min="30" max="160" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                  <span className="tf-val">{weightKg} kg</span>
                </div>
              </div>

              <div className="tf-field">
                <label><Dumbbell size={14} /> Equipment you have</label>
                <div className="tf-chip-group">
                  {EQUIPMENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      className={"tf-chip" + (equipment.includes(opt.id) ? " active" : "")}
                      onClick={() => toggleEquip(opt.id)}
                      type="button"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button className="tf-submit" onClick={() => setStage("category")}>
                Choose your workout <ArrowRight size={17} />
              </button>
            </div>
          </>
        )}

        {stage === "category" && (
          <>
            <button className="tf-back" onClick={() => setStage("form")}>
              <ArrowLeft size={14} /> Edit my details
            </button>

            <h1 className="tf-hero">Pick your<br /><span>workout</span></h1>
            <p className="tf-sub">Choose the muscle group or focus you want to train today. Every exercise list adjusts to your details.</p>

            <div className="tf-summary">
              <span className="tf-summary-item"><b>{age}</b> yrs</span>
              <span className="tf-summary-item"><b>{heightCm}</b> cm</span>
              <span className="tf-summary-item"><b>{weightKg}</b> kg</span>
            </div>

            <div className="cat-grid">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  className="cat-card"
                  onClick={() => {
                    setSelectedCategory(c.id);
                    setCompleted({});
                    setStage("plan");
                  }}
                  type="button"
                >
                  <div className="cat-card-label">{c.label}</div>
                  <div className="cat-card-tone">{c.tone}</div>
                  <div className="cat-card-foot">
                    <span className="cat-card-count">{categoryCounts[c.id]} exercises</span>
                    <ArrowRight size={15} className="cat-card-arrow" />
                  </div>
                </button>
              ))}
            </div>

            <div className="split-card">
              <div className="split-card-head">
                <Flame size={15} />
                <span>Suggested weekly split</span>
              </div>
              <div className="split-row">
                {[
                  ["Mon", "Chest"], ["Tue", "Back"], ["Wed", "Legs"],
                  ["Thu", "Shoulders"], ["Fri", "Arms"], ["Sat", "Core + Cardio"], ["Sun", "Rest"],
                ].map(([day, focus]) => (
                  <div className="split-day" key={day}>
                    <div className="split-day-name">{day}</div>
                    <div className="split-day-focus">{focus}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {stage === "plan" && plan && (
          <>
            <button className="tf-back" onClick={() => setStage("category")}>
              <ArrowLeft size={14} /> Choose a different workout
            </button>

            <div className="tf-board">
              <div className="tf-board-day">Workout</div>
              <div className="tf-board-title">{plan.meta.label}</div>
              <div className="tf-board-tone">{plan.meta.tone}</div>

              <div className="tf-stats-row">
                <div className="tf-stat">
                  <div className="tf-stat-label">BMI</div>
                  <div className="tf-stat-value">{plan.bmi}</div>
                </div>
                <div className="tf-stat">
                  <div className="tf-stat-label">Age</div>
                  <div className="tf-stat-value">{age}</div>
                </div>
                <div className="tf-stat">
                  <div className="tf-stat-label">Progress</div>
                  <div className="tf-stat-value">{doneCount}/{plan.picks.length}</div>
                </div>
              </div>
            </div>

            <div className="tf-list-head">
              <h3><Wind size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Warm-up (3–5 min)</h3>
            </div>
            {warmUp.map((ex, i) => (
              <ExerciseCard
                ex={ex}
                index={i}
                key={"warmup-" + ex.id}
                done={!!completed["warmup-" + ex.id]}
                onToggleDone={() => toggleDone("warmup-" + ex.id)}
              />
            ))}

            <div className="tf-list-head">
              <h3>{plan.meta.label} exercises</h3>
            </div>

            {plan.picks.map((ex, i) => (
              <ExerciseCard
                ex={ex}
                index={i}
                key={ex.id}
                done={!!completed[ex.id]}
                onToggleDone={() => toggleDone(ex.id)}
              />
            ))}

            <div className="tf-list-head">
              <h3><Wind size={15} style={{ verticalAlign: "-2px", marginRight: 6 }} /> Cool-down &amp; stretch</h3>
            </div>
            {coolDown.map((ex, i) => (
              <ExerciseCard
                ex={ex}
                index={i}
                key={"cooldown-" + ex.id}
                done={!!completed["cooldown-" + ex.id]}
                onToggleDone={() => toggleDone("cooldown-" + ex.id)}
              />
            ))}

            <button className="tf-submit tf-finish" onClick={finishWorkout}>
              <Trophy size={17} /> Finish workout
            </button>

            <div className="tf-disclaimer">
              <ShieldAlert size={16} />
              <div>
                This is general fitness guidance, not medical advice. Warm up before starting, stop if anything feels sharp or painful, and check with a doctor or physical therapist first if you're new to exercise, pregnant, or managing a health condition.
              </div>
            </div>
          </>
        )}

        {stage === "done" && plan && (
          <>
            <div className="done-hero">
              <Trophy size={40} />
              <h1 className="tf-hero" style={{ marginTop: 14 }}>Workout<br /><span>logged</span></h1>
              <p className="tf-sub">Nice work on {plan.meta.label}. Recovery matters as much as the training — hydrate, eat protein within a couple hours, and get good sleep tonight.</p>
            </div>

            <div className="tf-stats-row" style={{ marginBottom: 20 }}>
              <div className="tf-stat" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <div className="tf-stat-label" style={{ color: "var(--ink-soft)" }}>Exercises done</div>
                <div className="tf-stat-value" style={{ color: "var(--ink)" }}>{doneCount}/{plan.picks.length}</div>
              </div>
              <div className="tf-stat" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <div className="tf-stat-label" style={{ color: "var(--ink-soft)" }}><Flame size={11} style={{ verticalAlign: "-1px" }} /> Day streak</div>
                <div className="tf-stat-value" style={{ color: "var(--ink)" }}>{streak}</div>
              </div>
              <div className="tf-stat" style={{ background: "var(--surface)", border: "1px solid var(--line)" }}>
                <div className="tf-stat-label" style={{ color: "var(--ink-soft)" }}>Total sessions</div>
                <div className="tf-stat-value" style={{ color: "var(--ink)" }}>{history.length}</div>
              </div>
            </div>

            {history.length > 0 && (
              <div className="tf-card">
                <div className="history-title">Recent sessions</div>
                {history.slice(0, 6).map((h, i) => (
                  <div className="history-row" key={i}>
                    <span className="history-date">{h.date}</span>
                    <span className="history-cat">{h.category}</span>
                    <span className="history-count">{h.completed}/{h.total}</span>
                  </div>
                ))}
              </div>
            )}

            <button className="tf-submit" onClick={() => { setStage("category"); }}>
              Train another muscle group <ArrowRight size={17} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
