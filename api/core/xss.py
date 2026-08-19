"""富文本 XSS 过滤：bleach 白名单清洗（落库前对 article.body / page.content / case 说明等调用）。
bleach 6 兼容：styles 参数已移除，改用 CSSSanitizer 处理 style 属性。"""
import bleach
from bleach.css_sanitizer import CSSSanitizer

ALLOWED_TAGS = [
    "p", "br", "strong", "b", "em", "i", "u", "s", "span", "div", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "hr",
    "a", "img", "table", "thead", "tbody", "tr", "th", "td",
]
ALLOWED_ATTRS = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "span": ["style"],
    "p": ["style"],
    "div": ["style"],
    "td": ["colspan", "rowspan"],
    "th": ["colspan", "rowspan"],
}
# 允许的内联 CSS 属性（对齐 UI/UX 常用样式；其余 style 一律剥离）
ALLOWED_STYLES = ["text-align", "color", "background-color", "font-weight", "font-style", "font-size"]

# bleach 6：CSS 消毒器（替代已移除的 styles 参数）
_CSS_SANITIZER = CSSSanitizer(allowed_css_properties=ALLOWED_STYLES)


def sanitize_html(html: str | None) -> str | None:
    """XSS 白名单清洗：标签/属性/内联样式三重过滤，危险内容剥离（strip=True）。"""
    if html is None:
        return None
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        css_sanitizer=_CSS_SANITIZER,
        strip=True,
    )
