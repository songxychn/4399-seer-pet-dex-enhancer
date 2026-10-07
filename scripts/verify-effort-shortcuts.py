"""Live headless regression for effort and nature shortcuts on the calculator.

python3 scripts/verify-effort-shortcuts.py --output /tmp/seer-effort-results.json
Requires agent-browser and its headless browser. Injects after page load;
does not verify Tampermonkey automatic injection.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--session', default='seer-effort-regression')
    parser.add_argument('--output', type=Path, default=Path('/tmp/seer-effort-results.json'))
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

    report = {'scriptSha256': hashlib.sha256(script.encode()).hexdigest(),
              'method': 'Isolated headless browser; live native calculator; page-load injection.',
              'limits': 'Tampermonkey automatic injection unverified.', 'tests': []}

    def save():
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(report, ensure_ascii=False, indent=2))

    def check(name, code):
        result = js(code)
        report['tests'].append({'name': name, 'ok': result is True, 'result': result})
        save()
        if result is not True:
            raise AssertionError(f'{name}: {result}')
        print(f'PASS: {name}', flush=True)

    try:
        cli('open', 'https://news.4399.com/seer/jsq/#pet=p106')
        cli('wait', '--fn', 'window.pets && window.petid && typeof window.changePet === "function"')
        js(script)
        cli('wait', '--fn', 'document.querySelectorAll(".seer-plus-effort-actions").length === 6')
        js('''window.effortTest = {
          inputs: Array.from(document.querySelectorAll('input[name="nvli2"]')),
          read() { return this.inputs.map(n => Number(n.value)); },
          fill(values) { this.inputs.forEach((n, i) => {
            n.value = String(values[i]); n.dispatchEvent(new Event('input', {bubbles:true}));
          }); },
          button(i, max) { return document.querySelectorAll('.seer-plus-effort-actions')[i].querySelectorAll('button')[max ? 1 : 0]; },
          plan(attack, partner) { return document.querySelector('#seer-plus-effort button[data-attack="'+attack+'"][data-partner="'+partner+'"]'); },
          results() { return Array.from(document.querySelectorAll('._result2')).map(n=>n.textContent); },
          warning() { return document.querySelector('.seer-plus-effort-total').dataset.warning === 'true'; },
          common(mode) { return [...document.querySelectorAll('#seer-plus-nature-'+mode+' .seer-plus-quick button')]
            .filter(b=>!b.hidden).map(b=>b.getAttribute('aria-label').split('，')[0]).join(','); },
          natureState() { return JSON.stringify({
            selected:[...document.querySelectorAll('select[name="characters1"],select[name="characters2"]')].map(n=>n.value),
            factors:[...document.querySelectorAll('select[name="_c2"]')].map(n=>n.value)
          }); },
          equal(values) { return JSON.stringify(this.read()) === JSON.stringify(values); }
        };''')
        check('six labeled clear/max pairs, special attack plans after import', '''(() => {
          const buttons = [...document.querySelectorAll('.seer-plus-effort-actions button')];
          return petid==='p106' && buttons.length===12 && buttons.every((b,i)=>b.type==='button' &&
            b.textContent===(i%2 ? '最大' : '清零') && b.getAttribute('aria-label')) &&
            document.querySelectorAll('#seer-plus-effort button').length===2 && !!effortTest.plan(3,0);
        })()''')
        check('special attacker shows two common natures in both panels and retains all 25', '''(() => {
          const t=effortTest;
          return [1,2].every(mode=>{
            const panel=document.querySelector('#seer-plus-nature-'+mode);
            const select=document.querySelector('select[name="characters'+mode+'"]');
            const stars=[...select.options].filter(n=>n.textContent.startsWith('★')).map(n=>n.value).join(',');
            const badges=[...panel.querySelectorAll('.seer-plus-grid .seer-plus-badge')].filter(n=>!n.hidden);
            return t.common(mode)==='保守,胆小' && panel.querySelectorAll('.seer-plus-grid button').length===25 &&
              stars==='5,9' && badges.length===2;
          }) && document.querySelector('#seer-plus-nature-1').hidden;
        })()''')
        check('max uses remaining 110, preserves others, clear only current', '''(() => {
          const t=effortTest; t.fill([100,100,100,100,0,0]); t.button(5,true).click();
          const filled=t.equal([100,100,100,100,0,110]); t.button(5,false).click();
          return filled && t.equal([100,100,100,100,0,0]);
        })()''')
        check('max excludes current allocation and caps one stat at 255', '''(() => {
          const t=effortTest; t.fill([100,100,100,0,0,0]); t.button(0,true).click();
          return t.equal([255,100,100,0,0,0]) && !t.warning();
        })()''')
        check('repeated maxima never allocate beyond 510', '''(() => {
          const t=effortTest; t.fill([0,0,0,0,0,0]);
          for(let i=0;i<6;i++) t.button(i,true).click();
          return t.equal([255,255,0,0,0,0]) && !t.warning();
        })()''')
        check('manual overflow warns and max never becomes negative', '''(() => {
          const t=effortTest; t.fill([200,200,200,0,0,0]); t.button(5,true).click();
          return t.equal([200,200,200,0,0,0]) && t.warning();
        })()''')
        check('invalid input blocks other maxima; clear or max can repair it', '''(() => {
          const t=effortTest;
          for(const bad of ['', 'abc', '-1', '1.5', '256']) {
            t.fill([bad,0,0,0,0,0]);
            if(!t.warning() || !t.button(1,true).disabled || t.button(0,true).disabled) return false;
            t.button(0,true).click(); if(!t.equal([255,0,0,0,0,0]) || t.warning()) return false;
          }
          t.fill(['abc',0,0,0,0,0]); t.button(0,false).click();
          return t.equal([0,0,0,0,0,0]) && !t.warning();
        })()''')
        check('special attack presets overwrite all six, clear only ability results, retain other settings', '''(() => {
          const t=effortTest;
          document.querySelector('input[name="level2"]').value='75';
          document.querySelector('input[name="geti"]').value='25';
          document.querySelector('#seer-plus-nature-2 button[data-nature="5"]').click();
          document.querySelector('input[name="nvli1"]').value='123';
          document.querySelector('._result1').textContent='keep';
          t.fill([1,2,3,4,5,6]); calc2(); t.plan(3,0).click();
          const hp=t.equal([255,0,0,255,0,0]) && t.results().every(n=>n==='');
          t.plan(3,5).click();
          return hp && t.equal([0,0,0,255,0,255]) &&
            document.querySelector('input[name="level2"]').value==='75' &&
            document.querySelector('input[name="geti"]').value==='25' &&
            document.querySelector('select[name="characters2"]').value==='5' &&
            document.querySelector('input[name="nvli1"]').value==='123' &&
            document.querySelector('._result1').textContent==='keep';
        })()''')
        check('preset calculation matches manual allocation through native form submission', '''(() => {
          const t=effortTest; t.fill([255,0,0,255,0,0]); calc2(); const manual=t.results();
          t.fill([1,2,3,4,5,6]); t.plan(3,0).click();
          document.querySelector('.gtz .js-btn').click();
          return manual.every(n=>n!=='' && Number.isFinite(Number(n))) &&
            JSON.stringify(manual)===JSON.stringify(t.results());
        })()''')
        js('''window.effortTestPets = {
          physical: Object.values(pets).find(p=>Number(p.gongji)>Number(p.mougong)).pid,
          tie: Object.values(pets).find(p=>Number(p.gongji)>0 && Number(p.gongji)===Number(p.mougong)).pid
        }; window.natureBeforeSwitch=effortTest.natureState(); changePet(effortTestPets.physical);''')
        cli('wait', '--fn', 'document.querySelectorAll("#seer-plus-effort button").length===2 && !!effortTest.plan(1,0)')
        check('switching to physical attacker updates plans and resets total', '''(() => {
          const t=effortTest; const reset=t.equal([0,0,0,0,0,0]) &&
            document.querySelector('.seer-plus-effort-total').textContent.includes('已分配 0 / 510');
          t.plan(1,0).click(); const hp=t.equal([255,255,0,0,0,0]); t.plan(1,5).click();
          return reset && hp && t.equal([0,255,0,0,0,255]);
        })()''')
        check('physical attacker shows adamant/jolly and keeps selected natures and coefficients', '''(() => {
          const t=effortTest;
          return [1,2].every(mode=>t.common(mode)==='固执,开朗' &&
            [...document.querySelector('select[name="characters'+mode+'"]') .options]
              .filter(n=>n.textContent.startsWith('★')).map(n=>n.value).join(',')==='1,10') &&
            t.natureState()===window.natureBeforeSwitch;
        })()''')
        js('''const factor=document.querySelector('select[name="_c2"]');
          factor.value='1.0'; factor.dispatchEvent(new Event('change',{bubbles:true}));
          window.natureBeforeSwitch=effortTest.natureState();''')
        js('changePet(effortTestPets.tie)')
        cli('wait', '--fn', 'document.querySelectorAll("#seer-plus-effort button").length===4')
        check('equal attack stats expose all four explicit presets', '''(() => {
          const t=effortTest, buttons=[...document.querySelectorAll('#seer-plus-effort button')];
          if(buttons.map(b=>b.firstElementChild.textContent).join(',')!=='物攻体,特攻体,物攻速,特攻速') return false;
          const cases=[[1,0,[255,255,0,0,0,0]], [3,0,[255,0,0,255,0,0]],
            [1,5,[0,255,0,0,0,255]], [3,5,[0,0,0,255,0,255]]];
          return cases.every(([a,p,v])=>{
            t.fill([1,2,3,4,5,6]); t.plan(a,p).click();
            return t.equal(v) && document.querySelectorAll('#seer-plus-effort button[aria-pressed="true"]').length===1;
          });
        })()''')
        check('equal attackers show all four common natures and preserve custom corrections', '''(() => {
          const t=effortTest;
          return [1,2].every(mode=>t.common(mode)==='固执,保守,胆小,开朗') &&
            t.natureState()===window.natureBeforeSwitch &&
            document.querySelector('#seer-plus-nature-2 .seer-plus-current').textContent.includes('自定义修正') &&
            !document.querySelector('#seer-plus-nature-2 button[aria-pressed="true"]');
        })()''')
        js('changePet("p106")')
        cli('wait', '--fn', 'document.querySelectorAll("#seer-plus-effort button").length===2 && !!effortTest.plan(3,0)')
        check('tie-to-special switch restores two plans; manual edit deselects preset', '''(() => {
          const t=effortTest; t.plan(3,0).click(); calc2(); t.fill([254,0,0,255,0,0]);
          return document.querySelectorAll('#seer-plus-effort button[aria-pressed="true"]').length===0 &&
            t.results().every(n=>n==='') && !t.warning();
        })()''')
        check('returning to special attacker filters both panels; nature selections remain independent', '''(() => {
          const t=effortTest;
          if(![1,2].every(mode=>t.common(mode)==='保守,胆小')) return false;
          const item=document.querySelector('select[name="item"]');
          item.value='2'; item.dispatchEvent(new Event('change',{bubbles:true}));
          document.querySelector('#seer-plus-nature-1 .seer-plus-quick button[data-nature="9"]').click();
          document.querySelector('#seer-plus-nature-2 .seer-plus-quick button[data-nature="5"]').click();
          const selected=document.querySelector('select[name="characters1"]').value==='9' &&
            document.querySelector('select[name="characters2"]').value==='5' &&
            !document.querySelector('#seer-plus-nature-1').hidden;
          item.value='1'; item.dispatchEvent(new Event('change',{bubbles:true}));
          return selected && document.querySelector('#seer-plus-nature-1').hidden;
        })()''')
        check('table, submit button, and individual calculator do not overlap', '''(() => {
          const container=document.querySelector('.gtz').getBoundingClientRect();
          const table=document.querySelector('.gtz table').getBoundingClientRect();
          const submit=document.querySelector('.gtz .js-btn').getBoundingClientRect();
          const individual=document.querySelector('.nlz').getBoundingClientRect();
          return table.bottom <= submit.top && submit.bottom <= container.bottom && container.bottom <= individual.top;
        })()''')
        check('input and both shortcuts share one line without widening cells or increasing table height', '''(() => {
          const rows=[...document.querySelectorAll('.seer-plus-effort-row')];
          const inline=rows.length===6 && rows.every(row=>{
            const cell=row.closest('td').getBoundingClientRect();
            const [input,clear,max]=[row.querySelector('input'),...row.querySelectorAll('button')]
              .map(n=>n.getBoundingClientRect());
            const sameLine=Math.abs(input.top-clear.top)<1 && Math.abs(input.top-max.top)<1;
            return sameLine && clear.right<=input.left && input.right<=max.left &&
              clear.left>=cell.left && max.right<=cell.right;
          });
          return inline && document.querySelector('.gtz table').getBoundingClientRect().height<=228.5 &&
            document.querySelector('.gtz').getBoundingClientRect().height<=410.5;
        })()''')
        js('document.querySelector("._race2").textContent=""')
        cli('wait', '--fn', 'document.querySelectorAll("#seer-plus-effort button").length===0')
        check('missing race data removes common recommendations but keeps all natures available', '''[1,2].every(mode=>
          effortTest.common(mode)==='' && document.querySelectorAll('#seer-plus-nature-'+mode+' .seer-plus-grid button').length===25 &&
          ![...document.querySelector('select[name="characters'+mode+'"]') .options].some(n=>n.textContent.startsWith('★'))
        )''')
        check('missing race data hides presets but retains single-stat shortcuts', '''(() => {
          const t=effortTest; t.fill([0,0,0,0,0,0]); t.button(0,true).click();
          return t.equal([255,0,0,0,0,0]) &&
            document.querySelector('#seer-plus-effort').textContent.includes('种族值尚未就绪');
        })()''')
        js('changePet("p106")')
        cli('wait', '--fn', 'document.querySelectorAll("#seer-plus-effort button").length===2')
        check('reinjection does not duplicate controls', script + '''
          document.querySelectorAll('#seer-plus-effort').length===1 &&
          document.querySelectorAll('.seer-plus-effort-actions button').length===12;
        ''')
    finally:
        save()
        cli('close')
    print(f'{len(report["tests"])} tests passed; report: {args.output}')


if __name__ == '__main__':
    main()
