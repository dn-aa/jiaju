// ============================================================
// 【代码段功能】百度地图组件（阶段 7 合规地图接入）
//   - AK 从构建环境变量 VITE_BAIDU_MAP_AK 注入（web/.env 配置）
//   - 坐标从后台配置 map_coord 读取，格式 "经度,纬度"（如 113.30,23.12）
//   - AK 或坐标缺失时优雅降级为占位图（不阻塞页面）
//   - 动态加载 JS API v3.0（callback 方式，避免脚本异步竞态）
// ============================================================
import { useEffect, useRef, useState } from 'react';
import { colors, radius } from '../theme/design-tokens';

interface Props {
  /** 后台配置的坐标，格式 "经度,纬度" */
  coord?: string;
  /** 门店地址（标注点击弹出信息窗） */
  address?: string;
  /** 缩放级别（默认 15 街道级） */
  zoom?: number;
}

export default function BaiduMap({ coord, address, zoom = 15 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  // AK 注入：构建时 web/.env 设置 VITE_BAIDU_MAP_AK=xxx（百度地图开放平台申请）
  const ak = import.meta.env.VITE_BAIDU_MAP_AK as string | undefined;

  useEffect(() => {
    // AK 或坐标缺失 → 占位（上线前未配置 AK 不报错）
    if (!ak || !coord) {
      setStatus('missing');
      return;
    }
    const parts = coord.split(',').map((s) => Number(s.trim()));
    const lng = parts[0];
    const lat = parts[1];
    if (!isFinite(lng) || !isFinite(lat)) {
      setStatus('missing');
      return;
    }

    let cancelled = false;
    let map: any = null;

    const init = () => {
      const BMap: any = (window as any).BMap;
      if (!BMap || !ref.current || cancelled) return;
      const point = new BMap.Point(lng, lat);
      map = new BMap.Map(ref.current);
      map.centerAndZoom(point, zoom);
      map.enableScrollWheelZoom(true);   // 滚轮缩放
      const marker = new BMap.Marker(point);
      map.addOverlay(marker);
      if (address) {
        const info = new BMap.InfoWindow(`<div style="padding:6px 12px;font-size:13px;line-height:1.6">${address}</div>`);
        marker.addEventListener('click', () => map.openInfoWindow(info, point));
      }
      if (!cancelled) setStatus('ready');
    };

    // 已加载过则直接初始化；否则动态注入 script（callback 保证 BMap 就绪后执行）
    if ((window as any).BMap) {
      init();
    } else {
      const cbName = `__bmap_init_${Date.now()}`;
      (window as any)[cbName] = () => {
        init();
        delete (window as any)[cbName];
      };
      const s = document.createElement('script');
      s.src = `https://api.map.baidu.com/api?v=3.0&ak=${encodeURIComponent(ak)}&callback=${cbName}`;
      s.async = true;
      s.onerror = () => {
        if (!cancelled) setStatus('missing');
        delete (window as any)[cbName];
      };
      document.body.appendChild(s);
      return () => {
        cancelled = true;
        document.body.removeChild(s);
      };
    }

    return () => {
      cancelled = true;
      if (map) map.destroy();   // 卸载清理地图实例
    };
  }, [coord, address, zoom, ak]);

  // 未配置 AK / 坐标 → 占位图（与原占位一致）
  if (status === 'missing') {
    return (
      <div style={{ height: 240, borderRadius: radius.lg, background: colors.soft, border: `1px solid ${colors.line}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.muted, fontSize: 13 }}>
        📍 地图占位（{coord || '坐标待配置'}）<br />
        上线前接入百度地图 JS API（需百度地图开放平台 AK）
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height: 240, borderRadius: radius.lg, overflow: 'hidden', border: `1px solid ${colors.line}`, position: 'relative', background: '#E8E4DE' }} />
  );
}
