export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { profile, answers, targetCal, benchmarkRating } = req.body || {};
  if (!profile || !answers) return res.status(400).json({ error: 'Missing data' });

  const { name, age, gender, weight, height, bodyFat, sport, position } = profile;
  const { gym, goal, days, diet } = answers;

  const SPORT_NAMES = {
    soccer:'Fútbol', basketball:'Baloncesto', baseball:'Béisbol', softball:'Sóftbol',
    volleyball:'Voleibol', football:'Fútbol Americano', track:'Atletismo',
    crosscountry:'Cross Country', swimming:'Natación', tennis:'Tenis',
    lacrosse:'Lacrosse', wrestling:'Lucha', rowing:'Remo', golf:'Golf'
  };
  const GOAL_LABELS = { performance:'Rendimiento Deportivo', muscle:'Ganancia Muscular', fat:'Pérdida de Grasa', maintain:'Mantenimiento' };
  const GYM_LABELS = { yes:'acceso completo a gimnasio con pesas', partial:'equipamiento básico', no:'sin gimnasio, solo calistenia en casa' };
  const DIET_LABELS = { none:'Ninguna', veg:'Vegetariano', vegan:'Vegano', gluten:'Sin gluten' };

  const leanMass = Math.max(0, weight * (1 - bodyFat / 100)).toFixed(1);
  const bmi = (weight / Math.pow(height / 100, 2)).toFixed(1);
  const sportName = SPORT_NAMES[sport] || sport;

  const prompt = `Eres el preparador físico y nutricionista de élite de NVS (New Vision Sports), una agencia deportiva que conecta atletas latinoamericanos con universidades de Estados Unidos, Canadá y México.

Debes crear un plan PERSONALIZADO y ESPECÍFICO para este atleta. Evita respuestas genéricas — cada detalle debe estar adaptado a su deporte, posición y objetivos.

═══ PERFIL DEL ATLETA ═══
• Nombre: ${name}
• Edad: ${age} años | Género: ${gender === 'male' ? 'Masculino' : 'Femenino'}
• Deporte: ${sportName} | Posición: ${position}
• Peso: ${weight} kg | Altura: ${height} cm | BMI: ${bmi}
• % Grasa Corporal: ${bodyFat}% | Masa Magra: ${leanMass} kg
• Nivel de composición vs benchmarks universitarios: ${benchmarkRating || 'En proceso de evaluación'}

═══ OBJETIVOS ═══
• Meta principal: ${GOAL_LABELS[goal] || goal}
• Días de entrenamiento por semana: ${days}
• Acceso a equipamiento: ${GYM_LABELS[gym] || gym}
• Restricciones alimenticias: ${DIET_LABELS[diet] || diet}
• Calorías diarias calculadas: ${targetCal} kcal

═══ INSTRUCCIONES ═══
Responde ÚNICAMENTE con un JSON válido, sin texto adicional antes ni después. El JSON debe tener esta estructura exacta:

{
  "resumen": "2-3 oraciones personalizadas sobre ${name}, su situación actual como ${position} en ${sportName} y su potencial. Menciona su nombre.",
  "fase_temporada": {
    "titulo": "Nombre de la fase (ej: Off-Season, Pre-temporada, Temporada, Post-temporada)",
    "descripcion": "2 oraciones sobre qué significa esta fase para un ${position} en ${sportName} y qué prioridades tiene.",
    "enfoque": "El foco principal de entrenamiento en esta fase específica para su posición"
  },
  "nutricion": {
    "calorias": ${targetCal},
    "proteinas_g": 0,
    "carbos_g": 0,
    "grasas_g": 0,
    "hidratacion": "Recomendación específica en litros/día con timing (antes, durante y después del entrenamiento)",
    "timing_nutricional": "Cuándo comer en relación al entrenamiento (ej: 2h antes, 30min después)",
    "comidas": [
      {"hora": "7:00 am", "nombre": "Desayuno", "descripcion": "Descripción específica con cantidades, adaptada a ${DIET_LABELS[diet] || 'sin restricciones'}", "macros": "P: Xg | C: Xg | G: Xg"},
      {"hora": "10:30 am", "nombre": "Snack", "descripcion": "...", "macros": "..."},
      {"hora": "1:00 pm", "nombre": "Almuerzo", "descripcion": "...", "macros": "..."},
      {"hora": "4:30 pm", "nombre": "Pre-entrenamiento", "descripcion": "...", "macros": "..."},
      {"hora": "8:00 pm", "nombre": "Cena", "descripcion": "...", "macros": "..."}
    ],
    "suplementos": ["Suplemento 1 con dosis específica", "Suplemento 2 con dosis", "Suplemento 3 con dosis"]
  },
  "entrenamiento": {
    "descripcion_general": "1-2 oraciones sobre el enfoque del plan adaptado a ${position} en ${sportName} con ${GYM_LABELS[gym] || gym}",
    "dias": [
      {
        "dia": "Lunes",
        "tipo": "Nombre descriptivo del tipo de sesión",
        "descripcion": "Descripción breve del objetivo de la sesión",
        "ejercicios": ["Ejercicio 1: 4 series × 8 reps | descanso 90s", "Ejercicio 2: 3 series × 12 reps | descanso 60s", "Ejercicio 3: 3 series × 15 reps | descanso 45s"]
      }
    ]
  },
  "recuperacion": {
    "sueno": "Recomendación de horas de sueño y tips de calidad del sueño para atletas universitarios",
    "tecnicas": ["Técnica de recuperación 1 específica para ${sportName}", "Técnica 2", "Técnica 3"],
    "dias_descanso": "Cómo usar los días de descanso activo para maximizar la recuperación"
  },
  "consejo_mental": "Un consejo de rendimiento mental MUY específico para ${position} en ${sportName}, enfocado en lo que diferencia a los atletas de élite universitarios en esa posición"
}

Calcula los macros exactos basándote en ${targetCal} calorías: proteínas a 2g/kg para ganancia muscular, 1.8g/kg para pérdida de grasa, 1.9g/kg para rendimiento, 1.6g/kg para mantenimiento. Grasas al 28% de las calorías. El resto en carbohidratos. Adapta TODO a las restricciones alimenticias: ${DIET_LABELS[diet] || 'ninguna'}.

Incluye exactamente ${days} días de entrenamiento en el plan.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Anthropic error:', response.status, errText);
      return res.status(502).json({ error: 'AI service error', status: response.status });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON in response:', text.substring(0, 200));
      return res.status(502).json({ error: 'Invalid AI response format' });
    }

    const plan = JSON.parse(jsonMatch[0]);
    return res.status(200).json({ plan });

  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
