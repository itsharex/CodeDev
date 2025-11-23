import os
import re
import json
from pathlib import Path

# ================= 配置区域 =================

# 1. 锚定脚本所在位置 (build 目录)
SCRIPT_DIR = Path(__file__).parent.resolve()

# 2. 输出根目录
OUTPUT_DIR = SCRIPT_DIR / 'dist'

# 3. 多语言源配置
# 键名(zh/en) 将作为 manifest 中的 language 字段和 packs 下的子目录名
LANG_CONFIG = {
    'zh': {
        # 中文数据源: build/tldr/pages.zh
        'source': SCRIPT_DIR / 'tldr' / 'pages.zh',
        # 平台显示名称映射 (中文)
        'names': {
            'common': '通用工具 (Common)',
            'linux': 'Linux 运维',
            'android': 'Android 开发',
            'windows': 'Windows',
            'osx': 'macOS',
            'sunos': 'SunOS'
        }
    },
    'en': {
        # 英文数据源: build/tldr/pages (注意这里没有 .en)
        'source': SCRIPT_DIR / 'tldr' / 'pages',
        # 平台显示名称映射 (英文)
        'names': {
            'common': 'Common Tools',
            'linux': 'Linux Ops',
            'android': 'Android Dev',
            'windows': 'Windows',
            'osx': 'macOS',
            'sunos': 'SunOS'
        }
    }
}

# ===========================================

def parse_markdown(content, cmd_name, platform, lang, platform_display_name):
    """
    解析单个 Markdown 文件内容
    """
    prompts = []
    lines = content.splitlines()

    # 1. 提取描述
    desc_lines = [
        re.sub(r'<[^>]+>|\[([^\]]+)\]\([^\)]+\)', '', line.lstrip('> ').strip()) 
        for line in lines if line.strip().startswith('>')
    ]
    description = ' '.join(desc_lines) or f"{cmd_name} command"

    current_action = None
    index = 0
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('- '):
            current_action = line[2:].rstrip(':').strip()
        
        elif line.startswith('`') and line.endswith('`') and current_action:
            code_content = line.strip('`')
            
            prompts.append({
                # ID 包含语言标识，防止冲突: tldr-en-linux-apk-0
                "id": f"tldr-{lang}-{platform}-{cmd_name}-{index}",
                "title": f"{cmd_name} - {current_action}",
                "content": code_content,
                # 分组使用配置好的显示名称，或者首字母大写
                "group": platform_display_name, 
                "description": f"{cmd_name}: {description} ({current_action})",
                "tags": [platform, cmd_name, 'tldr', lang],
                "source": "official"
            })
            
            current_action = None
            index += 1
            
    return prompts

def main():
    print("🚀 开始构建 CodeForgeAI 指令库 (双语版)...")
    print(f"📍 脚本位置: {SCRIPT_DIR}")

    # 清理输出目录
    if not OUTPUT_DIR.exists():
        OUTPUT_DIR.mkdir(parents=True)

    manifest_packages = []
    
    # --- 第一层循环：遍历语言 (zh, en) ---
    for lang, config in LANG_CONFIG.items():
        source_dir = config['source']
        names_map = config['names']
        
        print(f"\n🌐 正在处理语言: [{lang}]")
        print(f"   源路径: {source_dir}")

        if not source_dir.exists():
            print(f"❌ 错误: 找不到源目录 {source_dir}，跳过此语言。")
            continue

        # 确保该语言的输出目录存在 (dist/packs/zh 或 dist/packs/en)
        lang_pack_dir = OUTPUT_DIR / 'packs' / lang
        if not lang_pack_dir.exists():
            lang_pack_dir.mkdir(parents=True)

        # --- 第二层循环：遍历平台 (common, linux...) ---
        # 动态扫描该源目录下的所有子文件夹作为平台
        # 这样可以兼容 pages 和 pages.zh 目录结构不完全一致的情况
        platforms = [d.name for d in source_dir.iterdir() if d.is_dir()]
        
        for platform in platforms:
            platform_path = source_dir / platform
            # 获取显示名称，如果没有配置则首字母大写
            display_name = names_map.get(platform, platform.title())

            print(f"   📦 处理平台: {platform} ({display_name})...")
            
            all_platform_prompts = []
            md_files = list(platform_path.glob('*.md'))

            for file_path in md_files:
                try:
                    content = file_path.read_text(encoding='utf-8')
                    cmd_name = file_path.stem 
                    
                    prompts = parse_markdown(content, cmd_name, platform, lang, display_name)
                    all_platform_prompts.extend(prompts)
                except Exception as e:
                    print(f"      ❌ 解析失败: {file_path.name} - {e}")

            if all_platform_prompts:
                output_filename = f"{platform}.json"
                output_path = lang_pack_dir / output_filename
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(all_platform_prompts, f, ensure_ascii=False, indent=2)
                
                size_kb = round(output_path.stat().st_size / 1024)
                
                manifest_packages.append({
                    "id": f"{lang}-{platform}",
                    "language": lang,
                    "platform": platform,
                    "name": f"{display_name} ({lang.upper()})", # 例如: Linux 运维 (ZH)
                    "description": f"Contains {len(all_platform_prompts)} {lang} commands for {platform}.",
                    "count": len(all_platform_prompts),
                    "size_kb": size_kb,
                    # URL 结构: packs/en/linux.json
                    "url": f"packs/{lang}/{output_filename}"
                })

    # 生成总索引 manifest.json
    manifest = {
        "updated_at": int(os.path.getmtime(output_path) * 1000) if 'output_path' in locals() else 0,
        "version": "1.0.0",
        "packages": manifest_packages
    }

    with open(OUTPUT_DIR / 'manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n🎉 全构建完成!")
    print(f"👉 产物目录: {OUTPUT_DIR}")
    print(f"   结构预览:")
    print(f"   dist/manifest.json")
    print(f"   dist/packs/zh/linux.json")
    print(f"   dist/packs/en/linux.json")
    print(f"   ...")

if __name__ == "__main__":
    main()