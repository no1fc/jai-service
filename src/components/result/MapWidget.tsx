'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { Map as MapIcon, Loader2, MapPinOff } from 'lucide-react';
import { Branch } from '@/types/db';
import { logger } from '@/lib/logger';

declare global {
    interface Window {
        kakao: any;
    }
}

interface MapWidgetProps {
    branch: Branch | null;
}

export default function MapWidget({ branch }: MapWidgetProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [apiKeys, setApiKeys] = useState<string[]>([]);
    const [keyIndex, setKeyIndex] = useState<number>(0);

    // KAKAO API KEY: DB/서버에서 관리하는 통합 예비 키 배열 호출
    useEffect(() => {
        const fetchApiKey = async () => {
            try {
                const res = await fetch('/api/public/kakao-key');
                const data = await res.json();

                if (data.success && data.apiKeys) {
                    setApiKeys(data.apiKeys);
                } else if (data.success && data.apiKey) {
                    setApiKeys([data.apiKey]);
                }
            } catch (e) {
                logger.error("Failed to fetch Kakao Map API keys:", e);
            }
        };
        fetchApiKey();
    }, []);

    const activeApiKeys = apiKeys.length > 0 ? apiKeys : (process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY ? [process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY] : []);
    const apiKey = activeApiKeys[keyIndex] || null;

    // 1) 이미 로드되어 있는 경우를 대비한 체크
    useEffect(() => {
        if (window.kakao && window.kakao.maps) {
            setIsMapLoaded(true);
        }
    }, [apiKey]);

    useEffect(() => {
        if (!branch || !isMapLoaded || !window.kakao || !window.kakao.maps) return;

        window.kakao.maps.load(() => {
            if (!mapRef.current) return;

            const renderMap = (coords: any) => {
                // 결과값으로 받은 위치를 마커로 표시합니다
                const mapOption = {
                    center: coords,
                    level: 3 // 지도의 확대 레벨
                };

                // 지도를 생성합니다
                const map = new window.kakao.maps.Map(mapRef.current, mapOption);

                // 마커를 생성합니다
                const marker = new window.kakao.maps.Marker({
                    map: map,
                    position: coords
                });

                // 인포윈도우로 장소에 대한 설명을 표시합니다
                const infowindow = new window.kakao.maps.InfoWindow({
                    content: `<div style="padding:10px;font-size:12px;color:#333;text-align:center;border-radius:4px;font-weight:bold;">${branch.branch_name}</div>`
                });
                infowindow.open(map, marker);

                // 지도의 중심을 결과값으로 받은 위치로 이동시킵니다
                map.setCenter(coords);
                setError(null);
            };

            // DB에 등록된 위도/경도가 있다면 우선적으로 사용
            if (branch.latitude && branch.longitude) {
                const coords = new window.kakao.maps.LatLng(branch.latitude, branch.longitude);
                renderMap(coords);
                return;
            }

            const geocoder = new window.kakao.maps.services.Geocoder();

            // 주소로 좌표를 검색합니다
            geocoder.addressSearch(branch.address, function (result: any, status: any) {
                // 정상적으로 검색이 완료됐으면
                if (status === window.kakao.maps.services.Status.OK) {
                    const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
                    renderMap(coords);
                } else {
                    setError('해당 지점의 좌표를 찾을 수 없습니다.');
                }
            });
        });

    }, [apiKey, branch, isMapLoaded]);

    if (!branch) {
        return (
            <div className="w-full h-full min-h-[300px] animate-reveal-up flex-1">
                <div className="bg-bg-elevated rounded-[var(--radius-card)] p-8 border border-border relative overflow-hidden h-full flex flex-col items-center justify-center text-center group">
                    <div className="w-16 h-16 rounded-[var(--radius-card)] bg-bg flex items-center justify-center mb-6 border border-border group-hover:bg-bg-elevated transition-colors">
                        <MapIcon size={28} className="text-text-muted group-hover:text-accent transition-colors" />
                    </div>
                    <h3 className="text-text-secondary font-bold text-lg mb-2">지도가 표시될 공간입니다</h3>
                    <p className="text-text-muted text-sm leading-relaxed max-w-[80%] mx-auto">
                        선택하신 지역에 관련된 지점이 없습니다.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full animate-reveal-up flex-1 flex flex-col relative">
            {apiKey && (
                <Script
                    strategy="afterInteractive"
                    src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&libraries=services&autoload=false`}
                    onLoad={() => setIsMapLoaded(true)}
                    onReady={() => setIsMapLoaded(true)}
                    onError={() => {
                        if (activeApiKeys.length > 0 && keyIndex < activeApiKeys.length - 1) {
                            logger.warn(`[Map Widget] Kakao Map API key ${keyIndex + 1} failed. Retrying with next key...`);
                            setKeyIndex(idx => idx + 1);
                        } else {
                            setError('카카오맵을 불러오는데 실패했습니다. 예비 키가 소진되었거나 도메인 제약을 확인해주세요.');
                        }
                    }}
                />
            )}

            <div className="w-full h-full relative overflow-hidden flex">
                {/* 지도가 담길 컨테이너 */}
                <div className="w-full h-full overflow-hidden relative" ref={mapRef}>
                    {/* 로딩 표시 */}
                    {!isMapLoaded && !error && apiKey && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg z-10">
                            <Loader2 size={32} className="text-accent animate-spin mb-4" />
                            <p className="text-text-secondary text-sm font-bold">카카오 지도를 불러오는 중입니다</p>
                        </div>
                    )}

                    {/* API 키 없음 */}
                    {!apiKey && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center border border-border bg-bg z-10 px-8 text-center">
                            <MapPinOff size={40} className="text-text-muted mb-4" />
                            <p className="text-text-secondary font-bold mb-2">지도를 표시할 수 없습니다</p>
                            <p className="text-text-muted text-xs">API 키가 등록되지 않았습니다.</p>
                        </div>
                    )}

                    {/* 에러 발생 (스크립트 에러 혹은 검색 실패) */}
                    {error && apiKey && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center border border-danger/10 bg-bg z-10 px-8 text-center">
                            <MapPinOff size={40} className="text-danger mb-4 opacity-50" />
                            <p className="text-danger font-bold text-sm mb-2">지도 로드 에러</p>
                            <p className="text-danger/50 text-xs">{error}</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
