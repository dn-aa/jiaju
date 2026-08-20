# -*- coding: utf-8 -*-
"""【代码段功能】生成「关于我们」三标签页（pages.key ∈ about/history/brand）富文本内容并幂等 upsert。
依赖：复用项目 db.session.SessionLocal 与 models.content.Page。
运行：cd api && ../.venv/Scripts/python.exe _seed_about.py
说明：已存在则更新标题/正文，不存在则插入；is_activate 默认 1（前台可见）。
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from db.session import SessionLocal
from models.content import Page

# ---------------- about：关于 TP（已存在，保留以便一键重建） ----------------
ABOUT_TITLE = "关于 TP · 全屋家居定制专家"
ABOUT_HTML = """<p>TP 全屋家居成立于 2013 年，是一家专注于整体家居定制与空间整体解决方案的品牌。我们以「让每一个家都恰到好处」为使命，提供从设计、生产到安装落地的一站式全屋定制服务，覆盖客厅、卧室、书房、餐厅、玄关及全屋收纳等全场景。</p>

<h3>品牌定位</h3>
<p>我们不做千篇一律的成品家具，而是以「人」为中心，围绕真实生活方式重构空间。TP 全屋家居聚焦中高端改善型住宅与精装房改造，用模块化定制能力把有限的面积，变成刚刚好的从容。</p>

<h3>核心价值观</h3>
<ul>
  <li><b>以用户为中心</b>：先理解生活习惯，再谈风格与材质。</li>
  <li><b>长期主义</b>：用环保板材与可靠五金，做能用十年的家。</li>
  <li><b>透明交付</b>：预算、周期、增项全程透明，拒绝隐性消费。</li>
  <li><b>设计驱动</b>：自有设计团队，平均从业经验 8 年以上。</li>
</ul>

<h3>我们的优势</h3>
<p>依托数字化设计系统与柔性生产线，TP 实现「所见即所得」：前端 3D 全屋效果图，后端拆单到毫米级生产。全国 200 余座城市服务网络，提供免费上门量房、方案定制与五年质保，让定制省心、落地安心。</p>

<h3>服务理念</h3>
<p>从一次上门量房开始，到一次满意的交付结束。我们相信，好的家居不是堆叠材料，而是把日子过顺——这正是 TP 全屋家居持续努力的方向。</p>

<blockquote>让每一个家，都恰到好处。</blockquote>"""

# ---------------- history：发展历程（时间线） ----------------
HISTORY_TITLE = "发展历程 · 从一间工作室到 200 城定制网络"
HISTORY_HTML = """<p>十三年间，TP 全屋家居从一间设计工作室，成长为覆盖全国 200 余座城市的一站式全屋定制品牌。以下是我们的关键里程碑：</p>

<ul>
  <li><b>2013 · 品牌创立</b>：TP 全屋家居于杭州成立，确立「以人为中心」的整体定制路线。</li>
  <li><b>2015 · 自有智造</b>：投产首条柔性定制生产线，打通从设计到拆单制造的全链路。</li>
  <li><b>2017 · 数字设计</b>：自研 3D 云设计平台上线，实现「所见即所得」的全屋效果图。</li>
  <li><b>2019 · 全国布局</b>：服务网络突破 100 城，推出免费上门量房与方案定制。</li>
  <li><b>2021 · 环保升级</b>：全线板材升级至 ENF 级环保标准，把健康放在第一位。</li>
  <li><b>2023 · 十年里程碑</b>：覆盖 200+ 城市，正式推出五年质保服务体系。</li>
  <li><b>2025 · 整家定制</b>：发布「整家定制」一站式解决方案，从单品走向全屋。</li>
</ul>

<blockquote>十三年，只做一件事：让每一个家，都恰到好处。</blockquote>"""

# ---------------- brand：品牌介绍 ----------------
BRAND_TITLE = "品牌介绍 · 设计驱动的整家定制"
BRAND_HTML = """<h3>品牌故事</h3>
<p>TP 全屋家居始于一群对「家」有执念的设计师。我们见过太多被成品家具将就的生活，也相信空间应该服务于真实的人。于是我们从一间工作室出发，把「整体定制」作为回答。</p>

<h3>设计理念</h3>
<p>我们坚持「先生活、后风格」：在谈材质与配色之前，先理解你的动线、收纳与习惯。好的定制不是把柜子做满，而是让空间留出从容。</p>

<h3>产品体系</h3>
<ul>
  <li><b>橱柜系统</b>：高低台、隐藏拉篮、嵌入式电器，厨房也能井井有条。</li>
  <li><b>衣柜系统</b>：到顶收纳、裤架、首饰格，把每一寸竖向空间用足。</li>
  <li><b>木门与护墙</b>：同色同工艺，让全屋风格统一连贯。</li>
  <li><b>整家套餐</b>：橱柜+衣柜+木门+软装的一站式组合，省心落地。</li>
</ul>

<h3>品质标准</h3>
<p>环保上，全线采用 ENF 级板材；五金上，优选进口阻尼与导轨；工艺上，毫米级拆单与上门安装验收。我们用长期主义，做能用十年的家。</p>

<blockquote>设计驱动，长期主义，透明交付。</blockquote>"""

# 三标签页内容集合
PAGES = {
    "about": (ABOUT_TITLE, ABOUT_HTML),
    "history": (HISTORY_TITLE, HISTORY_HTML),
    "brand": (BRAND_TITLE, BRAND_HTML),
}


def main():
    db = SessionLocal()
    try:
        for key, (title, html) in PAGES.items():
            page = db.query(Page).filter(Page.key == key).first()
            if page is None:
                page = Page(key=key, title=title, content=html, is_activate=1)
                db.add(page)
                print("inserted '%s' page" % key)
            else:
                page.title = title
                page.content = html
                print("updated '%s' page (id=%s)" % (key, page.id))
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    main()
