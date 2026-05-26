export const QUIZ_DATA = {
  sistemas: {
    eventName: "El Hackathon EPN",
    icon: "💻",
    color: 0x5c79ff,
    questions: [
      {
        q: "¿Cuál es la complejidad temporal promedio del algoritmo QuickSort?",
        opts: ["O(n²)", "O(n log n)", "O(n)", "O(log n)"],
        correct: 1,
      },
      {
        q: "¿Qué significa HTTP en los protocolos web?",
        opts: [
          "HyperText Transfer Protocol",
          "High Transfer Text Protocol",
          "Host Text Transmission Program",
          "HyperText Transmission Process",
        ],
        correct: 0,
      },
      {
        q: "¿Cuántos bits tiene un byte?",
        opts: ["4", "16", "8", "32"],
        correct: 2,
      },
      {
        q: "En programación orientada a objetos, ¿qué es la herencia?",
        opts: [
          "Copiar el código de otro archivo",
          "Una clase que adquiere propiedades de otra clase",
          "Un tipo de bucle",
          "Un método de ordenamiento",
        ],
        correct: 1,
      },
      {
        q: "¿Qué estructura de datos sigue el principio LIFO?",
        opts: ["Cola (Queue)", "Lista enlazada", "Pila (Stack)", "Árbol binario"],
        correct: 2,
      },
      {
        q: "¿Qué es SQL?",
        opts: [
          "Un lenguaje de programación orientado a objetos",
          "Un sistema operativo",
          "Structured Query Language para bases de datos",
          "Un protocolo de red",
        ],
        correct: 2,
      },
      {
        q: "¿Qué hace el comando 'git commit' en control de versiones?",
        opts: [
          "Sube cambios al repositorio remoto",
          "Guarda los cambios en el historial local",
          "Elimina el repositorio",
          "Fusiona dos ramas",
        ],
        correct: 1,
      },
    ],
  },

  civil: {
    eventName: "¡Proyecto de Infraestructura!",
    icon: "🏗️",
    color: 0x33aacc,
    questions: [
      {
        q: "¿Qué material se utiliza principalmente en la construcción de estructuras de hormigón armado?",
        opts: ["Madera y cemento", "Acero y concreto", "Aluminio y arcilla", "Vidrio y plástico"],
        correct: 1,
      },
      {
        q: "¿Cuál es la unidad de medida de la presión en el sistema internacional?",
        opts: ["Newton", "Joule", "Pascal", "Watt"],
        correct: 2,
      },
      {
        q: "¿Qué estudia la topografía?",
        opts: [
          "Las propiedades de los materiales de construcción",
          "La resistencia de los suelos",
          "La representación gráfica de la superficie terrestre",
          "El flujo de agua en tuberías",
        ],
        correct: 2,
      },
      {
        q: "¿Qué es la resistencia a la compresión del concreto?",
        opts: [
          "La capacidad de doblegarse sin romperse",
          "La capacidad de soportar cargas que lo comprimen",
          "La resistencia al fuego",
          "La impermeabilidad del material",
        ],
        correct: 1,
      },
      {
        q: "En una viga simplemente apoyada, ¿dónde se produce el máximo momento flector bajo carga uniforme?",
        opts: ["En los extremos", "En el centro del vano", "En los apoyos", "En los tercios"],
        correct: 1,
      },
      {
        q: "¿Qué es la hidrología en ingeniería civil?",
        opts: [
          "El estudio de los puentes",
          "El estudio del ciclo del agua y su distribución",
          "El diseño de edificios altos",
          "El análisis de suelos arcillosos",
        ],
        correct: 1,
      },
      {
        q: "¿Qué factor de seguridad se considera mínimo en el diseño estructural convencional?",
        opts: ["1.0", "1.5", "3.0", "5.0"],
        correct: 1,
      },
    ],
  },

  medicina: {
    eventName: "¡Jornada de Salud EPN!",
    icon: "🩺",
    color: 0xcc3344,
    questions: [
      {
        q: "¿Cuántos huesos tiene el cuerpo humano adulto?",
        opts: ["186", "206", "226", "196"],
        correct: 1,
      },
      {
        q: "¿Qué órgano produce la insulina?",
        opts: ["Hígado", "Riñón", "Páncreas", "Bazo"],
        correct: 2,
      },
      {
        q: "¿Cuál es la frecuencia cardíaca normal en reposo para un adulto?",
        opts: ["40-60 lpm", "60-100 lpm", "100-120 lpm", "120-160 lpm"],
        correct: 1,
      },
      {
        q: "¿Qué vitamina produce el cuerpo al exponerse al sol?",
        opts: ["Vitamina A", "Vitamina B12", "Vitamina C", "Vitamina D"],
        correct: 3,
      },
      {
        q: "¿Cuántos pares de cromosomas tiene una célula humana normal?",
        opts: ["21", "23", "46", "48"],
        correct: 1,
      },
      {
        q: "¿Qué es el ADN?",
        opts: [
          "Ácido desoxirribonucleico, portador de información genética",
          "Una proteína de la sangre",
          "Una enzima digestiva",
          "Un tipo de hormona",
        ],
        correct: 0,
      },
      {
        q: "¿Qué parte del cerebro regula el equilibrio y la coordinación?",
        opts: ["Cerebro", "Hipotálamo", "Cerebelo", "Bulbo raquídeo"],
        correct: 2,
      },
    ],
  },

  quimica: {
    eventName: "¡Experimento en el Lab!",
    icon: "⚗️",
    color: 0x33aa55,
    questions: [
      {
        q: "¿Cuál es el símbolo químico del oro?",
        opts: ["Go", "Or", "Au", "Ag"],
        correct: 2,
      },
      {
        q: "¿Qué pH corresponde a una solución neutra?",
        opts: ["0", "7", "14", "3"],
        correct: 1,
      },
      {
        q: "¿Cuál es la fórmula química del agua?",
        opts: ["HO", "H₂O₂", "H₂O", "OH"],
        correct: 2,
      },
      {
        q: "¿Cuál es el número atómico del carbono?",
        opts: ["4", "6", "8", "12"],
        correct: 1,
      },
      {
        q: "¿Qué tipo de enlace se forma al compartir electrones entre dos átomos?",
        opts: ["Enlace iónico", "Enlace metálico", "Enlace covalente", "Enlace de hidrógeno"],
        correct: 2,
      },
      {
        q: "¿Cuántos electrones puede alojar la primera capa de energía de un átomo?",
        opts: ["2", "8", "18", "32"],
        correct: 0,
      },
      {
        q: "¿Qué es la tabla periódica?",
        opts: [
          "Una lista de compuestos orgánicos",
          "La organización de los elementos químicos por número atómico",
          "Un registro de reacciones químicas",
          "Un catálogo de moléculas",
        ],
        correct: 1,
      },
    ],
  },
};
