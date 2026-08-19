"""图形验证码：Pillow 生成（深墨渐变底 + 金色粗体 4 位：2 字母 + 2 数字），答案存 Redis（60s TTL）。"""
import io
import random
import string

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 120, 44


def _font(size: int) -> ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/msyhbd.ttc",
        "C:/Windows/Fonts/msyh.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ]
    for c in candidates:
        try:
            return ImageFont.truetype(c, size)
        except OSError:
            continue
    return ImageFont.load_default()


def gen_captcha_text() -> str:
    letters = random.sample(string.ascii_uppercase, 2)
    digits = random.sample(string.digits, 2)
    chars = letters + digits
    random.shuffle(chars)
    return "".join(chars)


def render_captcha(text: str) -> bytes:
    img = Image.new("RGB", (W, H), "#1C1917")
    draw = ImageDraw.Draw(img)

    # 金辉光晕
    for i in range(60):
        x, y = random.randint(0, W), random.randint(0, H)
        r = random.randint(1, 4)
        draw.ellipse([x, y, x + r, y + r], fill="#97763F")

    font = _font(28)
    for i, ch in enumerate(text):
        x = 12 + i * 26 + random.randint(-3, 3)
        y = random.randint(4, 12)
        draw.text((x, y), ch, font=font, fill="#B0894F")

    # 噪点与干扰线
    for _ in range(120):
        x, y = random.randint(0, W), random.randint(0, H)
        draw.point((x, y), fill="#FAFAF9")
    for _ in range(3):
        draw.line(
            [(random.randint(0, W), random.randint(0, H)), (random.randint(0, W), random.randint(0, H))],
            fill="#44403C", width=1,
        )

    img = img.filter(ImageFilter.SMOOTH)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
