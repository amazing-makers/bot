'use client';

import { useState, useRef } from 'react';
import {
    Box,
    Button,
    Card,
    Group,
    Image,
    Loader,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    ThemeIcon,
    UnstyledButton,
    Alert,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
    IconUpload,
    IconPhoto,
    IconCheck,
    IconAlertCircle,
    IconDownload,
    IconX,
} from '@tabler/icons-react';

// 목업 타입 정의 (generate-mockup.ts 와 동기화)
const MOCKUP_TYPES = [
    { id: 'tshirt', label: '티셔츠', emoji: '👕' },
    { id: 'hoodie', label: '후드티', emoji: '🧥' },
    { id: 'mug', label: '머그컵', emoji: '☕' },
    { id: 'poster', label: '포스터', emoji: '🖼️' },
    { id: 'billboard', label: '빌보드', emoji: '📢' },
    { id: 'tote', label: '토트백', emoji: '👜' },
    { id: 'phone_case', label: '폰케이스', emoji: '📱' },
    { id: 'frame', label: '액자', emoji: '🎨' },
];

type Step = 'upload' | 'select' | 'generate' | 'result';

export function MockupCreator() {
    const [step, setStep] = useState<Step>('upload');
    const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
    const [productImageFile, setProductImageFile] = useState<File | null>(null);
    const [selectedType, setSelectedType] = useState<string | null>(null);
    const [customPrompt, setCustomPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [creditsUsed, setCreditsUsed] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 파일 선택 핸들러
    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('이미지 파일만 업로드할 수 있습니다.');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('파일 크기는 10MB 이하여야 합니다.');
            return;
        }
        setError(null);
        setProductImageFile(file);
        // 미리보기 URL 생성
        const previewUrl = URL.createObjectURL(file);
        setProductImageUrl(previewUrl);
        setStep('select');
    }

    // 이미지를 R2 에 업로드하고 URL 획득
    async function uploadProductImage(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || '이미지 업로드 실패');
        }

        const { url } = await res.json();
        return url;
    }

    // 목업 생성
    async function handleGenerate() {
        if (!productImageFile && !productImageUrl) {
            setError('상품 이미지를 먼저 업로드해주세요.');
            return;
        }
        if (!selectedType) {
            setError('목업 타입을 선택해주세요.');
            return;
        }

        setLoading(true);
        setError(null);
        setStep('generate');

        try {
            // 1. 상품 이미지 업로드 (로컬 파일인 경우)
            let finalProductUrl = productImageUrl!;
            if (productImageFile) {
                try {
                    finalProductUrl = await uploadProductImage(productImageFile);
                } catch {
                    // 업로드 API 없는 경우 object URL 사용 (개발 환경)
                    // production 에서는 /api/upload 가 필요합니다
                }
            }

            // 2. 목업 레코드 생성
            const createRes = await fetch('/api/mockups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productImageUrl: finalProductUrl,
                    mockupType: selectedType,
                    customPrompt: customPrompt || undefined,
                }),
            });

            if (!createRes.ok) {
                const err = await createRes.json().catch(() => ({}));
                throw new Error(err.error || '목업 생성 요청 실패');
            }

            const { mockup } = await createRes.json();

            // 3. FLUX Kontext 생성 트리거
            const genRes = await fetch(`/api/mockups/${mockup.id}/generate`, {
                method: 'POST',
            });

            if (!genRes.ok) {
                const err = await genRes.json().catch(() => ({}));
                if (genRes.status === 402) {
                    throw new Error(`크레딧이 부족합니다. ${err.error || ''}`);
                }
                throw new Error(err.error || '목업 생성 실패');
            }

            const data = await genRes.json();
            setResultUrl(data.mockup.outputUrl);
            setCreditsUsed(data.creditsUsed);
            setStep('result');

            notifications.show({
                title: '목업 생성 완료!',
                message: `${data.creditsUsed} 크레딧이 사용되었습니다.`,
                color: 'green',
                icon: <IconCheck size={16} />,
            });
        } catch (e: any) {
            setError(e?.message || '알 수 없는 오류가 발생했습니다.');
            setStep('select');
        } finally {
            setLoading(false);
        }
    }

    function handleReset() {
        setStep('upload');
        setProductImageUrl(null);
        setProductImageFile(null);
        setSelectedType(null);
        setCustomPrompt('');
        setError(null);
        setResultUrl(null);
        setCreditsUsed(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }

    return (
        <Card withBorder radius="md" p="lg">
            <Stack gap="lg">
                {/* Step 1: 이미지 업로드 */}
                {(step === 'upload' || step === 'select' || step === 'generate') && (
                    <Stack gap="sm">
                        <Text size="sm" fw={600} c="dimmed">
                            STEP 1. 상품 이미지
                        </Text>

                        {!productImageUrl ? (
                            <Box
                                onClick={() => fileInputRef.current?.click()}
                                style={{
                                    border: '2px dashed var(--mantine-color-default-border)',
                                    borderRadius: 'var(--mantine-radius-md)',
                                    padding: '2rem',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'border-color 0.2s',
                                }}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--mantine-color-violet-5)';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--mantine-color-default-border)';
                                }}
                            >
                                <Stack align="center" gap="sm">
                                    <ThemeIcon size={48} variant="light" color="violet" radius="xl">
                                        <IconUpload size={24} />
                                    </ThemeIcon>
                                    <Stack align="center" gap={4}>
                                        <Text fw={600}>클릭하여 이미지 업로드</Text>
                                        <Text size="xs" c="dimmed">PNG, JPG, WEBP · 최대 10MB</Text>
                                    </Stack>
                                </Stack>
                            </Box>
                        ) : (
                            <Box style={{ position: 'relative' }}>
                                <Image
                                    src={productImageUrl}
                                    alt="상품 이미지"
                                    radius="md"
                                    style={{ maxHeight: 200, objectFit: 'contain', background: 'var(--mantine-color-default-hover)' }}
                                />
                                <Button
                                    size="xs"
                                    variant="filled"
                                    color="red"
                                    radius="xl"
                                    style={{ position: 'absolute', top: 8, right: 8 }}
                                    onClick={handleReset}
                                    leftSection={<IconX size={12} />}
                                >
                                    제거
                                </Button>
                            </Box>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={handleFileChange}
                        />
                    </Stack>
                )}

                {/* Step 2: 목업 타입 선택 */}
                {(step === 'select' || step === 'generate') && (
                    <Stack gap="sm">
                        <Text size="sm" fw={600} c="dimmed">
                            STEP 2. 목업 타입 선택
                        </Text>
                        <SimpleGrid cols={4} spacing="xs">
                            {MOCKUP_TYPES.map((t) => (
                                <UnstyledButton
                                    key={t.id}
                                    onClick={() => setSelectedType(t.id)}
                                    style={{
                                        border: `2px solid ${selectedType === t.id ? 'var(--mantine-color-violet-5)' : 'var(--mantine-color-default-border)'}`,
                                        borderRadius: 'var(--mantine-radius-md)',
                                        padding: '0.5rem',
                                        textAlign: 'center',
                                        background: selectedType === t.id ? 'var(--mantine-color-violet-0)' : 'transparent',
                                        transition: 'all 0.15s',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <Stack gap={2} align="center">
                                        <Text size="xl">{t.emoji}</Text>
                                        <Text size="xs" fw={selectedType === t.id ? 700 : 400}>
                                            {t.label}
                                        </Text>
                                    </Stack>
                                </UnstyledButton>
                            ))}
                        </SimpleGrid>
                    </Stack>
                )}

                {/* Step 3: 커스텀 프롬프트 (옵션) */}
                {(step === 'select' || step === 'generate') && (
                    <Stack gap="sm">
                        <Text size="sm" fw={600} c="dimmed">
                            STEP 3. 추가 설명 (선택)
                        </Text>
                        <Textarea
                            placeholder="예: 밝고 화사한 분위기, 봄 느낌, 흰색 배경 등..."
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.currentTarget.value)}
                            rows={2}
                            maxLength={200}
                        />
                        <Text size="xs" c="dimmed" ta="right">{customPrompt.length}/200</Text>
                    </Stack>
                )}

                {/* 에러 */}
                {error && (
                    <Alert
                        icon={<IconAlertCircle size={16} />}
                        color="red"
                        variant="light"
                        title="오류"
                        withCloseButton
                        onClose={() => setError(null)}
                    >
                        {error}
                    </Alert>
                )}

                {/* 생성중 */}
                {step === 'generate' && loading && (
                    <Stack align="center" gap="md" py="md">
                        <Loader size="lg" color="violet" />
                        <Stack align="center" gap={4}>
                            <Text fw={600}>FLUX Kontext가 목업을 생성하고 있습니다...</Text>
                            <Text size="sm" c="dimmed">보통 15~30초 정도 걸립니다.</Text>
                        </Stack>
                    </Stack>
                )}

                {/* 생성 버튼 */}
                {step === 'select' && (
                    <Button
                        fullWidth
                        size="md"
                        color="violet"
                        disabled={!productImageUrl || !selectedType}
                        onClick={handleGenerate}
                        loading={loading}
                    >
                        목업 생성하기 (30 크레딧)
                    </Button>
                )}

                {/* 결과 */}
                {step === 'result' && resultUrl && (
                    <Stack gap="md">
                        <Text size="sm" fw={600} c="dimmed">생성 결과</Text>
                        <Image
                            src={resultUrl}
                            alt="생성된 목업"
                            radius="md"
                            style={{ maxHeight: 400, objectFit: 'contain', background: 'var(--mantine-color-default-hover)' }}
                        />
                        {creditsUsed !== null && (
                            <Text size="xs" c="dimmed" ta="center">
                                {creditsUsed === 0 ? 'BYOK — 크레딧 무료 사용' : `${creditsUsed} 크레딧 사용`}
                            </Text>
                        )}
                        <Group gap="sm">
                            <Button
                                component="a"
                                href={resultUrl}
                                download="mockup.png"
                                flex={1}
                                variant="filled"
                                color="violet"
                                leftSection={<IconDownload size={16} />}
                            >
                                다운로드
                            </Button>
                            <Button
                                flex={1}
                                variant="outline"
                                onClick={handleReset}
                                leftSection={<IconPhoto size={16} />}
                            >
                                새 목업 만들기
                            </Button>
                        </Group>
                    </Stack>
                )}
            </Stack>
        </Card>
    );
}
