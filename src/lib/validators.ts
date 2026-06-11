/**
 * Validadores comunes del sistema Sumak.
 * Atiende BIZ-014 (validación cédula ecuatoriana).
 */

/**
 * Valida una cédula ecuatoriana de persona natural usando el
 * algoritmo de módulo 10 (también conocido como "dígito verificador
 * de Luhn-style" del Registro Civil de Ecuador).
 *
 * Reglas:
 *  - Debe tener exactamente 10 dígitos.
 *  - Los 2 primeros (código de provincia) deben estar entre 01 y 24, o 30.
 *  - El tercer dígito debe ser 0-5 (personas naturales). 6 = consejos electorales,
 *    9 = jurídicas; las descartamos en este contexto de afiliación personal.
 *  - El dígito verificador (el 10°) se calcula con suma ponderada (2,1,2,1,...).
 *
 * Referencias: norma del Registro Civil de Ecuador. Ampliamente documentado.
 */
export function validarCedulaEcuatoriana(cedula: string): boolean {
  const c = (cedula ?? '').trim();
  if (!/^\d{10}$/.test(c)) return false;

  const provincia = parseInt(c.slice(0, 2), 10);
  // Provincias válidas: 01..24, más 30 (ecuatorianos en el exterior)
  if (!((provincia >= 1 && provincia <= 24) || provincia === 30)) return false;

  const tercerDigito = parseInt(c[2], 10);
  if (tercerDigito > 5) return false;

  // Coeficientes alternados 2,1 para los primeros 9 dígitos.
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    const digit = parseInt(c[i], 10);
    const coef = i % 2 === 0 ? 2 : 1;
    let prod = digit * coef;
    if (prod >= 10) prod -= 9;
    suma += prod;
  }

  const decenaSup = Math.ceil(suma / 10) * 10;
  let verificador = decenaSup - suma;
  if (verificador === 10) verificador = 0;

  return verificador === parseInt(c[9], 10);
}

/**
 * Devuelve un mensaje legible para mostrar al usuario explicando
 * por qué la cédula no es válida. Para cédulas válidas devuelve null.
 */
export function explicarCedulaInvalida(cedula: string): string | null {
  const c = (cedula ?? '').trim();
  if (!c) return null; // campo vacío no es "inválido", es opcional/incompleto
  if (!/^\d+$/.test(c)) return 'La cédula solo puede contener dígitos.';
  if (c.length !== 10) return 'La cédula debe tener exactamente 10 dígitos.';
  if (!validarCedulaEcuatoriana(c)) return 'La cédula no es válida (dígito verificador incorrecto).';
  return null;
}
