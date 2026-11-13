import { NextRequest, NextResponse } from 'next/server';
import { getAllSettings, getSetting, updateSetting } from '@/lib/db';
import { getPromptCategories } from '@/lib/prompts';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * GET: 모든 시스템 설정 조회
 * (보안을 위해 API 키 등 민감 정보는 일부 마스킹 처리하여 반환)
 */
export async function GET() {
    try {
        const { requireRole } = await import('@/lib/auth');
        const authResult = await requireRole('admin');
        if (authResult instanceof Response) return authResult;

        const settings = await getAllSettings();
        const promptCategories = await getPromptCategories();

        // DB에 저장되지 않은 설정들(Default 값)을 클라이언트에 제공
        const { DEFAULT_INTRO_MESSAGE, DEFAULT_INFO_MESSAGE } = await import('@/lib/prompts');
        const { DEFAULT_QNA_KNOWLEDGE } = await import('@/lib/qna/knowledge');

        for (const cat of promptCategories) {
            if (!settings[cat.key] || settings[cat.key].trim() === '') {
                if (cat.key === 'intro_message') settings[cat.key] = JSON.stringify(DEFAULT_INTRO_MESSAGE);
                else if (cat.key === 'info_message') settings[cat.key] = JSON.stringify(DEFAULT_INFO_MESSAGE);
                else if (cat.key === 'qna_knowledge') settings[cat.key] = DEFAULT_QNA_KNOWLEDGE;
            }
        }

        // 단일 API 키 및 다중 배열 API 키 마스킹 범용 로직
        const maskIfNeeded = (val: string) => {
            if (val.length > 8) {
                return `${val.slice(0, 4)}••••••••••${val.slice(-4)}`;
            }
            return '••••';
        };

        const maskArrayOrString = (val: string) => {
            try {
                // 배열 형태의 JSON 문자열인 경우
                if (val.startsWith('[')) {
                    const arr = JSON.parse(val);
                    if (Array.isArray(arr)) {
                        return JSON.stringify(arr.map(k => maskIfNeeded(k)));
                    }
                }
            } catch (e) {
                // 파싱 실패시 기본 마스킹 로직으로 진행
            }
            return maskIfNeeded(val);
        };

        const targetApiKeys = ['gemini_api_key', 'kakao_map_api_key', 'gemini_api_keys', 'kakao_map_api_keys'];

        targetApiKeys.forEach(tKey => {
            if (settings[tKey]) {
                const originalValue = settings[tKey];
                settings[`${tKey}_masked`] = maskArrayOrString(originalValue);
                // 클라이언트에 원본 키 노출 방지
                settings[tKey] = '';
            }
        });

        return NextResponse.json({ success: true, settings, promptCategories });
    } catch {
        return apiError('설정 정보를 불러오는데 실패했습니다.');
    }
}

/**
 * PUT: 시스템 설정 업데이트
 */
export async function PUT(req: NextRequest) {
    try {
        const { requireRole } = await import('@/lib/auth');
        const authResult = await requireRole('superadmin');
        if (authResult instanceof Response) return authResult;

        const { updateSettingSchema, formatZodError } = await import('@/lib/validations');
        const rawData = await req.json();
        const parsed = updateSettingSchema.safeParse(rawData);
        if (!parsed.success) {
            return apiError(formatZodError(parsed.error), 400);
        }
        const data = parsed.data;

        // 다중 키 배열 액션 처리
        if (data.action) {
            const currentVal = await getSetting(data.key) || "[]";
            let arr: string[] = [];
            try {
                arr = JSON.parse(currentVal);
                if (!Array.isArray(arr)) arr = [];
            } catch {
                arr = [];
            }

            if (data.action === 'add' && data.value) {
                if (!arr.includes(data.value)) {
                    arr.push(data.value);
                }
            } else if (data.action === 'delete' && typeof data.index === 'number') {
                if (data.index >= 0 && data.index < arr.length) {
                    arr.splice(data.index, 1);
                }
            }

            const result = await updateSetting(data.key, JSON.stringify(arr));
            if (result) {
                return apiSuccess(null, 'API 설정이 업데이트되었습니다.');
            }
            return apiError('업데이트 중 오류가 발생했습니다.');
        }

        // 일반 단일 키 업데이트
        if (typeof data.value === 'string') {
            const result = await updateSetting(data.key, data.value);
            if (result) {
                return apiSuccess(null, '설정이 업데이트되었습니다.');
            }
            return apiError('업데이트 중 오류가 발생했습니다.');
        }

        return apiError('잘못된 요청 파라미터입니다.', 400);
    } catch {
        return apiError('서버 내부 오류가 발생했습니다.');
    }
}
