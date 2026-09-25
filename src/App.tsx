import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as PE,
} from "react";
import "./App.css";
import AuthScreen from "./AuthScreen";
import BoardsScreen from "./BoardsScreen";
import StudentsScreen from "./StudentsScreen";
import AssignmentsScreen from "./AssignmentsScreen";
import ProgressScreen from "./ProgressScreen";
import ScheduleScreen from "./ScheduleScreen";
import MaterialsScreen from "./MaterialsScreen";
import NotificationsScreen from "./NotificationsScreen";
import ProfileScreen from "./ProfileScreen";
import { getAccountAccess,type AccountRole } from "./accountRoleStore";
import AdminScreen from "./AdminScreen";
import TemplatesScreen from "./TemplatesScreen";
import TestingGuideScreen from "./TestingGuideScreen";

import { materialBlob,markMaterialUsed,type Material } from "./materialsStore";
import { finishLesson, getActiveLesson, startLesson, type LiveLesson } from "./lessonStore";
import ShareDialog from "./ShareDialog";
import { clearPendingShare, initialRoute, parseRoute, rememberShareToken, type AppRoute } from "./routes";
import { redeemShareLink } from "./shareLinks";
import { BOARD_ROLE_LABELS, getCachedCurrentUser, getCurrentUser, logoutUser, type AuthUser } from "./authStore";
import { boardStorageKey, getBoardForUser, touchBoard, type BoardSummary } from "./boardStore";
import { getRemoteBoardDocument, isRemoteBackendEnabled, saveRemoteBoardDocument, type RemoteBoardDocument } from "./backend";
import { subscribeBoardDocument, type RealtimeStatus } from "./boardRealtime";
import { subscribeBoardPresence, type BoardPresenceUser } from "./boardPresence";
import { connectBoardCursorChannel, type BoardCursorChannel, type RemoteCursor } from "./boardBroadcast";
import { connectBoardViewControl, type BoardViewControlChannel } from "./boardViewSync";
import { connectBoardWorkChannel, type BoardWorkChannel, type RemoteWorkState } from "./boardWorkSync";
import { documentFingerprint, isOwnRemoteRevision, remoteUpdateDecision } from "./boardSync";
import {
  parseDocument,
  stroke,
  eraseInk,
  type ShapeType,
  type ConnectorStyle,
  type ConnectorRouting,
  type ConnectorBinding,
  type Point,
  type View,
  type Item,
  type DocumentData,
} from "./boardModel";
import { ensureBoardAssets, getAsset, putAsset } from "./assetStore";
import { getBoardHistoryVersion, listBoardHistory, type BoardHistoryEntry } from "./historyStore";
import { createBoardComment, listBoardComments, listBoardCommentParticipants, setBoardCommentResolved, type BoardCommentParticipant, type BoardCommentThread } from "./commentThreadsStore";
import { subscribeBoardComments } from "./commentRealtime";
import { LinkMediaPlayer, resolveLinkMedia } from "./linkMedia";
import { safeBackupName, validatePortableBundle, type PortableBoardBundle } from "./backupStore";

type Tool =
  | "select"
  | "hand"
  | "lasso"
  | "sticky"
  | "text"
  | "shape"
  | "pen"
  | "marker"
  | "eraser"
  | "connector"
  | "frame"
  | "comment"
  | "table"
  | "formula"
  | "graph"
  | "checklist"
  | "quiz"
  | "flashcard"
  | "cover"
  | "media"
  | "linkmedia";

type IconName =
  | Tool
  | "search" | "present" | "layers" | "undo" | "redo" | "close"
  | "duplicate" | "copy" | "lock" | "unlock" | "group" | "ungroup"
  | "rotate-left" | "rotate-right" | "reset-rotation" | "more" | "rename"
  | "layer-down" | "layer-up" | "send-back" | "send-front" | "trash"
  | "align-left" | "align-center-x" | "align-right" | "align-top" | "align-center-y" | "align-bottom"
  | "distribute-x" | "distribute-y" | "open" | "download" | "eye" | "eye-off"
  | "frame-contents" | "fit" | "grid" | "dots" | "plain" | "line" | "arrow-one" | "arrow-double" | "elbow" | "link" | "unlink" | "label" | "zoom-in" | "zoom-out" | "snap" | "chevron-left" | "chevron-right"
  | "templates" | "comments" | "check" | "plus" | "minus" | "presentation-order"
  | "checklist" | "quiz" | "cover" | "flip" | "fullscreen" | "timer" | "laser" | "spotlight" | "slides" | "play" | "pause" | "reset" | "keyboard";

const iconBody = (name: IconName) => {
  switch (name) {
    case "select": return <><path d="M5 3.8 18.2 11l-6.1 1.7-2.6 6.1L5 3.8Z"/><path d="m12.2 12.7 4.4 4.4"/></>;
    case "hand": return <><path d="M7.5 11V7.7a1.5 1.5 0 0 1 3 0V10"/><path d="M10.5 10V6.2a1.5 1.5 0 0 1 3 0V10"/><path d="M13.5 10V7a1.5 1.5 0 0 1 3 0v5"/><path d="M7.5 10.2 6.4 9.1a1.6 1.6 0 0 0-2.3 2.2l4.5 6.1A4 4 0 0 0 11.8 19h1.7a5 5 0 0 0 5-5v-3a1.5 1.5 0 0 0-3 0v1"/></>;
    case "lasso": return <><path d="M18.7 8.8c.5 3.1-2.4 6.4-6.8 7-4.5.6-7.9-1.3-8.3-4.1-.4-3 2.8-5.9 7.1-6.4 4-.5 7.3 1 8 3.5Z"/><path d="M12.5 15.7c.5 2.1 2.2 3.8 4.3 3.4 1.7-.3 2.6-1.8 1.7-2.8-.8-.9-2.8-.3-2.8 1.1"/></>;
    case "pen": return <><path d="m5 19 3.2-.8L18 8.4a2 2 0 0 0-2.8-2.8l-9.8 9.8L5 19Z"/><path d="m13.7 7.1 3.2 3.2"/></>;
    case "marker": return <><path d="m6 15 7.9-9a1.8 1.8 0 0 1 2.6-.1l1.6 1.5a1.8 1.8 0 0 1 0 2.6L10 18H6v-3Z"/><path d="M4 20h10"/><path d="m12.2 8 3.8 3.8"/></>;
    case "eraser": return <><path d="m7.3 17.5-2.8-2.8a2 2 0 0 1 0-2.8l6.7-6.7a2 2 0 0 1 2.8 0l4.8 4.8a2 2 0 0 1 0 2.8l-4.7 4.7H7.3Z"/><path d="m9.2 8.2 6.6 6.6"/><path d="M13.8 17.5H20"/></>;
    case "connector": return <><path d="M5 17 17 5"/><path d="M11 5h6v6"/><circle cx="5" cy="17" r="2"/><circle cx="17" cy="5" r="2"/></>;
    case "frame": return <><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 5v14M16 5v14M4 9h16M4 15h16" opacity=".45"/></>;
    case "comment": return <><path d="M5 5h14v10H9l-4 4V5Z"/><path d="M8 9h8M8 12h5"/></>;
    case "table": return <><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 14.5h16M10 5v14M15 5v14"/></>;
    case "formula": return <><path d="M5 7h7l-5 10h7"/><path d="M16 8c1.8 0 3 1.2 3 3s-1.2 3-3 3M18.5 7.5l1.5-1.5"/></>;
    case "graph": return <><path d="M4 19V5M4 12h16"/><path d="M6 16c3-1 4-8 7-8s3 5 7 3"/></>;
    case "checklist": return <><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m7 9 1.5 1.5L11 8M13.5 9H17M7 14l1.5 1.5L11 13M13.5 14H17"/></>;
    case "quiz": return <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9.2 9.1a2.9 2.9 0 1 1 4.7 2.3c-1.1.8-1.9 1.3-1.9 2.6"/><circle cx="12" cy="17" r=".8" fill="currentColor" stroke="none"/></>;
    case "flashcard": return <><rect x="5" y="4" width="14" height="16" rx="2.5"/><path d="M8 8h8M8 12h5"/><path d="m15 16 2 2 3-4"/></>;
    case "cover": return <><rect x="4" y="5" width="16" height="14" rx="2.5"/><path d="M7 9h10M7 12h7"/><path d="M17 15.5 20 12.5M20 12.5 17 9.5"/></>;
    case "flip": return <><path d="M6 7h9a5 5 0 0 1 5 5v1"/><path d="m16 9 4 4 4-4" transform="translate(-4 0)"/><path d="M18 17H9a5 5 0 0 1-5-5v-1"/><path d="m8 15-4-4-4 4" transform="translate(4 0)"/></>;
    case "text": return <><path d="M5 6h14M12 6v13M8.5 19h7"/></>;
    case "sticky": return <><path d="M5 4h14v11l-5 5H5V4Z"/><path d="M14 20v-5h5"/></>;
    case "shape": return <><rect x="4.5" y="5" width="7" height="7" rx="1.5"/><circle cx="16.5" cy="8.5" r="3.5"/><path d="m8 19 3.5-5 3.5 5H8Z"/></>;
    case "media": return <><rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5.5 17 4.2-4 3.1 2.8 2.3-2.2 3.4 3.4"/></>;
    case "linkmedia": return <><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/><path d="M6 18 18 6"/></>;
    case "search": return <><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/></>;
    case "present": return <><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M12 16v4M8.5 20h7"/><path d="m10 9 5 2.5-5 2.5V9Z"/></>;
    case "layers": return <><path d="m12 4 8 4-8 4-8-4 8-4Z"/><path d="m4 12 8 4 8-4M4 16l8 4 8-4"/></>;
    case "undo": return <><path d="M8 7 4 11l4 4"/><path d="M5 11h8a6 6 0 0 1 6 6"/></>;
    case "redo": return <><path d="m16 7 4 4-4 4"/><path d="M19 11h-8a6 6 0 0 0-6 6"/></>;
    case "close": return <><path d="m7 7 10 10M17 7 7 17"/></>;
    case "duplicate": return <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>;
    case "copy": return <><rect x="9" y="8" width="11" height="11" rx="2"/><rect x="4" y="4" width="11" height="11" rx="2"/></>;
    case "lock": return <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>;
    case "unlock": return <><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 7.2-2.4"/></>;
    case "group": return <><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><path d="M14 4h6v6M4 14v6h6"/></>;
    case "ungroup": return <><rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><path d="M20 10V4h-6M4 14v6h6" strokeDasharray="2 2"/></>;
    case "rotate-left": return <><path d="M7 7H3v-4"/><path d="M4 7a8 8 0 1 1 .9 10.8"/></>;
    case "rotate-right": return <><path d="M17 7h4v-4"/><path d="M20 7a8 8 0 1 0-.9 10.8"/></>;
    case "reset-rotation": return <><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></>;
    case "more": return <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>;
    case "rename": return <><path d="M5 19h4l10-10a2 2 0 0 0-4-4L5 15v4Z"/><path d="m13.5 6.5 4 4"/></>;
    case "layer-down": return <><path d="m5 8 7-4 7 4-7 4-7-4Z"/><path d="m5 13 7 4 7-4M12 17v4m0 0-2-2m2 2 2-2"/></>;
    case "layer-up": return <><path d="m5 12 7 4 7-4-7-4-7 4Z"/><path d="m5 7 7-4 7 4M12 7V3m0 0-2 2m2-2 2 2"/></>;
    case "send-back": return <><path d="m5 7 7-4 7 4-7 4-7-4ZM5 12l7 4 7-4M5 16l7 4 7-4"/><path d="M3 19V9"/></>;
    case "send-front": return <><path d="m5 8 7-4 7 4-7 4-7-4ZM5 13l7 4 7-4"/><path d="M21 5v10"/></>;
    case "trash": return <><path d="M5 7h14M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6.5 7l1 13h9l1-13"/></>;
    case "align-left": return <><path d="M5 4v16M8 7h10M8 12h7M8 17h9"/></>;
    case "align-center-x": return <><path d="M12 4v16M6 7h12M8 12h8M5 17h14"/></>;
    case "align-right": return <><path d="M19 4v16M6 7h10M9 12h7M7 17h9"/></>;
    case "align-top": return <><path d="M4 5h16M7 8v10M12 8v7M17 8v9"/></>;
    case "align-center-y": return <><path d="M4 12h16M7 6v12M12 8v8M17 5v14"/></>;
    case "align-bottom": return <><path d="M4 19h16M7 6v10M12 9v7M17 7v9"/></>;
    case "distribute-x": return <><path d="M4 5v14M20 5v14M8 8v8M12 6v12M16 8v8"/></>;
    case "distribute-y": return <><path d="M5 4h14M5 20h14M8 8h8M6 12h12M8 16h8"/></>;
    case "open": return <><path d="M14 5h5v5M19 5l-8 8"/><path d="M17 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h5"/></>;
    case "download": return <><path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 19h14"/></>;
    case "eye": return <><path d="M3 12s3-5 9-5 9 5 9 5-3 5-9 5-9-5-9-5Z"/><circle cx="12" cy="12" r="2.5"/></>;
    case "eye-off": return <><path d="m4 4 16 16"/><path d="M9.5 7.4A9.7 9.7 0 0 1 12 7c6 0 9 5 9 5a14 14 0 0 1-2.1 2.6M6.1 8.1C4.1 9.5 3 12 3 12s3 5 9 5c1 0 1.9-.1 2.7-.4"/><path d="M10.4 10.4a2.5 2.5 0 0 0 3.2 3.2"/></>;
    case "frame-contents": return <><rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><rect x="12" y="9" width="4" height="4" rx=".7"/><path d="M8 16h8"/></>;
    case "fit": return <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></>;
    case "grid": return <><path d="M4 4h16v16H4zM10 4v16M16 4v16M4 10h16M4 16h16"/></>;
    case "dots": return <>{[6,12,18].flatMap((x) => [6,12,18].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill="currentColor" stroke="none"/>))}</>;
    case "plain": return <rect x="4" y="5" width="16" height="14" rx="2"/>;
    case "line": return <path d="M4 12h16"/>;
    case "arrow-one": return <><path d="M4 12h15"/><path d="m15 8 4 4-4 4"/></>;
    case "arrow-double": return <><path d="M5 12h14"/><path d="m9 8-4 4 4 4M15 8l4 4-4 4"/></>;
    case "elbow": return <><path d="M4 6h7v12h9"/><path d="m16 14 4 4-4 4"/></>;
    case "link": return <><path d="M9.5 14.5 7 17a3 3 0 0 1-4-4l3-3a3 3 0 0 1 4 0"/><path d="m14.5 9.5 2.5-2.5a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-4 0"/><path d="m8.5 15.5 7-7"/></>;
    case "unlink": return <><path d="M8 16 7 17a3 3 0 0 1-4-4l3-3a3 3 0 0 1 3.5-.4"/><path d="M16 8 17 7a3 3 0 0 1 4 4l-3 3a3 3 0 0 1-3.5.4"/><path d="m4 4 16 16"/></>;
    case "label": return <><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M8 10h8M8 14h5"/></>;
    case "zoom-in": return <><circle cx="10.5" cy="10.5" r="5.5"/><path d="M10.5 8v5M8 10.5h5M15 15l4 4"/></>;
    case "zoom-out": return <><circle cx="10.5" cy="10.5" r="5.5"/><path d="M8 10.5h5M15 15l4 4"/></>;
    case "snap": return <><path d="M5 4v7a4 4 0 0 0 8 0V4M5 8h4M13 8h4"/><path d="M17 5v6"/></>;
    case "chevron-left": return <path d="m15 5-7 7 7 7"/>;
    case "chevron-right": return <path d="m9 5 7 7-7 7"/>;
    case "templates": return <><rect x="4" y="4" width="7" height="7" rx="1.2"/><rect x="13" y="4" width="7" height="7" rx="1.2"/><rect x="4" y="13" width="7" height="7" rx="1.2"/><path d="M13 16.5h7M16.5 13v7"/></>;
    case "comments": return <><path d="M4 5h16v11H9l-5 4V5Z"/><path d="M8 9h8M8 12h6"/></>;
    case "check": return <path d="m5 12 4 4L19 6"/>;
    case "plus": return <path d="M12 5v14M5 12h14"/>;
    case "minus": return <path d="M5 12h14"/>;
    case "presentation-order": return <><path d="M6 5h12M6 10h12M6 15h7"/><path d="m15 15 3 3 3-3M18 12v6"/></>;
    case "fullscreen": return <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></>;
    case "timer": return <><circle cx="12" cy="13" r="7"/><path d="M9 3h6M12 6V3M12 10v4l3 2"/></>;
    case "laser": return <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" opacity=".45"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></>;
    case "spotlight": return <><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="m4.9 4.9 2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></>;
    case "slides": return <><rect x="4" y="5" width="12" height="9" rx="1.5"/><path d="M8 18h12V9M7 18h1"/></>;
    case "play": return <path d="m9 6 9 6-9 6V6Z"/>;
    case "pause": return <><path d="M9 6v12M15 6v12"/></>;
    case "reset": return <><path d="M6 7H3V4"/><path d="M4 7a8 8 0 1 1 1.2 10"/></>;
    case "keyboard": return <><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M6 9h2M10 9h2M14 9h2M18 9h1M6 12h2M10 12h2M14 12h2M18 12h1M7 15h10"/></>;
  }
};

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg className="ui-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {iconBody(name)}
    </svg>
  );
}

function ShapeIcon({ type }: { type: ShapeType }) {
  if (type === "ellipse") return <svg viewBox="0 0 28 22"><ellipse cx="14" cy="11" rx="10" ry="7" /></svg>;
  if (type === "diamond") return <svg viewBox="0 0 28 22"><path d="m14 2 10 9-10 9L4 11 14 2Z" /></svg>;
  if (type === "triangle") return <svg viewBox="0 0 28 22"><path d="m14 3 10 16H4L14 3Z" /></svg>;
  if (type === "hexagon") return <svg viewBox="0 0 28 22"><path d="m8 3 12 0 6 8-6 8H8l-6-8 6-8Z" /></svg>;
  if (type === "star") return <svg viewBox="0 0 28 22"><path d="m14 2 2.7 6 6.5.5-5 4.2 1.5 6.3-5.7-3.4L8.3 19l1.5-6.3-5-4.2 6.5-.5L14 2Z" /></svg>;
  if (type === "arrow") return <svg viewBox="0 0 28 22"><path d="M3 11h18M16 5l6 6-6 6" /></svg>;
  if (type === "rectangle") return <svg viewBox="0 0 28 22"><rect x="4" y="4" width="20" height="14" /></svg>;
  return <svg viewBox="0 0 28 22"><rect x="4" y="4" width="20" height="14" rx="4" /></svg>;
}
function loadInitial(storageKey: string) {
  const empty: DocumentData = {
    version: 1,
    title: "Новая доска",
    view: { x: 0, y: 0, zoom: 1 },
    items: [],
  };
  try {
    const raw = localStorage.getItem(storageKey);
    return { data: raw ? parseDocument(raw) : empty, error: "" };
  } catch {
    return {
      data: empty,
      error: "Не удалось прочитать сохранение. Оно не перезаписано.",
    };
  }
}
function Ink({ item }: { item: Item }) {
  return (
    <svg
      width={item.width}
      height={item.height}
      style={{ overflow: "visible" }}
    >
      <g opacity={item.kind === "marker" ? 0.32 : 1}>
        {item.points?.length === 1 ? (
          <circle
            cx={item.points[0].x}
            cy={item.points[0].y}
            r={(item.weight ?? 3) / 2}
            fill={item.color}
          />
        ) : (
          <polyline
            points={item.points?.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={item.color}
            strokeWidth={item.weight}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
      </g>
    </svg>
  );
}
type Bounds = { x: number; y: number; width: number; height: number };
type GuideState = { x?: number; y?: number };
type ContextMenuState = { x: number; y: number } | null;

type Gesture = {
  dragging?: boolean;
  pointer: number;
  start: Point;
  view: View;
  before: Item[];
  restore?: Item[];
  ids: string[];
  path: Point[];
  mode: "pan" | "drag" | "lasso" | "draw" | "erase" | "resize" | "rotate" | "connector" | "connector-end";
  handle?: string;
  transformItem?: Item;
  transformItems?: Item[];
  transformBounds?: Bounds;
  ink?: { id: string; kind: "pen" | "marker"; color: string; weight: number };
  additive: boolean;
  connectorStartBinding?: ConnectorBinding;
  connectorEndBinding?: ConnectorBinding;
};
const tools: { id: Tool; icon: IconName; label: string; dividerAfter?: boolean }[] = [
  { id: "select", icon: "select", label: "Выделение · V / М" },
  { id: "hand", icon: "hand", label: "Рука · H / Р", dividerAfter: true },
  { id: "lasso", icon: "lasso", label: "Петля · Q / Й" },
  { id: "pen", icon: "pen", label: "Карандаш · P / З" },
  { id: "marker", icon: "marker", label: "Маркер · M / Ь" },
  { id: "eraser", icon: "eraser", label: "Ластик · E / У", dividerAfter: true },
  { id: "connector", icon: "connector", label: "Связь / стрелка · C / С" },
  { id: "frame", icon: "frame", label: "Фрейм / раздел · F / А" },
  { id: "comment", icon: "comment", label: "Комментарий · N / Т", dividerAfter: true },
  { id: "text", icon: "text", label: "Текст · T / Е" },
  { id: "sticky", icon: "sticky", label: "Стикер · S / Ы" },
  { id: "shape", icon: "shape", label: "Фигуры · R / К" },
  { id: "table", icon: "table", label: "Таблица · B / И" },
  { id: "formula", icon: "formula", label: "Формула · X / Ч" },
  { id: "graph", icon: "graph", label: "График функции · Y / Н" },
  { id: "checklist", icon: "checklist", label: "Чек-лист / задание · K / Л" },
  { id: "quiz", icon: "quiz", label: "Вопрос / мини-тест · G / П" },
  { id: "flashcard", icon: "flashcard", label: "Карточка вопрос–ответ · J / О" },
  { id: "cover", icon: "cover", label: "Шторка / открыть ответ · U / Г", dividerAfter: true },
  { id: "media", icon: "media", label: "Фото / PDF · I / Ш" },
  { id: "linkmedia", icon: "linkmedia", label: "Видео / аудио по ссылке · L / Д" },
];
const toolShortLabel: Record<Tool, string> = {
  select:"Выбрать",hand:"Двигать",lasso:"Петля",pen:"Карандаш",marker:"Маркер",eraser:"Ластик",
  connector:"Стрелка",frame:"Фрейм",comment:"Комментарий",text:"Текст",sticky:"Стикер",shape:"Фигуры",
  table:"Таблица",formula:"Формула",graph:"График",checklist:"Чек-лист",quiz:"Тест",flashcard:"Карточка",
  cover:"Шторка",media:"Фото / PDF",linkmedia:"Видео / аудио",
};
const primaryDesktopTools = new Set<Tool>(["select","hand","pen","marker","eraser","connector","text","sticky","shape","media"]);

const keyTools: Record<string, Tool> = {
  KeyV: "select",
  KeyH: "hand",
  KeyQ: "lasso",
  KeyT: "text",
  KeyS: "sticky",
  KeyR: "shape",
  KeyP: "pen",
  KeyM: "marker",
  KeyE: "eraser",
  KeyC: "connector",
  KeyF: "frame",
  KeyN: "comment",
  KeyB: "table",
  KeyX: "formula",
  KeyY: "graph",
  KeyK: "checklist",
  KeyG: "quiz",
  KeyJ: "flashcard",
  KeyU: "cover",
  KeyI: "media",
  KeyL: "linkmedia",
};
const inside = (p: Point, polygon: Point[]) => {
  let hit = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i],
      b = polygon[j];
    if (
      a.y > p.y !== b.y > p.y &&
      p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x
    )
      hit = !hit;
  }
  return hit;
};

const boundsOf = (list: Item[]): Bounds | null => {
  if (!list.length) return null;
  const x = Math.min(...list.map((i) => i.x));
  const y = Math.min(...list.map((i) => i.y));
  const right = Math.max(...list.map((i) => i.x + i.width));
  const bottom = Math.max(...list.map((i) => i.y + i.height));
  return { x, y, width: right - x, height: bottom - y };
};

const containedByFrame = (frame: Item, source: Item[]): Item[] => source.filter((item) => {
  if (item.id === frame.id || item.hidden || item.kind === "frame") return false;
  const cx = item.x + item.width / 2;
  const cy = item.y + item.height / 2;
  return cx >= frame.x && cx <= frame.x + frame.width && cy >= frame.y && cy <= frame.y + frame.height;
});

const deepItem = (item: Item): Item => ({
  ...item,
  points: item.points?.map((p) => ({ ...p })),
  connectorStart: item.connectorStart ? { ...item.connectorStart } : undefined,
  connectorEnd: item.connectorEnd ? { ...item.connectorEnd } : undefined,
  connectorStartBinding: item.connectorStartBinding ? { ...item.connectorStartBinding } : undefined,
  connectorEndBinding: item.connectorEndBinding ? { ...item.connectorEndBinding } : undefined,
  tableCells: item.tableCells ? [...item.tableCells] : undefined,
  checklistItems: item.checklistItems ? [...item.checklistItems] : undefined,
  checklistDone: item.checklistDone ? [...item.checklistDone] : undefined,
  quizOptions: item.quizOptions ? [...item.quizOptions] : undefined,
});

const cloneItems = (source: Item[], offset = 24): Item[] => {
  const groups = new Map<string, string>();
  const ids = new Map(source.map((item) => [item.id, crypto.randomUUID()] as const));
  return source.map((item) => {
    const groupId = item.groupId
      ? groups.get(item.groupId) ?? (() => {
          const id = crypto.randomUUID();
          groups.set(item.groupId!, id);
          return id;
        })()
      : undefined;
    const remapBinding = (binding?: ConnectorBinding) => binding && ids.has(binding.itemId)
      ? { ...binding, itemId: ids.get(binding.itemId)! }
      : undefined;
    return {
      ...deepItem(item),
      id: ids.get(item.id)!,
      x: item.x + offset,
      y: item.y + offset,
      connectorStartBinding: remapBinding(item.connectorStartBinding),
      connectorEndBinding: remapBinding(item.connectorEndBinding),
      commentTargetId: item.commentTargetId && ids.has(item.commentTargetId) ? ids.get(item.commentTargetId) : undefined,
      presentationOrder: item.kind === "frame" ? undefined : item.presentationOrder,
      ...(groupId ? { groupId } : { groupId: undefined }),
      locked: false,
    };
  });
};

const snapDraggedBounds = (
  moving: Bounds,
  others: Item[],
  rawDx: number,
  rawDy: number,
  threshold: number,
): { dx: number; dy: number; guides: GuideState } => {
  let dx = rawDx;
  let dy = rawDy;
  let bestX = threshold + 1;
  let bestY = threshold + 1;
  let guideX: number | undefined;
  let guideY: number | undefined;
  const movingX = [moving.x, moving.x + moving.width / 2, moving.x + moving.width];
  const movingY = [moving.y, moving.y + moving.height / 2, moving.y + moving.height];
  for (const other of others) {
    const targetX = [other.x, other.x + other.width / 2, other.x + other.width];
    const targetY = [other.y, other.y + other.height / 2, other.y + other.height];
    for (const source of movingX) {
      for (const target of targetX) {
        const diff = target - (source + rawDx);
        const distance = Math.abs(diff);
        if (distance <= threshold && distance < bestX) {
          bestX = distance;
          dx = rawDx + diff;
          guideX = target;
        }
      }
    }
    for (const source of movingY) {
      for (const target of targetY) {
        const diff = target - (source + rawDy);
        const distance = Math.abs(diff);
        if (distance <= threshold && distance < bestY) {
          bestY = distance;
          dy = rawDy + diff;
          guideY = target;
        }
      }
    }
  }
  return { dx, dy, guides: { x: guideX, y: guideY } };
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Не удалось прочитать вложение"));
    reader.readAsDataURL(blob);
  });

const resizedRect = (
  base: Bounds,
  handle: string,
  dx: number,
  dy: number,
  minW: number,
  minH: number,
  keepRatio: boolean,
): Bounds => {
  let x = base.x;
  let y = base.y;
  let width = base.width;
  let height = base.height;
  if (handle.includes("e")) width = Math.max(minW, base.width + dx);
  if (handle.includes("s")) height = Math.max(minH, base.height + dy);
  if (handle.includes("w")) {
    width = Math.max(minW, base.width - dx);
    x = base.x + base.width - width;
  }
  if (handle.includes("n")) {
    height = Math.max(minH, base.height - dy);
    y = base.y + base.height - height;
  }
  if (keepRatio && handle.length === 2) {
    const ratio = base.width / Math.max(1, base.height);
    if (Math.abs(width - base.width) >= Math.abs(height - base.height) * ratio)
      height = Math.max(minH, width / ratio);
    else
      width = Math.max(minW, height * ratio);
    if (handle.includes("w")) x = base.x + base.width - width;
    if (handle.includes("n")) y = base.y + base.height - height;
  }
  return { x, y, width, height };
};

const fitItemToRect = (base: Item, rect: Bounds): Item => {
  const sx = rect.width / Math.max(1, base.width);
  const sy = rect.height / Math.max(1, base.height);
  const scaled = { ...base, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  if (base.kind === "connector" && base.connectorStart && base.connectorEnd) {
    return {
      ...scaled,
      connectorStart: { x: base.connectorStart.x * sx, y: base.connectorStart.y * sy },
      connectorEnd: { x: base.connectorEnd.x * sx, y: base.connectorEnd.y * sy },
      weight: Math.max(1, (base.weight ?? 3) * Math.sqrt(Math.abs(sx * sy))),
    };
  }
  if (!base.points) return scaled;
  return {
    ...scaled,
    points: base.points.map((p) => ({ x: p.x * sx, y: p.y * sy })),
    weight: Math.max(0.5, (base.weight ?? 3) * Math.sqrt(Math.abs(sx * sy))),
  };
};

const connectorItemFromPoints = (
  start: Point,
  end: Point,
  connectorStyle: ConnectorStyle,
  color: string,
  weight: number,
  id: string = crypto.randomUUID(),
  connectorRouting: ConnectorRouting = "straight",
  connectorStartBinding?: ConnectorBinding,
  connectorEndBinding?: ConnectorBinding,
  text = "",
): Item => {
  const pad = Math.max(12, weight * 3);
  const x = Math.min(start.x, end.x) - pad;
  const y = Math.min(start.y, end.y) - pad;
  const width = Math.max(24, Math.abs(end.x - start.x) + pad * 2);
  const height = Math.max(24, Math.abs(end.y - start.y) + pad * 2);
  return {
    id,
    kind: "connector",
    x, y, width, height, text,
    color, weight, connectorStyle, connectorRouting,
    connectorStart: { x: start.x - x, y: start.y - y },
    connectorEnd: { x: end.x - x, y: end.y - y },
    ...(connectorStartBinding ? { connectorStartBinding: { ...connectorStartBinding } } : {}),
    ...(connectorEndBinding ? { connectorEndBinding: { ...connectorEndBinding } } : {}),
  };
};

const snappedConnectorEnd = (start: Point, end: Point, snap45: boolean): Point => {
  if (!snap45) return end;
  const dx = end.x - start.x, dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) return end;
  const step = Math.PI / 4;
  const angle = Math.round(Math.atan2(dy, dx) / step) * step;
  return { x: start.x + Math.cos(angle) * distance, y: start.y + Math.sin(angle) * distance };
};

type ConnectorAnchorHit = { point: Point; binding: ConnectorBinding };

const bindingPoint = (binding: ConnectorBinding | undefined, items: Item[]): Point | null => {
  if (!binding) return null;
  const target = items.find((item) => item.id === binding.itemId);
  if (!target) return null;
  return {
    x: target.x + target.width * binding.nx,
    y: target.y + target.height * binding.ny,
  };
};

const connectorAnchor = (point: Point, items: Item[], threshold: number, excludeId?: string): ConnectorAnchorHit | null => {
  let best: ConnectorAnchorHit | null = null;
  let bestDistance = threshold;
  for (const item of items) {
    if (item.id === excludeId || item.hidden || item.kind === "connector" || item.kind === "frame") continue;
    const left = item.x, right = item.x + item.width, top = item.y, bottom = item.y + item.height;
    const insideBounds = point.x >= left && point.x <= right && point.y >= top && point.y <= bottom;
    if (!insideBounds && (point.x < left - threshold || point.x > right + threshold || point.y < top - threshold || point.y > bottom + threshold)) continue;
    const clampX = Math.max(left, Math.min(right, point.x));
    const clampY = Math.max(top, Math.min(bottom, point.y));
    const candidates: ConnectorAnchorHit[] = [
      { point: { x: clampX, y: top }, binding: { itemId: item.id, nx: item.width ? (clampX - left) / item.width : .5, ny: 0 } },
      { point: { x: clampX, y: bottom }, binding: { itemId: item.id, nx: item.width ? (clampX - left) / item.width : .5, ny: 1 } },
      { point: { x: left, y: clampY }, binding: { itemId: item.id, nx: 0, ny: item.height ? (clampY - top) / item.height : .5 } },
      { point: { x: right, y: clampY }, binding: { itemId: item.id, nx: 1, ny: item.height ? (clampY - top) / item.height : .5 } },
    ];
    for (const candidate of candidates) {
      const distance = Math.hypot(point.x - candidate.point.x, point.y - candidate.point.y);
      if ((insideBounds && best == null) || distance <= bestDistance) {
        bestDistance = distance;
        best = candidate;
      }
    }
  }
  return best;
};

const syncBoundConnectors = (source: Item[]): Item[] => {
  const current = source;
  return current.map((item) => {
    if (item.kind !== "connector") return item;
    const startFallback = { x: item.x + (item.connectorStart?.x ?? 0), y: item.y + (item.connectorStart?.y ?? item.height / 2) };
    const endFallback = { x: item.x + (item.connectorEnd?.x ?? item.width), y: item.y + (item.connectorEnd?.y ?? item.height / 2) };
    const boundStart = bindingPoint(item.connectorStartBinding, current);
    const boundEnd = bindingPoint(item.connectorEndBinding, current);
    const start = boundStart ?? startFallback;
    const end = boundEnd ?? endFallback;
    const startBinding = boundStart ? item.connectorStartBinding : undefined;
    const endBinding = boundEnd ? item.connectorEndBinding : undefined;
    const rebuilt = connectorItemFromPoints(
      start,
      end,
      item.connectorStyle ?? "arrow",
      item.color ?? "#5355c9",
      item.weight ?? 3,
      item.id,
      item.connectorRouting ?? "straight",
      startBinding,
      endBinding,
      item.text,
    );
    return { ...rebuilt, groupId: item.groupId, locked: item.locked, hidden: item.hidden, rotation: item.rotation };
  });
};

function Connector({ item }: { item: Item }) {
  const start = item.connectorStart ?? { x: 12, y: item.height / 2 };
  const end = item.connectorEnd ?? { x: item.width - 12, y: item.height / 2 };
  const markerId = `arrow-${item.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const markerStartId = `arrow-start-${item.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const lineColor = item.color ?? "#5355c9";
  return (
    <svg className="connector-svg" width={item.width} height={item.height} viewBox={`0 0 ${item.width} ${item.height}`}>
      <defs>
        <marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
          <path d="M0,0 L8,4 L0,8 z" fill={lineColor} />
        </marker>
        <marker id={markerStartId} markerWidth="8" markerHeight="8" refX="1" refY="4" orient="auto-start-reverse" markerUnits="strokeWidth">
          <path d="M8,0 L0,4 L8,8 z" fill={lineColor} />
        </marker>
      </defs>
      {item.connectorRouting === "elbow" ? (
        <path
          d={`M ${start.x} ${start.y} H ${(start.x + end.x) / 2} V ${end.y} H ${end.x}`}
          fill="none"
          stroke={lineColor}
          strokeWidth={item.weight ?? 3}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerEnd={item.connectorStyle === "line" ? undefined : `url(#${markerId})`}
          markerStart={item.connectorStyle === "double" ? `url(#${markerStartId})` : undefined}
        />
      ) : (
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
          stroke={lineColor}
          strokeWidth={item.weight ?? 3}
          strokeLinecap="round"
          markerEnd={item.connectorStyle === "line" ? undefined : `url(#${markerId})`}
          markerStart={item.connectorStyle === "double" ? `url(#${markerStartId})` : undefined}
        />
      )}
      {item.text.trim() && (
        <g className="connector-label-svg" transform={`translate(${(start.x + end.x) / 2} ${(start.y + end.y) / 2})`}>
          <rect x={-Math.min(90, Math.max(24, item.text.length * 3.8))} y={-11} width={Math.min(180, Math.max(48, item.text.length * 7.6))} height={22} rx={7}/>
          <text x="0" y="4" textAnchor="middle">{item.text.length > 28 ? item.text.slice(0, 27) + "…" : item.text}</text>
        </g>
      )}
    </svg>
  );
}

function Media({ item, boardId }: { item: Item; boardId: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => { let url=""; let alive=true; setSrc(""); if(!item.assetId)return; getAsset(item.assetId, boardId).then(blob=>{if(blob&&alive){url=URL.createObjectURL(blob);setSrc(url)}}).catch(()=>{}); return()=>{alive=false;if(url)URL.revokeObjectURL(url)} },[item.assetId, boardId]);
  if(!src) return <div className="media-missing">Файл недоступен</div>;
  if (item.kind === "image") return <img className="media-image" src={src} alt={item.name??"Изображение"}/>;
  const pdfSrc = `${src}#page=${Math.max(1, item.pdfPage ?? 1)}&view=FitH&toolbar=0&navpanes=0&scrollbar=0`;
  return <object key={`${item.assetId}-${item.pdfPage ?? 1}`} className="media-pdf" data={pdfSrc} type="application/pdf"><div className="media-missing">PDF: {item.name}</div></object>;
}
function Shape({ type = "rounded", color = "#6064d4" }: { type?: ShapeType; color?: string }) {
  if(type==="ellipse") return <div className="shape-fill ellipse" style={{ borderColor: color }}/>;
  if(type==="diamond") return <div className="shape-fill diamond" style={{ borderColor: color }}/>;
  if(type==="triangle") return <div className="shape-fill triangle" style={{ background: color }}/>;
  if(type==="hexagon") return <div className="shape-fill hexagon" style={{ background: color }}/>;
  if(type==="star") return <svg className="shape-vector" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 6 61 36l32 1-25 20 9 31-27-18-27 18 9-31L7 37l32-1L50 6Z" fill={color}/></svg>;
  if(type==="arrow") return <svg className="shape-vector" viewBox="0 0 120 80" aria-hidden="true"><path d="M8 31h66V12l38 28-38 28V49H8V31Z" fill={color}/></svg>;
  return <div className={`shape-fill ${type}`} style={{ borderColor: color }}/>;
}

const FORMULA_SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε", theta: "θ", lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", phi: "φ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Sigma: "Σ", Phi: "Φ", Omega: "Ω",
  times: "×", cdot: "·", div: "÷", pm: "±", mp: "∓", neq: "≠", approx: "≈", le: "≤", ge: "≥", in: "∈", notin: "∉",
  infty: "∞", infinity: "∞", to: "→", rightarrow: "→", leftarrow: "←", leftrightarrow: "↔", implies: "⇒", iff: "⇔",
  sum: "∑", prod: "∏", int: "∫", partial: "∂", nabla: "∇", forall: "∀", exists: "∃", degree: "°", ldots: "…", ellipsis: "…",
  perp: "⟂", parallel: "∥", cup: "∪", cap: "∩", subset: "⊂", supset: "⊃", subseteq: "⊆", supseteq: "⊇", emptyset: "∅",
};
const FORMULA_FUNCTIONS = new Set(["sin", "cos", "tan", "cot", "log", "ln", "lim", "max", "min", "exp", "arcsin", "arccos", "arctan"]);

type FormulaPaletteTab = "basic" | "greek" | "relations" | "functions" | "geometry" | "templates";
type FormulaPaletteItem = { label: string; snippet: string; title?: string };
const FORMULA_PALETTES: Record<FormulaPaletteTab, FormulaPaletteItem[]> = {
  basic: [
    { label: "a⁄b", snippet: "\\frac{⟦a⟧}{b}", title: "Дробь" },
    { label: "√x", snippet: "\\sqrt{⟦x⟧}", title: "Квадратный корень" },
    { label: "ⁿ√x", snippet: "\\sqrt[n]{⟦x⟧}", title: "Корень n-й степени" },
    { label: "x²", snippet: "x^{⟦2⟧}", title: "Степень" },
    { label: "xᵢ", snippet: "x_{⟦i⟧}", title: "Нижний индекс" },
    { label: "±", snippet: "\\pm " }, { label: "×", snippet: "\\times " }, { label: "·", snippet: "\\cdot " },
    { label: "∞", snippet: "\\infty " }, { label: "→", snippet: "\\to " },
    { label: "⃗a", snippet: "\\vec{⟦a⟧}", title: "Вектор" }, { label: "ā", snippet: "\\overline{⟦a⟧}", title: "Черта сверху" }, { label: "|x|", snippet: "\\abs{⟦x⟧}", title: "Модуль" }, { label: "(n k)", snippet: "\\binom{⟦n⟧}{k}", title: "Биномиальный коэффициент" },
  ],
  greek: [
    "alpha","beta","gamma","delta","epsilon","theta","lambda","mu","pi","rho","sigma","phi","omega","Delta","Sigma","Omega",
  ].map((name) => ({ label: FORMULA_SYMBOLS[name], snippet: `\\${name} `, title: `\\${name}` })),
  relations: [
    ["=", " = "], ["≠", " \\neq "], ["≈", " \\approx "], ["≤", " \\le "], ["≥", " \\ge "], ["∈", " \\in "], ["∉", " \\notin "],
    ["⊂", " \\subset "], ["⊆", " \\subseteq "], ["∪", " \\cup "], ["∩", " \\cap "], ["∥", " \\parallel "], ["⟂", " \\perp "],
    ["⇒", " \\implies "], ["⇔", " \\iff "], ["↔", " \\leftrightarrow "],
  ].map(([label, snippet]) => ({ label, snippet })),
  functions: [
    { label: "sin", snippet: "\\sin(⟦x⟧)" }, { label: "cos", snippet: "\\cos(⟦x⟧)" }, { label: "tan", snippet: "\\tan(⟦x⟧)" },
    { label: "ln", snippet: "\\ln(⟦x⟧)" }, { label: "log", snippet: "\\log_{a}(⟦x⟧)" },
    { label: "Σ", snippet: "\\sum_{i=1}^{n} ⟦a_i⟧" }, { label: "∫", snippet: "\\int_{a}^{b} ⟦f(x)⟧ \\, dx" },
    { label: "lim", snippet: "\\lim_{x\\to a} ⟦f(x)⟧" }, { label: "d/dx", snippet: "\\frac{d}{dx}⟦f(x)⟧" }, { label: "∂", snippet: "\\frac{\\partial ⟦f⟧}{\\partial x}" },
  ],
  geometry: [
    { label: "∠", snippet: "\\angle " }, { label: "△", snippet: "\\triangle " }, { label: "°", snippet: "^{\\circ}" },
    { label: "∥", snippet: "\\parallel " }, { label: "⟂", snippet: "\\perp " },
    { label: "AB⃗", snippet: "\\vec{⟦AB⟧}" }, { label: "|AB|", snippet: "\\abs{⟦AB⟧}" },
    { label: "AB̅", snippet: "\\overline{⟦AB⟧}" }, { label: "πr²", snippet: "S = \\pi r^2" },
  ],
  templates: [
    { label: "Пифагор", snippet: "a^2 + b^2 = c^2" },
    { label: "Квадратное", snippet: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}" },
    { label: "Окружность", snippet: "(x-a)^2 + (y-b)^2 = r^2" },
    { label: "Ньютон", snippet: "F = ma" },
    { label: "Эйнштейн", snippet: "E = mc^2" },
    { label: "Производная", snippet: "f'(x) = \\lim_{h\\to 0} \\frac{f(x+h)-f(x)}{h}" },
    { label: "Интеграл", snippet: "\\int_{a}^{b} f(x) \\, dx" },
    { label: "Сумма", snippet: "\\sum_{i=1}^{n} a_i" },
  ],
};

function formulaSyntaxIssue(text: string) {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\\") { while (i + 1 < text.length && /[A-Za-z]/.test(text[i + 1])) i++; continue; }
    if (ch === "{") depth++;
    if (ch === "}") { depth--; if (depth < 0) return "Лишняя закрывающая фигурная скобка"; }
  }
  return depth ? `Не закрыто фигурных скобок: ${depth}` : "";
}

function formulaToPlainText(text: string) {
  let value = text;
  for (let pass = 0; pass < 5; pass++) {
    value = value.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
    value = value.replace(/\\sqrt(?:\[([^\]]+)\])?\{([^{}]*)\}/g, (_, index, body) => `${index ? index : ""}√(${body})`);
    value = value.replace(/\\(?:vec|overline|text)\{([^{}]*)\}/g, "$1");
  }
  value = value.replace(/\\([A-Za-z]+)/g, (_, name) => FORMULA_SYMBOLS[name] ?? (FORMULA_FUNCTIONS.has(name) ? name : `\\${name}`));
  return value.replace(/[{}]/g, "").replace(/\\,/g, " ").replace(/\\quad/g, "  ");
}

function FormulaView({ text, fontSize = 28, color = "#20242c" }: { text: string; fontSize?: number; color?: string }) {
  const source = text || "Формула";
  let cursor = 0;
  let keyIndex = 0;
  const key = (prefix = "f") => `${prefix}-${keyIndex++}`;

  function parseSequence(stop?: string): any[] {
    const nodes: any[] = [];
    while (cursor < source.length && (!stop || source[cursor] !== stop)) nodes.push(parseAtom());
    if (stop && source[cursor] === stop) cursor++;
    return nodes;
  }
  function parseGroup(): any[] {
    if (source[cursor] !== "{") return [parseBase()];
    cursor++;
    return parseSequence("}");
  }
  function parseBracket(): any[] | null {
    if (source[cursor] !== "[") return null;
    cursor++;
    return parseSequence("]");
  }
  function parseCommand(): any {
    cursor++;
    let name = "";
    while (cursor < source.length && /[A-Za-z]/.test(source[cursor])) name += source[cursor++];
    if (!name && cursor < source.length) name = source[cursor++];
    if (name === "frac") {
      const numerator = parseGroup(), denominator = parseGroup();
      return <span key={key("frac")} className="formula-frac"><span className="formula-frac-num">{numerator}</span><span className="formula-frac-den">{denominator}</span></span>;
    }
    if (name === "sqrt") {
      const index = parseBracket(), body = parseGroup();
      return <span key={key("root")} className="formula-root">{index && <span className="formula-root-index">{index}</span>}<span className="formula-root-sign">√</span><span className="formula-root-body">{body}</span></span>;
    }
    if (name === "text") return <span key={key("text")} className="formula-upright">{parseGroup()}</span>;
    if (name === "vec") return <span key={key("vec")} className="formula-vector">{parseGroup()}</span>;
    if (name === "overline") return <span key={key("bar")} className="formula-overline">{parseGroup()}</span>;
    if (name === "abs") return <span key={key("abs")} className="formula-absolute">|{parseGroup()}|</span>;
    if (name === "binom") { const top = parseGroup(), bottom = parseGroup(); return <span key={key("binom")} className="formula-binom"><span>(</span><span className="formula-binom-stack"><span>{top}</span><span>{bottom}</span></span><span>)</span></span>; }
    if (name === "left" || name === "right") return "";
    if (name === ",") return <span key={key("space")} className="formula-thin-space" />;
    if (name === ";") return <span key={key("space")} className="formula-med-space" />;
    if (name === "quad") return <span key={key("space")} className="formula-quad-space" />;
    if (FORMULA_FUNCTIONS.has(name)) return <span key={key("fn")} className="formula-upright formula-function">{name}</span>;
    if (FORMULA_SYMBOLS[name]) return <span key={key("sym")}>{FORMULA_SYMBOLS[name]}</span>;
    return <span key={key("unknown")} className="formula-unknown">{`\\${name}`}</span>;
  }
  function parseBase(): any {
    if (cursor >= source.length) return "";
    const ch = source[cursor];
    if (ch === "{") { cursor++; return <span key={key("group")} className="formula-group">{parseSequence("}")}</span>; }
    if (ch === "\\") return parseCommand();
    cursor++;
    if (ch === "\n") return <br key={key("br")} />;
    return ch;
  }
  function parseScript(): any[] {
    if (source[cursor] === "{") return parseGroup();
    return [parseBase()];
  }
  function parseAtom(): any {
    const base = parseBase();
    let sup: any[] | null = null, sub: any[] | null = null;
    while (cursor < source.length && (source[cursor] === "^" || source[cursor] === "_")) {
      const marker = source[cursor++];
      const content = parseScript();
      if (marker === "^") sup = content; else sub = content;
    }
    if (!sup && !sub) return <span key={key("atom")} className="formula-atom">{base}</span>;
    return <span key={key("scripted")} className="formula-scripted"><span className="formula-base">{base}</span><span className="formula-script-stack">{sup && <sup>{sup}</sup>}{sub && <sub>{sub}</sub>}</span></span>;
  }

  return <div className="formula-view" style={{ fontSize, color }}>{parseSequence()}</div>;
}

function GraphView({ item, onPointMove, onAddPoint }: { item: Item; onPointMove?: (index:number,x:number,y:number)=>void; onAddPoint?: (x:number,y:number)=>void }) {
  const type=item.graphType ?? "quadratic", A=item.graphA ?? 1, B=item.graphB ?? 0, C=item.graphC ?? 0;
  const xMin=item.graphXMin ?? -10, xMax=item.graphXMax ?? 10, yMin=item.graphYMin ?? -10, yMax=item.graphYMax ?? 10;
  const W=600,H=360, sx=(x:number)=>(x-xMin)/(xMax-xMin)*W, sy=(y:number)=>H-(y-yMin)/(yMax-yMin)*H, ux=(px:number)=>xMin+px/W*(xMax-xMin), uy=(py:number)=>yMax-py/H*(yMax-yMin);
  const f=(x:number)=>type==="linear"?A*x+B:type==="quadratic"?A*x*x+B*x+C:type==="sin"?A*Math.sin(B*x+C):A*Math.cos(B*x+C);
  const pts=Array.from({length:241},(_,i)=>{const x=xMin+(xMax-xMin)*i/240;return [sx(x),sy(f(x))] as const}).filter(p=>Number.isFinite(p[1])&&p[1]>-H*3&&p[1]<H*4);
  const path=pts.map((p,i)=>(i?"L":"M")+p[0].toFixed(1)+" "+p[1].toFixed(1)).join(" ");
  const gp=item.graphPoints??[];
  const extend=(pa:{x:number;y:number},pb:{x:number;y:number},kind:"segment"|"line"|"ray")=>{let ax=sx(pa.x),ay=sy(pa.y),bx=sx(pb.x),by=sy(pb.y);if(kind==="segment")return {ax,ay,bx,by};const dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,L=1400;if(kind==="ray")return {ax,ay,bx:bx+ux*L,by:by+uy*L};return {ax:ax-ux*L,ay:ay-uy*L,bx:bx+ux*L,by:by+uy*L}};
  const angleDeg=(p1:{x:number;y:number},v:{x:number;y:number},p2:{x:number;y:number})=>{const a1=Math.atan2(p1.y-v.y,p1.x-v.x),a2=Math.atan2(p2.y-v.y,p2.x-v.x);let d=Math.abs((a2-a1)*180/Math.PI)%360;return d>180?360-d:d};
  const step=Math.max(.1,item.graphGridStep??1);
  const gridValues=(min:number,max:number)=>{const first=Math.ceil(min/step)*step,count=Math.min(101,Math.max(0,Math.floor((max-first)/step)+1));return Array.from({length:count},(_,i)=>Number((first+i*step).toFixed(6)))};
  const gridX=gridValues(xMin,xMax),gridY=gridValues(yMin,yMax);
  const label=type==="linear"?`y = ${A}x ${B>=0?"+ ":"- "}${Math.abs(B)}`:type==="quadratic"?`y = ${A}x² ${B>=0?"+ ":"- "}${Math.abs(B)}x ${C>=0?"+ ":"- "}${Math.abs(C)}`:type==="sin"?`y = ${A}·sin(${B}x ${C>=0?"+ ":"- "}${Math.abs(C)})`:`y = ${A}·cos(${B}x ${C>=0?"+ ":"- "}${Math.abs(C)})`;
  const pointerCoord=(e: React.MouseEvent<SVGSVGElement>)=>{const r=e.currentTarget.getBoundingClientRect();let x=ux((e.clientX-r.left)/r.width*W),y=uy((e.clientY-r.top)/r.height*H);if(item.graphSnap!==false){const st=Math.max(.1,item.graphGridStep??1);x=Math.round(x/st)*st;y=Math.round(y/st)*st}return {x:Number(x.toFixed(6)),y:Number(y.toFixed(6))}};
  return <div className={`graph-view ${onPointMove?"graph-interactive":""}`}><div className="graph-label">{label}</div><svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onDoubleClick={(e)=>{if(onAddPoint){e.stopPropagation();const p=pointerCoord(e);onAddPoint(p.x,p.y)}}}>{item.graphGrid!==false&&<g className="graph-grid">{gridX.map(x=><line key={"x"+x} x1={sx(x)} x2={sx(x)} y1="0" y2={H}/>)}{gridY.map(y=><line key={"y"+y} x1="0" x2={W} y1={sy(y)} y2={sy(y)}/>)}</g>}<g className="graph-axes">{xMin<=0&&xMax>=0&&<line x1={sx(0)} x2={sx(0)} y1="0" y2={H}/>} {yMin<=0&&yMax>=0&&<line x1="0" x2={W} y1={sy(0)} y2={sy(0)}/>}</g>{item.graphAxisLabels!==false&&<g className="graph-axis-labels">{gridX.filter(x=>x!==0).map(x=><text key={"xl"+x} x={sx(x)+2} y={Math.min(H-4,Math.max(12,sy(0)+14))}>{x}</text>)}{gridY.filter(y=>y!==0).map(y=><text key={"yl"+y} x={Math.min(W-22,Math.max(3,sx(0)+5))} y={sy(y)-3}>{y}</text>)}</g>}{item.graphShowCurve!==false&&<path className="graph-curve" d={path}/>}{item.graphProjections===true&&<g className="graph-projections">{gp.map((p,i)=><g key={"proj"+i}>{xMin<=0&&xMax>=0&&<line x1={sx(p.x)} x2={sx(0)} y1={sy(p.y)} y2={sy(p.y)}/>} {yMin<=0&&yMax>=0&&<line x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y)} y2={sy(0)}/>}</g>)}</g>}<g className="graph-geometry">{(item.graphSegments??[]).map((s,i)=>{const pa=gp[s.a],pb=gp[s.b];if(!pa||!pb||s.a===s.b)return null;const e=extend(pa,pb,s.kind),mx=(sx(pa.x)+sx(pb.x))/2,my=(sy(pa.y)+sy(pb.y))/2,dist=Math.hypot(pb.x-pa.x,pb.y-pa.y);return <g key={"seg"+i}><line x1={e.ax} y1={e.ay} x2={e.bx} y2={e.by}/>{(s.label||s.measure)&&<text x={mx+7} y={my-7}>{s.label}{s.label&&s.measure?" · ":""}{s.measure?dist.toFixed(2):""}</text>}</g>})}{(item.graphAngles??[]).map((g,i)=>{const p1=gp[g.a],v=gp[g.vertex],p2=gp[g.b];if(!p1||!v||!p2)return null;const deg=angleDeg(p1,v,p2);return <text className="graph-angle-label" key={"ang"+i} x={sx(v.x)+12} y={sy(v.y)+20}>{g.label?g.label+" · ":""}{deg.toFixed(1)}°</text>})}{(item.graphCircles??[]).map((g,i)=>{const c=gp[g.center],e=gp[g.edge];if(!c||!e||g.center===g.edge)return null;const r=Math.hypot(e.x-c.x,e.y-c.y),rx=Math.abs(sx(c.x+r)-sx(c.x)),ry=Math.abs(sy(c.y+r)-sy(c.y));return <g className="graph-circle" key={"cir"+i}><ellipse cx={sx(c.x)} cy={sy(c.y)} rx={rx} ry={ry}/>{(g.label||g.measure)&&<text x={sx(c.x)+rx+6} y={sy(c.y)}>{g.label}{g.label&&g.measure?" · ":""}{g.measure?`r=${r.toFixed(2)}`:""}</text>}</g>})}{(item.graphPolygons??[]).map((g,i)=>{const pp=g.points.map(n=>gp[n]).filter(Boolean);if(pp.length<3)return null;const xy=pp.map(p=>`${sx(p.x)},${sy(p.y)}`).join(" ");const per=pp.reduce((sum,p,j)=>{const q=pp[(j+1)%pp.length];return sum+Math.hypot(q.x-p.x,q.y-p.y)},0);const area=Math.abs(pp.reduce((sum,p,j)=>{const q=pp[(j+1)%pp.length];return sum+p.x*q.y-q.x*p.y},0))/2;const cxp=pp.reduce((s,p)=>s+sx(p.x),0)/pp.length,cyp=pp.reduce((s,p)=>s+sy(p.y),0)/pp.length;return <g className="graph-polygon" key={"poly"+i}><polygon points={xy}/>{(g.label||g.measure)&&<text x={cxp+7} y={cyp-7}>{g.label}{g.label&&g.measure?" · ":""}{g.measure?`P=${per.toFixed(2)} · S=${area.toFixed(2)}`:""}</text>}</g>})}{(item.graphMidpoints??[]).map((g,i)=>{const p=gp[g.a],q=gp[g.b];if(!p||!q)return null;const x=(p.x+q.x)/2,y=(p.y+q.y)/2;return <g className="graph-midpoint" key={"mid"+i}><circle cx={sx(x)} cy={sy(y)} r="4"/><text x={sx(x)+7} y={sy(y)-7}>{g.label||"M"} ({x.toFixed(1)}; {y.toFixed(1)})</text></g>})}</g>{(item.graphPoints??[]).map((p,i)=>{const px=sx(p.x),py=sy(p.y);if(px<0||px>W||py<0||py>H)return null;return <g className={`graph-point ${onPointMove?"draggable":""}`} key={i} onPointerDown={onPointMove?(e)=>{e.stopPropagation();const svg=e.currentTarget.ownerSVGElement;if(!svg)return;const move=(ev:PointerEvent)=>{const r=svg.getBoundingClientRect();let x=ux((ev.clientX-r.left)/r.width*W),y=uy((ev.clientY-r.top)/r.height*H);if(item.graphSnap!==false){const st=Math.max(.1,item.graphGridStep??1);x=Math.round(x/st)*st;y=Math.round(y/st)*st}onPointMove(i,Number(x.toFixed(6)),Number(y.toFixed(6)))};const up=()=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up)};window.addEventListener("pointermove",move);window.addEventListener("pointerup",up)}:undefined}><circle cx={px} cy={py} r={onPointMove?"7":"5"}/>{item.graphShowLabels!==false&&<text x={px+8} y={py-8}>{p.label||`(${p.x}; ${p.y})`}</text>}</g>})}</svg></div>;
}

function TableView({ item }: { item: Item }) {
  const rows = Math.max(1, item.tableRows ?? 3);
  const cols = Math.max(1, item.tableCols ?? 3);
  const cells = item.tableCells ?? [];
  const header = item.tableHeader !== false;
  return (
    <div className={`table-view ${item.tableStripe ? "table-striped" : ""} ${item.tableCompact ? "table-compact" : ""}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, fontSize: item.fontSize ?? 13, textAlign: item.tableAlign ?? "left" }}>
      {Array.from({ length: rows * cols }, (_, index) => (
        <div key={index} className={`table-cell ${header && index < cols ? "table-cell-header" : ""} ${item.tableStripe && Math.floor(index / cols) % 2 === 1 ? "table-cell-striped" : ""}`}><span>{cells[index] ?? ""}</span></div>
      ))}
    </div>
  );
}

function ChecklistView({ item, onToggle }: { item: Item; onToggle?: (index: number) => void }) {
  const entries = item.checklistItems?.length ? item.checklistItems : ["Новый пункт"];
  const done = item.checklistDone ?? entries.map(() => false);
  const completed = entries.filter((_, index) => done[index]).length;
  const accent = item.color ?? "#5355c9";
  return (
    <div className="checklist-view" style={{ fontSize: item.fontSize ?? 15 }}>
      <div className="checklist-title"><strong>{item.text.trim() || "Чек-лист"}</strong><span style={{ color: accent, backgroundColor: `${accent}16` }}>{completed}/{entries.length}</span></div>
      <div className="checklist-rows">
        {entries.map((entry, index) => (
          <div key={index} className={`checklist-row ${done[index] ? "done" : ""}`}>
            <button
              type="button"
              className="checklist-box"
              disabled={!onToggle || item.locked}
              style={{ borderColor: accent, backgroundColor: done[index] ? accent : "#fff" }}
              onPointerDown={(e) => { if (onToggle) e.stopPropagation(); }}
              onClick={(e) => { if (!onToggle) return; e.stopPropagation(); onToggle(index); }}
              aria-label={done[index] ? `Снять отметку: ${entry || `Пункт ${index + 1}`}` : `Отметить выполненным: ${entry || `Пункт ${index + 1}`}`}
            >{done[index] ? "✓" : ""}</button>
            <span>{entry || "Пустой пункт"}</span>
          </div>
        ))}
      </div>
      <div className="checklist-progress"><i style={{ width: `${entries.length ? completed / entries.length * 100 : 0}%`, backgroundColor: accent }} /></div>
    </div>
  );
}

function QuizView({ item, onSelect }: { item: Item; onSelect?: (index: number) => void }) {
  const options = item.quizOptions?.length ? item.quizOptions : ["Вариант 1", "Вариант 2"];
  const correct = Math.max(0, Math.min(options.length - 1, item.quizCorrect ?? 0));
  const selected = item.quizSelected;
  const revealed = item.quizRevealed === true;
  const accent = item.color ?? "#5355c9";
  return (
    <div className={`quiz-view ${revealed ? "revealed" : ""}`} style={{ fontSize: item.fontSize ?? 15 }}>
      <div className="quiz-question-row">
        <span className="quiz-mark" style={{ color: accent, backgroundColor: `${accent}16` }}>?</span>
        <strong>{item.text.trim() || "Вопрос"}</strong>
      </div>
      <div className="quiz-options">
        {options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = revealed && index === correct;
          const isWrong = revealed && isSelected && index !== correct;
          return (
            <button
              type="button"
              key={index}
              className={`quiz-option ${isSelected ? "selected" : ""} ${isCorrect ? "correct" : ""} ${isWrong ? "wrong" : ""}`}
              disabled={!onSelect || item.locked}
              onPointerDown={(e) => { if (onSelect) e.stopPropagation(); }}
              onClick={(e) => { if (!onSelect) return; e.stopPropagation(); onSelect(index); }}
              style={!revealed && isSelected ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}18` } : undefined}
            >
              <span>{String.fromCharCode(65 + index)}</span>
              <b>{option || `Вариант ${index + 1}`}</b>
              {isCorrect && <i>✓</i>}
              {isWrong && <i>×</i>}
            </button>
          );
        })}
      </div>
      <div className="quiz-footer">
        <span>{selected == null ? "Ответ ещё не выбран" : revealed ? (selected === correct ? "Верно" : "Есть ошибка") : `Выбран ответ ${String.fromCharCode(65 + selected)}`}</span>
        {revealed && item.quizExplanation?.trim() && <em>{item.quizExplanation}</em>}
      </div>
    </div>
  );
}

function FlashcardView({ item, onFlip }: { item: Item; onFlip?: () => void }) {
  const flipped = item.flashcardFlipped === true;
  const accent = item.color ?? "#5355c9";
  const content = flipped ? (item.flashcardBack?.trim() || "Ответ") : (item.text.trim() || "Вопрос");
  return (
    <div className={`flashcard-view ${flipped ? "flipped" : ""}`} style={{ fontSize: item.fontSize ?? 18, borderColor: `${accent}55` }}>
      <div className="flashcard-side-label" style={{ color: accent, backgroundColor: `${accent}12` }}>{flipped ? "Ответ" : "Вопрос"}</div>
      <div className="flashcard-content">{content}</div>
      <button className="flashcard-flip-button" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onFlip?.(); }} style={{ color: accent }} title={flipped ? "Показать вопрос" : "Показать ответ"}>
        <Icon name="flip" size={14}/><span>{flipped ? "Вопрос" : "Ответ"}</span>
      </button>
    </div>
  );
}

function CoverView({ item, onToggle }: { item: Item; onToggle?: () => void }) {
  const open = item.coverOpen === true;
  const accent = item.color ?? "#5355c9";
  return (
    <div className={`cover-view ${open ? "open" : "closed"}`} style={{ borderColor: accent, background: open ? `${accent}10` : accent, fontSize: item.fontSize ?? 17 }}>
      <div className="cover-view-inner">
        <Icon name={open ? "eye-off" : "eye"} size={18} />
        <strong>{open ? "Ответ открыт" : (item.text.trim() || "Открыть ответ")}</strong>
        {open && <span>{item.text.trim() || "Нажмите, чтобы снова закрыть"}</span>}
      </div>
      <button type="button" className="cover-toggle" disabled={!onToggle || item.locked} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onToggle?.(); }} title={open ? "Закрыть шторку" : "Открыть шторку"}>
        <Icon name={open ? "eye-off" : "eye"} size={14}/><span>{open ? "Закрыть" : "Открыть"}</span>
      </button>
    </div>
  );
}

function CommentCard({ item }: { item: Item }) {
  return (
    <div className={`comment-card ${item.resolved ? "resolved" : ""}`} style={{ background: item.color ?? "#fff8d6" }}>
      <div className="comment-card-head"><span className="comment-dot" /><strong>{item.resolved ? "Решено" : "Комментарий"}</strong></div>
      <div className="comment-card-text">{item.text || <span>Двойной щелчок — написать комментарий</span>}</div>
      {item.commentTargetId && <div className="comment-attached">Привязан к объекту</div>}
    </div>
  );
}

const itemLabel = (item: Item) => {
  if (item.kind === "image") return item.name || "Изображение";
  if (item.kind === "pdf") return item.name || "PDF";
  if (item.kind === "linkmedia") return item.mediaTitle || "Мультимедиа";
  if (item.kind === "pen") return "Карандаш";
  if (item.kind === "marker") return "Маркер";
  if (item.kind === "connector") return item.text.trim() || (item.connectorStyle === "line" ? "Линия" : item.connectorStyle === "double" ? "Двусторонняя стрелка" : "Стрелка");
  if (item.kind === "frame") return item.text.trim() || "Фрейм";
  if (item.kind === "comment") return item.text.trim().replace(/\s+/g, " ").slice(0, 44) || "Комментарий";
  if (item.kind === "table") return `Таблица ${item.tableRows ?? 3}×${item.tableCols ?? 3}`;
  if (item.kind === "formula") return item.text.trim().replace(/\s+/g, " ").slice(0, 44) || "Формула";
  if (item.kind === "graph") return "График функции";
  if (item.kind === "checklist") return item.text.trim().replace(/\s+/g, " ").slice(0, 44) || "Чек-лист";
  if (item.kind === "quiz") return item.text.trim().replace(/\s+/g, " ").slice(0, 44) || "Вопрос";
  if (item.kind === "flashcard") return item.text.trim().replace(/\s+/g, " ").slice(0, 44) || "Карточка";
  if (item.kind === "cover") return item.text.trim().replace(/\s+/g, " ").slice(0, 44) || "Шторка";
  if (item.kind === "shape") return `Фигура · ${item.shapeType ?? "rounded"}`;
  const text = item.text.trim().replace(/\s+/g, " ");
  return text ? text.slice(0, 44) : item.kind === "sticky" ? "Стикер" : "Текст";
};

const itemKindLabel = (item: Item) => {
  if (item.kind === "frame") return "Фрейм / раздел";
  if (item.kind === "comment") return item.resolved ? "Комментарий · решён" : "Комментарий";
  if (item.kind === "table") return "Таблица";
  if (item.kind === "formula") return "Формула";
  if (item.kind === "graph") return "График функции";
  if (item.kind === "checklist") return "Чек-лист / задание";
  if (item.kind === "quiz") return "Вопрос / мини-тест";
  if (item.kind === "flashcard") return item.flashcardFlipped ? "Карточка · ответ" : "Карточка · вопрос";
  if (item.kind === "cover") return item.coverOpen ? "Шторка · открыта" : "Шторка · закрыта";
  if (item.kind === "sticky") return "Стикер";
  if (item.kind === "text") return "Текст";
  if (item.kind === "shape") return "Фигура";
  if (item.kind === "connector") return "Связь";
  if (item.kind === "image") return "Изображение";
  if (item.kind === "pdf") return "PDF";
  if (item.kind === "linkmedia") return "Видео / аудио по ссылке";
  if (item.kind === "pen") return "Карандаш";
  return "Маркер";
};

const itemIconName = (item: Item): IconName => {
  if (item.kind === "image" || item.kind === "pdf") return "media";
  if (item.kind === "linkmedia") return "linkmedia";
  if (item.kind === "connector") return "connector";
  if (item.kind === "frame") return "frame";
  if (item.kind === "comment") return "comment";
  if (item.kind === "table") return "table";
  if (item.kind === "formula") return "formula";
  if (item.kind === "graph") return "graph";
  if (item.kind === "checklist") return "checklist";
  if (item.kind === "quiz") return "quiz";
  if (item.kind === "flashcard") return "flashcard";
  if (item.kind === "cover") return "cover";
  if (item.kind === "sticky") return "sticky";
  if (item.kind === "text") return "text";
  if (item.kind === "shape") return "shape";
  if (item.kind === "pen") return "pen";
  return "marker";
};

function BoardApp({ authUser, boardSummary, onBackToBoards, onLogout, onBoardChanged, initialRemoteVersion = null }: {
  authUser: AuthUser;
  boardSummary: BoardSummary;
  onBackToBoards: () => void;
  onLogout: () => void;
  onBoardChanged: (board: BoardSummary) => void;
  initialRemoteVersion?: number | null;
}) {
  const canEdit = boardSummary.role !== "viewer";
  const publicPresentation = !canEdit && new URLSearchParams(window.location.search).get("present")==="1";
  const [sharing, setSharing] = useState(false);
  const [historyOpen,setHistoryOpen]=useState(false);
  const [historyRows,setHistoryRows]=useState<BoardHistoryEntry[]>([]);
  const [historyBusy,setHistoryBusy]=useState(false);
  const [historyError,setHistoryError]=useState("");
  const [discussionOpen,setDiscussionOpen]=useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const [chatUnread,setChatUnread]=useState(0);
  const [discussionRows,setDiscussionRows]=useState<BoardCommentThread[]>([]);
  const [discussionBusy,setDiscussionBusy]=useState(false);
  const [discussionError,setDiscussionError]=useState("");
  const [discussionDraft,setDiscussionDraft]=useState("");
  const [discussionReplyTo,setDiscussionReplyTo]=useState<string|null>(null);
  const [discussionParticipants,setDiscussionParticipants]=useState<BoardCommentParticipant[]>([]);
  const [discussionFocusId,setDiscussionFocusId]=useState<string|null>(()=>new URLSearchParams(window.location.search).get("discussion"));
  const [liveLesson,setLiveLesson]=useState<LiveLesson|null>(null);
  const [lessonOpen,setLessonOpen]=useState(false),[lessonFinishOpen,setLessonFinishOpen]=useState(false);
  const [lessonStudentId,setLessonStudentId]=useState(""),[lessonTopic,setLessonTopic]=useState("");
  const [lessonScheduleId,setLessonScheduleId]=useState<string|null>(null);
  const [lessonResult,setLessonResult]=useState(""),[lessonHomework,setLessonHomework]=useState(""),[lessonClock,setLessonClock]=useState(Date.now());
  const [lessonPanelOpen,setLessonPanelOpen]=useState(false);
  const [presenceUsers, setPresenceUsers] = useState<BoardPresenceUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, RemoteCursor>>({});
  const cursorChannel = useRef<BoardCursorChannel | null>(null);
  const viewControlChannel = useRef<BoardViewControlChannel | null>(null);
  const [followTeacher, setFollowTeacher] = useState(false);
  const followTeacherRef = useRef(false);
  const [guidedFollow, setGuidedFollow] = useState(false);
  const guidedFollowRef = useRef(false);
  const teacherViewBroadcastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [remoteWork, setRemoteWork] = useState<Record<string, RemoteWorkState>>({});
  const workChannel = useRef<BoardWorkChannel | null>(null);
  const board = useRef<HTMLElement>(null);
  const storageKey = boardStorageKey(boardSummary.id);
  const [initial] = useState(() => loadInitial(storageKey));
  const [saveBlocked, setSaveBlocked] = useState(!!initial.error);
  const fileInput = useRef<HTMLInputElement>(null);
  const mediaInput = useRef<HTMLInputElement>(null);
  const [linkMediaOpen,setLinkMediaOpen]=useState(false);
  const [linkMediaUrl,setLinkMediaUrl]=useState("");
  const [linkMediaTitle,setLinkMediaTitle]=useState("");
  const [linkMediaEditId,setLinkMediaEditId]=useState<string|null>(null);
  const [shapeType, setShapeType] = useState<ShapeType>("rounded");
  const [connectorStyle, setConnectorStyle] = useState<ConnectorStyle>("arrow");
  const [connectorWeight, setConnectorWeight] = useState(3);
  const [connectorRouting, setConnectorRouting] = useState<ConnectorRouting>("straight");
  const [notice, setNotice] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [tableEditorId, setTableEditorId] = useState<string | null>(null);
  const [tableDraft, setTableDraft] = useState<{ rows: number; cols: number; cells: string[]; header: boolean; fontSize: number; align: "left" | "center" | "right"; stripe: boolean; compact: boolean } | null>(null);
  const [checklistEditorId, setChecklistEditorId] = useState<string | null>(null);
  const [checklistDraft, setChecklistDraft] = useState<{ title: string; items: string[]; done: boolean[]; fontSize: number; color: string } | null>(null);
  const [quizEditorId, setQuizEditorId] = useState<string | null>(null);
  const [quizDraft, setQuizDraft] = useState<{ question: string; options: string[]; correct: number; explanation: string; fontSize: number; color: string } | null>(null);
  const [flashcardEditorId, setFlashcardEditorId] = useState<string | null>(null);
  const [flashcardDraft, setFlashcardDraft] = useState<{ front: string; back: string; fontSize: number; color: string } | null>(null);
  const [studyOpen, setStudyOpen] = useState(false);
  const [studyTab, setStudyTab] = useState<"quiz"|"flashcards">("quiz");
  const [studyCardIndex, setStudyCardIndex] = useState(0);
  const [graphEditorId, setGraphEditorId] = useState<string | null>(null);
  const [graphDraft, setGraphDraft] = useState<{type:"linear"|"quadratic"|"sin"|"cos";a:number;b:number;c:number;xMin:number;xMax:number;yMin:number;yMax:number;grid:boolean;points:{x:number;y:number;label:string}[];showLabels:boolean;snap:boolean;axisLabels:boolean;gridStep:number;showCurve:boolean;projections:boolean;segments:{a:number;b:number;kind:"segment"|"line"|"ray";label:string;measure:boolean}[];angles:{a:number;vertex:number;b:number;label:string}[];circles:{center:number;edge:number;label:string;measure:boolean}[];polygons:{points:number[];label:string;measure:boolean}[];midpoints:{a:number;b:number;label:string}[]}|null>(null);
  const [formulaEditorId, setFormulaEditorId] = useState<string | null>(null);
  const [formulaDraft, setFormulaDraft] = useState<{ text: string; fontSize: number; color: string } | null>(null);
  const [formulaPaletteTab, setFormulaPaletteTab] = useState<FormulaPaletteTab>("basic");
  const [formulaHistory, setFormulaHistory] = useState<string[]>(() => { try { const v=JSON.parse(localStorage.getItem("onlinerepetitor.formula-history.v54")||"[]"); return Array.isArray(v)?v.slice(0,12):[] } catch { return [] } });
  const formulaInput = useRef<HTMLTextAreaElement>(null);
  const [frameNotesEditorId, setFrameNotesEditorId] = useState<string | null>(null);
  const [frameNotesDraft, setFrameNotesDraft] = useState("");
  const [presentationNotesOpen, setPresentationNotesOpen] = useState(false);
  const [presentation, setPresentation] = useState(() => new URLSearchParams(window.location.search).get("present")==="1");
  const [presentationFrameIndex, setPresentationFrameIndex] = useState(0);
  const [presentationSlidesOpen, setPresentationSlidesOpen] = useState(false);
  const [presentationLaser, setPresentationLaser] = useState(false);
  const [presentationLaserPos, setPresentationLaserPos] = useState<Point | null>(null);
  const [presentationSpotlight, setPresentationSpotlight] = useState(false);
  const [presentationSpotlightPos, setPresentationSpotlightPos] = useState<Point | null>(null);
  const [presentationSpotlightRadius, setPresentationSpotlightRadius] = useState(180);
  const [presentationElapsed, setPresentationElapsed] = useState(0);
  const [presentationTimerRunning, setPresentationTimerRunning] = useState(false);
  const [presentationTimerMode, setPresentationTimerMode] = useState<"elapsed" | "countdown">("elapsed");
  const [presentationCountdownTotal, setPresentationCountdownTotal] = useState(300);
  const [presentationCountdownRemaining, setPresentationCountdownRemaining] = useState(300);
  const [presentationBlackout, setPresentationBlackout] = useState(false);
  const [gridMode, setGridMode] = useState<"dots" | "grid" | "plain">(() => {
    const saved = localStorage.getItem("lesson-board.grid-mode");
    return saved === "grid" || saved === "plain" ? saved : "dots";
  });
  const [previous, setPrevious] = useState<DocumentData | null>(() => {
    try {
      const raw = localStorage.getItem(storageKey + ".before-import");
      return raw ? parseDocument(raw) : null;
    } catch {
      return null;
    }
  });
  const [title, setTitle] = useState(initial.data.title);
  const [saveStatus, setSaveStatus] = useState(
    initial.error || "Сохранено в браузере",
  );
  const [color, setColor] = useState("#5355c9");
  const [weight, setWeight] = useState(3);
  const [markerWeight, setMarkerWeight] = useState(22);
  const [eraserSize, setEraserSize] = useState(32);
  const [eraserCursor, setEraserCursor] = useState<Point | null>(null);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [guides, setGuides] = useState<GuideState>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [layersOpen, setLayersOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [preview, setPreview] = useState<Item | null>(null);
  const [tool, setTool] = useState<Tool>("hand");
  const [view, setView] = useState<View>(initial.data.view);
  const [items, setItems] = useState<Item[]>(initial.data.items);
  const itemsRef = useRef(items);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const draftRef = useRef("");
  const editor = useRef<HTMLTextAreaElement>(null);
  const [space, setSpace] = useState(false);
  const [path, setPath] = useState<Point[]>([]);
  const [panning, setPanning] = useState(false);
  const touchPoints = useRef(new Map<number, Point>());
  const pinchState = useRef<{ distance:number; center:Point; view:View } | null>(null);
  const [mobileToolsOpen,setMobileToolsOpen]=useState(false);
  const [desktopToolsExpanded,setDesktopToolsExpanded]=useState(false);
  const [isCoarsePointer,setIsCoarsePointer]=useState(()=>window.matchMedia?.("(pointer: coarse)").matches===true);
  useEffect(()=>{const mq=window.matchMedia?.("(pointer: coarse)");if(!mq)return;const sync=()=>setIsCoarsePointer(mq.matches);sync();mq.addEventListener?.("change",sync);return()=>mq.removeEventListener?.("change",sync)},[]);
  useEffect(()=>{
    if(!isCoarsePointer)return;
    // Never force browser fullscreen: Android/Chrome may create a persistent
    // "copy this app URL" notification for that app-like fullscreen session.
    // Installed PWA can lock orientation without entering browser fullscreen.
    if(!window.matchMedia?.("(display-mode: standalone)").matches)return;
    let cancelled=false;
    const lockLandscape=async()=>{
      try{
        const orientation=screen.orientation as ScreenOrientation & {lock?:(orientation:"landscape")=>Promise<void>};
        if(!cancelled&&orientation?.lock)await orientation.lock("landscape");
      }catch{/* Manifest orientation remains the fallback for installed PWA. */}
    };
    void lockLandscape();
    return()=>{cancelled=true};
  },[isCoarsePointer]);
  const [installPrompt,setInstallPrompt]=useState<Event|null>(null);
  const [isStandalone,setIsStandalone]=useState(()=>window.matchMedia?.("(display-mode: standalone)").matches===true);
  const [online,setOnline]=useState(()=>navigator.onLine);
  const [updateReady,setUpdateReady]=useState<ServiceWorkerRegistration|null>(null);
  const gesture = useRef<Gesture | null>(null);
  useEffect(()=>{const ready=(e:Event)=>{e.preventDefault();setInstallPrompt(e)};const installed=()=>{setInstallPrompt(null);setIsStandalone(true)};window.addEventListener("beforeinstallprompt",ready);window.addEventListener("appinstalled",installed);return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",installed)}},[]);
  useEffect(()=>{const sync=()=>setOnline(navigator.onLine);const update=((e:Event)=>setUpdateReady((e as CustomEvent<{registration:ServiceWorkerRegistration}>).detail.registration)) as EventListener;window.addEventListener("online",sync);window.addEventListener("offline",sync);window.addEventListener("or-sw-update",update);return()=>{window.removeEventListener("online",sync);window.removeEventListener("offline",sync);window.removeEventListener("or-sw-update",update)}},[]);
  const applyUpdate=()=>{updateReady?.waiting?.postMessage({type:"SKIP_WAITING"})};
  const installApp=async()=>{const p=installPrompt as (Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})|null;if(!p)return;await p.prompt();await p.userChoice;setInstallPrompt(null)};
  const clipboard = useRef<Item[]>([]);
  const history = useRef<Item[][]>([initial.data.items]);
  const index = useRef(0);
  const [, refresh] = useState(0);
  const snapshot = useRef<DocumentData | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteVersion = useRef<number | null>(initialRemoteVersion);
  const remoteSaveInFlight = useRef(false);
  const queuedRemoteSnapshot = useRef<DocumentData | null>(null);
  const remoteSaveFailures = useRef(0);
  const remoteRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const acknowledgedDocument = useRef<string | null>(initialRemoteVersion == null ? null : documentFingerprint(initial.data));
  const deferredRemote = useRef<RemoteBoardDocument | null>(null);
  const pendingRemote = useRef<RemoteBoardDocument | null>(null);
  const lastAttempt = useRef<{ version: number; fingerprint: string } | null>(null);
  const [, setRemoteConflict] = useState<RemoteBoardDocument | null>(null);
  const [, setConflictLocalBackup] = useState<DocumentData | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("reconnecting");
  const receiveRemote = useRef<(row: RemoteBoardDocument) => void>(() => {});
  const boardMounted = useRef(true);
  useEffect(() => {
    boardMounted.current = true;
    return () => {
      boardMounted.current = false;
      if (remoteRetryTimer.current) clearTimeout(remoteRetryTimer.current);
    };
  }, []);
  useEffect(() => {
    localStorage.setItem("lesson-board.grid-mode", gridMode);
  }, [gridMode]);
  useEffect(() => {
    if (!presentation || !presentationTimerRunning) return;
    const id = window.setInterval(() => {
      if (presentationTimerMode === "elapsed") {
        setPresentationElapsed((value) => value + 1);
      } else {
        setPresentationCountdownRemaining((value) => {
          if (value <= 1) {
            setPresentationTimerRunning(false);
            setNotice("Время вышло");
            return 0;
          }
          return value - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [presentation, presentationTimerRunning, presentationTimerMode]);

  const pushRemoteSnapshot = useCallback(async (data: DocumentData) => {
    if (!isRemoteBackendEnabled() || !canEdit || !boardMounted.current || pendingRemote.current) return;
    if (documentFingerprint(data) === acknowledgedDocument.current) return;
    if (remoteSaveInFlight.current) {
      queuedRemoteSnapshot.current = data;
      return;
    }
    remoteSaveInFlight.current = true;
    try {
      await ensureBoardAssets(boardSummary.id, data);
      if (!boardMounted.current) return;
      const expectedVersion = remoteVersion.current ?? 0;
      lastAttempt.current = { version: expectedVersion + 1, fingerprint: documentFingerprint(data) };
      const result = await saveRemoteBoardDocument(boardSummary.id, data, expectedVersion);
      if (!boardMounted.current) return;
      if (result.conflict) {
        const row = { board_id: boardSummary.id, version: result.version, document: result.document, updated_at: result.updated_at ?? "" };
        if (!deferredRemote.current || row.version > deferredRemote.current.version) deferredRemote.current = row;
        return;
      }
      remoteVersion.current = result.version;
      acknowledgedDocument.current = documentFingerprint(data);
      remoteSaveFailures.current = 0;
      if (remoteRetryTimer.current) {
        clearTimeout(remoteRetryTimer.current);
        remoteRetryTimer.current = null;
      }
      setSaveStatus("Сохранено на сервере");
    } catch {
      // A short Supabase/network hiccup must not permanently leave the board in
      // a scary "server unavailable" state. The local copy is already safe,
      // so retry the latest snapshot quietly with a small exponential backoff.
      remoteSaveFailures.current += 1;
      const delay = Math.min(8000, 1000 * 2 ** Math.min(remoteSaveFailures.current - 1, 3));
      setSaveStatus(remoteSaveFailures.current < 3
        ? "Сохранено локально · повторная синхронизация…"
        : "Сохранено локально · восстанавливаем связь с сервером…");
      if (remoteRetryTimer.current) clearTimeout(remoteRetryTimer.current);
      remoteRetryTimer.current = setTimeout(() => {
        remoteRetryTimer.current = null;
        if (!boardMounted.current || !snapshot.current || pendingRemote.current) return;
        void pushRemoteSnapshot(snapshot.current);
      }, delay);
    } finally {
      remoteSaveInFlight.current = false;
      const deferred = deferredRemote.current;
      deferredRemote.current = null;
      if (boardMounted.current && deferred) receiveRemote.current(deferred);
      const queued = queuedRemoteSnapshot.current;
      queuedRemoteSnapshot.current = null;
      if (queued) void pushRemoteSnapshot(queued);
    }
  }, [boardSummary.id, canEdit]);

  const flushSave = useCallback(() => {
    if (!canEdit) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    if (!snapshot.current) return;
    try {
      const data = snapshot.current;
      localStorage.setItem(storageKey, JSON.stringify(data));
      if (!boardMounted.current) return;
      if (isRemoteBackendEnabled() && (pendingRemote.current || documentFingerprint(data) === acknowledgedDocument.current)) return;
      void touchBoard(authUser.id, boardSummary.id, data.title).then((updatedBoard) => {
        if (updatedBoard) onBoardChanged(updatedBoard);
      }).catch(() => {});
      if (isRemoteBackendEnabled()) {
        setSaveStatus("Сохранение на сервер…");
        void pushRemoteSnapshot(data);
      } else {
        setSaveStatus("Сохранено в браузере");
      }
    } catch {
      setSaveStatus("Не удалось сохранить — скачайте копию");
    }
  }, [authUser.id, boardSummary.id, onBoardChanged, storageKey, canEdit, pushRemoteSnapshot]);

  // A gesture is saved only when completed; in-progress text is saved too.
  useEffect(() => {
    if (saveBlocked || gesture.current) return;
    const data: DocumentData = {
      version: 1,
      title,
      view,
      items: editing
        ? items.map((i) => (i.id === editing ? { ...i, text: draft } : i))
        : items,
    };
    snapshot.current = data;
    if (pendingRemote.current) {
      try { localStorage.setItem(storageKey, JSON.stringify(data)); }
      catch { setSaveStatus("Не удалось сохранить локальную копию — скачайте её"); }
      return;
    }
    if (isRemoteBackendEnabled() && (!canEdit || pendingRemote.current || documentFingerprint(data) === acknowledgedDocument.current)) return;
    setSaveStatus("Сохранение…");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 250);
  }, [
    items,
    title,
    editing,
    draft,
    path,
    panning,
    preview,
    saveBlocked,
    flushSave,
  ]);
  useEffect(() => {
    const hidden = () => {
      if (document.visibilityState === "hidden") flushSave();
    };
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      flushSave();
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [flushSave]);
  useEffect(() => {
    if (editing) {
      editor.current?.focus({ preventScroll: true });
      const item = itemsRef.current.find((candidate) => candidate.id === editing);
      if (item?.kind === "frame") editor.current?.setSelectionRange(0, editor.current.value.length);
      else editor.current?.setSelectionRange(editor.current.value.length, editor.current.value.length);
    }
  }, [editing]);

  const refreshDiscussions=useCallback(async()=>{setDiscussionRows(await listBoardComments(boardSummary.id))},[boardSummary.id]);
  const refreshDiscussionParticipants=useCallback(async()=>{setDiscussionParticipants(await listBoardCommentParticipants(boardSummary.id))},[boardSummary.id]);
  const openDiscussions=async(focusId:string|null=null)=>{
    if(!isRemoteBackendEnabled()){setNotice("Чат доступен при серверной синхронизации");return}
    setChatOpen(true);setChatUnread(0);setDiscussionOpen(true);setDiscussionBusy(true);setDiscussionError("");if(focusId)setDiscussionFocusId(focusId);
    try{await Promise.all([refreshDiscussions(),refreshDiscussionParticipants()])}catch(error){setDiscussionError(error instanceof Error?error.message:"Не удалось загрузить обсуждения")}finally{setDiscussionBusy(false)}
  };
  useEffect(()=>{
    if(!isRemoteBackendEnabled())return;
    return subscribeBoardComments(boardSummary.id,()=>{
      if(!chatOpen)setChatUnread(value=>Math.min(99,value+1));
      void refreshDiscussions().catch(()=>{});
    });
  },[chatOpen,boardSummary.id,refreshDiscussions]);
  useEffect(()=>{
    const requested=new URLSearchParams(window.location.search).get("discussion");
    if(requested){setDiscussionFocusId(requested);void openDiscussions(requested)}
  // Opening a notification deep-link is intentionally a one-time action for this mounted board.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[boardSummary.id]);
  useEffect(()=>{
    if(!discussionOpen||!discussionFocusId||!discussionRows.length)return;
    const requested=discussionRows.find(x=>x.id===discussionFocusId);
    const rootId=requested?.parent_id||requested?.id||discussionFocusId;
    window.setTimeout(()=>document.getElementById(`discussion-${rootId}`)?.scrollIntoView({behavior:"smooth",block:"center"}),60);
  },[discussionOpen,discussionFocusId,discussionRows]);
  const insertDiscussionMention=(person:BoardCommentParticipant)=>{
    const mention=`@${person.display_name}`;
    setDiscussionDraft(value=>`${value}${value&&!/\s$/.test(value)?" ":""}${mention} `);
  };
  const sendDiscussion=async()=>{
    const body=discussionDraft.trim();if(!body)return;
    setDiscussionBusy(true);setDiscussionError("");
    try{const created=await createBoardComment(boardSummary.id,body,discussionReplyTo);setDiscussionDraft("");setDiscussionReplyTo(null);if(created?.id)setDiscussionFocusId(created.id);await refreshDiscussions()}
    catch(error){setDiscussionError(error instanceof Error?error.message:"Не удалось отправить комментарий")}
    finally{setDiscussionBusy(false)}
  };
  const toggleDiscussionResolved=async(row:BoardCommentThread)=>{
    if(!canEdit)return;setDiscussionBusy(true);setDiscussionError("");
    try{await setBoardCommentResolved(row.id,!row.resolved);await refreshDiscussions()}
    catch(error){setDiscussionError(error instanceof Error?error.message:"Не удалось изменить статус")}
    finally{setDiscussionBusy(false)}
  };

  const openHistory=async()=>{
    if(!isRemoteBackendEnabled()){setNotice("История версий доступна при серверной синхронизации");return}
    setHistoryOpen(true);setHistoryBusy(true);setHistoryError("");
    try{setHistoryRows(await listBoardHistory(boardSummary.id,40))}
    catch(error){setHistoryError(error instanceof Error?error.message:"Не удалось загрузить историю")}
    finally{setHistoryBusy(false)}
  };
  const restoreHistoryVersion=async(entry:BoardHistoryEntry)=>{
    if(!canEdit){setNotice("У вас доступ только для просмотра");return}
    if(!window.confirm(`Восстановить версию №${entry.version}? Текущее состояние останется в истории после следующего сохранения.`))return;
    setHistoryBusy(true);setHistoryError("");
    try{
      const data=parseDocument(JSON.stringify(await getBoardHistoryVersion(boardSummary.id,entry.version)));
      applyDocument(data);
      setHistoryOpen(false);
      setNotice(`Версия №${entry.version} восстановлена. Изменение будет сохранено как новая версия.`);
    }catch(error){setHistoryError(error instanceof Error?error.message:"Не удалось восстановить версию")}
    finally{setHistoryBusy(false)}
  };

  const exportBoard = async () => {
    const data: DocumentData = {
      version: 1,
      title,
      view,
      items: editing
        ? itemsRef.current.map((i) =>
            i.id === editing ? { ...i, text: draft } : i,
          )
        : itemsRef.current,
    };
    try {
      setNotice("Подготавливаем переносимую копию…");
      const assets: { id: string; name: string; mime: string; data: string }[] = [];
      const media = data.items.filter((i) => (i.kind === "image" || i.kind === "pdf") && i.assetId);
      const seen = new Set<string>();
      for (const item of media) {
        if (!item.assetId || seen.has(item.assetId)) continue;
        seen.add(item.assetId);
        const blob = await getAsset(item.assetId, boardSummary.id);
        if (!blob) continue;
        assets.push({
          id: item.assetId,
          name: item.name ?? "file",
          mime: item.mime ?? blob.type ?? "application/octet-stream",
          data: await blobToDataUrl(blob),
        });
      }
      const bundle: PortableBoardBundle = {
        format: "onlinerepetitor-board",
        version: 2,
        app: "OnlineRepetitor",
        exportedAt: new Date().toISOString(),
        document: data,
        assets: assets.map(asset=>({ ...asset, size: Math.round((asset.data.length * 3) / 4) })),
      };
      validatePortableBundle(bundle);
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(bundle)], { type: "application/json" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = safeBackupName(title); 
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(assets.length ? `Копия скачана вместе с вложениями: ${assets.length}` : "Копия доски скачана");
    } catch {
      setNotice("Не удалось подготовить переносимую копию");
    }
  };

  const display = (next: Item[]) => {
    const synced = syncBoundConnectors(next);
    itemsRef.current = synced;
    setItems(synced);
  };
  const currentDocument = (): DocumentData => ({
    version: 1,
    title,
    view,
    items: editing
      ? itemsRef.current.map((i) =>
          i.id === editing ? { ...i, text: draftRef.current } : i,
        )
      : itemsRef.current,
  });
  const applyDocument = (data: DocumentData, fromRemote = false) => {
    end(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setEditing(null);
    setSelected([]);
    setSpace(false);
    setTool("select");
    setTitle(data.title);
    if (!fromRemote) setView(data.view);
    display(data.items);
    history.current = [data.items];
    index.current = 0;
    snapshot.current = data;
    setSaveBlocked(false);
    if (!fromRemote) flushSave();
  };
  const importBoard = async (file: File) => {
    if (!canEdit) { setNotice("У вас доступ только для просмотра"); return; }
    try {
      if (file.size > 120 * 1024 * 1024) throw new Error("Файл больше 120 МБ");
      const raw = await file.text();
      let data: DocumentData;
      let bundledAssets: { id: string; data: string }[] = [];
      try {
        const parsed = JSON.parse(raw);
        if (parsed?.format === "onlinerepetitor-board") {
          const bundle = validatePortableBundle(parsed);
          data = parseDocument(JSON.stringify(bundle.document));
          bundledAssets = bundle.assets;
        } else if (parsed?.format === "interactive-board-bundle" && parsed?.document) {
          data = parseDocument(JSON.stringify(parsed.document));
          bundledAssets = Array.isArray(parsed.assets)
            ? parsed.assets.filter((a: unknown): a is { id: string; data: string } =>
                !!a && typeof a === "object" && typeof (a as { id?: unknown }).id === "string" && typeof (a as { data?: unknown }).data === "string",
              )
            : [];
        } else {
          data = parseDocument(raw);
        }
      } catch {
        data = parseDocument(raw);
      }
      if (
        !window.confirm(
          `Открыть «${data.title || "Без названия"}» (${data.items.length} объектов)? Текущая доска будет заменена; её копию можно вернуть кнопкой «До импорта».`,
        )
      )
        return;
      const before = currentDocument();
      if (saveBlocked) {
        const damaged = localStorage.getItem(storageKey);
        if (damaged) localStorage.setItem(storageKey + ".damaged-backup", damaged);
      }
      localStorage.setItem(
        storageKey + ".before-import",
        JSON.stringify(before),
      );
      setPrevious(before);
      const importedIds = new Map<string, string>();
      for (const asset of bundledAssets) {
        if (importedIds.has(asset.id) || !data.items.some(item => item.assetId === asset.id)) continue;
        try {
          if (!asset.data.startsWith("data:")) throw new Error("Некорректное вложение в копии");
          const blob = await fetch(asset.data).then(r => r.blob());
          const item = data.items.find(item => item.assetId === asset.id);
          const id = crypto.randomUUID();
          await putAsset(id, item?.kind === "pdf" ? blob.slice(0, blob.size, "application/pdf") : blob, boardSummary.id);
          importedIds.set(asset.id, id);
        } catch (error) {
          // Preserve v19 local imports even when one attachment is damaged.
          if (isRemoteBackendEnabled()) throw error;
        }
      }
      data.items = data.items.map(item => item.assetId && importedIds.has(item.assetId)
        ? { ...item, assetId: importedIds.get(item.assetId)! } : item);
      await ensureBoardAssets(boardSummary.id, data);
      applyDocument(data);
      setNotice(
        bundledAssets.length
          ? `Доска восстановлена вместе с вложениями: ${bundledAssets.length}`
          : "Копия восстановлена",
      );
    } catch (error) {
      setNotice(
        "Импорт отменён: " +
          (error instanceof Error
            ? error.message
            : "не удалось прочитать файл"),
      );
    }
  };
  const commit = (next: Item[]) => {
    if (!canEdit) { setNotice("У вас доступ только для просмотра"); return; }
    const normalized = syncBoundConnectors(next);
    if (JSON.stringify(normalized) === JSON.stringify(history.current[index.current]))
      return;
    history.current = history.current.slice(0, index.current + 1);
    history.current.push(normalized);
    if (history.current.length > 101) history.current.shift();
    index.current = history.current.length - 1;
    display(normalized);
    refresh((n) => n + 1);
  };
  const finishEdit = () => {
    if (!editing) return;
    const editedItem = itemsRef.current.find((item) => item.id === editing);
    const nextText = editedItem?.kind === "frame"
      ? draftRef.current.replace(/\s*\n+\s*/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 120)
      : draftRef.current;
    commit(
      itemsRef.current.map((item) =>
        item.id === editing ? { ...item, text: nextText } : item,
      ),
    );
    draftRef.current = nextText;
    setDraft(nextText);
    setEditing(null);
  };
  const startEdit = (item: Item) => {
    if (!canEdit) { setNotice("У вас доступ только для просмотра"); return; }
    if (item.kind !== "text" && item.kind !== "sticky" && item.kind !== "frame" && item.kind !== "comment") return;
    setSelected([item.id]);
    setTool("select");
    setSpace(false);
    draftRef.current = item.text;
    setDraft(item.text);
    setEditing(item.id);
  };
  const undo = (direction: number) => {
    if (gesture.current) return;
    const next = index.current + direction;
    if (next < 0 || next >= history.current.length) return;
    index.current = next;
    display(history.current[next]);
    setSelected([]);
    refresh((n) => n + 1);
  };
  const local = (x: number, y: number): Point => {
    const rect = board.current!.getBoundingClientRect();
    return { x: x - rect.left, y: y - rect.top };
  };
  const world = (p: Point): Point => ({
    x: (p.x - view.x) / view.zoom,
    y: (p.y - view.y) / view.zoom,
  });
  const zoom = (factor: number, anchor?: Point) => {
    if (gesture.current) return;
    const rect = board.current?.getBoundingClientRect();
    if (!rect) return;
    const p = anchor ?? { x: rect.width / 2, y: rect.height / 2 };
    setView((v) => {
      const z = Math.max(0.1, Math.min(8, v.zoom * factor));
      return {
        zoom: z,
        x: p.x - ((p.x - v.x) * z) / v.zoom,
        y: p.y - ((p.y - v.y) * z) / v.zoom,
      };
    });
  };

  const fitToBounds = (bounds: Bounds | null, padding = 90) => {
    const rect = board.current?.getBoundingClientRect();
    if (!rect || !bounds) return;
    const availableW = Math.max(120, rect.width - padding * 2);
    const availableH = Math.max(120, rect.height - padding * 2);
    const z = Math.max(0.1, Math.min(4, Math.min(availableW / Math.max(1, bounds.width), availableH / Math.max(1, bounds.height))));
    setView({
      zoom: z,
      x: rect.width / 2 - (bounds.x + bounds.width / 2) * z,
      y: rect.height / 2 - (bounds.y + bounds.height / 2) * z,
    });
  };

  const familyIdsFor = (item: Item): string[] =>
    item.groupId
      ? itemsRef.current.filter((candidate) => candidate.groupId === item.groupId).map((candidate) => candidate.id)
      : [item.id];

  const addMediaFile = async (file: File, position?: Point, offset = 0) => {
    if (!canEdit) throw new Error("У вас доступ только для просмотра");
    if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name}: файл больше 50 МБ`);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) throw new Error(`${file.name}: нужна фотография или PDF`);

    let width = 360;
    let height = isPdf ? 500 : 260;
    if (isImage) {
      const url = URL.createObjectURL(file);
      try {
        const natural = await new Promise<{ width: number; height: number }>((resolve, reject) => {
          const image = new Image();
          image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
          image.onerror = () => reject(new Error("Не удалось определить размер изображения"));
          image.src = url;
        });
        const scale = Math.min(420 / Math.max(1, natural.width), 320 / Math.max(1, natural.height), 1);
        width = Math.max(120, natural.width * scale);
        height = Math.max(80, natural.height * scale);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    const id = crypto.randomUUID();
    await putAsset(id, isPdf ? file.slice(0, file.size, "application/pdf") : file, boardSummary.id);
    const rect = board.current?.getBoundingClientRect();
    const center = position ?? world({ x: (rect?.width ?? 800) / 2, y: (rect?.height ?? 600) / 2 });
    const item: Item = {
      id: crypto.randomUUID(),
      kind: isPdf ? "pdf" : "image",
      x: center.x - width / 2 + offset,
      y: center.y - height / 2 + offset,
      width,
      height,
      text: "",
      assetId: id,
      name: file.name,
      mime: file.type || (isPdf ? "application/pdf" : "image/*"),
    };
    commit([...itemsRef.current, item]);
    setSelected([item.id]);
    setTool("select");
    return item;
  };

  const openLinkMediaEditor=(item?:Item)=>{setLinkMediaEditId(item?.kind==="linkmedia"?item.id:null);setLinkMediaUrl(item?.kind==="linkmedia"?item.mediaUrl??"":"");setLinkMediaTitle(item?.kind==="linkmedia"?item.mediaTitle??"":"");setLinkMediaOpen(true)};
  const saveLinkMedia=()=>{if(!canEdit)return;const info=resolveLinkMedia(linkMediaUrl);if(!info){setNotice("Нужна корректная ссылка http/https");return}const title=linkMediaTitle.trim()||({youtube:"YouTube",vimeo:"Vimeo",audio:"Аудио",video:"Видео",web:"Медиа по ссылке"} as const)[info.kind];if(linkMediaEditId){commit(itemsRef.current.map(i=>i.id===linkMediaEditId?{...i,mediaUrl:info.sourceUrl,mediaTitle:title}:i));setNotice("Ссылка мультимедиа обновлена")}else{const rect=board.current?.getBoundingClientRect();const center=world({x:(rect?.width??800)/2,y:(rect?.height??600)/2});const audio=info.kind==="audio";const item:Item={id:crypto.randomUUID(),kind:"linkmedia",x:center.x-240,y:center.y-(audio?70:150),width:480,height:audio?140:300,text:"",mediaUrl:info.sourceUrl,mediaTitle:title};commit([...itemsRef.current,item]);setSelected([item.id]);setNotice("Мультимедиа добавлено без загрузки файла в хранилище")}setLinkMediaOpen(false);setLinkMediaEditId(null);setTool("select")};

  useEffect(()=>{if(!canEdit)return;let raw=sessionStorage.getItem("onlinerepetitor.material.pick");if(!raw)return;sessionStorage.removeItem("onlinerepetitor.material.pick");(async()=>{try{const picked=JSON.parse(raw) as Pick<Material,"id"|"title"|"fileName"|"mime"|"storagePath">;if(!picked.id||!(picked.mime.startsWith("image/")||picked.mime==="application/pdf")){setNotice("На доску сейчас можно вставить изображение или PDF");return}const blob=await materialBlob(picked as Material);const file=new File([blob],picked.fileName,{type:picked.mime});await addMediaFile(file);await markMaterialUsed(picked.id);setNotice(`Материал «${picked.title}» добавлен на доску`)}catch(e){setNotice(e instanceof Error?e.message:"Не удалось добавить материал")}})()},[boardSummary.id,canEdit]);

  const openMediaAsset = async (item: Item) => {
    if ((item.kind !== "image" && item.kind !== "pdf") || !item.assetId) return;
    const blob = await getAsset(item.assetId, boardSummary.id);
    if (!blob) { setNotice("Исходный файл не найден в хранилище браузера"); return; }
    const url = URL.createObjectURL(blob);
    const targetUrl = item.kind === "pdf" ? `${url}#page=${Math.max(1, item.pdfPage ?? 1)}` : url;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  const downloadMediaAsset = async (item: Item) => {
    if ((item.kind !== "image" && item.kind !== "pdf") || !item.assetId) return;
    const blob = await getAsset(item.assetId, boardSummary.id);
    if (!blob) { setNotice("Исходный файл не найден в хранилище браузера"); return; }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = item.name || (item.kind === "pdf" ? "document.pdf" : "image");
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const setPdfPage = (item: Item, page: number) => {
    if (item.kind !== "pdf" || item.locked) return;
    const nextPage = Math.max(1, Math.min(10000, Math.round(Number.isFinite(page) ? page : 1)));
    if (nextPage === (item.pdfPage ?? 1)) return;
    commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, pdfPage: nextPage } : candidate));
    setNotice(`PDF · страница ${nextPage}`);
  };

  const changePdfPage = (item: Item, delta: number) => setPdfPage(item, (item.pdfPage ?? 1) + delta);
  const duplicateNextPdfPage = (item: Item) => {
    if (item.kind !== "pdf" || item.locked) return;
    const copy: Item = {
      ...deepItem(item),
      id: crypto.randomUUID(),
      x: item.x + item.width + 28,
      y: item.y,
      pdfPage: Math.max(1, (item.pdfPage ?? 1) + 1),
      groupId: undefined,
      locked: false,
    };
    commit([...itemsRef.current, copy]);
    setSelected([copy.id]);
    setNotice(`Добавлена страница PDF ${copy.pdfPage} рядом`);
  };

  const spreadPdfPages = (item: Item, count: 3 | 5) => {
    if (item.kind !== "pdf" || item.locked) return;
    const gap = 28, cols = count <= 3 ? count : 3;
    const copies: Item[] = [];
    for (let n = 1; n < count; n++) {
      const col = n % cols, row = Math.floor(n / cols);
      copies.push({ ...deepItem(item), id: crypto.randomUUID(), x: item.x + col * (item.width + gap), y: item.y + row * (item.height + gap), pdfPage: Math.max(1, (item.pdfPage ?? 1) + n), groupId: undefined, locked: false });
    }
    commit([...itemsRef.current, ...copies]);
    setSelected([item.id, ...copies.map((copy) => copy.id)]);
    setNotice(`Разложено страниц PDF: ${count}`);
  };

  // Native non-passive listener prevents browser zoom on Ctrl + wheel.
  useEffect(() => {
    const element = board.current!;
    const wheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest("textarea")) return;
      e.preventDefault();
      if (gesture.current) return;
      const unit =
        e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? element.clientHeight : 1;
      if (e.ctrlKey || e.metaKey)
        zoom(Math.exp(-e.deltaY * unit * 0.002), local(e.clientX, e.clientY));
      else
        setView((v) => ({
          ...v,
          x: v.x - e.deltaX * unit,
          y: v.y - e.deltaY * unit,
        }));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  });

  const touchStart=(e: PE<HTMLElement>)=>{if(e.pointerType!=="touch")return;touchPoints.current.set(e.pointerId,local(e.clientX,e.clientY));if(touchPoints.current.size===2){end(true);const pts=[...touchPoints.current.values()];const dx=pts[1].x-pts[0].x,dy=pts[1].y-pts[0].y;pinchState.current={distance:Math.max(1,Math.hypot(dx,dy)),center:{x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2},view:{...view}};setPanning(true)}};
  const touchMove=(e: PE<HTMLElement>)=>{if(e.pointerType!=="touch"||!touchPoints.current.has(e.pointerId))return;touchPoints.current.set(e.pointerId,local(e.clientX,e.clientY));const pinch=pinchState.current;if(!pinch||touchPoints.current.size<2)return;e.preventDefault();const pts=[...touchPoints.current.values()];const center={x:(pts[0].x+pts[1].x)/2,y:(pts[0].y+pts[1].y)/2};const distance=Math.max(1,Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y));const z=Math.max(.1,Math.min(8,pinch.view.zoom*distance/pinch.distance));const wx=(pinch.center.x-pinch.view.x)/pinch.view.zoom,wy=(pinch.center.y-pinch.view.y)/pinch.view.zoom;setView({zoom:z,x:center.x-wx*z,y:center.y-wy*z})};
  const touchEnd=(e: PE<HTMLElement>)=>{if(e.pointerType!=="touch")return;touchPoints.current.delete(e.pointerId);if(touchPoints.current.size<2){pinchState.current=null;setPanning(false)}};

  const end = (cancel = false) => {
    const g = gesture.current;
    if (!g) return;
    gesture.current = null;
    if (cancel) {
      display(g.restore ?? g.before);
      setView(g.view);
    } else if (g.mode === "drag" || g.mode === "erase" || g.mode === "resize" || g.mode === "rotate" || g.mode === "connector-end")
      commit(itemsRef.current);
    else if (g.mode === "draw" && g.ink)
      commit([
        ...g.before,
        stroke(g.ink.id, g.ink.kind, g.path, g.ink.color, g.ink.weight),
      ]);
    else if (g.mode === "connector") {
      const startPoint = g.path[0];
      const endPoint = g.path[g.path.length - 1] ?? startPoint;
      if (Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y) > 5 / g.view.zoom) {
        const connector = connectorItemFromPoints(startPoint, endPoint, connectorStyle, color, connectorWeight, crypto.randomUUID(), connectorRouting, g.connectorStartBinding, g.connectorEndBinding);
        commit([...g.before, connector]);
        setSelected([connector.id]);
        setTool("select");
      }
    }
    else if (g.mode === "lasso") {
      const directHits =
        g.path.length < 3
          ? []
          : itemsRef.current.filter((item) =>
              !item.hidden && inside(
                { x: item.x + item.width / 2, y: item.y + item.height / 2 },
                g.path,
              ),
            );
      const hitGroups = new Set(directHits.map((item) => item.groupId).filter(Boolean));
      const hits = itemsRef.current
        .filter((item) => !item.hidden && (directHits.some((hit) => hit.id === item.id) || (item.groupId && hitGroups.has(item.groupId))))
        .map((item) => item.id);
      setSelected(g.additive ? [...new Set([...g.ids, ...hits])] : hits);
    }
    setPath([]);
    setPreview(null);
    setPanning(false);
    setGuides({});
    if (board.current?.hasPointerCapture(g.pointer))
      board.current.releasePointerCapture(g.pointer);
  };
  const down = (e: PE<HTMLElement>) => {
    if (gesture.current || (e.target as HTMLElement).closest("textarea"))
      return;
    if (e.button !== 0 && e.button !== 1) return;
    finishEdit();
    const start = local(e.clientX, e.clientY);
    const p = world(start);
    const target = e.target as HTMLElement;
    if (contextMenu && !target.closest("[data-context-menu]")) setContextMenu(null);
    const connectorEndpointEl = target.closest<HTMLElement>("[data-connector-endpoint]");
    const connectorEndpoint = connectorEndpointEl?.dataset.connectorEndpoint;
    if (connectorEndpoint && selected.length === 1) {
      const connector = itemsRef.current.find((item) => item.id === selected[0] && item.kind === "connector");
      if (connector && !connector.locked) {
        e.preventDefault();
        e.stopPropagation();
        gesture.current = {
          pointer: e.pointerId, mode: "connector-end", handle: connectorEndpoint,
          transformItem: deepItem(connector), start, view, before: itemsRef.current, ids: [connector.id], path: [p], additive: false,
        };
        board.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    const groupHandleEl = target.closest<HTMLElement>("[data-group-transform-handle]");
    const groupHandle = groupHandleEl?.dataset.groupTransformHandle;
    if (groupHandle && selected.length > 1 && !itemsRef.current.some((i) => selected.includes(i.id) && i.locked)) {
      const bases = itemsRef.current.filter((i) => selected.includes(i.id)).map((i) => ({ ...i, points: i.points?.map((p) => ({ ...p })) }));
      const groupBounds = boundsOf(bases);
      if (groupBounds) {
        e.preventDefault();
        e.stopPropagation();
        gesture.current = {
          pointer: e.pointerId,
          mode: groupHandle === "rotate" ? "rotate" : "resize",
          handle: groupHandle,
          transformItems: bases,
          transformBounds: groupBounds,
          start,
          view,
          before: itemsRef.current,
          ids: bases.map((i) => i.id),
          path: [p],
          additive: false,
        };
        board.current!.setPointerCapture(e.pointerId);
        return;
      }
    }
    const id = target.closest<HTMLElement>("[data-object]")?.dataset.object;
    const hit = itemsRef.current.find((i) => i.id === id);
    const handleEl = target.closest<HTMLElement>("[data-transform-handle]");
    const transformHandle = handleEl?.dataset.transformHandle;
    if (transformHandle && hit && !hit.locked && selected.length === 1 && selected[0] === hit.id) {
      e.preventDefault();
      e.stopPropagation();
      gesture.current = {
        pointer: e.pointerId,
        mode: transformHandle === "rotate" ? "rotate" : "resize",
        handle: transformHandle,
        transformItem: { ...hit, points: hit.points?.map((p) => ({ ...p })) },
        start,
        view,
        before: itemsRef.current,
        ids: [hit.id],
        path: [p],
        additive: false,
      };
      board.current!.setPointerCapture(e.pointerId);
      return;
    }
    if (
      tool === "text" &&
      hit &&
      !hit.locked &&
      !space &&
      e.button === 0 &&
      (hit.kind === "text" || hit.kind === "sticky")
    ) {
      e.preventDefault();
      startEdit(hit);
      return;
    }
    let mode: Gesture["mode"] = "drag";
    let ids = selected;
    if (e.button === 1 || tool === "hand" || space) {
      mode = "pan";
      setPanning(true);
    } else if (tool === "lasso") {
      mode = "lasso";
      setPath([p]);
    } else if (tool === "pen" || tool === "marker") {
      mode = "draw";
      setSelected([]);
    } else if (tool === "eraser") {
      mode = "erase";
      setSelected([]);
    } else if (tool === "connector") {
      mode = "connector";
      setSelected([]);
    } else if (tool === "media") { mediaInput.current?.click(); setTool("select"); return;
    } else if (tool === "linkmedia") { openLinkMediaEditor(); return;
    } else if (tool === "frame") {
      e.preventDefault();
      const item: Item = {
        id: crypto.randomUUID(), kind: "frame",
        x: p.x - 320, y: p.y - 210, width: 640, height: 420,
        text: "Новый фрейм", color: "#8b8f9a", presentationOrder: Math.max(-1, ...itemsRef.current.filter((candidate) => candidate.kind === "frame").map((candidate, indexValue) => candidate.presentationOrder ?? indexValue)) + 1,
      };
      commit([item, ...itemsRef.current]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => startEdit(item), 0);
      return;
    } else if (tool === "comment") {
      e.preventDefault();
      const targetId = hit && hit.kind !== "comment" ? hit.id : undefined;
      const item: Item = {
        id: crypto.randomUUID(), kind: "comment",
        x: p.x + 18, y: p.y + 18, width: 250, height: 132,
        text: "", color: "#fff8d6", resolved: false,
        ...(targetId ? { commentTargetId: targetId } : {}),
      };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => startEdit(item), 0);
      return;
    } else if (tool === "table") {
      e.preventDefault();
      const rows = 3, cols = 3;
      const cells = ["Заголовок 1", "Заголовок 2", "Заголовок 3", "", "", "", "", "", ""];
      const item: Item = { id: crypto.randomUUID(), kind: "table", x: p.x - 220, y: p.y - 130, width: 440, height: 260, text: "", tableRows: rows, tableCols: cols, tableCells: cells, tableHeader: true, fontSize: 13 };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      setTableEditorId(item.id);
      setTableDraft({ rows, cols, cells: [...cells], header: true, fontSize: 13, align: "left", stripe: false, compact: false });
      return;
    } else if (tool === "graph") {
      e.preventDefault(); const item: Item={id:crypto.randomUUID(),kind:"graph",x:p.x-260,y:p.y-170,width:520,height:340,text:"",graphType:"quadratic",graphA:1,graphB:0,graphC:0,graphXMin:-10,graphXMax:10,graphYMin:-10,graphYMax:10,graphGrid:true,graphPoints:[],graphShowLabels:true,graphSnap:true,graphAxisLabels:true,graphGridStep:1,graphShowCurve:true,graphProjections:false,graphSegments:[],graphAngles:[],graphCircles:[],graphPolygons:[],graphMidpoints:[],color:"#5355c9"}; commit([...itemsRef.current,item]);setSelected([item.id]);setTool("select");window.setTimeout(()=>openGraphEditor(item),0);return;
    } else if (tool === "formula") {
      e.preventDefault();
      const item: Item = { id: crypto.randomUUID(), kind: "formula", x: p.x - 190, y: p.y - 70, width: 380, height: 140, text: "x^2 + y^2 = r^2", fontSize: 28, color: "#20242c" };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => openFormulaEditor(item), 0);
      return;
    } else if (tool === "checklist") {
      e.preventDefault();
      const item: Item = { id: crypto.randomUUID(), kind: "checklist", x: p.x - 170, y: p.y - 130, width: 340, height: 260, text: "Задание", checklistItems: ["Первый пункт", "Второй пункт", "Третий пункт"], checklistDone: [false, false, false], fontSize: 15, color: "#5355c9" };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => openChecklistEditor(item), 0);
      return;
    } else if (tool === "quiz") {
      e.preventDefault();
      const item: Item = {
        id: crypto.randomUUID(), kind: "quiz",
        x: p.x - 190, y: p.y - 155, width: 380, height: 310,
        text: "Какой ответ правильный?",
        quizOptions: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"],
        quizCorrect: 0, quizRevealed: false, fontSize: 15, color: "#5355c9",
      };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => openQuizEditor(item), 0);
      return;
    } else if (tool === "flashcard") {
      e.preventDefault();
      const item: Item = {
        id: crypto.randomUUID(), kind: "flashcard",
        x: p.x - 180, y: p.y - 125, width: 360, height: 250,
        text: "Вопрос", flashcardBack: "Ответ", flashcardFlipped: false, fontSize: 18, color: "#5355c9",
      };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => openFlashcardEditor(item), 0);
      return;
    } else if (tool === "cover") {
      e.preventDefault();
      const item: Item = { id: crypto.randomUUID(), kind: "cover", x: p.x - 170, y: p.y - 90, width: 340, height: 180, text: "Открыть ответ", coverOpen: false, fontSize: 17, color: "#5355c9" };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      window.setTimeout(() => startEdit(item), 0);
      return;
    } else if (tool === "sticky" || tool === "text" || tool === "shape") {
      e.preventDefault();
      const width = tool === "text" ? 260 : 220,
        height = tool === "text" ? 100 : 170;
      const item: Item = {
        id: crypto.randomUUID(),
        kind: tool,
        x: p.x - width / 2,
        y: p.y - height / 2,
        width,
        height,
        text: "",
        ...(tool === "shape" ? { shapeType, color: "#6064d4" } : {}),
        ...(tool === "sticky" ? { color: "#fff3a6", fontSize: 20, textAlign: "left" as const, fontWeight: "normal" as const, fontStyle: "normal" as const, textDecoration: "none" as const, textList: "none" as const, lineHeight: 1.45 } : {}),
        ...(tool === "text" ? { color: "#202124", fontSize: 20, textAlign: "left" as const, fontWeight: "normal" as const, fontStyle: "normal" as const, textDecoration: "none" as const, textList: "none" as const, lineHeight: 1.45 } : {}),
      };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      if (item.kind === "text" || item.kind === "sticky") startEdit(item);
      return;
    } else if (id && hit) {
      const family = familyIdsFor(hit);
      if (e.shiftKey) {
        const wholeFamilySelected = family.every((member) => selected.includes(member));
        ids = wholeFamilySelected
          ? selected.filter((member) => !family.includes(member))
          : [...new Set([...selected, ...family])];
      } else {
        ids = family.every((member) => selected.includes(member)) ? selected : family;
      }
      setSelected(ids);
      if (!ids.includes(id) || ids.some((member) => itemsRef.current.find((item) => item.id === member)?.locked)) return;
    } else {
      setSelected([]);
      return;
    }
    if (mode === "drag" && hit?.kind === "frame" && ids.includes(hit.id)) {
      const carried = containedByFrame(hit, itemsRef.current)
        .filter((item) => !item.locked && !(item.kind === "connector" && (item.connectorStartBinding || item.connectorEndBinding)))
        .map((item) => item.id);
      ids = [...new Set([...ids, ...carried])];
      if (carried.length) setNotice(`Фрейм перемещается вместе с содержимым: ${carried.length}`);
    }
    let gestureBefore = itemsRef.current;
    let restoreBefore: Item[] | undefined;
    if (mode === "drag" && e.altKey && ids.length) {
      const original = itemsRef.current;
      const copies = cloneItems(original.filter((item) => ids.includes(item.id)), 0);
      if (copies.length) {
        restoreBefore = original;
        gestureBefore = [...original, ...copies];
        display(gestureBefore);
        ids = copies.map((item) => item.id);
        setSelected(ids);
        setNotice("Создана копия · продолжайте перетаскивать");
      }
    }
    if (mode !== "drag") e.preventDefault();
    const connectorStartHit = mode === "connector"
      ? connectorAnchor(p, itemsRef.current, 18 / view.zoom)
      : null;
    const gesturePoint = mode === "connector"
      ? (connectorStartHit?.point ?? p)
      : p;
    gesture.current = {
      pointer: e.pointerId,
      mode,
      start,
      view,
      before: gestureBefore,
      restore: restoreBefore,
      ids,
      path: [gesturePoint],
      additive: e.shiftKey,
      connectorStartBinding: connectorStartHit?.binding,
      ink:
        tool === "pen" || tool === "marker"
          ? {
              id: crypto.randomUUID(),
              kind: tool,
              color,
              weight: tool === "marker" ? markerWeight : weight,
            }
          : undefined,
    };
    if (mode === "draw") {
      const ink = gesture.current.ink!;
      setPreview(stroke(ink.id, ink.kind, [p], ink.color, ink.weight));
    }
    if (mode === "connector") {
      setPreview(connectorItemFromPoints(gesturePoint, gesturePoint, connectorStyle, color, connectorWeight, crypto.randomUUID(), connectorRouting, connectorStartHit?.binding));
    }
    if (mode === "erase") display(eraseInk(gesture.current.before, gesture.current.path, eraserSize / 2 / view.zoom));
    // Keep plain clicks on the object: early capture retargets dblclick to the board.
    if (mode !== "drag") board.current!.setPointerCapture(e.pointerId);
  };
  const move = (e: PE<HTMLElement>) => {
    if (tool === "eraser") setEraserCursor(local(e.clientX, e.clientY));
    const g = gesture.current;
    if (!g || e.pointerId !== g.pointer) return;
    const p = local(e.clientX, e.clientY);
    const dx = p.x - g.start.x,
      dy = p.y - g.start.y;
    if (g.mode === "drag" && !g.dragging) {
      if (Math.hypot(dx, dy) < 4) return;
      g.dragging = true;
      board.current?.setPointerCapture(e.pointerId);
    }
    if (g.mode === "pan") {
      setGuides({});
      setView({ ...g.view, x: g.view.x + dx, y: g.view.y + dy });
    } else if (g.mode === "drag") {
      let worldDx = dx / g.view.zoom;
      let worldDy = dy / g.view.zoom;
      if (snapEnabled && !e.altKey) {
        const moving = boundsOf(g.before.filter((item) => g.ids.includes(item.id)));
        const others = g.before.filter((item) => !item.hidden && !g.ids.includes(item.id));
        if (moving) {
          const snapped = snapDraggedBounds(moving, others, worldDx, worldDy, 7 / g.view.zoom);
          worldDx = snapped.dx;
          worldDy = snapped.dy;
          setGuides(snapped.guides);
        }
      } else {
        setGuides({});
      }
      display(
        g.before.map((item) =>
          g.ids.includes(item.id)
            ? {
                ...item,
                x: item.x + worldDx,
                y: item.y + worldDy,
              }
            : item,
        ),
      );
    } else if (g.mode === "connector-end" && g.handle && g.transformItem?.kind === "connector") {
      setGuides({});
      const base = g.transformItem;
      const baseStart = { x: base.x + (base.connectorStart?.x ?? 0), y: base.y + (base.connectorStart?.y ?? 0) };
      const baseEnd = { x: base.x + (base.connectorEnd?.x ?? base.width), y: base.y + (base.connectorEnd?.y ?? base.height) };
      const raw = world(p);
      const magnetic = connectorAnchor(raw, g.before, 18 / g.view.zoom, base.id);
      const moving = magnetic?.point ?? raw;
      const startPoint = g.handle === "start" ? moving : baseStart;
      const endPoint = g.handle === "end" ? moving : baseEnd;
      const startBinding = g.handle === "start" ? magnetic?.binding : base.connectorStartBinding;
      const endBinding = g.handle === "end" ? magnetic?.binding : base.connectorEndBinding;
      const rebuilt = connectorItemFromPoints(
        startPoint,
        endPoint,
        base.connectorStyle ?? "arrow",
        base.color ?? "#5355c9",
        base.weight ?? 3,
        base.id,
        base.connectorRouting ?? "straight",
        startBinding,
        endBinding,
        base.text,
      );
      const nextConnector: Item = { ...rebuilt, groupId: base.groupId, locked: base.locked, hidden: base.hidden };
      display(g.before.map((item) => item.id === base.id ? nextConnector : item));
    } else if (g.mode === "resize" && g.handle) {
      setGuides({});
      const wx = dx / g.view.zoom, wy = dy / g.view.zoom;
      if (g.transformItems && g.transformBounds) {
        const baseBounds = g.transformBounds;
        const nextBounds = resizedRect(baseBounds, g.handle, wx, wy, 80, 60, e.shiftKey);
        const sx = nextBounds.width / Math.max(1, baseBounds.width);
        const sy = nextBounds.height / Math.max(1, baseBounds.height);
        const byId = new Map(g.transformItems.map((base) => {
          const rect = {
            x: nextBounds.x + (base.x - baseBounds.x) * sx,
            y: nextBounds.y + (base.y - baseBounds.y) * sy,
            width: Math.max(8, base.width * sx),
            height: Math.max(8, base.height * sy),
          };
          return [base.id, fitItemToRect(base, rect)] as const;
        }));
        display(g.before.map((item) => byId.get(item.id) ?? item));
      } else if (g.transformItem) {
        const base = g.transformItem;
        const minW = base.kind === "text" ? 100 : base.kind === "frame" ? 180 : base.kind === "comment" ? 180 : base.kind === "table" ? 220 : base.kind === "formula" ? 160 : base.kind === "checklist" ? 220 : base.kind === "quiz" ? 260 : base.kind === "flashcard" ? 220 : base.kind === "cover" ? 180 : base.kind === "connector" ? 24 : base.points ? 12 : 60;
        const minH = base.kind === "text" ? 44 : base.kind === "frame" ? 120 : base.kind === "comment" ? 96 : base.kind === "table" ? 120 : base.kind === "formula" ? 64 : base.kind === "checklist" ? 140 : base.kind === "quiz" ? 190 : base.kind === "flashcard" ? 150 : base.kind === "cover" ? 90 : base.kind === "connector" ? 24 : base.points ? 12 : 60;
        const rect = resizedRect(base, g.handle, wx, wy, minW, minH, e.shiftKey);
        display(g.before.map((item) => item.id === base.id ? fitItemToRect(base, rect) : item));
      }
    } else if (g.mode === "rotate") {
      setGuides({});
      const now = world(p);
      const startWorld = world(g.start);
      if (g.transformItems && g.transformBounds) {
        const bounds = g.transformBounds;
        const cx = bounds.x + bounds.width / 2, cy = bounds.y + bounds.height / 2;
        const a0 = Math.atan2(startWorld.y - cy, startWorld.x - cx);
        const a1 = Math.atan2(now.y - cy, now.x - cx);
        let delta = (a1 - a0) * 180 / Math.PI;
        if (e.shiftKey) delta = Math.round(delta / 90) * 90;
        const rad = delta * Math.PI / 180;
        const cos = Math.cos(rad), sin = Math.sin(rad);
        const byId = new Map(g.transformItems.map((base) => {
          const bx = base.x + base.width / 2 - cx;
          const by = base.y + base.height / 2 - cy;
          const ncx = cx + bx * cos - by * sin;
          const ncy = cy + bx * sin + by * cos;
          return [base.id, {
            ...base,
            x: ncx - base.width / 2,
            y: ncy - base.height / 2,
            rotation: (base.rotation ?? 0) + delta,
          }] as const;
        }));
        display(g.before.map((item) => byId.get(item.id) ?? item));
      } else if (g.transformItem) {
        const base = g.transformItem;
        const cx = base.x + base.width / 2, cy = base.y + base.height / 2;
        const a0 = Math.atan2(startWorld.y - cy, startWorld.x - cx);
        const a1 = Math.atan2(now.y - cy, now.x - cx);
        let rotation = (base.rotation ?? 0) + (a1 - a0) * 180 / Math.PI;
        if (e.shiftKey) rotation = Math.round(rotation / 90) * 90;
        display(g.before.map((item) => item.id === base.id ? { ...item, rotation } : item));
      }
    } else if (g.mode === "connector") {
      const raw = world(p);
      const magnetic = connectorAnchor(raw, g.before, 18 / g.view.zoom);
      const point = magnetic?.point ?? snappedConnectorEnd(g.path[0], raw, e.shiftKey);
      g.connectorEndBinding = magnetic?.binding;
      g.path = [g.path[0], point];
      setPreview(connectorItemFromPoints(g.path[0], point, connectorStyle, color, connectorWeight, crypto.randomUUID(), connectorRouting, g.connectorStartBinding, g.connectorEndBinding));
    } else if (g.mode === "erase") {
      const point = world(p), last = g.path[g.path.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) * view.zoom < 2) return;
      g.path.push(point);
      display(eraseInk(g.before, g.path, eraserSize / 2 / view.zoom));
    } else {
      const point = world(p),
        last = g.path[g.path.length - 1];
      if (Math.hypot(point.x - last.x, point.y - last.y) * view.zoom < 3)
        return;
      g.path.push(point);
      if (g.mode === "draw" && g.ink)
        setPreview(
          stroke(g.ink.id, g.ink.kind, g.path, g.ink.color, g.ink.weight),
        );
      else setPath([...g.path]);
    }
  };

  useEffect(() => {
    const keyDown = (e: KeyboardEvent) => {
      const target = e.target instanceof Element ? e.target : null;
      if (
        editing ||
        target?.closest(
          'input,textarea,select,[contenteditable="true"],[role="textbox"]',
        ) ||
        document.activeElement?.matches(
          'input,textarea,select,[contenteditable="true"]',
        ) ||
        e.isComposing
      )
        return;
      if (e.code === "Escape") {
        if (presentation && !publicPresentation) { setPresentation(false); setPresentationTimerRunning(false); setPresentationLaser(false); setPresentationLaserPos(null); setPresentationSpotlight(false); setPresentationSpotlightPos(null); setPresentationBlackout(false); return; }
        if (frameNotesEditorId) { setFrameNotesEditorId(null); setFrameNotesDraft(""); return; }
        if (formulaEditorId) { closeFormulaEditor(); return; }
        if (checklistEditorId) { setChecklistEditorId(null); setChecklistDraft(null); return; }
        if (quizEditorId) { setQuizEditorId(null); setQuizDraft(null); return; }
        if (flashcardEditorId) { setFlashcardEditorId(null); setFlashcardDraft(null); return; }
        if (tableEditorId) { setTableEditorId(null); setTableDraft(null); return; }
        if (shortcutsOpen) { setShortcutsOpen(false); return; }
        if (templatesOpen) { setTemplatesOpen(false); return; }
        if (commentsOpen) { setCommentsOpen(false); return; }
        if (searchOpen) { setSearchOpen(false); setSearchQuery(""); return; }
        if (contextMenu) {
          setContextMenu(null);
          return;
        }
        end(true);
        setSelected([]);
        return;
      }
      if (presentation && (e.code === "ArrowRight" || e.code === "PageDown")) { e.preventDefault(); stepPresentation(1); return; }
      if (presentation && (e.code === "ArrowLeft" || e.code === "PageUp")) { e.preventDefault(); stepPresentation(-1); return; }
      if (presentation && e.code === "Home") { e.preventDefault(); showPresentationFrame(0); return; }
      if (presentation && e.code === "End") { e.preventDefault(); showPresentationFrame(Math.max(0, presentationFrames.length - 1)); return; }
      if (presentation && !publicPresentation && e.code === "KeyL") { e.preventDefault(); setPresentationLaser((value) => !value); setPresentationSpotlight(false); return; }
      if (presentation && !publicPresentation && e.code === "KeyO") { e.preventDefault(); setPresentationSpotlight((value) => !value); setPresentationLaser(false); return; }
      if (presentation && !publicPresentation && e.code === "BracketLeft") { e.preventDefault(); setPresentationSpotlightRadius((value) => Math.max(80, value - 20)); return; }
      if (presentation && !publicPresentation && e.code === "BracketRight") { e.preventDefault(); setPresentationSpotlightRadius((value) => Math.min(360, value + 20)); return; }
      if (presentation && !publicPresentation && e.code === "KeyT") { e.preventDefault(); setPresentationTimerMode((mode) => mode === "elapsed" ? "countdown" : "elapsed"); return; }
      if (presentation && !publicPresentation && e.code === "KeyP") { e.preventDefault(); setPresentationTimerRunning((value) => !value); return; }
      if (presentation && !publicPresentation && e.code === "KeyB") { e.preventDefault(); setPresentationBlackout((value) => !value); return; }
      if (presentation && !publicPresentation && e.code === "KeyR") { e.preventDefault(); resetPresentationInteractions(); return; }
      if (presentation) return;
      if (gesture.current) return;
      if ((e.code === "Enter" || e.code === "F2") && selected.length === 1) {
        const item = itemsRef.current.find((i) => i.id === selected[0]);
        if (item && !item.locked && (item.kind === "text" || item.kind === "sticky" || item.kind === "frame" || item.kind === "comment" || item.kind === "formula" || item.kind === "table" || item.kind === "checklist" || item.kind === "quiz" || item.kind === "flashcard" || item.kind === "cover" || item.kind === "linkmedia")) {
          e.preventDefault();
          if (item.kind === "table") openTableEditor(item); else if (item.kind === "formula") openFormulaEditor(item); else if (item.kind === "checklist") openChecklistEditor(item); else if (item.kind === "quiz") openQuizEditor(item); else if (item.kind === "flashcard") openFlashcardEditor(item); else if (item.kind === "linkmedia") openLinkMediaEditor(item); else startEdit(item);
          return;
        }
      }
      if (e.code === "Space") {
        e.preventDefault();
        setSpace(true);
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === "KeyZ") {
        e.preventDefault();
        undo(e.shiftKey ? 1 : -1);
        return;
      }
      if (mod && e.code === "KeyY") {
        e.preventDefault();
        undo(1);
        return;
      }
      if (e.code === "F1") {
        e.preventDefault();
        setShortcutsOpen((value) => !value);
        return;
      }
      if (mod && e.code === "KeyF") {
        e.preventDefault();
        setSearchOpen(true);
        setSearchQuery("");
        window.setTimeout(() => document.querySelector<HTMLInputElement>(".board-search-input")?.focus(), 0);
        return;
      }
      if (mod && e.code === "KeyA") {
        e.preventDefault();
        setSelected(itemsRef.current.filter((i) => !i.hidden).map((i) => i.id));
        return;
      }
      if (mod && e.code === "Digit0") {
        e.preventDefault();
        setView({ x: 0, y: 0, zoom: 1 });
        return;
      }
      if (mod && e.shiftKey && e.code === "KeyE") {
        e.preventDefault();
        void exportItemsToPng(selected.length ? "selection" : "all");
        return;
      }
      if (mod && e.code === "KeyC" && selected.length) {
        e.preventDefault();
        copySelected();
        return;
      }
      if (mod && e.code === "KeyV" && clipboard.current.length) {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (mod && e.code === "KeyG" && selected.length) {
        e.preventDefault();
        if (e.shiftKey) ungroupSelected();
        else groupSelected();
        return;
      }
      if (mod && (e.code === "BracketRight" || e.code === "BracketLeft") && selected.length) {
        e.preventDefault();
        const front = e.code === "BracketRight";
        if (e.shiftKey) moveLayer(front);
        else moveLayerStep(front);
        return;
      }
      if (mod && e.code === "KeyD" && selected.length) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (e.altKey && (e.code === "ArrowLeft" || e.code === "ArrowRight") && selected.length) {
        e.preventDefault();
        rotateSelected(e.code === "ArrowLeft" ? -90 : 90);
        return;
      }
      if (["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(e.code) && selected.length) {
        e.preventDefault();
        if (selectionLocked) return;
        const step=e.shiftKey?10:1;
        const dx=e.code==="ArrowLeft"?-step:e.code==="ArrowRight"?step:0;
        const dy=e.code==="ArrowUp"?-step:e.code==="ArrowDown"?step:0;
        commit(itemsRef.current.map(i=>selected.includes(i.id)?{...i,x:i.x+dx,y:i.y+dy}:i));
        return;
      }
      if ((e.code === "Delete" || e.code === "Backspace") && selected.length) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (!mod && !e.altKey && keyTools[e.code]) {
        e.preventDefault();
        setTool(keyTools[e.code]);
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpace(false);
    };
    const blur = () => {
      setSpace(false);
      end(true);
    };
    const pointerUp = () => {
      if (gesture.current) end();
    };
    const pointerCancel = () => {
      if (gesture.current) end(true);
    };
    const closeContextMenu = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-context-menu]")) setContextMenu(null);
    };
    const pasteFromSystem = (event: ClipboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (editing || target?.closest('input,textarea,select,[contenteditable="true"]')) return;
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;
      const imageFiles = Array.from(clipboardData.files).filter((file) => file.type.startsWith("image/"));
      if (imageFiles.length) {
        event.preventDefault();
        void (async () => {
          try {
            for (let i = 0; i < imageFiles.length; i++) await addMediaFile(imageFiles[i], undefined, i * 24);
            setNotice(imageFiles.length === 1 ? "Изображение вставлено из буфера обмена" : `Вставлено изображений: ${imageFiles.length}`);
          } catch (error) {
            setNotice(error instanceof Error ? error.message : "Не удалось вставить изображение");
          }
        })();
        return;
      }
      const pastedText = clipboardData.getData("text/plain");
      if (!pastedText.trim() || clipboard.current.length) return;
      event.preventDefault();
      const rect = board.current?.getBoundingClientRect();
      if (!rect) return;
      const center = world({ x: rect.width / 2, y: rect.height / 2 });
      const text = pastedText.slice(0, 20000);
      const item: Item = {
        id: crypto.randomUUID(), kind: "text", x: center.x - 170, y: center.y - 60, width: 340, height: 120, text, fontSize: 20,
      };
      commit([...itemsRef.current, item]);
      setSelected([item.id]);
      setTool("select");
      setNotice("Текст вставлен на доску");
    };
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointerdown", closeContextMenu);
    window.addEventListener("pointercancel", pointerCancel);
    window.addEventListener("paste", pasteFromSystem);
    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointerdown", closeContextMenu);
      window.removeEventListener("pointercancel", pointerCancel);
      window.removeEventListener("paste", pasteFromSystem);
    };
  });

  const selectedItems = items.filter((item) => selected.includes(item.id));
  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null;
  const selectionBounds = boundsOf(selectedItems);
  const selectionLocked = selectedItems.some((item) => item.locked);
  const selectionHasGroup = selectedItems.some((item) => item.groupId);
  const selectionScreenBounds = selectionBounds ? {
    left: selectionBounds.x * view.zoom + view.x,
    top: selectionBounds.y * view.zoom + view.y,
    width: selectionBounds.width * view.zoom,
    height: selectionBounds.height * view.zoom,
  } : null;
  const selectedConnectorEndpoints = singleSelected?.kind === "connector" && singleSelected.connectorStart && singleSelected.connectorEnd ? {
    start: { x: (singleSelected.x + singleSelected.connectorStart.x) * view.zoom + view.x, y: (singleSelected.y + singleSelected.connectorStart.y) * view.zoom + view.y },
    end: { x: (singleSelected.x + singleSelected.connectorEnd.x) * view.zoom + view.x, y: (singleSelected.y + singleSelected.connectorEnd.y) * view.zoom + view.y },
  } : null;

  const expandedIdsForFrameSelection = (ids: string[]) => {
    const expanded = new Set(ids);
    for (const id of ids) {
      const frame = itemsRef.current.find((item) => item.id === id && item.kind === "frame");
      if (!frame) continue;
      for (const item of containedByFrame(frame, itemsRef.current)) expanded.add(item.id);
    }
    return [...expanded];
  };

  const exportItemsToPng = async (scope: "all" | "selection" | "frame", frameId?: string) => {
    try {
      const frameForExport = scope === "frame" ? itemsRef.current.find((item) => item.kind === "frame" && item.id === (frameId ?? singleSelected?.id)) : undefined;
      const idsForScope = scope === "frame" && frameForExport
        ? expandedIdsForFrameSelection([frameForExport.id])
        : scope === "selection" ? expandedIdsForFrameSelection(selected) : [];
      const exportIds = scope === "all" ? null : new Set(idsForScope);
      const source = itemsRef.current.filter((item) => !item.hidden && (!exportIds || exportIds.has(item.id)));
      const bounds = boundsOf(source);
      if (!bounds) { setNotice(scope === "all" ? "Доска пока пустая" : scope === "frame" ? "Сначала выберите фрейм" : "Сначала выберите объекты"); return; }
      setNotice("Готовим PNG…");
      const pad = 48;
      const rawWidth = Math.max(1, bounds.width + pad * 2);
      const rawHeight = Math.max(1, bounds.height + pad * 2);
      const scale = Math.max(.35, Math.min(2, 4096 / Math.max(rawWidth, rawHeight)));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(rawWidth * scale));
      canvas.height = Math.max(1, Math.round(rawHeight * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas недоступен");
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, rawWidth, rawHeight);
      ctx.translate(-bounds.x + pad, -bounds.y + pad);

      const roundedRect = (x: number, y: number, w: number, h: number, r: number) => {
        const rr = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + rr, y); ctx.lineTo(x + w - rr, y); ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
        ctx.lineTo(x + w, y + h - rr); ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
        ctx.lineTo(x + rr, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
        ctx.lineTo(x, y + rr); ctx.quadraticCurveTo(x, y, x + rr, y); ctx.closePath();
      };
      const wrapText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 30) => {
        const paragraphs = text.split(/\n/);
        let lineY = y, count = 0;
        for (const paragraph of paragraphs) {
          const words = paragraph.split(/\s+/).filter(Boolean);
          let line = "";
          for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (line && ctx.measureText(test).width > maxWidth) {
              ctx.fillText(line, x, lineY); lineY += lineHeight; count++; line = word;
              if (count >= maxLines) return;
            } else line = test;
          }
          if (line && count < maxLines) { ctx.fillText(line, x, lineY); lineY += lineHeight; count++; }
          if (!words.length) lineY += lineHeight;
          if (count >= maxLines) return;
        }
      };
      const drawArrowHead = (from: Point, to: Point, colorValue: string, size: number) => {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        ctx.save(); ctx.translate(to.x, to.y); ctx.rotate(angle); ctx.fillStyle = colorValue;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-size, -size * .48); ctx.lineTo(-size, size * .48); ctx.closePath(); ctx.fill(); ctx.restore();
      };
      const drawConnector = (item: Item) => {
        if (!item.connectorStart || !item.connectorEnd) return;
        const start = { x: item.x + item.connectorStart.x, y: item.y + item.connectorStart.y };
        const end = { x: item.x + item.connectorEnd.x, y: item.y + item.connectorEnd.y };
        const c = item.color ?? "#5355c9";
        const w = item.weight ?? 3;
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(start.x, start.y);
        if (item.connectorRouting === "elbow") { const mid = (start.x + end.x) / 2; ctx.lineTo(mid, start.y); ctx.lineTo(mid, end.y); ctx.lineTo(end.x, end.y); }
        else ctx.lineTo(end.x, end.y);
        ctx.stroke();
        if (item.connectorStyle !== "line") {
          const endFrom = item.connectorRouting === "elbow" ? { x: (start.x + end.x) / 2, y: end.y } : start;
          drawArrowHead(endFrom, end, c, Math.max(8, w * 3.5));
        }
        if (item.connectorStyle === "double") {
          const startFrom = item.connectorRouting === "elbow" ? { x: (start.x + end.x) / 2, y: start.y } : end;
          drawArrowHead(startFrom, start, c, Math.max(8, w * 3.5));
        }
        if (item.text.trim()) {
          const cx = (start.x + end.x) / 2, cy = (start.y + end.y) / 2;
          ctx.font = "600 13px Arial, sans-serif"; const label = item.text.length > 28 ? item.text.slice(0, 27) + "…" : item.text;
          const tw = Math.min(190, ctx.measureText(label).width + 18);
          ctx.fillStyle = "rgba(255,255,255,.95)"; roundedRect(cx - tw / 2, cy - 13, tw, 26, 8); ctx.fill();
          ctx.fillStyle = "#343741"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(label, cx, cy); ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";
        }
      };
      const loadImage = async (item: Item) => {
        if (!item.assetId) return null;
        const blob = await getAsset(item.assetId, boardSummary.id);
        if (!blob) return null;
        const url = URL.createObjectURL(blob);
        try {
          return await new Promise<HTMLImageElement | null>((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = url;
          });
        } finally { window.setTimeout(() => URL.revokeObjectURL(url), 0); }
      };

      for (const item of source) {
        if (item.kind === "connector") { drawConnector(item); continue; }
        ctx.save();
        const cx = item.x + item.width / 2, cy = item.y + item.height / 2;
        if (item.rotation) { ctx.translate(cx, cy); ctx.rotate(item.rotation * Math.PI / 180); ctx.translate(-cx, -cy); }
        if (item.kind === "pen" || item.kind === "marker") {
          if (item.points?.length) {
            ctx.globalAlpha = item.kind === "marker" ? .32 : 1;
            ctx.strokeStyle = item.color ?? "#000"; ctx.lineWidth = item.weight ?? 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
            ctx.beginPath(); item.points.forEach((pt, index) => { const x = item.x + pt.x, y = item.y + pt.y; index ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke();
          }
        } else if (item.kind === "frame") {
          ctx.strokeStyle = item.color ?? "#8b8f9a"; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); roundedRect(item.x, item.y, item.width, item.height, 14); ctx.stroke(); ctx.setLineDash([]);
          ctx.font = "700 18px Arial, sans-serif"; ctx.fillStyle = item.color ?? "#525866"; ctx.fillText(item.text || "Без названия", item.x + 16, item.y + 28);
        } else if (item.kind === "comment") {
          ctx.fillStyle = item.resolved ? "#edf8ef" : (item.color ?? "#fff8d6"); roundedRect(item.x, item.y, item.width, item.height, 12); ctx.fill();
          ctx.fillStyle = item.resolved ? "#3f7b50" : "#8a6b22"; ctx.font = "700 12px Arial, sans-serif"; ctx.fillText(item.resolved ? "Решено" : "Комментарий", item.x + 14, item.y + 24);
          ctx.fillStyle = "#30343d"; ctx.font = "14px Arial, sans-serif"; wrapText(item.text, item.x + 14, item.y + 48, Math.max(30, item.width - 28), 19, 8);
        } else if (item.kind === "table") {
          const rows = Math.max(1, item.tableRows ?? 3), cols = Math.max(1, item.tableCols ?? 3);
          const cw = item.width / cols, ch = item.height / rows;
          const tableFont = Math.max(9, Math.min(32, item.fontSize ?? 13));
          const tableHeader = item.tableHeader !== false;
          ctx.fillStyle = "#fff"; ctx.fillRect(item.x, item.y, item.width, item.height);
          ctx.strokeStyle = "#d7dbe4"; ctx.lineWidth = 1; ctx.font = `${tableFont}px Arial, sans-serif`;
          for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const x = item.x + c * cw, y = item.y + r * ch;
            if (tableHeader && r === 0) { ctx.fillStyle = "#f2f3f8"; ctx.fillRect(x, y, cw, ch); }
            ctx.strokeRect(x, y, cw, ch);
            ctx.fillStyle = "#30343d"; wrapText(item.tableCells?.[r * cols + c] ?? "", x + 7, y + tableFont + 6, Math.max(12, cw - 14), tableFont * 1.25, Math.max(1, Math.floor(ch / (tableFont * 1.25)) - 1));
          }
        } else if (item.kind === "checklist") {
          const entries = item.checklistItems?.length ? item.checklistItems : ["Новый пункт"];
          const done = item.checklistDone ?? entries.map(() => false);
          const fs = Math.max(10, Math.min(32, item.fontSize ?? 15));
          const accent = item.color ?? "#5355c9";
          ctx.fillStyle = "#fff"; roundedRect(item.x, item.y, item.width, item.height, 12); ctx.fill();
          ctx.strokeStyle = "#e0e3e9"; ctx.lineWidth = 1; roundedRect(item.x, item.y, item.width, item.height, 12); ctx.stroke();
          ctx.fillStyle = "#252733"; ctx.font = `700 ${Math.max(14, fs + 1)}px Arial, sans-serif`; ctx.fillText(item.text || "Чек-лист", item.x + 16, item.y + 28);
          let yy = item.y + 54; ctx.font = `${fs}px Arial, sans-serif`;
          entries.slice(0, 20).forEach((entry, index) => {
            const box = Math.max(12, fs - 1); ctx.strokeStyle = accent; ctx.lineWidth = 1.8; roundedRect(item.x + 16, yy - box + 2, box, box, 3); ctx.stroke();
            if (done[index]) { ctx.fillStyle = accent; roundedRect(item.x + 16, yy - box + 2, box, box, 3); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = `700 ${Math.max(10, fs - 2)}px Arial`; ctx.fillText("✓", item.x + 18, yy); }
            ctx.fillStyle = done[index] ? "#8a909d" : "#30343d"; ctx.font = `${fs}px Arial, sans-serif`; ctx.fillText((entry || "Пустой пункт").slice(0, 70), item.x + 16 + box + 9, yy);
            if (done[index]) { ctx.strokeStyle = "#a4a9b3"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(item.x + 16 + box + 9, yy - fs * .35); ctx.lineTo(Math.min(item.x + item.width - 16, item.x + 16 + box + 9 + ctx.measureText((entry || "Пустой пункт").slice(0,70)).width), yy - fs * .35); ctx.stroke(); }
            yy += fs * 1.75;
          });
        } else if (item.kind === "quiz") {
          const options = item.quizOptions?.length ? item.quizOptions : ["Вариант 1", "Вариант 2"];
          const correct = Math.max(0, Math.min(options.length - 1, item.quizCorrect ?? 0));
          const selectedAnswer = item.quizSelected;
          const revealed = item.quizRevealed === true;
          const fs = Math.max(10, Math.min(32, item.fontSize ?? 15));
          const accent = item.color ?? "#5355c9";
          ctx.fillStyle = "#fff"; roundedRect(item.x, item.y, item.width, item.height, 12); ctx.fill();
          ctx.strokeStyle = "#e0e3e9"; ctx.lineWidth = 1; roundedRect(item.x, item.y, item.width, item.height, 12); ctx.stroke();
          ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(item.x + 28, item.y + 28, 13, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = "#fff"; ctx.font = "700 16px Arial, sans-serif"; ctx.textAlign = "center"; ctx.fillText("?", item.x + 28, item.y + 34); ctx.textAlign = "start";
          ctx.fillStyle = "#252733"; ctx.font = `700 ${Math.max(14, fs + 1)}px Arial, sans-serif`;
          wrapText(item.text || "Вопрос", item.x + 50, item.y + 28, Math.max(40, item.width - 68), fs * 1.35, 3);
          let yy = item.y + 78;
          const rowH = Math.max(34, fs * 2.15);
          options.slice(0, 8).forEach((option, index) => {
            const isCorrect = revealed && index === correct;
            const isWrong = revealed && selectedAnswer === index && index !== correct;
            ctx.fillStyle = isCorrect ? "#edf8ef" : isWrong ? "#fff0f1" : selectedAnswer === index ? `${accent}14` : "#f9fafb";
            ctx.strokeStyle = isCorrect ? "#53a86a" : isWrong ? "#d76676" : selectedAnswer === index ? accent : "#e1e4e9";
            ctx.lineWidth = selectedAnswer === index || isCorrect || isWrong ? 1.8 : 1;
            roundedRect(item.x + 16, yy, item.width - 32, rowH - 6, 8); ctx.fill(); ctx.stroke();
            ctx.fillStyle = isCorrect ? "#438a57" : isWrong ? "#b94b5c" : accent;
            ctx.font = `700 ${Math.max(10, fs - 1)}px Arial, sans-serif`;
            ctx.fillText(String.fromCharCode(65 + index), item.x + 28, yy + rowH / 2 + 2);
            ctx.fillStyle = "#343944"; ctx.font = `${fs}px Arial, sans-serif`;
            ctx.fillText((option || `Вариант ${index + 1}`).slice(0, 70), item.x + 54, yy + rowH / 2 + 2);
            yy += rowH;
          });
          if (revealed && item.quizExplanation?.trim()) {
            ctx.fillStyle = "#66707e"; ctx.font = `${Math.max(10, fs - 2)}px Arial, sans-serif`;
            wrapText(item.quizExplanation, item.x + 16, Math.min(item.y + item.height - 34, yy + 4), item.width - 32, fs * 1.2, 2);
          }
        } else if (item.kind === "flashcard") {
          const fs = Math.max(10, Math.min(48, item.fontSize ?? 18));
          const accent = item.color ?? "#5355c9";
          const flipped = item.flashcardFlipped === true;
          ctx.fillStyle = "#fff"; roundedRect(item.x, item.y, item.width, item.height, 14); ctx.fill();
          ctx.strokeStyle = accent; ctx.globalAlpha = .35; ctx.lineWidth = 2; roundedRect(item.x, item.y, item.width, item.height, 14); ctx.stroke(); ctx.globalAlpha = 1;
          ctx.fillStyle = accent; ctx.font = "700 11px Arial, sans-serif"; ctx.fillText(flipped ? "ОТВЕТ" : "ВОПРОС", item.x + 18, item.y + 26);
          ctx.fillStyle = "#2d313a"; ctx.font = `${fs}px Arial, sans-serif`; wrapText(flipped ? (item.flashcardBack || "Ответ") : (item.text || "Вопрос"), item.x + 18, item.y + 58, item.width - 36, fs * 1.35, Math.max(2, Math.floor((item.height - 86) / (fs * 1.35))));
        } else if (item.kind === "cover") {
          const fs = Math.max(10, Math.min(48, item.fontSize ?? 17));
          const accent = item.color ?? "#5355c9";
          if (item.coverOpen) {
            ctx.globalAlpha = .10; ctx.fillStyle = accent; roundedRect(item.x, item.y, item.width, item.height, 12); ctx.fill(); ctx.globalAlpha = 1;
            ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.setLineDash([7, 6]); roundedRect(item.x, item.y, item.width, item.height, 12); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = accent; ctx.font = `700 ${Math.max(12, fs - 2)}px Arial, sans-serif`; ctx.fillText("Ответ открыт", item.x + 16, item.y + 28);
          } else {
            ctx.fillStyle = accent; roundedRect(item.x, item.y, item.width, item.height, 12); ctx.fill();
            ctx.fillStyle = "#fff"; ctx.font = `700 ${fs}px Arial, sans-serif`; wrapText(item.text || "Открыть ответ", item.x + 18, item.y + Math.min(item.height / 2, fs + 26), item.width - 36, fs * 1.3, 4);
          }
        } else if (item.kind === "formula") {
          ctx.fillStyle = "#fff"; roundedRect(item.x, item.y, item.width, item.height, 10); ctx.fill();
          ctx.strokeStyle = "#e0e3e9"; ctx.lineWidth = 1; roundedRect(item.x, item.y, item.width, item.height, 10); ctx.stroke();
          const formulaSize = Math.max(12, Math.min(96, item.fontSize ?? 28));
          ctx.fillStyle = item.color ?? "#20242c"; ctx.font = `italic ${formulaSize}px Georgia, serif`;
          wrapText(formulaToPlainText(item.text), item.x + 18, item.y + Math.min(item.height - 16, formulaSize + 18), Math.max(30, item.width - 36), formulaSize * 1.32, Math.max(1, Math.floor((item.height - 24) / (formulaSize * 1.32))));
        } else if (item.kind === "sticky") {
          ctx.fillStyle = item.color ?? "#fff3a6"; roundedRect(item.x, item.y, item.width, item.height, 10); ctx.fill();
          ctx.fillStyle = "#252733"; ctx.font = `${item.fontSize ?? 20}px Arial, sans-serif`; wrapText(item.text, item.x + 14, item.y + 30, Math.max(20, item.width - 28), (item.fontSize ?? 20) * 1.25, 18);
        } else if (item.kind === "text") {
          ctx.fillStyle = "#252733"; ctx.font = `${item.fontSize ?? 20}px Arial, sans-serif`; wrapText(item.text, item.x, item.y + (item.fontSize ?? 20), Math.max(20, item.width), (item.fontSize ?? 20) * 1.25, 30);
        } else if (item.kind === "shape") {
          const c = item.color ?? "#6064d4"; ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = 3;
          if (item.shapeType === "ellipse") { ctx.beginPath(); ctx.ellipse(cx, cy, item.width / 2 - 3, item.height / 2 - 3, 0, 0, Math.PI * 2); ctx.stroke(); }
          else if (item.shapeType === "diamond") { ctx.beginPath(); ctx.moveTo(cx, item.y + 3); ctx.lineTo(item.x + item.width - 3, cy); ctx.lineTo(cx, item.y + item.height - 3); ctx.lineTo(item.x + 3, cy); ctx.closePath(); ctx.stroke(); }
          else if (item.shapeType === "triangle") { ctx.beginPath(); ctx.moveTo(cx, item.y + 3); ctx.lineTo(item.x + item.width - 4, item.y + item.height - 4); ctx.lineTo(item.x + 4, item.y + item.height - 4); ctx.closePath(); ctx.fill(); }
          else if (item.shapeType === "arrow") { ctx.beginPath(); ctx.moveTo(item.x + 4, cy - item.height * .12); ctx.lineTo(item.x + item.width * .62, cy - item.height * .12); ctx.lineTo(item.x + item.width * .62, item.y + item.height * .2); ctx.lineTo(item.x + item.width - 4, cy); ctx.lineTo(item.x + item.width * .62, item.y + item.height * .8); ctx.lineTo(item.x + item.width * .62, cy + item.height * .12); ctx.lineTo(item.x + 4, cy + item.height * .12); ctx.closePath(); ctx.fill(); }
          else if (item.shapeType === "hexagon") { ctx.beginPath(); ctx.moveTo(item.x + item.width * .25, item.y + 3); ctx.lineTo(item.x + item.width * .75, item.y + 3); ctx.lineTo(item.x + item.width - 3, cy); ctx.lineTo(item.x + item.width * .75, item.y + item.height - 3); ctx.lineTo(item.x + item.width * .25, item.y + item.height - 3); ctx.lineTo(item.x + 3, cy); ctx.closePath(); ctx.fill(); }
          else if (item.shapeType === "star") { ctx.beginPath(); for (let n = 0; n < 10; n++) { const a = -Math.PI / 2 + n * Math.PI / 5; const r = n % 2 === 0 ? Math.min(item.width, item.height) * .46 : Math.min(item.width, item.height) * .2; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; n ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); ctx.fill(); }
          else { roundedRect(item.x + 2, item.y + 2, item.width - 4, item.height - 4, item.shapeType === "rounded" ? 14 : 2); ctx.stroke(); }
        } else if (item.kind === "image") {
          const img = await loadImage(item);
          if (img) { ctx.save(); roundedRect(item.x, item.y, item.width, item.height, 8); ctx.clip(); ctx.drawImage(img, item.x, item.y, item.width, item.height); ctx.restore(); }
          else { ctx.fillStyle = "#eef0f4"; roundedRect(item.x, item.y, item.width, item.height, 8); ctx.fill(); }
        } else if (item.kind === "pdf") {
          ctx.fillStyle = "#fff"; ctx.strokeStyle = "#d8dce5"; ctx.lineWidth = 1.5; roundedRect(item.x, item.y, item.width, item.height, 8); ctx.fill(); ctx.stroke();
          ctx.fillStyle = "#dc4c64"; ctx.font = "700 24px Arial, sans-serif"; ctx.fillText("PDF", item.x + 18, item.y + 38);
          ctx.fillStyle = "#4a4f5c"; ctx.font = "14px Arial, sans-serif"; wrapText(item.name ?? "Документ PDF", item.x + 18, item.y + 66, Math.max(30, item.width - 36), 19, 3);
        }
        ctx.restore();
      }
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", .96));
      if (!blob) throw new Error("Не удалось создать PNG");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url;
      const base = (title || "board").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 70);
      const suffix = scope === "selection" ? "_selection" : scope === "frame" ? `_${(frameForExport?.text || "frame").replace(/[\/:*?"<>|]+/g, "_").slice(0, 40)}` : "";
      a.download = `${base}${suffix}.png`; a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(`PNG сохранён · ${canvas.width} × ${canvas.height}`);
    } catch (error) {
      setNotice(error instanceof Error ? `Не удалось экспортировать PNG: ${error.message}` : "Не удалось экспортировать PNG");
    }
  };

  const copySelected = () => {
    if (!selected.length) return;
    const ids = expandedIdsForFrameSelection(selected);
    clipboard.current = itemsRef.current
      .filter((item) => ids.includes(item.id))
      .map(deepItem);
    setNotice(`Скопировано объектов: ${clipboard.current.length}`);
  };

  const duplicateSelected = () => {
    if (!selected.length) return;
    const ids = expandedIdsForFrameSelection(selected);
    const copies = cloneItems(itemsRef.current.filter((item) => ids.includes(item.id)));
    commit([...itemsRef.current, ...copies]);
    setSelected(copies.map((item) => item.id));
    setNotice(ids.length > selected.length ? `Фрейм продублирован вместе с содержимым: ${copies.length}` : `Создано копий: ${copies.length}`);
  };

  const pasteClipboard = () => {
    if (!clipboard.current.length) return;
    const copies = cloneItems(clipboard.current);
    clipboard.current = copies.map(deepItem);
    commit([...itemsRef.current, ...copies]);
    setSelected(copies.map((item) => item.id));
  };

  const deleteSelected = () => {
    if (!selected.length) return;
    const lockedIds = new Set(itemsRef.current.filter((item) => selected.includes(item.id) && item.locked).map((item) => item.id));
    const deletable = selected.filter((id) => !lockedIds.has(id));
    if (!deletable.length) {
      setNotice("Сначала разблокируйте выбранные объекты");
      return;
    }
    commit(itemsRef.current.filter((item) => !deletable.includes(item.id)));
    setSelected(selected.filter((id) => lockedIds.has(id)));
  };

  const moveLayer = (front: boolean) => {
    if (!selected.length || selectionLocked) return;
    const chosen = itemsRef.current.filter((item) => selected.includes(item.id));
    const rest = itemsRef.current.filter((item) => !selected.includes(item.id));
    commit(front ? [...rest, ...chosen] : [...chosen, ...rest]);
  };

  const moveLayerStep = (forward: boolean) => {
    if (!selected.length || selectionLocked) return;
    const next = [...itemsRef.current];
    const chosen = new Set(selected);
    if (forward) {
      for (let i = next.length - 2; i >= 0; i--) {
        if (chosen.has(next[i].id) && !chosen.has(next[i + 1].id)) {
          [next[i], next[i + 1]] = [next[i + 1], next[i]];
        }
      }
    } else {
      for (let i = 1; i < next.length; i++) {
        if (chosen.has(next[i].id) && !chosen.has(next[i - 1].id)) {
          [next[i], next[i - 1]] = [next[i - 1], next[i]];
        }
      }
    }
    commit(next);
  };

  const groupSelected = () => {
    if (selected.length < 2 || selectionLocked) return;
    const groupId = crypto.randomUUID();
    commit(itemsRef.current.map((item) => selected.includes(item.id) ? { ...item, groupId } : item));
    setNotice(`Сгруппировано объектов: ${selected.length}`);
  };

  const ungroupSelected = () => {
    const groupIds = new Set(
      itemsRef.current
        .filter((item) => selected.includes(item.id) && item.groupId)
        .map((item) => item.groupId!),
    );
    if (!groupIds.size || selectionLocked) return;
    commit(itemsRef.current.map((item) => item.groupId && groupIds.has(item.groupId) ? { ...item, groupId: undefined } : item));
    setNotice("Группа разобрана");
  };

  const toggleLockSelected = () => {
    if (!selected.length) return;
    const shouldLock = selectedItems.some((item) => !item.locked);
    commit(itemsRef.current.map((item) => selected.includes(item.id) ? { ...item, locked: shouldLock } : item));
    setNotice(shouldLock ? "Объекты заблокированы" : "Объекты разблокированы");
  };

  const alignSelected = (mode: "left" | "hcenter" | "right" | "top" | "vcenter" | "bottom") => {
    if (selectionLocked) return;
    const chosen = itemsRef.current.filter((i) => selected.includes(i.id));
    const bounds = boundsOf(chosen);
    if (!bounds || chosen.length < 2) return;
    const ids = new Set(chosen.map((i) => i.id));
    commit(itemsRef.current.map((item) => {
      if (!ids.has(item.id)) return item;
      if (mode === "left") return { ...item, x: bounds.x };
      if (mode === "hcenter") return { ...item, x: bounds.x + (bounds.width - item.width) / 2 };
      if (mode === "right") return { ...item, x: bounds.x + bounds.width - item.width };
      if (mode === "top") return { ...item, y: bounds.y };
      if (mode === "vcenter") return { ...item, y: bounds.y + (bounds.height - item.height) / 2 };
      return { ...item, y: bounds.y + bounds.height - item.height };
    }));
  };

  const equalizeSelectedSize = (axis: "width" | "height" | "both") => {
    const selectedItems = itemsRef.current.filter((item) => selected.includes(item.id) && !item.locked);
    if (selectedItems.length < 2) return;
    const reference = selectedItems[0];
    const ids = new Set(selectedItems.map((item) => item.id));
    commit(itemsRef.current.map((item) => !ids.has(item.id) ? item : {
      ...item,
      ...(axis === "width" || axis === "both" ? { width: reference.width } : {}),
      ...(axis === "height" || axis === "both" ? { height: reference.height } : {}),
    }));
    setNotice(axis === "both" ? "Размер объектов выровнен" : axis === "width" ? "Ширина объектов выровнена" : "Высота объектов выровнена");
  };

  const distributeSelected = (axis: "x" | "y") => {
    if (selectionLocked) return;
    const chosen = itemsRef.current.filter((i) => selected.includes(i.id));
    if (chosen.length < 3) return;
    const sorted = [...chosen].sort((a, b) => axis === "x" ? a.x - b.x : a.y - b.y);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const totalSize = sorted.reduce((sum, i) => sum + (axis === "x" ? i.width : i.height), 0);
    const span = axis === "x"
      ? (last.x + last.width - first.x)
      : (last.y + last.height - first.y);
    const gap = (span - totalSize) / (sorted.length - 1);
    let cursor = axis === "x" ? first.x : first.y;
    const positions = new Map<string, number>();
    for (const item of sorted) {
      positions.set(item.id, cursor);
      cursor += (axis === "x" ? item.width : item.height) + gap;
    }
    commit(itemsRef.current.map((item) => {
      const pos = positions.get(item.id);
      if (pos == null) return item;
      return axis === "x" ? { ...item, x: pos } : { ...item, y: pos };
    }));
  };

  const rotateSelected = (degrees: number) => {
    if (!selected.length || selectionLocked) return;
    const chosen = itemsRef.current.filter((item) => selected.includes(item.id));
    const bounds = boundsOf(chosen);
    if (!bounds) return;
    if (chosen.length === 1) {
      commit(itemsRef.current.map((item) =>
        selected.includes(item.id)
          ? { ...item, rotation: (((item.rotation ?? 0) + degrees) % 360 + 360) % 360 }
          : item,
      ));
      return;
    }
    const cx = bounds.x + bounds.width / 2;
    const cy = bounds.y + bounds.height / 2;
    const rad = degrees * Math.PI / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    commit(itemsRef.current.map((item) => {
      if (!selected.includes(item.id)) return item;
      const ox = item.x + item.width / 2 - cx;
      const oy = item.y + item.height / 2 - cy;
      const ncx = cx + ox * cos - oy * sin;
      const ncy = cy + ox * sin + oy * cos;
      return {
        ...item,
        x: ncx - item.width / 2,
        y: ncy - item.height / 2,
        rotation: (((item.rotation ?? 0) + degrees) % 360 + 360) % 360,
      };
    }));
  };

  const resetRotationSelected = () => {
    if (!selected.length || selectionLocked) return;
    commit(itemsRef.current.map((item) => selected.includes(item.id) ? { ...item, rotation: 0 } : item));
  };

  const renameSelectedFrame = () => {
    if (!singleSelected || singleSelected.kind !== "frame" || singleSelected.locked) return;
    startEdit(singleSelected);
  };

  const selectFrameContents = () => {
    if (!singleSelected || singleSelected.kind !== "frame") return;
    const frame = singleSelected;
    const contained = itemsRef.current.filter((item) => {
      if (item.id === frame.id || item.hidden || item.kind === "frame") return false;
      const cx = item.x + item.width / 2;
      const cy = item.y + item.height / 2;
      return cx >= frame.x && cx <= frame.x + frame.width && cy >= frame.y && cy <= frame.y + frame.height;
    });
    setSelected([frame.id, ...contained.map((item) => item.id)]);
    setNotice(contained.length ? `Выбрано объектов во фрейме: ${contained.length}` : "Во фрейме пока нет объектов");
  };

  const resizeSelectedFrame = (ratio: "16:9" | "4:3" | "A4") => {
    if (!singleSelected || singleSelected.kind !== "frame" || selectionLocked) return;
    const centerX = singleSelected.x + singleSelected.width / 2;
    const centerY = singleSelected.y + singleSelected.height / 2;
    const next = ratio === "16:9"
      ? { width: 800, height: 450 }
      : ratio === "4:3"
        ? { width: 720, height: 540 }
        : { width: 760, height: 538 };
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? {
      ...item,
      width: next.width,
      height: next.height,
      x: centerX - next.width / 2,
      y: centerY - next.height / 2,
    } : item));
  };

  const fitSelectedFrameToContents = () => {
    if (!singleSelected || singleSelected.kind !== "frame" || selectionLocked) return;
    const content = containedByFrame(singleSelected, itemsRef.current);
    const contentBounds = boundsOf(content);
    if (!contentBounds) {
      setNotice("Во фрейме пока нет объектов");
      return;
    }
    const padX = 48;
    const padBottom = 48;
    const titleSpace = 72;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? {
      ...item,
      x: contentBounds.x - padX,
      y: contentBounds.y - titleSpace,
      width: contentBounds.width + padX * 2,
      height: contentBounds.height + titleSpace + padBottom,
    } : item));
    setNotice(`Фрейм подогнан по содержимому: ${content.length}`);
  };

  const createFrameAroundSelection = () => {
    const chosen = itemsRef.current.filter((item) => selected.includes(item.id) && item.kind !== "frame" && !item.hidden);
    const chosenBounds = boundsOf(chosen);
    if (!chosenBounds) return;
    const padX = 52;
    const titleSpace = 76;
    const padBottom = 52;
    const count = itemsRef.current.filter((item) => item.kind === "frame").length + 1;
    const frame: Item = {
      id: crypto.randomUUID(),
      kind: "frame",
      x: chosenBounds.x - padX,
      y: chosenBounds.y - titleSpace,
      width: chosenBounds.width + padX * 2,
      height: chosenBounds.height + titleSpace + padBottom,
      text: `Раздел ${count}`,
      color: "#8b8f9a",
      presentationOrder: nextPresentationOrder(),
    };
    commit([frame, ...itemsRef.current]);
    setSelected([frame.id]);
    setNotice(`Создан фрейм вокруг объектов: ${chosen.length}`);
    window.setTimeout(() => startEdit(frame), 0);
  };

  const openGraphEditor = (item: Item) => {
    if(item.kind!=="graph"||item.locked)return; setSelected([item.id]); setGraphEditorId(item.id);
    setGraphDraft({type:item.graphType??"quadratic",a:item.graphA??1,b:item.graphB??0,c:item.graphC??0,xMin:item.graphXMin??-10,xMax:item.graphXMax??10,yMin:item.graphYMin??-10,yMax:item.graphYMax??10,grid:item.graphGrid!==false,points:(item.graphPoints??[]).map(p=>({...p})),showLabels:item.graphShowLabels!==false,snap:item.graphSnap!==false,axisLabels:item.graphAxisLabels!==false,gridStep:item.graphGridStep??1,showCurve:item.graphShowCurve!==false,projections:item.graphProjections===true,segments:(item.graphSegments??[]).map(s=>({...s})),angles:(item.graphAngles??[]).map(g=>({...g})),circles:(item.graphCircles??[]).map(g=>({...g})),polygons:(item.graphPolygons??[]).map(g=>({...g,points:[...g.points]})),midpoints:(item.graphMidpoints??[]).map(g=>({...g}))});
  };
  const closeGraphEditor=()=>{setGraphEditorId(null);setGraphDraft(null)};
  const copyGraphPoints = async () => { if(!graphDraft?.points.length){setNotice("На плоскости пока нет точек");return} const value=graphDraft.points.map((p,i)=>`${p.label||String.fromCharCode(65+i)}\t${p.x}\t${p.y}`).join("\n"); try{await navigator.clipboard.writeText(value);setNotice("Координаты точек скопированы")}catch{setNotice("Не удалось скопировать координаты")} };
  const autoFitGraph = () => { if(!graphDraft)return; if(!graphDraft.points.length){setGraphDraft({...graphDraft,xMin:-10,xMax:10,yMin:-10,yMax:10});return} const xs=graphDraft.points.map(p=>p.x),ys=graphDraft.points.map(p=>p.y),dx=Math.max(2,(Math.max(...xs)-Math.min(...xs))*.15),dy=Math.max(2,(Math.max(...ys)-Math.min(...ys))*.15); setGraphDraft({...graphDraft,xMin:Math.floor(Math.min(...xs)-dx),xMax:Math.ceil(Math.max(...xs)+dx),yMin:Math.floor(Math.min(...ys)-dy),yMax:Math.ceil(Math.max(...ys)+dy)}); };
  const saveGraphEditor=()=>{if(!graphEditorId||!graphDraft){closeGraphEditor();return} const d={...graphDraft,xMin:Math.min(graphDraft.xMin,graphDraft.xMax-1),xMax:Math.max(graphDraft.xMax,graphDraft.xMin+1),yMin:Math.min(graphDraft.yMin,graphDraft.yMax-1),yMax:Math.max(graphDraft.yMax,graphDraft.yMin+1)}; commit(itemsRef.current.map(item=>item.id===graphEditorId?{...item,graphType:d.type,graphA:d.a,graphB:d.b,graphC:d.c,graphXMin:d.xMin,graphXMax:d.xMax,graphYMin:d.yMin,graphYMax:d.yMax,graphGrid:d.grid,graphPoints:d.points,graphShowLabels:d.showLabels,graphSnap:d.snap,graphAxisLabels:d.axisLabels,graphGridStep:d.gridStep,graphShowCurve:d.showCurve,graphProjections:d.projections,graphSegments:d.segments,graphAngles:d.angles,graphCircles:d.circles,graphPolygons:d.polygons,graphMidpoints:d.midpoints}:item)); closeGraphEditor(); setNotice("График сохранён")};

  const openFormulaEditor = (item: Item) => {
    if (item.kind !== "formula" || item.locked) return;
    if (editing) finishEdit();
    setSelected([item.id]);
    setTool("select");
    setFormulaEditorId(item.id);
    setFormulaDraft({ text: item.text, fontSize: Math.max(12, Math.min(96, item.fontSize ?? 28)), color: item.color ?? "#20242c" });
    setFormulaPaletteTab("basic");
    window.setTimeout(() => { formulaInput.current?.focus(); formulaInput.current?.setSelectionRange(item.text.length, item.text.length); }, 0);
  };

  const closeFormulaEditor = () => {
    setFormulaEditorId(null);
    setFormulaDraft(null);
  };

  const saveFormulaEditor = () => {
    if (!formulaEditorId || !formulaDraft) { closeFormulaEditor(); return; }
    const textValue = formulaDraft.text.slice(0, 10000);
    const fontSize = Math.max(12, Math.min(96, Math.round(formulaDraft.fontSize)));
    if (textValue.trim()) { const history=[textValue,...formulaHistory.filter((value)=>value!==textValue)].slice(0,12); setFormulaHistory(history); localStorage.setItem("onlinerepetitor.formula-history.v54",JSON.stringify(history)); }
    commit(itemsRef.current.map((item) => item.id === formulaEditorId ? {
      ...item,
      text: textValue,
      fontSize,
      color: formulaDraft.color,
    } : item));
    closeFormulaEditor();
    setNotice("Формула сохранена");
  };

  const insertFormulaSnippet = (rawSnippet: string, replaceAll = false) => {
    if (!formulaDraft) return;
    const input = formulaInput.current;
    const start = replaceAll ? 0 : (input?.selectionStart ?? formulaDraft.text.length);
    const end = replaceAll ? formulaDraft.text.length : (input?.selectionEnd ?? start);
    const openMark = rawSnippet.indexOf("⟦"), closeMark = rawSnippet.indexOf("⟧");
    const cleaned = rawSnippet.replace("⟦", "").replace("⟧", "");
    let selectStart = start + cleaned.length, selectEnd = selectStart;
    if (openMark >= 0 && closeMark > openMark) {
      selectStart = start + openMark;
      selectEnd = start + closeMark - 1;
    }
    const nextText = replaceAll ? cleaned : formulaDraft.text.slice(0, start) + cleaned + formulaDraft.text.slice(end);
    setFormulaDraft({ ...formulaDraft, text: nextText });
    window.setTimeout(() => {
      formulaInput.current?.focus();
      formulaInput.current?.setSelectionRange(selectStart, selectEnd);
    }, 0);
  };

  const pasteFormulaSource = async () => { if(!formulaDraft)return; try{const value=(await navigator.clipboard.readText()).slice(0,10000);if(!value.trim()){setNotice("Буфер обмена пуст");return}setFormulaDraft({...formulaDraft,text:value});window.setTimeout(()=>formulaInput.current?.focus(),0)}catch{setNotice("Браузер не дал прочитать буфер обмена")} };
  const copyFormulaSource = async () => {
    if (!formulaDraft) return;
    try {
      await navigator.clipboard.writeText(formulaDraft.text);
      setNotice("Запись формулы скопирована");
    } catch {
      setNotice("Не удалось скопировать формулу");
    }
  };

  const openTableEditor = (item: Item) => {
    if (item.kind !== "table" || item.locked) return;
    const rows = Math.max(1, item.tableRows ?? 3);
    const cols = Math.max(1, item.tableCols ?? 3);
    const cells = Array.from({ length: rows * cols }, (_, index) => item.tableCells?.[index] ?? "");
    setSelected([item.id]);
    setTableEditorId(item.id);
    setTableDraft({ rows, cols, cells, header: item.tableHeader !== false, fontSize: item.fontSize ?? 13, align: item.tableAlign ?? "left", stripe: item.tableStripe === true, compact: item.tableCompact === true });
  };

  const resizeTableDraft = (rowsDelta: number, colsDelta: number) => {
    setTableDraft((current) => {
      if (!current) return current;
      const rows = Math.max(1, Math.min(20, current.rows + rowsDelta));
      const cols = Math.max(1, Math.min(12, current.cols + colsDelta));
      const cells = Array.from({ length: rows * cols }, (_, index) => {
        const row = Math.floor(index / cols), col = index % cols;
        return row < current.rows && col < current.cols ? current.cells[row * current.cols + col] ?? "" : "";
      });
      return { ...current, rows, cols, cells };
    });
  };

  const addTableRowAt = (at: number) => setTableDraft((current) => {
    if (!current || current.rows >= 20) return current;
    const row = Math.max(0, Math.min(current.rows, at));
    const cells = [...current.cells];
    cells.splice(row * current.cols, 0, ...Array(current.cols).fill(""));
    return { ...current, rows: current.rows + 1, cells };
  });
  const removeTableRowAt = (at: number) => setTableDraft((current) => {
    if (!current || current.rows <= 1) return current;
    const row = Math.max(0, Math.min(current.rows - 1, at));
    const cells = [...current.cells];
    cells.splice(row * current.cols, current.cols);
    return { ...current, rows: current.rows - 1, cells };
  });
  const addTableColAt = (at: number) => setTableDraft((current) => {
    if (!current || current.cols >= 12) return current;
    const col = Math.max(0, Math.min(current.cols, at));
    const nextCols = current.cols + 1;
    const cells = Array.from({ length: current.rows * nextCols }, (_, index) => {
      const row = Math.floor(index / nextCols), nextCol = index % nextCols;
      if (nextCol === col) return "";
      const oldCol = nextCol > col ? nextCol - 1 : nextCol;
      return current.cells[row * current.cols + oldCol] ?? "";
    });
    return { ...current, cols: nextCols, cells };
  });
  const removeTableColAt = (at: number) => setTableDraft((current) => {
    if (!current || current.cols <= 1) return current;
    const col = Math.max(0, Math.min(current.cols - 1, at));
    const nextCols = current.cols - 1;
    const cells = Array.from({ length: current.rows * nextCols }, (_, index) => {
      const row = Math.floor(index / nextCols), nextCol = index % nextCols;
      const oldCol = nextCol >= col ? nextCol + 1 : nextCol;
      return current.cells[row * current.cols + oldCol] ?? "";
    });
    return { ...current, cols: nextCols, cells };
  });

  const copyTableTsv = async () => { if(!tableDraft)return; const value=Array.from({length:tableDraft.rows},(_,r)=>Array.from({length:tableDraft.cols},(_,c)=>tableDraft.cells[r*tableDraft.cols+c]??"").map(v=>v.replace(/\t/g," ").replace(/\r?\n/g," ")).join("\t")).join("\n"); try{await navigator.clipboard.writeText(value);setNotice("Таблица скопирована как TSV")}catch{setNotice("Не удалось скопировать таблицу")} };
  const pasteTableTsv = async () => { if(!tableDraft)return; try{const raw=await navigator.clipboard.readText(),lines=raw.replace(/\r/g,"").split("\n").filter((line,i,a)=>line.length>0||i<a.length-1),matrix=lines.map(line=>line.split("\t"));if(!matrix.length||!matrix.some(row=>row.some(cell=>cell.trim()))){setNotice("В буфере нет табличных данных");return}const rows=Math.min(20,matrix.length),cols=Math.min(12,Math.max(1,...matrix.map(row=>row.length))),cells=Array.from({length:rows*cols},(_,i)=>(matrix[Math.floor(i/cols)]?.[i%cols]??"").slice(0,2000));setTableDraft({...tableDraft,rows,cols,cells});setNotice(`Вставлена таблица ${rows}×${cols}`)}catch{setNotice("Браузер не дал прочитать буфер обмена")} };
  const saveTableEditor = () => {
    if (!tableEditorId || !tableDraft) { setTableEditorId(null); setTableDraft(null); return; }
    commit(itemsRef.current.map((item) => item.id === tableEditorId ? {
      ...item,
      tableRows: tableDraft.rows,
      tableCols: tableDraft.cols,
      tableCells: tableDraft.cells.map((cell) => cell.slice(0, 2000)),
      tableHeader: tableDraft.header,
      fontSize: Math.max(9, Math.min(32, Math.round(tableDraft.fontSize))),
      tableAlign: tableDraft.align,
      tableStripe: tableDraft.stripe,
      tableCompact: tableDraft.compact,
    } : item));
    setTableEditorId(null);
    setTableDraft(null);
    setNotice(`Таблица сохранена · ${tableDraft.rows}×${tableDraft.cols}`);
  };

  const openChecklistEditor = (item: Item) => {
    if (item.kind !== "checklist" || item.locked) return;
    const entries = item.checklistItems?.length ? [...item.checklistItems] : ["Новый пункт"];
    const done = entries.map((_, index) => item.checklistDone?.[index] === true);
    setSelected([item.id]);
    setChecklistEditorId(item.id);
    setChecklistDraft({ title: item.text || "Чек-лист", items: entries, done, fontSize: item.fontSize ?? 15, color: item.color ?? "#5355c9" });
  };

  const saveChecklistEditor = () => {
    if (!checklistEditorId || !checklistDraft) { setChecklistEditorId(null); setChecklistDraft(null); return; }
    const cleanItems = checklistDraft.items.slice(0, 40).map((value) => value.slice(0, 2000));
    const cleanDone = cleanItems.map((_, index) => checklistDraft.done[index] === true);
    commit(itemsRef.current.map((item) => item.id === checklistEditorId ? {
      ...item,
      text: checklistDraft.title.slice(0, 200),
      checklistItems: cleanItems.length ? cleanItems : ["Новый пункт"],
      checklistDone: cleanItems.length ? cleanDone : [false],
      fontSize: Math.max(10, Math.min(32, Math.round(checklistDraft.fontSize))),
      color: checklistDraft.color,
    } : item));
    setChecklistEditorId(null);
    setChecklistDraft(null);
    setNotice("Чек-лист сохранён");
  };

  const addChecklistRow = () => setChecklistDraft((current) => current && current.items.length < 40 ? { ...current, items: [...current.items, ""], done: [...current.done, false] } : current);
  const removeChecklistRow = (indexValue: number) => setChecklistDraft((current) => {
    if (!current || current.items.length <= 1) return current;
    return { ...current, items: current.items.filter((_, index) => index !== indexValue), done: current.done.filter((_, index) => index !== indexValue) };
  });

  const openQuizEditor = (item: Item) => {
    if (item.kind !== "quiz" || item.locked) return;
    const options = item.quizOptions?.length ? [...item.quizOptions] : ["Вариант 1", "Вариант 2"];
    setSelected([item.id]);
    setQuizEditorId(item.id);
    setQuizDraft({
      question: item.text || "Вопрос",
      options,
      correct: Math.max(0, Math.min(options.length - 1, item.quizCorrect ?? 0)),
      explanation: item.quizExplanation ?? "",
      fontSize: item.fontSize ?? 15,
      color: item.color ?? "#5355c9",
    });
  };

  const saveQuizEditor = () => {
    if (!quizEditorId || !quizDraft) { setQuizEditorId(null); setQuizDraft(null); return; }
    const options = quizDraft.options.slice(0, 8).map((value) => value.slice(0, 2000));
    const correct = Math.max(0, Math.min(options.length - 1, Math.round(quizDraft.correct)));
    commit(itemsRef.current.map((item) => item.id === quizEditorId ? {
      ...item,
      text: quizDraft.question.slice(0, 2000),
      quizOptions: options.length >= 2 ? options : [...options, "Вариант 2"].slice(0, 2),
      quizCorrect: correct,
      quizExplanation: quizDraft.explanation.slice(0, 5000),
      fontSize: Math.max(10, Math.min(32, Math.round(quizDraft.fontSize))),
      color: quizDraft.color,
      quizRevealed: false,
      quizSelected: undefined,
    } : item));
    setQuizEditorId(null);
    setQuizDraft(null);
    setNotice("Мини-тест сохранён");
  };

  const addQuizOption = () => setQuizDraft((current) => current && current.options.length < 8 ? { ...current, options: [...current.options, ""] } : current);
  const removeQuizOption = (indexValue: number) => setQuizDraft((current) => {
    if (!current || current.options.length <= 2) return current;
    const options = current.options.filter((_, index) => index !== indexValue);
    const correct = current.correct === indexValue ? 0 : current.correct > indexValue ? current.correct - 1 : current.correct;
    return { ...current, options, correct: Math.max(0, Math.min(options.length - 1, correct)) };
  });
  const selectQuizAnswer = (item: Item, indexValue: number) => {
    if (item.kind !== "quiz" || item.locked) return;
    commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, quizSelected: indexValue, quizRevealed: false } : candidate));
  };
  const toggleQuizReveal = (item: Item) => {
    if (item.kind !== "quiz" || item.locked) return;
    commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, quizRevealed: !item.quizRevealed } : candidate));
  };
  const resetQuizAnswer = (item: Item) => {
    if (item.kind !== "quiz" || item.locked) return;
    commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, quizSelected: undefined, quizRevealed: false } : candidate));
  };

  const openFlashcardEditor = (item: Item) => {
    if (item.kind !== "flashcard" || item.locked) return;
    setSelected([item.id]);
    setFlashcardEditorId(item.id);
    setFlashcardDraft({ front: item.text || "Вопрос", back: item.flashcardBack ?? "Ответ", fontSize: item.fontSize ?? 18, color: item.color ?? "#5355c9" });
  };

  const saveFlashcardEditor = () => {
    if (!flashcardEditorId || !flashcardDraft) { setFlashcardEditorId(null); setFlashcardDraft(null); return; }
    commit(itemsRef.current.map((item) => item.id === flashcardEditorId ? {
      ...item, text: flashcardDraft.front.slice(0, 5000), flashcardBack: flashcardDraft.back.slice(0, 5000),
      fontSize: Math.max(10, Math.min(48, Math.round(flashcardDraft.fontSize))), color: flashcardDraft.color, flashcardFlipped: false,
    } : item));
    setFlashcardEditorId(null); setFlashcardDraft(null); setNotice("Карточка сохранена");
  };

  const flipFlashcard = (item: Item) => {
    if (item.kind !== "flashcard" || item.locked) return;
    commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, flashcardFlipped: !item.flashcardFlipped } : candidate));
  };

  const quizItems = items.filter((item) => item.kind === "quiz");
  const flashcardItems = items.filter((item) => item.kind === "flashcard");
  const answeredQuizItems = quizItems.filter((item) => item.quizSelected != null);
  const checkedQuizItems = quizItems.filter((item) => item.quizRevealed && item.quizSelected != null);
  const correctQuizItems = checkedQuizItems.filter((item) => item.quizSelected === item.quizCorrect);
  const knownFlashcards = flashcardItems.filter((item) => item.flashcardMastery === "known").length;
  const againFlashcards = flashcardItems.filter((item) => item.flashcardMastery === "again").length;
  const currentStudyCard = flashcardItems.length ? flashcardItems[Math.min(studyCardIndex, flashcardItems.length - 1)] : null;
  const checkQuizResults = () => {
    commit(itemsRef.current.map((item) => item.kind === "quiz" && item.quizSelected != null ? { ...item, quizRevealed: true } : item));
    setNotice("Результаты мини-теста проверены");
  };
  const resetAllQuizAnswers = () => {
    commit(itemsRef.current.map((item) => item.kind === "quiz" ? { ...item, quizSelected: undefined, quizRevealed: false } : item));
    setNotice("Ответы мини-теста сброшены");
  };
  const markStudyCard = (mastery: "again"|"known") => {
    if (!currentStudyCard) return;
    commit(itemsRef.current.map((item) => item.id === currentStudyCard.id ? { ...item, flashcardMastery: mastery, flashcardFlipped: false } : item));
    setStudyCardIndex((index) => flashcardItems.length ? (index + 1) % flashcardItems.length : 0);
  };
  const resetFlashcardProgress = () => {
    commit(itemsRef.current.map((item) => item.kind === "flashcard" ? { ...item, flashcardMastery: undefined, flashcardFlipped: false } : item));
    setStudyCardIndex(0);
    setNotice("Прогресс карточек сброшен");
  };

  const toggleCover = (item: Item) => {
    if (item.kind !== "cover" || item.locked) return;
    commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, coverOpen: !item.coverOpen } : candidate));
  };

  const openFrameNotesEditor = (frame: Item) => {
    if (frame.kind !== "frame" || frame.locked) return;
    setFrameNotesEditorId(frame.id);
    setFrameNotesDraft(frame.notes ?? "");
  };

  const saveFrameNotes = () => {
    if (!frameNotesEditorId) return;
    const notes = frameNotesDraft.slice(0, 20000);
    commit(itemsRef.current.map((item) => item.id === frameNotesEditorId ? { ...item, notes } : item));
    setFrameNotesEditorId(null);
    setFrameNotesDraft("");
    setNotice(notes.trim() ? "Заметки к фрейму сохранены" : "Заметки к фрейму очищены");
  };

  const toggleSelectedCommentResolved = () => {
    if (!singleSelected || singleSelected.kind !== "comment" || singleSelected.locked) return;
    const nextResolved = !singleSelected.resolved;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, resolved: nextResolved } : item));
    setNotice(nextResolved ? "Комментарий отмечен решённым" : "Комментарий снова открыт");
  };

  const detachSelectedComment = () => {
    if (!singleSelected || singleSelected.kind !== "comment" || singleSelected.locked) return;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, commentTargetId: undefined } : item));
    setNotice("Комментарий отвязан от объекта");
  };

  const addCommentToSelection = () => {
    if (selectedItems.length !== 1) { setTool("comment"); setNotice("Щёлкните по объекту или пустому месту, чтобы добавить комментарий"); return; }
    const target = selectedItems[0];
    const item: Item = {
      id: crypto.randomUUID(), kind: "comment",
      x: target.x + target.width + 28, y: target.y + 18,
      width: 250, height: 132, text: "", color: "#fff8d6", resolved: false,
      commentTargetId: target.id,
    };
    commit([...itemsRef.current, item]);
    setSelected([item.id]);
    window.setTimeout(() => startEdit(item), 0);
  };

  const viewportCenterWorld = () => {
    const rect = board.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return world({ x: rect.width / 2, y: rect.height / 2 });
  };

  const nextPresentationOrder = () => Math.max(-1, ...itemsRef.current.filter((item) => item.kind === "frame").map((item, index) => item.presentationOrder ?? index)) + 1;

  const insertTemplate = (template: "lesson" | "mindmap" | "compare" | "brainstorm" | "checklist" | "quiz" | "cards") => {
    const center = viewportCenterWorld();
    const frameId = crypto.randomUUID();
    const order = nextPresentationOrder();
    const addSticky = (x: number, y: number, w: number, h: number, text: string, colorValue: string): Item => ({
      id: crypto.randomUUID(), kind: "sticky", x, y, width: w, height: h, text, color: colorValue, fontSize: 18,
    });
    const addText = (x: number, y: number, w: number, h: number, text: string, size = 28): Item => ({
      id: crypto.randomUUID(), kind: "text", x, y, width: w, height: h, text, fontSize: size,
    });
    let frame: Item;
    let content: Item[] = [];
    if (template === "lesson") {
      frame = { id: frameId, kind: "frame", x: center.x - 460, y: center.y - 320, width: 920, height: 640, text: "План урока", color: "#73798a", presentationOrder: order };
      content = [
        addText(frame.x + 54, frame.y + 68, 800, 56, "Тема урока", 32),
        addSticky(frame.x + 54, frame.y + 150, 240, 180, "Цель\nЧто ученики должны понять?", "#dcecff"),
        addSticky(frame.x + 340, frame.y + 150, 240, 180, "Ключевая идея\nГлавная мысль урока", "#fff3a6"),
        addSticky(frame.x + 626, frame.y + 150, 240, 180, "Практика\nЧто делаем вместе?", "#dff5c8"),
        addSticky(frame.x + 54, frame.y + 380, 812, 170, "Итог и вопросы\nЧто важно унести с собой?", "#eadcff"),
      ];
    } else if (template === "compare") {
      frame = { id: frameId, kind: "frame", x: center.x - 470, y: center.y - 300, width: 940, height: 600, text: "Сравнение", color: "#73798a", presentationOrder: order };
      content = [
        addText(frame.x + 52, frame.y + 68, 820, 52, "Сравним два подхода", 30),
        addSticky(frame.x + 70, frame.y + 160, 350, 330, "Вариант A\n\n• критерий 1\n• критерий 2\n• критерий 3", "#dcecff"),
        addSticky(frame.x + 520, frame.y + 160, 350, 330, "Вариант B\n\n• критерий 1\n• критерий 2\n• критерий 3", "#ffd9de"),
        addText(frame.x + 438, frame.y + 285, 70, 50, "VS", 28),
      ];
    } else if (template === "brainstorm") {
      frame = { id: frameId, kind: "frame", x: center.x - 500, y: center.y - 330, width: 1000, height: 660, text: "Мозговой штурм", color: "#73798a", presentationOrder: order };
      const colors = ["#fff3a6", "#dcecff", "#dff5c8", "#ffd9de", "#eadcff", "#fff3a6", "#dcecff", "#dff5c8"];
      content = [addText(frame.x + 52, frame.y + 66, 850, 50, "Вопрос / проблема", 30)];
      for (let n = 0; n < 8; n++) {
        const col = n % 4, row = Math.floor(n / 4);
        content.push(addSticky(frame.x + 52 + col * 232, frame.y + 145 + row * 220, 190, 170, `Идея ${n + 1}`, colors[n]));
      }
    } else if (template === "checklist") {
      frame = { id: frameId, kind: "frame", x: center.x - 430, y: center.y - 300, width: 860, height: 600, text: "Проверка понимания", color: "#73798a", presentationOrder: order };
      content = [
        addText(frame.x + 52, frame.y + 64, 740, 52, "Что уже получилось?", 30),
        { id: crypto.randomUUID(), kind: "checklist", x: frame.x + 54, y: frame.y + 145, width: 470, height: 350, text: "Чек-лист урока", fontSize: 16, color: "#5355c9", checklistItems: ["Я могу объяснить главную идею своими словами", "Я выполнил основное задание", "Я понимаю, где допустил ошибку", "У меня остался вопрос по теме"], checklistDone: [false, false, false, false] },
        addSticky(frame.x + 565, frame.y + 145, 235, 170, "Мой вопрос\nЧто ещё хочется уточнить?", "#fff3a6"),
        addSticky(frame.x + 565, frame.y + 345, 235, 150, "Следующий шаг\nЧто попробовать дальше?", "#dff5c8"),
      ];
    } else if (template === "quiz") {
      frame = { id: frameId, kind: "frame", x: center.x - 430, y: center.y - 300, width: 860, height: 600, text: "Быстрый вопрос", color: "#73798a", presentationOrder: order };
      content = [
        addText(frame.x + 52, frame.y + 58, 750, 48, "Проверим понимание", 30),
        { id: crypto.randomUUID(), kind: "quiz", x: frame.x + 70, y: frame.y + 135, width: 520, height: 360, text: "Какой вариант лучше всего отвечает на вопрос?", fontSize: 16, color: "#5355c9", quizOptions: ["Вариант A", "Вариант B", "Вариант C", "Вариант D"], quizCorrect: 0, quizRevealed: false },
        addSticky(frame.x + 625, frame.y + 150, 180, 150, "Обсуждение\nПочему этот ответ верный?", "#fff3a6"),
        addSticky(frame.x + 625, frame.y + 335, 180, 150, "Вывод\nЧто запомним?", "#dff5c8"),
      ];
    } else if (template === "cards") {
      frame = { id: frameId, kind: "frame", x: center.x - 500, y: center.y - 320, width: 1000, height: 640, text: "Карточки для повторения", color: "#73798a", presentationOrder: order };
      content = [addText(frame.x + 52, frame.y + 58, 820, 48, "Повторим ключевые понятия", 30)];
      const colors = ["#5355c9", "#2f855a", "#d97706", "#8b5cf6", "#dc4c64", "#475569"];
      for (let n = 0; n < 6; n++) {
        const col = n % 3, row = Math.floor(n / 3);
        content.push({ id: crypto.randomUUID(), kind: "flashcard", x: frame.x + 52 + col * 300, y: frame.y + 135 + row * 220, width: 260, height: 180, text: `Вопрос ${n + 1}`, flashcardBack: `Ответ ${n + 1}`, flashcardFlipped: false, fontSize: 17, color: colors[n] });
      }
    } else {
      frame = { id: frameId, kind: "frame", x: center.x - 520, y: center.y - 330, width: 1040, height: 660, text: "Карта идей", color: "#73798a", presentationOrder: order };
      const centerNode: Item = { id: crypto.randomUUID(), kind: "shape", x: center.x - 120, y: center.y - 60, width: 240, height: 120, text: "", shapeType: "rounded", color: "#5355c9" };
      const nodes: Item[] = [
        { id: crypto.randomUUID(), kind: "sticky", x: center.x - 440, y: center.y - 230, width: 210, height: 140, text: "Ветка 1", color: "#dcecff", fontSize: 18 },
        { id: crypto.randomUUID(), kind: "sticky", x: center.x + 230, y: center.y - 230, width: 210, height: 140, text: "Ветка 2", color: "#dff5c8", fontSize: 18 },
        { id: crypto.randomUUID(), kind: "sticky", x: center.x - 440, y: center.y + 100, width: 210, height: 140, text: "Ветка 3", color: "#ffd9de", fontSize: 18 },
        { id: crypto.randomUUID(), kind: "sticky", x: center.x + 230, y: center.y + 100, width: 210, height: 140, text: "Ветка 4", color: "#eadcff", fontSize: 18 },
      ];
      const label: Item = addText(center.x - 95, center.y - 22, 190, 55, "Главная тема", 24);
      const connectors = nodes.map((node) => connectorItemFromPoints(
        { x: centerNode.x + centerNode.width / 2, y: centerNode.y + centerNode.height / 2 },
        { x: node.x + node.width / 2, y: node.y + node.height / 2 },
        "arrow", "#7379d6", 2.5, crypto.randomUUID(), "straight",
        { itemId: centerNode.id, nx: node.x < centerNode.x ? 0 : 1, ny: .5 },
        { itemId: node.id, nx: node.x < centerNode.x ? 1 : 0, ny: .5 },
      ));
      content = [...connectors, centerNode, label, ...nodes];
    }
    const all = [frame, ...content];
    commit([...itemsRef.current, ...all]);
    setSelected([frame.id]);
    setTemplatesOpen(false);
    setCommentsOpen(false);
    requestAnimationFrame(() => fitToBounds(boundsOf(all), 110));
    setNotice(`Шаблон добавлен · ${frame.text}`);
  };

  const moveSelectedFrameInPresentation = (direction: number) => {
    if (!singleSelected || singleSelected.kind !== "frame" || singleSelected.locked) return;
    const frames = itemsRef.current.filter((item) => item.kind === "frame" && !item.hidden).sort((a, b) => (a.presentationOrder ?? itemsRef.current.indexOf(a)) - (b.presentationOrder ?? itemsRef.current.indexOf(b)));
    const indexValue = frames.findIndex((frame) => frame.id === singleSelected.id);
    const otherIndex = indexValue + direction;
    if (indexValue < 0 || otherIndex < 0 || otherIndex >= frames.length) return;
    const a = frames[indexValue], b = frames[otherIndex];
    const aOrder = a.presentationOrder ?? indexValue;
    const bOrder = b.presentationOrder ?? otherIndex;
    commit(itemsRef.current.map((item) => item.id === a.id ? { ...item, presentationOrder: bOrder } : item.id === b.id ? { ...item, presentationOrder: aOrder } : item));
    setNotice(direction < 0 ? "Фрейм поднят в порядке показа" : "Фрейм опущен в порядке показа");
  };

  const searchResults = searchQuery.trim()
    ? items.filter((item) => {
        if (item.hidden) return false;
        const q = searchQuery.trim().toLocaleLowerCase("ru");
        return `${item.text} ${item.name ?? ""} ${(item.tableCells ?? []).join(" ")} ${(item.checklistItems ?? []).join(" ")} ${(item.quizOptions ?? []).join(" ")} ${item.quizExplanation ?? ""} ${item.flashcardBack ?? ""} ${itemLabel(item)}`.toLocaleLowerCase("ru").includes(q);
      })
    : [];

  const focusItem = (item: Item) => {
    finishEdit();
    setTool("select");
    const family = item.groupId ? itemsRef.current.filter((candidate) => candidate.groupId === item.groupId) : [item];
    setSelected(family.map((candidate) => candidate.id));
    fitToBounds(boundsOf(family), 180);
  };

  const cycleGrid = () => {
    setGridMode((mode) => mode === "dots" ? "grid" : mode === "grid" ? "plain" : "dots");
  };

  const recolorSelected = (value: string) => {
    if (!selected.length || selectionLocked) return;
    commit(itemsRef.current.map((item) =>
      selected.includes(item.id) && (item.kind === "text" || item.kind === "sticky" || item.kind === "shape" || item.kind === "frame" || item.kind === "connector" || item.kind === "formula" || item.kind === "checklist" || item.kind === "quiz" || item.kind === "flashcard" || item.kind === "cover")
        ? { ...item, color: value }
        : item,
    ));
  };

  const fitSelectedFormula = () => {
    if (!singleSelected || singleSelected.kind !== "formula" || selectionLocked) return;
    const size = Math.max(12, Math.min(96, singleSelected.fontSize ?? 28));
    const plain = formulaToPlainText(singleSelected.text || "Формула");
    const lines = plain.split(/\n/);
    const longest = Math.max(1, ...lines.map((line) => line.length));
    const fractionBonus = (singleSelected.text.match(/\\frac/g) ?? []).length * size * .22;
    const rootBonus = (singleSelected.text.match(/\\sqrt/g) ?? []).length * size * .08;
    const width = Math.max(160, Math.min(960, longest * size * .58 + 48 + rootBonus));
    const height = Math.max(72, Math.min(520, lines.length * size * 1.55 + 38 + fractionBonus));
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, width, height } : item));
    setNotice("Размер формулы подогнан по содержимому");
  };

  const changeFontSize = (delta: number) => {
    if (!singleSelected || selectionLocked || (singleSelected.kind !== "text" && singleSelected.kind !== "sticky" && singleSelected.kind !== "formula" && singleSelected.kind !== "table" && singleSelected.kind !== "checklist" && singleSelected.kind !== "quiz" && singleSelected.kind !== "flashcard" && singleSelected.kind !== "cover")) return;
    const fallback = singleSelected.kind === "formula" ? 28 : singleSelected.kind === "table" ? 13 : singleSelected.kind === "checklist" || singleSelected.kind === "quiz" ? 15 : singleSelected.kind === "flashcard" ? 18 : singleSelected.kind === "cover" ? 17 : 20;
    const min = singleSelected.kind === "table" ? 9 : singleSelected.kind === "formula" ? 12 : 10;
    const max = singleSelected.kind === "table" || singleSelected.kind === "checklist" || singleSelected.kind === "quiz" ? 32 : singleSelected.kind === "flashcard" || singleSelected.kind === "cover" ? 48 : 96;
    const nextSize = Math.max(min, Math.min(max, (singleSelected.fontSize ?? fallback) + delta));
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, fontSize: nextSize } : item));
  };

  const setSelectedTextStyle = (patch: Partial<Pick<Item, "textAlign" | "fontWeight" | "fontStyle" | "textDecoration" | "textList" | "lineHeight">>) => {
    if (!singleSelected || selectionLocked || (singleSelected.kind !== "text" && singleSelected.kind !== "sticky")) return;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, ...patch } : item));
  };

  const setSelectedConnectorStyle = (style: ConnectorStyle) => {
    if (!singleSelected || singleSelected.kind !== "connector" || selectionLocked) return;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, connectorStyle: style } : item));
  };

  const setSelectedConnectorRouting = (routing: ConnectorRouting) => {
    if (!singleSelected || singleSelected.kind !== "connector" || selectionLocked) return;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, connectorRouting: routing } : item));
  };

  const renameSelectedConnector = () => {
    if (!singleSelected || singleSelected.kind !== "connector" || selectionLocked) return;
    const value = window.prompt("Подпись линии", singleSelected.text ?? "");
    if (value == null) return;
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, text: value.replace(/\s+/g, " ").trim().slice(0, 80) } : item));
  };

  const detachSelectedConnector = () => {
    if (!singleSelected || singleSelected.kind !== "connector" || selectionLocked) return;
    if (!singleSelected.connectorStartBinding && !singleSelected.connectorEndBinding) {
      setNotice("Концы этой линии уже свободны");
      return;
    }
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? {
      ...item,
      connectorStartBinding: undefined,
      connectorEndBinding: undefined,
    } : item));
    setNotice("Связь отвязана от объектов");
  };

  const changeSelectedConnectorWeight = (delta: number) => {
    if (!singleSelected || singleSelected.kind !== "connector" || selectionLocked) return;
    const nextWeight = Math.max(1, Math.min(12, (singleSelected.weight ?? 3) + delta));
    commit(itemsRef.current.map((item) => item.id === singleSelected.id ? { ...item, weight: nextWeight } : item));
  };

  const visibleItems = items.filter((item) => !item.hidden);
  const allBounds = boundsOf(visibleItems);
  const minimapBounds = allBounds ?? { x: -400, y: -300, width: 800, height: 600 };
  const boardRect = board.current?.getBoundingClientRect();
  const visibleWorld = boardRect ? {
    x: -view.x / view.zoom,
    y: -view.y / view.zoom,
    width: boardRect.width / view.zoom,
    height: boardRect.height / view.zoom,
  } : null;
  const miniPad = 30;
  const miniX = Math.min(minimapBounds.x, visibleWorld?.x ?? minimapBounds.x) - miniPad;
  const miniY = Math.min(minimapBounds.y, visibleWorld?.y ?? minimapBounds.y) - miniPad;
  const miniRight = Math.max(minimapBounds.x + minimapBounds.width, visibleWorld ? visibleWorld.x + visibleWorld.width : minimapBounds.x + minimapBounds.width) + miniPad;
  const miniBottom = Math.max(minimapBounds.y + minimapBounds.height, visibleWorld ? visibleWorld.y + visibleWorld.height : minimapBounds.y + minimapBounds.height) + miniPad;
  const miniW = Math.max(1, miniRight - miniX);
  const miniH = Math.max(1, miniBottom - miniY);
  const layerRows = (() => {
    const seenGroups = new Set<string>();
    const rows: Item[] = [];
    for (const item of [...items].reverse()) {
      if (item.groupId) {
        if (seenGroups.has(item.groupId)) continue;
        seenGroups.add(item.groupId);
      }
      rows.push(item);
    }
    return rows;
  })();

  const comments = items.filter((item) => item.kind === "comment");
  const openComments = comments.filter((item) => !item.resolved && !item.hidden);
  const presentationFrames = items.filter((item) => item.kind === "frame" && !item.hidden).sort((a, b) => (a.presentationOrder ?? items.indexOf(a)) - (b.presentationOrder ?? items.indexOf(b)));
  const activePresentationFrame = presentationFrames.length
    ? presentationFrames[Math.min(presentationFrameIndex, presentationFrames.length - 1)]
    : null;
  const showPresentationFrame = (indexValue: number) => {
    const frames = itemsRef.current.filter((item) => item.kind === "frame" && !item.hidden).sort((a, b) => (a.presentationOrder ?? itemsRef.current.indexOf(a)) - (b.presentationOrder ?? itemsRef.current.indexOf(b)));
    if (!frames.length) {
      requestAnimationFrame(() => fitToBounds(boundsOf(itemsRef.current.filter((item) => !item.hidden)), 70));
      return;
    }
    const normalized = ((indexValue % frames.length) + frames.length) % frames.length;
    setPresentationFrameIndex(normalized);
    requestAnimationFrame(() => fitToBounds({
      x: frames[normalized].x,
      y: frames[normalized].y,
      width: frames[normalized].width,
      height: frames[normalized].height,
    }, 64));
  };
  const startPresentation = () => {
    finishEdit();
    const selectedFrameId = selected.length === 1 ? itemsRef.current.find((item) => item.id === selected[0] && item.kind === "frame")?.id : undefined;
    const frames = itemsRef.current.filter((item) => item.kind === "frame" && !item.hidden).sort((a, b) => (a.presentationOrder ?? itemsRef.current.indexOf(a)) - (b.presentationOrder ?? itemsRef.current.indexOf(b)));
    const startIndex = selectedFrameId ? Math.max(0, frames.findIndex((frame) => frame.id === selectedFrameId)) : 0;
    setSelected([]);
    setTool("select");
    setLayersOpen(false);
    setSearchOpen(false);
    setTemplatesOpen(false);
    setCommentsOpen(false);
    setTableEditorId(null);
    setTableDraft(null);
    setChecklistEditorId(null);
    setChecklistDraft(null);
    setQuizEditorId(null);
    setQuizDraft(null);
    setFlashcardEditorId(null);
    setFlashcardDraft(null);
    setShortcutsOpen(false);
    closeFormulaEditor();
    setFrameNotesEditorId(null);
    setFrameNotesDraft("");
    setPresentationNotesOpen(false);
    setPresentationSlidesOpen(false);
    setPresentationLaser(false);
    setPresentationLaserPos(null);
    setPresentationSpotlight(false);
    setPresentationSpotlightPos(null);
    setPresentationElapsed(0);
    setPresentationCountdownRemaining(presentationCountdownTotal);
    setPresentationTimerRunning(true);
    setPresentationBlackout(false);
    setPresentation(true);
    setPresentationFrameIndex(startIndex);
    showPresentationFrame(startIndex);
  };
  const publicPresentationAutoStarted = useRef(false);
  useEffect(() => {
    if (!publicPresentation || publicPresentationAutoStarted.current) return;
    publicPresentationAutoStarted.current = true;
    setPresentation(true);
    setPresentationTimerRunning(false);
    setPresentationFrameIndex(0);
    setPresentationSlidesOpen(false);
    window.setTimeout(() => showPresentationFrame(0), 80);
  }, [publicPresentation, boardSummary.id]);

  const stepPresentation = (direction: number) => {
    if (!presentationFrames.length) return;
    showPresentationFrame(presentationFrameIndex + direction);
  };
  const formatPresentationTime = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setNotice("Браузер не разрешил полноэкранный режим"); }
  };

  const presentationQuizzes = (activePresentationFrame
    ? containedByFrame(activePresentationFrame, items).filter((item) => item.kind === "quiz")
    : items.filter((item) => item.kind === "quiz" && !item.hidden)) as Item[];
  const presentationQuizzesRevealed = presentationQuizzes.length > 0 && presentationQuizzes.every((item) => item.quizRevealed);
  const togglePresentationQuizAnswers = () => {
    if (!presentationQuizzes.length) { setNotice("На текущем слайде нет мини-тестов"); return; }
    const ids = new Set(presentationQuizzes.map((item) => item.id));
    const reveal = !presentationQuizzesRevealed;
    commit(itemsRef.current.map((item) => ids.has(item.id) ? { ...item, quizRevealed: reveal } : item));
    setNotice(reveal ? "Правильные ответы показаны" : "Правильные ответы скрыты");
  };
  const resetPresentationQuizzes = () => {
    if (!presentationQuizzes.length) { setNotice("На текущем слайде нет мини-тестов"); return; }
    const ids = new Set(presentationQuizzes.map((item) => item.id));
    commit(itemsRef.current.map((item) => ids.has(item.id) ? { ...item, quizSelected: undefined, quizRevealed: false } : item));
    setNotice("Ответы на текущем слайде сброшены");
  };

  const presentationFlashcards = (activePresentationFrame
    ? containedByFrame(activePresentationFrame, items).filter((item) => item.kind === "flashcard")
    : items.filter((item) => item.kind === "flashcard" && !item.hidden)) as Item[];
  const presentationFlashcardsFlipped = presentationFlashcards.length > 0 && presentationFlashcards.every((item) => item.flashcardFlipped);
  const togglePresentationFlashcards = () => {
    if (!presentationFlashcards.length) { setNotice("На текущем слайде нет карточек"); return; }
    const ids = new Set(presentationFlashcards.map((item) => item.id));
    const flipped = !presentationFlashcardsFlipped;
    commit(itemsRef.current.map((item) => ids.has(item.id) ? { ...item, flashcardFlipped: flipped } : item));
    setNotice(flipped ? "Показаны ответы всех карточек" : "Показаны вопросы всех карточек");
  };

  const presentationChecklists = (activePresentationFrame
    ? containedByFrame(activePresentationFrame, items).filter((item) => item.kind === "checklist")
    : items.filter((item) => item.kind === "checklist" && !item.hidden)) as Item[];
  const presentationCovers = (activePresentationFrame
    ? containedByFrame(activePresentationFrame, items).filter((item) => item.kind === "cover")
    : items.filter((item) => item.kind === "cover" && !item.hidden)) as Item[];
  const resetPresentationInteractions = () => {
    const quizIds = new Set(presentationQuizzes.map((item) => item.id));
    const cardIds = new Set(presentationFlashcards.map((item) => item.id));
    const checklistIds = new Set(presentationChecklists.map((item) => item.id));
    const coverIds = new Set(presentationCovers.map((item) => item.id));
    if (quizIds.size && !cardIds.size && !checklistIds.size && !coverIds.size) { resetPresentationQuizzes(); return; }
    if (!quizIds.size && !cardIds.size && !checklistIds.size && !coverIds.size) { setNotice("На текущем слайде нет интерактивных заданий"); return; }
    commit(itemsRef.current.map((item) => {
      if (quizIds.has(item.id)) return { ...item, quizSelected: undefined, quizRevealed: false };
      if (cardIds.has(item.id)) return { ...item, flashcardFlipped: false };
      if (checklistIds.has(item.id)) return { ...item, checklistDone: (item.checklistItems ?? []).map(() => false) };
      if (coverIds.has(item.id)) return { ...item, coverOpen: false };
      return item;
    }));
    setNotice("Интерактивные задания текущего слайда сброшены");
  };

  const applyServerDocument = (row: RemoteBoardDocument) => {
    const data = parseDocument(JSON.stringify(row.document));
    // Normalize connector positions before setting the clean baseline.
    data.items = syncBoundConnectors(data.items);
    remoteVersion.current = row.version;
    acknowledgedDocument.current = documentFingerprint(data);
    pendingRemote.current = null;
    queuedRemoteSnapshot.current = null;
    remoteSaveFailures.current = 0;
    if (remoteRetryTimer.current) { clearTimeout(remoteRetryTimer.current); remoteRetryTimer.current = null; }
    setRemoteConflict(null);
    setTableEditorId(null); setChecklistEditorId(null); setQuizEditorId(null);
    setFlashcardEditorId(null); setFormulaEditorId(null); setFrameNotesEditorId(null);
    applyDocument(data, true);
    try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch { /* still usable in memory */ }
    setSaveStatus("Получена серверная версия");
  };
  receiveRemote.current = row => {
    if (!boardMounted.current || row.board_id !== boardSummary.id) return;
    const busy = !!(gesture.current || editing || tableEditorId || checklistEditorId || quizEditorId || flashcardEditorId || formulaEditorId || frameNotesEditorId);
    const dirty = canEdit && (busy || documentFingerprint(currentDocument()) !== acknowledgedDocument.current);
    const decision = remoteUpdateDecision(remoteVersion.current, row.version, remoteSaveInFlight.current, dirty || !!pendingRemote.current);
    if (decision === "ignore") return;
    if (decision === "defer") {
      if (!deferredRemote.current || row.version > deferredRemote.current.version) deferredRemote.current = row;
      return;
    }
    try {
      const data = parseDocument(JSON.stringify(row.document));
      if (isOwnRemoteRevision(row, authUser.id, lastAttempt.current)) {
        remoteVersion.current = row.version;
        acknowledgedDocument.current = lastAttempt.current!.fingerprint;
        return;
      }
      if (decision === "conflict") {
        // Collaborative boards should converge automatically instead of asking the user
        // to choose between "my" and "server" versions.
        const local = parseDocument(JSON.stringify(currentDocument()));
        const remote = data;
        const remoteIds = new Set(remote.items.map(item => item.id));
        const localOnly = local.items.filter(item => !remoteIds.has(item.id));
        const merged: DocumentData = {
          ...remote,
          view: local.view,
          items: [...remote.items, ...localOnly],
        };

        remoteVersion.current = row.version;
        acknowledgedDocument.current = documentFingerprint(remote);
        pendingRemote.current = null;
        setRemoteConflict(null);
        setConflictLocalBackup(null);
        try { localStorage.removeItem(storageKey + ".conflict-backup"); } catch {}
        applyDocument(merged, true);
        snapshot.current = merged;
        queuedRemoteSnapshot.current = merged;
        setSaveStatus("Синхронизировано");
        window.setTimeout(() => void pushRemoteSnapshot(merged), 0);
        return;
      }
      applyServerDocument(row);
    } catch { setNotice("Не удалось прочитать новую серверную версию. Ваши изменения сохранены на доске."); }
  };
  useEffect(() => subscribeBoardDocument(boardSummary.id, row => receiveRemote.current(row), setRealtimeStatus), [boardSummary.id]);

  useEffect(() => subscribeBoardPresence(
    boardSummary.id,
    { userId: authUser.id, name: authUser.name, role: boardSummary.role },
    setPresenceUsers,
  ), [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    const channel = connectBoardCursorChannel(
      boardSummary.id,
      { userId: authUser.id, name: authUser.name, role: boardSummary.role },
      (cursor) => setRemoteCursors((current) => ({ ...current, [cursor.userId]: cursor })),
    );
    cursorChannel.current = channel;
    return () => {
      cursorChannel.current = null;
      channel.close();
      setRemoteCursors({});
    };
  }, [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    const channel = connectBoardViewControl(
      boardSummary.id,
      { userId: authUser.id, name: authUser.name },
      (command) => {
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - command.centerX * command.zoom,
          y: rect.height / 2 - command.centerY * command.zoom,
          zoom: command.zoom,
        });
        setNotice(`${command.senderName} переместил вас к своей области доски`);
      },
      (teacherView) => {
        if (!(followTeacherRef.current || guidedFollowRef.current)) return;
        const rect = board.current?.getBoundingClientRect();
        if (!rect) return;

        setView({
          x: rect.width / 2 - teacherView.centerX * teacherView.zoom,
          y: rect.height / 2 - teacherView.centerY * teacherView.zoom,
          zoom: teacherView.zoom,
        });
      },
      (guided) => {
        guidedFollowRef.current = guided.enabled;
        setGuidedFollow(guided.enabled);
        setNotice(guided.enabled
          ? `${guided.senderName} включил режим общего следования`
          : `${guided.senderName} выключил режим общего следования`);
      },
    );

    viewControlChannel.current = channel;

    return () => {
      viewControlChannel.current = null;
      channel.close();
    };
  }, [boardSummary.id, authUser.id, authUser.name]);

  useEffect(() => {
    followTeacherRef.current = followTeacher;
  }, [followTeacher]);

  useEffect(() => {
    const channel = connectBoardWorkChannel(
      boardSummary.id,
      { userId: authUser.id, name: authUser.name, role: boardSummary.role },
      (state) => setRemoteWork((current) => ({ ...current, [state.userId]: state })),
      (userId) => setRemoteWork((current) => {
        if (!(userId in current)) return current;
        const next = { ...current };
        delete next[userId];
        return next;
      }),
    );
    workChannel.current = channel;
    return () => {
      workChannel.current = null;
      channel.close();
      setRemoteWork({});
    };
  }, [boardSummary.id, boardSummary.role, authUser.id, authUser.name]);

  useEffect(() => {
    workChannel.current?.publish(selected, editing);
  }, [selected, editing]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 15000;
      const online = new Set(presenceUsers.map((user) => user.userId));
      setRemoteWork((current) => {
        let changed = false;
        const next: Record<string, RemoteWorkState> = {};
        for (const [userId, state] of Object.entries(current)) {
          if (state.updatedAt >= cutoff && online.has(userId)) next[userId] = state;
          else changed = true;
        }
        return changed ? next : current;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [presenceUsers]);

  const remoteEditorFor = (itemId: string) =>
    Object.values(remoteWork).find((state) => state.editingId === itemId);

  const remoteSelectorsFor = (itemId: string) =>
    Object.values(remoteWork).filter((state) => state.selectedIds.includes(itemId));

  const remoteEditingCount = Object.values(remoteWork).filter((state) => state.editingId).length;
  const lessonStudents=presenceUsers.filter((u)=>u.userId!==authUser.id);
  const lessonSeconds=liveLesson?Math.max(0,Math.floor((lessonClock-Date.parse(liveLesson.startedAt))/1000)):0;
  const lessonTime=`${String(Math.floor(lessonSeconds/3600)).padStart(2,"0")}:${String(Math.floor((lessonSeconds%3600)/60)).padStart(2,"0")}:${String(lessonSeconds%60).padStart(2,"0")}`;

  useEffect(() => {
    if (boardSummary.role !== "owner") return;
    if (teacherViewBroadcastTimer.current) clearTimeout(teacherViewBroadcastTimer.current);

    teacherViewBroadcastTimer.current = setTimeout(() => {
      teacherViewBroadcastTimer.current = null;
      const rect = board.current?.getBoundingClientRect();
      if (!rect) return;
      const centerX = (rect.width / 2 - view.x) / view.zoom;
      const centerY = (rect.height / 2 - view.y) / view.zoom;
      viewControlChannel.current?.sendTeacherView(centerX, centerY, view.zoom);
    }, 90);

    return () => {
      if (teacherViewBroadcastTimer.current) {
        clearTimeout(teacherViewBroadcastTimer.current);
        teacherViewBroadcastTimer.current = null;
      }
    };
  }, [boardSummary.role, view.x, view.y, view.zoom]);

  useEffect(() => {
    const online = new Set(presenceUsers.map((user) => user.userId));
    setRemoteCursors((current) => {
      let changed = false;
      const next: Record<string, RemoteCursor> = {};
      for (const [userId, cursor] of Object.entries(current)) {
        if (online.has(userId)) next[userId] = cursor;
        else changed = true;
      }
      return changed ? next : current;
    });
  }, [presenceUsers]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const cutoff = Date.now() - 12000;
      setRemoteCursors((current) => {
        let changed = false;
        const next: Record<string, RemoteCursor> = {};
        for (const [userId, cursor] of Object.entries(current)) {
          if (cursor.updatedAt >= cutoff) next[userId] = cursor;
          else changed = true;
        }
        return changed ? next : current;
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(()=>{if(boardSummary.role!=="owner")return;void getActiveLesson(boardSummary.id).then(existing=>{if(existing){setLiveLesson(existing);return}try{const raw=sessionStorage.getItem("onlinerepetitor.schedule.start");if(!raw)return;const planned=JSON.parse(raw);sessionStorage.removeItem("onlinerepetitor.schedule.start");if(!planned?.studentId)return;setLessonStudentId(planned.studentId);setLessonTopic(planned.topic||"");setLessonScheduleId(planned.scheduleId||null);setLessonOpen(true);setNotice("Занятие из расписания готово к запуску")}catch{sessionStorage.removeItem("onlinerepetitor.schedule.start")}}).catch(()=>undefined)},[boardSummary.id,boardSummary.role]);
  useEffect(()=>{if(!liveLesson)return;setLessonClock(Date.now());const t=window.setInterval(()=>setLessonClock(Date.now()),1000);return()=>window.clearInterval(t)},[liveLesson?.id]);
  const beginLiveLesson=async()=>{const student=lessonStudents.find(u=>u.userId===lessonStudentId);if(!student){setNotice("Выберите ученика, который сейчас на доске");return}try{const lesson=await startLesson(boardSummary.id,student.userId,student.name,lessonTopic,lessonScheduleId);setLiveLesson(lesson);setLessonScheduleId(null);setLessonOpen(false);setLessonPanelOpen(true);setPresentationElapsed(0);setPresentationTimerMode("elapsed");setPresentationTimerRunning(true);setNotice("Урок начат")}catch{setNotice("Не удалось начать урок")}};
  const completeLiveLesson=async()=>{if(!liveLesson)return;try{const done=await finishLesson(liveLesson,lessonResult,lessonHomework);setLiveLesson(null);setLessonFinishOpen(false);setPresentationTimerRunning(false);setLessonResult("");setLessonHomework("");setNotice(`Урок завершён · ${done.minutes} мин. Запись добавлена в историю`)}catch{setNotice("Не удалось завершить урок")}};

  return (
    <div className={`app ${presentation ? "presentation-mode" : ""} ${!canEdit ? "viewer-mode" : ""} ${publicPresentation ? "public-presentation-mode" : ""}`}>
      {linkMediaOpen&&<div className="access-backdrop link-media-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setLinkMediaOpen(false)}}><section className="access-modal link-media-dialog"><div className="access-head"><div><h2>{linkMediaEditId?"Изменить мультимедиа":"Мультимедиа по ссылке"}</h2><p>Файл не загружается в OnlineRepetitor и не занимает Storage.</p></div><button onClick={()=>setLinkMediaOpen(false)}>×</button></div><label className="link-media-field"><span>Ссылка</span><input autoFocus value={linkMediaUrl} onChange={e=>setLinkMediaUrl(e.target.value)} placeholder="YouTube, Vimeo, MP3, MP4 или другая http/https ссылка"/></label><label className="link-media-field"><span>Название</span><input value={linkMediaTitle} onChange={e=>setLinkMediaTitle(e.target.value)} placeholder="Необязательно"/></label><div className="link-media-support"><strong>Внутренний плеер</strong><span>YouTube и Vimeo открываются внутри доски. Прямые ссылки на MP3/MP4/WebM и другие поддерживаемые браузером файлы используют встроенный HTML5-плеер. Для остальных ссылок показывается безопасная карточка перехода.</span></div><div className="access-actions"><button onClick={()=>setLinkMediaOpen(false)}>Отмена</button><button className="boards-create" onClick={saveLinkMedia}>{linkMediaEditId?"Сохранить":"Добавить на доску"}</button></div></section></div>}

      {sharing && <ShareDialog board={boardSummary} user={authUser} onClose={() => setSharing(false)}/>}
      {lessonOpen && <div className="access-backdrop"><section className="access-modal lesson-live-modal"><div className="access-head"><div><h2>Начать урок</h2><p>Текущая доска станет рабочим пространством занятия.</p></div><button onClick={()=>setLessonOpen(false)}>×</button></div><label><span>Ученик</span><select value={lessonStudentId} onChange={e=>setLessonStudentId(e.target.value)}><option value="">Выберите</option>{lessonStudents.map(u=><option key={u.userId} value={u.userId}>{u.name}</option>)}</select></label><label><span>Тема</span><input value={lessonTopic} onChange={e=>setLessonTopic(e.target.value)} placeholder="Тема занятия"/></label><div className="session-actions"><button className="students-primary" onClick={()=>void beginLiveLesson()}>Начать и запустить таймер</button><button className="boards-secondary" onClick={()=>setLessonOpen(false)}>Отмена</button></div></section></div>}
      {lessonPanelOpen && liveLesson && <aside className="lesson-control-panel">
        <div className="lesson-control-head"><div><span className="live-lesson-dot"/><div><b>Идёт урок</b><small>{lessonTime}</small></div></div><button onClick={()=>setLessonPanelOpen(false)}>×</button></div>
        <div className="lesson-control-student"><span className="presence-avatar">{liveLesson.studentName.charAt(0).toUpperCase()}</span><div><strong>{liveLesson.studentName}</strong><small>{liveLesson.topic||"Тема не указана"}</small></div></div>
        <div className="lesson-control-status"><span><b>{lessonTime}</b>время урока</span><span><b>{presenceUsers.length}</b>на доске</span><span><b>{guidedFollow?"Включено":"Выключено"}</b>ведение экрана</span></div><div className="lesson-control-grid">
          <button onClick={()=>{const rect=board.current?.getBoundingClientRect();if(!rect)return;const center=world({x:rect.width/2,y:rect.height/2});viewControlChannel.current?.sendFocus(liveLesson.studentId,center.x,center.y,view.zoom);setNotice("Экран ученика перемещён к вам")}}>◎<span>Ко мне</span></button>
          <button className={guidedFollow?"active":""} onClick={()=>{const next=!guidedFollow;guidedFollowRef.current=next;setGuidedFollow(next);viewControlChannel.current?.sendGuidedFollow(next);if(next){const rect=board.current?.getBoundingClientRect();if(rect){const center=world({x:rect.width/2,y:rect.height/2});viewControlChannel.current?.sendFocus(liveLesson.studentId,center.x,center.y,view.zoom)}}}}>↝<span>{guidedFollow?"Ведение включено":"Вести экран"}</span></button>
          <button onClick={()=>{setPresentation(true);setPresentationFrameIndex(0);setPresentationSlidesOpen(false);setLessonPanelOpen(false)}}>▶<span>Презентация</span></button>
          <button onClick={()=>{window.history.pushState({},"","/?section=assignments");window.dispatchEvent(new PopStateEvent("popstate"))}}>✓<span>Задания</span></button>
          <button className={presentationTimerRunning?"active-tool":""} onClick={()=>{setPresentationTimerMode("elapsed");setPresentationTimerRunning(v=>!v)}}>◷<span>{presentationTimerRunning?"Пауза таймера":"Таймер"}</span></button>
          <button className={presentationLaser?"active-tool":""} onClick={()=>{setPresentationLaser(v=>!v);setPresentationSpotlight(false)}}>•<span>Лазер</span></button>
          <button className={presentationSpotlight?"active-tool":""} onClick={()=>{setPresentationSpotlight(v=>!v);setPresentationLaser(false)}}>◉<span>Прожектор</span></button>
        </div>
        <div className="lesson-control-online"><strong>На доске сейчас</strong>{presenceUsers.map(u=><div key={u.userId}><span className="presence-avatar">{u.name.charAt(0).toUpperCase()}</span><span><b>{u.name}{u.userId===authUser.id?" · Вы":""}</b><small>{BOARD_ROLE_LABELS[u.role]}</small></span>{u.userId!==authUser.id&&<button onClick={()=>{const rect=board.current?.getBoundingClientRect();if(!rect)return;const center=world({x:rect.width/2,y:rect.height/2});viewControlChannel.current?.sendFocus(u.userId,center.x,center.y,view.zoom)}}>Ко мне</button>}</div>)}</div>
        <button className="lesson-control-finish" onClick={()=>{setLessonPanelOpen(false);setLessonFinishOpen(true)}}>Завершить урок и записать результат</button>
      </aside>}
      {lessonFinishOpen && liveLesson && <div className="access-backdrop"><section className="access-modal lesson-live-modal"><div className="access-head"><div><h2>Завершить урок</h2><p>{liveLesson.studentName} · {lessonTime}</p></div><button onClick={()=>setLessonFinishOpen(false)}>×</button></div><label><span>Итог</span><textarea rows={4} value={lessonResult} onChange={e=>setLessonResult(e.target.value)}/></label><label><span>Домашнее задание</span><textarea rows={4} value={lessonHomework} onChange={e=>setLessonHomework(e.target.value)}/></label><div className="session-actions"><button className="students-primary" onClick={()=>void completeLiveLesson()}>Завершить и сохранить</button><button className="boards-secondary" onClick={()=>setLessonFinishOpen(false)}>Продолжить</button></div></section></div>}
      {studyOpen&&<div className="access-backdrop study-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setStudyOpen(false)}}><section className="access-modal study-modal" role="dialog" aria-modal="true" aria-label="Учебный режим"><div className="access-head"><div><h2>Учебный режим</h2><p>Пройдите мини-тесты и повторите карточки прямо на текущей доске</p></div><button onClick={()=>setStudyOpen(false)} aria-label="Закрыть">×</button></div><div className="study-tabs"><button className={studyTab==="quiz"?"active":""} onClick={()=>setStudyTab("quiz")}>Мини-тесты <b>{quizItems.length}</b></button><button className={studyTab==="flashcards"?"active":""} onClick={()=>setStudyTab("flashcards")}>Карточки <b>{flashcardItems.length}</b></button></div>{studyTab==="quiz"?<div className="study-quiz"><div className="study-summary"><article><b>{quizItems.length}</b><span>вопросов</span></article><article><b>{answeredQuizItems.length}</b><span>отвечено</span></article><article><b>{checkedQuizItems.length?`${correctQuizItems.length}/${checkedQuizItems.length}`:"—"}</b><span>результат</span></article><article><b>{checkedQuizItems.length?`${Math.round(correctQuizItems.length/checkedQuizItems.length*100)}%`:"—"}</b><span>точность</span></article></div>{quizItems.length===0?<div className="history-empty">На доске пока нет мини-тестов.</div>:<div className="study-question-list">{quizItems.map((item,index)=><article key={item.id} className={`study-question ${item.quizRevealed?"checked":""}`}><div><span>Вопрос {index+1}</span><strong>{item.text||"Вопрос"}</strong><small>{item.quizSelected==null?"Нет ответа":item.quizRevealed?(item.quizSelected===item.quizCorrect?"✓ Верно":"× Ошибка"):`Выбран ${String.fromCharCode(65+(item.quizSelected??0))}`}</small></div><button onClick={()=>{setStudyOpen(false);setSelected([item.id]);setView(v=>({...v,x:-(item.x+item.width/2)*v.zoom+window.innerWidth/2,y:-(item.y+item.height/2)*v.zoom+window.innerHeight/2}))}}>Показать</button></article>)}</div>}<div className="study-actions"><button className="primary" disabled={!answeredQuizItems.length} onClick={checkQuizResults}>Проверить ответы</button><button className="secondary" disabled={!answeredQuizItems.length&&!checkedQuizItems.length} onClick={resetAllQuizAnswers}>Пройти заново</button></div></div>:<div className="study-flashcards"><div className="study-summary"><article><b>{flashcardItems.length}</b><span>карточек</span></article><article><b>{knownFlashcards}</b><span>знаю</span></article><article><b>{againFlashcards}</b><span>повторить</span></article><article><b>{flashcardItems.length?`${Math.round(knownFlashcards/flashcardItems.length*100)}%`:"—"}</b><span>освоено</span></article></div>{currentStudyCard?<div className="study-card-stage"><div className="study-card-counter">{Math.min(studyCardIndex+1,flashcardItems.length)} / {flashcardItems.length}</div><div className="study-card-wrap"><FlashcardView item={currentStudyCard} onFlip={()=>flipFlashcard(currentStudyCard)}/></div><div className="study-card-grade"><button className="again" onClick={()=>markStudyCard("again")}>Повторить</button><button className="known" onClick={()=>markStudyCard("known")}>Знаю</button></div><div className="study-card-nav"><button onClick={()=>setStudyCardIndex(i=>(i-1+flashcardItems.length)%flashcardItems.length)}>← Предыдущая</button><button onClick={()=>setStudyCardIndex(i=>(i+1)%flashcardItems.length)}>Следующая →</button></div></div>:<div className="history-empty">На доске пока нет карточек.</div>}<div className="study-actions"><button className="secondary" disabled={!knownFlashcards&&!againFlashcards} onClick={resetFlashcardProgress}>Сбросить прогресс</button></div></div>}</section></div>}
      {discussionOpen&&<aside className="board-chat-drawer" role="complementary" aria-label="Чат доски"><div className="board-chat-head"><div><h2>Чат доски</h2><p>{title}</p></div><button className="board-chat-minimize" disabled={discussionBusy} onClick={()=>{setDiscussionOpen(false);setChatOpen(false)}} title="Свернуть чат" aria-label="Свернуть чат">−</button></div>{discussionError&&<div className="access-notice">{discussionError}</div>}<div className="discussions-list">{discussionBusy&&discussionRows.length===0&&<div className="history-empty">Загружаем…</div>}{!discussionBusy&&discussionRows.length===0&&<div className="history-empty">Сообщений пока нет. Напишите первое ниже.</div>}{discussionRows.filter(x=>!x.parent_id).map(row=>{const focused=discussionFocusId===row.id||discussionRows.some(x=>x.id===discussionFocusId&&x.parent_id===row.id);return <div id={`discussion-${row.id}`} className={`discussion-thread ${row.resolved?"resolved":""} ${focused?"focused":""}`} key={row.id}><article className="discussion-card"><div className="discussion-meta"><strong>{row.author_name}</strong><span>{new Date(row.created_at).toLocaleString("ru-RU")}{row.resolved?" · решено":""}</span></div><div className="discussion-body">{row.body}</div><div className="discussion-actions"><button onClick={()=>setDiscussionReplyTo(row.id)}>Ответить</button>{canEdit&&<button disabled={discussionBusy} onClick={()=>void toggleDiscussionResolved(row)}>{row.resolved?"Открыть снова":"Решено"}</button>}</div></article>{discussionRows.filter(x=>x.parent_id===row.id).map(reply=><article className={`discussion-card discussion-reply ${discussionFocusId===reply.id?"focused-reply":""}`} key={reply.id}><div className="discussion-meta"><strong>{reply.author_name}</strong><span>{new Date(reply.created_at).toLocaleString("ru-RU")}</span></div><div className="discussion-body">{reply.body}</div></article>)}</div>})}</div><div className="discussion-compose">{discussionReplyTo&&<div className="discussion-replying">Ответ на сообщение <button onClick={()=>setDiscussionReplyTo(null)}>отменить</button></div>}{discussionParticipants.length>0&&<div className="discussion-mentions"><span>Упомянуть:</span>{discussionParticipants.filter(x=>x.user_id!==authUser.id).slice(0,8).map(person=><button type="button" key={person.user_id} onClick={()=>insertDiscussionMention(person)}>@{person.display_name}</button>)}</div>}<textarea value={discussionDraft} onChange={e=>setDiscussionDraft(e.target.value)} maxLength={4000} placeholder={discussionReplyTo?"Напишите ответ…":"Сообщение в чат…"} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();void sendDiscussion()}}}/><button disabled={discussionBusy||!discussionDraft.trim()} onClick={()=>void sendDiscussion()}>Отправить</button><small>Ctrl+Enter · сообщения относятся только к этой доске</small></div></aside>}
      {historyOpen&&<div className="access-backdrop history-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget&&!historyBusy)setHistoryOpen(false)}}><section className="access-modal history-modal" role="dialog" aria-modal="true" aria-label="История версий"><div className="access-head"><div><h2>История изменений</h2><p>Кто и что менял между серверными сохранениями</p></div><button disabled={historyBusy} onClick={()=>setHistoryOpen(false)} aria-label="Закрыть">×</button></div>{historyBusy&&<div className="history-empty">Загружаем…</div>}{historyError&&<div className="access-notice">{historyError}</div>}{!historyBusy&&!historyError&&historyRows.length===0&&<div className="history-empty">История пока пуста. Изменения появятся после серверного сохранения доски.</div>}<div className="history-list">{historyRows.map((entry,index)=>{const changes=entry.added_count+entry.removed_count+entry.changed_count;return <div className="history-row history-rich-row" key={entry.id}><div className="history-main"><div className="history-title-line"><strong>{index===0?"Текущая сохранённая":`Версия №${entry.version}`}</strong><span className="history-author">{entry.saved_by_name||"Участник"}</span></div><span>{new Date(entry.saved_at).toLocaleString("ru-RU")} · объектов: {entry.item_count}</span><div className="history-delta" aria-label="Изменения версии">{entry.added_count>0&&<b className="history-added">+{entry.added_count} добавлено</b>}{entry.changed_count>0&&<b className="history-changed">~{entry.changed_count} изменено</b>}{entry.removed_count>0&&<b className="history-removed">−{entry.removed_count} удалено</b>}{changes===0&&<b className="history-unchanged">Без изменений объектов</b>}</div></div>{canEdit&&<button disabled={historyBusy||index===0} onClick={()=>void restoreHistoryVersion(entry)}>{index===0?"Текущая":"Восстановить"}</button>}</div>})}</div><p className="share-note">Хранятся последние 100 серверных снимков. Сводка сравнивает объекты с предыдущей версией. Восстановление создаёт новое состояние и не удаляет историю.</p></section></div>}
      {!canEdit && !publicPresentation && <div className="viewer-banner">Только просмотр</div>}
      {publicPresentation&&<div className="public-presentation-badge">Публичная презентация · ← → для навигации · F — полный экран</div>}
      {!online&&<div className="offline-banner" role="status"><strong>Офлайн</strong><span>Можно продолжать работу с уже открытой локальной доской. Серверная синхронизация возобновится после подключения.</span></div>}{updateReady&&<div className="update-banner" role="status"><span>Доступна новая версия OnlineRepetitor.</span><button type="button" onClick={applyUpdate}>Обновить</button><button type="button" className="secondary" onClick={()=>setUpdateReady(null)}>Позже</button></div>}<header className="topbar">
        <div className="topbar-left">
          <button
            className="back-to-boards board-home-button"
            type="button"
            onClick={() => {
              finishEdit();
              flushSave();
              onBackToBoards();
            }}
            title="Вернуться к списку досок"
          >
            ← Доски
          </button>
          <input
            aria-label="Название доски"
            className="board-title"
            value={title}
            onChange={(e) => { if (canEdit) setTitle(e.target.value); }}
            onKeyDown={(e) => e.stopPropagation()}
            onFocus={() => {
              setSpace(false);
              end(true);
            }}
            maxLength={300}
            readOnly={!canEdit}
          />
          <span className="save-status">{saveStatus}</span>{authUser.isGuest&&<span className="guest-session-badge" title="Временная гостевая сессия">Гость · {authUser.name}</span>}
          {isRemoteBackendEnabled() && <span className={`realtime-status ${realtimeStatus}`} role="status">
            {realtimeStatus === "online" ? "Онлайн" : realtimeStatus === "reconnecting" ? "Переподключение..." : "Офлайн"}
          </span>}
        </div>
        <div className="topbar-right">{installPrompt&&!isStandalone&&<button type="button" className="install-app-button" onClick={()=>void installApp()} title="Установить OnlineRepetitor на устройство">{isCoarsePointer?"Установить приложение":"Установить"}</button>}
          {isRemoteBackendEnabled() && <details className="presence-menu">
            <summary title="Пользователи, которые сейчас находятся на доске">
              <span className="presence-live-dot" aria-hidden="true"/>
              <span>В сети {Math.max(1, presenceUsers.length)}</span>
            </summary>
            <div className="presence-popover">
              <div className="presence-popover-head">
                <strong>Сейчас на доске</strong>
                {boardSummary.role === "owner" && presenceUsers.some((user) => user.userId !== authUser.id) && <button
                  type="button"
                  className={`presence-gather-button ${guidedFollow ? "active" : ""}`}
                  title={guidedFollow ? "Отключить обязательное следование участников" : "Включить следование всех участников за преподавателем"}
                  onClick={() => {
                    const next = !guidedFollow;
                    guidedFollowRef.current = next;
                    setGuidedFollow(next);
                    viewControlChannel.current?.sendGuidedFollow(next);

                    const rect = board.current?.getBoundingClientRect();
                    if (next && rect) {
                      const center = world({ x: rect.width / 2, y: rect.height / 2 });
                      const targets = presenceUsers.filter((user) => user.userId !== authUser.id);
                      for (const user of targets) {
                        viewControlChannel.current?.sendFocus(user.userId, center.x, center.y, view.zoom);
                      }
                    }

                    setNotice(next ? "Все участники следуют за вами" : "Общее следование отключено");
                  }}
                >
                  {guidedFollow ? "Все следуют" : "Вести всех"}
                </button>}
                {boardSummary.role === "owner" && presenceUsers.some((user) => user.userId !== authUser.id) && <button
                  type="button"
                  className="presence-gather-button"
                  title="Переместить всех остальных участников к вашей текущей области доски"
                  onClick={() => {
                    const rect = board.current?.getBoundingClientRect();
                    if (!rect) return;

                    const center = world({ x: rect.width / 2, y: rect.height / 2 });
                    const targets = presenceUsers.filter((user) => user.userId !== authUser.id);

                    for (const user of targets) {
                      viewControlChannel.current?.sendFocus(user.userId, center.x, center.y, view.zoom);
                    }

                    setNotice(targets.length === 1 ? "Участник перемещён к вам" : `Участники перемещены к вам: ${targets.length}`);
                  }}
                >
                  Собрать всех
                </button>}
              </div>
              {presenceUsers.length ? presenceUsers.map((user) => <div className="presence-person" key={user.userId}>
                <span className="presence-avatar" aria-hidden="true">{user.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span className="presence-person-copy">
                  <b>{user.name}{user.userId === authUser.id ? " · Вы" : ""}</b>
                  <small>{BOARD_ROLE_LABELS[user.role]}{remoteWork[user.userId]?.editingId ? " · редактирует объект" : remoteWork[user.userId]?.selectedIds.length ? ` · выбрано: ${remoteWork[user.userId].selectedIds.length}` : ""}</small>
                </span>
                {boardSummary.role === "owner" && user.userId !== authUser.id && <button
                  type="button"
                  className="presence-focus-button"
                  title={`Переместить экран пользователя ${user.name} к вашей текущей области доски`}
                  onClick={() => {
                    const rect = board.current?.getBoundingClientRect();
                    if (!rect) return;
                    const center = world({ x: rect.width / 2, y: rect.height / 2 });
                    viewControlChannel.current?.sendFocus(user.userId, center.x, center.y, view.zoom);
                    setNotice(`${user.name}: экран перемещён к вам`);
                  }}
                >
                  Ко мне
                </button>}
              </div>) : <div className="presence-person">
                <span className="presence-avatar" aria-hidden="true">{authUser.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span className="presence-person-copy">
                  <b>{authUser.name} · Вы</b>
                  <small>{BOARD_ROLE_LABELS[boardSummary.role]}</small>
                </span>
              </div>}
            </div>
          </details>}
          {remoteEditingCount > 0 && <span className="collab-editing-status" title="Сейчас другие участники редактируют объекты">
            ✎ {remoteEditingCount}
          </span>}
          {boardSummary.role !== "owner" && isRemoteBackendEnabled() && <button
            type="button"
            className={`lesson-button follow-teacher-button ${followTeacher || guidedFollow ? "active" : ""}`}
            title={guidedFollow ? "Преподаватель включил общий режим следования" : followTeacher ? "Перестать автоматически следовать за экраном преподавателя" : "Автоматически следовать за экраном преподавателя"}
            disabled={guidedFollow}
            onClick={() => {
              if (guidedFollow) return;
              setFollowTeacher((current) => {
                const next = !current;
                followTeacherRef.current = next;
                setNotice(next ? "Следование за преподавателем включено" : "Следование за преподавателем выключено");
                return next;
              });
            }}
            aria-label={guidedFollow ? "Преподаватель включил следование" : followTeacher ? "Следование за преподавателем включено" : "Следовать за преподавателем"}
          >
            <svg className="follow-teacher-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 12h10"/>
              <path d="m11 8 4 4-4 4"/>
              <path d="M17.5 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
              <path d="M14.5 21v-4.5c0-2 1.3-3.5 3-3.5s3 1.5 3 3.5V21"/>
            </svg>
            {(followTeacher || guidedFollow) && <span className="follow-teacher-live-dot" aria-hidden="true"/>}
          </button>}
          {boardSummary.role === "owner" && (liveLesson ? <div className="live-lesson-chip"><span className="live-lesson-dot"/><button className="live-lesson-main" onClick={()=>setLessonPanelOpen(true)} title="Открыть панель урока"><span><b>{liveLesson.studentName}</b><small>{liveLesson.topic||"Урок"} · {lessonTime}</small></span></button><button onClick={()=>setLessonFinishOpen(true)}>Завершить</button></div> : <button className="lesson-button start-live-lesson" onClick={()=>{setLessonStudentId(lessonStudents[0]?.userId||"");setLessonOpen(true)}}>Начать урок</button>)}
          {boardSummary.role === "owner" && <button className="lesson-button board-invite-button" onClick={() => setSharing(true)}><span aria-hidden="true">＋</span> Пригласить</button>}
          {isRemoteBackendEnabled() && <button type="button" className={`lesson-button board-chat-button ${chatOpen ? "active" : ""}`} onClick={()=>void openDiscussions()} title="Чат этой доски" aria-label={`Чат этой доски${chatUnread?` · новых сообщений ${chatUnread}`:""}`}><Icon name="comments" size={16}/><span>Чат</span>{chatUnread>0&&<b className="top-badge">{chatUnread>99?"99+":chatUnread}</b>}</button>}
          <details className="topbar-more-menu">
            <summary className="top-button topbar-more-trigger" title="Дополнительные действия" aria-label="Дополнительные действия"><Icon name="more" /></summary>
            <div className="topbar-more-popover">
              <div className="topbar-menu-account">
                <span className="account-avatar" aria-hidden="true">{authUser.name.trim().charAt(0).toUpperCase() || "U"}</span>
                <span><strong>{authUser.name}</strong><small>{BOARD_ROLE_LABELS[boardSummary.role]}{authUser.email?` · ${authUser.email}`:""}</small></span>
              </div>
              <div className="topbar-menu-section">
                {(quizItems.length>0||flashcardItems.length>0)&&<button onClick={()=>setStudyOpen(true)}><Icon name="quiz" size={16}/><span>Учебный режим</span><b>{quizItems.length+flashcardItems.length}</b></button>}
                <button onClick={()=>void openDiscussions()}><Icon name="comments" size={16}/><span>Чат</span>{chatUnread>0&&<b>{chatUnread}</b>}</button>
                <button onClick={()=>void openHistory()}><Icon name="reset" size={16}/><span>История изменений</span></button>
              </div>
              <div className="topbar-menu-section">
                <button onClick={()=>{finishEdit();fileInput.current?.click()}}><Icon name="open" size={16}/><span>Импорт доски</span></button>
                {previous&&<button onClick={()=>{if(window.confirm("Вернуть доску, сохранённую перед последним импортом? Текущие изменения заменятся.")){applyDocument(previous);setNotice("Доска до импорта восстановлена")}}}><Icon name="undo" size={16}/><span>Вернуть до импорта</span></button>}
                <button onClick={()=>void exportBoard()}><Icon name="download" size={16}/><span>Скачать копию</span></button>
              </div>
              <div className="topbar-menu-section">
                <button className="topbar-menu-danger" onClick={()=>{finishEdit();flushSave();onLogout()}}><Icon name="close" size={16}/><span>Выйти из аккаунта</span></button>
              </div>
            </div>
          </details>
          <input
            ref={mediaInput}
            type="file"
            accept="image/*,.pdf,application/pdf"
            multiple
            hidden
            aria-label="Добавить фото или PDF"
            onChange={async (e) => {
              const files = Array.from(e.target.files ?? []) as File[];
              e.target.value = "";
              if (!files.length) return;
              try {
                for (let i = 0; i < files.length; i++) await addMediaFile(files[i], undefined, i * 24);
                setNotice(files.length === 1 ? "Файл добавлен на доску" : `Добавлено файлов: ${files.length}`);
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Не удалось добавить файл");
              }
            }}
          />
          <input
            ref={fileInput}
            type="file"
            accept=".orboard,.json,application/json"
            hidden
            aria-label="Файл резервной копии"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void importBoard(file);
            }}
          />
          <button
            className="top-button"
            onClick={() => void exportItemsToPng("all")}
            title="Экспорт всей доски в PNG · Ctrl+Shift+E без выделения"
            aria-label="Экспорт всей доски в PNG"
          >
            <Icon name="download" />
          </button>
          <button
            className={`top-button ${templatesOpen ? "active" : ""}`}
            onClick={() => { setTemplatesOpen((value) => !value); setSearchOpen(false); setLayersOpen(false); setCommentsOpen(false); setShortcutsOpen(false); }}
            title="Шаблоны уроков и схем"
            aria-label="Шаблоны"
          >
            <Icon name="templates" />
          </button>
          <button
            className={`top-button ${shortcutsOpen ? "active" : ""}`}
            onClick={() => { setShortcutsOpen((value) => !value); setSearchOpen(false); setLayersOpen(false); setCommentsOpen(false); setTemplatesOpen(false); }}
            title="Горячие клавиши · F1"
            aria-label="Горячие клавиши"
          >
            <Icon name="keyboard" />
          </button>
          <button
            className={`top-button comments-top-button ${commentsOpen ? "active" : ""}`}
            onClick={() => { setCommentsOpen((value) => !value); setSearchOpen(false); setLayersOpen(false); setTemplatesOpen(false); setShortcutsOpen(false); }}
            title="Комментарии"
            aria-label={`Комментарии${openComments.length ? ` · открыто ${openComments.length}` : ""}`}
          >
            <Icon name="comments" />
            {openComments.length > 0 && <span className="top-badge">{Math.min(99, openComments.length)}</span>}
          </button>
          <button
            className={`top-button ${searchOpen ? "active" : ""}`}
            onClick={() => { setSearchOpen((value) => !value); setLayersOpen(false); setTemplatesOpen(false); setCommentsOpen(false); setShortcutsOpen(false); }}
            title="Поиск по доске · Ctrl+F"
            aria-label="Поиск по доске"
          >
            <Icon name="search" />
          </button>
          <button
            className="top-button"
            onClick={startPresentation}
            title="Режим показа"
            aria-label="Режим показа"
          >
            <Icon name="present" />
          </button>
          <button
            className={`top-button ${layersOpen ? "active" : ""}`}
            onClick={() => { setLayersOpen((value) => !value); setSearchOpen(false); setTemplatesOpen(false); setCommentsOpen(false); setShortcutsOpen(false); }}
            title="Слои и объекты"
            aria-label="Открыть панель слоёв"
          >
            <Icon name="layers" />
          </button>
          <button
            className="top-button"
            disabled={index.current === 0}
            onClick={() => undo(-1)}
            title="Отменить · Ctrl+Z"
          >
            <Icon name="undo" />
          </button>
          <button
            className="top-button"
            disabled={index.current === history.current.length - 1}
            onClick={() => undo(1)}
            title="Повторить · Ctrl+Y"
          >
            <Icon name="redo" />
          </button>
        </div>
      </header>
      <main className="workspace">
        {presentation && (
          <div className="presentation-controls" onPointerDown={(e) => e.stopPropagation()}>
            <button disabled={!presentationFrames.length} onClick={() => stepPresentation(-1)} title="Предыдущий фрейм · ← / PageUp"><Icon name="chevron-left" size={18} /></button>
            <div className="presentation-frame-label">
              <strong>{activePresentationFrame?.text || (presentationFrames.length ? "Без названия" : "Вся доска")}</strong>
              <span>{presentationFrames.length ? `${presentationFrameIndex + 1} / ${presentationFrames.length}` : "Фреймы не созданы"}</span>
              {presentationFrames.length>0&&<div className="presentation-progress" title={`Слайд ${presentationFrameIndex+1} из ${presentationFrames.length}`}><i style={{width:`${((presentationFrameIndex+1)/presentationFrames.length)*100}%`}}/></div>}
            </div>
            <button disabled={!presentationFrames.length} onClick={() => stepPresentation(1)} title="Следующий фрейм · → / PageDown"><Icon name="chevron-right" size={18} /></button>
            <button className={presentationSlidesOpen ? "active" : ""} disabled={!presentationFrames.length} onClick={() => setPresentationSlidesOpen((value) => !value)} title="Список слайдов"><Icon name="slides" size={17}/></button>
            <div className={`presentation-timer presentation-author-only ${presentationTimerMode === "countdown" ? "countdown" : ""}`} title="Таймер · T переключает секундомер / обратный отсчёт">
              <button className="timer-mode-toggle" onClick={() => setPresentationTimerMode((mode) => mode === "elapsed" ? "countdown" : "elapsed")} title="Переключить режим таймера · T"><Icon name="timer" size={15}/></button>
              <strong>{formatPresentationTime(presentationTimerMode === "elapsed" ? presentationElapsed : presentationCountdownRemaining)}</strong>
              {presentationTimerMode === "countdown" && <label className="countdown-minutes" title="Минуты обратного отсчёта"><input type="number" min="1" max="180" value={Math.max(1, Math.round(presentationCountdownTotal / 60))} onChange={(e) => { const seconds = Math.max(60, Math.min(10800, (Number(e.target.value) || 1) * 60)); setPresentationCountdownTotal(seconds); setPresentationCountdownRemaining(seconds); }}/><span>м</span></label>}
              <button onClick={() => setPresentationTimerRunning((value) => !value)} title={presentationTimerRunning ? "Пауза · P" : "Продолжить · P"}><Icon name={presentationTimerRunning ? "pause" : "play"} size={14}/></button>
              <button onClick={() => presentationTimerMode === "elapsed" ? setPresentationElapsed(0) : setPresentationCountdownRemaining(presentationCountdownTotal)} title="Сбросить таймер"><Icon name="reset" size={14}/></button>
            </div>
            <button className={`presentation-author-only ${presentationLaser ? "active laser-active" : ""}`} onClick={() => { setPresentationLaser((value) => !value); setPresentationSpotlight(false); setPresentationLaserPos(null); }} title="Лазерная указка · L"><Icon name="laser" size={17}/></button>
            <button className={`presentation-author-only ${presentationSpotlight ? "active" : ""}`} onClick={() => { setPresentationSpotlight((value) => !value); setPresentationLaser(false); setPresentationLaserPos(null); setPresentationSpotlightPos({ x: (board.current?.clientWidth ?? 800) / 2, y: (board.current?.clientHeight ?? 600) / 2 }); }} title="Прожектор · O · [ ] меняют размер"><Icon name="spotlight" size={17}/></button>
            {presentationSpotlight && <div className="presentation-spotlight-size presentation-author-only" title="Размер прожектора · [ / ]"><button onClick={() => setPresentationSpotlightRadius((value) => Math.max(80, value - 20))}>−</button><strong>{presentationSpotlightRadius}</strong><button onClick={() => setPresentationSpotlightRadius((value) => Math.min(360, value + 20))}>+</button></div>}
            {presentationQuizzes.length > 0 && <button className={`presentation-author-only ${presentationQuizzesRevealed ? "active" : ""}`} onClick={togglePresentationQuizAnswers} title="Показать / скрыть правильные ответы текущего слайда"><Icon name="quiz" size={17}/></button>}
            {presentationFlashcards.length > 0 && <button className={`presentation-author-only ${presentationFlashcardsFlipped ? "active" : ""}`} onClick={togglePresentationFlashcards} title={presentationFlashcardsFlipped ? "Показать вопросы всех карточек" : "Показать ответы всех карточек"}><Icon name="flashcard" size={17}/></button>}
            {(presentationQuizzes.length > 0 || presentationFlashcards.length > 0 || presentationChecklists.length > 0 || presentationCovers.length > 0) && <button className="presentation-author-only" onClick={resetPresentationInteractions} title="Сбросить все интерактивные задания текущего слайда · R"><Icon name="reset" size={16}/></button>}
            <button className={`presentation-author-only ${presentationBlackout ? "active" : ""}`} onClick={() => setPresentationBlackout((value) => !value)} title="Затемнить экран · B"><Icon name="eye-off" size={17}/></button>
            {activePresentationFrame && <button className={`presentation-author-only ${presentationNotesOpen ? "active" : ""}`} onClick={() => setPresentationNotesOpen((value) => !value)} title="Заметки к текущему фрейму"><Icon name="label" size={17}/></button>}
            {activePresentationFrame && <button className="presentation-author-only" onClick={() => void exportItemsToPng("frame", activePresentationFrame.id)} title="Скачать текущий фрейм PNG"><Icon name="download" size={17}/></button>}
            <button onClick={() => void toggleFullscreen()} title="Полноэкранный режим"><Icon name="fullscreen" size={17}/></button>
            <span className="presentation-controls-separator presentation-author-only" />
            <button className="presentation-author-only" onClick={() => { setPresentation(false); setPresentationTimerRunning(false); setPresentationLaser(false); setPresentationLaserPos(null); setPresentationSpotlight(false); setPresentationSpotlightPos(null); setPresentationBlackout(false); }} title="Выйти из режима показа · Esc"><Icon name="close" size={18} /></button>
          </div>
        )}
        {presentation && presentationSlidesOpen && presentationFrames.length > 0 && (
          <aside className="presentation-slides-panel" onPointerDown={(e) => e.stopPropagation()}>
            <div className="presentation-slides-head"><strong>Слайды</strong><span>{presentationFrames.length}</span></div>
            <div className="presentation-slides-list">{presentationFrames.map((frame, indexValue) => (
              <button key={frame.id} className={indexValue === presentationFrameIndex ? "active" : ""} onClick={() => { showPresentationFrame(indexValue); setPresentationSlidesOpen(false); }}>
                <span>{indexValue + 1}</span><strong>{frame.text || "Без названия"}</strong>
              </button>
            ))}</div>
          </aside>
        )}
        {presentation && !publicPresentation && presentationNotesOpen && activePresentationFrame && (
          <div className="presentation-notes" onPointerDown={(e) => e.stopPropagation()}>
            <div><strong>Заметки · {activePresentationFrame.text || "Без названия"}</strong><button onClick={() => setPresentationNotesOpen(false)} aria-label="Скрыть заметки"><Icon name="close" size={14}/></button></div>
            <p>{activePresentationFrame.notes?.trim() || "Для этого фрейма заметки ещё не добавлены."}</p>
          </div>
        )}
        {notice && (
          <div className="notice" role="status">
            {notice}
            <button
              aria-label="Закрыть уведомление"
              onClick={() => setNotice("")}
            >
              <Icon name="close" size={15} />
            </button>
          </div>
        )}
        {shortcutsOpen && (
          <aside className="shortcuts-panel" aria-label="Горячие клавиши">
            <div className="panel-heading">
              <div><strong>Горячие клавиши</strong><span>Работают по физическим клавишам и не зависят от раскладки</span></div>
              <button onClick={() => setShortcutsOpen(false)} aria-label="Закрыть подсказку"><Icon name="close" size={17}/></button>
            </div>
            <div className="shortcuts-grid">
              <section><strong>Инструменты</strong>
                {[["V / М","Выделение"],["H / Р","Рука"],["Q / Й","Петля"],["P / З","Карандаш"],["M / Ь","Маркер"],["E / У","Ластик"],["C / С","Связь"],["F / А","Фрейм"],["T / Е","Текст"],["S / Ы","Стикер"],["R / К","Фигуры"],["B / И","Таблица"],["X / Ч","Формула"],["K / Л","Чек-лист"],["G / П","Мини-тест"],["J / О","Карточка вопрос–ответ"],["U / Г","Шторка / открыть ответ"],["I / Ш","Фото / PDF"]].map(([key,label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}
              </section>
              <section><strong>Редактирование</strong>
                {[["Ctrl+Z","Отменить"],["Ctrl+Y","Повторить"],["Ctrl+C / V","Копировать / вставить"],["Ctrl+D","Дублировать"],["Ctrl+G","Сгруппировать"],["Ctrl+Shift+G","Разгруппировать"],["Delete","Удалить"],["Enter / F2","Редактировать"],["Alt+← / →","Повернуть на 90°"],["Shift+стрелки","Сдвиг на 10 px"],["Ctrl+F","Поиск"],["Ctrl+Shift+E","Экспорт PNG"]].map(([key,label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}
              </section>
              <section><strong>Режим показа</strong>
                {[["← / →","Предыдущий / следующий слайд"],["Home / End","Первый / последний"],["L","Лазер"],["O","Прожектор"],["[ / ]","Размер прожектора"],["P","Пауза таймера"],["T","Секундомер / отсчёт"],["B","Затемнить экран"],["R","Сбросить задания слайда"],["Esc","Выйти из показа"],["F1","Эта памятка"]].map(([key,label]) => <div key={key}><kbd>{key}</kbd><span>{label}</span></div>)}
              </section>
            </div>
          </aside>
        )}
        {templatesOpen && (
          <aside className="templates-panel" aria-label="Шаблоны">
            <div className="panel-heading">
              <div><strong>Шаблоны</strong><span>Готовые заготовки для урока и обсуждения</span></div>
              <button onClick={() => setTemplatesOpen(false)} aria-label="Закрыть шаблоны"><Icon name="close" size={17} /></button>
            </div>
            <div className="template-grid">
              <button onClick={() => insertTemplate("lesson")}><span className="template-preview lesson"><i/><i/><i/><i/></span><strong>План урока</strong><small>цель, идея, практика, итог</small></button>
              <button onClick={() => insertTemplate("mindmap")}><span className="template-preview mindmap"><i/><i/><i/><i/><b/></span><strong>Карта идей</strong><small>центр и четыре связанные ветки</small></button>
              <button onClick={() => insertTemplate("compare")}><span className="template-preview compare"><i/><i/><b>VS</b></span><strong>Сравнение</strong><small>два подхода рядом</small></button>
              <button onClick={() => insertTemplate("brainstorm")}><span className="template-preview brainstorm">{Array.from({length:8},(_,i)=><i key={i}/>)}</span><strong>Мозговой штурм</strong><small>поле для восьми идей</small></button>
              <button onClick={() => insertTemplate("checklist")}><span className="template-preview checklist">{Array.from({length:4},(_,i)=><i key={i}/>)}</span><strong>Проверка понимания</strong><small>чек-лист, вопрос и следующий шаг</small></button>
              <button onClick={() => insertTemplate("quiz")}><span className="template-preview quiz"><b>?</b><i/><i/><i/></span><strong>Быстрый опрос</strong><small>вопрос, варианты и обсуждение ответа</small></button>
              <button onClick={() => insertTemplate("cards")}><span className="template-preview cards"><b>Q</b><i/><b>A</b></span><strong>Карточки для повторения</strong><small>шесть вопрос–ответ карточек</small></button>
            </div>
          </aside>
        )}
        {commentsOpen && (
          <aside className="comments-panel" aria-label="Комментарии">
            <div className="panel-heading">
              <div><strong>Комментарии</strong><span>{openComments.length} открыто · {comments.length} всего</span></div>
              <button onClick={() => setCommentsOpen(false)} aria-label="Закрыть комментарии"><Icon name="close" size={17} /></button>
            </div>
            <button className="new-comment-button" onClick={() => { setTool("comment"); setCommentsOpen(false); setNotice("Щёлкните по объекту или пустому месту, чтобы добавить комментарий"); }}><Icon name="plus" size={15}/> Новый комментарий</button>
            <div className="comments-list">
              {[...comments].reverse().map((comment) => (
                <div key={comment.id} className={`comment-list-row ${comment.resolved ? "resolved" : ""}`}>
                  <button className="comment-list-main" onClick={() => focusItem(comment)}>
                    <span className="comment-list-status"><Icon name={comment.resolved ? "check" : "comment"} size={15}/></span>
                    <span><strong>{comment.text.trim().replace(/\s+/g," ").slice(0,72) || "Пустой комментарий"}</strong><small>{comment.commentTargetId ? "Привязан к объекту" : "На доске"}</small></span>
                  </button>
                  <button className="comment-resolve-button" title={comment.resolved ? "Открыть снова" : "Отметить решённым"} onClick={() => commit(itemsRef.current.map((item) => item.id === comment.id ? { ...item, resolved: !comment.resolved } : item))}><Icon name="check" size={14}/></button>
                </div>
              ))}
              {!comments.length && <div className="comments-empty">Комментариев пока нет. Добавьте замечание прямо к объекту или на свободное место.</div>}
            </div>
          </aside>
        )}
        {searchOpen && (
          <aside className="search-panel" aria-label="Поиск по доске">
            <div className="search-panel-header">
              <div>
                <strong>Поиск</strong>
                <span>{searchQuery.trim() ? `${searchResults.length} найдено` : "Текст, вопросы, карточки, комментарии, таблицы, формулы, чек-листы, фреймы и файлы"}</span>
              </div>
              <button onClick={() => setSearchOpen(false)} aria-label="Закрыть поиск"><Icon name="close" size={17} /></button>
            </div>
            <input
              className="board-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.code === "Escape") { e.stopPropagation(); setSearchOpen(false); } }}
              placeholder="Найти на доске…"
              autoFocus
            />
            <div className="search-results">
              {searchQuery.trim() && searchResults.map((item) => (
                <button key={item.id} className="search-result" onClick={() => focusItem(item)}>
                  <span className={`search-kind search-kind-${item.kind}`}><Icon name={itemIconName(item)} size={16} /></span>
                  <span><strong>{itemLabel(item)}</strong><small>{item.name && item.text ? item.name : itemKindLabel(item)}</small></span>
                </button>
              ))}
              {searchQuery.trim() && !searchResults.length && <div className="search-empty">Ничего не найдено</div>}
              {!searchQuery.trim() && <div className="search-empty">Начните вводить слово или название файла</div>}
            </div>
          </aside>
        )}
        {layersOpen && (
          <aside className="layers-panel" aria-label="Слои и объекты">
            <div className="layers-panel-header">
              <div>
                <strong>Слои</strong>
                <span>{visibleItems.length} видно · {items.length} всего</span>
              </div>
              <button onClick={() => setLayersOpen(false)} aria-label="Закрыть слои"><Icon name="close" size={17} /></button>
            </div>
            <div className="layers-list">
              {layerRows.map((item) => {
                const family = item.groupId ? items.filter((candidate) => candidate.groupId === item.groupId) : [item];
                const isSelected = family.every((candidate) => selected.includes(candidate.id));
                const familyHidden = family.every((candidate) => candidate.hidden);
                return (
                  <div key={item.groupId ?? item.id} className={`layer-row ${isSelected ? "selected" : ""} ${familyHidden ? "hidden" : ""}`}>
                    <button
                      className="layer-main"
                      onClick={() => {
                        finishEdit();
                        setTool("select");
                        setSelected(family.map((candidate) => candidate.id));
                      }}
                      title={itemLabel(item)}
                    >
                      <span className="layer-index">{items.indexOf(item) + 1}</span>
                      <span className={`layer-kind layer-kind-${item.kind}`}><Icon name={itemIconName(item)} size={14} /></span>
                      <span className="layer-name">{itemLabel(item)}</span>
                      {item.groupId && <span className="layer-group">G</span>}
                    </button>
                    <button
                      className={`layer-visibility ${familyHidden ? "inactive" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const ids = new Set(family.map((candidate) => candidate.id));
                        const shouldHide = family.some((candidate) => !candidate.hidden);
                        commit(itemsRef.current.map((candidate) => ids.has(candidate.id) ? { ...candidate, hidden: shouldHide } : candidate));
                        if (shouldHide) setSelected((current) => current.filter((id) => !ids.has(id)));
                      }}
                      title={familyHidden ? "Показать" : "Скрыть"}
                      aria-label={familyHidden ? "Показать объект" : "Скрыть объект"}
                    >
                      <Icon name={familyHidden ? "eye-off" : "eye"} size={15} />
                    </button>
                    <button
                      className={`layer-lock ${item.locked ? "active" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        const ids = new Set(family.map((candidate) => candidate.id));
                        const shouldLock = family.some((candidate) => !candidate.locked);
                        commit(itemsRef.current.map((candidate) => ids.has(candidate.id) ? { ...candidate, locked: shouldLock } : candidate));
                      }}
                      title={item.locked ? "Разблокировать" : "Заблокировать"}
                      aria-label={item.locked ? "Разблокировать объект" : "Заблокировать объект"}
                    >
                      <Icon name={item.locked ? "lock" : "unlock"} size={15} />
                    </button>
                  </div>
                );
              })}
              {!items.length && <div className="layers-empty">На доске пока нет объектов</div>}
            </div>
          </aside>
        )}
        {frameNotesEditorId && (
          <div className="notes-editor-backdrop" onPointerDown={() => { setFrameNotesEditorId(null); setFrameNotesDraft(""); }}>
            <div className="notes-editor-modal" role="dialog" aria-modal="true" aria-label="Заметки к фрейму" onPointerDown={(e) => e.stopPropagation()}>
              <div className="notes-editor-header">
                <div><strong>Заметки к фрейму</strong><span>Видны только вам при подготовке и во время показа</span></div>
                <button onClick={() => { setFrameNotesEditorId(null); setFrameNotesDraft(""); }} aria-label="Закрыть"><Icon name="close" size={17}/></button>
              </div>
              <textarea value={frameNotesDraft} onChange={(e) => setFrameNotesDraft(e.target.value)} placeholder="Подсказки, вопросы аудитории, тайминг, важные акценты…" autoFocus />
              <div className="notes-editor-footer"><span>{frameNotesDraft.length} / 20000</span><div><button className="secondary" onClick={() => { setFrameNotesEditorId(null); setFrameNotesDraft(""); }}>Отмена</button><button className="primary" onClick={saveFrameNotes}><Icon name="check" size={15}/> Сохранить</button></div></div>
            </div>
          </div>
        )}
        {graphEditorId && graphDraft && (<div className="graph-editor-backdrop" onPointerDown={closeGraphEditor}><div className="graph-editor-modal" role="dialog" aria-modal="true" onPointerDown={(e)=>e.stopPropagation()}><div className="graph-editor-header"><div><strong>График функции</strong><span>Координатная плоскость и параметры функции</span></div><button onClick={closeGraphEditor}><Icon name="close" size={17}/></button></div><div className="graph-editor-body"><div className="graph-editor-form"><div className="graph-presets"><button type="button" onClick={()=>setGraphDraft({...graphDraft,type:"linear",a:1,b:0,c:0})}>y=x</button><button type="button" onClick={()=>setGraphDraft({...graphDraft,type:"quadratic",a:1,b:0,c:0})}>y=x²</button><button type="button" onClick={()=>setGraphDraft({...graphDraft,type:"sin",a:1,b:1,c:0})}>sin x</button><button type="button" onClick={()=>setGraphDraft({...graphDraft,type:"cos",a:1,b:1,c:0})}>cos x</button></div><label><span>Тип функции</span><select value={graphDraft.type} onChange={e=>setGraphDraft({...graphDraft,type:e.target.value as "linear"|"quadratic"|"sin"|"cos"})}><option value="linear">Линейная y = ax + b</option><option value="quadratic">Парабола y = ax² + bx + c</option><option value="sin">Синус y = a·sin(bx+c)</option><option value="cos">Косинус y = a·cos(bx+c)</option></select></label><div className="graph-coefficients">{(["a","b","c"] as const).map(k=><label key={k}><span>{k}</span><input type="number" step="0.1" value={graphDraft[k]} onChange={e=>setGraphDraft({...graphDraft,[k]:Number(e.target.value)})}/></label>)}</div><strong>Диапазон осей</strong><div className="graph-ranges"><label>X min<input type="number" value={graphDraft.xMin} onChange={e=>setGraphDraft({...graphDraft,xMin:Number(e.target.value)})}/></label><label>X max<input type="number" value={graphDraft.xMax} onChange={e=>setGraphDraft({...graphDraft,xMax:Number(e.target.value)})}/></label><label>Y min<input type="number" value={graphDraft.yMin} onChange={e=>setGraphDraft({...graphDraft,yMin:Number(e.target.value)})}/></label><label>Y max<input type="number" value={graphDraft.yMax} onChange={e=>setGraphDraft({...graphDraft,yMax:Number(e.target.value)})}/></label></div><label className="graph-grid-toggle"><input type="checkbox" checked={graphDraft.grid} onChange={e=>setGraphDraft({...graphDraft,grid:e.target.checked})}/> Показывать сетку</label><label className="graph-grid-toggle"><input type="checkbox" checked={graphDraft.showLabels} onChange={e=>setGraphDraft({...graphDraft,showLabels:e.target.checked})}/> Подписи точек</label><label className="graph-grid-toggle"><input type="checkbox" checked={graphDraft.snap} onChange={e=>setGraphDraft({...graphDraft,snap:e.target.checked})}/> Привязка точек к сетке</label><label className="graph-grid-toggle"><input type="checkbox" checked={graphDraft.axisLabels} onChange={e=>setGraphDraft({...graphDraft,axisLabels:e.target.checked})}/> Числа на осях</label><label><span>Шаг сетки</span><select value={graphDraft.gridStep} onChange={e=>setGraphDraft({...graphDraft,gridStep:Number(e.target.value)})}><option value={0.5}>0,5</option><option value={1}>1</option><option value={2}>2</option><option value={5}>5</option><option value={10}>10</option></select></label><label className="graph-grid-toggle"><input type="checkbox" checked={graphDraft.showCurve} onChange={e=>setGraphDraft({...graphDraft,showCurve:e.target.checked})}/> Показывать график функции</label><label className="graph-grid-toggle"><input type="checkbox" checked={graphDraft.projections} onChange={e=>setGraphDraft({...graphDraft,projections:e.target.checked})}/> Проекции точек на оси</label><div className="graph-quick-actions"><button type="button" onClick={()=>setGraphDraft({...graphDraft,xMin:-10,xMax:10,yMin:-10,yMax:10})}>Центр -10...10</button><button type="button" onClick={autoFitGraph}>Автодиапазон</button><button type="button" disabled={!graphDraft.points.length} onClick={()=>void copyGraphPoints()}>Копировать точки</button></div><div className="graph-points-editor"><div className="graph-points-head"><strong>Точки</strong><button type="button" onClick={()=>setGraphDraft({...graphDraft,points:[...graphDraft.points,{x:0,y:0,label:String.fromCharCode(65+Math.min(25,graphDraft.points.length))}]})}>+ Точка</button></div>{graphDraft.points.length>=2&&<><div className="graph-geometry-section"><div className="graph-points-head"><strong>Линии и отрезки</strong><button type="button" onClick={()=>setGraphDraft({...graphDraft,segments:[...graphDraft.segments,{a:0,b:1,kind:"segment",label:"",measure:true}]})}>+ Связь</button></div>{graphDraft.segments.map((s,i)=><div className="graph-geometry-row" key={i}><select value={s.a} onChange={e=>setGraphDraft({...graphDraft,segments:graphDraft.segments.map((q,j)=>j===i?{...q,a:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>{p.label||j+1}</option>)}</select><select value={s.kind} onChange={e=>setGraphDraft({...graphDraft,segments:graphDraft.segments.map((q,j)=>j===i?{...q,kind:e.target.value as "segment"|"line"|"ray"}:q)})}><option value="segment">Отрезок</option><option value="line">Прямая</option><option value="ray">Луч</option></select><select value={s.b} onChange={e=>setGraphDraft({...graphDraft,segments:graphDraft.segments.map((q,j)=>j===i?{...q,b:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>{p.label||j+1}</option>)}</select><label className="graph-measure"><input type="checkbox" checked={s.measure} onChange={e=>setGraphDraft({...graphDraft,segments:graphDraft.segments.map((q,j)=>j===i?{...q,measure:e.target.checked}:q)})}/>↔</label><button type="button" onClick={()=>setGraphDraft({...graphDraft,segments:graphDraft.segments.filter((_,j)=>j!==i)})}>×</button></div>)}</div>{graphDraft.points.length>=3&&<div className="graph-geometry-section"><div className="graph-points-head"><strong>Углы</strong><button type="button" onClick={()=>setGraphDraft({...graphDraft,angles:[...graphDraft.angles,{a:0,vertex:1,b:2,label:""}]})}>+ Угол</button></div>{graphDraft.angles.map((g,i)=><div className="graph-angle-row" key={i}>{(["a","vertex","b"] as const).map(k=><select key={k} value={g[k]} onChange={e=>setGraphDraft({...graphDraft,angles:graphDraft.angles.map((q,j)=>j===i?{...q,[k]:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>{p.label||j+1}</option>)}</select>)}<button type="button" onClick={()=>setGraphDraft({...graphDraft,angles:graphDraft.angles.filter((_,j)=>j!==i)})}>×</button></div>)}</div>}</>}{graphDraft.points.length>=2&&<div className="graph-geometry-section"><div className="graph-points-head"><strong>Окружности и середины</strong><span><button type="button" onClick={()=>setGraphDraft({...graphDraft,circles:[...graphDraft.circles,{center:0,edge:1,label:"",measure:true}]})}>+ Окружность</button><button type="button" onClick={()=>setGraphDraft({...graphDraft,midpoints:[...graphDraft.midpoints,{a:0,b:1,label:"M"}]})}>+ Середина</button></span></div>{graphDraft.circles.map((g,i)=><div className="graph-simple-row" key={"c"+i}><span>○</span><select value={g.center} onChange={e=>setGraphDraft({...graphDraft,circles:graphDraft.circles.map((q,j)=>j===i?{...q,center:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>центр {p.label||j+1}</option>)}</select><select value={g.edge} onChange={e=>setGraphDraft({...graphDraft,circles:graphDraft.circles.map((q,j)=>j===i?{...q,edge:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>через {p.label||j+1}</option>)}</select><button onClick={()=>setGraphDraft({...graphDraft,circles:graphDraft.circles.filter((_,j)=>j!==i)})}>×</button></div>)}{graphDraft.midpoints.map((g,i)=><div className="graph-simple-row" key={"m"+i}><input value={g.label} maxLength={8} onChange={e=>setGraphDraft({...graphDraft,midpoints:graphDraft.midpoints.map((q,j)=>j===i?{...q,label:e.target.value}:q)})}/><select value={g.a} onChange={e=>setGraphDraft({...graphDraft,midpoints:graphDraft.midpoints.map((q,j)=>j===i?{...q,a:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>{p.label||j+1}</option>)}</select><select value={g.b} onChange={e=>setGraphDraft({...graphDraft,midpoints:graphDraft.midpoints.map((q,j)=>j===i?{...q,b:Number(e.target.value)}:q)})}>{graphDraft.points.map((p,j)=><option key={j} value={j}>{p.label||j+1}</option>)}</select><button onClick={()=>setGraphDraft({...graphDraft,midpoints:graphDraft.midpoints.filter((_,j)=>j!==i)})}>×</button></div>)}</div>}{graphDraft.points.length>=3&&<div className="graph-geometry-section"><div className="graph-points-head"><strong>Многоугольники</strong><button type="button" onClick={()=>setGraphDraft({...graphDraft,polygons:[...graphDraft.polygons,{points:[0,1,2],label:"",measure:true}]})}>+ Многоугольник</button></div>{graphDraft.polygons.map((g,i)=><div className="graph-polygon-row" key={i}><input value={g.label} placeholder="Название" onChange={e=>setGraphDraft({...graphDraft,polygons:graphDraft.polygons.map((q,j)=>j===i?{...q,label:e.target.value}:q)})}/><input value={g.points.map(n=>graphDraft.points[n]?.label||n+1).join(", ")} title="Индексы/точки многоугольника" readOnly/><button title="Добавить следующую точку" onClick={()=>{const next=(g.points[g.points.length-1]+1)%graphDraft.points.length;setGraphDraft({...graphDraft,polygons:graphDraft.polygons.map((q,j)=>j===i?{...q,points:[...q.points,next]}:q)})}}>+</button><button onClick={()=>setGraphDraft({...graphDraft,polygons:graphDraft.polygons.filter((_,j)=>j!==i)})}>×</button></div>)}</div>}{graphDraft.points.length===0?<span className="graph-points-empty">Добавьте точки A, B, C...</span>:graphDraft.points.map((p,i)=><div className="graph-point-row" key={i}><input aria-label="Название точки" value={p.label} maxLength={24} onChange={e=>setGraphDraft({...graphDraft,points:graphDraft.points.map((q,j)=>j===i?{...q,label:e.target.value}:q)})}/><input aria-label="X точки" type="number" step="0.1" value={p.x} onChange={e=>setGraphDraft({...graphDraft,points:graphDraft.points.map((q,j)=>j===i?{...q,x:Number(e.target.value)}:q)})}/><input aria-label="Y точки" type="number" step="0.1" value={p.y} onChange={e=>setGraphDraft({...graphDraft,points:graphDraft.points.map((q,j)=>j===i?{...q,y:Number(e.target.value)}:q)})}/><button type="button" title="Удалить точку" onClick={()=>setGraphDraft({...graphDraft,points:graphDraft.points.filter((_,j)=>j!==i)})}>×</button></div>)}</div></div><div className="graph-editor-preview"><div className="graph-preview-hint">Перетащите точку · двойной щелчок добавляет новую</div><GraphView item={{id:"preview",kind:"graph",x:0,y:0,width:520,height:340,text:"",graphType:graphDraft.type,graphA:graphDraft.a,graphB:graphDraft.b,graphC:graphDraft.c,graphXMin:graphDraft.xMin,graphXMax:graphDraft.xMax,graphYMin:graphDraft.yMin,graphYMax:graphDraft.yMax,graphGrid:graphDraft.grid,graphPoints:graphDraft.points,graphShowLabels:graphDraft.showLabels,graphSnap:graphDraft.snap,graphAxisLabels:graphDraft.axisLabels,graphGridStep:graphDraft.gridStep,graphShowCurve:graphDraft.showCurve,graphProjections:graphDraft.projections,graphSegments:graphDraft.segments,graphAngles:graphDraft.angles,graphCircles:graphDraft.circles,graphPolygons:graphDraft.polygons,graphMidpoints:graphDraft.midpoints}} onPointMove={(index,x,y)=>setGraphDraft({...graphDraft,points:graphDraft.points.map((p,i)=>i===index?{...p,x,y}:p)})} onAddPoint={(x,y)=>setGraphDraft({...graphDraft,points:[...graphDraft.points,{x,y,label:String.fromCharCode(65+Math.min(25,graphDraft.points.length))}]})}/></div></div><div className="graph-editor-footer"><span>Ctrl+Enter — сохранить</span><div><button className="secondary" onClick={closeGraphEditor}>Отмена</button><button className="primary" onClick={saveGraphEditor}><Icon name="check" size={15}/> Сохранить</button></div></div></div></div>)}
        {formulaEditorId && formulaDraft && (
          <div
            className="formula-editor-backdrop"
            onPointerDown={closeFormulaEditor}
            onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); closeFormulaEditor(); }
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveFormulaEditor(); }
            }}
          >
            <div className="formula-editor-modal" role="dialog" aria-modal="true" aria-label="Редактор формулы" onPointerDown={(e) => e.stopPropagation()}>
              <div className="formula-editor-header">
                <div>
                  <strong>Редактор формулы</strong>
                  <span>Дроби, корни, индексы, греческие буквы и математические символы</span>
                </div>
                <button onClick={closeFormulaEditor} aria-label="Закрыть"><Icon name="close" size={17}/></button>
              </div>

              <div className="formula-editor-main">
                <section className="formula-editor-compose">
                  <div className="formula-source-head">
                    <label htmlFor="formula-source">Запись</label>
                    <div className="formula-size-editor">
                      <span>Размер</span>
                      <input
                        type="range"
                        min="12"
                        max="72"
                        step="1"
                        value={formulaDraft.fontSize}
                        onChange={(e) => setFormulaDraft({ ...formulaDraft, fontSize: Number(e.target.value) })}
                        aria-label="Размер шрифта формулы"
                      />
                      <input
                        className="formula-size-number"
                        type="number"
                        min="12"
                        max="96"
                        value={formulaDraft.fontSize}
                        onChange={(e) => setFormulaDraft({ ...formulaDraft, fontSize: Math.max(12, Math.min(96, Number(e.target.value) || 12)) })}
                        aria-label="Размер формулы в пикселях"
                      />
                      <span>px</span>
                    </div>
                  </div>
                  <textarea
                    id="formula-source"
                    ref={formulaInput}
                    className="formula-source-input"
                    value={formulaDraft.text}
                    onChange={(e) => setFormulaDraft({ ...formulaDraft, text: e.target.value.slice(0, 10000) })}
                    spellCheck={false}
                    placeholder="Например: x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}"
                    autoFocus
                  />
                  <div className={`formula-syntax-status ${formulaSyntaxIssue(formulaDraft.text) ? "issue" : "ok"}`}>
                    {formulaSyntaxIssue(formulaDraft.text) || "Синтаксис выглядит нормально"}
                    <span>Ctrl+Enter — сохранить</span>
                  </div>

                  <div className="formula-preview-card">
                    <div className="formula-preview-head">
                      <span>Предпросмотр</span>
                      <div className="formula-color-palette" title="Цвет формулы">
                        {["#20242c","#5355c9","#2f855a","#d97706","#dc4c64","#8b5cf6"].map((value) => (
                          <button
                            key={value}
                            className={formulaDraft.color === value ? "active" : ""}
                            style={{ background: value }}
                            onClick={() => setFormulaDraft({ ...formulaDraft, color: value })}
                            aria-label={`Цвет формулы ${value}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="formula-preview-surface">
                      <FormulaView text={formulaDraft.text} fontSize={formulaDraft.fontSize} color={formulaDraft.color}/>
                    </div>
                  </div>
                </section>

                <aside className="formula-palette-panel">
                  <div className="formula-palette-tabs" role="tablist" aria-label="Категории формул">
                    {([
                      ["basic", "Основное"], ["greek", "Греческие"], ["relations", "Знаки"], ["functions", "Функции"], ["geometry", "Геометрия"], ["templates", "Шаблоны"],
                    ] as [FormulaPaletteTab, string][]).map(([tab, label]) => (
                      <button key={tab} className={formulaPaletteTab === tab ? "active" : ""} onClick={() => setFormulaPaletteTab(tab)}>{label}</button>
                    ))}
                  </div>
                  <div className={`formula-palette-grid ${formulaPaletteTab === "templates" ? "templates" : ""}`}>
                    {FORMULA_PALETTES[formulaPaletteTab].map((item, indexValue) => (
                      <button
                        key={`${formulaPaletteTab}-${indexValue}`}
                        title={item.title ?? item.label}
                        onClick={() => insertFormulaSnippet(item.snippet, formulaPaletteTab === "templates")}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {formulaHistory.length > 0 && <div className="formula-history"><div><strong>Недавние формулы</strong><button onClick={()=>{setFormulaHistory([]);localStorage.removeItem("onlinerepetitor.formula-history.v54")}}>Очистить</button></div><div>{formulaHistory.map((value,index)=><button key={index} title={value} onClick={()=>insertFormulaSnippet(value,true)}><FormulaView text={value} fontSize={17}/></button>)}</div></div>}
                  <div className="formula-help">
                    <strong>Можно вводить с клавиатуры</strong>
                    <code>x^2</code><code>x_1</code><code>\\frac&#123;a&#125;&#123;b&#125;</code><code>\\sqrt&#123;x&#125;</code>
                    <code>\\alpha</code><code>\\sum_&#123;i=1&#125;^&#123;n&#125;</code>
                    <p>Фигурные скобки объединяют выражение. Команды можно сочетать и вкладывать друг в друга.</p>
                  </div>
                </aside>
              </div>

              <div className="formula-editor-footer">
                <span>{formulaDraft.text.length} / 10000</span>
                <div>
                  <button className="secondary" onClick={() => void pasteFormulaSource()}>Вставить из буфера</button><button className="secondary" onClick={() => void copyFormulaSource()}><Icon name="copy" size={15}/> Копировать запись</button>
                  <button className="secondary" onClick={closeFormulaEditor}>Отмена</button>
                  <button className="primary" onClick={saveFormulaEditor}><Icon name="check" size={15}/> Сохранить</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {checklistEditorId && checklistDraft && (
          <div className="checklist-editor-backdrop" onPointerDown={() => { setChecklistEditorId(null); setChecklistDraft(null); }}>
            <div className="checklist-editor-modal" role="dialog" aria-modal="true" aria-label="Редактор чек-листа" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setChecklistEditorId(null); setChecklistDraft(null); } if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveChecklistEditor(); } }}>
              <div className="checklist-editor-header"><div><strong>Чек-лист / задание</strong><span>{checklistDraft.done.filter(Boolean).length} из {checklistDraft.items.length} выполнено</span></div><button onClick={() => { setChecklistEditorId(null); setChecklistDraft(null); }} aria-label="Закрыть"><Icon name="close" size={17}/></button></div>
              <div className="checklist-editor-settings">
                <label className="checklist-title-input"><span>Название</span><input value={checklistDraft.title} maxLength={200} onChange={(e) => setChecklistDraft({ ...checklistDraft, title: e.target.value })}/></label>
                <label><span>Размер</span><input type="range" min="10" max="32" value={checklistDraft.fontSize} onChange={(e) => setChecklistDraft({ ...checklistDraft, fontSize: Number(e.target.value) })}/><strong>{checklistDraft.fontSize}px</strong></label>
                <label><span>Акцент</span><input type="color" value={checklistDraft.color} onChange={(e) => setChecklistDraft({ ...checklistDraft, color: e.target.value })}/></label>
              </div>
              <div className="checklist-editor-list">
                {checklistDraft.items.map((entry, indexValue) => (
                  <div className="checklist-editor-row" key={indexValue}>
                    <label className="checklist-editor-check"><input type="checkbox" checked={checklistDraft.done[indexValue] ?? false} onChange={(e) => setChecklistDraft((current) => current ? { ...current, done: current.done.map((value, index) => index === indexValue ? e.target.checked : value) } : current)}/><span><Icon name="check" size={13}/></span></label>
                    <input value={entry} maxLength={2000} placeholder={`Пункт ${indexValue + 1}`} onChange={(e) => setChecklistDraft((current) => current ? { ...current, items: current.items.map((value, index) => index === indexValue ? e.target.value : value) } : current)}/>
                    <button disabled={checklistDraft.items.length <= 1} onClick={() => removeChecklistRow(indexValue)} title="Удалить пункт"><Icon name="trash" size={15}/></button>
                  </div>
                ))}
                <button className="checklist-add-row" disabled={checklistDraft.items.length >= 40} onClick={addChecklistRow}><Icon name="plus" size={15}/> Добавить пункт</button>
              </div>
              <div className="checklist-editor-footer"><span>Ctrl+Enter — сохранить · Esc — закрыть</span><div className="checklist-editor-bulk"><button className="secondary" onClick={() => setChecklistDraft((current) => current ? { ...current, done: current.done.map(() => false) } : current)}>Сбросить отметки</button><button className="secondary" onClick={() => setChecklistDraft((current) => current ? { ...current, done: current.done.map(() => true) } : current)}>Отметить всё</button><button className="secondary" onClick={() => { setChecklistEditorId(null); setChecklistDraft(null); }}>Отмена</button><button className="primary" onClick={saveChecklistEditor}><Icon name="check" size={15}/> Сохранить</button></div></div>
            </div>
          </div>
        )}
        {flashcardEditorId && flashcardDraft && (
          <div className="flashcard-editor-backdrop" onPointerDown={() => { setFlashcardEditorId(null); setFlashcardDraft(null); }}>
            <div className="flashcard-editor-modal" role="dialog" aria-modal="true" aria-label="Редактор карточки вопрос–ответ" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setFlashcardEditorId(null); setFlashcardDraft(null); }
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveFlashcardEditor(); }
            }}>
              <div className="flashcard-editor-header"><div><strong>Карточка вопрос–ответ</strong><span>Лицевая и обратная стороны одной учебной карточки</span></div><button onClick={() => { setFlashcardEditorId(null); setFlashcardDraft(null); }} aria-label="Закрыть"><Icon name="close" size={17}/></button></div>
              <div className="flashcard-editor-body">
                <section className="flashcard-editor-compose">
                  <label><span>Вопрос / лицевая сторона</span><textarea value={flashcardDraft.front} maxLength={5000} autoFocus onChange={(e) => setFlashcardDraft({ ...flashcardDraft, front: e.target.value })} placeholder="Что нужно вспомнить?"/></label>
                  <label><span>Ответ / обратная сторона</span><textarea value={flashcardDraft.back} maxLength={5000} onChange={(e) => setFlashcardDraft({ ...flashcardDraft, back: e.target.value })} placeholder="Ответ или пояснение"/></label>
                  <div className="flashcard-editor-settings">
                    <label><span>Размер текста</span><input type="range" min="10" max="48" value={flashcardDraft.fontSize} onChange={(e) => setFlashcardDraft({ ...flashcardDraft, fontSize: Number(e.target.value) })}/><strong>{flashcardDraft.fontSize}px</strong></label>
                    <label><span>Акцент</span><input type="color" value={flashcardDraft.color} onChange={(e) => setFlashcardDraft({ ...flashcardDraft, color: e.target.value })}/></label>
                  </div>
                </section>
                <aside className="flashcard-editor-preview">
                  <strong>Предпросмотр</strong>
                  <div className="flashcard-preview-pair">
                    <FlashcardView item={{ id:"preview-front", kind:"flashcard", x:0,y:0,width:320,height:210,text:flashcardDraft.front,flashcardBack:flashcardDraft.back,flashcardFlipped:false,fontSize:flashcardDraft.fontSize,color:flashcardDraft.color }}/>
                    <FlashcardView item={{ id:"preview-back", kind:"flashcard", x:0,y:0,width:320,height:210,text:flashcardDraft.front,flashcardBack:flashcardDraft.back,flashcardFlipped:true,fontSize:flashcardDraft.fontSize,color:flashcardDraft.color }}/>
                  </div>
                </aside>
              </div>
              <div className="flashcard-editor-footer"><span>Ctrl+Enter — сохранить · Esc — закрыть</span><div><button className="secondary" onClick={() => { setFlashcardEditorId(null); setFlashcardDraft(null); }}>Отмена</button><button className="primary" onClick={saveFlashcardEditor}><Icon name="check" size={15}/> Сохранить</button></div></div>
            </div>
          </div>
        )}
        {quizEditorId && quizDraft && (
          <div className="quiz-editor-backdrop" onPointerDown={() => { setQuizEditorId(null); setQuizDraft(null); }}>
            <div className="quiz-editor-modal" role="dialog" aria-modal="true" aria-label="Редактор мини-теста" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => {
              if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setQuizEditorId(null); setQuizDraft(null); }
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); saveQuizEditor(); }
            }}>
              <div className="quiz-editor-header">
                <div><strong>Вопрос / мини-тест</strong><span>Выберите правильный вариант и при необходимости добавьте пояснение</span></div>
                <button onClick={() => { setQuizEditorId(null); setQuizDraft(null); }} aria-label="Закрыть"><Icon name="close" size={17}/></button>
              </div>
              <div className="quiz-editor-body">
                <section className="quiz-editor-compose">
                  <label className="quiz-question-editor"><span>Вопрос</span><textarea value={quizDraft.question} maxLength={2000} onChange={(e) => setQuizDraft({ ...quizDraft, question: e.target.value })} autoFocus placeholder="Введите вопрос…"/></label>
                  <div className="quiz-options-editor-head"><span>Варианты ответа</span><small>Нажмите кружок слева, чтобы назначить правильный ответ</small></div>
                  <div className="quiz-options-editor">
                    {quizDraft.options.map((option, indexValue) => (
                      <div className={`quiz-editor-option ${quizDraft.correct === indexValue ? "correct" : ""}`} key={indexValue}>
                        <label className="quiz-correct-radio" title="Правильный ответ">
                          <input type="radio" name="quiz-correct" checked={quizDraft.correct === indexValue} onChange={() => setQuizDraft({ ...quizDraft, correct: indexValue })}/>
                          <span>{String.fromCharCode(65 + indexValue)}</span>
                        </label>
                        <input value={option} maxLength={2000} placeholder={`Вариант ${String.fromCharCode(65 + indexValue)}`} onChange={(e) => setQuizDraft((current) => current ? { ...current, options: current.options.map((value, index) => index === indexValue ? e.target.value : value) } : current)}/>
                        <button disabled={quizDraft.options.length <= 2} onClick={() => removeQuizOption(indexValue)} title="Удалить вариант"><Icon name="trash" size={15}/></button>
                      </div>
                    ))}
                    <button className="quiz-add-option" disabled={quizDraft.options.length >= 8} onClick={addQuizOption}><Icon name="plus" size={15}/> Добавить вариант</button>
                  </div>
                  <label className="quiz-explanation-editor"><span>Пояснение после показа ответа <small>необязательно</small></span><textarea value={quizDraft.explanation} maxLength={5000} onChange={(e) => setQuizDraft({ ...quizDraft, explanation: e.target.value })} placeholder="Почему ответ правильный?"/></label>
                </section>
                <aside className="quiz-editor-preview">
                  <div className="quiz-preview-head"><strong>Предпросмотр</strong><span>{quizDraft.options.length} вариантов</span></div>
                  <div className="quiz-preview-card">
                    <QuizView item={{
                      id: "quiz-preview", kind: "quiz", x: 0, y: 0, width: 360, height: 320,
                      text: quizDraft.question, quizOptions: quizDraft.options, quizCorrect: quizDraft.correct,
                      quizRevealed: true, quizExplanation: quizDraft.explanation, fontSize: quizDraft.fontSize, color: quizDraft.color,
                    }}/>
                  </div>
                  <div className="quiz-preview-settings">
                    <label><span>Размер</span><input type="range" min="10" max="32" value={quizDraft.fontSize} onChange={(e) => setQuizDraft({ ...quizDraft, fontSize: Number(e.target.value) })}/><strong>{quizDraft.fontSize}px</strong></label>
                    <label><span>Акцент</span><input type="color" value={quizDraft.color} onChange={(e) => setQuizDraft({ ...quizDraft, color: e.target.value })}/></label>
                  </div>
                </aside>
              </div>
              <div className="quiz-editor-footer"><span>Ctrl+Enter — сохранить · Esc — закрыть</span><div><button className="secondary" onClick={() => { setQuizEditorId(null); setQuizDraft(null); }}>Отмена</button><button className="primary" onClick={saveQuizEditor}><Icon name="check" size={15}/> Сохранить</button></div></div>
            </div>
          </div>
        )}
        {tableEditorId && tableDraft && (
          <div className="table-editor-backdrop" onPointerDown={() => { setTableEditorId(null); setTableDraft(null); }}>
            <div className="table-editor-modal" role="dialog" aria-modal="true" aria-label="Редактирование таблицы" onPointerDown={(e) => e.stopPropagation()}>
              <div className="table-editor-header">
                <div><strong>Таблица</strong><span>{tableDraft.rows} строк × {tableDraft.cols} столбцов</span></div>
                <button onClick={() => { setTableEditorId(null); setTableDraft(null); }} aria-label="Закрыть"><Icon name="close" size={17}/></button>
              </div>
              <div className="table-editor-controls">
                <span>Строки</span><button onClick={() => resizeTableDraft(-1,0)} disabled={tableDraft.rows <= 1}><Icon name="minus" size={14}/></button><strong>{tableDraft.rows}</strong><button onClick={() => resizeTableDraft(1,0)} disabled={tableDraft.rows >= 20}><Icon name="plus" size={14}/></button>
                <i/>
                <span>Столбцы</span><button onClick={() => resizeTableDraft(0,-1)} disabled={tableDraft.cols <= 1}><Icon name="minus" size={14}/></button><strong>{tableDraft.cols}</strong><button onClick={() => resizeTableDraft(0,1)} disabled={tableDraft.cols >= 12}><Icon name="plus" size={14}/></button>
                <i/>
                <label className="table-header-toggle"><input type="checkbox" checked={tableDraft.header} onChange={(e) => setTableDraft({ ...tableDraft, header: e.target.checked })}/><span>Первая строка — заголовок</span></label>
                <i/>
                <label className="table-font-control"><span>Текст</span><input type="range" min="9" max="32" step="1" value={tableDraft.fontSize} onChange={(e) => setTableDraft({ ...tableDraft, fontSize: Number(e.target.value) })}/><strong>{tableDraft.fontSize}px</strong></label>
                <i/>
                <span className="table-clipboard-controls"><button type="button" onClick={()=>void pasteTableTsv()}>Вставить TSV</button><button type="button" onClick={()=>void copyTableTsv()}>Копировать TSV</button></span><i/>
                <span className="table-style-controls">
                  <button className={tableDraft.align === "left" ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, align: "left" })} title="По левому краю">≡</button>
                  <button className={tableDraft.align === "center" ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, align: "center" })} title="По центру">≣</button>
                  <button className={tableDraft.align === "right" ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, align: "right" })} title="По правому краю">≡</button>
                  <button className={tableDraft.stripe ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, stripe: !tableDraft.stripe })} title="Чередовать строки">▤</button>
                  <button className={tableDraft.compact ? "active" : ""} onClick={() => setTableDraft({ ...tableDraft, compact: !tableDraft.compact })} title="Компактные строки">↕</button>
                </span>
              </div>
              <div className="table-editor-column-tools" style={{ gridTemplateColumns: `repeat(${tableDraft.cols}, minmax(120px, 1fr))` }}>
                {Array.from({ length: tableDraft.cols }, (_, col) => <div key={col}><button onClick={() => addTableColAt(col + 1)} disabled={tableDraft.cols >= 12} title="Добавить столбец справа">+</button><button onClick={() => removeTableColAt(col)} disabled={tableDraft.cols <= 1} title="Удалить столбец">×</button></div>)}
              </div>
              <div className="table-editor-grid" style={{ gridTemplateColumns: `repeat(${tableDraft.cols}, minmax(120px, 1fr))` }}>
                {tableDraft.cells.map((cell, indexValue) => (
                  <textarea key={`${tableDraft.rows}-${tableDraft.cols}-${indexValue}`} className={`${tableDraft.header && indexValue < tableDraft.cols ? "table-editor-header-cell" : ""} ${tableDraft.stripe && Math.floor(indexValue / tableDraft.cols) % 2 === 1 ? "table-editor-striped-cell" : ""}`} style={{ fontSize: tableDraft.fontSize, textAlign: tableDraft.align, minHeight: tableDraft.compact ? 46 : undefined }} value={cell} placeholder={tableDraft.header && indexValue < tableDraft.cols ? `Заголовок ${indexValue + 1}` : "Текст"} onChange={(e) => setTableDraft((current) => current ? { ...current, cells: current.cells.map((value, cellIndex) => cellIndex === indexValue ? e.target.value : value) } : current)} />
                ))}
              </div>
              <div className="table-editor-row-tools">
                <button onClick={() => addTableRowAt(tableDraft.rows)} disabled={tableDraft.rows >= 20}><Icon name="plus" size={14}/> Добавить строку</button>
                <button onClick={() => removeTableRowAt(tableDraft.rows - 1)} disabled={tableDraft.rows <= 1}>× Последняя строка</button>
              </div>
              <div className="table-editor-footer"><span>{tableDraft.header ? "Первая строка выделена как заголовок." : "Все строки отображаются одинаково."}</span><div><button className="secondary" onClick={() => { setTableEditorId(null); setTableDraft(null); }}>Отмена</button><button className="primary" onClick={saveTableEditor}><Icon name="check" size={15}/> Сохранить</button></div></div>
            </div>
          </div>
        )}
        {selected.length === 1 &&
          !editing &&
          items.some(
            (i) =>
              i.id === selected[0] &&
              !i.locked &&
              (i.kind === "text" || i.kind === "sticky" || i.kind === "frame" || i.kind === "comment" || i.kind === "formula" || i.kind === "table" || i.kind === "checklist" || i.kind === "quiz" || i.kind === "flashcard" || i.kind === "cover"),
          ) && (
            <button
              className="edit-selected"
              onClick={() => {
                const item = itemsRef.current.find((i) => i.id === selected[0]);
                if (!item) return;
                if (item.kind === "table") openTableEditor(item); else if (item.kind === "formula") openFormulaEditor(item); else if (item.kind === "checklist") openChecklistEditor(item); else if (item.kind === "quiz") openQuizEditor(item); else if (item.kind === "flashcard") openFlashcardEditor(item); else startEdit(item);
              }}
            >
              <Icon name="rename" size={15} />
              {items.find((i) => i.id === selected[0])?.kind === "frame" ? "Переименовать фрейм" : items.find((i) => i.id === selected[0])?.kind === "table" ? "Редактировать таблицу" : items.find((i) => i.id === selected[0])?.kind === "formula" ? "Редактировать формулу" : items.find((i) => i.id === selected[0])?.kind === "checklist" ? "Редактировать чек-лист" : items.find((i) => i.id === selected[0])?.kind === "quiz" ? "Редактировать мини-тест" : items.find((i) => i.id === selected[0])?.kind === "flashcard" ? "Редактировать карточку" : items.find((i) => i.id === selected[0])?.kind === "comment" ? "Редактировать комментарий" : "Редактировать текст"}
              <kbd>Enter</kbd>
            </button>
          )}
        {(tool === "pen" || tool === "marker") && (
          <div className="ink-settings">
            <label>
              Цвет{" "}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <label>
              Толщина{" "}
              <input
                aria-label="Толщина штриха"
                type="range"
                min={tool === "marker" ? 8 : 1}
                max={tool === "marker" ? 48 : 16}
                value={tool === "marker" ? markerWeight : weight}
                onChange={(e) =>
                  (tool === "marker" ? setMarkerWeight : setWeight)(
                    Number(e.target.value),
                  )
                }
              />
              {tool === "marker" ? markerWeight : weight}
            </label>
          </div>
        )}
        {tool === "eraser" && <div className="ink-settings eraser-settings">
          <label>Размер <input aria-label="Размер ластика" type="range" min={8} max={96} step={2} value={eraserSize} onChange={(e)=>setEraserSize(Number(e.target.value))}/><span className="eraser-size-value">{eraserSize}px</span></label>
          <span>Стирает только карандаш и маркер · Ctrl+Z — отмена</span>
        </div>}
        {tool === "connector" && (
          <div className="connector-settings">
            <div className="connector-style-buttons">
              <button className={connectorStyle === "line" ? "active" : ""} onClick={() => setConnectorStyle("line")} title="Линия"><Icon name="line" size={17} /></button>
              <button className={connectorStyle === "arrow" ? "active" : ""} onClick={() => setConnectorStyle("arrow")} title="Стрелка"><Icon name="arrow-one" size={17} /></button>
              <button className={connectorStyle === "double" ? "active" : ""} onClick={() => setConnectorStyle("double")} title="Двусторонняя стрелка"><Icon name="arrow-double" size={17} /></button>
              <span className="connector-settings-separator" />
              <button className={connectorRouting === "straight" ? "active" : ""} onClick={() => setConnectorRouting("straight")} title="Прямая связь"><Icon name="line" size={17} /></button>
              <button className={connectorRouting === "elbow" ? "active" : ""} onClick={() => setConnectorRouting("elbow")} title="Ломаная связь"><Icon name="elbow" size={17} /></button>
            </div>
            <label>Цвет <input type="color" value={color} onChange={(e) => setColor(e.target.value)} /></label>
            <label>Толщина <input type="range" min={1} max={8} value={connectorWeight} onChange={(e) => setConnectorWeight(Number(e.target.value))} /><span>{connectorWeight}px</span></label>
            <span className="connector-hint">Тяните мышью · Shift — угол 45°</span>
          </div>
        )}
        {tool === "shape" && (
          <div className="shape-palette">
            {([
              ["rectangle","Прямоугольник"], ["rounded","Скруглённый"], ["ellipse","Эллипс"], ["diamond","Ромб"],
              ["triangle","Треугольник"], ["hexagon","Шестиугольник"], ["star","Звезда"], ["arrow","Стрелка"],
            ] as [ShapeType,string][]).map(([id,label]) => (
              <button key={id} title={label} className={shapeType === id ? "active" : ""} onClick={() => setShapeType(id)}>
                <span className="shape-palette-icon"><ShapeIcon type={id} /></span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
        <nav className="mobile-quick-tools" aria-label="Быстрые инструменты">
          {(["hand","select","pen","text","sticky"] as Tool[]).map(id=><button key={id} type="button" className={tool===id?"active":""} aria-label={tools.find(t=>t.id===id)?.label??id} onClick={()=>{finishEdit();setTool(id);setMobileToolsOpen(false)}}><Icon name={id} size={19}/></button>)}
        </nav>
        <button type="button" className="mobile-tools-toggle" aria-expanded={mobileToolsOpen} onClick={()=>setMobileToolsOpen(v=>!v)}><Icon name={tool} size={18}/><span>Инструменты</span></button>
        <aside className={`toolbar compact-toolbar ${mobileToolsOpen?"mobile-open":""} ${desktopToolsExpanded?"expanded":""}`} aria-label="Инструменты">
          <div className="toolbar-pinned" aria-label="Навигация">
            {(["select","hand"] as Tool[]).map((id)=>{const t=tools.find(x=>x.id===id)!;return <button key={id} aria-label={t.label} title={t.label} className={`tool-button ${tool===id?"active":""}`} onClick={()=>{finishEdit();setTool(id);setMobileToolsOpen(false)}}><span className="tool-icon"><Icon name={t.icon} size={18}/></span><span className="tool-tooltip">{toolShortLabel[id]}</span></button>})}
          </div>
          <span className="toolbar-section-line" aria-hidden="true"/>
          <div className="toolbar-list">
            {tools.filter((t)=>t.id!=="select"&&t.id!=="hand").map((t)=>{
              const secondary=!primaryDesktopTools.has(t.id);
              return <div className={`tool-wrap ${secondary?"secondary-tool":""}`} key={t.id}>
                <button aria-label={t.label} title={t.label} className={`tool-button ${tool===t.id?"active":""}`} onClick={()=>{finishEdit();setTool(t.id);setMobileToolsOpen(false)}}>
                  <span className="tool-icon"><Icon name={t.icon} size={18}/></span><span className="tool-tooltip">{toolShortLabel[t.id]}</span>
                </button>{t.dividerAfter&&<span className="tool-divider" aria-hidden="true"/>}
              </div>;
            })}
          </div>
          <button type="button" className="toolbar-more" title={desktopToolsExpanded?"Скрыть дополнительные инструменты":"Показать дополнительные инструменты"} onClick={()=>setDesktopToolsExpanded(v=>!v)} aria-expanded={desktopToolsExpanded}>
            <Icon name={desktopToolsExpanded?"chevron-left":"plus"} size={16}/><span className="tool-tooltip">{desktopToolsExpanded?"Свернуть":"Ещё инструменты"}</span>
          </button>
        </aside>
        <section
          ref={board}
          aria-label="Доска"
          className={`board board-bg-${gridMode} board-tool-${tool} ${space || tool === "hand" ? "board-hand-active" : ""} ${panning ? "board-panning" : ""}`}
          style={{
            backgroundSize: `${24 * view.zoom}px ${24 * view.zoom}px`,
            backgroundPosition: `${view.x}px ${view.y}px`,
          }}
          onPointerDown={(e) => { touchStart(e); if(touchPoints.current.size>=2)return; if (presentation) { const point = local(e.clientX, e.clientY); if (presentationLaser) setPresentationLaserPos(point); if (presentationSpotlight) setPresentationSpotlightPos(point); return; } down(e); }}
          onPointerMove={(e) => { touchMove(e); if(pinchState.current)return; const localPoint = local(e.clientX, e.clientY); const worldPoint = world(localPoint); cursorChannel.current?.sendCursor(worldPoint.x, worldPoint.y); if (presentation) { if (presentationLaser) setPresentationLaserPos(localPoint); if (presentationSpotlight) setPresentationSpotlightPos(localPoint); } move(e); }}
          onContextMenu={(e) => {
            e.preventDefault();
            finishEdit();
            const point = local(e.clientX, e.clientY);
            const id = (e.target as HTMLElement).closest<HTMLElement>("[data-object]")?.dataset.object;
            const hit = itemsRef.current.find((item) => item.id === id);
            if (hit) {
              const family = familyIdsFor(hit);
              if (!family.every((member) => selected.includes(member))) setSelected(family);
            } else {
              setSelected([]);
            }
            setContextMenu({ x: point.x, y: point.y });
          }}
          onDragOver={(e) => {
            if (Array.from(e.dataTransfer.types).includes("Files")) {
              e.preventDefault();
              e.dataTransfer.dropEffect = "copy";
            }
          }}
          onDrop={async (e) => {
            const files = Array.from(e.dataTransfer.files) as File[];
            if (!files.length) return;
            e.preventDefault();
            const position = world(local(e.clientX, e.clientY));
            try {
              let added = 0;
              for (const file of files.slice(0, 12)) {
                const isSupported = file.type.startsWith("image/") || file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                if (!isSupported) continue;
                await addMediaFile(file, position, added * 24);
                added++;
              }
              setNotice(added ? `Добавлено файлов перетаскиванием: ${added}` : "Перетащите изображение или PDF");
            } catch (error) {
              setNotice(error instanceof Error ? error.message : "Не удалось добавить файл");
            }
          }}
          onPointerEnter={(e) => { if (tool === "eraser") setEraserCursor(local(e.clientX, e.clientY)); }}
          onPointerLeave={() => { if (!gesture.current) setEraserCursor(null); }}
          onPointerUp={(e) => {
            touchEnd(e);
            if (e.pointerId === gesture.current?.pointer) {
              move(e);
              end();
            }
          }}
          onPointerCancel={(e) => { touchEnd(e); end(true); }}
          onLostPointerCapture={() => end(true)}
        >
          <div className="remote-cursors-layer" aria-hidden="true">
            {Object.values(remoteCursors).map((cursor) => <div
              className="remote-cursor"
              key={cursor.userId}
              style={{
                transform: `translate(${cursor.x * view.zoom + view.x}px,${cursor.y * view.zoom + view.y}px)`,
              }}
            >
              <svg className="remote-cursor-pointer" viewBox="0 0 24 30">
                <path d="M2 2 19 17l-8.2 1.5L7 27 2 2Z"/>
              </svg>
              <span>{cursor.name}</span>
            </div>)}
          </div>
          <div
            className="world"
            style={{
              transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})`,
            }}
          >
            {!items.length && (
              <div className="welcome-card">
                <div className="welcome-badge">Пустая доска</div>
                <h1>С чего начнём?</h1>
                <p>Выберите действие. Остальные инструменты всегда доступны слева.</p>
                <div className="welcome-actions">
                  <button onClick={(e)=>{e.stopPropagation();setTool("pen")}}><Icon name="pen" size={18}/><span><b>Рисовать</b><small>Карандаш и маркер</small></span></button>
                  <button onClick={(e)=>{e.stopPropagation();setTool("text")}}><Icon name="text" size={18}/><span><b>Добавить текст</b><small>Текст или стикер</small></span></button>
                  <button onClick={(e)=>{e.stopPropagation();setTool("shape")}}><Icon name="shape" size={18}/><span><b>Фигура</b><small>Схемы и стрелки</small></span></button>
                  <button onClick={(e)=>{e.stopPropagation();mediaInput.current?.click()}}><Icon name="media" size={18}/><span><b>Загрузить</b><small>Фото или PDF</small></span></button>
                </div>
                <div className="welcome-tip">Наведите курсор на инструмент, чтобы увидеть горячую клавишу.</div>
              </div>
            )}
            <svg className="comment-links-world" aria-hidden="true">
              {items.filter((item) => item.kind === "comment" && !item.hidden && item.commentTargetId).map((comment) => {
                const target = items.find((candidate) => candidate.id === comment.commentTargetId && !candidate.hidden);
                if (!target) return null;
                const sx = comment.x + Math.min(18, comment.width / 2), sy = comment.y + comment.height / 2;
                const ex = target.x + target.width / 2, ey = target.y + target.height / 2;
                return <g key={`comment-link-${comment.id}`}><line x1={sx} y1={sy} x2={ex} y2={ey} /><circle cx={ex} cy={ey} r={4} /></g>;
              })}
            </svg>
            {items.filter((item) => !item.hidden).map((item) => (
              <div
                data-object={item.id}
                key={item.id}
                className={`board-object object-${item.kind} ${selected.includes(item.id) ? "selected" : ""} ${item.locked ? "locked" : ""}`}
                style={{
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  transform: item.rotation ? `rotate(${item.rotation}deg)` : undefined,
                  borderColor: item.kind === "frame" ? (item.color ?? "#8b8f9a") : undefined,
                  background: item.points
                    ? "transparent"
                    : item.kind === "sticky"
                      ? (item.color ?? "#fff3a6")
                      : item.kind === "frame" || item.kind === "connector" || item.kind === "comment" || item.kind === "cover"
                        ? "transparent"
                        : "#fff",
                }}
                onDoubleClick={() => {
                  const remoteEditor = remoteEditorFor(item.id);
                  if (remoteEditor) {
                    setNotice(`${remoteEditor.name} уже редактирует этот объект`);
                    return;
                  }
                  if (
                    tool === "select" &&
                    !space &&
                    !item.locked &&
                    (item.kind === "text" || item.kind === "sticky" || item.kind === "frame" || item.kind === "comment" || item.kind === "cover")
                  ) {
                    startEdit(item);
                  } else if (tool === "select" && !space && !item.locked && item.kind === "formula") {
                    setSelected([item.id]);
                    openFormulaEditor(item);
                  } else if (tool === "select" && !space && !item.locked && item.kind === "table") {
                    setSelected([item.id]);
                    setTableEditorId(item.id);
                    setTableDraft({ rows: item.tableRows ?? 3, cols: item.tableCols ?? 3, cells: [...(item.tableCells ?? [])], header: item.tableHeader !== false, fontSize: item.fontSize ?? 13, align: item.tableAlign ?? "left", stripe: item.tableStripe === true, compact: item.tableCompact === true });
                  } else if (tool === "select" && !space && !item.locked && item.kind === "checklist") {
                    setSelected([item.id]);
                    openChecklistEditor(item);
                  } else if (tool === "select" && !space && !item.locked && item.kind === "graph") { setSelected([item.id]); openGraphEditor(item);
                  } else if (tool === "select" && !space && !item.locked && item.kind === "quiz") {
                    setSelected([item.id]);
                    openQuizEditor(item);
                  } else if (tool === "select" && !space && !item.locked && item.kind === "flashcard") {
                    setSelected([item.id]);
                    openFlashcardEditor(item);
                  }
                }}
              >
                {remoteSelectorsFor(item.id).slice(0, 3).map((remote, indexValue) => <div
                  key={remote.userId}
                  className={`remote-selection-outline ${remote.editingId === item.id ? "editing" : ""}`}
                  style={{ inset: -3 - indexValue * 3 }}
                  aria-hidden="true"
                >
                  <span>{remote.name}{remote.editingId === item.id ? " · редактирует" : ""}</span>
                </div>)}
                {item.points && <Ink item={item} />}
                {item.kind === "shape" && <Shape type={item.shapeType} color={item.color}/>}
                {item.kind === "connector" && <Connector item={item}/>}
                {(item.kind === "image" || item.kind === "pdf") && <Media item={item} boardId={boardSummary.id}/>}
                {item.kind === "linkmedia" && <LinkMediaPlayer item={item}/>}
                {item.kind === "frame" && editing !== item.id && <div className="frame-title">{item.text || "Без названия"}</div>}
                {item.kind === "comment" && editing !== item.id && <CommentCard item={item} />}
                {item.kind === "table" && <TableView item={item} />}
                {item.kind === "formula" && <FormulaView text={item.text} fontSize={item.fontSize ?? 28} color={item.color ?? "#20242c"} />}
                {item.kind === "graph" && <GraphView item={item}/>}
                {item.kind === "checklist" && <ChecklistView item={item} onToggle={!presentation && !item.locked ? (indexValue) => {
                  const entries = item.checklistItems?.length ? item.checklistItems : ["Новый пункт"];
                  const nextDone = entries.map((_, index) => index === indexValue ? !(item.checklistDone?.[index] === true) : item.checklistDone?.[index] === true);
                  commit(itemsRef.current.map((candidate) => candidate.id === item.id ? { ...candidate, checklistDone: nextDone } : candidate));
                } : undefined} />}
                {item.kind === "quiz" && <QuizView item={item} onSelect={!item.locked ? (indexValue) => selectQuizAnswer(item, indexValue) : undefined} />}
                {item.kind === "flashcard" && <FlashcardView item={item} onFlip={!item.locked ? () => flipFlashcard(item) : undefined} />}
                {item.kind === "cover" && editing !== item.id && <CoverView item={item} onToggle={!item.locked ? () => toggleCover(item) : undefined} />}
                {item.locked && <div className="object-lock-badge" aria-label="Объект заблокирован"><Icon name="lock" size={13} /></div>}
                {(item.kind === "text" || item.kind === "sticky" || item.kind === "frame" || item.kind === "comment" || item.kind === "cover") &&
                  (editing === item.id ? (
                    <textarea
                      ref={editor}
                      key={item.id}
                      aria-label="Текст объекта"
                      className={item.kind === "frame" ? "text-editor frame-editor" : item.kind === "comment" ? "text-editor comment-editor" : item.kind === "cover" ? "text-editor cover-editor" : "text-editor"}
                      style={item.kind === "frame" || item.kind === "comment" ? undefined : { fontSize: item.fontSize ?? (item.kind === "cover" ? 17 : 20), ...(item.kind === "text" || item.kind === "sticky" ? { color:item.kind==="text"?(item.color??"#202124"):undefined, lineHeight:item.lineHeight??1.45, textAlign: item.textAlign ?? "left", fontWeight: item.fontWeight ?? "normal", fontStyle: item.fontStyle ?? "normal", textDecoration: item.textDecoration ?? "none" } : {}) }}
                      value={draft}
                      placeholder="Введите текст…"
                      onChange={(e) => {
                        draftRef.current = e.target.value;
                        setDraft(e.target.value);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onPointerUp={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => e.stopPropagation()}
                      onBlur={finishEdit}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.nativeEvent.isComposing) return;
                        if (e.code === "Escape") {
                          e.preventDefault();
                          setEditing(null);
                        } else if (item.kind === "frame" && e.code === "Enter") {
                          e.preventDefault();
                          finishEdit();
                        } else if ((e.ctrlKey || e.metaKey) && e.code === "Enter") {
                          e.preventDefault();
                          finishEdit();
                        }
                      }}
                    />
                  ) : item.kind === "frame" || item.kind === "comment" ? null : (
                    <div className={`text-display text-list-${item.textList??"none"}`} style={{ fontSize: item.fontSize ?? 20, color:item.kind==="text"?(item.color??"#202124"):undefined, lineHeight:item.lineHeight??1.45, textAlign: item.textAlign ?? "left", fontWeight: item.fontWeight ?? "normal", fontStyle: item.fontStyle ?? "normal", textDecoration: item.textDecoration ?? "none" }}>
                      {item.text ? ((item.textList??"none")==="none"?item.text:item.text.split("\n").map((line,lineIndex)=><div className="text-list-line" key={lineIndex}><span className="text-list-marker">{item.textList==="bullet"?"•":`${lineIndex+1}.`}</span><span>{line||" "}</span></div>)) : <span className="text-placeholder">Двойной щелчок — ввод текста</span>}
                    </div>
                  ))}
              </div>
            ))}
            {preview && (
              <div
                className={`gesture-preview preview-${preview.kind}`}
                style={{ left: preview.x, top: preview.y, width: preview.width, height: preview.height }}
              >
                {preview.kind === "connector" ? <Connector item={preview} /> : <Ink item={preview} />}
              </div>
            )}
          </div>
          {presentation && presentationLaser && presentationLaserPos && !presentationBlackout && <div className="presentation-laser-dot" style={{ left: presentationLaserPos.x, top: presentationLaserPos.y }} aria-hidden="true" />}
          {presentation && presentationSpotlight && presentationSpotlightPos && !presentationBlackout && (
            <div
              className="presentation-spotlight"
              style={{ background: `radial-gradient(circle ${presentationSpotlightRadius}px at ${presentationSpotlightPos.x}px ${presentationSpotlightPos.y}px, transparent 0, transparent ${Math.max(10, presentationSpotlightRadius - 2)}px, rgba(8,9,12,.72) ${presentationSpotlightRadius + 2}px)` }}
              aria-hidden="true"
            />
          )}
          {presentation && presentationBlackout && <div className="presentation-blackout" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={() => setPresentationBlackout(false)}><div><strong>Экран затемнён</strong><span>B или двойной щелчок — вернуться к слайду</span></div></div>}
          {singleSelected?.kind === "connector" && selectedConnectorEndpoints && !editing && !selectionLocked && (
            <div className="connector-endpoint-overlay" aria-label="Редактирование соединительной линии">
              <svg className="connector-selection-line" aria-hidden="true">
                {singleSelected.connectorRouting === "elbow" ? (
                  <path d={`M ${selectedConnectorEndpoints.start.x} ${selectedConnectorEndpoints.start.y} H ${(selectedConnectorEndpoints.start.x + selectedConnectorEndpoints.end.x) / 2} V ${selectedConnectorEndpoints.end.y} H ${selectedConnectorEndpoints.end.x}`} />
                ) : (
                  <line
                    x1={selectedConnectorEndpoints.start.x}
                    y1={selectedConnectorEndpoints.start.y}
                    x2={selectedConnectorEndpoints.end.x}
                    y2={selectedConnectorEndpoints.end.y}
                  />
                )}
              </svg>
              <button
                className={`connector-endpoint-handle ${singleSelected.connectorStartBinding ? "attached" : ""}`}
                data-connector-endpoint="start"
                style={{ left: selectedConnectorEndpoints.start.x, top: selectedConnectorEndpoints.start.y }}
                title={singleSelected.connectorStartBinding ? "Начало привязано к объекту · перетащите, чтобы изменить" : "Перетащите начало линии"}
                aria-label="Начало соединительной линии"
              />
              <button
                className={`connector-endpoint-handle ${singleSelected.connectorEndBinding ? "attached" : ""}`}
                data-connector-endpoint="end"
                style={{ left: selectedConnectorEndpoints.end.x, top: selectedConnectorEndpoints.end.y }}
                title={singleSelected.connectorEndBinding ? "Конец привязан к объекту · перетащите, чтобы изменить" : "Перетащите конец линии"}
                aria-label="Конец соединительной линии"
              />
            </div>
          )}
          {singleSelected && singleSelected.kind !== "connector" && selectionScreenBounds && !editing && !selectionLocked && (
            <div
              className="screen-transform-overlay"
              data-object={singleSelected.id}
              style={{
                left: selectionScreenBounds.left,
                top: selectionScreenBounds.top,
                width: selectionScreenBounds.width,
                height: selectionScreenBounds.height,
                transform: singleSelected.rotation ? `rotate(${singleSelected.rotation}deg)` : undefined,
              }}
            >
              <div className="screen-selection-frame" />
              <div className="screen-rotate-connector" />
              <button
                className="screen-rotate-handle"
                data-transform-handle="rotate"
                tabIndex={-1}
                title="Повернуть мышью · Shift — шаг 90°"
                aria-label="Повернуть объект"
              >
                <Icon name="rotate-right" size={14} />
              </button>
              {(["nw","n","ne","e","se","s","sw","w"] as const).map((h) => (
                <button
                  key={h}
                  className={`screen-resize-handle screen-handle-${h}`}
                  data-transform-handle={h}
                  tabIndex={-1}
                  title="Изменить размер · Shift на углу — сохранить пропорции"
                  aria-label="Изменить размер"
                />
              ))}
            </div>
          )}
          {selectedItems.length > 1 && selectionScreenBounds && !editing && !selectionLocked && (
            <div
              className="screen-transform-overlay screen-transform-group"
              style={{
                left: selectionScreenBounds.left,
                top: selectionScreenBounds.top,
                width: selectionScreenBounds.width,
                height: selectionScreenBounds.height,
              }}
            >
              <div className="screen-selection-frame" />
              <div className="screen-rotate-connector" />
              <button
                className="screen-rotate-handle"
                data-group-transform-handle="rotate"
                tabIndex={-1}
                title="Повернуть всю группу · Shift — шаг 90°"
                aria-label="Повернуть группу"
              >
                <Icon name="rotate-right" size={14} />
              </button>
              {(["nw","n","ne","e","se","s","sw","w"] as const).map((h) => (
                <button
                  key={h}
                  className={`screen-resize-handle screen-handle-${h}`}
                  data-group-transform-handle={h}
                  tabIndex={-1}
                  title="Масштабировать всю группу"
                  aria-label="Масштабировать группу"
                />
              ))}
              <div className="group-count-badge">{selectedItems.length}</div>
            </div>
          )}
          {selectionLocked && selectionScreenBounds && selectedItems.length > 0 && !editing && (
            <div
              className="screen-transform-overlay screen-transform-locked"
              style={{
                left: selectionScreenBounds.left,
                top: selectionScreenBounds.top,
                width: selectionScreenBounds.width,
                height: selectionScreenBounds.height,
              }}
            >
              <div className="screen-selection-frame" />
              <div className="locked-selection-badge"><Icon name="lock" size={13} /> Заблокировано</div>
            </div>
          )}
          {selectionScreenBounds && selectedItems.length > 0 && !editing && (
            <div
              className="selection-toolbar-screen"
              style={{
                left: selectionScreenBounds.left + selectionScreenBounds.width / 2,
                top: selectionScreenBounds.top + selectionScreenBounds.height + 12,
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <span className="selection-toolbar-info">
                {selectedItems.length === 1
                  ? `${Math.round(selectedItems[0].width)} × ${Math.round(selectedItems[0].height)}${selectedItems[0].rotation ? ` · ${Math.round(selectedItems[0].rotation!)}°` : ""}`
                  : `${selectedItems.length} объектов`}
              </span>

              {singleSelected?.kind === "linkmedia" && !selectionLocked && (<span className="linkmedia-selection-controls"><button onClick={()=>openLinkMediaEditor(singleSelected)} title="Изменить ссылку"><Icon name="rename" size={15}/><span>Ссылка</span></button><a href={singleSelected.mediaUrl} target="_blank" rel="noreferrer" onPointerDown={e=>e.stopPropagation()} title="Открыть источник"><Icon name="open" size={15}/></a></span>)}
              {singleSelected?.kind === "frame" && !selectionLocked && (
                <button className="frame-name-action" onClick={renameSelectedFrame} title="Переименовать фрейм · Enter / F2">
                  <Icon name="rename" size={15} />
                  <span>{singleSelected.text.trim() || "Без названия"}</span>
                </button>
              )}
              {singleSelected?.kind === "comment" && !selectionLocked && (
                <span className="comment-selection-controls">
                  <button className={singleSelected.resolved ? "active" : ""} onClick={toggleSelectedCommentResolved} title={singleSelected.resolved ? "Открыть комментарий снова" : "Отметить комментарий решённым"}><Icon name="check" size={15}/></button>
                  <button onClick={() => startEdit(singleSelected)} title="Редактировать комментарий"><Icon name="rename" size={15}/></button>
                  {singleSelected.commentTargetId && <button onClick={detachSelectedComment} title="Отвязать комментарий от объекта"><Icon name="unlink" size={15}/></button>}
                </span>
              )}
              {singleSelected?.kind === "table" && !selectionLocked && (
                <button className="table-edit-action" onClick={() => openTableEditor(singleSelected)} title="Редактировать таблицу">
                  <Icon name="table" size={15}/><span>{singleSelected.tableRows ?? 3}×{singleSelected.tableCols ?? 3}</span>
                </button>
              )}
              {singleSelected?.kind === "checklist" && !selectionLocked && (
                <button className="checklist-edit-action" onClick={() => openChecklistEditor(singleSelected)} title="Редактировать чек-лист"><Icon name="checklist" size={15}/><span>{singleSelected.checklistDone?.filter(Boolean).length ?? 0}/{singleSelected.checklistItems?.length ?? 1}</span></button>
              )}
              {singleSelected?.kind === "quiz" && !selectionLocked && (
                <span className="quiz-selection-controls">
                  <button className="quiz-edit-action" onClick={() => openQuizEditor(singleSelected)} title="Редактировать мини-тест"><Icon name="quiz" size={15}/><span>{singleSelected.quizOptions?.length ?? 2}</span></button>
                  <button className={singleSelected.quizRevealed ? "active" : ""} onClick={() => toggleQuizReveal(singleSelected)} title={singleSelected.quizRevealed ? "Скрыть правильный ответ" : "Показать правильный ответ"}><Icon name={singleSelected.quizRevealed ? "eye-off" : "eye"} size={15}/></button>
                  <button onClick={() => resetQuizAnswer(singleSelected)} title="Сбросить выбранный ответ"><Icon name="reset" size={15}/></button>
                </span>
              )}
              {singleSelected?.kind === "flashcard" && !selectionLocked && (
                <span className="flashcard-selection-controls">
                  <button onClick={() => openFlashcardEditor(singleSelected)} title="Редактировать карточку"><Icon name="flashcard" size={15}/><span>Редактировать</span></button>
                  <button className={singleSelected.flashcardFlipped ? "active" : ""} onClick={() => flipFlashcard(singleSelected)} title="Перевернуть карточку"><Icon name="flip" size={15}/><span>{singleSelected.flashcardFlipped ? "Вопрос" : "Ответ"}</span></button>
                </span>
              )}
              {singleSelected?.kind === "cover" && !selectionLocked && (
                <span className="cover-selection-controls">
                  <button onClick={() => startEdit(singleSelected)} title="Изменить подпись шторки"><Icon name="rename" size={15}/><span>Подпись</span></button>
                  <button className={singleSelected.coverOpen ? "active" : ""} onClick={() => toggleCover(singleSelected)} title={singleSelected.coverOpen ? "Закрыть шторку" : "Открыть шторку"}><Icon name={singleSelected.coverOpen ? "eye-off" : "eye"} size={15}/><span>{singleSelected.coverOpen ? "Закрыть" : "Открыть"}</span></button>
                </span>
              )}
              {singleSelected?.kind === "graph" && !selectionLocked && (<span className="graph-selection-controls"><button onClick={()=>openGraphEditor(singleSelected)} title="Параметры графика"><Icon name="graph" size={15}/><span>График</span></button></span>)}
              {singleSelected?.kind === "formula" && !selectionLocked && (
                <span className="formula-selection-controls">
                  <button className="formula-edit-action" onClick={() => openFormulaEditor(singleSelected)} title="Редактировать формулу"><Icon name="formula" size={15}/><span>{singleSelected.fontSize ?? 28}px</span></button>
                  <button className="formula-fit-action" onClick={fitSelectedFormula} title="Подогнать рамку по формуле"><Icon name="fit" size={15}/></button>
                </span>
              )}

              {singleSelected?.kind === "sticky" && !selectionLocked && (
                <span className="sticky-colors" title="Цвет стикера">
                  {["#fff3a6","#ffd9de","#dff5c8","#dcecff","#eadcff"].map((value) => (
                    <button key={value} className="sticky-color-button" style={{ background: value }} onClick={() => recolorSelected(value)} aria-label={`Цвет стикера ${value}`} />
                  ))}
                </span>
              )}
              {(singleSelected?.kind === "shape" || singleSelected?.kind === "frame" || singleSelected?.kind === "formula" || singleSelected?.kind === "checklist" || singleSelected?.kind === "quiz" || singleSelected?.kind === "flashcard" || singleSelected?.kind === "cover") && !selectionLocked && (
                <span className="object-colors" title="Цвет объекта">
                  {["#6064d4","#2f855a","#d97706","#dc4c64","#475569","#8b5cf6"].map((value) => (
                    <button key={value} className="object-color-button" style={{ background: value }} onClick={() => recolorSelected(value)} aria-label={`Цвет объекта ${value}`} />
                  ))}
                </span>
              )}
              {(singleSelected?.kind === "text" || singleSelected?.kind === "sticky" || singleSelected?.kind === "formula" || singleSelected?.kind === "table" || singleSelected?.kind === "checklist" || singleSelected?.kind === "quiz" || singleSelected?.kind === "flashcard" || singleSelected?.kind === "cover") && !selectionLocked && (
                <span className="font-size-controls" title={singleSelected.kind === "formula" ? "Размер формулы" : singleSelected.kind === "table" ? "Размер текста таблицы" : singleSelected.kind === "checklist" ? "Размер текста чек-листа" : singleSelected.kind === "quiz" ? "Размер текста вопроса" : singleSelected.kind === "flashcard" ? "Размер текста карточки" : singleSelected.kind === "cover" ? "Размер текста шторки" : "Размер текста"}>
                  <button onClick={() => changeFontSize(-2)} aria-label="Уменьшить размер">A−</button>
                  <span>{singleSelected.fontSize ?? (singleSelected.kind === "formula" ? 28 : singleSelected.kind === "table" ? 13 : singleSelected.kind === "checklist" || singleSelected.kind === "quiz" ? 15 : singleSelected.kind === "flashcard" ? 18 : singleSelected.kind === "cover" ? 17 : 20)}</span>
                  <button onClick={() => changeFontSize(2)} aria-label="Увеличить размер">A+</button>
                </span>
              )}
              {(singleSelected?.kind === "text" || singleSelected?.kind === "sticky") && !selectionLocked && (
                <span className="text-format-controls" title="Форматирование текста">
                  <button className={singleSelected.fontWeight === "bold" ? "active" : ""} onClick={() => setSelectedTextStyle({ fontWeight: singleSelected.fontWeight === "bold" ? "normal" : "bold" })} title="Полужирный"><b>B</b></button>
                  <button className={singleSelected.fontStyle === "italic" ? "active" : ""} onClick={() => setSelectedTextStyle({ fontStyle: singleSelected.fontStyle === "italic" ? "normal" : "italic" })} title="Курсив"><i>I</i></button>
                  <button className={singleSelected.textDecoration === "underline" ? "active" : ""} onClick={() => setSelectedTextStyle({ textDecoration: singleSelected.textDecoration === "underline" ? "none" : "underline" })} title="Подчёркивание"><u>U</u></button>
                  <span className="connector-control-separator" />
                  <button className={(singleSelected.textAlign ?? "left") === "left" ? "active" : ""} onClick={() => setSelectedTextStyle({ textAlign: "left" })} title="По левому краю">≡</button>
                  <button className={singleSelected.textAlign === "center" ? "active" : ""} onClick={() => setSelectedTextStyle({ textAlign: "center" })} title="По центру">≣</button>
                  <button className={singleSelected.textAlign === "right" ? "active" : ""} onClick={() => setSelectedTextStyle({ textAlign: "right" })} title="По правому краю">≡</button>
                  <span className="connector-control-separator" />
                  <button className={(singleSelected.textList??"none")==="bullet"?"active":""} onClick={()=>setSelectedTextStyle({textList:(singleSelected.textList??"none")==="bullet"?"none":"bullet"})} title="Маркированный список">•≡</button>
                  <button className={singleSelected.textList==="number"?"active":""} onClick={()=>setSelectedTextStyle({textList:singleSelected.textList==="number"?"none":"number"})} title="Нумерованный список">1≡</button>
                  <select className="text-line-height" value={singleSelected.lineHeight??1.45} onChange={e=>setSelectedTextStyle({lineHeight:Number(e.target.value)})} title="Межстрочный интервал"><option value={1}>1,0</option><option value={1.2}>1,2</option><option value={1.45}>1,45</option><option value={1.75}>1,75</option><option value={2}>2,0</option></select>
                  {singleSelected.kind==="text"&&<span className="text-color-palette">{["#202124","#5355c9","#2f855a","#d97706","#dc4c64","#8b5cf6"].map(value=><button key={value} className="text-color-button" style={{background:value}} onClick={()=>recolorSelected(value)} aria-label={`Цвет текста ${value}`}/>)}</span>}
                </span>
              )}
              {singleSelected?.kind === "connector" && !selectionLocked && (
                <span className="connector-selection-controls">
                  <button className={singleSelected.connectorStyle === "line" ? "active" : ""} onClick={() => setSelectedConnectorStyle("line")} title="Линия"><Icon name="line" size={16} /></button>
                  <button className={(singleSelected.connectorStyle ?? "arrow") === "arrow" ? "active" : ""} onClick={() => setSelectedConnectorStyle("arrow")} title="Стрелка"><Icon name="arrow-one" size={16} /></button>
                  <button className={singleSelected.connectorStyle === "double" ? "active" : ""} onClick={() => setSelectedConnectorStyle("double")} title="Двусторонняя стрелка"><Icon name="arrow-double" size={16} /></button>
                  <span className="connector-control-separator" />
                  <button className={(singleSelected.connectorRouting ?? "straight") === "straight" ? "active" : ""} onClick={() => setSelectedConnectorRouting("straight")} title="Прямая"><Icon name="line" size={16} /></button>
                  <button className={singleSelected.connectorRouting === "elbow" ? "active" : ""} onClick={() => setSelectedConnectorRouting("elbow")} title="Ломаная"><Icon name="elbow" size={16} /></button>
                  <button onClick={renameSelectedConnector} title="Подпись линии"><Icon name="label" size={16} /></button>
                  <button className={(singleSelected.connectorStartBinding || singleSelected.connectorEndBinding) ? "linked" : ""} onClick={detachSelectedConnector} title="Отвязать концы от объектов"><Icon name={(singleSelected.connectorStartBinding || singleSelected.connectorEndBinding) ? "link" : "unlink"} size={16} /></button>
                  {["#5355c9","#2f855a","#d97706","#dc4c64","#1f2937"].map((value) => (
                    <button key={value} className="connector-color-button" style={{ background: value }} onClick={() => recolorSelected(value)} aria-label={`Цвет линии ${value}`} />
                  ))}
                  <button onClick={() => changeSelectedConnectorWeight(-1)} title="Тоньше">−</button>
                  <span className="connector-weight-value">{singleSelected.weight ?? 3}px</span>
                  <button onClick={() => changeSelectedConnectorWeight(1)} title="Толще">+</button>
                </span>
              )}
              {(singleSelected?.kind === "image" || singleSelected?.kind === "pdf") && (
                <span className="media-selection-controls">
                  {singleSelected.kind === "pdf" && (
                    <span className="pdf-page-controls" title="Навигация по PDF">
                      <button disabled={selectionLocked || (singleSelected.pdfPage ?? 1) <= 1} onClick={() => changePdfPage(singleSelected, -5)} aria-label="На 5 страниц назад">«</button>
                      <button disabled={selectionLocked || (singleSelected.pdfPage ?? 1) <= 1} onClick={() => changePdfPage(singleSelected, -1)} aria-label="Предыдущая страница PDF">‹</button>
                      <input key={`pdf-page-${singleSelected.id}-${singleSelected.pdfPage ?? 1}`} type="number" min="1" max="10000" defaultValue={singleSelected.pdfPage ?? 1} aria-label="Номер страницы PDF" onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter") e.currentTarget.blur(); }} onBlur={(e) => setPdfPage(singleSelected, Number(e.currentTarget.value))}/>
                      <button disabled={selectionLocked} onClick={() => changePdfPage(singleSelected, 1)} aria-label="Следующая страница PDF">›</button>
                      <button disabled={selectionLocked} onClick={() => changePdfPage(singleSelected, 5)} aria-label="На 5 страниц вперёд">»</button>
                      <button disabled={selectionLocked} onClick={() => duplicateNextPdfPage(singleSelected)} aria-label="Добавить следующую страницу PDF рядом" title="Создать рядом копию с следующей страницей"><Icon name="duplicate" size={13}/></button>
                    </span>
                  )}
                  <button onClick={() => void openMediaAsset(singleSelected)} title={singleSelected.kind === "pdf" ? "Открыть PDF отдельно" : "Открыть изображение отдельно"}><Icon name="open" size={16} /></button>
                  <button onClick={() => void downloadMediaAsset(singleSelected)} title="Скачать исходный файл"><Icon name="download" size={16} /></button>
                </span>
              )}

              <span className="selection-toolbar-separator" />
              <button className="icon-action" onClick={duplicateSelected} title="Дублировать · Ctrl+D"><Icon name="duplicate" size={16} /></button>
              <button className="icon-action" onClick={toggleLockSelected} title={selectionLocked ? "Разблокировать" : "Заблокировать"}><Icon name={selectionLocked ? "unlock" : "lock"} size={16} /></button>
              {singleSelected?.kind !== "connector" && (
                <>
                  <button className="icon-action" disabled={selectionLocked} onClick={() => rotateSelected(-90)} title="Повернуть на 90° влево · Alt+←"><Icon name="rotate-left" size={16} /></button>
                  <button className="icon-action" disabled={selectionLocked} onClick={() => rotateSelected(90)} title="Повернуть на 90° вправо · Alt+→"><Icon name="rotate-right" size={16} /></button>
                </>
              )}

              <details className="selection-more">
                <summary title="Ещё действия" aria-label="Ещё действия"><Icon name="more" size={17} /></summary>
                <div className="selection-more-menu">
                  <button onClick={copySelected}><Icon name="copy" size={16} /><span>Копировать</span><kbd>Ctrl+C</kbd></button>
                  {selectedItems.length === 1 && singleSelected?.kind !== "comment" && <button onClick={addCommentToSelection}><Icon name="comment" size={16}/><span>Добавить комментарий</span></button>}
                  <button onClick={() => void exportItemsToPng("selection")}><Icon name="download" size={16} /><span>Скачать выделение PNG</span><kbd>Ctrl+Shift+E</kbd></button>
                  {singleSelected?.kind === "frame" && !selectionLocked && (
                    <>
                      <button onClick={renameSelectedFrame}><Icon name="rename" size={16} /><span>Переименовать</span><kbd>F2</kbd></button>
                      <button onClick={() => openFrameNotesEditor(singleSelected)}><Icon name="label" size={16}/><span>Заметки к фрейму</span></button>
                      <button onClick={selectFrameContents}><Icon name="frame-contents" size={16} /><span>Выбрать содержимое</span></button>
                      <button onClick={fitSelectedFrameToContents}><Icon name="fit" size={16} /><span>Подогнать по содержимому</span></button>
                      <button onClick={() => void exportItemsToPng("frame")}><Icon name="download" size={16}/><span>Экспортировать этот фрейм PNG</span></button>
                      <button onClick={() => moveSelectedFrameInPresentation(-1)}><Icon name="chevron-left" size={16}/><span>Раньше в показе</span></button>
                      <button onClick={() => moveSelectedFrameInPresentation(1)}><Icon name="chevron-right" size={16}/><span>Позже в показе</span></button>
                      <div className="selection-more-separator" />
                      <div className="frame-preset-title">Размер фрейма</div>
                      <div className="frame-preset-row">
                        <button onClick={() => resizeSelectedFrame("16:9")}>16:9</button>
                        <button onClick={() => resizeSelectedFrame("4:3")}>4:3</button>
                        <button onClick={() => resizeSelectedFrame("A4")}>A4</button>
                      </div>
                    </>
                  )}
                  {singleSelected?.kind === "pdf" && !selectionLocked && (<>
                    <button onClick={() => spreadPdfPages(singleSelected, 3)}><Icon name="slides" size={16}/><span>Разложить 3 страницы</span></button>
                    <button onClick={() => spreadPdfPages(singleSelected, 5)}><Icon name="slides" size={16}/><span>Разложить 5 страниц</span></button>
                  </>)}
                  {selectedItems.length >= 1 && selectedItems.every((item) => item.kind !== "frame") && (
                    <button onClick={createFrameAroundSelection}><Icon name="frame" size={16} /><span>Фрейм вокруг выделения</span></button>
                  )}
                  {selectedItems.length >= 2 && !selectionHasGroup && !selectionLocked && (
                    <button onClick={groupSelected}><Icon name="group" size={16} /><span>Сгруппировать</span><kbd>Ctrl+G</kbd></button>
                  )}
                  {selectionHasGroup && !selectionLocked && (
                    <button onClick={ungroupSelected}><Icon name="ungroup" size={16} /><span>Разгруппировать</span></button>
                  )}
                  {singleSelected?.kind !== "connector" && (
                    <button disabled={selectionLocked} onClick={resetRotationSelected}><Icon name="reset-rotation" size={16} /><span>Сбросить поворот</span></button>
                  )}
                  <div className="selection-more-separator" />
                  <button disabled={selectionLocked} onClick={() => moveLayerStep(false)}><Icon name="layer-down" size={16} /><span>На слой назад</span><kbd>Ctrl+[</kbd></button>
                  <button disabled={selectionLocked} onClick={() => moveLayerStep(true)}><Icon name="layer-up" size={16} /><span>На слой вперёд</span><kbd>Ctrl+]</kbd></button>
                  <button disabled={selectionLocked} onClick={() => moveLayer(false)}><Icon name="send-back" size={16} /><span>На задний план</span></button>
                  <button disabled={selectionLocked} onClick={() => moveLayer(true)}><Icon name="send-front" size={16} /><span>На передний план</span></button>
                  {selectedItems.length > 1 && (
                    <>
                      <div className="selection-more-separator" />
                      <div className="selection-align-grid">
                        <button disabled={selectionLocked} onClick={() => alignSelected("left")} title="По левому краю"><Icon name="align-left" size={16} /></button>
                        <button disabled={selectionLocked} onClick={() => alignSelected("hcenter")} title="Центры по горизонтали"><Icon name="align-center-x" size={16} /></button>
                        <button disabled={selectionLocked} onClick={() => alignSelected("right")} title="По правому краю"><Icon name="align-right" size={16} /></button>
                        <button disabled={selectionLocked} onClick={() => alignSelected("top")} title="По верхнему краю"><Icon name="align-top" size={16} /></button>
                        <button disabled={selectionLocked} onClick={() => alignSelected("vcenter")} title="Центры по вертикали"><Icon name="align-center-y" size={16} /></button>
                        <button disabled={selectionLocked} onClick={() => alignSelected("bottom")} title="По нижнему краю"><Icon name="align-bottom" size={16} /></button>
                        {selectedItems.length >= 3 && <button disabled={selectionLocked} onClick={() => distributeSelected("x")} title="Распределить по горизонтали"><Icon name="distribute-x" size={16} /></button>}
                        {selectedItems.length >= 3 && <button disabled={selectionLocked} onClick={() => distributeSelected("y")} title="Распределить по вертикали"><Icon name="distribute-y" size={16} /></button>}
                        {selectedItems.length >= 2 && <><button disabled={selectionLocked} onClick={() => equalizeSelectedSize("width")} title="Одинаковая ширина">↔</button><button disabled={selectionLocked} onClick={() => equalizeSelectedSize("height")} title="Одинаковая высота">↕</button><button disabled={selectionLocked} onClick={() => equalizeSelectedSize("both")} title="Одинаковый размер">□</button></>}
                      </div>
                    </>
                  )}
                </div>
              </details>

              <button className="selection-toolbar-danger icon-action" disabled={selectionLocked} onClick={deleteSelected} title="Удалить · Delete"><Icon name="trash" size={16} /></button>
            </div>
          )}
          {guides.x != null && (
            <div
              className="smart-guide smart-guide-vertical"
              style={{ left: guides.x * view.zoom + view.x }}
              aria-hidden="true"
            />
          )}
          {guides.y != null && (
            <div
              className="smart-guide smart-guide-horizontal"
              style={{ top: guides.y * view.zoom + view.y }}
              aria-hidden="true"
            />
          )}
          {contextMenu && (
            <div
              className="board-context-menu"
              data-context-menu
              style={{
                left: Math.min(contextMenu.x, Math.max(8, (board.current?.clientWidth ?? 1200) - 230)),
                top: Math.min(contextMenu.y, Math.max(8, (board.current?.clientHeight ?? 800) - 390)),
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {selectedItems.length ? (
                <>
                  <button onClick={() => { duplicateSelected(); setContextMenu(null); }}>Дублировать <span>Ctrl+D</span></button>
                  <button onClick={() => { copySelected(); setContextMenu(null); }}>Копировать <span>Ctrl+C</span></button>
                  {singleSelected?.kind !== "comment" && <button onClick={() => { addCommentToSelection(); setContextMenu(null); }}>Добавить комментарий</button>}
                  {singleSelected?.kind === "table" && !selectionLocked && <button onClick={() => { openTableEditor(singleSelected); setContextMenu(null); }}>Редактировать таблицу</button>}
                  {singleSelected?.kind === "formula" && !selectionLocked && <button onClick={() => { openFormulaEditor(singleSelected); setContextMenu(null); }}>Редактировать формулу</button>}
                  {singleSelected?.kind === "checklist" && !selectionLocked && <button onClick={() => { openChecklistEditor(singleSelected); setContextMenu(null); }}>Редактировать чек-лист</button>}
                  {singleSelected?.kind === "quiz" && !selectionLocked && (<>
                    <button onClick={() => { openQuizEditor(singleSelected); setContextMenu(null); }}>Редактировать мини-тест</button>
                    <button onClick={() => { toggleQuizReveal(singleSelected); setContextMenu(null); }}>{singleSelected.quizRevealed ? "Скрыть правильный ответ" : "Показать правильный ответ"}</button>
                    <button onClick={() => { resetQuizAnswer(singleSelected); setContextMenu(null); }}>Сбросить ответ</button>
                  </>)}
                  {singleSelected?.kind === "flashcard" && !selectionLocked && (<>
                    <button onClick={() => { openFlashcardEditor(singleSelected); setContextMenu(null); }}>Редактировать карточку</button>
                    <button onClick={() => { flipFlashcard(singleSelected); setContextMenu(null); }}>{singleSelected.flashcardFlipped ? "Показать вопрос" : "Показать ответ"}</button>
                  </>)}
                  {singleSelected?.kind === "pdf" && !selectionLocked && (<>
                    <button onClick={() => { duplicateNextPdfPage(singleSelected); setContextMenu(null); }}>Следующая страница рядом</button>
                    <button onClick={() => { spreadPdfPages(singleSelected, 3); setContextMenu(null); }}>Разложить 3 страницы</button>
                    <button onClick={() => { spreadPdfPages(singleSelected, 5); setContextMenu(null); }}>Разложить 5 страниц</button>
                  </>)}
                  {singleSelected?.kind === "comment" && !selectionLocked && (<>
                    <button onClick={() => { toggleSelectedCommentResolved(); setContextMenu(null); }}>{singleSelected.resolved ? "Открыть комментарий снова" : "Отметить решённым"}</button>
                    {singleSelected.commentTargetId && <button onClick={() => { detachSelectedComment(); setContextMenu(null); }}>Отвязать комментарий</button>}
                  </>)}
                  {singleSelected?.kind === "frame" && !selectionLocked && (
                    <>
                      <button onClick={() => { renameSelectedFrame(); setContextMenu(null); }}>Переименовать фрейм <span>F2</span></button>
                      <button onClick={() => { openFrameNotesEditor(singleSelected); setContextMenu(null); }}>Заметки к фрейму</button>
                      <button onClick={() => { selectFrameContents(); setContextMenu(null); }}>Выбрать содержимое фрейма</button>
                      <button onClick={() => { void exportItemsToPng("frame"); setContextMenu(null); }}>Экспортировать фрейм PNG</button>
                      <button onClick={() => { moveSelectedFrameInPresentation(-1); setContextMenu(null); }}>Раньше в показе</button>
                      <button onClick={() => { moveSelectedFrameInPresentation(1); setContextMenu(null); }}>Позже в показе</button>
                    </>
                  )}
                  <div className="context-separator" />
                  {selectedItems.length >= 2 && !selectionHasGroup && !selectionLocked && (
                    <button onClick={() => { groupSelected(); setContextMenu(null); }}>Сгруппировать <span>Ctrl+G</span></button>
                  )}
                  {selectionHasGroup && !selectionLocked && (
                    <button onClick={() => { ungroupSelected(); setContextMenu(null); }}>Разгруппировать <span>Ctrl+Shift+G</span></button>
                  )}
                  <button onClick={() => { toggleLockSelected(); setContextMenu(null); }}>{selectionLocked ? "Разблокировать" : "Заблокировать"}</button>
                  <div className="context-separator" />
                  <button disabled={selectionLocked} onClick={() => { moveLayerStep(true); setContextMenu(null); }}>На слой вперёд <span>Ctrl+]</span></button>
                  <button disabled={selectionLocked} onClick={() => { moveLayerStep(false); setContextMenu(null); }}>На слой назад <span>Ctrl+[</span></button>
                  <button disabled={selectionLocked} onClick={() => { moveLayer(true); setContextMenu(null); }}>На передний план</button>
                  <button disabled={selectionLocked} onClick={() => { moveLayer(false); setContextMenu(null); }}>На задний план</button>
                  {singleSelected?.kind !== "connector" && (
                    <>
                      <button disabled={selectionLocked} onClick={() => { rotateSelected(-90); setContextMenu(null); }}>Повернуть на 90° влево <span>Alt+←</span></button>
                      <button disabled={selectionLocked} onClick={() => { rotateSelected(90); setContextMenu(null); }}>Повернуть на 90° вправо <span>Alt+→</span></button>
                      <button disabled={selectionLocked} onClick={() => { resetRotationSelected(); setContextMenu(null); }}>Сбросить поворот</button>
                    </>
                  )}
                  <div className="context-separator" />
                  <button className="context-danger" disabled={selectionLocked} onClick={() => { deleteSelected(); setContextMenu(null); }}>Удалить <span>Delete</span></button>
                </>
              ) : (
                <>
                  <button disabled={!clipboard.current.length} onClick={() => { pasteClipboard(); setContextMenu(null); }}>Вставить <span>Ctrl+V</span></button>
                  <button disabled={!items.length} onClick={() => { fitToBounds(boundsOf(itemsRef.current.filter((item) => !item.hidden))); setContextMenu(null); }}>Показать всю доску</button>
                  <button onClick={() => { setView({ x: 0, y: 0, zoom: 1 }); setContextMenu(null); }}>Масштаб 100%</button>
                </>
              )}
            </div>
          )}
          {tool === "eraser" && eraserCursor && (
            <div className="eraser-cursor" aria-hidden="true" style={{ left: eraserCursor.x, top: eraserCursor.y, width: eraserSize, height: eraserSize }} />
          )}
          {path.length > 0 && (
            <svg className="lasso-overlay">
              <polygon
                points={path
                  .map(
                    (p) =>
                      `${p.x * view.zoom + view.x},${p.y * view.zoom + view.y}`,
                  )
                  .join(" ")}
              />
            </svg>
          )}
        </section>
        <div className="coordinates">
          {selected.length
            ? selectionLocked
              ? `Выделено: ${selected.length} · объект заблокирован · разблокируйте для редактирования`
              : `Выделено: ${selected.length} · Alt+перетаскивание — копия · стрелки — сдвиг · Shift+стрелка — 10 px`
            : `Сейчас: ${toolShortLabel[tool]} · правый клик — меню · колесо мыши — масштаб`}
        </div>
        <div className="board-controls">
          <button aria-label="Уменьшить" title="Уменьшить" onClick={() => zoom(0.8)}><Icon name="zoom-out" size={16} /></button>
          <button
            className="zoom-value"
            onClick={() => setView({ x: 0, y: 0, zoom: 1 })}
            title="Вернуть масштаб 100%"
          >
            {Math.round(view.zoom * 100)}%
          </button>
          <button aria-label="Увеличить" title="Увеличить" onClick={() => zoom(1.25)}><Icon name="zoom-in" size={16} /></button>
          <span className="board-controls-separator" />
          <button
            className="grid-toggle"
            onClick={cycleGrid}
            title={gridMode === "dots" ? "Фон: точки · переключить на сетку" : gridMode === "grid" ? "Фон: сетка · переключить на чистый" : "Фон: чистый · переключить на точки"}
          >
            <Icon name={gridMode === "dots" ? "dots" : gridMode === "grid" ? "grid" : "plain"} size={16} />
          </button>
          <button
            className={`snap-toggle ${snapEnabled ? "active" : ""}`}
            onClick={() => { setSnapEnabled((value) => !value); setGuides({}); }}
            title="Умные привязки при перемещении · Alt временно отключает"
          >
            <Icon name="snap" size={16} />
          </button>
          <button
            className="fit-button"
            disabled={!items.length}
            onClick={() => fitToBounds(boundsOf(itemsRef.current.filter((item) => !item.hidden)))}
            title="Показать всю доску"
          >
            <Icon name="fit" size={15} /><span>Все</span>
          </button>
          <button
            className="fit-button"
            disabled={!selectionBounds}
            onClick={() => fitToBounds(selectionBounds, 120)}
            title="Приблизить выделение"
          >
            <Icon name="select" size={14} /><span>Выбор</span>
          </button>
        </div>
        {items.length > 0 && (
          <div className="minimap">
            <div className="minimap-header">
              <span>Навигация</span>
              <span>{visibleItems.length} видно · {items.length} всего</span>
            </div>
            <div
              className="minimap-world"
              title="Щёлкните, чтобы перейти к месту на доске"
              onPointerDown={(e) => {
                e.preventDefault();
                const miniRect = e.currentTarget.getBoundingClientRect();
                const mainRect = board.current?.getBoundingClientRect();
                if (!mainRect) return;
                const worldX = miniX + ((e.clientX - miniRect.left) / miniRect.width) * miniW;
                const worldY = miniY + ((e.clientY - miniRect.top) / miniRect.height) * miniH;
                setView((current) => ({
                  ...current,
                  x: mainRect.width / 2 - worldX * current.zoom,
                  y: mainRect.height / 2 - worldY * current.zoom,
                }));
              }}
            >
              {visibleItems.slice(0, 400).map((item) => (
                <span
                  key={item.id}
                  className={`minimap-item ${selected.includes(item.id) ? "selected" : ""}`}
                  style={{
                    left: `${((item.x - miniX) / miniW) * 100}%`,
                    top: `${((item.y - miniY) / miniH) * 100}%`,
                    width: `${Math.max(1.2, (item.width / miniW) * 100)}%`,
                    height: `${Math.max(1.2, (item.height / miniH) * 100)}%`,
                  }}
                />
              ))}
              {visibleWorld && (
                <span
                  className="minimap-viewport"
                  style={{
                    left: `${((visibleWorld.x - miniX) / miniW) * 100}%`,
                    top: `${((visibleWorld.y - miniY) / miniH) * 100}%`,
                    width: `${(visibleWorld.width / miniW) * 100}%`,
                    height: `${(visibleWorld.height / miniH) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


export default function App() {
  const [route, setRoute] = useState<AppRoute>(initialRoute);
  const navigate = useCallback((path: string, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"](null, "", path);
    setRoute(parseRoute(path));
  }, []);
  useEffect(() => {
    const changed = () => {
      const next = parseRoute(window.location.pathname);
      if (next.kind === "join") rememberShareToken(next.token);
      setRoute(next);
    };
    window.addEventListener("popstate", changed);
    return () => window.removeEventListener("popstate", changed);
  }, []);
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getCachedCurrentUser());
  const [accountRole,setAccountRoleState]=useState<AccountRole>("student");
  const [isAppAdmin,setIsAppAdmin]=useState(false);
  const [authReady, setAuthReady] = useState(() => Boolean(getCachedCurrentUser()));
  const [activeBoard, setActiveBoard] = useState<BoardSummary | null>(null);
  const boardChanged = useCallback((updated: BoardSummary) => {
    setActiveBoard(current => current?.id === updated.id ? updated : current);
  }, []);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardLoadError, setBoardLoadError] = useState("");
  const [sharePassword, setSharePassword] = useState("");
  const [sharePasswordRequired, setSharePasswordRequired] = useState(false);
  const [remoteVersion, setRemoteVersion] = useState<number | null>(null);
  const [boardMountKey, setBoardMountKey] = useState(0);
  const [globalInstallPrompt,setGlobalInstallPrompt]=useState<Event|null>(null);
  const [globalStandalone,setGlobalStandalone]=useState(()=>window.matchMedia?.("(display-mode: standalone)").matches===true);
  useEffect(()=>{
    const ready=(e:Event)=>{e.preventDefault();setGlobalInstallPrompt(e)};
    const installed=()=>{setGlobalInstallPrompt(null);setGlobalStandalone(true)};
    window.addEventListener("beforeinstallprompt",ready);
    window.addEventListener("appinstalled",installed);
    return()=>{window.removeEventListener("beforeinstallprompt",ready);window.removeEventListener("appinstalled",installed)};
  },[]);
  const installGlobalApp=async()=>{
    const prompt=globalInstallPrompt as (Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>})|null;
    if(!prompt)return;
    await prompt.prompt();
    await prompt.userChoice;
    setGlobalInstallPrompt(null);
  };

  useEffect(() => {
    let alive = true;
    void getCurrentUser().then((user) => {
      if (alive) setAuthUser(user);
    }).catch(() => {
      if (alive) setAuthUser(null);
    }).finally(() => {
      if (alive) setAuthReady(true);
    });
    return () => { alive = false; };
  }, []);

  const logout = () => {
    clearPendingShare();
    navigate("/", true);
    setAuthUser(null);
    setActiveBoard(null);
    void logoutUser().finally(() => {
      setActiveBoard(null);
      setAuthUser(null);
    });
  };

  const openBoard = useCallback(async (board: BoardSummary, isCurrent: () => boolean) => {
    setBoardLoadError("");
    setBoardLoading(true);
    try {
      if (isRemoteBackendEnabled()) {
        const remote = await getRemoteBoardDocument(board.id);
        if (!isCurrent()) return;
        const key = boardStorageKey(board.id);
        if (remote?.document) {
          const parsed = parseDocument(JSON.stringify(remote.document));
          localStorage.setItem(key, JSON.stringify(parsed));
          setRemoteVersion(remote.version);
        } else {
          const raw = localStorage.getItem(key);
          if (raw && board.role !== "viewer") {
            const localDocument = parseDocument(raw);
            try {
              await ensureBoardAssets(board.id, localDocument);
              const saved = await saveRemoteBoardDocument(board.id, localDocument, 0);
              if (!isCurrent()) return;
              // Keep local data; the mounted subscription will offer conflict resolution.
              setRemoteVersion(saved.conflict ? null : saved.version);
            } catch {
              // A missing v19 attachment or unavailable Storage must not prevent
              // opening the local document. Autosave will retry synchronization.
              if (isCurrent()) setRemoteVersion(null);
            }
          } else {
            setRemoteVersion(null);
          }
        }
      } else {
        setRemoteVersion(null);
      }
      if (!isCurrent()) return;
      setActiveBoard(board);
      setBoardMountKey((value) => value + 1);
    } catch (error) {
      if (isCurrent()) setBoardLoadError(error instanceof Error ? error.message : "Не удалось загрузить доску с сервера");
    } finally {
      if (isCurrent()) setBoardLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !authUser) return;
    let alive = true;
    setActiveBoard(null);
    setBoardLoadError("");
    setSharePasswordRequired(false);
    if (route.kind === "home") { setBoardLoading(false); return; }
    setBoardLoading(true);
    void (async () => {
      try {
        if (route.kind === "invalid") throw new Error("Ссылка недействительна");
        if (route.kind === "join") {
          rememberShareToken(route.token);
          const redeemed = await redeemShareLink(route.token, sharePassword || undefined);
          if (!alive) return;
          clearPendingShare();
          navigate(`/board/${redeemed.board_id}`, true);
          return;
        }
        const board = await getBoardForUser(authUser, route.boardId);
        if (!alive) return;
        if (!board) throw new Error("Доска недоступна. Попросите владельца прислать ссылку для доступа.");
        await openBoard(board, () => alive);
      } catch (error) {
        if (!alive) return;
        setBoardLoading(false);
        const message=error instanceof Error ? error.message : "Не удалось открыть доску";
        if(route.kind==="join" && /парол/i.test(message)){
          setSharePasswordRequired(true);
          setBoardLoadError("");
        }else{
          setSharePasswordRequired(false);
          setBoardLoadError(route.kind === "join"
            ? message || "Не удалось принять ссылку. Возможно, она отозвана, истекла или сервер недоступен."
            : message);
        }
      }
    })();
    return () => { alive = false; };
  }, [route, authReady, authUser, navigate, openBoard, sharePassword]);

  useEffect(()=>{if(!authUser)return;let alive=true;const refresh=()=>void getAccountAccess().then(x=>{if(alive){setAccountRoleState(x.role);setIsAppAdmin(x.isAdmin)}}).catch(()=>{});refresh();const listener=()=>refresh();window.addEventListener("onlinerepetitor:account-access",listener);return()=>{alive=false;window.removeEventListener("onlinerepetitor:account-access",listener)}},[authUser?.id]);

  if (!authReady) {
    return <main className="auth-shell"><section className="auth-card"><div className="auth-brand-row"><div className="auth-logo">B</div><div><div className="auth-brand">Учебная доска</div><div className="auth-subtitle">Проверяем сессию…</div></div></div></section></main>;
  }



  if (!authUser) {
    return <AuthScreen onAuthenticated={(user) => { setAuthUser(user); setActiveBoard(null); }} />;
  }

  if (!activeBoard) {
    return (
      <>
        {route.kind === "home" && (()=>{const section=new URLSearchParams(window.location.search).get("section");return section==="admin" && isAppAdmin
          ? <AdminScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />
          : section==="students" && accountRole==="teacher"
          ? <StudentsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />
          : section==="assignments"
          ? <AssignmentsScreen user={authUser} accountRole={accountRole} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />
          : section==="progress" && accountRole==="teacher"
          ? <ProgressScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />
          : section==="schedule"
          ? <ScheduleScreen user={authUser} accountRole={accountRole} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />
          : section==="materials" && accountRole==="teacher"
          ? <MaterialsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />
          : section==="notifications"
          ? <NotificationsScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />
          : section==="profile"
          ? <ProfileScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onLogout={logout} installAvailable={Boolean(globalInstallPrompt)} isInstalled={globalStandalone} onInstall={()=>void installGlobalApp()} />
          : section==="guide"
          ? <TestingGuideScreen user={authUser} accountRole={accountRole} isAppAdmin={isAppAdmin} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} />
          : section==="templates" && accountRole==="teacher"
          ? <TemplatesScreen user={authUser} onBack={()=>{window.history.pushState({}, "", "/");window.dispatchEvent(new PopStateEvent("popstate"))}} onOpenBoard={(board)=>navigate(`/board/${board.id}`)} />
          : <BoardsScreen user={authUser} accountRole={accountRole} isAppAdmin={isAppAdmin} onOpenBoard={(board) => navigate(`/board/${board.id}`)} onLogout={logout} />})()}
        {sharePasswordRequired && route.kind==="join" && <div className="board-server-overlay"><form className="board-server-card share-password-card" onSubmit={e=>{e.preventDefault();if(!sharePassword.trim())return;setSharePasswordRequired(false);setRoute({...route});}}><strong>Ссылка защищена паролем</strong><span>Введите пароль, который сообщил владелец доски.</span><input type="password" autoFocus value={sharePassword} onChange={e=>setSharePassword(e.target.value)} placeholder="Пароль ссылки" autoComplete="off"/><div className="share-password-actions"><button className="primary" type="submit" disabled={!sharePassword.trim()}>Открыть доску</button><button type="button" onClick={()=>{setSharePassword("");clearPendingShare();navigate("/",true)}}>Отмена</button></div></form></div>}
        {boardLoading && <div className="board-server-overlay"><div className="board-server-card"><strong>Загружаем доску…</strong><span>Получаем последнюю версию с сервера.</span></div></div>}
        {boardLoadError && <div className="board-server-overlay"><div className="board-server-card"><strong>Не удалось открыть доску</strong><span>{boardLoadError}</span><button className="primary" onClick={() => setRoute({ ...route })}>Повторить</button><button onClick={() => { clearPendingShare(); navigate("/", true); }}>К моим доскам</button></div></div>}
      </>
    );
  }

  return (
    <BoardApp
      key={`${activeBoard.id}:${boardMountKey}`}
      authUser={authUser}
      boardSummary={activeBoard}
      initialRemoteVersion={remoteVersion}
      onBoardChanged={boardChanged}
      onBackToBoards={() => { setActiveBoard(null); navigate("/"); }}
      onLogout={logout}
    />
  );
}
