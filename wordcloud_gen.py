import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from wordcloud import WordCloud
import matplotlib.font_manager as fm
import os
import json

# ── Find a Chinese-capable font ──────────────────────────────────
def find_cjk_font():
    candidates = []
    for f in fm.fontManager.ttflist:
        name_lower = f.name.lower()
        fname_lower = f.fname.lower()
        if any(k in name_lower + fname_lower for k in [
            'msyh', 'yahei', 'simhei', 'simsun', 'songti',
            'heiti', 'kaiti', 'fangsong', 'noto sans cjk',
            'wenquanyi', 'wenquan', 'source han', 'pingfang',
            'hiragino',
        ]):
            candidates.append(f)
    if candidates:
        return candidates[0].fname

    for p in [
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/simsun.ttc',
        'C:/Windows/Fonts/msyhbd.ttc',
    ]:
        if os.path.exists(p):
            return p
    return None

font_path = find_cjk_font()
print(f"Using font: {font_path}")

# ── Keyword dictionary ───────────────────────────────────────────
keywords = {
    # 情绪词 / 冲击力词汇
    "颠覆认知": 95,
    "警惕": 90,
    "快停下": 85,
    "震惊": 80,
    "千万别": 78,
    "后悔": 75,
    "真相": 72,
    "曝光": 70,
    "紧急提醒": 68,
    "致命": 65,
    "惊人": 62,
    "炸裂": 60,
    "刷屏": 58,
    "崩溃": 55,
    "必须知道": 52,

    # 数字 / 承诺类
    "4类": 50,
    "30%": 48,
    "80%的罪": 45,
    "3倍": 42,
    "100%": 40,
    "5个信号": 38,
    "7天": 35,
    "90%的人": 32,

    # 痛点关键词
    "副作用": 88,
    "防复发": 85,
    "饮食禁忌": 82,
    "最新药物": 78,
    "治疗方案": 75,
    "护理指南": 72,
    "生存率": 68,
    "靶向药": 65,
    "免疫治疗": 62,
    "化疗": 60,
    "疼痛管理": 55,
    "营养支持": 52,

    # 爆款模式词
    "颠覆性": 70,
    "解决方案": 65,
    "研究证实": 60,
    "最新研究": 58,
    "临床数据": 55,
    "专家建议": 52,
    "国际期刊": 48,
    "权威解读": 45,

    # 行动号召
    "收藏": 70,
    "转发": 68,
    "分享": 65,
    "关注": 60,
    "点赞": 55,
    "收藏备用": 50,
    "建议收藏": 48,

    # 账号 / 时间相关
    "原创": 85,
    "2月": 42,
    "3月": 40,
    "癌友指南": 75,
}

# ── Generate word cloud ──────────────────────────────────────────
wc = WordCloud(
    font_path=font_path,
    width=1200,
    height=800,
    background_color='white',
    mode='RGB',
    max_words=80,
    relative_scaling=0.5,
    min_font_size=14,
    max_font_size=160,
    collocations=False,
    color_func=lambda word=None, font_size=None, **kwargs: (
        (0xf7, 0x88, 0x4f)  # orange - high weight
        if font_size and font_size > 80
        else (
            (0x4f, 0x8e, 0xf7)  # blue - medium weight
            if font_size and font_size > 50
            else (0x36, 0xd9, 0xa4)  # green - lower weight
        )
    ),
    margin=10,
    contour_width=0,
    prefer_horizontal=0.7,
    scale=2,
    regexp=None,
).generate_from_frequencies(keywords)

# ── Save outputs ─────────────────────────────────────────────────
out_dir = os.path.dirname(os.path.abspath(__file__))
img_path = os.path.join(out_dir, 'wordcloud_output.png')
wc.to_file(img_path)
print(f"Word cloud saved to: {img_path}")

# Also save to public dir for the web app
pub_path = os.path.join(out_dir, 'data_visualization', 'public', 'wordcloud_output.png')
os.makedirs(os.path.dirname(pub_path), exist_ok=True)
wc.to_file(pub_path)
print(f"Word cloud saved to: {pub_path}")

# Also save keywords as JSON for potential web use
json_path = os.path.join(out_dir, 'data_visualization', 'public', 'keywords.json')
os.makedirs(os.path.dirname(json_path), exist_ok=True)
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump([{"name": k, "value": v} for k, v in keywords.items()], f, ensure_ascii=False)
print(f"Keywords JSON saved to: {json_path}")
