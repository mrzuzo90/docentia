# Docentia 🦉
> **Evaluación docente. Rediseñada al milímetro.**  
> Plataforma web integral de diseño psicométrico, generación automática de exámenes con solucionario, corrección óptica OCR inteligente y actas oficiales con distribución estadística.

Diseñada bajo los principios editoriales y minimalistas del **Sistema de Diseño de Apple (España)** (*Cathedral of white space with whispered headlines*), tipografía SF Pro / Inter, tarjetas de 28px sin sombras artificiales, y guiada por la **Lechuza Geométrica** de red neuronal (*Tyto alba*).

---

## 🌟 Características Principales

### 1. Ingesta y Análisis Curricular
- Carga de fuentes en PDF, apuntes digitalizados y textos curriculares.
- Extracción de texto y resumen estructurado con selector de unidades didácticas.

### 2. Generador Psicométrico y Matriz de Pesos
- Configuración flexible de preguntas tipo test (4 opciones A, B, C, D) y problemas de desarrollo práctico.
- Asignación libre y rebalanceo instantáneo proporcional sobre **10,00 puntos**.
- Permutación determinista de **Modelo A y Modelo B** para pupitres contiguos para neutralizar copias.

### 3. Solucionario Confidencial y Exportación Homologada
- Justificación pedagógica de cada clave de corrección.
- Criterios de rúbrica desglosados y resolución modelo paso a paso.
- **Exportación a Word (.doc)**: maquetado formal con encabezado institucional listo para imprimir.
- **Banco de Preguntas Moodle XML**: exportación directa de `<quiz>` compatible con Moodle, Canvas y Blackboard.

### 4. Corrección Óptica con Visión Artificial (OCR)
- Corrección de exámenes manuscritos de alumnos mediante imágenes o escaneos.
- **Detección de Dificultades de Grafía y Triaje Automático**:
  - Alerta explícita para caligrafías dudosas, tachones o respuestas ambiguas.
  - Visor *Split-Screen* con zoom, haz láser azul, delimitación de evidencias manuscritas y ajuste manual de nota.

### 5. Portal de Examen Seguro Online (Anti-Copia)
- Los alumnos realizan el examen en tiempo real desde el navegador.
- **Protección Activa**: Bloqueo de clic derecho, inhabilitación de atajos de teclado e inspección, y **sensor de cambio de foco / minimizado de ventana** que anota incidencias en el acta.
- Generador de convocatorias individuales en lote con asignación alternada Modelo A / B y listado CSV para Excel.

### 6. Acta Oficial de Calificaciones y Estadísticas
- Panel de KPIs docentes: Nota media, tasa de aprobados, desviación típica y desglose de notas.
- Gráficos de distribución de frecuencias segmentados.
- **Exportación en CSV / Excel** con calificaciones ponderadas del 0,00 al 10,00 y observaciones.

### 7. Billetera y Planes Docentes
- Modelo SaaS transparente sin necesidad de configurar claves API.
- Motor semántico NLP local integrado con coste 0 € como respaldo absoluto.
- Soporte para clave corporativa Gemini en servidor o clave personalizada del profesor.

---

## 🛠️ Stack Tecnológico

- **Frontend Core**: React 18 / TypeScript / Vite 6
- **Estilos**: TailwindCSS v3 / Tokens Apple España (`#1d1d1f`, `#f5f5f7`, `#0071e3`, `#b64400`)
- **Iconografía e Identidad**: Lucide React + Activos SVG vectoriales y PNG alta resolución de la Lechuza Geométrica
- **Procesamiento PDF & OCR**: `pdfjs-dist` + API Multimodal Google Gemini
- **Tolerancia a Fallos**: React `ErrorBoundary` de alta disponibilidad

---

## 🚀 Puesta en Marcha Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/mrzuzo90/docentia.git
cd docentia

# 2. Instalar dependencias
npm install

# 3. Iniciar entorno de desarrollo
npm run dev
```

La aplicación estará disponible de inmediato en `http://localhost:5173`.

---

## 🚢 Despliegue en Producción

### Opción A: Vercel (Recomendado)
El proyecto incluye [`vercel.json`](file:///Users/zuzo/Downloads/propuestaexamen/vercel.json) con directivas de reescritura SPA y caché inmutable:
1. Conecta el repositorio en [Vercel](https://vercel.com).
2. Framework Preset: `Vite`.
3. (Opcional) Configura la variable de entorno `VITE_GEMINI_API_KEY`.
4. Pulsa **Deploy**.

### Opción B: Netlify
Incluye [`netlify.toml`](file:///Users/zuzo/Downloads/propuestaexamen/netlify.toml) y [`public/_redirects`](file:///Users/zuzo/Downloads/propuestaexamen/public/_redirects):
1. Importa el repositorio en [Netlify](https://netlify.com).
2. Comando de compilación: `npm run build`.
3. Directorio de publicación: `dist`.

### Opción C: Cloudflare Pages
1. Selecciona el repositorio en Cloudflare Pages.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. El archivo [`public/_redirects`](file:///Users/zuzo/Downloads/propuestaexamen/public/_redirects) gestiona automáticamente las rutas SPA.

### Opción D: Servidor Nginx / Apache / Docker
Compila los archivos estáticos listos para servir:
```bash
npm run build
```
Los archivos optimizados se generarán en la carpeta `dist/`.

---

## 🔒 Privacidad y Seguridad

- Las claves de API ingresadas por el usuario se conservan exclusivamente en el almacenamiento local del navegador (`localStorage`) y nunca se envían a servidores de terceros.
- En despliegues institucionales, la variable de entorno `VITE_GEMINI_API_KEY` permite proveer acceso transparente a todo el claustro sin que los docentes tengan que manipular credenciales.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo de licencia para más detalles.
