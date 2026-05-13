import { redirect, notFound } from 'next/navigation';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import EditorShell from '@/components/editor/EditorShell';
import type { Scene } from '@/lib/design/types';

export const dynamic = 'force-dynamic';

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await auth();
    const userId = (session?.user as any)?.id;
    if (!userId) redirect('/login');

    const { id } = await params;
    const design = await (prisma as any).design.findFirst({ where: { id, userId } });
    if (!design) notFound();

    const sceneJson = (design.sceneJson as any) || {};
    const initialScene: Scene = {
        width: sceneJson.width || design.canvasWidth || 1080,
        height: sceneJson.height || design.canvasHeight || 1080,
        background: sceneJson.background || '#ffffff',
        elements: Array.isArray(sceneJson.elements) ? sceneJson.elements : [],
    };

    return (
        <EditorShell
            designId={design.id}
            initialTitle={design.title}
            initialScene={initialScene}
        />
    );
}
