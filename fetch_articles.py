"""Fetch WeChat public account articles from kdc.meddb.cn API."""
import hashlib
import json
import requests

# ── Configuration ──────────────────────────────────────────────────
PROJECT_ID = 9
# key由接口方提供,用于生成token: md5("projectId=xxxkey=yyy")
# 如果知道key，设置KEY后会自动生成token；否则直接使用TOKEN
KEY = ""  # 填入key后会自动计算token
TOKEN = "40ded274543d5796f275de0632d0f373"  # 如无key,直接使用示例token
ACCOUNT = "medlive"
BASE_URL = "https://kdc.meddb.cn/api/article/getData"

# ── Token Generation ───────────────────────────────────────────────
if KEY:
    token_raw = f"projectId={PROJECT_ID}key={KEY}"
    TOKEN = hashlib.md5(token_raw.encode()).hexdigest()
    print(f"Token (from key): {TOKEN}")
else:
    print(f"Token (hardcoded): {TOKEN}")


def fetch_articles(
    page: int = 1,
    size: int = 20,
    start_date: str = None,
    end_date: str = None,
    html: int = None,
    account: str = ACCOUNT,
    company: str = None,
):
    """Fetch articles from the API.

    Args:
        page: 当前页,从1开始
        size: 每页条数,最大20
        start_date: 收录日期开始,格式 yyyyMMddHHmmss, e.g. "20241125000000"
        end_date: 收录日期结束,格式同上
        html: 1=含html样式, 0=纯文本, 不传=都返回, 2=都不返回
        account: 公众号ID
        company: 公司名称
    """
    params = {
        "projectId": PROJECT_ID,
        "page": page,
        "size": size,
        "token": TOKEN,
    }

    if account:
        params["account"] = account
    if company:
        params["company"] = company
    if start_date:
        params["startDate"] = start_date
    if end_date:
        params["endDate"] = end_date
    if html is not None:
        params["html"] = html

    print(f"\n{'='*60}")
    print(f"Request URL: {BASE_URL}")
    print(f"Params: {json.dumps(params, ensure_ascii=False, indent=2)}")
    print(f"{'='*60}\n")

    try:
        resp = requests.get(BASE_URL, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return data
    except requests.exceptions.ConnectionError as e:
        print(f"连接错误: {e}")
        print("提示: 正式环境可能需要设置hosts: 192.168.0.7 kdc.meddb.cn")
        return None
    except requests.exceptions.Timeout:
        print("请求超时")
        return None
    except Exception as e:
        print(f"请求失败: {e}")
        return None


def fetch_all_articles(
    start_date: str = None,
    end_date: str = None,
    html: int = None,
    account: str = ACCOUNT,
    company: str = None,
    save_every: int = 50,
    out_path: str = "articles_all.json",
):
    """Fetch ALL articles across all pages and save to file.

    Args:
        start_date: 收录日期开始,格式 yyyyMMddHHmmss
        end_date: 收录日期结束,格式同上
        html: 1=含html样式, 0=纯文本, 不传=都返回, 2=都不返回
        account: 公众号ID
        company: 公司名称
        save_every: 每抓取N页保存一次(防止中断丢数据)
        out_path: 输出文件路径
    """
    # First request to get total pages
    first_page = fetch_articles(page=1, size=20, start_date=start_date,
                                end_date=end_date, html=html,
                                account=account, company=company)
    if first_page is None or not first_page.get("success"):
        print("首页请求失败，终止")
        return None

    total_pages = first_page.get("pages", 0)
    total_count = first_page.get("count", 0)
    print(f"\n总条数: {total_count}, 总页数: {total_pages}, 开始逐页获取...")

    all_articles = list(first_page.get("data", []))
    print(f"  第 1/{total_pages} 页完成, 累计 {len(all_articles)} 条")

    # Fetch remaining pages
    for p in range(2, total_pages + 1):
        page_data = fetch_articles(page=p, size=20, start_date=start_date,
                                   end_date=end_date, html=html,
                                   account=account, company=company)
        if page_data and page_data.get("success"):
            articles = page_data.get("data", [])
            all_articles.extend(articles)
            print(f"  第 {p}/{total_pages} 页完成, 累计 {len(all_articles)} 条")
        else:
            print(f"  第 {p}/{total_pages} 页请求失败, 跳过")

        # Save checkpoint every N pages
        if p % save_every == 0:
            with open(out_path, "w", encoding="utf-8") as f:
                json.dump(all_articles, f, ensure_ascii=False, indent=2)
            print(f"  [checkpoint] 已保存 {len(all_articles)} 条到 {out_path}")

    # Final save
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(all_articles, f, ensure_ascii=False, indent=2)
    print(f"\n全部完成! 共 {len(all_articles)} 篇文章已保存到 {out_path}")
    return all_articles


def print_summary(data: dict):
    """Print a summary of the API response."""
    if data is None:
        return

    if not data.get("success"):
        print(f"API 返回失败: {data.get('msg', '未知错误')}")
        print(f"完整响应: {json.dumps(data, ensure_ascii=False, indent=2)}")
        return

    print(f"请求成功!")
    print(f"  当前页: {data.get('page')}")
    print(f"  每页条数: {data.get('size')}")
    print(f"  当前页条数: {len(data.get('data', []))}")
    print(f"  总条数: {data.get('count')}")
    print(f"  总页数: {data.get('pages')}")

    articles = data.get("data", [])
    if articles:
        print(f"\n{'─'*60}")
        print(f"文章列表 (共 {len(articles)} 篇):")
        print(f"{'─'*60}")
        for i, art in enumerate(articles, 1):
            print(f"\n  [{i}] {art.get('title', 'N/A')}")
            print(f"      作者: {art.get('author', 'N/A')}")
            print(f"      公众号: {art.get('name', 'N/A')} ({art.get('account', 'N/A')})")
            print(f"      发布时间: {art.get('publish_date', 'N/A')}")
            print(f"      收录时间: {art.get('sync_date', 'N/A')}")
            print(f"      阅读: {art.get('read_num', 0)} | 在看: {art.get('like_num', 0)} | 点赞: {art.get('old_like_num', 0)} | 分享: {art.get('share_num', 0)}")
            print(f"      原创: {'是' if art.get('copyright_stat') == 1 else '否'} | 头条: {'是' if art.get('main') == 1 else '否'} (位置: {art.get('order', 'N/A')})")
            print(f"      摘要: {art.get('digest', 'N/A')}")
            print(f"      链接: {art.get('content_url', 'N/A')}")
            content_text = art.get('content_text', '')
            content_html = art.get('content_html', '')
            content_pic = art.get('content_pic', '')
            if content_text:
                print(f"      纯文本全文: {content_text[:200]}...")
            if content_html:
                print(f"      HTML全文: {content_html[:200]}...")
            if content_pic:
                print(f"      图片: {content_pic}")


if __name__ == "__main__":
    # 获取全部文章 (自动翻页, 每50页保存一次)
    all_articles = fetch_all_articles(
        account="medlive-xy",
        start_date="20241125000000",
        html=0,
        save_every=50,
        out_path="articles_xy.json",
    )

    if all_articles:
        print(f"\n获取完成，共 {len(all_articles)} 篇文章")
