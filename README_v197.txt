OnlineRepetitor v197 — PROMPT-DRIVEN LOCAL AI

Fixed the core behavior shown in the screenshot:
- the text field is now an instruction, not a title/comment;
- the selected category only narrows the domain;
- the actual prompt determines the subtype of generated material.

Examples now understood locally:
- "кубические уравнения" -> cubic equations with integer roots;
- "квадратные уравнения" -> quadratic equations;
- "системы уравнений" -> 2-variable systems;
- "теорема Пифагора" -> right-triangle problems;
- "окружности / радиус / диаметр" -> circle problems;
- "треугольники" -> triangle-area problems.

The inserted board object title is now the detected material type instead of copying the user's instruction verbatim.

Important: this is still an offline intent parser/generator. It can obey supported mathematical instructions, but unrestricted natural-language understanding requires the real server-side AI model integration.

Test:
npm run build
npm run dev
