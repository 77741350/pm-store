// --- API configuration ---
  const API_BASE = window.API_BASE || '';
  const api = (path) => API_BASE + '/api' + path;
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const absAsset = (u) => u && !/^https?:/.test(u) ? API_BASE + u : u;
  function safeStorage(){
    try {
      var ls = window.localStorage;
      var p = { get: function(k){ try { return ls.getItem(k); } catch(e){ return null; } },
                set: function(k,v){ try { ls.setItem(k,v); } catch(e){} },
                del: function(k){ try { ls.removeItem(k); } catch(e){} } };
      return p;
    } catch (e) {
      return { get: function(){ return null; }, set: function(){}, del: function(){} };
    }
  }
  var store = safeStorage();

  // ---------- i18n ----------
  const I18N = {
    en: {
      siteTag:'SMART LIFE • CARE • HOME • INNOVATION',
      tick1:'FREE SHIPPING ON ORDERS OVER $50', tick2:'FAST DELIVERY ACROSS YEMEN', tick3:'SMART HOME INSTALLATION AVAILABLE',
      navSmart:'Smart Home', navElectronics:'Electronics', navAppliances:'Appliances', navCare:'Personal Care', navDeals:'Deals',
      heroEyebrow:'Smart Life · Care · Home · Innovation',
      heroH1A:'Smarter living', heroH1B:'starts', heroH1C:'here.',
      heroLede:'Smart home devices, everyday electronics, and personal care — chosen for reliability, set up the way it should be.',
      shopNow:'Shop now', whyUs:'Why PM Store',
      pillProducts:'products shipped monthly', pillWarranty:'original products, every order', pillCare:'customer care',
      payEyebrow:'Payment methods', payTitle:'Pay with Yemeni e-wallets.',
      featured:'Featured', picks:"This week's picks.", searchPh:'Search products…',
      newArrival:'New arrival', promoH:'Smart security cameras — up to 25% off.', promoP:'1080p night vision, two-way audio, and a companion app that actually works. Ships free.', shopSale:'Shop the sale',
      whyEyebrow:'Why PM Store', whyTitle:"The four things we don't compromise on.",
      p1h:'Smart Life', p1p:'Devices that work together — no separate app for every gadget.',
      p2h:'Care', p2p:'Support that picks up the phone.',
      p3h:'Home', p3p:'Set up once — installation help for anything that mounts or wires in.',
      p4h:'Innovation', p4p:'New arrivals every month, tested before they hit the shelf.',
      customers:'Customers',
      quotes:[
        {t:'"Ordered a security camera on Tuesday, had it mounted and working by Thursday evening — support walked me through the app setup on the phone."', a:'— Rafiq H., Sana\'a'},
        {t:'"The washing machine came with a real technician for install, not just a delivery driver. First appliance store that has bothered to do that."', a:'— Meherun N., Aden'},
        {t:'"Bought three smart lamps and they paired with each other out of the box. No separate app needed for each brand."', a:'— Tanvir A., Taiz'},
      ],
      followEyebrow:'Follow us', followTitle:'Find us everywhere.',
      newsH:'Get the first look at new arrivals and monthly deals.', newsPh:'Your email', subscribe:'Subscribe →',
      footShop:'Shop', footWallets:'Payments', footContact:'Contact', footSite:'www.pmstore.com', footDesign:'Design concept — sample site',
      yourCart:'Your cart', subtotal:'Subtotal', checkout:'Checkout', cartEmpty:'Your cart is empty.', remove:'Remove', added:'Added ✓', addToCart:'Add to cart',
      catSmart:'Smart Home', catElectronics:'Electronics', catAppliances:'Appliances', catCare:'Personal Care', catDeals:'Deals',
      authTitle:'Customer login', authTitleReg:'Create account', fullName:'Full name', email:'Email', password:'Password',
      signIn:'Sign in', register:'Register', registerInstead:'Register instead', backToLogin:'Back to login',
      signedInAs:'Signed in as', accountCreated:'Account created', signedIn:'Signed in', emailRegistered:'This email is already registered — please log in.',
      shipTitle:'Shipping details', address:'Address', city:'City', postal:'Postal code',
      items:'Items', shipping:'Shipping', free:'Free', total:'Total', reviewOrder:'Review order',
      paymentMethod:'Payment method', choosePayment:'Choose a payment method', cod:'Cash on Delivery',
      orderConfirmed:'Order confirmed.', confirmP:'A confirmation has been sent to your email. Same-day dispatch for in-stock items.',
      continueShopping:'Continue shopping', orderNo:'Order',
      searchHint:'', errorOrder:'Failed to place order. Please try again.',
    },
    ar: {
      siteTag:'منزل ذكي • عناية • منزل • ابتكار',
      tick1:'شحن مجاني للطلبات فوق 50$', tick2:'توصيل سريع في جميع أنحاء اليمن', tick3:'تركيب المنزل الذكي متاح',
      navSmart:'المنزل الذكي', navElectronics:'الإلكترونيات', navAppliances:'الأجهزة المنزلية', navCare:'العناية الشخصية', navDeals:'العروض',
      heroEyebrow:'حياة ذكية · عناية · منزل · ابتكار',
      heroH1A:'حياة أذكى', heroH1B:'تبدأ', heroH1C:'من هنا.',
      heroLede:'أجهزة المنزل الذكي والإلكترونيات اليومية والعناية الشخصية — اخترناها بعناية لموثوقيتها، وتركيب بالطريقة الصحيحة.',
      shopNow:'تسوّق الآن', whyUs:'لماذا PM Store',
      pillProducts:'منتج تُشحن شهرياً', pillWarranty:'منتجات أصلية في كل طلب', pillCare:'دعم 24/7',
      payEyebrow:'وسائل الدفع', payTitle:'ادفع عبر المحافظ الإلكترونية اليمنية.',
      featured:'مميز', picks:'مختارات هذا الأسبوع.', searchPh:'ابحث عن منتجات…',
      newArrival:'وصل حديثاً', promoH:'كاميرات مراقبة ذكية — خصم يصل إلى 25%.', promoP:'رؤية ليلية بدقة 1080p وصوت ثنائي الاتجاه وتطبيق يعمل فعلاً. شحن مجاني.', shopSale:'تسوّق العرض',
      whyEyebrow:'لماذا PM Store', whyTitle:'أربعة أشياء لا نتنازل عنها.',
      p1h:'حياة ذكية', p1p:'أجهزة تعمل معاً — دون تطبيق منفصل لكل جهاز.',
      p2h:'عناية', p2p:'دعم يرد على الهاتف.',
      p3h:'منزل', p3p:'يُركّب مرة واحدة — مساعدة تركيب لأي جهاز يحتاج تثبيتاً.',
      p4h:'ابتكار', p4p:'وصل حديثاً كل شهر، نختبره قبل وصوله للرف.',
      customers:'عملاؤنا',
      quotes:[
        {t:'"طلبت كاميرا مراقبة يوم الثلاثاء، ورُكّبت وعملت بحلول مساء الخميس — والدعم رافقني في إعداد التطبيق عبر الهاتف."', a:'— رفيق ح.، صنعاء'},
        {t:'"الغسالة وصلت مع فني تركيب حقيقي وليس سائق توصيل فقط. أول متجر أجهزة يهتم بذلك."', a:'— مهرون ن.، عدن'},
        {t:'"اشتريت ثلاثة مصابيح ذكية واقترنت مع بعضها مباشرة دون تطبيق منفصل لكل ماركة."', a:'— تنوير أ.، تعز'},
      ],
      followEyebrow:'تابعنا', followTitle:'ستجدنا في كل مكان.',
      newsH:'اطّلع أولاً على الوصل حديثاً وعروض الشهر.', newsPh:'بريدك الإلكتروني', subscribe:'اشترك ←',
      footShop:'تسوق', footWallets:'الدفع', footContact:'اتصل بنا', footSite:'www.pmstore.com', footDesign:'تصميم تجريبي — موقع نموذجي',
      yourCart:'سلة التسوق', subtotal:'المجموع الفرعي', checkout:'إتمام الطلب', cartEmpty:'سلتك فارغة.', remove:'إزالة', added:'أُضيف ✓', addToCart:'أضف للسلة',
      catSmart:'المنزل الذكي', catElectronics:'الإلكترونيات', catAppliances:'الأجهزة المنزلية', catCare:'العناية الشخصية', catDeals:'العروض',
      authTitle:'تسجيل دخول العميل', authTitleReg:'إنشاء حساب', fullName:'الاسم الكامل', email:'البريد الإلكتروني', password:'كلمة المرور',
      signIn:'تسجيل الدخول', register:'إنشاء حساب', registerInstead:'إنشاء حساب بدلاً من ذلك', backToLogin:'العودة لتسجيل الدخول',
      signedInAs:'تم تسجيل دخولك باسم', accountCreated:'تم إنشاء الحساب', signedIn:'تم تسجيل الدخول', emailRegistered:'هذا البريد مسجل مسبقاً — يرجى تسجيل الدخول.',
      shipTitle:'بيانات الشحن', address:'العنوان', city:'المدينة', postal:'الرمز البريدي',
      items:'المنتجات', shipping:'الشحن', free:'مجاني', total:'الإجمالي', reviewOrder:'مراجعة الطلب',
      paymentMethod:'وسيلة الدفع', choosePayment:'اختر وسيلة الدفع', cod:'الدفع عند الاستلام',
      orderConfirmed:'تم تأكيد الطلب.', confirmP:'تم إرسال تأكيد إلى بريدك. الشحن نفس اليوم للعناصر المتوفرة.',
      continueShopping:'متابعة التسوق', orderNo:'الطلب',
      searchHint:'', errorOrder:'فشل إتمام الطلب. حاول مرة أخرى.',
    }
  };

  let lang = store.get('pm_lang') || 'en';
  const t = (key) => (I18N[lang] && I18N[lang][key]) || I18N.en[key] || key;
  const curLocale = (code) => (code === 'ar' ? 'ar-YE' : 'en-US');

  // ---------- toast ----------
  const toastEl = document.getElementById('toast');
  let toastTimer;
  function toast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  // ---------- state ----------
  let site = null;
  let currentCurrency = store.get('pm_cur') || 'YER';
  let products = [];
  let cart = [];
  let wishlist = JSON.parse(store.get('pm_wishlist') || '[]');
  let customerToken = store.get('pm_customer_token') || null;
  let customerName = store.get('pm_customer_name') || null;

  const header = document.getElementById('siteHeader');
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 30));

  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // ---------- icons ----------
  const iconSpeaker = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><rect x="120" y="90" width="60" height="120" rx="20"/><circle cx="150" cy="150" r="16"/><circle cx="150" cy="150" r="6"/></g>`;
  const iconCam = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><rect x="105" y="120" width="90" height="60" rx="30"/><circle cx="150" cy="150" r="20"/><circle cx="150" cy="150" r="8" fill="#7A1F2C"/></g>`;
  const iconLamp = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><path d="M110,110 L190,110 L170,150 L130,150 Z"/><line x1="150" y1="150" x2="150" y2="215"/><line x1="120" y1="215" x2="180" y2="215"/></g>`;
  const iconLaptop = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><rect x="95" y="100" width="110" height="70" rx="6"/><path d="M85,180 h130 l-8,14 h-114 Z"/></g>`;
  const iconPhone = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><rect x="122" y="90" width="56" height="120" rx="10"/><line x1="140" y1="195" x2="160" y2="195"/></g>`;
  const iconHeadphones = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><path d="M100,150 a50,50 0 0 1 100,0"/><rect x="92" y="145" width="18" height="34" rx="6"/><rect x="190" y="145" width="18" height="34" rx="6"/></g>`;
  const iconWatch = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><circle cx="150" cy="150" r="30"/><rect x="138" y="106" width="24" height="18"/><rect x="138" y="176" width="24" height="18"/></g>`;
  const iconWasher = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><rect x="105" y="90" width="90" height="120" rx="8"/><circle cx="150" cy="155" r="32"/><circle cx="150" cy="155" r="18"/></g>`;
  const iconShaver = `<g fill="none" stroke="#7A1F2C" stroke-width="1.4" opacity="0.6"><rect x="135" y="90" width="30" height="90" rx="8"/><rect x="128" y="180" width="44" height="20" rx="6"/></g>`;

  const iconForCat = { smart: iconSpeaker, electronics: iconLaptop, appliances: iconWasher, care: iconShaver };
  const badgeFor = { 'Aura Smart Speaker': 'NEW' };

  const productSvg = (accent) => `<svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F1EFED"/><stop offset="1" stop-color="#E3DFDC"/></linearGradient></defs>${accent}</svg>`;

  const catLabel = (key) => t('cat' + key.charAt(0).toUpperCase() + key.slice(1)) || key;
  const productName = (p) => (lang === 'ar' && p.nameAr) ? p.nameAr : p.name;

  // ---------- currencies ----------
  function fmtPrice(yerValue, code){
    if (!site) return yerValue;
    const c = site.currencies[code || currentCurrency];
    if (!c) return yerValue;
    const dec = c.decimals != null ? c.decimals : 2;
    const val = (yerValue || 0) / c.rate;
    const num = val.toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    return c.symbol + ' ' + num;
  }

  // ---------- settings / site ----------
  const SOCIAL_ICONS = {
    facebook:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v3H6v4h3v6h4v-6h3l1-4h-4V9c0-.6.4-1 1-1z"/></svg>',
    instagram:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r="1"/></svg>',
    tiktok:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 4c.5 2.5 2 4 4.5 4.5"/></svg>',
    whatsapp:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M12 3a9 9 0 0 0-7.8 13.5L3 21l4.7-1.2A9 9 0 1 0 12 3z"/><path d="M9 8c.5 0 .9.5 1 1l.5 1c.2.3 0 .7-.2 1l-.3.4c.5 1 1.2 1.6 2 2l.4-.3c.3-.2.7-.4 1-.2l1 .5c.5.1 1 .5 1 1 0 1-1 2-2 2-3 0-6-2.5-6-6 0-1 1-2 2-2z"/></svg>',
    youtube:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M10 9l5 3-5 3z"/></svg>',
    telegram:'<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M21 4L3 11l5 2 2 5 3-4 5 3z"/><path d="M8 13l9-6-5 9-1-4-3-1z"/></svg>',
  };
  const SOCIAL_NAMES = {
    facebook:{en:'Facebook', ar:'فيسبوك'}, instagram:{en:'Instagram', ar:'انستقرام'}, tiktok:{en:'TikTok', ar:'تيك توك'},
    whatsapp:{en:'WhatsApp', ar:'واتساب'}, youtube:{en:'YouTube', ar:'يوتيوب'}, telegram:{en:'Telegram', ar:'تيليغرام'},
  };

  function renderSocial(){
    const row = document.getElementById('socialRow');
    const foot = document.getElementById('footSocial');
    row.innerHTML = ''; foot.innerHTML = '';
    if (!site) return;
    Object.keys(SOCIAL_ICONS).forEach(key => {
      const url = (site.social && site.social[key]) || '';
      if (!url) return;
      row.innerHTML += `<a class="social-card" href="${url}" target="_blank" rel="noopener">${SOCIAL_ICONS[key]}<span>${SOCIAL_NAMES[key][lang]}</span></a>`;
      foot.innerHTML += `<a href="${url}" target="_blank" rel="noopener" aria-label="${key}">${SOCIAL_ICONS[key]}</a>`;
    });
    if (!row.innerHTML) row.innerHTML = `<p style="color:var(--gray); font-size:0.86rem;">${lang==='ar'?'لم تضف روابط التواصل بعد.':'No social links added yet.'}</p>`;
  }

  function renderWallets(){
    const row = document.getElementById('walletRow');
    const foot = document.getElementById('footWallets');
    row.innerHTML = ''; foot.innerHTML = '';
    if (!site || !site.wallets) return;
    site.wallets.forEach(w => {
      const name = (lang === 'ar' && w.nameAr) ? w.nameAr : w.name;
      const num = w.number || '';
      row.innerHTML += `
        <div class="wallet-card">
          <div class="w-ic">${(name || 'W').charAt(0)}</div>
          <div class="w-name">${name}</div>
          ${num ? `<div class="w-num">${num}</div>` : ''}
        </div>`;
      foot.innerHTML += `<a href="#" onclick="return false;" style="font-size:0.84rem; color:var(--gray);">${name}${num ? ' — ' + num : ''}</a>`;
    });
  }

  function renderFooterSite(){
    if (!site) return;
    document.getElementById('footAddress').textContent = site.address || '';
    document.getElementById('footPhone').textContent = site.phone || '';
    document.getElementById('footPhone').href = 'tel:' + (site.phone || '').replace(/[^+\d]/g, '');
    document.getElementById('footEmail').textContent = site.email || '';
    document.getElementById('footEmail').href = 'mailto:' + site.email;
  }

  function renderCurrencies(){
    const sel = document.getElementById('curSelect');
    if (!sel) return;
    sel.innerHTML = '';
    if (!site) return;
    Object.keys(site.currencies).forEach(code => {
      const c = site.currencies[code];
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code + ' — ' + (lang === 'ar' ? c.labelAr : c.label);
      sel.appendChild(opt);
    });
    sel.value = currentCurrency;
  }

  // ---------- categories ----------
  const categories = [
    { name:'smart', icon:`<path d="M3 11l9-8 9 8M5 9v11h14V9"/>` },
    { name:'electronics', icon:`<rect x="4" y="5" width="16" height="12" rx="2"/><line x1="9" y1="21" x2="15" y2="21"/>` },
    { name:'appliances', icon:`<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="4"/>` },
    { name:'care', icon:`<path d="M12 21s-7.5-4.6-10-9.3C.6 8 2.4 4.5 6 4.1c2-.2 3.7.9 5 2.9 1.3-2 3-3.1 5-2.9 3.6.4 5.4 3.9 4 7.6C19.5 16.4 12 21 12 21z"/>` },
    { name:'deals', icon:`<path d="M20 12l-8 8-9-9V4h7l10 8z"/><circle cx="8.5" cy="7.5" r="1"/>` },
  ];
  function renderCategories(){
    const catRow = document.getElementById('catRow');
    catRow.innerHTML = '';
    categories.forEach((c,i) => {
      const chip = document.createElement('div');
      chip.className = 'cat-chip' + (i===0 ? ' active' : '');
      chip.dataset.key = c.name;
      chip.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6">${c.icon}</svg><span>${catLabel(c.name)}</span>`;
      chip.addEventListener('click', () => {
        document.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('active'));
        chip.classList.add('active');
        renderProducts(c.name);
      });
      catRow.appendChild(chip);
    });
  }

  // ---------- products ----------
  const grid = document.getElementById('productGrid');
  function mapApiProduct(p){
    return { ...p, cat: p.category, icon: iconForCat[p.category] || iconSpeaker };
  }
  function activeChipKey(){ const el = document.querySelector('.cat-chip.active'); return el ? el.dataset.key : undefined; }

  function renderProducts(filter){
    grid.innerHTML = '';
    const searchEl = document.getElementById('productSearch');
    const searchTerm = (searchEl && searchEl.value.trim().toLowerCase()) || '';
    const list = products.filter(p => {
      const matchFilter = !filter || filter === 'all' || p.cat === filter || (filter==='deals' && p.oldPrice);
      const matchSearch = !searchTerm || (productName(p) || '').toLowerCase().includes(searchTerm);
      return matchFilter && matchSearch;
    });
    if (!list.length) {
      grid.innerHTML = `<p style="color:var(--gray); grid-column:1/-1; text-align:center;">${lang==='ar'?'لا توجد منتجات.':'No products found.'}</p>`;
      return;
    }
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card reveal in';
      const safeName = escapeHtml(productName(p));
      const media = p.image
        ? `<img src="${escapeHtml(absAsset(p.image))}" alt="${safeName}" loading="lazy"/>`
        : productSvg(p.icon);
      card.innerHTML = `
        <div class="product-media">
          ${media}
          ${p.badge ? `<span class="badge-tag">${escapeHtml(p.badge)}</span>` : ''}
          <button class="wish" aria-label="Wishlist"><svg viewBox="0 0 24 24" stroke-width="1.6"><path d="M12 21s-7.5-4.6-10-9.3C.6 8 2.4 4.5 6 4.1c2-.2 3.7.9 5 2.9 1.3-2 3-3.1 5-2.9 3.6.4 5.4 3.9 4 7.6C19.5 16.4 12 21 12 21z"/></svg></button>
        </div>
        <div class="product-info">
          <span class="cat">${escapeHtml(catLabel(p.cat))}</span>
          <h3>${safeName}</h3>
          <div class="price-row">
            <span class="price">${p.oldPrice ? `<span class="old">${fmtPrice(p.oldPrice)}</span>` : ''}${fmtPrice(p.price)}</span>
            <button class="add-btn" data-name="${safeName}" data-price="${p.price}" data-image="${escapeHtml(absAsset(p.image) || '')}">${t('addToCart')}</button>
          </div>
        </div>`;
      grid.appendChild(card);
    });
    document.querySelectorAll('.wish').forEach(b => {
      const name = b.closest('.product-card').querySelector('h3').textContent;
      b.classList.toggle('active', wishlist.includes(name));
      b.addEventListener('click', () => { b.classList.toggle('active'); toggleWishlist(name); });
    });
    document.querySelectorAll('.add-btn').forEach(b => {
      b.addEventListener('click', () => {
        addToCart(b.dataset.name, +b.dataset.price, b.dataset.image);
        b.textContent = t('added'); b.classList.add('added');
        setTimeout(() => { b.textContent = t('addToCart'); b.classList.remove('added'); }, 1300);
      });
    });
  }
  async function loadProducts(){
    try {
      const res = await fetch(api('/products'));
      if (!res.ok) throw new Error('Failed to load products');
      products = (await res.json()).map(mapApiProduct);
    } catch (err) {
      console.error(err);
      products = [];
    }
    renderProducts('smart');
  }

  // Search filter
  let searchTimeout;
  document.getElementById('productSearch').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const activeEl = document.querySelector('.cat-chip.active');
      const activeFilter = activeEl ? activeEl.dataset.key : undefined;
      renderProducts(activeFilter);
    }, 250);
  });

  // ---------- customer auth ----------
  function authModalHtml(){
    return `
      <div class="checkout-step">
        <h3 id="authTitle">${isRegisterMode ? t('authTitleReg') : t('authTitle')}</h3>
        <form id="authForm">
          <div class="field-row"><div class="field"><label>${t('fullName')}</label><input id="auth-name" required></div><div class="field"><label>${t('email')}</label><input id="auth-email" type="email" required></div></div>
          <div class="field-row"><div class="field"><label>${t('password')}</label><input id="auth-password" type="password" required></div><div class="field"></div></div>
          <button type="submit" class="btn" style="width:100%; justify-content:center;" id="authSubmit">${isRegisterMode ? t('register') : t('signIn')}</button>
        </form>
        <p style="text-align:center; font-size:0.8rem; color:var(--gray); margin-top:14px;">
          <button type="button" class="btn-ghost btn" id="toggleAuthMode" style="font-size:0.78rem; padding:0;">${isRegisterMode ? t('backToLogin') : t('registerInstead')}</button>
        </p>
      </div>`;
  }

  const authOverlay = document.getElementById('authOverlay');
  const authBody = document.getElementById('authBody');
  let isRegisterMode = false;

  document.getElementById('accountIcon').addEventListener('click', () => {
    if (customerToken) {
      toast(t('signedInAs') + ' ' + customerName);
      return;
    }
    isRegisterMode = false;
    renderAuthForm();
    authOverlay.classList.add('open');
  });

  authOverlay.addEventListener('click', (e) => {
    if (e.target === authOverlay) authOverlay.classList.remove('open');
  });

  function renderAuthForm(){
    authBody.innerHTML = authModalHtml();
    document.getElementById('toggleAuthMode').addEventListener('click', () => {
      isRegisterMode = !isRegisterMode;
      renderAuthForm();
    });
    document.getElementById('authForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('auth-name').value;
      const email = document.getElementById('auth-email').value;
      const password = document.getElementById('auth-password').value;
      const endpoint = isRegisterMode ? '/auth/register' : '/auth/login/customer';
      try {
        const res = await fetch(api(endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (isRegisterMode && res.status === 409 && (data.error || '').toLowerCase().includes('registered')) {
            const enteredEmail = document.getElementById('auth-email').value;
            isRegisterMode = false;
            renderAuthForm();
            if (enteredEmail) document.getElementById('auth-email').value = enteredEmail;
            toast(t('emailRegistered'));
            return;
          }
          throw new Error(data.error || 'Failed');
        }
        store.set('pm_customer_token', data.token);
        store.set('pm_customer_name', data.customer.name);
        customerToken = data.token;
        customerName = data.customer.name;
        authOverlay.classList.remove('open');
        toast(isRegisterMode ? t('accountCreated') : t('signedIn'));
      } catch (err) {
        toast('Error: ' + err.message);
      }
    });
  }

  document.getElementById('authClose').addEventListener('click', () => authOverlay.classList.remove('open'));

  // ---------- testimonials ----------
  const qText = document.getElementById('quoteText'), qAuthor = document.getElementById('quoteAuthor');
  const dotsWrap = document.getElementById('quoteDots');
  let qi = 0;
  function renderQuotes(){
    dotsWrap.innerHTML = '';
    I18N[lang].quotes.forEach((q,i) => {
      const d = document.createElement('span');
      d.className = 't-dot' + (i===qi ? ' active' : '');
      d.addEventListener('click', () => showQuote(i));
      dotsWrap.appendChild(d);
    });
    qText.textContent = I18N[lang].quotes[qi].t;
    qAuthor.textContent = I18N[lang].quotes[qi].a;
    qText.style.transition = 'opacity 0.25s ease';
  }
  function showQuote(i){
    qi = i;
    qText.style.opacity = 0;
    setTimeout(() => {
      qText.textContent = I18N[lang].quotes[qi].t;
      qAuthor.textContent = I18N[lang].quotes[qi].a;
      qText.style.opacity = 1;
      document.querySelectorAll('#quoteDots .t-dot').forEach((d,k) => d.classList.toggle('active', k===qi));
    }, 220);
  }
  setInterval(() => { showQuote((qi+1) % I18N[lang].quotes.length); }, 6000);

  // ---------- wishlist ----------
  const wishIconBtn = document.getElementById('wishIcon');
  const wishBadge = document.createElement('span'); wishBadge.className = 'badge'; wishBadge.style.cssText = 'background:#7A1F2C; color:#fff; font-size:0.62rem; padding:2px 5px; border-radius:50%;';
  wishIconBtn.appendChild(wishBadge);
  function saveWishlist(){ store.set('pm_wishlist', JSON.stringify(wishlist)); renderWishBadge(); }
  function renderWishBadge(){ wishBadge.textContent = wishlist.length; wishBadge.style.display = wishlist.length ? 'inline-block' : 'none'; }
  renderWishBadge();
  wishIconBtn.addEventListener('click', () => { if (wishlist.length) alert(wishlist.join('\n')); });
  function toggleWishlist(name){
    const idx = wishlist.indexOf(name);
    if (idx > -1) wishlist.splice(idx,1); else wishlist.push(name);
    saveWishlist();
  }

  // ---------- cart ----------
  const bagCountEl = document.getElementById('bagCount'), drawer = document.getElementById('drawer'), overlay = document.getElementById('overlay');
  const drawerItems = document.getElementById('drawerItems'), subtotalEl = document.getElementById('subtotal');
  function addToCart(name, price, image){ cart.push({ name, price, image }); renderDrawer(); }
  function removeFromCart(i){ cart.splice(i,1); renderDrawer(); }
  function renderDrawer(){
    bagCountEl.textContent = cart.length;
    drawerItems.innerHTML = cart.length === 0
      ? `<div class="drawer-empty">${t('cartEmpty')}</div>`
      : cart.map((item,i) => `<div class="drawer-item"><div class="thumb">${item.image ? `<img src="${escapeHtml(absAsset(item.image))}" alt=""/>` : ''}</div><div class="info"><h4>${escapeHtml(item.name)}</h4><span>${fmtPrice(item.price)}</span><button class="remove" data-i="${i}">${t('remove')}</button></div></div>`).join('');
    drawerItems.querySelectorAll('.remove').forEach(btn => btn.addEventListener('click', () => removeFromCart(+btn.dataset.i)));
    subtotalEl.textContent = fmtPrice(cart.reduce((s,i) => s+i.price, 0));
  }
  document.getElementById('bagIcon').addEventListener('click', () => { drawer.classList.add('open'); overlay.classList.add('open'); });
  function closeDrawer(){ drawer.classList.remove('open'); overlay.classList.remove('open'); }
  document.getElementById('drawerClose').addEventListener('click', closeDrawer);
  overlay.addEventListener('click', closeDrawer);
  renderDrawer();

  // ---------- checkout ----------
  const checkoutOverlay = document.getElementById('checkoutOverlay'), checkoutBody = document.getElementById('checkoutBody');
  function openCheckout(){ if(cart.length===0) return; renderStep1(); checkoutOverlay.classList.add('open'); }
  function closeCheckout(){ checkoutOverlay.classList.remove('open'); }
  document.getElementById('openCheckout').addEventListener('click', () => { closeDrawer(); openCheckout(); });
  document.getElementById('checkoutClose').addEventListener('click', closeCheckout);
  checkoutOverlay.addEventListener('click', (e) => { if(e.target===checkoutOverlay) closeCheckout(); });
  function subtotalValue(){ return cart.reduce((s,i)=>s+i.price,0); }

  function paymentOptionsHtml(){
    let opts = `<option value="cod">${t('cod')}</option>`;
    if (site && site.wallets) {
      site.wallets.forEach(w => {
        const name = escapeHtml((lang === 'ar' && w.nameAr) ? w.nameAr : w.name);
        opts += `<option value="${escapeHtml(w.id)}">${name}${w.number ? ' — ' + escapeHtml(w.number) : ''}</option>`;
      });
    }
    return opts;
  }

  function renderStep1(){
    checkoutBody.innerHTML = `<div class="checkout-step"><h3>${t('shipTitle')}</h3>
      <form id="shipForm">
        <div class="field-row"><div class="field"><label>${t('fullName')}</label><input required></div><div class="field"><label>${t('email')}</label><input type="email" required></div></div>
        <div class="field-row"><div class="field"><label>${t('address')}</label><input required></div></div>
        <div class="field-row"><div class="field"><label>${t('city')}</label><input required></div><div class="field"><label>${t('postal')}</label><input></div></div>
        <div class="field-row"><div class="field"><label>${t('paymentMethod')}</label><select id="payMethod">${paymentOptionsHtml()}</select></div></div>
        <div class="checkout-summary"><div class="row"><span>${t('items')} (${cart.length})</span><span>${fmtPrice(subtotalValue())}</span></div><div class="row"><span>${t('shipping')}</span><span>${t('free')}</span></div><div class="row total"><span>${t('total')}</span><span>${fmtPrice(subtotalValue())}</span></div></div>
        <button type="submit" class="btn" style="width:100%; justify-content:center;">${t('reviewOrder')}</button>
      </form></div>`;
    document.getElementById('shipForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      const inputs = f.querySelectorAll('input');
      const shipping = {
        name: inputs[0].value,
        email: inputs[1].value,
        address: inputs[2].value,
        city: inputs[3].value,
        postalCode: inputs[4].value,
      };
      const paymentMethod = document.getElementById('payMethod').value;
      try {
        const order = await placeOrder(shipping, paymentMethod);
        renderConfirm(order);
      } catch (err) {
        alert(t('errorOrder'));
      }
    });
  }
  async function placeOrder(shipping, paymentMethod){
    const items = cart.map(i => ({ name: i.name, price: i.price }));
    const res = await fetch(api('/orders'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, shipping, currency: currentCurrency, paymentMethod }),
    });
    if (!res.ok) throw new Error('Order failed');
    return res.json();
  }
  function renderConfirm(order){
    checkoutBody.innerHTML = `<div class="checkout-confirm">
      <div class="confirm-icon" id="confirmIcon"><svg viewBox="0 0 24 24" fill="none" stroke-width="1.6"><path d="M20 6L9 17l-5-5"/></svg></div>
      <h3>${t('orderConfirmed')}</h3><p>${t('confirmP')}</p>
      <p class="order-no">${t('orderNo')} ${order.id}</p>
      <button class="btn" style="margin-top:22px;" id="closeConfirm">${t('continueShopping')}</button></div>`;
    requestAnimationFrame(() => document.getElementById('confirmIcon').classList.add('show'));
    cart = []; renderDrawer();
    document.getElementById('closeConfirm').addEventListener('click', closeCheckout);
  }

  document.getElementById('newsForm').addEventListener('submit', (e) => { e.preventDefault(); e.target.reset(); });

  // ---------- language ----------
  function applyLang(){
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    const lt = document.getElementById('langToggle');
    if (lt) lt.textContent = lang === 'ar' ? 'English' : 'عربي';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    renderCategories(); renderCurrencies(); renderSocial(); renderWallets(); renderQuotes();
    renderFooterSite();
    renderProducts(activeChipKey() || 'smart');
    renderDrawer();
  }
  const langToggle = document.getElementById('langToggle');
  if (langToggle) langToggle.addEventListener('click', () => {
    lang = lang === 'ar' ? 'en' : 'ar';
    store.set('pm_lang', lang);
    applyLang();
  });
  const curSelect = document.getElementById('curSelect');
  if (curSelect) curSelect.addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    store.set('pm_cur', currentCurrency);
    renderProducts(activeChipKey() || 'smart');
    renderDrawer();
  });

  // ---------- boot ----------
  async function loadSite(){
    try {
      const res = await fetch(api('/site'));
      if (!res.ok) throw new Error('site');
      site = await res.json();
      if (site.announcement) {
        const track = document.getElementById('tickerTrack');
        const span = document.createElement('span');
        span.textContent = site.announcement;
        track.prepend(span);
      }
      if (!site.currencies[currentCurrency]) currentCurrency = site.defaultCurrency || 'YER';
    } catch (err) {
      console.error(err);
    }
    renderFooterSite();
    renderCurrencies();
    renderSocial();
    renderWallets();
  }

  applyLang();
  loadSite();
  loadProducts();
