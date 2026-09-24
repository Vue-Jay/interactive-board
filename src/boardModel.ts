export type Point = { x: number; y: number };
export type View = Point & { zoom: number };
export type ShapeType = "rectangle" | "rounded" | "ellipse" | "diamond" | "triangle" | "hexagon" | "star" | "arrow";
export type ConnectorStyle = "line" | "arrow" | "double";
export type ConnectorRouting = "straight" | "elbow";
export type ConnectorBinding = { itemId: string; nx: number; ny: number };
export type Item = {
  id: string;
  kind: "sticky" | "text" | "shape" | "pen" | "marker" | "image" | "pdf" | "frame" | "connector" | "comment" | "table" | "formula" | "graph" | "checklist" | "quiz" | "flashcard" | "cover" | "linkmedia";
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  points?: Point[];
  color?: string;
  weight?: number;
  fontSize?: number;
  textAlign?: "left" | "center" | "right";
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  textList?: "none" | "bullet" | "number";
  lineHeight?: number;
  shapeType?: ShapeType;
  assetId?: string;
  name?: string;
  mime?: string;
  pdfPage?: number;
  rotation?: number;
  groupId?: string;
  locked?: boolean;
  hidden?: boolean;
  connectorStart?: Point;
  connectorEnd?: Point;
  connectorStyle?: ConnectorStyle;
  connectorRouting?: ConnectorRouting;
  connectorStartBinding?: ConnectorBinding;
  connectorEndBinding?: ConnectorBinding;
  tableRows?: number;
  tableCols?: number;
  tableCells?: string[];
  tableHeader?: boolean;
  tableAlign?: "left" | "center" | "right";
  tableStripe?: boolean;
  tableCompact?: boolean;
  graphType?: "linear" | "quadratic" | "sin" | "cos";
  graphA?: number; graphB?: number; graphC?: number;
  graphXMin?: number; graphXMax?: number; graphYMin?: number; graphYMax?: number;
  graphGrid?: boolean;
  graphPoints?: { x:number; y:number; label:string }[];
  graphShowLabels?: boolean;
  graphSegments?: { a:number; b:number; kind:"segment"|"line"|"ray"; label:string; measure:boolean }[];
  graphAngles?: { a:number; vertex:number; b:number; label:string }[];
  graphCircles?: { center:number; edge:number; label:string; measure:boolean }[];
  graphPolygons?: { points:number[]; label:string; measure:boolean }[];
  graphMidpoints?: { a:number; b:number; label:string }[];
  graphSnap?: boolean;
  graphAxisLabels?: boolean;
  graphGridStep?: number;
  graphShowCurve?: boolean;
  graphProjections?: boolean;
  resolved?: boolean;
  commentTargetId?: string;
  presentationOrder?: number;
  notes?: string;
  checklistItems?: string[];
  checklistDone?: boolean[];
  quizOptions?: string[];
  quizCorrect?: number;
  quizSelected?: number;
  quizRevealed?: boolean;
  quizExplanation?: string;
  flashcardBack?: string;
  flashcardFlipped?: boolean;
  flashcardMastery?: "again" | "known";
  coverOpen?: boolean;
  mediaUrl?: string;
  mediaTitle?: string;
};
export type DocumentData = { version: 1; title: string; view: View; items: Item[] };
export const STORAGE_KEY = "lesson-board.document.v1";
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && Math.abs(v) < 1e9;
const point = (v: unknown): boolean => !!v && typeof v === "object" && finite((v as Point).x) && finite((v as Point).y);
const color = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v);
const shapes: ShapeType[] = ["rectangle","rounded","ellipse","diamond","triangle","hexagon","star","arrow"];
const connectorStyles: ConnectorStyle[] = ["line","arrow","double"];
const connectorRoutings: ConnectorRouting[] = ["straight","elbow"];
const binding = (v: unknown): v is ConnectorBinding => !!v && typeof v === "object" && typeof (v as ConnectorBinding).itemId === "string" && finite((v as ConnectorBinding).nx) && finite((v as ConnectorBinding).ny) && (v as ConnectorBinding).nx >= 0 && (v as ConnectorBinding).nx <= 1 && (v as ConnectorBinding).ny >= 0 && (v as ConnectorBinding).ny <= 1;

export function parseDocument(raw: string): DocumentData {
  if (raw.length > 10 * 1024 * 1024) throw new Error("Файл слишком большой");
  const d = JSON.parse(raw);
  const allowedKinds = ["sticky","text","shape","pen","marker","image","pdf","frame","connector","comment","table","formula","graph","checklist","quiz","flashcard","cover","linkmedia"];
  if (!d || d.version !== 1 || typeof d.title !== "string" || d.title.length > 10000 || !point(d.view) || !finite(d.view.zoom) || d.view.zoom < .1 || d.view.zoom > 8 || !Array.isArray(d.items) || d.items.length > 10000) throw new Error("Неверный формат доски");
  const ids = new Set<string>();
  let pointCount = 0;
  for (const i of d.items) {
    if (!point(i) || typeof i.id !== "string" || ids.has(i.id) || !allowedKinds.includes(i.kind) || !finite(i.width) || i.width <= 0 || !finite(i.height) || i.height <= 0 || typeof i.text !== "string") throw new Error("Повреждён объект доски");
    ids.add(i.id);
    if (i.kind === "shape" && i.shapeType != null && !shapes.includes(i.shapeType)) throw new Error("Неизвестная фигура");
    if (i.kind === "image" || i.kind === "pdf") {
      if (typeof i.assetId !== "string" || typeof i.name !== "string" || typeof i.mime !== "string") throw new Error("Повреждён медиаобъект");
      if (i.kind === "pdf" && i.pdfPage != null && (!finite(i.pdfPage) || i.pdfPage < 1 || i.pdfPage > 10000)) throw new Error("Повреждён номер страницы PDF");
    }
    if (i.kind === "pen" || i.kind === "marker") {
      if (!Array.isArray(i.points) || !i.points.length || !i.points.every(point) || !finite(i.weight) || i.weight <= 0 || i.weight > 100 || !color(i.color)) throw new Error("Повреждён штрих");
      pointCount += i.points.length;
      if (pointCount > 500000) throw new Error("Слишком много точек в рисунках");
    }
    if (i.kind === "connector") {
      if (!point(i.connectorStart) || !point(i.connectorEnd)) throw new Error("Повреждена соединительная линия");
      if (i.connectorStyle != null && !connectorStyles.includes(i.connectorStyle)) throw new Error("Неизвестный тип соединительной линии");
      if (i.connectorRouting != null && !connectorRoutings.includes(i.connectorRouting)) throw new Error("Неизвестный маршрут соединительной линии");
      if (i.connectorStartBinding != null && !binding(i.connectorStartBinding)) throw new Error("Повреждена привязка начала соединительной линии");
      if (i.connectorEndBinding != null && !binding(i.connectorEndBinding)) throw new Error("Повреждена привязка конца соединительной линии");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет соединительной линии");
      if (i.weight != null && (!finite(i.weight) || i.weight <= 0 || i.weight > 32)) throw new Error("Повреждена толщина соединительной линии");
    }
    if (i.kind === "text" || i.kind === "sticky") {
      if (i.textAlign != null && !["left","center","right"].includes(i.textAlign)) throw new Error("Повреждено выравнивание текста");
      if (i.fontWeight != null && !["normal","bold"].includes(i.fontWeight)) throw new Error("Повреждена насыщенность текста");
      if (i.fontStyle != null && !["normal","italic"].includes(i.fontStyle)) throw new Error("Повреждено начертание текста");
      if (i.textDecoration != null && !["none","underline"].includes(i.textDecoration)) throw new Error("Повреждено подчёркивание текста");
      if (i.textList != null && !["none","bullet","number"].includes(i.textList)) throw new Error("Повреждён тип списка");
      if (i.lineHeight != null && (!finite(i.lineHeight) || i.lineHeight < 1 || i.lineHeight > 2.5)) throw new Error("Повреждён межстрочный интервал");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет текста");
    }
    if (i.kind === "graph") {
      if (i.graphType != null && !["linear","quadratic","sin","cos"].includes(i.graphType)) throw new Error("Повреждён тип графика");
      for (const value of [i.graphA,i.graphB,i.graphC,i.graphXMin,i.graphXMax,i.graphYMin,i.graphYMax]) if (value != null && !finite(value)) throw new Error("Повреждены параметры графика");
      if (i.graphGrid != null && typeof i.graphGrid !== "boolean") throw new Error("Повреждена сетка графика");
      if (i.graphPoints != null && (!Array.isArray(i.graphPoints) || i.graphPoints.length > 40 || !i.graphPoints.every((p: unknown) => !!p && typeof p === "object" && finite((p as {x:number}).x) && finite((p as {y:number}).y) && typeof (p as {label:string}).label === "string" && (p as {label:string}).label.length <= 24))) throw new Error("Повреждены точки графика");
      if (i.graphShowLabels != null && typeof i.graphShowLabels !== "boolean") throw new Error("Повреждены подписи графика");
      if (i.graphSnap != null && typeof i.graphSnap !== "boolean") throw new Error("Повреждена привязка графика");
      if (i.graphAxisLabels != null && typeof i.graphAxisLabels !== "boolean") throw new Error("Повреждены подписи осей графика");
      if (i.graphGridStep != null && (!finite(i.graphGridStep) || i.graphGridStep <= 0 || i.graphGridStep > 1000)) throw new Error("Повреждён шаг сетки графика");
      if (i.graphShowCurve != null && typeof i.graphShowCurve !== "boolean") throw new Error("Повреждена видимость функции графика");
      if (i.graphProjections != null && typeof i.graphProjections !== "boolean") throw new Error("Повреждены проекции точек графика");
      if (i.graphSegments != null && (!Array.isArray(i.graphSegments) || i.graphSegments.length > 60 || !i.graphSegments.every((s: unknown) => !!s && typeof s === "object" && Number.isInteger((s as {a:number}).a) && Number.isInteger((s as {b:number}).b) && ["segment","line","ray"].includes((s as {kind:string}).kind) && typeof (s as {label:string}).label === "string" && typeof (s as {measure:boolean}).measure === "boolean"))) throw new Error("Повреждены геометрические связи графика");
      if (i.graphCircles != null && (!Array.isArray(i.graphCircles) || i.graphCircles.length > 30 || !i.graphCircles.every((g: unknown) => !!g && typeof g === "object" && Number.isInteger((g as {center:number}).center) && Number.isInteger((g as {edge:number}).edge) && typeof (g as {label:string}).label === "string" && typeof (g as {measure:boolean}).measure === "boolean"))) throw new Error("Повреждены окружности графика");
      if (i.graphPolygons != null && (!Array.isArray(i.graphPolygons) || i.graphPolygons.length > 30 || !i.graphPolygons.every((g: unknown) => !!g && typeof g === "object" && Array.isArray((g as {points:number[]}).points) && (g as {points:number[]}).points.length >= 3 && (g as {points:number[]}).points.length <= 20 && (g as {points:number[]}).points.every(Number.isInteger) && typeof (g as {label:string}).label === "string" && typeof (g as {measure:boolean}).measure === "boolean"))) throw new Error("Повреждены многоугольники графика");
      if (i.graphMidpoints != null && (!Array.isArray(i.graphMidpoints) || i.graphMidpoints.length > 40 || !i.graphMidpoints.every((g: unknown) => !!g && typeof g === "object" && Number.isInteger((g as {a:number}).a) && Number.isInteger((g as {b:number}).b) && typeof (g as {label:string}).label === "string"))) throw new Error("Повреждены середины отрезков графика");
      if (i.graphAngles != null && (!Array.isArray(i.graphAngles) || i.graphAngles.length > 40 || !i.graphAngles.every((g: unknown) => !!g && typeof g === "object" && Number.isInteger((g as {a:number}).a) && Number.isInteger((g as {vertex:number}).vertex) && Number.isInteger((g as {b:number}).b) && typeof (g as {label:string}).label === "string"))) throw new Error("Повреждены углы графика");
      if ((i.graphXMin ?? -10) >= (i.graphXMax ?? 10) || (i.graphYMin ?? -10) >= (i.graphYMax ?? 10)) throw new Error("Повреждён диапазон графика");
    }
    if (i.kind === "table") {
      if (!finite(i.tableRows) || !finite(i.tableCols) || i.tableRows < 1 || i.tableRows > 20 || i.tableCols < 1 || i.tableCols > 12) throw new Error("Повреждён размер таблицы");
      if (!Array.isArray(i.tableCells) || i.tableCells.length !== i.tableRows * i.tableCols || !i.tableCells.every((cell: unknown) => typeof cell === "string" && cell.length <= 2000)) throw new Error("Повреждены ячейки таблицы");
      if (i.tableHeader != null && typeof i.tableHeader !== "boolean") throw new Error("Повреждён заголовок таблицы");
      if (i.tableAlign != null && !["left","center","right"].includes(i.tableAlign)) throw new Error("Повреждено выравнивание таблицы");
      if (i.tableStripe != null && typeof i.tableStripe !== "boolean") throw new Error("Повреждено чередование строк таблицы");
      if (i.tableCompact != null && typeof i.tableCompact !== "boolean") throw new Error("Повреждён компактный режим таблицы");
      if (i.fontSize != null && (!finite(i.fontSize) || i.fontSize < 9 || i.fontSize > 32)) throw new Error("Повреждён размер текста таблицы");
    }
    if (i.kind === "comment") {
      if (i.resolved != null && typeof i.resolved !== "boolean") throw new Error("Повреждён комментарий");
      if (i.commentTargetId != null && typeof i.commentTargetId !== "string") throw new Error("Повреждена привязка комментария");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет комментария");
    }
    if (i.kind === "formula") {
      if (i.fontSize != null && (!finite(i.fontSize) || i.fontSize < 12 || i.fontSize > 96)) throw new Error("Повреждён размер формулы");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет формулы");
      if (i.text.length > 10000) throw new Error("Формула слишком длинная");
    }
    if (i.kind === "checklist") {
      if (!Array.isArray(i.checklistItems) || i.checklistItems.length < 1 || i.checklistItems.length > 40 || !i.checklistItems.every((value: unknown) => typeof value === "string" && value.length <= 2000)) throw new Error("Повреждён чек-лист");
      if (!Array.isArray(i.checklistDone) || i.checklistDone.length !== i.checklistItems.length || !i.checklistDone.every((value: unknown) => typeof value === "boolean")) throw new Error("Повреждены отметки чек-листа");
      if (i.fontSize != null && (!finite(i.fontSize) || i.fontSize < 10 || i.fontSize > 32)) throw new Error("Повреждён размер текста чек-листа");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет чек-листа");
    }
    if (i.kind === "quiz") {
      if (!Array.isArray(i.quizOptions) || i.quizOptions.length < 2 || i.quizOptions.length > 8 || !i.quizOptions.every((value: unknown) => typeof value === "string" && value.length <= 2000)) throw new Error("Повреждены варианты ответа");
      if (!finite(i.quizCorrect) || i.quizCorrect < 0 || i.quizCorrect >= i.quizOptions.length) throw new Error("Повреждён правильный ответ");
      if (i.quizSelected != null && (!finite(i.quizSelected) || i.quizSelected < 0 || i.quizSelected >= i.quizOptions.length)) throw new Error("Повреждён выбранный ответ");
      if (i.quizRevealed != null && typeof i.quizRevealed !== "boolean") throw new Error("Повреждён режим показа ответа");
      if (i.quizExplanation != null && (typeof i.quizExplanation !== "string" || i.quizExplanation.length > 5000)) throw new Error("Повреждено пояснение к вопросу");
      if (i.fontSize != null && (!finite(i.fontSize) || i.fontSize < 10 || i.fontSize > 32)) throw new Error("Повреждён размер текста вопроса");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет вопроса");
    }
    if (i.kind === "flashcard") {
      if (i.text.length > 5000) throw new Error("Лицевая сторона карточки слишком длинная");
      if (i.flashcardBack != null && (typeof i.flashcardBack !== "string" || i.flashcardBack.length > 5000)) throw new Error("Повреждена обратная сторона карточки");
      if (i.flashcardFlipped != null && typeof i.flashcardFlipped !== "boolean") throw new Error("Повреждено состояние карточки");
      if (i.flashcardMastery != null && !["again","known"].includes(i.flashcardMastery)) throw new Error("Повреждён статус изучения карточки");
      if (i.fontSize != null && (!finite(i.fontSize) || i.fontSize < 10 || i.fontSize > 48)) throw new Error("Повреждён размер текста карточки");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет карточки");
    }
    if (i.kind === "linkmedia") {
      if (typeof i.mediaUrl !== "string" || i.mediaUrl.length > 5000 || !/^https?:\/\//i.test(i.mediaUrl)) throw new Error("Повреждена ссылка мультимедиа");
      if (i.mediaTitle != null && (typeof i.mediaTitle !== "string" || i.mediaTitle.length > 500)) throw new Error("Повреждено название мультимедиа");
    }
    if (i.kind === "cover") {
      if (i.text.length > 5000) throw new Error("Подпись шторки слишком длинная");
      if (i.coverOpen != null && typeof i.coverOpen !== "boolean") throw new Error("Повреждено состояние шторки");
      if (i.fontSize != null && (!finite(i.fontSize) || i.fontSize < 10 || i.fontSize > 48)) throw new Error("Повреждён размер текста шторки");
      if (i.color != null && !color(i.color)) throw new Error("Повреждён цвет шторки");
    }
  }
  return {
    version: 1,
    title: d.title,
    view: { x: d.view.x, y: d.view.y, zoom: d.view.zoom },
    items: d.items.map((i: Item) => ({
      id: i.id,
      kind: i.kind,
      x: i.x,
      y: i.y,
      width: i.width,
      height: i.height,
      text: i.text,
      ...(i.kind === "pen" || i.kind === "marker" ? { color: i.color, weight: i.weight, points: i.points!.map(p => ({ x: p.x, y: p.y })) } : {}),
      ...(i.kind === "shape" ? { shapeType: i.shapeType ?? "rounded", ...(color(i.color) ? { color: i.color } : {}) } : {}),
      ...(i.kind === "image" || i.kind === "pdf" ? { assetId: i.assetId, name: i.name, mime: i.mime, ...(i.kind === "pdf" && finite(i.pdfPage) ? { pdfPage: Math.max(1, Math.round(i.pdfPage)) } : {}) } : {}),
      ...(i.kind === "connector" ? {
        connectorStart: { ...i.connectorStart! },
        connectorEnd: { ...i.connectorEnd! },
        connectorStyle: i.connectorStyle ?? "arrow",
        connectorRouting: i.connectorRouting ?? "straight",
        ...(binding(i.connectorStartBinding) ? { connectorStartBinding: { ...i.connectorStartBinding } } : {}),
        ...(binding(i.connectorEndBinding) ? { connectorEndBinding: { ...i.connectorEndBinding } } : {}),
        color: color(i.color) ? i.color : "#5355c9",
        weight: finite(i.weight) ? i.weight : 3,
      } : {}),
      ...(i.kind === "table" ? {
        tableRows: Math.max(1, Math.min(20, Math.round(i.tableRows ?? 3))),
        tableCols: Math.max(1, Math.min(12, Math.round(i.tableCols ?? 3))),
        tableCells: Array.isArray(i.tableCells) ? i.tableCells.map((cell) => String(cell)) : [],
        tableHeader: i.tableHeader !== false,
        ...(finite(i.fontSize) && i.fontSize >= 9 && i.fontSize <= 32 ? { fontSize: i.fontSize } : {}),
      } : {}),
      ...(i.kind === "comment" ? {
        resolved: i.resolved === true,
        ...(typeof i.commentTargetId === "string" && i.commentTargetId ? { commentTargetId: i.commentTargetId } : {}),
        color: color(i.color) ? i.color : "#fff8d6",
      } : {}),
      ...((i.kind === "sticky" || i.kind === "frame" || i.kind === "formula") && color(i.color) ? { color: i.color } : {}),
      ...((i.kind === "text" || i.kind === "sticky") && finite(i.fontSize) && i.fontSize >= 10 && i.fontSize <= 96 ? { fontSize: i.fontSize } : {}),
      ...((i.kind === "text" || i.kind === "sticky") ? {
        textAlign: i.textAlign ?? "left", fontWeight: i.fontWeight ?? "normal", fontStyle: i.fontStyle ?? "normal", textDecoration: i.textDecoration ?? "none",
        textList: i.textList ?? "none", lineHeight: finite(i.lineHeight) ? Math.max(1, Math.min(2.5, i.lineHeight)) : 1.45,
        ...(color(i.color) ? { color: i.color } : {}),
      } : {}),
      ...(i.kind === "formula" && finite(i.fontSize) && i.fontSize >= 12 && i.fontSize <= 96 ? { fontSize: i.fontSize } : {}),
      ...(i.kind === "checklist" ? {
        checklistItems: Array.isArray(i.checklistItems) ? i.checklistItems.map((value) => String(value).slice(0, 2000)) : ["Новый пункт"],
        checklistDone: Array.isArray(i.checklistDone) ? i.checklistDone.map((value) => value === true) : [false],
        ...(finite(i.fontSize) && i.fontSize >= 10 && i.fontSize <= 32 ? { fontSize: i.fontSize } : {}),
        color: color(i.color) ? i.color : "#5355c9",
      } : {}),
      ...(i.kind === "quiz" ? {
        quizOptions: Array.isArray(i.quizOptions) ? i.quizOptions.slice(0, 8).map((value) => String(value).slice(0, 2000)) : ["Вариант 1", "Вариант 2"],
        quizCorrect: finite(i.quizCorrect) ? Math.max(0, Math.min((i.quizOptions?.length ?? 2) - 1, Math.round(i.quizCorrect))) : 0,
        ...(finite(i.quizSelected) ? { quizSelected: Math.max(0, Math.min((i.quizOptions?.length ?? 2) - 1, Math.round(i.quizSelected))) } : {}),
        quizRevealed: i.quizRevealed === true,
        ...(typeof i.quizExplanation === "string" ? { quizExplanation: i.quizExplanation.slice(0, 5000) } : {}),
        ...(finite(i.fontSize) && i.fontSize >= 10 && i.fontSize <= 32 ? { fontSize: i.fontSize } : {}),
        color: color(i.color) ? i.color : "#5355c9",
      } : {}),
      ...(i.kind === "flashcard" ? {
        flashcardBack: typeof i.flashcardBack === "string" ? i.flashcardBack.slice(0, 5000) : "Ответ",
        flashcardFlipped: i.flashcardFlipped === true,
        ...(i.flashcardMastery === "again" || i.flashcardMastery === "known" ? { flashcardMastery: i.flashcardMastery } : {}),
        ...(finite(i.fontSize) && i.fontSize >= 10 && i.fontSize <= 48 ? { fontSize: i.fontSize } : {}),
        color: color(i.color) ? i.color : "#5355c9",
      } : {}),
      ...(i.kind === "linkmedia" ? { mediaUrl: i.mediaUrl, ...(typeof i.mediaTitle === "string" ? { mediaTitle: i.mediaTitle.slice(0,500) } : {}) } : {}),
      ...(i.kind === "cover" ? {
        coverOpen: i.coverOpen === true,
        ...(finite(i.fontSize) && i.fontSize >= 10 && i.fontSize <= 48 ? { fontSize: i.fontSize } : {}),
        color: color(i.color) ? i.color : "#5355c9",
      } : {}),
      ...(finite(i.rotation) ? { rotation: i.rotation } : {}),
      ...(i.kind === "frame" && finite(i.presentationOrder) ? { presentationOrder: Math.max(0, Math.round(i.presentationOrder)) } : {}),
      ...(i.kind === "frame" && typeof i.notes === "string" ? { notes: i.notes.slice(0, 20000) } : {}),
      ...(typeof i.groupId === "string" && i.groupId ? { groupId: i.groupId } : {}),
      ...(i.locked === true ? { locked: true } : {}),
      ...(i.hidden === true ? { hidden: true } : {}),
    })),
  };
}

export function stroke(id: string, kind: "pen" | "marker", path: Point[], colorValue: string, weight: number): Item {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of path) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const x = minX - weight / 2, y = minY - weight / 2;
  return {
    id,
    kind,
    x,
    y,
    width: Math.max(weight, maxX - minX + weight),
    height: Math.max(weight, maxY - minY + weight),
    text: "",
    color: colorValue,
    weight,
    points: path.map(p => ({ x: p.x - x, y: p.y - y })),
  };
}

function distanceToSegment(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x, dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function erasedByPath(p: Point, path: Point[], radius: number) {
  if (!path.length) return false;
  if (path.length === 1) return Math.hypot(p.x - path[0].x, p.y - path[0].y) <= radius;
  for (let i = 1; i < path.length; i++) if (distanceToSegment(p, path[i - 1], path[i]) <= radius) return true;
  return false;
}

export function eraseInk(items: Item[], path: Point[], radius: number): Item[] {
  if (!path.length) return items;
  const out: Item[] = [];
  for (const item of items) {
    if ((item.kind !== "pen" && item.kind !== "marker") || !item.points) {
      out.push(item);
      continue;
    }
    const world = item.points.map(p => ({ x: p.x + item.x, y: p.y + item.y }));
    const effectiveRadius = radius + (item.weight ?? 1) / 2;
    const runs: Point[][] = [];
    let run: Point[] = [];
    for (let i = 0; i < world.length; i++) {
      const p = world[i];
      const pointErased = erasedByPath(p, path, effectiveRadius);
      let segmentErased = false;
      if (i > 0) {
        for (let j = 1; j < path.length && !segmentErased; j++) {
          const a = world[i - 1], b = world[i], c = path[j - 1], d = path[j];
          segmentErased = distanceToSegment(c, a, b) <= effectiveRadius || distanceToSegment(d, a, b) <= effectiveRadius || distanceToSegment(a, c, d) <= effectiveRadius || distanceToSegment(b, c, d) <= effectiveRadius;
        }
      }
      if (pointErased || segmentErased) {
        if (run.length) { runs.push(run); run = []; }
      } else run.push(p);
    }
    if (run.length) runs.push(run);
    for (const segment of runs) if (segment.length) out.push(stroke(crypto.randomUUID(), item.kind, segment, item.color ?? "#000000", item.weight ?? 3));
  }
  return out;
}
