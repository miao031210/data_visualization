"""
离线为三份公众号文章 JSON 文件打标签。
读取 public/datas/*.json，逐批调用 DeepSeek API，将 tags 写回 JSON 文件。
支持断点续跑：已有 tags 字段的文章会跳过。
"""
import json
import os
import sys
import time
import httpx

# ---- 配置 ----
API_URL = "https://chat001.medlive.cn/api/v1/chat/completions"
API_KEY = "sk_1saR+WAyzbCQAmU7ooEM3mkrQ0ZIV3Qydi84WG91YitXTGYvajRYOEZZUVBrbzZZV2xwN0FsOENFMUk9"
MODEL_NAME = "DeepSeek-V3.2-251201"

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "datas")
FILES = ["articles_greenlore.json", "articles_xy.json", "articles_yyck.json"]
BATCH_SIZE = 10
CONTENT_MAX_CHARS = 1500

TAG_CATEGORIES = [
    "肺癌", "乳腺癌", "胃癌", "肝癌", "结直肠癌", "食管癌",
    "甲状腺癌", "前列腺癌", "宫颈癌", "卵巢癌", "白血病", "淋巴瘤",
    "糖尿病", "高血压", "高血脂", "冠心病", "脑卒中",
    "减重/肥胖", "痛风", "骨质疏松", "慢性肾病", "COPD", "哮喘",
    "抑郁症", "焦虑症", "阿尔茨海默", "帕金森",
    "免疫治疗", "靶向治疗", "化疗", "放疗",
    "临床试验", "新药资讯", "指南共识", "病例分享", "医学科普", "患者故事",
    "饮食营养", "运动康复", "心理健康", "睡眠健康",
]


def build_tag_prompt(articles):
    articles_text = []
    for a in articles:
        aid = a.get("id", "")
        title = a.get("title", "")
        content = (a.get("content_text", "") or "")[:CONTENT_MAX_CHARS]
        articles_text.append(
            f'<article id="{aid}">\n<title>{title}</title>\n<content>{content}</content>\n</article>'
        )
    return f"""你是一位医学内容分类专家。请为以下每篇文章打上1-3个病种/主题标签。

## 预定义标签列表（优先从中选择）
{'、'.join(TAG_CATEGORIES)}

## 待打标文章
{chr(10).join(articles_text)}

## 要求
1. 仔细分析每篇文章的标题和正文内容
2. **优先**从预定义标签列表中选择最贴切的1-3个标签
3. **如果预定义标签无法覆盖文章的核心主题，可以自行补充新的标签**（用词简洁准确，2-6个字）
4. 如果文章与医学健康完全无关，返回标签 ["其他"]
5. 严格按JSON格式返回，不要输出其他内容

返回格式：
{{"tags": {{"文章id": ["标签1", "标签2"], "文章id2": ["标签3"]}}}}"""


def call_api(prompt):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}",
    }
    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "你是一位严谨的医学内容分类专家。优先从给定的标签列表中选择，若无法覆盖可补充新标签（简洁2-6字）。返回纯JSON。"},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 2000,
        "temperature": 0.3,
    }
    response = httpx.post(API_URL, headers=headers, json=payload, timeout=120.0)
    if response.status_code != 200:
        raise RuntimeError(f"API error {response.status_code}: {response.text[:300]}")
    content = response.json()["choices"][0]["message"]["content"]

    # 解析 JSON
    text = content.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:]) if len(lines) > 1 else text
        if text.endswith("```"):
            text = text[:-3]
    parsed = json.loads(text.strip())
    return parsed.get("tags", {})


def tag_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        articles = json.load(f)

    total = len(articles)
    # 找出未打标的
    untagged_indices = [i for i, a in enumerate(articles) if "tags" not in a or not a.get("tags")]
    to_tag = len(untagged_indices)
    if to_tag == 0:
        print(f"  ✅ 全部已打标，跳过")
        return

    print(f"  共 {total} 篇，{to_tag} 篇待打标，分 { (to_tag + BATCH_SIZE - 1) // BATCH_SIZE } 批")

    tagged_count = 0
    for batch_start in range(0, to_tag, BATCH_SIZE):
        batch_indices = untagged_indices[batch_start : batch_start + BATCH_SIZE]
        batch_articles = [articles[i] for i in batch_indices]

        # 重试逻辑
        for attempt in range(3):
            try:
                tags_map = call_api(build_tag_prompt(batch_articles))
                # 写入
                for idx in batch_indices:
                    aid = str(articles[idx].get("id", ""))
                    articles[idx]["tags"] = tags_map.get(aid, tags_map.get(str(articles[idx].get("id")), ["其他"]))
                tagged_count += len(batch_indices)
                break
            except Exception as e:
                if attempt < 2:
                    wait = (attempt + 1) * 5
                    print(f"    ⚠ 批次失败，{wait}秒后重试: {e}")
                    time.sleep(wait)
                else:
                    print(f"    ✗ 批次最终失败，跳过: {e}")
                    for idx in batch_indices:
                        articles[idx]["tags"] = ["其他"]

        # 每 5 批保存一次
        if (batch_start // BATCH_SIZE + 1) % 5 == 0:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(articles, f, ensure_ascii=False)
            progress = min(tagged_count, to_tag)
            print(f"  💾 已保存 ({progress}/{to_tag})")

        time.sleep(0.5)  # 避免 API 限流

    # 最终保存
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(articles, f, ensure_ascii=False)
    print(f"  ✅ 完成！{tagged_count}/{to_tag} 篇已打标")


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    os.makedirs(DATA_DIR, exist_ok=True)

    for filename in FILES:
        filepath = os.path.join(DATA_DIR, filename)
        if not os.path.exists(filepath):
            print(f"⏭ {filename} 不存在，跳过")
            continue
        print(f"\n📄 处理 {filename}")
        tag_file(filepath)

    print("\n🎉 全部完成！")


if __name__ == "__main__":
    main()
