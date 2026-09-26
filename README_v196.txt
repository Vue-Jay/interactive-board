OnlineRepetitor v196 — INTENT-AWARE BOARD AI

The robot now understands the requested math category instead of ignoring the prompt.

Examples:
- "создай квадратные уравнения" -> quadratic equations with integer roots
- "задачи по геометрии" -> geometry
- "примеры с дробями" -> fractions
- "задачи на проценты" -> percentages
- "задания по функциям" -> functions

Categories:
По запросу, Примеры, Уравнения, Дроби, Геометрия, Функции, Проценты, Текстовые задачи, Смешанное.

Added:
- automatic intent detection from the prompt;
- geometry tasks: rectangles, triangles, circles, Pythagorean theorem;
- quadratic equations;
- fractions;
- percentages;
- linear functions;
- word problems;
- optional answers;
- detected category shown before insertion.

This remains an offline local generator. It now behaves coherently for supported school-math intents, but free-form semantic understanding beyond these categories will require the later real AI backend.

Test:
npm run build
npm run dev
