/**
 * 캔버스 state store (Zustand).
 *
 * 단일 source of truth — Editor / Toolbar / Sidebar / PropertyPanel 가 모두 여기서 읽고 쓴다.
 *
 * Undo/Redo: 단순 history stack — 50 단계까지 보관. 각 작업 후 push.
 */

import { create } from 'zustand';
import type { Scene, DesignElement, ElementType } from './types';
import { makeDefaultElement } from './types';

const MAX_HISTORY = 50;

interface EditorState {
    scene: Scene;
    selectedIds: string[];
    /** Undo/Redo history. */
    history: Scene[];
    historyIndex: number;

    /** scene 직접 set (load 시). */
    loadScene: (scene: Scene) => void;
    /** 캔버스 사이즈 변경. */
    setCanvasSize: (width: number, height: number) => void;
    setBackground: (color: string) => void;

    addElement: (type: ElementType, opts?: { x?: number; y?: number }) => string;
    addImageElement: (src: string, opts?: { x?: number; y?: number; width?: number; height?: number }) => string;
    updateElement: (id: string, patch: Partial<DesignElement>) => void;
    deleteElements: (ids: string[]) => void;
    duplicateElements: (ids: string[]) => void;
    /** z-order 변경 — 'up' / 'down' / 'top' / 'bottom'. */
    reorderElement: (id: string, direction: 'up' | 'down' | 'top' | 'bottom') => void;
    toggleVisibility: (id: string) => void;
    toggleLock: (id: string) => void;

    select: (ids: string[]) => void;
    selectAll: () => void;
    clearSelection: () => void;

    undo: () => void;
    redo: () => void;
}

const initialScene: Scene = {
    width: 1080,
    height: 1080,
    background: '#ffffff',
    elements: [],
};

/** scene 변경 후 history 에 push 하는 헬퍼 — set wrap. */
function withHistory(set: any, get: any, mutator: (scene: Scene) => Scene) {
    const current = get().scene;
    const next = mutator(current);
    const history = get().history.slice(0, get().historyIndex + 1);
    history.push(next);
    if (history.length > MAX_HISTORY) history.shift();
    set({ scene: next, history, historyIndex: history.length - 1 });
}

export const useEditorStore = create<EditorState>((set, get) => ({
    scene: initialScene,
    selectedIds: [],
    history: [initialScene],
    historyIndex: 0,

    loadScene: (scene) => set({ scene, history: [scene], historyIndex: 0, selectedIds: [] }),

    setCanvasSize: (width, height) =>
        withHistory(set, get, (s) => ({ ...s, width, height })),

    setBackground: (background) =>
        withHistory(set, get, (s) => ({ ...s, background })),

    addElement: (type, opts) => {
        const x = opts?.x ?? get().scene.width / 2 - 100;
        const y = opts?.y ?? get().scene.height / 2 - 60;
        const el = makeDefaultElement(type, { x, y });
        withHistory(set, get, (s) => ({ ...s, elements: [...s.elements, el] }));
        set({ selectedIds: [el.id] });
        return el.id;
    },

    addImageElement: (src, opts) => {
        const id = crypto.randomUUID();
        const el: DesignElement = {
            id, type: 'image', src,
            x: opts?.x ?? 100, y: opts?.y ?? 100,
            width: opts?.width ?? 400, height: opts?.height ?? 400,
            rotation: 0, opacity: 1, visible: true, locked: false, fit: 'cover',
        };
        withHistory(set, get, (s) => ({ ...s, elements: [...s.elements, el] }));
        set({ selectedIds: [id] });
        return id;
    },

    updateElement: (id, patch) =>
        withHistory(set, get, (s) => ({
            ...s,
            elements: s.elements.map(e => e.id === id ? { ...e, ...patch } as DesignElement : e),
        })),

    deleteElements: (ids) => {
        if (ids.length === 0) return;
        withHistory(set, get, (s) => ({ ...s, elements: s.elements.filter(e => !ids.includes(e.id)) }));
        set({ selectedIds: [] });
    },

    duplicateElements: (ids) => {
        if (ids.length === 0) return;
        const offset = 20;
        const newIds: string[] = [];
        withHistory(set, get, (s) => {
            const toDup = s.elements.filter(e => ids.includes(e.id));
            const copies = toDup.map(e => {
                const newId = crypto.randomUUID();
                newIds.push(newId);
                return { ...e, id: newId, x: e.x + offset, y: e.y + offset };
            });
            return { ...s, elements: [...s.elements, ...copies] };
        });
        set({ selectedIds: newIds });
    },

    reorderElement: (id, direction) =>
        withHistory(set, get, (s) => {
            const idx = s.elements.findIndex(e => e.id === id);
            if (idx === -1) return s;
            const els = [...s.elements];
            const [el] = els.splice(idx, 1);
            let newIdx: number;
            switch (direction) {
                case 'up':     newIdx = Math.min(els.length, idx + 1); break;
                case 'down':   newIdx = Math.max(0, idx - 1); break;
                case 'top':    newIdx = els.length; break;
                case 'bottom': newIdx = 0; break;
            }
            els.splice(newIdx, 0, el);
            return { ...s, elements: els };
        }),

    toggleVisibility: (id) => {
        const el = get().scene.elements.find(e => e.id === id);
        if (!el) return;
        get().updateElement(id, { visible: !el.visible });
    },

    toggleLock: (id) => {
        const el = get().scene.elements.find(e => e.id === id);
        if (!el) return;
        get().updateElement(id, { locked: !el.locked });
    },

    select: (ids) => set({ selectedIds: ids }),
    selectAll: () => set({ selectedIds: get().scene.elements.filter(e => !e.locked && e.visible).map(e => e.id) }),
    clearSelection: () => set({ selectedIds: [] }),

    undo: () => {
        const { historyIndex, history } = get();
        if (historyIndex <= 0) return;
        set({ historyIndex: historyIndex - 1, scene: history[historyIndex - 1], selectedIds: [] });
    },

    redo: () => {
        const { historyIndex, history } = get();
        if (historyIndex >= history.length - 1) return;
        set({ historyIndex: historyIndex + 1, scene: history[historyIndex + 1], selectedIds: [] });
    },
}));
