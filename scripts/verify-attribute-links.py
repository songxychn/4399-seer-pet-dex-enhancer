"""Live headless regression: python3 scripts/verify-attribute-links.py --output /tmp/results.json.

Requires an installed agent-browser CLI and its headless browser. Uses an isolated
session; page-load injection does not prove Tampermonkey automatic injection.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]
CHART = 'https://news.4399.com/seer/ssxxk/'
DETAIL = 'https://news.4399.com/seer/tujian/76202.htm'
INDEX = 'https://news.4399.com/seer/jinglingdaquan/'
# Expected site spellings are independent of the implementation's token parser.
EXPECTED_NAMES = {
    '地': '地面', '冰雪': '冰', '地面机械': '机械地面', '火电': '电火',
    '飞行火': '火飞行', '远古光': '光远古', '光飞行': '飞行光',
    '暗影神秘': '神秘暗影', '地暗影': '地面暗影', '飞行龙': '飞龙',
    '混沌暗影': '暗影混沌', '圣灵远古': '远古圣灵',
}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', default='seer-types-regression')
    parser.add_argument('--output', type=Path, default=Path('/tmp/seer-type-results.json'))
    args = parser.parse_args()
    script = (ROOT / 'seer-4399-enhancer.user.js').read_text()
    command = ['agent-browser', '--session', args.session, '--json']

    def cli(*parts, stdin=None):
        process = subprocess.run(command + list(parts), input=stdin, text=True,
                                 capture_output=True, timeout=45)
        if process.returncode:
            raise RuntimeError(process.stderr + process.stdout)
        result = json.loads(process.stdout)
        if not result['success']:
            raise RuntimeError(result['error'])
        return result.get('data', {})

    def js(code):
        return cli('eval', '--stdin', stdin=code).get('result')

    def inject():
        js(script)

    def ready():
        cli('wait', '--fn', 'typeof window.sh==="function" && window.jQuery && window.lastId!=null')

    def state(expected_id):
        return js('''(() => {
          const id = %s;
          const visible = selector => Array.from(document.querySelectorAll(selector))
            .filter(n => getComputedStyle(n).display !== 'none').map(n => n.id);
          const selected = Array.from(document.querySelectorAll('.l_big .n_tabon')).map(n => n.closest('li').id);
          const titles = visible('.r_big .t2 span');
          const attack = visible('.r_big ul[id^="1rt"]');
          const defense = visible('.r_big ul[id^="2rt"]');
          const warning = document.getElementById('seer-plus-status')?.textContent || null;
          const equal = (values, prefix) => JSON.stringify(values) === JSON.stringify([prefix + id]);
          return {ok: lastId === id && equal(selected, 'lf') && equal(titles, 'tt') &&
            equal(attack, '1rt') && equal(defense, '2rt'), selectedId: lastId,
            selected, titles, attack, defense, warning};
        })()''' % expected_id)

    report = {'scriptSha256': hashlib.sha256(script.encode()).hexdigest(),
              'method': 'Isolated headless browser, native link activation, page-load script injection.',
              'limits': 'One original representative per catalog type; not all articles/evolutions. Tampermonkey automatic injection unverified.',
              'chartTests': [], 'detailTests': [], 'edgeTests': []}

    def save():
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2))

    def record(group, row):
        report[group].append(row)
        save()
        count = len(report[group])
        if count % 10 == 0 or not row['ok']:
            failed = sum(not item['ok'] for item in report[group])
            print(f'{group}: {count}, failures: {failed}', flush=True)

    def activate(link):
        # DOM activation avoids late ad overlays intercepting coordinate clicks.
        js('document.querySelector("#state .item2 dl.shuxing:first-child i a").click()')
        tabs = cli('tab')['tabs']
        target = next(tab for tab in reversed(tabs) if tab['url'] == link)
        cli('tab', target['tabId'])
        ready()

    try:
        cli('open', CHART)
        chart_tab = next(tab['tabId'] for tab in cli('tab')['tabs'] if tab['active'])
        ready()
        options = js('Array.from(document.querySelectorAll(".l_big li[id^=lf]")).map(li=>({id:Number(li.id.slice(2)),name:li.querySelector("a").textContent.trim(),group:li.closest(".box_lc").previousElementSibling.textContent.trim()}))')
        report['options'] = options
        by_name = {option['name']: option['id'] for option in options}
        assert len(by_name) == len(options), 'Duplicate native names'
        cli('tab', 'new', INDEX)
        cli('wait', '--fn', 'Array.isArray(window.petData) && window.petData.length>0')
        catalog = js('petData')
        report['catalogPetCount'] = len(catalog)
        representatives = {}
        for pet in catalog:
            if len(pet) > 6 and pet[6] and pet[1] and '/tujian/' in pet[1]:
                representatives.setdefault(pet[6], {'catalogType': pet[6], 'pet': pet[0],
                                                   'url': pet[1].replace('http://', 'https://')})
        cli('tab', 'new', DETAIL)
        source_tab = next(tab['tabId'] for tab in cli('tab')['tabs'] if tab['active'])
        cli('wait', '--fn', 'document.querySelector("#state .item2 dl.shuxing")!==null')
        js('window.typeTestTemplate=document.querySelector("#state .item2 dl.shuxing").outerHTML')
        print(f'Inventory: {len(options)} native types, {len(representatives)} catalog types', flush=True)

        for option in options:
            row = dict(option)
            try:
                js('document.getElementById("seer-plus-loaded")?.remove();document.querySelector("#state .item2").innerHTML=window.typeTestTemplate;document.querySelector("#state .item2 dt i").textContent=' + json.dumps(option['name'] + '系'))
                inject()
                links = js('Array.from(document.querySelectorAll("#state .item2 a")).map(a=>({href:a.href,target:a.target,rel:a.rel,decoration:getComputedStyle(a).textDecorationLine}))')
                assert len(links) == 2 and links[0]['href'] == links[1]['href']
                assert all(link['target'] == '_blank' and 'noopener' in link['rel'] for link in links)
                assert links[1]['decoration'] == 'none'
                activate(links[1]['href'])
                row['destination'] = js('location.href')
                inject()
                row.update(state(option['id']))
                cli('tab', 'close')
            except Exception as error:
                row.update(ok=False, error=str(error))
            finally:
                cli('tab', source_tab)
            record('chartTests', row)

        for representative in representatives.values():
            row = dict(representative)
            try:
                cli('open', row['url'])
                cli('wait', '--fn', 'document.querySelector("#state .item2 dl.shuxing dt")!==null')
                row['originalLabel'] = js('document.querySelector("#state .item2 dl.shuxing dt i").textContent')
                name = row['originalLabel'].strip().removesuffix('系')
                row['expectedType'] = EXPECTED_NAMES.get(name, name)
                row['expectedId'] = by_name[row['expectedType']]
                inject()
                links = js('({table:document.querySelector("#state .item2 a.sxb").href,text:document.querySelector("#state .item2 i a").href,decoration:getComputedStyle(document.querySelector("#state .item2 i a")).textDecorationLine})')
                assert links['table'] == links['text'] and links['decoration'] == 'none'
                activate(links['text'])
                row['destination'] = js('location.href')
                inject()
                row.update(state(row['expectedId']))
                cli('tab', 'close')
            except Exception as error:
                row.update(ok=False, error=str(error))
            finally:
                cli('tab', source_tab)
            record('detailTests', row)

        # Exercise exact-match precedence and ambiguous/invalid inputs on native DOM.
        cases = [('', 1, False), ('type=', 1, True), ('type=不存在', 1, True),
                 ('type=火水草', 1, True), ('type=超', 1, True), ('type=地&type=水', 1, True),
                 ('type=机械地', 19, False), ('type=冰雪光', 24, False)]
        for fragment, expected_id, warning in cases:
            cli('tab', chart_tab)
            cli('open', 'about:blank')
            cli('open', CHART + '#' + fragment)
            ready()
            inject()
            row = {'input': fragment, **state(expected_id)}
            row['ok'] = row['ok'] and bool(row['warning']) == warning
            record('edgeTests', row)
        for name, expected_id, warning in [('机械地', 1, True), ('机械地面', 19, False)]:
            cli('open', 'about:blank')
            cli('open', CHART + '#type=' + name)
            ready()
            js('document.querySelector("#lf18 a").lastChild.textContent="地面机械"')
            inject()
            row = {'input': name, 'fixture': 'Second native option has equivalent composition', **state(expected_id)}
            row['ok'] = row['ok'] and bool(row['warning']) == warning
            record('edgeTests', row)

        expected_ids = {row['expectedId'] for row in report['detailTests'] if 'expectedId' in row}
        report['coversAllNativeTypes'] = expected_ids == {option['id'] for option in options}
        report['summary'] = {group: {'total': len(report[group]),
                                    'passed': sum(row['ok'] for row in report[group])}
                             for group in ['chartTests', 'detailTests', 'edgeTests']}
        save()
        print(json.dumps(report['summary']), flush=True)
        return 0 if report['coversAllNativeTypes'] and all(row['ok'] for group in report['summary'] for row in report[group]) else 1
    finally:
        cli('close')


if __name__ == '__main__':
    raise SystemExit(main())
