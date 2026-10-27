# DocentAI 🎓
### Aplicación Inteligente de Generación y Corrección de Exámenes para Docentes

**DocentAI** es una plataforma web integral diseñada específicamente para el profesorado, que automatiza el flujo de trabajo completo de creación y corrección de exámenes:

1. **Ingesta de Temarios y Fuentes**: Carga de apuntes, documentos PDF, textos curriculares y libros.
2. **Generación Pedagógica de Exámenes**: Configuración flexible del número de preguntas tipo test (opciones A, B, C, D) y ejercicios prácticos de desarrollo, con ponderación personalizable sobre 10 puntos.
3. **Modelos Listos para Copiar y Pegar**:
   - *Modelo para el Alumno*: Maquetado limpio con cabecera de datos, preguntas y espacio de resolución listo para pegar en Word, Google Docs o imprimir directamente.
   - *Solucionario Oficial*: Respuestas correctas, justificaciones didácticas, criterios de rúbrica y pasos modelo de resolución.
   - *Formato Moodle (Aiken)*: Para importar directamente a plataformas de campus virtual.
4. **Ponderación de Pesos**: Los profesores pueden elegir o reajustar libremente el valor en puntos de cada pregunta o ejercicio, con botón de reajuste automático proporcional a 10.0 puntos.
5. **Corrección con Reconocimiento Óptico (OCR + IA)**:
   - Sube los exámenes resueltos por los alumnos (fotografías, escaneos manuscritos o PDFs).
   - La IA lee las respuestas del alumno y las compara objetivamente con el solucionario oficial.
   - Evaluación numérica del 0 al 10 desglosada por secciones (Sección Test y Sección Ejercicios) y Nota Global.
6. **Detección de Dificultades de Lectura y Revisión Manual**:
   - Si un ejercicio presenta caligrafía ambigua, tachones entre opciones o texto borroso, el sistema lo marca explícitamente con la alerta **`[⚠️ Requiere Revisión Manual del Docente]`**.
   - Pantalla de revisión detallada donde el docente puede examinar la transcripción OCR, comparar con el solucionario, sobrescribir la puntuación manualmente y añadir observaciones al alumno.
7. **Cuaderno Oficial de Notas**:
   - Estadísticas de la clase: Nota media, tasa de aprobados, rango de notas y alumnos pendientes de revisión.
   - Exportación de actas a formato **.CSV / Excel** con 1 clic.

---

## 🚀 Puesta en Marcha Local

Para iniciar la aplicación en tu ordenador:

```bash
# 1. Instalar dependencias (ya instaladas)
npm install

# 2. Iniciar el servidor de desarrollo
npm run dev
```

Abre en tu navegador la dirección indicada (habitualmente `http://localhost:5173`).

---

## 🔑 Conexión con Google Gemini (Opcional)

- La aplicación incluye un **Modo Demostración pre-cargado** con un examen oficial de Biología y 3 alumnos reales corregidos (incluyendo un caso con incidencias de lectura y tachaduras detectadas).
- Para generar exámenes ilimitados desde tus propios PDFs y corregir fotos de exámenes reales con visión multimodal OCR, haz clic en **"Ajustes API"** e introduce una clave gratuita de **Google AI Studio** ([https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)).
- Tu clave se almacena de forma segura en tu navegador local (`localStorage`) y nunca se comparte con servidores externos.
