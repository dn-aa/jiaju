// ============================================================
// 【代码段功能】产品中心（FR-1.2）
//   分类/关键字筛选 + 列表网格（上架产品，置顶优先）+ 分页
// ============================================================
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { colors, fonts, maxWidth, radius, shadow } from '../../theme/design-tokens';
import { getCategories, getProducts, type Category, type ProductBrief } from '../../services/public';
import Pagination from '../../components/Pagination';

const PAGE_SIZE = 9;

export default function Products() {
  const [params, setParams] = useSearchParams();
  const categoryId = Number(params.get('category') || 0) || undefined;
  const keyword = params.get('kw') || '';
  const [page, setPage] = useState(1);
  const [cats, setCats] = useState<Category[]>([]);
  const [data, setData] = useState<{ list: ProductBrief[]; total: number }>({ list: [], total: 0 });

  useEffect(() => {
    getCategories().then(setCats).catch(() => undefined);
  }, []);

  useEffect(() => {
    getProducts({ category_id: categoryId, keyword: keyword || undefined, page })
      .then((d) => setData({ list: d.list, total: d.pagination.total }))
      .catch(() => undefined);
  }, [categoryId, keyword, page]);

  // 更新 URL 筛选参数（分类/关键字）
  const setFilter = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
    setPage(1);
  };

  return (
    <div style={{ fontFamily: fonts.body }}>
      {/* 页头：墨底 + 金色标题 */}
      <div style={{ background: colors.ink, color: '#FAFAF9', padding: '64px 24px', textAlign: 'center' }}>
        <div style={{ color: colors.gold, letterSpacing: '.28em', fontSize: 12 }}>PRODUCTS</div>
        <h1 style={{ fontFamily: fonts.display, fontSize: 40, margin: '10px 0 0', fontWeight: 600 }}>产品中心</h1>
      </div>

      <div style={{ maxWidth, margin: '0 auto', padding: '32px 24px 64px' }}>
        {/* 筛选栏：分类标签 + 关键字搜索 */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 28 }}>
          <button onClick={() => setFilter({ category: '' })}
            style={{ padding: '7px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
              background: !categoryId ? colors.gold : colors.soft, color: !categoryId ? '#fff' : colors.ink }}>
            全部
          </button>
          {cats.map((c) => (
            <button key={c.id} onClick={() => setFilter({ category: String(c.id) })}
              style={{ padding: '7px 18px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 13,
                background: categoryId === c.id ? colors.gold : colors.soft, color: categoryId === c.id ? '#fff' : colors.ink }}>
              {c.name}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <input placeholder="搜索产品名称/系列" defaultValue={keyword} onKeyDown={(e) => {
            if (e.key === 'Enter') setFilter({ kw: (e.target as HTMLInputElement).value });
          }} style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${colors.line}`, fontSize: 13, width: 200 }} />
        </div>

        {/* 产品网格 */}
        {data.list.length === 0 ? (
          <div style={{ textAlign: 'center', color: colors.muted, padding: '80px 0' }}>暂无产品，敬请期待</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: 20 }}>
            {data.list.map((p) => (
              <Link key={p.id} to={`/products/${p.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{ background: colors.surface, borderRadius: radius.md, overflow: 'hidden', boxShadow: shadow.sm, transition: 'all .25s' }}>
                  <div style={{ height: 210, background: colors.soft }}>
                    {p.cover_image ? <img src={p.cover_image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d6d3d1', fontSize: 13 }}>暂无图片</div>}
                  </div>
                  <div style={{ padding: 14 }}>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{p.name}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: colors.muted, fontSize: 12, marginTop: 6 }}>
                      <span>{p.series}</span><span>{p.product_code}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 分页器：有数据时始终显示（含上一页/下一页/共 X 页） */}
        <Pagination current={page} total={data.total} pageSize={PAGE_SIZE} onChange={setPage} />
      </div>
    </div>
  );
}
