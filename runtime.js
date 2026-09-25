/* Fitbook standalone runtime: renders the .dc.html template with Preact. */
(function () {
  var h = preact.h, render = preact.render;
  var VOID = { input: 1, img: 1, meta: 1, link: 1, br: 1, hr: 1, source: 1, area: 1, col: 1, wbr: 1 };

  function parse(src) {
    var root = { tag: '#root', attrs: [], children: [] }, stack = [root], i = 0, n = src.length;
    var tagRe = /<\/?([A-Za-z][\w:-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>/y;
    var attrRe = /([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    while (i < n) {
      if (src.startsWith('<!--', i)) { var e = src.indexOf('-->', i); i = e < 0 ? n : e + 3; continue; }
      if (src[i] === '<') {
        tagRe.lastIndex = i;
        var m = tagRe.exec(src);
        if (m) {
          var closing = src[i + 1] === '/';
          var tag = m[1];
          if (closing) {
            for (var k = stack.length - 1; k > 0; k--) { if (stack[k].tag === tag) { stack.length = k; break; } }
          } else {
            var attrs = [], a; attrRe.lastIndex = 0;
            while ((a = attrRe.exec(m[2]))) attrs.push([a[1], a[2] !== undefined ? a[2] : a[3] !== undefined ? a[3] : a[4] !== undefined ? a[4] : '']);
            var node = { tag: tag, attrs: attrs, children: [] };
            stack[stack.length - 1].children.push(node);
            if (!m[3] && !VOID[tag.toLowerCase()]) {
              if (tag === 'style' || tag === 'script') {
                var end = src.indexOf('</' + tag + '>', tagRe.lastIndex);
                node.children.push({ text: src.slice(tagRe.lastIndex, end) });
                i = end + tag.length + 3; continue;
              }
              stack.push(node);
            }
          }
          i = tagRe.lastIndex; continue;
        }
      }
      var nx = src.indexOf('<', i + 1); if (nx < 0) nx = n;
      var txt = src.slice(i, nx);
      stack[stack.length - 1].children.push({ text: decode(txt) });
      i = nx;
    }
    return root;
  }
  var ta = document.createElement('textarea');
  function decode(s) { if (s.indexOf('&') < 0) return s; ta.innerHTML = s; return ta.value; }

  function lookup(path, scope) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false; if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.'), v;
    for (var s = scope; s; s = s.parent) { if (parts[0] in s.vars) { v = s.vars[parts[0]]; break; } }
    for (var j = 1; j < parts.length && v != null; j++) v = v[parts[j]];
    return v;
  }
  var holeOnly = /^\s*\{\{([^}]+)\}\}\s*$/, holeAny = /\{\{([^}]+)\}\}/g;
  function val(str, scope) {
    var m = holeOnly.exec(str);
    if (m) return lookup(m[1], scope);
    if (str.indexOf('{{') < 0) return decode(str);
    return decode(str.replace(holeAny, function (_, p) { var v = lookup(p, scope); return v == null ? '' : String(v); }));
  }
  var RENAME = { 'class': 'class', 'for': 'for' };
  function toVNodes(node, scope, inSvg) {
    if (node.text !== undefined) {
      if (node.text.indexOf('{{') < 0) return node.text;
      return node.text.replace(holeAny, function (_, p) { var v = lookup(p, scope); return v == null ? '' : String(v); });
    }
    var tag = node.tag, attrs = node.attrs, i;
    if (tag === 'sc-if') {
      var cond = null;
      for (i = 0; i < attrs.length; i++) if (attrs[i][0] === 'value') cond = val(attrs[i][1], scope);
      return cond ? kids(node, scope, inSvg) : null;
    }
    if (tag === 'sc-for') {
      var list = [], as = 'item';
      for (i = 0; i < attrs.length; i++) { if (attrs[i][0] === 'list') list = val(attrs[i][1], scope) || []; if (attrs[i][0] === 'as') as = attrs[i][1]; }
      var out = [];
      for (var j = 0; j < list.length; j++) { var vars = { $index: j }; vars[as] = list[j]; out.push(kids(node, { vars: vars, parent: scope }, inSvg)); }
      return out;
    }
    if (tag === 'helmet') return null;
    var props = {}, svg = inSvg || tag === 'svg';
    for (i = 0; i < attrs.length; i++) {
      var name = attrs[i][0], raw = attrs[i][1];
      if (name.indexOf('hint-') === 0) continue;
      var v = val(raw, scope);
      if (/^on[A-Z]/.test(name)) {
        var ev = name;
        if (name === 'onChange' && (tag === 'input' || tag === 'textarea')) {
          var type = ''; for (var t = 0; t < attrs.length; t++) if (attrs[t][0] === 'type') type = attrs[t][1];
          if (type !== 'checkbox' && type !== 'radio' && type !== 'date') ev = 'onInput';
        }
        props[ev.toLowerCase()] = typeof v === 'function' ? v : undefined;
        continue;
      }
      props[RENAME[name] || name] = v;
    }
    if (tag === 'textarea' && props.value === undefined) {}
    return h(tag, props, kids(node, scope, svg));
  }
  function kids(node, scope, inSvg) {
    var out = [];
    for (var i = 0; i < node.children.length; i++) out.push(toVNodes(node.children[i], scope, inSvg));
    return out;
  }

  window.DCLogic = function DCLogic(props) { this.props = props || {}; this.state = {}; };
  DCLogic.prototype.setState = function (p) {
    var patch = typeof p === 'function' ? p(this.state, this.props) : p;
    this.state = Object.assign({}, this.state, patch);
    this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { this.__schedule(); };

  window.mountDC = function (source, el) {
    var body = source.slice(source.indexOf('<x-dc>') + 6, source.indexOf('</x-dc>'));
    var tree = parse(body);
    // helmet -> head
    tree.children.forEach(function (c) {
      if (c.tag !== 'helmet') return;
      c.children.forEach(function (hc) {
        if (!hc.tag) return;
        var e = document.createElement(hc.tag);
        hc.attrs.forEach(function (a) { e.setAttribute(a[0], decode(a[1])); });
        if (hc.children[0] && hc.children[0].text) e.textContent = hc.children[0].text;
        document.head.appendChild(e);
      });
    });
    var sm = /<script type="text\/x-dc"[^>]*>([\s\S]*?)<\/script>/.exec(source);
    var Component = new Function('DCLogic', sm[1] + '\n;return Component;')(window.DCLogic);
    var inst = new Component({});
    var queued = false;
    function draw() {
      queued = false;
      var vals;
      try { vals = inst.renderVals(); } catch (e) { console.error(e); return; }
      render(h('div', { style: 'display: contents' }, kids(tree, { vars: vals, parent: null }, false)), el);
    }
    inst.__schedule = function () { if (queued) return; queued = true; (window.requestAnimationFrame || setTimeout)(draw); };
    draw();
    if (inst.componentDidMount) inst.componentDidMount();
    return inst;
  };
})();
