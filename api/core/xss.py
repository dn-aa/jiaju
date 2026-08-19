"""富文本 XSS 过滤：bleach 白名单清洗（落库前对 article.body / page.content / case 说明等调用）。"""
import bleach

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
ALLOWED_STYLES = ["text-align", "color", "background-color", "font-weight", "font-style", "font-size"]


def sanitize_html(html: str | None) -> str | None:
    if html is None:
        return None
    return bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        styles=ALLOWED_STYLES,
        strip=True,
    )
