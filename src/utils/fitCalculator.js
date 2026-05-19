// ── Regresión lineal: y = ax + b ──────────────
export function linearFit(data) {
  const n = data.length
  if (n < 2) throw new Error('Se necesitan al menos 2 puntos para el ajuste lineal.')

  const x = data.map((d) => Number(d.x))
  const y = data.map((d) => Number(d.y))

  const sumX  = x.reduce((a, b) => a + b, 0)
  const sumY  = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0)
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0)

  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) {
    throw new Error('Los datos son colineales o insuficientes para el ajuste lineal.')
  }

  const a = (n * sumXY - sumX * sumY) / denom
  const b = (sumY - a * sumX) / n

  const yMean  = sumY / n
  const ssTot  = y.reduce((acc, yi) => acc + (yi - yMean) ** 2, 0)
  const ssRes  = y.reduce((acc, yi, i) => acc + (yi - (a * x[i] + b)) ** 2, 0)
  const r2     = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  const s2     = ssRes / (n - 2)
  const errorA = Math.sqrt(s2 * n / denom)
  const errorB = Math.sqrt(s2 * sumX2 / denom)

  return {
    type:        'linear',
    params:      { a, b },
    r2,
    paramErrors: { a: errorA, b: errorB },
    equation:    `y = ${a.toFixed(4)}x + ${b.toFixed(4)}`,
  }
}

// ── Regresión cuadrática: y = ax² + bx + c ────
export function quadraticFit(data) {
  const n = data.length
  if (n < 3) throw new Error('Se necesitan al menos 3 puntos para el ajuste cuadrático.')

  const x = data.map((d) => Number(d.x))
  const y = data.map((d) => Number(d.y))

  const s0 = n
  const s1 = x.reduce((a, b) => a + b, 0)
  const s2 = x.reduce((a, xi) => a + xi ** 2, 0)
  const s3 = x.reduce((a, xi) => a + xi ** 3, 0)
  const s4 = x.reduce((a, xi) => a + xi ** 4, 0)
  const t0 = y.reduce((a, b) => a + b, 0)
  const t1 = x.reduce((a, xi, i) => a + xi * y[i], 0)
  const t2 = x.reduce((a, xi, i) => a + xi ** 2 * y[i], 0)

  const A = [
    [s4, s3, s2],
    [s3, s2, s1],
    [s2, s1, s0],
  ]
  const B = [t2, t1, t0]

  const result = gaussianElimination(A, B)
  if (!result) {
    throw new Error('Matriz singular: los datos son insuficientes para el ajuste cuadrático.')
  }

  const [a, b, c] = result

  const yMean = t0 / n
  const ssTot = y.reduce((acc, yi) => acc + (yi - yMean) ** 2, 0)
  const ssRes = y.reduce((acc, yi, i) => acc + (yi - (a * x[i] ** 2 + b * x[i] + c)) ** 2, 0)
  const r2    = ssTot === 0 ? 1 : 1 - ssRes / ssTot
  const s     = n > 3 ? Math.sqrt(ssRes / (n - 3)) : 0

  return {
    type:        'quadratic',
    params:      { a, b, c },
    r2,
    paramErrors: { a: s, b: s, c: s },
    equation:    `y = ${a.toFixed(4)}x² + ${b.toFixed(4)}x + ${c.toFixed(4)}`,
  }
}

// ── Eliminación Gaussiana ──────────────────────
function gaussianElimination(A, B) {
  const n = B.length
  const M = A.map((row, i) => [...row, B[i]])

  for (let col = 0; col < n; col++) {
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row
    }
    ;[M[col], M[maxRow]] = [M[maxRow], M[col]]

    if (Math.abs(M[col][col]) < 1e-10) return null

    for (let row = col + 1; row < n; row++) {
      const factor = M[row][col] / M[col][col]
      for (let k = col; k <= n; k++) {
        M[row][k] -= factor * M[col][k]
      }
    }
  }

  const x = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n]
    for (let j = i + 1; j < n; j++) {
      x[i] -= M[i][j] * x[j]
    }
    x[i] /= M[i][i]
  }
  return x
}

// ── Evaluador de expresión con parámetros ──────
// Soporta parámetros libres: a, b, c, d
// Variable independiente: x
// Funciones: sin, cos, tan, exp, log, sqrt, abs
// Constantes: pi, e
export function evaluateCustomExpression(expression, xValue, params = {}) {
  try {
    let sanitized = expression
      .replace(/\^/g,     '**')
      .replace(/\bsin\b/g,  'Math.sin')
      .replace(/\bcos\b/g,  'Math.cos')
      .replace(/\btan\b/g,  'Math.tan')
      .replace(/\bexp\b/g,  'Math.exp')
      .replace(/\blog\b/g,  'Math.log')
      .replace(/\bsqrt\b/g, 'Math.sqrt')
      .replace(/\babs\b/g,  'Math.abs')
      .replace(/\bpi\b/g,   'Math.PI')

    // Reemplaza parámetros libres con sus valores actuales
    Object.entries(params).forEach(([key, val]) => {
      sanitized = sanitized.replace(new RegExp(`\\b${key}\\b`, 'g'), `(${val})`)
    })

    // Reemplaza x con el valor numérico al final
    sanitized = sanitized.replace(/\bx\b/g, `(${xValue})`)

    // eslint-disable-next-line no-new-func
    const result = new Function(`return ${sanitized}`)()
    return typeof result === 'number' && isFinite(result) ? result : null
  } catch {
    return null
  }
}

// ── Detecta parámetros libres en la expresión ──
// Busca letras simples que no sean x, e, ni funciones reservadas
function detectParameters(expression) {
  const reserved = new Set([
    'x', 'e', 'pi',
    'sin', 'cos', 'tan', 'exp', 'log', 'sqrt', 'abs', 'Math'
  ])

  const words = expression.match(/\b[a-zA-Z]+\b/g) || []

  const params = [...new Set(
    words.filter((w) => !reserved.has(w) && /^[a-zA-Z]$/.test(w))
  )]

  return params.sort()
}

// ── Calcula la suma de residuos al cuadrado ────
function computeSSR(data, expression, paramValues) {
  return data.reduce((acc, d) => {
    const yPred = evaluateCustomExpression(expression, Number(d.x), paramValues)
    if (yPred === null) return acc + 1e10
    return acc + (Number(d.y) - yPred) ** 2
  }, 0)
}

// ── Optimizador — Descenso de gradiente ────────
// Encuentra los valores de parámetros que minimizan el SSR
function optimizeParameters(data, expression, paramNames) {
  // Valores iniciales: todos en 1.0
  const params = {}
  paramNames.forEach((p) => { params[p] = 1.0 })

  let learningRate = 1e-4
  const maxIter    = 15000
  const tolerance  = 1e-12
  const h          = 1e-6

  let prevSSR = computeSSR(data, expression, params)

  for (let iter = 0; iter < maxIter; iter++) {
    // Gradiente numérico por diferencias finitas centradas
    const gradients = {}
    paramNames.forEach((p) => {
      const paramsPlus  = { ...params, [p]: params[p] + h }
      const paramsMinus = { ...params, [p]: params[p] - h }
      gradients[p] = (
        computeSSR(data, expression, paramsPlus) -
        computeSSR(data, expression, paramsMinus)
      ) / (2 * h)
    })

    // Actualiza parámetros
    paramNames.forEach((p) => {
      params[p] -= learningRate * gradients[p]
    })

    const currentSSR = computeSSR(data, expression, params)

    // Ajusta tasa de aprendizaje adaptativamente
    if (currentSSR > prevSSR) {
      learningRate *= 0.5
    } else if (currentSSR < prevSSR * 0.99) {
      learningRate *= 1.05
    }

    // Verifica convergencia
    if (Math.abs(prevSSR - currentSSR) < tolerance) break
    prevSSR = currentSSR
  }

  return params
}

// ── Ajuste personalizado con optimización ──────
export function customFit(data, expression) {
  if (!expression.trim()) {
    throw new Error('Debes ingresar una expresión matemática.')
  }

  const parsed = data.map((d) => ({
    x: Number(d.x),
    y: Number(d.y),
  }))

  // Detecta parámetros libres
  const paramNames = detectParameters(expression)

  if (paramNames.length === 0) {
    // Sin parámetros libres: evalúa directamente
    const testVal = evaluateCustomExpression(expression, parsed[0].x, {})
    if (testVal === null) {
      throw new Error('La expresión no es válida o no puede evaluarse.')
    }

    const yMean = parsed.reduce((a, d) => a + d.y, 0) / parsed.length
    const ssTot = parsed.reduce((a, d) => a + (d.y - yMean) ** 2, 0)
    const ssRes = parsed.reduce((a, d) => {
      const yPred = evaluateCustomExpression(expression, d.x, {})
      return yPred !== null ? a + (d.y - yPred) ** 2 : a
    }, 0)

    return {
      type:        'custom',
      expression,
      params:      {},
      paramErrors: {},
      r2:          ssTot === 0 ? 1 : 1 - ssRes / ssTot,
      equation:    `y = ${expression}`,
    }
  }

  // Con parámetros libres: optimiza
  const optimizedParams = optimizeParameters(parsed, expression, paramNames)

  // Calcula R² con parámetros optimizados
  const yMean = parsed.reduce((a, d) => a + d.y, 0) / parsed.length
  const ssTot = parsed.reduce((a, d) => a + (d.y - yMean) ** 2, 0)
  const ssRes = parsed.reduce((a, d) => {
    const yPred = evaluateCustomExpression(expression, d.x, optimizedParams)
    return yPred !== null ? a + (d.y - yPred) ** 2 : a
  }, 0)
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot

  // Construye la ecuación mostrando los valores encontrados
  let equationWithValues = expression
  Object.entries(optimizedParams).forEach(([key, val]) => {
    equationWithValues = equationWithValues.replace(
      new RegExp(`\\b${key}\\b`, 'g'),
      val.toFixed(4)
    )
  })

  // Errores estándar aproximados por diferencias finitas
  const paramErrors = {}
  const n = parsed.length
  const p = paramNames.length
  if (n > p) {
    const s2 = ssRes / (n - p)
    paramNames.forEach((param) => {
      const hErr        = 1e-5
      const paramsPlus  = { ...optimizedParams, [param]: optimizedParams[param] + hErr }
      const paramsMinus = { ...optimizedParams, [param]: optimizedParams[param] - hErr }
      const ssrPlus     = computeSSR(parsed, expression, paramsPlus)
      const ssrMinus    = computeSSR(parsed, expression, paramsMinus)
      const d2SSR       = (ssrPlus - 2 * ssRes + ssrMinus) / (hErr ** 2)
      paramErrors[param] = d2SSR > 0 ? Math.sqrt(s2 / d2SSR) : 0
    })
  } else {
    paramNames.forEach((param) => { paramErrors[param] = 0 })
  }

  return {
    type:             'custom',
    expression,
    params:           optimizedParams,
    paramErrors,
    r2,
    equation:         `y = ${equationWithValues}`,
    equationTemplate: expression,
  }
}

// ── Evalúa el fit en un valor x ────────────────
export function evaluateFit(fitResult, xValue) {
  const { type, params } = fitResult
  if (type === 'linear') {
    return params.a * xValue + params.b
  }
  if (type === 'quadratic') {
    return params.a * xValue ** 2 + params.b * xValue + params.c
  }
  if (type === 'custom') {
    return evaluateCustomExpression(fitResult.expression, xValue, fitResult.params)
  }
  return null
}