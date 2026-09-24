import type { AuthUser } from "./authStore";
import { getUserBoards, getBoardAccess } from "./boardStore";

export type StudentRecord = {
  userId: string;
  name: string;
  email: string;
  boardIds: string[];
  boardTitles: string[];
  lastBoardAt: string;
  note: string;
  tags: string[];
};

const NOTES_KEY = "onlinerepetitor.student-notes.v1";
const TAGS_KEY = "onlinerepetitor.student-tags.v1";

const readMap = (key: string): Record<string, string | string[]> => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "{}");
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const saveMap = (key: string, value: unknown) =>
  localStorage.setItem(key, JSON.stringify(value));

export const saveStudentNote = (userId: string, note: string) => {
  const all = readMap(NOTES_KEY);
  all[userId] = note;
  saveMap(NOTES_KEY, all);
};

export const saveStudentTags = (userId: string, tags: string[]) => {
  const all = readMap(TAGS_KEY);
  all[userId] = tags;
  saveMap(TAGS_KEY, all);
};

export async function getStudentsForTeacher(user: AuthUser): Promise<StudentRecord[]> {
  const boards = (await getUserBoards(user)).filter((board) => board.role === "owner");
  const notes = readMap(NOTES_KEY);
  const tags = readMap(TAGS_KEY);
  const byUser = new Map<string, StudentRecord>();

  for (const board of boards) {
    let members: { userId: string; user: AuthUser | null }[] = [];
    try {
      const access = await getBoardAccess(user.id, board.id);
      members = access.members;
    } catch {
      continue;
    }

    for (const member of members) {
      if (!member.user) continue;

      const previous = byUser.get(member.userId);
      const next: StudentRecord = previous ?? {
        userId: member.userId,
        name: member.user.name || "Ученик",
        email: member.user.email || "",
        boardIds: [],
        boardTitles: [],
        lastBoardAt: board.updatedAt,
        note: typeof notes[member.userId] === "string" ? notes[member.userId] as string : "",
        tags: Array.isArray(tags[member.userId]) ? tags[member.userId] as string[] : [],
      };

      if (!next.boardIds.includes(board.id)) {
        next.boardIds.push(board.id);
        next.boardTitles.push(board.title);
      }
      if (board.updatedAt > next.lastBoardAt) next.lastBoardAt = board.updatedAt;
      byUser.set(member.userId, next);
    }
  }

  return [...byUser.values()].sort((a, b) =>
    a.name.localeCompare(b.name, "ru", { sensitivity: "base" })
  );
}
