"""Сборка страницы нейробота «ТЕССА AI» (пакеты токенов).

    python build.py

1. preview.html — локальный просмотр: page.html + page.css + page.js,
   с `html { font-size: 10px }`, как в глобальной теме ГетКурса,
   чтобы сразу ловить размеры, которые от неё зависят.
2. gc/page.html — то, что вставляется в блок «HTML» на ГетКурсе:
   пути img/*.webp и video/*.mp4 заменены на адреса из img-urls.txt,
   коды форм b-T100, b-T200, … — на настоящие из gc-ids.txt.
3. gc/page.css — то, что вставляется в блок «CSS»: заготовка
   #ltBlockFORMS заменена на список id всех блоков форм.

Если адреса картинки, видео или кода формы нет, сборка это перечислит и оставит
заготовку — на сайте такая картинка не покажется, а кнопка не откроет форму.

Формат img-urls.txt — по строке на файл (картинки и видео):
    hero-bg.webp https://fs.getcourse.ru/fileservice/file/download/a/.../h/...
Формат gc-ids.txt — по строке на форму: роль, data-code блока, id блока:
    T100 b-xxxxx ltBlock0000000000
"""

import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
# Роли форм на странице: пять пакетов токенов и вопрос в поддержку
FORMS = ('T100', 'T200', 'T500', 'T700', 'T1000', 'ASK')


def read(name):
    return (HERE / name).read_text(encoding='utf-8')


def read_pairs(name):
    """Строки «ключ значение…» без комментариев и заготовок без значения."""
    path = HERE / name
    if not path.exists():
        return {}
    pairs = {}
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        key, _, value = line.partition(' ')
        if value.strip():
            pairs[key.strip()] = value.split()
    return pairs


def build_preview(html):
    # Метка версии в адресе — иначе браузер берёт page.css/page.js из кэша
    # и правки в превью не видны
    v = int(max((HERE / n).stat().st_mtime for n in ('page.css', 'page.js')))
    doc = f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Нейробот ТЕССА AI — превью</title>
<style>html {{ font-size: 10px; }} body {{ margin: 0; }}</style>
<link rel="stylesheet" href="page.css?v={v}">
</head>
<body>
{html}
<script src="page.js?v={v}"></script>
</body>
</html>
"""
    (HERE / 'preview.html').write_text(doc, encoding='utf-8')


def build_gc(html, css, urls, forms):
    missing = []

    def swap(match):
        name = match.group(1)
        if name in urls:
            return urls[name][0]
        missing.append(name)
        return match.group(0)

    html = re.sub(r'(?:img|video)/([\w.-]+\.(?:webp|png|jpg|mp4))', swap, html)
    blocks = []
    for role in FORMS:
        if role in forms and len(forms[role]) == 2:
            code, block = forms[role]
            html = html.replace(f"'b-{role}'", f"'{code}'")
            blocks.append(f'#{block}')
        else:
            missing.append(f'форма {role} (gc-ids.txt)')
    # Стили форм пишутся один раз на все блоки сразу: :is(#a, #b, …)
    if blocks:
        css = css.replace('#ltBlockFORMS', ', '.join(blocks))

    (HERE / 'gc').mkdir(exist_ok=True)
    # newline='\n' — редактор ГетКурса хранит код с LF, так проще сверять
    (HERE / 'gc' / 'page.html').write_text(html, encoding='utf-8', newline='\n')
    (HERE / 'gc' / 'page.css').write_text(css, encoding='utf-8', newline='\n')
    return sorted(set(missing))


def main():
    html = read('page.html')
    build_preview(html)
    missing = build_gc(html, read('page.css'), read_pairs('img-urls.txt'), read_pairs('gc-ids.txt'))
    print('preview.html — готово')
    print('gc/page.html, gc/page.css — готово')
    if missing:
        print(f'Не хватает {len(missing)}:')
        for name in missing:
            print('  ', name)
        return 1
    return 0


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    sys.exit(main())
