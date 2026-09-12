import axios from 'axios'
import https from 'https'
import { randomUUID } from 'crypto'

const agent = new https.Agent({
    rejectUnauthorized: true,
    maxVersion: 'TLSv1.3',
    minVersion: 'TLSv1.2'
})

const SIG = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LVZlcmlmaWNhdGlvblNpZ25hdHVyZS5NZXRhZGF0YcN55YRyad2+ZA=="
const CERT1 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGEOvtJr968bbpKdZreOTwkk9aPN++XPE60RfuzNLkXXc7LE8BOkJOWRpo2oNXaRJ3uCNJ43HY3A+oetnvHSfcxWqmvvTSrBOI5V1NOD6RMsZ/st1XVPUx83AGps1l5jYBOYzqMNy6un2tToJ2Bt9bXRo29tWLZTu8m7TNY/hISwVpVc5tjSet5U7btPN+dMIx2UvykB1jcbWGsdklheeuz8RXSStNXzeaGvsf1lpZ/ugLE4b2BdmlRNKrY6zLE4qFtRYQoS7axOyQX+4QUyN2m9bfm7urQmn+QRSXJwMO7X5kAJJLbkVGJFt9Pm9VXPwQVrK2aaqiXlpusj+7DfDw00OULmYMmZDTqXM0nUVLxj13z0LhMQoQhhNG8utdUn4uKOFceliTZ/xiP+A54GnX9620641bqw3ctfh9NNXPsTEK8hAUD7FDqUhVntHmoEYYEHq8X1tHHZYP49/f2iezTiE8AUaoZo42/jIWQIKohOGNUib2hEqMkW8NsR8vPihvNuqPc0zKZcl6359YFQdjiiW8kCRD/rsDOr9v1eYLFZKYloFyzFqEgj+jcG/V47elOjShJ5CCPwatXwP6HIloVwtgygFsnOFmCg4Ojoivfoz8Nw1qxFwg5OU2cq/1WbWNELKnaFg4eUWCAIJ/3ZIJsEPkgemZxGhE+hdiNn9dkQYBJs1kx2BxdIkJmQ9vJSKkrMz6lTxZM3IJ9mhmKS6zYdU1ppeAao0/ayte997DQParb/AHLN79g0iW1ad0z8ir5jAl0q3a+UZPTSa4YiSqC2PZ/gfxG5wvL2mKmeKowG0RXjmEp5iNxrni+T/HRLZOoH7y0DQ24nMCPg"
const CERT2 = "TklYRUwuTWVzc2FnZUJ1aWxkZXJWNC43LUNlcnRpZmljYXRlQ2hhaW4uTWV0YWRhdGHsL0Ccm0ELINFZ2IaBhKaeWnVuh0o6nZLCioCn9xpSADzwIS5VCWO+1eVXT2atJOyf7FYlpB0/JA3Us+aQtekuIkHu/zBXijORZ4ClF4+sF3cSTNg6gY/+6iwLK/zs3bMg+GeJrcI65vXfs95Shxlb2Rd5GRT2/2yBmR6Zkf5QwMJuptUHWtM26WY7/xlkEKGFYDZVqOSylusiOzSALa815zC6dCiHoJNLBEKMlaZZQOk57/+OYoU5zzTaEgLhyvNFHSyAlyLQ3SGFtVHAaJZHSmmSPyJowCOB+92Gkk6SWVMsk6FbU8QJWFtlhzV/W/gZ7WzUlS/AKgN0th9/cq20ToFkW7X9c+rtYavufmuieqFhXgaMD8AGsoN9QC/HzNC9D1nydPfFYEUr9BHVy2nF5gM58Y59r2rT8p5LPARIkUp8g+5DLhyW0tdZFZ1305o4AHCayZnp5rjcU2Xi/c1Qf/djBGakmijlMs4aMzKJYD0c4Q8jdI7sNyd876K2wRD+L6KeD2QB3PtCS4P7BWAl5gh5CJ6ZBrwcaKXZqcSjEwm52MqVCgYZdapAaNYUy/QndttjLOG0wxxwuX1hIhMjPnIKZR1kwnqD5EqlHpilrnojRZvjVGN4zEKmilS8rNstt4HHs/D849W+Q6LRVWiWMs0T2IugrX+Skxd8En7Gq52UEmuVBrSTpN+UpIu20NsVb9lsvuYh3XO441606tOEY2eKcZJdTtqrOTNqbbTk0zVn1yhbOCvmfctBNDhTwaC5QMi0P9wjU5XI9SBtkdQLizc5oqpoiHeqgb8+aJHVLcbgIJ/KLZKtRWFDfzRNM02Csx4etUUapVd2NA/L0oMs/O5T9sVj9FBJ7q99GWr3PVmxJb36mHZLXC4k1gGN9swE0LtzYsUdT5tUo9ri/hS3W/SM+F1p4Kh4QIgRcG3ciIHGN44bnDh3HDCz0fDnzKYw0bclMxZPctEyJ5gEOPF6OAkjD9dEaRGq/tEPf1k9Aub+v2dEjnfrYWAm4E5Zfhs2Xh0CT0k+SzhgKd0K/46ChJ20G5+blwpIvahvTVS68+aVIX6CwXs4tcVx6FnmVsMOOkIasfaqQLZYbNBkuLoZnQAq4j8yRekrQ=="

async function getCookies() {
    try {
        const response = await axios.get('https://www.pinterest.com/csrf_error/', { httpsAgent: agent, timeout: 12000 })
        const setCookieHeaders = response.headers['set-cookie']
        if (!setCookieHeaders) return null
        return setCookieHeaders.map(v => v.split(';')[0].trim()).join('; ')
    } catch {
        return null
    }
}

async function pinterest(query, poolSize = 150) {
    try {
        const cookies = await getCookies()
        if (!cookies) return []
        const url = 'https://www.pinterest.com/resource/BaseSearchResource/get/'
        const headers = {
            accept: 'application/json, text/javascript, */*, q=0.01',
            'accept-language': 'en-US,en;q=0.9',
            cookie: cookies,
            referer: 'https://www.pinterest.com/',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36',
            'x-app-version': 'c056fb7',
            'x-pinterest-appstate': 'active',
            'x-pinterest-pws-handler': 'www/[username]/[slug].js',
            'x-pinterest-source-url': '/search/pins/',
            'x-requested-with': 'XMLHttpRequest'
        }

        const pool = []
        const seenIds = new Set()
        let bookmark = null

        // Ambil beberapa halaman (bukan cuma halaman pertama) pake fitur
        // pagination "bookmark" bawaan Pinterest, biar poolnya gede dan gak
        // itu-itu aja tiap kali di-search ulang dengan keyword yang sama.
        for (let page = 0; page < 6 && pool.length < poolSize; page++) {
            const options = { isPrefetch: false, query, scope: 'pins', no_fetch_context_on_resource: false }
            if (bookmark) options.bookmarks = [bookmark]

            const params = {
                source_url: `/search/pins/?q=${encodeURIComponent(query)}`,
                data: JSON.stringify({ options, context: {} }),
                _: Date.now()
            }

            const { data } = await axios.get(url, { httpsAgent: agent, headers, params, timeout: 15000 })
            const results = data?.resource_response?.data?.results || []

            for (const v of results) {
                if (!v?.images?.orig?.url || !v?.id || seenIds.has(v.id)) continue
                seenIds.add(v.id)
                pool.push({
                    id: v.id,
                    fullname: v?.pinner?.full_name || v?.pinner?.username || 'Pinterest',
                    username: v?.pinner?.username || '',
                    caption: v?.grid_title || v?.title || 'Pinterest image',
                    image: v.images.orig.url,
                    preview: v?.images?.['474x']?.url || v?.images?.['564x']?.url || v?.images?.['736x']?.url || v?.images?.['236x']?.url || v.images.orig.url,
                    source: `https://www.pinterest.com/pin/${v.id}/`
                })
            }

            bookmark = data?.resource_response?.bookmark
            if (!bookmark || bookmark === '-end-' || results.length === 0) break
        }

        return pool
    } catch {
        return []
    }
}

function shuffle(arr) {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

async function fetchImage(url) {
    try {
        const response = await axios.get(url, {
            httpsAgent: agent,
            responseType: 'arraybuffer',
            timeout: 20000,
            maxContentLength: 12 * 1024 * 1024,
            headers: {
                accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                referer: 'https://www.pinterest.com/',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/133.0.0.0 Safari/537.36'
            }
        })
        const type = String(response.headers['content-type'] || 'image/jpeg').split(';')[0]
        if (!type.startsWith('image/')) return null
        return { buffer: Buffer.from(response.data), mimetype: type }
    } catch {
        return null
    }
}

function esc(value) {
    return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

const STOPWORDS = new Set(['dan', 'yang', 'di', 'ke', 'dari', 'the', 'and', 'for', 'with', 'a', 'an', 'of', 'in', 'on', 'to', 'is', 'jkt48', 'pinterest', 'image'])

// Ambil kata-kata yang beneran sering muncul di caption hasil fetch, biar
// chip yang ditampilkan dijamin punya hasil kalau di-klik (bukan chip
// dekoratif kosongan kayak sebelumnya).
function buatChipDariPool(query, pool) {
    const freq = new Map()
    for (const item of pool) {
        const kata = String(item.caption || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []
        for (const k of kata) {
            if (STOPWORDS.has(k) || k === query.toLowerCase()) continue
            freq.set(k, (freq.get(k) || 0) + 1)
        }
    }
    const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k]) => k)
    return top.length ? top : [query]
}

// Budget ukuran total base64 gabungan biar payload HTML gak meledak -
// makin banyak item yang di-embed, makin gede base64-nya.
const BUDGET_BYTES = 7 * 1024 * 1024

async function prepareMedia(pool, budgetBytes = BUDGET_BYTES) {
    const embedded = []
    let used = 0
    for (const item of pool) {
        if (used >= budgetBytes) break
        const media = await fetchImage(item.preview || item.image)
        if (!media) continue
        const base64 = media.buffer.toString('base64')
        if (used + base64.length > budgetBytes && embedded.length > 0) break
        used += base64.length
        embedded.push({
            id: item.id,
            caption: item.caption,
            user: item.fullname + (item.username ? ` · @${item.username}` : ''),
            sourceUrl: item.source,
            dataUri: `data:${media.mimetype};base64,${base64}`,
            mimetype: media.mimetype
        })
    }
    return embedded
}

function makeHtml(query, items, chips) {
    const safeData = JSON.stringify(items).replace(/</g, '\\u003c').replace(/-->/g, '--\\u003e')
    const chipData = JSON.stringify(chips).replace(/</g, '\\u003c')

    return `<style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#121212;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;-webkit-tap-highlight-color:transparent;overflow:hidden}
#app{width:100%;max-width:500px;margin:auto;padding:12px;background:#121212;display:flex;flex-direction:column;border-radius:20px;user-select:none}
.header-brand{display:flex;align-items:center;gap:6px;margin-bottom:8px;color:#aaa;font-size:12px;font-weight:600}
.header-brand span.logo{color:#e60023;font-size:16px;font-weight:bold}
.search-box{display:flex;gap:6px;margin-bottom:4px}
.search-input{flex:1;background:#262626;border:none;border-radius:18px;padding:6px 12px;color:#fff;font-size:12px;outline:none}
.search-btn{background:#e60023;color:#fff;border:none;border-radius:18px;padding:0 12px;font-weight:bold;font-size:11px;cursor:pointer}
.search-hint{font-size:9.5px;color:#777;margin-bottom:8px;line-height:1.3}
.chips-container{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:8px;scrollbar-width:none;touch-action:pan-x;-webkit-overflow-scrolling:touch}
.chips-container::-webkit-scrollbar{display:none}
.chip{background:#262626;color:#e0e0e0;padding:4px 10px;border-radius:12px;font-size:11px;white-space:nowrap;font-weight:500;cursor:pointer}
.chip.active{background:#e60023;color:#fff}
.grid-view{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;touch-action:pan-x;min-height:120px}
.empty-state{grid-column:span 2;text-align:center;color:#777;font-size:12px;padding:30px 0}
.card{border-radius:14px;overflow:hidden;background:#1e1e1e;cursor:pointer;position:relative}
.card img{width:100%;display:block;border-radius:14px;object-fit:cover;aspect-ratio:9/16}
.card-cap{position:absolute;bottom:0;left:0;right:0;padding:16px 6px 6px;background:linear-gradient(transparent,rgba(0,0,0,0.85));font-size:10px;line-height:1.2;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:#eee}
.pagination{display:flex;align-items:center;justify-content:space-between;background:#1e1e1e;padding:6px 12px;border-radius:16px}
.page-btn{background:#e60023;color:#fff;border:none;padding:6px 14px;border-radius:12px;font-weight:bold;font-size:12px;cursor:pointer}
.page-btn:disabled{background:#333;color:#666;cursor:not-allowed}
.page-info{font-size:12px;font-weight:600;color:#ccc}
.modal{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.92);z-index:9999;display:none;flex-direction:column;align-items:center;justify-content:center;padding:12px}
.modal.active{display:flex}
.modal-card{width:100%;max-width:300px;background:#1e1e1e;border-radius:20px;overflow:hidden;position:relative;display:flex;flex-direction:column}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#262626;font-size:12px;font-weight:bold;color:#ccc}
.modal-actions{display:flex;gap:10px;align-items:center}
.icon-btn{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;padding:2px;text-decoration:none;display:flex;align-items:center}
.modal-img-wrapper{position:relative;width:100%;height:380px;background:#000;display:flex;align-items:center;justify-content:center}
.modal-img-wrapper img{width:100%;height:100%;object-fit:contain}
.modal-nav{position:absolute;right:8px;bottom:8px;display:flex;flex-direction:column;gap:6px}
.nav-arrow{background:rgba(0,0,0,0.6);border:none;color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer}
.modal-footer{padding:10px 14px;font-size:11px;color:#aaa}
.modal-cap{color:#fff;font-size:12px;font-weight:600;margin-bottom:2px}
.copy-toast{position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#e60023;color:#fff;padding:6px 14px;border-radius:16px;font-size:11px;font-weight:bold;display:none;z-index:10000}
</style>

<div id="app">
<div class="header-brand"><span class="logo">P</span> Pinterest • ${esc(query)}</div>
<div class="search-box">
<input type="text" class="search-input" id="search-input" placeholder="Cari di ${items.length} gambar yang sudah dimuat..." />
<button class="search-btn" id="search-btn">Cari</button>
</div>
<div class="search-hint">Filter di antara gambar yang sudah di-load. Buat topik baru, kirim <b>.pinz &lt;kata kunci&gt;</b> lagi di chat.</div>
<div class="chips-container" id="chips"></div>
<div class="grid-view" id="grid"></div>
<div class="pagination">
<button class="page-btn" id="btn-prev">◀ Prev</button>
<span class="page-info" id="page-info">1 / 1</span>
<button class="page-btn" id="btn-next">Next ▶</button>
</div>
</div>

<div class="modal" id="modal">
<div class="modal-card">
<div class="modal-header">
<span id="modal-index">1 / 1</span>
<div class="modal-actions">
<a class="icon-btn" id="btn-download" title="Simpan Gambar" download="pinterest.jpg">⬇️</a>
<button class="icon-btn" id="btn-close" title="Tutup">✕</button>
</div>
</div>
<div class="modal-img-wrapper">
<img id="modal-img" src="" alt="" />
<div class="modal-nav">
<button class="nav-arrow" id="nav-up">▲</button>
<button class="nav-arrow" id="nav-down">▼</button>
</div>
</div>
<div class="modal-footer">
<div class="modal-cap" id="modal-cap"></div>
<div id="modal-user"></div>
</div>
</div>
</div>

<div class="copy-toast" id="toast">Tersimpan ke galeri!</div>

<script>
(function(){
var allItems = ${safeData};
var chips = ${chipData};
var filteredItems = allItems.slice();
var pageSize = 4;
var currentPage = 0;
var totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
var activeChip = null;

var grid = document.getElementById('grid');
var btnPrev = document.getElementById('btn-prev');
var btnNext = document.getElementById('btn-next');
var pageInfo = document.getElementById('page-info');
var searchInput = document.getElementById('search-input');
var searchBtn = document.getElementById('search-btn');
var chipsContainer = document.getElementById('chips');

var modal = document.getElementById('modal');
var modalImg = document.getElementById('modal-img');
var modalIndex = document.getElementById('modal-index');
var modalCap = document.getElementById('modal-cap');
var modalUser = document.getElementById('modal-user');
var btnDownload = document.getElementById('btn-download');
var currentIndex = 0;

function renderChips(){
    chipsContainer.innerHTML = chips.map(function(c){
        var cls = 'chip' + (c === activeChip ? ' active' : '');
        return '<div class="' + cls + '" data-chip="' + c.replace(/"/g,'') + '">' + c + '</div>';
    }).join('');
    Array.prototype.forEach.call(chipsContainer.querySelectorAll('.chip'), function(el){
        el.onclick = function(){
            var val = el.getAttribute('data-chip');
            if (activeChip === val) { activeChip = null; searchInput.value = ''; applyFilter(''); }
            else { activeChip = val; searchInput.value = val; applyFilter(val); }
            renderChips();
        };
    });
}

function applyFilter(q){
    q = (q || '').trim().toLowerCase();
    filteredItems = !q ? allItems.slice() : allItems.filter(function(it){
        return (it.caption || '').toLowerCase().indexOf(q) !== -1 || (it.user || '').toLowerCase().indexOf(q) !== -1;
    });
    currentPage = 0;
    totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
    renderPage();
}

function renderPage(){
    if (!filteredItems.length) {
        grid.innerHTML = '<div class="empty-state">Gak ada yang cocok. Coba kata lain atau reset filter.</div>';
        pageInfo.textContent = '0 / 0';
        btnPrev.disabled = true;
        btnNext.disabled = true;
        return;
    }
    var start = currentPage * pageSize;
    var end = Math.min(start + pageSize, filteredItems.length);
    var pageItems = filteredItems.slice(start, end);

    grid.innerHTML = pageItems.map(function(item, idx){
        var realIndex = start + idx;
        return '<div class="card" data-idx="' + realIndex + '">' +
            '<img src="' + item.dataUri + '" loading="lazy" />' +
            '<div class="card-cap">' + (item.caption || '') + '</div>' +
            '</div>';
    }).join('');
    Array.prototype.forEach.call(grid.querySelectorAll('.card'), function(el){
        el.onclick = function(){ openModal(Number(el.getAttribute('data-idx'))); };
    });

    pageInfo.textContent = (currentPage + 1) + ' / ' + totalPages;
    btnPrev.disabled = currentPage === 0;
    btnNext.disabled = currentPage >= totalPages - 1;
}

btnPrev.onclick = function(){ if (currentPage > 0) { currentPage--; renderPage(); } };
btnNext.onclick = function(){ if (currentPage < totalPages - 1) { currentPage++; renderPage(); } };
searchBtn.onclick = function(){ activeChip = null; renderChips(); applyFilter(searchInput.value); };
searchInput.addEventListener('keydown', function(e){
    if (e.key === 'Enter') { activeChip = null; renderChips(); applyFilter(searchInput.value); }
});

var touchStartX = 0, touchEndX = 0;
grid.addEventListener('touchstart', function(e){ touchStartX = e.changedTouches[0].screenX; }, {passive: true});
grid.addEventListener('touchend', function(e){ touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, {passive: true});
function handleSwipe(){
    var t = 50;
    if (touchEndX < touchStartX - t && currentPage < totalPages - 1) { currentPage++; renderPage(); }
    if (touchEndX > touchStartX + t && currentPage > 0) { currentPage--; renderPage(); }
}

window.openModal = function(idx){
    currentIndex = idx;
    updateModal();
    modal.classList.add('active');
};

function extFromMime(mime){
    if (!mime) return 'jpg';
    if (mime.indexOf('png') !== -1) return 'png';
    if (mime.indexOf('webp') !== -1) return 'webp';
    return 'jpg';
}

function updateModal(){
    var item = filteredItems[currentIndex];
    modalImg.src = item.dataUri;
    modalIndex.textContent = (currentIndex + 1) + ' / ' + filteredItems.length;
    modalCap.textContent = item.caption || '';
    modalUser.textContent = item.user || '';
    btnDownload.href = item.dataUri;
    btnDownload.setAttribute('download', 'pinterest_' + item.id + '.' + extFromMime(item.mimetype));
}

document.getElementById('btn-close').onclick = function(){ modal.classList.remove('active'); };
document.getElementById('nav-up').onclick = function(){ if (currentIndex > 0) { currentIndex--; updateModal(); } };
document.getElementById('nav-down').onclick = function(){ if (currentIndex < filteredItems.length - 1) { currentIndex++; updateModal(); } };

btnDownload.addEventListener('click', function(){
    var toast = document.getElementById('toast');
    toast.style.display = 'block';
    setTimeout(function(){ toast.style.display = 'none'; }, 1800);
});

renderChips();
renderPage();
})();
</script>`
}

async function sendRichHtml(sock, chatId, html) {
    const data = Buffer.from(JSON.stringify({
        __typename: 'GenAIUnifiedResponse',
        response_id: randomUUID(),
        sections: [{ __typename: 'GenAIUnifiedResponseSection', view_model: { __typename: 'GenAISingleLayoutViewModel', primitive: { __typename: 'GenAIaeacdsnwHtmlPrimitive', payload: html, trusted_sources: [] } } }]
    })).toString('base64')
    return sock.relayMessage(chatId, {
        messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
            botMetadata: { messageDisclaimerText: '', botResponseId: randomUUID(), verificationMetadata: { proofs: [{ version: 1, useCase: 1, signature: SIG, certificateChain: [CERT1, CERT2] }] } }
        },
        botForwardedMessage: {
            message: {
                richResponseMessage: {
                    messageType: 1,
                    submessages: [{ messageType: 2, messageText: 'Pinterest Search' }],
                    unifiedResponse: { data },
                    contextInfo: { forwardingScore: 1, isForwarded: true, forwardedAiBotMessageInfo: { botJid: '867051314767696@bot' }, forwardOrigin: 4 }
                }
            }
        }
    }, {})
}

const pluginConfig = {
    name: 'pinz',
    alias: ['pintap', 'pingallery'],
    category: 'search',
    description: '📌 Cari gambar Pinterest, galeri interaktif (filter lokal + download langsung)',
    usage: '.pinz <query> [jumlah]',
    example: '.pinz furina 12',
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 10,
    energi: 1,
    isEnabled: true
}

const pinUrlRegex = /(https?:\/\/([a-zA-Z0-9-]+\.)?pinimg\.com\/[^\s]+|https?:\/\/(www\.)?pinterest\.com\/pin\/[^\s]+)/i

/**
 * Dipanggil dari handleSmartTriggers (src/handler.js) buat SETIAP pesan
 * yang bukan command. Kalau isi pesannya ada link Pinterest (pinimg.com
 * atau pinterest.com/pin/...), langsung download versi HD-nya dan
 * balas gambarnya -- gak perlu ketik command apapun.
 * @returns {Promise<boolean>} true kalau berhasil dibalas (biar handler stop di sini)
 */
async function checkPinterestLink(m, sock) {
    if (!m.body) return false
    const match = m.body.match(pinUrlRegex)
    if (!match) return false

    const media = await fetchImage(match[0])
    if (!media) return false

    await sock.sendMessage(m.chat, { image: media.buffer, caption: '✨ Berhasil mengunduh gambar Pinterest HD.' }, { quoted: m })
    return true
}

async function handler(m, { sock }) {
    const text = m.text
    if (!text?.trim()) return m.reply(`Penggunaan: ${m.prefix}${m.command} <query> [jumlah]\nContoh: ${m.prefix}${m.command} furina 30`)
    let input = text.trim()
    let count = 24
    const last = input.match(/(?:^|\s)(\d+)\s*$/)
    if (last) {
        count = Math.max(4, Math.min(40, Number(last[1])))
        input = input.slice(0, last.index).trim()
    }
    if (!input) return m.reply('Query Pinterest tidak boleh kosong.')
    try {
        await m.reply(`🔎 Mengambil gambar Pinterest untuk "${input}"...`)
        const pool = await pinterest(input, Math.max(80, count * 3))
        if (!pool.length) return m.reply(`Tidak ada hasil Pinterest untuk "${input}".`)

        const shuffled = shuffle(pool).slice(0, count)
        const items = await prepareMedia(shuffled)
        if (!items.length) return m.reply('Gagal mengambil gambar dari Pinterest, coba lagi.')

        const chips = buatChipDariPool(input, shuffled)
        await sendRichHtml(sock, m.chat, makeHtml(input, items, chips))
    } catch (e) {
        console.error('[Pinz]', e?.message || e)
        await m.reply('Gagal mengambil hasil Pinterest.')
    }
}

export { pluginConfig as config, handler, checkPinterestLink }