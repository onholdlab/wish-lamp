// 規格（2026-11-15）：許願神燈的正式網址是 https://onholdlab.com/wish-lamp/。
// 分享卡片（og:url、og:image、twitter:image）與 canonical 都指向正式網址；
// 從舊網址 onholdlab.github.io 打開時，自動轉到正式網址，保留 ?query 與 #hash。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const BASE = 'https://onholdlab.com/wish-lamp/';
const meta = re => (html.match(re) || [])[1];

test('og:url 指向 onholdlab.com', () => {
  assert.equal(meta(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i), BASE);
});
test('og:image 與 twitter:image 指向 onholdlab.com', () => {
  assert.equal(meta(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i), BASE + 'og.png');
  assert.equal(meta(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i), BASE + 'og.png');
});
test('有 canonical 指向 onholdlab.com', () => {
  assert.equal(meta(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i), BASE);
});

test('遊戲內分享與複製連結使用 canonical，即使頁面是預覽網址', () => {
  const declaration = html.match(/^const SHARE=[^\r\n]+$/m)?.[0];
  assert.ok(declaration, '找不到 SHARE 宣告');
  const location = { origin: 'https://preview.example', pathname: '/index.html' };
  const document = { querySelector(selector) {
    assert.equal(selector, 'link[rel="canonical"]');
    return { href: BASE };
  } };
  assert.equal(vm.runInNewContext(declaration + '\nSHARE', { location, document }), BASE);
});

function runRedirect(host, search = '', hash = '') {
  const m = html.match(/<script id=["']own-domain["']>([\s\S]*?)<\/script>/i);
  assert.ok(m, '找不到 <script id="own-domain">');
  let target = null;
  const location = { hostname: host, search, hash, replace: u => { target = u; } };
  vm.runInNewContext(m[1], { location });
  return target;
}
test('從 onholdlab.github.io 打開會轉到 onholdlab.com，保留 query 與 hash', () => {
  assert.equal(runRedirect('onholdlab.github.io', '?lang=en', '#x'), BASE + '?lang=en#x');
});
test('在 onholdlab.com 與本機打開不轉址', () => {
  assert.equal(runRedirect('onholdlab.com'), null);
  assert.equal(runRedirect('localhost'), null);
});
