#!/usr/bin/env python3
"""Gera os três SVGs do post 005 em ../../post/assets/.

Os SVGs não têm cor fixa: usam as variáveis do tema do site (--paper, --ink, --ink-soft, --ink-muted, --rule,
--surface) com fallback claro, então inline no site seguem o tema claro e o escuro. Foco é nó invertido (campo de
tinta do brand); falha usa --dg-fail (token do diagrama, ver DESIGN.md). O acento cobre nunca aparece aqui.
Depois de regenerar, apague site/.astro/data-store.json e reinicie o dev server: o conteúdo do SVG não é uma
dependência rastreada do post.md, e o Astro reaproveita o HTML antigo.
Regras de layout vêm do skill diagram-design: conectores ortogonais, rótulos com máscara e folga de 8px, grade de 4px.
"""
import os
from html import escape

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../post/assets")
W = 720

CSS = """
.dg{--c-paper:var(--paper,#f3f0e9);--c-ink:var(--ink,#141518);--c-soft:var(--ink-soft,#2f3034);--c-muted:var(--ink-muted,#66655f);--c-rule:var(--rule,#d8d2c5);--c-surface:var(--surface,rgb(20 21 24/.04));--c-fail:var(--dg-fail,#a3311f)}
.dg text{font-family:var(--font-sans,'Instrument Sans','Helvetica Neue',Arial,sans-serif)}
.dg .m{font-family:var(--font-mono,'IBM Plex Mono',ui-monospace,monospace)}
.dg-bg{fill:var(--c-paper)}
.dg-node{fill:var(--c-paper);stroke:var(--c-ink);stroke-width:1}
.dg-focal{fill:var(--c-ink);stroke:var(--c-ink);stroke-width:1}
.dg-store{fill:var(--c-surface);stroke:var(--c-muted);stroke-width:1}
.dg-chip{fill:var(--c-paper);stroke:var(--c-ink);stroke-width:1}
.dg-chip-solid{fill:var(--c-ink)}
.dg-name{fill:var(--c-ink);font-size:13.5px;font-weight:600}
.dg-name-f{fill:var(--c-paper)}
.dg-sub{fill:var(--c-muted);font-size:10.5px}
.dg-sub-f{fill:var(--c-paper);opacity:.82}
.dg-life{stroke:var(--c-rule);stroke-width:1;stroke-dasharray:3 3}
.dg-rule{stroke:var(--c-rule);stroke-width:1}
.dg-ln{stroke:var(--c-ink);stroke-width:1.4;fill:none}
.dg-ln-strong{stroke:var(--c-ink);stroke-width:2.2;fill:none}
.dg-ln-soft{stroke:var(--c-muted);stroke-width:1.2;fill:none}
.dg-dash{stroke-dasharray:5 4}
.dg-fail{stroke:var(--c-fail)}
.dg-lbl{fill:var(--c-muted);font-size:10px;font-weight:500;letter-spacing:.06em}
.dg-lbl-fail{fill:var(--c-fail)}
.dg-mask{fill:var(--c-paper)}
.dg-eyebrow{fill:var(--c-muted);font-size:10px;font-weight:500;letter-spacing:.14em}
.dg-cap{fill:var(--c-muted);font-size:11px}
.dg-mk{fill:var(--c-ink)}.dg-mk-s{fill:var(--c-muted)}.dg-mk-f{fill:var(--c-fail)}
"""


def r4(n):
    return int(-(-n // 4) * 4)


def head(pid, h, title, desc):
    marks = "".join(
        f'<marker id="{pid}-{k}" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon class="{c}" points="0 0, 8 3, 0 6"/></marker>'
        for k, c in (("a", "dg-mk"), ("s", "dg-mk-s"), ("f", "dg-mk-f"))
    )
    return (
        f'<svg class="dg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {h}" role="img" aria-labelledby="{pid}-t {pid}-d">\n'
        f'<title id="{pid}-t">{escape(title)}</title>\n<desc id="{pid}-d">{escape(desc)}</desc>\n'
        f"<style>{CSS}</style>\n<defs>{marks}</defs>\n"
        f'<rect class="dg-bg" width="{W}" height="{h}"/>\n'
    )


def node(x, y, w, h, name, sub, kind="node"):
    f = kind == "focal"
    cls = {"node": "dg-node", "focal": "dg-focal", "store": "dg-store"}[kind]
    cx = x + w / 2
    return (
        f'<rect class="dg-mask" x="{x}" y="{y}" width="{w}" height="{h}"/>'
        f'<rect class="{cls}" x="{x}" y="{y}" width="{w}" height="{h}"/>'
        f'<text class="dg-name{" dg-name-f" if f else ""}" x="{cx}" y="{y+h/2-(2 if sub else -5)}" text-anchor="middle">{escape(name)}</text>'
        + (f'<text class="m dg-sub{" dg-sub-f" if f else ""}" x="{cx}" y="{y+h/2+14}" text-anchor="middle">{escape(sub)}</text>' if sub else "")
    )


def label(cx, y, text, fail=False):
    w = r4(len(text) * 6.6 + 12)
    return (
        f'<rect class="dg-mask" x="{cx-w/2}" y="{y-22}" width="{w}" height="14"/>'
        f'<text class="m dg-lbl{" dg-lbl-fail" if fail else ""}" x="{cx}" y="{y-11}" text-anchor="middle">{escape(text)}</text>'
    )


# ----------------------------------------------------------------------------- sequências
SLOTS = [96, 272, 448, 624]


def sequence(pid, title, desc, actors, msgs, self_msg=None, legend_txt=('CHAMADA', 'RESPOSTA', 'FALHA')):
    top, ah = 16, 48
    y0, step = 112, 40
    last = y0 + step * (len(msgs) - 1)
    bottom = last + (60 if self_msg else 28)
    leg_y = bottom + 28
    h = leg_y + 28
    life = "".join(f'<line class="dg-life" x1="{SLOTS[s]}" y1="{top+ah}" x2="{SLOTS[s]}" y2="{bottom}"/>' for s, *_ in actors)
    body = []
    for i, (f, t, text, kind) in enumerate(msgs):
        y = y0 + step * i
        x1, x2 = SLOTS[f], SLOTS[t]
        cls, mk = {
            "call": ("dg-ln", "a"),
            "strong": ("dg-ln-strong", "a"),
            "ret": ("dg-ln-soft dg-dash", "s"),
            "fail": ("dg-ln dg-fail", "f"),
            "failret": ("dg-ln-soft dg-dash dg-fail", "f"),
        }[kind]
        body.append(f'<line class="{cls}" x1="{x1}" y1="{y}" x2="{x2}" y2="{y}" marker-end="url(#{pid}-{mk})"/>')
        a, b = (x1, SLOTS[f + 1]) if x2 > x1 else (SLOTS[f - 1], x1)
        body.append(label((a + b) / 2, y, text, kind in ("fail", "failret")))
    if self_msg:
        slot, text = self_msg
        x, y = SLOTS[slot], last + 24
        body.append(
            f'<path class="dg-ln dg-fail" d="M {x},{y} H {x+28} Q {x+34},{y} {x+34},{y+6} V {y+14} Q {x+34},{y+20} {x+28},{y+20} H {x}" marker-end="url(#{pid}-f)"/>'
            f'<text class="m dg-lbl dg-lbl-fail" x="{x+46}" y="{y+14}">{escape(text)}</text>'
        )
    acts = "".join(node(SLOTS[s] - 72, top, 144, ah, n, sub, k) for s, n, sub, k in actors)
    legend = (
        f'<line class="dg-rule" x1="0" y1="{leg_y-12}" x2="{W}" y2="{leg_y-12}"/>'
        f'<line class="dg-ln" x1="0" y1="{leg_y+6}" x2="24" y2="{leg_y+6}" marker-end="url(#{pid}-a)"/><text class="m dg-lbl" x="34" y="{leg_y+9}">{legend_txt[0]}</text>'
        f'<line class="dg-ln-soft dg-dash" x1="130" y1="{leg_y+6}" x2="154" y2="{leg_y+6}" marker-end="url(#{pid}-s)"/><text class="m dg-lbl" x="164" y="{leg_y+9}">{legend_txt[1]}</text>'
        f'<line class="dg-ln dg-fail" x1="260" y1="{leg_y+6}" x2="284" y2="{leg_y+6}" marker-end="url(#{pid}-f)"/><text class="m dg-lbl dg-lbl-fail" x="294" y="{leg_y+9}">{legend_txt[2]}</text>'
    )
    return head(pid, h, title, desc) + life + "".join(body) + acts + legend + "</svg>\n"


T = {
    "pt": dict(
        suffix="",
        f1=("Colisão no baseline", "Sequência: catálogo e carrinho enviam o mesmo refresh token à API. O primeiro recebe tokens novos; o segundo recebe 401, e o carrinho apaga a sessão do storage."),
        f2=("Um refresh com patch ou módulo", "Sequência: catálogo e carrinho chamam a camada de auth, que faz um único refresh, repete as duas requests com o token novo e devolve as respostas."),
        f3=("Onde a lógica de refresh mora", "Três colunas: no baseline cada MFE tem a própria lógica de refresh e a API recebe três refreshes; no patch o shell envolve window.fetch e a API recebe um; no módulo compartilhado cada MFE importa o authFetch e a API recebe um."),
        cat="MFE catálogo", cart="MFE carrinho", nologic="sem lógica de refresh", auth="Camada de auth", authsub="patch ou authFetch",
        m=dict(refresh="REFRESH RT1", ok="200 · RT2", reused="401 REUSADO", save="SALVA RT2", wipe="APAGA SESSÃO", logout="LOGOUT", fetch="FETCH", one="1× REFRESH", replay="REPLAY 2×", r200="200"),
        legend=("CHAMADA", "RESPOSTA", "FALHA"),
        cols=[("BASELINE", "lógica duplicada em cada MFE", "3 refreshes por abertura"), ("PATCH NO SHELL", "lógica no shell, invisível aos MFEs", "1 refresh"), ("MÓDULO COMPARTILHADO", "módulo importado por cada MFE", "1 refresh")],
        bars=(("window.fetch", "refresh único + replay"), ("authFetch", "módulo no import map")),
    ),
    "en": dict(
        suffix=".en",
        f1=("Collision in the baseline", "Sequence: catalog and cart send the same refresh token to the API. The first gets new tokens; the second gets 401, and the cart wipes the session from storage."),
        f2=("One refresh with the patch or the module", "Sequence: catalog and cart call the auth layer, which makes a single refresh, replays both requests with the new token and returns the responses."),
        f3=("Where the refresh logic lives", "Three columns: in the baseline each MFE has its own refresh logic and the API receives three refreshes; with the patch the shell wraps window.fetch and the API receives one; with the shared module each MFE imports authFetch and the API receives one."),
        cat="MFE catalog", cart="MFE cart", nologic="no refresh logic", auth="Auth layer", authsub="patch or authFetch",
        m=dict(refresh="REFRESH RT1", ok="200 · RT2", reused="401 REUSED", save="SAVE RT2", wipe="CLEAR SESSION", logout="LOGOUT", fetch="FETCH", one="1× REFRESH", replay="REPLAY 2×", r200="200"),
        legend=("CALL", "RESPONSE", "FAILURE"),
        cols=[("BASELINE", "logic duplicated in each MFE", "3 refreshes per load"), ("PATCH IN THE SHELL", "logic in the shell, MFEs unaware", "1 refresh"), ("SHARED MODULE", "module imported by each MFE", "1 refresh")],
        bars=(("window.fetch", "single refresh + replay"), ("authFetch", "module in the import map")),
    ),
}


def fig1(t):
    m = t["m"]
    return sequence(
        "dg1", *t["f1"],
        [(0, t["cat"], "authLink + refresh", "node"), (1, t["cart"], "authLink + refresh", "node"), (2, "localStorage", "access + refresh", "store"), (3, "API", "node · graphql · jwt", "node")],
        [(0, 3, m["refresh"], "call"), (1, 3, m["refresh"], "call"), (3, 0, m["ok"], "ret"), (3, 1, m["reused"], "failret"), (0, 2, m["save"], "call"), (1, 2, m["wipe"], "fail")],
        self_msg=(1, m["logout"]), legend_txt=t["legend"],
    )


def fig2(t):
    m = t["m"]
    return sequence(
        "dg2", *t["f2"],
        [(0, t["cat"], t["nologic"], "node"), (1, t["cart"], t["nologic"], "node"), (2, t["auth"], t["authsub"], "focal"), (3, "API", "node · graphql · jwt", "node")],
        [(0, 2, m["fetch"], "call"), (1, 2, m["fetch"], "call"), (2, 3, m["one"], "strong"), (3, 2, m["ok"], "ret"), (2, 3, m["replay"], "call"), (2, 0, m["r200"], "ret"), (2, 1, m["r200"], "ret")],
        legend_txt=t["legend"],
    )


def fig3(t):
    h = 392
    cols = [(0,) + t["cols"][0], (248,) + t["cols"][1], (496,) + t["cols"][2]]
    out = [head("dg3", h, *t["f3"])]
    for ci, (x0, title, foot, api_sub) in enumerate(cols):
        out.append(f'<text class="m dg-eyebrow" x="{x0}" y="18">{title}</text><line class="dg-rule" x1="{x0}" y1="28" x2="{x0+224}" y2="28"/>')
        centers = []
        for i in range(3):
            bx = x0 + i * 80
            centers.append(bx + 32)
            out.append(f'<rect class="dg-node" x="{bx}" y="48" width="64" height="60"/><text class="dg-name" x="{bx+32}" y="70" text-anchor="middle" style="font-size:12px">MFE {"ABC"[i]}</text>')
            if ci == 0:
                out.append(f'<rect class="dg-chip-solid" x="{bx+4}" y="80" width="56" height="18"/><text class="m dg-sub dg-sub-f" x="{bx+32}" y="92.5" text-anchor="middle" style="font-size:10px">refresh</text>')
            elif ci == 1:
                out.append(f'<text class="m dg-sub" x="{bx+32}" y="92" text-anchor="middle" style="font-size:10px">fetch</text>')
            else:
                out.append(f'<rect class="dg-chip" x="{bx+4}" y="80" width="56" height="18"/><text class="m dg-name" x="{bx+32}" y="92.5" text-anchor="middle" style="font-size:10px;font-weight:500">authFetch</text>')
        api_y = 288
        if ci == 0:
            for c in centers:
                out.append(f'<line class="dg-ln" x1="{c}" y1="108" x2="{c}" y2="{api_y}" marker-end="url(#dg3-a)"/>')
        else:
            kind = "dg-ln-soft dg-dash" if ci == 1 else "dg-ln"
            mk = "s" if ci == 1 else "a"
            for c in centers:
                out.append(f'<line class="{kind}" x1="{c}" y1="108" x2="{c}" y2="156" marker-end="url(#dg3-{mk})"/>')
            name, sub = t["bars"][ci - 1]
            out.append(node(x0, 156, 224, 44, name, sub, "focal"))
            out.append(f'<line class="dg-ln-strong" x1="{x0+112}" y1="200" x2="{x0+112}" y2="{api_y}" marker-end="url(#dg3-a)"/>')
        out.append(node(x0, api_y, 224, 48, "API", api_sub, "node"))
        out.append(f'<line class="dg-rule" x1="{x0}" y1="352" x2="{x0+224}" y2="352"/><text class="m dg-cap" x="{x0}" y="372">{escape(foot)}</text>')
    out.append("</svg>\n")
    return "".join(out)


os.makedirs(OUT, exist_ok=True)
for lang, t in T.items():
    for name, svg in ((f"fig-colisao-baseline{t['suffix']}.svg", fig1(t)), (f"fig-refresh-unico{t['suffix']}.svg", fig2(t)), (f"fig-onde-a-logica-mora{t['suffix']}.svg", fig3(t))):
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
            f.write(svg)
        print("ok", name, len(svg))
