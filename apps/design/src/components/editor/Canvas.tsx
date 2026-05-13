'use client';

import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Rect, Circle, Text, Line, Image as KonvaImage, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { useEditorStore } from '@/lib/design/store';
import type { DesignElement, ImageElement } from '@/lib/design/types';

/**
 * react-konva 캔버스 — Editor 의 핵심.
 *
 * 특징:
 *   - element 클릭/드래그/리사이즈/회전 모두 처리
 *   - Transformer 로 선택된 요소 (다중 선택 가능)
 *   - zoom + pan (휠 + space-drag) — 1단계는 zoom 만, pan 은 추후
 *   - undo/redo 키보드 (Ctrl+Z, Ctrl+Shift+Z)
 */
export default function Canvas({ stageRef }: { stageRef?: React.MutableRefObject<Konva.Stage | null> }) {
    const scene = useEditorStore(s => s.scene);
    const selectedIds = useEditorStore(s => s.selectedIds);
    const select = useEditorStore(s => s.select);
    const clearSelection = useEditorStore(s => s.clearSelection);
    const updateElement = useEditorStore(s => s.updateElement);
    const deleteElements = useEditorStore(s => s.deleteElements);
    const duplicateElements = useEditorStore(s => s.duplicateElements);
    const undo = useEditorStore(s => s.undo);
    const redo = useEditorStore(s => s.redo);

    const trRef = useRef<Konva.Transformer | null>(null);
    const internalStageRef = useRef<Konva.Stage | null>(null);
    const [scale, setScale] = useState(0.5);

    // 외부에 stageRef 전달 (export 시 stage.toDataURL 사용)
    useEffect(() => {
        if (stageRef) stageRef.current = internalStageRef.current;
    });

    // Transformer 에 선택된 노드 attach
    useEffect(() => {
        const stage = internalStageRef.current;
        const tr = trRef.current;
        if (!stage || !tr) return;
        const nodes = selectedIds
            .map(id => stage.findOne('#' + id))
            .filter((n): n is Konva.Node => !!n);
        tr.nodes(nodes);
        tr.getLayer()?.batchDraw();
    }, [selectedIds, scene.elements]);

    // 키보드 단축키
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement | null)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA') return;

            if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
            if ((e.metaKey || e.ctrlKey) && (e.key === 'Z' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
            if ((e.metaKey || e.ctrlKey) && e.key === 'd') { e.preventDefault(); duplicateElements(selectedIds); return; }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
                e.preventDefault(); deleteElements(selectedIds); return;
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [selectedIds, undo, redo, deleteElements, duplicateElements]);

    // 휠로 줌
    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
        e.evt.preventDefault();
        const delta = e.evt.deltaY > 0 ? 0.9 : 1.1;
        setScale(prev => Math.max(0.1, Math.min(3, prev * delta)));
    };

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
        // 빈 영역 클릭 → 선택 해제
        if (e.target === e.target.getStage()) {
            clearSelection();
        }
    };

    const onElementSelect = (id: string, e: Konva.KonvaEventObject<MouseEvent>) => {
        e.cancelBubble = true;
        const metaPressed = e.evt.shiftKey || e.evt.metaKey || e.evt.ctrlKey;
        if (metaPressed) {
            select(selectedIds.includes(id) ? selectedIds.filter(i => i !== id) : [...selectedIds, id]);
        } else {
            select([id]);
        }
    };

    return (
        <div style={{
            background: '#f1f3f5', height: '100%', overflow: 'auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40,
        }}>
            <Stage
                ref={internalStageRef}
                width={scene.width * scale}
                height={scene.height * scale}
                scaleX={scale}
                scaleY={scale}
                onWheel={handleWheel}
                onMouseDown={handleStageClick}
                onTouchStart={handleStageClick}
                style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
            >
                <Layer listening={false}>
                    <Rect x={0} y={0} width={scene.width} height={scene.height} fill={scene.background} />
                </Layer>
                <Layer>
                    {scene.elements.map(el => (
                        <ElementRenderer
                            key={el.id}
                            element={el}
                            onSelect={(e) => onElementSelect(el.id, e)}
                            onChange={(patch) => updateElement(el.id, patch)}
                        />
                    ))}
                    <Transformer
                        ref={trRef}
                        rotateEnabled
                        flipEnabled={false}
                        // 너무 작아지지 않게
                        boundBoxFunc={(oldBox, newBox) => {
                            if (newBox.width < 5 || newBox.height < 5) return oldBox;
                            return newBox;
                        }}
                    />
                </Layer>
            </Stage>

            {/* Zoom 표시 */}
            <div style={{
                position: 'fixed', bottom: 16, right: 16, padding: '6px 12px',
                background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: 12, borderRadius: 6,
                fontFamily: 'monospace',
            }}>
                {Math.round(scale * 100)}%
            </div>
        </div>
    );
}

function ElementRenderer({
    element, onSelect, onChange,
}: {
    element: DesignElement;
    onSelect: (e: Konva.KonvaEventObject<MouseEvent>) => void;
    onChange: (patch: Partial<DesignElement>) => void;
}) {
    if (!element.visible) return null;

    const commonProps = {
        id: element.id,
        x: element.x,
        y: element.y,
        rotation: element.rotation,
        opacity: element.opacity,
        draggable: !element.locked,
        listening: !element.locked,
        onClick: onSelect,
        onTap: onSelect,
        onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
            onChange({ x: e.target.x(), y: e.target.y() });
        },
        onTransformEnd: (e: Konva.KonvaEventObject<Event>) => {
            const node = e.target;
            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            node.scaleX(1);
            node.scaleY(1);
            // 타입별 사이즈 보정
            if (element.type === 'rect' || element.type === 'image' || element.type === 'text') {
                onChange({
                    x: node.x(),
                    y: node.y(),
                    rotation: node.rotation(),
                    width: Math.max(5, node.width() * scaleX),
                    height: 'height' in element ? Math.max(5, (element as any).height * scaleY) : undefined,
                } as any);
            } else if (element.type === 'circle') {
                onChange({
                    x: node.x(), y: node.y(), rotation: node.rotation(),
                    radius: Math.max(5, element.radius * Math.max(scaleX, scaleY)),
                });
            } else {
                onChange({ x: node.x(), y: node.y(), rotation: node.rotation() });
            }
        },
    } as const;

    switch (element.type) {
        case 'rect':
            return <Rect
                {...commonProps}
                width={element.width} height={element.height}
                fill={element.fill} stroke={element.stroke}
                strokeWidth={element.strokeWidth} cornerRadius={element.cornerRadius}
            />;
        case 'circle':
            return <Circle {...commonProps} radius={element.radius} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} />;
        case 'text':
            return <Text
                {...commonProps}
                text={element.text} fontSize={element.fontSize}
                fontFamily={element.fontFamily} fontStyle={element.fontStyle}
                fill={element.fill} width={element.width}
                align={element.align} letterSpacing={element.letterSpacing}
                lineHeight={element.lineHeight}
            />;
        case 'image':
            return <ImageRenderer element={element} commonProps={commonProps} />;
        case 'line':
            return <Line {...commonProps} points={element.points} stroke={element.stroke} strokeWidth={element.strokeWidth} lineCap="round" />;
    }
}

function ImageRenderer({ element, commonProps }: { element: ImageElement; commonProps: any }) {
    const [img] = useImage(element.src, 'anonymous');
    return <KonvaImage {...commonProps} image={img} width={element.width} height={element.height} />;
}
